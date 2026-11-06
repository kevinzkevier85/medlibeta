/*
 * MedLib data rules — the ONE validator for every way data gets in.
 * Used by: the web form (browser), tools/validate.cjs (Node), and the MCP server (Node, next version).
 * Change the format here only; never write a second copy of these rules.
 * Format documentation: docs/FORMAT.md
 */
(function (root) {
  "use strict";
  const SCHEMA_VERSION = 1;
  const STATUSES = ["verified", "draft", "disputed"];
  const SOURCES = ["manual", "claude-mcp", "import"];
  const OPTION_KEYS = ["A", "B", "C", "D", "E"];
  const PAPER_TYPES = ["MCQ", "KF", "OSPE"];
  const PAPER_ROLES = ["exam", "key"];

  const isStr = (v) => typeof v === "string" && v.trim().length > 0;
  const isPosInt = (v) => Number.isInteger(v) && v > 0;

  function questionId(block, cohort, n) {
    return `${block}-${cohort}-MCQ-${String(n).padStart(3, "0")}`;
  }

  // ctx: { block } — the block object the question belongs to (optional but recommended)
  function validateQuestion(q, ctx) {
    const e = [];
    if (!q || typeof q !== "object") return ["ข้อมูลข้อสอบต้องเป็น object"];
    if (!/^[A-Z0-9]{2,8}$/.test(q.block || "")) e.push("block ต้องเป็นรหัสบล็อกตัวพิมพ์ใหญ่ 2–8 ตัว เช่น END");
    if (!isPosInt(q.cohort)) e.push("cohort (รุ่น) ต้องเป็นตัวเลขมากกว่า 0");
    if (!isPosInt(q.n)) e.push("n (เลขข้อ) ต้องเป็นตัวเลขมากกว่า 0");
    if (q.type !== "MCQ") e.push('type ตอนนี้รองรับเฉพาะ "MCQ"');
    if (isPosInt(q.cohort) && isPosInt(q.n) && q.block && q.id !== questionId(q.block, q.cohort, q.n))
      e.push(`id ต้องเป็น ${questionId(q.block, q.cohort, q.n)}`);
    if (!isStr(q.stem) || q.stem.trim().length < 10) e.push("โจทย์ (stem) ต้องยาวอย่างน้อย 10 ตัวอักษร");
    const opts = q.options && typeof q.options === "object" ? q.options : null;
    if (!opts) e.push("ต้องมี options");
    else {
      const keys = Object.keys(opts);
      if (keys.length < 2) e.push("ต้องมีตัวเลือกอย่างน้อย 2 ข้อ");
      keys.forEach((k) => {
        if (!OPTION_KEYS.includes(k)) e.push(`ตัวเลือก "${k}" ใช้ไม่ได้ ใช้ได้แค่ A–E`);
        else if (!isStr(opts[k])) e.push(`ตัวเลือก ${k} ว่างอยู่`);
      });
      if (!isStr(q.answer)) e.push("ยังไม่ได้ใส่เฉลย (answer)");
      else if (!(q.answer in opts)) e.push(`เฉลย ${q.answer} ไม่มีอยู่ในตัวเลือก`);
    }
    if (!STATUSES.includes(q.answer_status)) e.push(`answer_status ต้องเป็น ${STATUSES.join(" / ")}`);
    if (q.explanation !== undefined && typeof q.explanation !== "string") e.push("explanation ต้องเป็นข้อความ");
    // refs point at a lecture page ({lecture, pages}) or a page of the original exam/key PDF ({paper, pages})
    if (!Array.isArray(q.refs) || q.refs.length === 0) e.push("ต้องระบุหน้าอ้างอิงอย่างน้อย 1 รายการ (refs: lecture หรือ paper)");
    else {
      const blk = ctx && ctx.block;
      const lecs = blk ? new Map(blk.lectures.map((l) => [l.id, l])) : null;
      const paps = blk ? new Map((blk.papers || []).map((p) => [p.id, p])) : null;
      q.refs.forEach((r, i) => {
        const kind = r && isStr(r.lecture) ? "lecture" : r && isStr(r.paper) ? "paper" : null;
        if (!kind) { e.push(`refs[${i}] ต้องมี lecture หรือ paper`); return; }
        const id = r[kind];
        const map = kind === "lecture" ? lecs : paps;
        const doc = map ? map.get(id) : null;
        if (map && !doc) e.push(`refs[${i}]: ไม่มี ${kind} ${id} ในบล็อกนี้`);
        if (!Array.isArray(r.pages) || !r.pages.length || !r.pages.every(isPosInt))
          e.push(`refs[${i}]: pages ต้องเป็นรายการเลขหน้า เช่น [14, 15]`);
        else if (doc && r.pages.some((p) => p > doc.pages)) e.push(`refs[${i}]: ${id} มีแค่ ${doc.pages} หน้า`);
      });
    }
    if (!Array.isArray(q.tags) || !q.tags.every(isStr)) e.push("tags ต้องเป็นรายการคำ");
    if (!SOURCES.includes(q.source)) e.push(`source ต้องเป็น ${SOURCES.join(" / ")}`);
    return e;
  }

  function validateBlock(b) {
    const e = [];
    if (!b || typeof b !== "object") return ["block.json ต้องเป็น object"];
    if (!/^[A-Z0-9]{2,8}$/.test(b.id || "")) e.push("id ต้องเป็นตัวพิมพ์ใหญ่ 2–8 ตัว");
    if (!isStr(b.name)) e.push("ต้องมี name");
    if (!Array.isArray(b.lectures)) e.push("lectures ต้องเป็นรายการ");
    else {
      const seen = new Set();
      b.lectures.forEach((l, i) => {
        if (!l || !isStr(l.id)) { e.push(`lectures[${i}] ต้องมี id`); return; }
        if (seen.has(l.id)) e.push(`lecture id ${l.id} ซ้ำ`);
        seen.add(l.id);
        if (!isStr(l.title)) e.push(`${l.id}: ต้องมี title`);
        if (!isPosInt(l.pages)) e.push(`${l.id}: pages ต้องเป็นจำนวนหน้า`);
        if (l.drive_file_id !== undefined && typeof l.drive_file_id !== "string") e.push(`${l.id}: drive_file_id ต้องเป็นข้อความ`);
        if (l.file !== undefined && typeof l.file !== "string") e.push(`${l.id}: file ต้องเป็นข้อความ`);
      });
    }
    // papers = original exam / answer-key PDFs (not lectures). Optional.
    if (b.papers !== undefined) {
      if (!Array.isArray(b.papers)) e.push("papers ต้องเป็นรายการ");
      else {
        const used = new Set((Array.isArray(b.lectures) ? b.lectures : []).map((l) => l && l.id));
        b.papers.forEach((p, i) => {
          if (!p || !isStr(p.id)) { e.push(`papers[${i}] ต้องมี id`); return; }
          if (used.has(p.id)) e.push(`id ${p.id} ซ้ำ (ใช้ซ้ำกับ lecture หรือ paper อื่น)`);
          used.add(p.id);
          if (!isStr(p.title)) e.push(`${p.id}: ต้องมี title`);
          if (!isPosInt(p.pages)) e.push(`${p.id}: pages ต้องเป็นจำนวนหน้า`);
          if (!isPosInt(p.cohort)) e.push(`${p.id}: cohort ต้องเป็นเลขรุ่น`);
          if (!PAPER_TYPES.includes(p.type)) e.push(`${p.id}: type ต้องเป็น ${PAPER_TYPES.join(" / ")}`);
          if (!PAPER_ROLES.includes(p.role)) e.push(`${p.id}: role ต้องเป็น ${PAPER_ROLES.join(" / ")}`);
          if (p.drive_file_id !== undefined && typeof p.drive_file_id !== "string") e.push(`${p.id}: drive_file_id ต้องเป็นข้อความ`);
          if (p.file !== undefined && typeof p.file !== "string") e.push(`${p.id}: file ต้องเป็นข้อความ`);
        });
      }
    }
    if (!Array.isArray(b.exam_sets) || !b.exam_sets.every(isStr)) e.push("exam_sets ต้องเป็นรายการชื่อชุดข้อสอบ");
    return e;
  }

  function validateExamSet(set, block) {
    const e = [];
    if (!set || !set.meta || !Array.isArray(set.questions)) return ["ไฟล์ข้อสอบต้องมี meta และ questions"];
    if (!isStr(set.meta.set_id)) e.push("meta.set_id ว่าง");
    if (block && set.meta.block !== block.id) e.push(`meta.block ต้องเป็น ${block.id}`);
    const seen = new Set();
    set.questions.forEach((q) => {
      const id = (q && q.id) || "?";
      if (seen.has(id)) e.push(`${id}: id ซ้ำ`);
      seen.add(id);
      validateQuestion(q, { block }).forEach((m) => e.push(`${id}: ${m}`));
    });
    return e;
  }

  const api = { SCHEMA_VERSION, STATUSES, SOURCES, OPTION_KEYS, PAPER_TYPES, PAPER_ROLES, questionId, validateQuestion, validateBlock, validateExamSet };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MedLibValidate = api;
})(typeof self !== "undefined" ? self : this);
