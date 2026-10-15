import SwiftUI
import MapKit

struct QuakeMapScreen: View {
    @Environment(QuakeViewModel.self) private var model
    @AppStorage("sv_map_style") private var mapStyle: MapStyleOption = .standard
    @AppStorage("sv_show_faults") private var showFaults = false
    @State private var controller = MapController()
    @State private var plateLines: [PlateBoundaryLine] = []
    @State private var initialCamera: (Double, Double, Double)? = MapLaunchArgs.camera

    var body: some View {
        // NOTE: nothing here reads camera state, so panning/zooming never re-runs this body.
        QuakeMapView(
            controller: controller,
            quakes: model.mapQuakes,
            quakesVersion: model.visibleVersion,
            selected: model.selected,
            userLocation: model.displayedUserLocation,
            nearMeRadiusKm: model.nearMeActive ? model.nearMeRadiusKm : nil,
            bounds: model.customBounds,
            showFaults: showFaults,
            plateLines: plateLines,
            mapStyle: mapStyle,
            focus: model.mapFocus,
            initialCamera: initialCamera,
            onSelect: { model.selected = $0 }
        )
        .ignoresSafeArea(edges: .bottom)
        .overlay {
            if model.isDrawingArea {
                DrawAreaOverlay(controller: controller)
            } else if let b = model.customBounds {
                BoundsHandlesOverlay(controller: controller, bounds: b)
            }
        }
        .overlay(alignment: .bottomLeading) {
            if !model.isDrawingArea { MagnitudeLegend(showFaults: showFaults).padding() }
        }
        .overlay(alignment: .top) { MapTopBanner() }
        .overlay(alignment: .bottomTrailing) {
            if !model.isDrawingArea {
                VStack(spacing: 10) {
                    MapControlButton(
                                     isOn: showFaults, tint: Color(hex: 0xEA580C)) {
                        showFaults.toggle()
                    }
                    .accessibilityLabel("Fault lines (plate boundaries)")
                    .accessibilityIdentifier("faultLinesToggle")
                    .accessibilityValue(showFaults ? "On" : "Off")

                    LocateButton()
                }
                .padding()
            }
        }
        #if DEBUG
        .overlay(alignment: .topLeading) { DebugCameraProbe(controller: controller) }
        #endif
        .task(id: showFaults) {
            if showFaults && plateLines.isEmpty { plateLines = await PlateBoundaryService().load() }
        }
        .navigationTitle("ShakeViewer")
        .navigationBarTitleDisplayMode(.inline)
        .feedToolbar()
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { Task { await model.refresh() } } label: { Label("Refresh", systemImage: "arrow.clockwise") }
            }
        }
        .onChange(of: model.customBounds) { _, b in
            // Like the site: frame the new boundary after drawing / re-running a bounded search.
            guard let b, !model.isDrawingArea else { return }
            controller.show(region: b.region(padding: 1.3))
        }
        .onChange(of: model.selected?.id) { _, _ in
            // A pending mapFocus for this quake (mini-map tap) wins over the default fly-to.
            if let q = model.selected, model.mapFocus?.quakeId != q.id {
                controller.fly(to: CLLocationCoordinate2D(latitude: q.latitude, longitude: q.longitude), distance: 1_500_000)
            }
        }
    }
}

/// Jagged fracture line glyph (no true crack SF Symbol exists on iOS 17), template-colored via foregroundStyle.
struct FaultCrackGlyph: Shape {
    /// Bold diagonal fracture: 5 sharp zigzag segments, top-left to bottom-right.
    static let points: [CGPoint] = [
        .init(x: 0.16, y: 0.00), .init(x: 0.64, y: 0.22), .init(x: 0.30, y: 0.42),
        .init(x: 0.76, y: 0.60), .init(x: 0.40, y: 0.80), .init(x: 0.86, y: 1.00),
    ]
    func path(in r: CGRect) -> Path {
        var p = Path()
        p.addLines(Self.points.map { CGPoint(x: r.minX + $0.x * r.width, y: r.minY + $0.y * r.height) })
        return p
    }
}

