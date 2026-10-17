# Generates public/{privacy,terms,support}/index.html (static, no JS required).
import os, html
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public')
EFFECTIVE = '2026-10-16'
TERMS_VERSION = '2026-02-16'
CONTACT_HTML = '<a href="mailto:danieltheprompter@gmail.com">danieltheprompter@gmail.com</a>'

CSS = r"""
:root{--bg-0:#0a0d12;--bg-1:#0f131a;--bg-2:#141922;--line:rgba(255,255,255,.08);--fg-0:#f5f7fa;--fg-1:#c9d1dc;--fg-2:#8591a3;--accent:#22d3ee;--accent-bg:rgba(34,211,238,.12);--warn:#f97316;
--font-sans:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,"Hiragino Sans","Noto Sans JP",sans-serif;color-scheme:dark}
@font-face{font-family:"Inter";font-style:normal;font-weight:400 700;font-display:swap;src:url("/fonts/inter-latin-var.woff2") format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@media (prefers-color-scheme:light){:root{--bg-0:#fafaf7;--bg-1:#ffffff;--bg-2:#f5f5f0;--line:rgba(0,0,0,.08);--fg-0:#1a1d23;--fg-1:#3a4049;--fg-2:#6b7280;--accent:#0e7490;--accent-bg:rgba(14,165,165,.10);--warn:#c2410c;color-scheme:light}}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg-0);color:var(--fg-1);font-family:var(--font-sans);font-size:16px;font-weight:400;line-height:1.65;-webkit-text-size-adjust:100%;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
a{color:var(--accent)}a:hover{text-decoration:none}
header.top{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px max(20px,env(safe-area-inset-left));background:color-mix(in srgb,var(--bg-0) 85%,transparent);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.brand{font-weight:700;font-size:20px;letter-spacing:-0.025em;color:var(--fg-0);text-decoration:none}
nav.tabs{display:flex;gap:4px;flex-wrap:wrap}nav.tabs a{color:var(--fg-2);text-decoration:none;font-size:14px;font-weight:500;padding:6px 10px;border-radius:8px}
nav.tabs a[aria-current=page]{color:var(--fg-0);background:var(--accent-bg)}
main{max-width:760px;margin:0 auto;padding:32px 20px 64px}
h1{font-weight:600;font-size:36px;line-height:1.15;letter-spacing:-0.022em;color:var(--fg-0);margin:8px 0 6px}
.meta{color:var(--fg-2);font-size:14px;margin:0 0 28px}
h2{color:var(--fg-0);font-size:20px;font-weight:600;line-height:1.3;letter-spacing:-0.012em;margin:36px 0 8px;padding-top:16px;border-top:1px solid var(--line)}
h3{color:var(--fg-0);font-size:16px;font-weight:600;line-height:1.4;letter-spacing:-0.006em;margin:20px 0 4px}
li{margin:4px 0}strong{color:var(--fg-0);font-weight:600}summary{font-weight:600}
.card{background:var(--bg-1);border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin:16px 0}
.warn{border-color:color-mix(in srgb,var(--warn) 45%,transparent);background:color-mix(in srgb,var(--warn) 10%,var(--bg-1))}

details{background:var(--bg-1);border:1px solid var(--line);border-radius:12px;padding:12px 16px;margin:10px 0}summary{cursor:pointer;color:var(--fg-0);font-weight:600}
table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:8px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--fg-0)}
.tablewrap{overflow-x:auto}
footer.bottom{border-top:1px solid var(--line);color:var(--fg-2);font-size:13px;padding:20px;text-align:center}
footer.bottom a{color:var(--fg-2)}
@media (max-width:560px){h1{font-size:30px}h2{font-size:19px}main{padding:24px 16px 48px}.brand{font-size:18px}}
"""

