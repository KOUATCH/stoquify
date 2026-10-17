# Original receivables/payables dashboard plan

Recovered on 2026-10-12 from this conversation's planning turn. Historical planning text follows; its statements about work not yet performed refer to that turn, not current implementation status.

The implementation should proceed through **phases 0–6**, starting with consistent financial definitions and access controls, then building the two operational dashboards.

**No files or code were changed.** I rechecked the project workflow, design contracts, command registry, and verification lanes. `npm run agent:workflow:check` passed.

The plan follows the [project workflow](</E:/ohada saas/Focused projects/stoquify/docs/ecc/WORKFLOW.md>), [design master](</E:/ohada saas/Focused projects/stoquify/design-system/stoquify/MASTER.md>), and [AP payment contract](</E:/ohada saas/Focused projects/stoquify/design-system/stoquify/pages/ap-payment.md>).

**Scope and completion criteria**

The completed dashboards should let an authorized user:

- Understand outstanding, overdue, and upcoming amounts from consistent invoice populations.
- Open the exact records contributing to a metric.
- Identify the next collection or payment action and its supporting evidence.
- Distinguish current balances from activity during a reporting period.
- Recognize incomplete, unavailable, restricted, or stale information.
- Preserve filters, organization, currency, location, and locale through navigation.

Existing payment execution, approval, recovery, and reconciliation controls remain authoritative. The initial dashboard work introduces read models and navigation; it does not introduce new payment writers.

The existing modification in `services/finance/finance-dashboard.service.ts` must be inspected and preserved. Each phase should own a narrow set of files/hunks, with no unrelated cleanup.

**Phase 0 — Establish the financial and UI contracts**

**Deliverables**

1. Record the current baseline:
   - Source revision and relevant existing changes.
   - Current AR/AP routes, actions, services, permissions, and tests.
   - Rendered receivables discrepancy from the review.
   - Outstanding browser verification for payables, French, mobile, and restricted roles.

2. Define a metric contract for each displayed figure:
   - Business meaning and authoritative source.
   - Included/excluded document and payment states.
   - Effective date versus recording date.
   - Currency, location attribution, rounding, and completeness.
   - Required permissions and supporting drill-down.

3. Fix the following definitions before implementation:

| Topic | Planned rule |
|---|---|
| AR outstanding | Current open/partial receivable documents from the AR lifecycle source |
| AP outstanding | Recognized supplier invoice remainder, accounting for verified allocations and credits |
| Purchase orders | Commitments shown separately from recognized invoice liabilities |
| Aging | Not due, 1–30, 31–60, 61–90, and 90+ days overdue |
| Missing due dates | Explicit “Due date unavailable”; do not invent terms |
| Due soon | Separate today, next 7 days, and next 30 days; document whether displayed windows overlap |
| Period receipts/disbursements | Defined effective payment events, with explicit pending/reversal treatment |
| Currency | Separate totals per currency; no implicit conversion |
| Current versus historical | Default current position; historical claims only where the underlying source supports them |
| Completeness | Missing evidence or exceeded limits produces an explicit state, not a misleading total |

4. Resolve AP location attribution, including invoices without purchase-order/location linkage. Do not silently show organization-wide amounts under a location filter.

5. Document the page structure and permission matrix. Add dedicated receivables/payables page contracts during implementation, referencing the existing design master.

**Verification and exit gate**

- Trace every metric to its source and contributing record population.
- Resolve the mismatch between balance totals, aging totals, and counts.
- Confirm destinations support the intended filters; document broader destinations.
- Identify exact test runners and inspect their setup/import side effects.
- No unresolved definition may be represented as an authoritative financial figure.

**Phase 1 — Implement secure, consistent read models**

This is the shared foundation for both pages.

**Deliverables**

- Introduce focused AR/AP dashboard response contracts and server reads.
- Reuse:
  - [AR open-item service](</E:/ohada saas/Focused projects/stoquify/services/accounting/ar-open-item.service.ts>).
  - [AP financial resolver](</E:/ohada saas/Focused projects/stoquify/services/purchasing/ap-history-financial.ts>).
  - Existing collections, AP history, and workbench services where their definitions fit.
- Derive summaries, aging, due-soon amounts, and invoice lists from the same documented population.
- Use complete aggregation and deterministic server pagination. Where bounded evidence reads remain necessary, detect overflow and return unavailable/partial status.
- Preserve decimal values through calculation and serialization.
- Return source, checked time, scope, completeness, and currency metadata.
- Use consistent snapshot/revision handling so concurrent changes cannot silently produce mismatched totals and rows.

**Authorization and caching**

