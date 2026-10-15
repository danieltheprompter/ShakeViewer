# GoogleService-Info.plist goes here → `ShakeViewer/Resources/GoogleService-Info.plist`

This repo intentionally contains NO Firebase keys. The app builds and runs without the file
(accounts/cloud bookmarks are simply disabled). To enable them:

1. Firebase console → project **shakeviewer-5f151** → Project settings → General → *Your apps* → **Add app → iOS**.
2. Apple bundle ID: `com.shakeviewer.app` (nickname e.g. "ShakeViewer iOS"). App Store ID optional.
3. Download **GoogleService-Info.plist** and save it as `ShakeViewer/Resources/GoogleService-Info.plist`.
4. Re-run `xcodegen generate` (so the new file is added to the target) and build.
5. Console → Authentication → Sign-in method: Email/Password is already on for the web app; nothing else needed for v1.
