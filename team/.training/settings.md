# Training settings

These change how realistic and how hard the simulation is. The office never shows this file, so the simulation stays
in character. Edit it in VS Code whenever you like. The teammates read it every time they act.

- **Seeded defects: ON.** When a dev implements a ticket, they may leave in **at most one** realistic defect
  of the kind people really ship (a missed edge case, an off-by-one, a misread acceptance criterion, missing
  error handling). They never break the build or existing tests. Each one is logged in `team/.seeded/` and
  Priya reveals the list at the retro, so you can see what your testing caught and what it missed.
  **Don't open `team/.seeded/` yourself.** That's the answer key.
- **Dev pushback: realistic.** Devs push back on weak bug reports the way real devs do. Set to `gentle` while you're learning, or `tough` to practice holding your ground.
- **Surprises: ON.** From Day 2 on, a day sometimes starts with something unplanned that real teams deal with:
  a user-reported problem, a mid-sprint scope change, someone out sick, a dev asking you to skip process. Each
  one happens at most once per sprint. Set to `OFF` for calm sprints.
- **Coaching: on request.** Priya gives feedback when asked, at check-ins and at the retro. Set to `always` for feedback on every bug report and test plan.
