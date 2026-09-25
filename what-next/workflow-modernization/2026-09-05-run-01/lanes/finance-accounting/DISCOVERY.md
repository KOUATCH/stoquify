# Finance, accounting and close discovery

Evidence: 2026-09-05T18:25:19.604Z. 34 provisional semantic workflows; zero runtime visits or complete workflow verifications in this lane. Source-only inspection during the browser freeze. No application changes, DB operations, tests, migrations or external services were run. Discovery is paused for the authorized organization directory correction; archived-account report omission is next priority.

## Material findings

### FA-F01: Archiving posted-history chart account hides its balances from reports

Status: source_confirmed_unexecuted. Severity: high.

Archive sets deletedAt even with journal lines. Trial balance builds its map only from nondeleted accounts, then continues past every posted line whose account is absent. Financial statement aggregation classifies only nondeleted accounts. Stored financial evidence survives but reported amounts disappear. Archive UI also promises archived nodes while listChartAccounts excludes deleted rows.

Source: services/accounting/accounts.service.ts:246; services/accounting/reports.service.ts:77; services/accounting/reports.service.ts:118; services/accounting/financial-statements.service.ts:503; services/accounting/financial-statements.service.ts:260.

Next: After organization directory correction, reproduce archived posted debit/credit preservation; preserve retained account descriptors in reporting and separate new-post eligibility from historical inclusion. Do not clear posted data or weaken financial controls.

### FA-F02: Failed accounting list queries still display zero totals and successful empty tables

Status: source_confirmed_unexecuted. Severity: high.

Accounts error is exposed as panel description, but totals are 0 and body says No accounts yet. Journals flag outer result-state error yet CanonicalTableBoundary remains ready; posted panel says No posted journal entries yet and never carries failed entries description. Actual successful empty state must remain distinct.

Source: app/[locale]/(dashboard)/dashboard/accounting/accounts/page.tsx:59; app/[locale]/(dashboard)/dashboard/accounting/journals/page.tsx:168.

Next: Test both lookup failures, withhold numerical/empty-success presentation, provide localized retry. New journal create page already has separate failure path from prior module work.

### FA-F03: Overview receivable/payable totals omit inactive retained counterparties and rows after100

Status: source_confirmed_unexecuted. Severity: high.

Totals and top balances derive from first100 active nondeleted Customer/Supplier rows. Their retained obligations can persist after permitted deactivation. AR history instead reads immutable receivable docs regardless customer activity; older legacy-only balances need explicit scope rather than silently dropped. Aging derives orders, so totals and aging are not the same basis.

Source: services/finance/finance-dashboard.service.ts:693; services/finance/finance-dashboard.service.ts:708; services/finance/finance-dashboard.service.ts:766; services/accounting/ar-open-item.service.ts:182.

Next: Compare authoritative receivable/payable owners and keep retained obligations in aggregate; bound only previews, not totals; label basis/time/location.

### FA-F04: Journal UI cannot reach evidence older than newest100 entries

Status: source_confirmed_unexecuted. Severity: medium.

One take100 query is split into drafts and posted entries after loading. No server cursor/page control in this page; many drafts can hide older posted evidence.

Source: app/[locale]/(dashboard)/dashboard/accounting/journals/page.tsx:164; services/accounting/journals.service.ts:284.

Next: Add actual server-owned history query/paging separately for evidence and new work, preserving scope and permissions.

### FA-F05: Missing UI handoffs for existing evidence and approval controls

Status: source_confirmed_unexecuted. Severity: medium.

Request/respond/accept missing evidence actions have no located UI caller. Waiver request button and approval hook exist, but approve mutation is not invoked by component. Control text announces fresh-auth requirement without an in-flow password challenge. General ledger and chart update actions likewise have no located UI entry.

Source: actions/accounting/close-assurance.actions.ts; hooks/accounting/useCloseAssurance.ts; components/accounting/CloseAssuranceCenter.tsx.

Next: Trace all consumers before building; extend existing close center with authorized evidence/approval and retry controls; do not manufacture approvals.

### FA-F06: Post-commit revalidation can obscure completed accounting/close mutations

