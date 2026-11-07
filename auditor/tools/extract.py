"""Phase 1 — download a set's PDFs from Google Drive and cache per-page text + PNG.

Usage:  .venv/Scripts/python auditor/tools/extract.py --set end_52_MCQ [--dpi 110] [--force]

Reads the set (Drive file ids) from auditor/data/inventory.json.
Reads drive_api_key from ../config.json at runtime and never prints it.
Output (gitignored):
  auditor/source/<set_id>__exam.pdf, <set_id>__key.pdf
  auditor/raw/<set_id>/<role>_p###.txt  (text layer)  and  <role>_p###.png  (rendered page)
"""
import argparse, json, sys, urllib.request, urllib.error
from pathlib import Path
import pymupdf

AUD = Path(__file__).resolve().parents[1]
ROOT = AUD.parent
REFERER = "http://localhost:8765/"


def key():
    """Key from config.json, or "" when there is no config.json (cloud session: the
    network proxy adds the key to requests to www.googleapis.com itself)."""
    if not (ROOT / "config.json").exists():
        return ""
    try:
        k = json.loads((ROOT / "config.json").read_text(encoding="utf-8")).get("drive_api_key")
    except Exception:
        sys.exit("ERROR: อ่าน config.json ไม่ได้")
    if not k:
        sys.exit("ERROR: ยังไม่ได้ใส่ drive_api_key ใน config.json")
    return k


def download(file_id, dest: Path):
    if dest.exists():
        return
    url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media&supportsAllDrives=true" + (f"&key={key()}" if key() else "")
    req = urllib.request.Request(url, headers={"Referer": REFERER})
    try:
        with urllib.request.urlopen(req) as r:
            dest.write_bytes(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"ERROR: Drive ตอบ {e.code} สำหรับไฟล์ {file_id}")


def fix_zero_bbox(doc):
    """Some keys were saved by iOS (Quartz) with every page drawn inside a form XObject whose
    BBox is [0 0 0 0]; viewers clip it away and the page renders blank. Widen the box in memory
    only (the cached source PDF is not rewritten)."""
    n = 0
    for x in range(1, doc.xref_length()):
        try:
            if doc.xref_get_key(x, "Subtype") == ("name", "/Form") and doc.xref_get_key(x, "BBox")[1].replace(" ", "") == "[0000]":
                doc.xref_set_key(x, "BBox", "[0 0 5000 5000]")
                n += 1
        except Exception:
            pass
    if n:
        print(f"  แก้กรอบหน้าว่าง (BBox 0) {n} จุด")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--set", required=True)
    ap.add_argument("--dpi", type=int, default=110)
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()

    inv = json.loads((AUD / "data" / "inventory.json").read_text(encoding="utf-8"))
    s = next((x for x in inv["sets"] if x["set_id"] == a.set), None)
    if not s:
        sys.exit(f"ERROR: ไม่มีชุด {a.set} ใน inventory.json")

    (AUD / "source").mkdir(exist_ok=True)
    out = AUD / "raw" / a.set
    out.mkdir(parents=True, exist_ok=True)

    for role in ("exam", "key"):
        f = s["files"].get(role)
        if not f:
            continue
        pdf = AUD / "source" / f"{a.set}__{role}.pdf"
        download(f["drive_file_id"], pdf)
        doc = pymupdf.open(pdf)
        fix_zero_bbox(doc)
        chars = 0
        for i, page in enumerate(doc, 1):
            txt = out / f"{role}_p{i:03d}.txt"
            png = out / f"{role}_p{i:03d}.png"
            if a.force or not txt.exists():
                t = page.get_text("text")
                txt.write_text(t, encoding="utf-8")
            chars += len(txt.read_text(encoding="utf-8").strip())
            if a.force or not png.exists():
                page.get_pixmap(dpi=a.dpi).save(png)
        kind = "text" if chars > 200 * len(doc) else "scan/mostly-image"
        print(f"{role}: {len(doc)} หน้า, ข้อความ {chars} ตัวอักษร ({kind})")


if __name__ == "__main__":
    main()
