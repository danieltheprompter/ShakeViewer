import SwiftUI
import MapKit

extension BoundingBox {
    var corners: [CLLocationCoordinate2D] {
        [CLLocationCoordinate2D(latitude: maxLat, longitude: minLon),
         CLLocationCoordinate2D(latitude: maxLat, longitude: maxLon),
         CLLocationCoordinate2D(latitude: minLat, longitude: maxLon),
         CLLocationCoordinate2D(latitude: minLat, longitude: minLon)]
    }

    func region(padding: Double = 1) -> MKCoordinateRegion {
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: (minLat + maxLat) / 2, longitude: (minLon + maxLon) / 2),
            span: MKCoordinateSpan(latitudeDelta: min(170, max(0.05, (maxLat - minLat) * padding)),
                                   longitudeDelta: min(360, max(0.05, (maxLon - minLon) * padding))))
    }

    /// Rectangle from two arbitrary corners (site: Math.min/Math.max of drag start/end).
    init(_ a: CLLocationCoordinate2D, _ b: CLLocationCoordinate2D) {
        self.init(minLat: min(a.latitude, b.latitude), maxLat: max(a.latitude, b.latitude),
                  minLon: min(a.longitude, b.longitude), maxLon: max(a.longitude, b.longitude))
    }

    init(region r: MKCoordinateRegion) {
        self.init(minLat: max(-90, r.center.latitude - r.span.latitudeDelta / 2),
                  maxLat: min(90, r.center.latitude + r.span.latitudeDelta / 2),
                  minLon: max(-180, r.center.longitude - r.span.longitudeDelta / 2),
                  maxLon: min(180, r.center.longitude + r.span.longitudeDelta / 2))
    }

    /// Rounded like a human would type them (keeps URLs short).
    var rounded: BoundingBox {
        func r(_ v: Double) -> Double { (v * 1000).rounded() / 1000 }
        return BoundingBox(minLat: r(minLat), maxLat: r(maxLat), minLon: r(minLon), maxLon: r(maxLon))
    }
}

/// Site: "Draw search area" mode — map panning disabled, drag a rectangle, release to select.
struct DrawAreaOverlay: View {
    @Environment(QuakeViewModel.self) private var model
    let controller: MapController
    @State private var start: CGPoint?
    @State private var current: CGPoint?

    var body: some View {
        ZStack {
            // Captures touches so the map doesn't pan while drawing.
            Color.black.opacity(0.08)
                .contentShape(Rectangle())
                .gesture(
                    DragGesture(minimumDistance: 0, coordinateSpace: .local)
                        .onChanged { v in
                            if start == nil { start = v.startLocation }
                            current = v.location
                        }
                        .onEnded { v in
                            defer { start = nil; current = nil }
                            guard let s = start,
                                  abs(v.location.x - s.x) > 16, abs(v.location.y - s.y) > 16,
                                  let a = controller.coordinate(atLocal: s),
                                  let b = controller.coordinate(atLocal: v.location) else { return }
                            model.setDraftArea(BoundingBox(a, b).rounded)
                        }
                )

            if let s = start, let c = current {
                let rect = CGRect(x: min(s.x, c.x), y: min(s.y, c.y), width: abs(c.x - s.x), height: abs(c.y - s.y))
                DraftRect(rect: rect)
            } else if let d = model.draftBounds,
                      let p1 = controller.point(for: CLLocationCoordinate2D(latitude: d.maxLat, longitude: d.minLon)),
                      let p2 = controller.point(for: CLLocationCoordinate2D(latitude: d.minLat, longitude: d.maxLon)) {
                DraftRect(rect: CGRect(x: min(p1.x, p2.x), y: min(p1.y, p2.y), width: abs(p2.x - p1.x), height: abs(p2.y - p1.y)))
                    .allowsHitTesting(false)
                    .accessibilityIdentifier("draftArea")
            }

            VStack {
                VStack(spacing: 8) {
                    Label(model.draftBounds == nil ? "Drag on the map to draw a search area"
                                                   : "Area drawn. Drag again to redraw, or tap Done",
                          systemImage: "hand.draw")
                        .font(.subheadline.weight(.semibold))
                        .accessibilityIdentifier("drawBanner")
                    HStack(spacing: 10) {
                        Button(role: .cancel) { model.cancelDrawingArea() } label: { Text("Cancel") }
                            .buttonStyle(.bordered)
                            .accessibilityIdentifier("drawCancel")
                        if controller.mapView != nil {
                            Button {
                                guard let r = controller.visibleRegion else { return }
                                model.setDraftArea(BoundingBox(region: r).rounded)
                            } label: {
                                Label("Visible area", systemImage: "viewfinder")
                            }
                            .buttonStyle(.bordered)
                            .accessibilityIdentifier("drawVisible")
                        }
                        Button { model.confirmDrawingArea() } label: { Text("Done").bold() }
                            .buttonStyle(.borderedProminent)
                            .disabled(model.draftBounds == nil)
                            .accessibilityIdentifier("drawDone")
                    }
                }
                .padding(12)
                .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 14))
                .padding(.top, 8)
                Spacer()
            }
            .allowsHitTesting(true)
        }
    }
}

