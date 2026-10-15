# ShakeViewer web → iOS feature inventory

Source: `shakeviewer/work/public/index.html` (single-file React 18 + Leaflet 1.9.4 + Babel standalone, Firebase compat SDK 10.12.0).
Status column: ✅ ported in iOS v1 · 🟡 partial · ❌ not yet.

## 1. Data feeds
| Feed | URL | When | iOS |
|---|---|---|---|
| USGS summary 24h | `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson` | range = day | ✅ |
| USGS summary 7d | `…/summary/2.5_week.geojson` | range = week | ✅ |
| USGS summary 30d | `…/summary/4.5_month.geojson` | range = month | ✅ |
| EMSC recent | `https://www.seismicportal.eu/fdsnws/event/1/query?format=json&starttime=<now-24h/168h/720h ISO>&limit=2500&minmag=<2.5/3.5/4.5>` | alongside USGS | ✅ |
| USGS FDSN custom | `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=YYYY-MM-DD&endtime=YYYY-MM-DDT23:59:59&minmagnitude=M[&minlatitude..maxlongitude]&limit=2500&orderby=time` | range = custom | ✅ |
| EMSC FDSN custom | `https://www.seismicportal.eu/fdsnws/event/1/query?format=json&starttime=…T00:00:00&endtime=…T23:59:59&minmag=M[&minlat..maxlon]&limit=2500` | range = custom | ✅ |
| Plate boundaries | `/data/PB2002_boundaries.json` (local GeoJSON) | "Plate boundaries" toggle | ❌ |

- Both sources fetched in parallel (`Promise.allSettled`); either may fail. Error only if merged result is empty.
- **Merge/dedup**: key = `round(time/120000)_round(lat*2)_round(lng*2)` (2-min, 0.5° buckets). USGS inserted first and wins; EMSC skipped on collision. EMSC ids prefixed `emsc_`. ✅ (incl. JS rounding semantics)
- Normalized fields: `id, mag, place (title-cased), time(ms), felt, tsunami, url, geometry[lng,lat,depth], source USGS|EMSC`. EMSC place = `flynn_region`/`region`; EMSC url = `seismicportal.eu/eventdetails.html?unid=…`. ✅ (title-case port incl. state codes/compass points)
- **Auto refresh**: every 60 s for day, 300 s for week/month; none for custom. ✅
- Manual refresh button. ✅ (+ pull-to-refresh on list)

## 2. Filters / controls (client-side on fetched data)
| Control | Values | iOS |
|---|---|---|
| Time range | `day` / `week` / `month` / `custom` (default day) | ✅ segmented |
| Min magnitude | slider 2.5–9.0 step 0.1 (default 2.5) | ✅ |
| Depth | all / shallow `<70` / intermediate `70–<300` / deep `≥300` km | ✅ |
| Sort | time / magnitude; tapping active sort flips asc/desc (default time desc) | ✅ |
| Near me | toggle + radius 100–2000 km step 50 (default 500), haversine; geolocation persisted in `localStorage.shakeviewer_my_location` | ✅ (CoreLocation, UserDefaults) |
| Map style | dark (Carto dark) / light (Carto light) / satellite (Esri) | 🟡 MapKit standard / muted / hybrid |
| Plate boundaries overlay | toggle | ❌ |
| Custom search | start/end date (default yesterday→today), min mag slider 1.0–9.0 (default 4.0), optional **drawn rectangle bounds** (Draw search area → drag on map; redraw; Clear boundary; reset ↻), limit 2,500/source | ✅ Search sheet + MapKit draw mode (drag rectangle, or "Use visible area"), red dashed rectangle with draggable corner handles, limit-reached warning |
| Search history | last 10 custom searches in `localStorage.shakeviewer_search_history`; re-run; clear; "cloud" tab + import local→cloud when signed in | ✅ Local/Cloud tabs (Firestore live read-back), Save to cloud, Clear, "Global/Bounded" tags |

