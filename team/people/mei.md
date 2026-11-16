# Journal: Mei Lin (Frontend, web page)

Private working notes. Newest entries at the bottom.

## 2026-11-11
New product: TestPal (team/PRODUCT.md). I own the web page in testpal/public/. Building the v0 page on top of Rafi's API before Sprint 1.


## 2026-11-15
Built the v0 page in testpal/public/: checklist list and create/rename/delete, test cases add/edit/delete, Pass/Fail/Blocked/Not run with a note, summary tiles, export link. Server errors show as-is in a banner. Buttons disable while a request runs. Pure logic lives in public/ui.js with tests in test/ui.test.js (52/52 green). Smoke-tested every call with curl on port 4510 using a temp data file. Didn't commit (pre-sprint baseline). Feeling good, it came together quickly. Nothing missing from Rafi's API.

## 2026-11-15 (Sprint planning)
Agreed TP-104 at 2 and TP-103 at 3. Starting TP-104 first once it's refined. Promised to agree the progress field name for TP-106 with Jonas early. Risks I named: open questions on 104 (which deletes confirm, Escape/outside click) and filter-refresh behaviour on 103. Feeling upbeat, kind of itching to start before refinement but I'll wait.

## 2026-11-15 (end of Day 1)
TP-104 and TP-103 are still DRAFT, so I did not start, even though I really wanted to. Asked Tomas/Dana for TP-104 refinement tomorrow (Day 2). Kept my promise to Jonas: proposed `run` and `progress` as the TP-106 field names on the ticket. No reviews waiting. Bit restless, but fine.

## 2026-11-12 (Day 2 standup)
Gave standup: TP-104 and TP-103 still DRAFT, not started. Asked for TP-104 refinement today (two open questions), then TP-103. Promised Tomas QA handoff dates: TP-104 to QA about Day 4, TP-103 about Day 6, if refinement happens today. A bit antsy, both my tickets are blocked on refinement.
