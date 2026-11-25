'use strict';
// Shared question engine used by every subject bank.
const LEVELS = { easy: 'Easy', moderate: 'Moderate', hard: 'Hard' };
const LV = { e: 'easy', m: 'moderate', h: 'hard' };

function shuffle(a, rnd = Math.random) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Shuffle the options of a question whose correct answer is options[0].
function instance(q) {
  const order = shuffle([0, 1, 2, 3]);
  return {
    id: q.id, topic: q.topic, level: q.level, text: q.text,
    options: order.map((k) => q.options[k]),
    answer: order.indexOf(0),
    explain: q.explain
  };
}

// Round-robin by topic so a pick feels varied.
function balanced(pool, k) {
  const by = {};
  shuffle(pool).forEach((q) => (by[q.topic] = by[q.topic] || []).push(q));
  const keys = shuffle(Object.keys(by));
  const out = [];
  while (out.length < k && keys.some((t) => by[t].length)) {
    for (const t of keys) if (by[t].length && out.length < k) out.push(by[t].shift());
  }
  return out;
}

// rows: [topic, 'e'|'m'|'h', question, correct, wrong1, wrong2, wrong3, explanation]
function buildBank(rows, topics) {
  return rows.map((r, i) => {
    if (!topics[r[0]]) throw new Error('Unknown topic ' + r[0] + ' in row ' + i);
    if (!LV[r[1]]) throw new Error('Bad level in row ' + i);
    const opts = [r[3], r[4], r[5], r[6]];
    if (new Set(opts).size !== 4) throw new Error('Duplicate options in row ' + i + ': ' + r[2]);
    return { id: i, topic: r[0], level: LV[r[1]], text: r[2], options: opts, answer: 0, explain: r[7] };
  });
}

// Pick n questions from a bank. level: easy | moderate | hard | mixed. Avoid ids in `used` first.
function pickFrom(BANK, n, { topic = null, level = 'mixed', used = new Set() } = {}) {
  const inTopic = (q) => !topic || topic === 'all' || q.topic === topic;
  const fresh = (list) => { const f = list.filter((q) => !used.has(q.id)); return f.length >= Math.min(n, list.length) ? f : list; };
  if (LEVELS[level]) {
    const pool = fresh(BANK.filter((q) => inTopic(q) && q.level === level));
    return shuffle(balanced(pool, n)).map(instance);
  }
  const quota = { easy: Math.round(n * 0.3), moderate: Math.round(n * 0.4) };
  quota.hard = n - quota.easy - quota.moderate;
  let out = [];
  for (const lv of Object.keys(LEVELS)) out = out.concat(balanced(fresh(BANK.filter((q) => inTopic(q) && q.level === lv)), quota[lv]));
  if (out.length < n) {
    const have = new Set(out.map((q) => q.id));
    out = out.concat(balanced(BANK.filter((q) => inTopic(q) && !have.has(q.id)), n - out.length));
  }
  return shuffle(out).map(instance);
}

module.exports = { LEVELS, LV, shuffle, instance, balanced, buildBank, pickFrom };
