# Accounting findings and risk register

Date: 8 September 2026. 15 findings: 7 high-priority (P1), 8 medium-priority (P2). Priority describes remediation urgency, not a proven incident or loss.

Reproduced means actual service code ran with synthetic in-memory database doubles. Static control gaps and concurrency hypotheses have different evidentiary weight. Source ranges and hashes are retained in [finding-source-evidence.json](<E:/ohada saas/Focused projects/stoquify/what-next/accounting-enterprise-audit/2026-09-08-run-01/evidence/finding-source-evidence.json>); deployed state is unverified. Financial, operational and reputational consequences are conditional impacts, not observed customer incidents. No independent professional certification is provided.

| ID | Priority | Finding | Evidence status |
|---|---|---|---|
| ACC-001 | P1 | Currency conversion and reporting do not preserve base-currency meaning | CONFIRMED REPRODUCED |
| ACC-002 | P1 | Locked accounting configuration remains mutable | CONFIRMED REPRODUCED |
| ACC-003 | P1 | Generic journal reversal bypasses source-owned correction workflows | CONFIRMED REPRODUCED |
| ACC-004 | P1 | Posting, reversal and period close lack a uniform concurrency protocol | CREDIBLE RISK REQUIRES DATABASE VALIDATION |
| ACC-005 | P1 | Period closure and close-assurance readiness use different blockers | CONFIRMED CONTROL GAP REPRODUCED |
| ACC-006 | P2 | Manual journal dimensions are not validated against tenant ownership | CONFIRMED REPRODUCED |
| ACC-007 | P1 | Ledger immutability and tenant consistency depend primarily on application paths | REPOSITORY CONTROL GAP DEPLOYMENT UNVERIFIED |
| ACC-008 | P2 | Fiscal period creation can extend before the requested fiscal year and allows overlap | CONFIRMED PARTIAL START DEFECT WITH STATIC OVERLAP RISK |
| ACC-009 | P2 | Date-filtered general ledger omits the opening balance | CONFIRMED REPRODUCED SEMANTIC GAP |
| ACC-010 | P2 | Accountant portal cache identity and refresh coverage are incomplete | CONFIRMED CACHE CONTRACT GAP WITH CONDITIONAL EXPOSURE |
| ACC-011 | P2 | Shared accounting display can mislabel currency, round away precision and turn invalid values into zero | CONFIRMED STATIC DEFECT |
| ACC-012 | P2 | Journal and portal screens overstate completeness or freshness in edge states | CONFIRMED STATIC WORKFLOW GAP |
| ACC-013 | P2 | Large ledger reads are unbounded and statements lack a shared read snapshot | CONFIRMED QUERY SHAPE WITH MEASURED CPU PAYLOAD AND UNVERIFIED DB RISK |
| ACC-014 | P1 | Finance operational metrics are presented with accounting proof labels | CONFIRMED STATIC DEFECT |
| ACC-015 | P2 | Integration verification is not green and production assurance evidence remains incomplete | CONFIRMED TEST FAILURES AND EXTERNAL EVIDENCE BLOCKERS |

## ACC-001 — Currency conversion and reporting do not preserve base-currency meaning

**Priority:** P1. **Status:** CONFIRMED_REPRODUCED. **Confidence:** High. **Likelihood:** High when non-base currencies are used; current tenant exposure unknown.

**Capability:** Manual journals, POS, inventory and financial reporting.

**Trigger:** Post 100 EUR with a synthetic base rate of 655.957, then report alongside 100 XAF. The manual service stores baseDebit=100 while retaining the rate; statement aggregation sums nominal debit/credit without currency partition and labels the result using current baseCurrency.

**Expected:** Either reject unsupported non-base currency or persist validated transaction/base amounts and aggregate each report in its declared currency.

**Observed:** Synthetic report assets=200.00 XAF and isBalanced=true; converted base amount would be 65695.70. The action schema does not accept exchangeRate. The primary POS call omits currency and postSale defaults to XAF; inventory adjustment also uses XAF.

**Root cause:** Currency is accepted as metadata while rate application, producer currency selection and reporting basis are inconsistent.

**Consequences:** Assets, revenue, costs, tax balances and equity can be materially misstated while debit/credit equality remains green. External statements and management decisions can inherit the error. No affected live records or loss amount were established.

**Existing controls:** Per-currency journal balancing, Decimal arithmetic, scoped account checks and internal-report disclosures already exist. These cannot detect equal errors on both sides.

**Source evidence:**

- [services/accounting/journals.service.ts lines 326–350](<E:/ohada saas/Focused projects/stoquify/services/accounting/journals.service.ts:326>)
- [actions/accounting/journals.actions.ts lines 28–38](<E:/ohada saas/Focused projects/stoquify/actions/accounting/journals.actions.ts:28>)
- [services/accounting/financial-statements.service.ts lines 533–585](<E:/ohada saas/Focused projects/stoquify/services/accounting/financial-statements.service.ts:533>)
- [services/accounting/reports.service.ts lines 125–146](<E:/ohada saas/Focused projects/stoquify/services/accounting/reports.service.ts:125>)
- [services/accounting/postings/post-sale.ts lines 512–578](<E:/ohada saas/Focused projects/stoquify/services/accounting/postings/post-sale.ts:512>)
- [services/pos/pos.service.ts lines 2528–2536](<E:/ohada saas/Focused projects/stoquify/services/pos/pos.service.ts:2528>)
- [services/inventory/inventory-adjustment.service.ts lines 800–823](<E:/ohada saas/Focused projects/stoquify/services/inventory/inventory-adjustment.service.ts:800>)

**Verification evidence:** behavior-probes.json: FX_BASE_AMOUNT; behavior-probes.json: REPORT_CURRENCY_MIX. See the [evidence index](<E:/ohada saas/Focused projects/stoquify/docs/accounting/evidence-index.md>).

