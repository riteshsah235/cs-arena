# CS Arena & Academy

A play-and-learn arena for CS students. **Season 1: DBMS.**

- **Solo Academy**: pick a training zone (or the Mixed Gauntlet), answer 10 questions with instant feedback, explanations, two 50/50 power-ups, XP and ranks (stored in your browser).
- **1v1 Battles**: create a room, share the invite link or 5-letter code, and race a friend on the same 10 questions. The server picks the questions, hides the answers, times each round and scores everything, so nobody can cheat from the browser. Winner screen, session score and instant rematch included.
- Mobile friendly. No accounts, only a gamer tag.

## DBMS zones (57 questions)

Keys & Relational Model, Normalization, SQL Queries, Joins, Transactions & ACID, Indexing, ER Modeling. Every question has an explanation. Battles avoid repeating questions between rematches in the same room until the bank runs out.

## Scoring (battles)

Correct answer: `100 + up to 50 speed bonus + 10 per streak step (max +50)`. Wrong or no answer: 0 and the streak resets. 15 seconds per question, 10 questions. Round ends early when both players have answered.

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

## Structure

```
server.js        HTTP + WebSocket server, room and battle logic, /api/solo, /health
questions.js     DBMS question bank, topic list, question picker
index.html       The whole arena UI (HTML, CSS, JS in one file)
battle.test.js   End-to-end battle test
```

## Add questions

Add a row to `RAW` in `questions.js`: `[topic, question, correct, wrong1, wrong2, wrong3, explanation]`. The correct answer goes first; the server shuffles the options. Add a new topic key to `TOPICS` (and `TOPICS_UI` in `index.html`) to open a new zone. Other subjects (DSA, OS, CN, ML, System Design) can reuse the same engine.

## Limits

No bots, persistent accounts, reconnect or matchmaking yet (rooms are invite-only). Room codes are invitations, not passwords.
