# WP6 decision — command read models and operator UX

Decision date: `2026-08-22`  
Decision: `APPROVED_FOR_WP7_INTERNAL_ENGINEERING_ONLY`  
Production authorization: `NO`

## Decision basis

WP6 is accepted for internal engineering progression. Payroll lifecycle truth is now projected once on the server and consumed by the command read model and run workbench. The projection exposes the current stage, next legal transition, RBAC availability, fresh-auth and maker-checker requirements, transition-proof classification, controlled-write status, and blockers without exposing actor identifiers.

The operator surfaces submit only run/version/idempotency/evidence inputs to the existing protected actions. Tenant, actor, permission, and authentication facts remain server-derived. Missing post-cutover proof and disabled controlled writes fail closed; legacy partial evidence remains explicitly partial and is never upgraded to verified history.

## Verification

- Focused WP6 suites: `8/8` passed, `61/61` tests passed.
- TypeScript typecheck: passed with no diagnostics.
- Focused ESLint: passed with zero findings.
- Focused `git diff --check`: passed.
- Targeted payroll route/browser smoke: `2/2` passed.
- Purchasing/AP: `11/11`, including `goods_receipt_atomic_stock_posting`.
- Report trust: `35/35`.
- Offline POS replay: `16/16`.
- Workflow-assurance static release: `38/38`.
- Payroll presence: `14/14`.
- Service-boundary ratchet: zero active violations.
- CI release gate: `11/11`.

## Honest limitations

The broad payroll route-smoke suite remains `7 passed / 2 failed` for the same inherited prerequisite mismatches observed before WP6: singular/plural contract-unavailable copy, and route tests that expect authorization calls inline although authorization is centralized through `withPayrollSurfaceAccess`. WP6 added no new route-smoke failure.

The full policy chain correctly stops at statutory country-pack readiness `11/12` because `source_artifact_expert_approval` is absent. This is an external production-certification blocker, not a WP6 engineering defect. The inherited dirty tree, migration approval evidence, raw-error findings, and local Prisma runtime protocol also continue to prohibit production approval.

## Promotion

WP7 is authorized only for focused gate ratcheting, mutation fixtures, disposable-PostgreSQL concurrency, idempotency, and rollback certification. WP8 remains unauthorized until WP7 produces saved passing evidence and no HIGH or CRITICAL invariant remains.
