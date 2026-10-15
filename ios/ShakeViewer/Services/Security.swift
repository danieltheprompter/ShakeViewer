import Foundation

/// Central allow-lists and sanitizers (App Store / security review).
enum SafeLinks {
    /// Hosts the app may hand to Safari / openURL. Subdomains included.
    static let allowedHosts = ["shakeviewer.com", "usgs.gov", "seismicportal.eu", "emsc-csem.org", "apple.com"]

    /// Only https URLs to known hosts; nil otherwise.
    static func external(_ url: URL?) -> URL? {
        guard let url, let scheme = url.scheme?.lowercased(), scheme == "https",
              let host = url.host?.lowercased(), url.user == nil, url.password == nil else { return nil }
        let ok = allowedHosts.contains { host == $0 || host.hasSuffix("." + $0) }
        return ok ? url : nil
    }

    static func external(_ string: String?) -> URL? {
        guard let string, string.count <= 2048 else { return nil }
        // Upstream sometimes sends http:// links; upgrade instead of opening cleartext.
        let s = string.hasPrefix("http://") ? "https://" + string.dropFirst(7) : string
        return external(URL(string: s))
    }
}

enum InputSanitizer {
    private static let idChars = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-.")

    /// Quake ids from deep links (?quake=<id>): USGS "us7000abcd", EMSC "emsc_20261014_0000123".
    static func quakeId(_ raw: String?) -> String? {
        guard let raw, (1...80).contains(raw.count),
              raw.unicodeScalars.allSatisfy({ idChars.contains($0) }) else { return nil }
        return raw
    }

    /// Accept deep links only from our website (https) or the app's own scheme.
    static func isTrustedDeepLink(_ url: URL) -> Bool {
        switch url.scheme?.lowercased() {
        case "https":
            guard let h = url.host?.lowercased() else { return false }
            return h == "shakeviewer.com" || h == "www.shakeviewer.com"
        case "shakeviewer":
            return true
        default:
            return false
        }
    }

    /// Clamp free text from feeds / Firestore so a hostile payload can't blow up layout or memory.
    static func text(_ s: String?, max: Int = 300) -> String? {
        guard let s else { return nil }
        let t = s.trimmingCharacters(in: .whitespacesAndNewlines)
        return t.count > max ? String(t.prefix(max)) : t
    }

    static func validCoordinate(lat: Double, lon: Double) -> Bool {
        lat.isFinite && lon.isFinite && (-90...90).contains(lat) && (-180...180).contains(lon)
    }

    static func finite(_ v: Double?, in range: ClosedRange<Double>) -> Double? {
        guard let v, v.isFinite, range.contains(v) else { return nil }
        return v
    }
}

/// Decodes an array, skipping elements that fail instead of failing the whole payload.
struct LossyArray<Element: Decodable & Sendable>: Decodable, Sendable {
    let elements: [Element]
    init(_ e: [Element]) { elements = e }
    init(from decoder: Decoder) throws {
        var c = try decoder.unkeyedContainer()
        var out: [Element] = []
        out.reserveCapacity(c.count ?? 0)
        while !c.isAtEnd {
            if let e = try? c.decode(Element.self) { out.append(e) }
            else { _ = try? c.decode(Discard.self) }
            if out.count >= Limits.maxFeatures { break }
        }
        elements = out
    }
    /// Accepts any JSON value (including null) so the container index always advances.
    private struct Discard: Decodable { init(from decoder: Decoder) throws {} }
}

enum Limits {
    /// Hard caps against oversized / hostile responses.
    static let maxResponseBytes = 30 * 1024 * 1024
    static let maxFeatures = 10_000
}