- Derive actor and organization on the server.
- Check permissions before querying protected sources.
- Return only fields authorized for the selected page and supplementary panel.
- Remove the broad-payload path for AR/AP in the existing finance action; changing the UI alone would leave that path callable.
- Audit query keys and invalidation for user/organization changes, permission revocation, and late responses.
- Keep collections, payment readiness, and other supplementary sources independently permissioned and independently recoverable.

**Verification and exit gate**

- AR-only access does not query or return unrelated AP information, and vice versa.
- Foreign-organization identifiers and unauthorized location scopes are rejected.
- Restricted panels return no protected values.
- Totals equal the complete supporting population, irrespective of the visible page.
- Multiple currencies remain separate.
- Limits, missing evidence, and source failure cannot become successful zero totals.
- Existing unrelated finance views retain their behavior.

Relevant regression starting points include the finance action, AR open-item, AP history financial, and AP allocation-integrity suites.

**Phase 2 — Build the receivables dashboard**

**Deliverables**

1. Compact context and filter bar:
   - Organization, location, currency.
   - Current-position checked time.
   - Separate activity period.
   - URL-persisted filters and reset behavior.

2. Primary cards:
   - Outstanding.
   - Overdue.
   - Due within 7 days.
   - Recorded net collections during the selected period.

3. Collection attention queue:
   - Overdue invoices.
   - Due-soon invoices.
   - Missing due-date or allocation evidence where supported.
   - Transparent ordering by due status/date and amount within currency.

4. Invoice worklist:
   - Customer, reference, original amount, allocated amount, outstanding amount.
   - Due date, days overdue, currency, lifecycle status.
   - Search, filtering, sorting, and server pagination.

5. Corrected clickable aging and an evidence detail view:
   - Original obligation.
   - Allocations and relevant adjustments/reversals.
   - Remaining amount and source evidence.
   - Direct Customer AR History handoff.

Retain receipt history as supporting information below the invoice worklist. Replace confidence scoring with explicit evidence states.

**Verification and exit gate**

- Each card and aging bucket opens matching invoices.
- Invoice details explain the displayed remainder.
- Period changes affect activity figures without silently redefining current balances.
- Search and pagination do not change overall totals unless the contract explicitly says they should.
- Browser Back restores scope.
- No posted documents is labelled as missing posted coverage where appropriate, rather than “all customers have paid.”
- Verify English/French, narrow layouts, keyboard navigation, loading, empty, partial, denied, and failed states.

**Phase 3 — Build the payables dashboard**

**Deliverables**

1. Primary cards:
   - Outstanding.
   - Overdue.
   - Due within 7 days.
   - Blocked or awaiting review.

2. Supplier invoice worklist:
   - Supplier, invoice, recognized amount, allocations, credits, remainder.
   - Currency, due date, invoice status, blocker, and next permitted action.

3. Due schedule:
   - Today, upcoming 7 days, upcoming 30 days.
   - Separate overdue and missing-date categories.
   - Totals and counts by currency.

4. Payment readiness summary:
   - Requested.
   - Awaiting independent approval.
   - Approved.
   - Executing.
   - Uncertain/recovery required.
   - Executed.
   - Reconciliation pending/completed.

5. Existing blocker summaries:
   - Matching exceptions.
   - Bank-detail review.
   - Ledger posting failures.
   - Reconciliation exceptions.

Readiness labels must come from actual workflow state and evidence. If the source only provides a count, show a count rather than inventing an amount.

**Verification and exit gate**

- Supplier invoice remainder reconciles with verified allocations and credits.
- Purchase orders do not inflate recognized liabilities.
- Unverified financial evidence remains unavailable.
- Approval is never labelled execution; execution is never labelled reconciliation.
- An uncertain payment routes to recovery.
- Location filters do not silently drop unassigned obligations.
- Verify rendered payables directly, including the states not reached during the audit.

**Phase 4 — Connect existing workflows and controlled evidence**

**Deliverables**

- Connect AR cards, rows, and details to Customer AR History and existing settlement evidence.
- Connect AP rows to invoice review, payment request, independent approval, execution, recovery, and reconciliation.
- Preserve supported filters, locale, and return navigation.
- Explain when a destination intentionally has broader scope.
- Show only actions the user can take, while retaining independent server authorization at every destination.
- Reuse existing controlled export paths. Specify whether each export contains invoice records, payment history, or summaries; never label a visible-page subset as a complete ledger export.

**Verification and exit gate**

