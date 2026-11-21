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
  a.send({ t: 'create', name: 'Alice' });
  const lob = await a.until((m) => m.t === 'lobby');
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
  assert.strictEqual(over.standings.length, 2);
  a.send({ t: 'rematch' }); b.send({ t: 'rematch' });
  await a.until((m) => m.t === 'get_ready' && a.log.filter((x) => x.t === 'get_ready').length === 2 || a.log.filter((x) => x.t === 'get_ready').length === 2);
  b.ws.close();
  await a.until((m) => m.t === 'opp_left');
  console.log('battle test passed: scores', JSON.stringify(over.standings.map((s) => [s.name, s.score])));
  process.exit(0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
