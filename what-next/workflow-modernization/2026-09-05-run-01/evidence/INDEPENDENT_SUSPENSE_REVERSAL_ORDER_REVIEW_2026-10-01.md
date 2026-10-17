# Independent suspense reversal ordering review

Evidence date: 2026-10-01. Reviewer: receipt_remaining_boundary. Read-only source review; no tests, database operations or product edits performed. Scope: suspense posting correction and resolution recovery supporting FA-CASH-COMMAND / FA-CLOSE-PACK.

## Material finding: date union misses the current global Close dependency

The reviewed decision writers pass original journal date, reversal date and the linked reconciliation run's businessDate to the ordered period helper. This repairs the business-date omission but remains insufficient for current Close collection.

Source evidence:

- `services/accounting/close-assurance.service.ts:1567` calls `getPaymentReconciliationDashboardData(organizationId)` without a period argument.
- `services/reconciliation/payment-reconciliation-dashboard.service.ts:292` builds that tenant-wide read model. Its recent-run query has organization-only scope; it calls tenant-wide suspense queue and summary readers at lines 355-356.
- `services/reconciliation/payment-reconciliation-summary.service.ts` groups reconciliation runs, unresolved suspense and unresolved exceptions by organization without period filters. Signed-run count and critical-exception count are global.
- `services/accounting/close-assurance.service.ts:1633` consumes global signed-run, open-suspense and critical-exception counts. The payment checklist at lines 1731-1754 uses those observations. Evidence rows at lines 2031 onward retain recent reconciliation-run certificates and suspense queue observations across periods.
- `payment-suspense-correction.service.ts:243-250` reopens the suspense item/exceptions and removes the linked run's signature/certificate. `payment-suspense-resolution-recovery.service.ts:190-194` performs corresponding reopen/invalidation effects.

Concrete reproduction: retain a certified assessment for an earlier accounting period while a later suspense obligation is resolved and its reconciliation run is signed. Approve resolution recovery in another later period. The global payment evidence seen by the earlier assessment changes (signature/certificate and potentially reopened critical exceptions), but the original/reversal/business-date union excludes that earlier period. Its retained certification can remain unstaled. This is a demonstrated source dependency; the exact fixture still requires runtime verification.

Recommended bounded correction accepted by coordinator: for these two approval writers only, resolve **all existing tenant accounting periods** while holding the shared catalog lock, acquire their assessment locks in one sorted set, perform the existing Serializable snapshot comparison, and invalidate that exact set after effects. Do not redesign period reporting or alter other producers. Keep the dates and explicit source/batch periods for validation/provenance. This conservative scope follows the current global collector; its capacity cost is unmeasured.

The owner/coordinator were informed before runtime. This review does not claim the proposed correction has been implemented or verified.

## Other reviewed behavior

No additional material regression found in the reviewed changes:

- Both approval paths acquire catalog before source/journal/period row locks. Manual journal reversal also takes its source journal row before assessment locks, so no new opposite acquisition order was identified at that shared boundary.
- Serializable isolation is retained. Only `JournalReversalSnapshotChangedError` restarts the whole transaction, at most three attempts. Existing P2034/P2002 and raw serialization/deadlock handling remains explicit conflict; it is not silently converted to automatic retries.
- Retries use the same submitted decision/revision and recalculate authorization time. Initial catalog/source waits and final assessment waits consume elapsed authentication lifetime. Maker-checker and permission checks remain before decision effects; final checks occur after preparation waits.
- Exact decision replay retains command-hash and proof validation and bypasses financial preparation. It still acquires the catalog boundary before replay lookup. Changed command data remains an idempotency conflict.
- Expanded `syscohadaClass` account selection supports cumulative journal classification without changing retained financial hashes: `correctionJournalHash` uses explicit `correctionLineEvidence` fields, not the full account object. The overriding resolution evidence select includes the new field too.
- New tests cover source/period ordering, snapshot retries, bounded failure, time expiry, exact replay, stale review, self-approval and missing actor. They use mocked proof readers and cannot independently prove real accounting readiness, transaction rollback or PostgreSQL contention.

Existing broader controls and read-model behavior were not audited or certified. In particular, this is not a universal forecast/Close dependency fix, persistent-RBAC revocation proof or statutory approval.

