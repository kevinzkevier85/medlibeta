"""KF / OSPE set → MedLib: auditor/data/work/<set>.kf.json → data/blocks/<BLOCK>/exams/<cohort>_<TYPE>.json + block.json papers.
The type (KF or OSPE) comes from the set's inventory entry; an OSPE work question keeps its station text in "case" and is written as stem + station.

Usage:  .venv/Scripts/python auditor/tools/build_kf.py --set end_52_KF

The work file is written by hand from the exam + key PDFs (every page read by eye). Pictures come from
auditor/data/images.json via crop_images.py; this script stops if a work item names a picture file that
does not exist, or if images.json has a picture for this set that no item uses (picture left out).
Run `node tools/validate.cjs` afterwards.
"""
import argparse, json, re, sys
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
    T = meta["type"]  # KF or OSPE
    pid = {"exam": f"{T}{c}", "key": f"{T}{c}-KEY"}
    m_ = re.search(r"\[Med PSU ([^\]]+)\]", meta.get("original_name", ""))
    label = m_.group(1) if m_ else str(c)  # combined archives show their whole range (e.g. 37-43)

    used, qs = set(), []
    for w in work["questions"]:
        n = w["n"]
        for it in w["items"]:
            for fld in ("key_image", "image"):
                if it.get(fld):
                    if not (bdir / it[fld]).exists():
                        sys.exit(f"ERROR: ข้อ {n} item {it['id']}: ไม่มีไฟล์ {it[fld]} — รัน crop_images.py --set {a.set}")
                    used.add(it[fld])
        q = {"id": f"{B}-{c}-{T}-{n:03d}", "block": B, "cohort": c, "n": n, "type": T}
        if T == "OSPE":
            q["station"] = w.get("station", n)
            q["stem"] = w["case"]
        else:
            q["case"] = w["case"]
        q |= {"items": w["items"],
             "answer_status": w.get("answer_status", "verified"),
             "refs": [{"paper": pid["exam"], "pages": [w.get("exam_page", w["page"])]}]
                     + ([{"paper": pid["key"], "pages": [w["page"]]}] if "key" in meta["files"] else []),  # exam_page when the key PDF paginates differently; no key ref when the set has no key file
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
        num = re.fullmatch(r"(\d+)([a-z]*)", qid[len(a.set) + 1:])  # "010b" = 2nd picture of question 10
        f = im.get("file") or f"img/{B}-{c}-{T}-{int(num.group(1)):03d}{num.group(2)}{'-key' if im.get('role') == 'key' else ''}.jpg"
        if f not in used:
            sys.exit(f"ERROR: รูป {f} ({qid}) อยู่ใน images.json แต่ไม่มีข้อไหนใช้")

    set_name = f"{c}_{T}"
    out = {"meta": {"set_id": set_name, "block": B, "cohort": c, "type": T,
                    "title": f"{T} {meta['block_name']} · Med PSU {label}",
                    "generated_by": f"auditor/tools/build_kf.py from auditor/data/work/{a.set}.kf.json — do not edit by hand"},
           "questions": qs}
    tl = work.get("time_limit_min") or meta.get("time_limit_min")
    if tl:  # leave it out when the paper does not say (the app treats a missing time as unknown)
        gen = out["meta"].pop("generated_by")
        out["meta"]["time_limit_min"] = tl
        out["meta"]["generated_by"] = gen
    (bdir / "exams" / f"{set_name}.json").write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    if a.no_block:
        print(f"{set_name}: {len(qs)} ข้อ, {sum(len(q['items']) for q in qs)} ข้อย่อย, รูป {len(used)} (ไม่แตะ block.json)")
        return
    block = load(bdir / "block.json")
    ids = {r: pid.get(r) or f"{T}{c}-{r.upper()}" for r in meta["files"]}  # key2/key3 = extra key files → KF44-KEY2, role key
    papers = [x for x in block.get("papers", []) if x["id"] not in ids.values()]
    for role, f in meta["files"].items():
        kind = "exam" if role == "exam" else "key"
        extra = f" ({role[3:]})" if kind == "key" and role != "key" else ""
        papers.append({"id": ids[role], "title": f"{'เฉลย ' if kind == 'key' else ''}{T} {meta['block_name']} [Med PSU {label}]{extra}", "cohort": c,
                       "type": T, "role": kind, "pages": f["pages"], "drive_file_id": f["drive_file_id"], "drive_path": f["drive_path"]})
    papers.sort(key=lambda x: (-x["cohort"], x["type"], x["role"] != "exam"))
    block["papers"] = papers
    if set_name not in block["exam_sets"]:
        block["exam_sets"].append(set_name)
    block["exam_sets"].sort(key=lambda s: (-int(s.split("_")[0]), s.split("_")[1]))
    (bdir / "block.json").write_text(json.dumps(block, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{set_name}: {len(qs)} ข้อ, {sum(len(q['items']) for q in qs)} ข้อย่อย, รูป {len(used)} → {(bdir / 'exams' / (set_name + '.json')).relative_to(ROOT)}")
    # topic tags live in data/blocks/<B>/topics.json; put them back into the files just written
    if (bdir / "topics.json").exists():
        import subprocess
        r = subprocess.run(["node", str(ROOT / "tools" / "apply_topics.cjs"), B], capture_output=True, text=True, encoding="utf-8")
        print(r.stdout.strip())
        if r.returncode:
            sys.exit(1)


if __name__ == "__main__":
    main()
