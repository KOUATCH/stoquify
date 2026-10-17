# Receivables/payables phases 4–5 implementation and evidence

Date: 2026-10-12. Source baseline: `6f7f6741`, with a large pre-existing dirty tree. No commit or staging performed. The original numbered plan was recovered from the planning turn in this conversation and saved in [original plan](receivables-payables-dashboard-original-plan.md). This supersedes the earlier uncertainty about phase numbering; it does not retroactively certify earlier work.

## Delivery status

Phase 4 implementation is present; full rendered role/locale/mobile acceptance remains open. Phase 5A delivers current exposure and supported activity, 5B reuses existing statement responses and defines the missing workflow, and 5C explicitly reports unavailable funding. Historical trends, a general collection-case workflow, funding calculations, and early-payment discounts are **deferred**, not completed by explanatory copy. Phase 6 rollout certification is not claimed.

### Phase 4: workflow handoffs and controlled evidence

- Dashboard invoice filters, pagination revision, and independent applied activity dates have validated URL representation. History links carry an allowlisted same-locale return route. Caller tenant/actor fields are never accepted from that URL.
- AR invoice details open Customer AR History with customer scope and the exact selected retained document. The history exposes a customer-scope explanation and a clear-customer-filter action. Its query cache is partitioned by actor, organization, permissions and filters; denial removes prior data.
- AP invoice details open AP History with supplier, invoice lane, exact invoice ID and selected row. Invoice ID applies to both displayed records and full-summary reads, cursor filter identity and controlled export filters. Server queries still include organization ID; a foreign invoice yields no rows. Invoice selection is rejected in mixed/payment lanes.
- AP drawer/workflow links expose invoice review, requests, independent approval, execution, invoice/payment recovery, and reconciliation only for matching permissions. Reconciliation requires both reconciliation-read and journal-read. The AP workbench root requires invoice-view. These destinations keep their independent server guards and module checks. They do not accept invoice preselection, so the drawer explicitly discloses their broader organization scope. Browser Back returns to the URL-persisted dashboard scope.
- Existing controlled exports are reused in history. Dashboard copy explains that an export follows history scope and is not the visible invoice page. Exact AP invoice exports retain the invoice filter. AR CSV metadata now includes organization, customer filter, row count, retained-record scope, currency summaries and existing temporal/hash/watermark evidence.
- AR export now requires read AND export permissions before source reads, fresh server-owned authority, and actor/organization/session rechecks before returning bytes. The client checks response scope and drops late export results after a workspace/filter change or unmount. Mandatory audit failures withhold the artifact. CSV text formulas preceded by whitespace/control characters are escaped. Export reads and audit use repeatable-read. AP's existing controlled-export checks remain in place; both history read actions recheck authority after reading.
- Export buttons are omitted for AR readers without export authority and AP readers without the server-provided report-export permission. The shared history shell now supports an absent export action; existing callers supplying an action retain their behavior.
- No payment/approval/recovery/reconciliation command implementation changed. Navigation never submits those commands. No reminder or statement was sent.

### Phase 5A: current exposure and supported period activity

For each complete currency/location population, the server calculates:

| Measure | Definition |
|---|---|
| Overdue share | Current overdue remainder / all current open remainder × 100 |
| Largest counterparty share | Largest current counterparty remainder / all current open remainder × 100 |
| Top-five share | Sum of five largest current counterparty remainders / all current open remainder × 100 |
| Due tomorrow through 30 days | Current remainder with organization-local due day 1–30 ahead; excludes today and overdue |

Decimal arithmetic is used throughout; percentage strings round to two decimals. Unknown due dates remain in the denominator. Invoice search, queue, aging, party and pagination do not redefine the population. Any unverified remainder suppresses the affected currency's percentages; a zero denominator is unavailable. No currencies are combined.

AR retains the existing independently scoped receipts/refunds/reversals/net panel. AP adds a separate dated payment-activity panel using the existing AP History action, financial resolver and full filtered summary rather than the visible page. It labels verified **recorded released payments**, by payment date and organization timezone, separately by currency. It does not claim reconciled bank outflow, net cash availability or the reduction of current invoice balances. Missing financial evidence remains unavailable. Its period is organization-wide, ignores invoice location/currency/table filters, and carries into the history drill-down. Current periods may be incomplete; no comparative trend is claimed.

