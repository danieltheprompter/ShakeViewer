import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SvHeader } from './header.jsx';
import { SvMap, Legend } from './map.jsx';
import { DesktopPanel } from './panel.jsx';
import { MobileSheet } from './sheet.jsx';
import { TweaksPanel } from './tweaks.jsx';
import { SvIcon } from './icons.jsx';
import { Dialog } from './dialog.jsx';
import { t, setLang, LANGUAGES } from './i18n.js';
import { fetchStandardFeed, fetchCustomFeed, getDistance } from './data.js';
import { formatRelTime } from './list.jsx';
import { useAuth, useFirestoreCollection, AuthModal, ProfileModal } from './auth.jsx';
import { BookmarksPanel } from './bookmarks.jsx';
import { AboutBody, PrivacyBody, TermsBody, DocumentPage, SUPPORT_EMAIL } from './pages.jsx';

const DEFAULT_TWEAKS = { accent: 'cyan', type_pair: 'serif', density: 'comfortable', sheet_initial: 'half' };
const LEGAL_ROUTES = { '/privacy': 'privacy', '/terms': 'terms', '/about': 'about' };

function routeFromPath(pathname) {
  const p = (pathname || '/').replace(/\/+$/, '') || '/';
  return LEGAL_ROUTES[p] || 'map';
}

