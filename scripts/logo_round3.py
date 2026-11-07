"""Tercera ronda: figuras abstractas en la línea de la ele."""
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
        g = glyf[ch]
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


# La ele que ya eligieron, recentrada en el cuadrado.
ELE = '<path fill="{b}" d="M66 28h46c8 0 14 6 14 14v112h78c8 0 14 6 14 14v46c0 8-6 14-14 14H52c-8 0-14-6-14-14V42c0-8 6-14 14-14z"/>'

# La ele partida: palo y cama separados. El hueco es lo bastante grande para 16 px.
DOS = (
    '<rect x="44" y="32" width="60" height="112" rx="16" fill="{b}"/>'
    '<rect x="44" y="176" width="168" height="52" rx="16" fill="{b}"/>'
)

# Un bloque sobre una base. No es una ele: son dos masas, arriba y abajo.
APOYO = (
    '<rect x="78" y="36" width="100" height="100" rx="22" fill="{b}"/>'
    '<rect x="36" y="168" width="184" height="52" rx="16" fill="{b}"/>'
)


def main():
    gs, glyf = load_font()
    scale = 148 / 757
    baseline = 200
    word, end = letter_paths(gs, glyf, "llevo", scale, baseline)
    word_mid = baseline - 270 * scale
    sym = 164

    marks = {
        "g-ele": ELE.format(b=BLUE),
        "h-dos": DOS.format(b=BLUE),
        "i-apoyo": APOYO.format(b=BLUE),
    }
    labels = {
        "g-ele": "Llevo, ele",
        "h-dos": "Llevo, dos piezas",
        "i-apoyo": "Llevo, apoyo",
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
