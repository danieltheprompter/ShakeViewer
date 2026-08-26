import { fmtMag, magFill } from '../lib/mag.js';
import { formatAbsLocal, formatRelTime, formatUtc, localTimeZoneName } from '../lib/time.js';
import { getLang, t } from '../lib/i18n.js';
import { Icon } from './Icons.jsx';
import { MagBadge } from './MagBadge.jsx';

function sourceLabel(quake) {
  if (quake.source === 'BOTH') return 'USGS';
  return quake.source || '';
}

export function MapPopup({ quake, theme, onClose }) {
  if (!quake) return null;
  const lang = getLang();
  const tz = localTimeZoneName(lang);
  const rel = formatRelTime(quake.time, t);
  const title = [formatAbsLocal(quake.time, lang), formatUtc(quake.time)].filter(Boolean).join(' · ');
  const depth = Number.isFinite(quake.depthKm) ? `${quake.depthKm.toFixed(1)} km` : null;
  const src = sourceLabel(quake);
  const meta = [depth, src].filter(Boolean).join(' · ');
  return (
    <div className="map-popup">
      <button type="button" className="sv-btn icon map-popup-x" onClick={onClose} aria-label={t('close')}>
        <Icon name="close" size={16} />
      </button>
      <div className="map-popup-mag">
        <MagBadge mag={quake.mag} theme={theme} />
        <span className="mono" style={{ color: magFill(quake.mag, theme), fontWeight: 600 }}>
          {quake.mag == null ? '' : `M ${fmtMag(quake.mag)}`}
        </span>
      </div>
      <div className="map-popup-place" title={quake.place || t('unknown_region')}>
        {quake.place || t('unknown_region')}
      </div>
      <div className="map-popup-meta mono" title={title}>{rel}{tz ? ` · ${tz}` : ''}</div>
      {meta ? <div className="map-popup-meta mono">{meta}</div> : null}
    </div>
  );
}
