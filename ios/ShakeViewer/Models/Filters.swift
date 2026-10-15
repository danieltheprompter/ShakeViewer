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

    func apply(to quakes: [Quake]) -> [Quake] {
        var list = quakes.filter { depth.matches(depth: $0.depth) && $0.mag >= minMag }
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
