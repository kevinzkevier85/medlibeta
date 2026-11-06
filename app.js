/* MedLib web app. Data: data/blocks (real) + samples/blocks (DEMO). Rules: lib/validate.js. */
(() => {
  "use strict";
  const V = window.MedLibValidate;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const enc = encodeURIComponent;
  const main = $("#main");

  /* ---------- personal data (browser storage) ---------- */
  const LSKEY = "medlib.user.v1";
  function loadUser() {
    try {
      const u = JSON.parse(localStorage.getItem(LSKEY) || "null");
      if (u && typeof u === "object") return { settings: u.settings || {}, questions: Array.isArray(u.questions) ? u.questions : [] };
    } catch (e) { /* storage blocked or corrupt */ }
    return { settings: {}, questions: [] };
  }
  let USER = loadUser();
  function saveUser() {
    try { localStorage.setItem(LSKEY, JSON.stringify(USER)); return true; } catch (e) { return false; }
  }

  /* ---------- app data ---------- */
  const APP = { version: { version: "?", date: "", history: [] }, defaults: { settings: {} }, config: {}, blocks: [], problems: [] };
  const S = () => Object.assign({}, APP.defaults.settings, USER.settings);
  const enabledBlocks = () => APP.blocks.filter((b) => S().showSample || !b._sample);
  const visibleBlocks = () => enabledBlocks().filter((b) => !S().hiddenBlocks.includes(b.id));
  const findBlock = (id) => APP.blocks.find((b) => b.id === id);
  // a PDF in a block: a lecture or an original exam/key paper
  const docOf = (b, id) => b.lectures.find((x) => x.id === id) || b.papers.find((x) => x.id === id) || null;
  const refDoc = (r) => r.lecture || r.paper;
  const findSet = (b, sid) => b && b.sets.find((s) => s.id === sid);
  const TYPE_TH = { MCQ: "Multiple Choice Question — ปรนัยเลือกตอบ", KF: "Key Feature — สถานการณ์ จุดตัดสินใจ", OSPE: "Objective Structured Practical Exam — สถานี/รูป" };

  /* ---------- quiz progress per set (browser storage) ---------- */
  const QKEY = "medlib.quiz.v1";
  let QUIZ = (() => { try { const q = JSON.parse(localStorage.getItem(QKEY) || "null"); return q && typeof q === "object" ? q : {}; } catch (e) { return {}; } })();
  const saveQuiz = () => { try { localStorage.setItem(QKEY, JSON.stringify(QUIZ)); } catch (e) { /* storage blocked */ } };
  const freshQuiz = () => ({ mode: "practice", ans: {}, chk: {}, flag: {}, submitted: false, elapsed: 0, filter: "all", rounds: 0 });
  function quizOf(b, s) {
    const k = `${b.id}/${s.id}`;
    if (!QUIZ[k] || typeof QUIZ[k] !== "object") QUIZ[k] = freshQuiz();
    return Object.assign(QUIZ[k], Object.assign(freshQuiz(), QUIZ[k]));
  }
  const isRight = (st, q) => st.chk[q.id] && st.ans[q.id] === q.answer;
  const isWrong = (st, q) => st.chk[q.id] && st.ans[q.id] !== q.answer;
  function quizStats(b, s) {
    const st = quizOf(b, s); const qs = s.questions;
    const checked = qs.filter((q) => st.chk[q.id]).length, right = qs.filter((q) => isRight(st, q)).length;
    const answered = qs.filter((q) => st.ans[q.id]).length;
    return { st, total: qs.length, checked, right, wrong: checked - right, answered, flagged: qs.filter((q) => st.flag[q.id]).length };
  }
  const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
  const allExams = (b) => b.exams.concat(USER.questions.filter((q) => q.block === b.id).map((q) => Object.assign({}, q, { _personal: true })));
  const examsOf = (b) => (S().showDrafts ? allExams(b) : allExams(b).filter((q) => q.answer_status === "verified"));
  function findQuestion(id) {
    for (const b of APP.blocks) { const q = allExams(b).find((x) => x.id === id); if (q) return { b, q }; }
    return null;
  }
  const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    return isNaN(d) ? iso : d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
  };
  const pagesText = (p) => (p.length > 1 && p[p.length - 1] - p[0] === p.length - 1 ? `${p[0]}–${p[p.length - 1]}` : p.join(", "));

  async function getJSON(u) {
    const r = await fetch(u, { cache: "no-cache" });
    if (!r.ok) throw new Error(`อ่าน ${u} ไม่ได้ (HTTP ${r.status})`);
    return r.json();
  }
  async function loadBlocks(base, sample) {
    let idx;
    try { idx = await getJSON(`${base}/index.json`); } catch (e) { APP.problems.push(e.message); return; }
    for (const id of idx.blocks || []) {
      try {
        const b = await getJSON(`${base}/${id}/block.json`);
        const be = V.validateBlock(b);
        if (be.length) { APP.problems.push(`บล็อก ${id}: ${be.slice(0, 3).join(" · ")}`); continue; }
        if (findBlock(b.id)) { APP.problems.push(`รหัสบล็อก ${b.id} ซ้ำ`); continue; }
        Object.assign(b, { _base: `${base}/${id}`, _sample: !!sample, exams: [], sets: [], papers: b.papers || [] });
        for (const sid of b.exam_sets) {
          try {
            const set = await getJSON(`${b._base}/exams/${sid}.json`);
            const se = V.validateExamSet(set, b);
            if (se.length) { APP.problems.push(`${id}/${sid}: ${se.slice(0, 3).join(" · ")}`); continue; }
            const qs = set.questions.slice().sort((x, y) => x.n - y.n);
            qs.forEach((q) => { q._set = sid; });
            const m = set.meta || {};
            b.sets.push({ id: sid, meta: m, cohort: m.cohort || (qs[0] && qs[0].cohort) || 0, type: m.type || "MCQ", title: m.title || sid, questions: qs });
            b.exams.push(...qs);
          } catch (e) { APP.problems.push(e.message); }
        }
        APP.blocks.push(b);
      } catch (e) { APP.problems.push(e.message); }
    }
  }

  /* ---------- menu ---------- */
  function side(view, args) {
    const cur = ["b", "l", "q", "pdf", "set"].includes(view) ? (view === "q" ? (findQuestion(args[0]) || {}).b?.id : args[0]) : null;
    const v = APP.version;
    $("#side").innerHTML = [
      `<span class="lbl">บล็อก</span>`,
      `<a class="nav ${!view ? "on" : ""}" href="#/">ทั้งหมด</a>`,
      ...visibleBlocks().map((b) => `<a class="nav ${cur === b.id ? "on" : ""}" href="#/b/${enc(b.id)}">${esc(b.name)}<small>${esc(b.id)}</small></a>`),
      `<span class="lbl">เครื่องมือ</span>`,
      `<a class="nav ${view === "add" ? "on" : ""}" href="#/add">เพิ่มข้อสอบ</a>`,
      `<a class="nav ${view === "settings" ? "on" : ""}" href="#/settings">ตั้งค่า</a>`,
      `<a class="ver" href="#/settings/about" title="ดูว่าเวอร์ชันนี้มีอะไรใหม่"><b>v${esc(v.version)}</b> · ${esc(fmtDate(v.date))}</a>`,
    ].join("");
  }

  /* ---------- views ---------- */
  const problemsBanner = () => APP.problems.length
    ? `<div class="banner"><strong>ข้อมูลบางส่วนโหลดไม่ได้</strong> เว็บข้ามส่วนนั้นไปก่อน ตรวจละเอียดด้วยคำสั่ง <code>node tools/validate.cjs</code><ul>${APP.problems.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div>` : "";

  function viewHome() {
    const blocks = visibleBlocks();
    const cards = blocks.map((b) => {
      const ex = allExams(b);
      const done = ex.length ? Math.round((ex.filter((e) => e.answer_status === "verified").length / ex.length) * 100) : 0;
      return `<a class="card" href="#/b/${enc(b.id)}">
        <span class="code">${esc(b.id)}${b._sample ? `<span class="pill exam">ตัวอย่าง</span>` : ""}</span>
        <span style="font-weight:600">${esc(b.name)}${b.year ? ` <span class="hint">· ${esc(b.year)}</span>` : ""}</span>
        <span class="stats"><span>${b.lectures.length} บท</span><span>${b.sets.length} ชุดข้อสอบ</span><span>${ex.length} ข้อ</span></span>
        <span class="meter"><span style="width:${done}%"></span></span>
        <span class="hint">เฉลยยืนยันแล้ว ${done}%</span></a>`;
    }).join("");
    const realCount = APP.blocks.filter((b) => !b._sample).length;
    const empty = !realCount
      ? `<div class="note"><h3>ยังไม่มีบล็อกจริงในคลัง</h3><p class="hint">คลังข้อมูลเริ่มต้นว่าง วิธีเพิ่มบล็อกแรก: บอก Claude ว่า "เพิ่มบล็อก END จากโฟลเดอร์ใน Google Drive" หรือดูรูปแบบไฟล์ใน <code>docs/FORMAT.md</code>${S().showSample ? " ระหว่างนี้ลองใช้บล็อกตัวอย่างด้านล่างได้" : ""}</p></div>` : "";
    main.innerHTML = `${problemsBanner()}
      <div class="head"><h2>บล็อกการเรียน</h2><p class="hint">เลือกบล็อกเพื่อดู lecture และข้อสอบ หรือค้นข้ามทุกบล็อกจากช่องด้านบน</p></div>
      ${empty}
      <div class="grid">${cards}${blocks.length ? "" : `<div class="card empty"><span>ไม่มีบล็อกที่แสดงอยู่</span><a href="#/settings">เปิดการแสดงบล็อกในหน้าตั้งค่า</a></div>`}</div>`;
  }

  function notFound(msg) { main.innerHTML = `<div class="note"><h3>${esc(msg)}</h3><a href="#/">กลับหน้าแรก</a></div>`; }

  function viewBlock(id, tab) {
    const b = findBlock(id);
    if (!b) return notFound(`ไม่พบบล็อก ${id}`);
    tab = tab === "exam" || tab === "lec" ? tab : !b.lectures.length ? "exam" : S().defaultTab;
    const ex = examsOf(b);
    const lec = b.lectures.map((l) => {
      const n = ex.filter((e) => e.refs.some((r) => r.lecture === l.id)).length;
      return `<a class="row" href="#/l/${enc(b.id)}/${enc(l.id)}"><span class="id">${esc(l.id)}</span>
        <span class="t">${esc(l.title)}<span class="sub">${l.lecturer ? esc(l.lecturer) + " · " : ""}${l.pages} หน้า${l.drive_file_id || l.file ? "" : " · ยังไม่มีไฟล์ PDF"}</span></span>
        <span class="meta">${n ? `<span class="pill exam">ออกสอบ ${n} ข้อ</span>` : ""}</span></a>`;
    }).join("");
    const nSetQ = b.sets.reduce((a, s) => a + s.questions.length, 0);
    const mine = USER.questions.filter((q) => q.block === b.id);
    const body = tab === "lec"
      ? `<div class="rows">${lec || `<p class="hint">ยังไม่มี lecture ในบล็อกนี้${b.papers.length || b.sets.length ? " · ข้อสอบเก่าและไฟล์เฉลยอยู่ในแท็บ <a href=\"#/b/" + enc(b.id) + "/exam\">ข้อสอบ</a>" : ""}</p>`}</div>`
      : examSetsHtml(b) + (mine.length ? `<h3>ข้อที่ฉันเพิ่มเอง (${mine.length})</h3><div class="rows">${mine.map((e) => `<a class="row" href="#/q/${enc(e.id)}"><span class="id">${e.cohort} · ข้อ ${e.n}</span><span class="t">${esc(e.stem.slice(0, 80))}${e.stem.length > 80 ? "…" : ""}</span><span class="meta"><span class="pill">ของฉัน</span></span></a>`).join("")}</div>` : "");
    main.innerHTML = `<div class="crumbs"><a href="#/">ทั้งหมด</a><span>/</span><span>${esc(b.name)}</span></div>
      <div class="head"><h2>${esc(b.name)} <span class="mono hint">${esc(b.id)}</span></h2>${b._sample ? `<p class="hint">บล็อกนี้เป็นข้อมูลตัวอย่าง ไฟล์ PDF ไม่ใช่ lecture จริง</p>` : ""}</div>
      <div class="tabs"><a class="tab ${tab === "lec" ? "on" : ""}" href="#/b/${enc(b.id)}/lec">Lecture (${b.lectures.length})</a><a class="tab ${tab === "exam" ? "on" : ""}" href="#/b/${enc(b.id)}/exam">ข้อสอบ (${b.sets.length} ชุด · ${nSetQ} ข้อ)</a></div>
      ${body}`;
  }

  // Exam tab: one card per cohort (newest first); inside, one tile per exam type set + the original PDFs.
  function examSetsHtml(b) {
    const cohorts = [...new Set([...b.sets.map((s) => s.cohort), ...b.papers.map((p) => p.cohort)])].sort((x, y) => y - x);
    if (!cohorts.length) return `<p class="hint" style="padding:12px 0">ยังไม่มีข้อสอบในบล็อกนี้</p>`;
    const cards = cohorts.map((c) => {
      const sets = b.sets.filter((s) => s.cohort === c);
      const types = [...new Set([...sets.map((s) => s.type), ...b.papers.filter((p) => p.cohort === c).map((p) => p.type)])];
      const total = sets.reduce((a, s) => a + s.questions.length, 0);
      const tiles = types.map((t) => {
        const s = sets.find((x) => x.type === t);
        const pdfs = b.papers.filter((p) => p.cohort === c && p.type === t)
          .map((p) => `<a class="pdflink" href="#/pdf/${enc(b.id)}/${enc(p.id)}/1">${p.role === "key" ? "PDF เฉลย" : "PDF ข้อสอบ"}</a>`).join("");
        if (!s) return `<div class="settile off"><span class="settype">${esc(t)}</span><span class="hint">ยังไม่ได้ทำเป็นข้อสอบออนไลน์</span><span class="pdfs">${pdfs}</span></div>`;
        const k = quizStats(b, s);
        const prog = k.checked ? `ทำแล้ว ${k.checked}/${k.total} · ถูก ${k.right}` : k.answered ? `ตอบแล้ว ${k.answered}/${k.total}` : "ยังไม่ได้ทำ";
        const pct = k.total ? Math.round((k.checked / k.total) * 100) : 0;
        return `<div class="settile"><a class="setmain" href="#/set/${enc(b.id)}/${enc(s.id)}">
            <span class="settype">${esc(t)}<span class="setn">${s.questions.length} ข้อ</span></span>
            <span class="hint">${esc(TYPE_TH[t] || "")}</span>
            <span class="meter"><span style="width:${pct}%"></span></span><span class="hint">${prog}</span></a>
          ${pdfs ? `<span class="pdfs">${pdfs}</span>` : ""}</div>`;
      }).join("");
      return `<section class="cohort"><h3>รุ่น ${c} <span class="hint">${total} ข้อ</span></h3><div class="settiles">${tiles}</div></section>`;
    }).join("");
    return `<p class="hint">เลือกรุ่นและประเภทข้อสอบ · ความคืบหน้าเก็บไว้ในเบราว์เซอร์นี้</p>${cards}`;
  }

  function viewLecture(bid, lid) {
    const b = findBlock(bid); const l = b && b.lectures.find((x) => x.id === lid);
    if (!l) return notFound("ไม่พบ lecture นี้");
    const qs = examsOf(b).filter((e) => e.refs.some((r) => r.lecture === l.id));
    const rows = qs.map((e) => {
      const r = e.refs.find((x) => x.lecture === l.id);
      return `<a class="row" href="#/q/${enc(e.id)}"><span class="id">หน้า ${pagesText(r.pages)}</span><span class="t">${esc(e.stem.slice(0, 80))}…<span class="sub">รุ่น ${e.cohort} · ${esc(e.tags.join(" · "))}</span></span><span class="meta"><span class="pill exam">ข้อสอบ</span></span></a>`;
    }).join("");
    const hasFile = l.drive_file_id || l.file;
    main.innerHTML = `<div class="crumbs"><a href="#/">ทั้งหมด</a><span>/</span><a href="#/b/${enc(b.id)}">${esc(b.name)}</a><span>/</span><span>${esc(l.id)}</span></div>
      <div class="head"><h2>${esc(l.title)}</h2><p class="hint">${l.lecturer ? esc(l.lecturer) + " · " : ""}${l.pages} หน้า</p></div>
      ${hasFile ? `<a class="btn pri" style="width:fit-content" href="#/pdf/${enc(b.id)}/${enc(l.id)}/1">เปิด PDF ตัวเต็ม</a>` : `<p class="hint">บทนี้ยังไม่มีไฟล์ PDF ใส่ <code>drive_file_id</code> ของบทนี้ใน block.json แล้วจะเปิดได้</p>`}
      <h3>ข้อสอบที่อ้างถึงบทนี้</h3>
      <div class="rows">${rows || `<p class="hint" style="padding:12px 0">ยังไม่มีข้อสอบที่อ้างถึงบทนี้</p>`}</div>`;
  }

  const picked = {};
  function viewQuestion(id) {
    const f = findQuestion(id);
    if (!f) return notFound("ไม่พบข้อสอบนี้");
    const { b, q } = f;
    const p = picked[id];
    const opts = Object.entries(q.options).map(([k, v]) => {
      const cls = p ? (k === q.answer ? "right" : k === p ? "wrong" : "") : "";
      return `<button class="opt ${cls}" data-pick="${esc(k)}"><b>${esc(k)}</b><span>${esc(v)}</span></button>`;
    }).join("");
    const refs = refsHtml(b, q);
    const status = statusPill(q);
    const s = findSet(b, q._set);
    const setLink = s ? `<a href="#/set/${enc(b.id)}/${enc(s.id)}/${s.questions.indexOf(q) + 1}">รุ่น ${q.cohort} · ${esc(s.type)}</a><span>/</span>` : "";
    main.innerHTML = `<div class="crumbs"><a href="#/">ทั้งหมด</a><span>/</span><a href="#/b/${enc(b.id)}/exam">${esc(b.name)}</a><span>/</span>${setLink}<span>ข้อ ${q.n}</span></div>
      <div class="chips"><span class="pill">รุ่น ${q.cohort}</span><span class="pill">MCQ</span>${status}${q._personal ? `<span class="pill">ของฉัน</span>` : ""}${s ? `<a class="pill" href="#/set/${enc(b.id)}/${enc(s.id)}/${s.questions.indexOf(q) + 1}">ทำทั้งชุด</a>` : ""}</div>
      <p class="stem ${S().fontSize === "large" ? "large" : ""}">${esc(q.stem)}</p>
      <div class="opts">${opts}</div>
      ${p ? `<div class="explain"><h3>${p === q.answer ? "ถูกต้อง" : `ยังไม่ใช่ คำตอบคือ ${esc(q.answer)}`}</h3>${q.explanation ? `<p>${esc(q.explanation)}</p>` : ""}
        <div class="section" style="padding:0;gap:8px"><span class="hint">ดูต้นฉบับ / อ่านเพิ่ม</span>${refs}</div>
        <div class="btns"><button class="btn" data-act="retry">ลองใหม่</button></div></div>`
      : `<p class="hint">เลือกคำตอบเพื่อดูเฉลยและหน้าต้นฉบับที่เกี่ยวข้อง</p>`}`;
  }

  const statusPill = (q) => q.answer_status === "verified" ? `<span class="pill good">เฉลยยืนยันแล้ว</span>`
    : q.answer_status === "disputed" ? `<span class="pill bad">เฉลยรอตรวจ</span>` : `<span class="pill exam">เฉลยร่าง</span>`;
  function refsHtml(b, q) {
    return q.refs.map((r) => {
      const id = refDoc(r); const d = docOf(b, id);
      const label = r.paper ? (d && d.role === "key" ? "ต้นฉบับเฉลย" : "ต้นฉบับข้อสอบ") : esc(id);
      return `<a class="ref" href="#/pdf/${enc(b.id)}/${enc(id)}/${r.pages[0]}"><span class="mono">${label}</span>${esc(d ? d.title : "")} · หน้า ${pagesText(r.pages)} <span class="hint">เปิด PDF</span></a>`;
    }).join("");
  }

  /* ---------- exam set runner (whole set, like the CVS quiz) ---------- */
  let QT = null; // timer interval
  function stopTimer() { if (QT) { clearInterval(QT); QT = null; } }
  function setList(st, s) {
    const f = st.filter;
    return s.questions.filter((q) => f === "wrong" ? isWrong(st, q) : f === "flag" ? st.flag[q.id] : f === "todo" ? !(st.mode === "exam" ? st.ans[q.id] : st.chk[q.id]) : true);
  }
  function viewSet(bid, sid, arg) {
    const b = findBlock(bid); const s = findSet(b, sid);
    if (!s) return notFound("ไม่พบชุดข้อสอบนี้");
    const st = quizOf(b, s); const k = quizStats(b, s);
    const sum = arg === "sum";
    const base = `#/set/${enc(b.id)}/${enc(s.id)}`;
    const limit = Number(s.meta.time_limit_min) || 0;
    const timerTxt = () => limit ? (st.elapsed >= limit * 60 ? `หมดเวลา · ${mmss(st.elapsed)}` : `เหลือ ${mmss(limit * 60 - st.elapsed)}`) : `เวลา ${mmss(st.elapsed)}`;
    const head = `<div class="crumbs"><a href="#/">ทั้งหมด</a><span>/</span><a href="#/b/${enc(b.id)}/exam">${esc(b.name)}</a><span>/</span><span>รุ่น ${s.cohort} · ${esc(s.type)}</span></div>
      <div class="head"><h2>${esc(s.title)}</h2><p class="hint">${s.questions.length} ข้อ${limit ? ` · เวลาสอบจริง ${limit} นาที` : ""} · ความคืบหน้าเก็บไว้ในเบราว์เซอร์นี้</p></div>
      <div class="tabs"><a class="tab ${sum ? "" : "on"}" href="${base}">ทำข้อสอบ</a><a class="tab ${sum ? "on" : ""}" href="${base}/sum">สรุปผล${k.checked ? ` (${k.right}/${k.checked})` : ""}</a></div>`;
    stopTimer();
    if (sum) { main.innerHTML = head + setSummaryHtml(b, s, st, k, base, limit); return; }

    const list = setList(st, s);
    let i = Math.max(1, Math.min(s.questions.length, Number(arg) || 0));
    if (!Number(arg)) { const first = s.questions.findIndex((q) => !(st.mode === "exam" ? st.ans[q.id] : st.chk[q.id])); i = first >= 0 ? first + 1 : 1; }
    const q = s.questions[i - 1];
    const pos = list.indexOf(q);
    const prev = pos > 0 ? list[pos - 1] : pos === -1 ? list.filter((x) => x.n < q.n).pop() : null;
    const next = pos >= 0 ? list[pos + 1] : list.find((x) => x.n > q.n);
    const idx = (x) => s.questions.indexOf(x) + 1;
    const a = st.ans[q.id], shown = !!st.chk[q.id];
    const exam = st.mode === "exam" && !st.submitted;

    const grid = list.map((x) => {
      const cls = [x === q ? "cur" : "", st.chk[x.id] ? (st.ans[x.id] === x.answer ? "right" : "wrong") : st.ans[x.id] ? "ans" : "", st.flag[x.id] ? "flag" : ""].join(" ");
      return `<button class="qn ${cls}" data-qgo="${idx(x)}" title="ข้อ ${x.n}">${x.n}</button>`;
    }).join("") || `<span class="hint">ไม่มีข้อที่ตรงกับตัวกรองนี้ เปลี่ยนตัวกรองเพื่อดูข้ออื่น</span>`;
    const opts = Object.entries(q.options).map(([key, v]) => {
      const cls = shown ? (key === q.answer ? "right" : key === a ? "wrong" : "") : key === a ? "sel" : "";
      return `<button class="opt ${cls}" data-qpick="${esc(key)}" ${shown ? "disabled" : ""}><b>${esc(key)}</b><span>${esc(v)}</span></button>`;
    }).join("");
    const fb = shown ? `<div class="explain"><h3>${!a ? `ไม่ได้ตอบ · คำตอบคือ ${esc(q.answer)}` : a === q.answer ? "ถูกต้อง" : `ยังไม่ใช่ คำตอบคือ ${esc(q.answer)}`}</h3>
        ${q.explanation ? `<p>${esc(q.explanation)}</p>` : ""}
        <div class="section" style="padding:0;gap:8px"><span class="hint">ดูต้นฉบับ</span>${refsHtml(b, q)}</div>
        ${st.mode === "practice" ? `<div class="btns"><button class="btn" data-qact="redo">ลองข้อนี้ใหม่</button></div>` : ""}</div>`
      : st.mode === "practice" ? `<p class="hint">เลือกคำตอบแล้วเฉลยจะขึ้นทันที · กด A–E เลือก, ← → เปลี่ยนข้อ, F ปักธง</p>`
      : `<p class="hint">โหมดจับเวลา: เลือกคำตอบได้จนกว่าจะส่ง เฉลยจะขึ้นหลังกด "ส่งคำตอบทั้งหมด"</p>`;
    const sel = (v, label) => `<option value="${v}" ${st.filter === v ? "selected" : ""}>${label}</option>`;
    main.innerHTML = head + `
      <div class="qbar">
        <div class="seg"><button class="${st.mode === "practice" ? "on" : ""}" data-qmode="practice">ฝึก (เฉลยทันที)</button><button class="${st.mode === "exam" ? "on" : ""}" data-qmode="exam">จับเวลา</button></div>
        ${st.mode === "exam" ? `<span class="timer ${limit && st.elapsed >= limit * 60 ? "over" : ""}" id="qtimer">${st.submitted ? `ส่งแล้ว · ใช้เวลา ${mmss(st.elapsed)}` : timerTxt()}</span>` : ""}
        <span class="hint">${st.mode === "exam" && !st.submitted ? `ตอบแล้ว ${k.answered}/${k.total}` : `ตรวจแล้ว ${k.checked}/${k.total} · ถูก ${k.right}`}</span>
        <label class="qfilter">แสดง <select data-qfilter="1">${sel("all", "ทุกข้อ")}${sel("todo", "ยังไม่ได้ทำ")}${sel("wrong", "เฉพาะข้อที่ผิด")}${sel("flag", "เฉพาะข้อที่ปักธง")}</select></label>
        <button class="btn danger sm" data-qact="reset">เริ่มชุดนี้ใหม่</button>
      </div>
      <details class="qnav" ${window.matchMedia("(min-width: 761px)").matches || st.navOpen ? "open" : ""}><summary>ตารางข้อ <span class="hint">ข้อ ${q.n} · ${i}/${s.questions.length}${k.flagged ? ` · ปักธง ${k.flagged}` : ""}</span></summary><div class="qgrid">${grid}</div></details>
      <div class="qcard">
        <div class="chips"><span class="pill">ข้อ ${q.n}</span><span class="hint">ลำดับ ${i}/${s.questions.length}</span>${q.answer_status !== "verified" ? statusPill(q) : ""}${st.flag[q.id] ? `<span class="pill exam">ปักธงไว้</span>` : ""}</div>
        <p class="stem ${S().fontSize === "large" ? "large" : ""}">${esc(q.stem)}</p>
        <div class="opts">${opts}</div>
        ${fb}
      </div>
      <div class="qfoot">
        <button class="btn" data-qgo="${prev ? idx(prev) : ""}" ${prev ? "" : "disabled"}>← ข้อก่อนหน้า</button>
        <button class="btn ${st.flag[q.id] ? "pri" : ""}" data-qact="flag">${st.flag[q.id] ? "เอาธงออก" : "ปักธงไว้ทบทวน"}</button>
        ${exam ? `<button class="btn pri" data-qact="submit">ส่งคำตอบทั้งหมด</button>` : ""}
        <button class="btn" data-qgo="${next ? idx(next) : ""}" ${next ? "" : "disabled"}>ข้อถัดไป →</button>
      </div>`;
    const qc = $(".qcard"); if (qc && qc.getBoundingClientRect().top < 0) qc.scrollIntoView({ block: "start" });
    if (exam) {
      let tick = 0;
      QT = setInterval(() => {
        const el = $("#qtimer"); if (!el) return stopTimer();
        st.elapsed++; el.textContent = timerTxt(); el.classList.toggle("over", !!limit && st.elapsed >= limit * 60);
        if (++tick % 5 === 0) saveQuiz();
      }, 1000);
    }
  }
  function setSummaryHtml(b, s, st, k, base, limit) {
    if (!k.checked) return `<div class="note"><h3>ยังไม่มีข้อที่ตรวจแล้ว</h3><p class="hint">${st.mode === "exam" ? "โหมดจับเวลา: กด \"ส่งคำตอบทั้งหมด\" เมื่อทำเสร็จ" : "โหมดฝึก: เลือกคำตอบแล้วเฉลยจะขึ้นทันที"} แล้วผลจะสรุปที่นี่</p><a class="btn pri" href="${base}">ไปทำข้อสอบ</a></div>`;
    const pct = Math.round((k.right / k.checked) * 100);
    const wrong = s.questions.filter((q) => isWrong(st, q));
    const flagged = s.questions.filter((q) => st.flag[q.id]);
    const unsure = s.questions.filter((q) => q.answer_status !== "verified");
    const row = (q, extra) => `<a class="row" href="${base}/${s.questions.indexOf(q) + 1}"><span class="id">ข้อ ${q.n}</span><span class="t">${esc(q.stem.slice(0, 90))}${q.stem.length > 90 ? "…" : ""}</span><span class="meta">${extra}</span></a>`;
    return `<div class="score"><div><b>${k.right}</b><span>/ ${k.checked} ข้อที่ตรวจแล้ว</span></div><div><b>${pct}%</b><span>ถูก</span></div>
        <div><b>${k.total - k.checked}</b><span>ข้อที่ยังไม่ได้ทำ</span></div>${st.mode === "exam" && st.elapsed ? `<div><b>${mmss(st.elapsed)}</b><span>เวลาที่ใช้${limit ? ` (จาก ${limit} นาที)` : ""}</span></div>` : ""}</div>
      <div class="btns">${wrong.length ? `<button class="btn pri" data-qact="redowrong">ทำซ้ำเฉพาะข้อที่ผิด (${wrong.length} ข้อ)</button>` : `<span class="pill good">ไม่มีข้อที่ผิด</span>`}
        <button class="btn danger" data-qact="reset">เริ่มชุดนี้ใหม่</button>${st.rounds ? `<span class="hint">วนทำซ้ำมาแล้ว ${st.rounds} รอบ</span>` : ""}</div>
      <h3>ข้อที่ผิด (${wrong.length})</h3><div class="rows">${wrong.map((q) => row(q, `<span class="pill bad">ตอบ ${esc(st.ans[q.id] || "–")}</span><span class="pill good">เฉลย ${esc(q.answer)}</span>`)).join("") || `<p class="hint">ไม่มี</p>`}</div>
      ${flagged.length ? `<h3>ข้อที่ปักธงไว้ (${flagged.length})</h3><div class="rows">${flagged.map((q) => row(q, st.chk[q.id] ? (isRight(st, q) ? `<span class="pill good">ถูก</span>` : `<span class="pill bad">ผิด</span>`) : `<span class="pill">ยังไม่ทำ</span>`)).join("")}</div>` : ""}
      ${unsure.length ? `<h3>ข้อที่เฉลยยังไม่ยืนยัน (${unsure.length})</h3><p class="hint">เฉลยมาจากต้นฉบับ แต่โจทย์/ช้อยส์อาจไม่ครบหรือมีมากกว่าหนึ่งคำตอบ อ่านเหตุผลท้ายคำอธิบาย</p><div class="rows">${unsure.map((q) => row(q, statusPill(q))).join("")}</div>` : ""}`;
  }

  function viewSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) return viewHome();
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const hl = (s) => esc(s).replace(re, (m) => `<mark>${m}</mark>`);
    const hits = [];
    visibleBlocks().forEach((b) => {
      b.lectures.forEach((l) => { if (l.title.toLowerCase().includes(q)) hits.push({ kind: "lec", b, l }); });
      examsOf(b).forEach((e) => {
        const hay = [e.stem, e.explanation || "", e.tags.join(" "), Object.values(e.options).join(" ")].join(" ").toLowerCase();
        if (hay.includes(q)) hits.push({ kind: "exam", b, e });
      });
    });
    const rows = hits.map((h) => h.kind === "lec"
      ? `<a class="row" href="#/l/${enc(h.b.id)}/${enc(h.l.id)}"><span class="id">${esc(h.b.id)} · ${esc(h.l.id)}</span><span class="t">${hl(h.l.title)}<span class="sub">Lecture · ${h.l.pages} หน้า</span></span><span class="meta"><span class="pill">lecture</span></span></a>`
      : `<a class="row" href="#/q/${enc(h.e.id)}"><span class="id">${esc(h.b.id)} · ${h.e.cohort}</span><span class="t">${hl(h.e.stem.slice(0, 90))}…<span class="sub">${hl(h.e.tags.join(" · "))}</span></span><span class="meta"><span class="pill exam">ข้อสอบ</span></span></a>`).join("");
    main.innerHTML = `<div class="head"><h2>ผลค้นหา "${esc(query)}"</h2><p class="hint">${hits.length} รายการ จาก ${new Set(hits.map((h) => h.b.id)).size} บล็อก · ตอนนี้ค้นจากชื่อบท โจทย์ ตัวเลือก คำอธิบาย และ tag</p></div>
      <div class="rows">${rows || `<p class="hint" style="padding:12px 0">ไม่พบ ลองใช้คำอื่น หรือสะกดเป็นภาษาอังกฤษ</p>`}</div>`;
  }

  /* ---------- PDF viewer ---------- */
  let idbP = null;
  function idb() {
    if (!idbP) idbP = new Promise((res, rej) => {
      const r = indexedDB.open("medlib", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("pdf", { keyPath: "id" });
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return idbP;
  }
  const idbReq = (mode, fn) => idb().then((db) => new Promise((res, rej) => {
    const t = db.transaction("pdf", mode); const r = fn(t.objectStore("pdf"));
    t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error);
  }));
  const idbGet = (id) => idbReq("readonly", (s) => s.get(id));
  const idbPut = (rec) => idbReq("readwrite", (s) => s.put(rec));
  const idbClear = () => idbReq("readwrite", (s) => s.clear());
  const idbCount = () => idbReq("readonly", (s) => s.count());

  function pdfSource(b, l) {
    if (l.drive_file_id) {
      // Prefer the Cloudflare Worker (key stays on Cloudflare); fall back to a local key in config.json.
      const proxy = (APP.config.drive_proxy_url || "").replace(/\/+$/, "");
      const key = APP.config.drive_api_key;
      const url = proxy ? `${proxy}/file/${enc(l.drive_file_id)}`
        : key ? `https://www.googleapis.com/drive/v3/files/${enc(l.drive_file_id)}?alt=media&key=${enc(key)}` : null;
      return { id: "drive:" + l.drive_file_id, from: "Google Drive", url };
    }
    if (l.file) return { id: "file:" + b._base + "/" + l.file, from: "ไฟล์ในโปรเจกต์", url: b._base + "/" + l.file.split("/").map(enc).join("/") };
    return null;
  }

  const P = { doc: null, docId: null, task: null, token: 0, page: 1, cached: false };
  if (window.pdfjsLib) window.pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";
  const pdfStatus = (msg, err) => { const el = $("#pdfstage"); if (el) el.innerHTML = `<p class="status ${err ? "err" : ""}">${esc(msg)}</p>`; };

  async function download(src, onProgress) {
    const r = await fetch(src.url);
    if (!r.ok) {
      if (src.from === "Google Drive" && (r.status === 403 || r.status === 404))
        throw new Error(APP.config.drive_proxy_url
          ? `เปิดไฟล์จาก Google Drive ไม่ได้ (HTTP ${r.status}) ตรวจว่าไฟล์แชร์เป็น "ทุกคนที่มีลิงก์" และ Worker ตั้งค่า DRIVE_API_KEY กับ ALLOWED_ORIGINS ถูกต้อง`
          : "เปิดไฟล์จาก Google Drive ไม่ได้ ตรวจว่าไฟล์แชร์เป็น \"ทุกคนที่มีลิงก์\" และ API key ใน config.json ถูกต้อง");
      throw new Error(`ดาวน์โหลดไฟล์ไม่ได้ (HTTP ${r.status})`);
    }
    const total = +r.headers.get("content-length") || 0;
    if (!r.body || !total) return r.blob();
    const reader = r.body.getReader(); const parts = []; let got = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; parts.push(value); got += value.length; onProgress(Math.min(99, Math.round((got / total) * 100))); }
    return new Blob(parts, { type: "application/pdf" });
  }

  async function viewPdf(bid, lid, page) {
    const b = findBlock(bid); const l = b && docOf(b, lid);
    if (!l) return notFound("ไม่พบไฟล์ PDF นี้");
    const src = pdfSource(b, l);
    const qs = examsOf(b).filter((e) => e.refs.some((r) => refDoc(r) === l.id && r.pages.includes(page)));
    const isPaper = b.papers.includes(l);
    const shellKey = `${bid}/${lid}`;
    if (!$("#pdfstage") || main.dataset.pdf !== shellKey) {
      main.dataset.pdf = shellKey;
      main.innerHTML = `<div class="crumbs"><a href="#/">ทั้งหมด</a><span>/</span><a href="#/b/${enc(b.id)}${isPaper ? "/exam" : ""}">${esc(b.name)}</a><span>/</span>${isPaper ? `<span>${esc(l.title)}</span>` : `<a href="#/l/${enc(b.id)}/${enc(l.id)}">${esc(l.id)}</a>`}<span>/</span><span id="pgcrumb">หน้า ${page}</span></div>
        <div class="pdfbar">
          <button class="btn" data-pg="-1" aria-label="หน้าก่อน">‹</button>
          <label for="pgin" class="hint">หน้า</label><input id="pgin" type="number" min="1" value="${page}"><span id="pgtotal" class="hint">/ ${l.pages}</span>
          <button class="btn" data-pg="1" aria-label="หน้าถัดไป">›</button>
          <span class="hint">· ${esc(l.title)}</span><span id="pdfinfo" class="hint"></span>
        </div>
        <div id="pdfrefs"></div>
        <div class="pdfstage" id="pdfstage"><p class="status">กำลังโหลด…</p></div>`;
    }
    $("#pgcrumb").textContent = `หน้า ${page}`;
    $("#pgin").value = page;
    $("#pdfrefs").innerHTML = qs.length ? `<div class="chips"><span class="hint">${isPaper ? "ข้อในหน้านี้:" : "ข้อสอบที่อ้างถึงหน้านี้:"}</span>${qs.map((e) => { const st = findSet(b, e._set); return `<a class="pill exam" href="${st ? `#/set/${enc(b.id)}/${enc(st.id)}/${st.questions.indexOf(e) + 1}` : `#/q/${enc(e.id)}`}">รุ่น ${e.cohort} ข้อ ${e.n}</a>`; }).join("")}</div>` : "";
    if (!src) return pdfStatus("บทนี้ยังไม่มีไฟล์ PDF ใส่ drive_file_id ของบทนี้ใน block.json แล้วจะเปิดได้", true);
    if (!window.pdfjsLib) return pdfStatus("โหลดตัวอ่าน PDF ไม่ได้ ต้องมีโฟลเดอร์ vendor อยู่ข้าง index.html", true);
    const token = ++P.token;
    try {
      if (P.docId !== src.id) {
        if (P.doc) { P.doc.destroy(); P.doc = null; P.docId = null; }
        pdfStatus("กำลังโหลด…");
        const rec = await idbGet(src.id).catch(() => null);
        let blob = rec && rec.blob;
        P.cached = !!blob;
        if (!blob) {
          if (!src.url && l.drive_file_id) return drivePreview(l.drive_file_id, page, token); // no key/Worker: Google's own viewer
          if (!src.url) throw new Error("ยังไม่ได้ตั้งค่าการดึงไฟล์จาก Google Drive (ใส่ drive_proxy_url ใน site.json หรือ API key ใน config.json)");
          blob = await download(src, (pct) => { if (token === P.token) pdfStatus(`กำลังดาวน์โหลดจาก ${src.from}… ${pct}%`); });
          await idbPut({ id: src.id, blob, saved: Date.now() }).catch(() => {});
          P.cached = true;
        }
        if (token !== P.token) return;
        const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false }).promise;
        if (token !== P.token) { doc.destroy(); return; }
        P.doc = doc; P.docId = src.id;
      }
      const n = P.doc.numPages;
      $("#pgtotal").textContent = `/ ${n}`;
      $("#pgin").max = n;
      $("#pdfinfo").textContent = P.cached ? " · เก็บไว้ในเครื่องแล้ว เปิดได้แม้ไม่มีเน็ต" : "";
      P.page = Math.min(Math.max(1, page), n);
      await renderPage(token);
    } catch (e) {
      if (token === P.token) pdfStatus(e.message || "เปิดไฟล์นี้ไม่ได้ ไฟล์อาจเสียหรือไม่ใช่ PDF", true);
    }
  }

  // Fallback when the site has neither a Worker nor a key (e.g. GitHub Pages before the Worker is set up):
  // embed Google Drive's preview of a file shared "anyone with the link". It cannot jump to a page.
  function drivePreview(fileId, page, token) {
    if (token !== P.token) return;
    if (P.doc) { P.doc.destroy(); P.doc = null; }
    P.docId = null;
    const stage = $("#pdfstage"); if (!stage) return;
    $("#pdfinfo").textContent = ` · เปิดผ่าน Google Drive — เลื่อนไปหน้า ${page} เอง`;
    stage.innerHTML = `<iframe class="drivepreview" src="https://drive.google.com/file/d/${enc(fileId)}/preview" allow="autoplay" title="PDF จาก Google Drive"></iframe>
      <p class="hint"><a href="https://drive.google.com/file/d/${enc(fileId)}/view" target="_blank" rel="noopener">เปิดใน Google Drive</a></p>`;
  }

  async function renderPage(token) {
    const stage = $("#pdfstage"); if (!stage || !P.doc) return;
    if (P.task) { P.task.cancel(); P.task = null; }
    const page = await P.doc.getPage(P.page);
    if (token !== P.token) return;
    const base = page.getViewport({ scale: 1 });
    const avail = Math.max(240, stage.clientWidth - 24);
    const scale = Math.min(2.5, avail / base.width);
    const vp = page.getViewport({ scale });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(vp.width * dpr); canvas.height = Math.floor(vp.height * dpr);
    canvas.style.width = Math.floor(vp.width) + "px";
    P.task = page.render({ canvasContext: canvas.getContext("2d"), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null });
    try { await P.task.promise; } catch (e) { if (e && e.name === "RenderingCancelledException") return; throw e; }
    P.task = null;
    if (token !== P.token) return;
    stage.replaceChildren(canvas);
  }

  function pdfGo(delta) {
    const [, bid, lid, pg] = parseHash();
    const max = P.doc ? P.doc.numPages : 9999;
    const next = Math.min(max, Math.max(1, (Number(pg) || 1) + delta));
    location.replace(`#/pdf/${enc(bid)}/${enc(lid)}/${next}`);
  }

  /* ---------- settings ---------- */
  function armed(btn, label) { // two-click confirm, resets after 4s
    if (btn.dataset.armed) return true;
    btn.dataset.armed = "1"; const old = btn.textContent; btn.textContent = label || "กดอีกครั้งเพื่อยืนยัน"; btn.classList.add("armed");
    setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = old; btn.classList.remove("armed"); } }, 4000);
    return false;
  }
  let toastMsg = null;
  async function viewSettings(section) {
    const s = S(); const d = APP.defaults.settings; const mine = USER.settings;
    const own = (k) => (k in mine ? `<span class="own">ค่าส่วนตัว</span>` : "");
    const opt = (v, cur, label) => `<option value="${esc(v)}" ${String(cur) === String(v) ? "selected" : ""}>${esc(label)}</option>`;
    const lbl = { lec: "Lecture", exam: "ข้อสอบ", true: "แสดง", false: "ซ่อน", normal: "ปกติ", large: "ใหญ่" };
    const pdfCount = await idbCount().catch(() => 0);
    const blocksRows = enabledBlocks().map((b) => {
      const hidden = s.hiddenBlocks.includes(b.id);
      return `<div class="setrow"><label for="hide-${esc(b.id)}">แสดงบล็อก ${esc(b.name)}${"hiddenBlocks" in mine && mine.hiddenBlocks.includes(b.id) !== d.hiddenBlocks.includes(b.id) ? `<span class="own">ค่าส่วนตัว</span>` : ""}<small>ค่ากลาง: ${d.hiddenBlocks.includes(b.id) ? "ซ่อน" : "แสดง"}</small></label>
        <select id="hide-${esc(b.id)}" data-hide="${esc(b.id)}">${opt("show", hidden ? "hide" : "show", "แสดง")}${opt("hide", hidden ? "hide" : "show", "ซ่อน")}</select></div>`;
    }).join("");
    const v = APP.version;
    main.innerHTML = `<div class="head"><h2>ตั้งค่า</h2><p class="hint">เริ่มจากค่ากลางใน <code>defaults.json</code> สิ่งที่แก้ตรงนี้เก็บไว้ในเบราว์เซอร์นี้เท่านั้น และทับค่ากลางเฉพาะเรื่องที่แก้</p></div>
      <div class="set">
        <div class="setrow"><label for="s-tab">แท็บที่เปิดก่อนเมื่อเข้าบล็อก${own("defaultTab")}<small>ค่ากลาง: ${lbl[d.defaultTab]}</small></label><select id="s-tab" data-set="defaultTab">${opt("lec", s.defaultTab, "Lecture")}${opt("exam", s.defaultTab, "ข้อสอบ")}</select></div>
        <div class="setrow"><label for="s-draft">แสดงข้อสอบที่เฉลยยังไม่ยืนยัน${own("showDrafts")}<small>ค่ากลาง: ${lbl[d.showDrafts]}</small></label><select id="s-draft" data-set="showDrafts" data-bool="1">${opt(true, s.showDrafts, "แสดง")}${opt(false, s.showDrafts, "ซ่อน")}</select></div>
        <div class="setrow"><label for="s-font">ขนาดตัวอักษรโจทย์${own("fontSize")}<small>ค่ากลาง: ${lbl[d.fontSize]}</small></label><select id="s-font" data-set="fontSize">${opt("normal", s.fontSize, "ปกติ")}${opt("large", s.fontSize, "ใหญ่")}</select></div>
        <div class="setrow"><label for="s-sample">แสดงบล็อกตัวอย่าง (DEMO)${own("showSample")}<small>ค่ากลาง: ${lbl[d.showSample]}</small></label><select id="s-sample" data-set="showSample" data-bool="1">${opt(true, s.showSample, "แสดง")}${opt(false, s.showSample, "ซ่อน")}</select></div>
        ${blocksRows}
      </div>
      <div class="btns"><button class="btn danger" data-act="reset">รีเซ็ตการตั้งค่ากลับค่ากลาง</button><span class="hint">ปรับเป็นค่าส่วนตัวไว้ ${Object.keys(mine).length} เรื่อง</span></div>

      <div class="section"><h3>ข้อมูลส่วนตัว</h3>
        <p class="hint">ข้อสอบที่เพิ่มเอง ${USER.questions.length} ข้อ · ส่งออกเป็นไฟล์เก็บไว้กันหาย หรือส่งไฟล์ให้ Claude นำเข้าเป็นข้อมูลกลางของทุกคน</p>
        <div class="btns">
          <button class="btn" data-act="export">ส่งออกข้อมูลส่วนตัว</button>
          <label class="btn" for="importfile">นำเข้าข้อมูลส่วนตัว</label><input id="importfile" type="file" accept="application/json,.json" hidden>
          <button class="btn danger" data-act="clearq" ${USER.questions.length ? "" : "disabled"}>ลบข้อสอบที่เพิ่มเองทั้งหมด</button>
        </div></div>

      <div class="section"><h3>ไฟล์ PDF ในเครื่อง</h3>
        <p class="hint">เก็บไว้ ${pdfCount} ไฟล์ ไฟล์ที่เคยเปิดแล้วจะเปิดได้แม้ไม่มีเน็ต · ดึงไฟล์จาก Google Drive: ${APP.config.drive_proxy_url ? "ผ่าน Cloudflare Worker" : APP.config.drive_api_key ? "ใช้ API key ในเครื่อง (config.json)" : "ยังไม่ได้ตั้งค่า"}</p>
        <div class="btns"><button class="btn danger" data-act="clearpdf" ${pdfCount ? "" : "disabled"}>ลบไฟล์ PDF ที่เก็บไว้</button></div></div>
      ${toastMsg ? `<p class="toast ${toastMsg.err ? "err" : ""}">${esc(toastMsg.text)}</p>` : ""}

      <div class="section" id="about"><h3>เวอร์ชัน</h3>
        <p>MedLib <b class="mono">v${esc(v.version)}</b> · ${esc(fmtDate(v.date))}</p>
        <div class="log">${(v.history || []).map((h) => `<div><strong class="mono">v${esc(h.version)}</strong> <span class="hint">· ${esc(fmtDate(h.date))}${h.title ? " · " + esc(h.title) : ""}</span><ul>${(h.changes || []).map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>`).join("")}</div></div>`;
    toastMsg = null;
    if (section === "about") $("#about").scrollIntoView({ block: "start" });
  }

  function exportUser() {
    const data = { format: "medlib-personal", schema: V.SCHEMA_VERSION, app_version: APP.version.version, exported: new Date().toISOString(), settings: USER.settings, questions: USER.questions };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `medlib-personal-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return `ส่งออกแล้ว: ${a.download}`;
  }
  async function importUser(file) {
    let d;
    try { d = JSON.parse(await file.text()); } catch (e) { return { err: true, text: "ไฟล์นี้ไม่ใช่ JSON" }; }
    if (!d || d.format !== "medlib-personal") return { err: true, text: "ไฟล์นี้ไม่ใช่ไฟล์ข้อมูลส่วนตัวของ MedLib" };
    const good = [], bad = [];
    (Array.isArray(d.questions) ? d.questions : []).forEach((q) => {
      const b = findBlock(q && q.block);
      const errs = b ? V.validateQuestion(q, { block: b }) : [`ไม่มีบล็อก ${q && q.block}`];
      (errs.length ? bad : good).push(q);
    });
    const ids = new Set(good.map((q) => q.id));
    USER = { settings: d.settings && typeof d.settings === "object" ? d.settings : {}, questions: USER.questions.filter((q) => !ids.has(q.id)).concat(good) };
    saveUser();
    return { text: `นำเข้าแล้ว: การตั้งค่า + ข้อสอบ ${good.length} ข้อ${bad.length ? ` (ข้าม ${bad.length} ข้อที่ format ไม่ผ่าน)` : ""}` };
  }

  /* ---------- add question (same rules as Claude/MCP) ---------- */
  let draft = null;
  function freshDraft() {
    const b = visibleBlocks()[0] || enabledBlocks()[0];
    return { block: b ? b.id : "", cohort: "", n: "", stem: "", A: "", B: "", C: "", D: "", E: "", answer: "", lecture: b && b.lectures[0] ? b.lectures[0].id : "", pages: "", explanation: "", tags: "" };
  }
  function buildRecord(d) {
    const cohort = Number(d.cohort), n = Number(d.n);
    return {
      id: V.questionId(d.block, cohort || 0, n || 0), block: d.block, cohort, n, type: "MCQ", stem: d.stem.trim(),
      options: Object.fromEntries(V.OPTION_KEYS.filter((k) => d[k].trim()).map((k) => [k, d[k].trim()])),
      answer: d.answer, answer_status: "draft", explanation: d.explanation.trim(),
      refs: d.lecture ? [{ lecture: d.lecture, pages: d.pages.split(/[,\s]+/).filter(Boolean).map(Number) }] : [],
      tags: d.tags.split(",").map((t) => t.trim()).filter(Boolean), source: "manual",
    };
  }
  function checkDraft() {
    const r = buildRecord(draft); const b = findBlock(draft.block);
    const errs = b ? V.validateQuestion(r, { block: b }) : ["ยังไม่มีบล็อกให้เลือก"];
    if (b && !errs.length && allExams(b).some((q) => q.id === r.id)) errs.push(`มีข้อ ${r.id} อยู่แล้ว`);
    return { r, errs };
  }
  const verdictHtml = (errs) => (errs.length ? `<ul class="errs">${errs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="okmsg">ผ่านการตรวจ format แล้ว พร้อมบันทึก</p>`);
  function viewAdd() {
    if (!draft) draft = freshDraft();
    const blocks = enabledBlocks();
    if (!blocks.length) { main.innerHTML = `<div class="note"><h3>ยังไม่มีบล็อก</h3><p class="hint">ต้องมีบล็อกอย่างน้อย 1 บล็อกก่อนจึงจะเพิ่มข้อสอบได้</p></div>`; return; }
    const b = findBlock(draft.block) || blocks[0];
    const { r, errs } = checkDraft();
    const f = (k, label, ph = "") => `<label for="f-${k}">${label}<input type="text" id="f-${k}" data-f="${k}" value="${esc(draft[k])}" placeholder="${esc(ph)}"></label>`;
    main.innerHTML = `<div class="head"><h2>เพิ่มข้อสอบ</h2><p class="hint">ฟอร์มนี้ใช้กติกาข้อมูลชุดเดียวกับตอนให้ Claude เพิ่ม (<code>lib/validate.js</code>) ทางขวาคือข้อมูลที่จะถูกบันทึก ข้อที่เพิ่มเองเก็บในเบราว์เซอร์นี้ และขึ้นป้าย "ของฉัน"</p></div>
      <div class="form"><div class="fields">
        <div class="two"><label for="f-block">บล็อก<select id="f-block" data-f="block">${blocks.map((x) => `<option value="${esc(x.id)}" ${x.id === b.id ? "selected" : ""}>${esc(x.id)} · ${esc(x.name)}</option>`).join("")}</select></label>
          <label for="f-cohort">รุ่น<input type="number" id="f-cohort" data-f="cohort" value="${esc(draft.cohort)}" placeholder="52"></label></div>
        <label for="f-n">เลขข้อ<input type="number" id="f-n" data-f="n" value="${esc(draft.n)}" placeholder="12"></label>
        <label for="f-stem">โจทย์<textarea id="f-stem" data-f="stem" rows="4" placeholder="พิมพ์โจทย์">${esc(draft.stem)}</textarea></label>
        <div class="two">${f("A", "ตัวเลือก A")}${f("B", "ตัวเลือก B")}${f("C", "ตัวเลือก C")}${f("D", "ตัวเลือก D")}</div>
        ${f("E", "ตัวเลือก E (ถ้ามี)")}
        <div class="two"><label for="f-answer">เฉลย<select id="f-answer" data-f="answer"><option value="">เลือก</option>${V.OPTION_KEYS.map((k) => `<option ${draft.answer === k ? "selected" : ""}>${k}</option>`).join("")}</select></label>
          <label for="f-lecture">อ้างถึง lecture<select id="f-lecture" data-f="lecture">${b.lectures.map((l) => `<option value="${esc(l.id)}" ${draft.lecture === l.id ? "selected" : ""}>${esc(l.id)} · ${esc(l.title.slice(0, 26))}</option>`).join("")}</select></label></div>
        ${f("pages", "หน้า (คั่นด้วย ,)", "14, 15")}
        <label for="f-explanation">คำอธิบายเฉลย<textarea id="f-explanation" data-f="explanation" rows="3">${esc(draft.explanation)}</textarea></label>
        ${f("tags", "tag (คั่นด้วย ,)", "ADH, diabetes insipidus")}
      </div>
      <div class="fields" style="min-width:0"><pre id="preview">${esc(JSON.stringify(r, null, 2))}</pre><div id="verdict">${verdictHtml(errs)}</div>
        <div class="btns"><button class="btn pri" data-act="save">บันทึก</button><button class="btn" data-act="cleardraft">ล้างฟอร์ม</button></div>
        ${toastMsg ? `<p class="toast ${toastMsg.err ? "err" : ""}">${toastMsg.html || esc(toastMsg.text)}</p>` : ""}</div></div>`;
    toastMsg = null;
  }

  /* ---------- router ---------- */
  const parseHash = () => location.hash.replace(/^#\/?/, "").split("/").filter((x, i) => x || i === 0).map((x) => { try { return decodeURIComponent(x); } catch (e) { return x; } });
  function route() {
    const [view, ...a] = parseHash();
    if (view !== "pdf") { delete main.dataset.pdf; P.token++; }
    if (QT) { stopTimer(); saveQuiz(); }
    if (view !== "search") $("#q").value = "";
    side(view, a);
    switch (view) {
      case "b": return viewBlock(a[0], a[1]);
      case "l": return viewLecture(a[0], a[1]);
      case "q": return viewQuestion(a[0]);
      case "set": return viewSet(a[0], a[1], a[2]);
      case "pdf": return viewPdf(a[0], a[1], Number(a[2]) || 1);
      case "search": { const qv = a.join("/"); if ($("#q").value !== qv) $("#q").value = qv; return viewSearch(qv); }
      case "settings": return viewSettings(a[0]);
      case "add": return viewAdd();
      default: return viewHome();
    }
  }
  let lastHash = location.hash;
  window.addEventListener("hashchange", () => {
    const h = location.hash, prev = lastHash; lastHash = h;
    route();
    const setTab = (x) => (x.startsWith("#/set/") ? x.split("/").slice(0, 4).join("/") + (x.endsWith("/sum") ? "#sum" : "#run") : "");
    if (h.startsWith("#/pdf") || h.startsWith("#/settings/about")) return;
    if (!h.startsWith("#/set/") || setTab(h) !== setTab(prev)) window.scrollTo(0, 0); // new page, new set or run↔summary
  });
  window.addEventListener("pagehide", () => saveQuiz());

  function setAction(t) {
    const [, bid, sid, cur] = parseHash();
    const b = findBlock(bid), s = findSet(b, sid); if (!s) return;
    const st = quizOf(b, s); const i = Number(cur) || 0;
    const q = s.questions[(i || 1) - 1];
    const go = (n) => { location.replace(`#/set/${enc(bid)}/${enc(sid)}/${n}`); route(); };
    if (t.dataset.qgo !== undefined) { if (t.dataset.qgo) go(Number(t.dataset.qgo)); return; }
    if (t.dataset.qmode) {
      if (st.mode !== t.dataset.qmode) { st.mode = t.dataset.qmode; if (st.mode === "exam") st.submitted = false; saveQuiz(); }
      return go(i || 1);
    }
    if (t.dataset.qpick) {
      const qq = s.questions[(i || 1) - 1] || q;
      if (st.chk[qq.id]) return;
      st.ans[qq.id] = t.dataset.qpick;
      if (st.mode === "practice" || st.submitted) st.chk[qq.id] = true;
      saveQuiz(); go(i || s.questions.indexOf(qq) + 1);
      const ex = $(".qcard .explain"); if (ex) ex.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }
    const act = t.dataset.qact;
    if (act === "flag") { if (st.flag[q.id]) delete st.flag[q.id]; else st.flag[q.id] = true; saveQuiz(); return go(i || 1); }
    if (act === "redo") { delete st.ans[q.id]; delete st.chk[q.id]; saveQuiz(); return go(i || 1); }
    if (act === "submit") {
      const left = s.questions.filter((x) => !st.ans[x.id]).length;
      if (!armed(t, left ? `ยังไม่ตอบ ${left} ข้อ · กดอีกครั้งเพื่อส่ง` : "กดอีกครั้งเพื่อส่ง")) return;
      s.questions.forEach((x) => { st.chk[x.id] = true; });
      st.submitted = true; saveQuiz(); stopTimer();
      location.replace(`#/set/${enc(bid)}/${enc(sid)}/sum`); return route();
    }
    if (act === "redowrong") {
      const wrong = s.questions.filter((x) => isWrong(st, x));
      wrong.forEach((x) => { delete st.ans[x.id]; delete st.chk[x.id]; });
      s.questions.filter((x) => !wrong.includes(x)).forEach((x) => { if (!st.chk[x.id]) delete st.ans[x.id]; });
      Object.assign(st, { mode: "practice", submitted: false, filter: "todo", rounds: st.rounds + 1 }); saveQuiz();
      return go(wrong.length ? s.questions.indexOf(wrong[0]) + 1 : 1);
    }
    if (act === "reset") {
      if (!armed(t)) return;
      QUIZ[`${b.id}/${s.id}`] = Object.assign(freshQuiz(), { mode: st.mode }); saveQuiz();
      location.replace(`#/set/${enc(bid)}/${enc(sid)}/1`); return route();
    }
  }

  /* ---------- events ---------- */
  document.addEventListener("click", async (ev) => {
    const t = ev.target.closest("button"); if (!t) return;
    if (t.dataset.qpick || t.dataset.qgo !== undefined || t.dataset.qmode || t.dataset.qact) return setAction(t);
    if (t.dataset.pick) { const id = parseHash()[1]; if (!picked[id]) { picked[id] = t.dataset.pick; route(); } return; }
    if (t.dataset.pg) return pdfGo(Number(t.dataset.pg));
    const act = t.dataset.act;
    if (act === "retry") { delete picked[parseHash()[1]]; return route(); }
    if (act === "reset") { if (!armed(t)) return; USER.settings = {}; saveUser(); toastMsg = { text: "กลับไปใช้ค่ากลางทั้งหมดแล้ว" }; return route(); }
    if (act === "export") { toastMsg = { text: exportUser() }; return route(); }
    if (act === "clearq") { if (!armed(t)) return; const n = USER.questions.length; USER.questions = []; saveUser(); toastMsg = { text: `ลบข้อสอบที่เพิ่มเอง ${n} ข้อแล้ว` }; return route(); }
    if (act === "clearpdf") { if (!armed(t)) return; await idbClear().catch(() => {}); P.doc && P.doc.destroy(); P.doc = null; P.docId = null; toastMsg = { text: "ลบไฟล์ PDF ที่เก็บไว้แล้ว" }; return route(); }
    if (act === "cleardraft") { draft = freshDraft(); return route(); }
    if (act === "save") {
      const { r, errs } = checkDraft();
      if (errs.length) { toastMsg = { err: true, text: `ยังบันทึกไม่ได้ ต้องแก้อีก ${errs.length} จุด` }; return route(); }
      USER.questions.push(r);
      if (!saveUser()) { USER.questions.pop(); toastMsg = { err: true, text: "บันทึกไม่ได้ เบราว์เซอร์นี้ไม่อนุญาตให้เก็บข้อมูล" }; return route(); }
      draft = Object.assign(freshDraft(), { block: r.block, cohort: String(r.cohort), lecture: r.refs[0].lecture, n: String(r.n + 1) });
      toastMsg = { html: `บันทึกแล้ว <a href="#/q/${enc(r.id)}">เปิดดูข้อ ${esc(r.id)}</a>` };
      return route();
    }
  });
  document.addEventListener("change", async (ev) => {
    const t = ev.target;
    if (t.dataset.set) {
      const k = t.dataset.set; let v = t.value; if (t.dataset.bool) v = v === "true";
      if (v === APP.defaults.settings[k]) delete USER.settings[k]; else USER.settings[k] = v;
      saveUser(); return route();
    }
    if (t.dataset.hide) {
      const id = t.dataset.hide; const h = S().hiddenBlocks.filter((x) => x !== id); if (t.value === "hide") h.push(id);
      const same = JSON.stringify([...h].sort()) === JSON.stringify([...APP.defaults.settings.hiddenBlocks].sort());
      if (same) delete USER.settings.hiddenBlocks; else USER.settings.hiddenBlocks = h;
      saveUser(); return route();
    }
    if (t.dataset.qfilter) { const [, bid, sid] = parseHash(); const b = findBlock(bid), s = findSet(b, sid); if (s) { quizOf(b, s).filter = t.value; saveQuiz(); const l = setList(quizOf(b, s), s); location.replace(`#/set/${enc(bid)}/${enc(sid)}/${l.length ? s.questions.indexOf(l[0]) + 1 : 1}`); route(); } return; }
    if (t.id === "importfile" && t.files[0]) { toastMsg = await importUser(t.files[0]); return route(); }
    if (t.id === "pgin") { const [, bid, lid] = parseHash(); location.replace(`#/pdf/${enc(bid)}/${enc(lid)}/${Math.max(1, Number(t.value) || 1)}`); return; }
    if (t.dataset.f && t.tagName === "SELECT") {
      draft[t.dataset.f] = t.value;
      if (t.dataset.f === "block") { const b = findBlock(t.value); draft.lecture = b && b.lectures[0] ? b.lectures[0].id : ""; }
      return route();
    }
  });
  document.addEventListener("input", (ev) => {
    const t = ev.target;
    if (t.id === "q") { const v = t.value; if (v.trim()) location.replace("#/search/" + enc(v)); else location.replace("#/"); return; }
    if (t.dataset.f && t.tagName !== "SELECT" && draft) {
      draft[t.dataset.f] = t.value;
      const { r, errs } = checkDraft();
      $("#preview").textContent = JSON.stringify(r, null, 2);
      $("#verdict").innerHTML = verdictHtml(errs);
    }
  });
  document.addEventListener("keydown", (ev) => {
    if (/INPUT|TEXTAREA|SELECT/.test(ev.target.tagName) || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (location.hash.startsWith("#/set/") && !location.hash.endsWith("/sum")) {
      const k = ev.key.toUpperCase();
      const btn = /^[A-E]$/.test(k) ? $(`[data-qpick="${k}"]`) : /^[1-5]$/.test(k) ? $(`[data-qpick="${"ABCDE"[Number(k) - 1]}"]`)
        : ev.key === "ArrowRight" ? $(".qfoot [data-qgo]:last-child") : ev.key === "ArrowLeft" ? $(".qfoot [data-qgo]") : k === "F" ? $('[data-qact="flag"]') : null;
      if (btn && !btn.disabled) { ev.preventDefault(); btn.click(); }
      return;
    }
    if (!location.hash.startsWith("#/pdf")) return;
    if (ev.key === "ArrowRight" || ev.key === "PageDown") pdfGo(1);
    if (ev.key === "ArrowLeft" || ev.key === "PageUp") pdfGo(-1);
  });
  let rz = 0;
  window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if (P.doc && $("#pdfstage")) renderPage(P.token); }, 200); });

  /* ---------- boot ---------- */
  async function boot() {
    if (location.protocol === "file:") {
      main.innerHTML = `<div class="note"><h3>ต้องเปิดผ่าน start.bat</h3><p class="hint">เบราว์เซอร์ไม่ยอมให้เว็บอ่านไฟล์ข้อมูลเมื่อเปิดไฟล์ index.html ตรง ๆ ให้ดับเบิลคลิก <code>start.bat</code> ในโฟลเดอร์ medlib แทน</p></div>`;
      return;
    }
    const [ver, defs, site, cfg] = await Promise.all([
      getJSON("version.json").catch((e) => { APP.problems.push(e.message); return APP.version; }),
      getJSON("defaults.json").catch((e) => { APP.problems.push(e.message); return { settings: {} }; }),
      getJSON("site.json").catch(() => ({})),   // public, on GitHub: worker URL only, no secrets
      getJSON("config.json").catch(() => ({})), // local only (gitignored): may hold a key; non-empty values win
    ]);
    APP.version = ver;
    APP.config = Object.assign({}, site, Object.fromEntries(Object.entries(cfg).filter(([, v]) => v)));
    APP.defaults = { settings: Object.assign({ defaultTab: "lec", showDrafts: true, fontSize: "normal", hiddenBlocks: [], showSample: true }, defs.settings) };
    await loadBlocks("data/blocks", false);
    await loadBlocks("samples/blocks", true);
    route();
  }
  window.__medlib = { APP, get USER() { return USER; }, route };
  boot();
})();