**Correction:** Define supported currency policy first. Until conversion is implemented and verified, enforce base-currency-only posting at every producer and action. Then implement rate provenance, effective dates, validated precision and explicit transaction/base reporting contracts.

**Owner:** Accounting domain lead with database and POS/inventory owners. **Effort:** Containment 2–4 engineering days; complete FX support 2–4 weeks plus accountant review. **Dependencies:** ACC-002, ACC-011

**Data investigation / repair:** Inventory journal currencies and base/nominal discrepancies per tenant and source. Preserve originals; use reviewed adjustments or a controlled conversion migration only after quantifying scope.

**Acceptance criteria:**

- Mixed-currency and non-XAF-tenant cases either fail explicitly or tie to independently calculated base totals
- Rate changes cannot change historical posted meaning
- Trial balance, statements, exports and source subledgers agree on currency and rounding
- Zero balanced difference is never the sole monetary correctness check

## ACC-002 — Locked accounting configuration remains mutable

**Priority:** P1. **Status:** CONFIRMED_REPRODUCED. **Confidence:** High. **Likelihood:** Medium: requires a settings-authorized actor.

**Capability:** Accounting setup and policy governance.

**Trigger:** An administrator updates a LOCKED, enabled configuration from XAF to EUR and supplies a new valuation policy and rounding scale.

**Expected:** Material policy changes are rejected after use or handled as effective-dated, reviewed transitions with data implications and close invalidation.

**Observed:** The service accepts EUR, ARBITRARY_POLICY and scale 6 while setupStatus remains LOCKED. It performs no posted-activity lookup or setup-lock check. Statement currency is then read from the mutable setting.

**Root cause:** Setup controls protect activation/locking but do not govern the generic settings update; valuation and rounding modes are free strings.

**Consequences:** History can be relabeled in a new currency without conversion. Valuation, calendar and tax-policy changes can undermine reproducibility, close evidence and customer trust. No actual tenant configuration was changed in this audit.

**Existing controls:** Settings action requires setup permission and fresh authentication; updates emit a ledger audit event.

**Source evidence:**

- [services/accounting/accounting-settings.service.ts lines 252–289](<E:/ohada saas/Focused projects/stoquify/services/accounting/accounting-settings.service.ts:252>)
- [actions/accounting/settings.actions.ts lines 34–43](<E:/ohada saas/Focused projects/stoquify/actions/accounting/settings.actions.ts:34>)
- [actions/accounting/settings.actions.ts lines 95–110](<E:/ohada saas/Focused projects/stoquify/actions/accounting/settings.actions.ts:95>)
- [services/accounting/financial-statements.service.ts lines 565–585](<E:/ohada saas/Focused projects/stoquify/services/accounting/financial-statements.service.ts:565>)

**Verification evidence:** behavior-probes.json: LOCKED_SETTINGS_MUTATION. See the [evidence index](<E:/ohada saas/Focused projects/stoquify/docs/accounting/evidence-index.md>).

**Correction:** Freeze material settings after first posting; allow only enumerated supported policies. Introduce reviewed effective-dated changes where business needs require them, with before/after evidence and affected-close invalidation.

**Owner:** Accounting controls and platform configuration owners. **Effort:** 3–6 days for guards; 1–2 weeks for a policy transition workflow. **Dependencies:** None; establish this boundary first.

**Data investigation / repair:** Review settings audit history against earliest postings; identify currency or valuation changes, reconstruct old policy versions and assess affected reports before repair.

**Acceptance criteria:**

- LOCKED and used configurations reject prohibited mutations through direct service and action calls
- Unsupported policy strings fail validation
- Approved policy transitions retain historical versions and invalidate affected assurance evidence

## ACC-003 — Generic journal reversal bypasses source-owned correction workflows

**Priority:** P1. **Status:** CONFIRMED_REPRODUCED. **Confidence:** High. **Likelihood:** Medium to high for authorized journal operators.

**Capability:** POS/AP/inventory/payroll corrections and ledger traceability.

**Trigger:** Reverse a posted POS_SALE through reverseJournalEntry instead of the POS refund/void command.

**Expected:** Source-owned entries use their owning correction workflow, or a separately classified accountant adjustment preserves source truth and exposes the reconciling difference.

**Observed:** Only CUSTOMER_SETTLEMENT is explicitly rejected. A POS_SALE original becomes REVERSED and a MANUAL reversing journal is created without changing the sale, tender or stock. The UI offers Reverse for every POSTED entry with the hidden reason 'Manual reversal'. Existing source batches are not transitioned by this generic path.

**Root cause:** Source-specific reversal authority is not enforced for all producer types in the common command.

**Consequences:** A balanced ledger can disagree with sales, stock, customer/supplier balances or payroll. POS/AP replay checks requiring a POSTED original may subsequently reject recovery. Source link coverage may remain high despite economic inconsistency; investigation and reviewed source reconciliation are needed.

**Existing controls:** Fresh authentication and sensitive-action policy apply. Reversal links and audit events exist. Reports correctly retain REVERSED originals together with reversal entries, so this is not an omission/double-counting claim about the report status filter.

**Source evidence:**

- [services/accounting/posting.service.ts lines 400–503](<E:/ohada saas/Focused projects/stoquify/services/accounting/posting.service.ts:400>)
- [app/[locale]/(dashboard)/dashboard/accounting/journals/page.tsx lines 131–139](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/journals/page.tsx:131>)
- [services/accounting/postings/post-sale.ts lines 489–503](<E:/ohada saas/Focused projects/stoquify/services/accounting/postings/post-sale.ts:489>)
- [services/purchasing/ap-control.service.ts lines 654–679](<E:/ohada saas/Focused projects/stoquify/services/purchasing/ap-control.service.ts:654>)
- [services/accounting/customer-settlement-reversal.service.ts lines 711–780](<E:/ohada saas/Focused projects/stoquify/services/accounting/customer-settlement-reversal.service.ts:711>)