def page(slug, title, desc, body):
    tabs = ''.join(f'<a href="/{s}"{" aria-current=page" if s==slug else ""}>{n}</a>' for s,n in [('privacy','Privacy'),('terms','Terms'),('support','Support')])
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>{html.escape(title)} — ShakeViewer</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="https://shakeviewer.com/{slug}">
<meta name="theme-color" content="#0a0d12" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#fafaf7" media="(prefers-color-scheme: light)">
<link rel="preload" href="/fonts/inter-latin-var.woff2" as="font" type="font/woff2" crossorigin>
<style>{CSS}</style>
</head>
<body>
<header class="top"><a class="brand" href="/">ShakeViewer</a><nav class="tabs" aria-label="Legal and support">{tabs}</nav></header>
<main>
<h1>{html.escape(title)}</h1>
{body}
</main>
<footer class="bottom">© 2026 ShakeViewer · Data from <a href="https://earthquake.usgs.gov/">USGS</a> · <a href="https://www.seismicportal.eu/">EMSC</a> · <a href="/">Back to the map</a></footer>
</body>
</html>
"""

DISCLAIMER = """<div class="card warn" role="note"><strong>Not for emergency use.</strong> ShakeViewer is for informational and educational purposes only. Data may be delayed, incomplete, or inaccurate. It is not an earthquake early-warning or emergency alert service — do not rely on it for life-safety decisions. Follow official emergency alerts and local authorities.</div>"""

privacy = f"""<p class="meta">Effective {EFFECTIVE} · Applies to shakeviewer.com and the ShakeViewer iOS app</p>
<p>ShakeViewer respects your privacy. This policy explains what data we collect on the <strong>website</strong> (shakeviewer.com) and in the <strong>iOS app</strong>, how it is used, how long we keep it, and your rights. Using ShakeViewer does not require an account.</p>

<h2>Summary</h2>
<div class="tablewrap"><table>
<tr><th></th><th>Website</th><th>iOS app</th></tr>
<tr><td>Account (optional)</td><td>Email &amp; password, Sign in with Apple, or Google sign-in; display name; optional profile photo</td><td>Email &amp; password, Sign in with Apple, or Google sign-in; optional display name</td></tr>
<tr><td>Synced content (signed in)</td><td colspan="2">Bookmarks, saved custom searches, terms-acceptance date</td></tr>
<tr><td>Location</td><td>Optional (Near Me); read from your browser, stored only in your browser</td><td>Optional, “While Using the App” only; stays on your device</td></tr>
<tr><td>Analytics</td><td>Google Analytics 4, only if you accept analytics cookies (see below)</td><td>None</td></tr>
<tr><td>Advertising / tracking</td><td colspan="2">None. We do not sell or share your data with advertisers, and we do not track you across other companies’ apps or websites.</td></tr>
</table></div>

<h2>Data we collect</h2>
<h3>Earthquake data requests</h3>
<p>Earthquake data is fetched directly from the U.S. Geological Survey (USGS) and the European-Mediterranean Seismological Centre (EMSC). No personally identifying information is sent to them beyond your IP address and standard request headers, which any internet request reveals.</p>
<h3>Account data (only if you create an account)</h3>
<ul>
<li><strong>Website:</strong> email address, display name, optional profile photo, and either a password (stored hashed by Firebase Authentication), your Apple ID if you use <strong>Sign in with Apple</strong>, or your Google identity if you use <strong>Sign in with Google</strong>. With Sign in with Apple, Apple shares your name (if you choose to) and either your email address or a private relay address that forwards to it; we do not receive your Apple ID password. With Google sign-in, Google shares your name, email address and profile picture with us; we do not receive your Google password.</li>
<li><strong>iOS app:</strong> email address, optional display name, and either a password stored hashed by Firebase Authentication or your Apple ID or Google identity if you use Sign in with Apple or Sign in with Google (the same information described above).</li>
</ul>
<h3>User content (only if signed in)</h3>
<p>Bookmarks of earthquakes, saved custom searches (date range, minimum magnitude, optional map area you drew), and the date and version of the Terms and Privacy Policy you accepted. These sync between the website and the app.</p>
<h3>Location</h3>
<p>Location is always optional. On the website the Near Me feature reads your approximate coordinates from your browser and stores them only in your browser. In the iOS app location is requested only when you tap “Show my location”, is limited to “While Using the App”, is used on your device to centre the map and calculate distances, and is <strong>never uploaded to our servers or shared</strong>. Custom-search map areas are drawn by you and are not your device location.</p>
<h3>Preferences stored on your device</h3>
<p>Theme, map style, filters, fault-line toggle and local search history are stored in your browser’s local storage or in the app’s on-device storage and are not sent to us.</p>
<h3>Analytics and cookies (website only)</h3>
<p>The website uses <strong>Google Analytics 4</strong> (provided by Google LLC / Google Ireland Ltd.) only if you choose <strong>Accept</strong> in the cookie banner. Until you accept, Google Analytics is not loaded and no analytics cookies are set; we use Google Consent Mode with all storage denied by default. If you accept, we grant analytics storage only &mdash; advertising storage, ad personalization, ad user data and Google signals stay off.</p>
<p><strong>What is collected:</strong> pseudonymous usage events such as page views, sign-up and sign-in (with the method used: email, Apple or Google), adding a bookmark, running a custom search (minimum magnitude and whether an area was drawn) and changing the language, together with technical data your browser sends (device and browser type, screen size, approximate location derived from your IP address, referrer). IP addresses are not stored by Google Analytics 4. We do not send your name, email address or account ID to Google Analytics.</p>
<p><strong>Cookies:</strong> Google Analytics sets first-party cookies named <code>_ga</code> and <code>_ga_&lt;ID&gt;</code> (up to 2 years) to distinguish visits. Your choice itself is stored in your browser&rsquo;s local storage (<code>sv_cookie_consent</code>), not in a cookie. Firebase Authentication stores your sign-in session in your browser&rsquo;s local storage; this is strictly necessary for signing in and is not used for analytics.</p>
<p><strong>Opt-out:</strong> you can decline in the banner, or change your choice at any time via <strong>Cookie settings</strong> in the website footer (or the About dialog on mobile). You can also block Google Analytics with your browser&rsquo;s tracking protection or the <a href="https://tools.google.com/dlpage/gaoptout">Google Analytics opt-out add-on</a>.</p>
<p><strong>Google as processor:</strong> Google processes analytics data on our behalf as a service provider/processor under the Google Ads Data Processing Terms, and data may be transferred to and processed in the United States under Google&rsquo;s standard contractual clauses. Analytics data is retained for 14 months. See <a href="https://policies.google.com/technologies/partner-sites">how Google uses information from sites that use its services</a>. The iOS app contains <strong>no analytics, advertising or tracking SDKs</strong>.</p>

