import SwiftUI

struct RootView: View {
    @Environment(QuakeViewModel.self) private var model
    @State private var tab: AppTab = .map
    @State private var searchDetent: PresentationDetent = .large
    @State private var detailDetent: PresentationDetent = RootView.detailMedium
    /// Actual presentation state of the search sheet. `model.showSearchSheet` is the *request*;
    /// we only present once no other sheet (the quake detail) is up, because SwiftUI silently
    /// ignores a second `.sheet` on the same presenter while one is already showing.
    @State private var searchPresented = false
    static let detailSmall: PresentationDetent = .fraction(0.25)
    static let detailMedium: PresentationDetent = .fraction(0.45)

    enum AppTab: Hashable { case map, list, bookmarks, settings }

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
        .sheet(item: $model.selected) { quake in
            QuakeDetailSheet(quake: quake)
                .presentationDetents([Self.detailSmall, Self.detailMedium, .large], selection: $detailDetent)
                .presentationDragIndicator(.visible)
                .presentationBackgroundInteraction(.enabled(upThrough: Self.detailMedium))
        }
        .sheet(isPresented: Binding(
            get: { searchPresented },
            set: { shown in
                searchPresented = shown
                if !shown { model.showSearchSheet = false }
            })) {
            CustomSearchSheet()
                .presentationDetents([.medium, .large], selection: $searchDetent)
                .presentationDragIndicator(.visible)
        }
        .onChange(of: model.showSearchSheet, initial: true) { _, show in
            guard show else { searchPresented = false; return }
            Task { @MainActor in
                await model.dismissDetailSheetIfNeeded()
                if model.showSearchSheet { searchPresented = true }
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
        if d.bool(forKey: "svOpenSearch") { model.showSearchSheet = true }
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
    @State private var showFilters = false

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
            .onChange(of: model.timeRange) { _, r in
                if r == .custom && !model.customRan { model.showSearchSheet = true }
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { model.showSearchSheet = true } label: {
                        Label("Search", systemImage: "magnifyingglass")
                    }
                    .accessibilityHint("Custom search by date, magnitude and map area")
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        // Same dead-tap trap as Search: a sheet can't open while the detail sheet is up.
                        Task { @MainActor in
                            await model.dismissDetailSheetIfNeeded()
                            showFilters = true
                        }
                    } label: {
                        Label("Filters", systemImage: "line.3.horizontal.decrease.circle")
                    }
                }
                ToolbarItem(placement: .topBarLeading) {
                    if model.isLoading { ProgressView() }
                }
            }
            .sheet(isPresented: $showFilters) {
                FiltersSheet()
                    .presentationDetents([.medium, .large])
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
