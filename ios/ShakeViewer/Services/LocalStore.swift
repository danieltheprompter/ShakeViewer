import Foundation

/// UserDefaults equivalents of the site's localStorage keys.
enum LocalStoreKey {
    static let bookmarks = "shakeviewer_bookmarks"
    static let searchHistory = "shakeviewer_search_history"
    static let myLocation = "shakeviewer_my_location"
}

struct SearchHistoryEntry: Codable, Sendable, Hashable, Identifiable {
    var search: CustomSearch
    var timestamp: Double
    /// Firestore document id for cloud entries (nil for local ones).
    var docId: String? = nil
    var id: String { docId ?? "\(search.startDate)_\(search.endDate)_\(search.minMag)_\(timestamp)" }
}

@MainActor
final class LocalStore {
    private let defaults: UserDefaults
    init(defaults: UserDefaults = .standard) { self.defaults = defaults }

    func load<T: Decodable>(_ type: T.Type, key: String) -> T? {
        guard let data = defaults.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }

    func save<T: Encodable>(_ value: T?, key: String) {
        if let value, let data = try? JSONEncoder().encode(value) {
            defaults.set(data, forKey: key)
        } else {
            defaults.removeObject(forKey: key)
        }
    }
}
