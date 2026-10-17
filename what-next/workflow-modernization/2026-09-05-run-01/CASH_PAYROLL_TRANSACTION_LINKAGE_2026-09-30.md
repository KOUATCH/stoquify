# Payroll transaction linkage and retained evidence

2026-09-30. FA-CASH-COMMAND remains the primary workflow; payroll is the supporting dependency. Branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Existing unrelated changes are preserved.

## Reproduction and correction

The reader supported finding a payroll transaction by source type and batch ID when an older batch had no explicit paymentTransactionId. However, it fetched matches, suspense and retry history using only the stored IDs from batches. The fallback transaction could appear without its actual evidence or blockers. The writer independently used findFirst over explicit/source links, and the reader used a map that could silently choose the last of duplicate source-linked transactions.

Four regression cases reproduced omitted legacy evidence queries, duplicate linkage accepted on read, a contradictory explicit source accepted on read, and duplicate linkage accepted during settlement. A shared resolver now requires a unique transaction with matching tenant, source type and batch. An explicit pointer must agree with that transaction. Missing or contradictory explicit references and duplicate source candidates fail with an actionable linkage error. No arbitrary first/last payment is selected.

The reader resolves transactions before loading dependent matches, exceptions, suspense and retry history, all with tenant scope. Independent evidence queries remain parallel after that dependency is resolved. A unique legacy source link works without backfilling the released batch during the read. The writer uses the same resolver inside its existing serializable transaction before checking evidence or making changes.

## Verification

The immutable `evidence/cash-settlement-linkage-review-2026-09-30.json` records exact final source, command receipts and browser screenshots. Four new tests failed against the previous source. An attempted edit was stopped by a Windows mapped-file lock; the repeated receipt against unchanged source is retained. The successful edit was subsequently verified rather than inferred from the failed write.

The browser fixture deliberately omits the explicit transaction pointer while retaining a unique source-linked transaction, approved statement match and missing-statement exception. Actual EN desktop/FR mobile application actions discover the match, preserve the null pointer during read, authenticate, settle 10.00 of 100.00, resolve the matching exception and retain 90.00. A lost response followed by replay produces one settlement event. The screenshot covers the settlement form, not complete page accessibility.

The fixture's release and approval prerequisites are synthetic. This does not establish actual release, provider authenticity, bank transfer or statutory readiness. Existing controls, exact amounts, stale revisions, redaction, maker-checker, outbox and close invalidation are preserved. No migration or production operation occurs.

## Operator guidance and review

For a legacy batch with a unique canonical source-linked transaction, existing matching evidence and blockers now appear at `/en/dashboard/payroll/payments` and `/fr/dashboard/payroll/payments`. No manual link edit is required for reading. Normal authorized settlement uses the established fresh-authentication and same-command retry workflow.

If linkage is ambiguous or contradictory, the payroll/reconciliation controller must compare the original released batch, payment transaction source records and controlled provider/statement evidence. The application does not choose a candidate or rewrite immutable history automatically. Engineering must provide an appropriate evidence-backed correction path if the historical linkage genuinely needs repair; direct database edits are not an operator instruction.

Backend/data/security: canonical scoped resolver shared by reader/writer, ambiguity rejection and no read-time mutation. Finance/audit: original obligations and history retained; no selected transaction by query ordering. UX: existing EN/FR flow reused; full table localization/layout and accessibility remain open. SRE: one dependency-ordered read phase; no performance certification. Statutory, billing, AI, POS and inventory: not applicable to this bounded change.

Release reader and writer together through the existing reviewed process. Monitor linkage errors without logging salary or private evidence. Rollback must not restore arbitrary transaction selection or omit known suspense evidence. Preserve all historical records.

Remaining: assess PAID-label semantics at release, verify destination approval/release/provider/declaration lifecycle, implement controlled legacy amount-history reconstruction and ambiguous-link correction where needed, and complete Cash proof/accessibility/latency criteria. Whole-workflow closure is not claimed.