**Verification evidence:** behavior-probes.json: SOURCE_OWNED_REVERSAL. See the [evidence index](<E:/ohada saas/Focused projects/stoquify/docs/accounting/evidence-index.md>).

**Correction:** Allow the generic reversal only for appropriate manual sources. Route every other source to its owned reversal/refund/correction workflow; require explicit reason, date and impact review. Preserve a distinct policy for legitimate manual adjusting entries.

**Owner:** Accounting lead plus each posting producer owner. **Effort:** 2–4 days containment; 1–2 weeks to cover the producer matrix. **Dependencies:** ACC-004

**Data investigation / repair:** Find REVERSED source journals whose source/batch remains applied or posted. Reconcile each against source corrections; never automatically delete or unreverse historical entries.

**Acceptance criteria:**

- POS, AP, inventory, suspense and payroll source entries cannot use an inappropriate generic reversal
- Authorized manual reversal nets correctly with the original in both original and subsequent periods
- Concurrent repeat requests create one intended correction
- Source status, ledger, subledger and close invalidation reconcile after every correction

## ACC-004 — Posting, reversal and period close lack a uniform concurrency protocol

**Priority:** P1. **Status:** CREDIBLE_RISK_REQUIRES_DATABASE_VALIDATION. **Confidence:** High on code gap; medium on race outcome. **Likelihood:** Medium under concurrent posting and close.

**Capability:** Ledger lifecycle and period finality.

**Trigger:** A manual poster reads OPEN while another transaction closes the period; two reversal requests both observe no prior reversal; close preflight finishes before a concurrent producer commits.

**Expected:** Posting and close serialize around the same tenant/period boundary and revalidate under that lock. Reversal uses a unique command identity or atomic claim.

**Observed:** The generic paths use transactions but no shared period-lock protocol, explicit serializable isolation or status compare-and-set. Journal update is by id after an earlier read. reversalOfEntryId is not unique; count-based numbers do not establish concurrency safety.

**Root cause:** Correctness checks are temporally separate from final writes; producer implementations differ.

**Consequences:** Late ledger effects could enter a supposedly closed period or duplicate corrections could be attempted. Unique constraints may turn some races into errors rather than duplicates. Exact outcomes and deployed isolation settings remain unverified.

**Existing controls:** POS uses serializable transaction retries. AP uses source advisory locks, batch row locks and a period FOR SHARE lock. These stronger patterns should be preserved, but close must participate before preflight to avoid stale checks.

**Source evidence:**

- [services/accounting/posting.service.ts lines 238–349](<E:/ohada saas/Focused projects/stoquify/services/accounting/posting.service.ts:238>)
- [services/accounting/posting.service.ts lines 366–449](<E:/ohada saas/Focused projects/stoquify/services/accounting/posting.service.ts:366>)
- [services/accounting/periods.service.ts lines 337–399](<E:/ohada saas/Focused projects/stoquify/services/accounting/periods.service.ts:337>)
- [prisma/db.ts lines 20–30](<E:/ohada saas/Focused projects/stoquify/prisma/db.ts:20>)
- [prisma/schema.prisma lines 7670–7725](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:7670>)
- [services/purchasing/ap-control.service.ts lines 634–679](<E:/ohada saas/Focused projects/stoquify/services/purchasing/ap-control.service.ts:634>)

**Verification evidence:** Source inspection; no real PostgreSQL interleaving executed. See the [evidence index](<E:/ohada saas/Focused projects/stoquify/docs/accounting/evidence-index.md>).

**Correction:** Define one lock order and period admission protocol for every writer and closer; use atomic lifecycle transitions, stable idempotency keys and bounded serialization retries. Close rechecks blockers after acquiring its exclusive boundary.

**Owner:** Database/distributed-systems architect and accounting owner. **Effort:** 1–2 weeks plus integration soak. **Dependencies:** ACC-007

**Data investigation / repair:** Inspect journals committed around closedAt and multiple reversal references. Add constraints only after checking existing duplicates and defining legitimate correction chains.

**Acceptance criteria:**

- Real PostgreSQL barrier tests cover post-vs-close, reverse-vs-reverse and close-vs-AP/POS/payroll
- No writer posts after a period closes without the explicit reopening protocol
- Retry after an ambiguous commit returns the original intended result
- Lock order and retry limits avoid deadlocks and unbounded retry

## ACC-005 — Period closure and close-assurance readiness use different blockers

**Priority:** P1. **Status:** CONFIRMED_CONTROL_GAP_REPRODUCED. **Confidence:** High. **Likelihood:** Medium when operators close outside the assurance workflow.

**Capability:** Period close and cross-module reconciliation.

**Trigger:** The ledger is balanced and payment preflight is clear, but inventory/payroll assurance is blocked or stale. The operator calls the period-close action.

**Expected:** Policy defines the distinction between blocking further postings and a reviewed close; mandatory material blockers govern the appropriate transition and the UI communicates the distinction.

**Observed:** The period-close preflight checks drafts, batches, linkage, payment exceptions/suspense/runs and per-currency balance. It never reads the close run, inventory reconciliation or payroll assurance. A synthetic BLOCKED assurance record is not read and the period becomes CLOSED.

**Root cause:** Close lifecycle and assurance lifecycle evolved separately without one authoritative readiness contract.

**Consequences:** Operators may treat CLOSED as fully reconciled and reviewed while source mismatches remain. Period-scoped batch queries also do not discover unresolved batches without periodId. Certified pack export is separately guarded; the probe does not bypass it.

**Existing controls:** Certified close-pack generation requires READY, trust level, no critical/high findings, valid provenance and freshness checks. Current close preflight already blocks several important ledger/payment failures.

**Source evidence:**

