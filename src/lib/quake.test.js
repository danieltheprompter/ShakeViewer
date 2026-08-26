import { describe, expect, it } from 'vitest';
import { haversineKm } from './geo.js';
import { fmtMag } from './mag.js';
import { clampMinmag, customChipLabel, DEFAULT_QUERY, ingestFloor, parseQuery, serializeQuery } from './query.js';
import { fdsnTimeRange } from './time.js';
import {
  depthKmFromFeature,
  eventsMatch,
  keepEmscEvent,
  keepUsgsEvent,
  mergeQuakes,
  normalizeEmsc,
  normalizeUsgs,
} from './quake.js';

describe('fmtMag', () => {
  it('does not throw on null', () => {
    expect(fmtMag(null)).toBe('—');
    expect(fmtMag(undefined)).toBe('—');
    expect(fmtMag(Number.NaN)).toBe('—');
    expect(fmtMag(6)).toBe('6.0');
  });
});

describe('depthKmFromFeature', () => {
  it('uses abs(z) for USGS negative geometry Z', () => {
    expect(depthKmFromFeature({ geometry: { coordinates: [10, 20, -33.2] }, properties: {} })).toBe(33.2);
  });
  it('uses abs(z) for EMSC negative geometry Z', () => {
    expect(depthKmFromFeature({ geometry: { coordinates: [10, 20, -12] }, properties: { depth: 12 } })).toBe(12);
  });
  it('falls back to properties.depth when z missing', () => {
    expect(depthKmFromFeature({ geometry: { coordinates: [10, 20] }, properties: { depth: -8 } })).toBe(8);
  });
});

describe('source-specific type filters', () => {
  it('USGS keeps earthquake and missing type, drops quarry blast', () => {
    expect(keepUsgsEvent({ properties: { type: 'earthquake' } })).toBe(true);
    expect(keepUsgsEvent({ properties: {} })).toBe(true);
    expect(keepUsgsEvent({ properties: { type: 'quarry blast' } })).toBe(false);
    expect(keepUsgsEvent({ properties: { type: 'explosion' } })).toBe(false);
  });
  it('EMSC keeps evtype ke or absent; does not require type===earthquake', () => {
    expect(keepEmscEvent({ properties: { evtype: 'ke' } })).toBe(true);
    expect(keepEmscEvent({ properties: {} })).toBe(true);
    expect(keepEmscEvent({ properties: { evtype: 'ke', type: undefined } })).toBe(true);
    expect(keepEmscEvent({ properties: { evtype: 'uk' } })).toBe(false);
  });
  it('does not drop EMSC rows that lack properties.type', () => {
    const q = normalizeEmsc({
      properties: { mag: 4.1, time: '2026-08-25T12:00:00.000Z', unid: 'abc', flynn_region: 'Greece', evtype: 'ke' },
      geometry: { coordinates: [22, 38, -10] },
    });
    expect(q).not.toBeNull();
    expect(q.id).toBe('emsc_abc');
  });
});

describe('normalize', () => {
  it('normalizes USGS epoch time and ComCat id', () => {
    const q = normalizeUsgs({
      id: 'us7000abcd',
      properties: { mag: 4.2, place: 'near foo', time: 1_700_000_000_000, felt: 3, tsunami: 0, type: 'earthquake' },
      geometry: { coordinates: [-120, 35, 10] },
    });
    expect(q.id).toBe('us7000abcd');
    expect(q.ids.usgs).toBe('us7000abcd');
    expect(q.time).toBe(1_700_000_000_000);
    expect(q.felt).toBe(3);
    expect(q.depthKm).toBe(10);
  });
  it('drops non-earthquake USGS types', () => {
    expect(normalizeUsgs({
      id: 'nn0001',
      properties: { mag: 2.6, place: 'blast', time: 1, type: 'quarry blast' },
      geometry: { coordinates: [0, 0, 1] },
    })).toBeNull();
  });
  it('normalizes EMSC ISO time and emsc_ id; no felt/tsunami', () => {
    const q = normalizeEmsc({
      properties: { mag: 3.8, time: '2026-08-25T12:00:00.000Z', unid: '20260825_0001', flynn_region: 'Greece' },
      geometry: { coordinates: [22, 38, -14] },
    });
    expect(q.id).toBe('emsc_20260825_0001');
    expect(q.ids.emsc).toBe('20260825_0001');
    expect(q.time).toBe(Date.parse('2026-08-25T12:00:00.000Z'));
    expect(q.felt).toBeNull();
    expect(q.tsunami).toBe(0);
    expect(q.depthKm).toBe(14);
  });
});

