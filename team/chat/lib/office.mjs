// The office: a workday clock, the meeting calendar, surprises, and what happens at the end of each day.
import { DEVS, FACILITATOR, PEOPLE, TEAMMATES, append, broadcast, load, notify, readJSON, readText, writeJSON, writeText } from './store.mjs';
import { deliver, mentionsIn, outboxChannel, parseOutbox, runAgent, setOfficeHooks, splitChanges, statuses, transcript } from './agents.mjs';
import { readBoard, setBugStatus, setTicketStatus, logActivity } from './board.mjs';

const STATE = 'team/office.json';
const SPRINT_START = new Date('2026-11-11T09:00:00');
const DEFAULT = { sprint: 1, day: 1, daysInSprint: 10, phase: 'before', usedEvents: [], today: { event: null, out: [], done: [] }, pending: [], meeting: null };
let state = { ...DEFAULT, ...readJSON(STATE, {}) };
const save = () => { writeJSON(STATE, state); broadcast({ type: 'office', office: view() }); };

// ---------- time ----------
function dateOfDay(day) { // workdays only
  const d = new Date(SPRINT_START);
  let n = 1;
  while (n < day) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) n++; }
  return d;
}
const fmtDate = (d) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
export const dayLabel = () => `Day ${state.day}`;
const surprisesOn = () => !/Surprises:\s*OFF/i.test(readText('team/TEAM.md'));
const isOut = (p) => state.phase !== 'before' && state.today.out.includes(p);

export function context() {
  const parts = [`Office: Sprint ${state.sprint}, Day ${state.day} of ${state.daysInSprint} (${fmtDate(dateOfDay(state.day))}).`];
  if (state.phase === 'before') parts.push('The workday has not started yet.');
  const out = state.today.out.filter(() => state.phase !== 'before');
  if (out.length) parts.push(`Out of office today: ${out.map((p) => PEOPLE[p].short).join(', ')}.`);
  if (state.meeting) parts.push(`Meeting in progress: ${state.meeting.title}.`);
  parts.push('Team: Dana (Product Manager), Tomas (Project Manager), Priya (QA Lead, Samin\'s coach), Rafi, Mei and Jonas (devs), Samin (QA).');
  return parts.join(' ');
}

// ---------- calendar ----------
const MEETING_TITLES = { standup: 'Daily standup', planning: 'Sprint planning', refinement: 'Backlog refinement', triage: 'Bug triage', oneonone: '1:1 with Priya', demo: 'Sprint review & demo', retro: 'Retrospective' };
function scheduleFor(day) {
  const s = [];
  if (day === 1) s.push({ type: 'planning', time: '10:00' });
  else s.push({ type: 'standup', time: '09:30' });
  if (day === 1 || day === 2 || day === 5) s.push({ type: 'refinement', time: day === 1 ? '14:00' : '11:00', note: 'Pick a ticket whose acceptance criteria are still DRAFT' });
  if ([3, 6, 8].includes(day)) s.push({ type: 'triage', time: '14:00' });
  if (day === 4 || day === 9) s.push({ type: 'oneonone', time: '16:00' });
  if (day === 10) s.push({ type: 'demo', time: '14:00' }, { type: 'retro', time: '15:30' });
  return s.map((m) => ({ ...m, title: MEETING_TITLES[m.type] }));
}

export function view() {
  const today = scheduleFor(state.day).map((m) => ({ ...m, done: state.today.done.includes(m.type) }));
  const upcoming = [];
  for (let d = state.day + 1; d <= state.daysInSprint; d++) upcoming.push({ day: d, date: fmtDate(dateOfDay(d)), meetings: scheduleFor(d) });
  return {
    sprint: state.sprint, day: state.day, daysInSprint: state.daysInSprint, date: fmtDate(dateOfDay(state.day)), phase: state.phase,
    out: state.phase === 'before' ? [] : state.today.out, event: state.today.event, meeting: state.meeting, today, upcoming,
    surprises: surprisesOn(), statuses: statuses(), titles: MEETING_TITLES,
  };
}

