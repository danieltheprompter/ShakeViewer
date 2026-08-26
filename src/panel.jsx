import { Fragment, useState } from 'react';
import { SvIcon } from './icons.jsx';
import { t } from './i18n.js';
import { FilterPanel, CustomSearchPanel } from './filters.jsx';
import { QuakeList, formatRelTime } from './list.jsx';
import { QuakeDetail } from './detail.jsx';

function Stat({ k, v }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 22, color: 'var(--fg-0)', fontWeight: 500 }}>{v}</div>
      <div className="label" style={{ fontSize: 9.5, marginTop: 2 }}>{k}</div>
    </div>
  );
}

function CollapsibleSection({ label, icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="sv-collapsible">
      <button type="button" className="sv-collapsible-header" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon && <SvIcon name={icon} size={14} style={{ color: 'var(--fg-2)' }} />}
          <span className="label">{label}</span>
        </span>
        <SvIcon name={open ? 'chevron-up' : 'chevron-down'} size={14} style={{ color: 'var(--fg-2)' }} />
      </button>
      {open && <div className="sv-collapsible-body">{children}</div>}
    </div>
  );
}

export function DesktopPanel({
  quakes, selectedId, onSelect, timeRange, stats, loading, lastUpdated, fetchError, onRefresh,
  filters, selectedQuake, bookmarks, onBookmark, onShare, onCloseDetail,
  expanded, onToggleExpanded, customState, customActions, userLocation, emptyMsg, floorNote,
}) {
  return (
    <aside className={`sv-panel ${expanded ? '' : 'collapsed'} ${selectedQuake ? 'detail-mode' : ''}`} aria-label={t('event_list')}>
      <div className="sv-panel-inner">
        {selectedQuake ? (
          <QuakeDetail quake={selectedQuake} onClose={onCloseDetail} onBookmark={onBookmark} onShare={onShare}
            bookmarked={bookmarks.has(selectedQuake.id)} userLocation={userLocation} />
        ) : (
          <Fragment>
            <div className="sv-hero">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span className="label">{t('live_feed')}</span>
                <span className="mono" style={{ fontSize: 11, color: loading ? 'var(--fg-3)' : 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: loading ? 'var(--fg-3)' : 'var(--accent)' }} />
                  {loading ? t('loading') : (lastUpdated ? formatRelTime(lastUpdated) : t('live'))}
                </span>
              </div>
              <div className="sv-stats">
                <Stat k={t('events')} v={loading && !quakes.length ? '…' : stats.total} />
                <Stat k={t('largest')} v={loading && !quakes.length ? '…' : `M ${stats.maxMag}`} />
                <Stat k={t('significant')} v={loading && !quakes.length ? '…' : stats.significant} />
              </div>
              {floorNote && <div style={{ fontSize: 11, color: 'var(--fg-2)', marginTop: 10 }}>{floorNote}</div>}
            </div>
            <div className="hairline" />
            {fetchError && <div className="error-banner" role="alert"><SvIcon name="alert" size={14} />{fetchError}</div>}
            {timeRange === 'custom' && (
              <Fragment>
                <CollapsibleSection label={t('custom_search')} icon="search" defaultOpen>
                  <CustomSearchPanel {...customState} {...customActions} loading={loading} />
                </CollapsibleSection>
                <div className="hairline" />
              </Fragment>
            )}
            <CollapsibleSection label={t('filters')} icon="filter" defaultOpen>
              <FilterPanel {...filters} />
            </CollapsibleSection>
            <div className="hairline" />
            <div className="sv-list-header">
              <span className="label">{timeRange === 'custom' ? t('results', { n: quakes.length }) : t('recent_activity')}</span>
              {loading && <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{t('refreshing')}</span>}
            </div>
            <div className="sv-list-scroll" role="list" aria-label={t('event_list')}>
              <QuakeList quakes={quakes} selectedId={selectedId} onSelect={onSelect}
                bookmarks={bookmarks} onBookmark={onBookmark} onShare={onShare} emptyMsg={emptyMsg} />
            </div>
          </Fragment>
        )}
      </div>
      <button type="button" className="sv-panel-handle" onClick={onToggleExpanded}
        title={expanded ? t('collapse_panel') : t('expand_panel')}
        aria-label={expanded ? t('collapse_panel') : t('expand_panel')} aria-expanded={expanded}>
        <SvIcon name={expanded ? 'chevron-left' : 'chevron-right'} size={14} />
      </button>
    </aside>
  );
}
