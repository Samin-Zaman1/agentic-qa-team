# Start here

Welcome to the TestPal team, Samin. You're our **QA Engineer**, reporting to Priya (QA Lead). The team builds
**TestPal**, a personal testing assistant: a small web app where people keep test cases in checklists, run them,
mark each one pass or fail, and share a summary. Read [PRODUCT.md](PRODUCT.md) first. It's short, and it says
how to run the app.

## Your job

Your job is **testing**. Paperwork is kept to a minimum on purpose:

- **Test:** explore TestPal, test tickets once they're *Ready for QA* on a green build, and retest fixes.
- **Report:** file clear bugs with a severity. This is the one thing worth writing well.
- **Speak up in a line or two:** questions on a ticket, "this one looks hard to test", go/no-go at the end.

You don't attend meetings. **Priya represents QA** and passes on what you've posted in chat, nothing more. The
team only messages you when you need to act.

## Your Guide

The **Guide** panel on the right is always there. Drag its left edge to make it wider or narrower. It has two tabs:

- **Plan:** what to do now, step by step, and what comes after. It keeps up with the team by itself (new messages,
  builds, board changes). When you finish the first task, press **Done, what's next?**.
- **Ask:** ask it anything, such as how to do a step, how to test a ticket, or for a second look at a draft.

A dot on a tab means there's something new there. Only you see the Guide.

## Who's who

| Person | Role | Go to them for |
|---|---|---|
| **Priya Nair** | QA Lead, your manager | Feedback, "how should I test this?", preparing for a disagreement |
| **Dana Okafor** | Product Manager | "What should it do?", scope, priority, whether we can ship |
| **Tomas Reyes** | Project Manager | Status, deadlines, who's blocked, schedule pressure |
| **Rafi Haddad** | Backend developer | The server and API, saving data, validation and error messages |
| **Mei Lin** | Frontend developer | The web page: forms, buttons, lists, what you see and click |
| **Jonas Berg** | Frontend developer | The summary (counts, pass rate) and the markdown export |

More detail is in [TEAM.md](TEAM.md).

## Your day

There's no clocking in. Your day starts when you open the office and start working, and the office notes when you
stop. When you've stopped, the team wraps up the day: afternoon meetings, code, reviews and fixes. Their updates
are waiting for you when you come back the next day.

A day usually looks like this:
1. Glance at the Guide's plan, or at the morning post in *General*.
2. Test: what's *Ready for QA* first, then retests, then exploring.
3. File what you find. Answer anyone who's waiting on you.
4. Stop when you're done. The office takes care of the rest.

## Where things are

| Where | What it's for |
|---|---|
| **Chat** | *General*, *Sprint 1* (work, board updates, CI results), *Bugs*, and a DM with each person. @mention people, or `@team` for everyone. Posts that mention nobody are picked up by Tomas. |
| **Board** | The sprint board. The outlined columns are yours: **Start testing**, **Pass QA**, **Reopen**. **🐞 File a bug** opens the bug form. Retest fixed bugs from the bug table. |
| **Builds** | CI. Every branch is checked and tested on each new commit. Test only green builds. |
| **Handbook** | These pages, the tickets, the bugs, your QA space (`team/qa/`), templates and team history. |

## Sprint 1

1. **Day 1:** run TestPal (`npm run testpal`) and explore it. Skim the six tickets. If you have questions on
   TP-101 or TP-102, post them in #Sprint 1 (they're refined this afternoon).
2. **QA-1:** 3–5 lines in #Sprint 1: the riskiest tickets and what you'll test first.
3. **QA-2:** while the devs build, keep exploring v0 and file the bugs you find. Then fill in the short
   regression checklist from what you learned.
4. **Test** each ticket once it's *Ready for QA* and its build is green (how-to in [WORKFLOW.md](WORKFLOW.md)).
   *Pass QA* tells the owner to merge. *Reopen* sends it back. The comment box is your QA note.
5. **Day 10:** run the regression checklist on `main`, then post go or no-go in one message.
