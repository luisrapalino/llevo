"""Cuarta ronda: la ele reducida a una sola masa."""
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
    cursor = x
    for ch in text:
        pen = SVGPathPen(gs)
        gs[ch].draw(TransformPen(pen, (scale, 0, 0, -scale, cursor, baseline)))
        chunks.append(pen.getCommands())
        cursor += gs[ch].width * scale * tracking
    return "".join(f'<path fill="{INK}" d="{d}"/>' for d in chunks), cursor


def svg_wrap(body, view_box, label):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}" role="img" aria-label="{label}">'
        f"<title>{label}</title>{body}</svg>\n"
    )


def lockup(symbol, word, sym_size, word_mid, end, label):
    scale = sym_size / 256
    y = word_mid - sym_size / 2
    gap = 32
    return svg_wrap(
        f'<g transform="translate(0 {y:.1f}) scale({scale:.4f})">{symbol}</g>'
        f'<g transform="translate({sym_size + gap:.0f} 0)">{word}</g>',
        f"0 0 {sym_size + gap + end + 8:.0f} 256",
        label,
    )


# Una línea de grosor parejo, doblada una vez. Extremos redondos.
# Eje: (76,78) → (76,178) → (180,178). Radio 36. El codo interior, radio 14.
VUELTA = (
    '<path fill="{b}" d="M112 78V128a14 14 0 0 0 14 14h54'
    'a36 36 0 0 1 0 72H76a36 36 0 0 1-36-36V78a36 36 0 0 1 72 0z"/>'
)

# Una sola masa, sin doblez. El radio es lo único propio.
BLOQUE = '<rect x="40" y="40" width="176" height="176" rx="52" fill="{b}"/>'

# Un círculo al que se le corta el suelo. Una masa, un corte.
LOMO = '<path fill="{b}" d="M56 200a90 90 0 1 1 144 0z"/>'


def main():
    gs, glyf = load_font()
    scale = 148 / 757
    baseline = 200
    word, end = letter_paths(gs, glyf, "llevo", scale, baseline)
    word_mid = baseline - 270 * scale
    sym = 164

    marks = {
        "j-vuelta": VUELTA.format(b=BLUE),
        "k-bloque": BLOQUE.format(b=BLUE),
        "l-lomo": LOMO.format(b=BLUE),
    }
    labels = {
        "j-vuelta": "Llevo, vuelta",
        "k-bloque": "Llevo, bloque",
        "l-lomo": "Llevo, lomo",
    }
    OUT.mkdir(parents=True, exist_ok=True)
    for name, shape in marks.items():
        (OUT / f"{name}-symbol.svg").write_text(svg_wrap(shape, "0 0 256 256", labels[name]), encoding="utf-8")
        (OUT / f"{name}.svg").write_text(
            lockup(shape, word, sym, word_mid, end, labels[name]),
            encoding="utf-8",
        )
    print("wrote", OUT)


if __name__ == "__main__":
    main()
