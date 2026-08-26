import { SvIcon } from './icons.jsx';
import { t } from './i18n.js';
import { getMagnitudeHex, getMagnitudeLabel, getDistance } from './data.js';
import { formatAbsTime, formatRelTime } from './list.jsx';

export function QuakeDetail({ quake, onClose, onBookmark, onShare, bookmarked, userLocation }) {
  if (!quake) return null;
  const { mag, place, time, felt, url } = quake.properties;
  const [lng, lat, depth] = quake.geometry.coordinates;
  const color = getMagnitudeHex(mag);
  const label = t(getMagnitudeLabel(mag));
  const depthKey = Math.abs(depth) < 70 ? 'shallow' : Math.abs(depth) < 300 ? 'intermediate' : 'deep';
  const dist = userLocation ? getDistance(userLocation.lat, userLocation.lng, lat, lng) : null;

  return (
    <div className="quake-detail sv-enter">
      <div className="qd-header">
        <button type="button" className="sv-btn" onClick={onClose} style={{ padding: 6 }} aria-label={t('back')}>
          <SvIcon name="chevron-left" size={18} />
          <span style={{ fontSize: 13 }}>{t('back')}</span>
        </button>
        <div style={{ display: 'flex', gap: 4 }}>
          <button type="button" className="sv-btn" onClick={() => onBookmark(quake)}
            style={{ color: bookmarked ? 'var(--accent)' : 'var(--fg-2)', padding: 8 }}
            aria-label={t('bookmarks')} aria-pressed={!!bookmarked}>
            <SvIcon name={bookmarked ? 'bookmark-filled' : 'bookmark'} size={16} />
          </button>
          <button type="button" className="sv-btn" onClick={() => onShare(quake)} style={{ padding: 8 }} aria-label={t('copy_link')}>
            <SvIcon name="link" size={16} />
          </button>
        </div>
      </div>
      <div className="qd-hero">
        <div className="qd-mag-stamp" style={{ background: color }}>
          <span className="display" style={{ fontSize: 64, lineHeight: 0.9, color: '#0a0d12' }}>{Number(mag).toFixed(1)}</span>
        </div>
        <div className="qd-meta">
          <div className="label" style={{ color }}>{label} · M {Number(mag).toFixed(1)}</div>
          <h2 className="display" style={{ fontSize: 28, margin: '6px 0 12px', lineHeight: 1.15, color: 'var(--fg-0)' }}>
            {place || t('unknown_region')}
          </h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="chip"><SvIcon name="history" size={11} />{formatAbsTime(time)} · {formatRelTime(time)}</span>
            <span className="chip">{quake.source || 'USGS'}</span>
            {quake.properties.tsunami ? <span className="chip" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', borderColor: 'rgba(239,68,68,0.35)' }}>{t('tsunami_watch')}</span> : null}
          </div>
        </div>
      </div>
      <div className="qd-grid">
        {statCell(t('shallow') && t(depthKey === 'shallow' ? 'shallow' : depthKey), `${Math.abs(depth).toFixed(1)} km`, t(depthKey))}
        {statCell(t('coordinates'), `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? 'N' : 'S'}`, null)}
        {statCell(' ', `${Math.abs(lng).toFixed(3)}°${lng >= 0 ? 'E' : 'W'}`, null)}
        {statCell(t('felt_reports'), felt > 0 ? (felt > 1000 ? `${(felt / 1000).toFixed(1)}k` : String(felt)) : '—', felt > 0 ? t('people_reported') : null)}
      </div>
      {dist != null && (
        <div style={{ padding: '0 24px 12px', fontSize: 13, color: 'var(--fg-2)' }}>
          {t('distance')}: {Math.round(dist)} km {t('from_you')}
        </div>
      )}
      <div style={{ padding: '0 24px 24px' }}>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="sv-btn ghost" style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}>
            <SvIcon name="link" size={14} />
            {t('full_report_on', { source: quake.source || 'USGS' })}
          </a>
        )}
      </div>
    </div>
  );
}

function statCell(label, value, sub) {
  return (
    <div className="stat-cell" key={label + value}>
      <div className="label" style={{ fontSize: 9.5 }}>{label}</div>
      <div className="mono" style={{ fontSize: 20, color: 'var(--fg-0)', marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
