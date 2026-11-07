"""Phase 1 — split the exam text layer into questions (stem + choices A–E + page).

Usage:  .venv/Scripts/python auditor/tools/parse_mcq.py --set end_52_MCQ [--print]

Reads only the EXAM pages (raw/<set>/exam_p###.txt) so the blind answer pass never sees the key.
Writes auditor/data/work/<set>.parsed.json
"""
import argparse, json, re, unicodedata
from pathlib import Path

AUD = Path(__file__).resolve().parents[1]
Q_START = re.compile(r"^\s*(\d{1,3})\s*[.)]\s*(.*)$")
OPT = re.compile(r"^\s*([A-Ea-e])\s*[.)]\s*(.*)$")  # older cohorts use a. b. c.
HEADER = re.compile(r"^VICHAKARN MED PSU \d+$", re.I)  # running page header of this archive
# Instruction box printed inside page 1 of later cohorts ("1. ข้อสอบ MCQ มีทั้งหมด 75 ข้อ", "2. นักศึกษามีเวลา…").
# Its numbered lines would otherwise be read as questions 2, 3, …
INSTR = re.compile(r"^(\d\.\s*)?(ข้อสอบ\s*MCQ\s*มีทั้งหมด|นักศึกษามีเวลา|ข้อสอบเป็นภาษา|หมายเหตุ\s*:|ฝ่ายวิชาการ|-?\s*Vichakarn\s*Med|\d{3}-\d{3}\s+Endocrine)", re.I)


FOOTER = re.compile(r"BY VICHAKARN MEDPSU \d+(\s+\d+)?|-\s*[\u201c\"]\s*GOOD LUCK\s*[\u201d\"]\s*-", re.I)  # page footers glued to text


def norm(s):
    s = FOOTER.sub(" ", s)
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
        if not t or HEADER.match(t) or INSTR.match(t) or re.fullmatch(r"\d{1,3}", t):  # bare page numbers
            continue
        m = Q_START.match(t)
        # A new question must be the next expected number. Blank-recall items ("3. –") have no choices,
        # so a question may start right after one; header lines before Q1 are kept as preamble.
        # Older recalled papers skip numbers (questions nobody remembered) and may start above 1:
        # accept a jump forward when the line reads like a question, not like a numbered list item.
        n = int(m.group(1)) if m else 0
        jump = m and expect < n <= expect + 20 and len(m.group(2)) >= 15 and re.search(r"[A-Za-zก-๙]{3}", m.group(2)) and (len(cur["choices"]) >= 2 or not cur["choices"] if cur is not None else re.search(r"[A-Za-z]{3}", m.group(2)))
        if m and (n == expect or (jump and not (cur is not None and field != "stem" and cur["choices"] and len(cur["choices"]) < 2))):
            if cur is None and int(m.group(1)) == 1 and not re.search(r"[A-Za-z]{3}", m.group(2)):
                preamble.append(t)  # header "1. ข้อสอบมีทั้งหมด 81 ข้อ" etc.
                continue
            cur = {"number": m.group(1), "page": page, "stem": m.group(2), "choices": {}, "raw_tail": ""}
            qs.append(cur)
            field = "stem"
            expect = n + 1
            continue
        if cur is None:
            preamble.append(t)
            continue
        mo = OPT.match(t)
        if mo:
            k = mo.group(1).upper()
            if k in cur["choices"] and mo.group(1).islower() and len(cur["choices"]) < 5:
                k = "ABCDE"[len(cur["choices"])]  # recalled papers sometimes repeat a letter ("a. … a. …")
            if k not in cur["choices"]:
                field = k
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
