#if DEBUG
import SwiftUI
import os
import Darwin

/// Scripted interaction for performance measurement (launch arg `-svBench YES`).
/// Available in all configurations so optimized builds can be profiled; does nothing unless the arg is set.
/// Phases are wrapped in signpost intervals (subsystem com.shakeviewer.app, category Bench).
@MainActor
enum Bench {
    static let signposter = OSSignposter(subsystem: "com.shakeviewer.app", category: "Bench")
    static var enabled: Bool { UserDefaults.standard.bool(forKey: "svBench") }

    /// Phase timings (seconds since process start) written to Documents/bench.json for trace correlation.
    private static var marks: [[String: Any]] = []

    private static func secondsSinceLaunch() -> Double {
        var kp = kinfo_proc()
        var size = MemoryLayout<kinfo_proc>.stride
        var mib: [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]
        guard sysctl(&mib, 4, &kp, &size, nil, 0) == 0 else { return -1 }
        let st = kp.kp_proc.p_starttime
        let start = Double(st.tv_sec) + Double(st.tv_usec) / 1_000_000
        return Date().timeIntervalSince1970 - start
    }

    static func phase(_ name: StaticString, _ body: () async -> Void) async {
        let id = signposter.makeSignpostID()
        let state = signposter.beginInterval(name, id: id)
        let t0 = secondsSinceLaunch()
        await body()
        signposter.endInterval(name, state)
        marks.append(["phase": "\(name)", "start": t0, "end": secondsSinceLaunch()])
    }

    private static func writeMarks(quakes: Int) {
        let obj: [String: Any] = ["quakes": quakes, "phases": marks]
        guard let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first,
              let data = try? JSONSerialization.data(withJSONObject: obj, options: [.prettyPrinted]) else { return }
        try? data.write(to: dir.appendingPathComponent("bench.json"))
    }

    static func run(model: QuakeViewModel, setTab: (RootView.AppTab) -> Void) async {
        model.timeRange = .week
        for _ in 0..<60 where model.quakes.count < 500 { try? await Task.sleep(for: .milliseconds(250)) }
        try? await Task.sleep(for: .seconds(2))
        Logger(subsystem: "com.shakeviewer.app", category: "Bench").notice("bench start quakes=\(model.quakes.count)")

        await phase("map-pan-zoom") {
            let stops: [(Double, Double, Double)] = [
                (35, 139, 3_000_000), (10, 125, 8_000_000), (-10, 115, 4_000_000), (-35, 175, 6_000_000),
                (37, -120, 2_500_000), (20, -100, 9_000_000), (0, -30, 20_000_000), (38, 20, 3_000_000),
                (36, 140, 1_000_000), (20, 150, 15_000_000),
            ]
            for s in stops {
                model.focusMap(on: Coordinate(latitude: s.0, longitude: s.1), distance: s.2)
                try? await Task.sleep(for: .milliseconds(1100))
            }
        }
        await phase("fault-lines") {
            UserDefaults.standard.set(true, forKey: "sv_show_faults")
            try? await Task.sleep(for: .milliseconds(800))
            for s in [(0.0, 160.0, 12_000_000.0), (30, -40, 14_000_000), (-20, 80, 12_000_000)] {
                model.focusMap(on: Coordinate(latitude: s.0, longitude: s.1), distance: s.2)
                try? await Task.sleep(for: .milliseconds(1100))
            }
            UserDefaults.standard.set(false, forKey: "sv_show_faults")
        }
        await phase("tab-switches") {
            for t in [RootView.AppTab.list, .map, .list, .bookmarks, .settings, .map, .list] {
                setTab(t)
                try? await Task.sleep(for: .milliseconds(600))
            }
        }
        await phase("list-scroll") {
            let ids = model.visibleQuakes.map(\.id)
            guard ids.count > 50 else { return }
            for frac in [0.25, 0.5, 0.9, 0.1, 0.0] {
                model.benchScrollTarget = ids[Int(Double(ids.count - 1) * frac)]
                try? await Task.sleep(for: .milliseconds(900))
            }
        }
        await phase("detail-sheet") {
            setTab(.map)
            try? await Task.sleep(for: .milliseconds(600))
            for q in model.visibleQuakes.prefix(4) {
                model.selected = q
                try? await Task.sleep(for: .milliseconds(900))
            }
            model.selected = nil
            try? await Task.sleep(for: .milliseconds(800))
        }
        writeMarks(quakes: model.quakes.count)
        Logger(subsystem: "com.shakeviewer.app", category: "Bench").notice("bench done")
    }
}
#endif
