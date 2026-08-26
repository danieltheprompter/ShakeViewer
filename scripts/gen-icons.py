#!/usr/bin/env python3
"""Minimal PNG writer for ShakeViewer brand marks (no Pillow)."""
import struct, zlib, math, os

OUT = "/workspace/public"

def png(w, h, rgba_fn):
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        for x in range(w):
            raw.extend(rgba_fn(x, y, w, h))
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b"")

def icon(x, y, w, h):
    cx, cy, r = w/2, h/2, w*0.42
    dx, dy = x+0.5-cx, y+0.5-cy
    d = math.hypot(dx, dy)
    bg = (10, 13, 18, 255)
    if d > r:
        return (0, 0, 0, 0) if w >= 180 else bg
    # fill
    t = d / r
    r_c = int(6 + (34-6)*(1-t*0.3))
    g_c = int(182 + (211-182)*(1-t))
    b_c = int(212)
    # waveform
    nx = (x - w*0.18) / (w*0.64)
    wave = math.sin(nx * math.pi * 3.2) * (w * 0.12) * math.sin(max(0, min(1, nx)) * math.pi)
    on_wave = abs((y+0.5) - (cy - wave)) < max(1.2, w*0.035)
    if on_wave and 0.08 < nx < 0.92:
        return (255, 255, 255, 255)
    return (r_c, g_c, min(255, b_c + int(20*(1-t))), 255)

def og(x, y, w, h):
    # dark bg
    px = [10, 13, 18, 255]
    # left accent bar
    if x < 12:
        return (6, 182, 212, 255)
    # circle mark
    cx, cy, r = 180, h/2, 90
    dx, dy = x+0.5-cx, y+0.5-cy
    d = math.hypot(dx, dy)
    if d < r:
        return icon(int((x-cx+r)*(192/(2*r))), int((y-cy+r)*(192/(2*r))), 192, 192)
    # title block (simple rectangles approximating glyphs is overkill — solid wordmark bar)
    if 300 < x < 980 and 230 < y < 310:
        return (232, 238, 244, 255)
    if 300 < x < 720 and 340 < y < 390:
        return (107, 124, 148, 255)
    return px

os.makedirs(OUT, exist_ok=True)
os.makedirs(os.path.join(OUT, "icons"), exist_ok=True)

for name, size in [("favicon-32.png", 32), ("apple-touch-icon.png", 180)]:
    open(os.path.join(OUT, name), "wb").write(png(size, size, icon))
open(os.path.join(OUT, "icons", "icon-192.png"), "wb").write(png(192, 192, icon))
open(os.path.join(OUT, "icons", "icon-512.png"), "wb").write(png(512, 512, icon))
open(os.path.join(OUT, "og.png"), "wb").write(png(1200, 630, og))
print("wrote icons")
