"""Phase 1 — crop each question's picture / lab table from the exam PDF.

Usage:  python3 auditor/tools/crop_images.py [--block end] [--set end_52_KF] [--dpi 150]

Reads auditor/data/images.json (question id → page + rectangle, every pairing checked by eye) and the cached
PDF in auditor/source/. Writes data/blocks/<BLOCK>/img/<MedLib question id>.jpg (≤ 1200 px wide, JPEG).
  "role": "key"   → crop from the answer-key PDF; file name gets "-key" (picture shown with the answer)
  "native": true  → take the embedded picture that sits in rect at its own full resolution, whole —
                    no hand-drawn box, so no edge of the picture can be cut off (use whenever the
                    picture is a single embedded image; check the page by eye that nothing sits outside it)
build_work.py puts the path into the work file; build_outputs.py embeds it as a data URI in the quiz JSON.
"""
import argparse, io, json, re, sys
from pathlib import Path
import pymupdf
from PIL import Image
from extract import fix_zero_bbox

AUD = Path(__file__).resolve().parents[1]
ROOT = AUD.parent
MAX_W = 1200


def medlib_id(qid, inv):
    """end_51_MCQ_001 → END-51-MCQ-001 (combined archives use their medlib_cohort)."""
    sid, n = qid.rsplit("_", 1)
    meta = inv[sid]
    c = meta.get("medlib_cohort") or meta["cohort"]
    m = re.fullmatch(r"(\d+)([a-z]*)", n)  # KF/OSPE: a letter suffix (010b) = a 2nd picture of the same question
    return f"{meta['block'].upper()}-{c}-{meta['type']}-{int(m.group(1)):03d}{m.group(2)}"


def native_image(doc, page, rect, qid):
    """The embedded image whose placement on the page overlaps rect most, decoded whole at its own resolution.
    Stops if the picture is clipped on the page (then the visible part differs from the file, crop by rect instead)."""
    best, area = None, 0
    for x in page.get_images(full=True):
        for r in page.get_image_rects(x[0]):
            ov = (r & rect).get_area() if r.intersects(rect) else 0
            if ov > area:
                best, area, placed = x[0], ov, r
    if not best:
        sys.exit(f"ERROR: {qid}: ไม่มีรูปฝังในกรอบ {list(rect)}")
    vis = placed & page.rect
    if abs(vis.get_area() - placed.get_area()) > 1:
        sys.exit(f"ERROR: {qid}: รูปล้นขอบหน้า ใช้ native ไม่ได้ ให้ตีกรอบ rect แทน")
    return Image.open(io.BytesIO(doc.extract_image(best)["image"])).convert("RGB")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--block", default="end")
    ap.add_argument("--set", help="only this set (others need their source PDFs cached)")
    ap.add_argument("--dpi", type=int, default=150)
    a = ap.parse_args()
    cfg = json.loads((AUD / "data" / "images.json").read_text(encoding="utf-8"))
    inv = {s["set_id"]: s for s in json.loads((AUD / "data" / "inventory.json").read_text(encoding="utf-8"))["sets"]}
    docs, n = {}, 0
    for qid, im in cfg["images"].items():
        sid = qid.rsplit("_", 1)[0]
        if inv[sid]["block"] != a.block or (a.set and sid != a.set):
            continue
        role = im.get("role", "exam")
        pdf = AUD / "source" / f"{sid}__{role}.pdf"
        if not pdf.exists():
            sys.exit(f"ERROR: ไม่มี {pdf.name} — รัน extract.py --set {sid} ก่อน")
        if pdf not in docs:
            docs[pdf] = pymupdf.open(pdf)
            fix_zero_bbox(docs[pdf])
        doc = docs[pdf]
        page = doc[im["page"] - 1]
        if im.get("native"):
            img = native_image(doc, page, pymupdf.Rect(*im["rect"]), qid)
        else:
            pix = page.get_pixmap(dpi=a.dpi, clip=pymupdf.Rect(*im["rect"]))
            img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
        if img.width > MAX_W:
            img = img.resize((MAX_W, round(img.height * MAX_W / img.width)), Image.LANCZOS)
        out = ROOT / "data" / "blocks" / a.block.upper() / "img" / f"{medlib_id(qid, inv)}{'-key' if role == 'key' else ''}.jpg"
        out.parent.mkdir(parents=True, exist_ok=True)
        img.save(out, "JPEG", quality=82, optimize=True)
        n += 1
        print(f"{qid} → {out.relative_to(ROOT)} ({img.width}×{img.height})")
    print(f"ตัดรูป {n} รูป")


if __name__ == "__main__":
    main()
