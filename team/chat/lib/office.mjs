// The office: the workday (it starts when Samin shows up and ends when they stop), the team's meetings
// (held without Samin), surprises, and the team's work at the end of each day.
import { DEVS, FACILITATOR, PEOPLE, TEAMMATES, append, broadcast, clients, notify, readJSON, readSettings, readText, writeJSON, writeText } from './store.mjs';
import { MAX_HOPS, STYLE, deliver, outboxChannel, parseOutbox, runAgent, setOfficeHooks, splitChanges, statuses, transcript } from './agents.mjs';
import { readBoard, setBugStatus, setTicketStatus, logActivity } from './board.mjs';

const STATE = 'team/office.json';
const SPRINT_START = new Date('2026-11-11T09:00:00');
const IDLE_MIN = Number(process.env.TEAM_IDLE_MINUTES ?? 30); // no activity this long = Samin stopped
const CLOSED_MIN = 5; // the office closed this long = Samin stopped
const DEFAULT = { sprint: 1, day: 1, daysInSprint: 10, phase: 'before', usedEvents: [], today: { out: [] }, pending: [], meeting: null, sessions: [], lastActive: null };
let state = { ...DEFAULT, ...readJSON(STATE, {}) };
state.sessions ??= [];
const save = () => { writeJSON(STATE, state); broadcast({ type: 'office', office: view() }); };

// ---------- time ----------
function dateOfDay(day) { // workdays only
  const d = new Date(SPRINT_START);
  let n = 1;
  while (n < day) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) n++; }
  return d;
}
const fmtDate = (d) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const clock = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
export const dayLabel = () => `Day ${state.day}`;
const surprisesOn = () => !/Surprises:\s*OFF/i.test(readSettings());
const isOut = (p) => state.phase !== 'before' && state.today.out.includes(p);
const session = () => [...state.sessions].reverse().find((s) => s.day === state.day);

export function context() {
  const parts = [`Office: Sprint ${state.sprint}, Day ${state.day} of ${state.daysInSprint} (${fmtDate(dateOfDay(state.day))}).`];
  if (state.phase === 'before') parts.push('The workday has not started yet.');
  const s = session();
  if (s) parts.push(s.stop ? `Samin worked ${clock(s.start)}–${clock(s.stop)} today and has stopped for the day.` : `Samin started work at ${clock(s.start)} today.`);
  const out = state.today.out.filter(() => state.phase !== 'before');
  if (out.length) parts.push(`Out of office today: ${out.map((p) => PEOPLE[p].short).join(', ')}.`);
  if (state.meeting) parts.push(`Meeting in progress: ${state.meeting.title}.`);
  parts.push(`Team: Dana (Product Manager), Tomas (Project Manager), Priya (QA Lead, Samin's coach), Rafi, Mei and Jonas (devs), Samin (QA). Samin doesn't attend meetings.`);
  return parts.join(' ');
}