<h2>How data is used and who processes it</h2>
<p>Account data and synced content are stored in Google Firebase (Firebase Authentication and Cloud Firestore, operated by Google LLC) solely to provide ShakeViewer features such as signing in and syncing bookmarks. Google acts as our service provider and protects this data under its own security and privacy commitments, which provide at least the same level of protection described here. The website is hosted by Netlify, which processes standard server logs (IP address, user agent) to deliver the site. Map tiles are loaded from CARTO/Esri on the website and Apple Maps in the iOS app, which receive your IP address when tiles are requested. All connections use HTTPS.</p>
<p>We do not sell, rent, or share your personal data with advertisers or data brokers, and we do not use it for any purpose other than operating ShakeViewer.</p>

<h2>Retention and deletion</h2>
<p>Synced data is kept for as long as your account exists. You can delete your account at any time:</p>
<ul>
<li><strong>iOS app:</strong> Settings → Account → Delete account.</li>
<li><strong>Website:</strong> open your profile (avatar, top right) → Delete account.</li>
</ul>
<p>Deleting your account permanently erases your bookmarks, saved searches, user record and sign-in credentials from our systems. Data stored only on your device or in your browser is removed when you delete the app or clear site data. See <a href="/support#delete-account">how to delete your account</a>.</p>

<h2>Your rights and choices</h2>
<p>Creating an account is optional; every earthquake feature works without one. You can withdraw location permission at any time in your browser or iOS Settings, sign out, or delete your account. Depending on where you live (for example under the GDPR or CCPA) you may have rights to access, correct, export or delete your data; contact us to exercise them.</p>

<h2>Children</h2>
<p>ShakeViewer is not directed at children under 13 and does not knowingly collect their personal information.</p>

<h2>Changes</h2>
<p>We may update this policy. The effective date above shows when it last changed; significant changes will be highlighted on the site and in the app.</p>

