import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { localTimeZoneName, isoDate } from '../lib/time.js';
import { getLang, t } from '../lib/i18n.js';
import { queryString } from '../lib/query.js';
import { Icon } from './Icons.jsx';

export function SearchPage({ theme }) {
  const nav = useNavigate();
  const tz = localTimeZoneName(getLang());
  const [place, setPlace] = useState('');
  const [hits, setHits] = useState([]);
  const [start, setStart] = useState(() => isoDate(new Date(Date.now() - 86400000)));
  const [end, setEnd] = useState(() => isoDate());
  const [minmag, setMinmag] = useState(4.0);
  const [maxmag, setMaxmag] = useState('');
  const [depth, setDepth] = useState('all');
  const [bbox, setBbox] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') nav('/'); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nav]);

  const lookup = async () => {
    const q = place.trim();
    if (!q) return;
    setBusy(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`;
      const r = await fetch(url);
      const data = await r.json();
      setHits(Array.isArray(data) ? data : []);
    } catch {
      setHits([]);
    } finally {
      setBusy(false);
    }
  };

  const applyHit = (h) => {
    const south = Number(h.boundingbox?.[0]);
    const north = Number(h.boundingbox?.[1]);
    const west = Number(h.boundingbox?.[2]);
    const east = Number(h.boundingbox?.[3]);
    if ([south, north, west, east].every(Number.isFinite)) {
      setBbox({ minLat: south, maxLat: north, minLon: west, maxLon: east });
    }
    setPlace(h.display_name || place);
    setHits([]);
  };

  const submit = (e) => {
    e.preventDefault();
    const q = {
      range: 'custom',
      start,
      end,
      minmag,
      maxmag: maxmag === '' ? null : Number(maxmag),
      depth,
      sort: 'time',
      map: theme === 'light' ? 'light' : 'dark',
    };
    if (bbox) {
      q.minlat = bbox.minLat;
      q.maxlat = bbox.maxLat;
      q.minlon = bbox.minLon;
      q.maxlon = bbox.maxLon;
    }
    nav(`/${queryString(q, theme)}`);
  };

  return (
    <div className="search-page">
      <h1 className="header-brand" style={{ marginBottom: 8 }}>{t('custom_search')}</h1>
      <p className="meta">{t('timezone', { tz })}</p>
      <form onSubmit={submit}>
        <div className="field">
          <label className="label">{t('place_search')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="sv-input" value={place} onChange={(e) => setPlace(e.target.value)} placeholder={t('place_or_bbox')} />
            <button type="button" className="sv-btn" onClick={lookup} disabled={busy}>{t('search')}</button>
          </div>
          {hits.map((h) => (
            <button type="button" key={h.place_id} className="sv-btn" style={{ display: 'block', width: '100%', marginTop: 6, textAlign: 'left' }} onClick={() => applyHit(h)}>
              {h.display_name}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label className="label">{t('start_date')}</label>
            <input className="sv-input" type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
          </div>
          <div className="field">
            <label className="label">{t('end_date')}</label>
            <input className="sv-input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} required />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label className="label">{t('min_magnitude')}</label>
            <input className="sv-input" type="number" min={1} max={9} step={0.1} value={minmag} onChange={(e) => setMinmag(Number(e.target.value))} />
          </div>
          <div className="field">
            <label className="label">{t('max_magnitude')}</label>
            <input className="sv-input" type="number" min={1} max={9} step={0.1} value={maxmag} onChange={(e) => setMaxmag(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <div className="label" style={{ marginBottom: 6 }}>{t('depth_label')}</div>
          <div className="seg">
            {[['all', 'depth_all'], ['shallow', 'depth_shallow'], ['inter', 'depth_intermediate'], ['deep', 'depth_deep']].map(([v, k]) => (
              <button type="button" key={v} className={depth === v ? 'on' : ''} onClick={() => setDepth(v)}>{t(k)}</button>
            ))}
          </div>
        </div>
        {bbox && (
          <p className="meta">
            {bbox.minLat.toFixed(2)}, {bbox.minLon.toFixed(2)} → {bbox.maxLat.toFixed(2)}, {bbox.maxLon.toFixed(2)}
            <button type="button" className="sv-btn" style={{ marginLeft: 8 }} onClick={() => setBbox(null)}>{t('clear_boundary')}</button>
          </p>
        )}
        <button type="submit" className="sv-btn primary"><Icon name="search" size={14} /> {t('run_search')}</button>
      </form>
    </div>
  );
}
