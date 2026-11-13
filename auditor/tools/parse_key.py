"""Phase 1 — read the original answer key: pink highlight = answer, blue text = note.

Usage:  .venv/Scripts/python auditor/tools/parse_key.py --set end_52_MCQ [--print] [--bare-numbers]

The highlight is baked into page graphics (no annotation objects), so we render each page and
measure pink pixels inside each black option line's bounding box.
Writes auditor/data/work/<set>.key.json  { "<n>": {"answers": [...], "score": {...}, "note": "...", "page": p} }
"""
import argparse, json, re
from pathlib import Path
import pymupdf
from extract import fix_zero_bbox

AUD = Path(__file__).resolve().parents[1]
ZOOM = 2.0
import os
XMAX = float(os.environ.get('KEY_XMAX', 100))  # question-number column limit; raise for multi-column (4-up) key sheets
Q_START = re.compile(r"^\s*(\d{1,3})\s*[.)]")
OPT = re.compile(r"^\s*([A-Ea-eกขคงจ])\s*[.)]?\s*(\S.*)?$")
HEADER = re.compile(r"^VICHAKARN MED PSU", re.I)
PINK_MIN = 0.12  # fraction of pink pixels in an option box that counts as highlighted


def is_pink(r, g, b):
    pink = r >= 220 and 100 <= g <= 215 and b >= 190 and r - g >= 25   # light pink (END) or magenta-pink (GI 52)
    lime = g >= 235 and r >= 180 and b <= 200 and g - b >= 50          # yellow-green highlighter (GI 48)
    salmon = r >= 240 and 185 <= g <= 215 and 175 <= b <= 210 and r - b >= 30   # pale salmon highlighter (GI 44)
    yellow = r >= 235 and g >= 185 and b <= 130                                  # yellow highlighter (GI 41-43)
    orange = r >= 240 and 195 <= g <= 225 and 115 <= b <= 165 and r - b >= 80     # orange pill highlight (KUB 52)
    blue = b >= 245 and 170 <= r <= 210 and 200 <= g <= 232                      # light-blue pill highlight (KUB 44)
    green = g >= 225 and r <= 200 and b <= 205 and g - r >= 45 and g - b >= 38  # mint-green pill highlight (Respiratory 52)
    teal = 150 <= r <= 190 and 200 <= g <= 230 and 180 <= b <= 215 and g - r >= 30 and 8 <= g - b <= 30  # pale teal pill highlight (Respiratory 49)
    cyan = b >= 250 and 150 <= r <= 185 and 230 <= g <= 250                    # bright-cyan pill highlight (Commed I 52)
    gray = 210 <= r <= 222 and max(r, g, b) - min(r, g, b) <= 2   # neutral grey highlight band (Respiratory 47)
    green2 = g >= 195 and r <= 160 and b <= 160 and g - r >= 55 and g - b >= 55  # medium green pill (Nervous 51)
    return pink or lime or salmon or yellow or orange or blue or green or green2 or teal or cyan or gray


def pink_fraction(pix, rect):
    x0, y0 = max(0, int(rect.x0 * ZOOM)), max(0, int(rect.y0 * ZOOM))
    x1, y1 = min(pix.width, int(rect.x1 * ZOOM)), min(pix.height, int(rect.y1 * ZOOM))
    if x1 <= x0 or y1 <= y0:
        return 0.0
    n = hit = 0
    s, w = pix.samples, pix.width
    for y in range(y0, y1, 2):
        row = y * w * 3
        for x in range(x0, x1, 2):
            i = row + x * 3
            n += 1
            hit += is_pink(s[i], s[i + 1], s[i + 2])
    return hit / n if n else 0.0


def lines_of(page):
    black, blue = [], []
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            spans = [s for s in l["spans"] if s["text"].strip()]
            if not spans:
                continue
            txt = "".join(s["text"] for s in l["spans"]).strip()
            dark = lambda c: max(c >> 16 & 255, c >> 8 & 255, c & 255) < 90   # black or near-black (KUB 44 uses dark grey)
            colored = sum(len(s["text"]) for s in spans if not dark(s["color"]))
            plain = sum(len(s["text"]) for s in spans if dark(s["color"]))
            (blue if colored > plain else black).append((pymupdf.Rect(l["bbox"]), txt))
    black.sort(key=lambda t: (round(t[0].y0), t[0].x0))
    blue.sort(key=lambda t: (round(t[0].y0), t[0].x0))
    return black, blue


