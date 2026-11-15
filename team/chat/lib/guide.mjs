// The Guide: Samin's private QA mentor, always docked beside the office. It keeps a prioritized plan for Samin
// (what to do now, and how), refreshes it when something changes, and answers questions in the side panel.
import fs from 'node:fs';
import path from 'node:path';
import { CHANNELS, HISTORY, PEOPLE, REPO, TEAMMATES, append, broadcast, load, onMessage } from './store.mjs';
import { runAgent, splitChanges, transcript } from './agents.mjs';
import { readBoard } from './board.mjs';
import { listBuilds } from './ci.mjs';
import { context, morningNote, officeView, saminSaid } from './office.mjs';

const PLAN_FILE = path.join(HISTORY, 'guide-plan.json');
const SETTLE_MS = 60e3;      // wait for things to settle after a change before re-planning
const MIN_GAP_MS = 5 * 60e3; // automatic refreshes at most this often (each one is a Claude run)
const clock = (d = new Date()) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const cut = (s, n = 400) => (s.length > n ? `${s.slice(0, n)}…` : s);

let plan = (() => { try { return JSON.parse(fs.readFileSync(PLAN_FILE, 'utf8')); } catch { return { text: '', at: null }; } })();
let planBusy = false, chatBusy = 0, rerun = null, timer = null, lastRun = 0;
const publish = () => broadcast({ type: 'guide-plan', plan: guidePlan() });
export const guidePlan = () => ({ ...plan, busy: planBusy });
export const guideBusy = () => chatBusy > 0;

// ---------- everything the Guide should know, gathered fresh for every run ----------
function waitingOnSamin() {
  const out = [];
  for (const c of CHANNELS.filter((x) => !x.hidden)) {
    const msgs = load(c.id);
    const lastMine = msgs.map((m) => m.from).lastIndexOf('samin');
    const after = msgs.slice(lastMine + 1).filter((m) => TEAMMATES.includes(m.from) && (c.kind === 'dm' || /samin|@team|\bQA\b/i.test(m.text)));
    for (const m of after.slice(-3)) out.push(`- #${c.id} ${PEOPLE[m.from].short} (${clock(m.ts)}): ${cut(m.text.replace(/\s+/g, ' '))}`);
  }
  return out.join('\n') || '(nothing: no teammate is waiting on Samin)';
}
function qaFiles() {
  const dir = path.join(REPO, 'team', 'qa');
  if (!fs.existsSync(dir)) return '(team/qa/ is empty)';
  const out = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const abs = path.join(d, e.name);
    if (e.isDirectory()) walk(abs);
    else { const st = fs.statSync(abs); out.push(`- ${path.relative(REPO, abs).split(path.sep).join('/')} (${st.size} bytes, last edited ${st.mtime.toISOString().slice(0, 16).replace('T', ' ')})`); }
  } };
  walk(dir);
  return out.join('\n') || '(team/qa/ is empty)';
}
function boardSummary() {
  const b = readBoard();
  const t = b.tickets.map((x) => `- ${x.id} ${x.title} | ${x.type} | owner ${x.owner} | ${x.points} pts | **${x.status}**${x.branch && x.branch !== '—' ? ` | branch ${x.branch}` : ''}`);
  const g = b.bugs.map((x) => `- ${x.id} ${x.title} | ${x.severity} | priority ${x.priority} | against ${x.ticket || '—'} | owner ${x.owner} | **${x.status}**`);
  return `Sprint goal: ${b.goal || '(not set yet)'}\nTickets:\n${t.join('\n') || '(none)'}\nBugs:\n${g.join('\n') || '(none filed yet)'}`;
}
function buildsSummary() {
  return listBuilds().map((x) => `- ${x.branch}: ${x.status}${x.tests ? ` (${x.tests.passed} passed, ${x.tests.failed} failed)` : ''}${x.sha ? ` at ${x.sha.slice(0, 7)}` : ''}${x.worktree ? ` | worktree ${path.relative(REPO, x.worktree).split(path.sep).join('/') || '.'}` : ''}`).join('\n') || '(no builds yet)';
}
export function briefing() {
  return [
    `It's ${clock()} now. ${context()}`,
    `Today's team schedule and what the team needs from Samin before they stop:\n${morningNote() || '(nothing specific today)'}`,
    `The board right now:\n${boardSummary()}`,
    `CI builds:\n${buildsSummary()}`,
    `Teammates waiting on Samin (messages since Samin last wrote in that channel):\n${waitingOnSamin()}`,
    `Samin's QA work so far, in team/qa/:\n${qaFiles()}`,
    `What Samin has posted in the team chat recently:\n${saminSaid()}`,
  ].join('\n\n');
}

