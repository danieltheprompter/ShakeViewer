import SwiftUI

struct QuakeListScreen: View {
    @Environment(QuakeViewModel.self) private var model

    var body: some View {
        let quakes = model.visibleQuakes
        ScrollViewReader { proxy in
        List {
            if model.timeRange == .custom {
                Section { CustomSearchSummary() }
            }
            Section {
                if quakes.isEmpty && !model.isLoading {
                    ContentUnavailableView("No earthquakes", systemImage: "waveform.path.ecg",
                                           description: Text("No earthquakes match your filters."))
                }
                ForEach(quakes) { q in
                    Button { model.selected = q } label: { QuakeRow(quake: q) }
                        .buttonStyle(.plain)
                        .swipeActions {
                            Button { model.toggleBookmark(q) } label: {
                                Label("Bookmark", systemImage: model.isBookmarked(q) ? "bookmark.slash" : "bookmark")
                            }
                            .tint(.orange)
                        }
                }
            }
        }
        .listStyle(.plain)
        .readableListWidth()
        #if DEBUG
        .onChange(of: model.benchScrollTarget) { _, id in
            if let id { withAnimation(.easeInOut(duration: 0.7)) { proxy.scrollTo(id, anchor: .top) } }
        }
        #endif
        }
        .refreshable { await model.refresh() }
        .navigationTitle("Earthquakes")
        .navigationBarTitleDisplayMode(.inline)
        .feedToolbar()
    }
}

struct QuakeRow: View {
    @Environment(QuakeViewModel.self) private var model
    let quake: Quake

    var body: some View {
        HStack(spacing: 12) {
            Text(quake.magText)
                .font(.headline.monospacedDigit())
                .foregroundStyle(.white)
                .frame(width: 48, height: 48)
                .background(quake.color, in: RoundedRectangle(cornerRadius: 10))
            VStack(alignment: .leading, spacing: 3) {
                Text(quake.place).font(.subheadline.weight(.medium)).lineLimit(2)
                HStack(spacing: 8) {
                    Text(RelativeTime.string(for: quake.date, now: model.clock))
                    Text(String(format: "%.0f km deep", quake.depth))
                    if quake.felt > 0 { Text("\(quake.felt) felt") }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
            VStack(alignment: .trailing, spacing: 4) {
                Text(quake.source.rawValue).font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
                if model.isBookmarked(quake) { Image(systemName: "bookmark.fill").foregroundStyle(.orange).font(.caption) }
            }
        }
        .padding(.vertical, 4)
        .contentShape(Rectangle())
    }
}
