"""List a Drive folder tree through the Drive API (www.googleapis.com).

Usage:  python3 auditor/tools/drive_walk_api.py [--path preclinic/2/endocrine] [--depth 4] [--root <folder_id>]

The key comes from ../config.json (drive_api_key, never printed) or, in a cloud session, is added by the
network proxy. Use this where drive.google.com is not reachable (drive_walk_public.py needs it).
Prints  path <TAB> id <TAB> kind  per entry.
"""
import argparse, json, urllib.parse, urllib.request
from pathlib import Path

AUD = Path(__file__).resolve().parents[1]
CFG = AUD.parent / "config.json"
KEY = (json.loads(CFG.read_text(encoding="utf-8")).get("drive_api_key") if CFG.exists() else None) or ""
FOLDER = "application/vnd.google-apps.folder"


def children(fid):
    out, token = [], None
    while True:
        q = {"q": f"'{fid}' in parents and trashed=false", "fields": "nextPageToken,files(id,name,mimeType)", "pageSize": "1000"}
        if token: q["pageToken"] = token
        if KEY: q["key"] = KEY
        d = json.loads(urllib.request.urlopen("https://www.googleapis.com/drive/v3/files?" + urllib.parse.urlencode(q)).read())
        out += [(f["name"], f["id"], "folder" if f["mimeType"] == FOLDER else "file") for f in d.get("files", [])]
        token = d.get("nextPageToken")
        if not token:
            return sorted(out)


def walk(fid, prefix, depth, acc):
    for name, eid, kind in children(fid):
        acc.append((f"{prefix}/{name}" if prefix else name, eid, kind))
        if kind == "folder" and depth > 1:
            walk(eid, acc[-1][0], depth - 1, acc)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=json.loads((AUD / "data" / "inventory.json").read_text(encoding="utf-8"))["drive_folder_id"])
    ap.add_argument("--path", default="")
    ap.add_argument("--depth", type=int, default=4)
    a = ap.parse_args()
    fid, prefix = a.root, ""
    for part in [p for p in a.path.split("/") if p]:
        hit = [c for c in children(fid) if c[2] == "folder" and c[0].lower() == part.lower()]
        if not hit:
            raise SystemExit(f"ไม่พบโฟลเดอร์ {part} ใน {prefix or '(root)'}")
        fid, prefix = hit[0][1], f"{prefix}/{hit[0][0]}" if prefix else hit[0][0]
    acc = []
    walk(fid, prefix, a.depth, acc)
    for p, i, k in acc:
        print(f"{p}\t{i}\t{k}")


if __name__ == "__main__":
    main()