// ---------- surprises ----------
// Each one is a realistic situation a QA engineer meets on a real team. The teammate playing it decides the details.
const EVENTS = [
  { id: 'user-report', minDay: 2, actor: 'dana', channel: 'general', title: 'A user reported a problem',
    prompt: `As Product Manager: a user wrote in our feedback channel that "the behavior counts above my functions disappeared after I changed a setting". You don't know whether it's real, a misunderstanding, or a settings issue. Ask Samin to investigate it: reproduce it or rule it out, and come back with evidence. It isn't planned sprint work, so ask Samin to say what it pushes back.` },
  { id: 'sick', minDay: 2, actor: 'tomas', channel: 'general', out: 'mei', title: 'Mei is out sick',
    prompt: `Mei messaged you early this morning: they're sick and out today. Tell the team in a short message, say what it does to the timeline as you see it, and ask Samin what it does to testing on Mei's tickets this sprint.` },
  { id: 'pairing', minDay: 2, actor: 'jonas', channel: 'dm', title: 'Jonas wants to pair',
    prompt: `Message Samin directly: before you go further on your next ticket, you'd like to pair with them for 30 minutes on how they'd test it, because you want to get it right this time. Ask when suits them and what you should prepare.` },
  { id: 'scope-change', minDay: 3, actor: 'dana', channel: 'sprint-1', title: 'Scope change mid-sprint',
    prompt: `As Product Manager: a stakeholder asked for a small extra story this sprint: "intent-tests check reports a clear, specific error when the plan file is missing". Create the ticket file in team/tickets/ with the next story ID from team/board.md (owner Rafi, 2 points, acceptance criteria marked DRAFT), add it to the board as Backlog, and bump "Next story". Then announce it in this message, ask the team what should come out of the sprint to make room, and ask Samin what it does to the test plan.` },
  { id: 'quick-look', minDay: 3, actor: 'jonas', channel: 'dm', title: 'An informal request',
    prompt: `Message Samin directly. You're a bit behind and stressed. Ask whether they could "just take a quick look" at your branch before it's officially Ready for QA, informally, without writing anything up, so you can move faster. Be genuine and friendly. Don't hint that this is a test of process.` },
  { id: 'skip-qa', minDay: 4, actor: 'rafi', channel: 'sprint-1', title: 'A dev wants to skip QA',
    prompt: `Post in the Sprint 1 channel: you think IT-102 is so small that it doesn't need QA, and you'd like to merge it straight after code review to save time. Sound pragmatic and reasonable, not hostile. If IT-102 is already Done, make the same argument about the smallest ticket you own that isn't Done.` },
  { id: 'status-report', minDay: 4, actor: 'tomas', channel: 'dm', title: 'Leadership wants a status',
    prompt: `Message Samin directly: leadership asked you for a short quality status of the sprint by the end of today. Ask Samin for one paragraph you can forward as is: what's tested, what's at risk, and what they'd flag. Say you'd like numbers where possible.` },
  { id: 'squeeze', minDay: 5, actor: 'tomas', channel: 'dm', title: 'Can testing go faster?',
    prompt: `Message Samin directly: you've looked at the board and you're worried the sprint won't land. Testing looks like the bottleneck to you. Ask whether Samin can speed up, for example by skipping the regression checklist this sprint or testing only the happy paths. Be friendly but under real pressure. Accept a well-reasoned "no" or a counter-proposal (what to test less, and the risk of that), but push back once on a vague one.` },
  { id: 'ship-with-bug', minDay: 6, actor: 'dana', channel: 'dm', title: 'Can we ship with that bug?',
    prompt: `Message Samin directly. Look at team/board.md for the most severe bug that's still open (if there are none, ask about "any bug you're worried about"). A stakeholder is keen to get this sprint's work out, and you'd like to ship with that bug and fix it next sprint. Ask Samin who it affects, how badly, whether there's a workaround, and whether they'd sign off on shipping with it. You're open to being convinced either way, but you need the risk in user terms.` },
  { id: 'demo-early', minDay: 5, actor: 'dana', channel: 'general', title: 'The demo moved earlier',
    prompt: `As Product Manager: stakeholders want a preview of the sprint at the end of tomorrow, earlier than planned. Ask Samin which tickets can be shown with confidence, which can't, and what the known risks are. Keep it calm. This happens.` },
  { id: 'late-handoff', minDay: 7, actor: 'rafi', channel: 'dm', title: 'A late hand-off',
    prompt: `Message Samin directly: the sprint is nearly over. Ask whether they could start testing your current ticket today even though you're still finishing a couple of things, because otherwise it won't make the sprint. Be honest about what's not finished.` },
];