// ---------- the team's schedule ----------
// Meetings happen without Samin. "morning" ones run when the day starts, "afternoon" ones when Samin stops,
// just before everyone's end-of-day work, so Samin has the day to send their input.
const TITLES = { standup: 'Daily standup', planning: 'Sprint planning', refinement: 'Backlog refinement', triage: 'Bug triage', checkin: '1:1 check-in with Priya', demo: 'Sprint review & demo', retro: 'Retrospective' };
function agenda(day, when) {
  const a = [];
  if (when === 'morning') { if (day > 1) a.push('standup'); return a; }
  if (day === 1) a.push('planning');
  if ([1, 2, 5].includes(day)) a.push('refinement');
  if ([3, 6, 8].includes(day)) a.push('triage');
  if ([4, 9].includes(day)) a.push('checkin');
  if (day === state.daysInSprint) a.push('demo', 'retro');
  return a;
}
const draftTickets = (n) => readBoard().tickets
  .filter((t) => t.type === 'Story' && ['Backlog', 'Ready'].includes(t.status) && /\(DRAFT/.test(readText(`team/tickets/${t.id}.md`)))
  .slice(0, n);
const newBugs = () => readBoard().bugs.filter((b) => /^new$/i.test(b.status));

/** What Samin should know about today's meetings, for the morning post. */
export function morningNote() {
  const later = agenda(state.day, 'afternoon');
  const lines = [];
  if (later.includes('planning')) lines.push(`Planning (optional): one line in #Sprint 1 on any ticket that looks hard to test.`);
  if (later.includes('refinement')) {
    const t = draftTickets(2).map((x) => x.id);
    if (t.length) lines.push(`Refinement of ${t.join(', ')}: a few questions or edge cases in #Sprint 1, if you have any.`);
  }
  if (later.includes('triage')) lines.push(`Triage: file the bugs you've found.`);
  if (later.includes('demo')) lines.push(`Sprint review: one message in #Sprint 1 with go or no-go, and the risks.`);
  return lines.length ? `**Before you stop today:**\n${lines.map((l) => `- ${l}`).join('\n')}` : '';
}

export function view() {
  const s = session();
  return {
    sprint: state.sprint, day: state.day, daysInSprint: state.daysInSprint, date: fmtDate(dateOfDay(state.day)), phase: state.phase,
    out: state.phase === 'before' ? [] : state.today.out, meeting: state.meeting ? { title: state.meeting.title } : null,
    startedAt: s?.start ?? null, idleMinutes: IDLE_MIN, statuses: statuses(),
  };
}

// ---------- surprises ----------
// Each one is a realistic situation a QA engineer meets on a real team. The teammate playing it decides the details.
const EVENTS = [
  { id: 'user-report', minDay: 2, actor: 'dana', channel: 'general',
    prompt: `As Product Manager: a user wrote in our feedback channel that "I marked a bunch of tests as Fail yesterday and today some of them show Not run again". You don't know whether it's real, a misunderstanding, or a settings issue. Ask Samin to investigate it: reproduce it or rule it out, and come back with evidence. It isn't planned sprint work, so ask Samin to say what it pushes back.` },
  { id: 'sick', minDay: 2, actor: 'tomas', channel: 'general', out: 'mei',
    prompt: `Mei messaged you early this morning: they're sick and out today. Tell the team in a short message, say what it does to the timeline as you see it, and ask Samin what it does to testing on Mei's tickets this sprint.` },
  { id: 'pairing', minDay: 2, actor: 'jonas', channel: 'dm',
    prompt: `Message Samin directly: before you go further on your next ticket, you'd like to pair with them for 30 minutes on how they'd test it, because you want to get it right this time. Ask when suits them and what you should prepare.` },
  { id: 'scope-change', minDay: 3, actor: 'dana', channel: 'sprint-1',
    prompt: `As Product Manager: a stakeholder asked for a small extra story this sprint: "duplicate a checklist, so I can rerun the same tests for a new release with every result reset to Not run". Create the ticket file in team/tickets/ with the next story ID from team/board.md (owner Rafi, 2 points, acceptance criteria marked DRAFT), add it to the board as Backlog, and bump "Next story". Then announce it in this message, ask the team what should come out of the sprint to make room, and ask Samin what it does to the test plan.` },
  { id: 'quick-look', minDay: 3, actor: 'jonas', channel: 'dm',
    prompt: `Message Samin directly. You're a bit behind and stressed. Ask whether they could "just take a quick look" at your branch before it's officially Ready for QA, informally, without writing anything up, so you can move faster. Be genuine and friendly. Don't hint that this is a test of process.` },
  { id: 'skip-qa', minDay: 4, actor: 'rafi', channel: 'sprint-1',
    prompt: `Post in the Sprint 1 channel: you think your smallest ticket that isn't Done yet is so small that it doesn't need QA, and you'd like to merge it straight after code review to save time. Name the ticket. Sound pragmatic and reasonable, not hostile.` },
  { id: 'status-report', minDay: 4, actor: 'tomas', channel: 'dm',
    prompt: `Message Samin directly: leadership asked you for a short quality status of the sprint by the end of today. Ask Samin for one paragraph you can forward as is: what's tested, what's at risk, and what they'd flag. Say you'd like numbers where possible.` },
  { id: 'squeeze', minDay: 5, actor: 'tomas', channel: 'dm',
    prompt: `Message Samin directly: you've looked at the board and you're worried the sprint won't land. Testing looks like the bottleneck to you. Ask whether Samin can speed up, for example by skipping the regression checklist this sprint or testing only the happy paths. Be friendly but under real pressure. Accept a well-reasoned "no" or a counter-proposal (what to test less, and the risk of that), but push back once on a vague one.` },
  { id: 'ship-with-bug', minDay: 6, actor: 'dana', channel: 'dm',
    prompt: `Message Samin directly. Look at team/board.md for the most severe bug that's still open (if there are none, ask about "any bug you're worried about"). A stakeholder is keen to get this sprint's work out, and you'd like to ship with that bug and fix it next sprint. Ask Samin who it affects, how badly, whether there's a workaround, and whether they'd sign off on shipping with it. You're open to being convinced either way, but you need the risk in user terms.` },
  { id: 'demo-early', minDay: 5, actor: 'dana', channel: 'general',
    prompt: `As Product Manager: stakeholders want a preview of the sprint at the end of tomorrow, earlier than planned. Ask Samin which tickets can be shown with confidence, which can't, and what the known risks are. Keep it calm. This happens.` },
  { id: 'late-handoff', minDay: 7, actor: 'rafi', channel: 'dm',
    prompt: `Message Samin directly: the sprint is nearly over. Ask whether they could start testing your current ticket today even though you're still finishing a couple of things, because otherwise it won't make the sprint. Be honest about what's not finished.` },
];

// ---------- Samin's presence: the day starts when they show up and ends when they stop ----------
let ending = null, morning = Promise.resolve();
/** Samin did something in the office (typed, clicked, scrolled, came back to the tab). */
export function activity() {
  state.lastActive = new Date().toISOString();
  if (state.phase === 'before') { morning = startDay().catch((e) => notify('general', `⚠️ The day didn't start properly: ${e.message}`)); return; }
  writeJSON(STATE, state); // quiet save: no need to re-render every page for a heartbeat
}
function checkStopped() {
  if (state.phase !== 'working' || ending || !state.lastActive) return;
  const idle = (Date.now() - new Date(state.lastActive)) / 60e3;
  const closedFor = clients.size ? 0 : (Date.now() - lastConnected) / 60e3;
  if (idle >= IDLE_MIN) stopped(`no activity for ${IDLE_MIN} minutes`);
  else if (closedFor >= CLOSED_MIN) stopped('closed the office');
}
let lastConnected = Date.now();
export const connected = () => { lastConnected = Date.now(); };
export const disconnected = () => { if (!clients.size) lastConnected = Date.now(); };

function stopped(reason) {
  const s = session();
  if (s && !s.stop) { s.stop = state.lastActive; s.reason = reason; }
  save();
  ending = endDay().catch((e) => notify('general', `⚠️ The end of the day didn't finish: ${e.message}`)).finally(() => { ending = null; });
}

// ---------- the day ----------
async function startDay() {
  if (state.phase !== 'before') return;
  if (state.day > state.daysInSprint) return;
  state.phase = 'working';
  let event = null;
  if (surprisesOn() && state.day >= 2 && Math.random() < 0.3) {
    const options = EVENTS.filter((e) => e.minDay <= state.day && !state.usedEvents.includes(e.id));
    event = options[Math.floor(Math.random() * options.length)] ?? null;
  }
  state.today = { out: event?.out ? [event.out] : [] };
  if (event) state.usedEvents.push(event.id);
  state.sessions.push({ day: state.day, start: state.lastActive ?? new Date().toISOString(), stop: null, reason: null });
  save();
  const note = morningNote();
  notify('general', `☀️ **Day ${state.day} of ${state.daysInSprint}** (${fmtDate(dateOfDay(state.day))}).${note ? `\n\n${note}` : ''}`);

  // Messages that arrived while someone was out reach them now.
  const back = state.pending.filter((p) => !state.today.out.includes(p.person));
  state.pending = state.pending.filter((p) => state.today.out.includes(p.person));
  save();
  for (const p of back) deliver(p.person, p.channel, p.trigger, { extra: 'You were out of office when this arrived. You are back today.' });

  if (event) {
    const ch = event.channel === 'dm' ? `dm-${event.actor}` : event.channel;
    deliver(event.actor, ch, { from: 'office', text: '(morning)' }, {
      prompt: [context(), `Something is happening at work this morning. ${event.prompt}`, '', `Write it as a chat message from you. Don't mention that this is a scenario or a test.`, STYLE].join('\n'),
    });
  }
  for (const type of agenda(state.day, 'morning')) await holdMeeting(type);
}

const WORK = {
  priya: `Do what a QA lead and coach would get done this afternoon: look at what Samin did today (team/qa/, the bugs they filed, the tickets they tested, how they handled pushback in the chat below), and coach them according to the Coaching setting. Never do QA work yourself: don't set severity, write test cases, touch the checklist or move tickets. Note anything worth raising at the next check-in in your journal.`,
  dana: `Do what a Product Manager would get done this afternoon: answer open scope and "what should it do?" questions, set priority on bugs that were triaged, keep the backlog order sensible, look at tickets that reached Done from a user's point of view, and note anything stakeholders need to hear. Don't write code, set severity or do QA work.`,
  tomas: `Do what a Project Manager would get done this afternoon: check that the board matches what people said in chat (tell the owner if it doesn't), chase blockers and waiting-on dependencies, check whether the sprint will land and say so if it's at risk, and prepare tomorrow: who's blocked, what needs a decision, and from whom. Don't write code, set severity or priority, or do QA work.`,
};
const DEV_WORK = `Do the amount of real work you'd realistically get done in one working day, and no more: a 2–3 point ticket usually takes one or two days, and a 5 pointer takes three or four. Start or continue your tickets in your worktree, commit on your branch, run the build and tests, do code reviews you were asked for, and fix bugs assigned to you. Follow every team rule, including the Definition of Ready. If something you need isn't ready, say so instead of working around it. Work in small slices so testing can start early: aim to get your first ticket to Ready for QA by Day 2 or 3. Keep the ticket's "Test notes from dev" to 3 short lines (what changed, how to try it).`;

function workPrompt(person) {
  const recent = [
    `Direct messages with Samin:\n${transcript(`dm-${person}`, { limit: 10 })}`,
    `#Sprint 1:\n${transcript('sprint-1', { limit: 10 })}`,
    `#Bugs:\n${transcript('bugs', { limit: 6 })}`,
    `#General:\n${transcript('general', { limit: 6 })}`,
  ].join('\n\n');
  return [
    context(),
    `It's the end of Day ${state.day}. This is your work session for the rest of today.`,
    WORK[person] ?? DEV_WORK,
    `Keep the promises in your journal, and answer anything below that's waiting for you. Samin has stopped for the day and will read your messages when they're back.`,
    '',
    `Recent chat:\n${recent}`,
    '',
    `Rules for this session:`,
    `- Don't edit team/board.md in this session: other people are working at the same time. Report every status change on a line of its own instead, and the office will apply it:`,
    `  BOARD: <ticket> | <new status> | <branch, or ->`,
    `  BUG: <bug ID> | <new status>`,
    `  Ticket statuses: Backlog, Ready, In Progress, Code Review, Ready for QA, In QA, QA Passed, Reopened, Done.`,
    `- You can still edit tickets, bugs, your journal and code as usual.`,
    `- To send messages, put each one under a line of its own like "@@ dm" (a direct message to Samin), "@@ sprint-1", "@@ bugs" or "@@ general". Message Samin only when they must act (something is Ready for QA, a bug needs retesting, a direct question). Usually that's no message at all.`,
    STYLE,
    '',
    `Start your reply with one or two sentences summarizing your day, for the team's day log. Then the BOARD/BUG lines, then your messages. End with the usual --- and **Changes:** list.`,
  ].join('\n');
}

async function endDay() {
  if (state.phase !== 'working') return;
  state.phase = 'ending'; save();
  await morning; // let the morning's meetings finish first
  const s = session();
  notify('general', `🌙 **Stopped for today**${s?.stop ? ` (${clock(s.start)}–${clock(s.stop)})` : ''}. See you tomorrow.`);

  for (const type of agenda(state.day, 'afternoon')) await holdMeeting(type);

  const people = TEAMMATES.filter((p) => !isOut(p));
  const results = await Promise.all(people.map(async (p) => {
    try { return { person: p, ...splitChanges(await runAgent(p, workPrompt(p), { timeoutMs: 25 * 60e3 })) }; }
    catch (e) { return { person: p, error: e.message }; }
  }));

  const log = [`## Day ${state.day} (${fmtDate(dateOfDay(state.day))})`, ''];
  if (s) log.push(`- **Samin:** worked ${clock(s.start)}–${s.stop ? clock(s.stop) : '?'}${s.reason ? ` (stopped: ${s.reason})` : ''}.`);
  for (const r of results) {
    if (r.error) { log.push(`- **${PEOPLE[r.person].short}:** _(couldn't finish: ${r.error})_`); continue; }
    const out = parseOutbox(r.text);
    for (const b of out.board) {
      try {
        const { old, status } = setTicketStatus(b.id, b.status, { branch: b.branch });
        if (old !== status) { logActivity(b.id, `${PEOPLE[r.person].short} moved it from ${old} to ${status}.`, dayLabel()); notify('sprint-1', `📋 **${PEOPLE[r.person].short}** moved **${b.id}** from ${old} to **${status}**.`); }
      } catch (e) { notify('sprint-1', `⚠️ Couldn't apply ${PEOPLE[r.person].short}'s board change for ${b.id}: ${e.message}`); }
    }
    for (const g of out.bugs) {
      try {
        const { old, status } = setBugStatus(g.id, g.status);
        if (old !== status) { logActivity(g.id, `${PEOPLE[r.person].short} set the status to ${status}.`, dayLabel()); notify('bugs', `🐞 **${PEOPLE[r.person].short}** set **${g.id}** to **${status}**.`); }
      } catch (e) { notify('bugs', `⚠️ Couldn't apply ${PEOPLE[r.person].short}'s change for ${g.id}: ${e.message}`); }
    }
    for (const m of out.messages) append(outboxChannel(r.person, m.channel), { from: r.person, text: m.text });
    log.push(`- **${PEOPLE[r.person].short}:** ${out.summary.split('\n')[0] || '_(no summary)_'}`);
  }
  for (const p of TEAMMATES.filter(isOut)) log.push(`- **${PEOPLE[p].short}:** out of office.`);
  const daylog = readText('team/daylog.md') || '# Day log\n\nWhat each person got done, day by day. Newest first.\n';
  writeText('team/daylog.md', daylog.replace(/(Newest first\.\n)/, `$1\n${log.join('\n')}\n`));
  notify('general', `📒 **Day ${state.day} recap**\n\n${log.slice(2).join('\n')}`);

  if (state.day >= state.daysInSprint) { state.phase = 'done'; notify('general', `🏁 **Sprint ${state.sprint} is over.**`); }
  else { state.day += 1; state.phase = 'before'; }
  state.today = { out: [] };
  save();
}

// ---------- meetings (held without Samin) ----------
const SAMIN_INPUT = `Samin (QA) doesn't attend meetings. Priya represents QA by passing on what Samin has written: their files in team/qa/, the bugs they filed in team/bugs/, QA notes on tickets, and Samin's messages below. Priya passes it on faithfully and never adds QA input of their own (no edge cases, severities, estimates or recommendations Samin didn't give). If Samin hasn't given input on something, Priya says so, and the team asks Samin after the meeting.`;
export function saminSaid() {
  const msgs = ['sprint-1', 'bugs', 'general', 'dm-priya', 'dm-tomas', 'dm-dana']
    .flatMap((ch) => transcript(ch, { limit: 40 }).split('\n').filter((l) => /\] Samin: /.test(l)).map((l) => `#${ch} ${l}`));
  return msgs.sort((a, b) => a.slice(a.indexOf('[')).localeCompare(b.slice(b.indexOf('[')))).slice(-20).join('\n') || '(Samin hasn\'t written anything yet)';
}