- [services/accounting/periods.service.ts lines 187–300](<E:/ohada saas/Focused projects/stoquify/services/accounting/periods.service.ts:187>)
- [services/accounting/periods.service.ts lines 337–399](<E:/ohada saas/Focused projects/stoquify/services/accounting/periods.service.ts:337>)
- [services/accounting/close-assurance-pack.service.ts lines 1030–1105](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-assurance-pack.service.ts:1030>)

**Verification evidence:** behavior-probes.json: CLOSE_WITHOUT_ASSURANCE_READ. See the [evidence index](<E:/ohada saas/Focused projects/stoquify/docs/accounting/evidence-index.md>).

**Correction:** Define posting lock versus reviewed/certified close explicitly. Centralize mandatory closure blockers, including unassigned relevant failures, inventory and payroll applicability, then enforce freshness and authorization on transitions.

**Owner:** Accounting controls lead with inventory, payroll and reconciliation owners. **Effort:** 5–10 days. **Dependencies:** ACC-004

**Data investigation / repair:** Compare CLOSED periods to latest assurance runs, unassigned failed batches and unresolved source mismatches. Escalate discrepancies for review without automatic reopening.

**Acceptance criteria:**

- Material inventory/payroll blockers prevent the policy-defined reviewed close
- Closed, locked, reviewed and certified states have distinct labels
- Unassigned relevant posting failures are surfaced
- Certified export rechecks the current version after any material invalidation

## ACC-006 — Manual journal dimensions are not validated against tenant ownership

**Priority:** P2. **Status:** CONFIRMED_REPRODUCED. **Confidence:** High. **Likelihood:** Medium for direct action clients; live exposure unknown.

**Capability:** Tenant/entity and subledger attribution.

**Trigger:** Supply an arbitrary or foreign location/customer/supplier/item identifier on a manual line while using valid local accounts.

**Expected:** Every supplied dimension exists, belongs to the current organization and is permitted for the account and operation.

**Observed:** The service validates account ownership but copies dimension IDs without entity lookups; schema fields are bare optional strings. Synthetic foreign-location and foreign-customer values survive.

**Root cause:** Dimension identifiers are treated as annotations rather than governed financial references.

**Consequences:** Incorrect branch/customer/supplier attribution and broken reconciliation are possible. A cross-tenant disclosure is not demonstrated; the confirmed defect is invalid attribution accepted at the service boundary.

**Existing controls:** Organization is derived server-side by protected actions, and account and period queries are tenant scoped.

**Source evidence:**

- [actions/accounting/journals.actions.ts lines 28–38](<E:/ohada saas/Focused projects/stoquify/actions/accounting/journals.actions.ts:28>)
- [services/accounting/journals.service.ts lines 184–222](<E:/ohada saas/Focused projects/stoquify/services/accounting/journals.service.ts:184>)
- [services/accounting/journals.service.ts lines 338–354](<E:/ohada saas/Focused projects/stoquify/services/accounting/journals.service.ts:338>)
- [prisma/schema.prisma lines 7730–7765](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:7730>)

**Verification evidence:** behavior-probes.json: FX_BASE_AMOUNT dimension observations. See the [evidence index](<E:/ohada saas/Focused projects/stoquify/docs/accounting/evidence-index.md>).

**Correction:** Validate dimensions in the posting transaction, define required dimensions on control accounts, and add tenant-safe database references where consistent with retention policy.

**Owner:** Accounting/backend and database owners. **Effort:** 3–5 days. **Dependencies:** ACC-007

**Data investigation / repair:** Find orphaned or cross-organization dimension IDs and ambiguous control-account lines; use a reviewed attribution correction process.

**Acceptance criteria:**

- Foreign, deleted or nonexistent dimensions fail through direct action and service calls
- Valid local dimensions survive posting and source drill-down
- Control-account dimension requirements are tested

## ACC-007 — Ledger immutability and tenant consistency depend primarily on application paths

**Priority:** P1. **Status:** REPOSITORY_CONTROL_GAP_DEPLOYMENT_UNVERIFIED. **Confidence:** High for inspected schema/migrations. **Likelihood:** Conditional on a privileged, legacy or defective write path.

**Capability:** Database integrity, retention and tamper resistance.

**Trigger:** A service regression, maintenance script or privileged SQL writer updates/deletes a posted journal line, links a line to a foreign parent/account or deletes a parent where cascades are permitted.

**Expected:** Database constraints and privileges preserve posted economic content, tenant relationships and retained evidence, with a narrow documented reversal/status protocol.

**Observed:** Journal/line foreign keys target individual IDs separately from organizationId; ledger lines permit cascades. The inspected migrations contain no ledger-specific posted-content guard or cross-row balance enforcement. Comparable receivable, payroll and fiscal evidence domains have explicit immutability triggers.

**Root cause:** No uniform database backstop beneath the multiple source posting services.

**Consequences:** Application bypasses could silently invalidate history, source linkage and audit evidence. Other restrictive relations can block some deletes; not every cascade is executable. Deployed triggers, roles, RLS and backup/retention controls were not queried.

**Existing controls:** Service-level balance checks, source links, unique posting identity, audit events and several append-only related evidence tables exist.

**Source evidence:**

- [prisma/schema.prisma lines 7670–7805](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:7670>)
- [prisma/schema.prisma lines 7919–7950](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:7919>)
- [prisma/migrations/20260809100000_customer_receivable_document_foundation/migration.sql lines 209–258](<E:/ohada saas/Focused projects/stoquify/prisma/migrations/20260809100000_customer_receivable_document_foundation/migration.sql:209>)

**Verification evidence:** migration-ledger-evidence.json; journal-producer-inventory.json. See the [evidence index](<E:/ohada saas/Focused projects/stoquify/docs/accounting/evidence-index.md>).

**Correction:** Inventory all writers and privileges. Add validated tenant-safe relational constraints, posted-content immutability, controlled state transitions and least-privilege maintenance paths. Design transaction-time balance enforcement carefully so legitimate multi-line inserts remain possible.

