# ShakeViewer Pro: monetization plan (PLAN ONLY)

Status: proposal, 2026-10-14. No code, no deploys, no App Store Connect actions taken.
Decision: Free + Pro subscription (iOS first, web entitlement later).

## 1. Competitor scan (US App Store, checked 2026-10-14)

| App | Model | Price (US) | What's paid |
|---|---|---|---|
| **Earthquake+ Alerts & Tracker** ([App Store](https://apps.apple.com/us/app/earthquake-alerts-tracker/id395928613)) | Free + ads + subscription | **$2.49/mo, $19.49/yr**; legacy IAPs Ad Free $2.99, Bonus Pack $2.99 | Ad removal, advanced alert filters and sounds, 3D view, ShakeMap, ash clouds, animations. **Free tier:** alerts for up to 20 locations, tsunami warnings, widgets. |
| **QuakeFeed** ([App Store](https://apps.apple.com/us/app/quakefeed-earthquake-alerts/id403037266), [terms](https://quakefeed.com/subscription-terms/)) | Free + ads + subscription | **$6.99/yr** (30-day free trial on annual) or $2.99/quarter; legacy "Custom Notifications" $1.99 | Ad removal, MMI contours, history back to 1900, premium basemaps, volcanoes, hurricanes, wildfires and smoke. **Free tier:** nearby and regional alerts, fault lines, filters. |
| **Volcanoes & Earthquakes** ([App Store](https://apps.apple.com/us/app/volcanoes-earthquakes/id1449389566)) | Free + IAP | Pro (lifetime) **$9.99**; push notifications **$0.99/mo or $9.99/yr** | Push alerts are paid separately. |
| **My Earthquake Alerts Pro** ([App Store](https://apps.apple.com/us/app/my-earthquake-alerts-pro/id975770717)) | Paid app (free ad-supported twin) | **$2.99 one-time** | No ads, Apple Watch. Alerts are free in both editions. |
| **MyShake** (UC Berkeley, [App Store](https://apps.apple.com/us/app/myshake-earthquake-alerts/id1467058529)) | Free, no ads | $0 | ShakeAlert early warning (CA/OR/WA). |
| **LastQuake** (EMSC, [App Store](https://apps.apple.com/us/app/lastquake/id890799748)) | Free, no ads | $0 | Nonprofit, foundation-funded. |

Takeaways:
- **Basic alerts are table stakes.** Market leaders give basic nearby and regional alerts away free, and the official apps (MyShake, LastQuake) are entirely free.
- **People pay for depth.** Paid features are richer alerts (multiple regions, advanced filters, sounds), data depth (history, intensity maps), extra layers, and no ads.
- **Price ceiling is low.** Comparable apps charge about $7–20/yr. A third-party estimate (Adapty, 2024) put Earthquake+ at roughly $6K/month in revenue from about 10K downloads/month, a useful ceiling-ish benchmark.

## 2. Free vs Pro split

**Principle:** anything that helps someone stay safe stays free. Pro sells convenience, depth and personalization. Never paywall a warning.

| Feature | Free | Pro |
|---|---|---|
| Live map and list (USGS + EMSC), event detail, fault lines, distance from you | ✅ | ✅ |
| Safety links (USGS event page, tsunami.gov, PAGER), disclaimer, Learn content | ✅ | ✅ |
| **Basic push alert:** 1 location (current or home), fixed significant threshold (e.g. M5.0+ within 300 km, or M6.5+ anywhere) | ✅ | ✅ |
| Custom alerts: magnitude/radius sliders, up to 10 regions/places, quiet hours, critical-only sounds | — | ✅ |
| Home/Lock Screen widgets | 1 basic widget (latest nearby) | all sizes plus configurable widgets |
| Bookmarks and search history synced | 25 bookmarks / 20 searches | unlimited, plus notes and export (CSV/GeoJSON) |
| Advanced filters (depth, source, time ranges beyond 30 days) and stats (b-value charts, aftershock sequences, regional summaries) | basic | ✅ |
| Live Activity / Dynamic Island for an ongoing sequence (aftershock watch) | — | ✅ (phase 3) |
| Apple Watch complication and alerts | — | ✅ (later) |
| Ads | **none** (recommend never adding them; this is the differentiator) | none |

### App Review and ethics
- **Disclaimer everywhere it matters.** Keep the existing "not an early warning system" disclaimer on the paywall, in the alert settings, in the App Store description, and in push-alert onboarding. Alerts are sent after agencies publish an event, typically 1–10+ minutes after it happens (§5). Never imply a warning before shaking. For early warning, point users to MyShake and the OS Wireless Emergency Alerts.
- **Don't market fear.** Avoid "Don't get caught unprepared — go Pro" style copy, which Apple can reject and which is bad ethics. Frame Pro as "tailor your alerts and dig deeper".
- **Disaster-time access.** Optionally, unlock Pro alert configuration for free during declared major events. That's goodwill, and it also defuses the "paywalled safety" criticism.
- **Guideline 3.1.2 (auto-renewable subscriptions).** The paywall must show the title, duration and price (with per-month price where it helps), plus working links to the Privacy Policy and Terms/EULA. The App Store metadata needs the same links.
- **Guideline 5.1.** Location for alerts must be opt-in, minimal and explained (§5).

## 3. Pricing

**Recommendation:**
- **Pro Monthly $1.99** and **Pro Annual $14.99** (about 37% off, "$1.25/mo").
- **1-week free trial on annual only**, as an introductory offer.
- Family Sharing on.
- **Launch pricing:** consider $9.99/yr for the first cohort (a "Founding supporter" intro offer for year one). This sits between QuakeFeed ($6.99) and Earthquake+ ($19.49) and is justified by no ads plus the richer alerts.
- **Optional Lifetime $39.99** as a non-consumable. Users of the comparable apps clearly like one-time purchases (My Earthquake Alerts Pro, Volcanoes & Earthquakes). This can be added later.

**Apple Small Business Program:** proceeds under $1M/yr qualify for a **15% commission instead of 30%**. Daniel enrolls once (§7). Subscriptions already drop to 15% after a subscriber's first year, but enrolling makes it 15% from day one.

### Illustrative revenue math (assumptions, not forecasts)

Assumptions:
- 3,000 installs/month after launch.
- 3% of monthly active installs convert to Pro.
- Plan mix: 70% annual / 30% monthly.
- Taxes ignored.
- Net per subscriber per month after 15%:
  - annual: $14.99 × 0.85 / 12 ≈ **$1.06/mo**
  - monthly: $1.99 × 0.85 ≈ **$1.69/mo**
  - blended ≈ **$1.25/mo**

| Scenario | Active Pro subs after 12 months | Net per month | Net per year (run-rate) |
|---|---|---|---|
| Low (1.5% conversion, 1k installs/mo, high churn) | ~150 | ~$190 | ~$2.2K |
| Mid (3%, 3k/mo) | ~900 | ~$1.1K | ~$13K |
| High (5%, 10k/mo, a big-quake news spike) | ~4,500 | ~$5.6K | ~$67K |

Costs to subtract: Apple Developer $99/yr; Firebase and push backend about $0–30/mo at these scales (§5); RevenueCat free under $2.5K/mo tracked revenue (§4). Earthquake apps get huge spikes after major quakes, so plan the backend and paywall for bursts.

## 4. Implementation architecture (iOS)

**StoreKit 2, native (recommended first):**
- **Products:** one subscription group, "ShakeViewer Pro", with `pro.monthly` and `pro.annual` (plus optional `pro.lifetime` non-consumable).
- **Paywall:** `SubscriptionStoreView(groupID:)` (iOS 17+, already our minimum). It renders compliant price/duration copy, handles purchase and the trial badge, and accepts `.subscriptionStorePolicyDestination` for the Terms/Privacy links (we already host /terms and /privacy). Add `.storeButton(.visible, for: .restorePurchases)`.
- **Entitlement:**
  - An `EntitlementStore` (`@Observable`) recomputes from `Transaction.currentEntitlements` at launch.
  - It listens to `Transaction.updates` for renewals, refunds, Ask to Buy and purchases made on other devices.
  - Each transaction is verified (`VerificationResult.verified`), and `revocationDate`/`expirationDate` are checked.
  - The entitlement state is cached in UserDefaults only as a UI hint, never as the source of truth.
- **Restore:** `AppStore.sync()` behind a "Restore Purchases" button (required). StoreKit 2 normally restores automatically.
- **Manage:** `.manageSubscriptionsSheet` plus `.refundRequestSheet` in Settings.
- **Accounts:** a purchase must not require sign-in (Guideline 5.1.1). Sign-in is only needed to sync Pro to the web.

**Entitlement sync to Firestore (for web Pro later):**
- **Tie the purchase to the user.** On purchase, set `appAccountToken = UUID(firebaseUID-derived)` on the purchase so App Store transactions map back to the user.
- **Server, not client, decides Pro.** A Cloud Function `verifyPurchase` (HTTPS callable) receives the signed transaction JWS. It verifies it with Apple's App Store Server Library (Node) and writes `entitlements/{uid}` = `{pro: true, productId, expiresAt, environment}`. This doc is **server-write-only**: the client can only read its own (a rules change, deployed later with approval).
- **App Store Server Notifications V2** go to a Cloud Function HTTPS endpoint (DID_RENEW, EXPIRED, REFUND, REVOKE, DID_CHANGE_RENEWAL_STATUS…) and keep `entitlements/{uid}` current without the app being open.
- **Web** reads `entitlements/{uid}`. The web can't sell iOS-billed subs; adding Stripe on the web later means unifying both stores' purchases into the same doc.

**RevenueCat vs. DIY:**

| | StoreKit 2 DIY | RevenueCat |
|---|---|---|
| Cost | $0 | Free up to $2.5K monthly tracked revenue, then 1% |
| Server verification and webhooks | You build two Cloud Functions | Built in, plus a Firebase extension that syncs to Firestore |
| Web/Stripe and Android later | Build it yourself | Unified entitlements across stores |
| Analytics, paywall A/B tests | Minimal (App Store Connect only) | Charts, experiments |
| Lock-in and privacy | None | Third-party SDK; must be disclosed in the privacy policy and label |

Recommendation: **StoreKit 2 natively for the iOS MVP** (small surface, no extra processor). Re-evaluate RevenueCat when adding web/Stripe or Android.

**Testing:**
- **Local:** a StoreKit Configuration file (`Products.storekit`) for Xcode/simulator runs, and StoreKitTest (`SKTestSession`) in unit and UI tests for purchase, expire, refund and renewal-speedup.
- **Sandbox:** a Sandbox Apple ID on the iPhone.
- **TestFlight:** subscriptions renew on an accelerated schedule.
- **Server:** point Server Notifications at a sandbox URL first.

**App Store Connect and legal items (Daniel):**
- Paid Apps Agreement, banking, and tax forms (W-9).
- Small Business Program enrollment.
- A subscription group, two products with localized names and descriptions, and an intro offer.
- A **review screenshot of the paywall** for each product.
- The products get submitted together with the app version.
- Privacy Policy URL, and either Apple's standard EULA linked in the description or a custom EULA.
- Paywall copy following Guideline 3.1.2.
- **Privacy label updates:** Purchases (linked to user if account sync is on). If alerts ship: Coarse Location (App Functionality, linked) and Device ID / push token (App Functionality).
- Update `PrivacyInfo.xcprivacy`, /privacy and /terms (subscription terms, auto-renewal, cancellation, refunds via Apple).

## 5. Push-alerts backend (Firebase)

**Flow:**
1. **Scheduled function** (`onSchedule('every 1 minutes')`) polls the USGS GeoJSON feed `all_hour` (updated about every minute) and the EMSC FDSN/WebSocket feed. (Later option: a long-lived consumer of EMSC's real-time WebSocket on Cloud Run for lower latency.)
2. **Dedupe:**
   - Key by `source:id` and keep the latest `updated` per event in a `quakes_seen/{id}` doc with a TTL policy (about 7 days).
   - Cross-source duplicates (USGS vs EMSC) are matched within ~60 s / 100 km / ±0.5 M, preferring USGS in the US.
   - A **magnitude revision** re-triggers only if it crosses a user's threshold upward.
3. **Match users:**
   - Alert prefs live at `users/{uid}/alertPrefs/{id}` = `{geohash5 or region polygon, radiusKm, minMag, quietHours}`, alongside a `pushTokens/{token}` subcollection.
   - **Privacy:** store location **coarsely**. A 5-character geohash is about ±2.4 km, or snap to a 0.1° grid (~11 km). Update only on significant-change location. Never store a history, only the latest cell.
   - Query by geohash prefix ranges for the event's neighbourhood (geofire-common), then filter by distance and magnitude in the function.
   - **Free tier alternative with zero location storage:** subscribe the device to **FCM topics** like `cell_<grid>_m5`. The server then publishes per cell and never stores the user's location at all. Recommend this for the free alert, and Firestore prefs only for Pro custom regions.
4. **Send:**
   - Via **FCM to APNs** (Firebase Messaging iOS SDK plus an APNs auth key uploaded to Firebase), using `sendEach` in batches of 500.
   - Large events: send to topics.
   - Use `interruption-level: time-sensitive`. That needs the Time Sensitive entitlement; **don't** use Critical Alerts unless Apple grants them, and it won't for this use case.
   - Collapse IDs per event, so magnitude updates replace rather than stack notifications.
5. **Policy and privacy:**
   - Update /privacy: what's stored (coarse cell, prefs, push token), why, retention, and that deleting the account deletes it. The app's deleteAccount must also delete alertPrefs and pushTokens.
   - Add an in-app "Alerts are informational, not early warnings" acknowledgment before enabling.

**Plan and costs:**
- Scheduled functions require the **Blaze (pay-as-you-go) plan**.
- Cloud Scheduler gives 3 free jobs per billing account, then $0.10/job/month.
- Cloud Functions' free tier is 2M invocations/month plus compute; a 1-minute poll is about 43,200 invocations/month, well inside it.
- Firestore reads for matching are small with geohash queries. FCM is free.
- **Estimate:** about **$0–5/month** at under 10K users, and about $10–30/month at 100K users. The main costs would be Firestore reads during big swarms and function compute.
- Set a **budget alert** (e.g. $25) on the billing account.

**Latency:** USGS typically publishes 2–20 minutes after origin (faster for the US, slower worldwide), EMSC often 2–10 minutes. Add up to 60 s polling plus a few seconds for FCM/APNs. Expect **≈3–20 minutes after origin**. That's useful for "what was that?", but **not early warning**, and the copy must say so.

## 6. Phased roadmap (effort for one developer, rough)

| Phase | Scope | Effort |
|---|---|---|
| 0. Prep | Daniel's ASC items (§7); Products.storekit; paywall copy; update /terms and /privacy | 1–2 days (plus Apple's agreement processing) |
| 1. Pro MVP (iOS) | StoreKit 2 EntitlementStore, SubscriptionStoreView paywall, restore/manage, gate the Pro features: unlimited bookmarks/history plus export, advanced filters and stats screen, Pro widgets (WidgetKit extension); StoreKitTest UI tests | 1.5–2.5 weeks |
| 2. Alerts | Blaze plan, scheduled poller plus dedupe, FCM/APNs, free topic alert, Pro custom regions in Firestore, settings UI, account-deletion coverage, rules update (approval needed), privacy label | 2–3 weeks |
| 3. Server entitlements and web | verifyPurchase plus Server Notifications V2 functions, `entitlements/{uid}`, web reads Pro; Live Activities for aftershock watch | 1–2 weeks |
| 4. Later | Apple Watch app and complications; web Stripe checkout (or RevenueCat); Android | 2–4+ weeks each |

Ship Phase 1 first. The paywall can launch with the data/convenience Pro features, and alerts arrive in a free update that makes Pro more valuable.

## 7. Only Daniel can do

1. **Business agreements:**
   - Accept the **Paid Apps Agreement**.
   - Enter **banking** and **tax** info in App Store Connect (Business).
   - Enroll in the **App Store Small Business Program**.
2. **Products:** in App Store Connect, create the subscription group and products (IDs above) with prices, the intro offer, localizations and review screenshots, and submit them with the app version.
3. **Pricing and copy:**
   - Choose final prices, the trial length and the lifetime option.
   - Approve the free/Pro split and the "safety stays free" principle.
4. **Legal pages:** approve the /terms and /privacy changes (subscription terms, alerts data) and pick the standard Apple EULA or a custom one.
5. **Firebase:**
   - Upgrade to the **Blaze plan** and set a budget alert.
   - Create and upload an **APNs auth key** (.p8) in the Apple Developer account.
   - Enable Push Notifications / Time Sensitive capabilities on the App ID.
6. **Server Notifications:** configure the **App Store Server Notifications V2 URL** and generate an **App Store Connect API in-app purchase key** (for the server library).
7. **Testing:** create a **Sandbox tester** account.
8. **Deploy approvals:** approve each future deploy (Functions, rules changes).
