#!/usr/bin/env node
// The TestPal team's office: chat, calendar and meetings, board, bug tracker, CI and handbook for the simulated team.
// Usage: npm run team-chat   (then open http://localhost:4321)
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { CHANNELS, FACILITATOR, HERE, PEOPLE, REPO, append, broadcast, channel, clients, load, notify, readSettings } from './lib/store.mjs';
import { CLAUDE, MODEL_NAME, deliver, mentionsIn, runAgent, splitChanges, statuses, transcript, typingKeys } from './lib/agents.mjs';
import { createBug, logActivity, readBoard, setBugStatus, setTicketStatus } from './lib/board.mjs';
import { activity, connected, dayLabel, disconnected, officeView } from './lib/office.mjs';
import { listBuilds, rerun, startCI } from './lib/ci.mjs';
import { askGuide, ensurePlan, filesChanged, guideBusy, guidePlan, schedule } from './lib/guide.mjs';

const PORT = Number(process.env.TEAM_CHAT_PORT ?? 4321);
const TEAM_DIR = path.join(REPO, 'team');
const SEEDED = path.join(TEAM_DIR, '.seeded');
/** Files the office never shows Samin: dot folders (the answer key, training settings), teammates' private
 *  journals, and the rules the simulated teammates follow. */
const PRIVATE = (rel) => rel.split('/').some((s) => s.startsWith('.')) || rel.startsWith('team/people/') || rel === 'team/TEAMMATE-RULES.md' || rel.startsWith('team/chat/');
const VISIBLE_CHANNELS = CHANNELS.filter((c) => !c.hidden);

// ---------- helpers ----------
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (d) => (body += d));
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch (e) { reject(e); } });
  });
}
function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}
const fail = (message) => Object.assign(new Error(message), { status: 400 });
const guard = (check) => { try { check(); } catch (e) { throw fail(e.message); } };

/** Who answers a message from Samin outside a meeting. */
function recipients(ch, text) {
  const c = channel(ch);
  if (c.kind === 'dm') return [c.person];
  const named = mentionsIn(text);
  return named.length ? named : [FACILITATOR]; // the Project Manager keeps an eye on every channel
}

function listTeamFiles() {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, e.name);
      if (PRIVATE(path.relative(REPO, abs).split(path.sep).join('/'))) continue;
      if (e.isDirectory()) walk(abs);
      else if (e.name.endsWith('.md')) {
        const title = (fs.readFileSync(abs, 'utf8').match(/^#\s+(.+)$/m) ?? [])[1]?.trim();
        out.push({ path: path.relative(REPO, abs).split(path.sep).join('/'), modified: fs.statSync(abs).mtimeMs, title });
      }
    }
  };
  walk(TEAM_DIR);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

// ---------- board actions (what QA is allowed to do on the board) ----------
const QA_ACTIONS = {
  'start-testing': { from: ['Ready for QA', 'Reopened'], to: 'In QA' },
  pass: { from: ['In QA'], to: 'QA Passed' },
  reopen: { from: ['Ready for QA', 'In QA', 'QA Passed'], to: 'Reopened', needsComment: true },
};
function moveTicket({ id, action, comment = '' }) {
  const a = QA_ACTIONS[action];
  if (!a) throw fail('Unknown action.');
  const t = readBoard().tickets.find((x) => x.id === id);
  if (!t) throw fail(`${id} isn't on the board.`);
  if (!a.from.includes(t.status)) throw fail(`${id} is ${t.status}. You can do that from ${a.from.join(' or ')}.`);
  if (a.needsComment && !comment.trim()) throw fail('Say why you are reopening it (and link the bug).');
  setTicketStatus(id, a.to);
  logActivity(id, `Samin moved it from ${t.status} to ${a.to}.${comment ? ` ${comment.trim()}` : ''}`, dayLabel());
  const owner = t.ownerKey, at = owner && PEOPLE[owner] ? ` @${PEOPLE[owner].short}` : '';
  if (action === 'start-testing') {
    notify('sprint-1', `🧪 **Samin** started testing **${id}** (${t.status} → In QA).${comment ? `\n\n${comment}` : ''}`);
  } else {
    const text = action === 'pass'
      ? `✅ **${id} passed QA.**${comment ? ` ${comment.trim()}` : ''}${at} it's signed off, so you can merge it.`
      : `🔁 **${id} is reopened.** ${comment.trim()}${at}`;
    const msg = append('sprint-1', { from: 'samin', text });
    if (owner && PEOPLE[owner]?.agent) deliver(owner, 'sprint-1', msg);
  }
}

function fileBug(f) {
  if (!String(f.title ?? '').trim()) throw fail('A bug needs a title.');
  if (!/^Sev-[1-4]$/.test(f.severity ?? '')) throw fail('Pick a severity.');
  const id = createBug(f, dayLabel());
  const msg = append('bugs', { from: 'samin', text: `🐞 Filed **${id}**: ${f.title.trim()}\n\n${f.severity}${f.ticket ? `, against ${f.ticket}` : ''}. [Open the report](team/bugs/${id}.md)` });
  deliver(FACILITATOR, 'bugs', msg, { extra: `Samin just filed ${id} (team/bugs/${id}.md). Acknowledge it in one or two lines and say it goes to the next triage (Samin doesn't attend; Priya presents it as written). If it's Sev-1, say what it might do to the sprint and suggest Samin raises it with Dana now. Don't judge the severity or the report.` });
  if (/\*\*Coaching:\s*always/i.test(readSettings())) {
    deliver('priya', 'bugs', msg, { extra: `Samin just filed ${id} (team/bugs/${id}.md). The Coaching setting is "always": give quick feedback on the report against the rubric in team/WORKFLOW.md (1–2 strengths, 1–2 changes). Don't change the report or its severity yourself.` });
  }
  return id;
}

