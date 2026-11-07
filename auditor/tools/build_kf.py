"""KF set → MedLib: auditor/data/work/<set>.kf.json → data/blocks/<BLOCK>/exams/<cohort>_KF.json + block.json papers.

Usage:  .venv/Scripts/python auditor/tools/build_kf.py --set end_52_KF

The work file is written by hand from the exam + key PDFs (every page read by eye). Pictures come from
auditor/data/images.json via crop_images.py; this script stops if a work item names a picture file that
does not exist, or if images.json has a picture for this set that no item uses (picture left out).
Run `node tools/validate.cjs` afterwards.
"""
import argparse, json, sys
from pathlib import Path

AUD = Path(__file__).resolve().parents[1]
ROOT = AUD.parent


def load(p):
    return json.loads(p.read_text(encoding="utf-8"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--set", required=True)
    ap.add_argument("--images", help="picture list file instead of data/images.json (per-set draft)")
    ap.add_argument("--no-block", action="store_true", help="write only the exam set file, leave block.json alone")
    a = ap.parse_args()
    inv = {s["set_id"]: s for s in load(AUD / "data" / "inventory.json")["sets"]}
    meta = inv[a.set]
    work = load(AUD / "data" / "work" / f"{a.set}.kf.json")
    B, c = meta["block"].upper(), int(meta.get("medlib_cohort") or meta["cohort"])
    bdir = ROOT / "data" / "blocks" / B
    pid = {"exam": f"KF{c}", "key": f"KF{c}-KEY"}

    used, qs = set(), []
    for w in work["questions"]:
        n = w["n"]
        for it in w["items"]:
            if it.get("key_image"):
                if not (bdir / it["key_image"]).exists():
                    sys.exit(f"ERROR: ข้อ {n} item {it['id']}: ไม่มีไฟล์ {it['key_image']} — รัน crop_images.py --set {a.set}")
                used.add(it["key_image"])
        q = {"id": f"{B}-{c}-KF-{n:03d}", "block": B, "cohort": c, "n": n, "type": "KF", "case": w["case"], "items": w["items"],
             "answer_status": w.get("answer_status", "verified"),
             "refs": [{"paper": pid["exam"], "pages": [w["page"]]}, {"paper": pid["key"], "pages": [w["page"]]}],
             "tags": w.get("tags", []), "source": "claude-mcp"}
        for k in ("key_concept", "explanation", "audit_note", "image", "image_caption"):
            if w.get(k):
                q[k] = w[k]
        if q.get("image"):
            used.add(q["image"])
        qs.append(q)

    # every picture registered for this set must be used by some question/item
    for qid, im in load(Path(a.images) if a.images else AUD / "data" / "images.json")["images"].items():
        if not qid.startswith(a.set + "_"):
            continue
        f = im.get("file") or f"img/{B}-{c}-KF-{int(qid[len(a.set) + 1:]):03d}{'-key' if im.get('role') == 'key' else ''}.jpg"
        if f not in used:
            sys.exit(f"ERROR: รูป {f} ({qid}) อยู่ใน images.json แต่ไม่มีข้อไหนใช้")

    set_name = f"{c}_KF"
    out = {"meta": {"set_id": set_name, "block": B, "cohort": c, "type": "KF",
                    "title": f"KF {meta['block_name']} · Med PSU {c}", "time_limit_min": work.get("time_limit_min") or meta.get("time_limit_min"),
                    "generated_by": f"auditor/tools/build_kf.py from auditor/data/work/{a.set}.kf.json — do not edit by hand"},
           "questions": qs}
    (bdir / "exams" / f"{set_name}.json").write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    if a.no_block:
        print(f"{set_name}: {len(qs)} ข้อ, {sum(len(q['items']) for q in qs)} ข้อย่อย, รูป {len(used)} (ไม่แตะ block.json)")
        return
    block = load(bdir / "block.json")
    papers = [x for x in block.get("papers", []) if x["id"] not in pid.values()]
    for role, f in meta["files"].items():
        papers.append({"id": pid[role], "title": f"{'เฉลย ' if role == 'key' else ''}KF {meta['block_name']} [Med PSU {c}]", "cohort": c,
                       "type": "KF", "role": role, "pages": f["pages"], "drive_file_id": f["drive_file_id"], "drive_path": f["drive_path"]})
    papers.sort(key=lambda x: (-x["cohort"], x["type"], x["role"] != "exam"))
    block["papers"] = papers
    if set_name not in block["exam_sets"]:
        block["exam_sets"].append(set_name)
    block["exam_sets"].sort(key=lambda s: (-int(s.split("_")[0]), s.split("_")[1]))
    (bdir / "block.json").write_text(json.dumps(block, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{set_name}: {len(qs)} ข้อ, {sum(len(q['items']) for q in qs)} ข้อย่อย, รูป {len(used)} → {(bdir / 'exams' / (set_name + '.json')).relative_to(ROOT)}")


if __name__ == "__main__":
    main()
