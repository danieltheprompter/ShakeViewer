import SwiftUI

struct RootView: View {
    @Environment(QuakeViewModel.self) private var model
    @State private var tab: AppTab = .map
    @State private var searchDetent: PresentationDetent = .large
    @State private var detailDetent: PresentationDetent = RootView.detailMedium
    static let detailSmall: PresentationDetent = .fraction(0.25)
    static let detailMedium: PresentationDetent = .fraction(0.45)

    enum AppTab: Hashable { case map, list, bookmarks, settings }

    /// The one sheet slot. Derived from model state; switching identity (detail → search) is
    /// handled by SwiftUI as a single dismiss+present, so nothing ever needs a delayed retry.
    enum ActiveSheet: Identifiable, Equatable {
        case detail(Quake), search, filters
        var id: String {
            switch self {
            case .detail(let q): "detail-\(q.id)"
            case .search: "search"
            case .filters: "filters"
            }
        }
        static func == (l: Self, r: Self) -> Bool { l.id == r.id }
    }

    private var activeSheet: Binding<ActiveSheet?> {
        Binding(
            get: {
                switch model.overlay {
                case .search: return .search
                case .filters: return .filters
                case .drawingArea: return nil
                case .none: return model.selected.map { .detail($0) }
                }
            },
            set: { new in
                guard new == nil else { return }
                if model.overlay == .none { model.selected = nil } else { model.dismissOverlay() }
            })
    }

    var body: some View {
        @Bindable var model = model
        TabView(selection: $tab) {
            NavigationStack { QuakeMapScreen() }
                .tabItem { Label("Map", systemImage: "map") }
                .tag(AppTab.map)
            NavigationStack { QuakeListScreen() }
                .tabItem { Label("List", systemImage: "list.bullet") }
                .tag(AppTab.list)
            NavigationStack { BookmarksScreen() }
                .tabItem { Label("Bookmarks", systemImage: "bookmark") }
                .tag(AppTab.bookmarks)
            NavigationStack { SettingsScreen() }
                .tabItem { Label("Settings", systemImage: "gearshape") }
                .tag(AppTab.settings)
        }
        .sheet(item: activeSheet) { sheet in
            switch sheet {
            case .detail(let quake):
                QuakeDetailSheet(quake: quake)
                    .presentationDetents([Self.detailSmall, Self.detailMedium, .large], selection: $detailDetent)
                    .presentationDragIndicator(.visible)
                    .presentationBackgroundInteraction(.enabled(upThrough: Self.detailMedium))
            case .search:
                CustomSearchSheet()
                    .presentationDetents([.medium, .large], selection: $searchDetent)
                    .presentationDragIndicator(.visible)
            case .filters:
                FiltersSheet()
                    .presentationDetents([.medium, .large])
            }
        }
        .onChange(of: model.showMapTabRequest) { _, _ in tab = .map }
        .onChange(of: model.compactDetailRequest) { _, _ in
            withAnimation { detailDetent = Self.detailSmall }
        }
        .onChange(of: model.selected?.id) { old, new in
            // Fresh selection (not a mini-map hand-off) opens at the medium height.
            if old == nil, new != nil, detailDetent == .large { detailDetent = Self.detailMedium }
        }
        .onChange(of: model.isDrawingArea) { _, drawing in
            if drawing { tab = .map }
        }
        .overlay(alignment: .bottom) {
            if let msg = model.toast {
                Text(msg)
                    .font(.footnote.weight(.semibold))
                    .padding(.horizontal, 14).padding(.vertical, 9)
                    .background(.regularMaterial, in: Capsule())
                    .padding(.bottom, 96)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .task(id: msg) {
                        try? await Task.sleep(for: .seconds(2))
                        withAnimation { model.toast = nil }
                    }
            }
        }
        .animation(.default, value: model.toast)
        .task {
            model.start()
            #if DEBUG
            if Bench.enabled { await Bench.run(model: model) { tab = $0 } }
            await applyDebugLaunchArguments()
            #endif
        }
    }
}