Historical outstanding/aging comparisons and collection-time metrics remain deferred. Dependencies: a separately tested historical reconstruction/snapshot coverage contract for each source, later payment/reversal/correction scenarios, stable comparison populations and adequate invoice/payment linkage. Current metrics and recorded payment activity do not satisfy those prerequisites.

### Phase 5B: reuse and missing audited follow-up workflow

Source inspection found `CustomerStatementRecipientAction` and versioned `CustomerStatementRecipientActionState`, `CustomerStatementResponses`, and `customer-statement-response.service.ts`. They already support disputes/promises, retained statement evidence and audited review with tenant/permission/fresh-session checks. AR details link to the existing customer's statement workflow only when both `customers.read` and `accounting.exports.create` are available; its accounting module and command-specific permissions remain authoritative. No promise is deducted from the ledger balance.

General collection owner, next-action deadline and contact-log management are not provided by that statement-response workflow. Define the deferred extension as follows:

1. One tenant-scoped collection case linked to a customer and optional retained AR document; fields: assigned active member, next action, due timestamp, status, revision, creator and timestamps.
2. Append-only case events for assignment, next-action change, manually recorded contact outcome and closure/reopening. Store actor, reason, expected revision, idempotency key and prior/new state evidence. Reject foreign customer/document/member references, stale revisions and same-key changed payloads.
3. Link existing statement response IDs for disputes/promises rather than copying their amount/status into an independent source of truth. Closing a case or acknowledging a promise must not alter receivable/settlement records.
4. Require explicit case read/manage permissions through the existing permission registry and server-owned organization. Reviewer/member visibility rules require domain approval before migration; do not infer collection-edit authority from finance-read.
5. Reminder preparation produces a reviewed draft. Sending is a separate, explicitly authorized existing delivery command with recipient/content evidence and duplicate handling; no dashboard-triggered automatic sending.
6. Before implementation, review the schema/migration and disposable target separately. Verify tenant isolation, role changes, stale revisions, duplicate replay, append-only audit continuity and unchanged financial balances with real write/rollback fixtures. No schema or migration is included in this slice.

### Phase 5C: explicit deferrals

The inspected Cash Command sources describe collected/unreconciled/suspense amounts, not an authoritative freely available bank balance. The AP page states that funding coverage is unavailable. Actual coverage needs source account identity, currency, as-of timestamp, reconciliation/freshness policy, restricted-funds treatment, all relevant commitments and a no-double-counting rule. No cash/receipt figure is substituted for funds available to pay suppliers.

Existing invoice discount amounts or free-form/payment-day terms do not establish an enforceable early-payment opportunity. That feature needs verified contractual rate/amount, eligibility base, deadline/timezone, currency and current unpaid eligibility after credits/allocations. No estimated savings or implicit FX is introduced.

## Verification and limits

Commands were inspected against `docs/ecc/command-registry.json` and current definitions. Scoped Jest uses direct SWC with explicit mocked/pure suites, no application setup or environment bootstrap. The read-only runner separately loads the existing database target and enforces PostgreSQL read-only connection/transaction settings. No migration, seed, build or broad verification wrapper ran.

- Workflow contract: `npm run agent:workflow:check` passed at task start; final rerun recorded below.
- Mocked unit/component/hooks: `node node_modules/jest/bin/jest.js --config jest.open-items-dashboard.config.cjs --runInBand --no-cache`. Final count recorded below. Covers arithmetic, unknown/zero denominators, currency isolation, permission combinations, safe return URLs, exact AP scope, export scope/audit/CSV/fresh-auth failures, revoked authority, late AR exports, period activity, and existing phase 0–3 regressions. Mocked authority/persistence is not real session or transaction proof.
- Types: `node node_modules/typescript/bin/tsc --noEmit --incremental false -p tsconfig.open-items-dashboard.json` passed after the main changes. It includes both history workbenches and their imported source. Final rerun recorded below.
- Lint: direct installed ESLint over the changed dashboard/history/navigation/action/service files passed. No autofix used.
- Real PostgreSQL: `node scripts/run-open-items-readonly-verification.cjs --verify 'Wilkinson - Feeney 001'` — **10 passed**. Existing data only; PostgreSQL enforced read-only and repeatable-read. Checked AR/AP balance conservation, percentage tie-out, queues, stale revisions, tenant/location exclusion, workflow counts, receipt arithmetic, and exact AP invoice/summary scope including foreign invoice exclusion. No export audit writes, concurrency contenders, mutations, cleanup, migrations or fixtures.

