"""Kontaktabzug eines Showreels: ein Bild pro Beat, je Format eine Zeile.

    pnpm stills Showreel && python3 scripts/contact-sheet.py            → out/showreel-contact-sheet.png
    pnpm stills Dashreel && python3 scripts/contact-sheet.py Dashreel   → out/dashreel-contact-sheet.png
"""

import sys

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
STILLS = ROOT / "out" / "stills"
# Sekunden wie SHOWREEL / DASHREEL in scripts/stills.mjs
SHEETS = {
    "Showreel": [
        (2.6, "1 Hook"),
        (5.6, "2 UI baut sich auf"),
        (9.1, "3 Feature: Ranking"),
        (11.9, "4 Feature: Match-Analyse"),
        (15.1, "5 Feature: Gespräch"),
        (17.4, "6 Kennzahl"),
        (19.6, "7 Logo + CTA"),
    ],
    "Dashreel": [
        (2.4, "1 Hook"),
        (5.7, "2 Dashboard baut sich auf"),
        (9.2, "3 Feature: Top-Kandidaten"),
        (12.2, "4 Feature: Prioritäten"),
        (15.2, "5 Feature: Posteingang"),
        (17.4, "6 Kennzahl"),
        (19.6, "7 Logo + CTA"),
    ],
}
NAME = sys.argv[1] if len(sys.argv) > 1 else "Showreel"
BEATS = SHEETS[NAME]
ROWS = [("9x16", 520), ("1x1", 300), ("16x9", 300)]  # Höhe der Kacheln je Format
PAD, HEAD = 24, 54

font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)


def still(fmt, sec):
    s = f"{sec:g}".replace(".", "-")
    return Image.open(STILLS / f"{NAME}-{fmt}_{s}s.png").convert("RGB")


col_w = 0
tiles = {}
for fmt, h in ROWS:
    for sec, _ in BEATS:
        im = still(fmt, sec)
        w = round(im.width * h / im.height)
        tiles[(fmt, sec)] = im.resize((w, h), Image.LANCZOS)
        col_w = max(col_w, w)

W = PAD + len(BEATS) * (col_w + PAD)
H = HEAD + sum(h + PAD + 30 for _, h in ROWS) + PAD
sheet = Image.new("RGB", (W, H), "#0b1512")
d = ImageDraw.Draw(sheet)
for i, (sec, name) in enumerate(BEATS):
    x = PAD + i * (col_w + PAD)
    d.text((x, 16), name, font=font, fill="#e8f2f2")
y = HEAD
for fmt, h in ROWS:
    d.text((PAD, y), fmt.replace("x", ":"), font=small, fill="#22c1ee")
    y += 30
    for i, (sec, _) in enumerate(BEATS):
        tile = tiles[(fmt, sec)]
        x = PAD + i * (col_w + PAD) + (col_w - tile.width) // 2
        sheet.paste(tile, (x, y))
        d.text((x + 8, y + h - 26), f"{sec:g} s", font=small, fill="#ffffff")
    y += h + PAD

out = ROOT / "out" / f"{NAME.lower()}-contact-sheet.png"
sheet.save(out)
print(out.relative_to(ROOT), sheet.size)
