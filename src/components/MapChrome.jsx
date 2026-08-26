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

/** Geology gray by map style — not mag, not --live, not chrome theme. */
function plateStroke(mapStyle) {
  if (mapStyle === 'light') return { color: '#3E4754', weight: 1.25, opacity: 0.55 };
  if (mapStyle === 'satellite') return { color: '#F4F6F8', weight: 1.5, opacity: 0.90 };
  return { color: '#C5CDD6', weight: 1.25, opacity: 0.60 };
}

function plateHalo(mapStyle) {
  if (mapStyle !== 'satellite') return null;
  return { color: '#111318', weight: 3, opacity: 0.40 };
}

export function MapChrome({
  quakes, selectedId, selectedQuake, onSelect, onClear, mapStyle, plates, theme,
  userLocation, onLocate, onMapStyle, onPlates, isDrawing, onDrawComplete, onDrawCancel,
  searchBounds, onClearBounds,
}) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const tilesRef = useRef(null);
  const markersRef = useRef(null);
  const markersById = useRef(new Map());
  const platesRef = useRef(null);
  const platesHaloRef = useRef(null);
  const platesGeoRef = useRef(null);
  const userRef = useRef(null);
  const drawRef = useRef(null);
  const previewRef = useRef(null);
  const popupRef = useRef(null);
  const popupEl = useRef(null);
  const popupRoot = useRef(null);
  const onSelectRef = useRef(onSelect);
  const onClearRef = useRef(onClear);
  const onDrawCompleteRef = useRef(onDrawComplete);
  const onDrawCancelRef = useRef(onDrawCancel);
  const onClearBoundsRef = useRef(onClearBounds);
  const isDrawingRef = useRef(!!isDrawing);
  const wrapRef = useRef(null);
  const flownRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  onSelectRef.current = onSelect;
  onClearRef.current = onClear;
  onDrawCompleteRef.current = onDrawComplete;
  onDrawCancelRef.current = onDrawCancel;
  onClearBoundsRef.current = onClearBounds;
  isDrawingRef.current = !!isDrawing;

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
    map.createPane('platesPane');
    map.getPane('platesPane').style.zIndex = 350;
    map.getPane('platesPane').style.pointerEvents = 'none';
    map.createPane('bboxTools');
    map.getPane('bboxTools').style.zIndex = 650;
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
      maxWidth: 280,
      minWidth: 0,
      autoPan: true,
      autoPanPadding: [56, 56],
    });
    map.on('click', (e) => {
      if (isDrawingRef.current) return;
      const t = e.originalEvent?.target;
      if (t && (t.closest?.('.leaflet-interactive') || t.closest?.('.sv-map-popup') || t.closest?.('.leaflet-popup') || t.closest?.('.sv-bbox-x'))) return;
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
    if (!map) return undefined;
    const clear = () => {
      if (platesHaloRef.current) { map.removeLayer(platesHaloRef.current); platesHaloRef.current = null; }
      if (platesRef.current) { map.removeLayer(platesRef.current); platesRef.current = null; }
    };
    if (!plates) {
      clear();
      return undefined;
    }
    let cancelled = false;
    const paint = (geo) => {
      if (cancelled || !mapRef.current) return;
      clear();
      const line = { pane: 'platesPane', interactive: false };
      const halo = plateHalo(mapStyle);
      if (halo) {
        platesHaloRef.current = L.geoJSON(geo, { ...line, style: { ...halo, fill: false } }).addTo(mapRef.current);
      }
      platesRef.current = L.geoJSON(geo, { ...line, style: { ...plateStroke(mapStyle), fill: false } }).addTo(mapRef.current);
    };
    if (platesGeoRef.current) {
      paint(platesGeoRef.current);
      return () => { cancelled = true; };
    }
    fetch('/plates.json')
      .then((r) => r.json())
      .then((geo) => {
        platesGeoRef.current = geo;
        paint(geo);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [plates, mapStyle]);

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
          if (isDrawingRef.current) {
            L.DomEvent.stop(e);
            return;
          }
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
    const map = mapRef.current;
    if (map && !map.getPane('bboxTools')) {
      map.createPane('bboxTools');
      map.getPane('bboxTools').style.zIndex = 650;
    }
    const color = liveColor();
    const rect = L.rectangle(
      [[searchBounds.minLat, searchBounds.minLon], [searchBounds.maxLat, searchBounds.maxLon]],
      {
        color,
        weight: 1.5,
        dashArray: '6 4',
        fillColor: color,
        fillOpacity: 0.10,
        interactive: false,
      },
    );
    rect.addTo(drawRef.current);
    const x = L.marker([searchBounds.maxLat, searchBounds.maxLon], {
      pane: 'bboxTools',
      icon: L.divIcon({
        className: 'sv-bbox-x',
        html: `<button type="button" class="sv-bbox-x-btn" aria-label="${t('clear_boundary')}">×</button>`,
        iconSize: [22, 22],
        iconAnchor: [0, 22],
      }),
      interactive: true,
      keyboard: false,
      zIndexOffset: 1000,
    });
    const bindX = () => {
      const el = x.getElement();
      const btn = el?.querySelector('button') || el;
      if (!btn || btn.dataset.svBound) return;
      btn.dataset.svBound = '1';
      const clear = (ev) => {
        L.DomEvent.stop(ev);
        onClearBoundsRef.current?.();
      };
      L.DomEvent.on(btn, 'click', clear);
      L.DomEvent.on(btn, 'mousedown', L.DomEvent.stop);
      L.DomEvent.on(btn, 'pointerdown', L.DomEvent.stop);
      L.DomEvent.on(btn, 'dblclick', L.DomEvent.stop);
    };
    x.on('add', bindX);
    x.addTo(drawRef.current);
    bindX();
  }, [searchBounds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    const container = map.getContainer();

    const enableNav = () => {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      map.touchZoom.enable();
      map.boxZoom.enable();
    };

    if (!isDrawing) {
      container.classList.remove('sv-map-drawing', 'sv-map-drawing-drag');
      container.style.cursor = '';
      enableNav();
      previewRef.current?.remove();
      previewRef.current = null;
      return undefined;
    }

    container.classList.add('sv-map-drawing');
    container.style.cursor = 'crosshair';
    map.dragging.disable();
    map.boxZoom.disable();

    let start = null;
    let dragging = false;
    const rectOpts = () => {
      const color = liveColor();
      return {
        color,
        weight: 1.5,
        dashArray: '6 4',
        fillColor: color,
        fillOpacity: 0.10,
        interactive: false,
      };
    };

    const disableZoom = () => {
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
      map.touchZoom.disable();
    };
    const enableZoom = () => {
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      map.touchZoom.enable();
    };

    const clearPreview = () => {
      if (previewRef.current) {
        previewRef.current.remove();
        previewRef.current = null;
      }
    };

    const ignoredTarget = (t) => t?.closest?.('.map-chrome, .sv-bbox-x, .leaflet-control, .sv-draw-hint');

    const onDown = (e) => {
      if (e.originalEvent && e.originalEvent.button != null && e.originalEvent.button !== 0) return;
      if (ignoredTarget(e.originalEvent?.target)) return;
      start = e.latlng;
      dragging = true;
      disableZoom();
      container.classList.add('sv-map-drawing-drag');
      L.DomEvent.preventDefault(e.originalEvent);
    };

    const boundsOf = (a, b) => L.latLngBounds(a, b);

    const onMove = (e) => {
      if (!dragging || !start) return;
      const b = boundsOf(start, e.latlng);
      if (!previewRef.current) {
        previewRef.current = L.rectangle(b, rectOpts()).addTo(map);
      } else {
        previewRef.current.setBounds(b);
        previewRef.current.setStyle(rectOpts());
      }
    };

    const finish = (latlng) => {
      if (!dragging || !start) return;
      const s = start;
      dragging = false;
      start = null;
      enableZoom();
      container.classList.remove('sv-map-drawing-drag');
      clearPreview();
      if (!latlng) return;
      const minLat = Math.min(s.lat, latlng.lat);
      const maxLat = Math.max(s.lat, latlng.lat);
      const minLon = Math.min(s.lng, latlng.lng);
      const maxLon = Math.max(s.lng, latlng.lng);
      if (Math.abs(maxLat - minLat) < 1e-5 && Math.abs(maxLon - minLon) < 1e-5) return;
      onDrawCompleteRef.current?.({ minLat, maxLat, minLon, maxLon });
    };

    const onDocMove = (ev) => {
      if (!dragging || !start) return;
      onMove({ latlng: map.mouseEventToLatLng(ev) });
    };
    const onDocUp = (ev) => {
      if (!dragging || !start) return;
      finish(map.mouseEventToLatLng(ev));
    };

    const onEsc = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      dragging = false;
      start = null;
      enableZoom();
      container.classList.remove('sv-map-drawing-drag');
      clearPreview();
      onDrawCancelRef.current?.();
    };

    map.on('mousedown', onDown);
    map.on('mousemove', onMove);
    document.addEventListener('mousemove', onDocMove);
    document.addEventListener('mouseup', onDocUp);
    window.addEventListener('keydown', onEsc, true);

    return () => {
      map.off('mousedown', onDown);
      map.off('mousemove', onMove);
      document.removeEventListener('mousemove', onDocMove);
      document.removeEventListener('mouseup', onDocUp);
      window.removeEventListener('keydown', onEsc, true);
      dragging = false;
      start = null;
      clearPreview();
      container.classList.remove('sv-map-drawing', 'sv-map-drawing-drag');
      container.style.cursor = '';
      enableNav();
    };
  }, [isDrawing]);

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
      {isDrawing && <div className="sv-draw-hint">{t('draw_hint')}</div>}
      <div className="map-chrome">
        <div className="map-chrome-tr">
          <button
            type="button"
            className="map-plates-toggle"
            title={t('plate_boundaries')}
            aria-label={t('plate_boundaries')}
            aria-pressed={!!plates}
            onClick={() => onPlates(!plates)}
          >
            <span>{t('plate_boundaries')}</span>
            <span className={`switch${plates ? ' on' : ''}`} aria-hidden="true"><i /></span>
          </button>
          <div className="map-layers" ref={wrapRef}>
            <button
              type="button"
              className="sv-btn map-layers-btn"
              aria-expanded={menuOpen}
              aria-label={t('layers')}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <Icon name="layers" size={16} />
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
              </div>
            )}
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
