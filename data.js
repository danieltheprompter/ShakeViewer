/* Static earthquake fixture — approximates a "past 24 hours" global set.
   Keeps the prototype offline & deterministic. */

const NOW = Date.now();
const HOUR = 3600_000;

// Compact generator
const q = (id, mag, place, lat, lng, depth, hoursAgo, source='USGS', felt=0) => ({
  id,
  properties: {
    mag, place, time: NOW - hoursAgo * HOUR,
    felt, tsunami: mag >= 7 ? 1 : 0,
    url: `https://earthquake.usgs.gov/earthquakes/eventpage/${id}`
  },
  geometry: { coordinates: [lng, lat, depth] },
  source
});

window.QUAKES = [
  q('us7000m5zk', 6.4, 'Tonga Islands', -19.82, -175.43, 189, 0.4, 'USGS', 12),
  q('us7000m5zl', 5.8, '78 km SE of Jiquilillo, Nicaragua', 12.41, -87.12, 58, 0.7, 'USGS', 289),
  q('us7000m5zm', 4.9, 'Central Mid-Atlantic Ridge', 3.21, -29.44, 10, 1.1),
  q('us7000m5zn', 3.2, 'Central California', 35.89, -118.04, 8.2, 1.3, 'USGS', 47),
  q('eu6619221',  5.1, 'Kermadec Islands, New Zealand', -30.14, -177.32, 33, 1.6, 'EMSC'),
  q('us7000m5zp', 4.3, 'Hindu Kush Region, Afghanistan', 36.48, 70.77, 212, 2.0),
  q('us7000m5zq', 2.8, '12 km NNW of Ridgecrest, CA', 35.73, -117.72, 4.6, 2.4, 'USGS', 22),
  q('us7000m5zr', 7.2, '84 km W of Ferndale, CA', 40.52, -125.11, 18, 2.8, 'USGS', 4281),
  q('us7000m5zs', 3.6, 'Greece', 38.21, 22.94, 14, 3.3, 'EMSC'),
  q('us7000m5zt', 4.1, 'Southern East Pacific Rise', -33.1, -112.6, 10, 3.9),
  q('us7000m5zu', 5.6, 'Java, Indonesia', -7.89, 110.34, 125, 4.4, 'USGS', 318),
  q('eu6619250',  4.8, 'Turkey', 39.12, 40.27, 7, 4.8, 'EMSC'),
  q('us7000m5zw', 3.1, 'Alaska Peninsula', 55.82, -158.17, 44, 5.3, 'USGS'),
  q('us7000m5zx', 6.1, 'Vanuatu', -15.44, 167.28, 78, 5.9, 'USGS', 76),
  q('us7000m5zy', 2.9, 'Puerto Rico Region', 18.12, -66.84, 12, 6.2, 'USGS'),
  q('us7000m5zz', 4.4, 'Near the East Coast of Honshu, Japan', 36.14, 141.12, 42, 6.8),
  q('us7000m5a1', 5.3, 'Philippine Islands Region', 11.22, 124.88, 94, 7.5),
  q('us7000m5a2', 3.8, 'Off Coast of Oregon', 43.11, -127.4, 10, 8.1),
  q('us7000m5a3', 4.7, 'Chile–Argentina Border', -23.3, -67.21, 188, 8.7),
  q('us7000m5a4', 2.7, 'Yellowstone National Park', 44.42, -110.68, 3.2, 9.2, 'USGS', 8),
  q('us7000m5a5', 3.4, 'Iceland Region', 63.98, -21.12, 5, 9.9, 'EMSC'),
  q('us7000m5a6', 5.0, 'Fiji Region', -17.12, 178.22, 412, 10.4),
  q('us7000m5a7', 3.9, 'Western Iran', 32.88, 48.12, 17, 11.1, 'EMSC'),
  q('us7000m5a8', 6.7, 'Solomon Islands', -8.76, 158.21, 64, 11.8, 'USGS', 912),
  q('us7000m5a9', 2.6, 'Hawaiian Islands', 19.41, -155.28, 2.1, 12.4, 'USGS', 14),
  q('us7000m5b0', 4.2, 'Central Italy', 42.65, 13.29, 9, 13.1, 'EMSC', 188),
  q('us7000m5b1', 5.5, 'Kuril Islands', 46.21, 150.77, 112, 13.9),
  q('us7000m5b2', 3.3, 'Offshore Northern California', 40.71, -124.62, 22, 14.5),
  q('us7000m5b3', 4.0, 'Taiwan Region', 23.77, 121.44, 28, 15.2),
  q('us7000m5b4', 5.9, 'Nepal', 28.21, 84.54, 22, 16.0, 'USGS', 642),
  q('us7000m5b5', 3.0, 'Canadian Arctic', 73.12, -104.4, 10, 17.2),
  q('us7000m5b6', 4.6, 'Off Coast of Ecuador', -0.98, -80.41, 32, 18.5),
  q('us7000m5b7', 2.9, 'Utah', 40.12, -112.34, 7.8, 19.1, 'USGS', 4),
  q('us7000m5b8', 5.4, 'Mindanao, Philippines', 7.88, 124.61, 138, 20.3),
  q('us7000m5b9', 3.7, 'South Atlantic Ocean', -44.2, -12.8, 10, 21.5),
  q('us7000m5c0', 4.8, 'Sumatra, Indonesia', -2.14, 100.32, 46, 22.4, 'USGS', 122),
  q('us7000m5c1', 6.3, 'Off East Coast of Kamchatka', 54.21, 162.88, 28, 22.9),
];

window.getMagnitudeColor = (mag) => {
  if (mag >= 6.0) return 'var(--mag-major)';
  if (mag >= 4.5) return 'var(--mag-strong)';
  if (mag >= 3.5) return 'var(--mag-moderate)';
  return 'var(--mag-minor)';
};
window.getMagnitudeHex = (mag) => {
  if (mag >= 6.0) return '#ef4444';
  if (mag >= 4.5) return '#f97316';
  if (mag >= 3.5) return '#eab308';
  return '#22c55e';
};
window.getMagnitudeLabel = (mag) => {
  if (mag >= 6.0) return 'Major';
  if (mag >= 4.5) return 'Strong';
  if (mag >= 3.5) return 'Moderate';
  return 'Minor';
};

window.formatRelTime = (ts) => {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
};

window.formatAbsTime = (ts) => {
  const d = new Date(ts);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

window.formatCoord = (lat, lng) => {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}°${ns}  ${Math.abs(lng).toFixed(2)}°${ew}`;
};
