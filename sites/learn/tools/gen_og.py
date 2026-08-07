#!/usr/bin/env python3
"""
Generates the Open Graph share image for learn.xplabs.us.

The other two origins share a piece of game key art. That is right for the hub
and for the games catalog and wrong for a school, so XP Education gets its own:
the mark from icons/icon.svg, the wordmark, and the two facts that actually
matter to someone deciding whether to click — that it is free and that it works
offline.

The subject count is read from the catalog rather than typed in, so it cannot
drift away from the site the way a hardcoded number would.

    python3 tools/gen_og.py        # run from sites/learn/

Output: og.jpg, 1200x630.
"""

import json
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FONTS = "/mnt/skills/examples/canvas-design/canvas-fonts"

W, H = 1200, 630
SS = 2                      # supersample, then downscale — kills jaggies on the mark

INK      = (245, 242, 234)
MUTED    = (155, 168, 163)
GROUND   = (11, 15, 16)
ACCENT_A = (61, 227, 138)    # #3DE38A — top of the icon's gradient
ACCENT_B = (31, 169, 104)    # #1FA968 — bottom


def font(name, size):
    """OFL faces. Rendering glyphs into a raster is not font redistribution."""
    return ImageFont.truetype(os.path.join(FONTS, name), size)


def subject_count():
    with open(os.path.join(ROOT, "content", "catalog.json"), encoding="utf-8") as f:
        cat = json.load(f)
    return sum(len(d["subjects"]) for d in cat["domains"])


def linear_gradient(size, top, bottom):
    """A vertical two-stop ramp, used to fill the mark."""
    w, h = size
    grad = Image.new("RGB", (1, h))
    px = grad.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        px[0, y] = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
    return grad.resize((w, h), Image.BICUBIC)


def draw_mark(size):
    """
    The graduation cap from icons/icon.svg, on the icon's own 512 viewBox so the
    two stay in step. Returns an RGBA image with the gradient already applied.
    """
    s = size / 512
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)

    # M256 118 76 190l180 72 180-72-180-72z  — the mortarboard
    d.polygon([(256 * s, 118 * s), (76 * s, 190 * s),
               (256 * s, 262 * s), (436 * s, 190 * s)], fill=255)

    # M150 276v66c0 30 47 54 106 54s106-24 106-54v-66l-106 42-106-42z — the body.
    # The SVG rounds the lower corners; at this size a straight chamfer reads the
    # same and avoids hand-fitting bezier control points.
    d.polygon([(150 * s, 276 * s), (150 * s, 342 * s), (178 * s, 384 * s),
               (256 * s, 396 * s), (334 * s, 384 * s), (362 * s, 342 * s),
               (362 * s, 276 * s), (256 * s, 318 * s)], fill=140)

    # The tassel, which the icon carries and which reads at this size.
    d.line([(436 * s, 190 * s), (436 * s, 300 * s)], fill=255, width=max(1, round(7 * s)))
    d.ellipse([(436 - 13) * s, 296 * s, (436 + 13) * s, 322 * s], fill=255)

    mark = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mark.paste(linear_gradient((size, size), ACCENT_A, ACCENT_B), (0, 0), mask)
    return mark


def build():
    w, h = W * SS, H * SS
    img = Image.new("RGB", (w, h), GROUND)

    # A soft green bloom behind the mark, so the panel is not a flat rectangle.
    glow = Image.new("RGB", (w, h), GROUND)
    ImageDraw.Draw(glow).ellipse(
        [-160 * SS, -260 * SS, 620 * SS, 480 * SS], fill=(16, 40, 30))
    img = Image.blend(img, glow.filter(ImageFilter.GaussianBlur(120 * SS)), 0.85)

    d = ImageDraw.Draw(img)

    # Hairline frame, inset — gives the card an edge on light-themed timelines.
    d.rectangle([28 * SS, 28 * SS, w - 28 * SS, h - 28 * SS],
                outline=(30, 37, 39), width=2 * SS)

    mark_px = 132 * SS
    left, top = 92 * SS, 150 * SS
    img.paste(draw_mark(mark_px), (left, top), draw_mark(mark_px))

    f_word = font("InstrumentSans-Bold.ttf", 92 * SS)
    f_sub = font("InstrumentSans-Regular.ttf", 34 * SS)
    f_mono = font("JetBrainsMono-Regular.ttf", 24 * SS)

    d.text((left + mark_px + 40 * SS, top + 26 * SS), "XP Education",
           font=f_word, fill=INK)

    n = subject_count()
    d.text((left, top + mark_px + 74 * SS),
           "Free. Works fully offline.", font=f_sub, fill=INK)
    d.text((left, top + mark_px + 126 * SS),
           f"{n} subjects · K–8 through college · no account, no ads",
           font=f_sub, fill=MUTED)

    # Rule + domain, bottom left.
    y = h - 108 * SS
    d.line([left, y, left + 96 * SS, y], fill=ACCENT_A, width=3 * SS)
    d.text((left, y + 22 * SS), "learn.xplabs.us", font=f_mono, fill=ACCENT_A)

    out = img.resize((W, H), Image.LANCZOS)
    path = os.path.join(ROOT, "og.jpg")
    out.save(path, "JPEG", quality=88, optimize=True, progressive=True)
    print(f"wrote {path}  {os.path.getsize(path) / 1024:.0f} KB  ({n} subjects)")


if __name__ == "__main__":
    build()