## Reviewed source bindings (SHA-256)

| File | SHA-256 |
| --- | --- |
| services/reconciliation/payment-suspense-correction.service.ts | 564f59d142911178b760a42518bcc1527ad96f4ecb0d8a53f4158d870a78495a |
| services/reconciliation/payment-suspense-resolution-recovery.service.ts | 8ad15b940b959cdc1c5ecaaea39425b6f5c64ba801ec0aa31a1a8415d8d66da0 |
| services/reconciliation/payment-suspense-cycle-ledger.service.ts | 26b4a2ebebc38dd79f415d8eedc0b8187ed68501fa7d3fbb854074a257b7e64a |
| services/reconciliation/payment-suspense-resolution-evidence.service.ts | 9a9c6cf6651fa6f95ad97800e4f994e8e28e1a187657e5d51cb5639a87bfcb23 |
| services/reconciliation/__tests__/payment-suspense-reversal-order.service.test.ts | 8c2f13c2852c896a77141a6977d23d18a468fdf8cac047f39ff269425aed251f |
| services/accounting/close-assurance.service.ts | 7e85e6465d76d2416a1a4a1f1fa2482e44a0428d74b08162f3050eb8e38f6f2d |
| services/reconciliation/payment-reconciliation-dashboard.service.ts | e5f3aa07268343deb512dd7ba9f01a3821b154109c8e9413ab25fc187f29f582 |
| services/reconciliation/payment-reconciliation-summary.service.ts | 71377f47afda496cd4dd4c2c8da74f87e21ef4b091e29b748d3a349121de56eb |

Historical graph search did not locate the newly added correction/recovery service nodes; current imports and source supplied the authoritative relationships above.

## Follow-up: scoped correction applied and independently inspected

On 2026-10-01, after the original review above, the coordinator and suspense owner applied the bounded correction. The original observations and hashes remain historical evidence; this section records the new source binding.

- Both `decideSuspenseCorrection` and `decideSuspenseResolutionRecovery` now pass `includeAllPeriods: true` to the shared order helper before financial effects. Both retain business-date evidence and additionally pass the retained original/clearing posting batch period when present.
- `lockJournalReversalClosePeriodsInTx` retains `organizationId` while omitting date/status/run filters when this explicit flag is true. It discovers every existing accounting period for the tenant, including older periods and periods without Close runs, sorts/deduplicates IDs, validates every explicit journal/reversal/batch period belongs to that tenant set, acquires the complete lock set sequentially, and performs the existing Serializable snapshot/fresh-reader comparison.
- Both writers already hold the shared catalog lock before source/period row locks. They pass the returned exact union to one ordered invalidation call, so collection and mutation use the same period boundary.
- The new helper test asserts an organization-only period query and inclusion of an older period without a run. The two writer tests assert the all-period flag and retained batch reference. Inspection is not execution: no test or DB command was run by this reviewer.

Conclusion: the applied source addresses the material global-collector omission for **these two suspense reversal approval paths**. Actual contention and retained older-period invalidation remain runtime acceptance items. Other producers that create or change tenant-wide reconciliation/forecast observations are not included in this correction or claimed safe. Tenant-wide scope may increase lock duration and capacity requirements; these were not measured.

| Updated file | SHA-256 |
| --- | --- |
| services/accounting/journal-reversal-order.service.ts | f6b6a6765094e726614c4b9c0be004c6265e50657ad3f319c0317e9ed4442e09 |
| services/accounting/__tests__/journal-reversal-order.service.test.ts | d08d1b3f7aa8a4872c0aef029b82fdee583897580cf1d2ebd475648ebf423a6d |
| services/reconciliation/payment-suspense-correction.service.ts | 7cbba1504aa78c2c723bb88e1b4ebc1b979db1306a579606b31565545aedff4a |
| services/reconciliation/payment-suspense-resolution-recovery.service.ts | 46c087e6ca975aacef06e44adf659a3f24bcdb9bc40d9f591ea8fe234fcb419a |
| services/reconciliation/__tests__/payment-suspense-reversal-order.service.test.ts | 2733e2f966262e433fb618a6e7bd9d0e7d3fba7b3f856e4f168200797661a6a5 |
