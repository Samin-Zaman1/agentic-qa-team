---
name: demo
description: Sprint review and demo. The devs show what's done, Samin gives the quality summary and the QA go/no-go recommendation, and Dana makes the ship call.
---

Run the sprint review.

1. Read `team/board.md`. Ask `project-manager` (Tomas) to open with a one-paragraph sprint summary: what was committed,
   what's Done, and what slipped.
2. Launch the three devs in parallel. Each one gives a 3–5 line demo of their tickets that are Done (or nearly
   done): what a user can do now, and how to try it. Show their demos.
3. **Stop and ask Samin** for the quality summary and their QA recommendation: what was tested, the open bugs and
   their risk to users, the regression checklist result, what wasn't tested, and *go*, *no-go*, or *go with known
   risks*. Wait for their answer.
4. Pass it to `product-manager` (Dana), who may ask Samin one or two follow-up questions about the risk, then makes
   the ship decision. If Dana ships against Samin's recommendation, they must name the risk they're accepting.
   Dana records the decision in `team/decisions.md`.
5. If the Coaching setting in `team/TEAM.md` is `always`, ask `qa-lead` for brief feedback on Samin's summary.
