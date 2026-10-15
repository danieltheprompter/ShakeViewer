import SwiftUI
import MapKit

/// Imperative handle to the MKMapView for overlays (draw mode, bounds handles) and camera moves.
/// Only `cameraTick` / `debugCamera` are observable, and only tiny overlay views read them, so camera
/// movement never invalidates the map screen's body.
@MainActor
@Observable
final class MapController {
    @ObservationIgnored weak var mapView: MKMapView?
    /// Bumped on every visible-region change. Read ONLY by small overlays that must track the camera.
    private(set) var cameraTick = 0
    private(set) var debugCamera = ""

    var visibleRegion: MKCoordinateRegion? { mapView?.region }

    /// Point in the map view's own coordinate space (== the SwiftUI overlay's .local space).
    func point(for c: CLLocationCoordinate2D) -> CGPoint? {
        guard let mv = mapView else { return nil }
        return mv.convert(c, toPointTo: mv)
    }

    func coordinate(atLocal p: CGPoint) -> CLLocationCoordinate2D? {
        guard let mv = mapView else { return nil }
        return mv.convert(p, toCoordinateFrom: mv)
    }

    /// SwiftUI `.global` ≈ window coordinates.
    func coordinate(atGlobal p: CGPoint) -> CLLocationCoordinate2D? {
        guard let mv = mapView else { return nil }
        return mv.convert(mv.convert(p, from: nil), toCoordinateFrom: mv)
    }

    func fly(to c: CLLocationCoordinate2D, distance: Double, animated: Bool = true) {
        guard let mv = mapView else { return }
        mv.setCamera(MKMapCamera(lookingAtCenter: c, fromDistance: distance, pitch: 0, heading: 0), animated: animated)
    }

    func show(region: MKCoordinateRegion, animated: Bool = true) {
        mapView?.setRegion(region, animated: animated)
    }

    fileprivate func regionChanged(_ mv: MKMapView, final: Bool) {
        cameraTick &+= 1
        #if DEBUG
        if final {
            let r = mv.region
            debugCamera = String(format: "%.3f,%.3f,%.3f", r.center.latitude, r.center.longitude, r.span.latitudeDelta)
        }
        #endif
    }
}

// MARK: - Annotations

final class QuakeAnnotation: NSObject, MKAnnotation {
    let quake: Quake
    let coordinate: CLLocationCoordinate2D
    init(_ q: Quake) {
        quake = q
        coordinate = CLLocationCoordinate2D(latitude: q.latitude, longitude: q.longitude)
    }
}

final class UserDotAnnotation: NSObject, MKAnnotation {
    let coordinate: CLLocationCoordinate2D
    init(_ c: Coordinate) { coordinate = CLLocationCoordinate2D(latitude: c.latitude, longitude: c.longitude) }
}

/// Cheap, reusable marker: two CAShapeLayers, no SwiftUI hosting.
final class QuakeAnnotationView: MKAnnotationView {
    static let reuseID = "quake"
    private let dot = CAShapeLayer()
    private let halo = CAShapeLayer()

    override init(annotation: MKAnnotation?, reuseIdentifier: String?) {
        super.init(annotation: annotation, reuseIdentifier: reuseIdentifier)
        canShowCallout = false
        collisionMode = .circle
        layer.addSublayer(halo)
        layer.addSublayer(dot)
        isAccessibilityElement = true
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    func configure(_ q: Quake, selected: Bool) {
        let base = max(10, min(44, q.mag * q.mag * 1.4))
        let size = selected ? max(22, base) : base
        let pad: CGFloat = selected ? 8 : 0
        let side = CGFloat(size) + pad * 2
        frame = CGRect(x: 0, y: 0, width: side, height: side)
        centerOffset = .zero
        let color = UIColor(Color(hex: q.tier.hex))
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        dot.frame = bounds
        dot.path = UIBezierPath(ovalIn: CGRect(x: pad, y: pad, width: size, height: size)).cgPath
        dot.fillColor = color.withAlphaComponent(0.75).cgColor
        dot.strokeColor = selected ? UIColor.label.cgColor : color.cgColor
        dot.lineWidth = selected ? 3 : 1
        halo.frame = bounds
        halo.path = selected ? UIBezierPath(ovalIn: bounds.insetBy(dx: 1.5, dy: 1.5)).cgPath : nil
        halo.fillColor = UIColor.clear.cgColor
        halo.strokeColor = color.withAlphaComponent(0.5).cgColor
        halo.lineWidth = 3
        CATransaction.commit()
        // Big quakes win collisions and draw on top.
        displayPriority = selected ? .required : MKFeatureDisplayPriority(rawValue: Float(min(999, 250 + q.mag * 100)))
        zPriority = selected ? .max : MKAnnotationViewZPriority(rawValue: Float(q.mag * 10))
        accessibilityLabel = "Magnitude \(q.magText), \(q.place)"
    }
}

// MARK: - Map

struct QuakeMapView: UIViewRepresentable {
    let controller: MapController
    let quakes: [Quake]
    let quakesVersion: Int
    let selected: Quake?
    let userLocation: Coordinate?
    let nearMeRadiusKm: Double?
    let bounds: BoundingBox?
    let showFaults: Bool
    let plateLines: [PlateBoundaryLine]
    let mapStyle: MapStyleOption
    let focus: QuakeViewModel.MapFocus?
    let initialCamera: (Double, Double, Double)?
    let onSelect: (Quake) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(controller: controller, onSelect: onSelect) }

