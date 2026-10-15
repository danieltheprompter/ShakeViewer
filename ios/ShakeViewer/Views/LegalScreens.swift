import SwiftUI

/// In-app About / Privacy Policy / Terms of Use (App Store Guideline 5.1.1(i)).
/// Text ported from the website (TERMS_VERSION 2026-02-16) and adapted to what the iOS app actually does.
enum Legal {
    static let version = AccountService.termsVersion
    static let website = URL(string: "https://shakeviewer.com/")!
    static let privacyURL = URL(string: "https://shakeviewer.com/privacy")!
    static let termsURL = URL(string: "https://shakeviewer.com/terms")!
    static let supportURL = URL(string: "https://shakeviewer.com/support")!
    static let usgs = URL(string: "https://earthquake.usgs.gov/")!
    static let emsc = URL(string: "https://www.seismicportal.eu/")!
    static let usgsPolicies = URL(string: "https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits")!
    static let disclaimer = "ShakeViewer is for informational and educational purposes only. Data may be delayed, incomplete, or inaccurate. It is not an earthquake early-warning or emergency alert service — do not rely on it for life-safety decisions. Follow official emergency alerts and local authorities."
}

private struct LegalPage<Content: View>: View {
    let title: String
    var showVersion = true
    @ViewBuilder var content: Content
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                if showVersion {
                    Text("Effective \(Legal.version)").font(.caption).foregroundStyle(.secondary)
                }
                content
            }
            .frame(maxWidth: 700, alignment: .leading)
            .padding()
            .frame(maxWidth: .infinity)
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct H: View {
    let t: String
    init(_ t: String) { self.t = t }
    var body: some View { Text(t).font(.headline).padding(.top, 6).accessibilityAddTraits(.isHeader) }
}

private struct Bullet: View {
    let t: LocalizedStringKey
    init(_ t: LocalizedStringKey) { self.t = t }
    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) { Text("•"); Text(t) }
            .accessibilityElement(children: .combine)
    }
}

struct DisclaimerCard: View {
    var body: some View {
        Label {
            Text(Legal.disclaimer).font(.footnote)
        } icon: {
            Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.orange)
        }
        .padding(12)
        .background(.orange.opacity(0.10), in: RoundedRectangle(cornerRadius: 12))
        .accessibilityIdentifier("disclaimer")
    }
}

struct AboutScreen: View {
    var body: some View {
        LegalPage(title: "About", showVersion: false) {
            DisclaimerCard()
            H("Magnitude scale")
            Text("Earthquake magnitude is logarithmic — each whole-number step represents roughly 32× more energy released.")
            ForEach(MagnitudeTier.allCases, id: \.self) { t in
                HStack {
                    Circle().fill(t.color).frame(width: 12, height: 12).accessibilityHidden(true)
                    Text(t.label).bold()
                    Text(t.rangeLabel).monospacedDigit().foregroundStyle(.secondary)
                }
            }
            H("Real-time monitoring")
            Text("ShakeViewer aggregates data from two authoritative sources and refreshes automatically:")
            Bullet("**[USGS](https://earthquake.usgs.gov/)** — the U.S. Geological Survey, which maintains the Advanced National Seismic System.")
            Bullet("**[EMSC](https://www.seismicportal.eu/)** — the European-Mediterranean Seismological Centre.")
            Text("When both report the same earthquake, ShakeViewer deduplicates them by time and location; USGS is preferred.")
            H("Data sources & attribution")
            Bullet("Earthquake data: U.S. Geological Survey, Earthquake Hazards Program (public domain) and EMSC / seismicportal.eu.")
            Bullet("Plate boundaries: Bird, P. (2003) “An updated digital model of plate boundaries”, PB2002.")
            Bullet("Maps: Apple Maps (MapKit). Map data © their respective owners — see “Legal” on the map.")
            Text("ShakeViewer is not affiliated with or endorsed by USGS, EMSC, or Apple.").font(.footnote).foregroundStyle(.secondary)
            H("Safety tips")
            Bullet("**If you're indoors:** drop, cover, and hold on. Stay under a sturdy desk or table.")
            Bullet("**If you're outdoors:** move to an open area away from buildings, trees, and power lines.")
            Bullet("**If you're driving:** pull over safely, avoid overpasses and bridges, stay inside until shaking stops.")
            Bullet("**After the shaking stops:** check yourself for injuries, be prepared for aftershocks, follow official guidance for tsunamis near coastlines.")
            H("Frequently asked questions")
            Text("**How often is the data updated?** Every 60 seconds in the 24-hour view and every 5 minutes for longer windows. Pull to refresh any time.")
            Text("**Why don't I see a quake I felt?** Small or very recent events can take several minutes to appear in USGS/EMSC feeds.")
            H("Contact & support")
            Link("Support, FAQ & contact", destination: Legal.supportURL)
            Link("shakeviewer.com", destination: Legal.website)
            Text("Version \(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "") (\(Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? ""))")
                .font(.caption).foregroundStyle(.secondary)
        }
    }
}

