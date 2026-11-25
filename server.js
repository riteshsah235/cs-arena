'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { LEVELS } = require('./engine');
const store = require('./store');
const ladder = store.backend;
const { SUBJECTS, getSubject, buildQuestions, levelCounts, topicList, subjectList } = require('./subjects');

const PORT = process.env.PORT || 3000;
const ROUNDS = Number(process.env.ROUNDS) || 10;
const LIMIT_MS = Number(process.env.LIMIT_MS) || 15000;
const REVEAL_MS = Number(process.env.REVEAL_MS) || 4500;
const GET_READY_MS = Number(process.env.GET_READY_MS) || 3000;
const MAX_ROOMS = 500;
const ROOM_MAX = 8;
const BASE = { easy: 100, moderate: 120, hard: 150 };
const BOT_NAME = 'ByteBot';
const PAGES = new Set(['/', '/index.html', ...Object.keys(SUBJECTS).map((s) => '/' + s), '/join', '/ranked']);

const json = (res, obj, cache) => {
  res.writeHead(200, { 'content-type': 'application/json', 'cache-control': cache || 'no-store' });
  res.end(JSON.stringify(obj));
};
const subjectParam = (url) => (SUBJECTS[url.searchParams.get('subject')] ? url.searchParams.get('subject') : 'dbms');

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;
  if (p === '/health') return json(res, { ok: true, rooms: rooms.size, subjects: subjectList().map((s) => [s.id, s.total]) });
  if (p === '/api/ladder') {
    return ensureDb().then(() => ladder.top(50)).then((top) => json(res, { durable: store.durable, status: 'ok', top: top.map((r) => ({ name: r.name, rating: r.rating, tier: store.tierOf(r.rating), games: r.games, wins: r.wins })) }))
      .catch(() => json(res, { durable: store.durable, status: 'offline', top: [] }));
  }
  if (p === '/api/profile') {
    const uid = cleanUid(url.searchParams.get('uid'));
    if (!uid) return json(res, { error: 'bad uid' });
    return ensureDb().then(() => ladder.getPlayer(uid)).then((r) => json(res, { durable: store.durable, status: 'ok', player: r && { name: r.name, rating: r.rating, tier: store.tierOf(r.rating), games: r.games, wins: r.wins, losses: r.losses, peak: r.peak } }))
      .catch(() => json(res, { durable: store.durable, status: 'offline' }));
  }
  if (p === '/api/subjects') return json(res, subjectList());
  if (p === '/api/topics') {
    const lv = LEVELS[url.searchParams.get('level')] ? url.searchParams.get('level') : null;
    return json(res, topicList(subjectParam(url), lv));
  }
  if (p === '/api/levels') return json(res, levelCounts(subjectParam(url)));
  if (p === '/api/solo') {
    const sid = subjectParam(url), sub = getSubject(sid);
    const level = LEVELS[url.searchParams.get('level')] ? url.searchParams.get('level') : 'mixed';
    const topic = url.searchParams.get('topic') || 'all';
    const mode = url.searchParams.get('mode') === 'drill' ? 'drill' : 'quiz';
    const n = Math.max(1, Math.min(20, Number(url.searchParams.get('n')) || 10));
    if (mode === 'quiz' && !sub.ready) return json(res, []);
    return json(res, buildQuestions(sid, n, { mode, topic: sub.topics[topic] ? topic : 'all', level }));
  }
  if (PAGES.has(p)) {
    return fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
      if (err) { res.writeHead(500); return res.end('Missing index.html'); }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
      res.end(data);
    });
  }
  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('Not found');
});

// ---------------------------------------------------------------- ladder helpers
const cleanUid = (u) => (/^[a-z0-9]{12,40}$/.test(String(u || '')) ? String(u) : null);
let dbReady = !store.durable;
async function ensureDb() {
  if (dbReady) return;
  await ladder.init();
  dbReady = true;
}
const BOT_ACC = { easy: 0.85, moderate: 0.65, hard: 0.5, mixed: 0.65 };
const queue = [];
const dropFromQueue = (ws) => { const i = queue.findIndex((e) => e.ws === ws); if (i >= 0) queue.splice(i, 1); };

// ---------------------------------------------------------------- rooms
const rooms = new Map();
let nextId = 1;
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function newCode() {
  for (;;) {
    let c = '';
    for (let i = 0; i < 5; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    if (!rooms.has(c)) return c;
  }
}
const send = (ws, o) => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };
const cleanName = (n) => String(n || '').replace(/[^\p{L}\p{N} _.\-]/gu, '').trim().slice(0, 16) || 'Player';
const newPlayer = (ws, extra) => Object.assign({ id: ws.pid, ws, name: ws.name, wins: 0, score: 0, streak: 0, correct: 0, totalMs: 0 }, extra || {});

