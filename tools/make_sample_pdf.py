"""Create the small placeholder PDFs used by the DEMO block (samples/blocks/DEMO/pdf/).

Run:  python tools/make_sample_pdf.py
They contain no real lecture content; they only exist so the PDF viewer can be tried.
"""
from pathlib import Path

import fitz  # PyMuPDF

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "samples" / "blocks" / "DEMO" / "pdf"

DECKS = {
    "L02.pdf": ("Hypothalamus & posterior pituitary", [
        "Overview of the hypothalamic-pituitary axis",
        "Magnocellular neurons: SON and PVN",
        "ADH synthesis and transport",
        "Osmoreceptors and the thirst threshold",
        "ADH action: V2 receptor, aquaporin-2",
        "Diabetes insipidus: central vs nephrogenic",
        "Water deprivation test and desmopressin",
        "SIADH",
    ]),
    "L08.pdf": ("Adrenal cortex", [
        "Zones of the adrenal cortex",
        "Steroidogenesis pathway",
        "Primary adrenal insufficiency (Addison)",
        "ACTH, POMC and hyperpigmentation",
        "Mineralocorticoid deficiency: Na and K",
        "Cushing syndrome",
    ]),
}


def make(name: str, title: str, headings: list[str]) -> None:
    doc = fitz.open()
    for i, h in enumerate(headings, start=1):
        page = doc.new_page(width=960, height=540)
        page.draw_rect(fitz.Rect(0, 0, 960, 70), color=None, fill=(0.06, 0.49, 0.53))
        page.insert_text((40, 46), title, fontsize=20, color=(1, 1, 1))
        page.insert_text((40, 130), h, fontsize=30, color=(0.09, 0.13, 0.17))
        for j in range(5):
            y = 190 + j * 46
            page.draw_rect(fitz.Rect(60, y, 60 + [760, 640, 700, 560, 680][j], y + 14),
                           color=None, fill=(0.85, 0.88, 0.91))
        page.insert_text((40, 515), f"SAMPLE - not real lecture content   |   page {i}/{len(headings)}",
                         fontsize=11, color=(0.45, 0.5, 0.56))
    OUT.mkdir(parents=True, exist_ok=True)
    doc.save(OUT / name)
    print("wrote", OUT / name, len(headings), "pages")


if __name__ == "__main__":
    for fname, (title, heads) in DECKS.items():
        make(fname, title, heads)
