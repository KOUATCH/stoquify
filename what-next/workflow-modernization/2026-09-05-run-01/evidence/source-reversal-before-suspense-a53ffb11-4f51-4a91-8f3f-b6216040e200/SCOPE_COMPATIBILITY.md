# Suspense reversal scope compatibility

Evidence date: 2026-10-01. This is a source-based implementation note, not a release or professional approval.

The coordinator explicitly requested `includeAllPeriods: true` in the two suspense approval paths after independent source review found organization-wide payment evidence in every Close assessment. The coordinator owns the shared helper and has added `includeAllPeriods?: boolean` to `JournalReversalPeriodScope`; both suspense writers are the assigned migration scope.

Current source dependencies:

- `services/accounting/close-assurance.service.ts` calls `getPaymentReconciliationDashboardData(organizationId)` in its evidence collection. No accounting-period scope is supplied.
- `services/reconciliation/payment-reconciliation-dashboard.service.ts` loads organization-wide suspense items and recent reconciliation runs. Its returned suspense queue and summary affect the Close assessment even for an earlier accounting period.
- Correction and resolution recovery change suspense outcomes, exception state and linked reconciliation-run signature state. Original date, reversal date and linked business-date overlaps alone therefore do not cover all consumed evidence.
- `services/accounting/journal-reversal-order.service.ts` now documents the optional all-period flag as restricted to sources consumed by organization-wide Close collectors. Its query always includes `organizationId`; the flag broadens only the selected tenant's periods. It retains sorting, explicit-reference validation, catalog synchronization and Serializable committed-snapshot comparison before any financial write.

Required integration: pass `includeAllPeriods: true` on APPROVE in both suspense writers; retain original/reversal dates, class-3 classification and linked business date as provenance. Pass the retained posting batch's period as an additional required tenant reference, because correction also changes that batch's status. All existing periods, including earlier and no-run periods, must be locked before reversal effects. REJECT remains outside financial scope preparation.

Tradeoff: this conservatively serializes these two source writes against assessments across one tenant. Narrower period locking would require changing the global payment collector's evidence contract; that separate redesign is outside this migration.

Automatic approval review initially rejected the all-period patch because it had not reconciled the expanded flag with the shared API and authorization. Subsequent read-only verification confirmed the coordinator's final helper contract and the global collector call. One narrowed retry then failed filesystem writing rather than an approval-review policy rejection. After the coordinator's typecheck completed and the bound files were released, ordinary filesystem escalation applied that same approved scope in both writers and their focused assertions. No policy restriction was bypassed.

Verification to retain: command-level assertions for `includeAllPeriods` and additional batch period; actual earlier-period retained export invalidation; complete sorted tenant period keys before financial insertion; no-run period coverage; whole-transaction retry after genuine concurrent fiscal creation; rollback after inserted financial reversal; exact replay and authentication expiry after an actual lock wait.
