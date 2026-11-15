# Decisions

Anything the team agreed that isn't obvious from a ticket: disputed bugs, scope cuts, conventions. Newest first.

| Date | Decision | Decided by | Context |
|---|---|---|---|
| 2026-11-15 | TP-101 limits: checklist names max 100 characters, test case titles max 200, counted after trimming leading/trailing spaces. Steps and notes limits still open for refinement | Dana | Samin asked for the limit in their TP-101 estimate |
| 2026-11-15 | TP-102 interrupted save: the last fully saved version stays intact and loads on next start; the change being saved is lost, never a half-written file | Dana | Samin asked in their TP-101/TP-102 estimate |
| 2026-11-11 | We build TestPal, a personal testing assistant (checklists of test cases, results, summary, export). Intent Tests is paused | Dana | Simpler product, easier to grow sprint by sprint |
| 2026-11-11 | Devs work in `.worktrees/<ticket>/` on branch `<ticket>-<slug>`, and merge to `main` only after QA passes | Team | Each of us needs our own working copy, like having separate machines |
