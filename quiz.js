/* MedLib exam pages: set overview, rounds (practice / timed / untimed), runner, summary, history, Guidereader,
   cross-set practice ("mix") and the block reading plan. Logic without DOM lives in lib/quizcore.js.
   app.js calls window.MedLibQuizUI(ML) once and routes #/set/... here. */
window.MedLibQuizUI = function (ML) {
  "use strict";
  const C = window.MedLibQuiz;
  const { $, esc, enc } = ML;
  const MODE_TH = { practice: "ฝึก (เฉลยทันที)", timed: "จำลองสอบจริง (จับเวลา)", untimed: "สอบไม่จับเวลา" };
  const MODE_SHORT = { practice: "ฝึก", timed: "จับเวลา", untimed: "ไม่จับเวลา" };
  const KIND_TH = { full: "ทั้งชุด", retry: "ทำข้อผิดซ้ำ", mix: "ชุดที่สร้างเอง" };
  const TIER_TXT = { 1: "ต้องอ่าน", 2: "ควรอ่าน", 3: "อ่านถ้ามีเวลา" };
  const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
  const txt = (s) => esc(s).replace(/\n/g, "<br>");
  const P = () => ML.prog();
  const marks = () => P().marks;
  const save = () => ML.saveProg();

  /* ---------- sets, mixes, rounds ---------- */
  function setLike(b, sid) {
    if (!b) return null;
    if (sid && sid.startsWith("@")) {
      const m = P().mixes[sid.slice(1)];
      if (!m || m.block !== b.id) return null;
      const all = ML.examsOf(b); const byId = Object.fromEntries(all.map((q) => [q.id, q]));
      const qs = m.qids.map((id) => byId[id]).filter(Boolean);
      const limit = Math.max(5, Math.round(qs.reduce((a, q) => a + (q.type === "MCQ" ? 1.5 : 6), 0)));
      return { id: sid, mix: true, title: m.title, type: "ชุดฝึกข้ามชุด", cohort: null, meta: { time_limit_min: limit }, questions: qs, guide: null };
    }
    return ML.findSet(b, sid);
  }
  const keyOfSet = (b, s) => `${b.id}/${s.id}`;
  const roundsOf = (b, s) => (P().rounds[keyOfSet(b, s)] = P().rounds[keyOfSet(b, s)] || []);
  const activeRound = (b, s) => roundsOf(b, s).filter((r) => !r.done).pop() || null;
  const qmapOf = (s) => Object.fromEntries(s.questions.map((q) => [q.id, q]));
  const kov = () => marks().keyOverride;
  // an answer was just checked → move it in the review queue (wrong → back tomorrow)
  // Self-grading (ถูก/ผิด) after the check re-grades: start again from the queue entry as it was before this round graded it.
  const graded = (q, r) => {
    if (!q || !r) return;
    const R = P().review = P().review || {}; r.rv0 = r.rv0 || {};
    if (!(q.id in r.rv0)) r.rv0[q.id] = R[q.id] ? { ...R[q.id] } : null;
    else { if (r.rv0[q.id]) R[q.id] = { ...r.rv0[q.id] }; else delete R[q.id]; C.touch(P(), "review", q.id); }
    C.reviewUpdate(P(), q, C.qScore(q, r, kov()), Date.now(), kov());
  };
  const lastDone = (b, s) => roundsOf(b, s).filter((r) => r.done && !r.abandoned).pop() || null;
  const base = (b, s) => `#/set/${enc(b.id)}/${enc(s.id)}`;

  // Latest result of every question in a block (across sets and mixes)
  function blockResults(b) {
    const qmap = Object.fromEntries(ML.examsOf(b).map((q) => [q.id, q]));
    const rounds = Object.entries(P().rounds).filter(([k]) => k.startsWith(b.id + "/")).flatMap(([, v]) => v);
    return C.latestResults(rounds, qmap, kov());
  }
  function setProgress(b, s) {   // only questions that count (draft/disputed answers are left out)
    const res = blockResults(b), qs = s.questions.filter((q) => C.counts(q, kov()));
    const done = qs.filter((q) => q.id in res);
    const ok = done.filter((q) => res[q.id] >= 0.999).length;
    return { total: qs.length, done: done.length, ok };
  }
  // Warning on the question header for answers not confirmed yet (they do not count toward scores)
  const uncountedBadge = (q) => (C.counts(q, kov()) ? ""
    : q.answer_status === "disputed" ? `<span class="badge bad">เฉลยต้นฉบับอาจคลาดเคลื่อน · ไม่นับคะแนน</span>`
      : `<span class="badge warn">เฉลยยังไม่ยืนยัน · ไม่นับคะแนน</span>`);

  /* ---------- small renderers ---------- */
  const lecName = (b, id) => { const l = b.lectures.find((x) => x.id === id); return l ? `${id} ${l.title}` : id; };
  // Display number of a question = its position in its own set (1, 2, 3 …). The original paper number (q.n)
  // stays in the data (ids, refs) but is not shown: recalled papers skip numbers nobody remembered.
  function qPos(q) {
    const b = q && ML.APP.blocks.find((x) => x.id === q.block);
    const s = b && ML.findSet(b, q._set);
    const i = s ? s.questions.indexOf(q) : -1;
    return i >= 0 ? i + 1 : q.n;
  }
  const pgTxt = (p) => (!p || !p.length ? "" : p.length > 1 && p[p.length - 1] - p[0] === p.length - 1 ? `หน้า ${p[0]}–${p[p.length - 1]}` : `หน้า ${p.join(", ")}`);
  const pdfHref = (b, id, page) => (b.lectures.some((l) => l.id === id) ? `#/lec/${enc(b.id)}/${enc(id)}/${page || 1}` : `#/pdf/${enc(b.id)}/${enc(id)}/${page || 1}`);

  function listHTML(parts, ordered) { const t = ordered ? "ol" : "ul"; return `<${t} class="kc">${parts.map((p) => `<li>${txt(p.trim())}</li>`).join("")}</${t}>`; }
  // key concept / explanation text → readable blocks: bullets, "(1) (2)" lists, "a; b; c" lists and a ⚠️ trap box
  function kcHTML(s) {
    s = String(s || ""); let trap = "";
    const m = s.match(/\s*(?:Classic trap|Trap|จุดที่มักสับสน|จุดหลอก)\s*:\s*/i);
    if (m) { trap = s.slice(m.index + m[0].length); s = s.slice(0, m.index); }
    let warn = "";
    const w = s.match(/\n?\s*⚠️\s*([^\n]+)\s*$/);
    if (w) { warn = w[1]; s = s.slice(0, w.index); }
    const tw = trap.match(/\n?\s*⚠️\s*([^\n]+)\s*$/);
    if (tw) { warn = warn || tw[1]; trap = trap.slice(0, tw.index); }
    let body;
    if (/\n\s*[•\-]/.test("\n" + s)) {
      const lines = s.split(/\n/).map((x) => x.replace(/^\s*[•\-]\s*/, "")).filter((x) => x.trim());
      body = lines.length > 1 ? listHTML(lines) : `<div>${txt(lines.join(" "))}</div>`;
    } else if ((s.match(/\(\d\)/g) || []).length >= 2) {
      const pre = s.split(/\(\d\)\s*/), head = pre.shift();
      body = (head.trim() ? `<div>${txt(head.trim().replace(/[:：]\s*$/, ""))}</div>` : "") + listHTML(pre.filter((x) => x.trim()).map((x) => x.replace(/[;,]\s*$/, "")), true);
    } else if (s.split(/;\s+/).length >= 3) body = listHTML(s.split(/;\s+/));
    else body = s.trim() ? `<div>${txt(s.trim())}</div>` : "";
    if (trap.trim()) body += `<div class="trap"><b>⚠️ จุดที่มักสับสน</b>${txt(trap.trim())}</div>`;
    if (warn.trim()) body += `<div class="warnline">⚠️ ${txt(warn.trim())}</div>`;
    return body;
  }
  function chainHTML(m) {
    if (!m || !m.length) return "";
    const st = m.map((x) => (typeof x === "string" ? { s: x } : x));
    let h = `<div class="chain">${st.map((x, i) => `${i ? '<span class="ar">→</span>' : ""}<span class="st${x.answer ? " ans" : ""}">${esc(x.s)}</span>`).join("")}</div>`;
    if (st.some((x) => x.note)) h += `<ol class="steps">${st.map((x, i) => (x.note ? `<li value="${i + 1}"><b>${esc(x.s)}</b> — ${txt(x.note)}</li>` : "")).join("")}</ol>`;
    return h;
  }
  function badgeHTML(q) {
    if (q.answer_status === "corrected") return `<span class="badge bad">แก้เฉลยจากต้นฉบับแล้ว</span>`;
    if (q.answer_status === "disputed") return `<span class="badge bad">เฉลยต้นฉบับอาจคลาดเคลื่อน</span>`;
    if (q.answer_status === "draft") return `<span class="badge warn">เฉลยยังไม่ยืนยัน</span>`;
    return "";
  }
  function refsHTML(b, q) {
    if (!q.refs || !q.refs.length) return "";
    return `<div class="refs">${q.refs.map((r) => {
      if (r.paper) {
        const d = ML.docOf(b, r.paper);
        return `<div class="ref"><span class="hint">ต้นฉบับ:</span><a href="${pdfHref(b, r.paper, r.pages[0])}" data-pdfpop="${esc(b.id)}|${esc(r.paper)}|${r.pages[0] || 1}">${d && d.role === "key" ? "PDF เฉลย" : "PDF ข้อสอบ"} ${pgTxt(r.pages)}</a></div>`;
      }
      const hot = r.hotspot ? (r.hotspot.years.length >= 2 ? `<span class="hot">ออกซ้ำ ${r.hotspot.years.length} ปี</span>` : r.hotspot.years.length ? `<span class="tier">เคยออกปี ${r.hotspot.years.join(", ")}</span>` : "") + `<span class="tier">Tier ${r.hotspot.tier}</span>` : "";
      return `<div class="ref"><span class="hint">อ่านเพิ่ม:</span><a href="${pdfHref(b, r.lecture, r.pages[0])}">${esc(lecName(b, r.lecture))} ${pgTxt(r.pages)}</a>${hot}${r.focus ? `<span class="hint">${esc(r.focus)}</span>` : ""}</div>`;
    }).join("")}</div>`;
  }
  const figureHTML = (b, q) => (q.image ? `<figure><img src="${esc(b._base + "/" + q.image)}" alt="${esc(q.image_caption || "ภาพประกอบโจทย์")}" data-zoom="1" loading="lazy">${q.image_caption ? `<figcaption>${txt(q.image_caption)}</figcaption>` : ""}</figure>` : "");

  // Box under a revealed question: answer, original key, mechanism, key concept, refs, my note, report / my key
  function explainHTML(b, q, extra, tone) {
    const mine = kov()[q.id];
    let h = `<div class="explain"><h3>คำอธิบาย${badgeHTML(q)}</h3>`;
    if (q.explanation || extra) h += `<div class="answerline${tone ? " " + tone : ""}">${extra || ""}${q.explanation ? kcHTML(q.explanation) : ""}</div>`;
    if (q.source_answer || q.source_answer_text) h += `<div class="keyrow src"><span class="kl">เฉลยต้นฉบับ: ${esc(q.source_answer || q.source_answer_text)}${q.type === "MCQ" ? " (ไม่ใช้ให้คะแนน)" : ""}</span>${q.source_answer_note ? kcHTML(q.source_answer_note) : ""}</div>`;
    else if (q.source_answer_note && q.answer_status !== "verified") h += `<div class="keyrow src"><span class="kl">หมายเหตุจากต้นฉบับ</span>${kcHTML(q.source_answer_note)}</div>`;
    if (q.mechanism && q.mechanism.length) h += `<h4>ลำดับกลไก</h4>${chainHTML(q.mechanism)}`;
    if (q.key_concept) h += `<h4>หลักการ</h4>${kcHTML(q.key_concept)}`;
    if (q.audit_note) h += `<p class="auditnote">หมายเหตุการตรวจเฉลย: ${txt(q.audit_note)}</p>`;
    h += refsHTML(b, q);
    h += reportHTML(b, q, mine);
    return h + `</div>`;
  }
  function reportHTML(b, q, mine) {
    const rep = marks().reported[q.id];
    const opts = q.type === "MCQ" ? Object.keys(q.options) : [];
    return `<div class="doubtrow">
      ${mine ? `<span class="badge mine">เครื่องนี้ใช้เฉลย ${esc(mine)} ของฉัน</span><button class="linkbtn" data-z="unkey" data-q="${esc(q.id)}">กลับไปใช้เฉลยกลาง</button>` : ""}
      ${rep ? `<span class="badge">แจ้งผู้ดูแลแล้ว</span>` : ""}
      <details class="report"><summary>แจ้งเฉลยน่าสงสัย${opts.length ? " / ใช้เฉลยของฉัน" : ""}</summary>
        ${opts.length ? `<label>ฉันคิดว่าคำตอบที่ถูกคือ <select data-rep-key="1"><option value="">ไม่แน่ใจ</option>${opts.map((k) => `<option ${mine === k ? "selected" : ""}>${k}</option>`).join("")}</select></label>
        <label class="chk"><input type="checkbox" data-rep-local="1" ${mine ? "checked" : ""}> ใช้คำตอบนี้ให้คะแนนในเครื่องฉัน ระหว่างรอผู้ดูแลตรวจ</label>` : ""}
        <label>เหตุผล / แหล่งอ้างอิง<textarea data-rep-reason="1" rows="3" placeholder="เช่น ตาม lecture L04 หน้า 12 ..."></textarea></label>
        <div class="btns"><button class="btn primary sm" data-z="report" data-q="${esc(q.id)}">ส่งถึงผู้ดูแล</button>${opts.length ? `<button class="btn sm" data-z="setkey" data-q="${esc(q.id)}">บันทึกเฉลยของฉันอย่างเดียว</button>` : ""}<span class="hint" data-rep-msg="1"></span></div>
      </details></div>`;
  }
  function noteHTML(q) {
    const n = marks().notes[q.id];
    return `<details class="qnote" ${n && n.text ? "open" : ""}><summary>โน้ตของฉัน${n && n.text ? " ·" : ""}</summary><textarea data-qnote="${esc(q.id)}" rows="3" placeholder="จดสิ่งที่อยากจำของข้อนี้ (เก็บในเครื่องนี้ ส่งออกได้)">${esc(n ? n.text : "")}</textarea></details>`;
  }

  // One question body. r = round (answers), reveal = show key
  function questionHTML(b, q, r, reveal, instant) {
    if (q.type === "MCQ") {
      const chosen = r.ans[q.id], key = C.keyOf(q, kov()), oks = C.okKeys(q, kov()), right = oks.includes(chosen);
      const order = (r.choiceOrder && r.choiceOrder[q.id]) || Object.keys(q.options);
      let h = `<div class="stem">${txt(q.stem)}</div>${figureHTML(b, q)}<ul class="opts">`;
      order.forEach((k, i) => {
        let cls = "";
        if (reveal) { if (oks.includes(k)) cls = "correct"; else if (k === chosen) cls = "wrong"; }
        const why = reveal && q.option_why && q.option_why[k] ? `<span class="why">${txt(q.option_why[k])}</span>` : "";
        const label = r.shuffleC ? "ABCDE"[i] : k;
        h += `<li><button class="opt ${cls}" data-opt="${esc(k)}" aria-pressed="${chosen === k}" ${reveal ? "disabled" : ""}><span class="k">${label}</span><span>${txt(q.options[k])}${why}</span></button></li>`;
      });
      h += `</ul>`;
      if (reveal) {
        const disp = r.shuffleC ? "ABCDE"[order.indexOf(key)] : key;
        const lbl = (k) => (r.shuffleC ? "ABCDE"[order.indexOf(k)] : k);
        const alsoTxt = oks.length > 1 ? ` (${oks.slice(1).map(lbl).join(", ")} ก็นับถูก)` : "";
        const extra = key ? `<p><b>${!chosen ? "ไม่ได้ตอบ · " : right ? "ถูกต้อง · " : "ยังไม่ใช่ · "}คำตอบ ${esc(disp)}${esc(alsoTxt)}${r.shuffleC && disp !== key ? ` (ช้อยส์ ${esc(key)} ในต้นฉบับ)` : ""}${q.answer_status === "corrected" ? " (เฉลยใหม่)" : q.answer_status === "draft" ? " (ร่างเฉลย)" : ""}</b></p>` : "";
        h += explainHTML(b, q, extra, !chosen ? "none" : right ? "" : "bad");
      }
      return h;
    }
    const lead = q.type === "KF" ? `<div class="case"><div class="lbl">สถานการณ์</div>${txt(q.case || q.stem)}</div>`
      : `<div class="case"><div class="lbl">สถานี${q.station ? " " + esc(q.station) : ""}</div>${txt(q.stem || "")}</div>`;
    const A = r.ans[q.id] || {}, ov = (r.ov && r.ov[q.id]) || {};
    let h = lead + figureHTML(b, q);
    (q.items || []).forEach((it, n) => {
      const a = A[it.id] || {};
      h += `<div class="item"><div class="prompt">${n + 1}. ${txt(it.prompt)}</div>`;
      if (it.image) h += `<figure><img src="${esc(b._base + "/" + it.image)}" alt="${esc(it.image_caption || "ภาพประกอบข้อย่อย")}" data-zoom="1" loading="lazy">${it.image_caption ? `<figcaption>${txt(it.image_caption)}</figcaption>` : ""}</figure>`;
      if (it.format === "select") {
        h += `<div class="hint">เลือกได้ไม่เกิน ${it.max_answers || "—"} ข้อ (เลือกเกินได้ 0 คะแนน)</div><div class="checks">`;
        (it.options || []).forEach((o) => {
          const on = (a.sel || []).includes(o.key); let cls = "";
          if (reveal) { if ((it.answer || []).includes(o.key)) cls = "correct"; else if (on) cls = "wrong"; }
          h += `<label class="${cls}"><input type="checkbox" data-item="${esc(it.id)}" value="${esc(o.key)}" ${on ? "checked" : ""} ${reveal ? "disabled" : ""}><span>${txt(o.text)}</span></label>`;
        });
        h += `</div>`;
      } else h += `<textarea data-item="${esc(it.id)}" placeholder="พิมพ์คำตอบ" ${reveal ? "readonly" : ""}>${esc(a.text || "")}</textarea>`;
      if (reveal) {
        const sc = C.itemScore(it, a, ov[it.id]), cls = sc >= 0.999 ? "ok" : sc <= 0.001 ? "bad" : "part";
        const keyTxt = it.format === "select" ? (it.options || []).filter((o) => (it.answer || []).includes(o.key)).map((o) => o.text).join(", ") : it.key_text || (it.accepted || []).join(" / ");
        h += `<div class="verdict ${cls}"><b>${sc >= 0.999 ? "ถูก" : sc <= 0.001 ? "ยังไม่ถูก" : `ถูกบางส่วน (${Math.round(sc * 100)}%)`}</b>`
          + (it.source_key ? `<div class="keyrow src"><span class="kl">เฉลยต้นฉบับ${it.new_key ? " (ไม่ใช้)" : ""}</span><div>${txt(it.source_key)}</div></div>` : "")
          + (it.new_key ? `<div class="keyrow new"><span class="kl">เฉลยใหม่</span><div>${txt(it.new_key)}</div>${it.new_key_reason ? kcHTML(it.new_key_reason) : ""}</div>` : "")
          + (!it.source_key && !it.new_key && keyTxt ? `<div class="keyrow src"><span class="kl">เฉลย</span><div>${txt(keyTxt)}</div></div>` : "")
          + (it.key_image ? `<figure class="keyfig"><img src="${esc(b._base + "/" + it.key_image)}" alt="${esc(it.key_image_caption || "ภาพจากเฉลยต้นฉบับ")}" data-zoom="1" loading="lazy"><figcaption>${txt(it.key_image_caption || "ภาพจากเฉลยต้นฉบับ")}</figcaption></figure>` : "")
          + (it.mechanism ? chainHTML(it.mechanism) : "")
          + (it.explanation && it.explanation !== keyTxt ? `<div class="itemexp">${kcHTML(it.explanation)}</div>` : "");
        if (it.format !== "select") {
          const o = ov[it.id];
          h += `<div class="override"><span class="hint">ตัดสินเอง:</span><button data-ov="1" data-item="${esc(it.id)}" aria-pressed="${o === 1}">ถูก</button><button data-ov="0" data-item="${esc(it.id)}" aria-pressed="${o === 0}">ผิด</button><button data-ov="auto" data-item="${esc(it.id)}" aria-pressed="${o == null}">อัตโนมัติ</button></div>`;
        }
        h += `</div>`;
      }
      h += `</div>`;
    });
    if (instant && !reveal) h += `<button class="btn primary" data-z="check">ตรวจคำตอบข้อนี้</button>`;
    if (reveal) h += explainHTML(b, q, "");
    return h;
  }

  /* ---------- set header + tabs ---------- */
  function headHTML(b, s, tab) {
    const B = base(b, s);
    const papers = s.mix ? [] : b.papers.filter((p) => p.cohort === s.cohort && p.type === s.type);
    const tabs = [["", "ทำข้อสอบ"], ["guide", "Guidereader"], ["sum", "สรุปผล"], ["hist", "ประวัติ"]];
    return `<div class="crumbs"><a href="#/">ทั้งหมด</a><span>/</span><a href="#/b/${enc(b.id)}">${esc(b.name)}</a><span>/</span><span>${s.mix ? "ชุดฝึกข้ามชุด" : `ชุด ${s.cohort} · ${esc(s.type)}`}</span></div>
      <div class="sethead"><div><h2>${esc(s.title)}</h2><p class="hint">${s.questions.length} ข้อ${s.meta.time_limit_min && !s.mix ? ` · เวลาสอบจริง ${s.meta.time_limit_min} นาที` : ""}${papers.length ? " · " + papers.map((p) => `<a href="#/pdf/${enc(b.id)}/${enc(p.id)}/1" data-pdfpop="${esc(b.id)}|${esc(p.id)}|1">${p.role === "key" ? "PDF เฉลย" : "PDF ข้อสอบ"}</a>`).join(" · ") : ""}</p></div></div>
      <nav class="tabs">${tabs.map(([k, l]) => `<a class="tab ${tab === k ? "on" : ""}" href="${B}${k ? "/" + k : ""}">${l}</a>`).join("")}</nav>`;
  }

  /* ---------- overview: start a round / resume ---------- */
  function viewOverview(b, s) {
    const act = activeRound(b, s), last = lastDone(b, s), B = base(b, s);
    const limit = Number(s.meta.time_limit_min) || 0;
    const pref = P().prefs || {};
    let h = headHTML(b, s, "");
    if (act) {
      const st = C.roundStats(act, qmapOf(s), kov());
      h += `<div class="resume"><div><b>รอบที่ค้างอยู่</b> <span class="pill">${MODE_SHORT[act.mode]}</span> <span class="pill">${KIND_TH[act.kind] || ""}</span><div class="hint">ตอบแล้ว ${st.answered}/${st.total}${act.mode === "practice" ? ` · ถูก ${st.ok}` : ""} · เริ่ม ${new Date(act.started).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}</div></div>
        <div class="btns"><a class="btn primary" href="${B}/run/${(act.idx || 0) + 1}">ทำต่อ</a><button class="btn" data-z="abandon">ทิ้งรอบนี้</button></div></div>`;
    }
    const m = act ? null : pref.mode || "practice";
    h += `<section class="startbox"><h3>${act ? "หรือเริ่มรอบใหม่" : "เริ่มทำชุดนี้"}</h3>
      <div class="modecards">${["practice", "timed", "untimed"].map((k) => `<label class="modecard"><input type="radio" name="mode" value="${k}" ${(m || "practice") === k ? "checked" : ""}><b>${MODE_TH[k]}</b><span class="hint">${k === "practice" ? "เลือกแล้วเห็นเฉลยและคำอธิบายทันที" : k === "timed" ? `นับถอยหลัง ${limit || "—"} นาที หมดเวลาส่งเอง เฉลยขึ้นหลังส่ง` : "ทำครบแล้วกดส่ง เฉลยขึ้นหลังส่ง ไม่กดดันเรื่องเวลา"}</span></label>`).join("")}</div>
      <div class="opts-row"><label class="chk"><input type="checkbox" id="shufQ" ${pref.shuffleQ ? "checked" : ""}> สุ่มลำดับข้อ</label><label class="chk"><input type="checkbox" id="shufC" ${pref.shuffleC ? "checked" : ""}> สุ่มลำดับช้อยส์ (MCQ)</label></div>
      <button class="btn primary big" data-z="start">${act ? "เริ่มรอบใหม่ (รอบเดิมจะถูกเก็บเป็นประวัติแบบไม่ครบ)" : "เริ่มทำ"}</button></section>`;
    const pr = setProgress(b, s);
    h += `<section class="minihist"><h3>ความคืบหน้า</h3><p class="hint">${pr.total ? `เคยทำแล้ว ${pr.done}/${pr.total} ข้อ · ถูกล่าสุด ${pr.ok} ข้อ` : "เฉลยทั้งชุดยังไม่ยืนยัน จึงไม่นับคะแนน"}${last ? ` · รอบล่าสุด ${C.roundStats(last, qmapOf(s), kov()).pct}% (<a href="${B}/sum/${last.id}">ดูผล</a> · <a href="${B}/hist">ประวัติทั้งหมด</a>)` : ""}</p></section>`;
    ML.main.innerHTML = h + notepadHTML(b, s);
  }

  function startRound(b, s, opts) {
    const act = activeRound(b, s);
    if (act) { act.done = true; act.abandoned = true; act.finished = Date.now(); }
    const r = C.newRound(s.questions, Object.assign({ kind: s.mix ? "mix" : "full" }, opts));
    roundsOf(b, s).push(r); save();
    location.hash = `${base(b, s)}/run/1`;
  }

  /* ---------- runner ---------- */
  let TIMER = null;
  function stop() { if (TIMER) { clearInterval(TIMER); TIMER = null; } }
  const visible = (b, s, r) => {
    const qmap = qmapOf(s), f = r.filter || "all", lf = r.lec || "all";
    return r.qids.map((id) => qmap[id]).filter((q) => {
      if (!q) return false;
      if (lf !== "all" && !(q.refs || []).some((x) => x.lecture === lf)) return false;
      const st = C.status(q, r, kov());
      if (f === "wrong") return st === "wrong" || st === "partial";
      if (f === "flag") return !!marks().flag[q.id];
      if (f === "blank") return st === "blank";
      return true;
    });
  };
  function viewRun(b, s, pos) {
    const r = activeRound(b, s);
    if (!r) { location.replace(base(b, s)); return; }
    const qmap = qmapOf(s);
    const i = Math.max(0, Math.min(r.qids.length - 1, (Number(pos) || 1) - 1));
    r.idx = i; r.at = Date.now();   // "at" = last time this round was open, for ทำต่อจากล่าสุด
    const q = qmap[r.qids[i]];
    const instant = r.mode === "practice";
    const reveal = !!r.chk[q.id];
    const vis = visible(b, s, r), vpos = vis.indexOf(q);
    const prev = vpos > 0 ? vis[vpos - 1] : vpos < 0 ? vis.filter((x) => r.qids.indexOf(x.id) < i).pop() : null;
    const next = vpos >= 0 ? vis[vpos + 1] : vis.find((x) => r.qids.indexOf(x.id) > i);
    const at = (x) => r.qids.indexOf(x.id) + 1, B = base(b, s);
    const st = C.roundStats(r, qmap, kov());
    const strip = vis.map((x) => {
      const ss = C.status(x, r, kov()), graded = ss === "ok" || ss === "wrong" || ss === "partial", fl = marks().flag[x.id];
      const cls = ["qc", graded ? ss : fl ? "flag" : ss === "answered" ? "answered" : "", graded && fl ? "flag-ring" : "", x === q ? "cur" : ""].join(" ");
      return `<button class="${cls}" data-go="${at(x)}" title="ข้อ ${at(x)}">${at(x)}</button>`;
    }).join("") || `<span class="hint">ไม่มีข้อที่ตรงกับตัวกรอง</span>`;
    const lecs = [...new Set(s.questions.flatMap((x) => (x.refs || []).filter((y) => y.lecture).map((y) => y.lecture)))].sort();
    const sel = (v, l, cur) => `<option value="${esc(v)}" ${cur === v ? "selected" : ""}>${esc(l)}</option>`;
    const limit = r.mode === "timed" ? (Number(s.meta.time_limit_min) || 0) * 60 : 0;
    const timerTxt = () => (r.mode === "practice" ? "" : limit ? `เหลือ ${mmss(Math.max(0, limit - r.elapsed))}` : `เวลา ${mmss(r.elapsed)}`);
    const isLast = !next;
    ML.main.innerHTML = headHTML(b, s, "") + `
      <div class="qhdr">
        <div class="qnav ${r.navOpen ? "open" : ""}"><div class="qrow">${strip}</div><button class="qexp" data-z="navtoggle">${r.navOpen ? "ย่อ" : "ดูทั้งหมด"}</button></div>
        <div class="qlegend"><span><i class="lg ok"></i>ถูก</span><span><i class="lg wrong"></i>ผิด</span><span><i class="lg partial"></i>ถูกบางส่วน</span><span><i class="lg flag"></i>ปักธง</span><span><i class="lg answered"></i>ตอบแล้ว รอตรวจ</span><span class="done">${r.mode === "practice" ? `ทำแล้ว ${st.checked + st.uncounted}/${st.total} · ถูก ${st.ok}` : `ตอบแล้ว ${st.answered}/${st.total}`}</span></div>
      </div>
      <div class="toolbar"><span class="pill">${MODE_TH[r.mode]}</span>${r.kind !== "full" ? `<span class="pill">${KIND_TH[r.kind]}</span>` : ""}
        ${lecs.length ? `<select data-zf="lec" aria-label="กรองตาม Lecture">${sel("all", "ทุก Lecture", r.lec || "all")}${lecs.map((l) => sel(l, lecName(b, l).slice(0, 48), r.lec)).join("")}</select>` : ""}
        <select data-zf="filter" aria-label="กรองตามสถานะ">${sel("all", "ทุกข้อ", r.filter || "all")}${sel("blank", "ยังไม่ได้ทำ", r.filter)}${sel("wrong", "เฉพาะข้อที่ผิด", r.filter)}${sel("flag", "เฉพาะข้อที่ปักธง", r.filter)}</select>
        <span class="timer" id="ztimer">${timerTxt()}</span></div>
      <article class="qcard">
        <div class="qhead"><div class="qnum">ข้อ ${i + 1} <small>/ ${r.qids.length} · ${esc(q.type)}${s.mix ? ` · ชุด ${q.cohort}` : ""}</small>${uncountedBadge(q)}</div>
          <button class="flagbtn" data-z="flag" aria-pressed="${!!marks().flag[q.id]}">${marks().flag[q.id] ? "ปักธงไว้ทบทวนแล้ว" : "ปักธงไว้ทบทวน"}</button></div>
        ${questionHTML(b, q, r, reveal, instant)}
        ${noteHTML(q)}
      </article>
      <div class="qfoot">
        <button class="btn" data-go="${prev ? at(prev) : ""}" ${prev ? "" : "disabled"}>← ข้อก่อนหน้า</button>
        ${r.mode === "practice" ? `<button class="btn ${isLast ? "primary" : "ghost"}" data-z="finish">${isLast ? "จบรอบ ดูผลสรุป" : "จบรอบนี้"}</button>` : `<button class="btn primary" data-z="submit">ส่งคำตอบทั้งหมด</button>`}
        <button class="btn" data-go="${next ? at(next) : ""}" ${next ? "" : "disabled"}>ข้อถัดไป →</button>
      </div>
      <p class="hint keys">คีย์ลัด: A–E หรือ 1–5 เลือกคำตอบ · ← → เปลี่ยนข้อ · F ปักธง</p>` + notepadHTML(b, s);
    const cur = ML.main.querySelector(".qc.cur"), row = ML.main.querySelector(".qrow");
    if (cur && row && !r.navOpen) row.scrollLeft += cur.getBoundingClientRect().left - row.getBoundingClientRect().left - row.clientWidth / 2 + cur.clientWidth / 2;
    save();
    stop();
    let tick = 0;
    TIMER = setInterval(() => {
      if (!document.body.contains($("#ztimer"))) return stop();
      r.elapsed++;
      $("#ztimer").textContent = timerTxt();
      if (limit && r.elapsed >= limit) { finishRound(b, s, r, true); return; }
      if (++tick % 5 === 0) save();
    }, 1000);
  }

  function finishRound(b, s, r, all) {
    stop();
    if (all) { const qm = qmapOf(s); r.qids.forEach((id) => { if (!r.chk[id]) { r.chk[id] = true; graded(qm[id], r); } }); }
    r.done = true; r.finished = Date.now(); save();
    location.hash = `${base(b, s)}/sum/${r.id}`;
    if (ML.syncSoon) ML.syncSoon();
  }

  /* ---------- summary of one round ---------- */
  function viewSummary(b, s, rid) {
    const rounds = roundsOf(b, s);
    const r = (rid && rounds.find((x) => x.id === rid)) || lastDone(b, s) || activeRound(b, s);
    let h = headHTML(b, s, "sum");
    if (!r) { ML.main.innerHTML = h + `<div class="empty">ยังไม่มีผล เริ่มทำชุดนี้ก่อน <a href="${base(b, s)}">ไปเริ่มทำ</a></div>`; return; }
    const qmap = qmapOf(s), st = C.roundStats(r, qmap, kov()), B = base(b, s);
    const qs = r.qids.map((id) => qmap[id]).filter(Boolean);
    const wrong = qs.filter((q) => { const x = C.status(q, r, kov()); return C.counts(q, kov()) && (x === "wrong" || x === "partial"); });
    const blank = qs.filter((q) => !r.chk[q.id]);
    const flagged = qs.filter((q) => marks().flag[q.id]);
    const unsure = qs.filter((q) => !C.counts(q, kov()));
    const jump = (q) => (r.done ? `#/q/${enc(q.id)}` : `${B}/run/${r.qids.indexOf(q.id) + 1}`);
    const no = (q) => r.qids.indexOf(q.id) + 1;
    const by = {};
    qs.filter((q) => r.chk[q.id] && C.counts(q, kov())).forEach((q) => {
      const ls = [...new Set((q.refs || []).filter((x) => x.lecture).map((x) => x.lecture))];
      (ls.length ? ls : ["ไม่ระบุ"]).forEach((l) => { const o = by[l] = by[l] || { n: 0, s: 0, ids: [] }; const sc = C.qScore(q, r, kov()) || 0; o.n++; o.s += sc; if (sc < 0.999) o.ids.push(q); });
    });
    h += `<div class="scorebox"><div class="big">${st.score} / ${st.checked}</div><div><b>${st.pct}%</b> · ${MODE_TH[r.mode]} · ${KIND_TH[r.kind] || ""}${r.mode !== "practice" || r.elapsed ? ` · ใช้เวลา ${mmss(r.elapsed)}` : ""}${st.uncounted ? ` · ไม่นับ ${st.uncounted} ข้อ` : ""}<div class="hint">${new Date(r.started).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}${blank.length ? ` · ยังไม่ได้ทำ ${blank.length} ข้อ` : ""}${r.done ? "" : " · รอบนี้ยังไม่จบ"}</div></div></div>`;
    if (!r.done) h += `<div class="btns"><a class="btn primary" href="${B}/run/${(r.idx || 0) + 1}">กลับไปทำต่อ</a></div>`;
    if (wrong.length && r.done) {
      h += `<h3>ข้อที่ผิด (${wrong.length}) · เลือกข้อที่จะทำซ้ำ</h3><div class="pickwrong">${wrong.map((q) => `<label class="chk"><input type="checkbox" data-wrongpick="${esc(q.id)}" checked> <a href="${jump(q)}">ข้อ ${no(q)}</a> <span class="hint">${esc(String(q.stem || q.case || "").slice(0, 70))}…</span></label>`).join("")}</div>
        <div class="btns"><button class="btn primary" data-z="retry" data-r="${r.id}">ทำข้อที่เลือกซ้ำเป็นรอบใหม่</button><a class="btn" href="${B}">ทำทั้งชุดอีกครั้ง</a></div>`;
    } else if (r.done) h += `<div class="btns"><span class="badge good">ไม่มีข้อที่ผิด</span><a class="btn" href="${B}">ทำทั้งชุดอีกครั้ง</a></div>`;
    const keys = Object.keys(by).sort((x, y) => by[x].s / by[x].n - by[y].s / by[y].n);
    if (keys.length) h += `<h3>คะแนนราย Lecture (อ่อนสุดอยู่บน)</h3><div class="tablewrap"><table><thead><tr><th>Lecture</th><th>คะแนน</th><th>ข้อที่ควรทบทวน</th></tr></thead><tbody>${keys.map((l) => `<tr><td>${esc(lecName(b, l))}</td><td>${Math.round(by[l].s * 10) / 10}/${by[l].n}</td><td>${by[l].ids.map((q) => `<a class="jump" href="${jump(q)}">ข้อ ${no(q)}</a>`).join("")}</td></tr>`).join("")}</tbody></table></div>`;
    const reread = rereadHTML(b, wrong);
    if (reread) h += `<h3>อ่านซ่อมจากข้อที่ผิด</h3>${reread}`;
    if (flagged.length) h += `<h3>ปักธงไว้ทบทวน (${flagged.length})</h3><p>${flagged.map((q) => `<a class="jump" href="${jump(q)}">ข้อ ${no(q)}</a>`).join("")}</p>`;
    if (unsure.length) h += `<h3>ข้อที่ไม่นับคะแนน (${unsure.length})</h3><p class="hint">เฉลยยังไม่ยืนยัน ทำได้แต่ไม่รวมในคะแนน ถ้าคิดว่าเฉลยผิดกด "แจ้งเฉลยน่าสงสัย"</p><p>${unsure.map((q) => `<a class="jump" href="${jump(q)}">ข้อ ${no(q)}</a>`).join("")}</p>`;
    ML.main.innerHTML = h + notepadHTML(b, s);
  }
  function rereadHTML(b, qs) {
    const g = {};
    qs.forEach((q) => (q.refs || []).filter((x) => x.lecture).forEach((x) => {
      const k = x.lecture + "|" + x.pages[0];
      const o = g[k] = g[k] || { lec: x.lecture, pages: x.pages, focus: x.focus || "", tier: (x.hotspot || {}).tier || 3, qs: [] };
      if (!o.qs.includes(q)) o.qs.push(q);
    }));
    const list = Object.values(g).sort((x, y) => x.tier - y.tier || y.qs.length - x.qs.length);
    if (!list.length) return "";
    return `<div class="lcard">${list.map((t) => `<div class="topic"><div class="pg"><a href="${pdfHref(b, t.lec, t.pages[0])}">${pgTxt(t.pages)}</a><span class="td t${t.tier}"></span></div><div><div class="hd">${esc(lecName(b, t.lec))}${t.focus ? ": " + esc(t.focus) : ""}</div><div class="hint">ข้อที่ผิด: ${t.qs.map((q) => `ข้อ ${qPos(q)}${q.cohort && t.qs.some((x) => x.cohort !== q.cohort) ? ` (ชุด ${q.cohort})` : ""}`).join(", ")}</div></div></div>`).join("")}</div>`;
  }

  /* ---------- history + graph ---------- */
  function chartSVG(points) {
    if (points.length < 2) return "";
    const W = 640, H = 180, pad = 28;
    const x = (i) => pad + (i * (W - pad * 2)) / (points.length - 1), y = (v) => H - pad - (v / 100) * (H - pad * 2);
    const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.pct).toFixed(1)}`).join(" ");
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="คะแนนแต่ละรอบ">
      ${[0, 50, 100].map((v) => `<line x1="${pad}" x2="${W - pad}" y1="${y(v)}" y2="${y(v)}" class="gl"/><text x="4" y="${y(v) + 4}" class="ax">${v}%</text>`).join("")}
      <path d="${line}" class="lnp"/>${points.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.pct)}" r="4" class="pt"><title>${esc(p.label)} · ${p.pct}%</title></circle>`).join("")}</svg>`;
  }
  function viewHistory(b, s) {
    const qmap = qmapOf(s), B = base(b, s);
    const rounds = roundsOf(b, s).filter((r) => !r.abandoned || Object.keys(r.chk).length);
    let h = headHTML(b, s, "hist");
    if (!rounds.length) { ML.main.innerHTML = h + `<div class="empty">ยังไม่มีประวัติ ทุกรอบที่ทำจะถูกเก็บไว้ที่นี่</div>`; return; }
    const pts = rounds.filter((r) => r.done && !r.abandoned && r.kind !== "retry" && C.roundStats(r, qmap, kov()).checked).map((r) => ({ pct: C.roundStats(r, qmap, kov()).pct, label: new Date(r.started).toLocaleDateString("th-TH") }));
    h += pts.length >= 2 ? `<h3>พัฒนาการ (รอบทั้งชุด)</h3>${chartSVG(pts)}` : `<p class="hint">ทำทั้งชุดครบ 2 รอบขึ้นไปจะเห็นกราฟพัฒนาการ</p>`;
    h += `<div class="tablewrap"><table><thead><tr><th>วันที่</th><th>แบบ</th><th>โหมด</th><th>คะแนน</th><th>เวลา</th><th></th></tr></thead><tbody>${rounds.slice().reverse().map((r) => {
      const st = C.roundStats(r, qmap, kov());
      return `<tr><td>${new Date(r.started).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}</td><td>${KIND_TH[r.kind] || ""}${r.abandoned ? " · ไม่ครบ" : !r.done ? " · กำลังทำ" : ""}</td><td>${MODE_SHORT[r.mode]}</td><td>${st.score}/${st.checked} (${st.pct}%)</td><td>${mmss(r.elapsed || 0)}</td><td><a href="${B}/sum/${r.id}">ดูผล</a></td></tr>`;
    }).join("")}</tbody></table></div>
      <div class="btns"><button class="btn danger" data-z="clearhist">ลบประวัติชุดนี้ทั้งหมด</button></div>`;
    ML.main.innerHTML = h;
  }

  /* ---------- Guidereader: set level + block plan ---------- */
  function topicsFromQuestions(b, qs, allQs) {
    // cluster refs by lecture + first page; years from every question in the block that points at the same pages
    const T = {};
    const add = (q, x, own) => {
      const k = x.lecture + "|" + x.pages[0];
      const t = T[k] = T[k] || { lecture: x.lecture, pages: [x.pages[0], x.pages[x.pages.length - 1]], heading: "", years: new Set(), own: [], all: [], tiers: [] };
      if (x.focus && !t.heading) t.heading = x.focus;
      if (q.cohort) t.years.add(q.cohort);
      if (x.hotspot) { t.tiers.push(x.hotspot.tier); (x.hotspot.years || []).forEach((y) => t.years.add(y)); }
      t.pages[1] = Math.max(t.pages[1], x.pages[x.pages.length - 1]);
      if (own && !t.own.includes(q.id)) t.own.push(q.id);
      if (!t.all.includes(q.id)) t.all.push(q.id);
    };
    qs.forEach((q) => (q.refs || []).filter((x) => x.lecture).forEach((x) => add(q, x, true)));
    if (allQs) allQs.forEach((q) => (q.refs || []).filter((x) => x.lecture && T[x.lecture + "|" + x.pages[0]]).forEach((x) => add(q, x, false)));
    return Object.values(T).map((t) => {
      const years = [...t.years].sort();
      const tier = t.tiers.length ? Math.min(...t.tiers) : years.length >= 3 ? 1 : years.length === 2 ? 2 : 3;
      return Object.assign(t, { years, tier });
    });
  }
  function topicRow(b, t, linkQ) {
    const span = t.pages[0] === t.pages[1] ? `หน้า ${t.pages[0]}` : `หน้า ${t.pages[0]}–${t.pages[1]}`;
    const ids = t.question_ids || t.own || [];
    return `<div class="topic${t.role === "supporting" ? " support" : ""}${t.in_set === false ? " other" : ""}"><div class="pg"><a href="${pdfHref(b, t.lecture, t.pages[0])}">${span}</a><span class="td t${t.tier}" title="Tier ${t.tier}"></span></div><div>
      <div class="hd">${esc(t.heading || span)}${t.role === "supporting" ? ' <span class="tier">อ่านประกอบ</span>' : ""}</div>
      ${t.summary ? `<div class="hint">${esc(t.summary)}</div>` : ""}
      ${t.focus && t.focus.length ? `<ul class="focus">${t.focus.map((f) => `<li>${esc(f.text)} <span class="hint">${(f.years || []).join(", ")}</span></li>`).join("")}</ul>` : ""}
      <div class="ref">${t.years && t.years.length >= 2 ? `<span class="hot">ออกซ้ำ ${t.years.length} ปี</span>` : t.years && t.years.length ? `<span class="tier">ออกปี ${t.years.join(", ")}</span>` : ""}<span class="tier">Tier ${t.tier} ${TIER_TXT[t.tier]}</span></div>
      ${ids.length ? `<div class="hint">ข้อ: ${ids.map((id) => `<a class="jump" href="${linkQ(id)}">${esc(qLabel(b, id))}</a>`).join("")}</div>` : ""}</div></div>`;
  }
  function qLabel(b, id) { const q = ML.examsOf(b).find((x) => x.id === id); return q ? `ชุด ${q.cohort}·ข้อ ${qPos(q)}` : id; }
  function guideLectures(b, topics) {
    const by = {};
    topics.forEach((t) => (by[t.lecture] = by[t.lecture] || []).push(t));
    return Object.entries(by).map(([lec, ts]) => ({ lecture: lec, topics: ts.sort((x, y) => x.pages[0] - y.pages[0]),
      weight: ts.reduce((a, t) => a + (4 - t.tier) * Math.max(1, t.years.length), 0),
      pages: ts.reduce((a, t) => a + t.pages[1] - t.pages[0] + 1, 0), n: new Set(ts.flatMap((t) => t.own || t.question_ids || [])).size }))
      .sort((x, y) => y.weight - x.weight);
  }
  function lcardHTML(b, L, linkQ, sub) {
    const inset = L.topics.filter((t) => t.in_set !== false), other = L.topics.filter((t) => t.in_set === false);
    return `<div class="lcard"><div class="lh"><a class="ln" href="#/lec/${enc(b.id)}/${enc(L.lecture)}">${esc(lecName(b, L.lecture))}</a><span class="hint">${sub}</span></div>
      ${inset.map((t) => topicRow(b, t, linkQ)).join("")}
      ${other.length ? `<div class="subhead">หัวข้ออื่นใน Lecture นี้ที่ออกบ่อย แต่ไม่อยู่ในชุดนี้</div>${other.map((t) => topicRow(b, t, linkQ)).join("")}` : ""}</div>`;
  }
  const tierLegend = `<div class="qlegend"><span><i class="lg t1"></i>Tier 1 ต้องอ่าน</span><span><i class="lg t2"></i>Tier 2 ควรอ่าน</span><span><i class="lg t3"></i>Tier 3 ถ้ามีเวลา</span></div>`;
  function viewGuide(b, s) {
    const linkQ = (id) => `#/q/${enc(id)}`;
    let h = headHTML(b, s, "guide");
    let lectures;
    if (s.guide && s.guide.lectures) {
      lectures = s.guide.lectures.map((L) => ({ lecture: L.lecture, topics: L.topics.map((t) => Object.assign({}, t, { lecture: L.lecture, pages: [t.pages[0], t.pages[t.pages.length - 1]] })),
        sub: `${L.n_in_set || 0} ข้อในชุดนี้ · อ่าน ${L.pages_total || "?"} หน้า` }));
      h += `<p class="lead">อ่านอะไรก่อนทำชุดนี้ แยกตาม Lecture เรียงจากสำคัญมากไปน้อย ความสำคัญคิดจากข้อสอบปี ${esc((s.guide.recent_years || []).join(", "))}</p>`;
    } else {
      lectures = guideLectures(b, topicsFromQuestions(b, s.questions, ML.examsOf(b))).map((L) => Object.assign(L, { sub: `${L.n} ข้อในชุดนี้ · ${L.pages} หน้า` }));
      h += `<p class="lead">หน้าที่ข้อในชุดนี้อ้างถึง จัดกลุ่มตาม Lecture · Tier คิดจากจำนวนปีที่หน้านั้นออกสอบในบล็อกนี้</p>`;
    }
    h += tierLegend;
    h += lectures.length ? lectures.map((L) => lcardHTML(b, L, linkQ, L.sub)).join("") : `<div class="empty">ข้อในชุดนี้ยังไม่ได้โยงกับหน้า lecture (มีแค่หน้าต้นฉบับข้อสอบ) เมื่อ Auditor ใส่หน้า lecture แล้ว แผนอ่านจะขึ้นที่นี่</div>`;
    const res = blockResults(b);
    const wrong = s.questions.filter((q) => q.id in res && res[q.id] < 0.999);
    h += `<h3>อ่านซ่อมจากข้อที่ผิดในชุดนี้</h3>${rereadHTML(b, wrong) || `<div class="empty">ยังไม่มีข้อที่ผิด เมื่อตรวจคำตอบแล้ว หน้าที่ควรอ่านซ่อมจะขึ้นที่นี่</div>`}`;
    ML.main.innerHTML = h;
  }
  // Block tab "แผนอ่าน": every exam question of the block → pages to read, by tier
  function planHTML(b) {
    const qs = ML.examsOf(b);
    const topics = topicsFromQuestions(b, qs, null);
    const linkQ = (id) => `#/q/${enc(id)}`;
    const tierF = (P().prefs || {}).planTier || 3;
    const lecs = guideLectures(b, topics.filter((t) => t.tier <= tierF));
    const withLec = qs.filter((q) => (q.refs || []).some((x) => x.lecture));
    const t1pages = topics.filter((t) => t.tier === 1).reduce((a, t) => a + t.pages[1] - t.pages[0] + 1, 0);
    const t1q = new Set(topics.filter((t) => t.tier === 1).flatMap((t) => t.own));
    const cohorts = [...new Set(qs.map((q) => q.cohort))].sort();
    let h = `<p class="lead">หน้า lecture ที่ข้อสอบชุด ${cohorts.join(", ")} อ้างถึง เรียงจาก Lecture ที่ออกมากสุด · กดเลขหน้าเพื่อเปิดอ่านตรงหน้านั้น</p>`;
    if (!withLec.length) return h + `<div class="empty">ข้อสอบในบล็อกนี้ยังไม่ได้โยงกับหน้า lecture แผนอ่านจะขึ้นเมื่อมี lecture และ Auditor ใส่หน้าอ้างอิงแล้ว</div>`;
    h += `<div class="statrow"><div><b>${t1pages}</b><span>หน้า Tier 1</span></div><div><b>${withLec.length ? Math.round((t1q.size / withLec.length) * 100) : 0}%</b><span>ของข้อที่โยง lecture ได้ อยู่ในหน้า Tier 1</span></div><div><b>${topics.length}</b><span>หัวข้อทั้งหมด</span></div></div>`;
    h += `<div class="toolbar">${tierLegend}<label>แสดง <select data-zplan="1"><option value="1" ${tierF === 1 ? "selected" : ""}>Tier 1 อย่างเดียว</option><option value="2" ${tierF === 2 ? "selected" : ""}>Tier 1–2</option><option value="3" ${tierF === 3 ? "selected" : ""}>ทุก Tier</option></select></label></div>`;
    h += lecs.map((L) => lcardHTML(b, L, linkQ, `${L.n} ข้อ · ${L.topics.length} หัวข้อ · ${L.pages} หน้า`)).join("");
    const res = blockResults(b);
    const wrong = qs.filter((q) => q.id in res && res[q.id] < 0.999);
    h += `<h3>อ่านซ่อมจากข้อที่ผิด (ทุกชุดในบล็อก)</h3>${rereadHTML(b, wrong) || `<div class="empty">ยังไม่มีข้อที่ผิด</div>`}`;
    return h;
  }

  /* ---------- block exam page: weak spots, quick random, MCQ | KF | OSPE | Lecture tabs ---------- */
  const TYPE_ORDER = ["MCQ", "KF", "OSPE"];
  const examTab = { block: null, tab: "MCQ" };   // a block page opens on MCQ; the choice is kept while you stay in that block
  function tabOf(b, types, hasLec, hasTopic) {
    if (examTab.block !== b.id) { examTab.block = b.id; examTab.tab = types[0] || (hasLec ? "lec" : "MCQ"); }
    if (examTab.tab !== "lec" && examTab.tab !== "topic" && !types.includes(examTab.tab)) examTab.tab = types[0] || "lec";
    if ((examTab.tab === "lec" && !hasLec) || (examTab.tab === "topic" && !hasTopic)) examTab.tab = types[0];
    return examTab.tab;
  }
  function examTabHTML(b) {
    const qs = ML.examsOf(b), res = blockResults(b);
    const lecCount = {};
    qs.forEach((q) => new Set((q.refs || []).filter((x) => x.lecture).map((x) => x.lecture)).forEach((l) => { lecCount[l] = (lecCount[l] || 0) + 1; }));
    const lecs = Object.keys(lecCount).sort();
    const wrongN = qs.filter((q) => q.id in res && res[q.id] < 0.999).length;
    const flagN = qs.filter((q) => marks().flag[q.id]).length;
    const mixes = Object.entries(P().mixes).filter(([, m]) => m.block === b.id);
    const types = TYPE_ORDER.filter((t) => b.sets.some((s) => s.type === t) || b.papers.some((p) => p.type === t));
    if (!types.length) return `<div class="empty">ยังไม่มีข้อสอบในบล็อกนี้</div>`;
    const topics = (b.topics || []).filter((tp) => qs.some((q) => q.topic === tp.id));
    const tab = tabOf(b, types, lecs.length > 0, topics.length > 0);
    const whole = tab === "lec" || tab === "topic";
    const pool = whole ? qs : qs.filter((q) => q.type === tab);
    let h = "";
    if (wrongN + flagN) h += `<button class="weakbar" data-z="mixweak"><span><b>ทบทวนจุดอ่อน</b><small>ผิดล่าสุด ${wrongN} ข้อ · ปักธง ${flagN} ข้อ</small></span><i aria-hidden="true">→</i></button>`;
    h += `<nav class="tabs etabs">${[...types.map((t) => [t, t]), ...(lecs.length ? [["lec", "Lecture"]] : []), ...(topics.length ? [["topic", "หัวข้อ"]] : [])].map(([k, l]) => `<button class="tab ${tab === k ? "on" : ""}" data-z="etab" data-t="${k}">${l}</button>`).join("")}</nav>`;
    if (pool.length) h += `<div class="quickrow"><button class="btn primary" data-z="mixrand" data-t="${tab}">สุ่ม ${Math.min(30, pool.length)} ข้อ${whole ? "จากทั้งบล็อก" : ` ${tab} จากทุกชุด`}</button></div>`;
    const card = (attrs, title, n, pct, prog) => `<${attrs.startsWith("href") ? "a" : "button"} class="pcard" ${attrs}><span class="ptop"><b>${title}</b><span class="n">${n} ข้อ</span></span>${prog ? `<span class="sbar"><i style="width:${pct}%"></i></span><span class="prog">${prog}</span>` : ""}</${attrs.startsWith("href") ? "a" : "button"}>`;
    // one card per lecture or topic; progress counts only questions that count toward scores
    const groupCard = (attrs, title, lq, noneText) => {
      const cq = lq.filter((q) => C.counts(q, kov()));
      const done = cq.filter((q) => q.id in res).length, ok = cq.filter((q) => res[q.id] >= 0.999).length;
      return card(attrs, title, lq.length, cq.length ? Math.round((done / cq.length) * 100) : 0, !cq.length ? noneText : done ? `ทำแล้ว ${done}/${cq.length} · ถูก ${ok}` : "");
    };
    if (tab === "lec") {
      h += `<div class="pgrid">${lecs.map((l) => groupCard(`data-z="mixlec" data-l="${esc(l)}"`, esc(lecName(b, l).slice(0, 60)),
        qs.filter((q) => (q.refs || []).some((x) => x.lecture === l)), "")).join("")}</div>`;
    } else if (tab === "topic") {
      h += `<div class="pgrid">${topics.map((tp) => groupCard(`data-z="mixtopic" data-tp="${esc(tp.id)}"`, esc(tp.name),
        qs.filter((q) => q.topic === tp.id), "เฉลยทั้งหัวข้อยังไม่ยืนยัน · ไม่นับคะแนน")).join("")}</div>`;
    } else {
      const cohorts = [...new Set([...b.sets.filter((s) => s.type === tab).map((s) => s.cohort), ...b.papers.filter((p) => p.type === tab).map((p) => p.cohort)])].sort((x, y) => y - x);
      h += `<div class="pgrid">${cohorts.map((c) => {
        const s = b.sets.find((x) => x.cohort === c && x.type === tab);
        if (!s) {
          const pdfs = b.papers.filter((p) => p.cohort === c && p.type === tab).map((p) => `<a class="pdflink" href="#/pdf/${enc(b.id)}/${enc(p.id)}/1" data-pdfpop="${esc(b.id)}|${esc(p.id)}|1">${p.role === "key" ? "PDF เฉลย" : "PDF ข้อสอบ"}</a>`).join("");
          return `<div class="pcard off"><span class="ptop"><b>ชุด ${c} · ${esc(tab)}</b></span><span class="prog">ยังไม่มีแบบออนไลน์</span>${pdfs ? `<span class="pdfs">${pdfs}</span>` : ""}</div>`;
        }
        const pr = setProgress(b, s), act = activeRound(b, s), pct = pr.total ? Math.round((pr.done / pr.total) * 100) : 0;
        const prog = act ? `ทำต่อ · ข้อ ${(act.idx || 0) + 1}` : !pr.total ? "เฉลยทั้งชุดยังไม่ยืนยัน · ไม่นับคะแนน" : pr.done ? `ทำแล้ว ${pr.done}/${pr.total} · ถูก ${pr.ok}` : "";
        return card(act ? `href="${base(b, s)}/run/${(act.idx || 0) + 1}"` : `data-z="qstart" data-s="${esc(s.id)}"`, `ชุด ${c} · ${esc(tab)}`, s.questions.length, pct, prog);
      }).join("")}</div>`;
    }
    if (mixes.length) h += `<div class="mixlist"><span class="hint">ชุดที่สร้างไว้:</span>${mixes.map(([id, m]) => `<span class="mixitem"><a href="#/set/${enc(b.id)}/@${enc(id)}">${esc(m.title)} (${m.qids.length})</a><button class="linkbtn" data-z="delmix" data-m="${esc(id)}" title="ลบชุดนี้">✕</button></span>`).join("")}</div>`;
    return h;
  }
  function makeMix(b, title, qids) {
    if (!qids.length) return;
    const same = Object.entries(P().mixes).find(([, m]) => m.block === b.id && m.title === title && m.qids.join() === qids.join());
    if (same) { location.hash = `#/set/${enc(b.id)}/@${enc(same[0])}`; return; }
    const id = Date.now().toString(36);
    P().mixes[id] = { block: b.id, title, qids, created: Date.now() }; C.touch(P(), "mixes", id);
    save(); location.hash = `#/set/${enc(b.id)}/@${enc(id)}`;
  }

  // the round in progress that was open most recently (any visible block), for the home page
  function lastActive() {
    let best = null;
    ML.visibleBlocks().forEach((b) => Object.entries(P().rounds).filter(([k]) => k.startsWith(b.id + "/")).forEach(([k, list]) => {
      const s = setLike(b, k.slice(b.id.length + 1)); if (!s || !Array.isArray(list)) return;
      list.forEach((r) => { if (r && !r.done && Array.isArray(r.qids) && (!best || (r.at || r.started || 0) > (best.r.at || best.r.started || 0))) best = { b, s, r }; });
    }));
    if (!best) return null;
    const { b, s, r } = best;
    return { href: `${base(b, s)}/run/${(r.idx || 0) + 1}`, title: s.mix ? s.title : `${b.name} · ชุด ${s.cohort} ${s.type}`, pos: (r.idx || 0) + 1, n: r.qids.length };
  }

  // review queue of one block: due now / waiting (questions removed from the block are left out)
  function reviewCounts(b) {
    const R = P().review || {}, ids = ML.examsOf(b).filter((q) => C.counts(q, kov())).map((q) => q.id).filter((id) => R[id]);
    return { due: C.reviewDue(P(), ids, Date.now()).length, queued: ids.length };
  }

  /* ---------- personal stats (#/stats) ---------- */
  function viewStats() {
    const blocks = ML.visibleBlocks().filter((b) => ML.examsOf(b).length);
    const pctTxt = (x) => (x.pct === null ? "—" : `${x.pct}%`);
    const cards = [], weak = [], pts = [];
    blocks.forEach((b) => {
      const qs = ML.examsOf(b), res = blockResults(b);
      const all = C.groupStats(qs, res, kov(), () => b.id)[0];
      if (!all || !all.done) return;
      const names = Object.fromEntries((b.topics || []).map((x) => [x.id, x.name]));
      const tops = (b.topics || []).length ? C.groupStats(qs, res, kov(), (q) => q.topic) : [];
      tops.forEach((x) => { if (x.done >= 5 && names[x.key]) weak.push({ b, x, name: names[x.key] }); });
      const rows = tops.map((x) => `<tr><td>${esc(names[x.key] || x.key)}</td><td>${x.done}/${x.total}</td><td>${pctTxt(x)}</td>
        <td><button class="btn sm" data-z="mixtopic" data-b="${esc(b.id)}" data-tp="${esc(x.key)}">ฝึก</button></td></tr>`).join("");
      cards.push(`<div class="statcard" data-blk="${esc(b.id)}" style="--blk:${esc(b.color || "var(--artery)")}">
        <div class="ptop"><b>${esc(b.name)}</b><span class="n">${pctTxt(all)}</span></div>
        <span class="sbar"><i style="width:${all.pct || 0}%"></i></span>
        <span class="prog">ทำแล้ว ${all.done}/${all.total} ข้อ · ถูก ${all.ok}</span>
        ${rows ? `<div class="tablewrap"><table><thead><tr><th>หัวข้อ (อ่อนสุดก่อน)</th><th>ทำแล้ว</th><th>คะแนน</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : ""}</div>`);
      Object.entries(P().rounds).filter(([k]) => k.startsWith(b.id + "/")).forEach(([k, list]) => {
        const s = setLike(b, k.slice(b.id.length + 1)); if (!s) return;
        const qmap = qmapOf(s);
        list.filter((r) => r.done && !r.abandoned && r.kind !== "retry").forEach((r) => {
          const st = C.roundStats(r, qmap, kov());
          if (st.checked) pts.push({ t: r.finished || r.started || 0, pct: st.pct, label: `${new Date(r.started).toLocaleDateString("th-TH")} · ${b.name} ${s.title || s.id}` });
        });
      });
    });
    let h = `<div class="head"><h2>สถิติของฉัน</h2><p class="hint">ใช้ผลล่าสุดของแต่ละข้อ ไม่นับข้อที่เฉลยยังไม่ยืนยัน</p></div><div id="stats">`;
    if (!cards.length) { ML.main.innerHTML = h + `<div class="empty">ยังไม่มีข้อมูล ทำข้อสอบสักชุดก่อน แล้วสถิติจะขึ้นที่นี่</div></div>`; return; }
    weak.sort((a, b) => a.x.pct - b.x.pct);
    if (weak.length) h += `<div class="quickrow"><button class="btn primary weakest" data-z="mixtopic" data-b="${esc(weak[0].b.id)}" data-tp="${esc(weak[0].x.key)}">ฝึกหัวข้อที่อ่อนสุด: ${esc(weak[0].name)} (${weak[0].x.pct}%)</button></div>`;
    pts.sort((a, b) => a.t - b.t);
    h += pts.length >= 2 ? `<h3>คะแนนแต่ละรอบ</h3>${chartSVG(pts)}` : `<p class="hint">ทำครบ 2 รอบขึ้นไปจะเห็นกราฟ</p>`;
    ML.main.innerHTML = h + `<div class="statgrid">${cards.join("")}</div></div>`;
  }

  /* ---------- floating notepad per set ---------- */
  let padOpen = false;
  function notepadHTML(b, s) {
    const n = marks().setNotes[keyOfSet(b, s)];
    return `<div class="notepad ${padOpen ? "open" : ""}">${padOpen ? `<div class="padbox"><div class="padhead"><b>โน้ตของชุดนี้</b><button class="linkbtn" data-z="pad">ปิด</button></div><textarea data-setnote="${esc(keyOfSet(b, s))}" rows="8" placeholder="จดศัพท์ / สิ่งที่อยากจำ (เก็บในเครื่องนี้)">${esc(n ? n.text : "")}</textarea></div>` : ""}
      <button class="fab" data-z="pad" title="โน้ตของชุดนี้" aria-label="โน้ตของชุดนี้">${padOpen ? "✕" : "✎"}${!padOpen && n && n.text ? "<i></i>" : ""}</button></div>`;
  }

  /* ---------- single question page (#/q/<id>): try it once, not saved as a round ---------- */
  const single = {};
  function viewSingle(b, q) {
    const s = ML.findSet(b, q._set);
    const r = single[q.id] = single[q.id] || { qids: [q.id], ans: {}, chk: {}, ov: {}, choiceOrder: {} };
    ML.main.innerHTML = `<div class="crumbs"><a href="#/">ทั้งหมด</a><span>/</span><a href="#/b/${enc(b.id)}">${esc(b.name)}</a><span>/</span>${s ? `<a href="${base(b, s)}">ชุด ${q.cohort} · ${esc(s.type)}</a><span>/</span>` : ""}<span>ข้อ ${qPos(q)}</span></div>
      <article class="qcard single"><div class="qhead"><div class="qnum">ข้อ ${qPos(q)} <small>${esc(q.type)} · ชุด ${q.cohort}</small>${uncountedBadge(q)}</div>
        <button class="flagbtn" data-z="flag" data-q="${esc(q.id)}" aria-pressed="${!!marks().flag[q.id]}">${marks().flag[q.id] ? "ปักธงไว้ทบทวนแล้ว" : "ปักธงไว้ทบทวน"}</button></div>
        ${questionHTML(b, q, r, !!r.chk[q.id], true)}${noteHTML(q)}
        ${r.chk[q.id] ? `<div class="btns"><button class="btn" data-z="singleredo">ลองใหม่</button></div>` : ""}</article>`;
  }

  /* ---------- routing + events (called by app.js) ---------- */
  function view(bid, sid, sub, arg) {
    stop();
    const b = ML.findBlock(bid), s = setLike(b, sid);
    if (!s) return ML.notFound("ไม่พบชุดข้อสอบนี้");
    if (sub && /^\d+$/.test(sub)) return location.replace(`${base(b, s)}/run/${sub}`);
    if (sub === "run") return viewRun(b, s, arg);
    if (sub === "sum") return viewSummary(b, s, arg);
    if (sub === "hist") return viewHistory(b, s);
    if (sub === "guide") return viewGuide(b, s);
    return viewOverview(b, s);
  }
  function ctx() {
    const h = ML.parseHash();
    if (h[0] === "set") { const b = ML.findBlock(h[1]), s = setLike(b, h[2]); return { b, s, r: b && s ? activeRound(b, s) : null, sub: h[3], arg: h[4] }; }
    if (h[0] === "q") { const f = ML.findQuestion(h[1]); return f ? { b: f.b, s: null, q: f.q, r: single[f.q.id], single: true } : {}; }
    if (h[0] === "b") return { b: ML.findBlock(h[1]) };
    return {};
  }
  const curQ = (c) => (c.single ? c.q : c.r && c.s ? qmapOf(c.s)[c.r.qids[c.r.idx || 0]] : null);
  const rerender = () => ML.route();

  async function onClick(t) {
    const c = ctx();
    if (t.dataset.zoom) { t.classList.toggle("zoom"); return true; }
    if (t.dataset.go !== undefined) { if (t.dataset.go && c.s) location.replace(`${base(c.b, c.s)}/run/${t.dataset.go}`); return true; }
    if (t.dataset.opt) {
      const q = curQ(c), r = c.r; if (!q || !r || r.chk[q.id]) return true;
      r.ans[q.id] = t.dataset.opt;
      if (c.single || r.mode === "practice") { r.chk[q.id] = true; graded(q, r); }
      if (!c.single) save();
      rerender();
      const ex = $(".qcard .explain"); if (ex) ex.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return true;
    }
    if (t.dataset.ov) {
      const q = curQ(c), r = c.r; if (!q || !r) return true;
      const o = r.ov[q.id] = r.ov[q.id] || {};
      if (t.dataset.ov === "auto") delete o[t.dataset.item]; else o[t.dataset.item] = Number(t.dataset.ov);
      if (r.chk[q.id]) graded(q, r);
      if (!c.single) save(); rerender(); return true;
    }
    const z = t.dataset.z; if (!z) return false;
    const q = curQ(c);
    if (z === "start") {
      const mode = (document.querySelector('input[name="mode"]:checked') || {}).value || "practice";
      const shuffleQ = $("#shufQ").checked, shuffleC = $("#shufC").checked;
      P().prefs = Object.assign(P().prefs || {}, { mode, shuffleQ, shuffleC });
      startRound(c.b, c.s, { mode, shuffleQ, shuffleC }); return true;
    }
    if (z === "abandon") { if (!ML.armed(t)) return true; const r = activeRound(c.b, c.s); if (r) { r.done = true; r.abandoned = true; r.finished = Date.now(); save(); } rerender(); return true; }
    if (z === "navtoggle") { c.r.navOpen = !c.r.navOpen; save(); rerender(); return true; }
    if (z === "flag") { const id = t.dataset.q || (q && q.id); if (id) { if (marks().flag[id]) delete marks().flag[id]; else { marks().flag[id] = true; C.reviewAdd(P(), (ML.findQuestion(id) || {}).q, Date.now(), kov()); } C.touch(P(), "flag", id); save(); rerender(); } return true; }
    if (z === "check") { if (q && c.r) { c.r.chk[q.id] = true; graded(q, c.r); save(); rerender(); } return true; }
    if (z === "singleredo") { delete single[c.q.id]; rerender(); return true; }
    if (z === "finish") {
      const r = c.r, left = r.qids.filter((id) => !r.chk[id]).length;
      if (left && !ML.armed(t, `ยังไม่ได้ทำ ${left} ข้อ · กดอีกครั้งเพื่อจบรอบ`)) return true;
      finishRound(c.b, c.s, r, false); return true;
    }
    if (z === "submit") {
      const r = c.r, left = r.qids.filter((id) => !C.answered(qmapOf(c.s)[id], r)).length;
      if (!ML.armed(t, left ? `ยังไม่ตอบ ${left} ข้อ · กดอีกครั้งเพื่อส่ง` : "กดอีกครั้งเพื่อส่ง")) return true;
      finishRound(c.b, c.s, r, true); return true;
    }
    if (z === "retry") {
      const ids = [...document.querySelectorAll("[data-wrongpick]:checked")].map((x) => x.dataset.wrongpick);
      if (!ids.length) { ML.toast("เลือกข้อที่จะทำซ้ำอย่างน้อย 1 ข้อ"); return true; }
      const from = roundsOf(c.b, c.s).find((x) => x.id === t.dataset.r) || {};
      const qmap = qmapOf(c.s), order = (from.qids || ids).filter((id) => ids.includes(id));
      startRound(c.b, c.s, { kind: "retry", mode: "practice", shuffleQ: !!from.shuffleQ, shuffleC: !!from.shuffleC, parent: from.id || null });
      const r = activeRound(c.b, c.s); r.qids = from.shuffleQ ? C.shuffle(order) : order;
      r.choiceOrder = Object.fromEntries(Object.entries(r.choiceOrder).filter(([k]) => qmap[k] && ids.includes(k)));
      save(); return true;
    }
    if (z === "clearhist") { if (!ML.armed(t)) return true; P().rounds[keyOfSet(c.b, c.s)] = []; C.touch(P(), "clear", keyOfSet(c.b, c.s)); save(); rerender(); return true; }
    if (z === "pad") { padOpen = !padOpen; rerender(); return true; }
    if (z === "etab") { examTab.tab = t.dataset.t; rerender(); return true; }
    if (z === "qstart") {
      const s = ML.findSet(c.b, t.dataset.s); if (!s) return true;
      const pref = P().prefs || {};
      startRound(c.b, s, { mode: pref.mode || "practice", shuffleQ: !!pref.shuffleQ, shuffleC: !!pref.shuffleC }); return true;
    }
    if (z === "review") {
      const b = ML.findBlock(t.dataset.b); if (!b) return true;
      const ids = C.reviewDue(P(), ML.examsOf(b).filter((x) => C.counts(x, kov())).map((x) => x.id), Date.now());
      makeMix(b, `ทบทวนวันนี้ · ${new Date().toLocaleDateString("th-TH", { day: "numeric", month: "short" })}`, ids); return true;
    }
    if (z === "mixtopic") {
      const b = (t.dataset.b && ML.findBlock(t.dataset.b)) || c.b; if (!b) return true;
      const tp = (b.topics || []).find((x) => x.id === t.dataset.tp); if (!tp) return true;
      makeMix(b, `${tp.name} · ทุกชุด`, ML.examsOf(b).filter((x) => x.topic === tp.id).map((x) => x.id)); return true;
    }
    if (z === "mixlec") {
      const l = t.dataset.l, qs = ML.examsOf(c.b).filter((x) => (x.refs || []).some((y) => y.lecture === l));
      qs.sort((x, y) => (x.refs.find((r) => r.lecture === l).pages[0] - y.refs.find((r) => r.lecture === l).pages[0]) || y.cohort - x.cohort);
      makeMix(c.b, `${lecName(c.b, l)} · ทุกชุด`, qs.map((x) => x.id)); return true;
    }
    if (z === "mixrand") {
      const ty = TYPE_ORDER.includes(t.dataset.t) ? t.dataset.t : "";
      const n = 30, pool = ML.examsOf(c.b).filter((x) => !ty || x.type === ty);
      makeMix(c.b, `สุ่ม ${Math.min(n, pool.length)} ข้อ${ty ? " " + ty : ""} · ${new Date().toLocaleDateString("th-TH", { day: "numeric", month: "short" })}`, C.shuffle(pool).slice(0, n).map((x) => x.id)); return true;
    }
    if (z === "mixweak") {
      const res = blockResults(c.b);
      const ids = ML.examsOf(c.b).filter((x) => (x.id in res && res[x.id] < 0.999) || marks().flag[x.id]).map((x) => x.id);
      makeMix(c.b, `จุดอ่อน: ผิด + ปักธง · ${new Date().toLocaleDateString("th-TH", { day: "numeric", month: "short" })}`, ids); return true;
    }
    if (z === "delmix") { if (!ML.armed(t, "ลบ?")) return true; delete P().mixes[t.dataset.m]; delete P().rounds[`${c.b.id}/@${t.dataset.m}`]; C.touch(P(), "mixes", t.dataset.m); C.touch(P(), "clear", `${c.b.id}/@${t.dataset.m}`); save(); rerender(); return true; }
    if (z === "unkey") { delete marks().keyOverride[t.dataset.q]; C.touch(P(), "keyOverride", t.dataset.q); save(); rerender(); return true; }
    if (z === "setkey" || z === "report") {
      const box = t.closest(".report"), id = t.dataset.q;
      const qq = ML.findQuestion(id); if (!qq) return true;
      const k = box.querySelector("[data-rep-key]"), local = box.querySelector("[data-rep-local]");
      const reason = box.querySelector("[data-rep-reason]").value.trim(), msg = box.querySelector("[data-rep-msg]");
      const want = k ? k.value : "";
      if (z === "setkey") { if (!want) { msg.textContent = "เลือกคำตอบที่คิดว่าถูกก่อน"; return true; } marks().keyOverride[id] = want; C.touch(P(), "keyOverride", id); save(); rerender(); return true; }
      if (reason.length < 3) { msg.textContent = "ใส่เหตุผลสั้น ๆ ก่อนส่ง"; return true; }
      if (want && local && local.checked) { marks().keyOverride[id] = want; C.touch(P(), "keyOverride", id); }
      const payload = { qid: id, set: qq.q._set || "", answer: qq.q.type === "MCQ" ? qq.q.answer : "(KF/OSPE)", override: want, reason, page: location.href };
      const url = (ML.APP.config.report_url || ML.APP.config.drive_proxy_url || "").replace(/\/+$/, "");
      msg.textContent = "กำลังส่ง…";
      let sent = false;
      if (url) {
        try { const res = await fetch(url + "/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); sent = res.ok; } catch (e) { sent = false; }
      }
      if (sent) { marks().reported[id] = Date.now(); C.touch(P(), "reported", id); save(); ML.toast("ส่งถึงผู้ดูแลแล้ว ขอบคุณที่ช่วยตรวจ"); rerender(); return true; }
      const body = `ข้อ ${id}\nเฉลยในเว็บ: ${payload.answer}\nควรเป็น: ${want || "-"}\nเหตุผล: ${reason}\n${location.href}`;
      const repo = ML.APP.config.repo;
      save();
      msg.innerHTML = `ส่งอัตโนมัติไม่ได้ (ยังไม่ได้ตั้งคิวแจ้ง) · <button class="linkbtn" data-copy="${esc(body)}">คัดลอกข้อความ</button>${repo ? ` · <a target="_blank" rel="noopener" href="https://github.com/${esc(repo)}/issues/new?labels=answer-report&title=${enc("[เฉลย] " + id)}&body=${enc(body)}">เปิด GitHub Issue</a>` : ""}`;
      return true;
    }
    return false;
  }
  function onChange(t) {
    const c = ctx();
    if (t.dataset.zf && c.r) { c.r[t.dataset.zf] = t.value; save(); const v = visible(c.b, c.s, c.r); location.replace(`${base(c.b, c.s)}/run/${v.length ? c.r.qids.indexOf(v[0].id) + 1 : 1}`); return true; }
    if (t.dataset.zplan) { P().prefs = Object.assign(P().prefs || {}, { planTier: Number(t.value) }); save(); rerender(); return true; }
    if (t.dataset.item && t.type === "checkbox" && c.r) {
      const q = curQ(c); const A = c.r.ans[q.id] = c.r.ans[q.id] || {}; const a = A[t.dataset.item] = A[t.dataset.item] || {};
      a.sel = (a.sel || []).filter((k) => k !== t.value); if (t.checked) a.sel.push(t.value);
      if (!c.single) save(); return true;
    }
    return false;
  }
  let typing = 0;
  function onInput(t) {
    const c = ctx();
    if (t.dataset.item && t.tagName === "TEXTAREA" && c.r) {
      const q = curQ(c); const A = c.r.ans[q.id] = c.r.ans[q.id] || {};
      (A[t.dataset.item] = A[t.dataset.item] || {}).text = t.value;
      clearTimeout(typing); if (!c.single) typing = setTimeout(save, 400);
      return true;
    }
    if (t.dataset.qnote) { const v = t.value; if (v.trim()) marks().notes[t.dataset.qnote] = { t: Date.now(), text: v }; else delete marks().notes[t.dataset.qnote]; C.touch(P(), "notes", t.dataset.qnote); clearTimeout(typing); typing = setTimeout(save, 400); return true; }
    if (t.dataset.setnote) { const v = t.value; if (v.trim()) marks().setNotes[t.dataset.setnote] = { t: Date.now(), text: v }; else delete marks().setNotes[t.dataset.setnote]; C.touch(P(), "setNotes", t.dataset.setnote); clearTimeout(typing); typing = setTimeout(save, 400); return true; }
    return false;
  }
  function onKey(ev) {
    const h = location.hash;
    if (!(/^#\/set\/[^/]+\/[^/]+\/run\//.test(h) || h.startsWith("#/q/"))) return false;
    const k = ev.key.toUpperCase();
    const btn = /^[A-E]$/.test(k) ? document.querySelectorAll(".opts .opt")["ABCDE".indexOf(k)] : /^[1-5]$/.test(k) ? document.querySelectorAll(".opts .opt")[Number(k) - 1]
      : ev.key === "ArrowRight" ? $(".qfoot [data-go]:last-child") : ev.key === "ArrowLeft" ? $(".qfoot [data-go]") : k === "F" ? $('[data-z="flag"]') : null;
    if (btn && !btn.disabled) { ev.preventDefault(); btn.click(); return true; }
    return false;
  }

  return { counts: (q) => C.counts(q, kov()), qPos, view, viewSingle, viewStats, reviewCounts, lastActive, examTabHTML, planHTML, onClick, onChange, onInput, onKey, stop, blockResults };
};
