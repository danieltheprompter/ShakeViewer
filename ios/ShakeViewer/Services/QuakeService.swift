import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

enum QuakeServiceError: Error, LocalizedError, Sendable {
    case allSourcesFailed
    var errorDescription: String? { "Could not reach USGS or EMSC — pull to refresh to retry." }
}

/// Fetches and merges USGS + EMSC feeds exactly like the website's fetchStandard / runCustomSearch.
struct QuakeService: Sendable {
    let session: URLSession

    init(session: URLSession = .shared) { self.session = session }

    // MARK: URLs

    static func usgsSummaryURL(_ range: TimeRange) -> URL {
        let name: String = switch range {
        case .day: "2.5_day"
        case .week: "2.5_week"
        case .month, .custom: "4.5_month"
        }
        return URL(string: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/\(name).geojson")!
    }

    static func emscRecentURL(_ range: TimeRange, now: Date = Date()) -> URL {
        let start = now.addingTimeInterval(-range.hours * 3600)
        var c = URLComponents(string: "https://www.seismicportal.eu/fdsnws/event/1/query")!
        c.queryItems = [
            .init(name: "format", value: "json"),
            .init(name: "starttime", value: isoFormatter().string(from: start)),
            .init(name: "limit", value: String(resultLimit)),
            .init(name: "minmag", value: String(range.feedMinMag)),
        ]
        return c.url!
    }

    static func usgsCustomURL(_ s: CustomSearch) -> URL {
        var c = URLComponents(string: "https://earthquake.usgs.gov/fdsnws/event/1/query")!
        var q: [URLQueryItem] = [
            .init(name: "format", value: "geojson"),
            .init(name: "starttime", value: s.startDate),
            .init(name: "endtime", value: s.endDate + "T23:59:59"),
            .init(name: "minmagnitude", value: String(s.minMag)),
        ]
        if let b = s.bounds {
            q += [.init(name: "minlatitude", value: String(b.minLat)), .init(name: "maxlatitude", value: String(b.maxLat)),
                  .init(name: "minlongitude", value: String(b.minLon)), .init(name: "maxlongitude", value: String(b.maxLon))]
        }
        q += [.init(name: "limit", value: String(resultLimit)), .init(name: "orderby", value: "time")]
        c.queryItems = q
        return c.url!
    }

    static func emscCustomURL(_ s: CustomSearch) -> URL {
        var c = URLComponents(string: "https://www.seismicportal.eu/fdsnws/event/1/query")!
        var q: [URLQueryItem] = [
            .init(name: "format", value: "json"),
            .init(name: "starttime", value: s.startDate + "T00:00:00"),
            .init(name: "endtime", value: s.endDate + "T23:59:59"),
            .init(name: "minmag", value: String(s.minMag)),
        ]
        if let b = s.bounds {
            q += [.init(name: "minlat", value: String(b.minLat)), .init(name: "maxlat", value: String(b.maxLat)),
                  .init(name: "minlon", value: String(b.minLon)), .init(name: "maxlon", value: String(b.maxLon))]
        }
        q.append(.init(name: "limit", value: String(resultLimit)))
        c.queryItems = q
        return c.url!
    }

    // MARK: Fetch

    func fetchRecent(_ range: TimeRange) async throws -> [Quake] {
        let r = try await fetchBoth(usgs: Self.usgsSummaryURL(range), emsc: Self.emscRecentURL(range))
        let merged = Self.merge(usgs: r.usgs, emsc: r.emsc, emscMinMag: range.feedMinMag, emscFallbackURL: true)
        if merged.isEmpty { throw QuakeServiceError.allSourcesFailed }
        return merged
    }

    /// Per-source result cap used by the site for custom searches (`limit=2500`).
    static let resultLimit = 2500

    struct CustomResult: Sendable {
        let quakes: [Quake]
        /// True when USGS or EMSC returned exactly `resultLimit` rows (results were truncated).
        let hitLimit: Bool
        let usgsFailed: Bool
        let emscFailed: Bool
    }

    /// Returns an empty list when nothing matches (site shows a "no match" message).
    func fetchCustom(_ search: CustomSearch) async throws -> CustomResult {
        let r = try await fetchBoth(usgs: Self.usgsCustomURL(search), emsc: Self.emscCustomURL(search), requireOne: true)
        let hit = (r.usgs?.features.count ?? 0) >= Self.resultLimit || (r.emsc?.features.count ?? 0) >= Self.resultLimit
        return CustomResult(quakes: Self.merge(usgs: r.usgs, emsc: r.emsc, emscMinMag: nil, emscFallbackURL: false),
                            hitLimit: hit, usgsFailed: r.usgs == nil, emscFailed: r.emsc == nil)
    }

    private func fetchBoth(usgs: URL, emsc: URL, requireOne: Bool = false) async throws -> (usgs: GeoJSONCollection?, emsc: GeoJSONCollection?) {
        async let u = load(usgs)
        async let e = load(emsc)
        let (ur, er) = await (u, e)
        let uv = try? ur.get(), ev = try? er.get()
        if requireOne && uv == nil && ev == nil { throw QuakeServiceError.allSourcesFailed }
        return (uv, ev)
    }

    private func load(_ url: URL) async -> Result<GeoJSONCollection, Error> {
        do {
            var req = URLRequest(url: url)
            req.timeoutInterval = 20
            let (data, resp) = try await session.data(for: req)
            if let http = resp as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
                throw URLError(.badServerResponse)
            }
            guard data.count <= Limits.maxResponseBytes else { throw URLError(.dataLengthExceedsMaximum) }
            // EMSC returns 204 No Content for empty results.
            if data.isEmpty { return .success(GeoJSONCollection(features: [])) }
            return .success(try JSONDecoder().decode(GeoJSONCollection.self, from: data))
        } catch {
            return .failure(error)
        }
    }