struct PrivacyPolicyScreen: View {
    var body: some View {
        LegalPage(title: "Privacy Policy") {
            H("Overview")
            Text("ShakeViewer respects your privacy. This policy explains what data the iOS app collects, how it is used, and your rights.")
            H("Data we collect")
            Bullet("**Earthquake data** is fetched directly from USGS and EMSC — no personally identifying information is sent to them beyond your IP address, which any internet request reveals.")
            Bullet("**Account data** (only if you create an account): email address, optional display name, and a password that is stored hashed by Firebase Authentication. ShakeViewer never sees your password in plain text.")
            Bullet("**User content** (only if signed in): bookmarks and saved custom searches you choose to sync, plus the date you accepted these terms.")
            Bullet("**Location** (optional, “While Using the App” only): used on your device to show nearby earthquakes and distances. Your location is never uploaded to our servers or shared.")
            Bullet("**Preferences** (theme, map style, filters, local history) are stored only on your device.")
            H("What we don't do")
            Text("The iOS app contains no advertising, no analytics or tracking SDKs, and does not track you across apps or websites. We do not sell, rent, or share your data with advertisers.")
            H("How data is used and stored")
            Text("Account data and synced content are stored in Google Firebase (Authentication and Cloud Firestore) solely to provide ShakeViewer features such as syncing bookmarks between the app and shakeviewer.com. Google acts as our service provider and protects this data under its own security and privacy commitments. Data is transmitted over encrypted HTTPS connections.")
            H("Retention and deletion")
            Text("Synced data is kept while your account exists. You can delete your account at any time in **Settings → Account → Delete account**. This permanently erases your bookmarks, search history, user record, and sign-in credentials from our systems. Data stored only on your device is removed when you delete the app.")
            H("Your rights and consent")
            Text("Creating an account is optional; every earthquake feature works without one. You can revoke location access at any time in iOS Settings. You may request access to or deletion of your data through the contact below.")
            H("Children")
            Text("ShakeViewer is not directed at children under 13 and does not knowingly collect their personal information.")
            H("Changes")
            Text("We may update this policy. The effective date above shows when it last changed.")
            H("Contact")
            Text("Questions or privacy requests? See [shakeviewer.com/support](https://shakeviewer.com/support). The full policy covering the website and the app is at [shakeviewer.com/privacy](https://shakeviewer.com/privacy).")
        }
    }
}

struct TermsScreen: View {
    var body: some View {
        LegalPage(title: "Terms of Use") {
            H("Acceptance")
            Text("By using ShakeViewer you agree to these terms. If you do not accept them, please do not use the service.")
            H("Nature of the service")
            Text("ShakeViewer provides earthquake information aggregated from USGS and EMSC for informational and educational purposes only. Data may be delayed, incomplete, or inaccurate. **Do not rely on ShakeViewer for life-safety decisions.** Follow official emergency alerts and local authorities.")
            H("Acceptable use")
            Bullet("Do not attempt to reverse-engineer, scrape in bulk, or overload the service.")
            Bullet("Do not use ShakeViewer to mislead or spread disinformation about seismic events.")
            Bullet("Respect the terms of upstream data providers (USGS and EMSC).")
            H("Accounts")
            Text("You are responsible for your account credentials and any activity performed through your account. You may delete your account at any time in Settings → Account → Delete account.")
            H("Disclaimer")
            Text("The service is provided \"as is\" without warranty of any kind. ShakeViewer is not liable for damages arising from use of the service or reliance on the data it displays.")
            H("Changes")
            Text("These terms may change. The effective date above indicates when they were last updated. Continued use of the service constitutes acceptance of the updated terms.")
            Link("shakeviewer.com/terms", destination: Legal.termsURL)
        }
    }
}
