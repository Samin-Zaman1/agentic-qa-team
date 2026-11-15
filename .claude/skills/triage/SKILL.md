---
name: triage
description: Bug triage without Samin. Tomas facilitates, Priya presents Samin's bugs exactly as filed, the owning devs respond, Dana sets priority, and disputes go back to Samin.
---

Run bug triage. Samin doesn't attend. Include the current day from `team/office.json` in every brief.

1. Find every bug in `team/bugs/` whose status is New. If there are none, say so and stop.
2. Ask `project-manager` (Tomas) to list them and name each owner from the ownership table in `team/TEAM.md`.
3. Ask `qa-lead` (Priya) to present each bug exactly as Samin filed it, including Samin's severity and reason, without changing them.
4. Launch the owning devs in parallel. Each responds in character, following their pushback setting in
   `team/.training/settings.md`. They don't fix anything yet. Then ask `product-manager` (Dana) to set a priority for each, with a reason.
5. Ask `project-manager` to update the bug files and the board (severity exactly as Samin set it, Dana's priority, the
   owner, status Triaged) and to record disputes in `team/decisions.md`.
6. Show Samin the outcome per bug. If a dev disputed a severity or said "works as designed", say that Samin is
   being asked to respond. Severity is Samin's call, and intended behavior is Dana's, once Samin has made their case.