- Exercise reader, requester, approver, execution, and reconciliation permission combinations.
- Verify denied access through direct URLs and server actions.
- Verify stale revisions, expired sessions, and changed permissions.
- Confirm dashboard navigation does not initiate a financial mutation.
- For exports, verify read/export permissions, fresh authentication, audit behavior, scope metadata, currency, completeness, and CSV safety.
- Check that existing maker-checker and duplicate-execution controls remain unchanged.

**Phase 5 — Add performance, follow-up, and funding capabilities**

Implement this in three separately verifiable parts.

**5A: Performance analysis**

- Add overdue share, customer/supplier concentration, and supported period collection/payment measures.
- Introduce historical outstanding or aging trends only after proving historical reconstruction or snapshot coverage.
- Explain comparison windows and incomplete periods.
- Defer collection-time metrics when invoice/payment linkage cannot support them reliably.

**Verification:** historical scenarios remain reproducible after later payments, reversals, or corrections; comparisons use consistent populations.

**5B: Collection follow-up**

- Inspect existing ownership, contact, dispute, and promise-to-pay capabilities first.
- Reuse them where available.
- If missing, define a small audited workflow for owner, next action, due date, contact history, and promise-to-pay state.
- Keep collection promises separate from ledger balances.
- Treat reminder preparation and sending as distinct actions; no automatic sending is introduced by the dashboard work.

**Verification:** tenant isolation, edit permissions, audit history, duplicate handling, and unchanged financial balances. Any schema change requires a separately reviewed migration and target.

**5C: Funding and contractual opportunities**

- Compare upcoming AP obligations with an explicitly defined, evidenced funds source.
- Separate currencies, timestamps, restricted funds, and existing commitments where supported.
- Show unavailable funding information honestly.
- Add early-payment opportunities only when verified terms, dates, and eligible amounts exist.

**Verification:** no double-counting of commitments, unsupported cash availability, implicit FX conversion, or estimated discounts presented as facts.

If prerequisites are absent, record the affected feature as deferred with its dependency. Do not mark that feature complete merely because an unavailable state exists.

**Phase 6 — Complete verification and controlled rollout**

Testing begins in each earlier phase. This phase completes cross-page, database, accessibility, and release evidence.

| Evidence class | Required verification |
|---|---|
| Source inspection | Correct authority, scope, field redaction, metric definitions, and unchanged payment controls |
| Unit/service tests | Arithmetic, lifecycle states, aging boundaries, dates, currencies, limits, failures, and permissions |
| Component tests | Filter behavior, drill-downs, partial states, locale copy, focus and status announcements |
| Real PostgreSQL | Aggregate/list consistency, allocation relationships, concurrency during reads, tenant isolation, and realistic-volume queries |
| Browser checks | Both routes; EN/FR; desktop/mobile; permitted/restricted roles; navigation, recovery, and exports |
| Operational review | Query plans, observed latency, result-size limits, diagnostics without sensitive-data leakage, and rollback |

**Minimum financial fixtures**

- Fully unpaid, partially paid, settled, cancelled, and voided documents.
- Due today and immediately across each aging boundary.
- Missing due dates.
- Credits, reversals, and invalid allocation evidence.
- Pending versus recorded payments.
- Multiple currencies and locations, including unassigned AP invoices.
- Empty sources, source failures, exceeded bounds, and large populations.
- Organization switching and permission revocation during an in-flight request.

**Project command controls**

Before each check, inspect the current command, lifecycle hooks, configuration, and imports against the [verification lanes](</E:/ohada saas/Focused projects/stoquify/docs/ecc/test-lanes.md>).

- Start with `npm run agent:workflow:check`.
- Select targeted service/component suites after reviewing their execution path.
- Run scoped lint and TypeScript checks appropriate to the changed files.
- Do not use `npm run build`, `verify:ci`, or seed/migration wrappers as routine read-only verification.
- Real database tests require an explicitly identified disposable target and reviewed fixture/cleanup behavior.
- Skipped tests, mocked persistence, and browser timeouts remain explicit limitations.

**Release and rollback gate**

Release AR and AP independently after their applicable checks pass. Record the source revision, changed files, commands, results, browser roles/locales/viewports, and remaining limitations.

Rollback should revert only the owned presentation/read-model changes. Preserve security corrections; if a replacement financial panel cannot be trusted, show an unavailable state or retain navigation to the established history/workbench rather than restoring misleading totals.

**Recommended implementation sequence**

Begin with **phases 0 and 1**, then deliver **phase 2 for receivables** and **phase 3 for payables** against that foundation. Complete workflow connections in phase 4, add evidence-supported advanced features in phase 5, and close release verification in phase 6.

This planning turn ran only the workflow validator. Application tests, database fixtures, browser verification, migrations, and implementation remain unexecuted.
