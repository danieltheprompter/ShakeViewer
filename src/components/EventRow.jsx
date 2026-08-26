import { fmtMag } from '../lib/mag.js';
import { formatRelTime, formatAbsLocal } from '../lib/time.js';
import { getLang, t } from '../lib/i18n.js';
import { Icon } from './Icons.jsx';
import { MagBadge } from './MagBadge.jsx';

export function EventRow({ quake, selected, bookmarked, onSelect, onBookmark, onShare, signedIn, theme }) {
  const abs = formatAbsLocal(quake.time, getLang());
  const depth = Number.isFinite(quake.depthKm) ? quake.depthKm.toFixed(1) : '—';
  return (
    <div
      className={`event-row ${selected ? 'selected' : ''}`}
      data-event-id={quake.id}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(quake)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(quake); } }}
    >
      <MagBadge mag={quake.mag} theme={theme} />
      <div className="place" title={quake.place}>{quake.place || t('unknown_region')}</div>
      <button
        className={`sv-btn icon bm ${bookmarked ? 'on' : ''}`}
        aria-label={signedIn ? t('bookmarks') : t('sign_in_to_bookmark')}
        onClick={(e) => { e.stopPropagation(); onBookmark(quake); }}
      >
        <Icon name="bookmark" filled={bookmarked} size={15} />
      </button>
      <div className="sub mono" title={abs}>
        <span>{t('depth_km', { n: depth })}</span>
        <span>·</span>
        <span>{quake.source === 'BOTH' ? 'USGS' : quake.source}</span>
        {quake.felt > 0 && <span>· {quake.felt} {t('felt_row')}</span>}
        <span>· {formatRelTime(quake.time, t)}</span>
      </div>
      <button className="sv-btn icon share" aria-label={t('copy_link')} onClick={(e) => { e.stopPropagation(); onShare(quake); }}>
        <Icon name="link" size={15} />
      </button>
    </div>
  );
}