export default function App() {
  const auth = useAuth();
  const { user } = auth;

  const [lang, setLangState] = useState(() => {
    try { const s = localStorage.getItem('sv_lang'); if (s && LANGUAGES[s]) return s; } catch {}
    const n = (navigator.language || 'en').slice(0, 2);
    return LANGUAGES[n] ? n : 'en';
  });
  setLang(lang);
  useEffect(() => {
    try { localStorage.setItem('sv_lang', lang); } catch {}
    document.documentElement.setAttribute('lang', lang);
    setLang(lang);
  }, [lang]);

  const [isDark, setIsDark] = useState(() => {
    try { const s = localStorage.getItem('sv_theme'); if (s === 'light') return false; if (s === 'dark') return true; } catch {}
    return true;
  });
  const [timeRange, setTimeRange] = useState(() => {
    try {
      const r = new URLSearchParams(window.location.search).get('range');
      if (['day', 'week', 'month', 'custom'].includes(r)) return r;
    } catch {}
    return 'day';
  });
  const [route, setRoute] = useState(() => routeFromPath(window.location.pathname));
  const mapInstRef = useRef(null);
  const lastStandardRef = useRef({ range: 'day', quakes: [], lastUpdated: null });
  const [selectedId, setSelectedId] = useState(null);
  const [depthFilter, setDepthFilter] = useState('all');
  const [minMag, setMinMag] = useState(2.5);
  const [showPlates, setShowPlates] = useState(false);
  const [nearMeActive, setNearMeActive] = useState(false);
  const [nearMeRadius, setNearMeRadius] = useState(500);
  const [sortType, setSortType] = useState('time');
  const [sortDirection, setSortDirection] = useState('desc');
  const [mapStyle, setMapStyle] = useState(() => {
    try { const s = localStorage.getItem('sv_map_style'); if (['dark', 'light', 'satellite'].includes(s)) return s; } catch {}
    return 'dark';
  });
  const [panelExpanded, setPanelExpanded] = useState(true);
  const [viewMode, setViewMode] = useState('map');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
  const [sheetSnap, setSheetSnap] = useState(DEFAULT_TWEAKS.sheet_initial);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [tweaksOn, setTweaksOn] = useState(false);
  const [tweaks, setTweaks] = useState(DEFAULT_TWEAKS);
  const [quakes, setQuakes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const defaultEnd = new Date().toISOString().split('T')[0];
  const defaultStart = new Date(Date.now() - 86400_000).toISOString().split('T')[0];
  const [customStart, setCustomStart] = useState(defaultStart);
  const [customEnd, setCustomEnd] = useState(defaultEnd);
  const [customMinMag, setCustomMinMag] = useState(4.0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [searchBounds, setSearchBounds] = useState(null);
  const [customRan, setCustomRan] = useState(false);
  const [userLocation, setUserLocation] = useState(() => {
    try { const s = localStorage.getItem('shakeviewer_my_location'); return s ? JSON.parse(s) : null; } catch { return null; }
  });

  const bookmarksCol = useFirestoreCollection(user, 'bookmarks');
  const [localBookmarks, setLocalBookmarks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('shakeviewer_bookmarks') || '[]'); } catch { return []; }
  });
  const activeBookmarks = user ? bookmarksCol.data : localBookmarks;
  const bookmarkIdSet = useMemo(() => new Set(activeBookmarks.map((b) => b.quakeId)), [activeBookmarks]);

  useEffect(() => {
    if (!user) try { localStorage.setItem('shakeviewer_bookmarks', JSON.stringify(localBookmarks)); } catch {}
  }, [localBookmarks, user]);
  useEffect(() => { try { localStorage.setItem('sv_theme', isDark ? 'dark' : 'light'); } catch {} }, [isDark]);
  useEffect(() => { try { localStorage.setItem('sv_map_style', mapStyle); } catch {} }, [mapStyle]);

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', tweaks.accent);
    document.documentElement.setAttribute('data-type', tweaks.type_pair);
    document.documentElement.setAttribute('data-density', tweaks.density);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('doc-route', route !== 'map');
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#0a0d12' : '#fafaf7');
  }, [tweaks, isDark, route]);

  useEffect(() => {
    const onMsg = (e) => {
      if (e.origin !== window.location.origin) return;
      if (!e.data) return;
      if (e.data.type === '__activate_edit_mode') setTweaksOn(true);
      if (e.data.type === '__deactivate_edit_mode') setTweaksOn(false);
    };
    window.addEventListener('message', onMsg);
    try { window.parent.postMessage({ type: '__edit_mode_available' }, window.location.origin); } catch {}
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const updateTweak = (k, v) => {
    const next = { ...tweaks, [k]: v };
    setTweaks(next);
    try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, window.location.origin); } catch {}
  };

  useEffect(() => {
    const onR = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);

  const pendingDeeplink = useRef(null);
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get('quake');
      if (q) pendingDeeplink.current = q;
    } catch {}
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onDoc = () => setUserMenuOpen(false);
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [userMenuOpen]);

  const fetchStandard = useCallback(async (range) => {
    setLoading(true); setFetchError(null);
    try {
      const { features } = await fetchStandardFeed(range);
      if (!features.length) setFetchError(t('error_fetch'));
      else { setQuakes(features); setLastUpdated(Date.now()); }
    } catch {
      setFetchError(t('error_fetch'));
    }
    setLoading(false);
  }, [lang]);

  const runCustomSearch = useCallback(async (overrides = {}) => {
    const start = overrides.startDate || customStart;
    const end = overrides.endDate || customEnd;
    const minM = overrides.minMag ?? customMinMag;
    const bounds = overrides.bounds !== undefined ? overrides.bounds : searchBounds;
    setLoading(true); setFetchError(null);
    try {
      const features = await fetchCustomFeed({ start, end, minMag: minM, bounds });
      setQuakes(features); setLastUpdated(Date.now()); setCustomRan(true);
    } catch {
      setFetchError(t('error_fetch'));
    }
    setLoading(false);
  }, [customStart, customEnd, customMinMag, searchBounds, lang]);

  useEffect(() => {
    if (timeRange === 'custom') return;
    fetchStandard(timeRange);
  }, [timeRange, fetchStandard]);

  useEffect(() => {
    if (timeRange === 'custom') return;
    const ms = timeRange === 'day' ? 60_000 : 300_000;
    const id = setInterval(() => fetchStandard(timeRange), ms);
    return () => clearInterval(id);
  }, [timeRange, fetchStandard]);

  const processed = useMemo(() => {
    let list = quakes;
    if (depthFilter !== 'all') {
      list = list.filter((q) => {
        const d = Math.abs(q.geometry.coordinates[2] || 0);
        if (depthFilter === 'shallow') return d < 70;
        if (depthFilter === 'intermediate') return d >= 70 && d < 300;
        return d >= 300;
      });
    }
    if (timeRange !== 'custom') list = list.filter((q) => q.properties.mag >= minMag);
    if (nearMeActive && userLocation) {
      list = list.filter((q) => {
        const [lng, lat] = q.geometry.coordinates;
        return getDistance(userLocation.lat, userLocation.lng, lat, lng) <= nearMeRadius;
      });
    }
    list = [...list].sort((a, b) => {
      const dir = sortDirection === 'desc' ? -1 : 1;
      if (sortType === 'time') return dir * (a.properties.time - b.properties.time);
      return dir * (a.properties.mag - b.properties.mag);
    });
    return list;
  }, [quakes, depthFilter, minMag, sortType, sortDirection, nearMeActive, userLocation, nearMeRadius, timeRange]);

  const stats = useMemo(() => {
    const total = processed.length;
    const maxMag = total ? Math.max(...processed.map((q) => q.properties.mag)).toFixed(1) : '—';
    const significant = processed.filter((q) => q.properties.mag >= 4.5).length;
    return { total, maxMag, significant };
  }, [processed]);

  const selectedQuake = useMemo(
    () => processed.find((q) => q.id === selectedId) || quakes.find((q) => q.id === selectedId),
    [processed, quakes, selectedId],
  );

  useEffect(() => {
    if (!pendingDeeplink.current || !quakes.length) return;
    const target = quakes.find((q) => q.id === pendingDeeplink.current);
    if (target) { setSelectedId(target.id); pendingDeeplink.current = null; }
  }, [quakes]);

  useEffect(() => {
    if (timeRange !== 'custom' && quakes.length) lastStandardRef.current = { range: timeRange, quakes, lastUpdated };
  }, [quakes, timeRange, lastUpdated]);

  const navigateTo = useCallback((path, hash = '') => {
    const routeName = routeFromPath(path);
    setShowAuth(false); setShowBookmarks(false); setMobileMenuOpen(false); setShowProfile(false);
    setRoute(routeName);
    window.history.pushState({ route: routeName }, '', path + (hash || ''));
    if (hash) setTimeout(() => document.getElementById(hash.replace('#', ''))?.scrollIntoView(), 80);
  }, []);

  const backToMap = useCallback(() => {
    setRoute('map');
    const url = new URL(window.location.origin);
    url.pathname = '/';
    if (timeRange !== 'day') url.searchParams.set('range', timeRange);
    if (selectedId) url.searchParams.set('quake', selectedId);
    window.history.pushState({ route: 'map', timeRange, selectedId }, '', url.pathname + url.search);
  }, [timeRange, selectedId]);

  useEffect(() => {
    const onPop = () => {
      setRoute(routeFromPath(window.location.pathname));
      try {
        const p = new URLSearchParams(window.location.search);
        const range = p.get('range');
        if (['day', 'week', 'month', 'custom'].includes(range)) setTimeRange(range);
        const q = p.get('quake');
        if (q) setSelectedId(q);
      } catch {}
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (route !== 'map') return;
    const url = new URL(window.location.origin);
    url.pathname = '/';
    if (timeRange && timeRange !== 'day') url.searchParams.set('range', timeRange);
    if (selectedId) url.searchParams.set('quake', selectedId);
    const next = url.pathname + url.search;
    if (next !== window.location.pathname + window.location.search) {
      window.history.replaceState({ route: 'map', timeRange, selectedId }, '', next);
    }
  }, [timeRange, selectedId, route]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (isDrawing) { setIsDrawing(false); return; }
      if (mobileMenuOpen) { setMobileMenuOpen(false); return; }
      if (userMenuOpen) { setUserMenuOpen(false); return; }
      if (mobileFiltersOpen) { setMobileFiltersOpen(false); return; }
      if (selectedId) { setSelectedId(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDrawing, mobileMenuOpen, userMenuOpen, mobileFiltersOpen, selectedId]);

  const onSelect = useCallback((q) => {
    setSelectedId(q.id);
    if (isMobile) setSheetSnap('full');
  }, [isMobile]);

  const toggleSort = useCallback((kind) => {
    if (sortType === kind) setSortDirection((d) => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortType(kind); setSortDirection('desc'); }
  }, [sortType]);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => setToast(null), 2000);
  };

  const onToggleBookmark = useCallback(async (q) => {
    if (user) {
      const existing = bookmarksCol.data.find((b) => b.quakeId === q.id);
      if (existing) { await bookmarksCol.remove(existing.id); showToast(t('bookmark_removed')); }
      else {
        await bookmarksCol.add({
          quakeId: q.id, mag: q.properties.mag, place: q.properties.place, time: q.properties.time,
          lat: q.geometry.coordinates[1], lng: q.geometry.coordinates[0], depth: q.geometry.coordinates[2],
          source: q.source || 'USGS', url: q.properties.url || '',
        });
        showToast(t('bookmarked'));
      }
    } else {
      const existing = localBookmarks.find((b) => b.quakeId === q.id);
      if (existing) {
        setLocalBookmarks((prev) => prev.filter((b) => b.quakeId !== q.id));
        showToast(t('bookmark_removed'));
      } else {
        setLocalBookmarks((prev) => [{
          id: 'local_' + q.id, quakeId: q.id, mag: q.properties.mag, place: q.properties.place,
          time: q.properties.time, lat: q.geometry.coordinates[1], lng: q.geometry.coordinates[0],
          depth: q.geometry.coordinates[2], source: q.source || 'USGS', url: q.properties.url || '',
        }, ...prev]);
        showToast(t('bookmarked_local'));
      }
    }
  }, [user, bookmarksCol.data, localBookmarks]);

  const onShare = useCallback(async (q) => {
    const url = `${window.location.origin}/?quake=${encodeURIComponent(q.id)}`;
    try { await navigator.clipboard.writeText(url); showToast(t('link_copied')); }
    catch { showToast(t('copy_failed')); }
  }, []);

  const locateMe = useCallback(() => {
    if (!navigator.geolocation) { showToast(t('geolocation_unavailable')); return; }
    showToast(t('finding_location'));
    navigator.geolocation.getCurrentPosition((pos) => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserLocation(loc);
      try { localStorage.setItem('shakeviewer_my_location', JSON.stringify(loc)); } catch {}
      showToast(t('location_set'));
    }, () => showToast(t('location_unavailable')), { enableHighAccuracy: false, timeout: 10000 });
  }, []);

  useEffect(() => {
    if (nearMeActive && !userLocation) locateMe();
  }, [nearMeActive]);

  const filters = {
    depthFilter, onDepthFilter: setDepthFilter,
    minMag, onMinMag: setMinMag,
    showPlates, onShowPlates: setShowPlates,
    nearMeActive, onNearMeActive: setNearMeActive,
    nearMeRadius, onNearMeRadius: setNearMeRadius,
    sortType, sortDirection, onToggleSort: toggleSort,
    mapStyle, onMapStyle: setMapStyle,
    hideMinMag: timeRange === 'custom',
  };
  const customState = { start: customStart, end: customEnd, minMag: customMinMag, isDrawing, searchBounds };
  const customActions = {
    onStart: setCustomStart, onEnd: setCustomEnd, onMinMag: setCustomMinMag,
    onDraw: () => { setIsDrawing((d) => !d); if (!isDrawing) showToast(t('drag_to_draw')); },
    onClearBounds: () => setSearchBounds(null),
    onClear: () => {
      setCustomStart(defaultStart); setCustomEnd(defaultEnd); setCustomMinMag(4.0);
      setSearchBounds(null); setCustomRan(false); setFetchError(null);
      const last = lastStandardRef.current;
      if (last.quakes.length) {
        setQuakes(last.quakes);
        setLastUpdated(last.lastUpdated);
        setTimeRange(last.range || 'day');
      } else setTimeRange('day');
    },
    onRun: () => runCustomSearch(),
  };

  const emptyMsg = timeRange === 'custom' && customRan && processed.length === 0 ? t('empty_custom') : undefined;
  const floorNote = timeRange === 'day' ? t('day_note') : timeRange === 'week' ? t('week_note') : timeRange === 'month' ? t('month_note') : null;
  const liveAnnounce = t('live_announce', { n: stats.total, mag: stats.maxMag, ago: lastUpdated ? formatRelTime(lastUpdated) : t('live') });

  if (route !== 'map') {
    const titles = { privacy: t('privacy_policy'), terms: t('terms_of_use'), about: t('learn_title') };
    const bodies = { privacy: <PrivacyBody />, terms: <TermsBody />, about: <AboutBody /> };
    return (
      <DocumentPage title={titles[route]} onBack={backToMap} hash={route === 'about' ? window.location.hash : ''}>
        {bodies[route]}
      </DocumentPage>
    );
  }

  return (
    <div className="sv-app">
      <div className="sr-only" aria-live="polite" aria-atomic="true">{loading ? t('loading') : liveAnnounce}</div>
      <SvHeader
        timeRange={timeRange} onTimeRange={setTimeRange}
        isDark={isDark} onToggleTheme={() => setIsDark((v) => !v)}
        isMobile={isMobile} user={user}
        onOpenAuth={() => { setShowAuth(true); auth.ensureLoaded(); }}
        onOpenBookmarks={() => { setShowBookmarks(true); setUserMenuOpen(false); }}
        onOpenAbout={() => navigateTo('/about')}
        onOpenMenu={() => setMobileMenuOpen(true)}
        onOpenFilters={() => { setMobileFiltersOpen(true); setSheetSnap('full'); }}
        onOpenProfile={() => { setShowProfile(true); setUserMenuOpen(false); }}
        userMenuOpen={userMenuOpen}
        onUserMenuToggle={(e) => { e?.stopPropagation?.(); setUserMenuOpen((v) => !v); }}
        onSignOut={async () => { try { await auth.signOut(); showToast(t('signed_out')); } catch {} setUserMenuOpen(false); }}
        loading={loading}
        onRefresh={() => fetchStandard(timeRange)}
        lang={lang} onLang={setLangState}
        menuOpen={mobileMenuOpen} filtersOpen={mobileFiltersOpen}
      />
      <main id="main-content" className="sv-main" tabIndex={-1}>
        <SvMap
          quakes={processed} selectedId={selectedId} onSelect={onSelect}
          mapStyle={mapStyle} showPlates={showPlates} isDrawing={isDrawing}
          userLocation={userLocation} searchBounds={searchBounds}
          onDrawComplete={(b) => { setSearchBounds(b); setIsDrawing(false); showToast(t('boundary_selected')); }}
          bookmarks={bookmarkIdSet} onToggleBookmark={onToggleBookmark} onShare={onShare}
          mapRef={mapInstRef}
        />
        <Legend compact={isMobile} />
        <div className="map-controls-right">
          <button type="button" className="map-control-btn" onClick={() => mapInstRef.current?.zoomIn()} aria-label={t('zoom_in')} title={t('zoom_in')}><SvIcon name="plus" size={16} /></button>
          <button type="button" className="map-control-btn" onClick={() => mapInstRef.current?.zoomOut()} aria-label={t('zoom_out')} title={t('zoom_out')}><SvIcon name="minus" size={16} /></button>
        </div>
        <div className="map-controls-bottom">
          <button type="button" className={`map-control-btn ${userLocation ? 'on' : ''}`} onClick={locateMe} title={t('locate_me')} aria-label={t('locate_me')}>
            <SvIcon name="crosshair" size={16} />
          </button>
        </div>
        {!isMobile && (
          <DesktopPanel
            quakes={processed} selectedId={selectedId} onSelect={onSelect}
            timeRange={timeRange} stats={stats} loading={loading} lastUpdated={lastUpdated}
            fetchError={fetchError} onRefresh={() => fetchStandard(timeRange)}
            filters={filters} selectedQuake={selectedQuake} bookmarks={bookmarkIdSet}
            onBookmark={onToggleBookmark} onShare={onShare} onCloseDetail={() => setSelectedId(null)}
            expanded={panelExpanded} onToggleExpanded={() => setPanelExpanded((v) => !v)}
            customState={customState} customActions={customActions}
            userLocation={userLocation} emptyMsg={emptyMsg} floorNote={floorNote}
          />
        )}
        {isMobile && (
          <MobileSheet
            snap={sheetSnap} onSnap={setSheetSnap}
            quakes={processed} selectedId={selectedId} onSelect={onSelect}
            timeRange={timeRange} onTimeRange={setTimeRange}
            stats={stats} loading={loading} fetchError={fetchError}
            onRefresh={() => fetchStandard(timeRange)} filters={filters}
            selectedQuake={selectedQuake} bookmarks={bookmarkIdSet}
            onBookmark={onToggleBookmark} onShare={onShare} onCloseDetail={() => setSelectedId(null)}
            filtersOpen={mobileFiltersOpen} onCloseFilters={() => setMobileFiltersOpen(false)}
            customState={customState} customActions={customActions}
            userLocation={userLocation} emptyMsg={emptyMsg}
          />
        )}
        {isMobile && !selectedQuake && !mobileFiltersOpen && (
          <div className="mobile-view-toggle" role="group" aria-label={t('map_style')}>
            <button type="button" className={viewMode === 'map' ? 'on' : ''} aria-pressed={viewMode === 'map'}
              onClick={() => { setViewMode('map'); setSheetSnap('peek'); }}><SvIcon name="map" size={14} /> {t('map')}</button>
            <button type="button" className={viewMode === 'list' ? 'on' : ''} aria-pressed={viewMode === 'list'}
              onClick={() => { setViewMode('list'); setSheetSnap('full'); }}><SvIcon name="list" size={14} /> {t('list')}</button>
          </div>
        )}
      </main>
      <div className="sv-disclaimer-bar">
        <a href="/terms" onClick={(e) => { e.preventDefault(); navigateTo('/terms'); }}>{t('informational')}</a>
        {floorNote ? <span className="sv-disclaimer-floor"> · {floorNote}</span> : null}
      </div>
      {!isMobile && (
        <footer className="sv-footer">
          <div className="sv-footer-meta">
            <span>© {new Date().getFullYear()} ShakeViewer · {t('data_from')} <a href="https://earthquake.usgs.gov/" target="_blank" rel="noopener noreferrer">USGS</a> · <a href="https://www.seismicportal.eu/" target="_blank" rel="noopener noreferrer">EMSC</a></span>
            <span className="sv-disclaimer"> · <a href="/terms" onClick={(e) => { e.preventDefault(); navigateTo('/terms'); }}>{t('informational')}</a></span>
          </div>
          <div className="links">
            <a href="/about" onClick={(e) => { e.preventDefault(); navigateTo('/about'); }}>{t('about')}</a>
            <a href="/about#faq" onClick={(e) => { e.preventDefault(); navigateTo('/about', '#faq'); }}>{t('faq')}</a>
            <a href="/privacy" onClick={(e) => { e.preventDefault(); navigateTo('/privacy'); }}>{t('privacy')}</a>
            <a href="/terms" onClick={(e) => { e.preventDefault(); navigateTo('/terms'); }}>{t('terms')}</a>
          </div>
        </footer>
      )}
      {isMobile && !selectedQuake && mobileFiltersOpen && (
        <div className="mobile-legal-row">
          <button type="button" className="sv-btn primary" onClick={() => setMobileFiltersOpen(false)}>{t('see_results', { n: processed.length })}</button>
        </div>
      )}
      {toast && <div className="toast" role="status"><SvIcon name="check" size={14} />{toast}</div>}
      {showAuth && <AuthModal auth={auth} onClose={() => setShowAuth(false)} onOpenTerms={() => navigateTo('/terms')} onOpenPrivacy={() => navigateTo('/privacy')} />}
      {showProfile && user && <ProfileModal user={user} auth={auth} onClose={() => setShowProfile(false)} />}
      {showBookmarks && (
        <BookmarksPanel
          bookmarks={activeBookmarks}
          onRemove={(id) => user ? bookmarksCol.remove(id) : setLocalBookmarks((prev) => prev.filter((b) => b.id !== id))}
          onSelect={(quakeId) => { setSelectedId(quakeId); setShowBookmarks(false); }}
          onClose={() => setShowBookmarks(false)}
        />
      )}
      {mobileMenuOpen && (
        <Dialog onClose={() => setMobileMenuOpen(false)} titleId="menu-title" align="top" className="mobile-menu-card">
          <div className="modal-head">
            <h3 id="menu-title" className="display" style={{ fontSize: 20, margin: 0 }}>{t('menu')}</h3>
            <button type="button" className="sv-btn" onClick={() => setMobileMenuOpen(false)} style={{ padding: 8 }} aria-label={t('close')}><SvIcon name="close" size={16} /></button>
          </div>
          <div className="modal-body">
            {user
              ? <button type="button" className="sv-btn" onClick={() => { setMobileMenuOpen(false); setShowProfile(true); }} style={{ display: 'flex', width: '100%', padding: 10, marginBottom: 4, justifyContent: 'flex-start' }}><SvIcon name="user" size={16} /> {t('profile')}</button>
              : <button type="button" className="sv-btn primary" onClick={() => { setMobileMenuOpen(false); setShowAuth(true); auth.ensureLoaded(); }} style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}><SvIcon name="user" size={14} /> {t('sign_in')}</button>}
            <button type="button" className="sv-btn" onClick={() => { setMobileMenuOpen(false); setShowBookmarks(true); }} style={{ display: 'flex', width: '100%', padding: 10, marginBottom: 4, justifyContent: 'flex-start' }}>
              <SvIcon name="bookmark-filled" size={16} /> {t('bookmarks')}
            </button>
            <div className="hairline" style={{ margin: '8px 0' }} />
            <button type="button" className="sv-btn" onClick={() => navigateTo('/about')} style={{ display: 'flex', width: '100%', padding: 10, justifyContent: 'flex-start' }}><SvIcon name="book" size={16} /> {t('learn_title')}</button>
            <button type="button" className="sv-btn" onClick={() => navigateTo('/privacy')} style={{ display: 'flex', width: '100%', padding: 10, justifyContent: 'flex-start' }}>{t('privacy')}</button>
            <button type="button" className="sv-btn" onClick={() => navigateTo('/terms')} style={{ display: 'flex', width: '100%', padding: 10, justifyContent: 'flex-start' }}>{t('terms')}</button>
            <a className="sv-btn" href={`mailto:${SUPPORT_EMAIL}`} style={{ display: 'flex', width: '100%', padding: 10, justifyContent: 'flex-start', textDecoration: 'none' }}>{t('support')}</a>
            {user && (
              <Fragment>
                <div className="hairline" style={{ margin: '8px 0' }} />
                <button type="button" className="sv-btn" onClick={() => { setMobileMenuOpen(false); auth.signOut(); }} style={{ display: 'flex', width: '100%', padding: 10, justifyContent: 'flex-start' }}>
                  <SvIcon name="logout" size={16} /> {t('sign_out')}
                </button>
              </Fragment>
            )}
          </div>
        </Dialog>
      )}
      {tweaksOn && <TweaksPanel tweaks={tweaks} onChange={updateTweak} />}
    </div>
  );
}
