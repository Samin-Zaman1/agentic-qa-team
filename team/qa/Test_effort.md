TP-101: S. Page and curl on the API. Blank and spaces-only names, length just under, at and over the limit, "Login" vs "login" vs " Login ", rename as well as create. Risk: the limits aren't decided yet.
What is the limit for too long names?
What happens if a save is interrupted midway?

TP-102: L. Save file data/testpal.json plus a server restart. Invalid JSON, empty file, missing file, an interrupted save, then check the backup copy and the error on the page. Risk: "start empty or refuse to start?" is still open.
i need to figure out the cases regarding the server restart

TP-103: M. Page. Each status filter, the "x of y" count, the empty state, marking a case while a filter is on, reload and switching checklists. Risk: multi-select would make it bigger.

TP-104: S. Page. Confirm or cancel for checklists and cases, the count shown in the message, reload after delete. Risk: Escape and click-outside behavior isn't decided.
TP-105: M. The export, pasted into a ticket. Failed and blocked cases with notes, the "nothing needs attention" case, notes with line breaks and markdown characters. Risk: whether Not run cases belong in the section.
TP-106: M. Page and GET /api/checklists/:id/summary. The 12 of 20 example, 0 cases (no NaN), 1 of 3 rounding, the export matching the page. Risk: whether Blocked counts as run.

TP-101 boundary cases (limits counted after trimming, per Dana):
Checklist name (max 100):
- 99 chars → saved
- 100 chars → saved
- 101 chars → rejected, error states the 100 limit
- ' ' + 100 chars → saved, shows without the space, still there after reload
- 100 chars + ' ' → saved, shows without the space, still there after reload
Test case title (max 200):
- 199 chars → saved
- 200 chars → saved
- 201 chars → rejected, error states the 200 limit
- ' ' + 200 chars → saved, shows without the space, still there after reload
- 200 chars + ' ' → saved, shows without the space, still there after reload
