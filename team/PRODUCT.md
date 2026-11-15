# TestPal: the product

**TestPal is a personal testing assistant.** It's a small web app that runs on your own computer. People use it
to keep their test cases in checklists, run through them, record what passed and failed, and share a summary.

Who it's for: anyone who tests something by hand (a QA engineer, a developer checking their own feature, a
student testing a class project) and is tired of keeping test cases in a notes app or a spreadsheet.

## Run it

```
npm run testpal        # then open http://localhost:4500
```

Data is saved in `testpal/data/testpal.json`. Delete that file to start from empty. To run a dev's branch, run
`node testpal/server.js` inside `.worktrees/<TICKET>/`. Set `TESTPAL_PORT` to use another port.

## What v0 does (already built, before Sprint 1)

1. **Checklists.** Create a checklist with a name, see all your checklists, rename one, delete one.
2. **Test cases.** In a checklist, add a test case with a title, optional steps, and an optional expected result. Edit it, delete it.
3. **Results.** Mark each test case **Pass**, **Fail**, **Blocked** or **Not run** (the default), with an optional note.
4. **Summary.** Each checklist shows how many tests are in each state, and the pass rate.
5. **Export.** Download a checklist's results as a markdown file you can paste into a ticket.

## How it's built

```
testpal/
  server.js            HTTP server and the JSON API                      (Rafi)
  lib/store.js         Saving and loading data/testpal.json              (Rafi)
  lib/checklists.js    Checklists, test cases, results, validation       (Rafi)
  lib/report.js        Summary counts and the markdown export            (Jonas)
  public/              The web page: index.html, app.js, style.css       (Mei)
  test/                Unit tests (vitest), owned by whoever owns the code under test
```

Plain JavaScript (ES modules), no build step and no dependencies beyond Node. Tests run with
`npm test --prefix testpal`, or with `../node_modules/.bin/vitest run` from inside `testpal/`.

## The API (how the page talks to the server)

All bodies are JSON. Errors return a 4xx status with `{ "error": "<message for a person>" }`.

| Method and path | Does |
|---|---|
| `GET /api/checklists` | All checklists: `[{ id, name, createdAt, counts }]` |
| `POST /api/checklists` `{ name }` | Create one. Returns the checklist |
| `GET /api/checklists/:id` | One checklist with its test cases |
| `PATCH /api/checklists/:id` `{ name }` | Rename |
| `DELETE /api/checklists/:id` | Delete |
| `POST /api/checklists/:id/cases` `{ title, steps?, expected? }` | Add a test case |
| `PATCH /api/checklists/:id/cases/:caseId` `{ title?, steps?, expected?, status?, note? }` | Edit a case or record its result |
| `DELETE /api/checklists/:id/cases/:caseId` | Delete a case |
| `GET /api/checklists/:id/summary` | `{ total, pass, fail, blocked, notRun, passRate }` (from `report.js`) |
| `GET /api/checklists/:id/export.md` | The results as markdown (from `report.js`) |

A checklist is `{ id, name, createdAt, cases: [...] }`. A test case is
`{ id, title, steps, expected, status, note, updatedAt }`, where `status` is `pass`, `fail`, `blocked` or `not-run`.
`passRate` is passed ÷ total, as a whole-number percentage.
