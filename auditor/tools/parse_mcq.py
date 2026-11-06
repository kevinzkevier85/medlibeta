"""Phase 1 — split the exam text layer into questions (stem + choices A–E + page).

Usage:  .venv/Scripts/python auditor/tools/parse_mcq.py --set end_52_MCQ [--print]

Reads only the EXAM pages (raw/<set>/exam_p###.txt) so the blind answer pass never sees the key.
Writes auditor/data/work/<set>.parsed.json
"""
import argparse, json, re, unicodedata
from pathlib import Path

AUD = Path(__file__).resolve().parents[1]
Q_START = re.compile(r"^\s*(\d{1,3})\s*[.)]\s*(.*)$")
OPT = re.compile(r"^\s*([A-E])\s*[.)]\s*(.*)$")
HEADER = re.compile(r"^VICHAKARN MED PSU \d+$", re.I)  # running page header of this archive


def norm(s):
    s = unicodedata.normalize("NFC", s).replace(" ", " ")
    s = re.sub(r"[ \t]+", " ", s)
    return s.strip()


def parse(set_id):
    raw = AUD / "raw" / set_id
    lines = []
    for p in sorted(raw.glob("exam_p*.txt")):
        page = int(p.stem.split("_p")[1])
        for ln in p.read_text(encoding="utf-8").splitlines():
            lines.append((page, ln))

    qs, cur, field, expect = [], None, None, 1
    preamble = []
    for page, ln in lines:
        t = norm(ln)
        if not t or HEADER.match(t):
            continue
        m = Q_START.match(t)
        # A new question must be the next expected number. Blank-recall items ("3. –") have no choices,
        # so a question may start right after one; header lines before Q1 are kept as preamble.
        if m and int(m.group(1)) == expect:
            if cur is None and int(m.group(1)) == 1 and not re.search(r"[A-Za-z]{3}", m.group(2)):
                preamble.append(t)  # header "1. ข้อสอบมีทั้งหมด 81 ข้อ" etc.
                continue
            cur = {"number": m.group(1), "page": page, "stem": m.group(2), "choices": {}, "raw_tail": ""}
            qs.append(cur)
            field = "stem"
            expect += 1
            continue
        if cur is None:
            preamble.append(t)
            continue
        mo = OPT.match(t)
        if mo and (mo.group(1) not in cur["choices"]):
            field = mo.group(1)
            cur["choices"][field] = mo.group(2)
            continue
        if field == "stem":
            cur["stem"] = (cur["stem"] + " " + t).strip()
        else:
            cur["choices"][field] = (cur["choices"][field] + " " + t).strip()

    for q in qs:
        q["stem"] = norm(q["stem"])
        q["choices"] = {k: norm(v) for k, v in q["choices"].items()}
        q.pop("raw_tail", None)
    return {"set_id": set_id, "preamble": preamble, "questions": qs}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--set", required=True)
    ap.add_argument("--print", action="store_true")
    a = ap.parse_args()
    d = parse(a.set)
    out = AUD / "data" / "work"
    out.mkdir(parents=True, exist_ok=True)
    (out / f"{a.set}.parsed.json").write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
    qs = d["questions"]
    short = [q["number"] for q in qs if len(q["choices"]) < 5]
    print(f"{a.set}: {len(qs)} ข้อ (เลข {qs[0]['number']}–{qs[-1]['number']}) | ช้อยส์ไม่ครบ 5: {short}")
    if a.print:
        for q in qs:
            print(f"\n[{q['number']}] p{q['page']} {q['stem']}")
            for k, v in q["choices"].items():
                print(f"  {k}. {v}")


if __name__ == "__main__":
    main()
