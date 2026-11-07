"""Phase 5 — build every output from data/work/*.json (no AI step, safe to re-run).

Usage:  .venv/Scripts/python auditor/tools/build_outputs.py [--block end]

Writes:
  auditor/output/json/<block>.json + all.json        psu-quiz import format (CLAUDE.md §6.1)
  auditor/output/reports/<block>/<set_id>.md          per-set report
  auditor/output/reports/summary.md                   all sets
  auditor/REVIEW.md                                   items waiting for the user's decision
  data/blocks/<BLOCK>/exams/<cohort>_<type>.json      MedLib website copy (validated by lib/validate.js rules)
"""
import argparse, json, re, subprocess, sys
from collections import Counter, defaultdict
from pathlib import Path

AUD = Path(__file__).resolve().parents[1]
ROOT = AUD.parent
W = AUD / "data" / "work"
OUT = AUD / "output"
BLOCK_NAMES = {"end": "Endocrine"}
STATUS_TH = {"source_agree": "ตรงกับต้นฉบับ", "source_disagree": "ขัดกับต้นฉบับ", "corrected": "แก้ตามผู้ใช้",
             "drafted": "AI ทำเฉลย", "source_unverified": "ต้นฉบับไม่แน่นอน", "ai_generated": "AI เขียนข้อใหม่",
             "skipped": "ข้าม (ไม่มีโจทย์)"}


def load(p):
    return json.loads(p.read_text(encoding="utf-8"))


def work_sets(block=None):
    sets = [load(p) for p in sorted(W.glob("*.json")) if p.name.count(".") == 1]
    return [s for s in sets if not block or s["block"] == block]


def quiz_question(q):
    keep = ("id", "number", "sourceNumber", "stem", "choices", "correct", "explanation", "image", "issues", "audit")
    return {k: q[k] for k in keep}


def build_quiz(sets):
    by_block = defaultdict(list)
    for s in sets:
        qs = [quiz_question(q) for q in s["questions"] if q["audit"]["answer_status"] != "skipped"]
        skipped = [q["number"] for q in s["questions"] if q["audit"]["answer_status"] == "skipped"]
        by_block[s["block"]].append({
            "id": s["set_id"], "name": s["name"], "history": {"exam": [], "practice": []},
            "notes": f"ข้อที่ผู้จำจำไม่ได้ (ไม่มีในชุดนี้): {', '.join(skipped)}" if skipped else "",
            "questions": qs})
    (OUT / "json").mkdir(parents=True, exist_ok=True)
    allb = []
    for b, exams in by_block.items():
        obj = [{"id": b, "name": b, "exams": exams}]
        (OUT / "json" / f"{b}.json").write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")
        allb += obj
    (OUT / "json" / "all.json").write_text(json.dumps(allb, ensure_ascii=False, indent=1), encoding="utf-8")
    return allb


def validate_quiz(allb):
    errs = []
    for b in allb:
        for e in b["exams"]:
            ids = set()
            for q in e["questions"]:
                if q["id"] in ids: errs.append(f"{q['id']}: id ซ้ำ")
                ids.add(q["id"])
                if sorted(q["choices"]) != list("ABCDE"): errs.append(f"{q['id']}: choices ต้องมี A–E")
                if not (q["correct"] in "ABCDE" and len(q["correct"]) == 1 or q["correct"] == "__ALL__"):
                    errs.append(f"{q['id']}: correct ไม่ถูกต้อง")
                elif q["correct"] != "__ALL__" and not q["choices"][q["correct"]]:
                    errs.append(f"{q['id']}: correct ชี้ไปที่ช้อยส์ว่าง")
                if not q["explanation"]: errs.append(f"{q['id']}: ไม่มี explanation")
                if not re.fullmatch(rf"{re.escape(e['id'])}_\d{{3}}", q["id"]): errs.append(f"{q['id']}: รูปแบบ id")
    return errs


