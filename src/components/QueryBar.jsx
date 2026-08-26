import { fmtMag } from '../lib/mag.js';
import { t } from '../lib/i18n.js';
import { Icon } from './Icons.jsx';
import { RangeChips } from './RangeChips.jsx';
import { CustomStrip } from './CustomStrip.jsx';
import { StatusLive, QueryProgress } from './StatusLive.jsx';

export function QueryBar({
  statusKind, seconds, stats, query, onRange, onChange, onOpenFilters, filtersOpen,
  refreshing, firstLoad, starredOn, onToggleStarred, showStarred, sourceChip,
  drawing, onToggleDraw,
}) {
  const line = t('stats_line', {
    n: stats.total,
    mag: stats.maxMag == null ? '—' : fmtMag(stats.maxMag),
    strong: stats.strong,
  });
  return (
    <div className="sv-querybar">
      <div className="sv-querybar-top">
        <StatusLive kind={statusKind} seconds={seconds} />
        <button className={`sv-btn ${filtersOpen ? 'primary' : ''}`} onClick={onOpenFilters} aria-expanded={filtersOpen}>
          <Icon name="filter" size={14} /> {t('filters')}
        </button>
      </div>
      <div className="sv-querybar-stats stats" title={line}>{line}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <RangeChips range={query.range} query={query} onChange={onRange} />
        {showStarred && (
          <button className={`chip ${starredOn ? 'on' : ''}`} onClick={onToggleStarred}>{t('starred')}</button>
        )}
        {sourceChip && <span className="meta">{sourceChip}</span>}
      </div>
      {query.range === 'custom' && (
        <CustomStrip query={query} onChange={onChange} drawing={drawing} onToggleDraw={onToggleDraw} />
      )}
      <QueryProgress active={refreshing && !firstLoad} />
    </div>
  );
}