// Each meeting: `rounds` speak in order (people within a round speak in parallel), in the hidden meeting room.
// `wrap` steps then post the outcome where Samin will see it: [person, channel, instruction].
const PLAN = {
  standup: () => ({
    rounds: [['tomas'], [...DEVS, 'dana']],
    open: (p) => (p === 'tomas'
      ? `Open the standup in one line, then give your own update in 3 short lines (Yesterday / Today / Blockers), including any risk to the sprint timeline you can see.`
      : `Give your standup update in 3 short lines (Yesterday / Today / Blockers), based on the board and your journal. Name anyone you're blocked on. Don't start new work during the meeting.`),
    wrap: [['tomas', 'sprint-1', `The standup is over. Add it (everyone's update and the follow-ups) to the top of team/standups.md under a heading for today. Then post one line here: blockers and risks, or "no blockers". Don't ask Samin for an update: they post one only if they're blocked.`]],
  }),
  planning: () => ({
    rounds: [['tomas'], ['dana'], [...DEVS], ['priya']],
    open: (p) => ({
      tomas: `Open sprint planning as facilitator: give the agenda and the team's capacity this sprint (three devs, one QA, anyone out), and name any dependencies between tickets you can see. Hand over to Dana.`,
      dana: `As Product Manager: give the sprint goal, propose an order for the tickets and say why, and ask the devs for their estimates and risks.`,
      priya: `Pass on QA's input for planning: anything Samin flagged as hard to test, exactly as they wrote it. If Samin hasn't sent any, say so.`,
    })[p] ?? `Read your own tickets. Say whether you agree with the estimate, and name one risk or dependency.`,
    wrap: [
      ['dana', 'meetings', `Planning is over. As Product Manager, commit the sprint scope, taking the devs' and QA's input into account. Say the commitment and any cuts, with a one-line reason for each cut.`],
      ['tomas', 'sprint-1', `Record the scope Dana just committed and any cuts in team/decisions.md, and set the sprint's Status line in team/board.md to "In progress". Then post planning notes here: what's in, what's cut, and the biggest risk. Don't chase Samin for planning input: it's optional.`],
    ],
  }),
  refinement: (m) => {
    const owner = readBoard().tickets.find((t) => t.id === m.ticket)?.ownerKey ?? 'rafi';
    return {
      rounds: [['dana'], [owner], ['priya']],
      open: (p) => (p === owner
        ? `We're refining ${m.ticket}. Read the ticket and the relevant code. Say briefly how you'd build it, and list your questions.`
        : p === 'priya'
          ? `Pass on Samin's questions and edge cases for ${m.ticket}, exactly as they wrote them. If they haven't sent any for this ticket, say so. Don't add your own.`
          : `As Product Manager, explain the user need behind ${m.ticket} and anything about its scope the team should know. Don't write acceptance criteria yet.`),
      wrap: [['dana', 'sprint-1', `Refinement of ${m.ticket} is over. Write the final acceptance criteria into the ticket in Given / When / Then form, covering what was agreed, including every question and edge case Samin raised. Remove "DRAFT", list anything deliberately out of scope, and set ${m.ticket} to Ready in team/board.md. Then post here, in two lines, that ${m.ticket} is Ready, and ask @Samin to read the criteria in the ticket and reply with anything missing. Don't repeat the criteria in chat.`]],
    };
  },
  triage: () => {
    const bugs = newBugs();
    const owners = [...new Set(bugs.map((b) => readBoard().tickets.find((t) => t.id === b.ticket)?.ownerKey).filter((p) => DEVS.includes(p)))];
    const devs = bugs.some((b) => !b.ticket) ? [...DEVS] : owners;
    return {
      rounds: [['tomas'], ['priya'], devs, ['dana']],
      open: (p) => ({
        tomas: `Open bug triage: list the new bugs (ID, title, ticket) and, using the ownership table in team/TEAM.md, say who owns each one. Hand over to Priya to present them.`,
        priya: `Present each new bug exactly as Samin filed it: what's wrong, Samin's severity and Samin's one-line reason. Don't change the severity or argue for a different one.`,
        dana: `As Product Manager, set a priority for each new bug, with a one-line reason, given Samin's severity and what the devs said.`,
      })[p] ?? `Read the new bugs in code you own and respond in character, following your pushback setting: accept, argue the severity with evidence, "can't reproduce", or "works as designed". Try to reproduce them if that helps. Don't fix anything during the meeting. If none of the bugs are in your code, say so in a few words.`,
      wrap: [['tomas', 'bugs', `Triage is over. Update each bug file and the Bugs table in team/board.md as agreed: the severity stays exactly as Samin set it, the priority is Dana's, the owner is from the ownership table, and the status is Triaged. Record any dispute in team/decisions.md. Then post the outcome here, one line per bug: ID, priority, owner. If a dev disputed one, add one line saying who disputed what, and ask @Samin to respond.`]],
    };
  },
  checkin: () => ({
    rounds: [],
    wrap: [['priya', 'dm-priya', `This is your check-in with Samin, by direct message. First look at what Samin has done so far (team/qa/, the bugs they filed, the tickets they tested, how they handled pushback from devs, Dana and Tomas in the chat history files under team/chat/history/, except guide.jsonl, which is private to Samin). Give specific feedback (one strength and one growth area, with examples), and ask one question about what they want to learn. Keep it to a short chat message. Note it in your journal.`]],
  }),
  demo: () => ({
    rounds: [['tomas'], [...DEVS], ['priya']],
    open: (p) => ({
      tomas: `Open the sprint review: in one short paragraph, what was committed, what's Done, and what slipped. Hand over to the devs.`,
      priya: `Pass on Samin's go/no-go recommendation and the risks they named, exactly as they wrote them. If Samin hasn't sent one, say so.`,
    })[p] ?? `Sprint review. Give a 3–5 line demo of your tickets that are Done or nearly done: what a user can do now and how to try it. Be honest about anything that isn't finished.`,
    wrap: [['dana', 'general', `The review is over. Post the outcome. If Samin gave a QA recommendation, make the ship decision as Product Manager. If you ship against it, name the risk you're accepting. If Samin hasn't given one, don't decide: ask @Samin for their go/no-go in one message, and say the ship call waits for it. Record what you decided (or that it's pending) in team/decisions.md.`]],
  }),
  retro: () => ({
    rounds: [['tomas'], TEAMMATES.filter((p) => p !== 'tomas')],
    open: (p) => (p === 'tomas'
      ? `Open the retrospective as facilitator in one line, then give your own: 2 things that went well, 2 that didn't, and 1 suggestion.`
      : `Retrospective. Give 2 things that went well, 2 that didn't, and 1 suggestion, based on your journal and the sprint's tickets, bugs and decisions. Be honest, including about working with QA.${p === 'priya' ? ' Don\'t reveal the seeded defects in the meeting.' : ''}`),
    wrap: [
      ['priya', 'dm-priya', `Now tell Samin, by direct message, which seeded defects their testing caught: read team/.seeded/, match each one to a filed bug if there is one, and give a table: Defect | Caught? | Bug | Technique that finds it. Then give a short, kind and specific coaching summary.`],
      ['tomas', 'sprint-1', `Post the retro outcome here: the main themes, and 2–3 action items for the next sprint with an owner for each, also written in team/decisions.md. Ask @Samin to add their own went-well, didn't-go-well and suggestion in this channel.`],
    ],
  }),
};