    func makeUIView(context: Context) -> MKMapView {
        let mv = MKMapView(frame: .zero)
        mv.delegate = context.coordinator
        mv.showsUserLocation = false          // never let MapKit track/pan to the user on its own
        mv.userTrackingMode = .none
        mv.showsCompass = true
        mv.showsScale = true
        mv.isPitchEnabled = false
        mv.register(QuakeAnnotationView.self, forAnnotationViewWithReuseIdentifier: QuakeAnnotationView.reuseID)
        controller.mapView = mv
        let c = initialCamera ?? (20, 10, 28_000_000)
        mv.setCamera(MKMapCamera(lookingAtCenter: CLLocationCoordinate2D(latitude: c.0, longitude: c.1),
                                 fromDistance: c.2, pitch: 0, heading: 0), animated: false)
        return mv
    }

    func updateUIView(_ mv: MKMapView, context: Context) {
        let co = context.coordinator
        co.onSelect = onSelect
        co.applyStyle(mapStyle, to: mv)
        co.syncQuakes(quakes, version: quakesVersion, selected: selected, on: mv)
        co.syncSelection(selected, on: mv)
        co.syncUser(userLocation, radiusKm: nearMeRadiusKm, on: mv)
        co.syncBounds(bounds, on: mv)
        co.syncFaults(showFaults ? plateLines : [], on: mv)
        co.applyFocus(focus, selected: selected, on: mv)
    }

    @MainActor
    final class Coordinator: NSObject, MKMapViewDelegate {
        let controller: MapController
        var onSelect: (Quake) -> Void
        private var annotations: [String: QuakeAnnotation] = [:]
        private var quakesVersion = -1
        private var selectedID: String?
        private var extraSelected: QuakeAnnotation?
        private var userAnn: UserDotAnnotation?
        private var userKey: String?
        private var nearCircle: MKCircle?
        private var boundsPoly: MKPolygon?
        private var boundsValue: BoundingBox?
        private var faults: MKMultiPolyline?
        private var faultsCount = 0
        private var style: MapStyleOption?
        private var focusID: UUID?

        init(controller: MapController, onSelect: @escaping (Quake) -> Void) {
            self.controller = controller
            self.onSelect = onSelect
        }

        func applyStyle(_ s: MapStyleOption, to mv: MKMapView) {
            guard s != style else { return }
            style = s
            switch s {
            case .standard: mv.preferredConfiguration = MKStandardMapConfiguration(elevationStyle: .realistic)
            case .muted: mv.preferredConfiguration = MKStandardMapConfiguration(elevationStyle: .flat, emphasisStyle: .muted)
            case .satellite: mv.preferredConfiguration = MKHybridMapConfiguration(elevationStyle: .realistic)
            }
        }

        /// Diff by id: only changed quakes are added/removed (no full reload on auto-refresh).
        func syncQuakes(_ quakes: [Quake], version: Int, selected: Quake?, on mv: MKMapView) {
            guard version != quakesVersion else { return }
            quakesVersion = version
            var next: [String: Quake] = [:]
            next.reserveCapacity(quakes.count)
            for q in quakes { next[q.id] = q }
            var remove: [QuakeAnnotation] = []
            for (id, ann) in annotations where next[id] != ann.quake {
                remove.append(ann)
                annotations[id] = nil
            }
            var add: [QuakeAnnotation] = []
            for (id, q) in next where annotations[id] == nil {
                let a = QuakeAnnotation(q)
                annotations[id] = a
                add.append(a)
            }
            if !remove.isEmpty { mv.removeAnnotations(remove) }
            if !add.isEmpty { mv.addAnnotations(add) }
            selectedID = nil // force re-evaluation of the selected highlight / extra annotation
        }

        func syncSelection(_ selected: Quake?, on mv: MKMapView) {
            guard selected?.id != selectedID else { return }
            let old = selectedID
            selectedID = selected?.id
            // Selected quake not in the current list (e.g. from Bookmarks): add it on its own.
            if let x = extraSelected, x.quake.id != selected?.id {
                mv.removeAnnotation(x)
                extraSelected = nil
            }
            if let s = selected, annotations[s.id] == nil, extraSelected == nil {
                let a = QuakeAnnotation(s)
                extraSelected = a
                mv.addAnnotation(a)
            }
            for id in [old, selectedID].compactMap({ $0 }) {
                let ann = annotations[id] ?? (extraSelected?.quake.id == id ? extraSelected : nil)
                if let ann, let v = mv.view(for: ann) as? QuakeAnnotationView {
                    v.configure(ann.quake, selected: id == selectedID)
                }
            }
        }

