# AqStoqFlow HR/Payroll Wave 1 - Correction Proof Redaction Report

Date: 2026-06-30
Selected skills:
- `aqstoqflow-hrpayroll-04-access-privacy-actions`
- `aqstoqflow-payroll-command-center`

Selected phase and executable slice: Phase 2 command-center proof drawer hardening plus Prompt 04 access/privacy replay for correction proof identifiers.

## Decision

READY FOR NEXT SLICE.

Correction run proof is now permission-aware. The payroll run workbench service redacts correction proof identifiers before they reach the browser unless the actor has salary-level payroll permission or payroll evidence-style proof permissions. The proof drawer discloses the redaction policy instead of exposing raw hashes.

This keeps correction run proof useful for operators while preventing broad payroll readers from receiving prior-run proof anchors, original calculation hashes, or correction evidence hashes.

## Implemented

- Added `redaction.correctionProofIdentifiers` to `PayrollRunWorkbenchData`.
- Evaluated correction proof identifiers with the existing `proof_hidden_identifier` redaction policy.
- Allowed correction proof visibility when either:
  - payroll salary/person amount access is allowed; or
  - proof identifier policy permissions allow access.
- Preserved payroll module denial as fail-closed redaction even if a non-payroll proof permission is present.
- Redacted returned correction proof fields server-side:
  - `originalRunDocumentHash`
  - `originalRunEvidenceHash`
  - `originalCalculationHash`
  - `correctionEvidenceHash`
- Added `correctionProofAccess` to the payroll run workbench read audit payload.
- Updated `PayrollRunWorkbench` proof drawer redactions to show `payroll.correctionProofIdentifiers` with `kontava-proof-hidden-identifier-policy` when identifiers are hidden.
- Added focused service and component coverage for allowed and denied correction proof states.

## Files Changed

- `services/payroll/payroll-control.service.ts`
- `services/payroll/__tests__/payroll-run-workbench.service.test.ts`
- `components/payroll/PayrollRunWorkbench.tsx`
- `components/payroll/__tests__/PayrollRunWorkbench.test.tsx`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

Related policy-gate hardening from the prior slice remains in the worktree:

- `scripts/workflow-assurance-runtime-table-check.js`
- `scripts/__tests__/workflow-assurance-runtime-table-check.test.js`

## Verification

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-run-workbench.service.test.ts components/payroll/__tests__/PayrollRunWorkbench.test.tsx --runInBand`
  - 2 suites passed
  - 10 tests passed
- `npm run typecheck`
- `npx eslint services/payroll/payroll-control.service.ts services/payroll/__tests__/payroll-run-workbench.service.test.ts components/payroll/PayrollRunWorkbench.tsx components/payroll/__tests__/PayrollRunWorkbench.test.tsx`
- `git diff --check -- services/payroll/payroll-control.service.ts services/payroll/__tests__/payroll-run-workbench.service.test.ts components/payroll/PayrollRunWorkbench.tsx components/payroll/__tests__/PayrollRunWorkbench.test.tsx`
- `npm run service:boundary:fail`
  - Active service-boundary violations: 0
- `npm run policy:gates`
  - Inventory boundary: pass
  - Service boundary: pass
  - Workflow assurance runtime: ready
  - Payroll immutability runtime: ready
  - Hard delete gate: pass
  - Regulatory hardcode gate: pass
  - Demo/report trust gate: pass
  - Raw error boundary gate: pass
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-tenant-boundary.service.test.ts services/payroll/__tests__/payroll-privacy.service.test.ts --runInBand`
  - 2 suites passed
  - 6 tests passed

## Evidence Lines

- `services/payroll/payroll-control.service.ts`: DTO exposes `correctionProofIdentifiers` redaction state.
- `services/payroll/payroll-control.service.ts`: read audit records `correctionProofAccess`.
- `services/payroll/payroll-control.service.ts`: service evaluates `PayrollRunWorkbench.correctionProofIdentifiers` with `proof_hidden_identifier`.
- `services/payroll/payroll-control.service.ts`: returned correction proof values are redacted before DTO return.
- `services/payroll/__tests__/payroll-run-workbench.service.test.ts`: allowed access returns raw correction proof and audited allow decision.
- `services/payroll/__tests__/payroll-run-workbench.service.test.ts`: missing permission returns `[REDACTED:IDENTIFIER]` and audited denial decision.
- `components/payroll/PayrollRunWorkbench.tsx`: proof drawer adds `payroll.correctionProofIdentifiers` redaction disclosure.
- `components/payroll/__tests__/PayrollRunWorkbench.test.tsx`: redacted drawer state renders policy and never renders raw `sha256:correction-evidence`.

## Security And Privacy Notes

- The UI still renders only service-owned DTO values and does not compute payroll truth.
- The close-readiness blocker still reads raw service metadata before DTO redaction, so hidden proof values can still block close correctly without leaking raw hashes to unauthorized readers.
- Redaction is audited with actor context through the existing payroll run workbench read audit.
- No new route, sidebar entry, export, adapter, or mutation workflow was added.

## Residual Risks

- Browser-authenticated smoke was not run in this slice; focused service/component/access gates were run instead.
- This does not complete full HR/payroll production readiness. It closes a correction-proof privacy gap for the implemented run workbench.
- Broader proof identifiers on payment/declaration/operator drawers should be reviewed with the same permission-aware pattern where raw provider, authority, or proof-chain IDs could expose sensitive operational details.

## Next Recommended Slice

Run authenticated route smoke for `/dashboard/payroll/runs` correction proof visibility and denied/redacted states once a payroll auth state is available. If auth state remains unavailable, continue service-backed payment/declaration adapter proof redaction with the same DTO-first pattern.