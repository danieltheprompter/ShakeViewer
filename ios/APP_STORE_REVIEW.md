# ShakeViewer iOS — App Store compliance & security review

Reviewed 2026-10-14 against the App Review Guidelines (last updated June 8, 2026), Apple's privacy-manifest / required-reason API docs, and Firebase Apple SDK release notes.
Build reviewed: 1.0.0 (1), bundle `com.shakeviewer.app`, iOS 17+, universal (iPhone + iPad).

Status key: **FIXED** (changed in code), **OK** (already compliant), **DANIEL** (needs action outside the code), **N/A** (not applicable).

## App Review Guidelines

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1.4.1 / 1.4 | Safety/accuracy disclaimer | FIXED | Disclaimer card in Settings and About, plus a one-line note in every quake detail sheet: "Informational only — not an emergency alert service". The Terms say "Do not rely on ShakeViewer for life-safety decisions". The app makes no early-warning claims. |
| 1.5 | Developer contact | FIXED (pending deploy) | The About screen links to shakeviewer.com, but the site has **no support/contact page** (`/support` returns 404). Add a contact email or page and set it as the Support URL. |
| 2.1 | Completeness / demo account | DANIEL | Accounts only work when `GoogleService-Info.plist` is bundled (it's not in the current builds, so accounts are disabled there). For submission: bundle it, test sign-up/delete on a device, and give App Review a demo account in the review notes. |
| 2.3 | Accurate metadata | DANIEL | The screenshots/description must match the app (see the ASC checklist below). |
| 2.4.1 | iPad | FIXED | Universal target. iPad now declares all 4 orientations (required for iPad multitasking). Legal pages cap the text width at 700 pt. The map/list layouts are adaptive SwiftUI, but **not yet tested on an iPad simulator** — DANIEL/next step: run on an iPad sim and take iPad screenshots (13" required if you ship universal). |
| 2.5.1 | Public APIs only | OK | Only SwiftUI, MapKit, CoreLocation, Foundation and Firebase. The `sysctl` process-start-time call is in the benchmark code only, which is compiled out of Release. |
| 2.5.5 | IPv6 | OK | URLSession with hostnames only, no hard-coded IPs. |
| — | Debug hooks in Release | FIXED | `Bench.swift` is wrapped in `#if DEBUG`. The Bench call, the `-sv*` launch-argument parser, the `-svCamera` reader, `debugSeedLocation`, the camera debug probe and the benchmark list scroll hook are all `#if DEBUG`. Release ignores every `-sv*` argument. |
| 4.2 | Minimum functionality | OK | Fully native app (SwiftUI + MKMapView, offline-cached plate boundaries, filters, custom area search with a drawn boundary, bookmarks, location distance, share sheet, detail sheet with snapshot mini-map). No web views. |
| 4.8 | Sign in with Apple | N/A | The app uses only its own email/password accounts (Firebase Auth). **If Google Sign-In is added later, Sign in with Apple (or an equivalent privacy-preserving login) must be offered too.** The website already has Google sign-in; the app deliberately doesn't. |
| 5.1.1(i) | Privacy policy in app | FIXED | Settings → Privacy Policy (full screen). It's ported from the site's text (version 2026-02-16) but corrected for iOS: no Google Analytics, no Google sign-in, location stays on device. It covers retention/deletion and how to revoke consent. |
| 5.1.1(i) | Privacy policy URL in metadata | DANIEL | **The site has no standalone policy URL.** `/privacy` and `/terms` return 404; the policy only exists as a modal. Publish e.g. `https://shakeviewer.com/privacy` and `/terms` (static pages) and enter the URL in App Store Connect. The web policy also still mentions GA4 and Google sign-in, so it should say what differs for the iOS app. |
| 5.1.1(ii)/(iv) | Consent & permissions | OK | Location is requested only when the user taps "Show my location" (when-in-use only). Denial is respected and nothing pans before authorization (UI tests testA/testB). The app is fully usable without location or an account. |
| 5.1.1(v) | Account deletion | FIXED | Settings → Account → Delete account: password re-authentication, a confirmation dialog, then deletion of `users/{uid}/bookmarks/*` and `users/{uid}/searchHistory/*` (paged ≤400/batch), `users/{uid}` and the Firebase Auth user. `requiresRecentLogin` and wrong-password errors are handled. It mirrors the site's `deleteAccount()`. Untested on a live backend (no plist in this build). |
| 5.1.1(x) | Optional personal info | OK | Name is optional; an account is optional. |
| 5.1.2 / ATT | Tracking | N/A | No tracking, ads, analytics or IDFA. `NSPrivacyTracking=false`. No ATT prompt needed. |
| 5.1.5 | Location purpose string | FIXED | "ShakeViewer uses your location only while you use the app, to center the map on you and show how far away earthquakes are. Your location stays on your device." No Always/background keys. |
| 5.2.2 | Third-party data terms | OK/DANIEL | USGS data is public domain; EMSC is credited, with a link. About lists the USGS, EMSC, PB2002 (Bird 2003) and Apple Maps attributions, and a no-affiliation note. Apple's "Legal" link stays visible on the map. Daniel: confirm EMSC/seismicportal's terms allow app use (attribution requested). |
| 5.1.1 | Terms of Use | FIXED | Settings → Terms of Use, plus links from the sign-up form. The acceptance version (`2026-02-16`) is written to Firestore exactly like the site. |

## Privacy manifest, SDKs, Info.plist

| Item | Status | Notes |
|------|--------|-------|
| `PrivacyInfo.xcprivacy` (app) | FIXED | `ShakeViewer/Resources/PrivacyInfo.xcprivacy`, present at the root of the Release `.app`, lint OK. Tracking: false, no tracking domains. Collected (linked, not tracking, App Functionality): Email Address, Name, User ID, Other User Content. Required-reason APIs: **UserDefaults → CA92.1**. |
| File timestamp / boot time / disk space / keyboard APIs | N/A | Not used by app code (checked: no `modificationDate`, `creationDate`, `systemUptime`, `mach_absolute_time`, volume capacity, `activeInputModes`). The benchmark's `sysctl(KERN_PROC)` is DEBUG-only and isn't a listed category. |
| Third-party SDK manifests/signatures | OK | Firebase 12.19.2 via SwiftPM ships its own manifests. Verified in the Release bundle: FirebaseCore, CoreInternal, CoreExtension, Auth, Firestore, FirestoreInternal, gRPC/grpcpp, BoringSSL wrapper, leveldb, nanopb, GoogleUtilities, GTMSessionFetcher. Xcode signs SPM binaries and Apple validates signatures at upload. |
| Firebase SDK version | FIXED | It was pinned `from: 11.0.0` (stayed on 11.x). Now `from: 12.19.2` (latest 12.x, Sep 17 2026). **13.0.0 (Oct 7 2026) is out** but needs SwiftPM package *traits* (`Firestore` trait) that XcodeGen can't set yet, and failed to build. Move to 13 when XcodeGen supports traits, or enable the trait in Xcode's Package Dependencies tab. No public CVEs were found for the Firebase Apple SDK in this check. |
| `ITSAppUsesNonExemptEncryption` | FIXED | `NO`. The app uses only HTTPS via Apple's OS crypto and Firebase TLS, which qualifies for the exemption. Answer "No" (exempt) in App Store Connect too. |
| Launch screen | OK | `UILaunchScreen` (generated). |
| App icon | OK | Single 1024×1024 RGB (no alpha) universal icon; Xcode derives all sizes. |
| Category | FIXED | `LSApplicationCategoryType = public.app-category.weather` (pick Weather or Reference in ASC). |
| Accessibility | OK/partial | VoiceOver labels on map controls ("Fault lines (plate boundaries)", "Show my location"), legal headings marked as headers, Dynamic Type text styles throughout, no colour-only meaning (tiers have labels). Not audited: a full VoiceOver pass and the largest accessibility text sizes on the map overlays — worth one manual pass. |

## Security review

| Item | Status | Notes |
|------|--------|-------|
| ATS exceptions | OK | None. There's no `NSAppTransportSecurity` key in the built Info.plist and every endpoint is `https://` (USGS, EMSC, shakeviewer.com, Firebase). Upstream `http://` links are now upgraded to https or dropped. |
| External URL opening | FIXED | `SafeLinks.external`: https only, no userinfo, hosts limited to shakeviewer.com, usgs.gov, seismicportal.eu, emsc-csem.org and apple.com (incl. subdomains), max 2048 chars. Applied to feed URLs, Firestore bookmark URLs and the detail-sheet "open source" button. |
| Deep links `?quake=` | FIXED | `handle(url:)` accepts only `https://shakeviewer.com` / `www.` or the `shakeviewer://` scheme. The id must match `[A-Za-z0-9_.-]{1,80}` and is matched only against loaded quakes, never used to build requests. Note: no URL scheme or Associated Domains are registered yet, so deep links can't reach the app today. If added, the validation is already in place. |
| API response robustness / DoS | FIXED | 30 MB response cap (USGS/EMSC/PB2002). Lossy GeoJSON decoding: one bad feature is skipped instead of failing the feed; max 10,000 features. Coordinates must be finite and in range; magnitude is clamped to −2…10 and depth to −20…1000 km; text is trimmed to 300 chars. Feature ids are sanitized. Custom searches are still capped at `limit=2500` per source; the map shows at most 2,000 markers. |
| Firestore input validation | FIXED | Bookmarks and history read back from Firestore get the same id/coordinate/magnitude/text/URL validation, and malformed docs are skipped. |
| Secrets | FIXED/OK | No `GoogleService-Info.plist` in the source tree. `.gitignore` now ignores `GoogleService-Info.plist` (any path), plus `build/` and perf traces. The Firebase web/iOS API keys are public by design; protection comes from Security Rules and, optionally, App Check. |
| Auth token storage | OK | Firebase Auth keeps tokens in the iOS Keychain. The app never stores the password. |
| PII in logs | OK | No `print`/`NSLog` in app code. The only `Logger` calls are in Bench (DEBUG-only) and log just counts. Auth errors shown to the user don't echo the email. |
| Firestore Security Rules | FIXED (deployed 2026-10-14) | Owner-only rules are deployed. Probes passed: the owner can read and write their own data; other users and signed-out requests are denied (403); writing an unknown field is denied. Both the app and the website were checked end-to-end against the live rules: sign-up, bookmark, then delete account. |
| App Check | DANIEL (optional) | Consider Firebase App Check (App Attest) to stop scripted abuse of the Firestore/Auth endpoints. |

### Deployed `firestore.rules` (2026-10-14)

Deployed with `firebase deploy --only firestore:rules` (Daniel approved this; no other deploys). Source: `firestore.rules` in this repo and in `/workspace/shakeviewer/work/firestore.rules`. It is owner-only and covers everything the website and app use: `users/{uid}` (photoURL plus the consent fields), `bookmarks` and `searchHistory`. Field and size validation is in place and everything else is denied.

## What Daniel must do himself (App Store Connect / accounts)

1. **Apple Developer Program: already a paid member** (since Feb 2026; Apple ID daniel.schaefer1226@icloud.com, team 24PMG59X3P). The earlier signing error came from an outdated program agreement, not a free account. Keep the latest agreements accepted in the developer account / App Store Connect (Agreements, Tax, and Banking), then archive and upload with team 24PMG59X3P.
2. **Create the app record** for `com.shakeviewer.app` (name ≤30 chars, e.g. "ShakeViewer – Earthquake Map"), primary category Weather (or Reference).
3. **Privacy Policy URL**: publish standalone `/privacy` and `/terms` pages on shakeviewer.com (they're currently 404) and enter the privacy URL.
4. **Support URL** with contact info (Guideline 1.5), e.g. a `/support` page or mailto.
5. **App Privacy ("nutrition label") answers:**
   - Do you collect data? **Yes.**
   - Contact Info → **Email Address**: App Functionality; linked to user: Yes; tracking: No.
   - Contact Info → **Name**: App Functionality; linked: Yes; tracking: No (optional display name).
   - Identifiers → **User ID**: App Functionality; linked: Yes; tracking: No.
   - User Content → **Other User Content** (bookmarks, saved searches): App Functionality; linked: Yes; tracking: No.
   - **Location: not collected.** It's used on device only and never sent off the device. Apple counts data as "collected" only when it's transmitted off device.
   - No Usage Data, Diagnostics, Identifiers for advertising, or Purchases. Tracking: **No**.
6. **Age rating questionnaire**: no objectional content, no UGC visible to other users, no web browsing. It should come out at **4+** (answer "None" throughout). Natural-disaster information isn't a restricted content category.
7. **Export compliance**: "Uses encryption? → Yes, only exempt (standard HTTPS)". The Info.plist key already answers this.
8. **Screenshots**: 6.9" iPhone (1320×2868 or 1290×2796) and, since the app is universal, 13" iPad. They must show the app in use (map, list, detail), not a login screen. The simulator screens in `screens/` are a starting point but aren't at final sizes.
9. **Review notes**: explain that accounts are optional and give a **demo account** (email/password). Mention location is optional, the data sources (USGS/EMSC), and that the app is not an alert service.
10. **Bundle `GoogleService-Info.plist`** locally (never commit it) for the submission build, and verify sign-up, sync and **Delete account** end-to-end on a device.
11. ~~Firestore rules~~: done. Owner-only rules were deployed on 2026-10-14 and verified.
12. Optional: Firebase **App Check**; move to Firebase 13 once traits are supported in your project tooling.

## Verification done

- Simulator (iPhone 16e): all **6 UI tests pass**, 5 in one run plus testB_DeniedNeverPans re-run after a permission reset as usual (it needs a fresh permission state). The tests are testDrawAreaAndSearch, testMiniMapOpensFullMap, testA/B/C location & fault lines, and the new `LegalUITests.testPrivacyTermsAboutReachable`.
- The Release device build (team 24PMG59X3P) succeeded with **no Swift warnings in app code**, was installed on the iPhone 15 Pro Max and launched. The bundle contains `PrivacyInfo.xcprivacy` (lint OK), `ITSAppUsesNonExemptEncryption=false`, the iPad orientations and the new location string, and has no ATS key.
- Screens: `screens/50-settings-legal.png`, `51-privacy-policy.png`, `52-about.png`.

## Not verified / limits

- Account deletion, the Firestore paths and the rules were tested end-to-end against live Firebase on 2026-10-14, with throwaway accounts that were then deleted.
- iPad layout wasn't run.
- No full VoiceOver audit.
- Firebase CVE check was a web search only, no SCA tool.


## Update 2026-10-14 18:05 PT
Static pages added to the website source: https://shakeviewer.com/privacy, /terms, /support (clean URLs via `_redirects` + netlify.toml). They're **not deployed yet** (Daniel deploys). Contact/support email: **danieltheprompter@gmail.com** (mailto link on all three pages). The app now links to /support and /privacy (Settings → About, About → Contact, Privacy Policy, Terms). Use https://shakeviewer.com/privacy as the App Store Connect Privacy Policy URL and https://shakeviewer.com/support as the Support URL.


## v1.0 submission prep (2026-10-14)

- **Pricing:** free v1.0 with no IAP. Version 1.0, build 1.
- **App icon:** new seismograph icon (cyan on dark).
- **Launch screen:** branded, with a dark background and the logo.
- **iPad lists:** limited to a readable width.
- **Release build:** debug hooks are compiled out (`#if DEBUG`), including `-svNoAutofill`.
- **Listing:** text, privacy label and review notes are in `appstore/LISTING.md`; screenshots are in `appstore/screenshots/`.
