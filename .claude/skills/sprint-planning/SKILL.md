---
name: sprint-planning
description: Run sprint planning. Tomas facilitates, Dana proposes the goal and order, the devs estimate and flag risks, Samin flags testability, and Dana commits the scope.
---

Run sprint planning for the Intent Tests team.

1. Read `team/board.md` and every ticket in `team/tickets/`.
2. Ask `project-manager` (Tomas) to open the meeting: the agenda, the team's capacity this sprint (3 devs, 1 QA,
   anyone out), and any dependencies they've spotted. Then ask `product-manager` (Dana) to give the sprint goal
   and propose an order for the tickets. Show both.
3. Launch `be-dev`, `fe-dev-editor` and `fe-dev-reports` in parallel. Ask each one to read their own tickets and give
   (a) whether they agree with the estimate, and (b) one risk or dependency. Example: IT-101 and IT-106 both touch
   plan-check output, so Rafi and Jonas need to agree on a shape.
4. Show all of it, then **stop and ask Samin**: which tickets look hardest to test and why, how much test effort
   they expect for each, and whether anything should be cut. Wait for their answer.
5. Pass Samin's input to `product-manager`, who makes the scope commitment. Then ask `project-manager` to record the
   committed scope and any cuts in `team/decisions.md`, update the sprint status in `team/board.md` to
   "In progress", and flag any timeline risk.
6. Remind Samin that no ticket is Ready until `/refinement <ticket>` has been done.