Status: source_confirmed_risk_not_runtime_reproduced. Severity: medium.

Actions await durable service mutation then revalidate paths inside protected error scope. Cache failure may return failed response after commit; UI retries lack durable request key for several legacy mutations.

Source: actions/accounting/close-assurance.actions.ts; actions/accounting/settings.actions.ts; actions/accounting/journals.actions.ts.

Next: Reuse committed-result/cache-status pattern where relevant and exercise response-loss/reload failures without weakening idempotency or controls.

### FA-F07: Async export worker contract lacks located production artifact/dispatch handoff

Status: handoff_not_found. Severity: medium.

Queue/lease/completion/service contracts exist; worker requires injected buildArtifact. Bounded source search found no production invocation or concrete storage/download-grant/scheduler handoff. Runtime configuration flags do not prove delivery.

Source: services/accounting/finance-statement-export.service.ts:401; services/accounting/finance-statement-export-operations.service.ts.

Next: Discover intended deployment adapter; do not simulate completed exports or publish private artifacts.

### FA-F08: Denied certified export invalidation audit appears inside rolled-back transaction

Status: source_risk_requires_reproduction. Severity: medium.

In blocked CERTIFIED branch, recordInvalidationEvidenceInTx is awaited then BusinessRuleError thrown inside same db.$transaction. This specific attempt evidence may roll back, even though other source-invalidation owners can persist evidence separately.

Source: services/accounting/close-assurance-pack.service.ts:1927; services/accounting/close-assurance-pack.service.ts:1956.

Next: Focused failed-certification test asserting durable denial/invalidation effects; distinguish existing external source invalidation from this transaction.

### FA-F09: Fiscal-year monthly periods can start before explicit fiscal-year start

Status: source_risk_requires_reproduction. Severity: medium.

Monthly cursor initializes first day of startDate month, not supplied startDate. For mid-month year start first period begins earlier. Overlap/close/post races not investigated fully.

Source: services/accounting/periods.service.ts:119.

Next: Meaningful non-month-start and overlapping-year boundary tests before change.

### FA-F10: Finance query cache has no tenant or actor component

Status: source_risk_requires_reproduction. Severity: medium.

Key uses view/location/period/date only. Global provider lifetime plus session replacement needs actual reproduction before claiming cross-user exposure; server identity remains current on each request.

Source: hooks/finance/useFinanceDashboard.ts:8.

Next: Coordinate parent identity/cache lifecycle trace; verify old tenant data clears at logout/session change.

## Existing behavior worth preserving

Finance actions return explicit error envelopes; specialized surfaces distinguish initial failure and offer retry. Trial balance, financial statements, setup, close and accountant portal have unavailable paths; the account/journal list contradiction is narrower. Close collectors persist UNAVAILABLE/BLOCKED when source reads fail instead of treating failed checks as no blockers. Setup readiness checks actual chart/journals/current open period/balanced posting-rule scaffolds. Certified close exports require separate runner/certifier, fresh authentication and evidence freshness; this review grants no statutory/professional certification. Manual draft admission is separate from mandatory posted/reversed ledger effects.

## Retained records and overlapping workflows

CS statements and OTC-04 billing rely on immutable CustomerReceivableDocument, lifecycle states and ledger effects. AR history queries those records without filtering active customers. The overview uses different active-counterparty balances and order aging; reconcile these meanings explicitly. Accountant invitation delivery belongs to notifications; daily sales belongs to SALES-DAILY-01. No duplicate completeness claims are made.

## Remaining discovery and verification

- Reconciliation provider ingestion/matching/manual suspense/signoff (existing source; not a workflow-completion claim)
- Detailed cash-history/drawer transactional owners and background runners
- End-to-end accounting-source automatic posting consumers and close-invalidation matrix
- Precise finance metric arithmetic/budgets and authorization-filtered destinations
- Actual EN/FR/mobile/keyboard/accessibility/performance journeys

WORKFLOW_REGISTER.json gives per-workflow actions/services, permissions, transitions, known handoff gaps and unvisited status. SOURCE_BINDING.json records the inspected source snapshot. Graph nodes are relationship hints verified against current source, not evidence that a workflow runs.
