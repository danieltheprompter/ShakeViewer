import { SvIcon } from './icons.jsx';
import { t, currentLang } from './i18n.js';
import { getMagnitudeHex } from './data.js';

export function formatRelTime(ts) {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return t('ago_s', { n: Math.floor(d) });
  if (d < 3600) return t('ago_m', { n: Math.floor(d / 60) });
  if (d < 86400) return t('ago_h', { n: Math.floor(d / 3600) });
  return t('ago_d', { n: Math.floor(d / 86400) });
}

export function formatAbsTime(ts) {
  return new Date(ts).toLocaleString(currentLang, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });
}

export function formatCoord(lat, lng) {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}  ${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`;
}

function QuakeRow({ quake, selected, onClick, onBookmark, onShare, bookmarked }) {
  const { mag, place, time, felt } = quake.properties;
  const [lng, lat, depth] = quake.geometry.coordinates;
  const color = getMagnitudeHex(mag);
  return (
    <div className={`row ${selected ? 'selected' : ''}`} onClick={() => onClick(quake)}
      role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(quake); } }}>
      <div className="mag" style={{ background: color, color: '#0a0d12' }}>{Number(mag).toFixed(1)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--fg-0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
            {place || t('unknown_region')}
          </div>
          <span className="mono" style={{ fontSize: 11, color: 'var(--fg-2)', flexShrink: 0 }}>{formatRelTime(time)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: 'var(--fg-2)' }}>
          <span className="mono">{Math.abs(depth).toFixed(1)} km</span>
          <span className="mono">{formatCoord(lat, lng)}</span>
          {felt > 0 && <span style={{ color: 'var(--fg-1)' }}>{felt > 1000 ? `${(felt / 1000).toFixed(1)}k` : felt} {t('felt_row')}</span>}
        </div>
      </div>
      <div className="row-actions" style={{ display: 'flex', gap: 4, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
        {onBookmark && (
          <button type="button" className="sv-btn" style={{ padding: 6, color: bookmarked ? 'var(--accent)' : 'var(--fg-2)' }}
            onClick={() => onBookmark(quake)} aria-label={t('bookmarks')} aria-pressed={!!bookmarked}>
            <SvIcon name={bookmarked ? 'bookmark-filled' : 'bookmark'} size={15} />
          </button>
        )}
        {onShare && (
          <button type="button" className="sv-btn" style={{ padding: 6, color: 'var(--fg-2)' }}
            onClick={() => onShare(quake)} aria-label={t('copy_link')}>
            <SvIcon name="link" size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

export function QuakeList({ quakes, selectedId, onSelect, bookmarks, onBookmark, onShare, emptyMsg }) {
  if (!quakes.length) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--fg-2)', fontSize: 13 }}>
        {emptyMsg || t('no_match')}
      </div>
    );
  }
  return (
    <div className="sv-list">
      {quakes.map((q) => (
        <QuakeRow key={q.id} quake={q} selected={q.id === selectedId} onClick={onSelect}
          onBookmark={onBookmark} onShare={onShare} bookmarked={bookmarks && bookmarks.has(q.id)} />
      ))}
    </div>
  );
}
