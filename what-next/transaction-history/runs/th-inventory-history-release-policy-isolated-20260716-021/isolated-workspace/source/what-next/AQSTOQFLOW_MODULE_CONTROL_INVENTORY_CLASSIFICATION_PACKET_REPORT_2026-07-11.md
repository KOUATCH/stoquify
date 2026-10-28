# AqStoqFlow Module-Control Inventory Classification Packet Report

Date: 2026-07-11

Workspace: `E:\ohada saas\Focused projects\stoquify`

Mode: surgical, report-only

Skill: `aqstoqflow-module-surface-inventory-gate`

## Objective

Resolve the two module-control findings selected by the preceding settings and identity inventory packet without changing runtime authorization or enabling entitlement enforcement:

- Map `actions/modules/module-control.actions.ts` to its canonical commercial owner.
- Stop treating `services/modules/module-control-contracts.ts` as a runtime enforcement candidate.

## Evidence Inspected

- `C:\Users\J COMPUTER\.codex\attachments\d4300d6a-93c0-47d2-88d3-143976652de1\pasted-text-1.txt`
- `what-next/AQSTOQFLOW_SETTINGS_IDENTITY_MODULE_INVENTORY_CLASSIFICATION_PACKET_REPORT_2026-07-11.md`
- `what-next/module-surface-inventory.md`
- `what-next/module-surface-inventory.json`
- `scripts/module-surface-inventory.js`
- `scripts/__tests__/module-surface-inventory.test.js`
- `scripts/__tests__/module-surface-enforcement-first-pass.test.js`
- `actions/modules/module-control.actions.ts`
- `actions/modules/__tests__/module-control.actions.test.ts`
- `services/modules/module-control-contracts.ts`
- `services/modules/module-entitlement.service.ts`
- `services/modules/__tests__/module-entitlement.service.test.ts`
- `services/modules/module-catalog.service.ts`
- `app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx`
- `graphify-out/GRAPH_REPORT.md` and available graph artifacts

## Minimal-Change Approval

The live runtime evidence already showed:

- `getModuleControlCenterAction` is wrapped by `protect` with `MANAGE_SYSTEM_SETTINGS`.
- `observeModuleAccessAction` is wrapped by `protect` with `dashboard.read`.
- Both actions derive `organizationId`, `userId`, and permissions from the protected server context.
- The canonical `settings` catalog entry explicitly owns module-control surfaces.
- The contract file defines internal module-governance constants, types, and slug validation; it is not an independently callable route, action, API, report, export, or job.

Therefore, runtime action, service, RBAC, tenant, Prisma, and database code were left unchanged. The approved edit was limited to inventory inference and focused tests.

## Implementation

### Canonical ownership

`scripts/module-surface-inventory.js` now maps the exact action surface `modules/module-control.actions.ts` to the canonical `settings` module.

The regenerated record is:

- module: `settings`
- permission: `MANAGE_SYSTEM_SETTINGS`
- guard: `protect`
- classification: `mapped, enforcement candidate`

The action remains an enforcement candidate because this wave intentionally keeps module entitlement in report mode.

### Contract applicability

The exact file `services/modules/module-control-contracts.ts` is now classified as:

`not applicable: internal module governance contract`

This removes a false `unmapped, enforcement candidate` finding without claiming that the internal contract itself is an entitlement boundary.

### Inventory delta

- Surfaces inventoried: 306 before and after.
- Missing-permission findings: 16 before and after.
- Unmapped findings: 36 before, 34 after.
- Hard enforcement: unchanged and disabled.

## Changed Files

Direct code and test edits:

- `scripts/module-surface-inventory.js`
- `scripts/__tests__/module-surface-inventory.test.js`

Primary regenerated evidence:

- `what-next/module-surface-inventory.md`
- `what-next/module-surface-inventory.json`

Artifacts refreshed by required policy verification:

- `what-next/api-route-guard-inventory.md`
- `what-next/api-route-guard-inventory.json`
- `what-next/settings-surface-classification.md`
- `what-next/settings-surface-classification.json`
- `what-next/public-identity-abuse-readiness.md`
- `what-next/public-identity-abuse-readiness.json`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

Packet report:

- `what-next/AQSTOQFLOW_MODULE_CONTROL_INVENTORY_CLASSIFICATION_PACKET_REPORT_2026-07-11.md`

## Focused Verification

Command:

```powershell
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath scripts\__tests__\module-surface-inventory.test.js scripts\__tests__\module-surface-enforcement-first-pass.test.js actions\modules\__tests__\module-control.actions.test.ts services\modules\__tests__\module-entitlement.service.test.ts
```

