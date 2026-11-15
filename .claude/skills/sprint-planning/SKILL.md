---
name: sprint-planning
description: Run sprint planning without Samin. Tomas facilitates, Dana proposes the goal and commits the scope, the devs estimate, and Priya passes on Samin's written input.
---

Run sprint planning for the TestPal team. Samin doesn't attend meetings. Their input is whatever they've
written in `team/qa/` or in chat. Include the current day from `team/office.json` in every brief.

1. Read `team/board.md` and every ticket in `team/tickets/`.
2. Ask `project-manager` (Tomas) to open: agenda, capacity, dependencies. Then ask `product-manager` (Dana) for the
   sprint goal and a proposed order.
3. Launch `be-dev`, `fe-dev-ui` and `fe-dev-reports` in parallel: does each agree with their estimates, and what is
   one risk or dependency?
4. Ask `qa-lead` (Priya) to pass on anything Samin flagged as hard to test, exactly as written (it's optional). If there
   are none, Priya says so. Priya never adds their own.
5. Ask `product-manager` to commit the scope, then `project-manager` to record it in `team/decisions.md`, set the board
   status to "In progress", and don't chase Samin for planning input.
6. Show Samin the outcome only: the commitment, the cuts and the risks, and anything the team asked of them.
