"""
Render a rough preview of a level and outline its zones.

This is a placement check, not a second implementation of the game. It mirrors
only what matters for getting zones right: the backdrop, the cut-outs at their
zones, an optional night tint, and the zone rectangles drawn on top. If a zone
does not sit on the thing it is supposed to measure, it shows up here.

    python tools/preview.py level1
"""

import sys
import numpy as np
from PIL import Image, ImageDraw

SCENE = (1200, 800)
ART = "public/art/"

# (name, [(cutout, zone, alpha)], night tint or None, {zone name: zone})
LEVELS = {
    "level1": (
        "bg-club.jpg",
        [
            ("cut-subject.png", (0.10, 0.48, 0.12, 0.20), 1.0),
            ("cut-subject.png", (0.21, 0.48, 0.12, 0.20), 1.0),
            ("cut-subject.png", (0.32, 0.48, 0.12, 0.20), 1.0),
            ("cut-subject.png", (0.61, 0.48, 0.12, 0.20), 1.0),
            ("cut-bouncer.png", (0.72, 0.44, 0.14, 0.26), 1.0),
        ],
        None,
        {
            "bouncer": (0.72, 0.44, 0.14, 0.26),
            "sign": (0.35, 0.21, 0.30, 0.12),
            "door": (0.42, 0.41, 0.16, 0.28),
            "facade": (0.09, 0.13, 0.81, 0.59),
        },
    ),
    "level2": (
        "bg-street.jpg",
        [
            ("cut-car.png", (0.63, 0.51, 0.30, 0.22), 1.0),
            ("cut-subject.png", (0.42, 0.44, 0.15, 0.26), 1.0),
        ],
        (63, 74, 140),
        {
            "car": (0.63, 0.51, 0.30, 0.22),
            "street_sign": (0.10, 0.05, 0.16, 0.09),
            "witness": (0.42, 0.44, 0.15, 0.26),
            "block": (0.00, 0.02, 0.62, 0.66),
        },
    ),
    "level3": (
        "bg-marina.jpg",
        [
            ("cut-subject.png", (0.40, 0.44, 0.16, 0.26), 1.0),
        ],
        (90, 102, 153),
        {
            "subject": (0.40, 0.44, 0.16, 0.26),
            "reflection": (0.62, 0.30, 0.24, 0.26),
            "water": (0.40, 0.73, 0.16, 0.17),
            "clock": (0.17, 0.06, 0.09, 0.14),
            "boat": (0.00, 0.45, 0.24, 0.30),
            "dock": (0.24, 0.60, 0.72, 0.13),
        },
    ),
    "level4": (
        "bg-lot.jpg",
        [("cut-car.png", (0.32, 0.52, 0.30, 0.22), 1.0)],
        None,
        {
            "spot": (0.32, 0.52, 0.30, 0.22),
            "spot_shadow": (0.29, 0.76, 0.36, 0.06),
            "parked": (0.00, 0.40, 0.25, 0.32),
            "gate": (0.76, 0.24, 0.21, 0.38),
        },
    ),
    "level5": (
        "bg-archive.jpg",
        [
            ("cut-witness.png", (0.38, 0.26, 0.26, 0.35), 1.0),
        ],
        None,
        {
            "face": (0.45, 0.28, 0.12, 0.15),
            "label": (0.06, 0.86, 0.34, 0.09),
            "folder": (0.66, 0.65, 0.24, 0.12),
            "room": (0.00, 0.00, 1.00, 0.62),
        },
    ),
}


def box(z):
    x, y, w, h = z
    return (
        int(x * SCENE[0]),
        int(y * SCENE[1]),
        int((x + w) * SCENE[0]),
        int((y + h) * SCENE[1]),
    )


def main(name: str) -> None:
    bg, cuts, night, zones = LEVELS[name]
    img = Image.open(ART + bg).convert("RGBA").resize(SCENE, Image.LANCZOS)

    for cut, z, alpha in cuts:
        c = Image.open(ART + cut).convert("RGBA")
        x0, y0, x1, y1 = box(z)
        c = c.resize((max(1, x1 - x0), max(1, y1 - y0)), Image.LANCZOS)
        if alpha < 1:
            a = c.split()[-1].point(lambda v: int(v * alpha))
            c.putalpha(a)
        img.alpha_composite(c, (x0, y0))

    if night:
        # the same multiply the game does: base * tint / 255
        arr = np.asarray(img.convert("RGB"), dtype=np.uint16)
        tint = np.array(night, dtype=np.uint16)
        img = Image.fromarray(((arr * tint) // 255).astype(np.uint8)).convert("RGBA")

    d = ImageDraw.Draw(img)
    colours = ["#ff3b3b", "#3bff6e", "#3bc8ff", "#ffd43b", "#ff3bd4", "#ffffff"]
    for i, (zname, z) in enumerate(zones.items()):
        x0, y0, x1, y1 = box(z)
        c = colours[i % len(colours)]
        d.rectangle([x0, y0, x1, y1], outline=c, width=3)
        d.text((x0 + 5, y0 + 4), zname, fill=c)

    dst = f"tools/out/preview-{name}.png"
    img.convert("RGB").save(dst)
    print(dst)


if __name__ == "__main__":
    main(sys.argv[1])
