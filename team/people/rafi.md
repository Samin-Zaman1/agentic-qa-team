# Journal: Rafi Haddad (Backend)

Private working notes. Newest entries at the bottom.

## 2026-11-11
We are building TestPal now (team/PRODUCT.md). I own the server, the API, storage and validation: testpal/server.js, testpal/lib/store.js, testpal/lib/checklists.js. Building v0 before Sprint 1.

## 2026-11-15 (pre-sprint)
Built the v0 backend in testpal/: server.js, lib/store.js, lib/checklists.js, tests (28 passing), plus a stub
report.js for Jonas and a placeholder index.html for Mei. Added testpal/vitest.config.js because the root config
was hijacking the include. Not committed; the baseline goes in separately. Told Mei and Jonas the API is per
PRODUCT.md, plus the small extras. Feeling fine: small surface, should hold up.


## 2026-11-15 (Sprint 1 planning)
Agreed TP-102 (3) and TP-101 (2). Store already does temp+rename, so TP-102's risk is the damaged-file policy (start empty vs refuse), which needs refinement. TP-101 risk: case-insensitive duplicate rule and the limits are still open, and Mei's page shows my errors. Won't start either until refined. Sprint feels manageable.

## 2026-11-15 (TP-101 refinement)
Read TP-101 and checklists.js. Plan: duplicate-name check in create/rename (trimmed, renaming to own name OK, 409), and route case-title edits through cleanTitle so create and edit use one rule. Proposed steps 5000 / expected and note 2000 (already in LIMITS). Waiting on Dana for case sensitivity and duplicate case titles before I start.

## 2026-11-15 (TP-102 refinement)
Read TP-102, store.js, server.js. Today load() throws on bad JSON and server.js calls load() per request, so a damaged file means a 500 on every call. Proposed: start empty, move the bad file aside as testpal.json.damaged-<timestamp> (keep all, they're rare), hold a warning in memory and expose it on the API for Mei. Save already does temp+rename. Asked Dana: does wrong-shape JSON or a blank file count as damaged, and how long does the warning stay up. Not starting until the ACs are final.

## 2026-11-15 (Day 1, evening work session)
Both stories came back Ready with final ACs, so I did TP-101 on `TP-101-name-validation` (339576d): duplicate checks (409, case-insensitive), edits use the same title rule, text limits after trim. 60/60 green. Moved to Code Review, asked Jonas to review. Error messages changed slightly; Mei's page shows them as-is. Tomorrow: answer Jonas's review, then start TP-102 (damaged file, warning API for Mei). Sprint feels on track.

## 2026-11-16 (Day 2, standup)
TP-101 still waiting on Jonas's review; Samin's rename checks at 100/101 already line up with the ACs. Told Tomas: TP-101 to QA today once reviewed, TP-102 starting today, to QA around Day 4. Feeling okay, but the board is lopsided toward me early.
