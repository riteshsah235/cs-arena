'use strict';
// Mini-games: each subject has one generator that builds a fresh, computed question every time.
// Answers are calculated by code (never hand-typed), so they are correct for the numbers shown.
const { shuffle } = require('./engine');
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
const LEVEL_KEYS = ['easy', 'moderate', 'hard'];
let seq = 0;

// Fill options: correct first, then unique distractors. Extra fallbacks are used when needed.
function finish(level, topicName, text, correct, distractors, explain, fallback) {
  const opts = [String(correct)];
  for (const d of distractors.concat(fallback ? fallback() : [])) {
    const s = String(d);
    if (!opts.includes(s)) opts.push(s);
    if (opts.length === 4) break;
  }
  if (opts.length < 4 && /^-?\d+(\.\d+)?$/.test(opts[0])) {
    const base = Number(opts[0]);
    for (const k of [1, 2, 3, -1, -2, 4, 5, 8]) {
      const v = String(Math.round((base + k) * 100) / 100);
      if (Number(v) >= 0 && !opts.includes(v)) opts.push(v);
      if (opts.length === 4) break;
    }
  }
  if (opts.length < 4) throw new Error('not enough options: ' + text);
  return { id: 'd' + ++seq, topic: 'drill', topicName, topicIcon: '🎮', level, text, options: opts, answer: 0, explain };
}