// ---------- the plan ----------
const PLAN_FORMAT = `Write Samin's plan in exactly this shape (markdown, under 150 words). Make "Do now" hands-on testing whenever there's no urgent ask:

### Do now: <the single most important task>
<one line: why it's first>
1. <concrete step, with the exact command, page or channel>
2. …(2–4 steps)
**Done when:** <how Samin knows it's finished>

### Then
1. **<task>**: <one line on how>
2. …(1–3 tasks, in order)

### Waiting on others
- <only if something is blocked on a teammate; otherwise leave this section out>`;

async function runPlan(reason) {
  planBusy = true; lastRun = Date.now(); publish();
  try {
    const prompt = [
      briefing(),
      `Your previous plan for Samin${plan.at ? ` (written at ${clock(plan.at)})` : ''}:\n${plan.text || '(none yet)'}`,
      `Your recent conversation with Samin:\n${transcript('guide', { limit: 8 })}`,
      '',
      `Why you're re-planning now: ${reason}.`,
      `Prioritize Samin's work for the rest of today and tell them how to do the top task. Look at the files you need first (tickets, bugs, team/qa/). If the previous plan's top task looks done, move on; if it's still open, keep it unless something more urgent came up.`,
      PLAN_FORMAT,
      `Reply with the plan only.`,
    ].join('\n\n');
    const { text } = splitChanges(await runAgent('guide', prompt, { timeoutMs: 6 * 60e3 }));
    if (text?.trim()) plan = { text: text.trim(), at: new Date().toISOString(), day: officeView().day, reason };
    fs.writeFileSync(PLAN_FILE, JSON.stringify(plan, null, 2));
  } catch (e) {
    plan = { ...plan, error: `Couldn't update the plan: ${e.message}` };
  } finally {
    planBusy = false; publish();
    if (rerun) { const r = rerun; rerun = null; schedule(r, { now: true }); }
  }
}

/** Re-plan soon. Automatic refreshes wait for things to settle and run at most every few minutes. */
export function schedule(reason, { now = false } = {}) {
  if (planBusy) { rerun = reason; return; }
  clearTimeout(timer);
  const wait = now ? 0 : Math.max(SETTLE_MS, MIN_GAP_MS - (Date.now() - lastRun));
  timer = setTimeout(() => runPlan(reason), wait);
}

// Keep the plan current while Samin is working: a new message, a build result or a board change re-plans.
onMessage((m) => {
  if (m.channel === 'guide' || CHANNELS.find((c) => c.id === m.channel)?.hidden) return;
  if (officeView().phase !== 'working') return;
  if (/^☀️/.test(m.text ?? '')) schedule('a new workday just started', { now: true });
  else schedule(`new message in #${m.channel} from ${PEOPLE[m.from]?.short ?? m.from}`);
});
/** The plan is missing or from an earlier day: write one now. */
export function ensurePlan() {
  const o = officeView();
  if (o.phase === 'working' && !planBusy && (!plan.text || plan.day !== o.day)) schedule(plan.text ? 'a new workday' : 'Samin opened the office and has no plan yet', { now: true });
}
export function filesChanged(paths) {
  if (officeView().phase !== 'working') return;
  const relevant = paths.filter((p) => /^team\/(board\.md|tickets\/|bugs\/|qa\/)/.test(p));
  if (relevant.length) schedule(`files changed: ${relevant.slice(0, 4).join(', ')}`);
}

// ---------- chatting with the Guide ----------
export async function askGuide(text) {
  const prompt = [
    briefing(),
    `The plan you've given Samin${plan.at ? ` (at ${clock(plan.at)})` : ''}:\n${plan.text || '(none yet)'}`,
    `Your conversation with Samin so far:\n${transcript('guide', { limit: 14 })}`,
    '',
    `Samin's newest message to you:\n"${text}"`,
    '',
    `Answer as the Guide. Read the files you need first. Short and practical, next step first. If Samin says they finished something or their priorities changed, say what's next (the plan above will refresh by itself).`,
  ].join('\n\n');
  chatBusy++; broadcast({ type: 'guide-typing', on: true });
  try {
    const { text: reply } = splitChanges(await runAgent('guide', prompt, { timeoutMs: 6 * 60e3 }));
    append('guide', { from: 'guide', text: reply || '_(no answer)_' });
  } catch (e) {
    append('guide', { from: 'office', text: `The Guide couldn't answer: ${e.message}` });
  } finally { chatBusy--; broadcast({ type: 'guide-typing', on: chatBusy > 0 }); }
}
