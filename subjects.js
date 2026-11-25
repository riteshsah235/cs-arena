'use strict';
// Registry of every subject: question bank + mini-game. A subject whose bank file is missing is listed as "soon".
const eng = require('./engine');
const dbms = require('./questions');
const { DRILLS, makeDrill } = require('./drills');

const META = {
  dbms: { name: 'DBMS', icon: '🗄️', color: '#19e6ff', blurb: 'Keys, SQL, normalization, transactions, indexing.' },
  dsa: { name: 'DSA', icon: '🌲', color: '#7dff6b', blurb: 'Complexity, arrays, lists, trees, graphs, sorting, DP.' },
  os: { name: 'Operating Systems', icon: '⚙️', color: '#ffb62e', blurb: 'Processes, scheduling, memory, deadlocks, files.' },
  cn: { name: 'Computer Networks', icon: '📡', color: '#ff2bd6', blurb: 'Layers, IP, TCP, DNS, HTTP, security.' },
  ml: { name: 'Machine Learning', icon: '🧠', color: '#b48cff', blurb: 'Regression, trees, evaluation, neural nets.' },
  sysdesign: { name: 'System Design', icon: '🏗️', color: '#ff7a59', blurb: 'Scaling, caching, queues, consistency, capacity.' }
};
const FILES = { dsa: './bank-dsa', os: './bank-os', cn: './bank-cn', ml: './bank-ml', sysdesign: './bank-sysdesign' };

const SUBJECTS = {};
for (const id of Object.keys(META)) {
  const s = { id, ...META[id], topics: {}, bank: [], ready: false };
  if (id === 'dbms') { s.topics = dbms.TOPICS; s.bank = dbms.BANK; s.ready = true; }
  else {
    try { const m = require(FILES[id]); s.topics = m.TOPICS; s.bank = eng.buildBank(m.ROWS, m.TOPICS); s.ready = s.bank.length > 0; }
    catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
  }
  const d = DRILLS[id];
  s.drill = { id: d.id, name: d.name, icon: d.icon, desc: d.desc };
  SUBJECTS[id] = s;
}

const getSubject = (id) => SUBJECTS[id] || SUBJECTS.dbms;

function decorate(sub, q) {
  const t = sub.topics[q.topic];
  return { ...q, topicName: t ? t.name : q.topicName, topicIcon: t ? t.icon : q.topicIcon, subject: sub.id };
}

// Build n questions for a quiz (bank) or a mini-game (generated).
function buildQuestions(subjectId, n, { mode = 'quiz', topic = 'all', level = 'mixed', used = new Set() } = {}) {
  const sub = getSubject(subjectId);
  if (mode === 'drill') return makeDrill(sub.id, n, level).map((q) => decorate(sub, q));
  return eng.pickFrom(sub.bank, n, { topic, level, used }).map((q) => decorate(sub, q));
}

function levelCounts(subjectId) {
  const sub = getSubject(subjectId);
  const c = { easy: 0, moderate: 0, hard: 0 };
  sub.bank.forEach((q) => c[q.level]++);
  return { ...c, total: sub.bank.length };
}

function topicList(subjectId, level) {
  const sub = getSubject(subjectId);
  const counts = {};
  sub.bank.forEach((q) => { if (!level || q.level === level) counts[q.topic] = (counts[q.topic] || 0) + 1; });
  return Object.entries(sub.topics).map(([id, t]) => ({ id, ...t, count: counts[id] || 0 }));
}

function subjectList() {
  return Object.values(SUBJECTS).map((s) => ({ id: s.id, name: s.name, icon: s.icon, color: s.color, blurb: s.blurb, ready: s.ready, drill: s.drill, ...levelCounts(s.id), zones: Object.keys(s.topics).length }));
}

module.exports = { SUBJECTS, getSubject, buildQuestions, levelCounts, topicList, subjectList };