function lobbyView(room) {
  return {
    t: 'lobby', code: room.code, host: room.host, state: room.state, kind: room.kind, max: room.max,
    subject: room.subject, mode: room.mode, level: room.level,
    players: room.players.map((p) => ({ id: p.id, name: p.name, wins: p.wins }))
  };
}
const broadcast = (room, o) => room.players.forEach((p) => send(p.ws, o));
function clearTimers(room) { clearTimeout(room.timer); room.timer = null; }

function startGame(room) {
  clearTimers(room);
  room.rematch.clear();
  room.state = 'play';
  room.qs = buildQuestions(room.subject, ROUNDS, { mode: room.mode, level: room.level, used: room.used });
  room.hist = [];
  room.qs.forEach((q) => room.used.add(q.id));
  room.qi = -1;
  room.players.forEach((p) => { p.score = 0; p.streak = 0; p.correct = 0; p.totalMs = 0; });
  broadcast(room, { t: 'get_ready', subject: room.subject, mode: room.mode, level: room.level, ms: GET_READY_MS, total: room.qs.length, players: room.players.map((p) => ({ id: p.id, name: p.name })) });
  room.timer = setTimeout(() => nextQuestion(room), GET_READY_MS);
}

function nextQuestion(room) {
  clearTimers(room);
  room.qi++;
  if (room.qi >= room.qs.length) return endGame(room);
  const q = room.qs[room.qi];
  room.answers = new Map();
  room.state = 'play';
  room.qStart = Date.now();
  broadcast(room, { t: 'q', i: room.qi, total: room.qs.length, topic: q.topic, topicName: q.topicName, topicIcon: q.topicIcon, level: q.level, text: q.text, options: q.options, limit: LIMIT_MS });
  room.timer = setTimeout(() => reveal(room), LIMIT_MS + 300);
  const qi = room.qi;
  room.players.filter((p) => p.bot).forEach((bp) => {
    const delay = Math.min(LIMIT_MS * 0.7, 1500 + Math.random() * 6500) * (LIMIT_MS < 6000 ? 0.2 : 1);
    setTimeout(() => {
      if (room.state !== 'play' || room.qi !== qi || room.answers.has(bp.id)) return;
      const right = Math.random() < (BOT_ACC[room.level] || 0.65);
      let c = q.answer;
      if (!right) { const wrong = [0, 1, 2, 3].filter((x) => x !== q.answer); c = wrong[Math.floor(Math.random() * 3)]; }
      room.answers.set(bp.id, { c, ms: Math.round(delay) });
      broadcast(room, { t: 'locked', id: bp.id });
      if (room.players.every((p) => room.answers.has(p.id))) reveal(room);
    }, delay);
  });
}

function reveal(room) {
  if (room.state !== 'play') return;
  clearTimers(room);
  room.state = 'reveal';
  const q = room.qs[room.qi];
  const results = room.players.map((p) => {
    const a = room.answers.get(p.id);
    let pts = 0, ok = false;
    if (a && a.c === q.answer) {
      ok = true;
      const remaining = Math.max(0, LIMIT_MS - a.ms) / LIMIT_MS;
      pts = BASE[q.level] + Math.round(50 * remaining) + Math.min(p.streak, 5) * 10;
      p.streak++; p.correct++; p.score += pts;
    } else p.streak = 0;
    if (a) p.totalMs += a.ms;
    return { id: p.id, choice: a ? a.c : null, ok, pts, score: p.score, streak: p.streak, ms: a ? a.ms : null };
  });
  const choices = {};
  results.forEach((r) => (choices[r.id] = r.choice));
  room.hist.push({ topic: q.topic, topicName: q.topicName, topicIcon: q.topicIcon, level: q.level, text: q.text, options: q.options, answer: q.answer, explain: q.explain, choices });
  broadcast(room, { t: 'reveal', i: room.qi, answer: q.answer, explain: q.explain, results, last: room.qi === room.qs.length - 1 });
  room.timer = setTimeout(() => nextQuestion(room), REVEAL_MS);
}

