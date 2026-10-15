# ShakeViewer for iOS (v1)

Native SwiftUI port of [shakeviewer.com](https://shakeviewer.com). Swift 6 (strict concurrency), iOS 17+, MapKit, optional Firebase.
Bundle id `com.shakeviewer.app`. See **FEATURES.md** for the web→iOS feature inventory.

## Build & run (Mac with Xcode 26.2)
```bash
brew install xcodegen
cd shakeviewer-ios
xcodegen generate                 # creates ShakeViewer.xcodeproj from project.yml
open ShakeViewer.xcodeproj
```
In Xcode: wait for Swift Package resolution (firebase-ios-sdk, first time takes a few minutes) → choose an iPhone simulator (e.g. iPhone 17) → **⌘R**.
For a real device: target ShakeViewer → Signing & Capabilities → pick your Team.

`xcodegen generate` must be re-run whenever files are added/removed or `project.yml` changes. The `.xcodeproj` is generated, not committed.

## Firebase (optional)
Quakes, map, list, filters, details and **local** bookmarks work without Firebase. Accounts (email/password) and cloud-synced bookmarks/search history — the same Firestore data the website uses — need:

1. Firebase console → project **shakeviewer-5f151** → ⚙ Project settings → *Your apps* → **Add app → iOS**, bundle id `com.shakeviewer.app`.
2. Download **`GoogleService-Info.plist`** and put it at `ShakeViewer/Resources/GoogleService-Info.plist`.
3. `xcodegen generate` again, build.

No keys are in this repo. The app checks for the plist at launch and only then calls `FirebaseApp.configure()`.
To build without the Firebase SDK at all, delete the `packages:` block and the three `- package: Firebase` dependencies from `project.yml`; the code compiles out via `#if canImport(FirebaseCore)`.

## Layout
```
project.yml                     XcodeGen spec (iOS 17, Swift 6, strict concurrency complete)
ShakeViewer/App                 @main app, appearance setting
ShakeViewer/Models              Quake, MagnitudeTier (colours), filters, Bookmark (Sendable)
ShakeViewer/Services            QuakeService (USGS+EMSC fetch & merge), LocalStore, LocationService, AccountService (Firebase)
ShakeViewer/ViewModels          QuakeViewModel (@MainActor @Observable)
ShakeViewer/Views               Map, List, Detail sheet, Filters, Bookmarks, Settings/Sign-in
ShakeViewer/Resources           Assets (AppIcon placeholder 1024px, AccentColor) [+ GoogleService-Info.plist]
```

## Notes
- App icon is a placeholder (`AppIcon-1024.png`, single-size). Replace with final artwork.
- Model/networking code was typechecked with Swift 6.0.3 on Linux (`-swift-version 6 -strict-concurrency=complete`, zero warnings) and smoke-tested against the live USGS/EMSC feeds. SwiftUI/MapKit/CoreLocation/Firebase code was not compiled (no Xcode available) — expect possible small fixes on first build.
- Rendering thousands of SwiftUI `Annotation`s (30-day / custom) can be slow; clustering or `MKMapView` is a v2 option.

## UI test (custom search with a drawn area)
```bash
TEST_RUNNER_SV_SCREENS_DIR="$PWD/screens" xcodebuild test -scheme ShakeViewer \
  -destination 'platform=iOS Simulator,name=iPhone 16e' CODE_SIGNING_ALLOWED=NO
```
`ShakeViewerUITests/CustomSearchUITests` opens Search, enters draw mode, drags a rectangle over Japan, runs the search, and saves screenshots to `screens/`.
Debug-only launch args: `-svTab`, `-svSelectFirst YES`, `-svOpenSearch YES`, `-svDraw YES`, `-svBounds "minLat,maxLat,minLon,maxLon"`, `-svStart/-svEnd yyyy-MM-dd`, `-svMinMag 4`, `-svRunSearch YES`, `-svCamera "lat,lon,meters"`.
