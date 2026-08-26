import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { applyClientFilters, findByAnyId, sortQuakes, statsOf } from './lib/quake.js';
import { clampMinmag, ingestFloor, parseQuery, queryString } from './lib/query.js';
import { formatRelTime } from './lib/time.js';
import { fmtMag } from './lib/mag.js';
import { fetchUsgsDetail } from './lib/feeds.js';
import { getLang, initLang, t } from './lib/i18n.js';
import { useAuth, useBookmarks, useMedia } from './hooks/useAuth.js';
import { useFeed } from './hooks/useFeed.js';
import { AppHeader } from './components/AppHeader.jsx';
import { QueryBar } from './components/QueryBar.jsx';
import { FilterPopover } from './components/FilterPopover.jsx';
import { EventRow } from './components/EventRow.jsx';
import { MapChrome } from './components/MapChrome.jsx';
import { DisclaimerBar } from './components/StatusLive.jsx';
import { EmptyState } from './components/StatusLive.jsx';
import { DocPage } from './components/DocPage.jsx';
import { AuthDialog } from './components/AuthDialog.jsx';
import { SearchPage } from './components/SearchPage.jsx';
import { BottomSheet, MapListPill } from './components/BottomSheet.jsx';

initLang();

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/event/:id" element={<Shell><Monitor /></Shell>} />
        <Route path="/search" element={<Shell><SearchRoute /></Shell>} />
        <Route path="/signin" element={<Shell><SignInRoute /></Shell>} />
        <Route path="/about" element={<Shell><DocPage page="about" /></Shell>} />
        <Route path="/faq" element={<Shell><DocPage page="faq" /></Shell>} />
        <Route path="/privacy" element={<Shell><DocPage page="privacy" /></Shell>} />
        <Route path="/terms" element={<Shell><DocPage page="terms" /></Shell>} />
        <Route path="/" element={<Shell><Monitor /></Shell>} />
      </Routes>
    </BrowserRouter>
  );
}

function readTheme() {
  try { return localStorage.getItem('sv_theme') === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
}

function Shell({ children }) {
  const [lang, setLangTick] = useState(getLang());
  const [theme, setTheme] = useState(readTheme);
  const mobile = useMedia();
  const { user, signOut } = useAuth();
  const loc = useLocation();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('lang', getLang());
    document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem('sv_theme', theme); } catch { /* ignore */ }
  }, [theme]);

  useEffect(() => {
    const on = () => setLangTick(getLang());
    window.addEventListener('sv-lang', on);
    return () => window.removeEventListener('sv-lang', on);
  }, []);

  const monitor = loc.pathname === '/' || loc.pathname.startsWith('/event/');

  return (
    <div className={`sv-app ${monitor ? '' : 'doc'}`} data-lang={lang}>
      <AppHeader
        theme={theme}
        onToggleTheme={() => {
          setTheme((prev) => {
            const next = prev === 'dark' ? 'light' : 'dark';
            window.dispatchEvent(new CustomEvent('sv-theme', { detail: { theme: next, prev } }));
            return next;
          });
        }}
        user={user}
        onSignOut={signOut}
        isMobile={mobile}
      />
      <div id="main-content" className="sv-stage" data-overflow={monitor ? 'clip' : 'scroll'}>
        {children}
      </div>
      <footer className="sv-footer">
        <DisclaimerBar />
        <div className="sv-footer-links">
          <Link to="/about">{t('about')}</Link>
          <Link to="/faq">{t('faq')}</Link>
          <Link to="/privacy">{t('privacy')}</Link>
          <Link to="/terms">{t('terms')}</Link>
          <a href="mailto:danieltheprompter@gmail.com">{t('support')}</a>
        </div>
      </footer>
    </div>
  );
}

function SearchRoute() {
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  return <SearchPage theme={theme} />;
}

function SignInRoute() {
  return <AuthDialog fullPage />;
}

