"""Arma tres conceptos de logo. No es parte del sitio: solo para elegir dirección."""
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

SRC = Path("node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2")
OUT = Path("public/brand/conceptos")

INK = "#14213D"
BLUE = "#2F5BEA"
BUTTER = "#FFD166"
WHITE = "#FFFFFF"

PIN = (
    "M17 42.5c-.6-3.2-13.2-8.4-13.2-18.2a13.2 13.2 0 1 1 26.4 0c0 9.8-12.6 15-13.2 18.2z"
    "M22.4 24.2a5.4 5.4 0 1 0-10.8 0a5.4 5.4 0 1 0 10.8 0z"
)


def load_font():
    font = instantiateVariableFont(TTFont(SRC), {"wght": 600}, inplace=False)
    return font.getGlyphSet(), font["glyf"]


def letter_paths(gs, glyf, text, scale, baseline, x=0, tracking=0.98):
    chunks = []
    slots = []
    cursor = x
    for ch in text:
        g = glyf[ch]
        pen = SVGPathPen(gs)
        gs[ch].draw(TransformPen(pen, (scale, 0, 0, -scale, cursor, baseline)))
        chunks.append(pen.getCommands())
        slots.append(
            {
                "ch": ch,
                "cx": cursor + (g.xMin + g.xMax) / 2 * scale,
                "cy": baseline - ((g.yMin + g.yMax) / 2) * scale,
            }
        )
        cursor += gs[ch].width * scale * tracking
    return chunks, slots, cursor


def pin_group(cx, cy, width, fill):
    s = width / 34
    ox = cx - 17 * s
    oy = cy - 24.2 * s
    return (
        f'<g transform="translate({ox:.2f} {oy:.2f}) scale({s:.4f})">'
        f'<path fill="{fill}" fill-rule="evenodd" d="{PIN}"/></g>'
    )


def svg_wrap(body, view_box, label="Llevo"):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}" role="img" aria-label="{label}">'
        f"<title>{label}</title>{body}</svg>\n"
    )


def paths_for(chunks, slots, fill, skip=""):
    return "".join(
        f'<path fill="{fill}" d="{d}"/>'
        for d, slot in zip(chunks, slots)
        if slot["ch"] != skip
    )


def main():
    gs, glyf = load_font()
    scale = 148 / 757
    baseline = 196

    chunks, slots, end = letter_paths(gs, glyf, "llevo", scale, baseline, x=8)
    o = slots[4]
    pin_w = (glyf["o"].xMax - glyf["o"].xMin) * scale * 0.96
    a = svg_wrap(
        paths_for(chunks, slots, INK, skip="o") + pin_group(o["cx"], o["cy"], pin_w, BLUE),
        f"0 0 {end + 16:.0f} 256",
    )
    a_symbol = svg_wrap(
        f'<g transform="translate(50.5 28) scale(4.545)">'
        f'<path fill="{BLUE}" fill-rule="evenodd" d="{PIN}"/></g>',
        "0 0 256 256",
        "Símbolo Llevo",
    )

    word_scale = scale * 0.86
    pad_x, word_h = 40, 757 * word_scale
    base = 32 + word_h - 10
    chunks, slots, end = letter_paths(gs, glyf, "llevo", word_scale, base, x=pad_x)
    o = slots[4]
    plaque_w = end + pad_x
    plaque_h = base + 34
    b = svg_wrap(
        f'<rect width="{plaque_w:.0f}" height="{plaque_h:.0f}" rx="28" fill="{BLUE}"/>'
        + paths_for(chunks, slots, WHITE, skip="o")
        + pin_group(o["cx"], o["cy"], (glyf["o"].xMax - glyf["o"].xMin) * word_scale * 0.96, WHITE)
        + f'<g transform="rotate(-16 36 6)"><rect x="-6" y="-6" width="132" height="30" rx="6" fill="{BUTTER}"/></g>',
        f"-16 -28 {plaque_w + 32:.0f} {plaque_h + 44:.0f}",
    )

    chunks, slots, end = letter_paths(gs, glyf, "llevo", scale, baseline, x=0)
    sym, gap = 168, 30
    word_mid = baseline - 270 * scale
    sym_y = word_mid - sym / 2
    c_w = sym + gap + end + 8
    symbol = (
        f'<rect x="0" y="{sym_y:.1f}" width="{sym}" height="{sym}" rx="40" fill="{BLUE}"/>'
        f'<g transform="translate(44 {sym_y + 26:.1f}) scale(2.62)">'
        f'<path fill="{WHITE}" fill-rule="evenodd" d="{PIN}"/></g>'
    )
    c = svg_wrap(
        symbol + f'<g transform="translate({sym + gap:.0f} 0)">{paths_for(chunks, slots, INK)}</g>',
        f"0 0 {c_w:.0f} 256",
    )
    # Square symbol: shift the tile to the origin and scale it into 256.
    c_symbol = svg_wrap(
        f'<g transform="translate(0 {-sym_y:.1f}) scale({256 / sym:.4f})">{symbol}</g>',
        "0 0 256 256",
        "Sello Llevo",
    )

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "a-pin.svg").write_text(a, encoding="utf-8")
    (OUT / "a-symbol.svg").write_text(a_symbol, encoding="utf-8")
    (OUT / "b-placa.svg").write_text(b, encoding="utf-8")
    (OUT / "c-sello.svg").write_text(c, encoding="utf-8")
    (OUT / "c-symbol.svg").write_text(c_symbol, encoding="utf-8")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