/// Small circular map control matching the location button; subtle tint when on.
struct MapControlButton: View {
    var isOn = false
    var tint: Color = .accentColor
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            FaultCrackGlyph()
                .stroke(style: StrokeStyle(lineWidth: 2.6, lineCap: .butt, lineJoin: .miter, miterLimit: 10))
                .frame(width: 19, height: 21)
                .foregroundStyle(isOn ? tint : Color.primary.opacity(0.75))
                .frame(width: 20, height: 20)
                .padding(12)
                .background(.regularMaterial, in: Circle())
                .overlay(Circle().fill(tint.opacity(isOn ? 0.14 : 0)))
                .overlay(Circle().strokeBorder(tint.opacity(isOn ? 0.45 : 0), lineWidth: 1))
        }
        .buttonStyle(.plain)
        .animation(.easeOut(duration: 0.15), value: isOn)
    }
}

/// Own view so the spinner state doesn't invalidate the map screen.
private struct LocateButton: View {
    @Environment(QuakeViewModel.self) private var model
    var body: some View {
        Button {
            Task { await model.centerOnUser() }
        } label: {
            Group {
                if model.isLocating { ProgressView() } else { Image(systemName: "location.fill").foregroundStyle(Color.primary.opacity(0.75)) }
            }
            .frame(width: 20, height: 20)
            .padding(12)
            .background(.regularMaterial, in: Circle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Show my location")
    }
}

private struct MapTopBanner: View {
    @Environment(QuakeViewModel.self) private var model
    var body: some View {
        if model.isDrawingArea {
            EmptyView()
        } else if model.timeRange == .custom {
            CustomSearchPill().padding(.top, 6)
        } else if model.mapHiddenCount > 0 {
            Text("Showing \(model.mapQuakes.count) strongest of \(model.visibleQuakes.count) — see List for all")
                .font(.caption2)
                .padding(.horizontal, 10).padding(.vertical, 4)
                .background(.regularMaterial, in: Capsule())
                .padding(.top, 6)
        }
    }
}

#if DEBUG
/// UI-test probe: final camera "lat,lon,latSpan" (invisible). Isolated so only it re-renders on camera moves.
private struct DebugCameraProbe: View {
    let controller: MapController
    var body: some View {
        Text(controller.debugCamera).font(.system(size: 1)).opacity(0.02)
            .accessibilityIdentifier("debugCamera").accessibilityLabel(controller.debugCamera)
            .allowsHitTesting(false)
    }
}
#endif

enum MapLaunchArgs {
    /// -svCamera "lat,lon,distanceMeters" (screenshots / UI tests / bench)
    static var camera: (Double, Double, Double)? {
        #if DEBUG
        guard let raw = UserDefaults.standard.string(forKey: "svCamera") else { return nil }
        let v = raw.split(separator: ",").compactMap { Double($0.trimmingCharacters(in: .whitespaces)) }
        return v.count == 3 ? (v[0], v[1], v[2]) : nil
        #else
        return nil // Debug-only launch argument; ignored in Release.
        #endif
    }
}

struct QuakeMarker: View {
    let quake: Quake
    var isSelected = false

    var body: some View {
        let base = max(10, min(44, quake.mag * quake.mag * 1.4))
        let size = isSelected ? max(22, base) : base
        Circle()
            .fill(quake.color.opacity(0.75))
            .overlay(Circle().stroke(isSelected ? Color.primary : quake.color, lineWidth: isSelected ? 3 : 1))
            .frame(width: size, height: size)
            .background {
                if isSelected { Circle().stroke(quake.color.opacity(0.5), lineWidth: 6).frame(width: size + 14, height: size + 14) }
            }
            .accessibilityLabel("Magnitude \(quake.magText), \(quake.place)")
    }
}

struct MagnitudeLegend: View {
    var showFaults = false
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("MAGNITUDE").font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
            ForEach(MagnitudeTier.allCases, id: \.self) { tier in
                HStack(spacing: 6) {
                    Circle().fill(tier.color).frame(width: 10, height: 10)
                    Text(tier.rangeLabel).font(.caption.monospacedDigit())
                }
            }
            if showFaults {
                HStack(spacing: 6) {
                    Path { p in p.move(to: CGPoint(x: 0, y: 5)); p.addLine(to: CGPoint(x: 14, y: 5)) }
                        .stroke(Color(hex: 0xEA580C), style: StrokeStyle(lineWidth: 2, dash: [3, 2]))
                        .frame(width: 14, height: 10)
                    Text("Plate boundary").font(.caption)
                }
            }
        }
        .padding(10)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 10))
    }
}