const header = (m) => [
  `You're in the "${m.title}" meeting.${m.ticket ? ` It's about ${m.ticket}.` : ''}`, SAMIN_INPUT, '',
  `What Samin has written recently:\n${saminSaid()}`, '',
  `Meeting transcript so far:\n${transcript('meetings', { since: m.startedAt, limit: 40 })}`, '',
].join('\n');
function speak(person, m, instruction, ch = 'meetings') {
  const where = ch === 'meetings' ? `Reply as yourself, in the meeting, in a few short sentences, like speaking in a real meeting. Don't @mention people.`
    : `Write it as a chat message from you. Samin will read it when they're back. @mention Samin only if you need something from them.\n${STYLE}\nThis is a meeting outcome, so you may use up to 4 short lines (for example one line per bug) instead of 2 sentences. Keep only what Samin needs: the decision, and anything they must do.`;
  return deliver(person, ch, { from: 'office', text: `(${m.title})` }, { hop: MAX_HOPS, prompt: [context(), header(m), instruction, '', where].join('\n') });
}

async function holdMeeting(type) {
  if (type === 'triage' && !newBugs().length) return;
  if (type === 'refinement') { for (const t of draftTickets(2)) await runMeeting(type, t.id); return; }
  await runMeeting(type);
}
async function runMeeting(type, ticket) {
  const m = { type, title: TITLES[type] + (ticket ? `: ${ticket}` : ''), ticket, startedAt: new Date().toISOString() };
  state.meeting = m; save();
  try {
    notify('meetings', `📅 **${m.title}** has started.`);
    const plan = PLAN[type](m);
    for (const who of plan.rounds) {
      const present = who.filter((p) => !isOut(p));
      await Promise.all(present.map((p) => speak(p, m, plan.open(p))));
    }
    for (const [person, ch, instruction] of plan.wrap) {
      // If the person who'd wrap up is out, the facilitator does it (Priya's are hers alone).
      const by = !isOut(person) ? person : person !== 'priya' && !isOut(FACILITATOR) ? FACILITATOR : null;
      if (by) await speak(by, m, instruction, ch);
    }
  } finally {
    state.meeting = null; save();
  }
}

// ---------- wiring ----------
setOfficeHooks({
  isOut,
  inMeeting: (p) => Boolean(state.meeting),
  context,
  queueForTomorrow: (person, ch, trigger) => { state.pending.push({ person, channel: ch, trigger }); save(); },
});
// A restart leaves a usable state. If Samin stopped while the office was closed, the team finishes that day.
state.meeting = null;
if (state.phase === 'ending') state.phase = 'working';
save();
// A restart doesn't end the day by itself: the page gets CLOSED_MIN to reconnect, and the normal idle rule applies.
if (state.phase === 'working' && state.lastActive && (Date.now() - new Date(state.lastActive)) / 60e3 >= IDLE_MIN) stopped(`no activity for ${IDLE_MIN} minutes`);
setInterval(checkStopped, 60e3).unref();
export const officeView = view;
