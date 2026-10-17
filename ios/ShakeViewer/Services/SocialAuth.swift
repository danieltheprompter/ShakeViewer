import Foundation
import AuthenticationServices
import CryptoKit
import UIKit
#if canImport(FirebaseCore)
import FirebaseCore
import FirebaseAuth
import FirebaseFirestore
#endif
#if canImport(GoogleSignIn)
import GoogleSignIn
#endif

/// Sendable result of a Sign in with Apple authorization.
struct AppleAuthResult: Sendable {
    let idToken: String
    let authorizationCode: String?
    let fullName: PersonNameComponents?
}

enum SocialAuthError: LocalizedError {
    case cancelled, missingToken, notConfigured, wrongAccount
    var errorDescription: String? {
        switch self {
        case .cancelled: "Sign-in was cancelled."
        case .missingToken: "Couldn't get a sign-in token. Please try again."
        case .notConfigured: "This sign-in method isn't available in this build."
        case .wrongAccount: "Please confirm with the same account you're signed in with."
        }
    }
}

/// Nonce helpers for Sign in with Apple (Firebase requires the SHA256 of a raw nonce in the request).
enum AppleNonce {
    static func random(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var bytes = [UInt8](repeating: 0, count: length)
        let status = SecRandomCopyBytes(kSecRandomDefault, length, &bytes)
        precondition(status == errSecSuccess, "SecRandomCopyBytes failed")
        return String(bytes.map { charset[Int($0) % charset.count] })
    }

    static func sha256(_ input: String) -> String {
        SHA256.hash(data: Data(input.utf8)).map { String(format: "%02x", $0) }.joined()
    }

    static func extract(_ authorization: ASAuthorization) throws -> AppleAuthResult {
        guard let c = authorization.credential as? ASAuthorizationAppleIDCredential,
              let data = c.identityToken, let token = String(data: data, encoding: .utf8) else {
            throw SocialAuthError.missingToken
        }
        let code = c.authorizationCode.flatMap { String(data: $0, encoding: .utf8) }
        return AppleAuthResult(idToken: token, authorizationCode: code, fullName: c.fullName)
    }

    static func isCancel(_ error: Error) -> Bool {
        if case SocialAuthError.cancelled = error { return true }
        let ns = error as NSError
        if ns.domain == ASAuthorizationError.errorDomain, ns.code == ASAuthorizationError.canceled.rawValue { return true }
        #if canImport(GoogleSignIn)
        if ns.domain == kGIDSignInErrorDomain, ns.code == GIDSignInError.canceled.rawValue { return true }
        #endif
        return false
    }
}

/// Runs an Apple ID authorization programmatically (used to re-authenticate before account deletion).
@MainActor
final class AppleAuthorizer: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    private var continuation: CheckedContinuation<AppleAuthResult, Error>?
    private static var active: AppleAuthorizer?

    static func authorize(hashedNonce: String) async throws -> AppleAuthResult {
        let a = AppleAuthorizer()
        active = a
        defer { active = nil }
        return try await withCheckedThrowingContinuation { cont in
            a.continuation = cont
            let req = ASAuthorizationAppleIDProvider().createRequest()
            req.requestedScopes = []
            req.nonce = hashedNonce
            let c = ASAuthorizationController(authorizationRequests: [req])
            c.delegate = a
            c.presentationContextProvider = a
            c.performRequests()
        }
    }

    nonisolated func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        let r = Result { try AppleNonce.extract(authorization) }
        MainActor.assumeIsolated { continuation?.resume(with: r); continuation = nil }
    }

    nonisolated func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        let e = error
        MainActor.assumeIsolated { continuation?.resume(throwing: e); continuation = nil }
    }

    nonisolated func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        MainActor.assumeIsolated { UIApplication.shared.svKeyWindow ?? ASPresentationAnchor() }
    }
}

extension UIApplication {
    var svKeyWindow: UIWindow? {
        connectedScenes.compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows).first { $0.isKeyWindow }
    }
    var svTopViewController: UIViewController? {
        var vc = svKeyWindow?.rootViewController
        while let p = vc?.presentedViewController { vc = p }
        return vc
    }
}

/// Google Sign-In wrapper returning only Sendable token strings.
@MainActor
enum GoogleAuthorizer {
    struct Tokens: Sendable { let idToken: String; let accessToken: String; let email: String? }

    static func signIn() async throws -> Tokens {
        #if canImport(GoogleSignIn) && canImport(FirebaseCore)
        guard let clientID = FirebaseApp.app()?.options.clientID else { throw SocialAuthError.notConfigured }
        GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
        guard let presenter = UIApplication.shared.svTopViewController else { throw SocialAuthError.notConfigured }
        let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: presenter)
        guard let id = result.user.idToken?.tokenString else { throw SocialAuthError.missingToken }
        return Tokens(idToken: id, accessToken: result.user.accessToken.tokenString, email: result.user.profile?.email)
        #else
        throw SocialAuthError.notConfigured
        #endif
    }

    static func signOut(disconnect: Bool = false) async {
        #if canImport(GoogleSignIn)
        if disconnect { try? await GIDSignIn.sharedInstance.disconnect() }
        GIDSignIn.sharedInstance.signOut()
        #endif
    }

    static func handle(_ url: URL) -> Bool {
        #if canImport(GoogleSignIn)
        return GIDSignIn.sharedInstance.handle(url)
        #else
        return false
        #endif
    }
}
