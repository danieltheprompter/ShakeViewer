import { useEffect, useRef } from 'react';
import { t } from '../lib/i18n.js';
import { ingestFloor } from '../lib/query.js';

export function FilterPopover({ query, onChange, onClose, sheet }) {
  const ref = useRef(null);
  const floor = ingestFloor(query.range);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const focusables = node.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])');
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();
    const onKey = (e) => {
      if (e.key !== 'Tab' || focusables.length === 0) return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    node.addEventListener('keydown', onKey);
    return () => node.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={sheet ? 'popover' : 'popover'} ref={ref} role="dialog" aria-label={t('filters')} style={sheet ? { position: 'relative', width: '100%' } : { top: 36, right: 0 }}>
      <div className="field">
        <label className="label">{t('minimum_magnitude')}</label>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className="mono control">M {Number(query.minmag).toFixed(1)}+</span>
          <span className="meta">{floor.toFixed(1)} – 9.0</span>
        </div>
        <input
          type="range" min={floor} max={9} step={0.1} value={query.minmag}
          aria-label={t('minimum_magnitude')}
          onChange={(e) => onChange({ minmag: Number(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>
      <div className="field">
        <div className="label" style={{ marginBottom: 6 }}>{t('depth_label')}</div>
        <div className="seg">
          {[['all', 'depth_all'], ['shallow', 'depth_shallow'], ['inter', 'depth_intermediate'], ['deep', 'depth_deep']].map(([v, k]) => (
            <button key={v} className={query.depth === v ? 'on' : ''} onClick={() => onChange({ depth: v })}>{t(k)}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <div className="label" style={{ marginBottom: 6 }}>{t('sort_by')}</div>
        <div className="seg">
          {[['time', 'sort_time'], ['mag', 'sort_magnitude']].map(([v, k]) => (
            <button key={v} className={query.sort === v ? 'on' : ''} onClick={() => onChange({ sort: v })}>{t(k)}</button>
          ))}
        </div>
      </div>
      <button className="toggle-row" onClick={() => onChange({ near: query.near ? 0 : 1 })}>
        <span>
          <div className="control">{t('near_me')}</div>
          <div className="meta">{t('within_500')}</div>
        </span>
        <span className={`switch ${query.near ? 'on' : ''}`}><i /></span>
      </button>
      {onClose && !sheet && (
        <div style={{ textAlign: 'right', marginTop: 8 }}>
          <button className="sv-btn" onClick={onClose}>{t('close')}</button>
        </div>
      )}
    </div>
  );
}