// ---------- the day ----------
export async function startDay() {
  if (state.phase !== 'before') throw new Error('The day has already started.');
  if (state.day > state.daysInSprint) throw new Error('The sprint is over.');
  state.phase = 'working';
  let event = null;
  if (surprisesOn() && state.day >= 2 && Math.random() < 0.45) {
    const options = EVENTS.filter((e) => e.minDay <= state.day && !state.usedEvents.includes(e.id));
    event = options[Math.floor(Math.random() * options.length)] ?? null;
  }
  state.today = { event: event ? { id: event.id, title: event.title } : null, out: event?.out ? [event.out] : [], done: [] };
  if (event) state.usedEvents.push(event.id);
  const meetings = scheduleFor(state.day).map((m) => `${m.time} ${m.title}`).join(' · ');
  save();
  notify('general', `☀️ **Day ${state.day} of Sprint ${state.sprint}** has started (${fmtDate(dateOfDay(state.day))}).\n\nToday: ${meetings}. The meetings are on the **Calendar**.${state.today.out.length ? `\n\n🤒 Out of office today: ${state.today.out.map((p) => PEOPLE[p].short).join(', ')}.` : ''}`);

  // Messages that arrived while someone was out reach them now.
  const back = state.pending.filter((p) => !state.today.out.includes(p.person));
  state.pending = state.pending.filter((p) => state.today.out.includes(p.person));
  save();
  for (const p of back) deliver(p.person, p.channel, p.trigger, { extra: 'You were out of office when this arrived. You are back today.' });

  if (event) {
    const ch = event.channel === 'dm' ? `dm-${event.actor}` : event.channel;
    const trigger = { from: 'office', text: `(${event.title})` };
    deliver(event.actor, ch, trigger, {
      prompt: [context(), `Something is happening at work this morning. ${event.prompt}`, '', `Write it as a chat message from you (markdown is fine). Don't mention that this is a scenario or a test.`].join('\n'),
    });
  }
  return view();
}

const WORK = {
  priya: `Do what a QA lead and coach would get done this afternoon: look at what Samin did today (team/qa/, the bugs they filed, the tickets they tested, how they handled pushback in the chat below), and coach them according to the Coaching setting. Never do QA work yourself: don't set severity, triage bugs, touch the checklist or move tickets. Note anything worth raising at your next 1:1 in your journal.`,
  dana: `Do what a Product Manager would get done this afternoon: answer open scope and "what should it do?" questions, set priority on bugs that were triaged, keep the backlog order sensible, look at tickets that reached Done from a user's point of view, and note anything stakeholders need to hear. Don't write code, set severity or do QA work.`,
  tomas: `Do what a Project Manager would get done this afternoon: check that the board matches what people said in chat (tell the owner if it doesn't), chase blockers and waiting-on dependencies, check whether the sprint will land and say so if it's at risk, and prepare tomorrow: who's blocked, what needs a decision, and from whom. Don't write code, set severity or priority, or do QA work.`,
};
const DEV_WORK = `Do the amount of real work you'd realistically get done in one working day, and no more: a 2–3 point ticket usually takes one or two days, and a 5 pointer takes three or four. Start or continue your tickets in your worktree, commit on your branch, run the build and tests, do code reviews you were asked for, and fix bugs assigned to you. Follow every team rule, including the Definition of Ready. If something you need isn't ready, say so instead of working around it.`;

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
    `Keep the promises in your journal, and answer anything below that's waiting for you.`,
    '',
    `Recent chat:\n${recent}`,
    '',
    `Rules for this session:`,
    `- Don't edit team/board.md in this session: other people are working at the same time. Report every status change on a line of its own instead, and the office will apply it:`,
    `  BOARD: <ticket> | <new status> | <branch, or ->`,
    `  BUG: <bug ID> | <new status>`,
    `  Ticket statuses: Backlog, Ready, In Progress, Code Review, Ready for QA, In QA, QA Passed, Reopened, Done.`,
    `- You can still edit tickets, bugs, your journal and code as usual.`,
    `- To send messages, put each one under a line of its own like "@@ dm" (a direct message to Samin), "@@ sprint-1", "@@ bugs" or "@@ general". Send only what a real colleague would. Often that's one message or none.`,
    '',
    `Start your reply with one or two sentences summarizing your day, for the team's day log. Then the BOARD/BUG lines, then your messages. End with the usual --- and **Changes:** list.`,
  ].join('\n');
}

/** Throws if the day can't end now. Called before anything starts, so the request fails right away. */
export function checkEndDay() {
  if (state.phase !== 'working') throw new Error(state.phase === 'ending' ? 'The day is already ending.' : state.phase === 'done' ? 'The sprint is over.' : 'Start the day first.');
  if (state.meeting) throw new Error(`End the ${state.meeting.title} first.`);
}