function verifyBug({ id, result, comment = '' }) {
  const b = readBoard().bugs.find((x) => x.id === id);
  if (!b) throw fail(`${id} isn't on the board.`);
  if (result === 'reopen' && !comment.trim()) throw fail('Say what still fails.');
  const to = result === 'close' ? 'Closed' : 'Reopened';
  setBugStatus(id, to);
  logActivity(id, `Samin retested it: ${to.toLowerCase()}.${comment ? ` ${comment.trim()}` : ''}`, dayLabel());
  const at = b.ownerKey && PEOPLE[b.ownerKey]?.agent ? ` @${PEOPLE[b.ownerKey].short}` : '';
  const msg = append('bugs', { from: 'samin', text: to === 'Closed' ? `✔️ Retested **${id}**: fixed, closing it.${comment ? ` ${comment.trim()}` : ''}${at}` : `🔁 Retested **${id}**: still failing. ${comment.trim()}${at}` });
  if (b.ownerKey && PEOPLE[b.ownerKey]?.agent && to === 'Reopened') deliver(b.ownerKey, 'bugs', msg);
}

// ---------- http ----------
const routes = {
  'GET /api/state': () => ({
    repo: REPO.split(path.sep).join('/'), people: PEOPLE, channels: VISIBLE_CHANNELS,
    messages: Object.fromEntries(VISIBLE_CHANNELS.map((c) => [c.id, load(c.id).map(({ changes, ...m }) => m)])), typing: typingKeys(),
    statuses: statuses(), office: officeView(),
  }),
  'GET /api/files': () => listTeamFiles(),
  'GET /api/board': () => readBoard(),
  'GET /api/builds': () => listBuilds(),
  'POST /api/send': ({ channel: ch, text }) => {
    if (!channel(ch) || channel(ch).hidden || typeof text !== 'string' || !text.trim()) throw fail('Bad message.');
    activity();
    const msg = append(ch, { from: 'samin', text: text.trim() });
    for (const person of recipients(ch, msg.text)) deliver(person, ch, msg);
    return { ok: true };
  },
  'POST /api/presence': () => { activity(); return officeView(); },
  'GET /api/guide': () => { ensurePlan(); return { messages: load('guide'), typing: guideBusy(), plan: guidePlan() }; },
  'POST /api/guide': ({ text }) => {
    if (typeof text !== 'string' || !text.trim()) throw fail('Bad message.');
    activity();
    append('guide', { from: 'samin', text: text.trim() });
    askGuide(text.trim());
    return { ok: true };
  },
  // "Done, what's next?" and "Refresh": re-plan right away.
  'POST /api/guide/plan': ({ done }) => {
    activity();
    schedule(done ? 'Samin says they finished the "Do now" task and wants the next one' : 'Samin asked for a fresh plan', { now: true });
    return guidePlan();
  },
  'POST /api/board/move': (body) => { moveTicket(body); return readBoard(); },
  'POST /api/bugs': (body) => ({ id: fileBug(body) }),
  'POST /api/bugs/verify': (body) => { verifyBug(body); return readBoard(); },
  'POST /api/builds/run': ({ branch }) => rerun(branch).then(() => ({ ok: true })),
};

const STATIC = { '/': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'] };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === 'GET' && STATIC[url.pathname]) {
      const [name, type] = STATIC[url.pathname];
      return send(res, 200, fs.readFileSync(path.join(HERE, name)), type);
    }
    if (req.method === 'GET' && url.pathname === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write(': connected\n\n');
      clients.add(res); connected();
      req.on('close', () => { clients.delete(res); disconnected(); });
      return;
    }
    // Read-only view of team files. Never serves private files (the answer key, settings, journals, teammate rules).
    if (req.method === 'GET' && url.pathname === '/api/file') {
      const abs = path.resolve(REPO, (url.searchParams.get('path') ?? '').replace(/\\/g, '/'));
      const rel = path.relative(REPO, abs).split(path.sep).join('/');
      if (!abs.startsWith(TEAM_DIR + path.sep) || abs.startsWith(SEEDED + path.sep) || PRIVATE(rel) || !abs.endsWith('.md') || !fs.existsSync(abs)) return send(res, 404, { error: 'Not found' });
      return send(res, 200, { path: path.relative(REPO, abs).split(path.sep).join('/'), abs, modified: fs.statSync(abs).mtimeMs, text: fs.readFileSync(abs, 'utf8') });
    }
    const handler = routes[`${req.method} ${url.pathname}`];
    if (!handler) return send(res, 404, { error: 'Not found' });
    const body = req.method === 'POST' ? await readBody(req) : {};
    send(res, 200, await handler(body));
  } catch (e) {
    send(res, e.status ?? 500, { error: e.message });
  }
});

// Tell open pages when a team file changes (a teammate moved a ticket, filed a bug…) so every view stays current.
const pending = new Set();
let flush;
try {
  fs.watch(TEAM_DIR, { recursive: true }, (_event, name) => {
    if (!name) return;
    const rel = 'team/' + String(name).split(path.sep).join('/');
    if (!rel.endsWith('.md') || PRIVATE(rel)) return;
    pending.add(rel);
    clearTimeout(flush);
    flush = setTimeout(() => {
      filesChanged([...pending]);
      const data = `data: ${JSON.stringify({ type: 'files', paths: [...pending] })}\n\n`;
      for (const c of clients) c.write(data);
      pending.clear();
    }, 300);
  });
} catch (e) {
  console.warn(`Live file updates are off: ${e.message}`);
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`The office is open at http://localhost:${PORT}`);
  console.log(`Teammates answer through: ${CLAUDE}${MODEL_NAME ? ` (model: ${MODEL_NAME})` : ''}`);
  startCI();
});
