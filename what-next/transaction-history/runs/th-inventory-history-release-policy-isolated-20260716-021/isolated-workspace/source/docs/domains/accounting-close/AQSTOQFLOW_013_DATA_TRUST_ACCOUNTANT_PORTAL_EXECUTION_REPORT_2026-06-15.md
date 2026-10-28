# AqStoqFlow 013 Data Trust Accountant Portal Execution Report

Date: 2026-06-15  
Suite step: `013-aqstoqflow-data-trust-accountant-portal`  
Execution mode: additive implementation slice after 012 payroll/presence completion

## Decision

013 has been implemented as a ledger-backed accountant trust surface.

The platform now has a protected Accountant Portal that consumes the existing accounting, event, payment reconciliation, purchasing/AP, payroll, compliance, and audit evidence kernels. It does not create parallel financial truth. It reads posted ledger evidence, classifies trust level, blocks certified export when gates fail, and suppresses financial figures when critical data-trust blockers exist.

The next numbered suite step can move to:

- `014-aqstoqflow-offline-pos-sync`

This is allowed at the code-gate level. Runtime tenant data may still show portal blockers until that tenant has clean posted ledger source links, settled payment/payroll evidence, and resolved statutory exceptions.

## Skills Used

- `000-aqstoqflow-execution-suite`
- `013-aqstoqflow-data-trust-accountant-portal`
- `stockflow-data-trust-certifier`
- `ledger-first-business-events`
- `ohada-compliance-oracle`
- `enterprise-error-handling`
- `rbac`

## Implemented

### Data Trust Kernel

Added:

- `services/accounting/data-trust.schemas.ts`
- `services/accounting/data-trust.service.ts`

The service builds an accountant-facing read model from:

- posted/reversed `JournalEntry` and `JournalEntryLine` records;
- `LedgerPostingBatch` status;
- `AccountingSourceLink` coverage;
- `BusinessEvent` failure/rejection state;
- `PaymentException` risk and status;
- supplier invoice/payment evidence;
- payroll declaration/payment evidence;
- fiscal document certification/rejection evidence;
- ledger audit events and sensitive-action audit logs.

It classifies trust from `T0` to `T4`:

- `T0`: critical blocker or unbalanced ledger; financial figures render as unavailable.
- `T2`: high blocker remains.
- `T3`: medium blocker remains or coverage is not certification-ready.
- `T4`: certified, balanced, source-linked, and export-ready.

### Accountant Trust-Pack Export

The export path:

- requires `accounting.exports.create`;
- requires fresh auth through the protected action wrapper;
- evaluates the existing `accounting.export` sensitive-action policy;
- records sensitive-action audit evidence;
- exports only JSON;
- embeds a watermark ID, scope hash, content hash, trust certificate, blockers, source links, audit events, and optional ledger rows;
- records `ACCOUNTANT_TRUST_PACK_EXPORT` in `LedgerAuditEvent`;
- refuses export unless the portal is `T4/CERTIFIED`.

### Protected Actions

Added:

- `actions/accounting/data-trust.actions.ts`

Controls:

- portal read uses `accounting.audit.read`;
- trust-pack export uses `accounting.exports.create`;
- tenant scope, actor ID, and actor permissions are derived from RBAC context, not caller input;
- action errors are returned through the shared `protect` safe response envelope.

### Hook And UI

Added:

- `hooks/useAccountantPortal.ts`
- `components/accounting/AccountantPortal.tsx`
- `app/[locale]/(dashboard)/dashboard/accounting/accountant-portal/page.tsx`

Updated:

- `app/[locale]/(dashboard)/dashboard/accounting/page.tsx`
- `config/sidebar.ts`

The UI exposes:

- trust level and verdict;
- posted-entry and source-link coverage;
- blocker counts;
- posted debit/credit figures with provenance;
- module evidence for ledger, events, payments, purchasing, payroll, compliance, and audit;
- close blockers with gate IDs;
- recent accounting source links;
- ledger/control audit trail;
- certified export button that remains disabled until the service reaches T4.

## Gates Enforced

- Tenant gate: all service reads filter by `organizationId`; actions derive tenant from RBAC context.
- RBAC gate: portal read requires audit permission; export requires critical export permission plus fresh auth.
- Ledger gate: financial figures come from posted/reversed journal lines only.
- Provenance gate: source-link coverage is computed, and orphan posted entries are critical blockers.
- Event gate: failed/rejected business events block certification.
- Payment gate: open high/critical payment exceptions block certification.
- AP gate: supplier payments without ledger batches are critical blockers.
- Payroll gate: rejected declarations and unsettled payment batches block certification.
- Compliance gate: rejected fiscal documents block certification; pending certification is visible.
- Error gate: server actions use protected safe responses; unknown errors are normalized.
- Export gate: certified trust pack export refuses non-T4 states.
- Audit gate: export attempts and exports are visible through sensitive-action audit and ledger audit evidence.

## Verification

Passed:

```bash
npm test -- --runTestsByPath services/accounting/__tests__/data-trust.service.test.ts actions/accounting/__tests__/data-trust.actions.test.ts --runInBand
npm run typecheck
npm run prisma:validate
npm run inventory:boundary
```

Results:

- Focused Jest: 2 suites passed, 6 tests passed.
- TypeScript: passed.
- Prisma schema validation: passed.
- Inventory boundary gate: 0 active violations.
- No-Prisma-in-UI scan: no matches in the new portal/action/hook route surface.
- No mock/sample/estimated-finance scan: no matches in the new 013 production files.
- Server action raw-error scan: no matches in `actions/accounting/data-trust.actions.ts`.

## Remaining Professional Boundary

The portal can certify the implementation path, not every tenant's data state. Real tenant export remains blocked until that tenant has:

- accounting setup locked/ready;
- a resolved accounting period;
- balanced posted ledger activity;
- complete source links and posting batches;
- no failed posting batches or rejected business events;
- no high-risk open payment exceptions;
- no payroll/AP/compliance blockers that affect accountant trust.

This is intentional. The portal acts as a painkiller by making the accountant's blocker list explicit instead of allowing false financial confidence.
