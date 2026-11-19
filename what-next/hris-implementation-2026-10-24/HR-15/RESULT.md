# HR-15 — Protected employment documents

Status: **VERIFIED (scoped engineering evidence; live provider admission remains disabled)**, subject to the matching sealed evidence manifest. Baseline `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886` plus preserved shared edits. HR-10/HR-14 dependency artifacts remain historical, not resealed after this slice.

Employees and explicitly authorized HR operators now have a protected document workspace with encrypted originals, trusted scan outcomes, independent review, current-scope downloads, expiry replacement items, immutable lineage and retention controls. Originals use a separate model and private gateway protocol, never the existing item-image/public-upload owner. Five additive migrations were applied and exactly replayed only on the owned synthetic PostgreSQL target. No automatic roles or country rules were added.

## Acceptance

| Criterion | Result | Current evidence |
|---|---|---|
| HR-15-AC01 tenant/employee/manager/guessed-ID/expired-link denial | PASS | Real tenant, other employee, metadata-only manager, actor-bound token, expired token, remapping during lock wait and post-fetch revocation cases; fresh-session/module unit cases |
| HR-15-AC02 quarantine/rejection/alternate-route isolation | PASS | Real scan failure/rejection denial, independent CLEAN-pending review exception, existing item-media owner cannot retrieve HR IDs; separate schema/routes/store |
| HR-15-AC03 replacement lineage and expiry work | PASS | Competing replacement approvals retain one successor and prior original; scoped expired-document replacement item; EN/FR workspace |
| HR-15-AC04 hold/evidence/storage failure reconciliation | PASS | Native evidence binding, duplicate/legacy evidence regressions, response-loss retries, provider identity mismatch, durable deletion tombstone and delayed-upload race |
| HR-15-AC05 own upload/retrieval EN/FR low width | PASS | Actual React workspace/client with real services/PostgreSQL and synthetic HTTP roles/store; 11 browser records at 360/768/1440; upload, pending, independent review, download and denial |

## Separate evidence classes

- Source/security review: independent reviewer R1–R6 and legacy R5 variant closed; final scoped source PASS. [Review](INDEPENDENT-REVIEW.md).
- Pure/mocked/component/authorization/provider-adapter protocol: **18 tests in 4 suites**, `unit-seal.log`.
- Real PostgreSQL plus named synthetic immutable encrypted store/scanner: **15 cases**, including browser fixture, `postgres-browser-seal.log`. Cleanup asserts no owned fixture organizations remain.
- Shared HR correctness PostgreSQL regressions: **60 cases**, `shared-correctness.log`.
- Rendered/browser: **11 result records**, `browser/results.json`; screenshots saved; French 360-pixel rendering visually inspected. Actual production authentication and full screen-reader certification were not exercised.
- Static: schema validation PASS; scoped TypeScript diagnostics 0 in sealed log; workflow contract and owned diff checks PASS. No full application build or generated-client engine replacement.
- Not established: live gateway integration, actual malware detection efficacy, approved employer retention/hold policy, backup/key disaster recovery, production performance, legal/statutory certification or live pilot. These remain admission conditions, not fabricated successful tests.

Initial failing logs remain in the evidence directory: the first PostgreSQL run exposed void advisory-lock result deserialization; schema validation initially lacked an explicit isolated URL; one typecheck found an optional-provider narrowing error. Each was corrected before the final listed checks.

## Review lenses

Architecture/backend/database: existing employee, transactions, locks and audit owners retained; separate immutable document version, native evidence guard and no generic workflow rewrite. Security/privacy: explicit raw permissions, fresh server identity/module gate, clean review boundary, post-fetch authorization, authenticated ciphertext and short-lived grants. Product/workflow: upload/review/retrieve/replace/retain with status and recovery; expiry is distinct from retention. UI/accessibility/localization: existing primitives, EN/FR, keyboard submission, responsive widths and scoped denied state; broader assistive certification unclaimed. QA/SRE: provider uncertainty, tombstones, identity binding, hashes and preserved failures. Country/records: configuration requires actual approved policy; no OHADA-wide retention assumption. Payroll/accounting: immutable legacy/native evidence preserved; no payslip/payment/ledger effects. Commercial operations: module and permissions enforced; explicit live pilot gate. AI, inventory functionality, purchasing and statutory rule expansion are not applicable.

See [operations](OPERATIONS.md) for provider contract, deployment inputs, additive migration order, rollback and recovery. **Next eligible: HR-16**, automatically under the user's ordered-continuation instruction. Live document admission remains gated while engineering continues.