export async function endDay() {
  checkEndDay();
  state.phase = 'ending'; save();
  notify('general', `🌙 **End of Day ${state.day}.** Everyone's finishing their work for the day. Updates will appear as they come in.`);

  const people = TEAMMATES.filter((p) => !isOut(p));
  const results = await Promise.all(people.map(async (p) => {
    try { return { person: p, ...splitChanges(await runAgent(p, workPrompt(p), { timeoutMs: 25 * 60e3 })) }; }
    catch (e) { return { person: p, error: e.message }; }
  }));

  const log = [`## Day ${state.day} (${fmtDate(dateOfDay(state.day))})`, ''];
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
    for (const m of out.messages) append(outboxChannel(r.person, m.channel), { from: r.person, text: m.text, changes: r.changes });
    log.push(`- **${PEOPLE[r.person].short}:** ${out.summary.split('\n')[0] || '_(no summary)_'}`);
  }
  for (const p of TEAMMATES.filter(isOut)) log.push(`- **${PEOPLE[p].short}:** out of office.`);
  const daylog = readText('team/daylog.md') || '# Day log\n\nWhat each person got done, day by day. Newest first.\n';
  writeText('team/daylog.md', daylog.replace(/(Newest first\.\n)/, `$1\n${log.join('\n')}\n`));
  notify('general', `📒 **Day ${state.day} recap**\n\n${log.slice(2).join('\n')}\n\nThe full log is in the Handbook (Team history → Day log).`);

  if (state.day >= state.daysInSprint) { state.phase = 'done'; notify('general', `🏁 **Sprint ${state.sprint} is over.** If you haven't yet, run the review & demo and the retrospective from the Calendar.`); }
  else { state.day += 1; state.phase = 'before'; }
  state.today = { event: null, out: [], done: state.phase === 'done' ? state.today.done : [] };
  save();
  return view();
}

