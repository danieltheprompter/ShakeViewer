import SwiftUI

enum AppearanceOption: String, CaseIterable, Identifiable {
    case system, light, dark
    var id: String { rawValue }
    var title: String { rawValue.capitalized }
    var colorScheme: ColorScheme? {
        switch self {
        case .system: nil
        case .light: .light
        case .dark: .dark
        }
    }
}

@main
struct ShakeViewerApp: App {
    @State private var account: AccountService
    @State private var model: QuakeViewModel
    @AppStorage("sv_appearance") private var appearance: AppearanceOption = .system

    init() {
        let account = AccountService()
        account.configureIfPossible()
        _account = State(initialValue: account)
        _model = State(initialValue: QuakeViewModel(account: account))
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .environment(account)
                .preferredColorScheme(appearance.colorScheme)
                .onOpenURL { model.handle(url: $0) }
        }
    }
}
