#!/usr/bin/env python3
# Genera los íconos de «Añadir a inicio» (icons/*.png) sin dependencias:
# fondo azul de AgruPay a sangre (iOS redondea las esquinas) y las tres barras
# blancas del logo, con las proporciones del diseño de 96 px.
import os, struct, zlib

BLUE = (0x2E, 0x5B, 0xFF)
SS = 4  # supermuestreo para suavizar los bordes

def bars(size, inset):
    # Diseño a 96 px: barras de 12 de ancho, alturas 24/42/54, separación 9 y
    # 21 de margen inferior. `inset` encoge el dibujo para la zona segura maskable.
    k = size * (1 - 2 * inset) / 96
    off = size * inset
    w, gap, bottom, r = 12 * k, 9 * k, 21 * k, 3 * k
    x0 = off + (96 * k - (3 * w + 2 * gap)) / 2
    y1 = off + 96 * k - bottom
    return [(x0 + i * (w + gap), y1 - h * k, x0 + i * (w + gap) + w, y1, r) for i, h in enumerate((24, 42, 54))]

def inside(px, py, rect):
    x0, y0, x1, y1, r = rect
    if not (x0 <= px <= x1 and y0 <= py <= y1):
        return False
    cx = min(max(px, x0 + r), x1 - r)
    cy = min(max(py, y0 + r), y1 - r)
    return (px - cx) ** 2 + (py - cy) ** 2 <= r * r

def png(path, size, inset=0.0):
    rects = bars(size, inset)
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            hits = sum(inside(x + (i + 0.5) / SS, y + (j + 0.5) / SS, rc) for i in range(SS) for j in range(SS) for rc in rects)
            a = hits / (SS * SS)
            row += bytes(round(c + (255 - c) * a) for c in BLUE)
        rows.append(bytes(row))
    raw = zlib.compress(b''.join(rows), 9)
    chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xFFFFFFFF)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)) + chunk(b'IDAT', raw) + chunk(b'IEND', b''))

if __name__ == '__main__':
    out = os.path.join(os.path.dirname(__file__), '..', 'icons')
    os.makedirs(out, exist_ok=True)
    png(os.path.join(out, 'apple-touch-icon.png'), 180)
    png(os.path.join(out, 'icon-192.png'), 192)
    png(os.path.join(out, 'icon-512.png'), 512)
    png(os.path.join(out, 'icon-maskable-512.png'), 512, inset=0.1)
