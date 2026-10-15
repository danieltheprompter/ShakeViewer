import Foundation

/// Same fields as the site's bookmark docs (users/{uid}/bookmarks and localStorage `shakeviewer_bookmarks`).
struct Bookmark: Identifiable, Codable, Sendable, Hashable {
    var id: String
    var quakeId: String
    var mag: Double
    var place: String
    var time: Double
    var lat: Double
    var lng: Double
    var depth: Double
    var source: String
    var felt: Int
    var url: String
    var note: String

    init(quake q: Quake, id: String? = nil) {
        self.id = id ?? "local_" + q.id
        quakeId = q.id; mag = q.mag; place = q.place; time = q.timeMs
        lat = q.latitude; lng = q.longitude; depth = q.depth
        source = q.source.rawValue; felt = q.felt; url = q.url?.absoluteString ?? ""; note = ""
    }

    var asQuake: Quake {
        Quake(id: quakeId, mag: mag, place: place, timeMs: time, felt: felt, tsunami: false,
              url: URL(string: url), latitude: lat, longitude: lng, depth: depth,
              source: QuakeSource(rawValue: source) ?? .usgs)
    }
}
