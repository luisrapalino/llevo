"""Quita el fondo de estudio de las ilustraciones para que floten en la página."""
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1] / "public" / "illustrations"
SOURCES = [
    "pickup.jpg",
    "step-photos.jpg",
    "step-quote.jpg",
    "step-arrive.jpg",
    "faq-mark.jpg",
]


def dist(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2])


def knock(src: Path, tol: int = 38) -> Image.Image:
    im = Image.open(src).convert("RGB")
    w, h = im.size
    pix = im.load()
    mask = Image.new("L", (w, h), 255)
    mp = mask.load()
    for y in range(h):
        left = pix[0, y]
        right = pix[w - 1, y]
        for x in range(w):
            t = x / (w - 1) if w > 1 else 0
            pred = tuple(int(left[i] * (1 - t) + right[i] * t) for i in range(3))
            if dist(pix[x, y], pred) <= tol:
                mp[x, y] = 0
    mask = mask.filter(ImageFilter.GaussianBlur(radius=0.6))
    # Quita migas del fondo (sombras rotas) y deja el borde suave.
    mp = mask.load()
    for y in range(h):
        for x in range(w):
            if mp[x, y] < 48:
                mp[x, y] = 0

    out = im.convert("RGBA")
    out.putalpha(mask)
    bbox = out.getbbox()
    if not bbox:
        return out
    pad = int(max(w, h) * 0.03)
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(w, r + pad)
    b = min(h, b + pad)
    return out.crop((l, t, r, b))


def main():
    for name in SOURCES:
        src = ROOT / name
        dst = ROOT / (src.stem + ".png")
        knock(src).save(dst, "PNG", optimize=True)
        print(dst.name, dst.stat().st_size)


if __name__ == "__main__":
    main()
