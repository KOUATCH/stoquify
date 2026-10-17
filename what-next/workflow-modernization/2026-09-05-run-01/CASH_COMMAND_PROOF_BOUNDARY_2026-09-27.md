# Cash Command proof discovery — bounded correction

Workflow: FA-CASH-COMMAND, still In progress. Branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`, preserved working-tree changes. This correction does not close the workflow or certify the dashboard's overall permission safety.

## Reproduced defect and correction

The service admitted a tenant-wide administrator with `finance.read` or `dashboard.read`, then queried the latest payment, reconciliation, close and journal identifiers regardless of each proof's own read permission. Those identifiers reached the serialized dashboard model, including card drill-through links. A journal lookup also lacked the `POSTED` predicate despite describing the result as posted evidence.

`evidence/cash-proof-boundary-before.json` retains both failing regressions. The permission-only fixture was enough to trigger every private identifier lookup. These are controlled service tests, not production observations.

Discovery now checks the existing `SUBJECT_PERMISSION_MAP`, followed by the corresponding module's enforced **read** admission, before invoking the record query. Related payment proofs share one admission promise within a request; there is no cross-request admission cache. Tenant and period predicates remain intact; journal discovery requires `POSTED`. The service distinguishes denied permission, denied workspace access and an authorized query returning no record. Query and admission exceptions propagate instead of being converted into successful empty results.

Mappings: payment/reconciliation → `payments.reconciliation.read` + `payment_reconciliation`; journal → `accounting.journal.read` + `accounting`; close → `accounting.close.read` + `close_assurance`. Read intent preserves the central service's decision for retained/read-only access. No grants, approvals, business records, schema or migrations changed.

## Verification and limits

The final source-bound receipt is linked from `evidence/cash-proof-boundary-review-2026-09-27.json`. It records focused service, proof-action, dashboard-component and route suites, changed-file lint and the existing full TypeScript command. The earlier broader attempt is preserved at `evidence/cash-proof-checks-138d2df4-39e5-485e-8374-6ade31612fef.json`: 25 tests passed, but the page suite could not load Better Auth ESM through an unused activation component. The page test now isolates that unused component and module service while retaining the actual finance route guard and its assertions.

Added cases cover denied identifiers, partial module admission, tenant/date/posted query predicates, read intent, shared per-request admission, revoked access on a subsequent request, admission ordering and propagated query/guard failures. Real database predicate execution, current EN/FR application presentation and end-to-end proof opening remain required. The local helper's pure composer remains a trusted internal function, not an authorization entry point.

## Highest-priority remaining work

1. **Aggregate disclosure, source-confirmed:** `getCashCommandData` still loads unrestricted tenant/payment/inventory/close/drawer snapshots. `composeCashCommandData` returns payroll totals, counts, trust signals, risks, brief text and inherited snapshot metadata without the corresponding domain permission/module checks. Filtering the action queue does not protect these representations. The tenant snapshot combines several domains, so hiding a payroll card alone would leave indirect disclosure through blockers, provenance and the brief. Build authorized source projections, retain unknown/denied values as unavailable rather than zero, and exercise revoked/partial access. The existing “RBAC filtered” and “Redaction-safe” labels do not establish this protection.
2. **Proof interaction, source-confirmed:** multiple `BIProofDrawerHost` instances share one open flag and proof payload; old evidence is not cleared when a different request begins, and rejected transport calls lack recovery. Verify single-dialog identity, request ordering, scope withdrawal, failure/retry and focus return.
3. **Full lifecycle:** genuinely posted payroll obligations, source destinations, failure/freshness semantics, complete EN/FR, responsive/keyboard/contrast and operating guidance remain on the workflow closure checklist.

The route to review remains `/en/dashboard/finance/cash-command` or `/fr/dashboard/finance/cash-command`. A denied proof requires the organization's access administrator to verify the appropriate current role permission and module read access; an empty authorized result requires an in-period source record. Do not create artificial posted records or bypass controls to obtain a proof link. This patch is ordinary local implementation, with no live activation or deployment.

## Review accountability

Backend/security: authorization precedes identifier discovery; aggregation still needs remediation. Data/finance/audit: tenant/window predicates retained and posted journal meaning corrected; genuine financial lifecycle not yet verified. Architecture: existing RBAC/module contracts reused. Frontend/UX/localization: denied versus empty explanations separated, full translation and drawer recovery pending. Quality/SRE: scoped failed attempts retained, serialized checks, failures remain failures; no performance certification. Product/SaaS: read-only admission delegated to current controls, no packaging change. Statutory, POS mutation, purchasing mutation, provider delivery and AI execution: not applicable to this read-only proof-discovery patch; their existing workflow responsibilities remain unchanged.
