# HR21 development09 — termination correctness

Status: **VERIFIED_SCOPED** for the termination correctness and browser workflow described below. Overall HR21 remains **IMPLEMENTED_PENDING_VERIFICATION**. Independent source findings are closed; final source/evidence consistency review is recorded in INDEPENDENT-REVIEW.md.

Termination now preserves the inputs needed for a final intersecting payroll-handoff period. The termination date is the first date no longer employed; the preceding date is the last employment day. A source that ended earlier is not extended. Draft and never-effective intentions are cancelled explicitly, and previously suspended or ambiguous sources require review. Native attendance certification admits a dated leaver with an intersecting employment interval while retaining the existing certification, locking and authority controls.

The handoff remains an input package: this change does not calculate statutory pay or split multiple contract/compensation segments. Multiple contract segments and duplicate component segments remain explicit blockers. Approved source, document, destination and time evidence remain required. Application account access is handled separately from employment termination; a reviewed task records evidence rather than performing an external action.

## Changes

- `services/hris/lifecycle.service.ts`: calendar-date admission and bounded closure/cancellation with previous-status provenance.
- `services/hris/payroll-handoff-read.service.ts`: bounded ended-source admission, exclusive cutoff and explicit unresolved-source blockers.
- `services/payroll/payroll-control.service.ts`: narrowly changed attendance-freeze population to support final-period certification after termination. No schema or payroll calculation change.
- `components/hris/payroll-handoff-copy.ts` and `HrisPeopleAuthoring.tsx`: English/French blocker and departure-date explanations.
- `components/hris/HrisLifecycleTasks.tsx`: restore the existing dashboard theme/content wrappers in normal and denied views so task refresh controls inherit a readable foreground. No global palette or authorization change.
- Focused lifecycle/handoff test fixtures, dedicated Jest configuration and isolated evidence runners. Original snapshots are saved beside this report; unrelated working-tree changes are preserved.

## Verification classes

| Class | Result |
| --- | --- |
| Independent source inspection | PASS_SCOPED after fixes; separate reviewer did not execute tests |
| Original-source PostgreSQL reproduction | 13 checks: 11 expected failures and 2 passes; owned fixtures cleaned |
| Current-source PostgreSQL regressions | 21/21 passed, including seven rejected attendance cases with unchanged snapshots/events/period; source hashes checked; fixtures cleaned |
| Pure/mocked/component tests | 96/96 across 8 termination/handoff/payroll suites plus 8/8 employee-authoring component tests |
| Bounded TypeScript | 0 diagnostics for the six changed production roots |
| Actual Next/Chromium/native-auth/PostgreSQL workflow | 13/13 stages passed; no failures or page errors; 51 source and 7 runtime hashes matched; synthetic cleanup verified |
| Evidence-runner negative startup | 2/2 passed before DB/browser creation, replacing stale success evidence |
| Rendered task-control contrast | 5/5 passed: EN/FR refresh 15.61:1, EN/FR filter 12.84:1, French denied refresh 5.17:1; actual denied view has zero task rows |
| Workflow contract and owned diff | Passed |

Commands and side-effect classification are in PLAN.md and VERIFICATION.md; outputs are retained in the adjacent logs. Original-source reproduction loads three saved service snapshots against otherwise current dependencies. It is a bounded reproduction, not a historical checkout certification. Browser attempt01 failed because the harness matched a client-only request discriminator. Attempt02 stopped after ten successful stages when a pending password dialog hid the background refresh control. Both failed attempts and successful cleanup are retained. The final runner matches the serialized TERMINATE request and uses normal protected-route re-entry/password verification at task reload boundaries.

Attempt03 also stopped at ten stages: native retained-command replay required renewed password assurance. Its failed result and cleanup are retained. The replay helper now renews through the actual read/password UI only when required and retries the unchanged envelope once. The final single-approval history assertion remains mandatory. Password age and server authorization are unchanged.

Attempt04 passed all thirteen functional stages and cleanup, then full-resolution screenshot inspection identified unreadable refresh text on the task page. That historical pass and the before-theme screenshot are retained. The final run includes the local theme fix, computed contrast checks for five EN/FR controls (including the denied view), and an actual protected refresh after removing the owned synthetic reviewer's permissions. No task details may remain visible after denial.

## Browser scope and limitations

Routes: `/en/dashboard/people/manage`, `/en/dashboard/people/tasks`, `/en/dashboard/people/handoff`, and `/fr/dashboard/people/tasks`. Synthetic preparer, independent reviewer and addressed recipient use real credential sign-in and native cookies. English desktop viewport is 1440×1000; French narrow viewport is 390×844. Screenshots support bounded visual inspection, not full accessibility or localization certification.

Approved employment, contract/document, compensation and payment-destination prerequisites are declared fixtures. Attendance certification uses the native service after termination. Separate account deactivation is an explicit synthetic database fixture; the subsequent denial uses the existing authenticated browser session and native action. This does not qualify an account-administration UI, external connector or employer policy. Assets and external-access tasks remain open. Future departure tasks remain open and the future employee remains active.

The employee-administration payment label is not payment-workflow evidence: the prerequisite fixture supplies approved destination provenance but lacks the method/masked display fields used by that projection. The screenshot can therefore show "Not verified" despite the separately tested handoff prerequisites. Route re-entry recovery is tested; preserving an already open password modal across background task refresh is not claimed here.

Final native outcome: the due employee is TERMINATED at the exclusive October15 cutoff, contract/compensation end October14, and exactly one lifecycle application event exists. The future employee remains ACTIVE with no application event. One retained package contains 480 leaver worked minutes and 900 total worked minutes. Eight tasks remain: due HR_PREPARATION and APPLICATION_ACCESS are independently completed, due ASSETS/EXTERNAL_ACCESS remain open, and all four future tasks remain open. Application access has REVIEWED_MANUAL_ATTESTATION provenance. Original package bytes remain unchanged; zero payroll runs/payment batches. English termination and French narrow task screenshots were visually inspected for this bounded workflow.

No live payroll run, payment, production migration, deployment, external delivery or real operator acceptance. No hosting information is needed for the next development slice. See NEXT.md for actual hiring/source-authoring qualification.

## Recovery

No schema change requires reversal. To investigate a regression, use the saved original-source snapshots and the exact isolated runner rather than reverting shared files wholesale. Reject or repair unresolved source provenance through existing reviewed workflows; do not manually reactivate cancelled assignments to force export. Synthetic fixture cleanup is verified. The verified owned Next launcher and disposable PostgreSQL instance are stopped; ports35585/55464 are confirmed closed. Evidence sealing checks these results and rereads every manifest hash.
