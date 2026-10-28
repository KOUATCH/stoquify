# AqStoqFlow Skill 008 — Compliance Center Execution Report

Date: 2026-08-15  
Selected skill: `008-aqstoqflow-compliance-center`  
Active chunk: Chunk 07 — Immutable Fiscal Evidence + Authority Submission Workflow  
Result: **PARTIAL PASS — DEVELOPMENT/SANDBOX READY; PRODUCTION BLOCKED**

## Executive result

The compliance kernel is credible for deterministic development and sandbox use, but the capability is not proven for production authority submission. This run corrected two high-severity control defects without weakening the existing production fail-closed boundary:

1. Fiscal-document creation now rejects a posted ledger source that has no accounting source link.
2. Authority submission now uses an explicit worker-owned lease and executes the adapter call outside every database transaction.

The country-adapter development gate is ready at 16/16 and the statutory development gate is ready at 11/11. Production remains blocked by missing qualified-expert approval and external authority evidence. No production adapter, statutory claim, or live authority workflow was enabled.

## Implemented controls

### Posted-source and evidence integrity

- `createFiscalDocumentFromPostedSource` fails closed when the posted batch has no `AccountingSourceLink`.
- The failure occurs before fiscal-document, compliance-evidence, or business-event creation.
- The existing tenant-scoped posted-batch lookup, canonical payload hashing, idempotency key, audit event, and submission outbox flow remain intact.

### Lease ownership and retry safety

- Submission leasing now uses tenant-scoped compare-and-set (`updateMany`) claims instead of an unconditional update after discovery.
- Expired or incomplete leases are reclaimable.
- A worker that loses the compare-and-set race receives no leased submission.
- Processing requires an explicit worker identity.
- Direct processing through a caller-owned Prisma transaction is rejected.
- Pending and retry-scheduled submissions are claimed atomically; active leases owned by another worker fail with a conflict.
- Retry scheduling now respects `maxAttempts`; exhausted retry requests finalize as failed.

### External authority-call boundary

- Preparation and lease claim commit in one database transaction.
- Submitted-payload evidence, request hash, and dispatch state commit in a separate transaction.
- `adapter.submit(...)` executes with transaction depth zero.
- Authority response/rejection evidence and final submission/document state commit in a final transaction.
- Adapter exceptions become controlled retry evidence without exposing raw exception text.
- Production submissions remain blocked.

## Automated evidence added

- Missing accounting source link rejects fiscal creation and produces no fiscal/evidence/business-event writes.
- Worker identity is mandatory.
- Caller-owned database transactions are rejected for authority processing.
- The Cameroon sandbox adapter is asserted to run outside a database transaction.
- Expired lease reclamation uses a tenant-scoped compare-and-set claim.
- Existing accept, reject, outage, credential, evidence, and lifecycle-event scenarios continue to pass.

## Verification results

| Gate | Result | Evidence |
| --- | --- | --- |
| Compliance tests | PASS | 9 suites, 39 tests |
| Focused changed-path tests | PASS | 2 suites, 12 tests |
| TypeScript | PASS | `tsc --noEmit` |
| Prisma schema | PASS | schema valid |
| Focused ESLint | PASS | 0 findings |
| Full ESLint | PASS WITH WARNINGS | 0 errors; 3 unrelated existing warnings |
| Regulatory import boundary | PASS | 0 violations across 1,750 checked files |
| Service boundary ratchet | PASS | 0 active violations |
| Country adapter pilot | PASS FOR DEVELOPMENT | 16/16; production authority certification remains false |
| Statutory country-pack development | PASS | 11/11; development/sandbox only |
| Statutory country-pack production | BLOCKED AS DESIGNED | 11/12; `source_artifact_expert_approval` missing |
| Raw-error boundary | BLOCKED OUTSIDE SCOPE | 4 pre-existing findings in `services/onboarding/master-data-csv.ts`; none in compliance |
| Production build | COMPILE PASS / PACKAGE BLOCKED | Compiled successfully, lint/type validation passed, 9/9 static pages generated; Windows refused standalone symlink creation with `EPERM` |
| Full repository Jest regression | BLOCKED OUTSIDE SCOPE | Existing failures across unrelated route, readiness, payroll, fixture, and Jest ESM contracts; run also retained open child handles and was stopped after failure was conclusive |

## Production blockers

The compliance capability must not be classified as production-proven until all of the following evidence exists:

- Official DGI technical contract validated.
- Independent expert production review and conflict declaration attached.
- Qualified-expert approval artifact for the statutory source manifest verified.
- Regulator production credentials provisioned through an approved secret manager.
- External sandbox conformance executed and retained as immutable evidence.
- Production build packaging completed in an environment that permits required standalone symlinks.
- Repository-wide release gates return to green or carry reviewed, time-bounded baselines.
- First-class compliance-obligation and reminder lifecycle is completed if required by the target country-pack rollout; current operator visibility is queue/configuration-centric.

## Files changed by this run

- `services/compliance/fiscal-document.service.ts`
- `services/compliance/certification-outbox.service.ts`
- `services/compliance/__tests__/fiscal-document.service.test.ts`
- `services/compliance/__tests__/certification-outbox-processing.test.ts`
- `what-next/skill-008-country-adapter-pilot-readiness-2026-08-15.md`
- `what-next/skill-008-country-adapter-pilot-readiness-2026-08-15.json`
- `what-next/skill-008-statutory-country-pack-development-readiness-2026-08-15.md`
- `what-next/skill-008-statutory-country-pack-development-readiness-2026-08-15.json`
- `what-next/skill-008-statutory-country-pack-production-readiness-2026-08-15.md`
- `what-next/skill-008-statutory-country-pack-production-readiness-2026-08-15.json`
- `what-next/AQSTOQFLOW_SKILL_008_COMPLIANCE_CENTER_EXECUTION_REPORT_2026-08-15.md`

The workspace was already materially dirty. Existing user changes, including compliance lifecycle-event changes in shared files, were preserved and not reverted.

## Handoff

Next numbered skill: `009-aqstoqflow-payment-reconciliation-moat`.

Do not begin Skill 009 as a production-release continuation until the Skill 008 production blockers above are explicitly accepted or closed. Development work may proceed while the production boundary remains fail-closed.
