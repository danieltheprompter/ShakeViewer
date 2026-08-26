import { haversineKm } from './geo.js';

export const MATCH_MAX_DT_MS = 90_000;
export const MATCH_MAX_KM = 80;

function finiteNum(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Always positive km. USGS and EMSC geometry Z can be negative. */
export function depthKmFromFeature(f) {
  const z = f?.geometry?.coordinates?.[2];
  const fromZ = finiteNum(z);
  if (fromZ != null) return Math.abs(fromZ);
  const fromP = finiteNum(f?.properties?.depth);
  if (fromP != null) return Math.abs(fromP);
  return 0;
}

/**
 * USGS-only. properties.type === 'earthquake'. Missing type is kept.
 * Do NOT use this on EMSC — EMSC has evtype (`ke`), not type.
 */
export function keepUsgsEvent(f) {
  const type = f?.properties?.type;
  if (type == null || type === '') return true;
  return String(type).toLowerCase().trim() === 'earthquake';
}

/**
 * EMSC-only. Live 24h rows are evtype `ke`. Keep `ke` or absent.
 * Filtering type === 'earthquake' drops every EMSC row.
 */
export function keepEmscEvent(f) {
  const evtype = f?.properties?.evtype;
  if (evtype == null || evtype === '') return true;
  return String(evtype).toLowerCase().trim() === 'ke';
}

function titlePlace(s) {
  if (!s) return s;
  return String(s).replace(/\w\S*/g, (w) => {
    const u = w.toUpperCase();
    if (['CA', 'NV', 'OR', 'WA', 'UT', 'NY', 'TX', 'AK', 'HI', 'US', 'USA', 'PR', 'UK', 'NZ', 'N.Z.', 'EU'].includes(u)) return u;
    if (['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW', 'NNW', 'NNE', 'SSW', 'SSE', 'ENE', 'ESE', 'WNW', 'WSW'].includes(u)) return u;
    if (/^\d/.test(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });
}

export function normalizeUsgs(f) {
  if (!f) return null;
  const p = f.properties || {};
  if (!keepUsgsEvent(f)) return null;
  const coords = f.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  const lon = finiteNum(coords[0]);
  const lat = finiteNum(coords[1]);
  if (lat == null || lon == null) return null;
  const mag = finiteNum(p.mag);
  const time = finiteNum(p.time);
  if (time == null) return null;
  const id = String(f.id || p.ids || '').trim();
  if (!id) return null;
  const tsunami = p.tsunami === 1 || p.tsunami === '1' ? 1 : 0;
  const felt = finiteNum(p.felt);
  return {
    id,
    ids: { usgs: id },
    source: 'USGS',
    mag,
    magType: p.magType || null,
    time,
    updated: finiteNum(p.updated),
    place: titlePlace(p.place || '') || 'Unknown location',
    lon,
    lat,
    depthKm: depthKmFromFeature(f),
    felt,
    cdi: finiteNum(p.cdi),
    tsunami,
    url: p.url || `https://earthquake.usgs.gov/earthquakes/eventpage/${id}`,
    status: p.status || null,
    sig: finiteNum(p.sig),
    type: p.type || 'earthquake',
  };
}

export function normalizeEmsc(f) {
  if (!f) return null;
  const p = f.properties || {};
  if (!keepEmscEvent(f)) return null;
  const coords = f.geometry?.coordinates;
  const lon = finiteNum(coords?.[0]);
  const lat = finiteNum(coords?.[1]);
  if (lat == null || lon == null) return null;
  const mag = finiteNum(p.mag ?? p.magnitude);
  const rawTime = p.time || p.origintime;
  const time = typeof rawTime === 'number' ? finiteNum(rawTime) : Date.parse(rawTime || '');
  if (!Number.isFinite(time)) return null;
  const unid = p.unid || p.source_id || null;
  const id = 'emsc_' + (unid || `${time}_${lat}_${lon}`);
  return {
    id,
    ids: { emsc: unid ? String(unid) : undefined },
    source: 'EMSC',
    mag,
    magType: p.magtype || p.magType || null,
    time,
    updated: null,
    place: titlePlace(p.flynn_region || p.region || p.place || '') || 'Unknown location',
    lon,
    lat,
    depthKm: depthKmFromFeature(f),
    felt: null,
    cdi: null,
    tsunami: 0,
    url: unid
      ? `https://www.seismicportal.eu/eventdetails.html?unid=${unid}`
      : 'https://www.seismicportal.eu/',
    status: p.status || null,
    sig: null,
    type: p.evtype || null,
  };
}

export function eventsMatch(a, b) {
  if (!a || !b) return false;
  if (Math.abs(a.time - b.time) > MATCH_MAX_DT_MS) return false;
  return haversineKm(a.lat, a.lon, b.lat, b.lon) <= MATCH_MAX_KM;
}

/**
 * USGS-first, EMSC-fill. Match on time+space only — never on id / ids string.
 * Do not call EMSC EventID. Keep USGS mag/time/coords/place/felt/tsunami/url
 * unless USGS mag is null.
 */
export function mergeQuakes(usgsList, emscList, windowFloor = 0) {
  const result = [];
  for (const u of usgsList || []) {
    if (!u) continue;
    result.push({ ...u, ids: { ...u.ids } });
  }

  for (const e of emscList || []) {
    if (!e) continue;
    if (e.mag != null && e.mag < windowFloor) continue;
    let best = null;
    let bestD = Infinity;
    for (const u of result) {
      if (u.source === 'EMSC') continue;
      if (!eventsMatch(e, u)) continue;
      const d = haversineKm(e.lat, e.lon, u.lat, u.lon);
      if (d < bestD) {
        bestD = d;
        best = u;
      }
    }
    if (best) {
      best.source = 'BOTH';
      if (e.ids?.emsc) best.ids.emsc = e.ids.emsc;
      if (best.mag == null) best.mag = e.mag;
    } else {
      result.push({ ...e, ids: { ...e.ids } });
    }
  }

  return result.filter((q) => {
    if (q.mag == null) return false;
    return q.mag >= windowFloor;
  });
}

export function applyClientFilters(quakes, { minmag, maxmag, depth, near, userLocation, nearKm = 500 }) {
  return (quakes || []).filter((q) => {
    if (q.mag == null) return false;
    if (minmag != null && q.mag < minmag) return false;
    if (maxmag != null && q.mag > maxmag) return false;
    if (depth && depth !== 'all' && depthBandOf(q.depthKm) !== depth) return false;
    if (near && userLocation) {
      const d = haversineKm(userLocation.lat, userLocation.lng, q.lat, q.lon);
      if (d > nearKm) return false;
    }
    return true;
  });
}

function depthBandOf(depthKm) {
  const d = Math.abs(Number(depthKm) || 0);
  if (d < 70) return 'shallow';
  if (d < 300) return 'inter';
  return 'deep';
}

export function sortQuakes(quakes, sort = 'time') {
  const list = [...(quakes || [])];
  if (sort === 'mag') {
    list.sort((a, b) => (b.mag ?? -1) - (a.mag ?? -1) || b.time - a.time);
  } else {
    list.sort((a, b) => b.time - a.time || (b.mag ?? -1) - (a.mag ?? -1));
  }
  return list;
}

export function statsOf(quakes) {
  const total = quakes.length;
  let maxMag = null;
  let strong = 0;
  for (const q of quakes) {
    if (q.mag == null) continue;
    if (maxMag == null || q.mag > maxMag) maxMag = q.mag;
    if (q.mag >= 4.5) strong += 1;
  }
  return { total, maxMag, strong };
}

export function findByAnyId(quakes, id) {
  if (!id) return null;
  return (
    quakes.find((q) => q.id === id) ||
    quakes.find((q) => q.ids?.usgs === id) ||
    quakes.find((q) => q.ids?.emsc === id) ||
    quakes.find((q) => q.id === `emsc_${id}`) ||
    null
  );
}
