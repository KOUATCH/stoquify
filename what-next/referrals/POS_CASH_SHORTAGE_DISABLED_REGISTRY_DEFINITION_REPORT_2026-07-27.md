# POS Cash-Shortage Disabled Registry Definition Report

Date: 2026-07-27

## Outcome

Phase 3 / Slice 12 is certified complete.

Stoquify now has a code-owned Workflow Assurance definition for `pos.closed_shift_cash_shortage.review`, but it is explicitly disabled and has no registered runner or runtime activation path.

## Before

- Slice 11 provided a pure adapter from read-only POS cash-shortage batch output to Workflow Assurance multi-finding runner output.
- Workflow Assurance had no code-owned definition metadata for the POS cash-shortage check.
- The release gate treated every definition as active runner-ready evidence, so adding a disabled staged definition would have created a false blocker.

## After

- `services/assurance/assurance-registry-contracts.ts` includes `pos.closed_shift_cash_shortage.review` with:
  - `enabled: false`
  - `enforceMode: false`
  - `workflow: "pos"`
  - `ownerRole: "branch_manager"`
  - `requiredPermission: "pos.transactions.read"`
  - source tables limited to `business_events` and `cash_shortage_policies`
  - metadata marking the definition as staged only, with activation blocked by runner registration, worker checkpoint contract, POS-specific lifecycle gating, and production policy entry.
- `scripts/workflow-assurance-release-gate.js` now classifies disabled definitions separately from active checks.
- Active definitions still require registered runners, source hash strategy, evidence links, test references, and scheduler mode policy.
- Disabled staged definitions require complete definition metadata but do not require runner activation evidence.

## Activation State

Still absent:

- No `CHECK_RUNNERS` entry for `pos.closed_shift_cash_shortage.review`.
- No registry service reference to `pos.closed_shift_cash_shortage.review`.
- No call to `loadPosShiftCashShortageEvaluationBatch` from the registry service.
- No worker, scheduler, checkpoint, lease, watermark, dead-letter behavior, route, action, dashboard, notification, incident persistence, production threshold, inventory behavior, AI authority, or WhatsApp authority.

## Verification

Passed:

- `npm test -- --runInBand services/assurance/__tests__/assurance-registry-contracts.test.ts services/assurance/__tests__/assurance-registry.service.test.ts services/leakage/__tests__/pos-shift-cash-shortage-assurance-adapter.test.ts scripts/__tests__/workflow-assurance-release-gate.test.js scripts/__tests__/workflow-assurance-multi-finding-persistence-migration.test.js`
- `npm run typecheck`
- `npx eslint services/assurance/assurance-registry-contracts.ts services/assurance/__tests__/assurance-registry-contracts.test.ts services/assurance/__tests__/assurance-registry.service.test.ts services/leakage/__tests__/pos-shift-cash-shortage-assurance-adapter.test.ts scripts/workflow-assurance-release-gate.js scripts/__tests__/workflow-assurance-release-gate.test.js`
- `npm run workflow:assurance:release-gate`
- `npm run workflow:assurance:runtime-check`
- `npm run service:boundary:fail`
- Static activation scan against runtime registry/action/app/config/prisma/script surfaces

## Guardrails Preserved

- Broad registry runs still query `enabled: true`.
- The cash-shortage check is visible as staged metadata but cannot be selected by normal active registry scans.
- The release gate now displays staged checks as `disabled` instead of silently demanding an unauthorized runner.
- No cash-shortage incident can be persisted through this definition because no runner invokes the Slice 11 adapter.

## Remaining Blockers

- Runner input gating is still unselected.
- POS-specific owning-source lifecycle recheck and maker-checker closure are still unselected.
- Worker checkpoint, overlap, retry, lease, watermark, and dead-letter contracts are still unselected.
- Production policy entry, detector activation, dashboard, route, action, notification, and inventory-loss workflows remain unauthorized.

## Next Handoff

Return to `/stoquify-referral-war-room` to select at most one Slice 13 candidate. No Slice 13 is preselected.
