"""Segunda ronda de conceptos: sin pin. Tres tipos de marca distintos."""
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

SRC = Path("node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2")
OUT = Path("public/brand/conceptos")

INK = "#14213D"
BLUE = "#2F5BEA"


def load_font():
    font = instantiateVariableFont(TTFont(SRC), {"wght": 600}, inplace=False)
    return font.getGlyphSet(), font["glyf"]


def letter_paths(gs, glyf, text, scale, baseline, x=0, tracking=0.97):
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
                "x": cursor,
                "adv": gs[ch].width * scale,
                "left": cursor + g.xMin * scale,
                "right": cursor + g.xMax * scale,
                "top": baseline - g.yMax * scale,
                "bottom": baseline - g.yMin * scale,
            }
        )
        cursor += gs[ch].width * scale * tracking
    return chunks, slots, cursor


def svg_wrap(body, view_box, label):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}" role="img" aria-label="{label}">'
        f"<title>{label}</title>{body}</svg>\n"
    )


def word(chunks, fill):
    return "".join(f'<path fill="{fill}" d="{d}"/>' for d in chunks)


def handle(slots, fill):
    """Une las dos eles por arriba: un asa para cargar."""
    a, b = slots[0], slots[1]
    thickness = (a["right"] - a["left"]) * 0.92
    top = min(a["top"], b["top"])
    overlap = thickness * 0.22
    x = a["left"]
    y = top - thickness + overlap
    w = b["right"] - a["left"]
    rx = thickness * 0.28
    return f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{thickness:.1f}" rx="{rx:.1f}" fill="{fill}"/>'


# Ele geométrica: el pie es más largo que el palo, como la cama de la camioneta.
ELE = (
    "M78 28h46c8 0 14 6 14 14v112h78c8 0 14 6 14 14v46c0 8-6 14-14 14H64c-8 0-14-6-14-14V42c0-8 6-14 14-14z"
)

# Bandeja vista de lado: pared alta, piso y compuerta baja. No es una letra.
BANDEJA = (
    "M36 44h48v108h84V100h48v92c0 10-8 18-18 18H54c-10 0-18-8-18-18V44z"
)


def main():
    gs, glyf = load_font()
    scale = 148 / 757
    baseline = 200

    chunks, slots, end = letter_paths(gs, glyf, "llevo", scale, baseline, x=12)
    asa = svg_wrap(
        word(chunks, INK) + handle(slots, INK),
        f"0 0 {end + 16:.0f} 248",
        "Llevo, asa",
    )

    # Símbolo de la ele, solo.
    ele_symbol = svg_wrap(
        f'<g transform="translate(-12 0)"><path fill="{BLUE}" d="{ELE}"/></g>',
        "0 0 256 256",
        "Llevo, ele",
    )

    chunks, slots, end = letter_paths(gs, glyf, "llevo", scale, baseline, x=0)
    ele_h = 168
    ele_scale = ele_h / 256
    word_mid = baseline - 270 * scale
    ele_y = word_mid - ele_h / 2
    gap = 32
    ele = svg_wrap(
        f'<g transform="translate(0 {ele_y:.1f}) scale({ele_scale:.4f})"><path fill="{BLUE}" d="{ELE}"/></g>'
        f'<g transform="translate({ele_h + gap:.0f} 0)">{word(chunks, INK)}</g>',
        f"0 0 {ele_h + gap + end + 8:.0f} 256",
        "Llevo, ele",
    )

    # La o es una caja: lo que se lleva, no un lugar en el mapa.
    caja_letters = word([c for c, s in zip(chunks, slots) if s["ch"] != "o"], INK)
    o = slots[4]
    inset = (o["right"] - o["left"]) * 0.02
    side = min(o["right"] - o["left"], o["bottom"] - o["top"]) - inset * 2
    ox = (o["left"] + o["right"]) / 2 - side / 2
    oy = (o["top"] + o["bottom"]) / 2 - side / 2
    caja = svg_wrap(
        caja_letters
        + f'<rect x="{ox:.1f}" y="{oy:.1f}" width="{side:.1f}" height="{side:.1f}" rx="{side * 0.16:.1f}" fill="{BLUE}"/>',
        f"0 0 {end + 8:.0f} 256",
        "Llevo, caja",
    )

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "d-asa.svg").write_text(asa, encoding="utf-8")
    (OUT / "e-symbol.svg").write_text(ele_symbol, encoding="utf-8")
    (OUT / "e-ele.svg").write_text(ele, encoding="utf-8")
    (OUT / "f-caja.svg").write_text(caja, encoding="utf-8")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
