import { SvIcon } from './icons.jsx';
import { t } from './i18n.js';

export function ToggleRow({ label, sub, on, onChange }) {
  return (
    <button type="button" className="sv-toggle-row" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <div>
        <div style={{ fontSize: 13, color: 'var(--fg-0)', fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ width: 34, height: 20, borderRadius: 999, background: on ? 'var(--accent)' : 'var(--bg-3)', position: 'relative', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 2, left: on ? 16 : 2, width: 16, height: 16, borderRadius: '50%', background: on ? '#0a0d12' : 'var(--fg-1)' }} />
      </div>
    </button>
  );
}

export function FilterPanel({
  depthFilter, onDepthFilter, minMag, onMinMag, showPlates, onShowPlates,
  nearMeActive, onNearMeActive, nearMeRadius, onNearMeRadius,
  sortType, sortDirection, onToggleSort, mapStyle, onMapStyle, hideMinMag,
}) {
  return (
    <div style={{ padding: '8px 4px 12px' }}>
      {hideMinMag ? (
        <div className="sv-field"><div style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5 }}>{t('custom_mag_hint')}</div></div>
      ) : (
        <div className="sv-field">
          <label className="label" style={{ marginBottom: 6, display: 'block' }} htmlFor="sv-min-mag">{t('minimum_magnitude')}</label>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
            <span className="mono" style={{ fontSize: 13, color: 'var(--fg-1)' }}>M {Number(minMag).toFixed(1)}+</span>
            <span style={{ fontSize: 11, color: 'var(--fg-2)' }}>2.5 – 9.0</span>
          </div>
          <input id="sv-min-mag" type="range" min={2.5} max={9.0} step={0.1} value={minMag}
            onChange={(e) => onMinMag(parseFloat(e.target.value))} aria-label={t('minimum_magnitude')} />
        </div>
      )}
      <div className="sv-field">
        <div className="label" style={{ marginBottom: 6 }}>{t('depth_label')}</div>
        <div className="seg" style={{ width: '100%' }}>
          {[['all', 'depth_all'], ['shallow', 'depth_shallow'], ['intermediate', 'depth_intermediate'], ['deep', 'depth_deep']].map(([v, k]) => (
            <button key={v} type="button" className={depthFilter === v ? 'on' : ''} aria-pressed={depthFilter === v}
              onClick={() => onDepthFilter(v)} style={{ flex: 1 }}>{t(k)}</button>
          ))}
        </div>
      </div>
      <div className="sv-field">
        <div className="label" style={{ marginBottom: 6 }}>{t('sort_by')}</div>
        <div className="seg" style={{ width: '100%' }}>
          {['time', 'mag'].map((v) => (
            <button key={v} type="button" className={sortType === v ? 'on' : ''} aria-pressed={sortType === v}
              onClick={() => onToggleSort(v)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              {v === 'time' ? t('sort_time') : t('sort_magnitude')}
              {sortType === v && <SvIcon name={sortDirection === 'desc' ? 'arrow-down' : 'arrow-up'} size={12} />}
            </button>
          ))}
        </div>
      </div>
      <div className="sv-field">
        <div className="label" style={{ marginBottom: 6 }}>{t('map_style')}</div>
        <div className="seg" style={{ width: '100%' }}>
          {[['dark', 'style_dark'], ['light', 'style_light'], ['satellite', 'style_satellite']].map(([v, k]) => (
            <button key={v} type="button" className={mapStyle === v ? 'on' : ''} aria-pressed={mapStyle === v}
              onClick={() => onMapStyle(v)} style={{ flex: 1 }}>{t(k)}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: '0 20px' }}>
        <ToggleRow label={t('plate_boundaries')} sub={t('overlay_plates')} on={showPlates} onChange={onShowPlates} />
        <ToggleRow label={t('near_me')} sub={t('within_km', { n: nearMeRadius })} on={nearMeActive} onChange={onNearMeActive} />
        {nearMeActive && (
          <div style={{ padding: '4px 0 10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
              <span className="label" style={{ fontSize: 10 }}>{t('radius')}</span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--fg-1)' }}>{nearMeRadius} km</span>
            </div>
            <input type="range" min={100} max={2000} step={50} value={nearMeRadius}
              onChange={(e) => onNearMeRadius(parseInt(e.target.value, 10))} aria-label={t('radius')} />
          </div>
        )}
      </div>
    </div>
  );
}

export function CustomSearchPanel({ start, end, minMag, onStart, onEnd, onMinMag, onDraw, isDrawing, searchBounds, onClearBounds, onClear, onRun, loading }) {
  return (
    <div style={{ padding: '8px 20px 16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label className="label" style={{ marginBottom: 4, display: 'block' }} htmlFor="sv-start">{t('start_date')}</label>
          <input id="sv-start" type="date" className="sv-input" value={start} onChange={(e) => onStart(e.target.value)} max={end} />
        </div>
        <div>
          <label className="label" style={{ marginBottom: 4, display: 'block' }} htmlFor="sv-end">{t('end_date')}</label>
          <input id="sv-end" type="date" className="sv-input" value={end} onChange={(e) => onEnd(e.target.value)} min={start} />
        </div>
      </div>
      <div className="sv-field">
        <label className="label" style={{ marginBottom: 6, display: 'block' }} htmlFor="sv-custom-mag">{t('min_magnitude')}</label>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className="mono" style={{ fontSize: 13 }}>M {Number(minMag).toFixed(1)}+</span>
        </div>
        <input id="sv-custom-mag" type="range" min={2.5} max={9.0} step={0.1} value={minMag}
          onChange={(e) => onMinMag(parseFloat(e.target.value))} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        <button type="button" className={`sv-btn ${isDrawing ? 'primary' : 'ghost'}`} onClick={onDraw} aria-pressed={isDrawing}>
          {isDrawing ? t('draw_cancel') : (searchBounds ? t('boundary_selected_redraw') : t('draw_search_area'))}
        </button>
        {searchBounds && <button type="button" className="sv-btn" onClick={onClearBounds}>{t('clear_boundary')}</button>}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" className="sv-btn primary" onClick={onRun} disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
          {loading ? t('searching') : t('run_search')}
        </button>
        <button type="button" className="sv-btn" onClick={onClear}>{t('clear')}</button>
      </div>
    </div>
  );
}
