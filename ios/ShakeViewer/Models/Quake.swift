import Foundation

enum QuakeSource: String, Codable, Sendable, Hashable {
    case usgs = "USGS"
    case emsc = "EMSC"
}

/// Normalized earthquake, mirroring the web app's merged feature shape.
struct Quake: Identifiable, Codable, Sendable, Hashable {
    let id: String
    let mag: Double
    let place: String
    /// Milliseconds since epoch (as on the web).
    let timeMs: Double
    let felt: Int
    let tsunami: Bool
    let url: URL?
    let latitude: Double
    let longitude: Double
    /// Kilometres, positive down.
    let depth: Double
    let source: QuakeSource

    var date: Date { Date(timeIntervalSince1970: timeMs / 1000) }
    var tier: MagnitudeTier { MagnitudeTier(mag) }

    /// Shareable deep link that matches the website (`?quake=<id>`).
    var shareURL: URL {
        var c = URLComponents(string: "https://shakeviewer.com/")!
        c.queryItems = [URLQueryItem(name: "quake", value: id)]
        return c.url!
    }
}

/// Colour tiers identical to the site's getMagnitudeHex / legend.
enum MagnitudeTier: String, CaseIterable, Sendable {
    case minor, moderate, strong, major

    init(_ m: Double) {
        if m >= 6.0 { self = .major }
        else if m >= 4.5 { self = .strong }
        else if m >= 3.5 { self = .moderate }
        else { self = .minor }
    }

    var hex: UInt32 {
        switch self {
        case .minor: 0x22C55E
        case .moderate: 0xEAB308
        case .strong: 0xF97316
        case .major: 0xEF4444
        }
    }

    var label: String {
        switch self {
        case .minor: "Minor"
        case .moderate: "Moderate"
        case .strong: "Strong"
        case .major: "Major"
        }
    }

    var rangeLabel: String {
        switch self {
        case .minor: "< 3.5"
        case .moderate: "3.5 – 4.5"
        case .strong: "4.5 – 6.0"
        case .major: "6.0 +"
        }
    }
}
