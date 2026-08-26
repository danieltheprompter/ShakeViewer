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
