/*
 * MedLib quiz logic (no DOM): scoring for MCQ / KF / OSPE, rounds, history stats, merging progress files.
 * Used by quiz.js in the browser and by _test/quizcore.test.cjs in Node.
 */
(function (root) {
  "use strict";

  /* ---------- answers & scoring ---------- */
  const norm = (s) => String(s || "").toLowerCase().replace(/[\s.,;:!?()\-–_/'"]+/g, "");

  // English words with spaces between them, so an accepted answer can be matched from the start of a word.
  const words = (s) => " " + String(s || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const ascii = (s) => /^[\x00-\x7f]*$/.test(s);

  // Short written answer: matches an accepted answer (either contains the other, min 4 chars), or contains every keyword.
  // An English accepted answer must start at a word ("thyroid" does not pass "parathyroid"); one of ≤ 3 letters must be a
  // whole word ("gh" does not pass "high"); typing only the start of it counts only for a one-word answer ("pheochromo…");
  // Thai (no spaces between words) and keywords_all stems still match anywhere.
  function autoMatch(item, text) {
    const t = norm(text); if (!t) return false;
    const tw = words(text);
    for (const acc of item.accepted || []) {
      const a = norm(acc); if (!a) continue;
      if (ascii(acc)) {
        const aw = words(acc);
        const hit = a.length <= 3 ? (tw + " ").includes(aw + " ") : tw.includes(aw);
        if (hit || t === a || (!aw.includes(" ", 1) && aw.startsWith(tw) && t.length >= Math.max(4, 0.75 * a.length))) return true;
      } else if (t.includes(a) || (a.includes(t) && t.length >= 4)) return true;
    }
    const kw = item.keywords_all || [];
    return kw.length > 0 && kw.every((k) => t.includes(norm(k)));
  }

  // a = this item's answer {text} or {sel: []}; ov = 1 / 0 / undefined (user judged it themselves)
  function itemScore(item, a, ov) {
    if (item.format === "select") {
      const sel = (a && a.sel) || [], ans = item.answer || [];
      if (!sel.length || !ans.length) return 0;
      if (item.max_answers && sel.length > item.max_answers) return 0;
      return sel.filter((k) => ans.includes(k)).length / ans.length;
    }
    if (ov === 1 || ov === 0) return ov;
    return autoMatch(item, a && a.text) ? 1 : 0;
  }

  // The key this person scores against: their own override (this device) wins over the shared key.
  // Disputed questions carry the AI's answer and, when other cohorts asked the same thing, which side they
  // agree with (same_side: {otherId: "source"|"ai"|"none"}). Until the person picks, the majority of other
  // cohorts decides; a tie or no other cohort keeps the source key.
  function autoKey(q) {
    if (!q.ai_answer) return q.answer;
    const v = Object.values(q.same_side || {});
    return v.filter((x) => x === "ai").length > v.filter((x) => x === "source").length ? q.ai_answer : q.answer;
  }
  const keyOf = (q, keyOv) => (keyOv && keyOv[q.id]) || autoKey(q);
  // Every MCQ choice that scores: the key plus also_accept (questions with more than one right choice).
  // A personal override replaces them all.
  const okKeys = (q, keyOv) => {
    if (keyOv && keyOv[q.id]) return [keyOv[q.id]];
    if (q.ai_answer) return [autoKey(q)];
    return q.answer ? [q.answer, ...(q.also_accept || [])] : [];
  };

  // Does this question count toward scores, progress and weak spots? Answers still marked draft/disputed do not,
  // unless this person set their own key for it (they decided).
  const UNCOUNTED = ["draft", "disputed"];
  const counts = (q, keyOv) => !!(keyOv && keyOv[q.id]) || !!q.ai_answer || !UNCOUNTED.includes(q.answer_status);

  // Score of one question in one round: 0..1, or null when it cannot be scored.
  function qScore(q, round, keyOv) {
    const a = round.ans[q.id];
    if (q.type === "MCQ") { const ks = okKeys(q, keyOv); return ks.length ? (ks.includes(a) ? 1 : 0) : null; }
    const items = q.items || []; if (!items.length) return null;
    const ov = (round.ov && round.ov[q.id]) || {};
    return items.reduce((s, it) => s + itemScore(it, (a || {})[it.id], ov[it.id]), 0) / items.length;
  }

  function answered(q, round) {
    const a = round.ans[q.id]; if (a == null) return false;
    if (q.type === "MCQ") return true;
    return Object.keys(a).some((k) => { const v = a[k] || {}; return (v.text && v.text.trim()) || (v.sel && v.sel.length); });
  }

  // blank / answered (not checked yet) / ok / partial / wrong
  function status(q, round, keyOv) {
    if (!answered(q, round)) return round.chk[q.id] ? "wrong" : "blank";
    if (!round.chk[q.id]) return "answered";
    const sc = qScore(q, round, keyOv);
    if (sc == null) return "answered";
    return sc >= 0.999 ? "ok" : sc <= 0.001 ? "wrong" : "partial";
  }

  /* ---------- rounds ---------- */
  function shuffle(arr, rnd) {
    const a = arr.slice(), r = rnd || Math.random;
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // qs: questions in paper order. opts: {kind, mode, shuffleQ, shuffleC, parent}
  function newRound(qs, opts) {
    const o = opts || {};
    const qids = qs.map((q) => q.id);
    const choiceOrder = {};
    if (o.shuffleC) qs.forEach((q) => { if (q.type === "MCQ") choiceOrder[q.id] = shuffle(Object.keys(q.options || {})); });
    return {
      id: newId(), kind: o.kind || "full", mode: o.mode || "practice", shuffleQ: !!o.shuffleQ, shuffleC: !!o.shuffleC,
      qids: o.shuffleQ ? shuffle(qids) : qids, choiceOrder, ans: {}, chk: {}, ov: {}, idx: 0,
      started: Date.now(), elapsed: 0, done: false, finished: null, parent: o.parent || null,
    };
  }

  // qmap: id → question
  function roundStats(round, qmap, keyOv) {
    const qs = round.qids.map((id) => qmap[id]).filter(Boolean);
    let score = 0, checked = 0, ans = 0, wrong = 0, ok = 0, uncounted = 0;
    qs.forEach((q) => {
      if (answered(q, round)) ans++;
      if (!round.chk[q.id]) return;
      if (!counts(q, keyOv)) { uncounted++; return; }
      const sc = qScore(q, round, keyOv); if (sc == null) return;
      checked++; score += sc; if (sc >= 0.999) ok++; else wrong++;
    });
    return { total: qs.length, answered: ans, checked, score: Math.round(score * 10) / 10, ok, wrong, uncounted, pct: checked ? Math.round((score / checked) * 100) : 0 };
  }

  // Latest checked result of each question across all rounds (newest round wins): id → score 0..1
  function latestResults(rounds, qmap, keyOv) {
    const out = {};
    (rounds || []).filter((r) => r && Array.isArray(r.qids) && r.chk).sort((a, b) => (a.started || 0) - (b.started || 0)).forEach((r) => {
      r.qids.forEach((id) => { const q = qmap[id]; if (q && r.chk[id] && counts(q, keyOv)) { const sc = qScore(q, r, keyOv); if (sc != null) out[id] = sc; } });
    });
    return out;
  }

  // Score per group (block, topic…) from latest results; only questions that count. Weakest first, untouched last.
  function groupStats(qs, res, keyOv, keyOf) {
    const g = new Map();
    (qs || []).forEach((q) => {
      const k = keyOf(q); if (!k || !counts(q, keyOv)) return;
      const x = g.get(k) || { key: k, total: 0, done: 0, ok: 0, sum: 0 };
      x.total++;
      if (q.id in res) { x.done++; x.sum += res[q.id]; if (res[q.id] >= 0.999) x.ok++; }
      g.set(k, x);
    });
    return [...g.values()].map(({ key, total, done, ok, sum }) => ({ key, total, done, ok, pct: done ? Math.round((100 * sum) / done) : null }))
      .sort((a, b) => (a.pct === null) - (b.pct === null) || (a.pct || 0) - (b.pct || 0) || String(a.key).localeCompare(String(b.key)));
  }

  /* ---------- review queue: wrong or flagged → back in 1, 3, 7 days; 3 right on time → out ---------- */
  const DAY = 864e5, GAPS = [1, 3, 7];
  const dayStart = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  function reviewUpdate(p, q, score, now, keyOv) {
    if (!q || score == null || !counts(q, keyOv)) return;
    const R = p.review = p.review || {}, e = R[q.id];
    if (score < 0.999) R[q.id] = { step: 0, due: dayStart(now) + DAY, t: now };
    else if (e && now >= e.due) {
      const step = e.step + 1;
      if (step >= GAPS.length) delete R[q.id];
      else R[q.id] = { step, due: dayStart(now) + GAPS[step] * DAY, t: now };
    } else return;
    touch(p, "review", q.id, now);
  }
  function reviewAdd(p, q, now, keyOv) {
    if (!q || !counts(q, keyOv)) return;   // a question whose answer does not count never enters (it could never leave)
    const R = p.review = p.review || {};
    if (R[q.id]) return;
    R[q.id] = { step: 0, due: dayStart(now) + DAY, t: now };
    touch(p, "review", q.id, now);
  }
  const reviewDue = (p, ids, now) => (ids || []).filter((id) => p.review && p.review[id] && p.review[id].due <= now);

  /* ---------- progress file merge (export on one device, import on another) ---------- */
  // Rounds: union by id (the one with more checked answers wins). Notes: newest wins. Flags/overrides/reports: union.
  // ts["<kind>:<id>"] = when that item was last added, changed or deleted on a device (ms).
  // Merge: the side with the newer time wins, so a delete is not undone by an older copy.
  // Same time or no time (data from before this existed): keep both, as before.
  function touch(p, kind, id, t) { p.ts = p.ts || {}; p.ts[`${kind}:${id}`] = t || Date.now(); }
  function mergeProgress(mine, theirs) {
    const m = JSON.parse(JSON.stringify(mine || {})), t = theirs || {};
    const mt = m.ts || {}, tt = t.ts || {};
    const ts = Object.assign({}, mt);
    Object.entries(tt).forEach(([k, v]) => { if (!(ts[k] >= v)) ts[k] = v; });
    const pick = (kind, a, b, tie) => {   // a = mine (copy), b = theirs; returns the merged map
      const out = {};
      new Set([...Object.keys(a), ...Object.keys(b)]).forEach((id) => {
        const ka = mt[`${kind}:${id}`] || 0, kb = tt[`${kind}:${id}`] || 0;
        const v = ka > kb ? a[id] : kb > ka ? b[id] : tie(a[id], b[id]);
        if (v !== undefined) out[id] = v;
      });
      return out;
    };
    const mineFirst = (x, y) => (x !== undefined ? x : y);
    const newest = (x, y) => (!x ? y : y && y.t > x.t ? y : x);
    m.rounds = m.rounds || {};
    Object.entries(t.rounds || {}).forEach(([setKey, list]) => {
      const cur = m.rounds[setKey] = m.rounds[setKey] || [];
      (list || []).forEach((r) => {
        const i = cur.findIndex((x) => x.id === r.id);
        if (i < 0) cur.push(r);
        else if (Object.keys(r.chk || {}).length > Object.keys(cur[i].chk || {}).length || (r.done && !cur[i].done)) cur[i] = r;
      });
    });
    Object.keys(m.rounds).forEach((setKey) => {
      const cut = ts[`clear:${setKey}`] || 0;
      m.rounds[setKey] = m.rounds[setKey].filter((r) => (r.started || 0) > cut).sort((a, b) => (a.started || 0) - (b.started || 0));
    });
    const mk = m.marks = m.marks || {}, tk = t.marks || {};
    ["flag", "keyOverride", "reported"].forEach((k) => { mk[k] = pick(k, mk[k] || {}, tk[k] || {}, mineFirst); });
    ["notes", "setNotes"].forEach((k) => { mk[k] = pick(k, mk[k] || {}, tk[k] || {}, newest); });
    const mr = m.read = m.read || {};
    Object.entries(t.read || {}).forEach(([id, r]) => { if (!mr[id] || (r && r.t > mr[id].t)) mr[id] = r; });
    m.review = pick("review", m.review || {}, t.review || {}, (x, y) => (!x ? y : y && y.due < x.due ? y : x));
    m.mixes = pick("mixes", m.mixes || {}, t.mixes || {}, mineFirst);
    m.ts = ts;
    return m;
  }

  const api = { norm, autoMatch, itemScore, autoKey, keyOf, okKeys, counts, qScore, answered, status, shuffle, newRound, roundStats, latestResults, groupStats, mergeProgress, touch, reviewUpdate, reviewAdd, reviewDue };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MedLibQuiz = api;
})(typeof self !== "undefined" ? self : this);