def report_set(s):
    qs = s["questions"]
    c = Counter(q["audit"]["answer_status"] for q in qs)
    lines = [f"# รายงานชุด {s['set_id']} — {s['name']}", "",
             f"- ข้อในต้นฉบับ: {s['n_source_items']} ข้อ · นำเข้า quiz ได้ {len(qs) - c['skipped']} ข้อ",
             "- AI แก้โจทย์ทุกข้อก่อนเปิดเฉลย (`data/work/" + s["set_id"] + ".blind.json`) แล้วค่อยเทียบ", "",
             "## สรุปสถานะเฉลย", "", "| สถานะ | ความหมาย | จำนวน |", "|---|---|---|"]
    for k, v in c.most_common():
        lines.append(f"| `{k}` | {STATUS_TH.get(k, k)} | {v} |")
    agree = sum(1 for q in qs if q["audit"]["ai_answer"] and q["audit"]["ai_answer"] == q["audit"]["source_answer"])
    answered = sum(1 for q in qs if q["audit"]["ai_answer"])
    lines += ["", f"AI ตอบตรงกับเฉลยต้นฉบับ **{agree}/{answered}** ข้อที่มีโจทย์", ""]

    def table(title, rows, cols):
        if not rows:
            return
        lines.extend([f"## {title}", "", "| " + " | ".join(cols) + " |", "|" + "---|" * len(cols)])
        lines.extend("| " + " | ".join(str(x).replace("|", "\\|").replace("\n", " ") for x in r) + " |" for r in rows)
        lines.append("")

    table("ข้อที่ต้องให้ผู้ใช้ตัดสิน (needs_review / disagree)",
          [(q["number"], q["audit"]["source_answer"], q["audit"]["ai_answer"], q["audit"]["ai_confidence"],
            "; ".join(q["issues"]), q["audit"]["audit_note"] or "") for q in qs
           if q["audit"]["needs_review"] or q["audit"]["answer_status"] == "source_disagree"],
          ["ข้อ", "ต้นฉบับ", "AI", "ความมั่นใจ", "ปัญหา", "รายละเอียด"])
    table("ข้อที่ต้นฉบับไม่แน่นอน (source_unverified)",
          [(q["number"], q["audit"]["source_answer"], q["audit"]["original_text"] or "", q["audit"]["audit_note"] or "")
           for q in qs if q["audit"]["answer_status"] == "source_unverified"],
          ["ข้อ", "เฉลย", "หมายเหตุผู้จำ (ตัดออกจากโจทย์)", "รายละเอียด"])
    table("ปัญหาอื่นที่พบ (ไม่กระทบเฉลย)",
          [(q["number"], "; ".join(q["issues"]), q["audit"]["audit_note"] or "") for q in qs
           if q["issues"] and not q["audit"]["needs_review"] and q["audit"]["answer_status"] not in ("source_unverified", "skipped")],
          ["ข้อ", "ปัญหา", "รายละเอียด"])
    table("การแก้ไขข้อความ (edits)",
          [(q["number"], e["field"], e["old"], e["new"]) for q in qs for e in q["audit"]["edits"]],
          ["ข้อ", "ส่วน", "เดิม", "ใหม่"])
    sk = [q["number"] for q in qs if q["audit"]["answer_status"] == "skipped"]
    if sk:
        lines += ["## ข้อที่ข้าม (skipped)", "", f"ข้อ {', '.join(sk)} — {qs[[q['number'] for q in qs].index(sk[0])]['audit']['audit_note']}",
                  "เก็บไว้ใน work file พร้อมสถานะ ไม่ได้ลบ แต่ไม่ใส่ใน quiz JSON เพราะไม่มีโจทย์ให้ทำ เมื่อทำรุ่นอื่นของ block นี้ (Phase 4) จะลองเติมจากข้อซ้ำข้ามรุ่น", ""]
    groups = defaultdict(list)
    for q in qs:
        if q["audit"]["duplicate_group"]:
            groups[q["audit"]["duplicate_group"]].append(q["number"])
    if groups:
        lines += ["## กลุ่มข้อที่ถามเรื่องเดียวกันในชุดนี้", ""] + [f"- `{g}`: ข้อ {', '.join(n)}" for g, n in groups.items()] + [""]
    return "\n".join(lines)


def build_reports(sets):
    rows = []
    for s in sets:
        d = OUT / "reports" / s["block"]
        d.mkdir(parents=True, exist_ok=True)
        (d / f"{s['set_id']}.md").write_text(report_set(s), encoding="utf-8")
        c = Counter(q["audit"]["answer_status"] for q in s["questions"])
        rows.append(f"| {s['set_id']} | {s['n_source_items']} | {c['source_agree']} | {c['source_disagree']} | {c['drafted']} | "
                    f"{c['source_unverified']} | {c['ai_generated']} | {c['skipped']} | {sum(q['audit']['needs_review'] for q in s['questions'])} |")
    summ = ["# สรุปรวมทุกชุด", "", "| set_id | ข้อ | agree | disagree | drafted | unverified | ai_gen | skipped | needs_review |",
            "|---|---|---|---|---|---|---|---|---|"] + rows
    (OUT / "reports" / "summary.md").write_text("\n".join(summ) + "\n", encoding="utf-8")


