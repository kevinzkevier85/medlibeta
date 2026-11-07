# MedLib v0.5 — design (from comparing CVS-pdf and psu-quiz)

Date: 2026-11-07 · Status: approved by the user in chat ("doit all") · Comparison: `docs/reference-comparison.md`

## Intent
One public site (GitHub Pages) where classmates practise old Med PSU exams block by block, read the lectures,
and plan what to read. Content comes mainly from the Exam Auditor (Claude) so answer keys are checked;
users can only change things on their own device and report doubtful keys to the maintainer.

## Decisions made by the user
| Area | Decision |
|---|---|
| Audience | classmates / whole faculty, public site |
| Content | Auditor is the main source; small edits in the web only on the user's own device |
| Use | practise exams + read lectures + plan reading, equally |
| Devices | phone + computer; offline (PWA) wanted but later |
| Modes | practice (instant key), timed real-exam, untimed exam; options: shuffle questions, shuffle choices |
| Mode switch | mode is chosen when a round starts; every round is kept in history; nothing is wiped |
| Repeat | psu-quiz style: finish a round, then a new round with only the wrong ones (user ticks which) |
| Flag | one button "ไว้ทบทวน" (kept across rounds) |
| Cross-set | by lecture/topic across cohorts; random n from the block; everything wrong/flagged across sets |
| Explanations | full CVS style: answer line, why for every choice, mechanism arrows, key concept, ⚠️ trap box, lecture refs with "ออกซ้ำ n ปี"/Tier |
| Key disagreements | show both (key used for scoring + original key with reason) with a warning badge |
| Doubtful key | report into a queue (Worker → GitHub Issue) AND allow a local override on this device |
| KF / OSPE | yes; auto-grade (accepted words / keywords) + "judge it yourself" buttons |
| Guidereader | block level (tab "แผนอ่าน") + set level (tab in the set) + re-read list from wrong answers |
| Lecture reading | mark read + % per block, resume at last page, highlight pages that were examined, search text in PDF |
| Personal PDFs / profiles | no |
| PDF storage | Google Drive via the Cloudflare Worker (existing); CVS lectures may use their existing public URL until moved to Drive |
| Sync | no accounts: export/import a progress file, merged item by item |
| History | every round per set + progress graph |
| Notes | per question + floating notepad per set |
| Report queue | existing Worker gets `POST /report` → opens a GitHub Issue |
| Block page | tabs: ข้อสอบ / Lecture / แผนอ่าน |
| Look | CVS style (calm, artery red + vein blue, Anuphan), light/dark |
| Number bar | horizontal sticky strip + "ดูทั้งหมด" |
| Admin mode in web | none (maintainer works through Claude / REVIEW.md) |
| Existing data | import the 11 CVS sets now (live); use psu-quiz questions only as a cross-check source for Auditor; still audit all 709 Drive files |
| Order | exam page first, then lecture/plan, then PWA |

## Data format v2 (lib/validate.js stays the only rulebook)
- Question `type`: `MCQ` / `KF` / `OSPE`; id `<BLOCK>-<cohort>-<TYPE>-<nnn>` (v1 MCQ ids stay valid).
- `answer_status`: `verified` / `corrected` (Auditor changed the original key) / `disputed` / `draft`.
- MCQ: `options` {A..E}, `answer`, optional `option_why` {A..E}.
- KF/OSPE: `case` (KF) or `station` + `stem` (OSPE), `items[]` = `{id, prompt, format: short|select, accepted[], keywords_all[], options[]?, answer[]?, max_answers?, explanation?, mechanism?}`.
- Optional rich fields: `source_answer`, `source_answer_note`, `mechanism[]` (string or `{s, answer?, note?}`),
  `key_concept`, `audit_note`, `image` (path inside the block folder), `image_caption`.
- refs: `{lecture|paper, pages, focus?, hotspot?: {tier, years}}`.
- Lecture: `drive_file_id` or `file` or `url` (public https PDF); optional `page_index[]` = `{page, heading, summary, keywords}` (searchable).
- Set file may carry `guide` (set-level Guidereader built by the analysis tools).
- Tags may be an array of words (v1) — imported object tags are flattened to words.

## Personal data (browser) v2
- `medlib.rounds.v1`: per set key → rounds `[ {id, kind, mode, shuffleQ, shuffleC, qids, choiceOrder, ans, chk, ov, started, elapsed, done, finished} ]`.
- `medlib.marks.v1`: `flag`, `notes` (per question, `{t, text}`), `setNotes`, `keyOverride`, `reported`.
- `medlib.read.v1`: per document `{page, done, t}`.
- Export file `medlib-personal` schema 2 includes all of the above; import merges (rounds by id, newest note wins).

## Build order (this branch)
1. Format v2 + validator + CVS import tool (11 sets, images to files, lectures with page index).
2. Exam runner rewrite (rounds, modes, shuffle, rich explanation, KF/OSPE, notes, notepad, report + override, summary, history graph).
3. Block page tabs + cross-set practice + Guidereader (block + set).
4. Lecture reading (read marks, resume, examined pages, in-PDF search, page-index search).
5. Worker `/report`, progress export/import v2, CVS theme.
6. Later: PWA; Auditor upgrade to emit v2 rich fields; run Auditor on all Drive sets with psu-quiz as cross-check.

## Left to the builder
Exact styling, wording, file split (`app.js` + `quiz.js` + `lib/quizcore.js`), grading thresholds for short answers (same as CVS).
