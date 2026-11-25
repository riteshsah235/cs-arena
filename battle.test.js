'use strict';
// Spins up the server on a random port with fast timings and plays a full 1v1 battle.
process.env.PORT = '0'; process.env.ROUNDS = '4'; process.env.REVEAL_MS = '200'; process.env.GET_READY_MS = '100'; process.env.LIMIT_MS = '3000';
const assert = require('assert');
const WebSocket = require('ws');
const { server } = require('./server');

function client(port) {
  const ws = new WebSocket('ws://127.0.0.1:' + port);
  const log = []; const waiters = [];
  ws.on('message', (d) => { const m = JSON.parse(d); log.push(m); waiters.splice(0).forEach((w) => w()); });
  const api = {
    ws, log,
    send: (o) => ws.send(JSON.stringify(o)),
    until: (pred, ms = 5000) => new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error('timeout')), ms);
      const check = () => { const f = log.find(pred); if (f) { clearTimeout(t); res(f); } else waiters.push(check); };
      check();
    })
  };
  return new Promise((r) => ws.on('open', () => r(api)));
}

(async () => {
  server.listen(0);
  await new Promise((r) => server.on('listening', r));
  const port = server.address().port;
  const a = await client(port), b = await client(port);
  const ida = (await a.until((m) => m.t === 'hello')).id, idb = (await b.until((m) => m.t === 'hello')).id;
  a.send({ t: 'create', name: 'Alice', level: 'hard' });
  const lob = await a.until((m) => m.t === 'lobby');
  assert.strictEqual(lob.level, 'hard');
  b.send({ t: 'join', name: 'Bob', code: lob.code.toLowerCase() });
  await b.until((m) => m.t === 'lobby' && m.players.length === 2);
  // third player rejected
  const c = await client(port); c.send({ t: 'join', name: 'C', code: lob.code });
  assert.strictEqual((await c.until((m) => m.t === 'err')).msg.includes('full'), true);
  b.send({ t: 'start' }); // non-host ignored
  await new Promise((r) => setTimeout(r, 150));
  assert(!b.log.find((m) => m.t === 'get_ready'));
  a.send({ t: 'start' });
  for (let i = 0; i < 4; i++) {
    const qa = await a.until((m) => m.t === 'q' && m.i === i);
    assert(!('answer' in qa), 'answer must not leak');
    await b.until((m) => m.t === 'q' && m.i === i);
    a.send({ t: 'ans', i, c: 0 }); a.send({ t: 'ans', i, c: 1 }); // double answer ignored
    b.send({ t: 'ans', i, c: 2 });
    const rv = await a.until((m) => m.t === 'reveal' && m.i === i);
    assert.strictEqual(rv.results.find((r) => r.id === ida).choice, 0);
    if (i === 0) {
      const rb = rv.results.find((r) => r.id === idb);
      assert.strictEqual(rb.ok, rv.answer === 2);
    }
  }
  const over = await a.until((m) => m.t === 'over');
  assert.strictEqual(over.review.length, 4);
  assert(over.review.every((r) => r.level === 'hard' && r.explain && r.options.length === 4));
  assert.strictEqual(over.standings.length, 2);
  a.send({ t: 'rematch' }); b.send({ t: 'rematch' });
  await a.until((m) => m.t === 'get_ready' && a.log.filter((x) => x.t === 'get_ready').length === 2 || a.log.filter((x) => x.t === 'get_ready').length === 2);
  b.ws.close();
  await a.until((m) => m.t === 'opp_left');
  // --- scenario 2: 4-player room battle on an OS drill, one player leaves mid-round, survivors rematch ---
  const P = []; for (let k = 0; k < 4; k++) P.push(await client(port));
  for (const p of P) await p.until((m) => m.t === 'hello');
  P[0].send({ t: 'create', name: 'P0', kind: 'room', subject: 'os', mode: 'drill', level: 'easy' });
  const lb2 = await P[0].until((m) => m.t === 'lobby');
  assert.strictEqual(lb2.kind, 'room'); assert.strictEqual(lb2.max, 8);
  for (let k = 1; k < 4; k++) P[k].send({ t: 'join', name: 'P' + k, code: lb2.code });
  await P[3].until((m) => m.t === 'lobby' && m.players.length === 4);
  P[0].send({ t: 'start' });
  const q0 = await P[1].until((m) => m.t === 'q' && m.i === 0);
  assert(!('answer' in q0) && q0.options.length === 4, 'drill question must not leak answer');
  P[3].ws.close(); // leaver mid-round
  await P[0].until((m) => m.t === 'player_left');
  for (let i = 0; i < 4; i++) {
    await P[0].until((m) => m.t === 'q' && m.i === i);
    for (let k = 0; k < 3; k++) P[k].send({ t: 'ans', i, c: k });
    await P[0].until((m) => m.t === 'reveal' && m.i === i);
  }
  const over2 = await P[0].until((m) => m.t === 'over');
  assert.strictEqual(over2.standings.length, 3, 'leaver dropped from standings');
  assert(over2.review.every((r) => r.explain && r.explain.length > 10));
  for (let k = 0; k < 3; k++) P[k].send({ t: 'rematch' });
  await P[0].until((m) => m.t === 'get_ready' && P[0].log.filter((x) => x.t === 'get_ready').length === 2);
  console.log('room battle test passed: standings', JSON.stringify(over2.standings.map((s) => [s.name, s.score])));
  // --- scenario 3: ranked queue, Elo, ladder, forfeit and unrated bot fallback (memory ladder, no DATABASE_URL) ---
  assert.strictEqual(require('./store').durable, false);
  const R = [await client(port), await client(port)];
  for (const p of R) await p.until((m) => m.t === 'hello');
  R[0].send({ t: 'rq', uid: 'aaaaaaaaaaaa1', name: 'RA', subject: 'dsa', level: 'mixed' });
  R[1].send({ t: 'rq', uid: 'bbbbbbbbbbbb2', name: 'RB', subject: 'dsa', level: 'mixed' });
  const lbR = await R[0].until((m) => m.t === 'lobby' && m.ranked);
  assert.strictEqual(lbR.kind, 'ranked');
  for (let i = 0; i < 4; i++) {
    await R[0].until((m) => m.t === 'q' && m.i === i, 8000);
    R[0].send({ t: 'ans', i, c: 0 }); R[1].send({ t: 'ans', i, c: 1 });
    await R[0].until((m) => m.t === 'reveal' && m.i === i, 8000);
  }
  const overR = await R[0].until((m) => m.t === 'over', 8000);
  const dl = Object.values(overR.ranked).map((x) => x.delta);
  assert.strictEqual(dl.length, 2); assert(dl[0] + dl[1] === 0 || Math.abs(dl[0] + dl[1]) <= 1, 'zero-sum Elo');
  assert(overR.ranked[R[0].log.find((m) => m.t === 'joined').you].before === 1000);
  R[0].send({ t: 'rematch' }); R[1].send({ t: 'rematch' }); // ranked has no rematch, must be ignored
  await new Promise((r) => setTimeout(r, 400));
  assert.strictEqual(R[0].log.filter((m) => m.t === 'get_ready').length, 1);
  const ladderTop = await require('./store').backend.top(10);
  assert.strictEqual(ladderTop.length, 2); assert(ladderTop[0].games === 1);
  // forfeit: fresh clients queue, one leaves mid-game
  R[0].send({ t: 'leave' }); R[1].send({ t: 'leave' });
  const F = [await client(port), await client(port)];
  for (const p of F) await p.until((m) => m.t === 'hello');
  F[0].send({ t: 'rq', uid: 'aaaaaaaaaaaa1', name: 'RA', subject: 'dsa', level: 'mixed' });
  F[1].send({ t: 'rq', uid: 'bbbbbbbbbbbb2', name: 'RB', subject: 'dsa', level: 'mixed' });
  await F[0].until((m) => m.t === 'q', 8000);
  F[1].ws.close();
  const ff = await F[0].until((m) => m.t === 'over' && m.forfeit, 5000);
  assert.strictEqual(ff.ranked[Object.keys(ff.ranked).find((k) => ff.ranked[k].delta > 0)].delta > 0, true);
  // bot fallback is unrated
  const S = await client(port); await S.until((m) => m.t === 'hello');
  S.send({ t: 'rq', uid: 'cccccccccccc3', name: 'Solo', subject: 'os', level: 'easy' });
  await S.until((m) => m.t === 'rq_wait');
  S.send({ t: 'rbot' });
  await S.until((m) => m.t === 'q', 8000);
  for (let i = 0; i < 4; i++) { await S.until((m) => m.t === 'q' && m.i === i, 8000); S.send({ t: 'ans', i, c: 0 }); await S.until((m) => m.t === 'reveal' && m.i === i, 8000); }
  const overB = await S.until((m) => m.t === 'over', 8000);
  assert.strictEqual(overB.unrated, true); assert(!overB.ranked);
  assert.strictEqual((await require('./store').backend.getPlayer('cccccccccccc3')).games, 0, 'bot games must not change rating');
  // same uid in two tabs: the second search is refused, so one profile cannot queue against itself
  const T1 = await client(port); await T1.until((m) => m.t === 'hello');
  const T2 = await client(port); await T2.until((m) => m.t === 'hello');
  T1.send({ t: 'rq', uid: 'dddddddddddd4', name: 'Twin', subject: 'os', level: 'hard' });
  await T1.until((m) => m.t === 'rq_wait');
  T2.send({ t: 'rq', uid: 'dddddddddddd4', name: 'Twin', subject: 'os', level: 'hard' });
  await T2.until((m) => m.t === 'rank_err');
  T1.send({ t: 'rq_cancel' }); await T1.until((m) => m.t === 'rq_cancelled');
  // store: a duplicate match key (retry or parallel write) applies once; distinct parallel matches all apply
  {
    const { backend } = require('./store');
    await backend.ensurePlayer('eeeeeeeeeeee5', 'E1'); await backend.ensurePlayer('ffffffffffff6', 'E2');
    const mk = (key) => ({ key, subject: 'os', level: 'mixed', sides: [{ uid: 'eeeeeeeeeeee5', delta: 16, result: 'win', score: 5 }, { uid: 'ffffffffffff6', delta: -16, result: 'loss', score: 2 }] });
    await Promise.all([backend.applyResult(mk('dup')), backend.applyResult(mk('dup')), backend.applyResult(mk('dup'))]);
    assert.strictEqual((await backend.getPlayer('eeeeeeeeeeee5')).games, 1, 'duplicate key must apply once');
    await Promise.all(['p1', 'p2', 'p3'].map((k) => backend.applyResult(mk(k))));
    const e1 = await backend.getPlayer('eeeeeeeeeeee5');
    assert.strictEqual(e1.games, 4); assert.strictEqual(e1.rating, 1064);
  }
  console.log('ranked tests passed');
  console.log('battle test passed: scores', JSON.stringify(over.standings.map((s) => [s.name, s.score])));
  process.exit(0);
})().catch((e) => { console.error('FAIL', e.message, e.stack.split('\n')[2]); process.exit(1); });
