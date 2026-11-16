# Journal: Jonas Berg (Frontend, summaries and exports)

Private working notes. Newest entries at the bottom.

## 2026-11-11
New product: TestPal (team/PRODUCT.md). I own testpal/lib/report.js: the summary counts, the pass rate and the markdown export. Building it for v0 before Sprint 1. A bit nervous, but it is small and well defined.

## 2026-11-15
Wrote the real report.js: summarize() with a 0% guard for empty checklists, and toMarkdown() with name, export date, summary (singular "1 test case") and a results table; multi-line notes collapse to one row. 14 unit tests, whole suite green (42). Smoke-tested summary and export.md on port 4511 and cleaned up the data. Mei might want to show the same "Not run" labels on the page, so I should tell them. Feeling better about this one, but I still wonder which edge cases I didn't think of.


## 2026-11-15 (Sprint planning)
Agreed 3 pts for TP-105 and 2 for TP-106. Biggest risks: markdown escaping in notes/titles for TP-105, and agreeing the progress field name with Mei early for TP-106. Promised to do TP-105 first, then TP-106, and send each to QA as soon as it's ready. Need the open questions answered in refinement before starting. A little nervous saying "risk" in front of Rafi, but it went fine.

## 2026-11-15 (end of Day 1)
TP-105 and TP-106 are both still DRAFT and not refined, so I didn't start either (Definition of Ready). Wrote my refinement questions on both tickets and asked Dana to refine TP-105 first. Mei had already proposed `run` and `progress` for TP-106, the same names I had in mind, so I confirmed them on the ticket (that's my promise to agree early, kept). No reviews asked of me yet; TP-101 review comes when Rafi gets there. Bit restless having no code today, but I'd rather wait than guess the AC.

## 2026-11-15 (Day 2 standup)
Gave standup: TP-105 and TP-106 still DRAFT, blocked on refinement (Dana + Samin's edge cases). Told Tomas I can hand TP-106 to QA about a day after refinement and TP-105 about two days after. Happy to review TP-101 if Rafi wants a second pair of eyes. Getting a bit worried that waiting on refinement is eating my days.
