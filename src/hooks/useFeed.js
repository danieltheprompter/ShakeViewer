import { useCallback, useEffect, useRef, useState } from 'react';
import { bboxOf } from '../lib/query.js';
import { RANGE_POLL_MS } from '../lib/query.js';
import { fetchCustom, fetchLive, HARD_LIMIT } from '../lib/feeds.js';
import { fmtMag } from '../lib/mag.js';

const SEEN_KEY = 'sv_seen_m45';

function loadSeen() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) || '[]'));
  } catch {
    return new Set();
  }
}
function saveSeen(set) {
  try { sessionStorage.setItem(SEEN_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}

export function useFeed(query) {
  const [quakes, setQuakes] = useState([]);
  const [firstLoad, setFirstLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastOk, setLastOk] = useState(null);
  const [usgsOk, setUsgsOk] = useState(true);
  const [emscOk, setEmscOk] = useState(true);
  const [banner, setBanner] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [truncated, setTruncated] = useState(null);
  const [error, setError] = useState(null);
  const skipUsgs = useRef(0);
  const skipEmsc = useRef(0);
  const seeded = useRef(false);
  const abortRef = useRef(null);
  const quakesRef = useRef(quakes);
  const firstRef = useRef(firstLoad);
  quakesRef.current = quakes;
  firstRef.current = firstLoad;

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    if (!firstRef.current) setRefreshing(true);
    setError(null);
    try {
      const skipU = skipUsgs.current > 0;
      const skipE = skipEmsc.current > 0;
      if (skipUsgs.current > 0) skipUsgs.current -= 1;
      if (skipEmsc.current > 0) skipEmsc.current -= 1;

      const res = query.range === 'custom'
        ? await fetchCustom({
          start: query.start,
          end: query.end,
          minM: query.minmag,
          bbox: bboxOf(query),
          signal: ctrl.signal,
          skipUsgs: skipU,
          skipEmsc: skipE,
        })
        : await fetchLive(query.range, { signal: ctrl.signal, skipUsgs: skipU, skipEmsc: skipE });

      if (ctrl.signal.aborted) return;

      if (res.usgsSkip) skipUsgs.current = Math.max(skipUsgs.current, 2);
      if (res.emscSkip) skipEmsc.current = Math.max(skipEmsc.current, 2);

      if (res.fdsn400) {
        setError(res.message);
        setUsgsOk(false);
        return;
      }

      if (res.bothFailed && quakesRef.current.length) {
        setUsgsOk(false);
        setEmscOk(false);
        setBanner('feeds');
        return;
      }

      if (res.quakes) {
        if (query.range === '24h') {
          const seen = loadSeen();
          if (!seeded.current && seen.size === 0) {
            res.quakes.forEach((q) => seen.add(q.id));
            saveSeen(seen);
            seeded.current = true;
          } else {
            seeded.current = true;
            const fresh = [];
            for (const q of res.quakes) {
              if (seen.has(q.id)) continue;
              seen.add(q.id);
              if (q.mag != null && q.mag >= 4.5) fresh.push(q);
            }
            saveSeen(seen);
            if (fresh.length) {
              setToasts((prev) => [...fresh.map((q) => ({
                id: q.id,
                mag: q.mag,
                place: q.place,
              })), ...prev].slice(0, 5));
            }
          }
        }
        setQuakes(res.quakes);
        if (res.usgsOk || res.emscOk) setLastOk(Date.now());
        setUsgsOk(!!res.usgsOk);
        setEmscOk(!!res.emscOk);
        setBanner(res.bothFailed ? 'feeds' : null);
        setTruncated(res.truncated ? res.totalCount : null);
        setFirstLoad(false);
      }
    } catch {
      if (!quakesRef.current.length) setError('offline');
      else setBanner('feeds');
    } finally {
      setRefreshing(false);
    }
  }, [query.range, query.start, query.end, query.minmag, query.minlat, query.maxlat, query.minlon, query.maxlon]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ms = RANGE_POLL_MS[query.range] || 0;
    if (!ms) return undefined;
    const id = setInterval(load, ms);
    return () => clearInterval(id);
  }, [load, query.range]);

  const statusKind = (() => {
    if (firstLoad && !lastOk) return 'delayed';
    if (!usgsOk && !emscOk) return 'offline';
    const age = lastOk ? Date.now() - lastOk : 999999;
    if (!usgsOk || !emscOk) return 'delayed';
    if (age < 30_000) return 'live';
    if (age < 120_000) return 'delayed';
    return 'offline';
  })();

  const seconds = lastOk ? Math.max(0, Math.floor((Date.now() - lastOk) / 1000)) : null;

  return {
    quakes,
    firstLoad,
    refreshing,
    lastOk,
    usgsOk,
    emscOk,
    banner,
    toasts,
    dismissToast: (id) => setToasts((t) => t.filter((x) => x.id !== id)),
    truncated,
    error,
    statusKind,
    seconds,
    reload: load,
    HARD_LIMIT,
    fmtMag,
  };
}
