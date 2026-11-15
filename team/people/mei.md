# Journal: Mei Lin (Frontend, web page)

Private working notes. Newest entries at the bottom.

## 2026-11-11
New product: TestPal (team/PRODUCT.md). I own the web page in testpal/public/. Building the v0 page on top of Rafi's API before Sprint 1.


## 2026-11-15
Built the v0 page in testpal/public/: checklist list and create/rename/delete, test cases add/edit/delete, Pass/Fail/Blocked/Not run with a note, summary tiles, export link. Server errors show as-is in a banner. Buttons disable while a request runs. Pure logic lives in public/ui.js with tests in test/ui.test.js (52/52 green). Smoke-tested every call with curl on port 4510 using a temp data file. Didn't commit (pre-sprint baseline). Feeling good, it came together quickly. Nothing missing from Rafi's API.
