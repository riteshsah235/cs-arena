# CS Arena & Academy

Play the live DBMS arena: https://cs-arena-kz30.onrender.com/

A play-and-learn arena for CS students. **Season 1: DBMS**, with **186 questions** in three difficulty levels. Every question has an explanation.

- **Pick a difficulty**: Easy (68), Moderate (72), Hard (46) or Mixed (30% easy, 40% moderate, 30% hard).
- **Solo Academy**: choose a difficulty, then a training zone (or the Gauntlet). Instant feedback with an explanation after every answer, two 50/50 power-ups, XP, ranks (Rookie to ACID Legend) and per-zone mastery saved in your browser. At the end you get a **Review & learn** list: missed questions first, with your answer, the correct answer and why.
- **1v1 Battles**: create a room, share the invite link or 5-letter code, the host picks the difficulty and starts. Both players get the same 10 timed questions. The server picks questions, hides answers, times each round and scores everything, so nobody can cheat from the browser. Winner screen, session score, instant rematch and the same **Review & learn** list after the battle.
- Mobile friendly. No accounts, only a gamer tag.

## DBMS zones (11)

DBMS Basics & Architecture, Keys & Relational Model, Relational Algebra, ER Modeling, SQL Queries, Joins, Normalization, Transactions & ACID, Indexing, Storage & Query Optimization, Distributed & NoSQL.

Easy covers definitions and basic SQL. Moderate covers applied concepts (joins, views, anomalies, isolation levels, covering indexes, CAP). Hard covers edge cases and internals (NOT IN with NULL, window ranking, candidate key counting, 4NF, recoverable schedules, write skew, join cost, external sort passes, quorums).

## Scoring (battles)

Correct answer: `base + up to 50 speed bonus + 10 per streak step (max +50)`, where base is 100 (easy), 120 (moderate) or 150 (hard). Wrong or no answer: 0 and the streak resets. 15 seconds per question, 10 questions. A round ends early when both players have answered. Rematches in the same room avoid repeating questions until the pool runs out.

## Run locally

```bash
npm install
npm start          # http://localhost:3000
npm test           # plays a full 1v1 battle through the WebSocket server
```

Optional environment variables: `PORT`, `ROUNDS` (10), `LIMIT_MS` (15000), `REVEAL_MS` (4500), `GET_READY_MS` (3000).

## Deploy on Render (free)

1. New > Web Service > connect this repo.
2. Runtime Node, Build command `npm install`, Start command `npm start`, Instance type Free.
3. Open the assigned URL. The Free plan sleeps after 15 minutes idle, so the first visit can take about a minute. A restart ends active rooms and resets session scores.

## API

- `GET /health`, `GET /api/levels` (counts per level), `GET /api/topics?level=easy|moderate|hard`
- `GET /api/solo?level=...&topic=...&n=10` (a shuffled run)
- WebSocket messages: `create`, `join`, `level`, `start`, `ans`, `rematch`, `leave`

## Structure

```
server.js        HTTP + WebSocket server, room and battle logic, API
questions.js     DBMS question bank, topics, difficulty-aware picker
index.html       The whole arena UI (HTML, CSS, JS in one file)
battle.test.js   End-to-end battle test
```

## Add questions

Add a row to the `NEW` array in `questions.js`: `[topic, level, question, correct, wrong1, wrong2, wrong3, explanation]`, where level is `e`, `m` or `h`. The correct answer goes first; the server shuffles the options. To open a new zone, add a key to `TOPICS` in `questions.js` and to `TOPICS_UI` in `index.html`. Other subjects (DSA, OS, CN, ML) can reuse the same engine.

## Limits

No bots, persistent accounts, reconnect or matchmaking yet (rooms are invite-only). Room codes are invitations, not passwords.
