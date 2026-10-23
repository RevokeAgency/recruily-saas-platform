"""Bereitet die Dashboard-Aufnahmen (assets/dashboard/, capture-dashboard.mjs) für das
Dashboard-Showreel auf. Alles sind Ausschnitte der echten Aufnahme:

- base.jpg und die Bauteile des ersten Bildschirms, aus genau diesem Bild geschnitten,
  damit sie beim Zusammensetzen pixelgenau auf ihrer Stelle landen.
- Karten mit abgerundeten Ecken als Alpha, jeweils im Ruhe- und im Hover-Zustand.
- Für das Einfliegen der Zeilen: die Zeilen als Streifen der Karte und die Karte ohne
  Zeilen (die Zeilenbänder mit der Kartenfarbe abgedeckt, sonst unverändert).
- Der Button „Neuen Job erstellen" in Ruhe und Hover, freigestellt.

    python3 scripts/dashreel_prep.py
Ergebnis: public/showreel/dashboard/ und dashboard.json darin (Maße in CSS-Pixeln).
"""

import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
A = ROOT / "assets" / "dashboard"
OUT = ROOT / "public" / "showreel" / "dashboard"
OUT.mkdir(parents=True, exist_ok=True)
S = 2
D = json.loads((A / "dashboard.json").read_text())
RADIUS = 24  # Ecken der Karten (rounded-3xl)
meta = {"viewport": {"w": 1440, "h": 900}, "pieces": {}, "cards": {}}


def rounded(size, box, radius):
    k = 4
    m = Image.new("L", (size[0] * k, size[1] * k), 0)
    ImageDraw.Draw(m).rounded_rectangle([v * k for v in box], radius=radius * k, fill=255)
    return m.resize(size, Image.LANCZOS)


def masked(im, radius=RADIUS):
    im = im.convert("RGBA")
    im.putalpha(rounded(im.size, (0, 0, im.width - 1, im.height - 1), radius * S))
    return im


# ---------------------------------------------------------------- erster Bildschirm
vp = Image.open(A / "viewport.png").convert("RGB")
vp.save(OUT / "base.jpg", quality=92)


def cut(name, b, pad=4, radius=None):
    x, y, w, h = b["x"] - pad, b["y"] - pad, b["w"] + 2 * pad, b["h"] + 2 * pad
    im = vp.crop((round(x * S), round(y * S), round((x + w) * S), round((y + h) * S)))
    if radius:
        im = im.convert("RGBA")
        im.putalpha(rounded(im.size, (pad * S, pad * S, im.width - pad * S - 1, im.height - pad * S - 1), radius * S))
    im.save(OUT / f"p-{name}.png")
    meta["pieces"][name] = {"x": x, "y": y, "w": w, "h": h}


for name, b in D["parts"].items():
    cut(name, b)
for name in ["score", "quota", "prio"]:
    cut(name, D["cards"][name], pad=0, radius=RADIUS)

# ---------------------------------------------------------------- Feature-Karten
# Zeilen je Karte (y relativ zur Karte, Höhe), aus den Link-Rechtecken der Seite
ROWS = {
    "top": {"hover": "top-1", "ys": [61, 125, 189, 253, 317], "h": 60},
    "prio": {"hover": "prio-1", "ys": [60, 120, 180], "h": 56},
    "recent": {"hover": "recent-5", "ys": [61, 117, 173, 229, 285], "h": 52},
}
for name, spec in ROWS.items():
    c = D["cards"][name]
    idle = Image.open(A / f"card-{name}.png").convert("RGB")
    hover = Image.open(A / "hover" / f"{spec['hover']}.png").convert("RGB")
    masked(idle).save(OUT / f"{name}.png")
    masked(hover).save(OUT / f"{name}-hover.png")
    # Karte ohne Zeilen: Bänder mit der Kartenfarbe (Punkt neben der ersten Zeile) abdecken
    bg = idle.getpixel((idle.width // 2, (spec["ys"][0] - 6) * S))
    empty = idle.copy()
    d = ImageDraw.Draw(empty)
    for i, y in enumerate(spec["ys"]):
        d.rectangle([4 * S, (y - 2) * S, idle.width - 4 * S, (y + spec["h"] + 2) * S], fill=bg)
        idle.crop((0, (y - 2) * S, idle.width, (y + spec["h"] + 2) * S)).save(OUT / f"{name}-row{i}.png")
    masked(empty).save(OUT / f"{name}-empty.png")
    t = D["hovers"][spec["hover"]]["target"]
    meta["cards"][name] = {
        "w": c["w"], "h": c["h"], "rows": [{"y": y - 2, "h": spec["h"] + 4} for y in spec["ys"]],
        "target": {"x": t["x"] - c["x"] + t["w"] * 0.62, "y": t["y"] - c["y"] + t["h"] / 2},
    }

q = D["cards"]["quality"]
masked(Image.open(A / "card-quality.png")).save(OUT / "quality.png")
meta["cards"]["quality"] = {"w": q["w"], "h": q["h"]}

# ---------------------------------------------------------------- CTA-Button
for state, f in [("idle", "btn-job-idle"), ("hover", "btn-job")]:
    im = Image.open(A / "hover" / f"{f}.png").convert("RGBA")
    pad = 12 * S
    btn = im.crop((pad, pad, im.width - pad, im.height - pad))
    btn.putalpha(rounded(btn.size, (0, 0, btn.width - 1, btn.height - 1), btn.height / 2))
    btn.save(OUT / f"cta-{state}.png")
b = D["hovers"]["btn-job"]["target"]
meta["cta"] = {"w": b["w"], "h": b["h"]}

(OUT / "dashboard.json").write_text(json.dumps(meta, indent=2))
print(json.dumps(meta)[:900])
