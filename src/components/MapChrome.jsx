import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import L from 'leaflet';
import { magFill, markerRadius } from '../lib/mag.js';
import { prefersReducedMotion } from '../lib/time.js';
import { t } from '../lib/i18n.js';
import { Icon } from './Icons.jsx';
import { MagLegend } from './MagBadge.jsx';
import { MapPopup } from './MapPopup.jsx';

const TILES = {
  dark: { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attr: '© OpenStreetMap · © CARTO' },
  light: { url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', attr: '© OpenStreetMap · © CARTO' },
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: 'Tiles © Esri' },
};

function liveColor() {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--live').trim();
    return v || '#4CC9F0';
  } catch {
    return '#4CC9F0';
  }
}

function markerStyle(q, selected, theme) {
  const r = markerRadius(q.mag);
  return {
    radius: selected ? r * 1.1 : r,
    color: selected ? liveColor() : 'rgba(255,255,255,0.45)',
    weight: selected ? 2 : 1,
    fillColor: magFill(q.mag, theme),
    fillOpacity: 0.92,
  };
}

function styleLabel(mapStyle) {
  if (mapStyle === 'light') return t('style_light');
  if (mapStyle === 'satellite') return t('style_satellite');
  return t('style_dark');
}

export function MapChrome({
  quakes, selectedId, selectedQuake, onSelect, onClear, mapStyle, plates, theme,
  userLocation, onLocate, onMapStyle, onPlates, isDrawing, onDrawComplete, searchBounds,
}) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const tilesRef = useRef(null);
  const markersRef = useRef(null);
  const markersById = useRef(new Map());
  const platesRef = useRef(null);
  const userRef = useRef(null);
  const drawRef = useRef(null);
  const drawStart = useRef(null);
  const popupRef = useRef(null);
  const popupEl = useRef(null);
  const popupRoot = useRef(null);
  const onSelectRef = useRef(onSelect);
  const onClearRef = useRef(onClear);
  const wrapRef = useRef(null);
  const flownRef = useRef(null);

  onSelectRef.current = onSelect;
  onClearRef.current = onClear;

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
    popupEl.current = document.createElement('div');
    L.DomEvent.disableClickPropagation(popupEl.current);
    popupRoot.current = createRoot(popupEl.current);
    popupRef.current = L.popup({
      closeButton: false,
      closeOnClick: false,
      autoClose: false,
      closeOnEscapeKey: false,
      className: 'sv-map-popup',
      maxWidth: 240,
      minWidth: 0,
      autoPan: true,
      autoPanPadding: [56, 56],
    });
    map.on('click', (e) => {
      const t = e.originalEvent?.target;
      if (t && (t.closest?.('.leaflet-interactive') || t.closest?.('.sv-map-popup') || t.closest?.('.leaflet-popup'))) return;
      onClearRef.current?.();
    });
    const invalidate = () => map.invalidateSize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(invalidate) : null;
    if (ro && ref.current) ro.observe(ref.current);
    const tmr = setTimeout(invalidate, 80);
    window.addEventListener('resize', invalidate);
    return () => {
      clearTimeout(tmr);
      window.removeEventListener('resize', invalidate);
      ro?.disconnect();
      popupRoot.current?.unmount();
      popupRoot.current = null;
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
    const list = [...(quakes || [])];
    if (selectedQuake && !list.some((q) => q.id === selectedQuake.id)) list.push(selectedQuake);
    const keep = new Set(list.map((q) => q.id));
    for (const [id, m] of markersById.current) {
      if (keep.has(id)) continue;
      markersRef.current.removeLayer(m);
      markersById.current.delete(id);
    }
    for (const q of list) {
      let m = markersById.current.get(q.id);
      const selected = selectedQuake ? q.id === selectedQuake.id : q.id === selectedId;
      if (!m) {
        m = L.circleMarker([q.lat, q.lon], markerStyle(q, selected, theme));
        m.on('click', (e) => {
          L.DomEvent.stop(e);
          onSelectRef.current?.(m._quake);
        });
        m.addTo(markersRef.current);
        markersById.current.set(q.id, m);
      } else {
        m.setLatLng([q.lat, q.lon]);
        m.setStyle(markerStyle(q, selected, theme));
      }
      m._quake = q;
      if (selected) m.bringToFront();
    }
  }, [quakes, selectedQuake, selectedId, theme]);

  useEffect(() => {
    const map = mapRef.current;
    const popup = popupRef.current;
    const root = popupRoot.current;
    if (!map || !popup || !root) return;
    if (!selectedId || !selectedQuake) {
      flownRef.current = null;
      map.closePopup();
      return undefined;
    }
    const r = markerRadius(selectedQuake.mag) * 1.1;
    popup.options.offset = L.point(r + 8, -(r + 8));
    flushSync(() => {
      root.render(
        <MapPopup quake={selectedQuake} theme={theme} onClose={() => onClearRef.current?.()} />,
      );
    });
    popup.setLatLng([selectedQuake.lat, selectedQuake.lon]);
    popup.setContent(popupEl.current);
    if (!popup.isOpen()) popup.openOn(map);
    else popup.update();

    if (flownRef.current !== selectedId) {
      flownRef.current = selectedId;
      const padded = map.getBounds().pad(-0.18);
      if (!padded.contains([selectedQuake.lat, selectedQuake.lon])) {
        const z = Math.max(map.getZoom(), 4);
        if (prefersReducedMotion()) map.setView([selectedQuake.lat, selectedQuake.lon], z);
        else map.flyTo([selectedQuake.lat, selectedQuake.lon], z, { duration: 0.45 });
      }
    }
    return undefined;
  }, [selectedId, selectedQuake, theme]);

  useEffect(() => {
    if (!userRef.current) return;
    userRef.current.clearLayers();
    if (!userLocation) return;
    L.circleMarker([userLocation.lat, userLocation.lng], {
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
      return undefined;
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

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [menuOpen]);

  return (
    <div className="sv-map">
      <div ref={ref} style={{ position: 'absolute', inset: 0 }} />
      <div className="map-chrome">
        <div className="map-layers" ref={wrapRef}>
          <button
            type="button"
            className="sv-btn map-layers-btn"
            aria-expanded={menuOpen}
            aria-label={t('layers')}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="map-layers-icon">
              <Icon name="layers" size={16} />
              {!!plates && <i className="map-layers-dot" />}
            </span>
            {styleLabel(mapStyle)}
          </button>
          {menuOpen && (
            <div className="map-layers-menu" role="menu">
              <div className="seg">
                {['dark', 'light', 'satellite'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={mapStyle === s ? 'on' : ''}
                    onClick={() => onMapStyle(s)}
                  >
                    {styleLabel(s)}
                  </button>
                ))}
              </div>
              <div className="map-layers-rule" />
              <button type="button" className="toggle-row map-layers-plates" onClick={() => onPlates(!plates)}>
                <span className="control">{t('plate_boundaries')}</span>
                <span className={`switch ${plates ? 'on' : ''}`}><i /></span>
              </button>
            </div>
          )}
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
