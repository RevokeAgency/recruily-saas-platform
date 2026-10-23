"""
Zerlegt das Negativ-Logo (assets-src/logo-negativ.webp) in Einzelteile für
den Logo-Aufbau in Akt 4. Einmalig ausführen, die Ergebnisse liegen im Repo:

    python3 scripts/logo_parts.py

Ergebnis in public/logo/:
  badge.png        Verlaufskachel, die Aussparungen des R mit Verlauf gefüllt
  r-<n>.png        die weißen Bauteile des R (zusammenhängende Flächen)
  letter-<n>.png   die Buchstaben der Wortmarke R, e, v, e, t, l, y
  parts.json       Größe und Mittelpunkte, damit das Video die Teile
                   um ihren eigenen Mittelpunkt bewegen kann

Alle Teile haben dieselbe Leinwand (Begrenzungsrahmen des Logos), sie liegen
im Video deckungsgleich übereinander.

Braucht Pillow und numpy.
"""
import json
import os
from collections import deque

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "assets-src", "logo-negativ.webp")
OUT = os.path.join(HERE, "..", "public", "logo")

# Spaltengrenzen der Buchstaben (Pixel im Original), aus der Alpha-Projektion.
# e/v/e berühren sich, dort sind die Schnitte an den dünnsten Stellen gesetzt.
BADGE_X = (238, 530)
LETTERS = [(546, 734), (740, 914), (914, 1091), (1091, 1269), (1276, 1381), (1402, 1448), (1462, 1642)]
# Störpunkt über „ve" im Original
STRAY = (985, 1020, 555, 580)

img = np.array(Image.open(SRC).convert("RGBA")).astype(np.float64)
x0, x1, y0, y1 = STRAY
img[y1 - 25:y1, x0:x1, 3] = np.where(img[y1 - 25:y1, x0:x1, 3] > 0, 0, img[y1 - 25:y1, x0:x1, 3])

alpha = img[..., 3]
ys, xs = np.nonzero(alpha > 8)
top, bottom, left, right = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
img = img[top:bottom, left:right]
H, W = img.shape[:2]


def save(arr, name):
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA").save(os.path.join(OUT, name), optimize=True)


def center(mask):
    yy, xx = np.nonzero(mask)
    return {"cx": float(xx.mean()), "cy": float(yy.mean()), "x": int(xx.min()), "y": int(yy.min()),
            "w": int(xx.max() - xx.min() + 1), "h": int(yy.max() - yy.min() + 1)}


os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    os.remove(os.path.join(OUT, f))

# --- Badge und R ---------------------------------------------------------
bx0, bx1 = BADGE_X[0] - left, BADGE_X[1] - left
badge = np.zeros_like(img)
badge[:, bx0:bx1] = img[:, bx0:bx1]
rgb, a = badge[..., :3], badge[..., 3]
white = (rgb.min(axis=2) > 225) & (a > 128)
# weiche Kanten des R zählen auch dazu
white_soft = (rgb.min(axis=2) > 170) & (a > 64) & ~(np.abs(rgb[..., 0] - rgb[..., 2]) > 40)

# Verlauf der Kachel linear schätzen (Farbe ~ x, y) und in die Aussparungen malen
grad = (a > 250) & ~white_soft
yy, xx = np.nonzero(grad)
A = np.stack([xx, yy, np.ones_like(xx)], axis=1).astype(np.float64)
coef = [np.linalg.lstsq(A, badge[yy, xx, c], rcond=None)[0] for c in range(3)]
YY, XX = np.mgrid[0:H, 0:W]
fill = np.stack([coef[c][0] * XX + coef[c][1] * YY + coef[c][2] for c in range(3)], axis=2)
# Maske um 6 px erweitern, sonst bleiben die Kantenpixel des R als Linie stehen
grow = white_soft.copy()
for _ in range(6):
    g = grow.copy()
    g[1:] |= grow[:-1]
    g[:-1] |= grow[1:]
    g[:, 1:] |= grow[:, :-1]
    g[:, :-1] |= grow[:, 1:]
    grow = g
grow &= a > 250
# Startwert aus dem linearen Verlauf, dann glätten (Laplace-Füllung): die
# Kachel ist nicht exakt linear, sonst bliebe ein Schatten des R stehen.
badge_out = badge.copy()
badge_out[..., :3] = np.where(grow[..., None], fill, badge[..., :3])
c = badge_out[:, bx0:bx1, :3]
mk = grow[:, bx0:bx1]
for _ in range(1500):
    avg = (np.roll(c, 1, 0) + np.roll(c, -1, 0) + np.roll(c, 1, 1) + np.roll(c, -1, 1)) / 4
    c[mk] = avg[mk]
badge_out[:, bx0:bx1, :3] = c
save(badge_out, "badge.png")

# R-Bauteile: zusammenhängende weiße Flächen
labels = np.zeros((H, W), dtype=np.int32)
parts = []
n = 0
for sy, sx in zip(*np.nonzero(white_soft)):
    if labels[sy, sx]:
        continue
    n += 1
    q = deque([(sy, sx)])
    labels[sy, sx] = n
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and white_soft[ny, nx] and not labels[ny, nx]:
                labels[ny, nx] = n
                q.append((ny, nx))

r_parts = []
for k in range(1, n + 1):
    m = labels == k
    if m.sum() < 400:  # Krümel an den Kanten
        continue
    piece = np.zeros_like(img)
    piece[..., :3] = 255
    piece[..., 3] = np.where(m, np.clip((badge[..., :3].min(axis=2) - 150) / 105, 0, 1) * 255, 0)
    r_parts.append((m, piece))
# von oben nach unten, links nach rechts
r_parts.sort(key=lambda p: (center(p[0])["cy"], center(p[0])["cx"]))
r_meta = []
for i, (m, piece) in enumerate(r_parts):
    name = f"r-{i}.png"
    save(piece, name)
    r_meta.append({"file": name, **center(m)})

# --- Buchstaben ----------------------------------------------------------
letters = []
for i, (lx0, lx1) in enumerate(LETTERS):
    piece = np.zeros_like(img)
    a0, a1 = lx0 - left, lx1 - left
    piece[:, a0:a1] = img[:, a0:a1]
    name = f"letter-{i}.png"
    save(piece, name)
    letters.append({"file": name, **center(piece[..., 3] > 40)})

meta = {"width": W, "height": H, "badge": {"file": "badge.png", **center(badge[..., 3] > 40)},
        "r": r_meta, "letters": letters}
with open(os.path.join(OUT, "parts.json"), "w") as f:
    json.dump(meta, f, indent=2)
print(f"{W}x{H}, R-Teile: {len(r_meta)}, Buchstaben: {len(letters)}")
