# AqStoqFlow HR/Payroll Wave 1 Controlled Run Action Drawers Evidence Report

Generated: 2026-06-29

## Decision

Status: IMPLEMENTED AND VERIFIED FOR THE CONTROLLED-PILOT SCOPE.

This slice converts `/dashboard/payroll/runs` lifecycle action forms into explicit controlled drawers for only the already-implemented protected actions: calculate run, approve/post run, prepare declarations, and release payment batches. The UI still renders service-owned run data and calls protected server actions; tenant scope, actor IDs, permissions, fresh-auth timestamps, and privileged action context remain server-derived.

## What Changed

- Reworked `components/payroll/PayrollRunActionPanel.tsx` from inline open `<details>` forms into controlled `Sheet` drawers opened by explicit action buttons.
- Kept unsupported/read-only next actions as links only; the drawer component returns `null` for action ids outside `calculate`, `approve-post`, `prepare-declarations`, and `release-payments`.
- Added drawer control summaries for required permission, fresh-auth/protected state, maker-checker state, source-register proof, and accounting source-link proof.
- Preserved idempotency-key generation/rotation per action, success/error/fresh-auth notices, loading-disabled submit buttons, and safe correlation-id display.
- Preserved payment release safeguards: service-owned payslip allocations only, redacted amounts block release, missing emitted payslips block release, missing payment destination proof blocks release, and a service-backed separate requester is required.
- Extended `components/payroll/__tests__/PayrollRunWorkbench.test.tsx` to open drawers before interacting with fields and to cover calculate, approve/post, prepare declarations, and release payments.

## Controls Preserved

- Fresh-auth: approve/post and release payment still go through protected server actions with `freshAuth: true`; the client never submits `lastAuthAt`.
- Maker-checker: drawer state shows the maker-checker requirement and payment release still requires a separate requester candidate from the read model.
- Redaction: redacted payroll amounts still disable payment release rather than allowing hidden amounts into the payload.
- Idempotency: each drawer submission includes a generated idempotency key and rotates it after success.
- Source-register proof: drawers display run proof from the read model and do not compute payroll proof in the browser.
- Tenant/actor safety: tests prove action payloads do not include `organizationId`, derived actor IDs, permissions, or fresh-auth timestamps.
- Denied/loading/error states: drawer notices render fresh-auth/error responses safely with correlation IDs, and submit buttons expose loading/disabled states.
- Route smoke: `/dashboard/payroll/runs` remains in the focused payroll route-smoke suite and browser smoke inventory.

## Validation

Passed:

- `npm test -- --runTestsByPath components/payroll/__tests__/PayrollRunWorkbench.test.tsx __tests__/payroll-dashboard-routes.smoke.test.tsx --runInBand`
  - 2 suites passed
  - 11 tests passed
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-run-workbench.service.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts --runInBand`
  - 2 suites passed
  - 16 tests passed
- `npm run prisma:validate`
- `npm run policy:gates`
- `git diff --check -- components/payroll/PayrollRunActionPanel.tsx components/payroll/__tests__/PayrollRunWorkbench.test.tsx`

Not clean:

- `npm run typecheck` failed on unrelated dirty-tree type errors in `services/owner-war-room/owner-war-room.service.ts` and `services/snapshots/tenant-operating-snapshot.service.ts` / `services/snapshots/snapshot-rebuild.service.ts`. No reported type errors referenced the touched payroll drawer or payroll workbench test files.

## Source Note

The selected local skill references `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`, but that file is not present in this checkout. This implementation followed the available 2026-06-28 run lifecycle report, the existing action drawer report, and the live protected action/read-model contracts.

## Remaining Blockers

Full payroll production remains blocked by the broader readiness items already documented in the payroll reports: statutory authority adapter certification, one clean controlled pilot payroll cycle, close reconciliation, and accounting/security/operations signoff.