/* ---------------------------------------------------------------- DSA: Big-O Blitz */
const NP = ['O(1)', 'O(log n)', 'O(√n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(n³)', 'O(2ⁿ)', 'O(n!)'];
const GP = ['O(V)', 'O(V + E)', 'O(V²)', 'O(E log V)', '(V + E) log V'.replace(/^/, 'O(') + ')', 'O(V · E)'];
// [level, pool, text, answer, explanation]
const BIGO = [
  ['easy', NP, 'What is the time complexity?\nfor i in 1..n:\n    print(i)', 'O(n)', 'One loop that runs n times with constant work inside: O(n).'],
  ['easy', NP, 'What is the time complexity?\nx = a[5]\ny = a[n - 1]', 'O(1)', 'Array indexing is constant time, no matter how big n is.'],
  ['easy', NP, 'What is the time complexity?\ni = 1\nwhile i < n:\n    i = i * 2', 'O(log n)', 'i doubles each step, so it needs about log2(n) steps to reach n.'],
  ['easy', NP, 'What is the time complexity?\nfor i in 1..n:\n    for j in 1..n:\n        work()', 'O(n²)', 'n iterations of an inner loop that runs n times: n × n = n².'],
  ['easy', NP, 'Binary search on a sorted array of n items. Worst case?', 'O(log n)', 'Each comparison halves the remaining range, so about log2(n) comparisons.'],
  ['easy', NP, 'Linear search for a value that is not in an array of n items. Worst case?', 'O(n)', 'It must look at every element once before concluding the value is absent.'],
  ['easy', NP, 'Push onto an array-backed stack that has spare capacity. Cost of one push?', 'O(1)', 'Write at the top index and increment it. No shifting needed.'],
  ['easy', NP, 'Finding the maximum of an unsorted array of n numbers.', 'O(n)', 'Every element has to be compared at least once.'],
  ['easy', NP, 'What is the time complexity?\nfor i in 1..n:\n    work()\nfor j in 1..n:\n    work()', 'O(n)', 'Two loops one after another add: n + n = 2n, which is O(n).'],
  ['moderate', NP, 'What is the time complexity?\nfor i in 1..n:\n    for j in 1..i:\n        work()', 'O(n²)', 'Total work is 1 + 2 + ... + n = n(n+1)/2, which grows like n².'],
  ['moderate', NP, 'What is the time complexity?\nfor i in 1..n:\n    j = 1\n    while j < n:\n        j = j * 2', 'O(n log n)', 'The outer loop runs n times and the inner loop runs about log n times: n log n.'],
  ['moderate', NP, 'Merge sort on n items. Worst case?', 'O(n log n)', 'log n levels of splitting, and each level merges n items in linear time.'],
  ['moderate', NP, 'Quick sort with a random pivot on n distinct items. Expected time?', 'O(n log n)', 'A random pivot gives balanced splits on average, so about log n levels of linear partitioning.'],
  ['moderate', NP, 'What is the time complexity?\nfor i in 1..n:\n    for j in 1..n:\n        for k in 1..n:\n            work()', 'O(n³)', 'Three nested loops of n iterations each: n × n × n.'],
  ['moderate', NP, 'Inserting n keys one by one into a balanced BST (like AVL). Total time?', 'O(n log n)', 'Each insert costs O(log n) in a balanced tree, and there are n inserts.'],
  ['moderate', NP, 'Bubble sort on n items. Worst case?', 'O(n²)', 'Up to n passes, each comparing up to n adjacent pairs.'],
  ['moderate', NP, 'Looking up a key in a hash table with a good hash function and a sensible load factor. Average case?', 'O(1)', 'The hash jumps to a bucket that holds only a few entries on average.'],
  ['moderate', NP, 'Heap sort on n items. Worst case?', 'O(n log n)', 'Building the heap is O(n), then n extractions cost O(log n) each.'],
  ['moderate', NP, 'Appending n items one at a time to a dynamic array that doubles when full. Total time for all n appends?', 'O(n)', 'Resizes copy 1 + 2 + 4 + ... < 2n elements in total, so the amortized cost per append is O(1).'],
  ['moderate', GP, 'BFS on a graph stored as adjacency lists, with V vertices and E edges.', 'O(V + E)', 'Each vertex is dequeued once and each edge is looked at once (twice if undirected).'],
  ['moderate', GP, 'DFS on a graph stored as an adjacency matrix with V vertices.', 'O(V²)', 'Visiting a vertex means scanning its whole matrix row of V entries, for V vertices.'],
  ['hard', NP, 'Recurrence: T(n) = 2T(n/2) + n. Solve it.', 'O(n log n)', 'Master theorem case 2: a = 2, b = 2, f(n) = n = n^(log_b a), so T(n) = Θ(n log n).'],
  ['hard', NP, 'Recurrence: T(n) = T(n - 1) + 1.', 'O(n)', 'It unrolls to 1 + 1 + ... + 1 (n times) = n.'],
  ['hard', NP, 'Recurrence: T(n) = 2T(n - 1) + 1.', 'O(2ⁿ)', 'Each call spawns two calls on a size smaller by one, so the call tree has about 2ⁿ nodes.'],
  ['hard', NP, 'Recurrence: T(n) = T(n/2) + 1.', 'O(log n)', 'Master theorem: the problem halves each step with constant work, giving log n steps.'],
  ['hard', NP, 'Recurrence: T(n) = 2T(n/2) + 1.', 'O(n)', 'Master theorem case 1: n^(log2 2) = n dominates f(n) = 1, so T(n) = Θ(n).'],
  ['hard', NP, 'What is the time complexity?\nfor (i = 1; i * i <= n; i++)\n    work()', 'O(√n)', 'The loop stops when i exceeds √n, so it runs √n times.'],
  ['hard', NP, 'Building a binary heap from n unsorted items with bottom-up heapify.', 'O(n)', 'Most nodes are near the leaves and sift down only a little. The sum of the heights is O(n).'],
  ['hard', NP, 'Generating every permutation of n distinct items.', 'O(n!)', 'There are n! different orderings and each must be produced.'],
  ['hard', NP, 'Naive recursive Fibonacci: fib(n) = fib(n-1) + fib(n-2).', 'O(2ⁿ)', 'The call tree branches in two with depth about n, giving exponential calls (about 1.6ⁿ, bounded by 2ⁿ).'],
  ['hard', NP, 'What is the time complexity?\nfor i in 1..n:\n    for j = i; j <= n; j = j + i:\n        work()', 'O(n log n)', 'The inner loop runs n/i times. The sum n/1 + n/2 + ... + n/n is n × H(n), about n ln n.'],
  ['hard', GP, 'Dijkstra with a binary heap on a graph with V vertices and E edges.', 'O((V + E) log V)', 'Each edge relaxation may do a heap update costing O(log V), and each vertex is extracted once.'],
  ['hard', GP, 'Topological sort using Kahn\'s algorithm on a DAG with adjacency lists.', 'O(V + E)', 'Each vertex enters the queue once and each edge decreases one indegree once.']
];
BIGO.forEach((b) => { if (b[1] === GP) { b[1] = ['O(V)', 'O(V + E)', 'O(V²)', 'O(E log V)', 'O((V + E) log V)', 'O(V · E)']; } });
// Generated Big-O items: fresh parameters every question, answers computed by code.
function bigoGenerated(level) {
  const v = pickOne(['n', 'n', 'N', 'len']);
  const pool = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(n³)', 'O(2ⁿ)'];
  const mk = (code, ans, ex) => finish(level, 'Big-O Blitz', 'Name the tightest Big-O bound for this code.\n' + code, ans, shuffle(pool.filter((x) => x !== ans)), ex);
  if (level === 'easy') {
    const k = rint(2, 9), c = pickOne([2, 3, 4, 5]);
    return pickOne([
      () => mk(`for i in 1..${v}:\n    for j in 1..${k}:\n        work()`, 'O(n)', `The inner loop always runs ${k} times, a constant, so the total is ${k} * ${v} = O(n).`),
      () => mk(`i = 1\nwhile i < ${v}:\n    i = i * ${c}\n    work()`, 'O(log n)', `i is multiplied by ${c} each pass, so it takes about log base ${c} of ${v} steps. Constant bases do not change the class: O(log n).`),
      () => mk(`i = 0\nwhile i < ${v}:\n    i = i + ${c}\n    work()`, 'O(n)', `i grows by the constant ${c}, so there are about ${v}/${c} passes. That is O(n).`),
      () => mk(`for i in 1..${k * 100}:\n    work()`, 'O(1)', `The loop count ${k * 100} does not depend on ${v}, so the cost is constant.`),
    ])();
  }
  if (level === 'moderate') {
    const c = pickOne([2, 3, 4]);
    return pickOne([
      () => mk(`for i in 1..${v}:\n    for j in 1..i:\n        work()`, 'O(n²)', `The inner loop runs i times, so the total is 1 + 2 + ... + ${v}, about ${v}²/2. That is O(n²).`),
      () => mk(`for i in 1..${v}:\n    j = ${v}\n    while j > 1:\n        j = j / ${c}\n        work()`, 'O(n log n)', `The outer loop runs ${v} times and each inner loop takes about log base ${c} of ${v} steps. Total O(n log n).`),
      () => mk(`for i in 1..${v}:\n    work()\nfor j in 1..${v}:\n    for k in 1..${c}:\n        work()`, 'O(n)', `Two passes of ${v} steps with a constant inner factor ${c}. Added together that is still O(n).`),
    ])();
  }
  const a = pickOne([1, 2, 3, 4, 8, 9]), b = pickOne([2, 3]), d = pickOne([0, 1, 2]);
  const e = Math.log(a) / Math.log(b);
  const ef = Math.round(e * 100) / 100;
  const isInt = Math.abs(e - Math.round(e)) < 1e-9;
  const sub = { 2: '₂', 3: '₃' };
  // Exact class: integer exponents print as n, n², n³. Otherwise keep the exact log form; decimals appear only in the explanation text.
  const expTxt = isInt ? (Math.round(e) === 1 ? 'n' : Math.round(e) === 2 ? 'n²' : Math.round(e) === 3 ? 'n³' : 'n^' + Math.round(e)) : `n^(log${sub[b]}${a})`;
  const leafAns = `Θ(${expTxt})`;
  const eq = Math.abs(e - d) < 1e-9;
  let ans, why;
  if (eq) { ans = d === 0 ? 'Θ(log n)' : d === 1 ? 'Θ(n log n)' : 'Θ(n² log n)'; why = `log base ${b} of ${a} equals ${d}, so the work per level matches the leaves: Θ(n^${d} log n).`; }
  else if (e > d) { ans = leafAns; why = `log base ${b} of ${a} is ${isInt ? Math.round(e) : 'log' + sub[b] + a + ', approximately ' + ef}, larger than ${d}, so the leaves dominate: ${leafAns}.`; }
  else { ans = d === 0 ? 'Θ(1)' : d === 1 ? 'Θ(n)' : 'Θ(n²)'; why = `log base ${b} of ${a} is ${isInt ? Math.round(e) : 'about ' + ef}, smaller than ${d}, so the root work dominates: Θ(n^${d}).`; }
  const cand = ['Θ(1)', 'Θ(log n)', 'Θ(n)', 'Θ(n log n)', 'Θ(n²)', 'Θ(n² log n)', 'Θ(n³)'];
  const cost = d === 0 ? '1' : d === 1 ? 'n' : 'n²';
  return finish(level, 'Big-O Blitz', `Solve the recurrence for its tight bound (Θ).\nT(n) = ${a}·T(n/${b}) + ${cost}`, ans, shuffle(cand.filter((x) => x !== ans)), 'Master theorem: compare log base ' + b + ' of ' + a + ' with the exponent ' + d + ' of the work term. ' + why);
}
function dsaDrill(level) {
  if (Math.random() < 0.7) return bigoGenerated(level);
  const pool = BIGO.filter((b) => b[0] === level);
  const [, dist, text, ans, ex] = pickOne(pool);
  return finish(level, 'Big-O Blitz', text.includes('\n') ? 'Name the tightest Big-O bound for this code.\n' + text.split('\n').slice(1).join('\n') : (/tightest/i.test(text) ? text : text + ' Give the tightest Big-O bound.'), ans, shuffle(dist.filter((x) => x !== ans)), ex);
}

