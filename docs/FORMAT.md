# MedLib data format (schema v1)

The rules live in one place: `lib/validate.js`. The web form, `tools/validate.cjs` and the MCP server
(next version) all call it, so data added by hand and data added by Claude always come out the same.
If this document and `lib/validate.js` disagree, the code wins — fix this document.

## Folders

```
data/blocks/index.json          {"blocks": ["END", "CVS"]}      ← list of real blocks (starts empty)
data/blocks/<ID>/block.json     one block
data/blocks/<ID>/exams/<set>.json   one exam set per file (e.g. 52_MCQ.json)
data/blocks/<ID>/pdf/...        optional local PDFs (normally PDFs live in Google Drive)
samples/blocks/...              same layout, DEMO data only — never put real data here
```

## block.json

| field | required | notes |
|---|---|---|
| `id` | ✓ | 2–8 uppercase letters/digits, e.g. `END` |
| `name` | ✓ | shown in the menu |
| `year` | | e.g. `ปี 2` |
| `lectures[]` | ✓ | see below |
| `exam_sets[]` | ✓ | file names in `exams/` without `.json` |
| `papers[]` | | original exam / answer-key PDFs (NOT lectures), see below |

Lecture: `id` (unique in the block, e.g. `L02`), `title`, `pages` (page count), `lecturer?`,
and where the PDF is: `drive_file_id` (Google Drive file, shared "anyone with the link") or `file`
(path relative to the block folder). With neither, the lecture shows but cannot be opened.

Paper (original exam or answer-key PDF — shown in the ข้อสอบ tab next to its set, never in the Lecture tab):
`id` (unique across lectures and papers, e.g. `MCQ52`, `MCQ52-KEY`), `title`, `pages`, `cohort`, `type` (`MCQ` / `KF` / `OSPE`),
`role` (`exam` / `key`), and `drive_file_id` or `file`.

## exams/<set>.json

```json
{ "meta": { "set_id": "52_MCQ", "block": "END", "cohort": 52, "type": "MCQ", "title": "", "time_limit_min": 120 },
  "questions": [ { ...question... } ] }
```

One file = one set; the website shows it as a whole set (cohort card → set runner with practice/timed modes).
`time_limit_min` (optional) drives the countdown in timed mode.

## Question

| field | required | notes |
|---|---|---|
| `id` | ✓ | exactly `<block>-<cohort>-MCQ-<n as 3 digits>`, e.g. `END-52-MCQ-005` |
| `block`, `cohort`, `n` | ✓ | `n` = question number in the original paper |
| `type` | ✓ | `"MCQ"` (only type in v1) |
| `stem` | ✓ | ≥ 10 characters |
| `options` | ✓ | object with keys from `A`–`E`, at least 2 |
| `answer` | ✓ | one of the option keys |
| `also_accept` | | other option keys that also score, e.g. `["C"]` (a question with more than one right choice; must not repeat `answer`) |
| `answer_status` | ✓ | `verified` / `draft` / `disputed` |
| `explanation` | | text |
| `refs[]` | ✓ | `{ "lecture": "L02", "pages": [14, 15] }` or `{ "paper": "MCQ52", "pages": [6] }` — must exist in the block, pages within its page count |
| `tags[]` | ✓ | list of words (may be empty) |
| `source` | ✓ | `manual` (web form) / `claude-mcp` (Claude) / `import` (bulk import) |

## KF / OSPE question

Same common fields (`id` = `<block>-<cohort>-KF-<nnn>`, `answer_status`, `refs`, `tags`, `source`, …) but instead of
`stem`/`options`/`answer`: `case` (KF scenario; OSPE uses `stem` + `station`) and `items[]` (sub-questions).
A question-level `image` / `image_caption` is shown under the case.

| item field | notes |
|---|---|
| `id`, `prompt`, `format` | `format` = `short` (typed answer) or `select` (tick boxes) |
| `accepted[]`, `keywords_all[]` | `short`: right if the answer matches one accepted answer, or contains every keyword |
| `options[] {key,text}`, `answer[]`, `max_answers` | `select` |
| `key_text`, `source_key`, `explanation`, `mechanism[]` | shown after checking (`source_key` = what the original key says) |
| `image`, `image_caption` | picture that belongs to this sub-question, shown under its prompt |
| `key_image`, `key_image_caption` | picture from the answer key, shown only with the answer |

Picture fields are file names inside the block folder (`img/…jpg`), never `data:` URLs.
**Pictures must be the whole picture** — every edge, label, legend and caption that belongs to it. In the auditor,
prefer `"native": true` in `auditor/data/images.json` (takes the embedded image itself); when drawing a `rect` by hand,
leave a margin and open the cropped file to check all four edges before building.

## Personal data export (`medlib-personal-YYYY-MM-DD.json`)

```json
{ "format": "medlib-personal", "schema": 1, "app_version": "0.1.0", "exported": "...",
  "settings": { ...only the settings this person changed... },
  "questions": [ ...questions in the format above, source "manual"... ] }
```

To promote personal questions to shared data, give this file to Claude: each question is validated
again and appended to the right `exams/<set>.json`.
