import Foundation
import Observation
#if canImport(FirebaseCore)
import FirebaseCore
import FirebaseAuth
import FirebaseFirestore
#endif

struct AccountUser: Sendable, Equatable {
    let uid: String
    let email: String?
    let displayName: String?
}

/// Optional Firebase layer. Everything quake-related works without it.
/// Active only when GoogleService-Info.plist is bundled.
/// Mirrors the site: Firebase Auth (email/password) + Firestore
///   users/{uid}                     { photoURL, termsAcceptedAt, termsVersion, privacyPolicyAcceptedAt, privacyPolicyVersion }
///   users/{uid}/bookmarks/{autoId}  { quakeId, mag, place, time, lat, lng, depth, source, felt, url, note, timestamp }
///   users/{uid}/searchHistory/{id}  { startDate, endDate, minMag, bounds, timestamp }
@MainActor
@Observable
final class AccountService {
    nonisolated static let termsVersion = "2026-02-16" // Must match TERMS_VERSION in the web source.

    private(set) var isAvailable = false
    private(set) var user: AccountUser?
    private(set) var remoteBookmarks: [Bookmark] = []
    /// users/{uid}/searchHistory, newest first (the site's "Cloud" tab).
    private(set) var cloudHistory: [SearchHistoryEntry] = []

    #if canImport(FirebaseCore)
    private var authHandle: AuthStateDidChangeListenerHandle?
    private var bookmarksListener: ListenerRegistration?
    private var historyListener: ListenerRegistration?
    #endif

    func configureIfPossible() {
        #if canImport(FirebaseCore)
        guard Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil else { return }
        if FirebaseApp.app() == nil { FirebaseApp.configure() }
        isAvailable = true
        authHandle = Auth.auth().addStateDidChangeListener { [weak self] _, u in
            let mapped = u.map { AccountUser(uid: $0.uid, email: $0.email, displayName: $0.displayName) }
            MainActor.assumeIsolated {
                self?.user = mapped
                self?.listenBookmarks()
                self?.listenHistory()
            }
        }
        #endif
    }

    func signIn(email: String, password: String) async throws {
        #if canImport(FirebaseCore)
        try await Self.signInFirebase(email: email, password: password)
        #endif
    }

    func signUp(email: String, password: String, name: String) async throws {
        #if canImport(FirebaseCore)
        user = try await Self.createAccount(email: email, password: password, name: name, termsVersion: Self.termsVersion)
        #endif
    }

    #if canImport(FirebaseCore)
    /// Runs off the main actor so non-Sendable Firebase result types never cross isolation.
    nonisolated private static func createAccount(email: String, password: String, name: String, termsVersion: String) async throws -> AccountUser {
        let r = try await Auth.auth().createUser(withEmail: email, password: password)
        do {
            if !name.isEmpty {
                let req = r.user.createProfileChangeRequest()
                req.displayName = name
                try await req.commitChanges()
            }
            try await Firestore.firestore().collection("users").document(r.user.uid).setData([
                "termsAcceptedAt": FieldValue.serverTimestamp(),
                "termsVersion": termsVersion,
                "privacyPolicyAcceptedAt": FieldValue.serverTimestamp(),
                "privacyPolicyVersion": termsVersion,
            ], merge: true)
        } catch {
            // Roll back: don't leave an orphan Auth user without recorded consent.
            try? await r.user.delete()
            try? Auth.auth().signOut()
            throw error
        }
        return AccountUser(uid: r.user.uid, email: r.user.email, displayName: name.isEmpty ? nil : name)
    }

    nonisolated private static func signInFirebase(email: String, password: String) async throws {
        _ = try await Auth.auth().signIn(withEmail: email, password: password)
    }
    #endif

    func resetPassword(email: String) async throws {
        #if canImport(FirebaseCore)
        try await Auth.auth().sendPasswordReset(withEmail: email)
        #endif
    }

    func signOut() {
        #if canImport(FirebaseCore)
        try? Auth.auth().signOut()
        #endif
    }

    // MARK: Account deletion (App Store Guideline 5.1.1(v))

    enum DeletionError: LocalizedError {
        case passwordRequired, requiresRecentLogin, notSignedIn
        var errorDescription: String? {
            switch self {
            case .passwordRequired: "Enter your password to confirm."
            case .requiresRecentLogin: "For your security, please enter your password again and retry."
            case .notSignedIn: "You're not signed in."
            }
        }
    }

