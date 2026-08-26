import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { getMagnitudeHex } from './data.js';
import { prefersReducedMotion } from './dialog.jsx';
import { t } from './i18n.js';
import { formatRelTime } from './list.jsx';

const TILES = {
  dark: { url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', attr: '© OpenStreetMap · © CARTO', sub: 'abcd', max: 19 },
  light: { url: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', attr: '© OpenStreetMap · © CARTO', sub: 'abcd', max: 19 },
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: '© Esri, Maxar, Earthstar Geographics', sub: '', max: 19 },
};

function buildPopupEl(qk, bookmarks, onToggleBookmark, onShare) {
  const mag = qk.properties.mag;
  const [lng, lat, depth] = qk.geometry.coordinates;
  const isSaved = bookmarks && bookmarks.has(qk.id);
  const root = document.createElement('div');
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;align-items:baseline;gap:8px;margin-bottom:6px';
  const stamp = document.createElement('strong');
  stamp.textContent = 'M ' + Number(mag).toFixed(1);
  const srcEl = document.createElement('span');
  srcEl.style.cssText = 'font-size:11px;color:var(--fg-2)';
  srcEl.textContent = qk.source || 'USGS';
  head.append(stamp, srcEl);
  const place = document.createElement('div');
  place.style.fontWeight = '500';
  place.textContent = qk.properties.place || t('unknown_region');
  const meta = document.createElement('div');
  meta.style.cssText = 'font-size:12px;color:var(--fg-2);margin:6px 0';
  meta.textContent = `${Math.abs(depth).toFixed(1)} km · ${formatRelTime(qk.properties.time)}`;
  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:8px;margin-top:8px';
  const bm = document.createElement('button');
  bm.type = 'button';
  bm.className = 'sv-btn';
  bm.textContent = isSaved ? t('saved') : t('save');
  bm.addEventListener('click', (e) => { e.preventDefault(); onToggleBookmark(qk); });
  const sh = document.createElement('button');
  sh.type = 'button';
  sh.className = 'sv-btn';
  sh.textContent = t('copy_link');
  sh.addEventListener('click', (e) => { e.preventDefault(); onShare(qk); });
  actions.append(bm, sh);
  root.append(head, place, meta, actions);
  return root;
}

export function SvMap({
  quakes, selectedId, onSelect, mapStyle, showPlates, isDrawing,
  userLocation, searchBounds, onDrawComplete, bookmarks, onToggleBookmark, onShare, mapRef,
}) {
  const ref = useRef(null);
  const map = useRef(null);
  const markersLayer = useRef(null);
  const platesLayer = useRef(null);
  const drawLayer = useRef(null);
  const userLayer = useRef(null);
  const tileLayer = useRef(null);
  const plateData = useRef(null);
  const drawStart = useRef(null);

  useEffect(() => {
    if (!ref.current || map.current) return;
    map.current = L.map(ref.current, {
      center: [20, 0], zoom: 2, minZoom: 2, maxZoom: 10,
      worldCopyJump: false, preferCanvas: true,
      zoomControl: false, attributionControl: true,
    });
    const tile = TILES[mapStyle] || TILES.dark;
    tileLayer.current = L.tileLayer(tile.url, { attribution: tile.attr, subdomains: tile.sub, maxZoom: tile.max }).addTo(map.current);
    markersLayer.current = L.layerGroup().addTo(map.current);
    drawLayer.current = L.layerGroup().addTo(map.current);
    userLayer.current = L.layerGroup().addTo(map.current);
    if (mapRef) mapRef.current = map.current;
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (tileLayer.current) m.removeLayer(tileLayer.current);
    const tile = TILES[mapStyle] || TILES.dark;
    tileLayer.current = L.tileLayer(tile.url, { attribution: tile.attr, subdomains: tile.sub, maxZoom: tile.max }).addTo(m);
  }, [mapStyle]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!showPlates) {
      if (platesLayer.current) { m.removeLayer(platesLayer.current); platesLayer.current = null; }
      return;
    }
    const addLayer = (data) => {
      if (platesLayer.current) { m.removeLayer(platesLayer.current); platesLayer.current = null; }
      const grp = L.layerGroup();
      [0, 360, -360].forEach((off) => {
        L.geoJSON({
          ...data,
          features: data.features.map((f) => ({
            ...f,
            geometry: {
              ...f.geometry,
              coordinates: f.geometry.type === 'LineString'
                ? f.geometry.coordinates.map(([x, y]) => [x + off, y])
                : f.geometry.coordinates.map((ring) => ring.map(([x, y]) => [x + off, y])),
            },
          })),
        }, { style: { color: '#ea580c', weight: 2, opacity: 0.8, dashArray: '5, 5' }, interactive: false }).addTo(grp);
      });
      grp.addTo(m);
      platesLayer.current = grp;
    };
    if (plateData.current) { addLayer(plateData.current); return; }
    fetch('/plates.json')
      .then((r) => r.json())
      .then((data) => { plateData.current = data; if (showPlates && map.current) addLayer(data); })
      .catch((e) => console.warn('[ShakeViewer] plate boundaries fetch failed:', e));
  }, [showPlates]);

  useEffect(() => {
    if (!markersLayer.current) return;
    markersLayer.current.clearLayers();
    const reduceMotion = prefersReducedMotion();
    quakes.forEach((qk) => {
      const [lng, lat] = qk.geometry.coordinates;
      const mag = qk.properties.mag;
      const color = getMagnitudeHex(mag);
      const isMajor = mag >= 6.0;
      const isSel = selectedId === qk.id;
      const size = Math.max(6, Math.min(40, Math.pow(mag, 2)));
      [0, 360, -360].forEach((off) => {
        const wrap = document.createElement('div');
        wrap.className = 'sv-marker' + (isMajor && !reduceMotion ? ' pulse' : '');
        wrap.style.width = (size * 2.2) + 'px';
        wrap.style.height = (size * 2.2) + 'px';
        if (isMajor && !reduceMotion) {
          const ring = document.createElement('div');
          ring.className = 'ring';
          ring.style.width = wrap.style.width;
          ring.style.height = wrap.style.height;
          ring.style.background = color;
          wrap.appendChild(ring);
        }
        const core = document.createElement('div');
        core.className = 'core';
        core.style.width = size + 'px';
        core.style.height = size + 'px';
        core.style.background = color;
        core.style.boxShadow = isSel ? '0 0 0 3px #fff, 0 2px 6px rgba(0,0,0,0.5)' : '0 0 0 1.5px rgba(255,255,255,0.4), 0 2px 6px rgba(0,0,0,0.5)';
        if (isSel) core.style.transform = 'translate(-50%,-50%) scale(1.3)';
        wrap.appendChild(core);
        const icon = L.divIcon({ html: wrap, className: 'sv-marker-wrap', iconSize: [size * 2.2, size * 2.2], iconAnchor: [size * 1.1, size * 1.1] });
        const marker = L.marker([lat, lng + off], { icon, keyboard: false });
        marker.bindPopup(buildPopupEl(qk, bookmarks, onToggleBookmark, onShare), { minWidth: 220, maxWidth: 300 });
        marker.on('click', () => onSelect(qk));
        marker.addTo(markersLayer.current);
      });
    });
  }, [quakes, selectedId, bookmarks]);

  useEffect(() => {
    if (!map.current || !selectedId) return;
    const qk = quakes.find((x) => x.id === selectedId);
    if (!qk) return;
    const [lng, lat] = qk.geometry.coordinates;
    const current = map.current.getCenter();
    let best = lng, bestDist = Infinity;
    [0, 360, -360].forEach((o) => {
      const d = Math.abs((lng + o) - current.lng);
      if (d < bestDist) { bestDist = d; best = lng + o; }
    });
    const z = Math.max(map.current.getZoom(), 5);
    if (prefersReducedMotion()) map.current.setView([lat, best], z);
    else map.current.flyTo([lat, best], z, { duration: 1 });
  }, [selectedId]);

  useEffect(() => {
    if (!userLayer.current) return;
    userLayer.current.clearLayers();
    if (!userLocation) return;
    const icon = L.divIcon({
      html: '<div class="user-loc"><div class="ring-pulse"></div><div class="dot"></div></div>',
      className: 'sv-marker-wrap', iconSize: [18, 18], iconAnchor: [9, 9],
    });
    L.marker([userLocation.lat, userLocation.lng], { icon, keyboard: false, interactive: false }).addTo(userLayer.current);
  }, [userLocation]);

  useEffect(() => {
    if (!drawLayer.current) return;
    drawLayer.current.clearLayers();
    if (searchBounds) {
      const { minLat, maxLat, minLon, maxLon } = searchBounds;
      L.rectangle([[minLat, minLon], [maxLat, maxLon]], {
        color: '#ef4444', weight: 2, dashArray: '5, 5', fillOpacity: 0.1, interactive: false,
      }).addTo(drawLayer.current);
    }
  }, [searchBounds]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const container = m.getContainer();
    if (!isDrawing) {
      container.classList.remove('cursor-crosshair');
      m.dragging.enable();
      m.doubleClickZoom.enable();
      return;
    }
    container.classList.add('cursor-crosshair');
    m.dragging.disable();
    m.doubleClickZoom.disable();
    const onDown = (e) => { drawStart.current = e.latlng; };
    const onUp = (e) => {
      if (!drawStart.current) return;
      const a = drawStart.current, b = e.latlng;
      drawStart.current = null;
      onDrawComplete({
        minLat: Math.min(a.lat, b.lat), maxLat: Math.max(a.lat, b.lat),
        minLon: Math.min(a.lng, b.lng), maxLon: Math.max(a.lng, b.lng),
      });
    };
    m.on('mousedown', onDown);
    m.on('mouseup', onUp);
    return () => { m.off('mousedown', onDown); m.off('mouseup', onUp); };
  }, [isDrawing, onDrawComplete]);

  return <div ref={ref} className="sv-map" style={{ position: 'absolute', inset: 0, zIndex: 0 }} />;
}

export function Legend({ compact }) {
  return (
    <div className={`sv-legend${compact ? ' compact' : ''}`}>
      <div className="label" style={{ marginBottom: 6 }}>{t('legend_magnitude')}</div>
      {[['minor', '< 3.5', '#22c55e'], ['moderate', '3.5 – 4.5', '#eab308'], ['strong', '4.5 – 6.0', '#f97316'], ['major', '6.0 +', '#ef4444']].map(([k, r, c]) => (
        <div key={k} className="sv-legend-row">
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, boxShadow: `0 0 0 2px ${c}22` }} />
          <span className="mono" style={{ fontSize: 11, color: 'var(--fg-1)' }}>{r}</span>
          <span className="sv-legend-name" style={{ fontSize: 11, color: 'var(--fg-2)', marginLeft: 'auto' }}>{t(k)}</span>
        </div>
      ))}
    </div>
  );
}
