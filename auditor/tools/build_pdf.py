"""Phase 5 — clean PDF per set: question + choices, then answer + explanation; 🤖 = AI wrote/filled, ⚠️ = needs review.

Usage:  .venv/Scripts/python auditor/tools/build_pdf.py --set end_52_MCQ
Font: Leelawadee UI / Tahoma from C:/Windows/Fonts (Sarabun / Noto Sans Thai if present).
"""
import argparse, html, json
from pathlib import Path
import pymupdf

AUD = Path(__file__).resolve().parents[1]
FONT_DIR = Path("C:/Windows/Fonts")
FONTS = ["Sarabun-Regular.ttf", "NotoSansThai-Regular.ttf", "leelawad.ttf", "tahoma.ttf"]
BOLD = {"Sarabun-Regular.ttf": "Sarabun-Bold.ttf", "NotoSansThai-Regular.ttf": "NotoSansThai-Bold.ttf",
        "leelawad.ttf": "leelawdb.ttf", "tahoma.ttf": "tahomabd.ttf"}
STATUS = {"source_agree": "ตรงกับเฉลยต้นฉบับ", "source_unverified": "ต้นฉบับไม่แน่นอน", "source_disagree": "⚠️ เฉลยขัดกัน",
          "drafted": "🤖 AI ทำเฉลย", "ai_generated": "🤖 AI เขียนข้อ", "corrected": "แก้ตามผู้ใช้ตัดสิน"}


def esc(s):
    return html.escape(s or "").replace("\n", "<br/>")


def build(sid):
    s = json.loads((AUD / "data" / "work" / f"{sid}.json").read_text(encoding="utf-8"))
    reg = next(f for f in FONTS if (FONT_DIR / f).exists())
    bold = BOLD[reg] if (FONT_DIR / BOLD[reg]).exists() else reg
    css = f"""
    @font-face {{ font-family: th; src: url({reg}); }}
    @font-face {{ font-family: th; font-weight: bold; src: url({bold}); }}
    * {{ font-family: th; font-size: 10.5pt; line-height: 1.45; }}
    h1 {{ font-size: 15pt; margin: 0 0 4pt 0; }}
    .sub {{ color: #555; font-size: 9pt; margin-bottom: 10pt; }}
    .q {{ margin: 0 0 10pt 0; }}
    .n {{ font-weight: bold; }}
    .ch {{ margin-left: 14pt; }}
    .ok {{ color: #0a6b2d; font-weight: bold; }}
    .ans {{ margin: 3pt 0 0 14pt; padding: 4pt 6pt; background-color: #f1f5f9; }}
    .warn {{ color: #a15c00; }}
    .skip {{ color: #777; }}
    """
    parts = [f"<h1>{esc(s['name'])}</h1>",
             f"<div class='sub'>ตรวจและซ่อมโดย PSU Exam Auditor · {len(s['questions'])} ข้อในต้นฉบับ · "
             f"🤖 = AI เขียน/เติม · ⚠️ = ต้องตรวจ · เฉลยต้นฉบับคงไว้เสมอ</div>"]
    for q in s["questions"]:
        a = q["audit"]
        if a["answer_status"] == "skipped":
            parts.append(f"<div class='q skip'><span class='n'>{q['number']}.</span> – (ผู้จำจำโจทย์ไม่ได้)</div>")
            continue
        mark = " ⚠️" if a["needs_review"] or a["answer_status"] == "source_disagree" else ""
        mark += " 🤖" if a["ai_generated"] or a["ai_choices"] else ""
        ch = "".join(
            f"<div class='ch'>{'<span class=ok>' if k == q['correct'] else ''}{k}. {esc(v)}{' ✓</span>' if k == q['correct'] else ''}</div>"
            for k, v in q["choices"].items() if v)
        warn = f"<div class='warn'>⚠️ {esc(' · '.join(q['issues']))}</div>" if q["issues"] else ""
        parts.append(
            f"<div class='q'><span class='n'>{q['number']}.{mark}</span> {esc(q['stem'])}{ch}"
            f"<div class='ans'><b>เฉลย {q['correct']}</b> · {STATUS.get(a['answer_status'], a['answer_status'])}<br/>"
            f"{esc(q['explanation'].replace('**', ''))}{warn}</div></div>")
    story = pymupdf.Story("".join(parts), user_css=css, archive=pymupdf.Archive(str(FONT_DIR)))
    out = AUD / "output" / "pdf"
    out.mkdir(parents=True, exist_ok=True)
    path = out / f"{sid}.pdf"
    writer = pymupdf.DocumentWriter(str(path))
    page, where = pymupdf.paper_rect("a4"), pymupdf.paper_rect("a4") + (42, 42, -42, -42)
    more = True
    while more:
        dev = writer.begin_page(page)
        more, _ = story.place(where)
        story.draw(dev)
        writer.end_page()
    writer.close()
    doc = pymupdf.open(path)
    print(f"{path.relative_to(AUD.parent)}: {len(doc)} หน้า ({reg})")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--set", required=True)
    build(ap.parse_args().set)


if __name__ == "__main__":
    main()
