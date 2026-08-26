/* Feed helpers + optional offline fixture. Live app fetches USGS + EMSC. */

export const clusterKey = (time, lat, lng) => {
  const t = Math.round(time / 40000);
  const y = Math.round(lat * 2.5) / 2.5;
  const x = Math.round(lng * 2.5) / 2.5;
  return `${t}_${y}_${x}`;
};

export const getMagnitudeHex = (mag) => {
  if (mag >= 6.0) return '#ef4444';
  if (mag >= 4.5) return '#f97316';
  if (mag >= 3.5) return '#eab308';
  return '#22c55e';
};

export const getMagnitudeLabel = (mag) => {
  if (mag >= 6.0) return 'major';
  if (mag >= 4.5) return 'strong';
  if (mag >= 3.5) return 'moderate';
  return 'minor';
};

export const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const toTitleCase = (s) => {
  if (!s) return s;
  return String(s).replace(/\w\S*/g, (w) => {
    const u = w.toUpperCase();
    if (['CA', 'NV', 'OR', 'WA', 'UT', 'NY', 'TX', 'AK', 'HI', 'US', 'USA', 'PR', 'UK', 'NZ', 'N.Z.', 'EU'].includes(u)) return u;
    if (['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW', 'NNW', 'NNE', 'SSW', 'SSE', 'ENE', 'ESE', 'WNW', 'WSW'].includes(u)) return u;
    if (/^\d/.test(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });
};

const USGS_SUMMARY = {
  day: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
  week: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson',
  month: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson',
};

function fromUsgs(f) {
  return {
    id: f.id,
    properties: {
      mag: f.properties.mag ?? 0,
      place: toTitleCase(f.properties.place || 'Unknown location'),
      time: f.properties.time,
      felt: f.properties.felt || 0,
      tsunami: f.properties.tsunami || 0,
      url: f.properties.url || `https://earthquake.usgs.gov/earthquakes/eventpage/${f.id}`,
    },
    geometry: f.geometry,
    source: 'USGS',
  };
}

function fromEmsc(f, minmag) {
  const p = f.properties || {};
  const mag = p.mag ?? p.magnitude ?? 0;
  if (mag < minmag) return null;
  const time = new Date(p.time || p.origintime || 0).getTime();
  const lat = f.geometry?.coordinates?.[1];
  const lng = f.geometry?.coordinates?.[0];
  if (lat == null || lng == null) return null;
  const id = 'emsc_' + (p.unid || p.source_id || `${time}_${lat}_${lng}`);
  return {
    id,
    properties: {
      mag,
      place: toTitleCase(p.flynn_region || p.region || 'Unknown location'),
      time,
      felt: 0,
      tsunami: 0,
      url: p.unid ? `https://www.seismicportal.eu/eventdetails.html?unid=${p.unid}` : 'https://www.seismicportal.eu/',
    },
    geometry: f.geometry,
    source: 'EMSC',
  };
}

function mergeFeeds(usgsJson, emscJson, minmag) {
  const merged = new Map();
  if (usgsJson?.features) {
    for (const f of usgsJson.features) {
      const ev = fromUsgs(f);
      const [lng, lat] = ev.geometry.coordinates;
      merged.set(clusterKey(ev.properties.time, lat, lng), ev);
    }
  }
  if (Array.isArray(emscJson?.features)) {
    for (const f of emscJson.features) {
      const ev = fromEmsc(f, minmag);
      if (!ev) continue;
      const [lng, lat] = ev.geometry.coordinates;
      const key = clusterKey(ev.properties.time, lat, lng);
      if (!merged.has(key)) merged.set(key, ev);
    }
  }
  return Array.from(merged.values());
}

export async function fetchStandardFeed(range) {
  const hours = range === 'day' ? 24 : range === 'week' ? 168 : 720;
  const minmag = 2.5;
  const startIso = new Date(Date.now() - hours * 3600_000).toISOString();
  const emscUrl = `https://www.seismicportal.eu/fdsnws/event/1/query?format=json&starttime=${encodeURIComponent(startIso)}&limit=2500&minmag=${minmag}`;
  const [usgsRes, emscRes] = await Promise.allSettled([
    fetch(USGS_SUMMARY[range] || USGS_SUMMARY.day).then((r) => { if (!r.ok) throw new Error('USGS ' + r.status); return r.json(); }),
    fetch(emscUrl).then((r) => { if (!r.ok) throw new Error('EMSC ' + r.status); return r.json(); }),
  ]);
  const features = mergeFeeds(
    usgsRes.status === 'fulfilled' ? usgsRes.value : null,
    emscRes.status === 'fulfilled' ? emscRes.value : null,
    minmag,
  );
  return {
    features,
    usgsOk: usgsRes.status === 'fulfilled',
    emscOk: emscRes.status === 'fulfilled',
  };
}

export async function fetchCustomFeed({ start, end, minMag, bounds }) {
  const minM = minMag ?? 2.5;
  const boundsQ = bounds
    ? `&minlatitude=${bounds.minLat}&maxlatitude=${bounds.maxLat}&minlongitude=${bounds.minLon}&maxlongitude=${bounds.maxLon}`
    : '';
  const emscBoundsQ = bounds
    ? `&minlat=${bounds.minLat}&maxlat=${bounds.maxLat}&minlon=${bounds.minLon}&maxlon=${bounds.maxLon}`
    : '';
  const usgsUrl = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${start}&endtime=${end}T23:59:59&minmagnitude=${minM}${boundsQ}&limit=2500&orderby=time`;
  const emscUrl = `https://www.seismicportal.eu/fdsnws/event/1/query?format=json&starttime=${start}T00:00:00&endtime=${end}T23:59:59&minmag=${minM}${emscBoundsQ}&limit=2500`;
  const [usgsRes, emscRes] = await Promise.allSettled([
    fetch(usgsUrl).then((r) => { if (!r.ok) throw new Error('USGS ' + r.status); return r.json(); }),
    fetch(emscUrl).then((r) => { if (!r.ok) throw new Error('EMSC ' + r.status); return r.json(); }),
  ]);
  return mergeFeeds(
    usgsRes.status === 'fulfilled' ? usgsRes.value : null,
    emscRes.status === 'fulfilled' ? emscRes.value : null,
    minM,
  );
}