function endGame(room) {
  clearTimers(room);
  room.state = 'over';
  const st = room.players.map((p) => ({ id: p.id, name: p.name, score: p.score, correct: p.correct, avgMs: p.correct ? Math.round(p.totalMs / Math.max(1, room.qs.length)) : null }));
  st.sort((a, b) => b.score - a.score);
  let winner = null;
  if (st.length > 1 && st[0].score !== st[1].score) winner = st[0].id;
  if (winner) room.players.find((p) => p.id === winner).wins++;
  const over = { t: 'over', subject: room.subject, mode: room.mode, level: room.level, kind: room.kind, review: room.hist, standings: st, winner, total: room.qs.length, wins: room.players.map((p) => ({ id: p.id, wins: p.wins })) };
  if (room.kind === 'bot') over.unrated = true;
  if (room.kind === 'ranked') {
    settle(room, winner, st).then((info) => { over.ranked = info; broadcast(room, over); })
      .catch(() => { over.ranked = { error: 'Result could not be saved to the ladder. No rating was changed.' }; broadcast(room, over); });
    return;
  }
  broadcast(room, over);
}

// Apply Elo for a finished ranked 1v1. Rating changes are written only once and only if the ladder DB accepted them.
async function settle(room, winnerId, st) {
  if (room.settled) return room.settled;
  const [a, b] = room.players.length === 2 ? room.players : room.rankPlayers;
  const ra = room.rank[a.id], rb = room.rank[b.id];
  const sa = winnerId == null ? 0.5 : (winnerId === a.id ? 1 : 0);
  const da = store.eloDelta(ra.rating, rb.rating, sa), db = store.eloDelta(rb.rating, ra.rating, 1 - sa);
  const scoreOf = (p) => (st.find((x) => x.id === p.id) || { score: 0 }).score;
  const res = (x) => (x === 0.5 ? 'draw' : x === 1 ? 'win' : 'loss');
  const m = { key: room.matchKey, subject: room.subject, level: room.level, sides: [
    { uid: ra.uid, delta: da, result: res(sa), score: scoreOf(a) },
    { uid: rb.uid, delta: db, result: res(1 - sa), score: scoreOf(b) } ] };
  room.settled = ladder.applyResult(m).then(() => {
    const out = {};
    [[a, ra, da], [b, rb, db]].forEach(([p, r, d]) => { out[p.id] = { before: r.rating, after: r.rating + d, delta: d, tier: store.tierOf(r.rating + d), durable: store.durable }; });
    return out;
  });
  return room.settled;
}

function removePlayer(ws) {
  const room = ws.room;
  if (!room) return;
  ws.room = null;
  const left = room.players.find((p) => p.ws === ws);
  room.players = room.players.filter((p) => p.ws !== ws);
  room.rematch.delete(ws.pid);
  if (!room.players.length || room.players.every((p) => p.bot)) { clearTimers(room); rooms.delete(room.code); return; }
  const wasRanked = room.kind === 'ranked' && (room.state === 'play' || room.state === 'reveal') && !room.settled;
  if (wasRanked && left) {
    // Leaving a ranked match mid-game is a forfeit.
    clearTimers(room);
    room.state = 'over';
    room.rankPlayers = [left, room.players[0]];
    const st = [{ id: room.players[0].id, name: room.players[0].name, score: room.players[0].score, correct: room.players[0].correct, avgMs: null }, { id: left.id, name: left.name, score: left.score, correct: left.correct, avgMs: null }];
    settle(room, room.players[0].id, st)
      .then((info) => broadcast(room, { t: 'over', forfeit: true, subject: room.subject, mode: room.mode, level: room.level, kind: room.kind, review: room.hist, standings: st, winner: room.players[0].id, total: room.qs.length, wins: [], ranked: info }))
      .catch(() => broadcast(room, { t: 'over', forfeit: true, kind: room.kind, review: room.hist, standings: st, winner: room.players[0].id, total: room.qs.length, wins: [], ranked: { error: 'Result could not be saved to the ladder. No rating was changed.' } }));
    return;
  }
  if (room.host === ws.pid) room.host = room.players[0].id;
  const playing = room.state === 'play' || room.state === 'reveal';
  // A room battle with 2+ players left carries on without the leaver.
  if (room.kind === 'room' && room.players.length >= 2 && (playing || room.state === 'over')) {
    broadcast(room, { t: 'player_left', id: ws.pid, name: left ? left.name : 'A player' });
    if (room.state === 'play' && room.players.every((p) => room.answers.has(p.id))) reveal(room);
    if (room.state === 'over' && room.rematch.size === room.players.length) startGame(room);
    return;
  }
  const wasPlaying = room.state !== 'lobby';
  clearTimers(room);
  room.state = 'lobby';
  if (wasPlaying) broadcast(room, { t: 'opp_left' });
  broadcast(room, lobbyView(room));
}

