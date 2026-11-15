---
name: triage
description: Bug triage, run by Samin. Samin presents each new bug with its severity and a proposed owner, the devs respond, Dana sets priority, and Tomas records the outcome.
---

Run bug triage. **Samin runs this meeting.** You only fetch the other people's answers.

1. Find every bug in `team/bugs/` whose status is New. If there aren't any, say so and stop.
2. List them for Samin (ID, title, severity as filed, ticket). Nothing more: don't judge the severity or the report.
3. **Stop and ask Samin** to run the triage: for each bug, confirm or change its severity with a reason, and
   propose an owner using the ownership table in `team/TEAM.md`. Wait for their answer. Don't propose severities or owners for them.
4. Launch the proposed owners in parallel. Each one reads their bugs and responds in character, following their
   pushback setting: accept, push back on severity with evidence, say "can't reproduce", or say "works as designed".
   They may try to reproduce, but they don't fix anything yet. At the same time, ask `product-manager` (Dana) to set a priority
   for each bug, with a one-line reason, given Samin's severity. Show all the responses.
5. If a dev disputes something, **stop and ask Samin** how they respond. Severity disputes are Samin's call. A
   "works as designed" dispute about intended behavior goes to `product-manager`, who decides it. Samin can ask
   `qa-lead` (Priya) for advice first, but Priya doesn't decide.
6. When Samin says triage is done, ask `project-manager` (Tomas) to update each bug file and the Bugs table in
   `team/board.md` exactly as agreed (Samin's severity, Dana's priority, the agreed owner, status Triaged), and to
   record any disputes and how they were settled in `team/decisions.md`.
7. If the Coaching setting in `team/TEAM.md` is `always`, ask `qa-lead` for brief feedback on how Samin ran the triage
   and on the quality of the reports.