<h2>Contact</h2>
<p>Questions or privacy requests: {CONTACT_HTML}. See also the <a href="/support">Support page</a>.</p>
"""

terms = f"""<p class="meta">Effective {TERMS_VERSION} · Applies to shakeviewer.com and the ShakeViewer iOS app</p>
{DISCLAIMER}
<h2>Acceptance</h2>
<p>By using ShakeViewer you agree to these terms. If you do not accept them, please do not use the service.</p>
<h2>Nature of the service</h2>
<p>ShakeViewer provides earthquake information aggregated from USGS and EMSC for informational and educational purposes only. Data may be delayed, incomplete, or inaccurate. <strong>Do not rely on ShakeViewer for life-safety decisions.</strong> Follow official emergency alerts and local authorities.</p>
<h2>Acceptable use</h2>
<ul>
<li>Do not attempt to reverse-engineer, scrape in bulk, or overload the service.</li>
<li>Do not use ShakeViewer to mislead or spread disinformation about seismic events.</li>
<li>Respect the terms of upstream data providers (USGS and EMSC).</li>
</ul>
<h2>Accounts</h2>
<p>You are responsible for your account credentials and any activity performed through your account. You may delete your account at any time from your profile on the website or in the iOS app under Settings → Account → Delete account.</p>
<h2>Disclaimer</h2>
<p>The service is provided "as is" without warranty of any kind. ShakeViewer is not liable for damages arising from use of the service or reliance on the data it displays.</p>
<h2>Changes</h2>
<p>These terms may change. The effective date above indicates when they were last updated. Continued use of the service constitutes acceptance of the updated terms.</p>
<h2>Contact</h2>
<p>{CONTACT_HTML} · <a href="/privacy">Privacy Policy</a> · <a href="/support">Support</a></p>
"""

support = f"""<p class="meta">Help for shakeviewer.com and the ShakeViewer iOS app</p>
<h2>Contact us</h2>
<div class="card"><p style="margin:0">Email: {CONTACT_HTML}</p><p style="margin:6px 0 0;color:var(--fg-2);font-size:14px">Please include your device (or browser), app version, and what you were doing. We usually reply within a few days.</p></div>

<h2 id="delete-account">How to delete your account</h2>
<h3>In the iOS app</h3>
<ol><li>Open <strong>Settings</strong> (bottom tab) → <strong>Account</strong>.</li><li>Tap <strong>Delete account</strong>, enter your password, and confirm.</li></ol>
<h3>On the website</h3>
<ol><li>Sign in at <a href="/">shakeviewer.com</a> and open your profile (avatar, top right).</li><li>Choose <strong>Delete account</strong>, confirm with your password if asked, and confirm.</li></ol>
<p>This permanently deletes your bookmarks, saved searches, user record and sign-in. It cannot be undone. If you can no longer sign in, email us from the address on the account and we will delete it for you.</p>

<h2>Frequently asked questions</h2>
<details open><summary>How often is the data updated?</summary><p>Every 60 seconds in the 24-hour view and every 5 minutes for longer windows. You can refresh manually at any time (pull to refresh in the app).</p></details>
<details><summary>Where does the data come from?</summary><p>From the <a href="https://earthquake.usgs.gov/">U.S. Geological Survey (USGS)</a> and the <a href="https://www.seismicportal.eu/">European-Mediterranean Seismological Centre (EMSC)</a>. Plate boundaries are from Bird (2003), PB2002.</p></details>
<details><summary>Why do I sometimes see duplicate or missing events?</summary><p>When both USGS and EMSC report the same earthquake, ShakeViewer merges them by time and location (USGS preferred). Very recent or small events can take several minutes to appear, and a late report may occasionally miss the merge.</p></details>
<details><summary>Why doesn’t “Show my location” work?</summary><p>Location is optional. Allow it when prompted, or enable it later in iOS Settings → ShakeViewer → Location (“While Using the App”), or in your browser’s site settings. Your location stays on your device.</p></details>
<details><summary>Do I need an account?</summary><p>No. Accounts only sync bookmarks and saved searches between the website and the app.</p></details>
<details><summary>I forgot my password.</summary><p>On the sign-in screen enter your email and choose “Forgot password?” to receive a reset link.</p></details>
<details><summary>Does ShakeViewer send earthquake alerts?</summary><p>No. ShakeViewer is not an alert or early-warning service. Use official alert systems in your region.</p></details>

<h2>Disclaimer</h2>
{DISCLAIMER}
<p><a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Use</a></p>
"""

for slug, title, desc, body in [
    ('privacy', 'Privacy Policy', 'How ShakeViewer (website and iOS app) collects, uses and protects your data.', privacy),
    ('terms', 'Terms of Use', 'Terms of use for the ShakeViewer website and iOS app.', terms),
    ('support', 'Support', 'Contact ShakeViewer, FAQ, and how to delete your account.', support),
]:
    d = os.path.join(ROOT, slug); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'index.html'), 'w').write(page(slug, title, desc, body))
    print('wrote', slug)
