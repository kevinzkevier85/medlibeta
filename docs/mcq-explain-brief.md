# Subagent prompt — END MCQ explanations in CVS style (replace <c> with the cohort, e.g. 52; 42-43 for set end_42-43_MCQ)

Rewrite the answer explanations of ONE MedLib exam set, **end_<c>_MCQ** (Endocrine MCQ), into the CVS-style layout. Goal (from the user): explanations that are easy to understand, plus concepts worth re-reading that make the student think.

## Where
Git worktree (branch kel-end-mcq-explain; do NOT commit or push):
`C:\Users\AKCom\Desktop\Project Claude\projects\medlib\_ref\wt-end-ospe`
Python: `../../.venv/Scripts/python` from the worktree root (set `PYTHONIOENCODING=utf-8`). Never open or print `config.json`. Do not read .env files. Do not install packages.
Other agents may be working on other END sets in the same tree at the same time — touch only your own set's repair file.

## The only file you edit
`auditor/data/work/end_<c>_MCQ.repair.json` → `questions.<n>` entries. Keep every existing key (edits, issues, stem_override, choices_override, flags…) untouched except `explanation`, and add the new keys below. Skipped questions (listed in `skipped`) stay as they are. Never change which answer is correct — the correct answer is `correct` in `auditor/data/work/end_<c>_MCQ.json` (also read stem/choices there; do not edit that file).

## New layout per question (Thai, medical terms in English, short lines)
1. `explanation` — ONE short line: the answer and the core reason. e.g. `"Knee-chest เพิ่ม SVR ลด right-to-left shunt ใน TOF"`. No `(X)** —` prefix, no "Trap:" lines (traps go into option_why), no "⚠️".
2. `option_why` — object with EVERY option letter present in the choices, one short line each. Correct: why right (start with "✓ "). Wrong: why wrong / what that option would be true for.
3. `key_concept` — 2–4 bullets, each line starting `• `, joined by `\n`: principle to remember / re-read (contrast pairs, rules of thumb, "ถ้า…ให้นึกถึง…"), not a repeat of the explanation.
4. `mechanism` (sequence boxes "ลำดับกลไก") — REQUIRED for every physiology, pathophysiology, biochemistry-pathway and drug-mechanism question (user asked for this sequence chain for physiology). 3–6 cause→effect steps, short strings; mark exactly one step that IS the answer as `{"s": "...", "answer": true}`. Pure recall (anatomy, histology, embryology fact, epidemiology): only if a real cause→effect chain exists, else omit.

Target style: `data/blocks/CVS/exams/52_MCQ.json` (e.g. CVS-52-MCQ-005). Rules: `lib/validate.js` (checkMechanism).
Medical accuracy first: start from the existing explanation + audit info, do not invent numbers. If you think a key is wrong, do not change it — report it.

## Build & check (worktree root)
```
../../.venv/Scripts/python -W ignore auditor/tools/build_work.py --set end_<c>_MCQ
../../.venv/Scripts/python -W ignore auditor/tools/build_outputs.py --block end     # coordinator runs this once if several agents work in parallel
node tools/validate.cjs > auditor/raw/_v<c>mcq.txt; echo $?      # must be 0
node _test/quizcore.test.cjs
```
Confirm with a node snippet that every non-skipped question in `data/blocks/END/exams/<c>_MCQ.json` has a one-line explanation, option_why for all options, key_concept; count mechanisms. Helper scripts only under `auditor/raw/`.

## Report
Questions rewritten, how many with mechanism, suspected wrong keys (id + one line), validate exit code, 2 full built examples (one physiology with mechanism, one recall).
