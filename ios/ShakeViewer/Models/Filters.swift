import Foundation

enum TimeRange: String, CaseIterable, Identifiable, Sendable {
    case day, week, month, custom
    var id: String { rawValue }
    var title: String {
        switch self {
        case .day: "24h"
        case .week: "7d"
        case .month: "30d"
        case .custom: "Custom"
        }
    }
    var hours: Double {
        switch self {
        case .day: 24
        case .week: 168
        case .month, .custom: 720
        }
    }
    /// Min magnitude of the feed itself (USGS summary feed tier / EMSC minmag).
    var feedMinMag: Double {
        switch self {
        case .day: 2.5
        case .week: 3.5
        case .month, .custom: 4.5
        }
    }
    /// Auto-refresh interval used by the site.
    var refreshInterval: Duration? {
        switch self {
        case .day: .seconds(60)
        case .week, .month: .seconds(300)
        case .custom: nil
        }
    }
}

enum DepthFilter: String, CaseIterable, Identifiable, Sendable {
    case all, shallow, intermediate, deep
    var id: String { rawValue }
    var title: String {
        switch self {
        case .all: "All"
        case .shallow: "Shallow"
        case .intermediate: "Mid"
        case .deep: "Deep"
        }
    }
    func matches(depth: Double) -> Bool {
        let d = abs(depth)
        switch self {
        case .all: return true
        case .shallow: return d < 70
        case .intermediate: return d >= 70 && d < 300
        case .deep: return d >= 300
        }
    }
}

enum SortType: String, CaseIterable, Identifiable, Sendable {
    case time, magnitude
    var id: String { rawValue }
}

enum MapStyleOption: String, CaseIterable, Identifiable, Sendable {
    case standard, muted, satellite
    var id: String { rawValue }
    var title: String {
        switch self {
        case .standard: "Standard"
        case .muted: "Muted"
        case .satellite: "Satellite"
        }
    }
}

struct Coordinate: Codable, Sendable, Hashable {
    var latitude: Double
    var longitude: Double
}

struct BoundingBox: Codable, Sendable, Hashable {
    var minLat: Double
    var maxLat: Double
    var minLon: Double
    var maxLon: Double
}

struct CustomSearch: Codable, Sendable, Hashable {
    /// yyyy-MM-dd
    var startDate: String
    var endDate: String
    var minMag: Double
    var bounds: BoundingBox?
}

struct QuakeFilter: Sendable, Equatable {
    var minMag: Double = 2.5
    var depth: DepthFilter = .all
    var sort: SortType = .time
    var descending: Bool = true
    var nearMeRadiusKm: Double? = nil
    var userLocation: Coordinate? = nil

    /// Slider floor. At the floor the magnitude filter is OFF ("Any"): the feed / custom search already
    /// set the magnitude floor, and feeds legitimately contain events below 2.5 (revised or missing mags,
    /// custom searches below M2.5) that used to be hidden silently, making "x of y" differ with no filter set.
    static let magFloor = 2.5

    var magActive: Bool { minMag > Self.magFloor + 0.0001 }
    /// Near-me only filters once a location is known (otherwise apply() ignores it).
    var nearMeEffective: Bool { nearMeRadiusKm != nil && userLocation != nil }
    var isActive: Bool { magActive || depth != .all || nearMeEffective }

    /// Compares the magnitude as displayed (1 decimal), so a quake shown as "4.5" is never hidden by an M4.5+ filter.
    func passesMag(_ mag: Double) -> Bool {
        !magActive || (mag * 10).rounded() / 10 >= minMag - 0.0001
    }

    /// Short human summary of the active filters, e.g. ["M4.5+", "Deep", "≤500 km"].
    var activeSummary: [String] {
        var out: [String] = []
        if magActive { out.append(String(format: "M%.1f+", minMag)) }
        if depth != .all { out.append(depth.title) }
        if nearMeEffective, let r = nearMeRadiusKm { out.append("≤\(Int(r)) km") }
        return out
    }

    func apply(to quakes: [Quake]) -> [Quake] {
        var list = quakes.filter { depth.matches(depth: $0.depth) && passesMag($0.mag) }
        if let r = nearMeRadiusKm, let loc = userLocation {
            list = list.filter { Geo.distanceKm(loc, Coordinate(latitude: $0.latitude, longitude: $0.longitude)) <= r }
        }
        let desc = descending
        switch sort {
        case .time: list.sort { desc ? $0.timeMs > $1.timeMs : $0.timeMs < $1.timeMs }
        case .magnitude: list.sort { desc ? $0.mag > $1.mag : $0.mag < $1.mag }
        }
        return list
    }
}

enum Geo {
    /// Haversine distance in km.
    static func distanceKm(_ a: Coordinate, _ b: Coordinate) -> Double {
        let r = 6371.0
        let dLat = (b.latitude - a.latitude) * .pi / 180
        let dLon = (b.longitude - a.longitude) * .pi / 180
        let la1 = a.latitude * .pi / 180, la2 = b.latitude * .pi / 180
        let h = sin(dLat / 2) * sin(dLat / 2) + cos(la1) * cos(la2) * sin(dLon / 2) * sin(dLon / 2)
        return 2 * r * atan2(sqrt(h), sqrt(1 - h))
    }

    static func formatCoord(lat: Double, lon: Double) -> String {
        String(format: "%.2f°%@  %.2f°%@", abs(lat), lat >= 0 ? "N" : "S", abs(lon), lon >= 0 ? "E" : "W")
    }
}