**Owner:** Database architect with accounting controls/security. **Effort:** 1–3 weeks including migration rehearsal. **Dependencies:** None; establish this boundary first.

**Data investigation / repair:** Run read-only orphan, imbalance, tenant mismatch and duplicate scans first; quarantine exceptions. Rehearse constraint validation and rollback on a disposable clone. No migration was applied by this audit.

**Acceptance criteria:**

- Direct SQL using the application role cannot change posted monetary content or delete retained ledger history
- Foreign-tenant parent/account references are rejected
- Valid posting and reversal work in one transaction
- Deployment evidence lists actual constraints, triggers, roles and restore test results

## ACC-008 — Fiscal period creation can extend before the requested fiscal year and allows overlap

**Priority:** P2. **Status:** CONFIRMED_PARTIAL_START_DEFECT_WITH_STATIC_OVERLAP_RISK. **Confidence:** High. **Likelihood:** High for a mid-month initial fiscal year; otherwise configuration dependent.

**Capability:** Cutoffs and fiscal calendars.

**Trigger:** Create a fiscal year starting June 15, or create another differently named year with overlapping dates.

**Expected:** Generated periods stay inside the fiscal-year interval and each posting date has one unambiguous applicable period under the configured calendar.

**Observed:** The first period starts June 1. Only dates/order and name/period-number uniqueness are guarded; no range-overlap exclusion is found. Period selection uses findFirst ordered by latest start.

**Root cause:** Month normalization discards the first boundary, and uniqueness is modeled by names/numbers rather than date ranges.

**Consequences:** Transactions may be attributed before business commencement or to an unintended overlapping year. Comparative statements and close populations can differ.

**Existing controls:** Entry dates are checked against the selected OPEN period and organization.

**Source evidence:**

- [services/accounting/periods.service.ts lines 97–170](<E:/ohada saas/Focused projects/stoquify/services/accounting/periods.service.ts:97>)
- [prisma/schema.prisma lines 7086–7155](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:7086>)

**Verification evidence:** behavior-probes.json: PARTIAL_FISCAL_YEAR. See the [evidence index](<E:/ohada saas/Focused projects/stoquify/docs/accounting/evidence-index.md>).

**Correction:** Clamp first/last periods to the requested boundaries, define fiscal/business timezone policy, and reject overlapping active calendars under a concurrency-safe rule.

**Owner:** Accounting calendar/domain and database owners. **Effort:** 2–4 days. **Dependencies:** ACC-004

**Data investigation / repair:** Detect periods outside fiscal-year bounds and overlapping periods. Reassign only unposted records automatically; accountant-review any posted reclassification.

**Acceptance criteria:**

- Mid-month, leap-year, short-year and timezone-boundary cases pass
- Overlapping calendar creation is rejected even concurrently
- Each allowed posting date resolves deterministically to the intended fiscal year

## ACC-009 — Date-filtered general ledger omits the opening balance

**Priority:** P2. **Status:** CONFIRMED_REPRODUCED_SEMANTIC_GAP. **Confidence:** High. **Likelihood:** High when prior activity exists and a start date is selected.

**Capability:** General ledger report contract.

**Trigger:** An account has opening 100 before June; June activity is a debit of 25.

**Expected:** Account balance shows 125, with opening 100 and movement 25, or the output explicitly describes its balance as selected-period movement.

**Observed:** Only filtered lines are queried and runningBalance starts at zero, returning 25. The service does not provide an opening-balance row or basis field.

**Root cause:** The report mixes a period-activity selection with an account-balance field name.

**Consequences:** Users or exports can misread period movement as the account balance and create false reconciliation discrepancies. The cumulative balance sheet and customer-statement opening calculations use different logic and are not implicated by this probe.

**Existing controls:** Amounts use Decimal; rows are tenant scoped; draft entries are excluded.

**Source evidence:**

- [services/accounting/reports.service.ts lines 179–235](<E:/ohada saas/Focused projects/stoquify/services/accounting/reports.service.ts:179>)
- [actions/accounting/reports.actions.ts lines 92–105](<E:/ohada saas/Focused projects/stoquify/actions/accounting/reports.actions.ts:92>)

**Verification evidence:** behavior-probes.json: GL_OPENING_BALANCE. See the [evidence index](<E:/ohada saas/Focused projects/stoquify/docs/accounting/evidence-index.md>).

**Correction:** Return explicit opening, movement and closing amounts with account normal-balance semantics and stable journal/date/line/id ordering. Keep a separately labeled activity-only mode if needed.

**Owner:** Reporting/backend and accountant workflow owners. **Effort:** 2–4 days. **Dependencies:** ACC-001, ACC-013

**Data investigation / repair:** No ledger rewrite; review generated GL artifacts that users interpreted as balances and regenerate after correction.

**Acceptance criteria:**

- Opening plus selected movement equals closing for debit and credit accounts
- Reversed originals and later reversals respect report dates
- Paged and full outputs share the same stable ordering and balances

## ACC-010 — Accountant portal cache identity and refresh coverage are incomplete

**Priority:** P2. **Status:** CONFIRMED_CACHE_CONTRACT_GAP_WITH_CONDITIONAL_EXPOSURE. **Confidence:** High on keys; medium on user-visible scope transitions. **Likelihood:** Medium for simultaneous different limits or in-place identity/permission changes.

**Capability:** TanStack Query, permissions and financial freshness.

**Trigger:** Different portal limits share a query key, or server session/permission scope changes while the QueryClient remains alive. A journal mutation should refresh all related portal/close/report views.

**Expected:** Result-changing inputs and access scope form cache identity; relevant mutations and scope revocations actively refresh or evict protected data.

**Observed:** Portal keys contain dates and period but omit limit, organization and access identity. The QueryClient is stable; journal actions revalidate four paths but do not invalidate portal/close TanStack keys. Default logout reloads the page, which mitigates the normal sign-out case.