/* ---------------------------------------------------------------- OS: Scheduler Showdown */
function sched(name, procs, q) {
  // procs: [{id, at, bt}] ; returns {wt: {id: wait}, tat, gantt}
  const n = procs.length, rem = procs.map((p) => p.bt), done = new Array(n).fill(false), fin = new Array(n).fill(0);
  let t = 0, finished = 0; const gantt = []; let last = -1;
  const mark = (i, dur) => { if (last === i) gantt[gantt.length - 1][1] += dur; else { gantt.push([i, dur]); last = i; } };
  if (name === 'FCFS' || name === 'SJF') {
    while (finished < n) {
      const ready = procs.map((p, i) => i).filter((i) => !done[i] && procs[i].at <= t);
      if (!ready.length) { t = Math.min(...procs.filter((p, i) => !done[i]).map((p) => p.at)); continue; }
      const i = name === 'FCFS' ? ready.sort((a, b) => procs[a].at - procs[b].at || a - b)[0] : ready.sort((a, b) => procs[a].bt - procs[b].bt || procs[a].at - procs[b].at || a - b)[0];
      mark(i, procs[i].bt); t += procs[i].bt; fin[i] = t; done[i] = true; finished++;
    }
  } else if (name === 'SRTF') {
    while (finished < n) {
      const ready = procs.map((p, i) => i).filter((i) => rem[i] > 0 && procs[i].at <= t);
      if (!ready.length) { t++; continue; }
      const i = ready.sort((a, b) => rem[a] - rem[b] || procs[a].at - procs[b].at || a - b)[0];
      mark(i, 1); rem[i]--; t++;
      if (rem[i] === 0) { fin[i] = t; finished++; }
    }
  } else if (name === 'RR') {
    const queue = []; const inQ = new Array(n).fill(false);
    const admit = () => procs.forEach((p, i) => { if (!inQ[i] && p.at <= t && rem[i] > 0) { queue.push(i); inQ[i] = true; } });
    admit();
    while (finished < n) {
      if (!queue.length) { t++; admit(); continue; }
      const i = queue.shift(); const run = Math.min(q, rem[i]);
      mark(i, run); t += run; rem[i] -= run;
      admit();
      if (rem[i] > 0) queue.push(i); else { fin[i] = t; finished++; }
    }
  }
  const wt = procs.map((p, i) => fin[i] - p.at - p.bt), tat = procs.map((p, i) => fin[i] - p.at);
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  return { avgWait: avg(wt), avgTat: avg(tat), wt, tat, fin, gantt };
}
const fmt2 = (x) => (Math.round(x * 100) / 100).toFixed(2).replace(/\.?0+$/, (m) => (m.includes('.') ? '' : m));
const f = (x) => { const s = (Math.round(x * 100) / 100).toString(); return s; };
function ganttStr(procs, g) {
  let t = 0; return g.map(([i, d]) => { const s = `${t}-${t + d}: ${procs[i].id}`; t += d; return s; }).join(' | ');
}
function osDrill(level) {
  const k = level === 'easy' ? 3 : level === 'moderate' ? 4 : 4 + rint(0, 1);
  let procs, algo, metric, q = 2;
  for (let tries = 0; tries < 50; tries++) {
    procs = Array.from({ length: k }, (_, i) => ({ id: 'P' + (i + 1), at: level === 'hard' ? rint(0, 4) : 0, bt: rint(1, 9) }));
    if (level === 'hard') procs[0].at = 0;
    algo = level === 'easy' ? 'FCFS' : level === 'moderate' ? pickOne(['SJF', 'RR']) : pickOne(['SRTF', 'RR', 'SJF']);
    metric = pickOne(['avgWait', 'avgTat']);
    if (algo === 'RR' && level === 'hard') q = pickOne([2, 3]);
    const rs = ['FCFS', 'SJF', 'SRTF', 'RR'].map((a) => f(sched(a, procs, q)[metric]));
    if (new Set(rs).size >= 3) break; // an interesting set where the policies actually differ
  }
  const res = sched(algo, procs, q);
  const label = { FCFS: 'First-Come First-Served (FCFS)', SJF: 'Shortest Job First (non-preemptive)', SRTF: 'Shortest Remaining Time First (preemptive SJF)', RR: `Round Robin (time quantum = ${q})` }[algo];
  const mname = metric === 'avgWait' ? 'average waiting time' : 'average turnaround time';
  const table = 'Process  Arrival  Burst\n' + procs.map((p) => `${p.id.padEnd(8)} ${String(p.at).padEnd(8)} ${p.bt}`).join('\n');
  const ans = f(res[metric]);
  const others = ['FCFS', 'SJF', 'SRTF', 'RR'].filter((a) => a !== algo).map((a) => f(sched(a, procs, q)[metric]));
  const other = metric === 'avgWait' ? f(res.avgTat) : f(res.avgWait);
  const extra = [f(res[metric] + 1), f(Math.max(0, res[metric] - 1)), f(res[metric] + 0.5), f(res[metric] + 2)];
  const per = procs.map((p, i) => `${p.id}: finish ${res.fin[i]}, turnaround ${res.tat[i]}, wait ${res.wt[i]}`).join('; ');
  const ex = `Gantt chart: ${ganttStr(procs, res.gantt)}. ${per}. Waiting = turnaround - burst, turnaround = finish - arrival. Average ${metric === 'avgWait' ? 'waiting' : 'turnaround'} = ${ans}.`;
  return finish(level, 'Scheduler Showdown', `Compute the ${mname} (in time units) under ${label}.\n${table}`, ans, shuffle(others.concat([other], extra)).filter((x) => x !== ans), ex);
}

