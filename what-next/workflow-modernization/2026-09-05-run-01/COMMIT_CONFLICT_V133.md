# Bounded sale recovery conflict — v133

Evidence date: 2026-09-13. This is a focused continuation of the full workflow review. Branch, commit and dirty source bindings are captured in `evidence/source-baseline-v133.json`. All unrelated changes remain intact. No deployment, migration, live payment or X1 clearance occurred.

## Finding and correction

The recovery service reused the internal commit replay assertion. A mismatched original request caused `POSSaleCommitReplayConflict`, whose `existing` property contains the stored commit record and result envelope. Unlike the mutation path, the recovery path did not translate it before the protected action's generic error logger received it. This was a log exposure risk confirmed by the exception structure and logger call; no external log leak is claimed.

The service now catches only that internal exception after the read transaction and throws an `ApplicationError` with code `DUPLICATE_KEY_CONFLICT`, HTTP status 409 and a fixed message. It includes no stored record, attempted hash, result envelope or original cause. Other errors retain their existing behavior. Matching scope and original-request validation still occur before reading the sale summary. Recovery remains read-only; the ordinary permission audit is unchanged. No commit auditing or financial effect is added to a result lookup.

The new regression test initially failed (`70dab5`): the internal untyped exception escaped. That initial test also used the wrong status property name, `statusCode`; inspection of ApplicationError corrected it to `status`. Additional tests run the actual recovery action, service and protected error handler with controlled database delegates, checking both the response and the logger's error object for absence of stored evidence. An unrelated database error is propagated unchanged, never converted into not-found or a request conflict.

## Verification

- 45 tests / 3 suites passed (`aa6dd6`): `services/pos/__tests__/commit-recovery.service.test.ts`, `actions/pos/__tests__/commit-recovery.actions.test.ts`, `services/pos/__tests__/pos.service.test.ts`.
- Typecheck passed (`7105dc`): bundled Node, `node_modules/typescript/bin/tsc --noEmit --pretty false`.
- Both changed TypeScript files passed ESLint (`86eda8`): `services/pos/pos.service.ts`, `services/pos/__tests__/commit-recovery.service.test.ts`.
- Actual owned PostgreSQL verification passed (`d6f8b3`), report `lanes/environment/commit-conflict-v133-bcde4f02-1d8d-45fd-875b-89335c53d1e8.json`: a changed tender produces a bounded 409 without effects; foreign tenant/actor still receives not-found; the exact original request remains readable under a read-only grant after the conflict. Ordered financial and commit registry snapshots are unchanged.

The runtime script checks the owned target `stoquify_local_registration_20260906_01` before creating synthetic cash/posting fixtures. It invokes no external provider. The returned service error, not a browser-injected status, establishes this result. Tests are proportionate to the changed service error boundary; no new browser run or accessibility certification is claimed for v133. The preceding v132 EN/FR, reload, lost-response and responsive screenshots are historical evidence for its UI source. The service changed afterward, and the current binding is v133.

## Operating guidance and review

Routes remain `/en/dashboard/pos` and `/fr/dashboard/pos`. Retain the pending request after a failed lookup. A conflict means that its contents do not match the original server request; do not edit identifiers to force acceptance or start a second sale as a recovery shortcut. Support needs the request reference, organization, cashier, terminal/session and approximate time, obtained from the recovery panel and authenticated workspace. Authorized support must compare the original registry and business records. Browser storage is not evidence of payment.

Backend/architecture: narrowly translate an internal exception at the service boundary. IAM/privacy: no stored result in public conflict or generic error logging; current permission and tenant checks unchanged. Data/finance: identical read transaction, no additional financial or registry effects. QA/SRE: tests cover logger inputs and failures; real database evidence confirms original recovery remains possible. UX/localization: existing EN/FR failure panel retains the draft; no new visible state or token. Audit/API: ordinary protected action audit unchanged. Packaging/operations: read access remains separate from permission to sell. Country/statutory, HRIS/payroll, AP, analytics, AI, offline and external provider rules are not applicable to this patch because none changes; their workflows remain in scope for the platform review. These are engineering assessments, not professional approvals.

Remaining engineering work includes closed-tab/cross-device result discovery, cart revision binding, full receipt recovery, correction/offline/browser/accessibility paths and all other unfinished registered workflows. The provisional denominator remains explicit; neither POS nor the platform is complete. No external decision blocks ordinary continued implementation.