**Root cause:** Cache and mutation dependency contracts are scattered rather than derived from server-visible scope and report dependencies.

**Consequences:** Wrong sample sizes or stale trust/ledger evidence can be displayed. Cross-tenant disclosure is conditional and not demonstrated; no live organization-switch vulnerability is asserted.

**Existing controls:** Server actions derive organization from authentication; some newer accounting/close query keys include orgId, period and locale. Portal staleTime is 60 seconds and export invalidates its portal prefix.

**Source evidence:**

- [hooks/useAccountantPortal.ts lines 42–77](<E:/ohada saas/Focused projects/stoquify/hooks/useAccountantPortal.ts:42>)
- [hooks/useAccountantPortal.ts lines 105–107](<E:/ohada saas/Focused projects/stoquify/hooks/useAccountantPortal.ts:105>)
- [lib/providers/query-provider.tsx lines 14–58](<E:/ohada saas/Focused projects/stoquify/lib/providers/query-provider.tsx:14>)
- [actions/accounting/journals.actions.ts lines 57–62](<E:/ohada saas/Focused projects/stoquify/actions/accounting/journals.actions.ts:57>)
- [lib/auth-client.ts lines 96–104](<E:/ohada saas/Focused projects/stoquify/lib/auth-client.ts:96>)

**Verification evidence:** Static key/query/mutation/provider trace; no authenticated organization-switch scenario executed. See the [evidence index](<E:/ohada saas/Focused projects/stoquify/docs/accounting/evidence-index.md>).

**Correction:** Use explicit organization/actor or access-version scope and all filters in keys; clear scoped cache on identity/access transitions. Define journal/payment/reconciliation/close invalidation families and visible refresh-failure behavior.

**Owner:** Frontend data layer and IAM owners. **Effort:** 3–5 days. **Dependencies:** ACC-012

**Data investigation / repair:** No accounting data repair; validate session transition behavior with two synthetic tenants and roles.

**Acceptance criteria:**

- Different limits/organizations/permission versions never share data
- Sign-out without reload and consent revocation evict protected cached values
- Posting/reversal refresh every affected mounted financial read model
- Background refetch failure visibly marks old data stale

## ACC-011 — Shared accounting display can mislabel currency, round away precision and turn invalid values into zero

**Priority:** P2. **Status:** CONFIRMED_STATIC_DEFECT. **Confidence:** High. **Likelihood:** High outside whole-XAF values and mixed-language screens.

**Capability:** Money/date rendering and localization.

**Trigger:** Journal lines are in EUR or contain fractional values; a formatter receives an invalid numeric value; a French route renders the journal table.

**Expected:** Displayed currency, precision and locale match the server contract; invalid/missing values remain distinguishable from true zero.

**Observed:** formatAccountingMoney defaults to XAF, forces fr-FR and zero fraction digits, converts through Number and falls back to zero for non-finite input. Journal calls omit currency. Dates force English and several table/action labels remain hardcoded English.

**Root cause:** A presentation convenience function encodes currency/locale/precision policy independently of the accounting contract.

**Consequences:** Users can approve or reconcile amounts with hidden fractions or the wrong currency, and fail to recognize invalid values. Large decimal precision can also be lost through Number conversion; no production occurrence was measured.

**Existing controls:** Core ledger arithmetic uses Decimal and DTO strings; newer report tables have explicit financial semantics.

**Source evidence:**

- [app/[locale]/(dashboard)/dashboard/accounting/_components/accounting-ui.tsx lines 8–21](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/_components/accounting-ui.tsx:8>)
- [app/[locale]/(dashboard)/dashboard/accounting/journals/page.tsx lines 99–121](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/journals/page.tsx:99>)
- [services/accounting/invariants.ts lines 59–78](<E:/ohada saas/Focused projects/stoquify/services/accounting/invariants.ts:59>)

**Verification evidence:** Static formatter and call-site trace. See the [evidence index](<E:/ohada saas/Focused projects/stoquify/docs/accounting/evidence-index.md>).

**Correction:** Pass explicit currency, locale and precision from a validated server money contract; format decimal strings safely. Render unavailable/invalid separately, translate workflow content and preserve exact export values.

**Owner:** Frontend/design-system and accounting owners. **Effort:** 2–5 days. **Dependencies:** ACC-001

**Data investigation / repair:** No ledger change; inspect reports/exports for affected display-only rounding before regenerating.

**Acceptance criteria:**

- XAF/EUR and supported precisions render with correct labels in English and French
- Invalid numeric input never becomes a convincing zero
- Large values preserve contractual precision
- On-screen totals and exported exact values reconcile

## ACC-012 — Journal and portal screens overstate completeness or freshness in edge states

**Priority:** P2. **Status:** CONFIRMED_STATIC_WORKFLOW_GAP. **Confidence:** High on code; authenticated visual behavior unverified. **Likelihood:** High once more than 100 journals exist or background reads fail.

**Capability:** Accountant workflow, state clarity and audit usability.

**Trigger:** The newest 100 entries contain few drafts although older drafts remain; journal retrieval fails; a previously certified portal snapshot fails to refresh.

**Expected:** Counts disclose their full or sampled scope, failed reads cannot resemble empty books, and old certification data remains visibly stale after refresh failure.

**Observed:** The journal page fetches take:100 once, derives draft/posted counts from that sample, and exposes no paging control in the reviewed table. Table boundary state is always ready. Read failure sets arrays empty: an error is included in the draft panel description, but the posted table still has an empty-history message. Portal error state with existing data is represented by a data attribute while trust tiles retain previous verdicts.

**Root cause:** Visual states and totals are derived from available rows rather than explicit completeness/freshness contracts.

**Consequences:** Older unposted work can be overlooked; a failed read can be misinterpreted as no history; stale trust can delay corrective action. Server close/export checks provide a later defense but do not prevent workflow confusion.

