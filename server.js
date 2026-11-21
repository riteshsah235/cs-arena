'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { TOPICS, LEVELS, BANK, pick } = require('./questions');

const PORT = process.env.PORT || 3000;
const ROUNDS = Number(process.env.ROUNDS) || 10;
const LIMIT_MS = Number(process.env.LIMIT_MS) || 15000;
const REVEAL_MS = Number(process.env.REVEAL_MS) || 4500;
const GET_READY_MS = Number(process.env.GET_READY_MS) || 3000;
const MAX_ROOMS = 500;
const BASE = { easy: 100, moderate: 120, hard: 150 };


const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, rooms: rooms.size, questions: BANK.length }));
  }
  if (url.pathname === '/api/topics') {
    const counts = {};
    const lv = LEVELS[url.searchParams.get('level')] ? url.searchParams.get('level') : null;
    BANK.forEach((q) => { if (!lv || q.level === lv) counts[q.topic] = (counts[q.topic] || 0) + 1; });
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(Object.entries(TOPICS).map(([id, t]) => ({ id, ...t, count: counts[id] || 0 }))));
  }
  if (url.pathname === '/api/levels') {
    const c = { easy: 0, moderate: 0, hard: 0 };
    BANK.forEach((q) => c[q.level]++);
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ ...c, total: BANK.length }));
  }
  if (url.pathname === '/api/solo') {
    const level = LEVELS[url.searchParams.get('level')] ? url.searchParams.get('level') : 'mixed';
    const topic = url.searchParams.get('topic') || 'all';
    const n = Math.max(1, Math.min(20, Number(url.searchParams.get('n')) || 10));
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    return res.end(JSON.stringify(pick(n, { topic: TOPICS[topic] ? topic : 'all', level })));
  }
  if (url.pathname === '/' || url.pathname === '/index.html') {
    return fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
      if (err) { res.writeHead(500); return res.end('Missing index.html'); }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
      res.end(data);
    });
  }
  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('Not found');
});

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

function lobbyView(room) {
  return {
    t: 'lobby', code: room.code, host: room.host, state: room.state,
    level: room.level,
    players: room.players.map((p) => ({ id: p.id, name: p.name, wins: p.wins }))
  };
}
const broadcast = (room, o) => room.players.forEach((p) => send(p.ws, o));
function clearTimers(room) { clearTimeout(room.timer); room.timer = null; }

function startGame(room) {
  clearTimers(room);
  room.rematch.clear();
  room.state = 'play';
  room.qs = pick(ROUNDS, { level: room.level, used: room.used });
  room.hist = [];
  room.qs.forEach((q) => room.used.add(q.id));
  room.qi = -1;
  room.players.forEach((p) => { p.score = 0; p.streak = 0; p.correct = 0; p.totalMs = 0; });
  broadcast(room, { t: 'get_ready', level: room.level, ms: GET_READY_MS, total: room.qs.length, players: room.players.map((p) => ({ id: p.id, name: p.name })) });
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
  broadcast(room, { t: 'q', i: room.qi, total: room.qs.length, topic: q.topic, topicName: TOPICS[q.topic].name, level: q.level, text: q.text, options: q.options, limit: LIMIT_MS });
  room.timer = setTimeout(() => reveal(room), LIMIT_MS + 300);
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
  room.hist.push({ topic: q.topic, level: q.level, text: q.text, options: q.options, answer: q.answer, explain: q.explain, choices });
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
  broadcast(room, { t: 'over', level: room.level, review: room.hist, standings: st, winner, total: room.qs.length, wins: room.players.map((p) => ({ id: p.id, wins: p.wins })) });
}

function removePlayer(ws) {
  const room = ws.room;
  if (!room) return;
  ws.room = null;
  room.players = room.players.filter((p) => p.ws !== ws);
  room.rematch.delete(ws.pid);
  if (!room.players.length) { clearTimers(room); rooms.delete(room.code); return; }
  const wasPlaying = room.state !== 'lobby';
  clearTimers(room);
  room.state = 'lobby';
  room.host = room.players[0].id;
  if (wasPlaying) broadcast(room, { t: 'opp_left' });
  broadcast(room, lobbyView(room));
}

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
    if (++ws.msgs > 200) { // coarse flood guard, resets below
      return;
    }
    const room = ws.room;
    switch (m.t) {
      case 'ping': return send(ws, { t: 'pong' });
      case 'create': {
        if (room) return;
        if (rooms.size >= MAX_ROOMS) return send(ws, { t: 'err', msg: 'Arena is full right now. Try again soon.' });
        ws.name = cleanName(m.name);
        const r = { code: newCode(), level: LEVELS[m.level] ? m.level : 'mixed', hist: [], players: [], host: ws.pid, state: 'lobby', timer: null, qs: [], qi: -1, answers: new Map(), rematch: new Set(), used: new Set(), qStart: 0 };
        r.players.push({ id: ws.pid, ws, name: ws.name, wins: 0, score: 0, streak: 0, correct: 0, totalMs: 0 });
        rooms.set(r.code, r); ws.room = r;
        send(ws, { t: 'joined', you: ws.pid });
        return broadcast(r, lobbyView(r));
      }
      case 'join': {
        if (room) return;
        const code = String(m.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
        const r = rooms.get(code);
        if (!r) return send(ws, { t: 'err', msg: 'No battle found with that code.' });
        if (r.players.length >= 2) return send(ws, { t: 'err', msg: 'That arena is already full (1v1).' });
        if (r.state !== 'lobby') return send(ws, { t: 'err', msg: 'That battle already started.' });
        ws.name = cleanName(m.name);
        r.players.push({ id: ws.pid, ws, name: ws.name, wins: 0, score: 0, streak: 0, correct: 0, totalMs: 0 });
        ws.room = r;
        send(ws, { t: 'joined', you: ws.pid });
        return broadcast(r, lobbyView(r));
      }
      case 'start': {
        if (!room || room.state !== 'lobby' || room.host !== ws.pid) return;
        if (room.players.length < 2) return send(ws, { t: 'err', msg: 'Waiting for an opponent to join.' });
        return startGame(room);
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
        if (room.answers.size >= room.players.length) reveal(room);
        return;
      }
      case 'rematch': {
        if (!room || room.state !== 'over') return;
        room.rematch.add(ws.pid);
        broadcast(room, { t: 'rematch_vote', ids: [...room.rematch] });
        if (room.players.length === 2 && room.rematch.size === 2) startGame(room);
        else if (room.players.length < 2) { room.state = 'lobby'; broadcast(room, lobbyView(room)); }
        return;
      }
      case 'leave': return removePlayer(ws);
    }
  });
  ws.on('pong', () => (ws.alive = true));
  ws.on('close', () => removePlayer(ws));
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
