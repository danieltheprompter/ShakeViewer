import Foundation
import Observation

@MainActor
@Observable
final class QuakeViewModel {
    // Data
    /// Raw merged feed. Only reassigned when the content actually changed (auto-refresh diff).
    private(set) var quakes: [Quake] = [] { didSet { recomputeVisible() } }
    private(set) var isLoading = false
    private(set) var lastUpdated: Date?
    var errorMessage: String?

    // Filters (defaults match the site)
    var timeRange: TimeRange = .day { didSet { if oldValue != timeRange { rangeChanged() } } }
    var minMag: Double = 2.5 { didSet { if oldValue != minMag { recomputeVisible() } } }
    var depth: DepthFilter = .all { didSet { if oldValue != depth { recomputeVisible() } } }
    var sort: SortType = .time { didSet { if oldValue != sort { recomputeVisible() } } }
    var descending = true { didSet { if oldValue != descending { recomputeVisible() } } }
    var nearMeActive = false {
        didSet {
            guard oldValue != nearMeActive else { return }
            recomputeVisible()
            if nearMeActive { Task { await locateMe() } }
        }
    }
    var nearMeRadiusKm: Double = 500 { didSet { if nearMeActive && oldValue != nearMeRadiusKm { recomputeVisible() } } }
    private(set) var userLocation: Coordinate? { didSet { if nearMeActive && oldValue != userLocation { recomputeVisible() } } }

    // Memoized derived state (recomputed only when inputs change, never inside view bodies)
    private(set) var visibleQuakes: [Quake] = []
    /// Strongest `markerCap` of `visibleQuakes` for the map.
    private(set) var mapQuakes: [Quake] = []
    /// Bumped whenever visibleQuakes/mapQuakes change; the map diffs annotations only then.
    private(set) var visibleVersion = 0
    /// Ticks once a minute so "x min ago" labels update without per-second timers.
    private(set) var clock = Date()
    /// MKMapView reuses annotation views and only realizes visible ones, so the cap can be generous.
    static let markerCap = 2000

    // Custom search
    // Site defaults: start = yesterday, end = today, M4.0+, no boundary.
    var customStart: Date = QuakeViewModel.defaultCustomStart()
    var customEnd: Date = Date()
    var customMinMag: Double = 4.0
    var customBounds: BoundingBox?
    private(set) var searchHistory: [SearchHistoryEntry] = []
    /// Site's `customRan`: a custom search has produced the current results.
    private(set) var customRan = false
    private(set) var customHitLimit = false
    var historyTab: HistoryTab = .local
    var cloudHistory: [SearchHistoryEntry] { account.cloudHistory }

    // UI state shared by Map / List / toolbar
    var showSearchSheet = false
    /// "Draw search area" mode on the map (site: isDrawing).
    var isDrawingArea = false
    var toast: String?
    private(set) var isLocating = false
    /// Bench-only: list scrolls to this id when set.
    var benchScrollTarget: String?
    /// One-shot camera requests consumed by the Map tab.
    private(set) var mapFocus: MapFocus?
    /// Bumped to ask RootView to switch to the Map tab / shrink the detail sheet.
    private(set) var showMapTabRequest = 0
    private(set) var compactDetailRequest = 0

    struct MapFocus: Equatable, Sendable {
        let id = UUID()
        let coordinate: Coordinate
        let distance: Double
        let quakeId: String?
    }

    enum HistoryTab: String, CaseIterable, Identifiable, Sendable {
        case local, cloud
        var id: String { rawValue }
    }

    // Selection / bookmarks
    var selected: Quake?
    private(set) var localBookmarks: [Bookmark] = []

    private let service: QuakeService
    private let store: LocalStore
    private let location = LocationService()
    let account: AccountService
    private var refreshTask: Task<Void, Never>?

