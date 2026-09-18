"""
Turn the generated source art into what the game actually ships.

Two jobs:

1. Backgrounds become 1200x800 JPEGs. They have no transparency, they are drawn
   full-frame, and 2.5 MB of PNG per scene is not something to send down the wire
   five times.

2. Cut-outs get trimmed to their content. The generator returns a figure floating
   in a big transparent square, so the file's edges say nothing about where the
   person actually is. Cropping to the alpha bounding box means a zone can be
   placed against the art and the art lands exactly in it.

    python tools/prep.py
"""

from pathlib import Path
from PIL import Image

ART = Path("public/art")
SCENE = (1200, 800)
CUT_MAX = 900


def do_background(src: Path) -> None:
    img = Image.open(src).convert("RGB").resize(SCENE, Image.LANCZOS)
    dst = src.with_suffix(".jpg")
    img.save(dst, quality=88, optimize=True)
    src.unlink()
    print(f"{dst.name:20} {img.width}x{img.height}  {dst.stat().st_size // 1024} KB")


def do_cutout(src: Path) -> None:
    img = Image.open(src).convert("RGBA")
    box = img.split()[-1].getbbox()  # alpha channel bounds
    if box:
        img = img.crop(box)
    if max(img.size) > CUT_MAX:
        scale = CUT_MAX / max(img.size)
        img = img.resize(
            (round(img.width * scale), round(img.height * scale)), Image.LANCZOS
        )
    img.save(src, optimize=True)
    print(f"{src.name:20} {img.width}x{img.height}  {src.stat().st_size // 1024} KB")


def main() -> None:
    for f in sorted(ART.glob("bg-*.png")):
        do_background(f)
    for f in sorted(ART.glob("cut-*.png")):
        do_cutout(f)


if __name__ == "__main__":
    main()