Rendered observations: localhost, IAB, existing SUPER ADMIN Amina Ngono / Wilkinson - Feeney 001, English, default viewport (history DOM measured 927 CSS px wide; document scroll width 916). AR showed 3 overdue invoices, XAF 197,201.25 outstanding, 100.00% overdue and 38.66% largest counterparty. The overdue queue persisted in the URL; an invoice drawer showed the permissioned statement response link and exact history URL. The exact retained AR document opened in history; closing it eventually produced the customer-filtered single-row list and correct return URL. The export controls became visible after authority loaded. No export was downloaded or step-up credential supplied.

Browser limits: route transitions were slow and one route error recovered through its Retry action. Return navigation and a subsequent French navigation encountered timeouts; localhost then reported connection refused. These attempts do not count as successful rendered checks. No current French/mobile/alternate-role/accessibility certification, nor screenshot proof, is claimed. AP purchasing configuration is disabled for this organization; no active AP-enabled candidate was identified in the earlier inspection. The real AP service checks do not certify rendered AP module admission. Module activation and role grants were not changed.

Source/skill evidence: followed WORKFLOW, command registry, design master and AR/AP contracts. Applied the existing ECC security-review/verification-loop guidance. UI/UX Pro Max focused query `deep linking preserve filters back navigation` returned `ux-guidelines.csv` Navigation/Deep Linking and Mobile/Back Button; applied URL state and return navigation, ignored unrelated sticky-navigation advice. No Next 16 or Tailwind 4 APIs introduced. Existing graph discovery identifies AP control components/actions; current source, not graph age/counts, supports behavior claims.

## Rollback and remaining acceptance

Revert only the owned dashboard/navigation/read-model additions if required; retain the export and tenant-boundary corrections. Do not restore misleading aggregate figures. Shared files include the history shell and both history workbenches; preserve their unrelated table-system edits. No schema/data rollback is needed.

Before phase 6 acceptance: restore a reliable local browser server, verify EN/FR/mobile and keyboard/focus/return journeys, use an existing AP-enabled organization and least-privilege role fixtures, exercise controlled downloads with legitimate step-up and audit evidence on an approved test target, and complete real concurrency/rollback plus performance evidence. Deferred 5B/5C prerequisites require their own implementation and cannot be certified by this dashboard slice.

## Final command results

- Workflow validator: passed again; 198 scripts remain outside the reviewed manifest (none implicitly admitted).
- Scoped mocked suite: **21 suites / 159 tests passed**. After the final AR export response-scope binding, the affected action/hook suites were rerun: **2 suites / 13 tests passed**.
- Scoped TypeScript: passed, with history workbenches included; final route-inclusive check and error-link regression are recorded below.
- Scoped ESLint: passed over dashboard, history, navigation, hooks, actions and services; the last AR export/AP export-visibility changes were separately linted successfully.
- Read-only PostgreSQL: **1 suite / 10 tests passed** against the explicitly authorized current database/organization, with real read-only transaction checks.
- Scoped `git diff --check`: exit 0; Git emitted only line-ending normalization warnings. No staging, commit, reset or unrelated cleanup.

Owned implementation areas: `components/finance/OpenItemsDashboard`, `OpenItemsExplorer`, `OpenItemsReturnLink`, `PayablesWorkflowPanel`, new `PayablesPaymentActivity`; AR/AP history workbenches and hooks; new `useOpenItemsScope` and `lib/finance/open-items-navigation`; open-item summary contract/service; AR history action/export service; AP history schema/read/export-filter handoff and post-read authority check; AP history route export-visibility prop; optional export action in the shared history shell. Scoped tests/configs, read-only assertions, this report, recovered original plan and AR/AP page-contract additions accompany them. Existing unrelated edits in shared files were retained.

The final dashboard error-link regression passed (**8 tests**), and its lint passed. Existing supplier-scoped AP History reset behavior is preserved; the new exact-invoice handoff can explicitly reset to full history.

Final route-inclusive scoped TypeScript check: **passed (exit 0)**.