function Monitor() {
  const [params] = useSearchParams();
  const { id: pathId } = useParams();
  const nav = useNavigate();
  const mobile = useMedia();
  const { user } = useAuth();
  const bookmarks = useBookmarks(user);
  const [theme, setTheme] = useState(readTheme);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [starredOn, setStarredOn] = useState(false);
  const [sheet, setSheet] = useState('default');
  const [mapMode, setMapMode] = useState('map');
  const [userLocation, setUserLocation] = useState(() => {
    try { return JSON.parse(localStorage.getItem('shakeviewer_my_location') || 'null'); } catch { return null; }
  });
  const [note, setNote] = useState(null);
  const [, setTick] = useState(0);
  const [detailExtra, setDetailExtra] = useState(null);

  const query = useMemo(() => parseQuery(params, pathId, theme), [params, pathId, theme]);

  const patch = useCallback((partial) => {
    const next = { ...parseQuery(params, pathId, theme), ...partial };
    if (partial.range) next.minmag = clampMinmag(partial.range, next.minmag);
    const qs = queryString(next, theme);
    const path = pathId ? `/event/${encodeURIComponent(pathId)}` : '/';
    nav(`${path}${qs}`, { replace: true });
  }, [params, pathId, nav, theme]);

  useEffect(() => {
    const on = (e) => {
      const next = e.detail?.theme;
      setTheme(next);
      // Light chrome → Light tiles. Satellite stays an override. Never leave a dark map under light chrome.
      if (next === 'light' && query.map !== 'satellite') patch({ map: 'light' });
      if (next === 'dark' && query.map !== 'satellite') patch({ map: 'dark' });
    };
    window.addEventListener('sv-theme', on);
    return () => window.removeEventListener('sv-theme', on);
  }, [query.map, patch]);

  const feed = useFeed(query);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (query.near && !userLocation) locate();
  }, [query.near]);

  const filtered = useMemo(() => {
    let list = applyClientFilters(feed.quakes, {
      minmag: query.minmag,
      maxmag: query.maxmag,
      depth: query.depth,
      near: query.near,
      userLocation,
    });
    if (starredOn) list = list.filter((q) => bookmarks.ids.has(q.id));
    return sortQuakes(list, query.sort);
  }, [feed.quakes, query.minmag, query.maxmag, query.depth, query.near, query.sort, userLocation, starredOn, bookmarks.ids]);

  const stats = useMemo(() => statsOf(filtered), [filtered]);
  const selectedEventId = pathId || query.event || null;
  const selectedQuake = selectedEventId
    ? (findByAnyId(filtered, selectedEventId) || findByAnyId(feed.quakes, selectedEventId) || (detailExtra && findByAnyId([detailExtra], selectedEventId)))
    : null;

  useEffect(() => {
    if (!selectedEventId || findByAnyId(feed.quakes, selectedEventId) || (detailExtra && findByAnyId([detailExtra], selectedEventId))) return;
    fetchUsgsDetail(selectedEventId).then((q) => { if (q) setDetailExtra(q); });
  }, [selectedEventId, feed.quakes, detailExtra]);

  const clearSelection = useCallback(() => {
    const next = { ...parseQuery(params, pathId, theme), event: null };
    nav(`/${queryString(next, theme)}`, { replace: true });
  }, [params, pathId, nav, theme]);

  const selectEvent = useCallback((q) => {
    if (!q) return;
    if (selectedEventId && findByAnyId([q], selectedEventId)) {
      clearSelection();
      return;
    }
    const next = { ...parseQuery(params, pathId, theme), event: q.id };
    nav(`/${queryString(next, theme)}`, { replace: true });
  }, [params, pathId, nav, theme, selectedEventId, clearSelection]);

  useEffect(() => {
    const id = selectedQuake?.id;
    if (!id) return undefined;
    const rid = requestAnimationFrame(() => {
      document.querySelectorAll(`[data-event-id="${CSS.escape(id)}"]`)
        .forEach((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
    });
    return () => cancelAnimationFrame(rid);
  }, [selectedQuake?.id]);

  const share = async (q) => {
    const url = `${window.location.origin}/event/${encodeURIComponent(q.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      setNote(t('link_copied'));
    } catch {
      setNote(t('copy_failed'));
    }
    setTimeout(() => setNote(null), 1800);
  };

  const bookmark = async (q) => {
    if (!user) {
      nav('/signin');
      return;
    }
    const r = await bookmarks.toggle(q);
    setNote(r === 'removed' ? t('bookmark_removed') : t('bookmarked'));
    setTimeout(() => setNote(null), 1800);
  };

  const locate = () => {
    if (!navigator.geolocation) { setNote(t('geolocation_unavailable')); return; }
    setNote(t('finding_location'));
    navigator.geolocation.getCurrentPosition((pos) => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserLocation(loc);
      try { localStorage.setItem('shakeviewer_my_location', JSON.stringify(loc)); } catch { /* ignore */ }
      setNote(t('location_set'));
      setTimeout(() => setNote(null), 1800);
    }, () => setNote(t('location_unavailable')), { enableHighAccuracy: false, timeout: 10000 });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (filtersOpen) { setFiltersOpen(false); return; }
      if (selectedEventId) { clearSelection(); return; }
      if (query.range === 'custom') { patch({ range: '24h', start: null, end: null }); return; }
      if (mobile && sheet !== 'default') setSheet('default');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filtersOpen, selectedEventId, query.range, mobile, sheet, clearSelection]);

  const sourceChip = !feed.usgsOk ? t('usgs_unavailable') : !feed.emscOk ? t('emsc_unavailable') : null;
  const listDim = feed.refreshing && !feed.firstLoad;

  const listBlock = (
    <>
      <QueryBar
        statusKind={feed.statusKind}
        seconds={feed.seconds}
        stats={stats}
        range={query.range === 'custom' ? '' : query.range}
        onRange={(r) => patch({ range: r, start: null, end: null, minmag: ingestFloor(r) })}
        onOpenFilters={() => setFiltersOpen((v) => !v)}
        filtersOpen={filtersOpen}
        refreshing={feed.refreshing}
        firstLoad={feed.firstLoad}
        starredOn={starredOn}
        onToggleStarred={() => setStarredOn((v) => !v)}
        showStarred={!!user}
        sourceChip={sourceChip}
      />
      {filtersOpen && (
        <div style={{ position: 'relative' }}>
          <FilterPopover
            query={query}
            onChange={(p) => patch(p)}
            onClose={() => setFiltersOpen(false)}
            sheet={mobile}
          />
        </div>
      )}
      {query.range === '30d' && <div className="banner">{t('month_floor_note')}</div>}
      {feed.truncated && <div className="banner warn">{t('showing_newest', { n: feed.truncated })}</div>}
      {feed.banner === 'feeds' && feed.lastOk && (
        <div className="banner warn">{t('feeds_unavailable', { rel: formatRelTime(feed.lastOk, t) })}</div>
      )}
      {feed.error && <div className="banner warn">{feed.error === 'offline' ? t('offline') : feed.error}</div>}
      <div className={`sv-list-scroll ${listDim ? 'dim' : ''}`} aria-label={t('event_list')}>
        {feed.firstLoad ? (
          Array.from({ length: 8 }).map((_, i) => <div key={i} className="skel" />)
        ) : filtered.length === 0 ? (
          <EmptyState mag={query.minmag} onClear={() => patch({ minmag: ingestFloor(query.range), depth: 'all', near: 0 })} />
        ) : (
          <div className="sv-rows">
            {filtered.map((q) => (
              <EventRow
                key={q.id}
                quake={q}
                selected={selectedQuake ? q.id === selectedQuake.id : false}
                bookmarked={bookmarks.ids.has(q.id)}
                onSelect={selectEvent}
                onBookmark={bookmark}
                onShare={share}
                signedIn={!!user}
                theme={theme}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );

  const map = (
    <MapChrome
      quakes={filtered}
      selectedId={selectedEventId}
      selectedQuake={selectedQuake}
      onSelect={selectEvent}
      onClear={clearSelection}
      mapStyle={query.map}
      plates={!!query.plates}
      theme={theme}
      userLocation={userLocation}
      onLocate={locate}
      onMapStyle={(s) => patch({ map: s })}
      onPlates={(on) => patch({ plates: on ? 1 : 0 })}
      searchBounds={query.minlat != null ? {
        minLat: query.minlat, maxLat: query.maxlat, minLon: query.minlon, maxLon: query.maxlon,
      } : null}
    />
  );

  return (
    <main className="sv-main">
      <aside className="sv-list">{listBlock}</aside>
      {map}
      {mobile && (
        <>
          <BottomSheet
            detent={mapMode === 'list' ? 'full' : sheet}
            onDetent={(d) => { setSheet(d); setMapMode(d === 'full' ? 'list' : 'map'); }}
          >
            {listBlock}
          </BottomSheet>
          <MapListPill
            mode={mapMode}
            onMode={(m) => {
              setMapMode(m);
              setSheet(m === 'list' ? 'full' : 'peek');
            }}
          />
        </>
      )}
      {note && <div className="toast-stack"><div className="toast">{note}</div></div>}
      {feed.toasts.length > 0 && (
        <div className="toast-stack">
          {feed.toasts.map((x) => (
            <button key={x.id} className="toast" onClick={() => { feed.dismissToast(x.id); const q = findByAnyId(feed.quakes, x.id); if (q) selectEvent(q); }}>
              {t('new_quake', { mag: fmtMag(x.mag), place: x.place })}
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