## 3. Views
- **Map** (Leaflet): circle markers coloured by magnitude, size by magnitude; popup (mag, place, time, depth, felt); selected-quake fly-to; user location; near-me radius circle; legend. → ✅ MapKit `Map` with `Annotation`s, selection, legend overlay, near-me `MapCircle`, locate button.
- **Legend / colours** (`getMagnitudeHex`): `<3.5 #22c55e Minor`, `3.5–4.5 #eab308 Moderate`, `4.5–6.0 #f97316 Strong`, `≥6.0 #ef4444 Major`. ✅ identical.
- **List** (panel / mobile bottom sheet): row = mag badge, place, relative time, depth, felt count, source; "N results". ✅ (+ swipe to bookmark)
- **Details**: mag + tier, place, time, source chip, tsunami-watch chip, depth, felt reports, coordinates, distance from you, bookmark, share/copy link (`?quake=<id>`), open USGS/EMSC event page. → ✅ native sheet with `presentationDetents([.fraction(0.4), .large])`, ShareLink, mini-map.
- **Stats panel**: magnitude histogram (7 buckets <3…8+) and depth buckets. ❌
- Mobile/desktop layouts, bottom-sheet snap points, list/map view toggle. → ✅ TabView (Map / List / Bookmarks / Settings).
- Light/dark toggle (`isDark`). ✅ System/Light/Dark setting.
- Deep link `?quake=<id>` selects a quake on load. 🟡 `onOpenURL` handler present; needs Associated Domains/universal links to actually receive shakeviewer.com URLs.
- Persisted selection `sv_selected`. ❌ (not needed on iOS)
- Toasts. ❌ (native feedback instead)
- i18n: en / es / pt / ja (`sv_lang`). ❌ English only in v1.
- About / FAQ / magnitude scale / safety tips, Privacy Policy, Terms modals. 🟡 short About + magnitude scale + disclaimer in Settings; full texts not ported.
- "Tweaks" dev panel. ❌ (dev-only)

## 4. Bookmarks
- Signed out: `localStorage.shakeviewer_bookmarks` (id `local_<quakeId>`). Signed in: Firestore `users/{uid}/bookmarks`. ✅ both (UserDefaults locally).
- Fields: `quakeId, mag, place, time, lat, lng, depth, source, felt, url, note, timestamp(serverTimestamp)`. ✅ same schema so web and iOS share data.
- Bookmark notes (edit note text) in bookmarks modal. 🟡 notes displayed, not editable.

## 5. Firebase — exactly what is used
Config (web app, public in page source): project `shakeviewer-5f151`, authDomain `shakeviewer-5f151.firebaseapp.com`, storageBucket `shakeviewer-5f151.firebasestorage.app`, web appId/measurementId (Analytics SDK is **not** loaded). iOS needs its own `GoogleService-Info.plist`.

**Auth** (`firebase-auth-compat`):
| Feature | iOS |
|---|---|
| Email/password sign-in, sign-up (+ displayName) | ✅ |
| Google sign-in (`signInWithPopup(GoogleAuthProvider)`) | ❌ needs GoogleSignIn-iOS SDK + URL scheme |
| Password reset email | ✅ |
| Sign out | ✅ |
| Change password (reauth with EmailAuthProvider) | ❌ |
| Delete account (reauth, batch-delete `searchHistory` + `bookmarks` + user doc, then `user.delete()`) | ❌ (note: App Store requires in-app deletion if account creation is offered — must add before release) |
| Profile: edit display name, avatar (data-URI stored in `users/{uid}.photoURL`) | ❌ |

**Firestore** (`firebase-firestore-compat`):
- `users/{uid}` — `photoURL`, `termsAcceptedAt`, `termsVersion` (`2026-02-16`), `privacyPolicyAcceptedAt`, `privacyPolicyVersion` (written on sign-up with merge). ✅ consent fields on sign-up.
- `users/{uid}/bookmarks/{autoId}` — schema above; realtime `onSnapshot` ordered by `timestamp desc`. ✅
- `users/{uid}/searchHistory/{autoId}` — `startDate, endDate, minMag, bounds{minLat,maxLat,minLon,maxLon}|null, timestamp`. ✅ write; ✅ read-back (Cloud tab, newest 10).

**Conclusion**: Firebase is **not** needed to view quakes — only accounts and cloud sync. iOS app makes it optional: SDK is linked via SPM, but `FirebaseApp.configure()` runs only if `GoogleService-Info.plist` is in the bundle.