/* ---------------------------------------------------------------- CN: Subnet Sniper */
const toInt = (o) => ((o[0] << 24) >>> 0) + (o[1] << 16) + (o[2] << 8) + o[3];
const toIp = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
function cnDrill(level) {
  const prefix = level === 'easy' ? pickOne([24, 25, 26, 27, 28, 29, 30]) : level === 'moderate' ? pickOne([20, 21, 22, 23, 25, 26, 27, 28, 29]) : pickOne([19, 20, 21, 22, 26, 27, 28, 29]);
  const ip = [pickOne([10, 172, 192]), rint(0, 255), rint(0, 255), rint(1, 254)];
  if (ip[0] === 172) ip[1] = rint(16, 31);
  if (ip[0] === 192) ip[1] = 168;
  const host = 32 - prefix, size = Math.pow(2, host);
  const ipn = toInt(ip), mask = (0xffffffff << host) >>> 0, net = (ipn & mask) >>> 0, bc = (net + size - 1) >>> 0;
  const kind = level === 'easy' ? pickOne(['hosts', 'mask']) : level === 'moderate' ? pickOne(['net', 'hosts', 'subnets']) : pickOne(['bc', 'first', 'last', 'net']);
  const cidr = `${ip.join('.')}/${prefix}`;
  const maskStr = toIp(mask);
  if (kind === 'hosts') {
    const a = size - 2;
    return finish(level, 'Subnet Sniper', `How many usable host addresses are in a /${prefix} network?`, a, [size, size - 1, size * 2 - 2, size / 2 - 2, size + 2], `A /${prefix} leaves 32 - ${prefix} = ${host} host bits, so 2^${host} = ${size} addresses. Subtract the network and broadcast addresses: ${a} usable hosts.`);
  }
  if (kind === 'mask') {
    return finish(level, 'Subnet Sniper', `What is the subnet mask for /${prefix}?`, maskStr, [toIp((0xffffffff << (host + 1)) >>> 0), toIp((0xffffffff << Math.max(0, host - 1)) >>> 0), toIp((0xffffffff << (host + 2)) >>> 0), toIp((0xffffffff << Math.max(0, host - 2)) >>> 0)], `/${prefix} means ${prefix} leading 1 bits. Written in dotted decimal that is ${maskStr}.`);
  }
  if (kind === 'subnets') {
    const base = prefix >= 25 ? 24 : Math.max(8, prefix - 3);
    const b = prefix >= 25 ? 24 : base;
    const parts = Math.pow(2, prefix - b);
    return finish(level, 'Subnet Sniper', `A /${b} network is split into equal /${prefix} subnets. How many subnets do you get?`, parts, [parts * 2, parts / 2, prefix - b, parts * 2 - 2, parts - 2].map((x) => (x < 1 ? 1 : x)), `Borrowed bits = ${prefix} - ${b} = ${prefix - b}, so 2^${prefix - b} = ${parts} subnets.`);
  }
  const common = `${cidr}`;
  const near = (v) => [toIp((v + size) >>> 0), toIp((v - size) >>> 0), toIp((v + 1) >>> 0), toIp((v - 1) >>> 0)];
  const stepTxt = `Block size = 2^${host} = ${size}. The network address is the host address rounded down to a multiple of the block size in the interesting octet, which gives ${toIp(net)}.`;
  if (kind === 'net') return finish(level, 'Subnet Sniper', `What is the network address of ${common}?`, toIp(net), near(net).concat([toIp(ipn)]), stepTxt);
  if (kind === 'bc') return finish(level, 'Subnet Sniper', `What is the broadcast address of ${common}?`, toIp(bc), near(bc).concat([toIp(net)]), stepTxt + ` The broadcast address is the last address of the block: ${toIp(net)} + ${size} - 1 = ${toIp(bc)}.`);
  if (kind === 'first') return finish(level, 'Subnet Sniper', `What is the first usable host address in the subnet of ${common}?`, toIp(net + 1), [toIp(net), toIp(net + 2), toIp(bc), toIp(bc - 1)], stepTxt + ` The first usable host is network + 1 = ${toIp(net + 1)}.`);
  return finish(level, 'Subnet Sniper', `What is the last usable host address in the subnet of ${common}?`, toIp(bc - 1), [toIp(bc), toIp(bc - 2), toIp(net), toIp(net + 1)], stepTxt + ` Broadcast = ${toIp(bc)}, so the last usable host is one less: ${toIp(bc - 1)}.`);
}

