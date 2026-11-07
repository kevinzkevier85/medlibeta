/* MedLib web app. Data: data/blocks (real) + samples/blocks (DEMO). Rules: lib/validate.js.
   Exam pages live in quiz.js (window.MedLibQuizUI), quiz logic in lib/quizcore.js. */
(() => {
  "use strict";
  const V = window.MedLibValidate, QC = window.MedLibQuiz;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const enc = encodeURIComponent;
  const main = $("#main");

  /* ---------- personal data (browser storage) ---------- */
  const LSKEY = "medlib.user.v1";      // settings + questions added by hand
  const PKEY = "medlib.progress.v1";   // rounds, flags, notes, my keys, reading marks, mixes
  function loadUser() {
    try {
      const u = JSON.parse(localStorage.getItem(LSKEY) || "null");
      if (u && typeof u === "object") return { settings: u.settings || {}, questions: Array.isArray(u.questions) ? u.questions : [] };
    } catch (e) { /* storage blocked or corrupt */ }
    return { settings: {}, questions: [] };
  }
  let USER = loadUser();
  function saveUser() { try { localStorage.setItem(LSKEY, JSON.stringify(USER)); return true; } catch (e) { return false; } }
  function normProg(p) {
    p = p && typeof p === "object" ? p : {};
    const m = p.marks = p.marks && typeof p.marks === "object" ? p.marks : {};
    ["flag", "notes", "setNotes", "keyOverride", "reported"].forEach((k) => { if (!m[k] || typeof m[k] !== "object") m[k] = {}; });
    ["rounds", "read", "mixes", "prefs", "ts", "review"].forEach((k) => { if (!p[k] || typeof p[k] !== "object") p[k] = {}; });
    return p;
  }
  let PROG = normProg((() => { try { return JSON.parse(localStorage.getItem(PKEY) || "null"); } catch (e) { return null; } })());
  let progWarned = false;
  function saveProg() {
    try { localStorage.setItem(PKEY, JSON.stringify(PROG)); return true; }
    catch (e) { if (!progWarned) { progWarned = true; toast("บันทึกความคืบหน้าไม่ได้ พื้นที่เบราว์เซอร์อาจเต็ม ลองส่งออกข้อมูลในหน้าตั้งค่า"); } return false; }
  }

  /* ---------- sync across devices: worker /sync/<code>, the code is the key ---------- */
  const SYNC_KEY = "medlib.sync.v1";   // { code, last } on this device only
  const SYNC_CODE = /^[2-9a-hjkmnp-z]{4}-[2-9a-hjkmnp-z]{4}-[2-9a-hjkmnp-z]{4}$/;
  const SY = { busy: null, msg: null };
  function syncState() {
    try { const s = JSON.parse(localStorage.getItem(SYNC_KEY) || "null"); return s && SYNC_CODE.test(s.code) ? s : null; } catch (e) { return null; }
  }
  function setSyncState(s) { try { if (s) localStorage.setItem(SYNC_KEY, JSON.stringify(s)); else localStorage.removeItem(SYNC_KEY); } catch (e) { /* storage blocked */ } }
  const syncBase = () => String(APP.config.drive_proxy_url || "").replace(/\/+$/, "");
  const normCode = (s) => String(s || "").trim().toLowerCase();
  // JSON with sorted keys, so two equal progress objects compare equal
  const canon = (o) => JSON.stringify(o, (k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((x) => [x, v[x]])) : v));
  const onSettings = () => location.hash.startsWith("#/settings");
  function syncFail(text) { SY.msg = { err: true, text }; if (onSettings()) route(); return false; }
  // Pull, merge into this device, push back only if the worker copy is missing something. Never deletes local data.
  // fresh: a code just made by /sync/new — nothing on the worker yet, so skip the GET and always PUT.
  function syncNow(code, fresh) {
    const base = syncBase(), had = (syncState() || {}).code; code = code || had;
    if (!base || !code) return Promise.resolve(false);
    if (SY.busy) return SY.busy;
    const url = `${base}/sync/${code}`;
    const FAIL = "ซิงก์ไม่สำเร็จ (ไม่มีเน็ตหรือ Worker ไม่ตอบ) ข้อมูลในเครื่องยังอยู่ครบ";
    SY.busy = (async () => {
      let res, remote = { format: "medlib-sync", progress: {} };
      if (!fresh) {
        try { res = await fetch(url, { cache: "no-store" }); } catch (e) { return syncFail(FAIL); }
        if (res.status === 404) return syncFail("ไม่พบรหัสนี้ ตรวจรหัสอีกครั้ง");
        try { remote = res.ok ? await res.json() : null; } catch (e) { remote = null; }
      }
      if (!remote || remote.format !== "medlib-sync" || !remote.progress || typeof remote.progress !== "object" || Array.isArray(remote.progress)) return syncFail(FAIL);
      const theirs = normProg(remote.progress);
      const merged = normProg(QC.mergeProgress(PROG, theirs));
      const changed = canon(merged) !== canon(PROG);
      // Swap in the merged copy and redraw at once, so an open exam (and its timer) works on the new objects.
      if (changed) { PROG = merged; saveProg(); route(); }
      // Push only if the worker copy would gain something (prefs stay per device).
      const noPrefs = (p) => canon(Object.assign({}, p, { prefs: null }));
      if (fresh || noPrefs(normProg(QC.mergeProgress(theirs, PROG))) !== noPrefs(theirs)) {
        try {
          const put = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ format: "medlib-sync", progress: PROG, saved: new Date().toISOString() }) });
          if (!put.ok) return syncFail(put.status === 413 ? "ซิงก์ไม่สำเร็จ ข้อมูลใหญ่เกินกว่าที่ Worker รับได้" : FAIL);
        } catch (e) { return syncFail(FAIL); }
      }
      const now = (syncState() || {}).code;
      if (now === code || (!had && !now)) setSyncState({ code, last: Date.now() });   // not if "stop syncing" was pressed meanwhile
      SY.msg = { text: changed ? "ซิงก์แล้ว รวมข้อมูลจากเครื่องอื่นเข้ามาแล้ว" : "ซิงก์แล้ว" };
      if (onSettings()) route();
      return true;
    })().finally(() => { SY.busy = null; });
    return SY.busy;
  }
  const syncSoon = () => { if (syncState()) setTimeout(() => syncNow(), 0); };
  async function syncNew() {
    const base = syncBase(); if (!base || SY.busy) return;
    let code = null;
    try { const r = await fetch(`${base}/sync/new`, { method: "POST" }); const j = r.ok ? await r.json() : null; code = j && SYNC_CODE.test(j.code) ? j.code : null; } catch (e) { code = null; }
    if (!code) return syncFail("สร้างรหัสไม่สำเร็จ (ไม่มีเน็ตหรือ Worker ไม่ตอบ)");
    return syncNow(code, true);
  }
  function syncHTML() {
    if (!syncBase()) return "";
    const st = syncState(), m = SY.msg; SY.msg = null;
    const when = st && st.last ? new Date(st.last).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "";
    const msg = m ? `<p class="toast ${m.err ? "err" : ""}">${esc(m.text)}</p>` : "";
    const body = st
      ? `<p>รหัสของคุณ <b class="mono synccode">${esc(st.code)}</b> <button class="btn sm" data-copy="${esc(st.code)}">คัดลอก</button></p>
        <p class="hint">ใส่รหัสนี้ที่เครื่องอื่นเพื่อใช้ความคืบหน้าเดียวกัน · ซิงก์เองตอนเปิดเว็บและหลังจบรอบ${when ? ` · ซิงก์ล่าสุด ${esc(when)}` : ""}</p>
        <div class="btns"><button class="btn primary" data-act="syncnow">ซิงก์ตอนนี้</button>
          <button class="btn danger" data-act="syncoff">เลิกซิงก์ในเครื่องนี้</button><span class="hint">ลบแค่รหัสในเครื่องนี้ ความคืบหน้ายังอยู่</span></div>`
      : `<div class="btns"><button class="btn primary" data-act="syncnew">สร้างรหัสใหม่</button></div>
        <form class="btns" data-syncjoin="1"><input id="syncin" placeholder="มีรหัสแล้ว ใส่ที่นี่" aria-label="รหัสซิงก์" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="btn">เชื่อมรหัส</button></form>`;
    return `<div class="section" id="sync"><h3>ซิงก์ข้ามเครื่อง</h3>
      <p class="hint">ใช้รหัสเดียวกันทุกเครื่อง ความคืบหน้าจะรวมกันรายข้อ ไม่ทับของเดิม · ใครรู้รหัสจะเห็นความคืบหน้าของคุณ (ไม่มีข้อมูลส่วนตัวอื่น) อย่าแชร์รหัสในที่สาธารณะ</p>
      ${body}${msg}</div>`;
  }

  /* ---------- app data ---------- */
  const APP = { version: { version: "?", date: "", history: [] }, defaults: { settings: {} }, config: {}, blocks: [], problems: [] };
  const S = () => Object.assign({}, APP.defaults.settings, USER.settings);
  const enabledBlocks = () => APP.blocks.filter((b) => S().showSample || !b._sample);
  const visibleBlocks = () => enabledBlocks().filter((b) => !S().hiddenBlocks.includes(b.id));
  const findBlock = (id) => APP.blocks.find((b) => b.id === id);
  const docOf = (b, id) => b.lectures.find((x) => x.id === id) || b.papers.find((x) => x.id === id) || null;
  const refDoc = (r) => r.lecture || r.paper;
  const findSet = (b, sid) => b && b.sets.find((s) => s.id === sid);
  const allExams = (b) => b.exams.concat(USER.questions.filter((q) => q.block === b.id).map((q) => Object.assign({}, q, { _personal: true })));
  const examsOf = (b) => (S().showDrafts ? allExams(b) : allExams(b).filter((q) => q.answer_status === "verified" || q.answer_status === "corrected"));
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
  const stem = (q) => String(q.stem || q.case || (q.items && q.items[0] && q.items[0].prompt) || "");

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
        const sets = await Promise.all(b.exam_sets.map((sid) => getJSON(`${b._base}/exams/${sid}.json`).catch((e) => { APP.problems.push(e.message); return null; })));
        sets.forEach((set, i) => {
          if (!set) return;
          const sid = b.exam_sets[i];
          const se = V.validateExamSet(set, b);
          if (se.length) { APP.problems.push(`${id}/${sid}: ${se.slice(0, 3).join(" · ")}`); return; }
          const qs = set.questions.slice().sort((x, y) => x.n - y.n);
          qs.forEach((q) => { q._set = sid; });
          const m = set.meta || {};
          b.sets.push({ id: sid, meta: m, cohort: m.cohort || (qs[0] && qs[0].cohort) || 0, type: m.type || (qs[0] && qs[0].type) || "MCQ", title: m.title || sid, questions: qs, guide: set.guide || null });
          b.exams.push(...qs);
        });
        APP.blocks.push(b);
      } catch (e) { APP.problems.push(e.message); }
    }
  }

  /* ---------- small UI helpers ---------- */
  function armed(btn, label) { // two-click confirm, resets after 4s
    if (btn.dataset.armed) return true;
    btn.dataset.armed = "1"; const old = btn.textContent; btn.textContent = label || "กดอีกครั้งเพื่อยืนยัน"; btn.classList.add("armed");
    setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = old; btn.classList.remove("armed"); } }, 4000);
    return false;
  }
  let toastT = 0;
  function toast(msg, actLabel, act) {
    let t = $(".toastbar"); if (t) t.remove(); clearTimeout(toastT);
    t = document.createElement("div"); t.className = "toastbar"; t.setAttribute("role", "status");
    t.innerHTML = `<span>${esc(msg)}</span>${actLabel ? `<button>${esc(actLabel)}</button>` : ""}`;
    if (actLabel) t.querySelector("button").onclick = () => { act(); t.remove(); };
    document.body.append(t); toastT = setTimeout(() => t.remove(), 6000);
  }
  function applyTheme() {
    const th = S().theme || "auto";
    if (th === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = th;
    document.documentElement.classList.toggle("bigtext", S().fontSize === "large");
    try { localStorage.setItem("medlib.theme", th); } catch (e) { /* read by the inline script in index.html */ }
  }

  /* ---------- reading marks ---------- */
  const readKey = (b, id) => `${b.id}/${id}`;
  const readOf = (b, id) => PROG.read[readKey(b, id)] || null;
  function markRead(b, id, patch) { PROG.read[readKey(b, id)] = Object.assign({}, readOf(b, id) || {}, patch, { t: Date.now() }); saveProg(); }
  // pages of a document that exam questions point at → { page: {years:Set, qs:[]} }
  function examPages(b, docId) {
    const out = {};
    examsOf(b).forEach((q) => (q.refs || []).forEach((r) => {
      if (refDoc(r) !== docId) return;
      r.pages.forEach((p) => { const o = out[p] = out[p] || { years: new Set(), qs: [] }; o.years.add(q.cohort); if (!o.qs.includes(q)) o.qs.push(q); });
    }));
    return out;
  }

  /* ---------- menu + modes (ข้อสอบ / Lecture) ---------- */
  let lastBlock = null;
  function side(view, args) {
    const lecMode = view === "lec";
    const cur = ["b", "set", "pdf", "lec", "refs"].includes(view) ? args[0] : view === "q" ? (findQuestion(args[0]) || {}).b?.id : null;
    if (cur && findBlock(cur)) lastBlock = cur;
    document.querySelector(".shell").classList.toggle("lecmode", lecMode && !!args[0]);
    $("#modes").innerHTML = `<a class="mode ${lecMode ? "" : "on"}" href="${lastBlock ? `#/b/${enc(lastBlock)}` : "#/"}">ข้อสอบ</a><a class="mode ${lecMode ? "on" : ""}" href="${lastBlock ? `#/lec/${enc(lastBlock)}` : "#/lec"}">Lecture</a>`;
    const v = APP.version;
    $("#side").innerHTML = [
      `<span class="lbl">${lecMode ? "Lecture · บล็อก" : "ข้อสอบ · บล็อก"}</span>`,
      `<a class="nav ${!cur && (view === undefined || view === "" || view === "lec") ? "on" : ""}" href="${lecMode ? "#/lec" : "#/"}">ทั้งหมด</a>`,
      ...visibleBlocks().map((b) => `<a class="nav ${cur === b.id ? "on" : ""}" href="${lecMode ? `#/lec/${enc(b.id)}` : `#/b/${enc(b.id)}`}" style="--blk:${esc(b.color || "var(--artery)")}"><i class="dot"></i>${esc(b.name)}</a>`),
    ].join("");
    const th = { auto: ["◐", "ธีม: ตามเครื่อง"], light: ["☀", "ธีม: สว่าง"], dark: ["☾", "ธีม: มืด"] }[S().theme || "auto"];
    $("#tools").innerHTML = `<a class="ibtn ${view === "stats" ? "on" : ""}" href="#/stats" title="สถิติของฉัน" aria-label="สถิติ">📊</a>`
      + `<a class="ibtn ${view === "add" ? "on" : ""}" href="#/add" title="เพิ่มข้อสอบ" aria-label="เพิ่มข้อสอบ">＋</a>`
      + `<button class="ibtn" data-act="theme" title="${th[1]} (กดเพื่อสลับ)" aria-label="${th[1]}">${th[0]}</button>`
      + `<a class="ibtn ${view === "settings" ? "on" : ""}" href="#/settings" title="ตั้งค่า / ส่งออกข้อมูล · v${esc(v.version)}" aria-label="ตั้งค่า">⚙</a>`;
  }

  /* ---------- exam mode ---------- */
  const problemsBanner = () => APP.problems.length
    ? `<div class="banner"><strong>ข้อมูลบางส่วนโหลดไม่ได้</strong> เว็บข้ามส่วนนั้นไปก่อน ตรวจละเอียดด้วยคำสั่ง <code>node tools/validate.cjs</code><ul>${APP.problems.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div>` : "";

  function viewHome() {
    const blocks = visibleBlocks();
    const cards = blocks.map((b) => {
      const ex = allExams(b).filter((q) => QZ.counts(q)), res = QZ.blockResults(b);   // draft/disputed do not count
      const done = ex.filter((q) => q.id in res).length, ok = ex.filter((q) => res[q.id] >= 0.999).length, pct = ex.length ? Math.round((done / ex.length) * 100) : 0;
      return `<a class="card" href="#/b/${enc(b.id)}" style="--blk:${esc(b.color || "var(--artery)")}">
        <span class="code">${esc(b.id)}${b._sample ? `<span class="pill">ตัวอย่าง</span>` : ""}</span>
        <span class="cname">${esc(b.name)}${b.year ? ` <span class="hint">· ${esc(b.year)}</span>` : ""}</span>
        <span class="stats"><span>${b.sets.length} ชุดข้อสอบ</span><span>${allExams(b).length} ข้อ</span></span>
        <span class="meter"><span style="width:${pct}%"></span></span>
        <span class="hint">${done ? `ทำแล้ว ${done}/${ex.length} ข้อ · ถูกล่าสุด ${ok}` : "ยังไม่ได้เริ่ม"}</span></a>`;
    }).join("");
    main.innerHTML = `${problemsBanner()}
      <div class="head"><h2>ข้อสอบเก่า</h2><p class="hint">เลือกบล็อกเพื่อทำข้อสอบทีละชุดหรือฝึกข้ามชุด · อ่าน lecture ได้ที่โหมด <a href="#/lec">Lecture</a> ด้านบน · ความคืบหน้าเก็บในเบราว์เซอร์นี้</p></div>
      ${reviewBox(blocks)}
      <div class="grid">${cards || `<div class="card empty"><span>ไม่มีบล็อกที่แสดงอยู่</span><a href="#/settings">เปิดการแสดงบล็อกในหน้าตั้งค่า</a></div>`}</div>`;
  }

  // "ทบทวนวันนี้": one button per block with questions due; hidden when the queue is empty
  function reviewBox(blocks) {
    const rc = blocks.map((b) => [b, QZ.reviewCounts(b)]).filter(([, c]) => c.queued);
    if (!rc.length) return "";
    const due = rc.filter(([, c]) => c.due), queued = rc.reduce((a, [, c]) => a + c.queued, 0);
    return `<div class="reviewbox" id="review"><b>ทบทวนวันนี้</b>
      ${due.length ? `<div class="btns">${due.map(([b, c]) => `<button class="btn primary" data-z="review" data-b="${esc(b.id)}">${esc(b.name)} · ${c.due} ข้อ</button>`).join("")}</div>`
        : `<span class="hint">ยังไม่มีข้อครบกำหนดวันนี้ · ในคิว ${queued} ข้อ</span>`}
      <span class="hint">ข้อที่ตอบผิดหรือปักธงจะกลับมาใน 1 → 3 → 7 วัน ตอบถูกครบ 3 ครั้งออกจากคิว</span></div>`;
  }

  function notFound(msg) { main.innerHTML = `<div class="note"><h3>${esc(msg)}</h3><a href="#/">กลับหน้าแรก</a></div>`; }

  function viewBlock(id) {
    const b = findBlock(id);
    if (!b) return notFound(`ไม่พบบล็อก ${id}`);
    const nSetQ = b.sets.reduce((a, s) => a + s.questions.length, 0);
    const mine = USER.questions.filter((q) => q.block === b.id);
    main.innerHTML = `<div class="crumbs"><a href="#/">ข้อสอบ</a><span>/</span><span>${esc(b.name)}</span></div>
      <div class="head blockhead" style="--blk:${esc(b.color || "var(--artery)")}"><h2><i class="dot"></i>${esc(b.name)}</h2>
        <p class="hint">${nSetQ} ข้อ${b._sample ? " · ข้อมูลตัวอย่าง" : ""}</p></div>
      ${QZ.examTabHTML(b)}
      ${mine.length ? `<h3>ข้อที่ฉันเพิ่มเอง (${mine.length})</h3><div class="rows">${mine.map((e) => `<a class="row" href="#/q/${enc(e.id)}"><span class="id">ชุด ${e.cohort} · ข้อ ${e.n}</span><span class="t">${esc(stem(e).slice(0, 80))}</span><span class="meta"><span class="pill">ของฉัน</span></span></a>`).join("")}</div>` : ""}`;
  }

  // Exam mode list of the questions that point at a lecture (or one page of it)
  function viewRefs(bid, lid, page) {
    const b = findBlock(bid); const l = b && b.lectures.find((x) => x.id === lid);
    if (!l) return notFound("ไม่พบ lecture นี้");
    const p = Number(page) || 0;
    const qs = examsOf(b).filter((e) => (e.refs || []).some((r) => r.lecture === l.id && (!p || r.pages.includes(p))));
    main.innerHTML = `<div class="crumbs"><a href="#/">ข้อสอบ</a><span>/</span><a href="#/b/${enc(b.id)}">${esc(b.name)}</a><span>/</span><span>${esc(l.id)}${p ? ` หน้า ${p}` : ""}</span></div>
      <div class="head"><h2>ข้อสอบที่อ้างถึง ${esc(l.id)}${p ? ` หน้า ${p}` : ""}</h2><p class="hint">${esc(l.title)} · ${qs.length} ข้อ · <a href="#/lec/${enc(b.id)}/${enc(l.id)}/${p || 1}">กลับไปอ่าน lecture</a></p></div>
      <div class="rows">${qs.map((e) => { const x = e.refs.find((y) => y.lecture === l.id); return `<a class="row" href="#/q/${enc(e.id)}"><span class="id">ชุด ${e.cohort} · ${e.type} ข้อ ${QZ.qPos(e)}</span><span class="t">${esc(stem(e).slice(0, 110))}…<span class="sub">หน้า ${pagesText(x.pages)}${x.focus ? " · " + esc(x.focus) : ""}</span></span></a>`; }).join("") || `<p class="hint">ยังไม่มีข้อสอบที่อ้างถึง</p>`}</div>`;
  }

  /* ---------- lecture mode (CVS-style: list on the left, continuous PDF on the right) ---------- */
  function viewLecHome() {
    const blocks = visibleBlocks().filter((b) => b.lectures.length);
    const cards = blocks.map((b) => {
      const n = b.lectures.length, done = b.lectures.filter((l) => (readOf(b, l.id) || {}).done).length, pct = Math.round((done / n) * 100);
      const last = lastRead(b);
      return `<a class="card" href="#/lec/${enc(b.id)}" style="--blk:${esc(b.color || "var(--artery)")}">
        <span class="code">${esc(b.id)}${b._sample ? `<span class="pill">ตัวอย่าง</span>` : ""}</span>
        <span class="cname">${esc(b.name)}</span>
        <span class="stats"><span>${n} บท</span><span>${b.lectures.reduce((a, l) => a + l.pages, 0)} หน้า</span></span>
        <span class="meter"><span style="width:${pct}%"></span></span>
        <span class="hint">อ่านจบ ${done}/${n} บท${last ? ` · ล่าสุด ${esc(last.l.id)} หน้า ${last.r.page}` : ""}</span></a>`;
    }).join("");
    main.innerHTML = `<div class="head"><h2>Lecture</h2><p class="hint">เลือกบล็อกเพื่ออ่าน lecture · ติ๊กอ่านจบ อ่านต่อจากหน้าที่ค้าง และดูแผนอ่านว่าหน้าไหนออกสอบบ่อย</p></div>
      ${reviewBox(blocks)}
      <div class="grid">${cards || `<div class="card empty"><span>ยังไม่มีบล็อกที่มี lecture</span></div>`}</div>`;
  }
  function lastRead(b) {
    return b.lectures.map((l) => ({ l, r: readOf(b, l.id) })).filter((x) => x.r && x.r.page && !x.r.done).sort((x, y) => y.r.t - x.r.t)[0] || null;
  }
  const lecFilter = { q: "" };
  function lecListHTML(b, lid) {
    const ex = examsOf(b), q = lecFilter.q.trim().toLowerCase();
    return b.lectures.filter((l) => !q || (l.id + " " + l.title).toLowerCase().includes(q)).map((l) => {
      const r = readOf(b, l.id) || {}, n = ex.filter((e) => (e.refs || []).some((x) => x.lecture === l.id)).length;
      return `<div class="lecitem ${l.id === lid ? "on" : ""} ${r.done ? "isdone" : ""}"><button class="readchk" data-read="${esc(l.id)}" aria-pressed="${!!r.done}" title="${r.done ? "อ่านจบแล้ว (กดเพื่อยกเลิก)" : "ติ๊กว่าอ่านจบแล้ว"}">${r.done ? "✓" : ""}</button>
        <a href="#/lec/${enc(b.id)}/${enc(l.id)}${r.page && !r.done ? "/" + r.page : ""}"><span class="lid">${esc(l.id)}</span> ${esc(l.title)}<span class="sub">${l.pages} หน้า${r.page && !r.done ? ` · อ่านถึงหน้า ${r.page}` : ""}${n ? ` · <span class="hotn">ออกสอบ ${n}</span>` : ""}${l.drive_file_id || l.file || l.url ? "" : " · ยังไม่มีไฟล์"}</span></a></div>`;
    }).join("") || `<p class="hint" style="padding:10px">ไม่พบ lecture</p>`;
  }
  function lecHeadHTML(b, lid) {
    const n = b.lectures.length, done = b.lectures.filter((l) => (readOf(b, l.id) || {}).done).length, pct = n ? Math.round((done / n) * 100) : 0;
    return `<div class="lechead">
      <select data-lecblock="1" aria-label="บล็อก">${visibleBlocks().filter((x) => x.lectures.length).map((x) => `<option value="${esc(x.id)}" ${x.id === b.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select>
      <div class="lecprog"><span>อ่านจบ ${done}/${n} บท (${pct}%)</span><span class="meter"><span style="width:${pct}%"></span></span></div>
      <div class="lecbtns"><a class="btn sm ${lid === "plan" ? "primary" : ""}" href="#/lec/${enc(b.id)}/plan">แผนอ่าน</a><a class="btn sm" href="#/b/${enc(b.id)}">ข้อสอบบล็อกนี้</a></div>
      <input type="search" data-lecfilter="1" placeholder="ค้นชื่อ lecture…" value="${esc(lecFilter.q)}" autocomplete="off"></div>`;
  }
  function ensureLecShell(b, lid) {
    if (main.dataset.lec !== b.id || !$("#lecside")) {
      RD.close();
      main.dataset.lec = b.id;
      main.innerHTML = `<div class="lec" id="lec"><aside class="lecside" id="lecside"><div id="lechead"></div><div class="leclist" id="leclist"></div></aside><section class="lecmain" id="lecmain"></section><button class="lecscrim" data-act="drawer" aria-label="ปิดรายชื่อ"></button></div>`;
    }
    $("#lechead").innerHTML = lecHeadHTML(b, lid);
    const list = $("#leclist"), st = list.scrollTop;
    list.innerHTML = lecListHTML(b, lid);
    list.scrollTop = st;
    const on = list.querySelector(".lecitem.on");
    if (on && (on.offsetTop < list.scrollTop || on.offsetTop > list.scrollTop + list.clientHeight - 40)) list.scrollTop = on.offsetTop - 80;
  }
  function viewLec(bid, lid, page) {
    const b = findBlock(bid);
    if (!b) return notFound(`ไม่พบบล็อก ${bid}`);
    if (!b.lectures.length) return notFound(`บล็อก ${b.name} ยังไม่มี lecture`);
    ensureLecShell(b, lid);
    $("#lec").classList.remove("drawer");
    const pane = $("#lecmain");
    if (lid === "plan") {
      RD.close();
      pane.innerHTML = `<div class="lecpad"><div class="lectop"><button class="btn sm drawerbtn" data-act="drawer">☰ รายชื่อ</button><h2>แผนอ่าน · ${esc(b.name)}</h2></div>${QZ.planHTML(b)}</div>`;
      pane.scrollTop = 0; return;
    }
    const l = lid && b.lectures.find((x) => x.id === lid);
    if (!l) {
      RD.close();
      const last = lastRead(b);
      pane.innerHTML = `<div class="lecpad"><div class="lectop"><button class="btn sm drawerbtn" data-act="drawer">☰ รายชื่อ</button><h2>${esc(b.name)}</h2></div>
        <p class="hint">เลือก lecture จากรายการ${matchMedia("(max-width: 760px)").matches ? " (กด ☰ รายชื่อ)" : "ด้านซ้าย"} · ติ๊ก ✓ เมื่ออ่านจบ · หน้าที่เคยออกสอบจะมีป้ายสีแดง</p>
        <div class="btns">${last ? `<a class="btn primary" href="#/lec/${enc(b.id)}/${enc(last.l.id)}/${last.r.page}">อ่านต่อ: ${esc(last.l.id)} หน้า ${last.r.page}</a>` : `<a class="btn primary" href="#/lec/${enc(b.id)}/${enc(b.lectures[0].id)}">เริ่มอ่าน ${esc(b.lectures[0].id)}</a>`}<a class="btn" href="#/lec/${enc(b.id)}/plan">ดูแผนอ่าน</a></div></div>`;
      return;
    }
    RD.open(b, l, Math.max(1, Number(page) || (readOf(b, l.id) || {}).page || 1));
  }

  // Continuous-scroll reader: page boxes are laid out first, canvases render when they come near the screen.
  const RD = {
    b: null, l: null, key: null, doc: null, token: 0, zoom: 1, base: null, obs: null, cur: 1, rendered: new Set(), saveT: 0, text: null,
    close() { this.token++; if (this.obs) this.obs.disconnect(); this.obs = null; if (this.doc) this.doc.destroy(); Object.assign(this, { doc: null, key: null, text: null, rendered: new Set() }); },
    pane() { return $("#lecpages"); },
    scale() { const p = this.pane(); return Math.max(0.3, ((p ? p.clientWidth : 800) - 40) / this.base.width) * this.zoom; },
    async open(b, l, page) {
      const key = b.id + "/" + l.id;
      if (this.key === key && $("#lecpages")) { this.goto(page); return; }
      this.close();
      Object.assign(this, { b, l, key, cur: page, zoom: 1 });
      const token = ++this.token;
      const ix = b.lectures.indexOf(l), prev = b.lectures[ix - 1], next = b.lectures[ix + 1];
      const r = readOf(b, l.id) || {};
      $("#lecmain").innerHTML = `<div class="rdbar">
          <button class="btn sm drawerbtn" data-act="drawer" title="รายชื่อ lecture">☰</button>
          ${prev ? `<a class="btn sm" href="#/lec/${enc(b.id)}/${enc(prev.id)}" title="lecture ก่อนหน้า: ${esc(prev.title)}">‹ ${esc(prev.id)}</a>` : ""}
          <span class="rdtitle"><b>${esc(l.id)}</b> ${esc(l.title)}</span>
          ${next ? `<a class="btn sm" href="#/lec/${enc(b.id)}/${enc(next.id)}" title="lecture ถัดไป: ${esc(next.title)}">${esc(next.id)} ›</a>` : ""}
          <button class="btn sm" data-read="${esc(l.id)}" aria-pressed="${!!r.done}">${r.done ? "✓ อ่านจบแล้ว" : "อ่านจบแล้ว"}</button>
        </div>
        <div class="rdbar sub">
          <button class="btn sm" data-pg="-1" aria-label="หน้าก่อน">‹</button><input id="pgin" type="number" min="1" value="${page}" aria-label="เลขหน้า"><span id="pgtotal" class="hint">/ ${l.pages}</span><button class="btn sm" data-pg="1" aria-label="หน้าถัดไป">›</button>
          <span class="zoom"><button class="btn sm" data-zm="-1" aria-label="ย่อ">−</button><button class="btn sm" data-zm="0" id="zlabel" title="พอดีความกว้าง">พอดี</button><button class="btn sm" data-zm="1" aria-label="ขยาย">+</button></span>
          ${(l.page_index || []).length ? `<button class="btn sm" data-act="toc">สารบัญ</button>` : ""}
          <button class="btn sm srchbtn" data-act="rdsearch" aria-label="ค้นในไฟล์นี้">⌕</button>
          <form class="pdfsearch" data-pdfsearch="1"><input type="search" id="pdfq" placeholder="ค้นในไฟล์นี้" autocomplete="off"><button class="btn sm">ค้น</button></form>
          <span id="pdfinfo" class="hint"></span>
        </div>
        ${hotStripHTML(b, l)}
        <div id="examnote"></div><div id="toc"></div><div id="pdfhits"></div>
        <div class="lecpages" id="lecpages"><p class="status">กำลังโหลด…</p></div>`;
      markRead(b, l.id, { page });
      this.note();
      const src = pdfSource(b, l), pane = this.pane();
      const status = (m, err) => { if (token === this.token) pane.innerHTML = `<p class="status ${err ? "err" : ""}">${esc(m)}</p>`; };
      if (!src) return status("บทนี้ยังไม่มีไฟล์ PDF ใส่ drive_file_id หรือ url ของบทนี้ใน block.json แล้วจะเปิดได้", true);
      if (!window.pdfjsLib) return status("โหลดตัวอ่าน PDF ไม่ได้ ต้องมีโฟลเดอร์ vendor อยู่ข้าง index.html", true);
      try {
        const rec = await idbGet(src.id).catch(() => null);
        let blob = rec && rec.blob, cached = !!blob;
        if (!blob) {
          if (!src.url && l.drive_file_id) {
            $("#pdfinfo").textContent = `เปิดผ่าน Google Drive — เลื่อนไปหน้า ${page} เอง`;
            pane.innerHTML = `<iframe class="drivepreview" src="https://drive.google.com/file/d/${enc(l.drive_file_id)}/preview" title="PDF จาก Google Drive"></iframe>`; return;
          }
          if (!src.url) throw new Error("ยังไม่ได้ตั้งค่าการดึงไฟล์จาก Google Drive");
          blob = await download(src, (pct) => status(`กำลังดาวน์โหลดจาก ${src.from}… ${pct}%`));
          await idbPut({ id: src.id, blob, saved: Date.now() }).catch(() => {});
          cached = true;
        }
        if (token !== this.token) return;
        const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false }).promise;
        if (token !== this.token) { doc.destroy(); return; }
        this.doc = doc;
        this.base = (await doc.getPage(1)).getViewport({ scale: 1 });
        $("#pgtotal").textContent = `/ ${doc.numPages}`; $("#pgin").max = doc.numPages;
        $("#pdfinfo").textContent = cached ? "เก็บไว้ในเครื่องแล้ว อ่านได้แม้ไม่มีเน็ต" : "";
        this.layout(Math.min(page, doc.numPages));
      } catch (e) { status(e.message || "เปิดไฟล์นี้ไม่ได้", true); }
    },
    layout(page) {
      const pane = this.pane(); if (!pane || !this.doc) return;
      if (this.obs) this.obs.disconnect();
      this.rendered = new Set();
      const s = this.scale(), w = Math.floor(this.base.width * s), h = Math.floor(this.base.height * s);
      const ep = examPages(this.b, this.l.id);
      pane.innerHTML = Array.from({ length: this.doc.numPages }, (_, i) => `<div class="pgbox ${ep[i + 1] ? "examined" : ""}" data-n="${i + 1}" style="width:${w}px;height:${h}px">${ep[i + 1] ? `<span class="pgtag">ออกสอบ ${[...ep[i + 1].years].sort().join(", ")}</span>` : ""}<span class="pgnum">${i + 1}</span></div>`).join("");
      $("#zlabel").textContent = this.zoom === 1 ? "พอดี" : `${Math.round(this.zoom * 100)}%`;
      this.obs = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) this.draw(e.target); }), { root: pane, rootMargin: "900px 0px" });
      pane.querySelectorAll(".pgbox").forEach((d) => this.obs.observe(d));
      pane.onscroll = () => this.onScroll();
      this.goto(page);
    },
    async draw(box) {
      const n = Number(box.dataset.n); if (this.rendered.has(n) || !this.doc) return;
      this.rendered.add(n);
      const token = this.token, pg = await this.doc.getPage(n);
      if (token !== this.token) return;
      const vp = pg.getViewport({ scale: this.scale() }), dpr = Math.min(window.devicePixelRatio || 1, 2);
      const c = document.createElement("canvas");
      c.width = Math.floor(vp.width * dpr); c.height = Math.floor(vp.height * dpr);
      c.style.width = Math.floor(vp.width) + "px"; c.style.height = Math.floor(vp.height) + "px";
      try { await pg.render({ canvasContext: c.getContext("2d"), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise; } catch (e) { this.rendered.delete(n); return; }
      if (token !== this.token || !box.isConnected) return;
      const old = box.querySelector("canvas"); if (old) old.remove();
      // real page size may differ from the placeholder: keep what is on screen still
      const pane = this.pane(), oldH = box.offsetHeight, above = box.offsetTop + oldH <= pane.scrollTop + 1;
      box.style.width = c.style.width; box.style.height = c.style.height;
      if (above) pane.scrollTop += box.offsetHeight - oldH;
      box.prepend(c);
      if (this.pending === n) { pane.scrollTop = box.offsetTop - 8; this.pending = 0; }
    },
    onScroll() {
      const pane = this.pane(); if (!pane) return;
      const y = pane.scrollTop + pane.clientHeight * 0.3;
      let n = 1;
      for (const d of pane.children) { if (d.offsetTop <= y) n = Number(d.dataset.n) || n; else break; }
      // free canvases far from the screen (phones run out of memory on long lectures)
      this.rendered.forEach((k) => { if (Math.abs(k - n) > 10) { const d = pane.querySelector(`.pgbox[data-n="${k}"]`); const c = d && d.querySelector("canvas"); if (c) c.remove(); this.rendered.delete(k); } });
      if (n === this.cur) return;
      this.cur = n;
      const inp = $("#pgin"); if (inp && document.activeElement !== inp) inp.value = n;
      history.replaceState(null, "", `#/lec/${enc(this.b.id)}/${enc(this.l.id)}/${n}`); lastHash = location.hash;
      this.note();
      clearTimeout(this.saveT); const b = this.b, l = this.l; this.saveT = setTimeout(() => markRead(b, l.id, { page: n }), 600);
    },
    goto(page) {
      const pane = this.pane(), d = pane && pane.querySelector(`.pgbox[data-n="${page}"]`);
      if (!d) return;
      pane.scrollTop = d.offsetTop - 8;
      this.pending = this.rendered.has(page) ? 0 : page;
      this.cur = 0; this.onScroll();
    },
    note() {
      const el = $("#examnote"); if (!el || !this.b) return;
      const e = examPages(this.b, this.l.id)[this.cur || 1];
      el.innerHTML = e ? `<div class="examnote sm">หน้า ${this.cur || 1} เคยออกสอบ ชุด ${[...e.years].sort().join(", ")} · <a href="#/refs/${enc(this.b.id)}/${enc(this.l.id)}/${this.cur || 1}">ดูข้อสอบที่อ้างถึงหน้านี้ (${e.qs.length})</a></div>` : "";
      document.querySelectorAll(".hotpages .hp").forEach((a) => a.classList.toggle("cur", Number(a.dataset.hp) === this.cur));
    },
    zoomBy(d) {
      if (!this.doc) return;
      const steps = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 2, 2.5];
      const i = steps.indexOf(this.zoom);
      this.zoom = d === 0 ? 1 : steps[Math.max(0, Math.min(steps.length - 1, (i < 0 ? 3 : i) + d))];
      this.layout(this.cur || 1);
    },
  };
  function hotStripHTML(b, l) {
    const ep = examPages(b, l.id), hot = Object.keys(ep).map(Number).sort((x, y) => x - y);
    return hot.length ? `<div class="hotpages"><span class="hint">หน้าที่เคยออกสอบ:</span>${hot.map((p) => `<a class="hp" data-hp="${p}" href="#/lec/${enc(b.id)}/${enc(l.id)}/${p}" title="ออกปี ${[...ep[p].years].sort().join(", ")}">${p}</a>`).join("")}</div>` : "";
  }
  function tocHTML(b, l) {
    const ep = examPages(b, l.id);
    return `<div class="tocs">${(l.page_index || []).map((p) => `<a class="toc ${ep[p.page] ? "hotpage" : ""}" href="#/lec/${enc(b.id)}/${enc(l.id)}/${p.page}"><span class="pg">${p.page}</span><span><b>${esc(p.heading)}</b>${p.summary ? `<span class="sub">${esc(p.summary)}</span>` : ""}</span>${ep[p.page] ? `<span class="pill exam">ออกสอบ</span>` : ""}</a>`).join("")}</div>`;
  }

  function viewSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) return viewHome();
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const hl = (s) => esc(s).replace(re, (m) => `<mark>${m}</mark>`);
    const hits = [];
    visibleBlocks().forEach((b) => {
      b.lectures.forEach((l) => {
        if (l.title.toLowerCase().includes(q)) hits.push({ kind: "lec", b, l });
        (l.page_index || []).forEach((p) => {
          const hay = [p.heading, p.summary, (p.keywords || []).join(" ")].join(" ").toLowerCase();
          if (hay.includes(q)) hits.push({ kind: "page", b, l, p });
        });
      });
      examsOf(b).forEach((e) => {
        const hay = [stem(e), e.case || "", e.explanation || "", e.key_concept || "", (e.tags || []).join(" "), e.options ? Object.values(e.options).join(" ") : "",
          (e.items || []).map((i) => [i.prompt, (i.accepted || []).join(" "), i.explanation || ""].join(" ")).join(" ")].join(" ").toLowerCase();
        if (hay.includes(q)) hits.push({ kind: "exam", b, e });
      });
    });
    const order = { lec: 0, page: 1, exam: 2 };
    hits.sort((x, y) => order[x.kind] - order[y.kind]);
    const rows = hits.slice(0, 300).map((h) => h.kind === "lec"
      ? `<a class="row" href="#/lec/${enc(h.b.id)}/${enc(h.l.id)}"><span class="id">${esc(h.b.id)} · ${esc(h.l.id)}</span><span class="t">${hl(h.l.title)}<span class="sub">Lecture · ${h.l.pages} หน้า</span></span><span class="meta"><span class="pill">lecture</span></span></a>`
      : h.kind === "page"
        ? `<a class="row" href="#/lec/${enc(h.b.id)}/${enc(h.l.id)}/${h.p.page}"><span class="id">${esc(h.l.id)} · หน้า ${h.p.page}</span><span class="t">${hl(h.p.heading)}<span class="sub">${hl(h.p.summary || "")}</span></span><span class="meta"><span class="pill">หน้า lecture</span></span></a>`
        : `<a class="row" href="#/q/${enc(h.e.id)}"><span class="id">${esc(h.b.id)} · ชุด ${h.e.cohort} · ${h.e.type}</span><span class="t">${hl(stem(h.e).slice(0, 110))}…<span class="sub">${hl((h.e.tags || []).join(" · "))}</span></span><span class="meta"><span class="pill exam">ข้อสอบ</span></span></a>`).join("");
    main.innerHTML = `<div class="head"><h2>ผลค้นหา "${esc(query)}"</h2><p class="hint">${hits.length} รายการ${hits.length > 300 ? " (แสดง 300 รายการแรก)" : ""} · ค้นจากชื่อบท สารบัญรายหน้าของ lecture โจทย์ ตัวเลือก คำอธิบาย และ tag · ค้นในเนื้อหา PDF ทั้งไฟล์ได้จากช่องค้นหาในตัวอ่าน PDF</p></div>
      <div class="rows">${rows || `<p class="hint">ไม่พบ ลองใช้คำอื่น หรือสะกดเป็นภาษาอังกฤษ</p>`}</div>`;
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
    if (l.url) return { id: "url:" + l.url, from: "เว็บต้นทาง", url: l.url };
    if (l.file) return { id: "file:" + b._base + "/" + l.file, from: "ไฟล์ในโปรเจกต์", url: b._base + "/" + l.file.split("/").map(enc).join("/") };
    return null;
  }

  const P = { doc: null, docId: null, task: null, token: 0, page: 1, cached: false, text: null, textFor: null };
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
    const isPaper = b.papers.includes(l);
    const ep = examPages(b, l.id);
    const qs = (ep[page] || { qs: [] }).qs;
    const shellKey = `${bid}/${lid}`;
    if (!isPaper) markRead(b, l.id, { page });
    if (!$("#pdfstage") || main.dataset.pdf !== shellKey) {
      main.dataset.pdf = shellKey;
      const hot = Object.keys(ep).map(Number).sort((x, y) => x - y);
      const r = readOf(b, l.id) || {};
      main.innerHTML = `<div class="crumbs"><a href="#/">ทั้งหมด</a><span>/</span><a href="#/b/${enc(b.id)}${isPaper ? "/exam" : "/lec"}">${esc(b.name)}</a><span>/</span>${isPaper ? `<span>${esc(l.title)}</span>` : `<a href="#/l/${enc(b.id)}/${enc(l.id)}">${esc(l.id)}</a>`}<span>/</span><span id="pgcrumb">หน้า ${page}</span></div>
        <div class="pdfbar">
          <button class="btn" data-pg="-1" aria-label="หน้าก่อน">‹</button>
          <label for="pgin" class="hint">หน้า</label><input id="pgin" type="number" min="1" value="${page}"><span id="pgtotal" class="hint">/ ${l.pages}</span>
          <button class="btn" data-pg="1" aria-label="หน้าถัดไป">›</button>
          <span class="ptitle">${esc(l.title)}</span>
          ${isPaper ? "" : `<button class="btn sm" data-read="${esc(l.id)}" aria-pressed="${!!r.done}">${r.done ? "✓ อ่านจบแล้ว" : "อ่านจบแล้ว"}</button>`}
          <form class="pdfsearch" data-pdfsearch="1"><input type="search" id="pdfq" placeholder="ค้นในไฟล์นี้" autocomplete="off"><button class="btn sm">ค้น</button></form>
          <span id="pdfinfo" class="hint"></span>
        </div>
        <div id="pdfhits"></div>
        ${hot.length ? `<div class="hotpages"><span class="hint">${isPaper ? "หน้าที่มีข้อสอบ:" : "หน้าที่เคยออกสอบ:"}</span>${hot.map((p) => `<a class="hp" data-hp="${p}" href="#/pdf/${enc(b.id)}/${enc(l.id)}/${p}" title="ออกปี ${[...ep[p].years].sort().join(", ")}">${p}</a>`).join("")}</div>` : ""}
        <div id="pdfrefs"></div>
        <div class="pdfstage" id="pdfstage"><p class="status">กำลังโหลด…</p></div>`;
    }
    $("#pgcrumb").textContent = `หน้า ${page}`;
    $("#pgin").value = page;
    document.querySelectorAll(".hotpages .hp").forEach((a) => a.classList.toggle("cur", Number(a.dataset.hp) === page));
    $("#pdfrefs").innerHTML = qs.length ? `<div class="examnote"><b>${isPaper ? "ข้อในหน้านี้" : `หน้านี้เคยออกสอบ (ชุด ${[...ep[page].years].sort().join(", ")})`}</b>${qs.map((e) => `<a class="pill exam" href="#/q/${enc(e.id)}">ชุด ${e.cohort} ${e.type} ข้อ ${QZ.qPos(e)}</a>`).join("")}</div>` : "";
    if (!src) return pdfStatus("บทนี้ยังไม่มีไฟล์ PDF ใส่ drive_file_id หรือ url ของบทนี้ใน block.json แล้วจะเปิดได้", true);
    if (!window.pdfjsLib) return pdfStatus("โหลดตัวอ่าน PDF ไม่ได้ ต้องมีโฟลเดอร์ vendor อยู่ข้าง index.html", true);
    const token = ++P.token;
    try {
      if (P.docId !== src.id) {
        if (P.doc) { P.doc.destroy(); P.doc = null; P.docId = null; }
        P.text = null; P.textFor = null;
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
      $("#pdfinfo").textContent = P.cached ? "เก็บไว้ในเครื่องแล้ว เปิดได้แม้ไม่มีเน็ต" : "";
      P.page = Math.min(Math.max(1, page), n);
      await renderPage(token);
    } catch (e) {
      if (token === P.token) pdfStatus(e.message || "เปิดไฟล์นี้ไม่ได้ ไฟล์อาจเสียหรือไม่ใช่ PDF", true);
    }
  }

  // Search the text of the open PDF (text is read page by page the first time, then kept while the file is open)
  async function pdfSearch(query) {
    const box = $("#pdfhits"); if (!box) return;
    const q = query.trim().toLowerCase();
    if (!q) { box.innerHTML = ""; return; }
    const [view, bid, lid] = parseHash();
    const S2 = view === "lec" ? RD : P, doc = S2.doc;  // lecture reader or exam-paper viewer
    if (!doc) { box.innerHTML = `<p class="hint">รอให้ไฟล์โหลดเสร็จก่อน (ไฟล์ที่เปิดผ่าน Google Drive preview ค้นไม่ได้)</p>`; return; }
    if (!S2.text || S2.textDoc !== doc) {
      const text = [];
      for (let i = 1; i <= doc.numPages; i++) {
        if (i % 5 === 1) box.innerHTML = `<p class="hint">กำลังอ่านข้อความ หน้า ${i}/${doc.numPages}…</p>`;
        const pg = await doc.getPage(i);
        const tc = await pg.getTextContent();
        text.push(tc.items.map((x) => x.str).join(" ").replace(/\s+/g, " "));
      }
      S2.text = text; S2.textDoc = doc;
    }
    const hits = [];
    S2.text.forEach((t, i) => {
      const at = t.toLowerCase().indexOf(q);
      if (at >= 0) hits.push({ page: i + 1, snip: t.slice(Math.max(0, at - 50), at + q.length + 70) });
    });
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    box.innerHTML = `<div class="pdfhits"><b>พบใน ${hits.length} หน้า</b>${hits.length ? "" : `<span class="hint"> · ถ้าไฟล์เป็นภาพสแกนจะค้นข้อความไม่ได้</span>`}<button class="linkbtn" data-act="closehits">ปิด</button>
      ${hits.slice(0, 80).map((h) => `<a href="#/${view === "lec" ? "lec" : "pdf"}/${enc(bid)}/${enc(lid)}/${h.page}"><span class="pg">หน้า ${h.page}</span> …${esc(h.snip).replace(re, (m) => `<mark>${m}</mark>`)}…</a>`).join("")}</div>`;
  }

  // Fallback when the site has neither a Worker nor a key (e.g. GitHub Pages before the Worker is set up):
  // embed Google Drive's preview of a file shared "anyone with the link". It cannot jump to a page.
  function drivePreview(fileId, page, token) {
    if (token !== P.token) return;
    if (P.doc) { P.doc.destroy(); P.doc = null; }
    P.docId = null;
    const stage = $("#pdfstage"); if (!stage) return;
    $("#pdfinfo").textContent = `เปิดผ่าน Google Drive — เลื่อนไปหน้า ${page} เอง`;
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

  /* ---------- PDF pop-up over the question (exam / answer-key papers) ----------
     Opens on the question's page with zoom and page buttons. ✕, Esc or the browser's Back button closes it
     and leaves you on the same question (it pushes one history entry and closes on popstate). */
  const POP = { doc: null, docId: null, page: 1, zoom: 1, token: 0, open: false };
  async function openPdfPop(bid, lid, page) {
    const b = findBlock(bid); const l = b && docOf(b, lid);
    if (!l) return toast("ไม่พบไฟล์ PDF นี้");
    closePdfPop(true);
    POP.open = true; POP.page = Math.max(1, Number(page) || 1); POP.zoom = 1; const token = ++POP.token;
    const el = document.createElement("div");
    el.className = "pdfpop"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", l.title || "PDF");
    el.innerHTML = `<div class="popbox"><div class="popbar">
        <b class="poptitle">${esc(l.title || l.id)}</b>
        <span class="popnav"><button class="btn sm" data-pop="prev" aria-label="หน้าก่อน">‹</button><span id="poppg" class="hint">หน้า ${POP.page}</span><button class="btn sm" data-pop="next" aria-label="หน้าถัดไป">›</button></span>
        <span class="popzoom"><button class="btn sm" data-pop="zout" aria-label="ย่อ">−</button><button class="btn sm" data-pop="zin" aria-label="ขยาย">+</button></span>
        <button class="btn sm popclose" data-pop="close" aria-label="ปิด">✕</button></div>
      <div class="popstage" id="popstage"><p class="status">กำลังโหลด…</p></div></div>`;
    document.body.appendChild(el); document.body.classList.add("noscroll");
    history.pushState({ pdfpop: true }, "");
    const src = pdfSource(b, l);
    const stage = $("#popstage");
    try {
      if (!src) throw new Error("ไฟล์นี้ยังไม่มีลิงก์ PDF");
      if (POP.docId !== src.id) {
        if (POP.doc) { POP.doc.destroy(); POP.doc = null; POP.docId = null; }
        const rec = await idbGet(src.id).catch(() => null);
        let blob = rec && rec.blob;
        if (!blob) {
          if (!src.url && l.drive_file_id) {   // no Worker / key: Google's viewer cannot jump to a page
            if (token !== POP.token) return;
            stage.innerHTML = `<p class="hint popnote">เปิดผ่าน Google Drive — เลื่อนไปหน้า ${POP.page} เอง</p><iframe class="drivepreview" src="https://drive.google.com/file/d/${enc(l.drive_file_id)}/preview" title="PDF จาก Google Drive"></iframe>`;
            el.classList.add("iframe"); return;
          }
          if (!src.url) throw new Error("ยังไม่ได้ตั้งค่าการดึงไฟล์");
          blob = await download(src, (pct) => { if (token === POP.token) stage.innerHTML = `<p class="status">กำลังดาวน์โหลด… ${pct}%</p>`; });
          await idbPut({ id: src.id, blob, saved: Date.now() }).catch(() => {});
        }
        if (token !== POP.token) return;
        const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false }).promise;
        if (token !== POP.token) { doc.destroy(); return; }
        POP.doc = doc; POP.docId = src.id;
      }
      POP.page = Math.min(POP.page, POP.doc.numPages);
      await popRender(token);
    } catch (e) {
      if (token === POP.token) stage.innerHTML = `<p class="status err">${esc(e.message || "เปิดไฟล์นี้ไม่ได้")}</p>`;
    }
  }
  async function popRender(token) {
    const stage = $("#popstage"); if (!stage || !POP.doc || token !== POP.token) return;
    const page = await POP.doc.getPage(POP.page);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(4, (Math.max(240, stage.clientWidth - 16) / base.width) * POP.zoom);
    const vp = page.getViewport({ scale }), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(vp.width * dpr); canvas.height = Math.floor(vp.height * dpr); canvas.style.width = Math.floor(vp.width) + "px";
    await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise;
    if (token !== POP.token) return;
    stage.replaceChildren(canvas); stage.scrollTop = 0;
    $("#poppg").textContent = `หน้า ${POP.page} / ${POP.doc.numPages}`;
  }
  function popAction(a) {
    if (a === "close") { history.back(); return; }
    if (!POP.doc) return;
    if (a === "prev" || a === "next") POP.page = Math.min(POP.doc.numPages, Math.max(1, POP.page + (a === "next" ? 1 : -1)));
    if (a === "zin") POP.zoom = Math.min(3, POP.zoom + 0.25);
    if (a === "zout") POP.zoom = Math.max(0.5, POP.zoom - 0.25);
    popRender(POP.token);
  }
  function closePdfPop(silent) {
    const el = $(".pdfpop"); if (!el) return false;
    POP.open = false; POP.token++; el.remove(); document.body.classList.remove("noscroll");
    return !silent;
  }
  window.addEventListener("popstate", () => { if (POP.open) closePdfPop(); });
  document.addEventListener("click", (ev) => {
    const a = ev.target.closest("a[data-pdfpop]");
    if (a && !ev.ctrlKey && !ev.metaKey && !ev.shiftKey) { ev.preventDefault(); const [bid, lid, pg] = a.dataset.pdfpop.split("|"); openPdfPop(bid, lid, pg); return; }
    const pb = ev.target.closest("[data-pop]"); if (pb) { popAction(pb.dataset.pop); return; }
    if (ev.target.classList && ev.target.classList.contains("pdfpop")) history.back();   // click on the dimmed backdrop
  }, true);

  /* ---------- settings + personal data file ---------- */
  let toastMsg = null;
  async function viewSettings(section) {
    const s = S(); const d = APP.defaults.settings; const mine = USER.settings;
    const own = (k) => (k in mine ? `<span class="own">ค่าส่วนตัว</span>` : "");
    const opt = (v, cur, label) => `<option value="${esc(v)}" ${String(cur) === String(v) ? "selected" : ""}>${esc(label)}</option>`;
    const lbl = { lec: "Lecture", exam: "ข้อสอบ", plan: "แผนอ่าน", true: "แสดง", false: "ซ่อน", normal: "ปกติ", large: "ใหญ่", auto: "ตามเครื่อง", light: "สว่าง", dark: "มืด" };
    const pdfCount = await idbCount().catch(() => 0);
    const blocksRows = enabledBlocks().map((b) => {
      const hidden = s.hiddenBlocks.includes(b.id);
      return `<div class="setrow"><label for="hide-${esc(b.id)}">แสดงบล็อก ${esc(b.name)}<small>ค่ากลาง: ${d.hiddenBlocks.includes(b.id) ? "ซ่อน" : "แสดง"}</small></label>
        <select id="hide-${esc(b.id)}" data-hide="${esc(b.id)}">${opt("show", hidden ? "hide" : "show", "แสดง")}${opt("hide", hidden ? "hide" : "show", "ซ่อน")}</select></div>`;
    }).join("");
    const nRounds = Object.values(PROG.rounds).reduce((a, l) => a + l.length, 0);
    const v = APP.version;
    main.innerHTML = `<div class="head"><h2>ตั้งค่า</h2><p class="hint">เริ่มจากค่ากลางใน <code>defaults.json</code> สิ่งที่แก้ตรงนี้เก็บไว้ในเบราว์เซอร์นี้เท่านั้น</p></div>
      <div class="settings">
        <div class="setrow"><label for="s-theme">ธีม${own("theme")}<small>ค่ากลาง: ${lbl[d.theme || "auto"]}</small></label><select id="s-theme" data-set="theme">${opt("auto", s.theme || "auto", "ตามเครื่อง")}${opt("light", s.theme, "สว่าง")}${opt("dark", s.theme, "มืด")}</select></div>
        <div class="setrow"><label for="s-draft">แสดงข้อสอบที่เฉลยยังไม่ยืนยัน${own("showDrafts")}<small>ค่ากลาง: ${lbl[d.showDrafts]}</small></label><select id="s-draft" data-set="showDrafts" data-bool="1">${opt(true, s.showDrafts, "แสดง")}${opt(false, s.showDrafts, "ซ่อน")}</select></div>
        <div class="setrow"><label for="s-font">ขนาดตัวอักษรโจทย์${own("fontSize")}<small>ค่ากลาง: ${lbl[d.fontSize]}</small></label><select id="s-font" data-set="fontSize">${opt("normal", s.fontSize, "ปกติ")}${opt("large", s.fontSize, "ใหญ่")}</select></div>
        <div class="setrow"><label for="s-sample">แสดงบล็อกตัวอย่าง (DEMO)${own("showSample")}<small>ค่ากลาง: ${lbl[d.showSample]}</small></label><select id="s-sample" data-set="showSample" data-bool="1">${opt(true, s.showSample, "แสดง")}${opt(false, s.showSample, "ซ่อน")}</select></div>
        ${blocksRows}
      </div>
      <div class="btns"><button class="btn danger" data-act="reset">รีเซ็ตการตั้งค่ากลับค่ากลาง</button><span class="hint">ปรับเป็นค่าส่วนตัวไว้ ${Object.keys(mine).length} เรื่อง</span></div>

      ${syncHTML()}
      <div class="section"><h3>ย้ายข้อมูลไปเครื่องอื่น / สำรองข้อมูล</h3>
        <p class="hint">ในเครื่องนี้มี: ${nRounds} รอบที่ทำข้อสอบ · ปักธง ${Object.keys(PROG.marks.flag).length} ข้อ · โน้ต ${Object.keys(PROG.marks.notes).length} ข้อ · เฉลยของฉัน ${Object.keys(PROG.marks.keyOverride).length} ข้อ · อ่าน lecture ${Object.keys(PROG.read).length} บท · ข้อสอบที่เพิ่มเอง ${USER.questions.length} ข้อ</p>
        <p class="hint">ส่งออกเป็นไฟล์ แล้วนำเข้าที่อีกเครื่อง (มือถือ ↔ คอม) ข้อมูลจะรวมกันรายข้อ ไม่ทับของเดิม</p>
        <div class="btns">
          <button class="btn primary" data-act="export">ส่งออกไฟล์ความคืบหน้า</button>
          <label class="btn" for="importfile">นำเข้าไฟล์</label><input id="importfile" type="file" accept="application/json,.json" hidden>
          <button class="btn danger" data-act="clearprog" ${nRounds || Object.keys(PROG.read).length ? "" : "disabled"}>ลบความคืบหน้าทั้งหมดในเครื่องนี้</button>
          <button class="btn danger" data-act="clearq" ${USER.questions.length ? "" : "disabled"}>ลบข้อสอบที่เพิ่มเอง</button>
        </div></div>

      <div class="section" id="app"><h3>ติดตั้งเป็นแอป / ใช้ตอนไม่มีเน็ต</h3>
        <p class="hint">${matchMedia("(display-mode: standalone)").matches ? "เปิดอยู่ในแอปแล้ว" : PWA.prompt ? "กดปุ่มด้านล่างเพื่อติดตั้งบนเครื่องนี้" : /iPhone|iPad/i.test(navigator.userAgent) ? "iPhone/iPad: เปิดใน Safari กดปุ่มแชร์ แล้วเลือก \"เพิ่มไปยังหน้าจอโฮม\"" : "Chrome/Edge: กดไอคอนติดตั้งในแถบที่อยู่ หรือเมนู ⋮ › ติดตั้งแอป"}
          · ข้อสอบทุกชุดที่โหลดตอนเปิดเว็บจะทำได้แม้ไม่มีเน็ต · ${navigator.onLine ? "ออนไลน์อยู่" : "ตอนนี้ออฟไลน์"}${PWA.sw ? "" : " · โหมดออฟไลน์ยังไม่พร้อม (ต้องเปิดผ่าน http/https)"}</p>
        <div class="btns">${PWA.prompt ? `<button class="btn primary" data-act="install">ติดตั้ง MedLib</button>` : ""}
          <button class="btn" data-act="cacheimg" ${PWA.sw ? "" : "disabled"}>เก็บรูปประกอบข้อสอบทุกบล็อกไว้ในเครื่อง</button><span class="hint" id="cachemsg"></span></div></div>

      <div class="section"><h3>ไฟล์ PDF ในเครื่อง</h3>
        <p class="hint">เก็บไว้ ${pdfCount} ไฟล์ ไฟล์ที่เคยเปิดแล้วจะเปิดได้แม้ไม่มีเน็ต · ดึงไฟล์จาก Google Drive: ${APP.config.drive_proxy_url ? "ผ่าน Cloudflare Worker" : APP.config.drive_api_key ? "ใช้ API key ในเครื่อง (config.json)" : "ยังไม่ได้ตั้งค่า"} · แจ้งเฉลย: ${APP.config.report_url || APP.config.drive_proxy_url ? "ส่งผ่าน Worker" : "ยังไม่ได้ตั้งค่า (ใช้วิธีคัดลอกข้อความ)"}</p>
        <div class="btns"><button class="btn danger" data-act="clearpdf" ${pdfCount ? "" : "disabled"}>ลบไฟล์ PDF ที่เก็บไว้</button></div></div>
      ${toastMsg ? `<p class="toast ${toastMsg.err ? "err" : ""}">${esc(toastMsg.text)}</p>` : ""}

      <div class="section" id="about"><h3>เวอร์ชัน</h3>
        <p>MedLib <b class="mono">v${esc(v.version)}</b> · ${esc(fmtDate(v.date))}</p>
        <div class="log">${(v.history || []).map((h) => `<div><strong class="mono">v${esc(h.version)}</strong> <span class="hint">· ${esc(fmtDate(h.date))}${h.title ? " · " + esc(h.title) : ""}</span><ul>${(h.changes || []).map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>`).join("")}</div></div>`;
    toastMsg = null;
    if (section === "about") $("#about").scrollIntoView({ block: "start" });
  }

  async function exportUser() {
    const data = { format: "medlib-personal", schema: V.SCHEMA_VERSION, app_version: APP.version.version, exported: new Date().toISOString(), settings: USER.settings, questions: USER.questions, progress: PROG };
    const json = JSON.stringify(data);
    const name = `medlib-personal-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([json], name, { type: "application/json" });
    try { if (navigator.canShare && navigator.canShare({ files: [file] }) && /Android|iPhone|iPad/i.test(navigator.userAgent)) { await navigator.share({ files: [file], title: name }); return `ส่งออกแล้ว: ${name}`; } } catch (e) { if (e && e.name === "AbortError") return "ยกเลิกการส่งออก"; }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file); a.download = name;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return `ส่งออกแล้ว: ${name}`;
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
    USER = { settings: Object.assign({}, d.settings && typeof d.settings === "object" ? d.settings : {}, USER.settings), questions: USER.questions.filter((q) => !ids.has(q.id)).concat(good) };
    saveUser();
    if (d.progress) { PROG = normProg(QC.mergeProgress(PROG, normProg(d.progress))); saveProg(); }
    applyTheme();
    return { text: `นำเข้าแล้ว: ความคืบหน้ารวมกับของเดิม + ข้อสอบที่เพิ่มเอง ${good.length} ข้อ${bad.length ? ` (ข้าม ${bad.length} ข้อที่ format ไม่ผ่าน)` : ""}` };
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
      id: V.questionId(d.block, cohort || 0, n || 0, "MCQ"), block: d.block, cohort, n, type: "MCQ", stem: d.stem.trim(),
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
    main.innerHTML = `<div class="head"><h2>เพิ่มข้อสอบ</h2><p class="hint">ฟอร์มนี้ใช้กติกาข้อมูลชุดเดียวกับตอนให้ Claude เพิ่ม (<code>lib/validate.js</code>) ข้อที่เพิ่มเองเก็บในเบราว์เซอร์นี้ และขึ้นป้าย "ของฉัน"</p></div>
      <div class="form"><div class="fields">
        <div class="two"><label for="f-block">บล็อก<select id="f-block" data-f="block">${blocks.map((x) => `<option value="${esc(x.id)}" ${x.id === b.id ? "selected" : ""}>${esc(x.id)} · ${esc(x.name)}</option>`).join("")}</select></label>
          <label for="f-cohort">ชุด<input type="number" id="f-cohort" data-f="cohort" value="${esc(draft.cohort)}" placeholder="52"></label></div>
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
        <div class="btns"><button class="btn primary" data-act="save">บันทึก</button><button class="btn" data-act="cleardraft">ล้างฟอร์ม</button></div>
        ${toastMsg ? `<p class="toast ${toastMsg.err ? "err" : ""}">${toastMsg.html || esc(toastMsg.text)}</p>` : ""}</div></div>`;
    toastMsg = null;
  }

  /* ---------- router ---------- */
  const parseHash = () => location.hash.replace(/^#\/?/, "").split("/").filter((x, i) => x || i === 0).map((x) => { try { return decodeURIComponent(x); } catch (e) { return x; } });
  function route() {
    const [view, ...a] = parseHash();
    // old links (v0.5.1 and before) → lecture mode
    const goLec = (x) => { location.replace(x); return null; };
    if (view === "l") return goLec(`#/lec/${enc(a[0])}/${enc(a[1] || "")}`);
    if (view === "b" && (a[1] === "lec" || a[1] === "plan")) return goLec(`#/lec/${enc(a[0])}${a[1] === "plan" ? "/plan" : ""}`);
    if (view === "pdf") { const b = findBlock(a[0]); if (b && b.lectures.some((x) => x.id === a[1])) return goLec(`#/lec/${enc(a[0])}/${enc(a[1])}/${a[2] || 1}`); }
    if (view !== "pdf") { delete main.dataset.pdf; P.token++; }
    if (view !== "lec" || !a[0]) { delete main.dataset.lec; RD.close(); }
    QZ.stop();
    if (view !== "search") $("#q").value = "";
    side(view, a);
    switch (view) {
      case "b": return viewBlock(a[0]);
      case "lec": return a[0] ? viewLec(a[0], a[1], a[2]) : viewLecHome();
      case "refs": return viewRefs(a[0], a[1], a[2]);
      case "q": { const f = findQuestion(a[0]); return f ? QZ.viewSingle(f.b, f.q) : notFound("ไม่พบข้อสอบนี้"); }
      case "set": return QZ.view(a[0], a[1], a[2], a[3]);
      case "pdf": return viewPdf(a[0], a[1], Number(a[2]) || 1);
      case "search": { const qv = a.join("/"); if ($("#q").value !== qv) $("#q").value = qv; return viewSearch(qv); }
      case "settings": return viewSettings(a[0]);
      case "add": return viewAdd();
      case "stats": return QZ.viewStats();
      default: return viewHome();
    }
  }

  const ML = { $, esc, enc, main, APP, S, visibleBlocks, findBlock, findSet, docOf, findQuestion, examsOf, allExams, armed, toast, parseHash, notFound,
    route: () => route(), prog: () => PROG, saveProg, syncSoon };
  const QZ = window.MedLibQuizUI(ML);

  let lastHash = location.hash;
  window.addEventListener("hashchange", () => {
    const h = location.hash, prev = lastHash; lastHash = h;
    route();
    if (h.startsWith("#/pdf") || h.startsWith("#/lec/") || h.startsWith("#/settings/about")) return;
    const runOf = (x) => (/^#\/set\/[^/]+\/[^/]+\/run\//.test(x) ? x.split("/").slice(0, 5).join("/") : "");
    if (!runOf(h) || runOf(h) !== runOf(prev)) window.scrollTo(0, 0);
    else { const c = $(".qcard"); if (c && c.getBoundingClientRect().top < 0) c.scrollIntoView({ block: "start" }); }
  });
  window.addEventListener("pagehide", () => saveProg());

  /* ---------- events ---------- */
  document.addEventListener("click", async (ev) => {
    const t = ev.target.closest("button, img[data-zoom]"); if (!t) return;
    if (await QZ.onClick(t)) return;
    if (t.dataset.pg) { if (location.hash.startsWith("#/lec/")) return RD.goto(Math.max(1, (RD.cur || 1) + Number(t.dataset.pg))); return pdfGo(Number(t.dataset.pg)); }
    if (t.dataset.zm) return RD.zoomBy(Number(t.dataset.zm));
    if (t.dataset.copy) { try { await navigator.clipboard.writeText(t.dataset.copy); toast("คัดลอกแล้ว"); } catch (e) { window.prompt("คัดลอกข้อความนี้", t.dataset.copy); } return; }
    if (t.dataset.read) {
      const [, bid] = parseHash(); const b = findBlock(bid); if (!b) return;
      const r = readOf(b, t.dataset.read) || {}; markRead(b, t.dataset.read, { done: !r.done });
      if (location.hash.startsWith("#/lec/")) {
        const L = $("#leclist"); if (L) { const st = L.scrollTop; L.innerHTML = lecListHTML(b, parseHash()[2]); L.scrollTop = st; $("#lechead").innerHTML = lecHeadHTML(b, parseHash()[2]); }
        const rb = document.querySelector(`.rdbar [data-read="${t.dataset.read}"]`); if (rb) { rb.setAttribute("aria-pressed", String(!r.done)); rb.textContent = !r.done ? "✓ อ่านจบแล้ว" : "อ่านจบแล้ว"; }
        return;
      }
      const keepPdf = location.hash.startsWith("#/pdf");
      if (keepPdf) { t.setAttribute("aria-pressed", String(!r.done)); t.textContent = !r.done ? "✓ อ่านจบแล้ว" : "อ่านจบแล้ว"; return; }
      return route();
    }
    const act = t.dataset.act;
    if (act === "theme") { const order = ["auto", "light", "dark"]; const nx = order[(order.indexOf(S().theme || "auto") + 1) % 3]; if (nx === (APP.defaults.settings.theme || "auto")) delete USER.settings.theme; else USER.settings.theme = nx; saveUser(); applyTheme(); return side(parseHash()[0], parseHash().slice(1)); }
    if (act === "closehits") { $("#pdfhits").innerHTML = ""; return; }
    if (act === "rdsearch") { const x = t.closest(".rdbar"); x.classList.toggle("showsearch"); if (x.classList.contains("showsearch")) $("#pdfq").focus(); return; }
    if (act === "drawer") { const l = $("#lec"); if (l) l.classList.toggle("drawer"); return; }
    if (act === "toc") { const el = $("#toc"); el.innerHTML = el.innerHTML ? "" : tocHTML(RD.b, RD.l); return; }
    if (act === "install" && PWA.prompt) { PWA.prompt.prompt(); const c = await PWA.prompt.userChoice.catch(() => null); PWA.prompt = null; if (c && c.outcome === "accepted") toast("ติดตั้งแล้ว เปิดได้จากหน้าจอหลัก"); return route(); }
    if (act === "cacheimg") {
      const urls = APP.blocks.flatMap((b) => b.exams.flatMap((q) => [q.image, ...(q.items || []).flatMap((it) => [it.image, it.key_image])]).filter(Boolean).map((f) => new URL(b._base + "/" + f, location.href).href));
      const ctl = navigator.serviceWorker && navigator.serviceWorker.controller;
      if (!ctl) { $("#cachemsg").textContent = "ยังไม่พร้อม ลองรีเฟรชหน้าแล้วกดอีกครั้ง"; return; }
      $("#cachemsg").textContent = urls.length ? `กำลังเก็บ 0/${urls.length}…` : "ไม่มีรูปให้เก็บ";
      if (urls.length) ctl.postMessage({ type: "cache-urls", urls });
      return;
    }
    if (act === "reset") { if (!armed(t)) return; USER.settings = {}; saveUser(); applyTheme(); toastMsg = { text: "กลับไปใช้ค่ากลางทั้งหมดแล้ว" }; return route(); }
    if (act === "syncnew") return syncNew();
    if (act === "syncnow") return syncNow();
    if (act === "syncoff") { if (!armed(t)) return; setSyncState(null); SY.msg = { text: "เลิกซิงก์ในเครื่องนี้แล้ว ความคืบหน้ายังอยู่ในเครื่อง" }; return route(); }
    if (act === "export") { toastMsg = { text: await exportUser() }; return route(); }
    if (act === "clearprog") {
      if (!armed(t)) return;
      const old = JSON.stringify(PROG); PROG = normProg({}); saveProg(); route();
      return toast("ลบความคืบหน้าแล้ว", "เลิกทำ", () => { PROG = normProg(JSON.parse(old)); saveProg(); route(); });
    }
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
  document.addEventListener("submit", (ev) => {
    if (ev.target.dataset.pdfsearch) { ev.preventDefault(); pdfSearch($("#pdfq").value); }
    if (ev.target.dataset.syncjoin) {
      ev.preventDefault();
      const code = normCode($("#syncin").value);
      if (!SYNC_CODE.test(code)) { SY.msg = { err: true, text: "รหัสไม่ถูกต้อง รหัสมี 12 ตัว แบบ xxxx-xxxx-xxxx" }; return route(); }
      syncNow(code);
    }
  });
  document.addEventListener("change", async (ev) => {
    const t = ev.target;
    if (QZ.onChange(t)) return;
    if (t.dataset.set) {
      const k = t.dataset.set; let v = t.value; if (t.dataset.bool) v = v === "true";
      if (v === APP.defaults.settings[k]) delete USER.settings[k]; else USER.settings[k] = v;
      saveUser(); applyTheme(); return route();
    }
    if (t.dataset.hide) {
      const id = t.dataset.hide; const h = S().hiddenBlocks.filter((x) => x !== id); if (t.value === "hide") h.push(id);
      const same = JSON.stringify([...h].sort()) === JSON.stringify([...APP.defaults.settings.hiddenBlocks].sort());
      if (same) delete USER.settings.hiddenBlocks; else USER.settings.hiddenBlocks = h;
      saveUser(); return route();
    }
    if (t.id === "importfile" && t.files[0]) { toastMsg = await importUser(t.files[0]); return route(); }
    if (t.dataset.lecblock) { lecFilter.q = ""; location.hash = `#/lec/${enc(t.value)}`; return; }
    if (t.id === "pgin" && location.hash.startsWith("#/lec/")) { RD.goto(Math.max(1, Number(t.value) || 1)); return; }
    if (t.id === "pgin") { const [, bid, lid] = parseHash(); location.replace(`#/pdf/${enc(bid)}/${enc(lid)}/${Math.max(1, Number(t.value) || 1)}`); return; }
    if (t.dataset.f && t.tagName === "SELECT") {
      draft[t.dataset.f] = t.value;
      if (t.dataset.f === "block") { const b = findBlock(t.value); draft.lecture = b && b.lectures[0] ? b.lectures[0].id : ""; }
      return route();
    }
  });
  document.addEventListener("input", (ev) => {
    const t = ev.target;
    if (QZ.onInput(t)) return;
    if (t.dataset.lecfilter) { lecFilter.q = t.value; const [, bid, lid] = parseHash(); const b = findBlock(bid); if (b) $("#leclist").innerHTML = lecListHTML(b, lid); return; }
    if (t.id === "q") { const v = t.value; if (v.trim()) location.replace("#/search/" + enc(v)); else location.replace("#/"); return; }
    if (t.dataset.f && t.tagName !== "SELECT" && draft) {
      draft[t.dataset.f] = t.value;
      const { r, errs } = checkDraft();
      $("#preview").textContent = JSON.stringify(r, null, 2);
      $("#verdict").innerHTML = verdictHtml(errs);
    }
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") { const z = $("img.zoom"); if (z) { z.classList.remove("zoom"); return; } if (POP.open) { history.back(); return; } }
    if (POP.open) { if (ev.key === "ArrowRight") popAction("next"); if (ev.key === "ArrowLeft") popAction("prev"); return; }
    if (/INPUT|TEXTAREA|SELECT/.test(ev.target.tagName) || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (QZ.onKey(ev)) return;
    if (location.hash.startsWith("#/lec/") && RD.doc) {
      if (ev.key === "ArrowRight") { ev.preventDefault(); RD.goto(RD.cur + 1); }
      if (ev.key === "ArrowLeft") { ev.preventDefault(); RD.goto(Math.max(1, RD.cur - 1)); }
      return;
    }
    if (!location.hash.startsWith("#/pdf")) return;
    if (ev.key === "ArrowRight" || ev.key === "PageDown") pdfGo(1);
    if (ev.key === "ArrowLeft" || ev.key === "PageUp") pdfGo(-1);
  });
  let rz = 0;
  window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if (P.doc && $("#pdfstage")) renderPage(P.token); if (RD.doc && $("#lecpages")) { const w = $("#lecpages").clientWidth; if (w !== RD.lastW) { RD.lastW = w; RD.layout(RD.cur || 1); } } }, 200); });

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
    APP.defaults = { settings: Object.assign({ defaultTab: "exam", showDrafts: true, fontSize: "normal", hiddenBlocks: [], showSample: false, theme: "auto" }, defs.settings) };
    applyTheme();
    document.documentElement.classList.toggle("bigtext", S().fontSize === "large");
    await loadBlocks("data/blocks", false);
    await loadBlocks("samples/blocks", true);
    route();
    syncSoon();
  }
  /* ---------- PWA: install + offline (sw.js) ---------- */
  const PWA = { prompt: null, sw: false };
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); PWA.prompt = e; if (location.hash.startsWith("#/settings")) route(); });
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    PWA.sw = true;
    navigator.serviceWorker.register("sw.js").catch(() => { PWA.sw = false; });
    navigator.serviceWorker.addEventListener("message", (e) => {
      const d = e.data || {}; const el = $("#cachemsg");
      if (d.type === "cache-progress" && el) el.textContent = d.done >= d.total ? `เก็บรูปครบ ${d.total} รูปแล้ว` : `กำลังเก็บ ${d.done}/${d.total}…`;
    });
  }
  window.addEventListener("offline", () => toast("ออฟไลน์อยู่ ทำข้อสอบต่อได้ ความคืบหน้าบันทึกในเครื่อง"));

  window.__medlib = { APP, get USER() { return USER; }, get PROG() { return PROG; }, route };
  boot();
})();
