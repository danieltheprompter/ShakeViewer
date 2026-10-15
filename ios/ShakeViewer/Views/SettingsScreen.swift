import SwiftUI

struct SettingsScreen: View {
    @Environment(AccountService.self) private var account
    @AppStorage("sv_appearance") private var appearance: AppearanceOption = .system
    @AppStorage("sv_map_style") private var mapStyle: MapStyleOption = .standard

    var body: some View {
        Form {
            Section("Appearance") {
                Picker("Theme", selection: $appearance) {
                    ForEach(AppearanceOption.allCases) { Text($0.title).tag($0) }
                }
                .pickerStyle(.segmented)
                Picker("Map style", selection: $mapStyle) {
                    ForEach(MapStyleOption.allCases) { Text($0.title).tag($0) }
                }
            }
            Section("Account") {
                if !account.isAvailable {
                    Text("Accounts are disabled in this build (no GoogleService-Info.plist). Everything else works.")
                        .font(.caption).foregroundStyle(.secondary)
                } else if let u = account.user {
                    LabeledContent("Signed in", value: u.displayName ?? u.email ?? "Account")
                    Button("Sign out") { account.signOut() }
                    NavigationLink {
                        DeleteAccountScreen()
                    } label: {
                        Text("Delete account").foregroundStyle(.red)
                    }
                    .accessibilityIdentifier("deleteAccount")
                } else {
                    NavigationLink("Sign in / Create account") { SignInScreen() }
                }
            }
            Section("Magnitude scale") {
                ForEach(MagnitudeTier.allCases, id: \.self) { t in
                    HStack {
                        Circle().fill(t.color).frame(width: 12, height: 12)
                        Text(t.label)
                        Spacer()
                        Text(t.rangeLabel).monospacedDigit().foregroundStyle(.secondary)
                    }
                }
            }
            Section("About") {
                NavigationLink("About ShakeViewer") { AboutScreen() }
                NavigationLink("Privacy Policy") { PrivacyPolicyScreen() }
                    .accessibilityIdentifier("privacyPolicy")
                NavigationLink("Terms of Use") { TermsScreen() }
                Link("Support & contact", destination: Legal.supportURL)
                    .accessibilityIdentifier("supportLink")
                Link("Privacy Policy (web)", destination: Legal.privacyURL)
                Link("shakeviewer.com", destination: Legal.website)
            }
            Section {
                Link("USGS Earthquake Hazards Program", destination: Legal.usgs)
                Link("EMSC — seismicportal.eu", destination: Legal.emsc)
            } header: {
                Text("Data sources")
            } footer: {
                Text("Earthquake data courtesy of the U.S. Geological Survey and the European-Mediterranean Seismological Centre. Maps by Apple Maps.")
            }
            Section {
                DisclaimerCard()
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
            }
        }
        .navigationTitle("Settings")
    }
}

struct SignInScreen: View {
    /// UI tests pass -svNoAutofill so the simulator's strong-password overlay doesn't swallow typed text.
    static let noAutofill: Bool = {
        #if DEBUG
        ProcessInfo.processInfo.arguments.contains("-svNoAutofill")
        #else
        false
        #endif
    }()
    @Environment(AccountService.self) private var account
    @Environment(\.dismiss) private var dismiss
    @State private var creating = false
    @State private var email = ""
    @State private var password = ""
    @State private var name = ""
    @State private var acceptedTerms = false
    @State private var error: String?
    @State private var info: String?
    @State private var busy = false

    var body: some View {
        Form {
            Picker("", selection: $creating) {
                Text("Sign in").tag(false)
                Text("Create account").tag(true)
            }
            .pickerStyle(.segmented)
            Section {
                if creating { TextField("Name", text: $name).textContentType(.name) }
                TextField("Email", text: $email)
                    .textContentType(.emailAddress).keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never).autocorrectionDisabled()
                SecureField("Password", text: $password).textContentType(Self.noAutofill ? nil : (creating ? .newPassword : .password))
                if creating {
                    Toggle("I accept the Terms of Use and Privacy Policy", isOn: $acceptedTerms)
                    NavigationLink("Read the Terms of Use") { TermsScreen() }
                    NavigationLink("Read the Privacy Policy") { PrivacyPolicyScreen() }
                }
            }
            if let error { Text(error).foregroundStyle(.red).font(.caption) }
            if let info { Text(info).foregroundStyle(.secondary).font(.caption) }
            Button(creating ? "Create account" : "Sign in") { submit() }
                .disabled(busy || email.isEmpty || password.isEmpty || (creating && !acceptedTerms))
            if !creating {
                Button("Forgot password?") {
                    Task {
                        do { try await account.resetPassword(email: email); info = "Reset email sent." }
                        catch { self.error = error.localizedDescription }
                    }
                }
                .disabled(email.isEmpty)
            }
        }
        .navigationTitle(creating ? "Create account" : "Sign in")
    }

    private func submit() {
        busy = true; error = nil
        Task {
            defer { busy = false }
            do {
                if creating { try await account.signUp(email: email, password: password, name: name) }
                else { try await account.signIn(email: email, password: password) }
                dismiss()
            } catch {
                self.error = error.localizedDescription
            }
        }
    }
}

/// In-app account deletion (App Store Guideline 5.1.1(v)).
struct DeleteAccountScreen: View {
    @Environment(AccountService.self) private var account
    @Environment(\.dismiss) private var dismiss
    @State private var password = ""
    @State private var confirm = false
    @State private var busy = false
    @State private var error: String?

    var body: some View {
        Form {
            Section {
                Text("Deleting your account permanently removes your synced bookmarks, saved searches, your user record, and your sign-in from ShakeViewer’s servers (also on shakeviewer.com). This can’t be undone.")
                Text("Bookmarks and history stored only on this device stay until you remove the app.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
            Section("Confirm with your password") {
                SecureField("Password", text: $password)
                    .textContentType(.password)
                    .accessibilityIdentifier("deletePassword")
            }
            if let error { Text(error).foregroundStyle(.red).font(.footnote) }
            Section {
                Button(role: .destructive) { confirm = true } label: {
                    HStack { Text("Delete account permanently"); if busy { Spacer(); ProgressView() } }
                }
                .disabled(busy || password.isEmpty)
                .accessibilityIdentifier("confirmDeleteAccount")
            }
        }
        .navigationTitle("Delete account")
        .confirmationDialog("Delete your ShakeViewer account?", isPresented: $confirm, titleVisibility: .visible) {
            Button("Delete account", role: .destructive) { run() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("All synced data will be erased.")
        }
    }

    private func run() {
        busy = true; error = nil
        Task {
            defer { busy = false }
            do {
                try await account.deleteAccount(password: password)
                dismiss()
            } catch {
                let ns = error as NSError
                // Firebase wrong-password / invalid-credential codes: don't leak details.
                if ns.domain == "FIRAuthErrorDomain", [17009, 17004].contains(ns.code) {
                    self.error = "That password isn’t correct."
                } else {
                    self.error = error.localizedDescription
                }
            }
        }
    }
}
