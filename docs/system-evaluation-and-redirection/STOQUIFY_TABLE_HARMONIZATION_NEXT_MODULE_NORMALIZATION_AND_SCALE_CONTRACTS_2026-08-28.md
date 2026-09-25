# Stoquify Table Harmonization NEXT
## Module Normalization and Scale Contracts

Date: 2026-08-28  
Decision context: `system-evaluation-and-redirection`  
Status: Contract phase implemented; module migrations remain gated

## Executive decision

The three NOW pilots have proven the shared contract at focused-test level. The system evaluation still rejects production promotion and approves only bounded engineering with required fixes. Authenticated browser evidence and production-scale measurements are not available.

The next step is therefore executed as a contract and wave-gating layer. X1-X5 are defined in code and tests, but unrelated tables are not migrated yet. A module can enter migration only after its contract, service-owned data boundary, access boundary, representative fixtures, responsive behavior, and evidence plan are approved.

This keeps the next phase aligned with the evaluation redirection: close internally controllable UX and evidence gaps while avoiding a broad release claim or an unmeasured performance commitment.

## Implemented contract surfaces

### X1: Finance and accounting archetypes

The contract covers receivables, payables, cash history, journals, trial balance, profit and loss, cash flow, and close evidence. It allows ledger, evidence, work-queue, analytical, and master-reference archetypes, with server-owned or immutable data ownership.

Required behavior is explicit:

- Freeze identity columns before numeric columns.
- Right-align numeric and currency values.
- Show currency and period/entity context with totals.
- Drill from statement rows to source evidence.
- Keep editable journal drafts separate from posted journals and evidence.
- Require manifests and asynchronous jobs for large statement exports.

### X2: Payroll and HRIS privacy-aware views

The contract covers employees, contracts, compensation, attendance, register, payments, declarations, approvals, and people history. It allows bounded reference, queue, ledger, and evidence archetypes, but preserves the separation between payroll access and HRIS people truth.

Required policy dimensions are own-record, manager-scope, payroll-admin, and auditor. Effective date, country pack, redaction, and payment evidence are mandatory export/view context. Contract-only gating is used until privacy and access evidence is approved.

### X3: POS, cash drawer, inventory movement, and loss control

The contract covers cash-drawer history, inventory movements, loss control, and operational exceptions. The core sale interaction remains outside table replacement. Table work focuses on fast-scan history and exceptions while preserving intermittent connectivity, offline/replay state, queued-action idempotency, and evidence identifiers for source, actor, terminal/location, and status.

### X4: Sales, suppliers, customers, compliance, and administration

The contract covers master/reference, bounded-detail, queue, compliance-evidence, and assurance families. Migration is incremental by value and reuse potential. Detail subtables and setup lists use bounded presets; compliance and assurance use evidence/audit presets. Bespoke markup is removable only after behavior parity is documented.

## X5: Performance envelope and virtualization trial

The scale contract defines representative matching-row tiers of 100, 1,000, 10,000, and 100,000. Matching sets must not be sent wholesale to the browser; browser transfer remains bounded by pagination or a proven window/virtualization strategy.

The measurement set is:

- Bounded client interaction response.
- Server filter/sort feedback.
- Page navigation usefulness.
- Bulk-action job receipt and partial-result availability.
- Preference/view hydration and layout stability.
- Browser row DOM size.
- Export job duration by tier and format.
- Memory, hydration, and rendered-row count.

The contract permits exactly one virtualization trial on one analytical desktop surface. Exit criteria include focus retention, keyboard traversal, screen-reader row discoverability, sticky/frozen-column behavior, variable heights, print/export parity, browser zoom, redaction, and mutation-boundary safety. Broader adoption requires measured benefit at an approved representative tier.

## Proposed engineering budgets

These remain proposed budgets, not current measurements or SLAs, and require product approval:

| Signal | Proposed target | Status |
| --- | --- | --- |
| Bounded client interaction | Under 100 ms at p75 test hardware | Proposed, not measured |
| Server filter/sort feedback | Loading indication under 150 ms; useful result under 1,000 ms at p75 | Proposed, not measured |
| Page navigation | Useful rows under 750 ms at p75 after cached shell | Proposed, not measured |
| Bulk action acknowledgement | Immediate job receipt with progress and partial result | Proposed, not measured |
| Preference/view hydration | No visible column-layout flash after initial shell | Proposed, not measured |
| Browser row DOM | Bounded by pagination or proven virtualization | Proposed, not measured |
| Export job duration | Measure by dataset tier and format | Proposed, not measured |

## Shared invariants for every future module

Every migration must preserve:

- Service-owned business truth and domain action semantics.
- Tenant isolation and server-derived organization scope.
- RBAC and module entitlement as separate access decisions.
- Redaction and least-privilege columns, filters, saved views, and exports.
- Existing protected actions, fresh-auth, maker-checker, replay, and idempotency behavior.
- Bilingual EN/FR copy plus locale-safe dates, numbers, currencies, and period context.
- Truthful loading, refreshing, empty, no-results, error, forbidden, not-entitled, stale, partial-failure, and retry states.
- Query, result-count, selection-scope, and export-scope consistency.

## Execution order after this contract phase

1. Product and security approve the proposed budgets and X1 entry surface.
2. Finance/accounting selects one representative statement surface and records identity, period/entity, currency, evidence-drill, draft/posting, and export behavior parity.
3. The team captures approved authenticated EN/FR desktop, tablet, and mobile evidence for that bounded surface.
4. The team measures the four dataset tiers without browser-wide matching-set transfer.
5. Only after the X1 evidence gate passes does the same method extend to X2, X3, and X4.
6. The X5 virtualization trial remains isolated to one analytical desktop surface and does not become a default table behavior.

## Verification

The new NEXT contract suite passed:

- 1 Jest suite.
- 5 tests.
- 0 failures.

The preceding NOW focused evidence remains 4 suites and 24 passing tests. No authenticated browser evidence was generated because approved credentials and seeded-data authorization were not supplied. No module-wide migration, virtualization rollout, production-scale measurement, or SLA claim is made.

## Implementation files

- `components/DataTableComponents/next-phase-contracts.ts`
- `components/DataTableComponents/index.ts`
- `components/DataTableComponents/__tests__/NextPhaseContracts.test.ts`

## Closure conditions for this NEXT slice

This contract slice is complete when the contracts remain versioned, the invariant test passes, the product-approved budgets are recorded, and the first X1 surface is selected. Module migration is deliberately a subsequent gated action, not implied by this report.

