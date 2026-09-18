"""
Overlay a fractional grid on a background so zones can be read off it directly.

Zones in this game are fractions of width and height, never pixels. Placing them
by eye against the art is guesswork; placing them against a labelled 10% grid is
measurement.

    python tools/grid.py public/art/bg-club.png tools/out/grid-club.png
"""

import sys
from PIL import Image, ImageDraw

SCENE_W, SCENE_H = 1200, 800


def main(src: str, dst: str) -> None:
    img = Image.open(src).convert("RGB").resize((SCENE_W, SCENE_H), Image.LANCZOS)
    d = ImageDraw.Draw(img, "RGBA")

    for i in range(1, 10):
        f = i / 10
        x = int(f * SCENE_W)
        y = int(f * SCENE_H)
        heavy = i == 5
        col = (255, 0, 0, 210) if heavy else (255, 255, 255, 130)
        d.line([(x, 0), (x, SCENE_H)], fill=col, width=2 if heavy else 1)
        d.line([(0, y), (SCENE_W, y)], fill=col, width=2 if heavy else 1)
        d.text((x + 3, 4), f"{f:.1f}", fill=(255, 40, 40, 255))
        d.text((4, y + 3), f"{f:.1f}", fill=(255, 40, 40, 255))

    # finer ticks every 5%, so a zone edge can be read to about 0.02
    for i in range(1, 20):
        if i % 2 == 0:
            continue
        f = i / 20
        x = int(f * SCENE_W)
        y = int(f * SCENE_H)
        d.line([(x, 0), (x, 12)], fill=(255, 255, 0, 220), width=1)
        d.line([(x, SCENE_H - 12), (x, SCENE_H)], fill=(255, 255, 0, 220), width=1)
        d.line([(0, y), (12, y)], fill=(255, 255, 0, 220), width=1)

    img.save(dst)
    print(f"{dst}  ({img.width}x{img.height})")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
