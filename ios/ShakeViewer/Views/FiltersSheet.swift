import SwiftUI

struct FiltersSheet: View {
    @Environment(QuakeViewModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @AppStorage("sv_map_style") private var mapStyle: MapStyleOption = .standard
    @AppStorage("sv_show_faults") private var showFaults = false

    var body: some View {
        @Bindable var model = model
        NavigationStack {
            Form {
                Section("Minimum magnitude") {
                    HStack {
                        Text("M \(model.minMag, specifier: "%.1f")+").monospacedDigit()
                        Slider(value: $model.minMag, in: 2.5...9.0, step: 0.1)
                    }
                }
                Section("Depth") {
                    Picker("Depth", selection: $model.depth) {
                        ForEach(DepthFilter.allCases) { Text($0.title).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    Text("Shallow < 70 km · Intermediate 70–300 km · Deep ≥ 300 km")
                        .font(.caption).foregroundStyle(.secondary)
                }
                Section("Sort by") {
                    HStack {
                        sortButton(.time, "Time")
                        sortButton(.magnitude, "Magnitude")
                    }
                }
                Section("Near me") {
                    Toggle("Only within \(Int(model.nearMeRadiusKm)) km", isOn: $model.nearMeActive)
                    if model.nearMeActive {
                        Slider(value: $model.nearMeRadiusKm, in: 100...2000, step: 50)
                        if model.userLocation == nil { Text("Finding your location…").font(.caption) }
                    }
                }
                Section("Map style") {
                    Picker("Map style", selection: $mapStyle) {
                        ForEach(MapStyleOption.allCases) { Text($0.title).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    Toggle(isOn: $showFaults) {
                        VStack(alignment: .leading) {
                            Text("Fault lines (plate boundaries)")
                            Text("Tectonic plate boundaries, PB2002 (Bird 2003)").font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .navigationTitle("Filters")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Reset") {
                        model.minMag = 2.5; model.depth = .all; model.sort = .time
                        model.descending = true; model.nearMeActive = false
                    }
                }
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
        }
    }

    private func sortButton(_ s: SortType, _ title: String) -> some View {
        Button {
            model.toggleSort(s)
        } label: {
            HStack {
                Text(title)
                if model.sort == s { Image(systemName: model.descending ? "arrow.down" : "arrow.up") }
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.bordered)
        .tint(model.sort == s ? .accentColor : .secondary)
    }
}