/* ---------------------------------------------------------------- ML: Metric Master */
const pct = (x) => (Math.round(x * 1000) / 10).toFixed(1) + '%';
function mlDrill(level) {
  let TP, FP, FN, TN;
  const scale = level === 'easy' ? [10, 40] : level === 'moderate' ? [5, 80] : [2, 200];
  TP = rint(...scale); FP = rint(...scale); FN = rint(...scale); TN = rint(...scale);
  if (level === 'hard' && Math.random() < .5) { TN = rint(500, 3000); }
  const N = TP + FP + FN + TN;
  const acc = (TP + TN) / N, prec = TP / (TP + FP), rec = TP / (TP + FN), spec = TN / (TN + FP), f1 = (2 * prec * rec) / (prec + rec);
  const kinds = level === 'easy' ? ['acc', 'prec', 'rec'] : level === 'moderate' ? ['prec', 'rec', 'f1', 'spec'] : ['f1', 'spec', 'accTrap', 'prec', 'rec'];
  let kind = pickOne(kinds);
  const matrix = `                Predicted +   Predicted -\nActual +        TP = ${TP}${' '.repeat(Math.max(1, 8 - String(TP).length))}FN = ${FN}\nActual -        FP = ${FP}${' '.repeat(Math.max(1, 8 - String(FP).length))}TN = ${TN}`;
  const nm = { acc: 'accuracy', prec: 'precision', rec: 'recall', f1: 'F1 score', spec: 'specificity (true negative rate)', accTrap: 'accuracy' }[kind];
  const val = { acc, prec, rec, f1, spec, accTrap: acc }[kind];
  const all = { Accuracy: acc, Precision: prec, Recall: rec, 'F1 score': f1, Specificity: spec };
  const formulas = { acc: 'Accuracy = (TP + TN) / total', prec: 'Precision = TP / (TP + FP)', rec: 'Recall = TP / (TP + FN)', f1: 'F1 = 2 x precision x recall / (precision + recall)', spec: 'Specificity = TN / (TN + FP)', accTrap: 'Accuracy = (TP + TN) / total' };
  let text = `A classifier produces this confusion matrix on a test set. What is the ${nm}?\n${matrix}`;
  let correct = pct(val), dist = Object.entries(all).filter(([k, v]) => pct(v) !== correct).map(([, v]) => pct(v));
  let ex = `${formulas[kind]}. Here: ${kind === 'acc' || kind === 'accTrap' ? `(${TP} + ${TN}) / ${N}` : kind === 'prec' ? `${TP} / (${TP} + ${FP})` : kind === 'rec' ? `${TP} / (${TP} + ${FN})` : kind === 'spec' ? `${TN} / (${TN} + ${FP})` : `2 x ${pct(prec)} x ${pct(rec)} / (${pct(prec)} + ${pct(rec)})`} = ${correct}.`;
  if (kind === 'accTrap') {
    // Imbalanced data: ask which statement is right instead of a pure calculation.
    TN = rint(900, 3000); FP = rint(0, 20); TP = rint(1, 6); FN = rint(10, 40);
    const N2 = TP + FP + FN + TN, a2 = (TP + TN) / N2, r2 = TP / (TP + FN);
    const m2 = `                Predicted +   Predicted -\nActual +        TP = ${TP}${' '.repeat(Math.max(1, 8 - String(TP).length))}FN = ${FN}\nActual -        FP = ${FP}${' '.repeat(Math.max(1, 8 - String(FP).length))}TN = ${TN}`;
    return finish(level, 'Metric Master', `A fraud model is evaluated on mostly legitimate transactions.\n${m2}\nAccuracy is ${pct(a2)}. What does the recall of ${pct(r2)} tell you?`,
      `Most fraud cases are missed, so the high accuracy is misleading`, ['The model catches most fraud, so it is ready to deploy', 'Recall is high, so there are few false negatives', 'Accuracy and recall must always be close to each other'],
      `Recall = TP / (TP + FN) = ${TP} / ${TP + FN} = ${pct(r2)}. With classes this imbalanced, predicting "legitimate" for almost everything already gives ${pct(a2)} accuracy, so accuracy hides the missed fraud. Use precision, recall or F1 on the rare class.`);
  }
  return finish(level, 'Metric Master', text, correct, dist, ex, () => [pct(Math.min(.999, val + .07)), pct(Math.max(.001, val - .09)), pct(Math.min(.999, val + .13))]);
}

