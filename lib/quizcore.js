/*
 * MedLib quiz logic (no DOM): scoring for MCQ / KF / OSPE, rounds, history stats, merging progress files.
 * Used by quiz.js in the browser and by _test/quizcore.test.cjs in Node.
 */
(function (root) {
  "use strict";

  /* ---------- answers & scoring ---------- */
  const norm = (s) => String(s || "").toLowerCase().replace(/[\s.,;:!?()\-–_/'"]+/g, "");

  // Short written answer: matches an accepted answer (either contains the other, min 4 chars), or contains every keyword.
  function autoMatch(item, text) {
    const t = norm(text); if (!t) return false;
    for (const acc of item.accepted || []) {
      const a = norm(acc);
      if (a && (t.includes(a) || (a.includes(t) && t.length >= 4))) return true;
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
  const keyOf = (q, keyOv) => (keyOv && keyOv[q.id]) || q.answer;
  // Every MCQ choice that scores: the key plus also_accept (questions with more than one right choice).
  // A personal override replaces them all.
  const okKeys = (q, keyOv) => {
    if (keyOv && keyOv[q.id]) return [keyOv[q.id]];
    return q.answer ? [q.answer, ...(q.also_accept || [])] : [];
  };

  // Does this question count toward scores, progress and weak spots? Answers still marked draft/disputed do not,
  // unless this person set their own key for it (they decided).
  const UNCOUNTED = ["draft", "disputed"];
  const counts = (q, keyOv) => !!(keyOv && keyOv[q.id]) || !UNCOUNTED.includes(q.answer_status);

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
    (rounds || []).slice().sort((a, b) => (a.started || 0) - (b.started || 0)).forEach((r) => {
      r.qids.forEach((id) => { const q = qmap[id]; if (q && r.chk[id] && counts(q, keyOv)) { const sc = qScore(q, r, keyOv); if (sc != null) out[id] = sc; } });
    });
    return out;
  }

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
    m.mixes = pick("mixes", m.mixes || {}, t.mixes || {}, mineFirst);
    m.ts = ts;
    return m;
  }

  const api = { norm, autoMatch, itemScore, keyOf, okKeys, counts, qScore, answered, status, shuffle, newRound, roundStats, latestResults, mergeProgress, touch };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MedLibQuiz = api;
})(typeof self !== "undefined" ? self : this);
