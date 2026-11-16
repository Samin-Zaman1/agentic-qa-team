# Decisions

Anything the team agreed that isn't obvious from a ticket: disputed bugs, scope cuts, conventions. Newest first.

| Date | Decision | Decided by | Context |
|---|---|---|---|
| 2026-11-15 | TP-102 refined: on a damaged file (invalid JSON, wrong structure, or empty/blank file) TestPal starts empty, moves the file to `testpal.json.damaged-<timestamp>` next to it, keeps every copy, and shows a warning until dismissed or restart. A missing file is a normal first run with no warning | Dana | Refinement with Rafi. Samin listed invalid JSON, empty file, missing file, interrupted save, backup copy and the page error as cases. A blank file counts as damaged because a user with history would otherwise see an empty app with no explanation |
| 2026-11-15 | TP-101 refined: duplicate checklist names, and duplicate test case titles within one checklist, are rejected ignoring capitals and trimmed spaces; keeping your own name is fine. Steps max 5000, expected result and note max 2000 each, counted after trimming | Dana | Refinement with Rafi. Samin listed "Login" vs "login" vs " Login " as a case to test |
| 2026-11-15 | Sprint 1 commitment: all six stories (TP-101 to TP-106, 15 pts) plus QA-1 and QA-2. TP-103 is a single-select filter only; multi-select is out. TP-104 is the first cut if we slip | Dana | Sprint planning. Samin flagged that multi-select would make TP-103 bigger and sized TP-102 as L |
| 2026-11-15 | TP-101 limits: checklist names max 100 characters, test case titles max 200, counted after trimming leading/trailing spaces. Steps and notes limits still open for refinement | Dana | Samin asked for the limit in their TP-101 estimate |
| 2026-11-15 | TP-102 interrupted save: the last fully saved version stays intact and loads on next start; the change being saved is lost, never a half-written file | Dana | Samin asked in their TP-101/TP-102 estimate |
| 2026-11-11 | We build TestPal, a personal testing assistant (checklists of test cases, results, summary, export). Intent Tests is paused | Dana | Simpler product, easier to grow sprint by sprint |
| 2026-11-11 | Devs work in `.worktrees/<ticket>/` on branch `<ticket>-<slug>`, and merge to `main` only after QA passes | Team | Each of us needs our own working copy, like having separate machines |