// ---------- meetings ----------
const header = (m) => `You're in the "${m.title}" meeting in the #Meetings channel.${m.ticket ? ` It's about ${m.ticket}.` : ''} Meeting transcript so far:\n${transcript('meetings', { since: m.startedAt, limit: 40 })}\n`;
// Each plan: `rounds` speak in order (people within a round speak in parallel), then it's Samin's `turn`.
// While the meeting is open, the `respond` people answer Samin, plus anyone Samin @mentions.
// `wrap` is a list of [person, instruction] steps run in order when Samin ends the meeting.
const PLAN = {
  standup: () => ({
    rounds: [['tomas'], [...DEVS, 'dana']],
    open: (p) => (p === 'tomas'
      ? `Open the standup in one line (it's Day ${state.day}), then give your own update in 3 short lines (Yesterday / Today / Blockers), including any risk to the sprint timeline you can see.`
      : `Give your standup update in 3 short lines (Yesterday / Today / Blockers), based on the board and your journal. Name anyone you're blocked on. Don't start new work during the meeting.`),
    turn: 'Your update: what you tested yesterday, what you will test today, which bugs are open, and anything blocking you.',
    respond: ['tomas'],
    wrap: [['tomas', `The standup is over. Add the whole standup (everyone's update, including Samin's, and any follow-ups agreed) to the top of team/standups.md under a heading for today. Then post a 2–3 line closing message listing the follow-ups and any sprint risk.`]],
  }),
  planning: () => ({
    rounds: [['tomas'], ['dana'], [...DEVS]],
    open: (p) => ({
      tomas: `Open sprint planning as facilitator: give the agenda and the team's capacity this sprint (three devs, one QA, anyone out), and name any dependencies between tickets you can see. Hand over to Dana.`,
      dana: `As Product Manager: give the sprint goal, propose an order for the tickets and say why, and ask the devs for their estimates and risks.`,
    })[p] ?? `Read your own tickets. Say whether you agree with the estimate, and name one risk or dependency.`,
    turn: 'Which tickets look hardest to test, and why? How much test effort do you expect? Should anything be cut?',
    respond: ['dana'],
    wrap: [
      ['dana', `Planning is over. As Product Manager, commit the sprint scope, taking the devs' and Samin's input into account. Post the commitment and any cuts, with a one-line reason for each cut.`],
      ['tomas', `Record the scope Dana just committed and any cuts in team/decisions.md, set the sprint's Status line in team/board.md to "In progress", and flag any timeline risk. Remind everyone that tickets need refinement before work starts.`],
    ],
  }),
  refinement: (m) => {
    const owner = readBoard().tickets.find((t) => t.id === m.ticket)?.ownerKey ?? 'rafi';
    return {
      rounds: [['dana'], [owner]],
      open: (p) => (p === owner
        ? `We're refining ${m.ticket}. Read the ticket and the relevant code. Say briefly how you'd build it, and list your questions.`
        : `As Product Manager, explain the user need behind ${m.ticket} and anything about its scope the team should know. Don't write acceptance criteria yet.`),
      turn: `What questions and edge cases do you want written into the acceptance criteria for ${m.ticket}? This is the cheapest moment to find bugs.`,
      respond: [...new Set(['dana', owner])],
      wrap: [['dana', `Refinement of ${m.ticket} is over. Write the final acceptance criteria into the ticket in Given / When / Then form, covering everything agreed in the meeting, including Samin's edge cases. Remove "DRAFT", list anything deliberately out of scope, and set ${m.ticket} to Ready in team/board.md. Post a short summary of the final criteria.`]],
    };
  },
  triage: () => ({
    rounds: [['tomas']],
    open: () => `Samin runs this triage; you keep time. List every bug in team/bugs/ whose status is New (ID, title, severity as filed, ticket) in a short list, then hand over to Samin. Don't judge severity, priority or report quality, and don't assign owners. If there are no new bugs, say so and suggest ending the meeting.`,
    turn: 'You run this triage. For each new bug: confirm or change its severity with a reason, and propose an owner (@mention them so they can respond). Dana will set priority. Hold your severity with evidence, or change it if someone convinces you.',
    respond: ['dana'],
    wrap: [['tomas', `Triage is over. Update each bug file and the Bugs table in team/board.md exactly as agreed in the meeting: Samin's severity, Dana's priority, the agreed owner, and status Triaged. Don't change anything that wasn't agreed. Record any dispute and how it was settled (severity by Samin, intended behavior by Dana) in team/decisions.md. Post the final outcome for each bug.`]],
  }),
  oneonone: () => ({
    rounds: [['priya']],
    open: () => `This is your weekly 1:1 with Samin. First look at what Samin has done so far (team/qa/, bugs they filed, tickets they tested, how they ran triage, how they handled pushback from devs, Dana and Tomas in the chat history files under team/chat/history/). Ask how it's going, give specific feedback (one strength and one growth area, with examples), and ask one question.`,
    turn: "Talk to Priya: how it's going, what's hard, and what you want to learn.",
    respond: ['priya'],
    wrap: [['priya', `The 1:1 is over. Summarize the growth goals you agreed in 2–3 lines and note them in your journal.`]],
  }),
  demo: () => ({
    rounds: [['tomas'], [...DEVS]],
    open: (p) => (p === 'tomas'
      ? `Open the sprint review: in one short paragraph, what was committed, what's Done, and what slipped. Then hand over to the devs.`
      : `Sprint review. Give a 3–5 line demo of your tickets that are Done or nearly done: what a user can do now and how to try it. Be honest about anything that isn't finished.`),
    turn: "Give the quality summary (what was tested, the open bugs and their risk to users, the regression checklist result, what wasn't tested) and your QA recommendation: go, no-go, or go with known risks.",
    respond: ['dana'],
    wrap: [['dana', `The review is over. Make the ship decision as Product Manager, taking Samin's QA recommendation into account. If you're shipping against it, name the risk you're accepting. Record the decision and its reasons in team/decisions.md.`]],
  }),
  retro: () => ({
    rounds: [['tomas'], TEAMMATES.filter((p) => p !== 'tomas')],
    open: (p) => (p === 'tomas'
      ? `Open the retrospective as facilitator in one line, then give your own: 2 things that went well, 2 that didn't, and 1 suggestion.`
      : `Retrospective. Give 2 things that went well, 2 that didn't, and 1 suggestion, based on your journal and the sprint's tickets, bugs and decisions. Be honest, including about working with QA.${p === 'priya' ? ' Don\'t reveal the seeded defects yet.' : ''}`),
    turn: "Your retro: what went well, what didn't, and one suggestion.",
    respond: ['tomas'],
    wrap: [
      ['priya', `Now reveal the seeded defects: read team/.seeded/, match each one to a filed bug if there is one, and give Samin a table: Defect | Caught? | Bug | Technique that finds it. Then give a short, kind and specific coaching summary.`],
      ['tomas', `Agree 2–3 action items for the next sprint, drawing on everyone's retro and Samin's, and write them in team/decisions.md with an owner for each. Post them.`],
    ],
  }),
};