        func syncUser(_ loc: Coordinate?, radiusKm: Double?, on mv: MKMapView) {
            let key = loc.map { "\($0.latitude),\($0.longitude),\(radiusKm ?? -1)" }
            guard key != userKey else { return }
            userKey = key
            if let u = userAnn { mv.removeAnnotation(u); userAnn = nil }
            if let c = nearCircle { mv.removeOverlay(c); nearCircle = nil }
            guard let loc else { return }
            let u = UserDotAnnotation(loc)
            userAnn = u
            mv.addAnnotation(u)
            if let r = radiusKm {
                let c = MKCircle(center: u.coordinate, radius: r * 1000)
                nearCircle = c
                mv.addOverlay(c, level: .aboveRoads)
            }
        }

        func syncBounds(_ b: BoundingBox?, on mv: MKMapView) {
            guard b != boundsValue else { return }
            boundsValue = b
            if let p = boundsPoly { mv.removeOverlay(p); boundsPoly = nil }
            guard let b else { return }
            var corners = b.corners
            let p = MKPolygon(coordinates: &corners, count: corners.count)
            boundsPoly = p
            mv.addOverlay(p, level: .aboveLabels)
        }

        /// One MKMultiPolyline for all 241 plate boundaries: a single renderer, built once.
        func syncFaults(_ lines: [PlateBoundaryLine], on mv: MKMapView) {
            guard lines.count != faultsCount else { return }
            faultsCount = lines.count
            if let f = faults { mv.removeOverlay(f); faults = nil }
            guard !lines.isEmpty else { return }
            let polys = lines.map { l -> MKPolyline in
                var cs = l.coordinates.map { CLLocationCoordinate2D(latitude: $0.latitude, longitude: $0.longitude) }
                return MKPolyline(coordinates: &cs, count: cs.count)
            }
            let m = MKMultiPolyline(polys)
            faults = m
            mv.addOverlay(m, level: .aboveRoads)
        }

        func applyFocus(_ f: QuakeViewModel.MapFocus?, selected: Quake?, on mv: MKMapView) {
            guard let f, f.id != focusID else { return }
            focusID = f.id
            controller.fly(to: CLLocationCoordinate2D(latitude: f.coordinate.latitude, longitude: f.coordinate.longitude), distance: f.distance)
        }

        // MARK: Delegate

        func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
            if let q = annotation as? QuakeAnnotation {
                let v = mapView.dequeueReusableAnnotationView(withIdentifier: QuakeAnnotationView.reuseID, for: q) as! QuakeAnnotationView
                v.configure(q.quake, selected: q.quake.id == selectedID)
                return v
            }
            if annotation is UserDotAnnotation {
                let v = mapView.dequeueReusableAnnotationView(withIdentifier: "you")
                    ?? MKAnnotationView(annotation: annotation, reuseIdentifier: "you")
                v.annotation = annotation
                v.image = UIImage(systemName: "location.circle.fill")?
                    .withTintColor(.systemBlue, renderingMode: .alwaysOriginal)
                    .applyingSymbolConfiguration(.init(pointSize: 22, weight: .semibold))
                v.displayPriority = .required
                v.zPriority = .max
                v.accessibilityLabel = "You"
                return v
            }
            return nil
        }

        func mapView(_ mapView: MKMapView, didSelect annotation: MKAnnotation) {
            mapView.deselectAnnotation(annotation, animated: false)
            if let q = annotation as? QuakeAnnotation { onSelect(q.quake) }
        }

        func mapView(_ mapView: MKMapView, rendererFor overlay: MKOverlay) -> MKOverlayRenderer {
            if let m = overlay as? MKMultiPolyline {
                // Site style: #ea580c, weight 2, opacity 0.8, dash 5/5.
                let r = MKMultiPolylineRenderer(multiPolyline: m)
                r.strokeColor = UIColor(Color(hex: 0xEA580C)).withAlphaComponent(0.8)
                r.lineWidth = 2
                r.lineDashPattern = [5, 5]
                r.lineCap = .round
                return r
            }
            if let p = overlay as? MKPolygon {
                let r = MKPolygonRenderer(polygon: p)
                r.fillColor = UIColor.systemRed.withAlphaComponent(0.10)
                r.strokeColor = .systemRed
                r.lineWidth = 2
                r.lineDashPattern = [6, 5]
                return r
            }
            if let c = overlay as? MKCircle {
                let r = MKCircleRenderer(circle: c)
                r.fillColor = UIColor.systemBlue.withAlphaComponent(0.08)
                r.strokeColor = UIColor.systemBlue.withAlphaComponent(0.6)
                r.lineWidth = 1
                return r
            }
            return MKOverlayRenderer(overlay: overlay)
        }

        func mapViewDidChangeVisibleRegion(_ mapView: MKMapView) {
            controller.regionChanged(mapView, final: false)
        }

        func mapView(_ mapView: MKMapView, regionDidChangeAnimated animated: Bool) {
            controller.regionChanged(mapView, final: true)
        }
    }
}
