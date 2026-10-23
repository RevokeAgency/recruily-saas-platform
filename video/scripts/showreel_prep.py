"""Bereitet die echten Website-Aufnahmen aus assets/ für den Showreel auf.

Alles hier sind Ausschnitte der Playwright-Aufnahmen, nichts wird nachgezeichnet:
- hero/: erster Bildschirm als Basis, dazu die Bauteile (Nav, Badge, vier
  Headline-Zeilen, Text, Button, Trust) aus genau diesem Bild geschnitten,
  damit sie beim Zusammensetzen pixelgenau auf ihrer Stelle landen.
- compare/: beide Ebenen des Vorher/Nachher-Reglers plus der echte Griff.
- score/, interview/: die Bildfolgen aus capture-anim.mjs, auf die Karte
  zugeschnitten (abgerundete Ecken als Alpha), als WebP.
- cta.png: der Hero-Button, freigestellt.

    python3 scripts/showreel_prep.py
Ergebnis: public/showreel/ und public/showreel/showreel.json (Maße in CSS-Pixeln).
"""

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
A = ROOT / "assets"
OUT = ROOT / "public" / "showreel"
S = 2  # deviceScaleFactor der Aufnahmen
UI = json.loads((A / "ui" / "ui.json").read_text())
meta = {}


def rounded(size, box, radius):
    """Alpha-Maske mit abgerundetem Rechteck, 4-fach überabgetastet."""
    k = 4
    m = Image.new("L", (size[0] * k, size[1] * k), 0)
    ImageDraw.Draw(m).rounded_rectangle([v * k for v in box], radius=radius * k, fill=255)
    return m.resize(size, Image.LANCZOS)


# ---------------------------------------------------------------- Hero
hero = OUT / "hero"
hero.mkdir(parents=True, exist_ok=True)
vp = Image.open(A / "ui" / "hero-viewport.png").convert("RGB")
vp.save(hero / "base.jpg", quality=90)
pieces = {}


def cut(name, x, y, w, h):
    vp.crop((x * S, y * S, (x + w) * S, (y + h) * S)).save(hero / f"{name}.png")
    pieces[name] = {"x": x, "y": y, "w": w, "h": h}


for key in ["hero-nav", "hero-badge", "hero-copy", "hero-cta", "hero-trust"]:
    r = UI[key]
    cut(key.removeprefix("hero-"), r["x"], r["y"], r["w"], r["h"])

# Headline in ihre vier Zeilen teilen (Grenzen aus den Textzeilen gemessen)
h = UI["hero-headline"]
bounds = [0, 71, 140, 202, h["h"]]
for i in range(4):
    cut(f"h{i + 1}", h["x"], h["y"] + bounds[i], h["w"], bounds[i + 1] - bounds[i])
meta["hero"] = {"w": 1440, "h": 900, "pieces": pieces}

# ---------------------------------------------------------------- Regler
cmp_dir = OUT / "compare"
cmp_dir.mkdir(exist_ok=True)
ohne = Image.open(A / "ui" / "compare-100.png").convert("RGB")
mit = Image.open(A / "ui" / "compare-0.png").convert("RGB")
mitte = Image.open(A / "ui" / "compare-50.png").convert("RGB")
ohne.save(cmp_dir / "ohne.jpg", quality=92)
mit.save(cmp_dir / "mit.jpg", quality=92)

# Griff: Kreis (Mitte 1142/397, r 44) und Linie (Spalten 1138–1143) aus der Mittelstellung
W2, H2 = mitte.size
gx0, gx1 = 1086, 1198
strip = mitte.crop((gx0, 0, gx1, H2)).convert("RGBA")
alpha = Image.new("L", strip.size, 0)
d = ImageDraw.Draw(alpha)
cx, cy, r = 1142 - gx0, 397, 46
d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
d.rectangle([1138 - gx0, 0, 1143 - gx0, H2], fill=255)
strip.putalpha(alpha.filter(ImageFilter.GaussianBlur(0.8)))
strip.save(cmp_dir / "handle.png")
meta["compare"] = {
    "w": W2 / S, "h": H2 / S,
    "divider": 1140.5 / S,  # Linie in der Mittelstellung
    "handle": {"x0": gx0 / S, "w": (gx1 - gx0) / S, "knobY": cy / S},
    "radius": 30, "inset": 2,
}

# ---------------------------------------------------------------- Bildfolgen


def sequence(name, first, last, pad_x=40, pad_y=6):
    src = A / "anim" / name
    out = OUT / name
    out.mkdir(exist_ok=True)
    frames = sorted(src.glob("*.png"))[first : last + 1]
    w, h = Image.open(frames[0]).size
    mask = rounded((w, h), (pad_x * S, pad_y * S, w - pad_x * S - 1, h - pad_y * S - 1), 30 * S)
    for i, f in enumerate(frames):
        im = Image.open(f).convert("RGBA")
        im.putalpha(mask)
        im.crop((pad_x * S, pad_y * S, w - pad_x * S, h - pad_y * S)).save(out / f"{i:04d}.webp", quality=90, method=5)
    meta[name] = {"frames": len(frames), "first": first, "w": (w - 2 * pad_x * S) / S, "h": (h - 2 * pad_y * S) / S}


sequence("score", 1, 60)  # ab Bild 1 (Avatar geladen) bis lange nach 87
sequence("interview", 0, 77)
meta["score"]["split"] = 1213 / S - 40  # Grenze linke/rechte Spalte, in der zugeschnittenen Karte
# Klicks im Gesprächsleitfaden (Bild, in dem die Füllung startet, Mitte des Knopfs in CSS-Pixeln der Karte)
meta["interview"]["clicks"] = [
    {"frame": 18, "x": 362 / S - 40, "y": 401 / S - 6},
    {"frame": 24, "x": 430 / S - 40, "y": 705 / S - 6},
    {"frame": 31, "x": 362 / S - 40, "y": 963 / S - 6},
]
meta["interview"]["countFrom"] = 39
meta["interview"]["countTo"] = 55
meta["interview"]["match"] = {"x": 1106 / S - 40, "y": 1110 / S - 6}

# ---------------------------------------------------------------- CTA-Button
cta = Image.open(A / "ui" / "hero-cta.png").convert("RGB")
a = np.asarray(cta).astype(int)
sat = (a[:, :, 1] > 150) & (a[:, :, 0] < 120)
ys, xs = np.where(sat)
box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
btn = cta.crop(box).convert("RGBA")
bw, bh = btn.size
btn.putalpha(rounded((bw, bh), (0, 0, bw - 1, bh - 1), bh / 2))
btn.save(OUT / "cta.png")
meta["cta"] = {"w": bw / S, "h": bh / S}

(OUT / "showreel.json").write_text(json.dumps(meta, indent=2))
print(json.dumps(meta, indent=1)[:1500])
