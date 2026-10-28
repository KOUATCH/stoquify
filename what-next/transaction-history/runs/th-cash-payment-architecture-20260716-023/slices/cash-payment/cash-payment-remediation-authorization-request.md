# Cash Payment Remediation Authorization Request

Run: `th-cash-payment-architecture-20260716-023`  
Slice: `cash-payment`  
Prepared after: Stage 02 `PARTIAL`, Stage 03 `PARTIAL`

## Purpose

Authorize a new narrowed implementation run to lift the cash-payment Stage 02 and Stage 03 blockers before Stage 04 read-model delivery begins.

Recommended next run:

`th-cash-payment-security-accounting-remediation-20260716-024`

Mode:

`implement`

Target gates:

- Stage 02 Security Proof Gate remediation.
- Stage 03 Accounting Control Gate remediation.

## Why Stage 04 Is Not Yet Eligible

Stage 04 requires Stage 02 and Stage 03 to be exact `PASS`. Current evidence is:

- `02-security-proof-gate.json`: `PARTIAL`
- `03-accounting-control-gate.json`: `PARTIAL`

The current blockers are security/accounting prerequisites, not frontend blockers.

## Required Product Outcomes

1. Enforce module entitlement for cash-payment history entrypoints.
2. Define cashier own-session versus manager/owner cross-session access.
3. Add redaction rules for provider references, counterparty names, cashier identity, and export context.
4. Reuse the transaction-history cursor contract for signed tenant/filter-bound pagination.
5. Reuse export safety controls for cash-payment history exports.
6. Establish recorded-through cutoff semantics.
7. Establish cash expected/counted/variance semantics excluding electronic tenders.
8. Keep capture-readiness, posted, reconciled, suspense, exception, and certified states distinct.

## Exact Proposed Edit Allowlist

Security and shared utilities:

- `services/security/export-safety.service.ts`
- `services/security/__tests__/export-safety.service.test.ts`
- `services/security/redaction-policy.service.ts`
- `services/security/__tests__/redaction-policy.service.test.ts`
- `services/history/transaction-history-cursor.ts`
- `services/history/__tests__/transaction-history-cursor.test.ts`

Cash/payment read-model and contracts:

- `services/pos/cash-payment-history.service.ts`
- `services/pos/cash-payment-history.schemas.ts`
- `services/pos/__tests__/cash-payment-history.service.test.ts`
- `services/payments/payment-history.service.ts`
- `services/payments/payment-history.schemas.ts`
- `services/payments/__tests__/payment-history.service.test.ts`

Server actions:

- `actions/pos/cash-payment-history.actions.ts`
- `actions/pos/__tests__/cash-payment-history.actions.test.ts`
- `actions/payments/payment-history.actions.ts`
- `actions/payments/__tests__/payment-history.actions.test.ts`

Existing files allowed only for narrow integration:

- `actions/pos/drawer-dashboard.actions.ts`
- `actions/payments/reconciliation-workbench.actions.ts`
- `services/pos/drawer-dashboard.service.ts`
- `services/payments/payment-reconciliation-workbench.service.ts`

## Explicitly Excluded

- `prisma/schema.prisma`
- migrations
- `lib/security/rbac.ts`
- role seeds
- broad finance dashboard rewrites
- frontend product routes/components
- AP/AR/customer/supplier history surfaces

## Focused Verification Commands

```powershell
npm test -- services/history/__tests__/transaction-history-cursor.test.ts services/security/__tests__/export-safety.service.test.ts services/security/__tests__/redaction-policy.service.test.ts --runInBand
npm test -- services/pos/__tests__/cash-payment-history.service.test.ts actions/pos/__tests__/cash-payment-history.actions.test.ts --runInBand
npm test -- services/payments/__tests__/payment-history.service.test.ts actions/payments/__tests__/payment-history.actions.test.ts --runInBand
npm run typecheck
node docs\skills-life-cycle\stoquify-transaction-history-skill-suite-src\stoquify-transaction-history-00-orchestrator\scripts\validate-run-artifacts.mjs --run-dir what-next\transaction-history\runs\th-cash-payment-security-accounting-remediation-20260716-024
```

## Done Criteria For Gate Lift

Stage 02 may become `PASS` only when:

- missing auth/permission negative tests pass;
- foreign tenant direct action tests pass;
- module entitlement denial tests pass;
- role-based redaction snapshots pass;
- signed cursor tamper/wrong-tenant/filter-mismatch tests pass;
- export safety tests pass;
- sensitive action/fresh-auth requirements are recorded or explicitly not applicable.

Stage 03 may become `PASS` only when:

- cash roll-forward tests prove opening + signed movements = closing for complete server-side populations;
- electronic tenders are excluded from physical cash expected/counted math;
- payment state tests distinguish capture, posted, matched, suspense, exception, reconciled, and certified;
- recorded-through cutoff and same-time pagination tests pass;
- close-blocker semantics for cash variance and payment suspense/exception are tested.

## Next After Gate Lift

After Stage 02 and Stage 03 are exact `PASS`, run Stage 04 read-model optimizer for `cash-payment`, then Stage 05 UX contract, Stage 06 frontend delivery, and Stage 07 release review.
