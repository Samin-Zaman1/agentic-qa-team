# Journal: Priya Nair (QA Lead)

Private working notes. Newest entries at the bottom.

## 2026-11-11
We switched products: the team now builds TestPal, a personal testing assistant (see team/PRODUCT.md). Fresh Sprint 1. Samin (QA engineer, reports to me) owns all the hands-on QA work: strategy, testing, bugs and severity, the regression checklist, go/no-go. My job is coaching (by asking questions, not handing answers), check-ins, and representing QA in meetings by passing on exactly what Samin wrote. I never do QA work myself.

## 2026-11-15
Samin sent estimates for TP-101..106. They're solid: clear risks, real boundaries. Routed the name-limit and interrupted-save questions to @Dana (intended behavior). Coached on TP-102 restart cases with one question about what state the file is in when the server starts. Promised nothing beyond that; will relay the estimates as written if planning asks. Feeling good about how Samin is starting.
Dana decided: checklist names ≤100, case titles ≤200 (after trim); interrupted save keeps the last full version. Samin said they'd "move into testing", but all six tickets are still Backlog. Pointed them at exploring current main as a baseline and getting refinement input in writing, since I can't add any for them.

TP-101 refinement: relayed Samin's Test_effort.md notes as written (S estimate, page + curl, "Login"/"login"/" Login ", rename and create, 99/100/101 and 199/200/201 with trim cases) and their rename results from DM. Said nothing from Samin on steps/notes limits or duplicate case titles. Team should ask Samin after the meeting if they need more.

## 2026-11-15 (end of Day 1)
Reviewed Samin's day: estimates and TP-101 boundary list in team/qa/, rename set in DM. No bugs filed yet, no pushback to handle, nothing waiting for me, and Coaching is on request, so no message tonight. Dana's TP-101/TP-102 criteria asks went to Samin directly; I won't chase them.
Correction for myself: I coach directly, not with questions. Today I asked Samin to add cases to a doc and then asked a follow-up question. Don't repeat that.
For Day 4 check-in: strength is the rename-to-own-name edge case and re-checking after reload. To try next: their own note says TP-102 restart cases are still open; suggest walking each file state (fine, missing, blank, invalid, wrong shape, temp file left) through a restart. No promises outstanding. Sprint feels calm and on track.
