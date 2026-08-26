import { haversineKm, formatCoord } from '../lib/geo.js';
import { formatAbsLocal, formatUtc } from '../lib/time.js';
import { getLang, t } from '../lib/i18n.js';
import { Icon } from './Icons.jsx';
import { MagBadge } from './MagBadge.jsx';
import { EventRow } from './EventRow.jsx';

export function EventDetail({
  quake, onBack, onBookmark, onShare, bookmarked, signedIn, theme, nearby = [],
  onSelectNearby, userLocation,
}) {
  if (!quake) return null;
  const depth = Number.isFinite(quake.depthKm) ? quake.depthKm.toFixed(1) : null;
  const showAlert = quake.mag != null && quake.mag >= 4.5;
  const felt = quake.felt != null && quake.felt > 0 ? quake.felt : null;
  const distance = userLocation
    ? Math.round(haversineKm(userLocation.lat, userLocation.lng, quake.lat, quake.lon))
    : null;
  return (
    <div className="detail">
      <div className="detail-head">
        <button className="sv-btn" onClick={onBack} aria-label={t('back')}>
          <Icon name="chevron-left" size={18} /> {t('back')}
        </button>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="sv-btn icon" onClick={() => onBookmark(quake)} aria-label={signedIn ? t('bookmarks') : t('sign_in_to_bookmark')}>
            <Icon name="bookmark" filled={bookmarked} size={16} />
          </button>
          <button className="sv-btn icon" onClick={() => onShare(quake)} aria-label={t('copy_link')}>
            <Icon name="link" size={16} />
          </button>
        </div>
      </div>
      <div className="detail-body">
        <MagBadge mag={quake.mag} size="detail" theme={theme} />
        <div className="detail-place">{quake.place || t('unknown_region')}</div>
        <div className="detail-time">{formatAbsLocal(quake.time, getLang())}</div>
        <div className="detail-time meta">{formatUtc(quake.time)}</div>
        {depth != null && (
          <p className="meta" style={{ marginTop: 12 }}>
            {t('depth_km', { n: depth })} · {quake.source === 'BOTH' ? 'USGS · EMSC' : quake.source}
            {quake.magType ? ` · ${quake.magType}` : ''}
          </p>
        )}
        <p className="meta">{formatCoord(quake.lat, quake.lon, 3)}</p>
        {felt != null && <p className="meta">{t('felt_reports')}: {felt}</p>}
        {distance != null && <p className="meta">{t('distance_row')}: {distance} km</p>}
        {quake.tsunami === 1 && <p className="meta">{t('tsunami_watch')}</p>}
        {showAlert && <p className="meta" style={{ marginTop: 12 }}>{t('alert_disclaimer')}</p>}
        {quake.url && (
          <p style={{ marginTop: 12 }}>
            <a href={quake.url} target="_blank" rel="noopener noreferrer">{t('full_report_on', { source: quake.ids?.usgs ? 'USGS' : 'EMSC' })}</a>
          </p>
        )}
        {nearby.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div className="label">{t('nearby')}</div>
            {nearby.map((q) => (
              <EventRow
                key={q.id} quake={q} selected={false} bookmarked={false}
                onSelect={onSelectNearby} onBookmark={onBookmark} onShare={onShare}
                signedIn={signedIn} theme={theme}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function nearbyOf(quake, list, n = 5) {
  if (!quake) return [];
  return list
    .filter((q) => q.id !== quake.id)
    .map((q) => ({ q, d: haversineKm(quake.lat, quake.lon, q.lat, q.lon) }))
    .filter((x) => x.d <= 500)
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.q);
}