    init(service: QuakeService = QuakeService(), store: LocalStore = LocalStore(), account: AccountService) {
        self.service = service
        self.store = store
        self.account = account
        localBookmarks = store.load([Bookmark].self, key: LocalStoreKey.bookmarks) ?? []
        searchHistory = store.load([SearchHistoryEntry].self, key: LocalStoreKey.searchHistory) ?? []
        userLocation = store.load(Coordinate.self, key: LocalStoreKey.myLocation)
    }

    var filter: QuakeFilter {
        QuakeFilter(minMag: minMag, depth: depth, sort: sort, descending: descending,
                    nearMeRadiusKm: nearMeActive ? nearMeRadiusKm : nil, userLocation: userLocation)
    }

    private func recomputeVisible() {
        let v = filter.apply(to: quakes)
        visibleQuakes = v
        mapQuakes = v.count > Self.markerCap ? Array(v.sorted { $0.mag > $1.mag }.prefix(Self.markerCap)) : v
        visibleVersion &+= 1
    }

    var mapHiddenCount: Int { visibleQuakes.count - mapQuakes.count }

    /// Only assign when something changed, so an unchanged auto-refresh causes no UI work.
    private func setQuakes(_ new: [Quake]) {
        if new != quakes { quakes = new }
    }

    var bookmarks: [Bookmark] { account.user != nil ? account.remoteBookmarks : localBookmarks }

    func distanceKm(to q: Quake) -> Double? {
        userLocation.map { Geo.distanceKm($0, Coordinate(latitude: q.latitude, longitude: q.longitude)) }
    }

    // MARK: Loading

    private var clockTask: Task<Void, Never>?

