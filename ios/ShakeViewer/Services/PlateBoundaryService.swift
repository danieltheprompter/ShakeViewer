import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// One plate-boundary polyline (PB2002, Bird 2003), split at the antimeridian.
struct PlateBoundaryLine: Identifiable, Sendable {
    let id: String
    let name: String
    let coordinates: [Coordinate]
}

/// Same data the website overlays: https://shakeviewer.com/data/PB2002_boundaries.json
/// Order: on-disk cache → network (then cached) → copy bundled in the app (offline first launch).
struct PlateBoundaryService: Sendable {
    static let remoteURL = URL(string: "https://shakeviewer.com/data/PB2002_boundaries.json")!
    static let cacheFileName = "PB2002_boundaries.json"

    let session: URLSession
    let cacheDirectory: URL?
    let bundledURL: URL?

    init(session: URLSession = .shared,
         cacheDirectory: URL? = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first,
         bundledURL: URL? = Bundle.main.url(forResource: "PB2002_boundaries", withExtension: "json")) {
        self.session = session
        self.cacheDirectory = cacheDirectory
        self.bundledURL = bundledURL
    }

    private var cacheURL: URL? { cacheDirectory?.appendingPathComponent(Self.cacheFileName) }

    func load() async -> [PlateBoundaryLine] {
        if let url = cacheURL, let data = try? Data(contentsOf: url), let lines = try? Self.parse(data), !lines.isEmpty {
            return lines
        }
        if let (data, resp) = try? await session.data(from: Self.remoteURL),
           (resp as? HTTPURLResponse).map({ (200..<300).contains($0.statusCode) }) ?? false,
           data.count <= Limits.maxResponseBytes,
           let lines = try? Self.parse(data), !lines.isEmpty {
            if let url = cacheURL { try? data.write(to: url, options: .atomic) }
            return lines
        }
        if let url = bundledURL, let data = try? Data(contentsOf: url), let lines = try? Self.parse(data) {
            return lines
        }
        return []
    }

    // MARK: Parsing

    private struct Collection: Decodable { let features: [Feature] }
    private struct Feature: Decodable {
        let properties: Props?
        let geometry: Geometry?
    }
    private struct Props: Decodable { let Name: String? }
    private struct Geometry: Decodable {
        let type: String
        let coordinates: GeoCoords
    }
    /// LineString ([[x,y]]) or MultiLineString / Polygon ([[[x,y]]]).
    private enum GeoCoords: Decodable {
        case line([[Double]])
        case multi([[[Double]]])
        init(from decoder: Decoder) throws {
            let c = try decoder.singleValueContainer()
            if let l = try? c.decode([[Double]].self) { self = .line(l) } else { self = .multi(try c.decode([[[Double]]].self)) }
        }
        var lines: [[[Double]]] {
            switch self {
            case .line(let l): [l]
            case .multi(let m): m
            }
        }
    }

    static func parse(_ data: Data) throws -> [PlateBoundaryLine] {
        let fc = try JSONDecoder().decode(Collection.self, from: data)
        var out: [PlateBoundaryLine] = []
        for (i, f) in fc.features.enumerated() {
            guard let g = f.geometry else { continue }
            let name = f.properties?.Name ?? "plate-\(i)"
            for (j, raw) in g.coordinates.lines.enumerated() {
                let pts = raw.compactMap { $0.count >= 2 ? Coordinate(latitude: $0[1], longitude: $0[0]) : nil }
                for (k, seg) in splitAtAntimeridian(pts).enumerated() where seg.count >= 2 {
                    out.append(PlateBoundaryLine(id: "\(i)-\(j)-\(k)", name: name, coordinates: seg))
                }
            }
        }
        return out
    }

    /// Break a line wherever it jumps across ±180° so MapKit doesn't draw it around the globe.
    static func splitAtAntimeridian(_ pts: [Coordinate]) -> [[Coordinate]] {
        var result: [[Coordinate]] = []
        var cur: [Coordinate] = []
        for p in pts {
            if let last = cur.last, abs(p.longitude - last.longitude) > 180 {
                result.append(cur)
                cur = []
            }
            cur.append(p)
        }
        if !cur.isEmpty { result.append(cur) }
        return result
    }
}
