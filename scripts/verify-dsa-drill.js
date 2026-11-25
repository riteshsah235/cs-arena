'use strict';
// Independent check of generated Big-O Blitz items: simulates loops and evaluates recurrences numerically.
const { makeDrill } = require('../src/drills');
const slope = (f) => { const n1 = 2 ** 12, n2 = 2 ** 20; return (Math.log(f(n2)) - Math.log(f(n1))) / Math.log(n2 / n1); };
const cls = (f) => { // classify growth from log-log slope and log-factor test
  const s = slope(f), r = f(2 ** 20) / f(2 ** 12) / (2 ** 8) ** Math.round(s);
  if (s < 0.05) return f(2 ** 20) / f(2 ** 12) > 1.3 ? 'O(log n)' : 'O(1)';
  const k = Math.round(s * 2) / 2; // allow n log n style: slope between 1 and 1.5
  return { s, r };
};
function simulate(code, n) {
  let m;
  if ((m = code.match(/^for i in 1\.\.(\w+):\n    for j in 1\.\.(\d+):\n        work\(\)$/))) return n * +m[2];
  if ((m = code.match(/^i = 1\nwhile i < \w+:\n    i = i \* (\d+)\n    work\(\)$/))) { let c = 0; for (let i = 1; i < n; i *= +m[1]) c++; return c; }
  if ((m = code.match(/^i = 0\nwhile i < \w+:\n    i = i \+ (\d+)\n    work\(\)$/))) { let c = 0; for (let i = 0; i < n; i += +m[1]) c++; return c; }
  if ((m = code.match(/^for i in 1\.\.(\d+):\n    work\(\)$/))) return +m[1];
  if (/^for i in 1\.\.\w+:\n    for j in 1\.\.i:\n        work\(\)$/.test(code)) { let c = 0; for (let i = 1; i <= n; i++) c += i; return c; }
  if ((m = code.match(/^for i in 1\.\.\w+:\n    j = \w+\n    while j > 1:\n        j = j \/ (\d+)\n        work\(\)$/))) { let per = 0; for (let j = n; j > 1; j = Math.floor(j / +m[1])) per++; return n * per; }
  if ((m = code.match(/^for i in 1\.\.\w+:\n    work\(\)\nfor j in 1\.\.\w+:\n    for k in 1\.\.(\d+):\n        work\(\)$/))) return n + n * +m[1];
  return null;
}
const label = (f) => { const a = f(2 ** 12), b = f(2 ** 20); const s = Math.log(b / a) / Math.log(2 ** 8);
  if (b / a < 3) return b / a > 1.2 ? 'O(log n)' : 'O(1)';
  if (s > 0.9 && s < 1.0) return 'O(n)'; if (s >= 1.0 && s < 1.5) return Math.abs(s - 1) < 1e-9 ? 'O(n)' : 'O(n log n)';
  if (s > 1.9 && s < 2.1) return 'O(n²)'; return 'other'; };
let checked = 0, bad = 0, skipped = 0; const unparsed = new Set();
for (const lv of ['easy', 'moderate']) for (const q of makeDrill('dsa', 600, lv)) {
  const code = q.text.replace(/^Name the tightest Big-O bound for this code\.\n/, '');
  if (code === q.text) continue; // fixed-pool item
  const f = (n) => simulate(code, n);
  if (f(16) === null) { skipped++; unparsed.add(code); continue; } // fixed-pool item, not generated
  const got = label(f), want = q.options[q.answer]; checked++;
  if (got !== want) { bad++; console.log('MISMATCH', JSON.stringify(code), 'simulated', got, 'keyed', want); }
}
// Master theorem: evaluate T(n) = a T(n/b) + w(n) numerically and check (1) the keyed class matches the measured growth,
// (2) every option parses to a distinct (exponent, log power) pair, so no two options are equivalent classes,
// (3) exactly one option equals the true class, (4) no approximate suffix, wording asks for a tight bound.
const parse = (o, a, b) => {
  const t = o.replace(/^Θ\(|\)$/g, '');
  if (t === '1') return [0, 0]; if (t === 'log n') return [0, 1];
  let m;
  if ((m = t.match(/^n\^\(log([₂₃])(\d)\)$/))) return [Math.log(+m[2]) / Math.log(m[1] === '₂' ? 2 : 3), 0];
  if ((m = t.match(/^n(²|³)?( log n)?$/))) return [m[1] === '²' ? 2 : m[1] === '³' ? 3 : 1, m[2] ? 1 : 0];
  return null;
};
for (const q of makeDrill('dsa', 2000, 'hard')) {
  const m = q.text.match(/T\(n\) = (\d)·T\(n\/(\d)\) \+ (1|n²|n)/); if (!m) continue;
  checked++;
  const a = +m[1], b = +m[2], d = m[3] === '1' ? 0 : m[3] === 'n' ? 1 : 2, e = Math.log(a) / Math.log(b);
  if (!/tight bound/.test(q.text)) { bad++; console.log('wording lacks tight bound', q.text); }
  if (q.options.some((o) => /≈|O\(/.test(o))) { bad++; console.log('approx or loose Big-O in option', q.options); continue; }
  const ps = q.options.map((o) => parse(o, a, b));
  if (ps.some((x) => x === null)) { bad++; console.log('unparsed option', q.options); continue; }
  const key = new Set(ps.map((x) => x[0].toFixed(9) + '/' + x[1]));
  if (key.size !== 4) { bad++; console.log('equivalent options', q.options, q.text); continue; }
  // true class by Master theorem (polynomial work, regularity holds)
  const tru = Math.abs(e - d) < 1e-9 ? [d, 1] : e > d ? [e, 0] : [d, 0];
  const hits = ps.filter((x) => Math.abs(x[0] - tru[0]) < 1e-9 && x[1] === tru[1]).length;
  if (hits !== 1 || q.options[q.answer] !== q.options.find((o, i) => Math.abs(ps[i][0] - tru[0]) < 1e-9 && ps[i][1] === tru[1])) { bad++; console.log('answer not the unique true class', q.options, q.text, q.options[q.answer]); }
  // numeric recurrence cross-check of the true class
  const w = d === 0 ? () => 1 : d === 1 ? (n) => n : (n) => n * n;
  const T = (k) => { let x = 1; for (let i = 1; i <= k; i++) x = a * x + w(b ** i); return x; };
  const k1 = 20, k2 = 40, N = (k) => b ** k, slope = Math.log(T(k2) / T(k1)) / Math.log(N(k2) / N(k1));
  const growth = tru[1] ? tru[0] + 0.05 : tru[0], isLog0 = tru[0] === 0;
  const okNum = isLog0 ? (tru[1] ? T(k2) / T(k1) > 1.5 && T(k2) / T(k1) < 3 : T(k2) / T(k1) < 1.1) : Math.abs(slope - tru[0]) < (tru[1] ? 0.25 : 0.03);
  if (!okNum) { bad++; console.log('numeric recurrence disagrees', q.text, tru, slope); }
}
console.log('fixed-pool items skipped (distinct):', unparsed.size); console.log('checked', checked, 'unparsed/skipped', skipped, 'mismatches', bad);
process.exit(bad ? 1 : 0);
