import { useEffect, useRef, useState } from 'react';
import { t } from '../lib/i18n.js';
import { Icon } from './Icons.jsx';

const DETENTS = { peek: 0.22, default: 0.58, full: 0.92 };

export function BottomSheet({ detent, onDetent, children, mapMode }) {
  const [vh, setVh] = useState(() => window.innerHeight);
  const drag = useRef(null);
  const [h, setH] = useState(null);

  useEffect(() => {
    const onR = () => setVh(window.innerHeight);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);

  const target = Math.round(vh * (DETENTS[detent] || DETENTS.default));
  const height = h ?? target;

  const onDown = (e) => {
    drag.current = { y0: e.clientY, h0: height };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    if (!drag.current) return;
    const next = Math.max(90, Math.min(vh * 0.95, drag.current.h0 + (drag.current.y0 - e.clientY)));
    setH(next);
  };
  const onUp = () => {
    if (!drag.current) return;
    const cur = h ?? height;
    drag.current = null;
    setH(null);
    const peek = vh * DETENTS.peek;
    const def = vh * DETENTS.default;
    const full = vh * DETENTS.full;
    const opts = [['peek', peek], ['default', def], ['full', full]];
    let best = 'default'; let bestD = Infinity;
    opts.forEach(([k, v]) => { const d = Math.abs(v - cur); if (d < bestD) { bestD = d; best = k; } });
    onDetent(best);
  };

  return (
    <div className="sheet" style={{ height, paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))', transition: h != null ? 'none' : 'height 0.2s ease' }}>
      <div className="sheet-handle" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <span />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

export function MapListPill({ mode, onMode }) {
  return (
    <div className="pill-nav">
      <button className={mode === 'map' ? 'on' : ''} onClick={() => onMode('map')}><Icon name="map" size={14} /> {t('map')}</button>
      <button className={mode === 'list' ? 'on' : ''} onClick={() => onMode('list')}><Icon name="list" size={14} /> {t('list')}</button>
    </div>
  );
}
