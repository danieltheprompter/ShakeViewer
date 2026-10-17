import SwiftUI
import AuthenticationServices
#if canImport(GoogleSignInSwift)
import GoogleSignInSwift
#endif

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
                    // Never show Apple "Hide My Email" relay addresses.
                    let isRelay = u.email?.lowercased().hasSuffix("@privaterelay.appleid.com") ?? false
                    LabeledContent("Signed in", value: u.displayName ?? (isRelay ? "Signed in with Apple · email hidden" : u.email) ?? "Account")
                    if u.needsEmailVerification {
                        EmailVerificationRow()
                    }
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
        .task { if account.user?.needsEmailVerification == true { await account.refreshUser() } }
    }
}

/// Settings row for an unverified email: status + resend + refresh. Doesn't block anything.
private struct EmailVerificationRow: View {
    @Environment(AccountService.self) private var account
    @State private var status: String?
    @State private var busy = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("Email not verified", systemImage: "exclamationmark.circle")
                .foregroundStyle(.orange)
                .accessibilityIdentifier("emailUnverified")
            Text("Check your inbox for the verification link.")
                .font(.caption).foregroundStyle(.secondary)
            HStack {
                Button("Resend email") {
                    run { try await account.sendEmailVerification(); status = "Verification email sent." }
                }
                Spacer()
                Button("I’ve verified") {
                    run {
                        await account.refreshUser()
                        if account.user?.isEmailVerified == false { status = "Not verified yet. Tap the link in the email first." }
                    }
                }
            }
            .buttonStyle(.borderless)
            .disabled(busy)
            if let status { Text(status).font(.caption).foregroundStyle(.secondary) }
        }
    }

    private func run(_ op: @escaping @MainActor () async throws -> Void) {
        busy = true; status = nil
        Task {
            defer { busy = false }
            do { try await op() } catch { status = AccountService.friendlyMessage(for: error) }
        }
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
    private enum Field: Hashable { case name, email, password, confirm }

    @Environment(AccountService.self) private var account
    @Environment(\.dismiss) private var dismiss
    @State private var creating = false
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var name = ""
    @State private var showPassword = false
    @State private var acceptedTerms = false
    @State private var error: String?
    @State private var info: String?
    @State private var busy = false
    /// Set after a successful sign-up: shows the "check your inbox" state.
    @State private var verificationSentTo: String?
    @FocusState private var focus: Field?

    private var trimmedEmail: String { SignUpValidation.normalizedEmail(email) }
    private var emailValid: Bool { SignUpValidation.isEmailValid(email) }
    private var passwordValid: Bool { SignUpValidation.isPasswordValid(password) }
    private var passwordsMatch: Bool { password == confirmPassword }
    private var showMismatch: Bool { creating && !confirmPassword.isEmpty && !passwordsMatch }
    private var showEmailHint: Bool { creating && !trimmedEmail.isEmpty && !emailValid && focus != .email }

    private var canSubmit: Bool {
        guard !busy, !trimmedEmail.isEmpty, !password.isEmpty else { return false }
        if creating { return emailValid && passwordValid && passwordsMatch && acceptedTerms }
        return true
    }

    var body: some View {
        Group {
            if let sentTo = verificationSentTo { CheckInboxView(email: sentTo) { dismiss() } }
            else { form }
        }
        .navigationTitle(verificationSentTo != nil ? "Verify your email" : (creating ? "Create account" : "Sign in"))
    }

    private var form: some View {
        Form {
            Picker("", selection: $creating) {
                Text("Sign in").tag(false)
                Text("Create account").tag(true)
            }
            .pickerStyle(.segmented)
            .onChange(of: creating) { error = nil; info = nil; confirmPassword = "" }
            Section {
                SocialSignInButtons(busy: $busy, error: $error) { dismiss() }
            } footer: {
                Text("By continuing, you agree to the [Terms of Use](\(Legal.termsURL.absoluteString)) and [Privacy Policy](\(Legal.privacyURL.absoluteString)).")
                    .accessibilityIdentifier("socialTermsNotice")
            }
            Section {
                if creating {
                    TextField("Name", text: $name)
                        .textContentType(.name)
                        .focused($focus, equals: .name).submitLabel(.next)
                        .onSubmit { focus = .email }
                }
                TextField("Email", text: $email)
                    .textContentType(Self.noAutofill ? nil : (creating ? .emailAddress : .username))
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never).autocorrectionDisabled()
                    .focused($focus, equals: .email).submitLabel(.next)
                    .onSubmit { focus = .password }
                if showEmailHint {
                    Label("Enter a valid email address, like name@example.com.", systemImage: "exclamationmark.circle")
                        .font(.caption).foregroundStyle(.red)
                }
                passwordField("Password", text: $password, field: .password,
                              contentType: creating ? .newPassword : .password)
                if creating {
                    PasswordChecklist(password: password)
                    passwordField("Confirm password", text: $confirmPassword, field: .confirm, contentType: .newPassword)
                    if showMismatch {
                        Label("Passwords don’t match.", systemImage: "xmark.circle.fill")
                            .font(.caption).foregroundStyle(.red)
                            .accessibilityIdentifier("passwordMismatch")
                    }
                }
            } footer: {
                if creating {
                    Text("Tip: iOS can suggest a strong password and save it to your Passwords app.")
                }
            }
            if creating {
                Section {
                    Toggle("I accept the Terms of Use and Privacy Policy", isOn: $acceptedTerms)
                    NavigationLink("Read the Terms of Use") { TermsScreen() }
                    NavigationLink("Read the Privacy Policy") { PrivacyPolicyScreen() }
                }
            }
            if let error {
                Label(error, systemImage: "exclamationmark.triangle.fill")
                    .foregroundStyle(.red).font(.callout)
                    .accessibilityIdentifier("authError")
            }
            if let info { Text(info).foregroundStyle(.secondary).font(.callout) }
            Button { submit() } label: {
                HStack {
                    Text(creating ? "Create account" : "Sign in")
                    if busy { Spacer(); ProgressView() }
                }
            }
            .disabled(!canSubmit)
            if !creating {
                Button("Forgot password?") {
                    error = nil; info = nil
                    Task {
                        do { try await account.resetPassword(email: trimmedEmail); info = "Reset email sent." }
                        catch { self.error = AccountService.friendlyMessage(for: error) }
                    }
                }
                .disabled(trimmedEmail.isEmpty)
            }
        }
    }

    @ViewBuilder
    private func passwordField(_ title: String, text: Binding<String>, field: Field, contentType: UITextContentType) -> some View {
        HStack {
            Group {
                if showPassword {
                    TextField(title, text: text)
                        .textInputAutocapitalization(.never).autocorrectionDisabled()
                } else {
                    SecureField(title, text: text)
                }
            }
            .textContentType(Self.noAutofill ? nil : contentType)
            .focused($focus, equals: field)
            .submitLabel(field == .password && creating ? .next : .go)
            .onSubmit {
                if field == .password && creating { focus = .confirm } else if canSubmit { submit() }
            }
            if field == .password {
                Button {
                    showPassword.toggle()
                } label: {
                    Image(systemName: showPassword ? "eye.slash" : "eye").foregroundStyle(.secondary)
                }
                .buttonStyle(.borderless)
                .accessibilityLabel(showPassword ? "Hide password" : "Show password")
                .accessibilityIdentifier("togglePasswordVisibility")
            }
        }
    }

    private func submit() {
        guard canSubmit else { return }
        busy = true; error = nil; info = nil
        let wasCreating = creating
        Task {
            defer { busy = false }
            do {
                if wasCreating {
                    try await account.signUp(email: trimmedEmail, password: password, name: name)
                    withAnimation { verificationSentTo = trimmedEmail }
                } else {
                    try await account.signIn(email: trimmedEmail, password: password)
                    dismiss()
                }
            } catch {
                self.error = AccountService.friendlyMessage(for: error)
            }
        }
    }
}