**Existing controls:** Portal displays an as-of timestamp, has an initial-error retry path, and server certification/export recomputes controls. Canonical table boundaries and responsive wrappers offer reusable foundations.

**Source evidence:**

- [app/[locale]/(dashboard)/dashboard/accounting/journals/page.tsx lines 74–88](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/journals/page.tsx:74>)
- [app/[locale]/(dashboard)/dashboard/accounting/journals/page.tsx lines 159–169](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/journals/page.tsx:159>)
- [app/[locale]/(dashboard)/dashboard/accounting/journals/page.tsx lines 203–254](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/journals/page.tsx:203>)
- [components/accounting/AccountantPortal.tsx lines 263–327](<E:/ohada saas/Focused projects/stoquify/components/accounting/AccountantPortal.tsx:263>)

**Verification evidence:** Static UI review; login-boundary.png documents unavailable authenticated browser context. See the [evidence index](<E:/ohada saas/Focused projects/stoquify/docs/accounting/evidence-index.md>).

**Correction:** Use server totals and cursor pagination; label any intentionally recent sample. Propagate error/loading/stale state visibly, including background failures. Add source drill-down and reversal review with explicit reason/date as part of ACC-003.

**Owner:** Accountant UX, accessibility and frontend owners. **Effort:** 4–7 days. **Dependencies:** ACC-010, ACC-011

**Data investigation / repair:** No business data change; compare total drafts to visible sample during rollout.

**Acceptance criteria:**

- More than 100 mixed-status entries remain discoverable and counts are accurate
- Denied, failed, empty, refreshing and stale states are distinct
- Keyboard and screen-reader users can identify scope, state and action impact
- Two locales and mobile/desktop workflows are exercised in an authenticated synthetic tenant

## ACC-013 — Large ledger reads are unbounded and statements lack a shared read snapshot

**Priority:** P2. **Status:** CONFIRMED_QUERY_SHAPE_WITH_MEASURED_CPU_PAYLOAD_AND_UNVERIFIED_DB_RISK. **Confidence:** High on shape; medium on deployment impact. **Likelihood:** Increases with history size and concurrent posting.

**Capability:** Reporting performance and consistency.

**Trigger:** A large tenant requests all GL lines or closes a long period; posting commits between separate statement activity and cumulative queries.

**Expected:** Bounded details, database aggregates and a documented consistent as-of/version contract for financial statements.

**Observed:** GL/TB and close preflight load full line populations for JS processing. Statements use separate Promise.all reads outside a shared snapshot. The synthetic 50,000-line GL returned about 13.37 MB of JSON with 491.4 ms median service CPU; database/network/browser costs were excluded.

**Root cause:** Unbounded detail retrieval and application aggregation; independent reads with no common snapshot/version fence.

**Consequences:** Payload, memory and response time scale with history. A live report may combine different commit states. No production latency, query plan, deadlock or inconsistent snapshot was measured.

**Existing controls:** Financial statements already aggregate in SQL, period selectors are bounded, and inventory reconciliation pages movements. Preserve these improvements.

**Source evidence:**

- [services/accounting/reports.service.ts lines 67–98](<E:/ohada saas/Focused projects/stoquify/services/accounting/reports.service.ts:67>)
- [services/accounting/reports.service.ts lines 187–230](<E:/ohada saas/Focused projects/stoquify/services/accounting/reports.service.ts:187>)
- [services/accounting/periods.service.ts lines 261–290](<E:/ohada saas/Focused projects/stoquify/services/accounting/periods.service.ts:261>)
- [services/accounting/financial-statements.service.ts lines 478–573](<E:/ohada saas/Focused projects/stoquify/services/accounting/financial-statements.service.ts:478>)

**Verification evidence:** read-model-benchmark.json. See the [evidence index](<E:/ohada saas/Focused projects/stoquify/docs/accounting/evidence-index.md>).

**Correction:** Use SQL aggregates for totals/preflight, stable cursor paging for details and streaming/async exports. Establish a repeatable-read or source-version contract where report consistency requires it; benchmark actual query plans before adding indexes.

**Owner:** Database/reporting performance and SRE owners. **Effort:** 1–2 weeks after correctness fixes. **Dependencies:** ACC-001, ACC-009

**Data investigation / repair:** No monetary rewrite; any new summary table needs a reconciled rebuild, source version and drift checks.

**Acceptance criteria:**

- Realistic 10k/100k/1m-line fixtures have documented query plans, payload budgets and p95 latency
- Concurrent posting cannot produce an internally inconsistent financial snapshot
- Pagination/streaming preserves exact totals and stable order
- Close and exports stay within agreed resource budgets

## ACC-014 — Finance operational metrics are presented with accounting proof labels

**Priority:** P1. **Status:** CONFIRMED_STATIC_DEFECT. **Confidence:** High. **Likelihood:** High for users of the finance dashboard; truncation begins above query caps.

**Capability:** Finance analytics, revenue, margin and assurance presentation.

**Trigger:** A period has confirmed but unposted sales orders or more than 250 matching orders; purchases include inventory that has not yet been sold.

**Expected:** Operational sales/cash estimates disclose their source and completeness; posted revenue and accounting gross profit derive from ledger recognition and COGS. Certification labels require their actual assurance evidence.

**Observed:** Revenue sums salesOrder.total, including CONFIRMED/PROCESSING statuses, from a take:250 query. grossProfit subtracts purchases, expenses and refunds from that value. Revenue has proof state posted; confidence >=85 has state certified, derived from an operational risk-penalty score. Shared primitives render those proof labels.

**Root cause:** Source/assurance labels are assigned by presentation heuristics instead of verified accounting provenance; capped row lists also feed period totals.

**Consequences:** Owners may mistake order intake for recognized revenue, cash/working-capital movements for profit, or a heuristic score for certification. Larger tenants can see understated totals. Decisions, customer claims and reputation are exposed even when the accounting report itself is correctly labeled internal.