    // MARK: Merge (USGS wins; EMSC dedup by 2-minute / 0.5° cluster key)

    static func clusterKey(timeMs: Double, lat: Double, lng: Double) -> String {
        // JS Math.round semantics (.5 rounds toward +infinity).
        func jsRound(_ v: Double) -> Int { Int((v + 0.5).rounded(.down)) }
        let t = jsRound(timeMs / 120_000)
        let y = jsRound(lat * 2)
        let x = jsRound(lng * 2)
        return "\(t)_\(y)_\(x)"
    }

    static func merge(usgs: GeoJSONCollection?, emsc: GeoJSONCollection?, emscMinMag: Double?, emscFallbackURL: Bool) -> [Quake] {
        var merged: [String: Quake] = [:]
        for f in usgs?.features ?? [] {
            guard let c = f.geometry?.coordinates, c.count >= 2,
                  InputSanitizer.validCoordinate(lat: c[1], lon: c[0]) else { continue }
            let p = f.properties
            let t = p.time?.millis ?? 0
            guard t.isFinite else { continue }
            let id = InputSanitizer.quakeId(f.id) ?? "usgs_\(Int(t))"
            let q = Quake(
                id: id, mag: InputSanitizer.finite(p.mag, in: -2...10) ?? 0,
                place: titleCase(InputSanitizer.text(p.place) ?? "Unknown location"),
                timeMs: t, felt: max(0, p.felt ?? 0), tsunami: (p.tsunami ?? 0) != 0,
                url: SafeLinks.external(p.url) ?? URL(string: "https://earthquake.usgs.gov/earthquakes/eventpage/\(id)"),
                latitude: c[1], longitude: c[0],
                depth: c.count > 2 ? (InputSanitizer.finite(c[2], in: -20...1000) ?? 0) : 0, source: .usgs)
            merged[clusterKey(timeMs: t, lat: c[1], lng: c[0])] = q
        }
        for f in emsc?.features ?? [] {
            let p = f.properties
            let mag = InputSanitizer.finite(p.mag ?? p.magnitude, in: -2...10) ?? 0
            if let m = emscMinMag, mag < m { continue }
            guard let c = f.geometry?.coordinates, c.count >= 2,
                  InputSanitizer.validCoordinate(lat: c[1], lon: c[0]) else { continue }
            let t = (p.time ?? p.origintime)?.millis ?? 0
            guard t.isFinite else { continue }
            let k = clusterKey(timeMs: t, lat: c[1], lng: c[0])
            if merged[k] != nil { continue }
            let unid = InputSanitizer.quakeId(p.unid)
            let suffix = unid ?? InputSanitizer.quakeId(p.source_id) ?? "\(Int(t))_\(c[1])_\(c[0])"
            let url: URL? = unid.flatMap { URL(string: "https://www.seismicportal.eu/eventdetails.html?unid=\($0)") }
                ?? (emscFallbackURL ? URL(string: "https://www.seismicportal.eu/") : nil)
            merged[k] = Quake(
                id: "emsc_" + suffix, mag: mag, place: titleCase(InputSanitizer.text(p.flynn_region ?? p.region) ?? "Unknown location"),
                timeMs: t, felt: 0, tsunami: false, url: url,
                latitude: c[1], longitude: c[0], depth: InputSanitizer.finite(c.count > 2 ? abs(c[2]) : p.depth, in: -20...1000) ?? 0, source: .emsc)
        }
        // Stable order (newest first) so identical refreshes compare equal and cause no UI work.
        return merged.values.sorted { $0.timeMs != $1.timeMs ? $0.timeMs > $1.timeMs : $0.id < $1.id }
    }