/// Live checklist + strength hint for the new-password field.
private struct PasswordChecklist: View {
    let password: String

    var body: some View {
        let rules = SignUpValidation.passwordRules(password)
        VStack(alignment: .leading, spacing: 4) {
            ForEach(rules) { r in
                Label(r.label, systemImage: r.isMet ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(r.isMet ? Color.green : Color.secondary)
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel("\(r.label), \(r.isMet ? "met" : "not met")")
            }
            if !password.isEmpty {
                let s = SignUpValidation.strength(password)
                HStack(spacing: 4) {
                    ForEach(0..<4) { i in
                        Capsule().fill(i <= s.rawValue ? color(s) : Color.secondary.opacity(0.25)).frame(height: 4)
                    }
                    Text(s.label).foregroundStyle(color(s)).padding(.leading, 4)
                }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Password strength: \(s.label)")
            }
        }
        .font(.caption)
        .animation(.default, value: password)
    }

    private func color(_ s: SignUpValidation.Strength) -> Color {
        switch s { case .weak: .red; case .fair: .orange; case .good: .yellow; case .strong: .green }
    }
}

/// Shown after sign-up: friendly "check your inbox" with resend.
private struct CheckInboxView: View {
    let email: String
    let onDone: () -> Void
    @Environment(AccountService.self) private var account
    @State private var status: String?
    @State private var sending = false

