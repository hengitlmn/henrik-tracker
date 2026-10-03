"""Erzeugt die App-Icons aus assets/logo-original.png.

Das Original hat abgerundete Ecken mit schwarzem Hintergrund. iOS rundet Icons selbst ab und fuellt
Transparenz/Ecken sonst schwarz. Deshalb werden die Ecken weiss aufgefuellt und das Bild als
quadratisches, deckendes PNG in 180/192/512 px gespeichert.

Aufruf (im Projektordner): python3 tools/make_icons.py   (benoetigt: pip install pillow)
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "logo-original.png"
OUT = ROOT / "public"
BG = (254, 254, 254)

src = Image.open(SRC).convert("RGB")
w, h = src.size

filled = src.copy()
for seed in [(2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3)]:
    ImageDraw.floodfill(filled, seed, (255, 255, 255), thresh=190)

# ersetzte Pixel aufweiten, damit auch der dunkle Randsaum der alten Rundung verschwindet
diff = ImageChops.difference(src, filled).convert("L").point(lambda v: 255 if v > 0 else 0)
mask = diff.filter(ImageFilter.MaxFilter(15))
clean = Image.composite(Image.new("RGB", (w, h), BG), src, mask)

for size in (180, 192, 512):
    clean.resize((size, size), Image.LANCZOS).save(OUT / f"icon-{size}.png")
    print("geschrieben:", OUT / f"icon-{size}.png")