    /// Deletes users/{uid}/bookmarks, users/{uid}/searchHistory, users/{uid}, then the Firebase Auth user.
    /// Mirrors the site's deleteAccount(): re-authenticates email/password users first.
    func deleteAccount(password: String) async throws {
        #if canImport(FirebaseCore)
        guard user != nil else { throw DeletionError.notSignedIn }
        bookmarksListener?.remove(); bookmarksListener = nil
        historyListener?.remove(); historyListener = nil
        do {
            try await Self.deleteEverything(password: password)
        } catch {
            listenBookmarks(); listenHistory()
            throw error
        }
        remoteBookmarks = []
        cloudHistory = []
        user = nil
        #endif
    }

    #if canImport(FirebaseCore)
    nonisolated private static func deleteEverything(password: String) async throws {
        guard let u = Auth.auth().currentUser else { throw DeletionError.notSignedIn }
        let isPasswordUser = u.providerData.contains { $0.providerID == EmailAuthProviderID }
        if isPasswordUser {
            guard !password.isEmpty, let email = u.email else { throw DeletionError.passwordRequired }
            let cred = EmailAuthProvider.credential(withEmail: email, password: password)
            _ = try await u.reauthenticate(with: cred)
        }
        let db = Firestore.firestore()
        let userRef = db.collection("users").document(u.uid)
        for name in ["bookmarks", "searchHistory"] {
            // Page through so large collections stay under the 500-op batch limit.
            while true {
                let snap = try await userRef.collection(name).limit(to: 400).getDocuments()
                if snap.documents.isEmpty { break }
                let batch = db.batch()
                snap.documents.forEach { batch.deleteDocument($0.reference) }
                try await batch.commit()
            }
        }
        try await userRef.delete()
        do {
            try await u.delete()
        } catch let e as NSError where e.code == AuthErrorCode.requiresRecentLogin.rawValue {
            throw DeletionError.requiresRecentLogin
        }
    }
    #endif

    // MARK: Bookmarks

    func addBookmark(_ q: Quake) async {
        #if canImport(FirebaseCore)
        guard let uid = user?.uid else { return }
        try? await Self.writeBookmark(uid: uid, b: Bookmark(quake: q))
        #endif
    }

    func removeBookmark(docId: String) async {
        #if canImport(FirebaseCore)
        guard let uid = user?.uid else { return }
        try? await Self.deleteBookmark(uid: uid, docId: docId)
        #endif
    }

    func addSearchHistory(_ s: CustomSearch) async {
        #if canImport(FirebaseCore)
        guard let uid = user?.uid else { return }
        try? await Self.writeHistory(uid: uid, s: s)
        #endif
    }

    /// The site's "Save to cloud": copies every local entry into users/{uid}/searchHistory.
    func importHistory(_ entries: [SearchHistoryEntry]) async throws {
        #if canImport(FirebaseCore)
        guard let uid = user?.uid else { return }
        for e in entries { try await Self.writeHistory(uid: uid, s: e.search) }
        #endif
    }

    #if canImport(FirebaseCore)
    nonisolated private static func writeBookmark(uid: String, b: Bookmark) async throws {
        _ = try await Firestore.firestore().collection("users").document(uid).collection("bookmarks").addDocument(data: [
            "quakeId": b.quakeId, "mag": b.mag, "place": b.place, "time": b.time,
            "lat": b.lat, "lng": b.lng, "depth": b.depth, "source": b.source,
            "felt": b.felt, "url": b.url, "note": "", "timestamp": FieldValue.serverTimestamp(),
        ])
    }

    nonisolated private static func deleteBookmark(uid: String, docId: String) async throws {
        try await Firestore.firestore().collection("users").document(uid).collection("bookmarks").document(docId).delete()
    }

    nonisolated private static func writeHistory(uid: String, s: CustomSearch) async throws {
        var data: [String: Any] = ["startDate": s.startDate, "endDate": s.endDate, "minMag": s.minMag,
                                   "timestamp": FieldValue.serverTimestamp()]
        if let bb = s.bounds {
            data["bounds"] = ["minLat": bb.minLat, "maxLat": bb.maxLat, "minLon": bb.minLon, "maxLon": bb.maxLon]
        } else {
            data["bounds"] = NSNull()
        }
        _ = try await Firestore.firestore().collection("users").document(uid).collection("searchHistory").addDocument(data: data)
    }
    #endif

