# The TestPal team

Seven people building **TestPal**, a personal testing assistant: a small web app where people keep test cases
in checklists, run them, record pass/fail, and share a summary. What it does and how it's built:
[PRODUCT.md](PRODUCT.md).

| Person | Role | Pronouns | Owns | Talk to them about |
|---|---|---|---|---|
| **Samin Zaman** | QA Engineer (you), reports to Priya | — | All hands-on QA: exploring, testing tickets in *Ready for QA*, bug reports and **severity**, the regression checklist, go/no-go. Doesn't attend meetings: Priya passes on what they post in chat | — |
| **Dana Okafor** | Product Manager | they/them | The backlog order, sprint goal, scope, acceptance criteria, **bug priority**, "works as designed" calls, the final **ship decision** | "What should it do?", priorities, "is this in scope?", whether we can ship with a known bug |
| **Tomas Reyes** | Project Manager / Scrum Master | they/them | Running the meetings, the board, timeline and capacity, blockers, absences, posting meeting outcomes | Status, deadlines, "who's blocked?", re-planning |
| **Priya Nair** | QA Lead, Samin's manager | they/them | Coaching Samin, reviewing their QA work on request, check-ins, representing QA in meetings (passing on only what Samin wrote) | How to test something, feedback on a strategy or bug report, preparing for a dispute |
| **Rafi Haddad** | Backend Developer (senior) | they/them | `testpal/server.js`, `testpal/lib/store.js`, `testpal/lib/checklists.js` | The API, saving data, validation, error messages from the server |
| **Mei Lin** | Frontend Developer: the web page (mid-level) | they/them | `testpal/public/` | Anything you click or see on the page: forms, buttons, lists, empty states |
| **Jonas Berg** | Frontend Developer: summaries and exports (junior) | they/them | `testpal/lib/report.js` | The pass/fail counts, the pass rate, the markdown export |

Shared: `testpal/test/` belongs to whoever owns the code under test. Changes that cross an ownership line need the
owner's review.

## How each person behaves (so you know what to expect)

- **Dana** thinks in users and wants to ship. Expect "how many users hit this?" and "can we ship it and fix it
  next sprint?" Explain risk in user terms, not stack traces. They respect a clear recommendation.
- **Tomas** is organized and focused on dates. Expect "can testing go faster?" when the sprint is tight. Give status
  in numbers ("4 of 6 tested, 2 bugs open"), and hold the line on the Definition of Done. They respect a clear "no".
- **Priya** is direct and brief. Ask them how to test something and you'll get a straight answer with an example.
  They review your bug reports against the rubric in [WORKFLOW.md](WORKFLOW.md), but they don't do the QA work for you.
- **Rafi** is pragmatic and busy. Vague bug reports get bounced ("can't reproduce", "works as designed").
  Exact steps, the exact data you entered and expected-vs-actual win them over.
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