    private static let keepUpper: Set<String> = [
        "CA", "NV", "OR", "WA", "UT", "NY", "TX", "AK", "HI", "US", "USA", "PR", "UK", "NZ", "N.Z.", "EU",
        "N", "S", "E", "W", "NE", "NW", "SE", "SW", "NNW", "NNE", "SSW", "SSE", "ENE", "ESE", "WNW", "WSW",
        "NE.", "NW.", "SE.", "SW.",
    ]

    /// Port of the site's toTitleCase (keeps state codes / compass points upper-case, "12 km" lower-case).
    static func titleCase(_ s: String) -> String {
        s.split(separator: " ", omittingEmptySubsequences: false).map { sub -> String in
            let w = String(sub)
            guard let first = w.first else { return w }
            let u = w.uppercased()
            if keepUpper.contains(u) { return u }
            if first.isNumber { return w.lowercased() }
            return first.uppercased() + w.dropFirst().lowercased()
        }.joined(separator: " ")
    }

    static func isoFormatter() -> ISO8601DateFormatter {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }
}

// MARK: - Raw GeoJSON (shared shape for USGS geojson + EMSC json)

struct GeoJSONCollection: Decodable, Sendable {
    let features: [GeoJSONFeature]
    init(features: [GeoJSONFeature]) { self.features = features }
    private enum K: String, CodingKey { case features }
    /// Lossy: one malformed feature is skipped instead of dropping the whole feed; capped at Limits.maxFeatures.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: K.self)
        features = (try c.decodeIfPresent(LossyArray<GeoJSONFeature>.self, forKey: .features))?.elements ?? []
    }
}

struct GeoJSONFeature: Decodable, Sendable {
    let id: String?
    let geometry: Geometry?
    let properties: Properties

    struct Geometry: Decodable, Sendable { let coordinates: [Double] }

    struct Properties: Decodable, Sendable {
        let mag: Double?
        let magnitude: Double?
        let place: String?
        let time: FlexibleTime?
        let origintime: FlexibleTime?
        let felt: Int?
        let tsunami: Int?
        let url: String?
        // EMSC
        let unid: String?
        let source_id: String?
        let flynn_region: String?
        let region: String?
        let depth: Double?
    }
}

/// USGS gives epoch-ms numbers; EMSC gives ISO-8601 strings.
struct FlexibleTime: Decodable, Sendable {
    let millis: Double

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let n = try? c.decode(Double.self) { millis = n; return }
        let s = try c.decode(String.self)
        millis = FlexibleTime.parse(s) ?? 0
    }

    static func parse(_ s: String) -> Double? {
        let withZone = (s.hasSuffix("Z") || s.contains("+")) ? s : s + "Z"
        let f1 = ISO8601DateFormatter()
        f1.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = f1.date(from: withZone) { return d.timeIntervalSince1970 * 1000 }
        let f2 = ISO8601DateFormatter()
        f2.formatOptions = [.withInternetDateTime]
        if let d = f2.date(from: withZone) { return d.timeIntervalSince1970 * 1000 }
        return nil
    }
}
