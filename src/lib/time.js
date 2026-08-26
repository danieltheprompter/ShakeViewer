export function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function formatRelTime(ts, t) {
  if (!ts) return '';
  const d = Math.max(0, (Date.now() - ts) / 1000);
  if (d < 60) return t('ago_s', { n: Math.floor(d) });
  if (d < 3600) return t('ago_m', { n: Math.floor(d / 60) });
  if (d < 86400) return t('ago_h', { n: Math.floor(d / 3600) });
  return t('ago_d', { n: Math.floor(d / 86400) });
}

export function formatAbsLocal(ts, lang = 'en') {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString(lang, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return new Date(ts).toISOString();
  }
}

export function formatUtc(ts) {
  if (!ts) return '';
  try {
    const s = new Date(ts).toLocaleString('en-GB', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${s} UTC`;
  } catch {
    return `${new Date(ts).toISOString().slice(11, 16)} UTC`;
  }
}

export function localTimeZoneName(lang = 'en') {
  try {
    const parts = new Intl.DateTimeFormat(lang, { timeZoneName: 'short' }).formatToParts(new Date());
    return parts.find((p) => p.type === 'timeZoneName')?.value || 'local';
  } catch {
    return 'local';
  }
}

export function isoDate(d = new Date()) {
  return new Date(d).toISOString().slice(0, 10);
}

/** Calendar YYYY-MM-DD in the user's timezone (not UTC). */
export function localDateString(d = new Date()) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function parseQueryInstant(iso) {
  if (!iso) return null;
  if (DATE_ONLY.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : new Date(t);
}

export function isoToLocalDate(iso) {
  const d = parseQueryInstant(iso);
  return d ? localDateString(d) : '';
}

/** Start of that local calendar day as UTC ISO. Date-only query strings stay date-only until rewritten. */
export function localDateToStartIso(yyyyMmDd) {
  if (!yyyyMmDd || !DATE_ONLY.test(yyyyMmDd)) return yyyyMmDd || null;
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}

/** End of that local calendar day, or now if the day is today. */
export function localDateToEndIso(yyyyMmDd, now = new Date()) {
  if (!yyyyMmDd || !DATE_ONLY.test(yyyyMmDd)) return yyyyMmDd || null;
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const end = new Date(y, m - 1, d, 23, 59, 59, 999);
  const n = now instanceof Date ? now : new Date(now);
  if (localDateString(n) === yyyyMmDd) return n.toISOString();
  return end.toISOString();
}

export function customDefaultWindow(now = new Date()) {
  const end = now instanceof Date ? now : new Date(now);
  const start = new Date(end.getTime() - 7 * 86400000);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** FDSN start/end: pass through ISO, expand date-only, default now−7d → now. */
export function fdsnTimeRange(start, end, now = Date.now()) {
  const fallback = customDefaultWindow(new Date(now));
  const startIso = !start
    ? fallback.start
    : start.includes('T')
      ? start
      : `${start}T00:00:00`;
  const endIso = !end
    ? fallback.end
    : end.includes('T')
      ? end
      : `${end}T23:59:59`;
  return { startIso, endIso };
}
