import { Fragment, useEffect, useRef, useState } from 'react';
import { SvIcon } from './icons.jsx';
import { t } from './i18n.js';
import { FilterPanel, CustomSearchPanel } from './filters.jsx';
import { QuakeList } from './list.jsx';
import { QuakeDetail } from './detail.jsx';

const SNAPS = { peek: 110, half: 0.55, full: 0.92 };
const snapPx = (snap, vh) => (typeof SNAPS[snap] === 'number' && SNAPS[snap] > 1 ? SNAPS[snap] : Math.round(vh * SNAPS[snap]));

export function MobileSheet({
  snap, onSnap, quakes, selectedId, onSelect, timeRange, onTimeRange,
  stats, loading, fetchError, onRefresh, filters, selectedQuake,
  bookmarks, onBookmark, onShare, onCloseDetail, filtersOpen, onCloseFilters,
  customState, customActions, userLocation, emptyMsg,
}) {
  const dragState = useRef(null);
  const [vh, setVh] = useState(window.innerHeight);
  const [dragY, setDragY] = useState(null);
  useEffect(() => {
    const onR = () => setVh(window.innerHeight);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);
  const height = dragY != null ? dragY : snapPx(snap, vh);

  const onPD = (e) => {
    dragState.current = { y0: e.clientY, h0: height, moved: false, lastY: e.clientY, lastT: Date.now(), vy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPM = (e) => {
    if (!dragState.current) return;
    const dy = dragState.current.y0 - e.clientY;
    if (Math.abs(dy) > 4) dragState.current.moved = true;
    const now = Date.now();
    const dt = Math.max(1, now - dragState.current.lastT);
    dragState.current.vy = (dragState.current.lastY - e.clientY) / dt;
    dragState.current.lastY = e.clientY;
    dragState.current.lastT = now;
    setDragY(Math.max(90, Math.min(vh * 0.95, dragState.current.h0 + dy)));
  };
  const onPU = () => {
    if (!dragState.current) return;
    const h = dragY ?? height;
    const moved = dragState.current.moved;
    const vy = dragState.current.vy;
    dragState.current = null;
    setDragY(null);
    if (!moved) { onSnap(snap === 'full' ? 'peek' : 'full'); return; }
    const peekH = snapPx('peek', vh), halfH = snapPx('half', vh), fullH = snapPx('full', vh);
    let target;
    if (vy > 0.6) target = h < halfH ? 'half' : 'full';
    else if (vy < -0.6) target = h > halfH ? 'half' : 'peek';
    else {
      const opts = [['peek', peekH], ['half', halfH], ['full', fullH]];
      let best = opts[0], bestD = Infinity;
      opts.forEach((o) => { const d = Math.abs(o[1] - h); if (d < bestD) { bestD = d; best = o; } });
      target = best[0];
    }
    onSnap(target);
  };

  return (
    <div className="sv-sheet" style={{ height: `${height}px`, transition: dragY != null ? 'none' : 'height 0.32s cubic-bezier(.4,.0,.2,1)' }}
      role="dialog" aria-modal="false" aria-label={t('live_feed')}>
      <div className="sv-sheet-grip" onPointerDown={onPD} onPointerMove={onPM} onPointerUp={onPU} onPointerCancel={onPU}>
        <div className="sv-sheet-grip-bar" />
      </div>
      <div className="sv-sheet-body">
        {filtersOpen ? (
          <Fragment>
            <div className="sv-sheet-header">
              <h3 className="display" style={{ fontSize: 22, margin: 0 }}>{t('filters')}</h3>
              <button type="button" className="sv-btn" onClick={onCloseFilters} style={{ padding: 8 }} aria-label={t('close')}>
                <SvIcon name="close" size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ padding: '8px 20px 12px' }}>
                <div className="label" style={{ marginBottom: 6 }}>{t('time_range')}</div>
                <div className="seg" style={{ width: '100%' }}>
                  {[['day', 'time_24h'], ['week', 'time_7d'], ['month', 'time_30d'], ['custom', 'time_custom']].map(([v, k]) => (
                    <button key={v} type="button" className={timeRange === v ? 'on' : ''} aria-pressed={timeRange === v}
                      onClick={() => onTimeRange(v)} style={{ flex: 1 }}>{t(k)}</button>
                  ))}
                </div>
              </div>
              {timeRange === 'custom' && <CustomSearchPanel {...customState} {...customActions} loading={loading} />}
              <FilterPanel {...filters} />
            </div>
          </Fragment>
        ) : selectedQuake ? (
          <QuakeDetail quake={selectedQuake} onClose={onCloseDetail} onBookmark={onBookmark} onShare={onShare}
            bookmarked={bookmarks.has(selectedQuake.id)} userLocation={userLocation} />
        ) : (
          <Fragment>
            <div className="sv-sheet-header">
              <div>
                <div className="label">{t('live_feed')}</div>
                <h3 className="display" style={{ fontSize: 22, margin: '2px 0 0', lineHeight: 1 }}>
                  {stats.total} · M {stats.maxMag}
                </h3>
              </div>
              <button type="button" className="sv-btn" onClick={onRefresh} aria-label={t('refresh')}>
                <SvIcon name="refresh" size={16} className={loading ? 'spin' : ''} />
              </button>
            </div>
            {fetchError && <div className="error-banner" role="alert"><SvIcon name="alert" size={14} />{fetchError}</div>}
            <div className="sv-list-scroll" role="list" aria-label={t('event_list')}>
              <QuakeList quakes={quakes} selectedId={selectedId} onSelect={onSelect}
                bookmarks={bookmarks} onBookmark={onBookmark} onShare={onShare} emptyMsg={emptyMsg} />
            </div>
          </Fragment>
        )}
      </div>
    </div>
  );
}
