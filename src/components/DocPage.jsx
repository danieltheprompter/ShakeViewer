import { Link } from 'react-router-dom';
import { t } from '../lib/i18n.js';

const SUPPORT = 'danieltheprompter@gmail.com';

export function DocPage({ page }) {
  const title = t(page);
  return (
    <article className="doc-page">
      <h1>{title}</h1>
      {page === 'about' && <About />}
      {page === 'faq' && <Faq />}
      {page === 'privacy' && <Privacy />}
      {page === 'terms' && <Terms />}
    </article>
  );
}

function About() {
  return (
    <>
      <p>ShakeViewer is a live global earthquake monitor. It merges USGS and EMSC reports so you can see recent events on a map and in a list — not an official alert system.</p>
      <h2>Magnitude scale</h2>
      <p>Magnitude is logarithmic. Each whole-number step is roughly 32× more energy.</p>
      <ul>
        <li><strong>Minor</strong> (&lt; 3.5) — rarely felt.</li>
        <li><strong>Moderate</strong> (3.5–4.5) — often felt; minor damage possible.</li>
        <li><strong>Strong</strong> (4.5–6.0) — can damage buildings near the epicenter.</li>
        <li><strong>Major</strong> (6.0+) — widespread damage.</li>
      </ul>
      <h2>Data sources</h2>
      <p>Live windows use the USGS summary GeoJSON feeds and the EMSC FDSN JSON service. The two catalogs are merged by time and location (within 90 seconds and 80 km). USGS identity wins when both report the same quake.</p>
      <h2>Safety</h2>
      <ul>
        <li>Indoors: drop, cover, and hold on.</li>
        <li>Outdoors: move to open ground away from buildings and power lines.</li>
        <li>Driving: pull over safely; avoid overpasses.</li>
        <li>After shaking: expect aftershocks; follow official tsunami guidance on the coast.</li>
      </ul>
      <p>Questions: <a href={`mailto:${SUPPORT}`}>{SUPPORT}</a></p>
    </>
  );
}

function Faq() {
  return (
    <>
      <h2>Is this an alert?</h2>
      <p>No. ShakeViewer is informational. Do not use it for life-safety decisions. Follow official emergency alerts and local authorities.</p>
      <h2>Where does the data come from?</h2>
      <p>USGS (U.S. Geological Survey) and EMSC (European-Mediterranean Seismological Centre). When both report the same earthquake, the USGS identifier is kept.</p>
      <h2>What magnitude floor do you show?</h2>
      <ul>
        <li>Last 24 hours: M2.5+</li>
        <li>Last 7 days: M3.5+ (the stricter of the two feeds)</li>
        <li>Last 30 days: M4.5+</li>
      </ul>
      <p>The range chips always show that ingest floor. The filter slider never goes below it. Custom search defaults to M4.0.</p>
      <h2>How delayed is the feed?</h2>
      <p>The 24-hour view refreshes about every 60 seconds. 7-day and 30-day views refresh about every 5 minutes. Catalogs themselves can lag minutes behind origin time. Status is LIVE when a merge succeeded in the last 30 seconds, Delayed up to 2 minutes, and Offline if both sources fail.</p>
      <h2>Can I search a custom window?</h2>
      <p>Yes — open <Link to="/search">Custom search</Link>, set dates, magnitude, optional place or map box, and submit. Results land on the home map as <code>?range=custom</code>.</p>
      <h2>Why should I sign in?</h2>
      <p>An account lets you bookmark events and sync them across devices. Theme and language stay on this device.</p>
    </>
  );
}

function Privacy() {
  return (
    <>
      <p>Effective 2026-08-26</p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Earthquake catalogs</strong> are fetched in your browser from USGS and EMSC. Those services see a normal web request from your network.</li>
        <li><strong>Account data</strong> if you sign in: email, display name, and a hashed password or Google identity, stored in Firebase.</li>
        <li><strong>Bookmarks</strong> you choose to save, stored locally until you sign in, then in Firestore.</li>
        <li><strong>Location</strong> only if you turn on Near me or Locate. Coordinates stay on your device.</li>
      </ul>
      <h2>Analytics</h2>
      <p>ShakeViewer does not load Google Analytics. This site does not include a first-party usage tracker in the app code.</p>
      <h2>Your rights</h2>
      <p>You may close your account by contacting support. That removes the Firebase user record and bookmark documents we can reach.</p>
      <h2>Contact</h2>
      <p><a href={`mailto:${SUPPORT}`}>{SUPPORT}</a></p>
    </>
  );
}

function Terms() {
  return (
    <>
      <p>Effective 2026-08-26</p>
      <h2>Acceptance</h2>
      <p>By using ShakeViewer you agree to these terms. If you do not, do not use the service.</p>
      <h2>Nature of the service</h2>
      <p>ShakeViewer shows earthquake information from USGS and EMSC for information and education only. Data may be delayed, incomplete, or wrong. <strong>Do not rely on ShakeViewer for life-safety decisions.</strong> Follow official alerts.</p>
      <p>{t('alert_disclaimer')} USGS · EMSC</p>
      <h2>Acceptable use</h2>
      <ul>
        <li>Do not scrape in bulk or overload the service.</li>
        <li>Do not use ShakeViewer to spread false claims about seismic events.</li>
        <li>Respect USGS and EMSC terms.</li>
      </ul>
      <h2>Accounts</h2>
      <p>You are responsible for activity on your account.</p>
      <h2>Disclaimer</h2>
      <p>The service is provided “as is” without warranty. ShakeViewer is not liable for damages from use of the data.</p>
      <h2>Contact</h2>
      <p><a href={`mailto:${SUPPORT}`}>{SUPPORT}</a></p>
    </>
  );
}
