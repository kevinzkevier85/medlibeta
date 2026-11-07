/*
 * MedLib data rules — the ONE validator for every way data gets in.
 * Used by: the web form (browser), tools/validate.cjs (Node), import tools and the MCP server (Node, next version).
 * Change the format here only; never write a second copy of these rules.
 * Format documentation: docs/FORMAT.md
 */
(function (root) {
  "use strict";
  const SCHEMA_VERSION = 2;
  const STATUSES = ["verified", "corrected", "draft", "disputed"];
  const SOURCES = ["manual", "claude-mcp", "import"];
  const OPTION_KEYS = ["A", "B", "C", "D", "E"];
  const TYPES = ["MCQ", "KF", "OSPE"];
  const PAPER_TYPES = TYPES;
  const PAPER_ROLES = ["exam", "key"];
  const ITEM_FORMATS = ["short", "select"];

  const isStr = (v) => typeof v === "string" && v.trim().length > 0;
  const isPosInt = (v) => Number.isInteger(v) && v > 0;
  const isStrList = (v) => Array.isArray(v) && v.every((x) => typeof x === "string");

  function questionId(block, cohort, n, type) {
    return `${block}-${cohort}-${type || "MCQ"}-${String(n).padStart(3, "0")}`;
  }

  function checkMechanism(m, where, e) {
    if (m === undefined) return;
    if (!Array.isArray(m) || !m.every((x) => isStr(x) || (x && typeof x === "object" && isStr(x.s))))
      e.push(`${where}mechanism ต้องเป็นรายการขั้นตอน (ข้อความ หรือ {s, answer?, note?})`);
  }

  function checkItem(it, i, e) {
    const w = `items[${i}]`;
    if (!it || typeof it !== "object") { e.push(`${w} ต้องเป็น object`); return; }
    if (!isStr(it.id)) e.push(`${w} ต้องมี id`);
    if (!isStr(it.prompt)) e.push(`${w} ต้องมี prompt (คำถามย่อย)`);
    if (!ITEM_FORMATS.includes(it.format)) e.push(`${w}.format ต้องเป็น ${ITEM_FORMATS.join(" / ")}`);
    if (it.format === "select") {
      if (!Array.isArray(it.options) || it.options.length < 2 || !it.options.every((o) => o && isStr(o.key) && isStr(o.text)))
        e.push(`${w}: แบบ select ต้องมี options [{key, text}] อย่างน้อย 2 ตัว`);
      else if (!Array.isArray(it.answer) || !it.answer.length || !it.answer.every((k) => it.options.some((o) => o.key === k)))
        e.push(`${w}: answer ต้องเป็นรายการ key ที่มีอยู่ใน options`);
      if (it.max_answers !== undefined && !isPosInt(it.max_answers)) e.push(`${w}.max_answers ต้องเป็นตัวเลข`);
    }
    if (it.format === "short") {
      if (it.accepted !== undefined && !isStrList(it.accepted)) e.push(`${w}.accepted ต้องเป็นรายการคำตอบที่ยอมรับ`);
      if (it.keywords_all !== undefined && !isStrList(it.keywords_all)) e.push(`${w}.keywords_all ต้องเป็นรายการคำ`);
    }
    if (it.explanation !== undefined && typeof it.explanation !== "string") e.push(`${w}.explanation ต้องเป็นข้อความ`);
    checkMechanism(it.mechanism, `${w}.`, e);
  }

  // ctx: { block } — the block object the question belongs to (optional but recommended)
  function validateQuestion(q, ctx) {
    const e = [];
    if (!q || typeof q !== "object") return ["ข้อมูลข้อสอบต้องเป็น object"];
    if (!/^[A-Z0-9]{2,8}$/.test(q.block || "")) e.push("block ต้องเป็นรหัสบล็อกตัวพิมพ์ใหญ่ 2–8 ตัว เช่น END");
    if (!isPosInt(q.cohort)) e.push("cohort (รุ่น) ต้องเป็นตัวเลขมากกว่า 0");
    if (!isPosInt(q.n)) e.push("n (เลขข้อ) ต้องเป็นตัวเลขมากกว่า 0");
    if (!TYPES.includes(q.type)) e.push(`type ต้องเป็น ${TYPES.join(" / ")}`);
    if (isPosInt(q.cohort) && isPosInt(q.n) && q.block && TYPES.includes(q.type) && q.id !== questionId(q.block, q.cohort, q.n, q.type))
      e.push(`id ต้องเป็น ${questionId(q.block, q.cohort, q.n, q.type)}`);

    if (q.type === "MCQ") {
      if (!isStr(q.stem) || q.stem.trim().length < 10) e.push("โจทย์ (stem) ต้องยาวอย่างน้อย 10 ตัวอักษร");
      const opts = q.options && typeof q.options === "object" && !Array.isArray(q.options) ? q.options : null;
      if (!opts) e.push("ต้องมี options เป็น {A: ..., B: ...}");
      else {
        const keys = Object.keys(opts);
        if (keys.length < 2) e.push("ต้องมีตัวเลือกอย่างน้อย 2 ข้อ");
        keys.forEach((k) => {
          if (!OPTION_KEYS.includes(k)) e.push(`ตัวเลือก "${k}" ใช้ไม่ได้ ใช้ได้แค่ A–E`);
          else if (!isStr(opts[k])) e.push(`ตัวเลือก ${k} ว่างอยู่`);
        });
        if (!isStr(q.answer)) e.push("ยังไม่ได้ใส่เฉลย (answer)");
        else if (!(q.answer in opts)) e.push(`เฉลย ${q.answer} ไม่มีอยู่ในตัวเลือก`);
        if (q.option_why !== undefined) {
          if (!q.option_why || typeof q.option_why !== "object") e.push("option_why ต้องเป็น {A: เหตุผล, ...}");
          else Object.keys(q.option_why).forEach((k) => { if (!(k in opts)) e.push(`option_why มี ${k} ที่ไม่มีในตัวเลือก`); });
        }
      }
      if (q.source_answer !== undefined && !(q.options && q.source_answer in q.options)) e.push("source_answer ต้องเป็นตัวเลือกที่มีอยู่");
    } else if (TYPES.includes(q.type)) {
      const lead = q.type === "KF" ? q.case || q.stem : q.stem;
      if (!isStr(lead)) e.push(q.type === "KF" ? "KF ต้องมี case (สถานการณ์)" : "OSPE ต้องมี stem (คำอธิบายสถานี)");
      if (!Array.isArray(q.items) || !q.items.length) e.push("ต้องมี items (คำถามย่อย) อย่างน้อย 1 ข้อ");
      else {
        const seen = new Set();
        q.items.forEach((it, i) => { checkItem(it, i, e); if (it && seen.has(it.id)) e.push(`items id ${it.id} ซ้ำ`); if (it) seen.add(it.id); });
      }
    }

    if (!STATUSES.includes(q.answer_status)) e.push(`answer_status ต้องเป็น ${STATUSES.join(" / ")}`);
    ["explanation", "key_concept", "audit_note", "source_answer_note", "image", "image_caption"].forEach((k) => {
      if (q[k] !== undefined && q[k] !== null && typeof q[k] !== "string") e.push(`${k} ต้องเป็นข้อความ`);
    });
    if (typeof q.image === "string" && /^data:/i.test(q.image)) e.push("image ต้องเป็นชื่อไฟล์รูปในโฟลเดอร์บล็อก ไม่ใช่ data URL");
    checkMechanism(q.mechanism, "", e);

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
        if (r.hotspot !== undefined && !(r.hotspot && [1, 2, 3].includes(r.hotspot.tier) && Array.isArray(r.hotspot.years)))
          e.push(`refs[${i}].hotspot ต้องเป็น {tier: 1–3, years: [...]}`);
      });
    }
    if (!isStrList(q.tags) || !q.tags.every(isStr)) e.push("tags ต้องเป็นรายการคำ");
    if (!SOURCES.includes(q.source)) e.push(`source ต้องเป็น ${SOURCES.join(" / ")}`);
    return e;
  }

  function checkDocFile(d, w, e) {
    if (d.drive_file_id !== undefined && typeof d.drive_file_id !== "string") e.push(`${w}: drive_file_id ต้องเป็นข้อความ`);
    if (d.file !== undefined && typeof d.file !== "string") e.push(`${w}: file ต้องเป็นข้อความ`);
    if (d.url !== undefined && !/^https:\/\//.test(d.url || "")) e.push(`${w}: url ต้องขึ้นต้นด้วย https://`);
  }

  function validateBlock(b) {
    const e = [];
    if (!b || typeof b !== "object") return ["block.json ต้องเป็น object"];
    if (!/^[A-Z0-9]{2,8}$/.test(b.id || "")) e.push("id ต้องเป็นตัวพิมพ์ใหญ่ 2–8 ตัว");
    if (!isStr(b.name)) e.push("ต้องมี name");
    if (b.color !== undefined && !/^#[0-9a-fA-F]{6}$/.test(b.color || "")) e.push("color ต้องเป็นรหัสสี #RRGGBB");
    if (!Array.isArray(b.lectures)) e.push("lectures ต้องเป็นรายการ");
    else {
      const seen = new Set();
      b.lectures.forEach((l, i) => {
        if (!l || !isStr(l.id)) { e.push(`lectures[${i}] ต้องมี id`); return; }
        if (seen.has(l.id)) e.push(`lecture id ${l.id} ซ้ำ`);
        seen.add(l.id);
        if (!isStr(l.title)) e.push(`${l.id}: ต้องมี title`);
        if (!isPosInt(l.pages)) e.push(`${l.id}: pages ต้องเป็นจำนวนหน้า`);
        checkDocFile(l, l.id, e);
        if (l.page_index !== undefined && !(Array.isArray(l.page_index) && l.page_index.every((p) => p && isPosInt(p.page) && p.page <= l.pages)))
          e.push(`${l.id}: page_index ต้องเป็นรายการ {page, heading, summary, keywords} ที่เลขหน้าไม่เกินจำนวนหน้า`);
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
          checkDocFile(p, p.id, e);
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
    if (set.meta.type !== undefined && !TYPES.includes(set.meta.type)) e.push(`meta.type ต้องเป็น ${TYPES.join(" / ")}`);
    if (set.meta.time_limit_min !== undefined && !(Number(set.meta.time_limit_min) > 0)) e.push("meta.time_limit_min ต้องเป็นจำนวนนาที");
    if (set.guide !== undefined && !(set.guide && Array.isArray(set.guide.lectures))) e.push("guide ต้องมี lectures[]");
    const seen = new Set();
    set.questions.forEach((q) => {
      const id = (q && q.id) || "?";
      if (seen.has(id)) e.push(`${id}: id ซ้ำ`);
      seen.add(id);
      validateQuestion(q, { block }).forEach((m) => e.push(`${id}: ${m}`));
    });
    return e;
  }

  const api = { SCHEMA_VERSION, STATUSES, SOURCES, OPTION_KEYS, TYPES, PAPER_TYPES, PAPER_ROLES, ITEM_FORMATS, questionId, validateQuestion, validateBlock, validateExamSet };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MedLibValidate = api;
})(typeof self !== "undefined" ? self : this);