/* ---------------------------------------------------------------- System Design: Capacity Planner */
function human(n) {
  if (n >= 1e12) return sig(n / 1e12) + ' TB';
  if (n >= 1e9) return sig(n / 1e9) + ' GB';
  if (n >= 1e6) return sig(n / 1e6) + ' MB';
  return sig(n / 1e3) + ' KB';
}
function sig(x) { const d = x >= 100 ? 0 : x >= 10 ? 1 : 2; return String(+x.toFixed(d)); }
const commas = (n) => Math.round(n).toLocaleString('en-US');
function sysDrill(level) {
  const dau = pickOne(level === 'easy' ? [1, 2, 5, 10] : [3, 8, 20, 50, 120]) * 1e6;
  const per = pickOne(level === 'easy' ? [10, 20, 50] : [8, 25, 40, 100]);
  const reqs = dau * per, qps = reqs / 86400;
  const kind = level === 'easy' ? 'qps' : level === 'moderate' ? pickOne(['peak', 'store']) : pickOne(['store', 'bw', 'peak']);
  const fmtQ = (x) => commas(Math.round(x / (x > 1000 ? 100 : 10)) * (x > 1000 ? 100 : 10) || Math.round(x));
  const near = (x, fm) => [x * 24, x / 10, x * 10, x / 24, x * 3].map(fm);
  if (kind === 'qps') {
    const a = fmtQ(qps);
    return finish(level, 'Capacity Planner', `A service has ${dau / 1e6} million daily active users and each makes ${per} requests per day. About how many requests per second does it handle on average? (86,400 seconds in a day)`, `~${a}`, near(qps, (x) => '~' + fmtQ(x)), `Requests per day = ${dau / 1e6}M x ${per} = ${commas(reqs)}. Divide by 86,400 s: about ${commas(qps)} requests/s on average. The common mistake is dividing by 3,600 (that gives an hourly rate, 24x too high).`);
  }
  if (kind === 'peak') {
    const pk = qps * 3;
    return finish(level, 'Capacity Planner', `Same traffic pattern: ${dau / 1e6} million daily active users, ${per} requests per user per day. Traffic at peak hour is about 3x the daily average. What peak requests per second should you plan for?`, `~${fmtQ(pk)}`, near(pk, (x) => '~' + fmtQ(x)).concat(['~' + fmtQ(qps)]), `Average = ${commas(reqs)} / 86,400 = about ${commas(qps)} requests/s. Peak = 3 x average = about ${commas(pk)} requests/s. Capacity is sized for peak, not average.`);
  }
  const wr = pickOne([0.05, 0.1, 0.2]), size = pickOne([200, 500, 1000, 2000]);
  const writes = reqs * wr, yearBytes = writes * size * 365;
  if (kind === 'store') {
    return finish(level, 'Capacity Planner', `${dau / 1e6} million daily active users make ${per} requests a day. ${Math.round(wr * 100)}% of requests are writes that each store ${size >= 1000 ? size / 1000 + ' KB' : size + ' bytes'}. About how much new data is stored per year (no replication)?`, `~${human(yearBytes)}`, near(yearBytes, human), `Writes/day = ${commas(reqs)} x ${wr} = ${commas(writes)}. Bytes/day = ${commas(writes)} x ${size} = ${commas(writes * size)}. Times 365 = about ${human(yearBytes)} per year. Multiply again by the replication factor for real disk needs.`);
  }
  const bw = qps * 3 * size * 8; // peak bits/s for responses of 'size' bytes
  const hb = (b) => (b >= 1e9 ? sig(b / 1e9) + ' Gbps' : b >= 1e6 ? sig(b / 1e6) + ' Mbps' : sig(b / 1e3) + ' Kbps');
  return finish(level, 'Capacity Planner', `${dau / 1e6} million daily active users make ${per} requests a day (peak is 3x the average). Each response is ${size >= 1000 ? size / 1000 + ' KB' : size + ' bytes'}. About how much outbound bandwidth do you need at peak?`, `~${hb(bw)}`, [bw * 8, bw / 8, bw * 24, bw / 24].map((x) => '~' + hb(x)), `Average rate = ${commas(qps)} requests/s, peak = ${commas(qps * 3)}/s. Peak bytes/s = ${commas(qps * 3)} x ${size} = ${commas(qps * 3 * size)}. Times 8 bits = about ${hb(bw)}. A frequent slip is forgetting bytes vs bits (8x).`);
}

