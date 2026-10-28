# WP4 decision — Protected actions and HRIS event completion

Decision: `APPROVED_FOR_WP5_INTERNAL_ENGINEERING_ONLY`

Captured: `2026-08-22T07:34:56Z`

Selected skills:

- `012-aqstoqflow-payroll-presence-engine`
- `aqstoqflow-hris-payroll-08-time-leave-attendance`

## Implemented boundary

- Added independent protected server actions for payroll run review, payslip emission, and posting; retained the already-split approval action.
- Every lifecycle action derives organization, actor, permissions, and verified fresh-auth time from the protected server context. Client-supplied identity or assurance fields are overwritten before schema validation.
- Review, approval, emission, and posting each require their dedicated permission, payroll module entitlement in enforce mode, handler-derived tenant scope, and fresh authentication no older than 300 seconds.
- Declaration preparation now requires fresh authentication before permission evaluation or service invocation.
- Leave approval now records canonical `LEAVE_APPROVED` business-event and outbox evidence in the same tenant-scoped transaction as request-state persistence, the leave-balance debit, audit evidence, and final event application.
- `HrisTimeRequest.decisionBusinessEventId` is populated from that event, and the request update remains tenant-constrained.
- Event-creation failure occurs before request persistence or balance mutation; final `APPLIED` status occurs only after persistence, balance, and audit operations.
- The existing HRIS leave action continues to enforce server-derived tenant/actor/permissions, fresh authentication, manager scope, requester/approver SoD, approval evidence, and certified balance sufficiency.

## Live verification

| Check | Result |
|---|---|
| Focused action plus operational-time suites | PASS — 32/32 |
| Combined canonical event, WP2–WP4 lifecycle/action/HRIS suite | PASS — 72/72 |
| TypeScript project compile | PASS — no diagnostics |
| Focused ESLint on four WP4 files | PASS — zero findings |
| Diff whitespace check | PASS |
| Collapsed payroll action export scan | PASS — absent |

Negative cases include missing step-up authentication for review, approval, emission, posting, and declaration preparation; client attempts to supply tenant/actor/permissions/auth-time; requester self-approval; canonical event-persistence failure before leave mutation; and existing lifecycle CAS/SoD/idempotency/rollback failures from WP3.

## File hashes

| File | SHA-256 |
|---|---|
| `actions/payroll/payroll-control.actions.ts` | `A7D72904C319EC608C5B5303D263A94E9A4B99149B3F004AC4F36D36931E4B71` |
| `actions/payroll/__tests__/payroll-control.actions.test.ts` | `A19EEC7C16B6E54CFAD43658E2C1987160118A4F0E973B2B589D043572B148CB` |
| `services/hris/operational-time.service.ts` | `C6B2EE7F1BCF688E5A36C8782E012B79B6E60CAC246353119F59F3C260F748C2` |
| `services/hris/__tests__/operational-time.service.test.ts` | `59E74E91C816D8AD92D92FAFC7E6DFE53D479EF8BFD4B686640511BE65B5F26C` |

## Promotion limits

- WP5 is authorized only for internal engineering. No production, statutory, migration, or unrestricted-HRIS claim is made.
- Canonical event behavior is covered through the established business-event service plus focused transaction-order/failure tests; real PostgreSQL concurrency and failure injection remain mandatory in WP7.
- The inherited dirty tree, statutory expert approval, and destructive-migration approval evidence remain external release blockers.
- Existing receipt inspection, payroll calculation, payment, declaration payload, match-exception, country-pack, and unrelated domain behavior were not modified by WP4.