"""List a public ("anyone with the link") Drive folder tree without an API key.

Usage:  python auditor/tools/drive_walk_public.py <folder_id> [--path preclinic/2/endocrine] [--depth 6]

Reads Google's embeddedfolderview page (no key needed). Prints  path <TAB> id <TAB> kind  per entry.
--path walks only down that sub-path (names matched case-insensitively) before listing everything below it.
"""
import argparse, html, re, urllib.request

ENTRY = re.compile(r'<div class="flip-entry" id="entry-([A-Za-z0-9_-]+)".*?flip-entry-title">([^<]*)<', re.S)


def children(fid):
    req = urllib.request.Request(f"https://drive.google.com/embeddedfolderview?id={fid}", headers={"User-Agent": "medlib-auditor"})
    page = urllib.request.urlopen(req).read().decode("utf-8", "replace")
    out = []
    for m in ENTRY.finditer(page):
        eid, name = m.group(1), html.unescape(m.group(2)).strip()
        block = page[m.start():m.start() + 600]
        out.append((name, eid, "folder" if "/folders/" in block else "file"))
    return out


def walk(fid, prefix, depth, acc):
    for name, eid, kind in children(fid):
        p = f"{prefix}/{name}" if prefix else name
        acc.append((p, eid, kind))
        if kind == "folder" and depth > 0:
            walk(eid, p, depth - 1, acc)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder_id")
    ap.add_argument("--path", default="")
    ap.add_argument("--depth", type=int, default=6)
    a = ap.parse_args()
    fid, prefix = a.folder_id, ""
    for part in [x for x in a.path.split("/") if x]:
        hit = [c for c in children(fid) if c[2] == "folder" and c[0].lower() == part.lower()]
        if not hit:
            raise SystemExit(f"ไม่พบโฟลเดอร์ '{part}' ใต้ '{prefix or '/'}': " + ", ".join(c[0] for c in children(fid)))
        fid, prefix = hit[0][1], f"{prefix}/{hit[0][0]}" if prefix else hit[0][0]
    acc = []
    walk(fid, prefix, a.depth, acc)
    for p, eid, kind in acc:
        print(f"{p}\t{eid}\t{kind}")


if __name__ == "__main__":
    main()
