import { ingestFloor } from './query.js';
import { mergeQuakes, normalizeEmsc, normalizeUsgs } from './quake.js';

export const USGS_SUMMARY = {
  '24h': 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
  '7d': 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson',
  '30d': 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson',
};

const USGS_FDSN = 'https://earthquake.usgs.gov/fdsnws/event/1/query';
const USGS_COUNT = 'https://earthquake.usgs.gov/fdsnws/event/1/count';
const EMSC_QUERY = 'https://www.seismicportal.eu/fdsnws/event/1/query';

const TIMEOUT_MS = 12_000;
export const HARD_LIMIT = 2500;
export const MAX_LIMIT = 20_000;

function emscMinmag(range) {
  if (range === '7d') return 3.5;
  if (range === '30d') return 4.5;
  return 2.5;
}

function hoursOf(range) {
  if (range === '7d') return 168;
  if (range === '30d') return 720;
  return 24;
}

/**
 * HTTP 200 is not success (USGS unknown summary URLs return 200 + "404 File Not Found").
 * Parse JSON; parse failure is an error. Empty FeatureCollection is success.
 * No custom headers — EMSC CORS is GET-only; any extra header preflights and dies.
 * Do not set jsonerror=true.
 */
export async function fetchJson(url, { timeout = TIMEOUT_MS, signal } = {}) {
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const status = res.status;
    if (status === 204) {
      return { ok: true, empty: true, data: null, status };
    }
    const text = await res.text();
    const skip = status === 429 || status >= 500;
    if (!res.ok) {
      return { ok: false, status, skip, data: null };
    }
    if (!text || !text.trim()) {
      return { ok: true, empty: true, data: null, status };
    }
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return { ok: false, status, skip: false, parseError: true, data: null };
    }
    return { ok: true, empty: false, data, status };
  } catch (err) {
    const aborted = err?.name === 'AbortError';
    return { ok: false, status: 0, skip: false, aborted, opaque: true, data: null };
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

/**
 * EMSC 400/413/404 send no ACAO — JS cannot read status (opaque TypeError).
 * Treat any failure as source-down. 204 nodata is empty success.
 */
export async function fetchEmsc(url, opts) {
  const r = await fetchJson(url, opts);
  if (r.ok && r.empty) return { ...r, source: 'EMSC' };
  if (r.ok && !r.parseError) return { ...r, source: 'EMSC' };
  return { ok: false, empty: false, data: null, status: r.status || 0, skip: true, opaque: !!r.opaque, source: 'EMSC' };
}

/**
 * EMSC must stay format=json (geojson/jsonp → HTTP 400).
 * Always send starttime + endtime + limit. Keep limit=2500.
 */
export function emscUrl({ startIso, endIso, minmag, limit = HARD_LIMIT, bbox }) {
  if (!startIso || !endIso) {
    throw new Error('EMSC queries require starttime and endtime');
  }
  const cap = Math.min(Math.max(1, limit || HARD_LIMIT), MAX_LIMIT, HARD_LIMIT);
  const q = new URL(EMSC_QUERY);
  q.searchParams.set('format', 'json');
  q.searchParams.set('starttime', startIso);
  q.searchParams.set('endtime', endIso);
  q.searchParams.set('minmag', String(minmag));
  q.searchParams.set('limit', String(cap));
  q.searchParams.set('offset', '1');
  q.searchParams.set('orderby', 'time');
  if (bbox) {
    q.searchParams.set('minlat', String(bbox.minLat));
    q.searchParams.set('maxlat', String(bbox.maxLat));
    q.searchParams.set('minlon', String(bbox.minLon));
    q.searchParams.set('maxlon', String(bbox.maxLon));
  }
  return q.toString();
}

function usgsFdsnUrl({ start, end, minM, limit = HARD_LIMIT, bbox }) {
  const cap = Math.min(Math.max(1, limit), MAX_LIMIT);
  const q = new URL(USGS_FDSN);
  q.searchParams.set('format', 'geojson');
  q.searchParams.set('starttime', start);
  q.searchParams.set('endtime', `${end}T23:59:59`);
  q.searchParams.set('minmagnitude', String(minM));
  q.searchParams.set('limit', String(cap));
  q.searchParams.set('offset', '1');
  q.searchParams.set('orderby', 'time');
  if (bbox) {
    q.searchParams.set('minlatitude', String(bbox.minLat));
    q.searchParams.set('maxlatitude', String(bbox.maxLat));
    q.searchParams.set('minlongitude', String(bbox.minLon));
    q.searchParams.set('maxlongitude', String(bbox.maxLon));
  }
  return q.toString();
}

function usgsCountUrl(args) {
  return usgsFdsnUrl(args).replace(USGS_FDSN, USGS_COUNT);
}

/** List queries: FeatureCollection. Single eventid: bare Feature. */
export function featuresOf(data) {
  if (!data) return [];
  if (Array.isArray(data.features)) return data.features;
  if (data.type === 'Feature' && data.geometry) return [data];
  return [];
}

function countOf(data) {
  if (data == null) return 0;
  if (typeof data.count === 'number') return data.count;
  if (typeof data.meta?.count === 'number') return data.meta.count;
  if (typeof data.metadata?.count === 'number') return data.metadata.count;
  if (Array.isArray(data.features)) return data.features.length;
  return 0;
}

export function liveUrls(range, now = Date.now()) {
  const hours = hoursOf(range);
  const endIso = new Date(now).toISOString();
  const startIso = new Date(now - hours * 3600_000).toISOString();
  return {
    usgs: USGS_SUMMARY[range],
    emsc: emscUrl({ startIso, endIso, minmag: emscMinmag(range), limit: HARD_LIMIT }),
  };
}

export async function fetchLive(range, { signal, skipUsgs = false, skipEmsc = false } = {}) {
  const urls = liveUrls(range);
  const floor = ingestFloor(range);
  const tasks = [
    skipUsgs ? Promise.resolve({ ok: false, skipped: true }) : fetchJson(urls.usgs, { signal }),
    skipEmsc ? Promise.resolve({ ok: false, skipped: true, empty: false }) : fetchEmsc(urls.emsc, { signal }),
  ];
  const [usgsRes, emscRes] = await Promise.allSettled(tasks).then((rows) =>
    rows.map((r) => (r.status === 'fulfilled' ? r.value : { ok: false, data: null, opaque: true })),
  );

  const usgsOk = !skipUsgs && usgsRes.ok && !usgsRes.parseError;
  const emscEmpty = !skipEmsc && emscRes.ok && emscRes.empty;
  const emscOk = !skipEmsc && emscRes.ok && !emscRes.parseError;
  const usgsSkip = !!usgsRes.skip;
  const emscSkip = !!emscRes.skip || !!emscRes.opaque;

  const usgsList = usgsOk ? featuresOf(usgsRes.data).map(normalizeUsgs).filter(Boolean) : [];
  const emscList = emscOk && !emscEmpty ? featuresOf(emscRes.data).map(normalizeEmsc).filter(Boolean) : [];

  const usgsHardFail = !skipUsgs && !usgsOk && !usgsRes.skipped;
  const emscHardFail = !skipEmsc && !emscOk && !emscEmpty && !emscRes.skipped;

  const quakes = mergeQuakes(usgsList, emscList, floor);

  return {
    quakes,
    usgsOk,
    emscOk: emscOk || emscEmpty,
    usgsSkip,
    emscSkip,
    usgsHardFail,
    emscHardFail,
    bothFailed: usgsHardFail && (emscHardFail || (!emscOk && !emscEmpty)),
    truncated: false,
    totalCount: quakes.length,
  };
}

export async function fetchCustom({ start, end, minM, bbox, signal, skipUsgs = false, skipEmsc = false }) {
  const minmag = minM ?? 4.0;
  const usgsArgs = { start, end, minM: minmag, limit: HARD_LIMIT, bbox };
  const emscArgs = {
    startIso: `${start}T00:00:00`,
    endIso: `${end}T23:59:59`,
    minmag,
    limit: HARD_LIMIT,
    bbox,
  };

  const usgsUrl = usgsFdsnUrl(usgsArgs);
  const emscGet = emscUrl(emscArgs);

  const [usgsRes, emscRes, usgsCountRes] = await Promise.all([
    skipUsgs ? Promise.resolve({ ok: false, skipped: true }) : fetchJson(usgsUrl, { signal }),
    skipEmsc ? Promise.resolve({ ok: false, skipped: true, empty: false }) : fetchEmsc(emscGet, { signal }),
    skipUsgs ? Promise.resolve({ ok: false }) : fetchJson(usgsCountUrl(usgsArgs), { signal }),
  ]);

  if (usgsRes.status === 400) {
    return {
      quakes: [],
      usgsOk: false,
      emscOk: emscRes.ok || emscRes.empty,
      fdsn400: true,
      usgsHardFail: true,
      emscHardFail: !emscRes.ok && !emscRes.empty,
      bothFailed: true,
      truncated: false,
      totalCount: 0,
      message: 'USGS rejected this search (too many matches or invalid range). Raise the minimum magnitude or shrink the dates.',
    };
  }

  const usgsOk = !skipUsgs && usgsRes.ok && !usgsRes.parseError;
  const emscEmpty = !skipEmsc && emscRes.ok && emscRes.empty;
  const emscOk = !skipEmsc && emscRes.ok && !emscRes.parseError;

  const usgsList = usgsOk ? featuresOf(usgsRes.data).map(normalizeUsgs).filter(Boolean) : [];
  const emscList = emscOk && !emscEmpty ? featuresOf(emscRes.data).map(normalizeEmsc).filter(Boolean) : [];
  const quakes = mergeQuakes(usgsList, emscList, minmag);

  const usgsCount = usgsCountRes.ok ? countOf(usgsCountRes.data) : usgsList.length;
  const emscCount = emscList.length;
  const totalCount = Math.max(usgsCount, emscCount, quakes.length);
  const truncated = totalCount > HARD_LIMIT;

  return {
    quakes,
    usgsOk,
    emscOk: emscOk || emscEmpty,
    usgsSkip: usgsRes.skip,
    emscSkip: emscRes.skip || emscRes.opaque,
    usgsHardFail: !skipUsgs && !usgsOk,
    emscHardFail: !skipEmsc && !emscOk && !emscEmpty,
    bothFailed: (!usgsOk && !skipUsgs) && (!emscOk && !emscEmpty && !skipEmsc),
    truncated,
    totalCount,
    fdsn400: false,
  };
}

/** USGS FDSN eventid only. Do not call EMSC EventID (no CORS). */
export async function fetchUsgsDetail(id, { signal } = {}) {
  if (!id || String(id).startsWith('emsc_')) return null;
  const url = `${USGS_FDSN}?format=geojson&eventid=${encodeURIComponent(id)}`;
  const res = await fetchJson(url, { signal });
  if (!res.ok || res.parseError) return null;
  const f = featuresOf(res.data)[0];
  return f ? normalizeUsgs(f) : null;
}
