# ShakeViewer — App Store listing draft (v1.0, free)

## Name (30 chars max)
The App Store Connect record doesn't exist yet, so whether "ShakeViewer" is available **can't be checked until Daniel creates the record**. The name field and the bundle ID are separate, so `com.shakeviewer.app` works with any of these names.

| Choice | Name | Length |
|---|---|---|
| 1st | `ShakeViewer: Earthquake Map` | 27 chars |
| 2nd | `ShakeViewer – Quake Tracker` | 27 chars |
| 3rd | `ShakeViewer` | 11 chars |

## Subtitle (30 chars max)
`Live earthquakes, worldwide` (27). Alternate: `Real-time quake map & list` (26).

## Promotional text (170 chars max, can change without review)
Track earthquakes worldwide in real time with USGS and EMSC data. Search any date range, draw an area on the map, and explore fault lines and plate boundaries. Free.

## Description
ShakeViewer shows earthquakes happening around the world, live on a fast, clean map and list.

LIVE MAP & LIST
• Real-time earthquakes from the USGS and EMSC, merged and de-duplicated
• Last 24 hours, 7 days, or 30 days, colour-coded by magnitude
• Tap any quake for magnitude, depth, location, time, felt reports, and a mini-map
• See how far away a quake was (optional location, which stays on your device)

SEARCH THE PAST
• Custom search by date range and minimum magnitude
• Draw an area on the map to search only that region
• Recent searches are saved for quick re-runs

FAULTS & PLATES
• Toggle tectonic plate boundaries and fault lines on the map
• Satellite, hybrid and standard map styles, plus dark mode

YOURS, ACROSS DEVICES
• Bookmark earthquakes and add notes
• Optional free account syncs bookmarks and search history with shakeviewer.com
• Delete your account and data anytime, right in the app

PRIVATE BY DESIGN
• No ads. No tracking. Your location never leaves your device.

IMPORTANT
ShakeViewer is an information tool, not an earthquake early warning system. Data comes from public agencies and may be delayed, revised, or incomplete. In an emergency, follow official guidance and local authorities.

Data: U.S. Geological Survey (USGS) and the European-Mediterranean Seismological Centre (EMSC). ShakeViewer isn't affiliated with or endorsed by either agency.

## Keywords (100 chars max, comma-separated, no spaces, don't repeat name words)
`earthquake,quake,seismic,usgs,emsc,tremor,richter,magnitude,fault,tectonic,tsunami,seismograph,map`
(99 chars). Replace `tsunami` if Daniel would rather not imply tsunami alerts; the app has none. `aftershock` is a good substitute.

## Categories
- **Primary:** Weather (matches `LSApplicationCategoryType`; this is where the competing apps sit).
- **Secondary:** Reference. Education also fits, but Reference matches the "look up quakes" use better.

## URLs
- Support: https://shakeviewer.com/support
- Privacy Policy: https://shakeviewer.com/privacy
- Marketing (optional): https://shakeviewer.com
- License agreement: Apple's standard EULA. The app's own Terms are at https://shakeviewer.com/terms; mention them in the description or upload them as a custom EULA, whichever Daniel prefers.

## Copyright
`2026 Daniel Schaefer`

## Price & availability
- **Price:** Free, with no in-app purchases.
- **Availability:** all territories. One consideration: some countries (e.g. China mainland) need extra licensing for map apps, so excluding China is an option.

## Age rating questionnaire (expected result: 4+)
- **Content descriptors:** None for all of them: cartoon or realistic violence, sexual content or nudity, profanity, alcohol/tobacco/drugs, mature or suggestive themes, horror or fear, medical info, gambling, contests.
- **Unrestricted web access:** No. Links open specific https pages from an allow-list in Safari.
- **User-generated content or chat:** No (bookmark notes are private).
- **Messaging:** No.
- **Advertising:** No.
- **Parental controls / age assurance:** No.
- **Health/wellness topics:** No.

## App Privacy ("nutrition label")
**Tracking:** No (no ads SDKs, no IDFA, no third-party tracking).

**Data collected** (only when the user creates an optional account; all of it is linked to the user and used for App Functionality only):

| Data type | Why |
|---|---|
| Contact Info → Email Address | Account sign-in (Firebase Auth) |
| Contact Info → Name | Optional display name |
| Identifiers → User ID | Firebase UID |
| User Content → Other User Content | Bookmarks, notes, saved searches |

**Not collected:**
- **Location:** used only on the device, to measure distance and centre the map; never sent anywhere.
- **Also none of these:** Usage Data, Diagnostics, Purchases, Health, Financial, Contacts, Browsing History, Search History, Sensitive Info. Saved searches are user content the user explicitly saves, not a passive "Search History" log.

**Other notes:**
- Google Firebase is the processor. It's disclosed in the Privacy Policy, and Firebase SDKs ship their own privacy manifests.
- Account deletion is available in-app: Settings → Account → Delete account (Guideline 5.1.1(v)).

## App Review notes
```
ShakeViewer shows public earthquake data from USGS and EMSC. No login is required. Every
feature works without an account. An account is optional and only syncs bookmarks and
search history.

To test accounts: Settings → Sign in / Create account → Create account (any email and a
password of 6+ characters; accept the Terms). Then open a quake → Bookmark. To delete the
account: Settings → Delete account → enter the password → confirm. The account and all
Firestore data are removed.

Location is optional ("When In Use") and is used only on-device, to centre the map and show
distances. Fault lines and plate boundaries: Map → filter button → Fault lines.

The app is not an early warning system and says so in the About/Disclaimer screen and the
detail sheet. No in-app purchases. No ads or tracking.
Contact: danieltheprompter@gmail.com
```
**Demo account:** not needed (sign-up is open and accounts are optional). If Daniel wants to provide one anyway, he should create a dedicated reviewer account and add its credentials in App Store Connect only, not in this file.

## Screenshots (in `appstore/screenshots/`, RGB PNG with no alpha, 9:41 status bar, dark mode)
- **6.9" iPhone (1320×2868):** `iphone-1-map`, `-2-list`, `-3-detail`, `-4-search`, `-5-faults`
- **13" iPad (2064×2752):** `ipad-1-map`, `-2-list`, `-3-detail`, `-4-search` (drawn area plus the search form), `-5-faults`
- **Upload order:** 1 → 5. Captions or frames are optional and not included.