**Existing controls:** A separate financial-statements service uses posted/reversed ledger data and clearly labels management/statutory boundaries. Finance payroll forecast includes source/proof/redaction metadata.

**Source evidence:**

- [services/finance/finance-dashboard.service.ts lines 29–35](<E:/ohada saas/Focused projects/stoquify/services/finance/finance-dashboard.service.ts:29>)
- [services/finance/finance-dashboard.service.ts lines 555–569](<E:/ohada saas/Focused projects/stoquify/services/finance/finance-dashboard.service.ts:555>)
- [services/finance/finance-dashboard.service.ts lines 742–783](<E:/ohada saas/Focused projects/stoquify/services/finance/finance-dashboard.service.ts:742>)
- [services/finance/finance-dashboard.service.ts lines 1009–1045](<E:/ohada saas/Focused projects/stoquify/services/finance/finance-dashboard.service.ts:1009>)
- [components/finance/FinanceCommandCenterDashboard.tsx lines 392–396](<E:/ohada saas/Focused projects/stoquify/components/finance/FinanceCommandCenterDashboard.tsx:392>)
- [components/dashboard/primitives/command-center-primitives.tsx lines 123–132](<E:/ohada saas/Focused projects/stoquify/components/dashboard/primitives/command-center-primitives.tsx:123>)

**Verification evidence:** Current service-to-KPI trace; not a production data tie-out. See the [evidence index](<E:/ohada saas/Focused projects/stoquify/docs/accounting/evidence-index.md>).

**Correction:** Correct labels and completeness immediately. Separate operational outlook from ledger results; aggregate full intended populations and attach actual posted/reconciled/assured evidence only when established. Do not relabel an operational margin formula as accounting gross profit.

**Owner:** Finance product owner, analytics and accounting lead. **Effort:** 2–3 days label containment; 5–10 days metric contract and tie-out. **Dependencies:** ACC-001, ACC-013

**Data investigation / repair:** Recompute representative period comparisons and review exported/shared dashboards for materially different numbers; no automatic journal correction follows from a display error.

**Acceptance criteria:**

- Unposted confirmed orders cannot appear as posted-ledger revenue
- 251+ source rows produce complete totals or explicit partial-state output
- Operational score cannot produce a certification label
- Revenue, tax, purchases, COGS and cash-flow definitions are documented and independently reconciled

## ACC-015 — Integration verification is not green and production assurance evidence remains incomplete

**Priority:** P2. **Status:** CONFIRMED_TEST_FAILURES_AND_EXTERNAL_EVIDENCE_BLOCKERS. **Confidence:** High for recorded results. **Likelihood:** Certain release-evidence gap; production failure probability unknown.

**Capability:** Quality, release assurance and operational readiness.

**Trigger:** The current worktree is evaluated for release using passing accounting-only tests and static gates.

**Expected:** All affected integration contracts pass, real database concurrency/constraint tests run in isolation, and authenticated UI/operational/statutory evidence supports the proposed release scope.

**Observed:** The first cross-module run has 477 passing and 2 failing tests. POS shift-close expects an older exact event-update payload; actual code includes nested audit creation. Inventory conflict testing receives an evidence-recording error rather than the expected idempotency conflict; current test expects legacy auditLog evidence. No deployed DB, authenticated accounting browser or live provider flow was verified.

**Root cause:** Evidence contracts and test fixtures have drifted during active worktree changes; mocked unit verification and static gate success are insufficient for deployment assurance.

**Consequences:** Release confidence can exceed the evidence. Failures may be fixture/contract drift rather than production defects, but the no-stock-mutation assertions after the rejected-message expectation are not reached in the failing test.

**Existing controls:** 389 accounting tests pass, schema/typecheck pass, and ledger/statutory integration gates pass within their declared static scope. Production country-pack activation remains explicitly disabled.

**Source evidence:**

- [services/pos/__tests__/pos-shift-close.service.test.ts lines 313–323](<E:/ohada saas/Focused projects/stoquify/services/pos/__tests__/pos-shift-close.service.test.ts:313>)
- [services/inventory/__tests__/inventory-stock-event.service.test.ts lines 432–463](<E:/ohada saas/Focused projects/stoquify/services/inventory/__tests__/inventory-stock-event.service.test.ts:432>)
- [services/events/business-event.service.ts lines 134–161](<E:/ohada saas/Focused projects/stoquify/services/events/business-event.service.ts:134>)
- [services/events/business-event-anomaly.service.ts lines 108–129](<E:/ohada saas/Focused projects/stoquify/services/events/business-event-anomaly.service.ts:108>)

**Verification evidence:** integration-ui-tests.json; integration-ui-tests.log; evidence-index.md for all subsequent test outcomes and runtime limitations. See the [evidence index](<E:/ohada saas/Focused projects/stoquify/docs/accounting/evidence-index.md>).

**Correction:** Resolve failing contract/fixture ownership without weakening intended evidence controls; add real isolated transaction tests for the demonstrated risks and collect authenticated workflow and deployment evidence. Preserve this audit as a baseline rather than self-certifying readiness.

**Owner:** QA/release lead with event, POS, inventory, SRE and country-pack owners. **Effort:** 2–4 days test triage; 1–2 weeks scoped release evidence excluding external review lead time. **Dependencies:** ACC-001, ACC-003, ACC-004, ACC-005, ACC-007, ACC-014

**Data investigation / repair:** Use synthetic disposable databases. Live exposure investigation is a separate read-only, tenant-scoped exercise before any repair decision.

**Acceptance criteria:**

- All affected tests pass and assert the current intended evidence contract
- Real DB races, roles, constraints and rollback scenarios have reproducible evidence
- Authenticated English/French accounting journeys and access revocation are verified
- Rollout has reconciliation alerts, replay ownership and a tested rollback/runbook
- Any statutory claim identifies jurisdiction, regime, effective version and qualified review evidence
