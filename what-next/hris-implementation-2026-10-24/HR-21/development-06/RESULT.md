# HR21 development06 — leave request and independent approval

Status: **VERIFIED_SCOPED**. Overall HR21 remains **IMPLEMENTED_PENDING_VERIFICATION**. Development continues without a hosting dependency.

Fixed the team time-approval queue remaining stale after a decision receipt was dismissed. The panel now refreshes the server-owned queue on receipt dismissal, following the existing approval-inbox pattern. It does not refresh or submit a decision when a user only previews, cancels, or confirms their password. No backend or schema changes were needed.

## Verification, separated by evidence type

- **Independent source review:** PASS_SCOPED_SOURCE_ONLY from `/root/hr09_independent_review`. Queue refresh and test-runner findings were addressed. The reviewer did not run tests or query the database.
- **Mocked UI tests:** 26 passed across three suites. The saved pre-change component reproduced the missing refresh: one regression failed and one passed. Current tests cover refresh only after receipt dismissal and no refresh/mutation on undecided close.
- **Real browser and database:** 12 stages passed using actual Next pages, native credential/session/password actions, Chromium and the dedicated PostgreSQL database. These are stages of one connected synthetic journey, not 12 independent exhaustive test cases.
- **Bounded TypeScript:** zero diagnostics for the changed panel and its regression, including imports.
- **Evidence startup:** two negative preflight checks passed; both replaced stale evidence and failed before database/browser creation. Workflow contract and owned diff checks passed.
- **Cleanup:** synthetic tenant, employee and credential identities removed; session/account absence checked. Owned Next process tree and PostgreSQL stopped; both loopback ports closed.

## Observed business outcomes

The fixture started with one explicitly ACTIVE linked employee, independently approved time policy and 480-minute weekday schedule, and a native 480-minute entitlement credit. This prerequisite is not proof of hiring activation or Cameroon statutory entitlement.

The employee requested 0.5 day through the actual self-service screen: 240 minutes, REQUESTED, and balance still 480. Password verification required an explicit subsequent submission. Repeating the same request returned the same ID with `created:false` and produced no duplicate.

The application denied self-review even after temporary HR permission was granted to the requester. It rejected a stale facts version without a debit. Revoking reviewer authority rejected the decision and cleared the private preview. Expired password assurance opened a nested confirmation, retained the decision, and did not automatically submit it.

The independent review committed successfully while the test deliberately dropped its browser response. Explicit recovery submitted the unchanged decision and displayed the retained receipt. Database assertions confirmed exactly one -240-minute debit, one APPLIED leave event, one PENDING outbox message and one retained review receipt. Final balance: **240 minutes**. No outbox worker or external notification ran.

Closing that receipt visibly removed the request from the reviewer's pending queue. The French 390-pixel self-service view displayed the approved leave and 480 − 240 = 240 balance. Receipt and French screenshots were inspected. These checks do not certify full accessibility or localization; the unrelated payment section still displays a raw missing-evidence status.

## Evidence reliability and limits

Earlier attempts remain in timestamped result snapshots: cold compilation timeout, stale SSR element handling, exact-label mismatches, unavailable browser response body, and caught root configuration drift. The runner now resolves live controls, targets the review textbox directly, captures and forwards the real replay response with a bounded wait, and always reports cleanup. Final source/runtime hashes include the frozen runner and affected production files.

The shared TypeScript configuration difference was compared and recorded before reconciliation; root files were preserved. Source inspection, mock tests and real browser/database results are distinct claims. Credential login used native HTTP inside the browser context; this does not test the login form. Stale facts, permission revocation and assurance expiry were controlled fixture injections. Provider operation, production deployment, legal certification, human acceptance and complete HR lifecycles remain outside this result.

Next ordered development slice: actual shift/attendance browser workflow, followed by populated payroll-input handoff and effective termination. See [NEXT.md](NEXT.md). Failed historical artifacts remain evidence of attempts, not additional passing coverage.