describe('merge 90s / 80km', () => {
  const usgs = {
    id: 'us1',
    ids: { usgs: 'us1' },
    source: 'USGS',
    mag: 5.1,
    magType: 'mww',
    time: 1_000_000,
    updated: null,
    place: 'USGS place',
    lon: 10,
    lat: 20,
    depthKm: 12,
    felt: 4,
    cdi: 3,
    tsunami: 0,
    url: 'https://earthquake.usgs.gov/earthquakes/eventpage/us1',
    status: 'reviewed',
    sig: 100,
  };
  const nearEmsc = {
    id: 'emsc_x',
    ids: { emsc: 'x' },
    source: 'EMSC',
    mag: 5.4,
    magType: 'mw',
    time: 1_000_000 + 60_000,
    updated: null,
    place: 'EMSC place',
    lon: 10.2,
    lat: 20.1,
    depthKm: 10,
    felt: null,
    cdi: null,
    tsunami: 0,
    url: 'https://www.seismicportal.eu/eventdetails.html?unid=x',
    status: null,
    sig: null,
  };

  it('matches within 90s and 80km and keeps USGS fields', () => {
    expect(haversineKm(20, 10, 20.1, 10.2)).toBeLessThan(80);
    const merged = mergeQuakes([usgs], [nearEmsc], 2.5);
    expect(merged).toHaveLength(1);
    expect(merged[0].source).toBe('BOTH');
    expect(merged[0].id).toBe('us1');
    expect(merged[0].ids.emsc).toBe('x');
    expect(merged[0].mag).toBe(5.1);
    expect(merged[0].place).toBe('USGS place');
    expect(merged[0].felt).toBe(4);
  });

  it('does not match on id strings', () => {
    const emscSameId = { ...nearEmsc, time: 1_000_000 + 200_000, lat: 40, lon: -70 };
    const merged = mergeQuakes([usgs], [emscSameId], 2.5);
    expect(merged).toHaveLength(2);
  });

  it('does not eat aftershocks just outside 90s', () => {
    const after = { ...nearEmsc, id: 'emsc_a', time: 1_000_000 + 91_000 };
    const merged = mergeQuakes([usgs], [after], 2.5);
    expect(merged).toHaveLength(2);
  });

  it('takes EMSC mag when USGS mag is null', () => {
    const merged = mergeQuakes([{ ...usgs, mag: null }], [nearEmsc], 2.5);
    expect(merged[0].mag).toBe(5.4);
    expect(merged[0].source).toBe('BOTH');
  });

  it('appends unmatched EMSC as emsc_ id', () => {
    const far = { ...nearEmsc, lat: -40, lon: 170, time: 5_000_000 };
    const merged = mergeQuakes([usgs], [far], 2.5);
    expect(merged.map((q) => q.id).sort()).toEqual(['emsc_x', 'us1']);
  });

  it('drops below window floor including USGS 2.45 leak', () => {
    const leak = { ...usgs, id: 'us2', mag: 2.47 };
    const merged = mergeQuakes([leak, usgs], [], 2.5);
    expect(merged.map((q) => q.id)).toEqual(['us1']);
  });

  it('7d floor drops USGS-only 2.5–3.4', () => {
    const small = { ...usgs, id: 'us3', mag: 2.8 };
    const merged = mergeQuakes([small], [], 3.5);
    expect(merged).toHaveLength(0);
  });
});

describe('eventsMatch', () => {
  it('is true at the 80km / 90s boundary interior', () => {
    const a = { time: 0, lat: 0, lon: 0 };
    const b = { time: 90_000, lat: 0, lon: 0 };
    expect(eventsMatch(a, b)).toBe(true);
  });
  it('is false past 90s', () => {
    expect(eventsMatch({ time: 0, lat: 0, lon: 0 }, { time: 90_001, lat: 0, lon: 0 })).toBe(false);
  });
});

describe('floors', () => {
  it('uses honest display floors', () => {
    expect(ingestFloor('24h')).toBe(2.5);
    expect(ingestFloor('7d')).toBe(3.5);
    expect(ingestFloor('30d')).toBe(4.5);
    expect(clampMinmag('30d', 2.5)).toBe(4.5);
    expect(clampMinmag('7d', 2.5)).toBe(3.5);
    expect(clampMinmag('24h', 4)).toBe(4);
  });
});

