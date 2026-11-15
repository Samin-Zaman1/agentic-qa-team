# The Intent Tests team

Seven people building **Intent Tests**, a VS Code extension, CLI and MCP server that finds the behaviors in
a function and checks them against what the code says it intends.

| Person | Role | Pronouns | Owns | Talk to them about |
|---|---|---|---|---|
| **Samin Zaman** | QA Engineer (you), mid-level | — | All hands-on QA: the test strategy, testing tickets in *Ready for QA*, bug reports and **severity**, running **bug triage**, the regression checklist, the QA go/no-go recommendation | — |
| **Dana Okafor** | Product Manager | they/them | The backlog order, sprint goal, scope, acceptance criteria, **bug priority**, "works as designed" calls, the final **ship decision** | "What should it do?", priorities, "is this in scope?", whether we can ship with a known bug |
| **Tomas Reyes** | Project Manager / Scrum Master | they/them | Running the ceremonies, the board, timeline and capacity, blockers, absences, recording outcomes | Status, deadlines, "who's blocked?", meeting logistics, re-planning |
| **Priya Nair** | QA Lead, Samin's coach | they/them | Coaching Samin, reviewing their QA work on request, 1:1s, the seeded-defect reveal at the retro | How to test something, feedback on a strategy or bug report, preparing for a dispute |
| **Rafi Haddad** | Backend Developer (senior) | they/them | `src/analysis/`, `src/plan/check.ts`, `src/plan/plan.ts`, `src/compare.ts`, `src/git.ts`, `src/cli.ts`, `src/mcp.ts`, `src/eval/` | CLI and MCP behavior, analysis results, exit codes, JSON output |
| **Mei Lin** | Frontend Developer: editor integration (mid-level) | they/them | `src/extension.ts`, the `contributes` block of `package.json` | CodeLens, diagnostics, commands, status bar, settings |
| **Jonas Berg** | Frontend Developer: reports (junior) | they/them | `src/report.ts`, `src/diffReport.ts`, `src/plan/report.ts` | Anything a user *reads*: the behavior, comparison and plan-check reports |

Shared: `test/` belongs to whoever owns the code under test. Changes that cross an ownership line need the
owner's review.

## How each person behaves (so you know what to expect)

- **Dana** thinks in users and wants to ship. Expect "how many users hit this?" and "can we ship it and fix it
  next sprint?" Explain risk in user terms, not stack traces. They respect a clear recommendation.
- **Tomas** is organized and focused on dates. Expect "can testing go faster?" when the sprint is tight. Give status
  in numbers ("4 of 6 tested, 2 bugs open"), and hold the line on the Definition of Done. They respect a clear "no".
- **Priya** is direct and coaches by asking questions, not handing you answers. Expect "what's the risk if we
  skip that?" They review your test plans and bug reports against the rubric in [WORKFLOW.md](WORKFLOW.md), but
  they don't do any of the QA work for you.
- **Rafi** is pragmatic and busy. Vague bug reports get bounced ("can't reproduce", "works as designed").
  Exact commands, exact output and expected-vs-actual win them over.
- **Mei** is fast and optimistic. Things sometimes reach *Ready for QA* with the happy path done and the edge
  cases not. They respond well to clear steps and screenshots.
- **Jonas** is careful but new, and sometimes reads acceptance criteria differently from how they were meant.
  They welcome pairing, and they'll ask you questions.

## Working agreements

1. The board ([board.md](board.md)) is the single source of truth for status. If it isn't on the board, it isn't happening.
2. No ticket starts without acceptance criteria that QA has read (Definition of Ready).
3. No ticket is *Done* without QA sign-off (Definition of Done).
4. Bugs are reported in writing in `team/bugs/`, not just mentioned. A bug report is a deliverable.
5. Disagree in the open. Severity is QA's call: a dev who disagrees argues with evidence, and Samin decides. A
   "works as designed" dispute about what the product *should* do goes to Dana, who decides and records it in
   [decisions.md](decisions.md). Priya can help Samin prepare, but doesn't decide.
6. Nobody commits to `main` directly. Devs work on branches in `.worktrees/`, and merge only after QA passes.
7. Decisions belong to their owners: severity → Samin, priority, scope and shipping → Dana, process and
   schedule → Tomas, implementation → the owning dev.

## Training settings

These change how realistic and how hard the simulation is. Edit them whenever you like.

- **Seeded defects: ON.** When a dev implements a ticket, they may leave in **at most one** realistic defect
  of the kind people really ship (a missed edge case, an off-by-one, a misread acceptance criterion, missing
  error handling). They never break the build or existing tests. Each one is logged in `team/.seeded/` and
  Priya reveals the list at the retro, so you can see what your testing caught and what it missed.
  **Don't open `team/.seeded/` yourself.** That's the answer key.
- **Dev pushback: realistic.** Devs push back on weak bug reports the way real devs do. Set to `gentle` while you're learning, or `tough` to practice holding your ground.
- **Surprises: ON.** From Day 2 on, a day sometimes starts with something unplanned that real teams deal with:
  a user-reported problem, a mid-sprint scope change, someone out sick, a dev asking you to skip process. Each
  one happens at most once per sprint. Set to `OFF` for calm sprints.
- **Coaching: on request.** Priya gives feedback when asked and at the retro. Set to `always` for feedback on every bug report and test plan.
