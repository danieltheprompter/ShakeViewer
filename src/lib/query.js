/** URL query is the app state. One minmag. Custom is range=custom + start/end. */

import { fmtMag } from './mag.js';
import { customDefaultWindow, parseQueryInstant } from './time.js';

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

function parseBboxFields(p) {
  const raw = p.get('bbox');
  if (raw) {
    const parts = raw.split(',').map((s) => Number(String(s).trim()));
    if (parts.length === 4 && parts.every(Number.isFinite)) {
      const [west, south, east, north] = parts;
      return {
        minlon: west,
        minlat: south,
        maxlon: east,
        maxlat: north,
      };
    }
  }
  return {
    minlat: num(p.get('minlat')),
    maxlat: num(p.get('maxlat')),
    minlon: num(p.get('minlon')),
    maxlon: num(p.get('maxlon')),
  };
}

export function parseQuery(search, pathEventId, theme = 'dark', now = Date.now()) {
  const p = search instanceof URLSearchParams ? search : new URLSearchParams(search || '');
  const range = RANGES.has(p.get('range')) ? p.get('range') : '24h';
  const depth = DEPTHS.has(p.get('depth')) ? p.get('depth') : 'all';
  const sort = SORTS.has(p.get('sort')) ? p.get('sort') : 'time';
  const rawMap = p.get('map');
  const map = MAPS.has(rawMap) ? rawMap : defaultMapStyle(theme);
  const minmag = clampMinmag(range, num(p.get('minmag')) ?? ingestFloor(range));
  const box = parseBboxFields(p);
  let start = p.get('start') || null;
  let end = p.get('end') || null;
  if (range === 'custom' && (!start || !end)) {
    const d = customDefaultWindow(new Date(now));
    start = start || d.start;
    end = end || d.end;
  }
  return {
    range,
    start,
    end,
    minmag,
    maxmag: num(p.get('maxmag')),
    depth,
    sort,
    plates: flag(p.get('plates'), 0),
    near: flag(p.get('near'), 0),
    map,
    minlat: box.minlat,
    maxlat: box.maxlat,
    minlon: box.minlon,
    maxlon: box.maxlon,
    event: pathEventId || p.get('event') || null,
    draw: flag(p.get('draw'), 0),
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
  if (q.event) p.set('event', q.event);
  const themeMap = defaultMapStyle(theme);
  const map = q.map || themeMap;
  if (!omitDefaults || map === 'satellite' || map !== themeMap) p.set('map', map);
  if (range === 'custom') {
    const b = bboxOf(q);
    if (b) p.set('bbox', `${b.minLon},${b.minLat},${b.maxLon},${b.maxLat}`);
  }
  return p;
}

export function queryString(q, theme = 'dark') {
  const s = serializeQuery(q, { theme }).toString();
  return s ? `?${s}` : '';
}

export function bboxOf(q) {
  if (!q || q.minlat == null || q.maxlat == null || q.minlon == null || q.maxlon == null) return null;
  return {
    minLat: Math.min(q.minlat, q.maxlat),
    maxLat: Math.max(q.minlat, q.maxlat),
    minLon: Math.min(q.minlon, q.maxlon),
    maxLon: Math.max(q.minlon, q.maxlon),
  };
}

export function clearBboxPatch() {
  return { minlat: null, maxlat: null, minlon: null, maxlon: null };
}

export function enterRange(range, now = new Date()) {
  if (range === 'custom') {
    const { start, end } = customDefaultWindow(now);
    return { range: 'custom', start, end, minmag: ingestFloor('custom'), ...clearBboxPatch() };
  }
  return { range, start: null, end: null, minmag: ingestFloor(range), ...clearBboxPatch() };
}

export function applyBboxPatch(b) {
  if (!b) return clearBboxPatch();
  return {
    minlat: b.minLat,
    maxlat: b.maxLat,
    minlon: b.minLon,
    maxlon: b.maxLon,
  };
}

/** Selected Custom chip: `Aug 18–25 · M4.0+` plus ` · area` when a bbox is set. */
export function customChipLabel(query, lang = 'en', areaWord = 'area') {
  const start = parseQueryInstant(query?.start) || new Date();
  const end = parseQueryInstant(query?.end) || new Date();
  const mag = `M${fmtMag(query?.minmag ?? 4)}+`;
  const startMonth = start.toLocaleDateString(lang, { month: 'short' });
  let dates;
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    if (start.getDate() === end.getDate()) dates = `${startMonth} ${start.getDate()}`;
    else dates = `${startMonth} ${start.getDate()}–${end.getDate()}`;
  } else {
    const endFmt = end.toLocaleDateString(lang, { month: 'short', day: 'numeric' });
    dates = `${startMonth} ${start.getDate()}–${endFmt}`;
  }
  const area = bboxOf(query) ? ` · ${areaWord}` : '';
  return `${dates} · ${mag}${area}`;
}