async function speak(person, m, instruction) {
  return deliver(person, 'meetings', { from: 'office', text: `(${m.title})` }, {
    prompt: [context(), header(m), instruction, '', `Reply as yourself, in the meeting, as a chat message. Keep it brief, like speaking in a real meeting. Don't @mention people.`].join('\n'),
  });
}

/** Throws if this meeting can't start now. After the sprint ends, only the review and the retro can still be held. */
export function checkMeeting(type, { ticket } = {}) {
  if (!PLAN[type]) throw new Error(`Unknown meeting: ${type}`);
  if (state.meeting) throw new Error(`The ${state.meeting.title} is still going. End it first.`);
  if (state.phase === 'before') throw new Error(`Day ${state.day} hasn't started. Press "Start day" first.`);
  if (state.phase === 'ending') throw new Error('The day is ending.');
  if (state.phase === 'done' && !['demo', 'retro'].includes(type)) throw new Error('The sprint is over. Only the review and the retro are left.');
  if (type === 'refinement' && !readBoard().tickets.some((t) => t.id === ticket)) throw new Error('Pick a ticket to refine.');
}

export async function startMeeting(type, { ticket } = {}) {
  checkMeeting(type, { ticket });
  const m = { type, title: MEETING_TITLES[type] + (ticket ? `: ${ticket}` : ''), ticket, startedAt: new Date().toISOString(), phase: 'opening' };
  state.meeting = m; save();
  notify('meetings', `📅 **${m.title}** has started.`);
  const plan = PLAN[type](m);
  for (const who of plan.rounds) {
    const present = who.filter((p) => !isOut(p));
    who.filter(isOut).forEach((p) => notify('meetings', `${PEOPLE[p].short} is out of office and can't join.`));
    await Promise.all(present.map((p) => speak(p, m, plan.open(p))));
  }
  state.meeting = { ...m, phase: 'open', respond: plan.respond, turn: plan.turn }; save();
  notify('meetings', `🎤 **Your turn, Samin.** ${plan.turn}\n\nWhen you're done, press **End meeting**.`);
  return view();
}

/** Samin said something in the meeting. */
export function meetingMessage(msg) {
  const m = state.meeting;
  if (!m || m.phase !== 'open') return false;
  const named = mentionsIn(msg.text);
  const who = [...new Set([...m.respond, ...named])].filter((p) => !isOut(p));
  for (const p of who) speak(p, m, `Samin just said: "${msg.text}"\nRespond to it as part of the meeting.`);
  return true;
}

export function checkEndMeeting() {
  const m = state.meeting;
  if (!m) throw new Error('No meeting is running.');
  if (m.phase === 'opening') throw new Error('Wait until everyone has spoken.');
  if (m.phase === 'wrapping') throw new Error('The meeting is already wrapping up.');
}

export async function endMeeting() {
  checkEndMeeting();
  const m = state.meeting;
  state.meeting = { ...m, phase: 'wrapping' }; save();
  const plan = PLAN[m.type](m);
  for (const [person, instruction] of plan.wrap) {
    // If the person who'd wrap up is out, the facilitator does it (Priya's wrap-ups are hers alone).
    const by = !isOut(person) ? person : person !== 'priya' && !isOut(FACILITATOR) ? FACILITATOR : null;
    if (by) await speak(by, m, instruction);
    else notify('meetings', `${PEOPLE[person].short} is out of office, so this part waits until they're back.`);
  }
  if (!state.today.done.includes(m.type)) state.today.done.push(m.type);
  state.meeting = null; save();
  notify('meetings', `✅ **${m.title}** has ended.`);
  return view();
}

// ---------- wiring ----------
setOfficeHooks({
  isOut,
  inMeeting: () => Boolean(state.meeting),
  context,
  queueForTomorrow: (person, ch, trigger) => { state.pending.push({ person, channel: ch, trigger }); save(); },
});
// A restart in the middle of something leaves a usable state.
if (state.phase === 'ending') state.phase = 'working';
if (state.meeting && state.meeting.phase !== 'open') state.meeting = { ...state.meeting, phase: 'open', respond: [FACILITATOR], turn: 'Carry on.' };
save();
export const officeView = view;