/* ---------------------------------------------------------------- DBMS: FD Closure Crunch */
function closure(X, fds) {
  const s = new Set(X); let ch = true;
  while (ch) { ch = false; for (const [l, r] of fds) if ([...l].every((a) => s.has(a)) && ![...r].every((a) => s.has(a))) { [...r].forEach((a) => s.add(a)); ch = true; } }
  return [...s].sort().join('');
}
function dbmsDrill(level) {
  const nAttr = level === 'easy' ? 4 : level === 'moderate' ? 5 : 6;
  const attrs = 'ABCDEF'.slice(0, nAttr).split('');
  for (let tries = 0; tries < 200; tries++) {
    const fds = [];
    const nf = level === 'easy' ? 3 : level === 'moderate' ? 4 : 5;
    for (let i = 0; i < nf; i++) {
      const lsz = level === 'easy' ? 1 : rint(1, 2);
      const l = shuffle(attrs).slice(0, lsz);
      let r; do { r = [pickOne(attrs)]; } while (l.includes(r[0]));
      const fd = [l.slice().sort().join(''), r.join('')];
      if (fds.some((x) => x[0] === fd[0] && x[1] === fd[1])) { i--; continue; }
      fds.push(fd);
    }
    const fdTxt = fds.map(([l, r]) => `${l} → ${r}`).join(',  ');
    const rel = `R(${attrs.join(', ')})\nFDs: ${fdTxt}`;
    if (level !== 'hard') {
      const X = shuffle(attrs).slice(0, level === 'easy' ? 1 : 2).sort().join('');
      const c = closure(X, fds);
      if (c.length === X.length || c.length === nAttr) continue;
      const fmt = (s) => '{' + s.split('').join(', ') + '}';
      const dist = [];
      attrs.forEach((a) => { if (!c.includes(a)) dist.push(fmt([...c, a].sort().join(''))); });
      c.split('').forEach((a) => { if (!X.includes(a)) dist.push(fmt(c.replace(a, ''))); });
      dist.push(fmt(X));
      if (new Set([fmt(c), ...dist]).size < 4) continue;
      const steps = []; const s = new Set(X);
      let ch = true; while (ch) { ch = false; for (const [l, r] of fds) if ([...l].every((a) => s.has(a)) && !s.has(r)) { s.add(r); steps.push(`${l} → ${r} adds ${r}`); ch = true; } }
      return finish(level, 'FD Closure Crunch', `Find the attribute closure ${X}⁺.\n${rel}`, fmt(c), shuffle(dist), `Start with {${X.split('').join(', ')}}. ${steps.join('; ')}. Nothing more can be added, so ${X}⁺ = ${fmt(c)}.`);
    }
    // hard: which set is a candidate key?
    const subsets = []; for (let m = 1; m < (1 << nAttr); m++) subsets.push(attrs.filter((_, i) => m & (1 << i)).join(''));
    const supers = subsets.filter((s) => closure(s, fds).length === nAttr);
    const keys = supers.filter((s) => !supers.some((t) => t !== s && t.length < s.length && [...t].every((a) => s.includes(a))));
    const nonMinimal = supers.filter((s) => !keys.includes(s));
    const notSuper = subsets.filter((s) => !supers.includes(s) && s.length >= 2);
    if (!keys.length || !nonMinimal.length || notSuper.length < 2) continue;
    const key = pickOne(keys), nm = pickOne(nonMinimal);
    const fmt = (s) => '{' + s.split('').join(', ') + '}';
    const ns = shuffle(notSuper).slice(0, 2);
    return finish(level, 'FD Closure Crunch', `Which attribute set is a candidate key of R?\n${rel}`, fmt(key), [nm, ...ns].map(fmt),
      `A candidate key is a minimal set whose closure is all attributes. ${key}⁺ = ${fmt(closure(key, fds))} (everything) and removing any attribute breaks that. ${nm} is a superkey but not minimal. ${ns.join(' and ')} do not determine every attribute. All candidate keys here: ${keys.map(fmt).join(', ')}.`);
  }
  throw new Error('dbms drill failed');
}

