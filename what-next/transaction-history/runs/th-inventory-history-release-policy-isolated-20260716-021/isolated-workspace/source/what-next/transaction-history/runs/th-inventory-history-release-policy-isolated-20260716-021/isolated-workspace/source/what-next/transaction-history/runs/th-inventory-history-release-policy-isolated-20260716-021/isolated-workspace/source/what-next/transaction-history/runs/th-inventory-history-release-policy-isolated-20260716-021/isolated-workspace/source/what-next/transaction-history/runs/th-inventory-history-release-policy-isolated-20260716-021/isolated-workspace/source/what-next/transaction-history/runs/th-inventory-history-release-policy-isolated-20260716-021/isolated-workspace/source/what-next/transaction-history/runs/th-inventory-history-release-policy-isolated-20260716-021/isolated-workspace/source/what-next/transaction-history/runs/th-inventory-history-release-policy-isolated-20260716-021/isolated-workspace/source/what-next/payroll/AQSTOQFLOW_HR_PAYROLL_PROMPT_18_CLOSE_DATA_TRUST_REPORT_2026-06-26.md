# Aqstoqflow HR/Payroll Prompt 18 Close Assurance And Data-Trust Expansion Report

Date: 2026-06-26
Skill: aqstoqflow-hrpayroll-18-close-data-trust
Status: Implemented with one environmental aggregate release-gate blocker

## Source Of Truth

- Skill: C:\Users\J COMPUTER\.codex\skills\aqstoqflow-hrpayroll-18-close-data-trust\SKILL.md
- Prompt suite: docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md
- Relevant prior reports:
  - what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_15_REGISTER_TIEOUT_REPORT_2026-06-26.md
  - what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_16_DECLARATION_LIFECYCLE_REPORT_2026-06-26.md
  - what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_17_PAYMENT_RECONCILIATION_REPORT_2026-06-26.md

## Prerequisite Gate

- Register tie-out exists: PASS.
- Declaration lifecycle exists: PASS, with known limitation that production authority adapter mappings remain blocked until expert-reviewed/regulator-confirmed inputs exist.
- Payment workflow and reconciliation evidence exist: PASS.
- Close-impact source catalog exists: PASS.
- Safe implementation scope: PASS. This slice only expanded server-side data-trust/close evidence signals and did not add UI-first surfaces, dashboard shadow services, client-computed payroll truth, or duplicated payroll calculations.

## Implementation

Updated `services/accounting/data-trust.service.ts` to expand payroll close/data-trust evidence from source-owned payroll records:

- Added payroll source tables to the data-trust certificate scope:
  - payroll_run_lines
  - payroll_payslips
  - payroll_declaration_evidence
  - payroll_payment_allocations
  - payment_transactions
- Added server-side data-trust scans for:
  - advanced declarations without append-only lifecycle evidence
  - declarations still in lifecycle processing
  - declaration amendment evidence count
  - released/partially-settled payment batches still unsettled
  - payment batches missing reconciliation evidence, linked transaction, or reconciliation status
  - payment batches missing payslip allocations
  - posted/paid run lines missing payslip proof
  - emitted payslips with empty proof hashes
  - paid runs without settled payment evidence
  - posted payroll runs/payments missing ledger/source-link evidence
- Expanded payroll module evidence so accountant/close trust reports show register, payslip, declaration, payment, ledger, and source-link readiness as facts.
- Expanded certificate evidence text so certified accountant trust packs explicitly include payroll register tie-out, payslip proof, payment settlement, and declaration lifecycle evidence scans.

Updated `services/accounting/__tests__/data-trust.service.test.ts`:

- Added mocks for payroll run lines, payslips, and declaration evidence scans.
- Kept the clean ledger-backed trust pack certified.
- Added focused coverage proving Prompt 18 blockers prevent certified trust when payroll register/declaration/payment/payslip evidence is incomplete.

## Files Changed By This Prompt

- services/accounting/data-trust.service.ts
- services/accounting/__tests__/data-trust.service.test.ts
- what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_18_CLOSE_DATA_TRUST_REPORT_2026-06-26.md

The worktree contains many unrelated pre-existing changes; they were not reverted or intentionally modified by this prompt.

## Validation

Passed:

- `npm test -- services/accounting/__tests__/data-trust.service.test.ts --runInBand`
  - 1 suite passed, 10 tests passed.
- `npm test -- services/accounting/__tests__/close-assurance.service.test.ts services/accounting/__tests__/close-assurance-pack.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts --runInBand`
  - 3 suites passed, 19 tests passed.
  - Jest reported an open-handle warning after completion; tests passed.
- `npm run typecheck`
  - Passed after a longer rerun. First attempt timed out without diagnostics.
- `npm run lint`
  - Passed with 5 existing warnings and 0 errors.
- `npm run prisma:validate`
  - Passed.
- `npx prisma generate --no-engine`
  - Passed after normal `npm run prisma:generate` hit the known Windows native engine DLL rename lock.
- `npm run service:boundary:fail`
  - Passed, 0 active service-boundary violations.
- Standalone policy gates that completed:
  - `npm run hard-delete:fail`: passed.
  - `npm run regulatory:hardcode:fail`: passed.
  - `npm run demo:trust:fail`: passed.
  - `npm run error:boundary:fail`: passed.
  - `npm run payroll:immutability:runtime`: passed; required triggers 8/8, forbidden mutation checks blocked 12/12, allowed lifecycle checks passed 3/3.

Blocked / not fully claimable:

- `npm run prisma:generate`
  - Blocked by Windows EPERM rename lock on `node_modules\.prisma\client\query_engine-windows.dll.node`.
  - Active `npm run dev` / Next dev server processes are running in this workspace and likely hold the DLL.
- `npm run policy:gates`
  - Aggregate command stopped at `workflow:assurance:runtime-check` before reaching later gates.
  - The checker reported missing workflow-assurance runtime tables and migration rows, then failed the Prisma runtime query because the client was generated with `--no-engine` after the DLL lock.
  - A one-shot no-engine URL protocol conversion was attempted without printing secrets, but Prisma required a valid no-engine API key, so it is not the correct local DB path.

## Single-Source-Of-Truth Review

Preserved:

- Services own payroll and close trust facts.
- Dashboard/accountant surfaces receive server-provided facts only.
- No client-computed payroll truth was introduced.
- No duplicated payroll monetary metrics were introduced.
- No dashboard-specific payroll shadow service was introduced.
- No speculative UI route was added.
- No finalized payroll evidence is mutated in place.
- Declaration automation remains truthfully limited until reviewed adapter mappings exist.

Risks avoided:

- Avoided computing close readiness from UI payloads.
- Avoided asserting statutory or authority submission success beyond existing manual evidence lifecycle.
- Avoided hiding payroll evidence gaps behind a generic payroll status.

## Remaining Blocker

The code slice is implemented and focused validation is green, but the aggregate release gate cannot be claimed until the workflow assurance runtime gate can run against a suitable DB/client state.

Recommended resolution:

1. Stop or restart the active Next dev server only when safe, so normal Prisma engine generation can replace the locked DLL.
2. Run `npm run prisma:generate` successfully with the normal engine.
3. Ensure the target runtime DB has workflow assurance migrations applied:
   - 20260621103000_workflow_assurance_registry_foundation
   - 20260621113000_workflow_assurance_incident_spine
4. Rerun:
   - `npm run workflow:assurance:runtime-check`
   - `npm run policy:gates`

## Recommended Next Action

Resolve the workflow assurance runtime DB/client blocker above, rerun the aggregate policy gates, then proceed to `aqstoqflow-hrpayroll-19-assurance-release-gates`.
