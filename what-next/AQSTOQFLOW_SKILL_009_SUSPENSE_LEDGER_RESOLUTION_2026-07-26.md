# AqStoqFlow Skill 009 — Suspense Ledger Resolution

**Execution date:** 2026-07-26  
**Selected skill:** `009-aqstoqflow-payment-reconciliation-moat`  
**Decision:** **IMPLEMENTED — PAYMENT CASH-TRUTH GATE READY 11/11**

## Outcome

The `suspense_posting_reconciles_to_posted_ledger` blocker is resolved in the application control path.

Payment suspense approval no longer creates only a draft ledger batch and then labels the operational item as posted. Approval now calls one canonical, rule-driven ledger service that creates and verifies the posted accounting evidence before the suspense item can transition to `POSTED_TO_SUSPENSE`.

## Implemented control path

The new `postPaymentSuspenseToLedger` operation:

1. Re-reads the organization-scoped suspense item inside the approval transaction.
2. Requires `RESOLUTION_PROPOSED` or a valid idempotent replay state.
3. Confirms that the suspense account still matches the item/provider configuration.
4. Requires a positive source amount and normalized currency.
5. Creates or reuses an idempotent `PAYMENT_SUSPENSE / SUSPENSE_RECLASSIFICATION` posting batch.
6. Requires an active, effective, versioned posting rule for that source and purpose.
7. Supports explicit rule conditions for direction, suspense type, provider code, and payment rail.
8. Resolves only active, leaf, same-tenant, currency-compatible accounts.
9. Produces journal lines from the approved rule and rejects unsupported amount sources or multipliers.
10. Requires exactly one full-amount line on the configured suspense account.
11. Requires a balanced journal.
12. Posts the batch and journal in the same database transaction.
13. Creates exactly one accounting source link.
14. Revalidates the posted batch, journal, lines, suspense amount/currency, and source link before returning success.
15. Records ledger audit evidence.

The approval transaction now uses Prisma `Serializable` isolation. If rule resolution, journal creation, source linking, or truth validation fails, the transaction rolls back and the suspense item is not marked posted.

## Independent certification control

Reconciliation sign-off now calls `assertPaymentSuspenseLedgerTruthInTx`.

For every `POSTED_TO_SUSPENSE` item in the reconciliation run, certification proves:

- a ledger posting batch exists;
- the batch status is `POSTED`;
- the source is the exact suspense item;
- the purpose is `SUSPENSE_RECLASSIFICATION`;
- exactly one journal exists;
- the journal status is `POSTED`;
- the journal is balanced;
- exactly one configured suspense-account line exists;
- its amount and currency match the operational suspense item;
- exactly one accounting source link connects the source, batch, and journal; and
- aggregate operational suspense equals aggregate suspense-ledger movement by account and currency.

Any missing, draft, duplicated, unbalanced, cross-source, wrong-account, wrong-amount, wrong-currency, or unlinked evidence blocks sign-off.

## Accounting policy boundary

The application does not hard-code a debit/credit counterpart account. Each tenant must have an approved active posting rule with:

- `sourceType = PAYMENT_SUSPENSE`
- `postingPurpose = SUSPENSE_RECLASSIFICATION`
- at least one debit and one credit line;
- exactly one full-source-amount line resolving to the configured suspense account; and
- approved counterpart accounts, optionally conditioned by direction, suspense type, provider code, or payment rail.

If this policy is absent, the workflow fails closed before journal creation or operational status mutation. This is an intentional tenant accounting-configuration requirement, not a country-pack or regulator-approval dependency.

## Files changed

- `services/reconciliation/payment-suspense-ledger.service.ts`
- `services/reconciliation/payment-suspense-workflow.service.ts`
- `services/reconciliation/payment-reconciliation-certification.service.ts`
- `services/reconciliation/__tests__/payment-suspense-ledger.service.test.ts`
- `services/reconciliation/__tests__/payment-suspense-workflow.service.test.ts`
- `services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts`
- `what-next/payment-cash-truth-readiness.md`
- `what-next/payment-cash-truth-readiness.json`
- `what-next/ledger-close-truth-readiness.md`
- `what-next/ledger-close-truth-readiness.json`
- `what-next/prisma-migration-deployment-readiness.md`
- `what-next/prisma-migration-deployment-readiness.json`
- `what-next/AQSTOQFLOW_SKILL_009_SUSPENSE_LEDGER_RESOLUTION_2026-07-26.md`

## Verification

- TypeScript typecheck: **passed**
- Focused suspense ledger, workflow, and certification suites: **3 suites, 20 tests passed**
- Focused implementation plus gate suites before the rollback-test addition: **4 suites, 23 tests passed**
- Broader payment/reconciliation/action/UI regression set: **14 suites, 94 tests passed**
- Payment cash-truth gate: **11/11 ready**
- Ledger close-truth gate: **10/10 ready**
- Error boundary gate: **0 active unsafe findings**
- Prisma schema validation: **passed**
- Prisma migration safety gate: **8/8 ready**, local database execution skipped by policy

## Remaining operational activation

Before enabling payment suspense posting for a tenant:

1. Configure and approve the tenant's suspense and counterpart accounts.
2. Create the active `PAYMENT_SUSPENSE / SUSPENSE_RECLASSIFICATION` posting rule.
3. Exercise one inbound and, where applicable, one outbound fixture for every provider/rail condition.
4. Verify the resulting journal, source trace, and reconciliation certificate in a production-equivalent PostgreSQL environment.

This operational activation does not reopen the implementation blocker. It supplies the tenant-specific accounting policy that the implemented control path deliberately requires.

## Next recommended numbered skill

`010-aqstoqflow-inventory-valuation-kernel`
