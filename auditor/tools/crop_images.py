"""Phase 1 — crop each question's picture / lab table from the exam PDF.

Usage:  python3 auditor/tools/crop_images.py [--block end] [--dpi 150]

Reads auditor/data/images.json (question id → page + rectangle, every pairing checked by eye) and the cached
exam PDF in auditor/source/. Writes data/blocks/<BLOCK>/img/<MedLib question id>.jpg (≤ 1200 px wide, JPEG).
build_work.py puts the path into the work file; build_outputs.py embeds it as a data URI in the quiz JSON.
"""
import argparse, io, json, sys
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
    return f"{meta['block'].upper()}-{c}-{meta['type']}-{int(n):03d}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--block", default="end")
    ap.add_argument("--dpi", type=int, default=150)
    a = ap.parse_args()
    cfg = json.loads((AUD / "data" / "images.json").read_text(encoding="utf-8"))
    inv = {s["set_id"]: s for s in json.loads((AUD / "data" / "inventory.json").read_text(encoding="utf-8"))["sets"]}
    docs, n = {}, 0
    for qid, im in cfg["images"].items():
        sid = qid.rsplit("_", 1)[0]
        if inv[sid]["block"] != a.block:
            continue
        pdf = AUD / "source" / f"{sid}__exam.pdf"
        if not pdf.exists():
            sys.exit(f"ERROR: ไม่มี {pdf.name} — รัน extract.py --set {sid} ก่อน")
        if sid not in docs:
            docs[sid] = pymupdf.open(pdf)
            fix_zero_bbox(docs[sid])
        pix = docs[sid][im["page"] - 1].get_pixmap(dpi=a.dpi, clip=pymupdf.Rect(*im["rect"]))
        img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
        if img.width > MAX_W:
            img = img.resize((MAX_W, round(img.height * MAX_W / img.width)), Image.LANCZOS)
        out = ROOT / "data" / "blocks" / a.block.upper() / "img" / f"{medlib_id(qid, inv)}.jpg"
        out.parent.mkdir(parents=True, exist_ok=True)
        img.save(out, "JPEG", quality=82, optimize=True)
        n += 1
        print(f"{qid} → {out.relative_to(ROOT)} ({img.width}×{img.height})")
    print(f"ตัดรูป {n} รูป")


if __name__ == "__main__":
    main()
