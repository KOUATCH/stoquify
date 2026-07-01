# AqStoqFlow HR/Payroll Wave 1 - Correction Evidence Operator Proof Report

Date: 2026-06-30
Selected skill: aqstoqflow-payroll-command-center
Phase: Phase 2 command-center/read-model/proof drawer hardening
Scope: Surface correction evidence proof in the service-owned payroll run workbench and operator proof drawer.

## Decision

READY FOR NEXT SLICE.

This slice closes the operator visibility gap for correction proof created by the payroll kernel. Correction runs now expose original-run proof anchors and the generated correction evidence hash through the service-owned read model, the inline proof list, and the controlled proof drawer. The UI remains display-only and does not compute authoritative proof.

## Implemented

- Extended `PayrollRunWorkbenchData.runs[].correction` with:
  - `originalRunDocumentHash`
  - `originalRunEvidenceHash`
  - `originalCalculationHash`
  - `correctionEvidenceHash`
- Mapped correction proof from service metadata first, with original-run relation fallback for original proof hashes.
- Expanded the payroll run workbench inline proof list for correction runs:
  - Original document
  - Original evidence
  - Original calculation
  - Correction evidence
- Expanded the payroll proof drawer rows for correction runs:
  - Original run
  - Original document hash
  - Original evidence hash
  - Original calculation hash
  - Correction evidence hash
- Added focused assertions that service fixture metadata reaches the operator-facing drawer.
- Re-ran policy gates, refreshing payroll immutability runtime evidence artifacts.

## Files Touched

- `services/payroll/payroll-control.service.ts`
- `services/payroll/__tests__/payroll-run-workbench.service.test.ts`
- `components/payroll/PayrollRunWorkbench.tsx`
- `components/payroll/__tests__/PayrollRunWorkbench.test.tsx`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

Note: `payroll-control.service.ts` already contains a large pre-existing worktree delta. The behavioral change in this slice is limited to correction proof read-model fields and mapping.

## Verification

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-run-workbench.service.test.ts components/payroll/__tests__/PayrollRunWorkbench.test.tsx --runInBand`
  - 2 suites passed
  - 7 tests passed
- `npm run typecheck`
- `npx eslint services/payroll/payroll-control.service.ts services/payroll/__tests__/payroll-run-workbench.service.test.ts components/payroll/PayrollRunWorkbench.tsx components/payroll/__tests__/PayrollRunWorkbench.test.tsx`
- `git diff --check -- services/payroll/payroll-control.service.ts services/payroll/__tests__/payroll-run-workbench.service.test.ts components/payroll/PayrollRunWorkbench.tsx components/payroll/__tests__/PayrollRunWorkbench.test.tsx`
- `npm run service:boundary:fail`
  - Active service-boundary violations: 0
- `npm run policy:gates`
  - Inventory boundary: pass
  - Service boundary: pass
  - Workflow assurance runtime check: ready
  - Payroll immutability runtime: ready
  - Hard delete gate: pass
  - Regulatory hardcode gate: pass
  - Demo/report trust gate: pass
  - Raw error boundary gate: pass

## Evidence Lines

- Service DTO exposes correction proof fields: `services/payroll/payroll-control.service.ts`
- Service mapping resolves metadata correction hashes: `services/payroll/payroll-control.service.ts`
- Inline proof list displays correction evidence: `components/payroll/PayrollRunWorkbench.tsx`
- Proof drawer displays correction evidence hash: `components/payroll/PayrollRunWorkbench.tsx`
- Service test asserts `sha256:correction-evidence`: `services/payroll/__tests__/payroll-run-workbench.service.test.ts`
- Component test asserts inline and drawer rendering of `sha256:correction-evidence`: `components/payroll/__tests__/PayrollRunWorkbench.test.tsx`

## Residual Risks

- This does not claim full HR/payroll production readiness. It advances the correction-proof/operator-evidence portion of the roadmap.
- Browser-authenticated smoke was not run in this slice; this was a service/component/test-gate pass.
- Existing untracked payroll workbench files remain part of the current worktree state and should be preserved.

## Recommended Next Slice

Continue Phase 2/3 by hardening payroll run command-center actions around correction lifecycle operations:

1. Add service-backed correction/run lineage filters and drilldowns in `/dashboard/payroll/runs` if the route currently lacks them.
2. Add denied/redacted proof drawer states for correction proof when salary/payroll evidence permissions are absent.
3. Add close-readiness blockers that explicitly reference missing `correctionEvidenceHash` on correction runs, if not already covered by the broader register proof blocker.
4. Follow with payment/declaration adapter proof surfacing once correction run truth is fully visible.