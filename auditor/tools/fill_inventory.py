"""Fill page counts in data/inventory.json from the cached source PDFs (auditor/source/, gitignored).

Usage:  python3 auditor/tools/fill_inventory.py [--time <set_id>=<minutes> ...]
"""
import argparse, json
from pathlib import Path
import pymupdf

AUD = Path(__file__).resolve().parents[1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--time", nargs="*", default=[], help="set_id=minutes (time limit printed on the exam)")
    a = ap.parse_args()
    times = dict(x.split("=") for x in a.time)
    p = AUD / "data" / "inventory.json"
    inv = json.loads(p.read_text(encoding="utf-8"))
    for s in inv["sets"]:
        for role, f in s["files"].items():
            src = AUD / "source" / f"{s['set_id']}__{role}.pdf"
            if src.exists() and not f.get("pages"):
                f["pages"] = pymupdf.open(src).page_count
        if s["set_id"] in times:
            s["time_limit_min"] = int(times[s["set_id"]])
    p.write_text(json.dumps(inv, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("\n".join(f"{s['set_id']}: " + ", ".join(f"{r} {f.get('pages')} หน้า" for r, f in s["files"].items()) for s in inv["sets"]))


if __name__ == "__main__":
    main()