private struct DraftRect: View {
    let rect: CGRect
    var body: some View {
        ZStack {
            Path { $0.addRect(rect) }.fill(Color.red.opacity(0.08))
            Path { $0.addRect(rect) }.stroke(Color.red, style: StrokeStyle(lineWidth: 2, dash: [6, 5]))
            ForEach(Array([CGPoint(x: rect.minX, y: rect.minY), CGPoint(x: rect.maxX, y: rect.minY),
                           CGPoint(x: rect.maxX, y: rect.maxY), CGPoint(x: rect.minX, y: rect.maxY)].enumerated()), id: \.offset) { _, p in
                HandleDot().position(p)
            }
        }
    }
}

/// Corner handles on an existing boundary: drag any corner to resize (stays a lat/lon rectangle).
struct BoundsHandlesOverlay: View {
    @Environment(QuakeViewModel.self) private var model
    let controller: MapController
    let bounds: BoundingBox

    private enum Corner: CaseIterable { case nw, ne, se, sw }

    var body: some View {
        ZStack {
            ForEach(Array(Corner.allCases.enumerated()), id: \.offset) { _, corner in
                if let p = controller.point(for: coordinate(of: corner)) {
                    HandleDot(large: true)
                        .position(p)
                        .gesture(
                            DragGesture(coordinateSpace: .global)
                                .onChanged { v in
                                    guard let c = controller.coordinate(atGlobal: v.location) else { return }
                                    model.customBounds = moved(corner, to: c)
                                }
                        )
                        .accessibilityLabel("Resize search area")
                }
            }
        }
        // Reading cameraTick here (and only here) keeps the handles glued to the map while it moves.
        .id(controller.cameraTick)
    }

    private func coordinate(of c: Corner) -> CLLocationCoordinate2D {
        switch c {
        case .nw: CLLocationCoordinate2D(latitude: bounds.maxLat, longitude: bounds.minLon)
        case .ne: CLLocationCoordinate2D(latitude: bounds.maxLat, longitude: bounds.maxLon)
        case .se: CLLocationCoordinate2D(latitude: bounds.minLat, longitude: bounds.maxLon)
        case .sw: CLLocationCoordinate2D(latitude: bounds.minLat, longitude: bounds.minLon)
        }
    }

    private func moved(_ c: Corner, to p: CLLocationCoordinate2D) -> BoundingBox {
        let opposite: Corner = switch c {
        case .nw: .se
        case .ne: .sw
        case .se: .nw
        case .sw: .ne
        }
        return BoundingBox(coordinate(of: opposite), p).rounded
    }
}

struct HandleDot: View {
    var large = false
    var body: some View {
        Circle()
            .fill(.white)
            .overlay(Circle().stroke(Color.red, lineWidth: 2.5))
            .frame(width: large ? 22 : 14, height: large ? 22 : 14)
            .shadow(radius: 2)
            .padding(large ? 10 : 0) // bigger touch target
            .contentShape(Circle())
    }
}

/// Floating summary on the Map tab while in Custom mode (tap to edit).
struct CustomSearchPill: View {
    @Environment(QuakeViewModel.self) private var model
    var body: some View {
        Button { model.openSearch() } label: {
            HStack(spacing: 6) {
                Image(systemName: "magnifyingglass")
                if model.customRan {
                    Text("\(model.quakes.count) results · M\(model.customMinMag, specifier: "%.1f")+ · \(model.customBounds == nil ? "Global" : "Area")")
                    if model.customHitLimit { Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.orange) }
                } else {
                    Text("Set up custom search")
                }
            }
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 12).padding(.vertical, 7)
            .background(.regularMaterial, in: Capsule())
        }
        .buttonStyle(.plain)
    }
}