    private func listenHistory() {
        #if canImport(FirebaseCore)
        historyListener?.remove()
        historyListener = nil
        cloudHistory = []
        guard let uid = user?.uid else { return }
        historyListener = Firestore.firestore().collection("users").document(uid).collection("searchHistory")
            .order(by: "timestamp", descending: true)
            .limit(to: 10)
            .addSnapshotListener { [weak self] snap, _ in
                let items: [SearchHistoryEntry] = snap?.documents.compactMap { d in
                    Self.decodeHistory(d.data(), docId: d.documentID)
                } ?? []
                MainActor.assumeIsolated { self?.cloudHistory = items }
            }
        #endif
    }

    #if canImport(FirebaseCore)
    nonisolated static func decodeHistory(_ x: [String: Any], docId: String) -> SearchHistoryEntry? {
        guard let start = x["startDate"] as? String, let end = x["endDate"] as? String,
              start.count == 10, end.count == 10 else { return nil }
        let minMag = InputSanitizer.finite((x["minMag"] as? Double) ?? (x["minMag"] as? NSNumber)?.doubleValue, in: -2...10) ?? 0
        var bounds: BoundingBox?
        if let b = x["bounds"] as? [String: Any],
           let a = (b["minLat"] as? NSNumber)?.doubleValue, let bb = (b["maxLat"] as? NSNumber)?.doubleValue,
           let c = (b["minLon"] as? NSNumber)?.doubleValue, let d = (b["maxLon"] as? NSNumber)?.doubleValue {
            if InputSanitizer.validCoordinate(lat: a, lon: c), InputSanitizer.validCoordinate(lat: bb, lon: d) {
                bounds = BoundingBox(minLat: a, maxLat: bb, minLon: c, maxLon: d)
            }
        }
        // Site writes serverTimestamp (Timestamp); older/local imports may carry a ms number.
        let ts: Double
        if let t = x["timestamp"] as? Timestamp { ts = t.dateValue().timeIntervalSince1970 * 1000 }
        else { ts = (x["timestamp"] as? NSNumber)?.doubleValue ?? 0 }
        return SearchHistoryEntry(search: CustomSearch(startDate: start, endDate: end, minMag: minMag, bounds: bounds),
                                  timestamp: ts, docId: docId)
    }
    #endif

    private func listenBookmarks() {
        #if canImport(FirebaseCore)
        bookmarksListener?.remove()
        bookmarksListener = nil
        remoteBookmarks = []
        guard let uid = user?.uid else { return }
        bookmarksListener = Firestore.firestore().collection("users").document(uid).collection("bookmarks")
            .order(by: "timestamp", descending: true)
            .addSnapshotListener { [weak self] snap, _ in
                let items: [Bookmark] = snap?.documents.compactMap { d in
                    let x = d.data()
                    guard let quakeId = InputSanitizer.quakeId(x["quakeId"] as? String) else { return nil }
                    let lat = (x["lat"] as? Double) ?? 0, lng = (x["lng"] as? Double) ?? 0
                    guard InputSanitizer.validCoordinate(lat: lat, lon: lng) else { return nil }
                    let q = Quake(id: quakeId, mag: InputSanitizer.finite(x["mag"] as? Double, in: -2...10) ?? 0,
                                  place: InputSanitizer.text(x["place"] as? String) ?? "",
                                  timeMs: (x["time"] as? Double) ?? 0, felt: (x["felt"] as? Int) ?? 0, tsunami: false,
                                  url: SafeLinks.external(x["url"] as? String),
                                  latitude: lat, longitude: lng,
                                  depth: (x["depth"] as? Double) ?? 0,
                                  source: QuakeSource(rawValue: (x["source"] as? String) ?? "USGS") ?? .usgs)
                    var b = Bookmark(quake: q, id: d.documentID)
                    b.note = InputSanitizer.text(x["note"] as? String, max: 1000) ?? ""
                    return b
                } ?? []
                MainActor.assumeIsolated { self?.remoteBookmarks = items }
            }
        #endif
    }
}