def circles_of(page):
    """Hand-drawn rings around the answer letter (vector, Respiratory 51): near-square rects stroked in a saturated colour."""
    out = []
    for d in page.get_drawings():
        c = d.get("color") or d.get("fill")
        r = d["rect"]
        if c and 12 <= r.width <= 30 and 12 <= r.height <= 30 and abs(r.width - r.height) < 7 and max(c) - min(c) > 0.5:
            out.append(r)
        elif c and d.get("fill") is None and 10 <= r.width <= 26 and 14 <= r.height <= 36 and r.height >= r.width * 0.9 and len(d.get("items", [])) >= 2:
            out.append(r)
        elif d.get("fill") and not d.get("color") and 10 <= r.width <= 26 and 20 <= r.height <= 38 and r.height >= r.width * 1.2 and len(d.get("items", [])) >= 100:
            out.append(r)  # dark hand-drawn ring (Respiratory 49): unfilled stroke, roughly letter-sized
        elif c and max(c) < 0.15 and not d.get("fill") and 12 <= r.width <= 32 and 26 <= r.height <= 52 and r.x0 < 95 and 5 <= len(d.get("items", [])) <= 24:
            out.append(r)  # black hand-drawn check slash across the option letter (Respiratory 48)
        elif c and not d.get("fill") and 6 <= r.width <= 40 and 10 <= r.height <= 45 and r.x0 < 150 and 1 <= len(d.get("items", [])) <= 30:
            out.append(r)  # coloured/pencil slash across the option letter (Nervous 49)
        elif d.get("fill") and max(d["fill"]) - min(d["fill"]) > 0.3 and 12 <= r.width <= 40 and 18 <= r.height <= 46 and r.x0 < 130 and len(d.get("items", [])) >= 20:
            out.append(r)  # filled coloured hand-drawn slash/ring around the option letter (Nervous 49)
    return out


def parse(set_id, bare_numbers=False):
    doc = pymupdf.open(AUD / "source" / f"{set_id}__key.pdf")
    fix_zero_bbox(doc)
    out, cur, expect = {}, None, 1
    for pno, page in enumerate(doc, 1):
        pix = page.get_pixmap(matrix=pymupdf.Matrix(ZOOM, ZOOM), alpha=False)
        black, blue = lines_of(page)
        rings = circles_of(page)
        starts = []  # (y, qnum) of question starts on this page
        for rect, txt in black:
            if HEADER.match(txt):
                continue
            m = Q_START.match(txt) or (bare_numbers and re.fullmatch(r"\s*(\d{1,3})\s*", txt))
            if m and int(m.group(1)) == 1 and out and all(not v["score"] for v in out.values()) and rect.x0 < XMAX:
                out.clear(); expect = 1  # numbered instructions on the cover page looked like questions 1..n
            if m and expect <= int(m.group(1)) <= expect + 60 and rect.x0 < XMAX:
                cur = m.group(1)
                expect = int(cur) + 1
                out[cur] = {"answers": [], "score": {}, "note": "", "page": pno}
                starts.append((rect.y0, cur))
                continue
            if cur is None:
                continue
            mo = OPT.match(txt)
            if mo and rect.x0 < XMAX + 100:
                letter = {"ก": "A", "ข": "B", "ค": "C", "ง": "D", "จ": "E"}.get(mo.group(1), mo.group(1).upper())
                box = pymupdf.Rect(rect.x0 - 6, rect.y0, rect.x1 + 6, rect.y1)
                f = pink_fraction(pix, box)
                if any(abs((r.y0 + r.y1) / 2 - (rect.y0 + rect.y1) / 2) < 8 and rect.x0 - 10 <= (r.x0 + r.x1) / 2 <= rect.x0 + 16 for r in rings):
                    f = max(f, 1.0)
                out[cur]["score"][letter] = max(out[cur]["score"].get(letter, 0), round(f, 3))
        # notes: attach to the question whose start is the last one above the note (or the carried-over one)
        carried = None
        prev = [k for k in out if out[k]["page"] < pno]
        if prev:
            carried = prev[-1]
        for rect, txt in blue:
            owner = carried
            for y, q in starts:
                if y <= rect.y0 + 4:
                    owner = q
            if owner:
                out[owner]["note"] = (out[owner]["note"] + "\n" + txt).strip()
    # Notes for question N often run down past a blank-recall item "N+1. –"; give them back to N.
    keys = list(out)
    for i, k in enumerate(keys):
        if not out[k]["score"] and out[k]["note"] and i > 0:
            prev = keys[i - 1]
            out[prev]["note"] = (out[prev]["note"] + "\n" + out[k]["note"]).strip()
            out[k]["note"] = ""
    for q in out.values():
        q["answers"] = sorted(k for k, v in q["score"].items() if v >= PINK_MIN)
        q["note_text_layer_lossy"] = True  # Thai tone marks are dropped by this PDF's font encoding
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--set", required=True)
    ap.add_argument("--print", action="store_true")
    ap.add_argument("--bare-numbers", action="store_true", help="a line holding only the next question number starts that question")
    a = ap.parse_args()
    d = parse(a.set, a.bare_numbers)
    (AUD / "data" / "work" / f"{a.set}.key.json").write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
    multi = [k for k, v in d.items() if len(v["answers"]) > 1]
    none_ = [k for k, v in d.items() if not v["answers"] and v["score"]]
    print(f"{a.set}: เฉลย {len(d)} ข้อ | ไม่มีไฮไลต์: {none_} | ไฮไลต์หลายตัว: {multi}")
    if a.print:
        for k, v in d.items():
            print(k, v["answers"], {x: s for x, s in v["score"].items() if s > 0.02}, "| note:", v["note"][:70].replace("\n", " / "))


if __name__ == "__main__":
    main()
