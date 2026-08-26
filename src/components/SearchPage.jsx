import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customDefaultWindow, isoToLocalDate, localDateToEndIso, localDateToStartIso, localTimeZoneName } from '../lib/time.js';
import { getLang, t } from '../lib/i18n.js';
import { queryString } from '../lib/query.js';
import { Icon } from './Icons.jsx';

export function SearchPage({ theme }) {
  const nav = useNavigate();
  const tz = localTimeZoneName(getLang());
  const defaults = customDefaultWindow();
  const [place, setPlace] = useState('');
  const [hits, setHits] = useState([]);
  const [start, setStart] = useState(() => isoToLocalDate(defaults.start));
  const [end, setEnd] = useState(() => isoToLocalDate(defaults.end));
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

  const customQuery = (withBbox) => {
    const q = {
      range: 'custom',
      start: localDateToStartIso(start),
      end: localDateToEndIso(end),
      minmag,
      maxmag: maxmag === '' ? null : Number(maxmag),
      depth,
      sort: 'time',
      map: theme === 'light' ? 'light' : 'dark',
    };
    if (withBbox && bbox) {
      q.minlat = bbox.minLat;
      q.maxlat = bbox.maxLat;
      q.minlon = bbox.minLon;
      q.maxlon = bbox.maxLon;
    }
    return q;
  };

  const submit = (e) => {
    e.preventDefault();
    nav(`/${queryString(customQuery(true), theme)}`);
  };

  const drawOnMap = () => {
    const { start: s, end: e } = customDefaultWindow();
    const q = {
      range: 'custom',
      start: s,
      end: e,
      minmag: 4.0,
      map: theme === 'light' ? 'light' : 'dark',
    };
    nav(`/${queryString(q, theme)}&draw=1`);
  };

  return (
    <div className="search-page">
      <h1 className="header-brand" style={{ marginBottom: 8 }}>{t('custom_search')}</h1>
      <p className="meta">{t('timezone', { tz })}</p>
      <p>
        <button type="button" className="sv-text-btn" onClick={drawOnMap}>{t('draw_on_map')}</button>
      </p>
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
