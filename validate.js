'use strict';
// Question-bank validator. Run: node validate.js  (exit 1 on any hard error)
// Hard errors: duplicate/blank options, answer index out of range, empty text, unknown level/topic,
// exact-duplicate questions, near-duplicate questions (token Jaccard >= 0.8), explanation too short.
// This checks structure and repetition only. It cannot judge whether an answer is factually right.
const { SUBJECTS } = require('./subjects');
const TARGET = Number(process.env.TARGET) || 300;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const toks = (s) => new Set(norm(s).split(' ').filter((w) => w.length > 2));
const jac = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i || 1); };
let warns = 0; let errors = 0; const err = (m) => { errors++; if (errors <= 60) console.log('  ERROR', m); };
const rows = [];
for (const s of Object.values(SUBJECTS)) {
  const c = { easy: 0, moderate: 0, hard: 0 }; const seen = new Map(); const tk = [];
  const byTopic = {};
  s.bank.forEach((q, i) => {
    const tag = s.id + '#' + i;
    if (!q.text || q.text.trim().length < 8) err(tag + ' question text too short');
    if (!Array.isArray(q.options) || q.options.length !== 4) return err(tag + ' needs exactly 4 options');
    if (new Set(q.options.map((o) => String(o).toLowerCase().replace(/\s+/g, ' ').trim())).size !== 4 || q.options.some((o) => !String(o).trim())) err(tag + ' options blank or not unique');
    if (!(q.answer >= 0 && q.answer < 4)) err(tag + ' answer index invalid');
    if (!s.topics[q.topic]) err(tag + ' unknown topic ' + q.topic);
    if (!(q.level in c)) err(tag + ' unknown level ' + q.level); else c[q.level]++;
    if (!q.explain || q.explain.trim().length < 25) err(tag + ' explanation too short');
    const k = norm(q.text); if (seen.has(k)) err(tag + ' exact duplicate of #' + seen.get(k)); else seen.set(k, i);
    const t = toks(q.text); tk.forEach((o) => { if (o.i !== i && jac(t, o.t) >= 0.8) { const oq = s.bank[o.i]; if (norm(String(q.options[q.answer])) === norm(String(oq.options[oq.answer]))) err(tag + ' near-duplicate of #' + o.i + ' (same answer)'); else warns++; } }); tk.push({ i, t });
    (byTopic[q.topic] = byTopic[q.topic] || { easy: 0, moderate: 0, hard: 0 })[q.level]++;
  });
  rows.push({ id: s.id, ...c, total: s.bank.length, need: Math.max(0, TARGET - c.easy) + Math.max(0, TARGET - c.moderate) + Math.max(0, TARGET - c.hard) });
  if (process.env.TOPICS) console.log(s.id, JSON.stringify(byTopic));
}

let reviews = 0; // pairs to review by hand: set REVIEW=1 to list them
// Concept-duplicate pass (any answer, any level): near-identical stems whose numbers/symbols match are the same question reworded.
// Added after an independent audit found paraphrased duplicates across levels that the same-answer check missed.
for (const s of Object.values(SUBJECTS)) {
  const stop = new Set(['the','what','which','does','that','this','with','for','and','are','how','many','has','have','its','from','into','than']);
  const T = s.bank.map((q) => { const w = String(q.text).toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter((x) => x && !stop.has(x)); return { w: new Set(w), n: new Set(w.filter((x) => /^[0-9]+$/.test(x))), len: w.length }; });
  for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) {
    const a = T[i], b = T[j]; if (Math.abs(a.len - b.len) > 4) continue;
    if (a.n.size !== b.n.size || [...a.n].some((x) => !b.n.has(x))) continue;
    if (jac(a.w, b.w) >= 0.75) { reviews++; if (process.env.REVIEW) console.log('  REVIEW', s.id + '#' + i + ' [' + s.bank[i].level + '] ' + s.bank[i].text.slice(0, 80) + '  ||  #' + j + ' [' + s.bank[j].level + '] ' + s.bank[j].text.slice(0, 80)); }
  }
}
console.log('concept-duplicate candidates to review by hand (REVIEW=1 lists them):', reviews);
console.log('subject    easy  mod  hard  total  still-needed-for-' + TARGET + '/level');
let tot = 0, need = 0;
for (const r of rows) { tot += r.total; need += r.need; console.log(r.id.padEnd(10), String(r.easy).padStart(4), String(r.moderate).padStart(4), String(r.hard).padStart(5), String(r.total).padStart(6), String(r.need).padStart(8)); }
console.log('TOTAL distinct static questions:', tot, '| still needed to reach', TARGET, 'per level per subject (6 subjects):', need);
console.log('near-duplicate wording with a different answer (allowed, count only):', warns);
console.log(errors ? errors + ' error(s)' : 'validation OK (structure and duplicates only; correctness is not machine-checkable)');
process.exit(errors ? 1 : 0);
