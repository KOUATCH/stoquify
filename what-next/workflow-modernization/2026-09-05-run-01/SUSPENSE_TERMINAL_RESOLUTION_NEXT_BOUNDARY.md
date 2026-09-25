# Next connected work — terminal suspense resolution

Current-source review after v101 publication, 9 September 2026. The full workflow objective remains active; v101 was concrete progress, with no global blocked condition.

## Evidence to carry forward

- The inspected `services/reconciliation/payment-suspense-workflow.service.ts` exposes assignment, proposal and approval that ends at `POSTED_TO_SUSPENSE`. The correction service can retain a compensation record and reopen the item; it does not supply final resolution/write-off.
- `payment-reconciliation-summary.service.ts` correctly includes posted and reopened suspense among unresolved obligations. Certification still requires those obligations to be dealt with. Do not change these counts or final states just to lift a gate.
- A source-only search across services/actions/config/lib found suspense mutations in the workflow and correction services and no named terminal-resolution service in those inspected boundaries. Verify indirect callers, schema and accounting contracts before concluding the entire repository lacks an implementation.
- The separate cross-day provider-event ownership policy remains open. v101 only aligned sign-off/detail evidence counts with the existing matching/manifest occurrence-or-receipt rule; it did not resolve receipt-day overlap or revise historical allocation.

## Next implementation sequence

1. Reconcile the terminal resolution/write-off journey with the register, schema, existing posting purposes, source contracts, account selection policies and action permission catalogue. Inspect all relevant consumers and any alternate finalization path.
2. Establish the real business outcome for a supported resolution: authoritative source evidence, approved destination, exact amount/currency, current period and compensated/posted ledger lineage. Keep classification/posting distinct from final settlement or loss recognition.
3. Implement the required authoritative review, independent decision, immutable receipt, idempotent financial effect and history/recovery. Reuse existing posting/domain services. Do not invent an approved expense account, write-off policy, country approval or authority threshold.
4. Carry through linked exceptions, reconciliation readiness, close evidence, summaries and operator visibility. Preserve prior journals/certificates and refuse unsafe partial or conflicting effects.
5. Verify denied authority, cross-tenant objects, stale preview, concurrency, exact retry, rollback, period restrictions and actual EN/FR recovery. Record any precise external policy input separately while completing unaffected engineering work.

The v94 notification cutover remains held. Ordinary local implementation and isolated verification are authorized; no production activation, live payment, fabricated approval or X1 clearance follows from this next boundary.


## v102 prerequisite correction

Tracing terminal resolution exposed the assumed rate-one currency defect. [The currency boundary is now corrected and verified](SUSPENSE_CURRENCY_GUIDE.md) for new same-currency postings. Terminal resolution/write-off itself is still unimplemented. Continue the sequence above; do not misclassify the currency refusal as a completed resolution or a fabricated accounting approval.


## v103 current boundary

[The resolution core is implemented and verified](SUSPENSE_RESOLUTION_CORE_GUIDE.md) for full same-currency manual clearing and the supported expense write-off. This supersedes the earlier statement that no terminal service exists. Public controls remain absent. Next implement independently authorized source-owned clearing reversal/reopening, retain historical allocations, verify the neutralization chain in subsequent posting/correction/resolution, invalidate close/certificate evidence, and preserve related obligations. Then add protected actions, history and EN/FR operator controls with browser proof. Do not remove the generic reversal guard or delete receipts to simulate recovery.


## v104 current boundary

[Recovery is now implemented](SUSPENSE_RESOLUTION_RECOVERY_GUIDE.md), including exact clearing reversal, immutable independent receipts, exception/run/close invalidation and historical-chain checks during subsequent correction/posting/resolution. The next action is protected server actions, durable history and the complete EN/FR operator interface. Preserve the existing source reversal guard and verify both authorized and denied browser paths. This supersedes v103 recovery-unimplemented statements; public controls and full workflow completion remain open.


## v105 current boundary

[The protected operator interface is implemented](SUSPENSE_RESOLUTION_OPERATOR_GUIDE.md) and exercised in EN/FR through resolution/write-off and recovery. This supersedes earlier public-controls-unimplemented statements. Next verify/fix malformed local storage and lost opener focus, add durable private resolution/recovery exports and complete the real exception/sign-off/export handoff. Keep broader races, contexts and whole-platform discovery active.


## v106 current boundary

Unreadable draft recovery and disappearing-opener focus are implemented and verified in both locales. Continue with durable private resolution/recovery exports and the actual exception/sign-off/export handoff. Historical cycle evidence, current export authority, redaction, exact replay and monetary proof must be verified; a cosmetic history download is insufficient. See SUSPENSE_LOCAL_RECOVERY_V106.md.


## v107 current boundary

Durable private historical exports are implemented and verified at the service, protected action and actual EN/FR browser boundaries. Continue through the genuine exception/sign-off/export handoff; do not substitute synthetic SIGNED fixtures for actual sign-off. Broader races, currency/country/legacy policies and remaining whole-platform workflows remain in scope. See SUSPENSE_RESOLUTION_EXPORT_GUIDE_V107.md.
