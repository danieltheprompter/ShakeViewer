import SwiftUI

/// Port of the site's CustomSearchPanel + RecentSearches.
struct CustomSearchSheet: View {
    @Environment(QuakeViewModel.self) private var model
    @Environment(AccountService.self) private var account
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        @Bindable var model = model
        NavigationStack {
            Form {
                Section {
                    DatePicker("Start date", selection: $model.customStart, in: ...model.customEnd, displayedComponents: .date)
                    DatePicker("End date", selection: $model.customEnd, in: model.customStart...Date(), displayedComponents: .date)
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text("Min magnitude")
                            Spacer()
                            Text("M \(model.customMinMag, specifier: "%.1f")+").monospacedDigit().foregroundStyle(.secondary)
                        }
                        Slider(value: $model.customMinMag, in: 1.0...9.0, step: 0.1)
                    }
                } header: {
                    Text("Custom search")
                } footer: {
                    Text("Searches USGS and EMSC (up to \(QuakeService.resultLimit.formatted()) results each), merged and de-duplicated.")
                }

                Section {
                    Button {
                        model.beginDrawingArea()
                    } label: {
                        Label(model.customBounds == nil ? "Draw search area" : "Boundary selected · redraw",
                              systemImage: model.customBounds == nil ? "rectangle.dashed" : "checkmark.rectangle")
                    }
                    if let b = model.customBounds {
                        BoundsSummary(bounds: b)
                        Button(role: .destructive) { model.customBounds = nil } label: {
                            Label("Clear boundary", systemImage: "xmark.circle")
                        }
                    }
                } header: {
                    Text("Area")
                } footer: {
                    Text(model.customBounds == nil ? "No boundary: searches worldwide." : "Only quakes inside the red rectangle.")
                }

                RecentSearchesSection()
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                // Always-visible primary action (site: "Run search" / "Searching…").
                VStack(spacing: 6) {
                    if let err = model.errorMessage, model.timeRange == .custom {
                        Text(err).font(.caption).foregroundStyle(.red).multilineTextAlignment(.center)
                    }
                    Button {
                        Task {
                            await model.runCustomSearch()
                            if model.errorMessage == nil { dismiss() }
                        }
                    } label: {
                        HStack {
                            if model.isLoading { ProgressView().padding(.trailing, 4); Text("Searching…") }
                            else { Image(systemName: "magnifyingglass"); Text("Run search") }
                        }
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 6)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(model.isLoading)
                    .accessibilityIdentifier("runSearch")
                }
                .padding(.horizontal)
                .padding(.vertical, 10)
                .background(.bar)
            }
            .navigationTitle("Search")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button { model.resetCustomSearch() } label: { Label("Reset", systemImage: "arrow.counterclockwise") }
                }
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
        }
    }
}

struct BoundsSummary: View {
    let bounds: BoundingBox
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(String(format: "Lat %.2f° … %.2f°", bounds.minLat, bounds.maxLat))
            Text(String(format: "Lon %.2f° … %.2f°", bounds.minLon, bounds.maxLon))
        }
        .font(.caption.monospacedDigit())
        .foregroundStyle(.secondary)
    }
}

struct RecentSearchesSection: View {
    @Environment(QuakeViewModel.self) private var model
    @Environment(AccountService.self) private var account

    var body: some View {
        @Bindable var model = model
        let signedIn = account.user != nil
        let list = (signedIn && model.historyTab == .cloud) ? model.cloudHistory : model.searchHistory
        Section("Recent searches") {
            if signedIn {
                Picker("History", selection: $model.historyTab) {
                    Text("Local").tag(QuakeViewModel.HistoryTab.local)
                    Text("Cloud").tag(QuakeViewModel.HistoryTab.cloud)
                }
                .pickerStyle(.segmented)
            }
            if list.isEmpty {
                Text(signedIn ? "No recent \(model.historyTab.rawValue) searches." : "No recent searches.")
                    .font(.caption).foregroundStyle(.secondary)
            }
            ForEach(list.prefix(10)) { h in
                Button { model.rerun(h) } label: {
                    HStack {
                        Image(systemName: "clock.arrow.circlepath").foregroundStyle(.secondary)
                        Text("\(h.search.startDate) → \(h.search.endDate)").font(.caption.monospaced())
                        Spacer()
                        Text("M \(h.search.minMag, specifier: "%.1f")+ · \(h.search.bounds == nil ? "Global" : "Bounded")")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }
                .tint(.primary)
            }
            if model.historyTab == .local || !signedIn, !model.searchHistory.isEmpty {
                HStack {
                    if signedIn {
                        Button { Task { await model.importHistoryToCloud() } } label: {
                            Label("Save to cloud", systemImage: "icloud.and.arrow.up")
                        }
                        .buttonStyle(.borderless)
                    }
                    Spacer()
                    Button(role: .destructive) { model.clearHistory() } label: { Label("Clear", systemImage: "trash") }
                        .buttonStyle(.borderless)
                }
                .font(.caption)
            }
        }
    }
}

/// Compact header shown above results while in custom mode.
struct CustomSearchSummary: View {
    @Environment(QuakeViewModel.self) private var model

    var body: some View {
        Button { model.showSearchSheet = true } label: {
            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass.circle.fill").font(.title2).foregroundStyle(.tint)
                VStack(alignment: .leading, spacing: 2) {
                    if model.customRan {
                        Text("\(model.visibleQuakes.count) results").font(.subheadline.weight(.semibold))
                        Text("\(QuakeViewModel.dayString(model.customStart)) → \(QuakeViewModel.dayString(model.customEnd)) · M\(model.customMinMag, specifier: "%.1f")+ · \(model.customBounds == nil ? "Global" : "Bounded")")
                            .font(.caption).foregroundStyle(.secondary)
                        if model.customHitLimit {
                            Text("Limit of \(QuakeService.resultLimit.formatted()) per source reached — narrow the search.")
                                .font(.caption2).foregroundStyle(.orange)
                        }
                    } else {
                        Text("Set up a custom search").font(.subheadline.weight(.semibold))
                        Text("Date range, magnitude and optional map area").font(.caption).foregroundStyle(.secondary)
                    }
                }
                Spacer()
                Image(systemName: "chevron.right").foregroundStyle(.tertiary)
            }
        }
        .buttonStyle(.plain)
    }
}
