/** URL query is the app state. One minmag. Custom is range=custom + start/end. */

export const RANGE_FLOORS = {
  '24h': 2.5,
  '7d': 3.5,
  '30d': 4.5,
  custom: 4.0,
};

export const RANGE_POLL_MS = {
  '24h': 60_000,
  '7d': 300_000,
  '30d': 300_000,
  custom: 0,
};

export const DEFAULT_QUERY = {
  range: '24h',
  start: null,
  end: null,
  minmag: 2.5,
  maxmag: null,
  depth: 'all',
  sort: 'time',
  plates: 0,
  near: 0,
  map: 'dark',
  minlat: null,
  maxlat: null,
  minlon: null,
  maxlon: null,
};

/** Light chrome defaults to Light tiles. Satellite is the only sticky override. */
export function defaultMapStyle(theme) {
  return theme === 'light' ? 'light' : 'dark';
}

const RANGES = new Set(['24h', '7d', '30d', 'custom']);
const DEPTHS = new Set(['all', 'shallow', 'inter', 'deep']);
const SORTS = new Set(['time', 'mag']);
const MAPS = new Set(['dark', 'light', 'satellite']);

function num(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function flag(v, fallback = 0) {
  if (v == null || v === '') return fallback;
  if (v === '1' || v === 'true') return 1;
  if (v === '0' || v === 'false') return 0;
  return fallback;
}

export function ingestFloor(range) {
  return RANGE_FLOORS[range] ?? RANGE_FLOORS['24h'];
}

export function clampMinmag(range, minmag) {
  const floor = ingestFloor(range);
  const n = Number(minmag);
  if (!Number.isFinite(n)) return floor;
  return Math.max(floor, Math.min(9, n));
}

export function parseQuery(search, pathEventId, theme = 'dark') {
  const p = search instanceof URLSearchParams ? search : new URLSearchParams(search || '');
  const range = RANGES.has(p.get('range')) ? p.get('range') : '24h';
  const depth = DEPTHS.has(p.get('depth')) ? p.get('depth') : 'all';
  const sort = SORTS.has(p.get('sort')) ? p.get('sort') : 'time';
  const rawMap = p.get('map');
  const map = MAPS.has(rawMap) ? rawMap : defaultMapStyle(theme);
  const minmag = clampMinmag(range, num(p.get('minmag')) ?? ingestFloor(range));
  return {
    range,
    start: p.get('start') || null,
    end: p.get('end') || null,
    minmag,
    maxmag: num(p.get('maxmag')),
    depth,
    sort,
    plates: flag(p.get('plates'), 0),
    near: flag(p.get('near'), 0),
    map,
    minlat: num(p.get('minlat')),
    maxlat: num(p.get('maxlat')),
    minlon: num(p.get('minlon')),
    maxlon: num(p.get('maxlon')),
    event: pathEventId || p.get('event') || null,
  };
}

export function serializeQuery(q, { omitDefaults = true, theme = 'dark' } = {}) {
  const p = new URLSearchParams();
  const range = q.range || '24h';
  p.set('range', range);
  if (range === 'custom') {
    if (q.start) p.set('start', q.start);
    if (q.end) p.set('end', q.end);
  }
  const floor = ingestFloor(range);
  const minmag = clampMinmag(range, q.minmag ?? floor);
  p.set('minmag', String(minmag));
  if (q.maxmag != null) p.set('maxmag', String(q.maxmag));
  if (!omitDefaults || q.depth !== 'all') p.set('depth', q.depth || 'all');
  if (!omitDefaults || q.sort !== 'time') p.set('sort', q.sort || 'time');
  if (q.plates) p.set('plates', '1');
  if (q.near) p.set('near', '1');
  const themeMap = defaultMapStyle(theme);
  const map = q.map || themeMap;
  if (!omitDefaults || map === 'satellite' || map !== themeMap) p.set('map', map);
  if (q.minlat != null && q.maxlat != null && q.minlon != null && q.maxlon != null) {
    p.set('minlat', String(q.minlat));
    p.set('maxlat', String(q.maxlat));
    p.set('minlon', String(q.minlon));
    p.set('maxlon', String(q.maxlon));
  }
  return p;
}

export function queryString(q, theme = 'dark') {
  const s = serializeQuery(q, { theme }).toString();
  return s ? `?${s}` : '';
}

export function bboxOf(q) {
  if (q.minlat == null || q.maxlat == null || q.minlon == null || q.maxlon == null) return null;
  return {
    minLat: Math.min(q.minlat, q.maxlat),
    maxLat: Math.max(q.minlat, q.maxlat),
    minLon: Math.min(q.minlon, q.maxlon),
    maxLon: Math.max(q.minlon, q.maxlon),
  };
}
