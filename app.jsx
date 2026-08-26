/* App shell — wires desktop panel + mobile sheet + map together */

const { useState, useEffect, useMemo, useCallback, useRef } = React;

// Treat two reports as the same physical event when they share a 40-second
// window and are within ~0.4° (roughly 40 km). Good enough for de-duping
// USGS vs EMSC reports of the same quake.
const clusterKey = (time, lat, lng) => {
  const t = Math.round(time / 40000);          // 40-second bucket
  const y = Math.round(lat * 2.5) / 2.5;       // 0.4° lat bucket
  const x = Math.round(lng * 2.5) / 2.5;       // 0.4° lng bucket
  return `${t}_${y}_${x}`;
};

// Read initial tweak defaults from the marker block
const DEFAULT_TWEAKS = /*EDITMODE-BEGIN*/{
  "accent": "cyan",
  "type_pair": "serif",
  "density": "comfortable",
  "sheet_initial": "half"
}/*EDITMODE-END*/;

const App = () => {
  const [isDark, setIsDark] = useState(true);
  const [timeRange, setTimeRange] = useState('day');
  const [selectedId, setSelectedId] = useState(null);
  const [depthFilter, setDepthFilter] = useState('all');
  const [minMag, setMinMag] = useState(2.5);
  const [showPlates, setShowPlates] = useState(false);
  const [nearMeActive, setNearMeActive] = useState(false);
  const [sortType, setSortType] = useState('time');
  const [sortDirection, setSortDirection] = useState('desc');
  const [mapStyle, setMapStyle] = useState('dark');
  const [panelExpanded, setPanelExpanded] = useState(true);

  const [bookmarks, setBookmarks] = useState(new Set());
  const [toast, setToast] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
  const [sheetSnap, setSheetSnap] = useState(DEFAULT_TWEAKS.sheet_initial);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [tweaksOn, setTweaksOn] = useState(false);
  const [tweaks, setTweaks] = useState(DEFAULT_TWEAKS);

  // Apply tweaks to <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-accent', tweaks.accent);
    document.documentElement.setAttribute('data-type', tweaks.type_pair);
    document.documentElement.setAttribute('data-density', tweaks.density);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [tweaks, isDark]);

  // Tweaks protocol
  useEffect(() => {
    const onMsg = (e) => {
      if (!e.data) return;
      if (e.data.type === '__activate_edit_mode') setTweaksOn(true);
      if (e.data.type === '__deactivate_edit_mode') setTweaksOn(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const updateTweak = (k, v) => {
    const next = { ...tweaks, [k]: v };
    setTweaks(next);
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*');
  };

  // Responsive
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Restore last selected quake
  useEffect(() => {
    try {
      const s = localStorage.getItem('sv_selected');
      if (s) setSelectedId(s);
    } catch {}
  }, []);
  useEffect(() => {
    try { if (selectedId) localStorage.setItem('sv_selected', selectedId); else localStorage.removeItem('sv_selected'); } catch {}
  }, [selectedId]);

  // Live USGS feed — refetched whenever the time range changes, plus auto-refresh
  const [quakes, setQuakes] = useState(() => window.QUAKES || []);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  const fetchFeed = useCallback(async (range) => {
    // USGS publishes pre-summarized GeoJSON for common windows — no API key needed
    const usgsMap = {
      day:   'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
      week:  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
      month: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson',
      custom:'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
    };
    // EMSC FDSN event service (JSON) — falls back / fills gaps if USGS drops an event
    const hours = range === 'day' ? 24 : range === 'week' ? 24*7 : range === 'month' ? 24*30 : 24*7;
    const startIso = new Date(Date.now() - hours * 3600_000).toISOString();
    const emscUrl = `https://www.seismicportal.eu/fdsnws/event/1/query?format=json&starttime=${encodeURIComponent(startIso)}&limit=2000&minmag=2.5`;

    setLoading(true);
    setFetchError(null);

    // Run both in parallel so EMSC can fill gaps even if USGS is slow.
    const [usgsRes, emscRes] = await Promise.allSettled([
      fetch(usgsMap[range] || usgsMap.day).then(r => { if (!r.ok) throw new Error('USGS ' + r.status); return r.json(); }),
      fetch(emscUrl).then(r => { if (!r.ok) throw new Error('EMSC ' + r.status); return r.json(); })
    ]);

    const merged = new Map(); // key → event

    // --- USGS (authoritative) ---
    if (usgsRes.status === 'fulfilled' && usgsRes.value?.features) {
      for (const f of usgsRes.value.features) {
        const ev = {
          id: f.id,
          properties: {
            mag: f.properties.mag ?? 0,
            place: f.properties.place || 'Unknown location',
            time: f.properties.time,
            felt: f.properties.felt || 0,
            tsunami: f.properties.tsunami || 0,
            url: f.properties.url || ('https://earthquake.usgs.gov/earthquakes/eventpage/' + f.id),
          },
          geometry: f.geometry,
          source: 'USGS',
        };
        // Clustering key: rounded time + location — any EMSC event inside this bucket
        // is treated as the same physical earthquake.
        const key = clusterKey(ev.properties.time, f.geometry.coordinates[1], f.geometry.coordinates[0]);
        merged.set(key, ev);
      }
    }

    // --- EMSC (fills gaps only; USGS wins when both are present) ---
    if (emscRes.status === 'fulfilled' && Array.isArray(emscRes.value?.features)) {
      for (const f of emscRes.value.features) {
        const p = f.properties || {};
        const mag = p.mag ?? p.magnitude ?? 0;
        if (mag < 2.5) continue;
        const time = new Date(p.time || p.origintime || 0).getTime();
        const lat = f.geometry?.coordinates?.[1];
        const lng = f.geometry?.coordinates?.[0];
        if (lat == null || lng == null) continue;
        const key = clusterKey(time, lat, lng);
        if (merged.has(key)) continue; // USGS already covered it
        const id = 'emsc_' + (p.unid || p.source_id || (time + '_' + lat + '_' + lng));
        merged.set(key, {
          id,
          properties: {
            mag,
            place: p.flynn_region || p.region || 'Unknown location',
            time,
            felt: 0,
            tsunami: 0,
            url: p.unid ? `https://www.seismicportal.eu/eventdetails.html?unid=${p.unid}` : 'https://www.seismicportal.eu/',
          },
          geometry: f.geometry,
          source: 'EMSC',
        });
      }
    }

    const features = Array.from(merged.values());

    if (features.length === 0) {
      // Both feeds failed
      setFetchError('Could not reach USGS or EMSC — showing last data.');
      setToast('Could not reach USGS or EMSC · tap refresh to retry');
      clearTimeout(window.__svToastT);
      window.__svToastT = setTimeout(() => setToast(null), 2400);
    } else {
      setQuakes(features);
      setLastUpdated(Date.now());
      // If one of the two failed, leave a quiet note but don't toast
      if (usgsRes.status === 'rejected' && emscRes.status === 'fulfilled') {
        console.warn('[ShakeViewer] USGS unreachable, using EMSC only:', usgsRes.reason);
      } else if (emscRes.status === 'rejected' && usgsRes.status === 'fulfilled') {
        console.warn('[ShakeViewer] EMSC unreachable, using USGS only:', emscRes.reason);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchFeed(timeRange); }, [timeRange, fetchFeed]);

  // Auto-refresh every 60 s on the day view, 5 min on longer windows
  useEffect(() => {
    const ms = timeRange === 'day' ? 60_000 : 300_000;
    const t = setInterval(() => fetchFeed(timeRange), ms);
    return () => clearInterval(t);
  }, [timeRange, fetchFeed]);

  const processed = useMemo(() => {
    let list = quakes;
    if (depthFilter !== 'all') {
      list = list.filter(q => {
        const d = Math.abs(q.geometry.coordinates[2] || 0);
        if (depthFilter === 'shallow') return d < 70;
        if (depthFilter === 'intermediate') return d >= 70 && d < 300;
        return d >= 300;
      });
    }
    list = list.filter(q => q.properties.mag >= minMag);
    list = [...list].sort((a, b) => {
      const dir = sortDirection === 'desc' ? -1 : 1;
      if (sortType === 'time') return dir * (a.properties.time - b.properties.time);
      return dir * (a.properties.mag - b.properties.mag);
    });
    return list;
  }, [quakes, depthFilter, minMag, sortType, sortDirection]);

  const stats = useMemo(() => {
    const total = processed.length;
    const maxMag = total ? Math.max(...processed.map(q => q.properties.mag)).toFixed(1) : '—';
    const significant = processed.filter(q => q.properties.mag >= 4.5).length;
    const felt = processed.reduce((a, q) => a + (q.properties.felt || 0), 0);
    const feltS = felt > 1000 ? (felt/1000).toFixed(1)+'k' : String(felt);
    return { total, maxMag, significant, felt: feltS };
  }, [processed]);

  const selectedQuake = useMemo(() => processed.find(q => q.id === selectedId) || quakes.find(q => q.id === selectedId), [processed, selectedId]);

  const onSelect = useCallback((q) => {
    setSelectedId(q.id);
    if (isMobile) setSheetSnap('full');
  }, [isMobile]);

  const toggleSort = useCallback((t) => {
    if (sortType === t) setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    else { setSortType(t); setSortDirection('desc'); }
  }, [sortType, sortDirection]);

  const onBookmark = useCallback((q) => {
    setBookmarks(prev => {
      const n = new Set(prev);
      if (n.has(q.id)) { n.delete(q.id); showToast('Removed bookmark'); }
      else { n.add(q.id); showToast('Bookmarked'); }
      return n;
    });
  }, []);

  const onShare = useCallback(() => {
    showToast('Link copied to clipboard');
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => setToast(null), 1800);
  };

  const filters = {
    depthFilter, onDepthFilter: setDepthFilter,
    minMag, onMinMag: setMinMag,
    showPlates, onShowPlates: setShowPlates,
    nearMeActive, onNearMeActive: setNearMeActive,
    sortType, sortDirection, onToggleSort: toggleSort,
    mapStyle, onMapStyle: setMapStyle,
  };

  return React.createElement('div', { className: 'sv-app' },
    // Header
    React.createElement(SvHeader, {
      timeRange, onTimeRange: setTimeRange,
      isDark, onToggleTheme: () => setIsDark(v => !v),
      stats, isMobile,
      onOpenAuth: () => showToast('Sign in — wire to Firebase'),
      onOpenMenu: () => showToast('Menu'),
      onOpenFilters: () => { setMobileFiltersOpen(true); setSheetSnap('full'); }
    }),

    // Main
    React.createElement('main', { className: 'sv-main' },
      React.createElement(SvMap, {
        quakes: processed, selectedId,
        onSelect,
        isDark: mapStyle !== 'light',
        showPlates
      }),

      // Magnitude legend (desktop)
      !isMobile && React.createElement(Legend, null),

      // Desktop left panel
      !isMobile && React.createElement(DesktopPanel, {
        quakes: processed, selectedId, onSelect,
        timeRange, onTimeRange: setTimeRange,
        stats, loading,
        lastUpdated, fetchError, onRefresh: () => fetchFeed(timeRange),
        filters,
        selectedQuake,
        bookmarks, onBookmark, onShare,
        onCloseDetail: () => setSelectedId(null),
        expanded: panelExpanded,
        onToggleExpanded: () => setPanelExpanded(v => !v),
      }),

      // Mobile sheet
      isMobile && React.createElement(MobileSheet, {
        snap: sheetSnap, onSnap: setSheetSnap,
        quakes: processed, selectedId, onSelect,
        timeRange, onTimeRange: setTimeRange,
        stats, loading,
        lastUpdated, fetchError, onRefresh: () => fetchFeed(timeRange),
        filters,
        selectedQuake,
        bookmarks, onBookmark, onShare,
        onCloseDetail: () => setSelectedId(null),
        filtersOpen: mobileFiltersOpen,
        onCloseFilters: () => setMobileFiltersOpen(false)
      })
    ),

    // Toast
    toast && React.createElement('div', { className: 'toast' }, toast),

    // Tweaks panel
    tweaksOn && React.createElement(TweaksPanel, { tweaks, onChange: updateTweak })
  );
};

const Legend = () => React.createElement('div', { className: 'sv-legend' },
  React.createElement('div', { className:'label', style:{ marginBottom: 6 } }, 'Magnitude'),
  [['< 3.5', '#22c55e', 'Minor'], ['3.5 – 4.5', '#eab308', 'Moderate'], ['4.5 – 6.0', '#f97316', 'Strong'], ['6.0 +', '#ef4444', 'Major']].map(([r,c,n]) =>
    React.createElement('div', { key: n, className: 'sv-legend-row' },
      React.createElement('span', { style:{ width: 10, height: 10, borderRadius: '50%', background: c, boxShadow: `0 0 0 2px ${c}22` } }),
      React.createElement('span', { className: 'mono', style:{ fontSize: 11, color: 'var(--fg-1)' } }, r),
      React.createElement('span', { style:{ fontSize: 11, color: 'var(--fg-3)', marginLeft: 'auto' } }, n)
    )
  )
);

window.SvApp = App;
