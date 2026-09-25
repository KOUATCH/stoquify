# CS-F05 — consistent customer retention and truthful removal outcomes

Evidence date: 2026-09-05. The management customer removal owner already distinguished unused customers from those with sales orders, ledger entries, receivable documents, statement snapshots or settlements. Historical customers were deactivated while keeping `deletedAt` unset, preserving access through existing nondeleted-record reads. The older archive function and direct exported delete service instead unconditionally set `deletedAt`. The older archive function also returned success when its scoped update matched no customer.

The legacy action chain discarded the actual removal result, and `useDeleteCustomer` treated a resolved unsuccessful action envelope as a successful mutation. These inconsistencies could hide retained customers or falsely announce completion. A subsequent route-cache failure could also erase knowledge of a completed change.

## Correction and exact source scope

- `services/customer/customer.service.ts`: centralizes the existing retention decision and single update in a private owner. Management removal and legacy archive return `{ id, mode }`; the direct exported `deleteCustomer` preserves its full `CustomerDTO` return type from that same update. All paths retain the tenant/nondeleted lookup, history categories and missing-object rejection. No new aggregate reload or physical history deletion is introduced.
- `actions/customers/customerAction2.ts`: keeps current permission/module/org checks and returns the actual archive/deactivation receipt.
- `actions/customers/customerActions.ts`: preserves that receipt through the outer action and distinguishes successful cache invalidation from deferred refresh. A cache exception after the completed update no longer reports the mutation itself as failed.
- `hooks/useCustomerQueries.ts`: unwraps unsuccessful action envelopes before success callbacks; reports archive versus deactivation through the existing notification provider in EN/FR; settles client refresh failure separately without losing the known outcome. Existing customer query keys and the management read-model cache are invalidated. The optional locale argument preserves existing zero-argument callers.

Repository search found no current component importing `useDeleteCustomer` or the direct exported service delete function. Their exported contracts remain supported; the modern management entry point still uses its existing hook and receipt. These source findings do not establish a browser visit to a legacy workflow.

## Verification

The new service/action baseline executed before source modification: **15 failed, 12 passed, two suites, 5.068 seconds** (session 64322). Failures demonstrate the missing mode receipt, absent-object success, unconditional archive with each history category, and completed-removal cache failure. The existing management control cases passed.

After correction: **43 tests passed across five suites in 7.386 seconds**, exit 0 (session 26312). Eight changed source/test files passed focused lint. The final suites were:

```text
services/customer/__tests__/customer-retention-policy.service.test.ts
services/customer/__tests__/customer-legacy.service.test.ts
services/customer/__tests__/customer-lifecycle.service.test.ts
actions/customers/__tests__/customer-legacy-removal.actions.test.ts
hooks/__tests__/customer-legacy-removal.test.tsx
```

The checks cover all five observed history categories across management, legacy archive and direct service paths; no-history archive; missing/other-tenant scoped objects; current permission denial before removal; actual mode and cache receipt through both action layers; EN/FR notifications; unsuccessful envelope rejection; and preserved known outcomes during server/client cache failure. Database calls are injected, while hook checks execute the real React Query mutation lifecycle. No real customer, database, schema, provider, financial history or POS/offline source was modified by this verification.

The direct file patch encountered a Windows write failure. A sandboxed adjacent-file write was also denied; the automatic reviewer approved the same bounded customer-service edit using an adjacent temporary file and replacement. No code scope or permission rule was broadened. Other source changes used ordinary patches.

## Required remaining work

`RETENTION_REMAINING_BOUNDARIES.md` records the pre-existing check-then-update race and the active-customer requirement in the settlement owner. This batch does **not** prove concurrent retention safety or collection of existing obligations after deactivation. The register keeps those engineering tasks open, along with actual browser and isolated PostgreSQL verification of this removal path. No complete workflow certification is claimed.

The prior CS-F03 and CS-F08 evidence remains historical and separately bound; this batch intentionally changes the customer service after the CS-F03 hash was captured. Current hashes are recorded in `evidence/LEGACY_RETENTION_VERIFICATION.json`.

## Use and rollout

A deactivated customer keeps retained history available through permitted existing reads. An archived customer had no history observed by the existing policy. If a notification says the change was saved but refresh failed, refresh the customer list before trying another change. Missing/denied records produce a failure and do not clear cached records or announce success.

No migration or customer decision is needed for this correction. Deploy through the normal application verification process; reverting these source changes restores the prior inconsistent behavior and does not require changing records. Do not reactivate financial customers or weaken settlement controls merely to work around the separately recorded continuing-obligation gap.
