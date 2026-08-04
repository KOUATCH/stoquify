# AqStoqFlow Skill 011 Purchasing/AP Controls Execution

**Date:** 2026-07-26  
**Selected skill:** `011-aqstoqflow-purchasing-ap-controls`  
**Companion closure skill:** `011-aqstoqflow-ap-gate-closer`  
**Decision:** Internal control gate complete; advance to Skill 012

## Outcome

The supplier-invoice segregation-of-duties defect identified by the first 011
execution has been closed. The public workflow is now a persisted two-stage
process:

1. A maker prepares a supplier invoice and its three-way-match evidence in
   `MATCHED` status. Preparation derives the tenant and maker from the
   authenticated context and creates no supplier-ledger or accounting-ledger
   effects.
2. A different checker approves and posts the persisted invoice by ID. The
   posting action requires fresh authentication, derives the checker from the
   authenticated context, rejects self-approval, atomically claims the matched
   invoice, and then creates supplier-ledger, accounting, business-event,
   notification, close-invalidation, and audit evidence in the same database
   transaction.

No database migration was required; the existing `SupplierInvoiceStatus.MATCHED`
state and creator/approver fields provide the persistence boundary.

## Closed Control Gaps

| Control | Result |
|---|---|
| Persisted prepare-before-post workflow | Passed |
| Tenant and maker derived from authenticated preparation context | Passed |
| Client-supplied approver ignored | Passed |
| Posting requires fresh authentication | Passed |
| Checker derived from authenticated posting context | Passed |
| Maker and checker identity equality rejected | Passed |
| Concurrent approval claim fails closed | Passed |
| Preparation creates no supplier/AP ledger effects | Passed |
| Posting preserves three-way-match evidence | Passed |
| Ledger, event, notification, close invalidation, and audit remain atomic | Passed |
| Regression gate blocks loss of maker-checker or fresh-auth enforcement | Passed |

## Verification Evidence

- Focused AP action/service tests: 2 suites, 28 tests passed.
- Broader procure-to-pay bundle: 9 suites, 56 tests passed.
- Purchasing/AP consolidation fail gate: 11/11 checks ready, 0 blockers.
- Purchasing/AP gate regression suite: 4/4 tests passed, including removal of
  fresh-auth enforcement as a blocking case.
- AP fraud-control readiness: 8/8 checks ready, 0 gaps.
- Workflow Assurance release gate: 37/37 checks, 11/11 indexes, and 2/2
  engine-health checks ready; 0 blockers.
- Inventory boundary fail gate: 0 active violations.
- Hard-delete fail gate: 0 active unsafe findings.
- Prisma schema validation: passed.
- TypeScript typecheck: passed.

## Files Changed

- `actions/purchasing/ap-control.actions.ts`
- `actions/purchasing/__tests__/ap-control.actions.test.ts`
- `services/purchasing/ap-control.schemas.ts`
- `services/purchasing/ap-control.service.ts`
- `services/purchasing/__tests__/ap-control.service.test.ts`
- `scripts/purchasing-ap-consolidation-gate.js`
- `scripts/__tests__/purchasing-ap-consolidation-gate.test.js`
- `what-next/purchasing-ap-consolidation-readiness.md`
- `what-next/purchasing-ap-consolidation-readiness.json`
- `what-next/ap-fraud-control-readiness.md`
- `what-next/ap-fraud-control-readiness.json`
- This execution report.

## Assurance Boundary

This result certifies the repository's internal 011 control invariants and
regression gates. It does not claim supplier-document authenticity, bank
execution, tax-treatment accuracy, statutory certification, or production
country-pack approval.

## Advancement Decision

No CRITICAL or HIGH Skill 011 implementation gate remains open. Proceed to
`012-aqstoqflow-payroll-presence-engine`.