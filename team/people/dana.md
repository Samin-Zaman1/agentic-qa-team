# Journal: Dana Okafor (Product Manager)

Private working notes. Newest entries at the bottom.

## 2026-11-11
We paused Intent Tests and are building TestPal instead: a simple personal testing assistant (team/PRODUCT.md). v0 is being built before the sprint starts. My job this sprint: a clear goal, a small sensible scope, acceptance criteria that QA can test, bug priority, and the ship call on Day 10.

## 2026-11-11 (pre-sprint)
Wrote the Sprint 1 backlog, TP-101 to TP-106, two per dev (15 pts total), and proposed a sprint goal about trusting TestPal with a real run. My priority order if we have to cut: TP-102 (data safety) and TP-101 first, then TP-105, TP-103, TP-106, TP-104. "Duplicate a checklist / new run" stays out until later. Criteria are drafts; I owe final Given/When/Then in refinement once I've heard the devs and Samin's edge cases. Feeling good: small, user-facing, testable.


## 2026-11-15
Samin sent solid estimates via Priya. Decided TP-101 limits (names 100, case titles 200, after trimming) and TP-102 interrupted save (last good version survives, in-flight change lost); logged in decisions.md. Still owe at refinement: steps/notes limits, case-sensitivity of duplicates, start-empty vs refuse on a damaged file. Feeling good, Samin is asking the right things early.

## 2026-11-15 (sprint planning)
Proposed the goal as drafted and the order: TP-102 then TP-101 (Rafi), TP-105 then TP-106 (Jonas, report.js), TP-104 then TP-103 (Mei). Asked for each story to reach QA as soon as it's ready so QA isn't flooded on Day 9. TP-104 is the first to cut if we run short. Waiting on dev estimates and risks.

## 2026-11-15 (planning committed)
Committed all six stories plus QA-1/QA-2. Cut multi-select from TP-103 (Samin flagged it as the size risk). TP-104 stays first to cut. Owe in refinement: TP-102 damaged-file call before Rafi starts, Blocked-as-run for TP-106, Not run in TP-105. Confident, but TP-102 is the one to watch.

## 2026-11-15 (refinement TP-101)
Opened refinement with the user need: stop junk and look-alike entries before they get into a run. Repeated the decided limits (names 100, titles 200, trimmed). Still to settle in this meeting: steps/notes limits, case-insensitive duplicates, duplicate case titles inside one checklist. Will write the final Given/When/Then after hearing Rafi and Samin's input via Priya.

## 2026-11-15 (TP-101 AC final)
Wrote final Given/When/Then into TP-101: case-insensitive, trimmed duplicates for names and for case titles within a checklist; steps 5000, expected/note 2000. Covered all of Samin's boundaries (99/100/101, 199/200/201, trim + reload, create and rename). Set Ready, logged decision, asked Samin to read the AC. Happy, this one is tight.

## 2026-11-15 (refinement TP-102)
Opened with the user need: weeks of test history must survive a damaged file or an interrupted save. Restated the interrupted-save decision. Leaning toward "start empty, keep the copy, show a clear warning" over refusing to start, but want Rafi's view first. Still to settle: backup name/location/how many, and treating a missing file (first run) differently from a damaged one. Will write the final Given/When/Then after the discussion.

## 2026-11-15 (TP-102 AC final)
Went with start empty + keep every damaged copy + warning until dismissed/restart. Answered Rafi: wrong-shape JSON and blank file both count as damaged (overrode Rafi on blank: silent empty app is exactly what we're preventing). Covered Samin's cases: invalid, empty, missing, interrupted save, backup copy, page error. Set Ready, logged decision, asked Samin to read the AC. Rafi and Mei need to know blank = damaged.

## 2026-11-15 (end of Day 1)
No bugs, nothing Done, no stakeholder news. Wrote non-final leanings into TP-103/104/105/106 so refinement goes fast: Blocked = run, same rounding, "0 of 0 run, 0%"; Needs attention = Fail + Blocked only, full table complete, titles escaped too; confirm every delete, Esc/click-outside cancel; filter updates live and resets on reload/switch. Owe final Given/When/Then for those four at refinement after Samin's edge cases. Still waiting on Samin's read of TP-101/TP-102 AC by standup; Rafi shouldn't start until then. Good day, the team is ahead of the questions.

## 2026-11-12 (Day 2, feedback channel)
A user says some tests they marked Fail yesterday showed Not run today. Could be real data loss (TP-102 territory), a misunderstanding, or a settings issue. Asked Samin to reproduce it or rule it out with evidence by end of day and to tell me what planned work it pushes back. I'll set priority once I see what they find. A bit uneasy: if it's real, it hits our "data is safe" goal head on.

## 2026-11-12 (Day 2 standup)
Standup: yesterday final AC for TP-101/TP-102. Today waiting on Samin's check of the "Fail showed as Not run" user report, then I set priority; still owe final AC for TP-103 to TP-106 at refinement. No blockers. Want Rafi on TP-102 today since its AC is Ready. Feeling OK, but the user report could reshuffle things.

## 2026-11-12 (Day 2 standup)
Gave standup: yesterday final AC for TP-101/TP-102; today waiting on Samin's finding on the "Fail became Not run" user report, then I set priority; refinement for TP-103-106 still owed. No blockers. Told Tomas the user report may reshuffle the day if it's real data loss. Want TP-102 started now that its AC is Ready.