function makeRoom(kind, max, subject, mode, level, host) {
  return { code: newCode(), kind, max, subject, mode, level, hist: [], players: [], host, state: 'lobby', timer: null, qs: [], qi: -1, answers: new Map(), rematch: new Set(), used: new Set(), qStart: 0, matchKey: null };
}
function tryMatch() {
  const now = Date.now();
  queue.sort((x, y) => x.since - y.since);
  for (let i = 0; i < queue.length; i++) {
    const a = queue[i];
    for (let j = i + 1; j < queue.length; j++) {
      const b = queue[j];
      if (a.subject !== b.subject || a.level !== b.level || a.uid === b.uid) continue;
      const window = 100 + 20 * Math.floor((now - Math.min(a.since, b.since)) / 1000);
      if (Math.abs(a.rating - b.rating) > window) continue;
      queue.splice(j, 1); queue.splice(i, 1);
      const r = makeRoom('ranked', 2, a.subject, 'quiz', a.level, a.ws.pid);
      r.matchKey = r.code + '-' + now;
      r.rank = { [a.ws.pid]: { uid: a.uid, rating: a.rating }, [b.ws.pid]: { uid: b.uid, rating: b.rating } };
      r.players.push(newPlayer(a.ws), newPlayer(b.ws));
      rooms.set(r.code, r); a.ws.room = r; b.ws.room = r;
      send(a.ws, { t: 'joined', you: a.ws.pid }); send(b.ws, { t: 'joined', you: b.ws.pid });
      broadcast(r, Object.assign(lobbyView(r), { ranked: true }));
      startGame(r);
      return tryMatch();
    }
  }
}
setInterval(tryMatch, 2000);

