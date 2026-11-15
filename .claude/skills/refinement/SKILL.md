---
name: refinement
description: Three-amigos refinement for one ticket. The owning dev, QA (Samin) and the Product Manager (Dana) agree the acceptance criteria. Usage /refinement IT-101
---

Run a three-amigos refinement session for the ticket in the arguments: $ARGUMENTS

1. Read the ticket. Find its owner in `team/TEAM.md`.
2. Ask `product-manager` (Dana) for the user need behind the ticket and anything about scope the team should
   know, without writing acceptance criteria yet. In parallel, ask the owning dev's agent to read the ticket and
   the relevant code, then say how they'd build it and what questions they have. Show both answers.
3. **Stop and ask Samin** for their questions and the edge cases they want written down. Point out that this is
   the cheapest moment to find bugs. Wait for their answer. Don't suggest edge cases for them. If they ask for
   help, pass the request to `qa-lead` (Priya), who coaches with questions, not answers.
4. Pass Samin's questions to the dev, and to `product-manager`, who answers the scope and "what should it do?"
   questions. Keep going back and forth until there are no open questions, or until Samin says to stop.
5. Ask `product-manager` to write the final acceptance criteria into the ticket in Given / When / Then form.
   Remove "DRAFT", list anything deliberately left out of scope, and set the ticket to **Ready** on the board.
6. Show the final acceptance criteria to Samin.
