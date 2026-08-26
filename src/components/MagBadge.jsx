import { fmtMag, magFill, magLabelKey, magNumberColor } from '../lib/mag.js';
import { t } from '../lib/i18n.js';

export function MagBadge({ mag, size = 'row', theme = 'dark' }) {
  const fill = magFill(mag, theme);
  const color = magNumberColor(mag);
  return (
    <span className={`mag-badge ${size === 'detail' ? 'lg' : ''}`} style={{ background: fill, color }} aria-hidden="true">
      {fmtMag(mag)}
    </span>
  );
}

export function MagLegend({ theme = 'dark' }) {
  const rows = [
    { mag: 3.0, range: '< 3.5', key: 'minor' },
    { mag: 4.0, range: '3.5 – 4.5', key: 'moderate' },
    { mag: 5.0, range: '4.5 – 6.0', key: 'strong' },
    { mag: 6.2, range: '6.0+', key: 'major' },
  ];
  return (
    <div className="mag-legend" role="note" aria-label={t('legend_magnitude')}>
      <div className="label">{t('legend_magnitude')}</div>
      {rows.map((r) => (
        <div className="mag-legend-row" key={r.key}>
          <span className="swatch" style={{ background: magFill(r.mag, theme) }} />
          <span className="mono">{r.range}</span>
          <span className="name">{t(magLabelKey(r.mag))}</span>
        </div>
      ))}
    </div>
  );
}
