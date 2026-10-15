import SwiftUI
import MapKit

struct QuakeDetailSheet: View {
    @Environment(QuakeViewModel.self) private var model
    @Environment(\.openURL) private var openURL
    let quake: Quake

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack(alignment: .top, spacing: 14) {
                    VStack(spacing: 0) {
                        Text(quake.magText).font(.system(size: 34, weight: .bold).monospacedDigit())
                        Text(quake.tier.label.uppercased()).font(.caption2.weight(.bold))
                    }
                    .foregroundStyle(.white)
                    .frame(width: 88, height: 80)
                    .background(quake.color, in: RoundedRectangle(cornerRadius: 14))
                    VStack(alignment: .leading, spacing: 6) {
                        Text(quake.place).font(.title3.weight(.semibold))
                        Text(quake.date.formatted(date: .abbreviated, time: .shortened)).foregroundStyle(.secondary)
                        HStack(spacing: 6) {
                            Chip(text: quake.source.rawValue, color: .secondary)
                            if quake.tsunami { Chip(text: "Tsunami watch", color: .red) }
                        }
                    }
                    Spacer(minLength: 0)
                }

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    Stat(label: "Depth", value: String(format: "%.1f km", quake.depth))
                    Stat(label: "Felt reports", value: quake.felt > 0 ? "\(quake.felt)" : "—")
                    Stat(label: "Coordinates", value: Geo.formatCoord(lat: quake.latitude, lon: quake.longitude))
                    if let d = model.distanceKm(to: quake) {
                        Stat(label: "Distance", value: String(format: "%.0f km from you", d))
                    } else {
                        Stat(label: "Time", value: quake.date.formatted(.relative(presentation: .named)))
                    }
                }

                MiniMapSnapshot(quake: quake)
                .frame(height: 160)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(alignment: .topTrailing) {
                    Label("Tap to expand", systemImage: "arrow.up.left.and.arrow.down.right")
                        .font(.caption2.weight(.semibold))
                        .padding(.horizontal, 8).padding(.vertical, 4)
                        .background(.ultraThinMaterial, in: Capsule())
                        .padding(8)
                }
                .contentShape(RoundedRectangle(cornerRadius: 12))
                .onTapGesture { model.showOnMap(quake) }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Show on full map")
                .accessibilityAddTraits(.isButton)
                .accessibilityIdentifier("miniMap")

                HStack {
                    Button {
                        model.toggleBookmark(quake)
                    } label: {
                        Label(model.isBookmarked(quake) ? "Saved" : "Bookmark",
                              systemImage: model.isBookmarked(quake) ? "bookmark.fill" : "bookmark")
                    }
                    .buttonStyle(.bordered)
                    ShareLink(item: quake.shareURL, subject: Text("M\(quake.magText) – \(quake.place)")) {
                        Label("Share", systemImage: "square.and.arrow.up")
                    }
                    .buttonStyle(.bordered)
                    Spacer()
                    if let url = SafeLinks.external(quake.url) {
                        Button {
                            openURL(url)
                        } label: {
                            Label(quake.source.rawValue, systemImage: "arrow.up.right.square")
                        }
                        .buttonStyle(.borderedProminent)
                    }
                }
                Text("Source: \(quake.source.rawValue). Informational only — not an emergency alert service.")
                    .font(.caption2).foregroundStyle(.secondary)
            }
            .padding()
        }
    }

    private var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: quake.latitude, longitude: quake.longitude)
    }
}

private struct Stat: View {
    let label: String
    let value: String
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased()).font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
            Text(value).font(.callout.monospacedDigit()).lineLimit(2).minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(.quaternary.opacity(0.5), in: RoundedRectangle(cornerRadius: 10))
    }
}

private struct Chip: View {
    let text: String
    let color: Color
    var body: some View {
        Text(text).font(.caption2.weight(.semibold))
            .padding(.horizontal, 8).padding(.vertical, 3)
            .foregroundStyle(color)
            .background(color.opacity(0.15), in: Capsule())
    }
}

/// Static MKMapSnapshotter image instead of a live Map: keeps sheet drags smooth. Cached per quake + appearance.
struct MiniMapSnapshot: View {
    let quake: Quake
    @Environment(\.colorScheme) private var scheme
    @Environment(\.displayScale) private var scale
    @State private var image: UIImage?

    @MainActor private static var cache: [String: UIImage] = [:]

    var body: some View {
        GeometryReader { geo in
            ZStack {
                if let image {
                    Image(uiImage: image).resizable().scaledToFill()
                } else {
                    Rectangle().fill(.quaternary)
                }
                QuakeMarker(quake: quake)
            }
            .frame(width: geo.size.width, height: geo.size.height)
            .task(id: "\(quake.id)-\(scheme == .dark)-\(Int(geo.size.width))") {
                await render(size: geo.size)
            }
        }
    }

    private func render(size: CGSize) async {
        guard size.width > 0 else { return }
        let key = "\(quake.id)-\(scheme == .dark)-\(Int(size.width))"
        if let cached = Self.cache[key] { image = cached; return }
        let opts = MKMapSnapshotter.Options()
        opts.camera = MKMapCamera(lookingAtCenter: CLLocationCoordinate2D(latitude: quake.latitude, longitude: quake.longitude),
                                  fromDistance: 800_000, pitch: 0, heading: 0)
        opts.size = size
        opts.scale = scale
        opts.traitCollection = UITraitCollection(userInterfaceStyle: scheme == .dark ? .dark : .light)
        opts.preferredConfiguration = MKStandardMapConfiguration(elevationStyle: .flat)
        if let shot = try? await MKMapSnapshotter(options: opts).start() {
            Self.cache[key] = shot.image
            image = shot.image
        }
    }
}