#if DEBUG
extension RootView {
    /// Debug-only launch args for screenshots / UI checks:
    ///   -svTab map|list|bookmarks|settings   -svSelectFirst YES
    @MainActor
    func applyDebugLaunchArguments() async {
        let d = UserDefaults.standard
        switch d.string(forKey: "svTab") {
        case "list": tab = .list
        case "bookmarks": tab = .bookmarks
        case "settings": tab = .settings
        default: break
        }
        // -svSeedLocation "lat,lon": pretend a previous fix is cached (permission-gating test)
        if let raw = d.string(forKey: "svSeedLocation") {
            let v = raw.split(separator: ",").compactMap { Double($0.trimmingCharacters(in: .whitespaces)) }
            if v.count == 2 { model.debugSeedLocation(Coordinate(latitude: v[0], longitude: v[1])) }
        }
        // -svBounds "minLat,maxLat,minLon,maxLon" -svStart yyyy-MM-dd -svEnd yyyy-MM-dd -svMinMag 4 -svRunSearch YES
        if let raw = d.string(forKey: "svBounds") {
            let v = raw.split(separator: ",").compactMap { Double($0.trimmingCharacters(in: .whitespaces)) }
            if v.count == 4 { model.customBounds = BoundingBox(minLat: v[0], maxLat: v[1], minLon: v[2], maxLon: v[3]) }
        }
        if let s = d.string(forKey: "svStart"), let date = QuakeViewModel.dayFormatter.date(from: s) { model.customStart = date }
        if let s = d.string(forKey: "svEnd"), let date = QuakeViewModel.dayFormatter.date(from: s) { model.customEnd = date }
        if d.object(forKey: "svMinMag") != nil { model.customMinMag = d.double(forKey: "svMinMag") }
        if d.bool(forKey: "svRunSearch") { await model.runCustomSearch() }
        if d.bool(forKey: "svOpenSearch") { model.openSearch() }
        if d.bool(forKey: "svDraw") { model.beginDrawingArea() }
        guard d.bool(forKey: "svSelectFirst") else { return }
        for _ in 0..<60 where model.visibleQuakes.isEmpty {
            try? await Task.sleep(for: .milliseconds(500))
        }
        model.selected = model.visibleQuakes.first
    }
}
#endif

/// Shared toolbar: time range picker + filters button.
struct FeedToolbar: ViewModifier {
    @Environment(QuakeViewModel.self) private var model

    func body(content: Content) -> some View {
        @Bindable var model = model
        content
            .safeAreaInset(edge: .top, spacing: 0) {
                VStack(spacing: 6) {
                    Picker("Time range", selection: $model.timeRange) {
                        ForEach(TimeRange.allCases) { Text($0.title).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    StatusLine()
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
                .background(.bar)
            }
            // Selecting "Custom" deliberately does NOT open anything: the map shows the
            // "Set up custom search" pill (list: summary row) and the user taps it.
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { model.openSearch() } label: {
                        Label("Search", systemImage: "magnifyingglass")
                    }
                    .accessibilityHint("Custom search by date, magnitude and map area")
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { model.openFilters() } label: {
                        Label("Filters", systemImage: "line.3.horizontal.decrease.circle")
                    }
                }
                ToolbarItem(placement: .topBarLeading) {
                    if model.isLoading { ProgressView() }
                }
            }
    }
}

struct StatusLine: View {
    @Environment(QuakeViewModel.self) private var model
    var body: some View {
        HStack {
            Text("\(model.visibleQuakes.count) of \(model.quakes.count) quakes")
            Spacer()
            if let err = model.errorMessage {
                Label(err, systemImage: "exclamationmark.triangle").foregroundStyle(.red).lineLimit(1)
            } else if let d = model.lastUpdated {
                Text("Updated \(RelativeTime.string(for: d, now: model.clock))")
            }
        }
        .font(.caption)
        .foregroundStyle(.secondary)
    }
}

extension View {
    func feedToolbar() -> some View { modifier(FeedToolbar()) }
}

/// Keeps list rows at a comfortable reading width on iPad / wide windows (no-op on iPhone).
struct ReadableListWidth: ViewModifier {
    var maxWidth: CGFloat = 760
    @State private var width: CGFloat = 0
    func body(content: Content) -> some View {
        content
            .contentMargins(.horizontal, max(0, (width - maxWidth) / 2), for: .scrollContent)
            .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { width = $0 }
    }
}
extension View { func readableListWidth() -> some View { modifier(ReadableListWidth()) } }