def build_review(sets):
    lines = ["# REVIEW — รายการรอผู้ใช้ตัดสิน", "",
             "วิธีตอบ: พิมพ์ในแชทเป็นบรรทัด เช่น `end_52_MCQ_027: คงเดิม` / `end_52_MCQ_063: C` / `end_52_MCQ_046: ตรวจใหม่`",
             "Claude จะบันทึกลง `auditor/data/decisions.json` แล้ว build ใหม่", "",
             "| id | ต้นฉบับ | AI | ความมั่นใจ | เรื่อง | ตัวเลือกที่เป็นไปได้ / เหตุผล |", "|---|---|---|---|---|---|"]
    n = 0
    for s in sets:
        for q in s["questions"]:
            a = q["audit"]
            if a.get("user_decision") or not (a["needs_review"] or a["answer_status"] in ("source_disagree", "drafted", "ai_generated")):
                continue
            why = "; ".join(f"{k}: {v}" for k, v in (a["why"] or {}).items())
            lines.append(f"| {q['id']} | {a['source_answer']} | {a['ai_answer']} | {a['ai_confidence']} | "
                         f"{'; '.join(q['issues'])} | {(a['audit_note'] or '').replace('|', '/')} {('— ' + why) if why else ''} |")
            n += 1
    lines.insert(2, f"ทั้งหมด {n} รายการ")
    (AUD / "REVIEW.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return n


def medlib_status(a):
    if a["answer_status"] in ("source_disagree",) or (a["needs_review"] and not a.get("user_decision")):
        return "disputed"
    if a["answer_status"] in ("source_agree", "corrected") and a["answer_verified"]:
        return "verified"
    return "draft"


def build_medlib(sets):
    """Copy audited questions into the MedLib site.

    The original exam / answer-key PDFs go to block.json `papers` (NOT lectures); every question
    refs its page in both PDFs. One exam_set per set_id → data/blocks/<BLOCK>/exams/<cohort>_<type>.json
    """
    inv = {x["set_id"]: x for x in load(AUD / "data" / "inventory.json")["sets"]}
    for s in sets:
        B = s["block"].upper()
        bdir = ROOT / "data" / "blocks" / B
        block = load(bdir / "block.json")
        meta = inv[s["set_id"]]
        c, t = int(s["cohort"]), s["type"]
        pid = {"exam": f"{t}{c}", "key": f"{t}{c}-KEY"}
        papers = [x for x in block.get("papers", []) if x["id"] not in pid.values()]
        for role, f in meta["files"].items():
            papers.append({"id": pid[role], "title": f"{'เฉลย ' if role == 'key' else ''}{t} {meta['block_name']} [Med PSU {c}]",
                           "cohort": c, "type": t, "role": role, "pages": f["pages"],
                           "drive_file_id": f["drive_file_id"], "drive_path": f["drive_path"]})
        papers.sort(key=lambda x: (-x["cohort"], x["type"], x["role"] != "exam"))
        # exam PDFs used to be listed as lectures by mistake — drop them
        lectures = [l for l in block["lectures"] if l["id"] not in (f"MCQ{c}", f"MCQ{c}-ANS")]
        set_name = f"{c}_{t}"
        qs = []
        for q in s["questions"]:
            a = q["audit"]
            if a["answer_status"] == "skipped":
                continue
            refs = [{"paper": pid["exam"], "pages": [a["page"]]}]
            if a["key_page"]:
                refs.append({"paper": pid["key"], "pages": [a["key_page"]]})
            exp = re.sub(r"^\((.*?)\)\*\* — ", lambda m: m.group(1) + " — ", q["explanation"])
            if q["issues"]:
                exp += "\n⚠️ " + " · ".join(q["issues"])
            n = int(q["number"])
            qs.append({"id": f"{B}-{c}-MCQ-{n:03d}", "block": B, "cohort": c, "n": n, "type": "MCQ",
                       "stem": q["stem"], "options": {k: v for k, v in q["choices"].items() if v},
                       "answer": q["correct"], "answer_status": medlib_status(a), "explanation": exp,
                       "refs": refs, "tags": [x for x in [a["duplicate_group"]] if x], "source": "import",
                       "audit_ref": q["id"]} | ({"also_accept": q["also_accept"]} if q.get("also_accept") else {}))
        out = {"meta": {"set_id": set_name, "block": B, "cohort": c, "type": t,
                        "title": f"{t} {meta['block_name']} · Med PSU {c}",
                        "time_limit_min": meta.get("time_limit_min"), "n_source_items": s["n_source_items"],
                        "skipped": [q["number"] for q in s["questions"] if q["audit"]["answer_status"] == "skipped"],
                        "generated_by": "auditor/tools/build_outputs.py — do not edit by hand"},
               "questions": qs}
        (bdir / "exams").mkdir(exist_ok=True)
        (bdir / "exams" / f"{set_name}.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
        block["lectures"] = lectures
        block["papers"] = papers
        if set_name not in block["exam_sets"]:
            block["exam_sets"].append(set_name)
        order = ["id", "name", "year", "lectures", "papers", "exam_sets"]
        block = {k: block[k] for k in order if k in block} | {k: v for k, v in block.items() if k not in order}
        (bdir / "block.json").write_text(json.dumps(block, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--block")
    a = ap.parse_args()
    sets = work_sets(a.block)
    allb = build_quiz(work_sets())  # all.json always covers every block
    errs = validate_quiz(allb)
    build_reports(sets)
    n_review = build_review(work_sets())
    build_medlib(sets)
    v = subprocess.run(["node", str(ROOT / "tools" / "validate.cjs")], capture_output=True, text=True, encoding="utf-8")
    nq = sum(len(e["questions"]) for b in allb for e in b["exams"])
    print(f"quiz JSON: {nq} ข้อ, schema errors {len(errs)} | REVIEW {n_review} รายการ | MedLib validate: {v.stdout.strip().splitlines()[-1] if v.stdout.strip() else v.stderr.strip()}")
    for e in errs:
        print("  ✗", e)
    if errs or v.returncode:
        print(v.stdout)
        sys.exit(1)


if __name__ == "__main__":
    main()
