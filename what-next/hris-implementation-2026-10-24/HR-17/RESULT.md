# HR-17 — Accountable starter and leaver tasks

Status: **VERIFIED_SCOPED**, gated by the evidence seal. Baseline HEAD `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886` plus preserved shared working-tree changes. Manual task attestation is implemented; no external connector or production pilot is qualified.

Native lifecycle approval creates an atomic set of four configured HR/access/asset tasks with independent owners/reviewers, effective dates, due dates and prerequisites. Repeated approval/application delivery produces one set. Cancellation and reviewed replacement preserve completed evidence and cancelled history. A task completion never changes employment or performs an account/provider operation. The protected bilingual workspace supports evidence submission, independent verification, failure, retry, return and configured replacement-owner recovery. The permission-scoped HR Tasks navigation reaches it directly.

Existing owners were assessed before adding the narrow ledger: balance cases are financial, assurance incidents are system controls and module steps own provisioning. The concurrently present Command Center occurrences coordinate seven aggregate source conditions (OPEN/ASSIGNED/WAITING/REVIEWED); they have no per-employee lifecycle/evidence completion owner. This slice reuses BusinessEvent/audit/native lifecycle and preserves those unrelated owners.

| Acceptance | Result | Evidence |
|---|---|---|
| AC01 one starter/leaver set under replay | PASS | Real DB concurrent repeated delivery; native approval/application identity |
| AC02 future rescheduling preserves current employment/access | PASS | Atomic rejection/replacement, retained completed evidence, separate replacement approval and new effective dates; EN/FR browser reschedule |
| AC03 assigned, evidenced outcomes without false external completion | PASS | Strict evidence inputs, independent manual attestation, dependency gate, account usability/inactive checks; no account/provider writer |
| AC04 failed integration remains visibly failed with retry/escalation | PASS, simulated failure/manual workflow | Fake external failure recorded outside DB transaction, FAILED state/history, explicit manual RETRY, configured support; no real connector claimed |
| AC05 restricted task/evidence scope | PASS | Tenant/owner/reviewer/current-role checks, revoked assignee, restricted configured replacement reviewer, cross-tenant/document denials and browser unassigned/revoked views |

Verification classes:

- Source review: independent reviewer R1–R5 closed, PASS_SCOPED; no independent runtime execution.
- Mocked unit/action/component/navigation: **44 tests in 5 suites**, `unit-final.log`. Includes native lifecycle compatibility, permission/module wrappers, exact retry and postcommit read failure.
- Real owned PostgreSQL: **12 tests**, `postgres-browser-final.log`, including actual component browser integration; bounded synthetic fixtures removed. Shared correctness: **60 tests**, `shared-correctness.log`.
- Browser: **14 result records** in `browser/results.json`; EN/FR at 360/768/1440, keyboard evidence submission, starter/leaver review, failure/retry, future reschedule, restricted views; current compiled application CSS. Synthetic session/action transport exercises actual components/services, not production Next authentication/session delivery. Screenshot inspected; full WCAG/assistive certification not claimed.
- Provider: fake failing external service only; no execution adapter or live connector. Manual attestation is labelled explicitly.
- Schema, additive migration replay, scoped no-emit TypeScript, workflow and owned diff pass; exact commands/timestamps/hashes in manifest.

Initial unit run detected the new navigation item out of alphabetical order and its expected list missing the item. Both were corrected; the failed log remains retained. Review-driven fixes and regression details are in INDEPENDENT-REVIEW.md.

Architecture/backend/data: small employee-bound task ledger, existing event identity and audit, atomic source hooks and employee→task locking. Security/privacy: explicit narrow task permissions, live account/role checks, no assignment-based HR escalation and independently authorized document links. Workflow/design: existing primitives/tokens, bilingual owner/due/dependency/history, retained failed input and truthful completion type. Product/operations: accountable manual work and reviewed source rescheduling; named HR/IT/asset/support owners still require employer configuration. SRE/release: explicit failure/retry, current hashes, pause without deleting history. Finance/statutory: no payroll, country-rule or accounting changes. AI, inventory and purchasing: not applicable. Providers: only manual evidence and separately owned workflows.

Before a real pilot, approve template owners/evidence/due rules and select any pre-activation source events for a bounded backfill. Native hooks cover new transitions; an empty task list does not certify historical coverage. See OPERATIONS.md. No production schema, external messages, actual account revocation or deployment occurred.

Next eligible: **HR-18 daily HR work queue and operating metrics**, automatic continuation. Historical evidence is not resealed when shared files evolve.