    func start() {
        guard refreshTask == nil else { return }
        rangeChanged()
        clockTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(60))
                self?.clock = Date()
            }
        }
    }

    private func rangeChanged() {
        refreshTask?.cancel()
        refreshTask = nil
        guard timeRange != .custom else { return }
        let range = timeRange
        refreshTask = Task { [weak self] in
            await self?.refresh()
            guard let interval = range.refreshInterval else { return }
            while !Task.isCancelled {
                try? await Task.sleep(for: interval)
                if Task.isCancelled { break }
                await self?.refresh()
            }
        }
    }

    func refresh() async {
        if timeRange == .custom { await runCustomSearch(); return }
        isLoading = true
        defer { isLoading = false }
        do {
            setQuakes(try await service.fetchRecent(timeRange))
            clock = Date()
            lastUpdated = Date()
            errorMessage = nil
        } catch is CancellationError {
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    func runCustomSearch() async {
        let search = CustomSearch(startDate: Self.dayString(customStart), endDate: Self.dayString(customEnd),
                                  minMag: customMinMag, bounds: customBounds)
        await run(search)
    }

    func run(_ search: CustomSearch) async {
        if timeRange != .custom { timeRange = .custom }
        isLoading = true
        defer { isLoading = false }
        do {
            let r = try await service.fetchCustom(search)
            setQuakes(r.quakes)
            customHitLimit = r.hitLimit
            customRan = true
            lastUpdated = Date()
            errorMessage = r.quakes.isEmpty ? "No earthquakes match this search. Try a wider range or lower magnitude." : nil
            selected = nil
            saveHistory(search)
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    /// Site: onRunSaved — restore the form from a history entry and run it.
    func rerun(_ entry: SearchHistoryEntry) {
        let s = entry.search
        if let d = Self.dayFormatter.date(from: s.startDate) { customStart = d }
        if let d = Self.dayFormatter.date(from: s.endDate) { customEnd = d }
        customMinMag = s.minMag
        customBounds = s.bounds
        Task { await run(s) }
    }

    /// Site: the reset (↻) button — defaults, no boundary, results cleared.
    func resetCustomSearch() {
        customStart = Self.defaultCustomStart()
        customEnd = Date()
        customMinMag = 4.0
        customBounds = nil
        customRan = false
        customHitLimit = false
        isDrawingArea = false
        if timeRange == .custom { quakes = [] }
        errorMessage = nil
    }

    /// Site: onDraw toggles drawing mode (toast "Drag on the map to draw a search area").
    func beginDrawingArea() {
        showSearchSheet = false
        isDrawingArea = true
    }

    /// Closes the quake detail sheet (if any) and waits for its dismissal animation, so another
    /// sheet can be presented. Without this, taps on Search / Filters / "Set up custom search"
    /// while a quake is selected did nothing (SwiftUI drops the second presentation).
    func dismissDetailSheetIfNeeded() async {
        guard selected != nil else { return }
        selected = nil
        try? await Task.sleep(for: .milliseconds(500))
    }

    /// "Around my location": square search area of `radiusKm` around the user's current fix.
    func useAreaAroundMe(radiusKm: Double) async {
        isLocating = true
        defer { isLocating = false }
        guard await location.ensureAuthorized() else {
            toast = Self.locationDeniedMessage
            return
        }
        var c = await location.requestLocation()
        if c == nil { c = userLocation }
        guard let c else {
            toast = "Location unavailable right now. Try again."
            return
        }
        userLocation = c
        store.save(c, key: LocalStoreKey.myLocation)
        customBounds = Self.box(around: c, radiusKm: radiusKm)
        toast = "Area set: \(Int(radiusKm)) km around you"
    }

    static func box(around c: Coordinate, radiusKm: Double) -> BoundingBox {
        let dLat = radiusKm / 111.0
        let dLon = radiusKm / (111.0 * max(0.05, cos(c.latitude * .pi / 180)))
        return BoundingBox(minLat: max(-90, c.latitude - dLat), maxLat: min(90, c.latitude + dLat),
                           minLon: max(-180, c.longitude - dLon), maxLon: min(180, c.longitude + dLon)).rounded
    }

    func cancelDrawingArea() {
        isDrawingArea = false
        showSearchSheet = true
    }

    /// Site: onDrawComplete → set bounds, stop drawing, toast "Boundary selected".
    func finishDrawingArea(_ b: BoundingBox) {
        customBounds = b
        isDrawingArea = false
        toast = "Boundary selected"
        showSearchSheet = true
    }

    func importHistoryToCloud() async {
        do {
            try await account.importHistory(searchHistory)
            toast = "Local history saved to cloud"
            historyTab = .cloud
        } catch {
            toast = "Import failed"
        }
    }

    static func defaultCustomStart() -> Date {
        Calendar.current.date(byAdding: .day, value: -1, to: Date()) ?? Date()
    }

    private func saveHistory(_ s: CustomSearch) {
        var next = searchHistory.filter { !($0.search.startDate == s.startDate && $0.search.endDate == s.endDate && $0.search.minMag == s.minMag) }
        next.insert(SearchHistoryEntry(search: s, timestamp: Date().timeIntervalSince1970 * 1000), at: 0)
        searchHistory = Array(next.prefix(10))
        store.save(searchHistory, key: LocalStoreKey.searchHistory)
        Task { await account.addSearchHistory(s) }
    }

    func clearHistory() {
        searchHistory = []
        store.save([SearchHistoryEntry]?.none, key: LocalStoreKey.searchHistory)
    }

    // MARK: Sorting (tap same = flip direction, like the site)

    func toggleSort(_ s: SortType) {
        if sort == s { descending.toggle() } else { sort = s; descending = true }
    }

    // MARK: Location

    /// Used by "Near me". Never moves the camera.
    func locateMe() async {
        isLocating = true
        defer { isLocating = false }
        guard await location.ensureAuthorized() else {
            toast = Self.locationDeniedMessage
            nearMeActive = false
            return
        }
        if let c = await location.requestLocation() {
            userLocation = c
            store.save(c, key: LocalStoreKey.myLocation)
        } else {
            toast = "Location unavailable right now. Try again."
            if userLocation == nil { nearMeActive = false }
        }
    }

    /// Location button. Strict order: permission → fix → pan.
    /// - Prompt showing: we just await (spinner), no camera movement.
    /// - Denied: message, no camera movement.
    /// - Cached location is used for an instant pan ONLY if permission was already granted at tap time.
    func centerOnUser() async {
        isLocating = true
        defer { isLocating = false }
        let wasAuthorized = location.authorization == .authorized
        guard await location.ensureAuthorized() else {
            toast = Self.locationDeniedMessage
            return
        }
        if wasAuthorized, let cached = userLocation {
            focusMap(on: cached, distance: Self.userZoomDistance)
        }
        if let c = await location.requestLocation() {
            userLocation = c
            store.save(c, key: LocalStoreKey.myLocation)
            focusMap(on: c, distance: Self.userZoomDistance)
        } else if !wasAuthorized || userLocation == nil {
            toast = "Location unavailable right now. Try again."
        }
    }

    static let locationDeniedMessage = "Location access is off. Enable it in Settings › Privacy & Security › Location Services › ShakeViewer."

    /// Only show the "You" dot once we're allowed to know where the user is.
    var displayedUserLocation: Coordinate? {
        location.authorization == .authorized ? userLocation : nil
    }

    #if DEBUG
    func debugSeedLocation(_ c: Coordinate) {
        userLocation = c
        store.save(c, key: LocalStoreKey.myLocation)
    }
    #endif

    /// Mini-map tap in the detail sheet: show this quake on the full Map tab, selected, sheet compact.
    func showOnMap(_ q: Quake) {
        selected = q
        compactDetailRequest &+= 1
        showMapTabRequest &+= 1
        focusMap(on: Coordinate(latitude: q.latitude, longitude: q.longitude), distance: Self.quakeZoomDistance, quakeId: q.id)
    }

    func focusMap(on c: Coordinate, distance: Double, quakeId: String? = nil) {
        mapFocus = MapFocus(coordinate: c, distance: distance, quakeId: quakeId)
    }

    /// Camera altitude (m) giving roughly a 50–100 km wide view on a phone.
    static let userZoomDistance: Double = 120_000
    static let quakeZoomDistance: Double = 1_200_000

    // MARK: Bookmarks

    func isBookmarked(_ q: Quake) -> Bool { bookmarks.contains { $0.quakeId == q.id } }

    func toggleBookmark(_ q: Quake) {
        if account.user != nil {
            if let existing = account.remoteBookmarks.first(where: { $0.quakeId == q.id }) {
                Task { await account.removeBookmark(docId: existing.id) }
            } else {
                Task { await account.addBookmark(q) }
            }
        } else {
            if localBookmarks.contains(where: { $0.quakeId == q.id }) {
                localBookmarks.removeAll { $0.quakeId == q.id }
            } else {
                localBookmarks.insert(Bookmark(quake: q), at: 0)
            }
            store.save(localBookmarks, key: LocalStoreKey.bookmarks)
        }
    }

    func removeBookmark(_ b: Bookmark) {
        if account.user != nil {
            Task { await account.removeBookmark(docId: b.id) }
        } else {
            localBookmarks.removeAll { $0.id == b.id }
            store.save(localBookmarks, key: LocalStoreKey.bookmarks)
        }
    }

    // MARK: Deep link (shakeviewer.com/?quake=<id>)

    func handle(url: URL) {
        guard InputSanitizer.isTrustedDeepLink(url),
              let raw = URLComponents(url: url, resolvingAgainstBaseURL: false)?
                .queryItems?.first(where: { $0.name == "quake" })?.value,
              let id = InputSanitizer.quakeId(raw) else { return }
        if let q = quakes.first(where: { $0.id == id }) { selected = q }
    }

    // MARK: Helpers

    static let dayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    static func dayString(_ d: Date) -> String { dayFormatter.string(from: d) }
}
