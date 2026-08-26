import { describe, expect, it } from 'vitest';
import { emscUrl, featuresOf, fetchEmsc, fetchJson, HARD_LIMIT, liveUrls } from './feeds.js';

describe('fetchJson contract', () => {
  it('treats 200 + non-JSON as error', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = async () => new Response('404 File Not Found', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    try {
      const r = await fetchJson('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/nope.geojson');
      expect(r.ok).toBe(false);
      expect(r.parseError).toBe(true);
    } finally {
      globalThis.fetch = orig;
    }
  });

  it('treats empty FeatureCollection as success', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ type: 'FeatureCollection', metadata: { count: 0 }, features: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    try {
      const r = await fetchJson('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
      expect(r.ok).toBe(true);
      expect(r.parseError).toBeFalsy();
      expect(r.data.features).toEqual([]);
    } finally {
      globalThis.fetch = orig;
    }
  });

  it('treats 204 as empty success', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = async () => new Response(null, { status: 204 });
    try {
      const r = await fetchJson('https://www.seismicportal.eu/fdsnws/event/1/query');
      expect(r.ok).toBe(true);
      expect(r.empty).toBe(true);
    } finally {
      globalThis.fetch = orig;
    }
  });

  it('marks 429/5xx as skip', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = async () => new Response('nope', { status: 503 });
    try {
      const r = await fetchJson('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
      expect(r.ok).toBe(false);
      expect(r.skip).toBe(true);
    } finally {
      globalThis.fetch = orig;
    }
  });
});

describe('EMSC URLs', () => {
  it('uses format=json with starttime, endtime, and limit=2500', () => {
    const url = emscUrl({
      startIso: '2026-08-24T00:00:00.000Z',
      endIso: '2026-08-25T00:00:00.000Z',
      minmag: 2.5,
    });
    const u = new URL(url);
    expect(u.searchParams.get('format')).toBe('json');
    expect(u.searchParams.get('format')).not.toBe('geojson');
    expect(u.searchParams.get('starttime')).toBeTruthy();
    expect(u.searchParams.get('endtime')).toBeTruthy();
    expect(u.searchParams.get('limit')).toBe(String(HARD_LIMIT));
  });

  it('live URLs always send EMSC start+end+limit and never geojson', () => {
    const { emsc } = liveUrls('24h', Date.parse('2026-08-25T12:00:00.000Z'));
    const u = new URL(emsc);
    expect(u.searchParams.get('format')).toBe('json');
    expect(u.searchParams.has('starttime')).toBe(true);
    expect(u.searchParams.has('endtime')).toBe(true);
    expect(u.searchParams.get('limit')).toBe('2500');
    expect(u.searchParams.get('minmag')).toBe('2.5');
  });

  it('30d EMSC minmag is 4.5 and USGS uses 4.5_month', () => {
    const { emsc, usgs } = liveUrls('30d', Date.parse('2026-08-25T12:00:00.000Z'));
    expect(new URL(emsc).searchParams.get('minmag')).toBe('4.5');
    expect(usgs).toContain('4.5_month.geojson');
  });

  it('requires endtime', () => {
    expect(() => emscUrl({ startIso: '2026-08-24T00:00:00.000Z', minmag: 2.5 })).toThrow();
  });
});

describe('featuresOf', () => {
  it('reads FeatureCollection lists', () => {
    expect(featuresOf({ type: 'FeatureCollection', features: [{ id: 1 }, { id: 2 }] })).toHaveLength(2);
  });
  it('branches a bare Feature from eventid', () => {
    const f = { type: 'Feature', geometry: { coordinates: [1, 2, 3] }, properties: { mag: 4 } };
    expect(featuresOf(f)).toEqual([f]);
  });
});

describe('fetchEmsc', () => {
  it('treats opaque CORS failure as source-down', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
    try {
      const r = await fetchEmsc('https://www.seismicportal.eu/fdsnws/event/1/query?format=json');
      expect(r.ok).toBe(false);
      expect(r.skip).toBe(true);
    } finally {
      globalThis.fetch = orig;
    }
  });
});
