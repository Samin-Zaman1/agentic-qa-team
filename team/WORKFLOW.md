# How we work

**We keep paperwork minimal. Your time goes into testing.** Two-week sprints (10 workdays). Tomas (Project
Manager) runs the meetings, and **you don't attend.** Priya passes on exactly what you've posted in chat, without
adding anything. A few lines in chat is all any meeting needs from you.

| Meeting | When | What happens | What the team needs from you (in chat) |
|---|---|---|---|
| Sprint planning | Day 1, afternoon | Dana commits the scope, and the devs estimate | Optional: one line on any ticket that looks hard to test |
| Refinement | Days 1, 2, 5, afternoon | Dana and the owning dev agree the acceptance criteria | A few questions or edge cases, if you have any |
| Daily standup | Days 2–10, morning | Yesterday / today / blockers | Nothing, unless you're blocked |
| Bug triage | Days 3, 6, 8, afternoon | Priya presents your new bugs, the devs respond, and Dana sets priority | Your bugs, filed. If a dev disputes one, answer in *Bugs* |
| Check-in with Priya | Days 4, 9 | Priya sends you short feedback by DM | Reply if you like |
| Sprint review | Day 10, afternoon | Devs demo, and Dana makes the ship call | One message: go or no-go, and the risks |
| Retrospective | Day 10, afternoon | What went well, what didn't | Optional: your thoughts in *Sprint 1* |

The morning post in *General* says which meetings are on today and what's needed from you. Meeting outcomes are
posted in *Sprint 1* and *Bugs*. Talk to anyone directly at any time.

## A workday

1. **You start working.** There's no clocking in: the day starts when you open the office. Sometimes something
   unplanned happens.
2. **Your work:** mostly testing. Test what's *Ready for QA*, explore TestPal, file bugs, retest fixes.
3. **You stop.** The office notes the time. Then the team finishes the day: the afternoon meetings, then everyone's
   own work. Devs write code, commit, review each other and fix bugs. Dana handles scope questions, Tomas checks the
   board and the timeline, and Priya looks at how you're doing. Their messages and the day's recap are waiting
   when you're back, and the recap also goes in the [Day log](daylog.md). Work you haven't done doesn't do itself.

## Ticket lifecycle

```
Backlog → Ready → In Progress → Code Review → Ready for QA → In QA → QA Passed → Done
                                                   ↑            │
                                                   └─ Reopened ←┘  (QA found a blocking bug)
```

- **Backlog → Ready**: refinement is done, the acceptance criteria are written, and QA has read them (Definition of Ready).
- **In Progress**: the dev creates the branch `<ticket>-<slug>` in `.worktrees/<ticket>/`.
- **Code Review**: another dev reviews. A dev can't review their own ticket.
- **Ready for QA**: the CI build is green (all tests pass), the dev has written test notes on the ticket, and the
  dev has told QA.
- **In QA**: you're testing. Only test a branch whose CI build is green. When you pass or reopen it, the comment
  box is your QA note: one line on what you tried, plus any bug IDs.
- **QA Passed**: you signed it off. The owner merges it.
- **Reopened**: a bug that blocks the acceptance criteria goes back to the dev, linked to the ticket.
- **Done**: the dev merged to `main` after QA Passed. Bugs that don't block can stay open as separate tickets.

QA moves the outlined columns on the Board (*Start testing*, *Pass QA*, *Reopen*). Devs move everything else.

## Bug lifecycle

`New → Triaged → In Progress → Fixed: ready for retest → Closed` (or back to `Reopened` if your retest fails).
Only QA closes a bug, and only after retesting it. File bugs with **🐞 File a bug** on the Board.

## Definition of Done

- [ ] QA tested every acceptance criterion and passed the ticket
- [ ] Unit tests added for new behavior, and the whole suite passes (`npm test --prefix testpal`, green in CI)
- [ ] No open Sev-1 or Sev-2 bugs against the ticket
- [ ] The regression checklist ([templates/regression-checklist.md](templates/regression-checklist.md)) has been run on the merged build

## Bug severity and priority

**Severity** is how bad the bug is for the user. **You set it** when you file the bug, with a one-line reason.
Devs can challenge it at triage with evidence. You'll be asked in *Bugs*, and you decide whether to change it.
**Priority** is how soon we fix it. Dana decides it at triage, as Product Manager. A severe bug can still get a
low priority (for example if almost nobody hits it), but Dana has to say why out loud.

| Severity | Meaning | Example in this product |
|---|---|---|
| **Sev-1 Critical** | Crash, data loss, or the feature can't be used at all | The server crashes when you add a test case; deleting one checklist deletes another |
| **Sev-2 Major** | A main flow is wrong and there's no reasonable workaround | A result you marked isn't saved after a reload; the pass rate is wrong |
| **Sev-3 Minor** | Wrong but there's a workaround, or it's an edge case | The export table breaks when a title contains a `\|` |
| **Sev-4 Trivial** | Cosmetic | Typo, misaligned button |

## How to test here

- **`main`**: run `npm run testpal` and open http://localhost:4500.
- **A ticket's branch**: run `node testpal/server.js` inside `.worktrees/<TICKET>/` and open the page. If `main` is
  running too, use another port: `TESTPAL_PORT=4501 node testpal/server.js`.
- **Clean start**: stop the server and delete `testpal/data/testpal.json` (in the folder you're running from).
- **The API directly** (useful for edge cases the page won't let you type): for example
  `curl -s -X POST localhost:4500/api/checklists -H "Content-Type: application/json" -d '{"name":""}'`.
  The endpoints are listed in [PRODUCT.md](PRODUCT.md).
- **Unit tests**: `npm test --prefix testpal`.
- Test data, notes and sample inputs you make go in `team/qa/`, which is your space.

## Release go/no-go

Before the sprint review, post one message in *Sprint 1*: **go**, **no-go**, or **go with known risks** (name
the open bugs that matter). Base it on the open bugs and your regression run on `main`. Dana makes the ship call. If Dana ships against your recommendation, the accepted risk goes in
[decisions.md](decisions.md).

## What Priya grades a bug report on

1. **Title** says what's wrong and where, e.g. *"Pass rate shows 0% when every test is Blocked or Not run"*, not *"Summary broken"*
2. **Steps to reproduce** are exact, including the data you entered, so someone else can follow them and get the same result
3. **Expected vs actual** are separate, specific, and quote what you really saw
4. **Environment**: branch or commit, OS, browser if it matters
5. **Evidence**: output, screenshot or a minimal sample file
6. **Severity** is set with a one-line reason
7. **One bug per report**, no opinions, and nothing a dev could read as blame
