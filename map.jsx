/* Map component — renders Leaflet with CARTO dark tiles + markers */

const SvMap = ({ quakes, selectedId, onSelect, isDark = true, showPlates = false }) => {
  const ref = React.useRef(null);
  const map = React.useRef(null);
  const layer = React.useRef(null);
  const platesLayer = React.useRef(null);

  React.useEffect(() => {
    if (!ref.current || map.current) return;
    map.current = L.map(ref.current, {
      center: [20, 0], zoom: 2, minZoom: 2, maxZoom: 10,
      worldCopyJump: true,
      zoomControl: true,
      attributionControl: true,
      preferCanvas: false,
    });
    L.control.zoom({ position: 'topright' }).addTo(map.current);
    // remove default zoomControl added via options
    map.current.zoomControl.setPosition('topright');

    const darkTiles = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
      { attribution: '© OpenStreetMap · © CARTO', subdomains: 'abcd', maxZoom: 19 }
    );
    const lightTiles = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
      { attribution: '© OpenStreetMap · © CARTO', subdomains: 'abcd', maxZoom: 19 }
    );
    (isDark ? darkTiles : lightTiles).addTo(map.current);
    map.current._tileRefs = { darkTiles, lightTiles, active: isDark ? darkTiles : lightTiles };

    layer.current = L.layerGroup().addTo(map.current);
  }, []);

  // Theme swap
  React.useEffect(() => {
    const m = map.current; if (!m || !m._tileRefs) return;
    const refs = m._tileRefs;
    if (refs.active) m.removeLayer(refs.active);
    const next = isDark ? refs.darkTiles : refs.lightTiles;
    next.addTo(m);
    refs.active = next;
  }, [isDark]);

  // Markers
  React.useEffect(() => {
    if (!layer.current) return;
    layer.current.clearLayers();

    quakes.forEach(qk => {
      const [lng, lat, depth] = qk.geometry.coordinates;
      const mag = qk.properties.mag;
      const color = window.getMagnitudeHex(mag);
      const isMajor = mag >= 6.0;
      const isSelected = selectedId === qk.id;
      const size = Math.max(6, Math.min(40, Math.pow(mag, 2) * 1.0));

      const html = `
        <div class="sv-marker ${isMajor ? 'pulse' : ''}" style="width:${size*2.2}px;height:${size*2.2}px">
          ${isMajor ? `<div class="ring" style="width:${size*2.2}px;height:${size*2.2}px;background:${color}"></div>` : ''}
          <div class="core" style="width:${size}px;height:${size}px;background:${color};
            box-shadow:0 0 0 ${isSelected ? '3px #fff' : '1.5px rgba(255,255,255,0.4)'}, 0 2px 6px rgba(0,0,0,0.5);
            ${isSelected ? 'transform:translate(-50%,-50%) scale(1.3);' : ''}"></div>
        </div>`;
      const icon = L.divIcon({
        html, className: 'sv-marker-wrap',
        iconSize: [size*2.2, size*2.2],
        iconAnchor: [size*1.1, size*1.1],
      });
      const marker = L.marker([lat, lng], { icon, keyboard: false });
      marker.on('click', () => onSelect(qk));
      marker.addTo(layer.current);
    });
  }, [quakes, selectedId]);

  // Fly to selected
  React.useEffect(() => {
    if (!map.current || !selectedId) return;
    const qk = quakes.find(x => x.id === selectedId);
    if (!qk) return;
    const [lng, lat] = qk.geometry.coordinates;
    map.current.flyTo([lat, lng], Math.max(map.current.getZoom(), 4), { duration: 0.8 });
  }, [selectedId]);

  return React.createElement('div', {
    ref, className: 'sv-map', style: { position:'absolute', inset: 0, zIndex: 0 }
  });
};

window.SvMap = SvMap;
