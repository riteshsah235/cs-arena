<!-- CS ARENA README | dark-friendly | mobile-first -->

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://readme-typing-svg.demolab.com?font=Outfit&weight=800&size=34&pause=1200&color=19E6FF&center=true&vCenter=true&width=560&height=70&lines=CS+ARENA+%26+ACADEMY;Play.+Learn.+Rank+up.;Six+CS+subjects.+One+arena.">
  <img src="https://readme-typing-svg.demolab.com?font=Outfit&weight=800&size=34&pause=1200&color=0A7EA4&center=true&vCenter=true&width=560&height=70&lines=CS+ARENA+%26+ACADEMY;Play.+Learn.+Rank+up.;Six+CS+subjects.+One+arena." alt="CS Arena & Academy"/>
</picture>

<br/>

<p align="center">
  <b>A play-and-learn arena for CS students</b><br/>
  <i>Solo practice, 1v1 realtime battles and a ranked ladder, with an explanation after every question</i>
  <br/><b>DBMS</b> · <b>DSA</b> · <b>OS</b> · <b>CN</b> · <b>ML</b> · <b>System Design</b>
</p>

<br/>

[![Live](https://img.shields.io/badge/Live-cs--arena-19E6FF?style=for-the-badge&labelColor=1F1D1B)](https://cs-arena-kz30.onrender.com/)
[![Node](https://img.shields.io/badge/Node.js-18%2B-3C873A?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![WebSocket](https://img.shields.io/badge/Realtime-WebSocket-7DFF6B?style=for-the-badge&labelColor=1F1D1B)](https://github.com/websockets/ws)
[![Hosting](https://img.shields.io/badge/Hosting-Render%20Free-FFB62E?style=for-the-badge&labelColor=1F1D1B)](https://render.com)

<br/>

<p>
  <a href="#-overview">Overview</a> &nbsp;•&nbsp;
  <a href="#-key-features">Features</a> &nbsp;•&nbsp;
  <a href="#-subjects--question-banks">Subjects</a> &nbsp;•&nbsp;
  <a href="#-scoring">Scoring</a> &nbsp;•&nbsp;
  <a href="#-project-structure">Structure</a> &nbsp;•&nbsp;
  <a href="#-getting-started">Get Started</a> &nbsp;•&nbsp;
  <a href="#-quality-and-known-limits">Limits</a> &nbsp;•&nbsp;
  <a href="#-roadmap">Roadmap</a>
</p>

</div>

---

## <img src="https://api.iconify.design/lucide/flame.svg?color=%2319E6FF&width=22&height=22" alt=""/> Overview

> **CS Arena & Academy** turns revision into a game. Pick a subject, choose Easy, Moderate or Hard, and answer timed multiple choice questions alone or against another player. Every answer comes with an explanation, and every run ends with a review list of what you missed.

**Live:** https://cs-arena-kz30.onrender.com/ (free hosting, the first visit after idle can take about a minute to wake up)

| The problem | What CS Arena does |
|:---|:---|
| Flashcards are boring and give no feedback | Instant feedback with a short explanation after each answer |
| Exam prep has no pressure | Timed 1v1 battles and a ranked ladder |
| You do not know what you keep missing | A Review & learn list, missed questions first |
| Every site wants an account | No accounts to play, only a gamer tag |

---

## <img src="https://api.iconify.design/lucide/sparkles.svg?color=%2319E6FF&width=22&height=22" alt=""/> Key Features

| Mode | What you get |
|:---|:---|
| **Solo Academy** | Choose a subject, difficulty and zone (or the Gauntlet). Two 50/50 power-ups, XP, ranks and per-zone mastery saved in your browser |
| **1v1 Battles** | Create a room, share the invite link or 5-letter code, the host picks the difficulty. Both players get the same 10 timed questions |
| **Ranked ladder** | Elo based 1v1 with a leaderboard and tiers. Rating is written once per finished match |
| **ByteBot practice** | Play a bot when nobody is around. Bot games are unrated |
| **Skill drills** | One practice mini-game per subject (see below). Drills are practice and are not counted as questions |
| **Review & learn** | After every run or battle: missed questions first, your answer, the correct answer and why |

### Skill drills

| Subject | Drill |
|:---|:---|
| DBMS | FD Closure Crunch |
| DSA | Big-O Blitz |
| Operating Systems | Scheduler Showdown |
| Computer Networks | Subnet Sniper |
| Machine Learning | Metric Master |
| System Design | Capacity Planner |

---

## <img src="https://api.iconify.design/lucide/library.svg?color=%2319E6FF&width=22&height=22" alt=""/> Subjects & Question Banks

Counts are distinct static questions per level (the generated drills are not included). Snapshot taken on 25 Nov 2026, the build is still in progress.

| Subject | Easy | Moderate | Hard | Total | Status |
|:---|---:|---:|---:|---:|:---|
| DBMS | 303 | 303 | 301 | 907 | Live |
| DSA | 309 | 301 | 300 | 910 | Live |
| Operating Systems | 301 | 318 | 301 | 920 | Live |
| Computer Networks | 224 | 289 | 207 | 720 | Live, growing |
| Machine Learning | 174 | 298 | 155 | 627 | Live, growing |
| System Design | 127 | 228 | 66 | 421 | Live, early |

Each question has four options, one correct answer and an explanation. Easy covers definitions and basics, Moderate covers applied concepts and Hard covers multi step reasoning and edge cases. Live counts are served at `/api/subjects`.

---

## <img src="https://api.iconify.design/lucide/trophy.svg?color=%2319E6FF&width=22&height=22" alt=""/> Scoring

Correct answer: `base + up to 50 speed bonus + 10 per streak step (max +50)`, where base is 100 (easy), 120 (moderate) or 150 (hard). Wrong or no answer scores 0 and resets the streak. 15 seconds per question, 10 questions per battle. A round ends early when both players have answered. Rematches in the same room avoid repeating questions until the pool runs out.

Ranked matches use an Elo update on the final result. If the ladder database cannot save a result, no rating is changed.

---

## <img src="https://api.iconify.design/lucide/folder-tree.svg?color=%2319E6FF&width=22&height=22" alt=""/> Project Structure

```
cs-arena/
├── server.js              HTTP + WebSocket server, rooms, battles, ranked matchmaking, API
├── index.html             The whole arena UI (HTML, CSS and JS in one file)
├── package.json
├── src/
│   ├── engine.js          Shared picker, balancing and question instances
│   ├── subjects.js        Subject registry, zones and per-level counts
│   ├── drills.js          Generated skill drills
│   ├── store.js           Ladder storage and Elo maths
│   ├── questions.js       Original DBMS set
│   └── banks/
│       ├── bank-dbms.js
│       ├── bank-dsa.js
│       ├── bank-os.js
│       ├── bank-cn.js
│       └── bank-ml.js
├── tests/
│   ├── battle.test.js     End to end 1v1 battle over WebSocket
│   └── store.test.js      Ladder idempotency and concurrency
└── scripts/
    └── validate.js        Question bank validator and coverage report
```

---

## <img src="https://api.iconify.design/lucide/rocket.svg?color=%2319E6FF&width=22&height=22" alt=""/> Getting Started

```bash
npm install
npm start          # http://localhost:3000
npm test           # battle and ladder tests
npm run validate   # validate banks and print per-level counts
```

Optional environment variables: `PORT`, `ROUNDS` (10), `LIMIT_MS` (15000), `REVEAL_MS` (4500), `GET_READY_MS` (3000), and `DATABASE_URL` for a persistent Postgres ladder. Without it the ladder is kept in memory and resets on restart.

### Deploy on Render (free)

1. New > Web Service > connect this repo.
2. Runtime Node, build command `npm install`, start command `npm start`.
3. Optional: add `DATABASE_URL` (a free Postgres) for a persistent ladder.

The free plan sleeps after 15 minutes idle. A restart ends active rooms.

### Add questions

Add a row to the `ROWS` array in the subject file under `src/banks/`: `[topic, level, question, correct, wrong1, wrong2, wrong3, explanation]`, where level is `e`, `m` or `h`. The correct answer goes first and the server shuffles options. Run `npm run validate` before committing.

---

## <img src="https://api.iconify.design/lucide/shield-check.svg?color=%2319E6FF&width=22&height=22" alt=""/> Quality and Known Limits

- **Review status:** the banks were written and self-reviewed by the author. They are not human expert reviewed and not every question is proven correct. Independent automated audits re-derived the computed answers and read the concept items for DSA, DBMS and OS, and for most of Computer Networks, and found no wrong answers in the items they checked. Audits are sampled and targeted, and the newest rows, Machine Learning and System Design have little or no audit coverage.
- **Template density:** many Hard numeric questions are variants of one pattern with different numbers (for example subnetting or scheduling traces). They are correct and distinct computations, but they are not 300 different concepts. Coverage is being widened with scenario questions.
- **Casual fairness:** this is a learning game, not a cheat-proof contest. The question bank and solo answers are available to players, so battle scores are for fun and ranked results are best effort.
- **Identity:** players are identified by a gamer tag and a browser id, not an account.
- **Hosting:** free tier, so cold starts and restarts can interrupt rooms.

---

## <img src="https://api.iconify.design/lucide/map.svg?color=%2319E6FF&width=22&height=22" alt=""/> Roadmap

- [x] DBMS, DSA and Operating Systems banks above 300 per level
- [x] Ranked ladder, ByteBot practice and skill drills
- [ ] Computer Networks to 300 per level
- [ ] Machine Learning bank
- [ ] System Design bank and zones
- [ ] More scenario style Hard questions to reduce template density

---

<div align="center">

© 2026 All rights reserved.<br/>
Designed & Developed by **Ritesh**

</div>