Final current-worktree result:

- Test suites: 4 passed, 4 total.
- Tests: 60 passed, 60 total.
- Snapshots: 0.

The focused coverage proves:

- the protected module-control action maps to `settings`;
- its permission and `protect` guard remain visible;
- the internal contract cannot be reported as unmapped or enforceable;
- runtime tenant context and module-control permissions remain covered;
- entitlement-service contract consumers remain green.

Inventory regeneration:

```powershell
npm run module:surface:inventory
```

Result: passed; 306 report-mode records written.

## Release Gates

Passed independently on this packet:

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint` with 0 errors and 4 unrelated existing warnings
- `node scripts/workflow-assurance-release-gate.js --mode fail`: ready, 37/37 checks, 0 blockers
- `node scripts/kontava-moat-release-gate.js --mode fail`: ready, 0 blockers
- `npm test -- --runInBand`: 298 suites and 1552 tests passed
- `npm run build:app`: passed

`npm run policy:gates` passed completely at 2026-07-11T12:30Z on the then-current worktree, including zero active API guard, service-boundary, inventory-boundary, hard-delete, regulatory-hardcode, demo-trust, and raw-error findings.

The authoritative closing worktree changed concurrently after that pass. A clean `npm run verify:repo` retry then failed in `npm run policy:gates` because newly added public-identity work introduced one raw-error finding:

- file: `services/security/public-identity-abuse.service.ts`
- line: 205
- evidence: `throw error`
- gate: `scripts/raw-error-boundary-gate.js --mode fail`

All preceding checks in that same retry passed, including Prisma validation, typecheck, lint, inventory boundary, service boundary, API guard inventory, public identity abuse readiness (15/15), settings surface classification, workflow assurance, Kontava moat, receipt token configuration, payroll immutability, hard-delete, regulatory-hardcode, and demo-trust.

The stitched retry stopped at the raw-error gate before its build and Jest stages. The standalone full build and full Jest results above were obtained before that concurrent public-identity change; the four focused suites were rerun afterward and remain green.

An earlier `verify:repo` attempt reached its final Jest child but exceeded the outer 20-minute command timeout. Its orphaned verification process tree was identified by command line and terminated; no verification process from this packet remains running.

## Control Impact

- Tenant isolation: unchanged at runtime; focused action tests continue to prove server-derived organization scope.
- RBAC: unchanged at runtime; `MANAGE_SYSTEM_SETTINGS` and `dashboard.read` remain protected and tested.
- Module entitlement: inventory accuracy improved by two records; report mode remains enabled and hard enforcement remains disabled.
- Auditability: existing protected action audit resources remain unchanged.
- Redaction and safe errors: no response payload or error-boundary code was changed in this packet.
- Database safety: no schema, migration, seed, reset, or destructive database change was made.
- Release gates: packet-specific tests are green; the latest aggregate release state is red only on the concurrent public-identity raw-error finding described above.

## Residual Risks

- Current `verify:repo` is blocked by `services/security/public-identity-abuse.service.ts:205` until that workstream uses the canonical error mapper or receives a reviewed boundary classification.
- Module entitlement remains report-only. No commercial package enforcement was enabled.
- The inventory still contains 16 missing-permission and 34 unmapped classifications.
- `services/modules/module-entitlement.service.ts` remains `unmapped, enforcement candidate` even though it is internal cross-module entitlement infrastructure.
- `services/modules/module-catalog.service.ts` is currently inferred as `pos`, which is a false ownership signal caused by scanning catalog contents rather than the service's governance role.
- The production public receipt token secret is not configured; the gate correctly keeps this as a release-environment warning.
- Four unrelated lint/build warnings remain.
- The worktree contains broad concurrent enterprise-upgrade changes not owned by this packet.

## Next Safe Implementation Task

First restore the release baseline in a separate public-identity safe-error packet:

- inspect `services/security/public-identity-abuse.service.ts:205` and its focused tests;
- preserve serializable retry behavior;
- translate the final retryable database error through the canonical safe error boundary without leaking raw Prisma or provider details;
- add focused tests for retry exhaustion and redacted client behavior;
- run the public-identity focused suites, `node scripts/raw-error-boundary-gate.js --mode fail`, `npm run policy:gates`, and `npm run verify:repo`.

After that release blocker is green, resume Phase 3 with the remaining internal module-governance services:

- `services/modules/module-catalog.service.ts`
- `services/modules/module-entitlement.service.ts`

Classify those internal services from source evidence, add exact focused inventory tests, regenerate the report-mode artifacts, and keep hard enforcement disabled.
