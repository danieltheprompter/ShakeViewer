/** Magnitude fills — dark / light / number color. Do not tint chrome. */
export const MAG_BANDS = [
  { max: 3.5, key: 'minor', dark: '#2FBF7A', light: '#0F9F6E', number: '#ffffff' },
  { max: 4.5, key: 'moderate', dark: '#E0B000', light: '#C48400', number: '#1A1D21' },
  { max: 6.0, key: 'strong', dark: '#E87A1E', light: '#D65A00', number: '#ffffff' },
  { max: Infinity, key: 'major', dark: '#E23B3B', light: '#D92B2B', number: '#ffffff' },
];

export function magBand(mag) {
  const n = Number(mag);
  if (!Number.isFinite(n)) return MAG_BANDS[0];
  return MAG_BANDS.find((b) => n < b.max) || MAG_BANDS[MAG_BANDS.length - 1];
}

export function magFill(mag, theme = 'dark') {
  const b = magBand(mag);
  return theme === 'light' ? b.light : b.dark;
}

export function magNumberColor(mag) {
  return magBand(mag).number;
}

export function magLabelKey(mag) {
  return magBand(mag).key;
}

/** Never call Number#toFixed on null / NaN. */
export function fmtMag(mag, digits = 1) {
  if (mag == null || mag === '') return '—';
  const n = Number(mag);
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(digits);
}

export function markerRadius(mag) {
  const n = Number(mag);
  if (!Number.isFinite(n)) return 5;
  return Math.max(5, Math.min(22, n * 2.4));
}
