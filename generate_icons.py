"""Render the extension icons into public/icons.

Run from the project root:  python generate_icons.py
"""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT / "public" / "icons"
SIZES = (16, 32, 48, 128)
SUPERSAMPLE = 8

TOP = (139, 92, 246)      # #8B5CF6
BOTTOM = (109, 40, 217)   # #6D28D9


def vertical_gradient(size: int) -> Image.Image:
    img = Image.new("RGB", (1, size))
    for y in range(size):
        t = y / max(1, size - 1)
        img.putpixel(
            (0, y),
            tuple(int(TOP[i] + (BOTTOM[i] - TOP[i]) * t) for i in range(3)),
        )
    return img.resize((size, size), Image.BILINEAR)


def draw_icon(size: int) -> Image.Image:
    scale = size * SUPERSAMPLE
    background = vertical_gradient(scale)

    # Rounded-square mask.
    mask = Image.new("L", (scale, scale), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, scale - 1, scale - 1), radius=int(scale * 0.22), fill=255
    )

    icon = Image.new("RGBA", (scale, scale), (0, 0, 0, 0))
    icon.paste(background, (0, 0), mask)

    draw = ImageDraw.Draw(icon)
    # Envelope glyph: rounded outline plus flap lines.
    left = scale * 0.20
    right = scale * 0.80
    top = scale * 0.31
    bottom = scale * 0.69
    stroke = max(2 * SUPERSAMPLE, int(scale * 0.06))
    radius = int(scale * 0.045)

    draw.rounded_rectangle(
        (left, top, right, bottom),
        radius=radius,
        outline="white",
        width=stroke,
    )
    flap_y = scale * 0.53
    draw.line(
        (left + stroke * 0.9, top + stroke * 0.8, scale * 0.5, flap_y),
        fill="white",
        width=stroke,
        joint="curve",
    )
    draw.line(
        (scale * 0.5, flap_y, right - stroke * 0.9, top + stroke * 0.8),
        fill="white",
        width=stroke,
        joint="curve",
    )

    return icon.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        draw_icon(size).save(OUT_DIR / f"icon{size}.png")
    print(f"Rendered {len(SIZES)} icons into {OUT_DIR}")


if __name__ == "__main__":
    main()