const wss = new WebSocketServer({ server, maxPayload: 2048 });
wss.on('connection', (ws) => {
  ws.pid = 'p' + nextId++;
  ws.room = null;
  ws.name = 'Player';
  ws.alive = true;
  ws.msgs = 0;
  send(ws, { t: 'hello', id: ws.pid });

  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m.t !== 'string') return;
    if (++ws.msgs > 200) return; // coarse flood guard, resets below
    const room = ws.room;
    switch (m.t) {
      case 'ping': return send(ws, { t: 'pong' });
      case 'create': {
        if (room) return;
        if (rooms.size >= MAX_ROOMS) return send(ws, { t: 'err', msg: 'Arena is full right now. Try again soon.' });
        ws.name = cleanName(m.name);
        const subject = SUBJECTS[m.subject] ? m.subject : 'dbms';
        const mode = m.mode === 'drill' ? 'drill' : 'quiz';
        if (mode === 'quiz' && !SUBJECTS[subject].ready) return send(ws, { t: 'err', msg: 'That subject has no question bank yet. Try its mini-game.' });
        const kind = m.kind === 'room' ? 'room' : 'duel';
        const r = { code: newCode(), kind, max: kind === 'room' ? ROOM_MAX : 2, subject, mode, level: LEVELS[m.level] ? m.level : 'mixed', hist: [], players: [], host: ws.pid, state: 'lobby', timer: null, qs: [], qi: -1, answers: new Map(), rematch: new Set(), used: new Set(), qStart: 0 };
        r.players.push(newPlayer(ws));
        rooms.set(r.code, r); ws.room = r;
        send(ws, { t: 'joined', you: ws.pid });
        return broadcast(r, lobbyView(r));
      }
      case 'join': {
        if (room) return;
        const code = String(m.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
        const r = rooms.get(code);
        if (!r) return send(ws, { t: 'err', msg: 'No battle found with that code.' });
        if (r.players.length >= r.max) return send(ws, { t: 'err', msg: r.kind === 'duel' ? 'That arena is already full (1v1).' : 'That room is full (8 players).' });
        if (r.state !== 'lobby') return send(ws, { t: 'err', msg: 'That battle already started.' });
        ws.name = cleanName(m.name);
        r.players.push(newPlayer(ws));
        ws.room = r;
        send(ws, { t: 'joined', you: ws.pid });
        return broadcast(r, lobbyView(r));
      }
      case 'start': {
        if (!room || room.state !== 'lobby' || room.host !== ws.pid) return;
        if (room.players.length < 2) return send(ws, { t: 'err', msg: 'Waiting for an opponent to join.' });
        return startGame(room);
      }
      case 'cfg': { // host changes subject / mode / level while in the lobby
        if (!room || room.state !== 'lobby' || room.host !== ws.pid) return;
        const next = { subject: room.subject, mode: room.mode, level: room.level };
        if (SUBJECTS[m.subject]) next.subject = m.subject;
        if (m.mode === 'drill' || m.mode === 'quiz') next.mode = m.mode;
        if (LEVELS[m.level] || m.level === 'mixed') next.level = m.level;
        if (next.mode === 'quiz' && !SUBJECTS[next.subject].ready) return send(ws, { t: 'err', msg: 'That subject has no question bank yet.' });
        Object.assign(room, next);
        room.used.clear();
        return broadcast(room, lobbyView(room));
      }
      case 'level': {
        if (!room || room.state !== 'lobby' || room.host !== ws.pid) return;
        if (!LEVELS[m.level] && m.level !== 'mixed') return;
        room.level = m.level;
        return broadcast(room, lobbyView(room));
      }
      case 'ans': {
        if (!room || room.state !== 'play' || m.i !== room.qi || room.answers.has(ws.pid)) return;
        const c = Number(m.c);
        if (!Number.isInteger(c) || c < 0 || c > 3) return;
        const ms = Math.min(LIMIT_MS, Date.now() - room.qStart);
        room.answers.set(ws.pid, { c, ms });
        broadcast(room, { t: 'locked', id: ws.pid });
        if (room.players.every((p) => room.answers.has(p.id))) reveal(room);
        return;
      }
      case 'rematch': {
        if (!room || room.state !== 'over' || room.kind === 'ranked') return;
        room.rematch.add(ws.pid);
        broadcast(room, { t: 'rematch_vote', ids: [...room.rematch] });
        if (room.players.length >= 2 && room.players.every((p) => room.rematch.has(p.id))) startGame(room);
        else if (room.players.length < 2) { room.state = 'lobby'; broadcast(room, lobbyView(room)); }
        return;
      }
      case 'rq': { // ranked queue
        if (room || queue.some((e) => e.ws === ws)) return;
        const uid = cleanUid(m.uid), subject = SUBJECTS[m.subject] ? m.subject : null;
        if (!uid || !subject || !SUBJECTS[subject].ready) return send(ws, { t: 'rank_err', msg: 'Pick a subject that has a question bank for ranked.' });
        const level = LEVELS[m.level] || m.level === 'mixed' ? m.level : 'mixed';
        ws.name = cleanName(m.name);
        ensureDb().then(() => ladder.ensurePlayer(uid, ws.name)).then((pl) => {
          if (ws.readyState !== 1 || ws.room || queue.some((e) => e.ws === ws)) return;
          queue.push({ ws, uid, name: ws.name, subject, level, rating: pl.rating, since: Date.now() });
          send(ws, { t: 'rq_wait', rating: pl.rating, tier: store.tierOf(pl.rating), games: pl.games, durable: store.durable });
          tryMatch();
        }).catch(() => send(ws, { t: 'rank_err', offline: true, msg: 'Ranked is offline: the ladder database is unreachable, so ratings would not be saved. You can still play unrated.' }));
        return;
      }
      case 'rq_cancel': dropFromQueue(ws); return send(ws, { t: 'rq_cancelled' });
      case 'rbot': { // unrated sparring fallback for a waiting player
        const e = queue.find((x) => x.ws === ws);
        if (!e || room) return;
        dropFromQueue(ws);
        const bws = { readyState: 1, send() {}, pid: 'bot' + nextId++, name: BOT_NAME };
        const r = makeRoom('bot', 2, e.subject, 'quiz', e.level, ws.pid);
        r.players.push(newPlayer(ws), newPlayer(bws, { bot: true }));
        rooms.set(r.code, r); ws.room = r;
        send(ws, { t: 'joined', you: ws.pid });
        broadcast(r, lobbyView(r));
        return startGame(r);
      }
      case 'leave': dropFromQueue(ws); return removePlayer(ws);
    }
  });
  ws.on('pong', () => (ws.alive = true));
  ws.on('close', () => { dropFromQueue(ws); removePlayer(ws); });
  ws.on('error', () => {});
});
setInterval(() => wss.clients.forEach((c) => { c.msgs = 0; }), 5000);
setInterval(() => wss.clients.forEach((c) => {
  if (!c.alive) return c.terminate();
  c.alive = false; try { c.ping(); } catch {}
}), 30000);

if (require.main === module) {
  server.listen(PORT, () => console.log('CS Arena listening on ' + PORT));
}
module.exports = { server };