    var body: some View {
        Form {
            Section {
                VStack(spacing: 12) {
                    Image(systemName: "envelope.badge")
                        .font(.system(size: 48)).foregroundStyle(.tint)
                        .accessibilityHidden(true)
                    Text("Check your inbox").font(.title2.bold())
                    Text("Your account is ready. We sent a verification link to **\(email)**. Tap it to confirm your email — you can keep using ShakeViewer in the meantime.")
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .accessibilityElement(children: .combine)
            }
            Section {
                Button {
                    resend()
                } label: {
                    HStack { Text("Resend verification email"); if sending { Spacer(); ProgressView() } }
                }
                .disabled(sending)
                if let status { Text(status).font(.callout).foregroundStyle(.secondary) }
            } footer: {
                Text("Didn’t get it? Check your spam folder.")
            }
            Section {
                Button("Done") { onDone() }.accessibilityIdentifier("verifyDone")
            }
        }
    }

    private func resend() {
        sending = true; status = nil
        Task {
            defer { sending = false }
            do { try await account.sendEmailVerification(); status = "Verification email sent again." }
            catch { status = AccountService.friendlyMessage(for: error) }
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

    /// Password accounts confirm with their password; Apple/Google accounts re-authenticate with that provider.
    private var needsPassword: Bool {
        guard let u = account.user else { return true }
        return u.usesPassword || (!u.usesApple && !u.usesGoogle)
    }

    var body: some View {
        Form {
            Section {
                Text("Deleting your account permanently removes your synced bookmarks, saved searches, your user record, and your sign-in from ShakeViewer’s servers (also on shakeviewer.com). This can’t be undone.")
                Text("Bookmarks and history stored only on this device stay until you remove the app.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
            if needsPassword {
                Section("Confirm with your password") {
                    SecureField("Password", text: $password)
                        .textContentType(.password)
                        .accessibilityIdentifier("deletePassword")
                }
            } else {
                Section("Confirm it’s you") {
                    Text(account.user?.usesApple == true
                         ? "You’ll be asked to confirm with Sign in with Apple. ShakeViewer will also revoke its access to your Apple ID."
                         : "You’ll be asked to confirm with your Google account.")
                        .font(.callout)
                }
            }
            if let error { Text(error).foregroundStyle(.red).font(.footnote) }
            Section {
                Button(role: .destructive) { confirm = true } label: {
                    HStack { Text("Delete account permanently"); if busy { Spacer(); ProgressView() } }
                }
                .disabled(busy || (needsPassword && password.isEmpty))
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
                try await account.deleteAccount(password: needsPassword ? password : "")
                dismiss()
            } catch {
                if AppleNonce.isCancel(error) { return }
                let ns = error as NSError
                // Firebase wrong-password / invalid-credential codes: don't leak details.
                if ns.domain == "FIRAuthErrorDomain", [17009, 17004].contains(ns.code) {
                    self.error = "That password isn’t correct."
                } else {
                    self.error = AccountService.friendlyMessage(for: error)
                }
            }
        }
    }
}

/// Sign in with Apple (Apple's official button) above the Google-branded button, per Apple HIG / Guideline 4.8.
struct SocialSignInButtons: View {
    @Binding var busy: Bool
    @Binding var error: String?
    let onSignedIn: () -> Void
    @Environment(AccountService.self) private var account
    @Environment(\.colorScheme) private var colorScheme
    @State private var currentNonce: String?

    var body: some View {
        VStack(spacing: 12) {
            SignInWithAppleButton(.continue) { req in
                let raw = AppleNonce.random()
                currentNonce = raw
                req.requestedScopes = [.fullName, .email]
                req.nonce = AppleNonce.sha256(raw)
            } onCompletion: { result in
                switch result {
                case .success(let auth):
                    guard let raw = currentNonce else { error = SocialAuthError.missingToken.errorDescription; return }
                    do {
                        let r = try AppleNonce.extract(auth)
                        run { try await account.signInWithApple(r, rawNonce: raw) }
                    } catch { self.error = AccountService.friendlyMessage(for: error) }
                case .failure(let e):
                    if !AppleNonce.isCancel(e) { error = "Sign in with Apple failed. Please try again." }
                }
            }
            .signInWithAppleButtonStyle(colorScheme == .dark ? .white : .black)
            .frame(maxWidth: .infinity, minHeight: 50, maxHeight: 50)
            .accessibilityIdentifier("signInWithApple")

            #if canImport(GoogleSignInSwift)
            GoogleSignInButton(scheme: colorScheme == .dark ? .dark : .light, style: .wide, state: busy ? .disabled : .normal) {
                run { try await account.signInWithGoogle() }
            }
            .frame(maxWidth: .infinity, minHeight: 44)
            .accessibilityLabel("Sign in with Google")
            .accessibilityIdentifier("signInWithGoogle")
            #endif
        }
        .disabled(busy)
        .listRowInsets(EdgeInsets(top: 12, leading: 16, bottom: 12, trailing: 16))
    }

    private func run(_ op: @escaping @MainActor () async throws -> Void) {
        busy = true; error = nil
        Task {
            defer { busy = false }
            do { try await op(); onSignedIn() }
            catch { if !AppleNonce.isCancel(error) { self.error = AccountService.friendlyMessage(for: error) } }
        }
    }
}