describe('parseQuery', () => {
  it('clamps minmag to range floor', () => {
    const q = parseQuery('range=30d&minmag=2.5');
    expect(q.minmag).toBe(4.5);
    expect(q.range).toBe('30d');
  });
  it('defaults map to Light under light chrome, Dark under dark chrome', () => {
    expect(parseQuery('', null, 'light').map).toBe('light');
    expect(parseQuery('', null, 'dark').map).toBe('dark');
  });
  it('keeps satellite as an override in either theme', () => {
    expect(parseQuery('map=satellite', null, 'light').map).toBe('satellite');
    expect(parseQuery('map=satellite', null, 'dark').map).toBe('satellite');
  });
  it('omits the theme-default map from the query string; keeps satellite', () => {
    expect(serializeQuery({ ...DEFAULT_QUERY, map: 'light' }, { theme: 'light' }).get('map')).toBeNull();
    expect(serializeQuery({ ...DEFAULT_QUERY, map: 'dark' }, { theme: 'dark' }).get('map')).toBeNull();
    expect(serializeQuery({ ...DEFAULT_QUERY, map: 'satellite' }, { theme: 'light' }).get('map')).toBe('satellite');
  });
  it('treats ?event= and /event/:id as the same selection', () => {
    expect(parseQuery('event=us7000abcd').event).toBe('us7000abcd');
    expect(parseQuery('', 'us7000abcd').event).toBe('us7000abcd');
    expect(parseQuery('event=fromquery', 'frompath').event).toBe('frompath');
    expect(serializeQuery({ ...DEFAULT_QUERY, event: 'us1' }).get('event')).toBe('us1');
    expect(serializeQuery(DEFAULT_QUERY).get('event')).toBeNull();
  });
  it('parses bbox=west,south,east,north and still honors minlat quartet', () => {
    const boxed = parseQuery('range=custom&start=2026-08-18T00:00:00.000Z&end=2026-08-25T00:00:00.000Z&minmag=4&bbox=-30,10,-10,20');
    expect(boxed.minlon).toBe(-30);
    expect(boxed.minlat).toBe(10);
    expect(boxed.maxlon).toBe(-10);
    expect(boxed.maxlat).toBe(20);
    const legacy = parseQuery('range=custom&start=2026-08-18&end=2026-08-25&minlat=10&maxlat=20&minlon=-30&maxlon=-10');
    expect(legacy.minlat).toBe(10);
    expect(legacy.maxlon).toBe(-10);
  });
  it('writes bbox= and does not write minlat quartet or draw', () => {
    const p = serializeQuery({
      ...DEFAULT_QUERY,
      range: 'custom',
      start: '2026-08-18T00:00:00.000Z',
      end: '2026-08-25T12:00:00.000Z',
      minmag: 4,
      minlat: 10,
      maxlat: 20,
      minlon: -30,
      maxlon: -10,
      draw: 1,
    });
    expect(p.get('range')).toBe('custom');
    expect(p.get('start')).toBe('2026-08-18T00:00:00.000Z');
    expect(p.get('end')).toBe('2026-08-25T12:00:00.000Z');
    expect(p.get('bbox')).toBe('-30,10,-10,20');
    expect(p.get('minlat')).toBeNull();
    expect(p.get('maxlat')).toBeNull();
    expect(p.get('minlon')).toBeNull();
    expect(p.get('maxlon')).toBeNull();
    expect(p.get('draw')).toBeNull();
  });
  it('parses draw=1 but does not keep it as query state to serialize', () => {
    expect(parseQuery('range=custom&draw=1').draw).toBe(1);
    expect(serializeQuery(parseQuery('range=custom&draw=1')).get('draw')).toBeNull();
  });
  it('fills a 7-day custom window when start/end are missing', () => {
    const now = Date.parse('2026-08-25T12:00:00.000Z');
    const q = parseQuery('range=custom', null, 'dark', now);
    expect(q.range).toBe('custom');
    expect(q.minmag).toBe(4);
    expect(Date.parse(q.end)).toBe(now);
    expect(Date.parse(q.start)).toBe(now - 7 * 86400000);
  });
  it('labels the custom chip as the query, with area when boxed', () => {
    expect(customChipLabel({
      start: '2026-08-18',
      end: '2026-08-25',
      minmag: 4,
    }, 'en')).toBe('Aug 18–25 · M4.0+');
    expect(customChipLabel({
      start: '2026-08-18',
      end: '2026-08-25',
      minmag: 4,
      minlat: 1,
      maxlat: 2,
      minlon: 3,
      maxlon: 4,
    }, 'en', 'area')).toBe('Aug 18–25 · M4.0+ · area');
  });
});

describe('fdsnTimeRange', () => {
  it('expands date-only and passes ISO through', () => {
    expect(fdsnTimeRange('2026-08-18', '2026-08-25')).toEqual({
      startIso: '2026-08-18T00:00:00',
      endIso: '2026-08-25T23:59:59',
    });
    expect(fdsnTimeRange('2026-08-18T01:00:00.000Z', '2026-08-25T02:00:00.000Z')).toEqual({
      startIso: '2026-08-18T01:00:00.000Z',
      endIso: '2026-08-25T02:00:00.000Z',
    });
  });
});
