import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { magFill, markerRadius } from '../lib/mag.js';
import { prefersReducedMotion } from '../lib/time.js';
import { t } from '../lib/i18n.js';
import { Icon } from './Icons.jsx';
import { MagLegend } from './MagBadge.jsx';

const TILES = {
  dark: { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attr: '© OpenStreetMap · © CARTO' },
  light: { url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', attr: '© OpenStreetMap · © CARTO' },
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: 'Tiles © Esri' },
};

function popupEl(quake) {
  const box = document.createElement('div');
  box.style.minWidth = '160px';
  const mag = document.createElement('div');
  mag.className = 'mono';
  mag.style.fontWeight = '600';
  mag.textContent = quake.mag == null ? '—' : `M ${Number(quake.mag).toFixed(1)}`;
  const place = document.createElement('div');
  place.textContent = quake.place || '';
  box.appendChild(mag);
  box.appendChild(place);
  return box;
}

export function MapChrome({
  quakes, selectedId, onSelect, mapStyle, plates, theme, userLocation, onLocate,
  onMapStyle, onPlates, isDrawing, onDrawComplete, searchBounds,
}) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const tilesRef = useRef(null);
  const markersRef = useRef(null);
  const platesRef = useRef(null);
  const userRef = useRef(null);
  const drawRef = useRef(null);
  const drawStart = useRef(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      worldCopyJump: true,
      zoomControl: true,
      attributionControl: true,
    });
    map.zoomControl.setPosition('topleft');
    map.attributionControl.setPosition('bottomleft');
    const spec = TILES[mapStyle] || TILES.dark;
    tilesRef.current = L.tileLayer(spec.url, { attribution: spec.attr, subdomains: 'abcd', maxZoom: 19 }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    userRef.current = L.layerGroup().addTo(map);
    drawRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const invalidate = () => map.invalidateSize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(invalidate) : null;
    if (ro && ref.current) ro.observe(ref.current);
    const t = setTimeout(invalidate, 80);
    window.addEventListener('resize', invalidate);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', invalidate);
      ro?.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !tilesRef.current) return;
    map.removeLayer(tilesRef.current);
    const spec = TILES[mapStyle] || TILES.dark;
    tilesRef.current = L.tileLayer(spec.url, { attribution: spec.attr, subdomains: 'abcd', maxZoom: 19 }).addTo(map);
  }, [mapStyle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (platesRef.current) { map.removeLayer(platesRef.current); platesRef.current = null; }
    if (!plates) return;
    let cancelled = false;
    fetch('/plates.json')
      .then((r) => r.json())
      .then((geo) => {
        if (cancelled || !mapRef.current) return;
        platesRef.current = L.geoJSON(geo, {
          style: { color: theme === 'light' ? '#B7BCC6' : '#3A3F48', weight: 1, opacity: 0.85 },
          interactive: false,
        }).addTo(mapRef.current);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [plates, theme]);

  useEffect(() => {
    if (!markersRef.current) return;
    markersRef.current.clearLayers();
    quakes.forEach((q) => {
      const selected = q.id === selectedId;
      const m = L.circleMarker([q.lat, q.lon], {
        radius: markerRadius(q.mag),
        color: selected ? '#ffffff' : 'rgba(255,255,255,0.45)',
        weight: selected ? 2 : 1,
        fillColor: magFill(q.mag, theme),
        fillOpacity: 0.92,
      });
      m.on('click', () => onSelect(q));
      const pop = L.popup({ closeButton: true });
      m.bindPopup(pop);
      m.on('popupopen', () => { pop.setContent(popupEl(q)); });
      m.addTo(markersRef.current);
    });
  }, [quakes, selectedId, theme, onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const q = quakes.find((x) => x.id === selectedId);
    if (!q) return;
    const z = Math.max(map.getZoom(), 4);
    if (prefersReducedMotion()) map.setView([q.lat, q.lon], z);
    else map.flyTo([q.lat, q.lon], z, { duration: 0.6 });
  }, [selectedId]);

  useEffect(() => {
    if (!userRef.current) return;
    userRef.current.clearLayers();
    if (!userLocation) return;
    const m = L.circleMarker([userLocation.lat, userLocation.lng], {
      radius: 6,
      color: '#ffffff',
      weight: 2,
      fillColor: '#4CC9F0',
      fillOpacity: 1,
      interactive: false,
    }).addTo(userRef.current);
  }, [userLocation]);

  useEffect(() => {
    if (!drawRef.current) return;
    drawRef.current.clearLayers();
    if (!searchBounds) return;
    L.rectangle([[searchBounds.minLat, searchBounds.minLon], [searchBounds.maxLat, searchBounds.maxLon]], {
      color: '#E23B3B', weight: 1, dashArray: '4 4', fillOpacity: 0.06, interactive: false,
    }).addTo(drawRef.current);
  }, [searchBounds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!isDrawing) {
      map.dragging.enable();
      return;
    }
    map.dragging.disable();
    const onDown = (e) => { drawStart.current = e.latlng; };
    const onUp = (e) => {
      if (!drawStart.current) return;
      const s = drawStart.current;
      drawStart.current = null;
      onDrawComplete?.({
        minLat: Math.min(s.lat, e.latlng.lat),
        maxLat: Math.max(s.lat, e.latlng.lat),
        minLon: Math.min(s.lng, e.latlng.lng),
        maxLon: Math.max(s.lng, e.latlng.lng),
      });
    };
    map.on('mousedown', onDown);
    map.on('mouseup', onUp);
    return () => { map.off('mousedown', onDown); map.off('mouseup', onUp); map.dragging.enable(); };
  }, [isDrawing, onDrawComplete]);

  return (
    <div className="sv-map">
      <div ref={ref} style={{ position: 'absolute', inset: 0 }} />
      <div className="map-chrome">
        <div className="map-layers">
          <div className="map-layer-panel">
            {['dark', 'light', 'satellite'].map((s) => (
              <button key={s} className={`chip ${mapStyle === s ? 'on' : ''}`} style={{ height: 28, padding: '0 8px', fontSize: 12 }}
                onClick={() => onMapStyle(s)}>
                {t(s === 'dark' ? 'style_dark' : s === 'light' ? 'style_light' : 'style_satellite')}
              </button>
            ))}
            <button className={`chip ${plates ? 'on' : ''}`} style={{ height: 28, padding: '0 8px', fontSize: 12 }}
              onClick={() => onPlates(!plates)}>
              {t('plate_boundaries')}
            </button>
          </div>
        </div>
        <div className="map-bottom-right">
          <button className="sv-btn icon map-locate" onClick={onLocate} aria-label={t('locate_me')} title={t('locate_me')}>
            <Icon name="crosshair" size={16} />
          </button>
          <MagLegend theme={theme} />
        </div>
      </div>
    </div>
  );
}
