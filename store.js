'use strict';
// Ladder storage. If DATABASE_URL is set (Neon Postgres) it is the only source of truth and is
// reached through Neon's HTTPS SQL endpoint (no extra npm dependency). If it is set but unreachable,
// every call rejects, and ranked fails closed. If DATABASE_URL is not set the ladder lives in memory
// and is reported as non-durable.
const URL_ = process.env.DATABASE_URL || '';
const START = 1000;
const TIERS = [[0, 'Rookie'], [1050, 'Byte Cadet'], [1200, 'Stack Ranger'], [1350, 'Kernel Knight'], [1500, 'Systems Master'], [1700, 'Arena Legend']];
const tierOf = (r) => TIERS.reduce((t, [min, name]) => (r >= min ? name : t), TIERS[0][1]);

function expected(a, b) { return 1 / (1 + Math.pow(10, (b - a) / 400)); }
function eloDelta(ra, rb, scoreA, k = 32) { return Math.round(k * (scoreA - expected(ra, rb))); }

// ---- memory backend
const mem = { players: new Map(), matches: [] };
const memBackend = {
  durable: false,
  async init() {},
  async getPlayer(uid) { return mem.players.get(uid) || null; },
  async ensurePlayer(uid, name) {
    let p = mem.players.get(uid);
    if (!p) { p = { uid, name, rating: START, games: 0, wins: 0, losses: 0, peak: START }; mem.players.set(uid, p); }
    else p.name = name;
    return { ...p };
  },
  async applyResult(m) {
    if (mem.matches.some((x) => x.key === m.key)) return;
    for (const s of m.sides) {
      const p = mem.players.get(s.uid); if (!p) continue;
      p.rating += s.delta; p.games++; p.peak = Math.max(p.peak, p.rating);
      if (s.result === 'win') p.wins++; else if (s.result === 'loss') p.losses++;
    }
    mem.matches.push({ ...m, ts: Date.now() });
  },
  async top(n) { return [...mem.players.values()].filter((p) => p.games > 0).sort((a, b) => b.rating - a.rating).slice(0, n).map((p) => ({ ...p })); },
  async ping() { return true; },
};

// ---- Neon HTTPS backend
function neon(connStr) {
  const host = new globalThis.URL(connStr.replace(/^postgres(ql)?:/, 'http:')).host;
  const endpoint = 'https://' + host + '/sql';
  async function q(query, params = []) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
    try {
      const res = await fetch(endpoint, { method: 'POST', signal: ctl.signal, headers: { 'content-type': 'application/json', 'Neon-Connection-String': connStr }, body: JSON.stringify({ query, params }) });
      if (!res.ok) throw new Error('db http ' + res.status);
      const j = await res.json();
      return j.rows || [];
    } finally { clearTimeout(t); }
  }
  const row = (r) => r && ({ uid: r.uid, name: r.name, rating: Number(r.rating), games: Number(r.games), wins: Number(r.wins), losses: Number(r.losses), peak: Number(r.peak) });
  return {
    durable: true,
    async init() {
      await q('CREATE TABLE IF NOT EXISTS players (uid text PRIMARY KEY, name text NOT NULL, rating int NOT NULL DEFAULT ' + START + ', games int NOT NULL DEFAULT 0, wins int NOT NULL DEFAULT 0, losses int NOT NULL DEFAULT 0, peak int NOT NULL DEFAULT ' + START + ', updated timestamptz NOT NULL DEFAULT now())');
      await q('CREATE TABLE IF NOT EXISTS matches (id bigserial PRIMARY KEY, ts timestamptz NOT NULL DEFAULT now(), match_key text UNIQUE, subject text, level text, uid_a text, uid_b text, score_a int, score_b int, result_a text, delta_a int, delta_b int)');
    },
    async getPlayer(uid) { return row((await q('SELECT * FROM players WHERE uid=$1', [uid]))[0]); },
    async ensurePlayer(uid, name) {
      await q('INSERT INTO players (uid, name) VALUES ($1,$2) ON CONFLICT (uid) DO UPDATE SET name=EXCLUDED.name, updated=now()', [uid, name]);
      return row((await q('SELECT * FROM players WHERE uid=$1', [uid]))[0]);
    },
    async applyResult(m) {
      // One SQL statement: the match row and both rating updates commit together or not at all.
      // match_key is unique, so a retried or concurrent duplicate write inserts nothing and changes no rating.
      const [a, b] = m.sides;
      await q(`WITH ins AS (
          INSERT INTO matches (match_key, subject, level, uid_a, uid_b, score_a, score_b, result_a, delta_a, delta_b)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (match_key) DO NOTHING RETURNING id)
        UPDATE players p SET rating = p.rating + v.d, games = p.games + 1,
          wins = p.wins + (v.r = 'win')::int, losses = p.losses + (v.r = 'loss')::int,
          peak = GREATEST(p.peak, p.rating + v.d), updated = now()
        FROM (VALUES ($4::text, $9::int, $11::text), ($5::text, $10::int, $12::text)) AS v(u, d, r)
        WHERE p.uid = v.u AND EXISTS (SELECT 1 FROM ins)`,
        [m.key, m.subject, m.level, a.uid, b.uid, a.score, b.score, a.result, a.delta, b.delta, a.result, b.result]);
    },
    async top(n) { return (await q('SELECT * FROM players WHERE games > 0 ORDER BY rating DESC LIMIT $1', [n])).map(row); },
    async ping() { await q('SELECT 1'); return true; },
  };
}

const backend = URL_ ? neon(URL_) : memBackend;
module.exports = { backend, durable: !!URL_, START, tierOf, eloDelta, TIERS };
