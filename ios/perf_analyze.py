#!/usr/bin/env python3
"""Summarize an xctrace 'hitches' export, optionally split by bench phases (bench.json)."""
import sys, json, xml.etree.ElementTree as ET
xmlp = sys.argv[1]; bench = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else None
import os
if os.path.getsize(xmlp) == 0:
    print("hitches table empty (0 hitches recorded)"); sys.exit(0)
root = ET.parse(xmlp).getroot()
ids = {}
def val(e):
    if e is None: return None
    if 'ref' in e.attrib: return ids[e.attrib['ref']]
    ids[e.attrib.get('id')] = e
    for c in e: val(c)
    return e
rows = []
for r in root.iter('row'):
    cells = [val(c) for c in r]
    st = int(cells[0].text) / 1e9; du = int(cells[1].text) / 1e6
    proc = cells[2].attrib.get('fmt', '')
    sysflag = cells[3].text == '1'
    if 'ShakeViewer' in proc: rows.append((st, du))
tot = sum(d for _, d in rows)
print(f"hitches={len(rows)} total_hitch_ms={tot:.0f} worst_ms={max([d for _,d in rows] or [0]):.0f}")
if bench:
    for p in bench['phases']:
        a, b = p['start'], p['end']
        sel = [d for s, d in rows if a <= s <= b]
        dur = b - a
        print(f"  {p['phase']:<14} {dur:5.1f}s  hitches={len(sel):3d}  hitch_ms={sum(sel):6.0f}  ratio={sum(sel)/(dur*1000)*1000:6.1f} ms/s  worst={max(sel or [0]):.0f}ms")
