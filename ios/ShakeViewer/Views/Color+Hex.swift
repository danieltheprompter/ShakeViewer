import SwiftUI

extension Color {
    init(hex: UInt32) {
        self.init(.sRGB,
                  red: Double((hex >> 16) & 0xFF) / 255,
                  green: Double((hex >> 8) & 0xFF) / 255,
                  blue: Double(hex & 0xFF) / 255,
                  opacity: 1)
    }
}

extension MagnitudeTier {
    var color: Color { Color(hex: hex) }
}

extension Quake {
    var color: Color { tier.color }
    var magText: String { String(format: "%.1f", mag) }
}

/// Shared formatter (creating formatters per row is expensive). Minute granularity, driven by `model.clock`.
@MainActor
enum RelativeTime {
    private static let formatter: RelativeDateTimeFormatter = {
        let f = RelativeDateTimeFormatter()
        f.unitsStyle = .short
        return f
    }()

    static func string(for date: Date, now: Date) -> String {
        if now.timeIntervalSince(date) < 60 { return "just now" }
        return formatter.localizedString(for: date, relativeTo: now)
    }
}