const DRILLS = {
  dbms: { id: 'closure', name: 'FD Closure Crunch', icon: '🧮', desc: 'Compute attribute closures and spot candidate keys from random functional dependencies.', gen: dbmsDrill },
  dsa: { id: 'bigo', name: 'Big-O Blitz', icon: '⏱️', desc: 'Read code and recurrences, name the exact complexity. Rapid fire.', gen: dsaDrill },
  os: { id: 'sched', name: 'Scheduler Showdown', icon: '🕹️', desc: 'Random process sets. Work out waiting and turnaround times under FCFS, SJF, SRTF and Round Robin.', gen: osDrill },
  cn: { id: 'subnet', name: 'Subnet Sniper', icon: '🎯', desc: 'Random IPs and prefixes. Find masks, host counts, network, broadcast and usable ranges.', gen: cnDrill },
  ml: { id: 'metrics', name: 'Metric Master', icon: '📊', desc: 'Random confusion matrices. Compute accuracy, precision, recall, F1 and spot the imbalance traps.', gen: mlDrill },
  sysdesign: { id: 'capacity', name: 'Capacity Planner', icon: '📐', desc: 'Back-of-the-envelope maths: QPS, peak load, storage per year and bandwidth.', gen: sysDrill }
};

function makeDrill(subject, n, level) {
  const d = DRILLS[subject] || DRILLS.dbms;
  const out = [];
  for (let i = 0; i < n; i++) {
    const lv = LEVEL_KEYS.includes(level) ? level : (i < Math.round(n * .3) ? 'easy' : i < Math.round(n * .7) ? 'moderate' : 'hard');
    const q = d.gen(lv);
    const order = shuffle([0, 1, 2, 3]);
    out.push({ ...q, options: order.map((k) => q.options[k]), answer: order.indexOf(0) });
  }
  return out;
}

module.exports = { DRILLS, makeDrill, _sched: sched, _closure: closure };
