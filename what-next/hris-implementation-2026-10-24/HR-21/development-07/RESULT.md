# HR21 development07 — shift and attendance workflow

Status: **VERIFIED_SCOPED**. Overall HR21 remains **IMPLEMENTED_PENDING_VERIFICATION**. Development does not depend on deployment details.

Three integration fixes are complete. The attendance closure link now opens the time-request review inbox. Closing a schedule decision receipt reloads the current employee/date/period roster while preserving the selected attendance file, preview and import receipt. Failed reload retains the confirmed receipt; authority denial clears protected working data. Finally, a cache revalidation error after a successful import no longer discards the committed owner result—the workspace separately checks the current state.

## Evidence classes

- **Independent source/evidence review:** see INDEPENDENT-REVIEW.md; reviewer does not execute tests or query the database.
- **Pure and mocked checks:** 41 passed across five suites covering roster interaction, action boundaries, shift planning and minute allocation. Saved pre-change reproduction: five failing new assertions and 35 passing checks. An intermediate five-second test timeout under concurrent compilation is retained; final tests use a bounded 30-second allowance with unchanged business assertions. Existing React key warnings are not represented as a clean-console certification.
- **Real browser/native/database journey:** 15 stages passed using actual Next routes and actions, native credential/session/password verification, Chromium and the dedicated local PostgreSQL database. These are stages of one connected synthetic journey, not 15 independent exhaustive scenarios. Final source and runtime hashes matched; zero uncaught page errors; cleanup complete.
- **Bounded TypeScript:** zero diagnostics for the two production files and two affected test roots, including imports. After the run, another task excluded one unrelated documentation browser entry from the shared root configuration; compiler options and all other root fields are unchanged. The check uses explicit roots. `postrun-configuration-review.json` records tested/current hashes and the exact difference. The tested runtime was not rewritten.
- **Startup/evidence checks:** two negative preflight probes passed before database/browser creation. Workflow contract and owned diff checks passed. Configuration differences from concurrent public-build generated types were explicitly compared and recorded; root files were preserved.
- **Cleanup/shutdown:** owned synthetic tenant/employee/identities removed, session/account absence checked; only the owned Next process tree and HR test database stopped. Ports35583 and55464 closed.

## Observed outcomes

The explicitly ACTIVE employee, reviewed calendar/policy and recurring Monday480-minute baseline are fixture prerequisites. Wednesday September30 and Thursday October1 have zero baseline minutes. The test uses two adjacent one-day periods across a month boundary, not complete monthly payroll periods or statutory Cameroon rules.

The browser rejected an incorrect timezone offset with the specific shift-plan validation error. A valid Africa/Douala shift from September30 22:00+01:00 to October1 06:00+01:00, less a30-minute unpaid break, produced **450 minutes wholly on the local start date**. A separate reviewer published the plan through the controlled facts/evidence/acknowledgment dialog. Receipt dismissal visibly refreshed the published roster. Employee EN and narrow FR views showed450minutes on September30 and0 on October1.

An actual CSV upload retained two observations: September30 scheduled450/worked420/absent30 and October1 allzero. Exact import replay retained the same batch and two original entries. The importer could not certify their own observations; revoking the certifier's permission also denied the actual server action. Those denial probes used authenticated native HTTP calls, not rendered permission-revocation flows.

Independent certification retained420worked/30absent. Repeating it created no duplicate certificate. The adjacent zero-work day remained a validated zero observation with **certification blocked because no work was scheduled**; no artificial zero-work certificate was created.

The employee submitted and replayed a correction request for450worked/0absent through self-service; exactly one request remained. Pending correction blocked certification. The actual closure review link reached the time inbox, where a separate reviewer approved the correction. A native currentness assertion rejected the old certificate as stale, and browser certification rejected reused approval evidence. Fresh independent evidence created a linked **450-minute FROZEN successor**, while the original became SUPERSEDED. Original payload, source hash, minute totals and the complete raw420-minute observation stayed unchanged. Exact certification replay left two certificates; the adjacent day still had no certificate. No payroll runs were created.

## Limits and retained attempts

Saved failures cover the initially invalid all-zero recurring fixture, the mistaken expectation that a no-scheduled-work day could be certified, a click before the newly loaded review page hydrated, and caught shared generated-types configuration drift. Each browser attempt cleaned its owned data; preflight failures created no database client. The final runner waits for the live review control before clicking and checks specific denial reasons.

Password sign-in uses the native HTTP endpoint inside browser contexts; the login form is outside scope. Fixture role revocation is deliberate fault injection. Screenshot inspection covered the published boundary schedule, narrow French view and retained certificate history; this is not full accessibility/localization certification. The closure row still presents original absence minutes alongside the explicitly labelled corrected worked minutes; database assertions verify corrected absence0. No changes to backend business calculations, schema, live providers, notifications, payroll execution or deployment were required. Human operator acceptance remains later release work.

Next: populated HR_CORE_WITH_HANDOFF browser qualification, then effective termination. See [NEXT.md](NEXT.md). Historical evidence remains unchanged; rollback should reverse only these bounded changes against the saved roster/action baselines, preserving subsequent work.
