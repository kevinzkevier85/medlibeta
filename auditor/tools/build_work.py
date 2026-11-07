"""Merge parsed exam + original key + blind AI answers + repair layer → data/work/<set>.json

Usage:  .venv/Scripts/python auditor/tools/build_work.py --set end_52_MCQ

Rules (CLAUDE.md §3): original answer is always kept; disagreement → source_disagree (never overridden
unless data/decisions.json says so → corrected); locked questions are never rebuilt.
"""
import argparse, json, re, sys
from pathlib import Path

AUD = Path(__file__).resolve().parents[1]
W = AUD / "data" / "work"


def load(p, default=None):
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else default


def apply_edit(q, e):
    f = e["field"]
    if f == "stem":
        if e["old"] in q["stem"]:
            q["stem"] = q["stem"].replace(e["old"], e["new"]).strip()
            return True
    elif f.startswith("choices."):
        k = f.split(".")[1]
        if q["choices"].get(k) == e["old"]:
            q["choices"][k] = e["new"]
            return True
    elif f == "choices":
        return True  # descriptive edit (e.g. table → text), handled by choices_override
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--set", required=True)
    a = ap.parse_args()
    sid = a.set

    inv = load(AUD / "data" / "inventory.json")
    meta = next(s for s in inv["sets"] if s["set_id"] == sid)
    parsed = load(W / f"{sid}.parsed.json")
    key = load(W / f"{sid}.key.json")
    blind = load(W / f"{sid}.blind.json")
    rep = load(W / f"{sid}.repair.json")
    if not (parsed and key and blind and rep):
        sys.exit("ERROR: ต้องมี parsed/key/blind/repair ครบก่อน (ดู CLAUDE.md Phase 1–3)")
    decisions = load(AUD / "data" / "decisions.json", {}) or {}
    imgcfg = load(AUD / "data" / "images.json", {}) or {}
    images, no_image = imgcfg.get("images", {}), imgcfg.get("no_image", {})
    old = load(W / f"{sid}.json", {"questions": []})
    locked = {q["id"]: q for q in old["questions"] if q.get("audit", {}).get("locked")}

    dup_of = {n: g for g, ns in rep.get("duplicate_groups", {}).items() for n in ns}
    problems, out = [], []
    for pq in parsed["questions"]:
        n = pq["number"]
        qid = f"{sid}_{int(n):03d}"
        if qid in locked:
            out.append(locked[qid])
            continue
        r = rep["questions"].get(n, {})
        k = key.get(n, {"answers": [], "note": "", "page": None})
        b = blind["answers"].get(n)
        skipped = n in rep.get("skipped", [])

        q = {"id": qid, "number": n, "sourceNumber": n,
             "stem": r.get("stem_override", pq["stem"]),
             "choices": {L: "" for L in "ABCDE"}, "correct": None,
             "explanation": r.get("explanation", ""), "image": None, "issues": list(r.get("issues", []))}
        q["choices"].update(r.get("choices_override", pq["choices"]))
        if qid in images:   # cropped by crop_images.py; path is relative to the MedLib block folder
            c = meta.get("medlib_cohort") or meta["cohort"]
            q["image"] = f"img/{meta['block'].upper()}-{c}-{meta['type']}-{int(n):03d}.jpg"
            if images[qid].get("caption"):
                q["image_caption"] = images[qid]["caption"]

        edits = []
        for e in r.get("edits", []) + rep.get("extra_edits", {}).get(n, []):
            if apply_edit(q, e):
                edits.append(e)
            else:
                problems.append(f"ข้อ {n}: edit ไม่เจอข้อความเดิม: {e['old'][:50]}")

        src = k["answers"]
        flags = set(r.get("flags", []))
        audit = {"source_file": meta["files"]["exam"]["drive_path"], "page": pq["page"],
                 "key_file": meta["files"]["key"]["drive_path"], "key_page": k.get("page"),
                 "answer_status": None, "answer_verified": False,
                 "source_answer": src[0] if len(src) == 1 else (src or None),
                 "source_answer_note": k.get("note") or None,
                 "ai_answer": b["ai"] if b else None, "ai_confidence": b["conf"] if b else None,
                 "ai_reason": b["why"] if b else None,
                 "audit_note": r.get("audit_note"), "why": r.get("why"),
                 "ai_generated": "ai_generated" in flags, "ai_choices": list(r.get("ai_choices", [])),
                 "original_text": r.get("original_text"), "filled_from": r.get("filled_from"), "edits": edits, "duplicate_group": dup_of.get(n),
                 "off_block": "off_block" in flags, "needs_review": "needs_review" in flags,
                 "locked": False}

        if audit["ai_choices"]:
            q["issues"].append(f"ช้อยส์ {', '.join(audit['ai_choices'])} AI เติมให้ครบ 5 ตัว")

        if skipped:
            audit["answer_status"] = "skipped"
            audit["audit_note"] = rep.get("skipped_reason")
            q["issues"].append("ข้อนี้ผู้จำจำโจทย์ไม่ได้")
        elif audit["ai_generated"] and qid not in decisions:
            # Rule 3.3: the original is only a recall note → AI wrote the full question (answer in the repair layer)
            q["correct"] = r.get("answer")
            audit["answer_status"] = "ai_generated"
            q["issues"].append("AI เขียนข้อนี้ขึ้นใหม่จากโน้ตความจำในต้นฉบับ")
            if not q["correct"]:
                problems.append(f"ข้อ {n}: ai_generated แต่ไม่มี answer ใน repair")
        elif qid in decisions:
            d = decisions[qid]
            if d.get("answer") and d["answer"] != audit["source_answer"]:
                q["correct"] = d["answer"]
                audit["answer_status"] = "corrected"
            else:
                q["correct"] = audit["source_answer"]
                audit["answer_status"] = "source_agree"
            audit["answer_verified"] = True
            audit["user_decision"] = d
            if d.get("also_accept"):
                q["also_accept"] = [k for k in d["also_accept"] if k != q["correct"]]
            if d.get("note"):
                q["issues"].append(d["note"])
        elif not src:
            q["correct"] = audit["ai_answer"]
            audit["answer_status"] = "drafted"
            q["issues"].append("ไม่มีเฉลยต้นฉบับ AI ทำเฉลยให้")
        elif len(src) > 1:
            q["correct"] = audit["ai_answer"] if audit["ai_answer"] in src else src[0]
            audit["answer_status"] = "source_disagree"
            audit["needs_review"] = True
            q["issues"].append("ต้นฉบับวงไว้หลายตัว")
        elif "source_unverified" in flags:
            q["correct"] = src[0]
            audit["answer_status"] = "source_unverified"
        elif audit["ai_answer"] == src[0]:
            q["correct"] = src[0]
            audit["answer_status"] = "source_agree"
            audit["answer_verified"] = not audit["needs_review"]
        else:
            q["correct"] = src[0]  # keep the original answer (rule 3.2)
            audit["answer_status"] = "source_disagree"
            audit["needs_review"] = True
            q["issues"].append("เฉลยขัดกับ AI")

        # a question that points at a picture/table must carry one (or be listed in images.json › no_image)
        if (not skipped and not q["image"] and qid not in no_image and
                re.search(r"(following|this|the) (picture|photo|figure|image|table|graph|diagram)|shown (below|in the (photo|picture|figure|table))|as the following|ภาพ|รูป", q["stem"], re.I)):
            problems.append(f"ข้อ {n}: โจทย์อ้างถึงรูป/ตาราง แต่ยังไม่มีรูป (ใส่ใน data/images.json)")
        if not skipped and not q["explanation"]:
            problems.append(f"ข้อ {n}: ยังไม่มี explanation")
        if not skipped and sum(1 for v in q["choices"].values() if v) < 5:
            problems.append(f"ข้อ {n}: ช้อยส์ไม่ครบ 5")
        q["audit"] = audit
        out.append(q)

    work = {"set_id": sid, "block": meta["block"], "name": meta["original_name"], "cohort": meta["cohort"],
            "type": meta["type"], "n_source_items": len(parsed["questions"]), "questions": out}
    (W / f"{sid}.json").write_text(json.dumps(work, ensure_ascii=False, indent=1), encoding="utf-8")

    from collections import Counter
    c = Counter(q["audit"]["answer_status"] for q in out)
    print(f"{sid}: {len(out)} ข้อ | " + ", ".join(f"{k} {v}" for k, v in c.items())
          + f" | needs_review {sum(q['audit']['needs_review'] for q in out)}")
    for p in problems:
        print("  ⚠", p)
    if problems:
        sys.exit(1)


if __name__ == "__main__":
    main()
