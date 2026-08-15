# Stoquify Five Vital Under-Built Capabilities Strategy Review

Date: 2026-08-14
Mode: evidence-led product strategy and architecture review
Status: complete recommendation; no implementation or certification claim
Workspace: `E:\ohada saas\Focused projects\stoquify`

## 1. Executive verdict

Stoquify is increasingly strong as an internal operating and accounting truth system. Its current catalogue connects POS, inventory, sales, purchasing/AP, cash drawer, finance, payment reconciliation, OHADA accounting, close assurance, compliance, payroll, analytics, and reports. Its strongest architectural assets are tenant-scoped business truth, source-linked evidence, guarded financial actions, offline POS replay, and controlled reporting.

The next strategic value gap is not another internal dashboard. Stoquify needs five product capabilities that make its trusted core easier to deploy, usable through unreliable operating conditions, connected to external participants, forward-looking, and capable of helping merchants grow revenue.

Exactly five capabilities are selected:

| Rank | Capability | Vitality | User value | Differentiation | Difficulty | Risk | Primary strategic effect |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | Counterparty Trust and Collaboration Network | 10 | 9 | 10 | 9 | 9 | Turns internal records into a defensible customer/supplier network |
| 2 | Data Onboarding, Migration, and Adoption Control Plane | 10 | 10 | 8 | 7 | 7 | Makes trusted operation deployable and commercially scalable |
| 3 | Planning, Forecasting, and Working-Capital Command | 9 | 9 | 8 | 8 | 8 | Converts historical truth into explainable forward decisions |
| 4 | Resilient Offline Field Operations Beyond POS | 9 | 9 | 9 | 9 | 9 | Preserves receiving, stock, delivery, and approval evidence during connectivity loss |
| 5 | Customer Growth, Loyalty, and Revenue Lifecycle Engine | 8 | 9 | 8 | 7 | 7 | Adds demand creation, retention, and customer lifetime value to the control spine |

Scoring uses 1 as low and 10 as high. Higher difficulty and risk scores mean more difficult and more risky.

The strategic ranking is not the implementation order. The repository's own recovery assessment identifies too many simultaneous workstreams and conditional completion as root causes. These recommendations must therefore enter delivery through a single dependency-ordered sequence, not five parallel programs.

## 2. Current product-truth assessment

### 2.1 What is already strong

- The canonical module catalogue contains 19 modules, including Operating Dashboard, Inventory, Sales, POS, Cash Drawer, OHADA Accounting, Close Assurance, Compliance, Purchasing and AP, Presence, Payroll, Finance, Payment Reconciliation, Analytics, Reports, Commercial Agents, Content, Settings, and Administration.
- POS owns sessions, tenders, refunds, cash-drawer workflows, offline devices, and replay controls.
- Purchasing/AP owns purchase orders, suppliers, supplier invoices, payment controls, bank-change maker-checker, and payable release evidence.
- Customer accounting owns ledgers, receivable documents, immutable statement snapshots, signed external access, recipient actions, delivery states, and settlement allocation.
- Accounting and close assurance own source links, periods, journals, proof requests, review queues, exports, and close evidence.
- Payment reconciliation owns provider accounts, statement ingestion, matching, suspense, signoff, and certificates.
- Business events, outbox records, workflow-assurance incidents, action queues, and agent control infrastructure already provide substantial internal orchestration foundations.
- The action graph shows customer operations in Community 3 and managed customer operations in Community 13, while managed supplier operations appear in Community 15. Purchase-order workflow is a separate Community 2. This supports treating counterparty collaboration as an integration domain around existing owners, not a replacement owner.
- The component graph's Community 2 centers `buildTodaysOperatingTruthModel()` and `buildOnboarding()`, confirming that setup status exists as a dashboard read model. It does not prove a migration or adoption domain.

### 2.2 Important current boundaries

- The verified supplier journey is an authenticated internal workflow: list, create, profile, edit, supplier history, controlled export, and archive. External supplier participation and provider integration were outside the verified scope.
- The public customer statement permits signed read, dispute, and promise-to-pay actions. Recipient-action resolution, customer authentication, payments, statement-generation/delivery UX, and accounting posting were explicitly excluded from the browser verification.
- General budget and forecast permissions exist, but current source discovery found no general budget, forecast, scenario-planning, or working-capital domain files. The concrete forecast implementation found is payroll-obligation evidence projected into finance and cash-command read models.
- Organization onboarding stores acquisition/setup metadata and the dashboard computes a setup checklist. Current reusable imports/backfills are domain-specific, including payment statement import, HRIS migration/backfill, payroll proof backfill, and customer receivable backfill. No platform-wide import batch, field mapping, validation issue, control total, cutover, training-completion, or adoption-health model was found.
- Offline application logic is explicitly POS-owned. The browser queue permits sale, tender, receipt, drawer, and session evidence. No corresponding offline inventory-count, goods-receipt, delivery, expense-capture, or approval command queue was found.
- The `Customer` aggregate stores identity, credit, locale, balance, sales orders, ledgers, receivable documents, statements, and settlements. Loyalty is mentioned only as possible free-text notes, and `LOYALTY_POINTS` appears as a payment-method vocabulary value. No loyalty account, points ledger, customer segment, campaign, consent preference, offer, promotion, or lifecycle automation model was found.

### 2.3 Evidence limitations

- The worktree is heavily dirty and contains concurrent user changes. This review is read-only except for this report and does not attribute unrelated files to any one change.
- Graph reports are dated 2026-08-09 and are architecture-discovery aids. Direct current source and later `what-next/` evidence govern where they differ.
- Absence claims are bounded to repository searches across `app/`, `actions/`, `services/`, `components/`, `hooks/`, `lib/`, `config/`, and `prisma/schema.prisma`; they do not prove that an external private system or undocumented roadmap does not exist.
- No legal, OHADA, tax, security, privacy, accessibility, production, or release certification is made.

## 3. Capability 1 — Counterparty Trust and Collaboration Network

### 3.1 Definition and why it is vital

Build a secure participation layer where a Stoquify tenant can collaborate with customers, suppliers, accountants, delivery partners, and approved financial providers around the same trusted purchase orders, sales orders, invoices, receipts, statements, deliveries, payments, disputes, and remittance evidence already owned by internal domains.

This is not one supplier dashboard plus one customer dashboard. It is a controlled external transaction network with explicit counterparty relationships, grants, shared transaction envelopes, typed actions, evidence, resolution states, and revocation.

Without it, the platform's strongest records still cross company boundaries through phone calls, paper, email, spreadsheets, or messaging applications. That reintroduces unstructured data and reconciliation work precisely where Stoquify's evidence model should be strongest.

### 3.2 Current repository evidence

- Supplier actions and services already own tenant-scoped supplier identity, analytics, export, bank changes, invoices, payments, allocations, and ledger entries.
- The supplier browser certification covers internal list/create/profile/edit/history and excludes provider integration and broader AP presentation.
- Customer statement models already provide immutable snapshots, signed access tokens, access logs, recipient actions, action states, delivery records, and settlement foundations.
- The public statement verification proves `view`, `dispute`, and `promise_to_pay` behavior, but explicitly excludes recipient-action resolution, payment, customer authentication, and broader delivery UX.
- Recovery planning explicitly listed supplier statements and financing as non-goals, showing they are not part of the current completion slice.

### 3.3 Missing domain model and workflow

Proposed conceptual records, not current schema names:

- `CounterpartyRelationship`: tenant, external organization/person, relationship type, verification state, consent, effective dates, and revocation.
- `ExternalParticipantGrant`: subject, permissions, resource scope, expiry, authentication mode, and delegated actor.
- `SharedTransactionEnvelope`: canonical internal subject reference, external participants, disclosed fields, current collaboration state, correlation ID, and evidence hash.
- `CounterpartyAction`: acknowledgement, rejection, change request, delivery notice, invoice submission, dispute, promise, remittance acknowledgement, or return request.
- `CounterpartyActionState`: append-only transition history with actor, reason, source, and evidence.
- `CounterpartyDocument`: malware-scanned, classified attachment metadata with retention/redaction policy and canonical source link.
- `CounterpartyResolution`: internal owner, due date, outcome, compensating action references, and closure evidence.

No external action should directly change a purchase order, invoice, settlement, stock movement, journal, or supplier bank account. The owning internal service must validate and accept or reject a proposed action.

### 3.4 Target jobs and actor value

- Supplier: acknowledge a PO, propose quantity/date changes, submit delivery notice and invoice, see payment state, download remittance, and dispute a mismatch.
- Customer: retrieve receipts/invoices/statements, confirm or dispute balances, make a promise, see payment allocation, request return, and update consented contact preferences.
- Accountant: request missing evidence from the actual transaction participant and resolve exceptions without importing message screenshots.
- Buyer/stockkeeper: see supplier acknowledgement and expected delivery evidence before goods arrive.
- Cashier: direct a customer to trusted receipt and account self-service instead of manually reconstructing history.
- Owner/manager: see external commitments, unresolved disputes, and delayed responses as operational risk.
- Bank/fintech: receive only consented, purpose-limited evidence through explicit provider/API boundaries.

### 3.5 Minimum viable vertical slice

Pilot one supplier workflow and complete one existing customer workflow:

1. Supplier PO acknowledgement:
   - invite-only signed access;
   - view a redacted PO envelope;
   - accept, reject, or request date/quantity change;
   - immutable action and state history;
   - buyer review and explicit internal acceptance;
   - no invoice submission and no bank change in the first release.
2. Customer statement resolution:
   - retain current signed statement read/dispute/promise foundation;
   - add internal assignment, review, resolution, customer-visible status, and closure evidence;
   - do not add payment initiation until the provider and accounting allocation boundaries are separately approved.

This slice validates both supplier and customer participation without attempting a marketplace.

### 3.6 Architecture and integration boundaries

- Existing supplier, purchase-order, customer, accounting, settlement, inventory, and payment services remain authoritative.
- A counterparty service owns relationships, grants, disclosures, collaboration state, and action proposals only.
- Use business-event/outbox delivery for notifications and internal handoffs; do not dual-write external actions and accounting truth.
- Require idempotency and correlation keys for every external mutation.
- Store disclosed snapshots or version references so an external actor's decision remains bound to what they saw.
- Maintain API/provider adapters outside domain transactions and tolerate delivery retries without repeating business actions.

### 3.7 Data, audit, security, fraud, and privacy controls

- Never merge counterparties across tenants automatically, even when email, phone, tax ID, or bank account matches.
- Require invitation acceptance, purpose, permission, resource scope, expiry, and revocation.
- Hash or redact request metadata; do not log raw tokens or sensitive document content.
- Scan documents, enforce file-type/size rules, quarantine failures, and apply retention policy.
- Apply rate limits and abuse controls to invitation, token verification, actions, and document upload.
- Bank-detail proposals remain in the existing fresh-auth maker-checker process and cannot be approved through the public portal.
- External acknowledgements and disputes are evidence, not accounting postings or legal acceptance unless qualified policy and human review establish that status.
- Provide low-bandwidth pages, bilingual copy, safe generic failures, and accessible recovery paths.

### 3.8 OHADA/accounting impact

- A supplier acknowledgement can update operational planning only after internal acceptance; it cannot create AP liability.
- A supplier invoice submission is an unposted source document until three-way match and accounting controls complete.
- Customer disputes and promises do not alter receivable truth by themselves.
- Payment status must be derived from settlement allocation and reconciliation, never from delivery notification alone.
- Fiscal or statutory documents must remain country-pack governed.

### 3.9 Pros, cons, packaging, metrics, and dependencies

Pros:

- Removes duplicate re-keying and status-chasing.
- Improves evidence at the source.
- Reduces PO, dispute, collection, and invoice cycle time.
- Creates network effects, retention, and differentiated trust.
- Reuses mature token, audit, event, reconciliation, and maker-checker foundations.

Cons:

- External identity and data disclosure create a much larger attack surface.
- Supplier adoption and notification reliability can limit network value.
- Document handling introduces malware, privacy, storage, and retention cost.
- Cross-company status vocabulary and legal meaning require careful content design and expert review.

Commercial packaging:

- Core: customer receipt/statement self-service.
- Growth Operations: supplier PO acknowledgement and invoice exchange.
- Accountant Portfolio: cross-client evidence request and counterparty resolution.
- Enterprise/Regulated: SSO/federation, APIs, higher retention controls, and provider integrations.

Metrics:

- PO acknowledgement time and acknowledgement coverage.
- Percentage of supplier/customer actions completed without staff re-keying.
- Digital invoice/evidence submission rate.
- Dispute and missing-evidence resolution time.
- Customer self-service containment rate.
- Supplier status inquiry volume.
- External action idempotency conflicts, denied disclosures, revoked-token attempts, and document quarantine rate.

Dependencies:

- Release-stable existing supplier/customer slices.
- Public identity abuse controls and production secrets.
- Notification provider and dead-letter operations.
- Counterparty vocabulary and disclosure policy.
- Attachment security and retention design before document exchange.

## 4. Capability 2 — Data Onboarding, Migration, and Adoption Control Plane

### 4.1 Definition and why it is vital

Build a governed implementation system that takes a business from registration and source data to a reconciled, trained, observable, go-live-ready Stoquify workspace.

This is the highest immediate commercial priority because the value of every module depends on correct tenant configuration, master data, opening balances, permissions, and user readiness. A feature-rich OHADA operating system that is expensive or risky to activate will struggle to convert, retain, and scale through accountants and implementation partners.

### 4.2 Current repository evidence

- `Organization` stores company profile, country, currency, company size, business type, branch count, pain, setup role, requested modules, assisted-setup flag, onboarding source, and completion time.
- The dashboard service calculates setup progress for company profile, locations, roles/permissions, inventory catalogue, POS setup, finance accounts, payroll setup, and compliance review.
- The component layer renders that service-owned checklist through `buildOnboarding()` and `WorkspaceSetupPanel`.
- Existing migration/import services are specialized: payment statement import, HRIS migration/backfill, payroll proof backfill, customer-receivable backfill, and Prisma migration governance.
- No general implementation-plan, import-batch, mapping, row-error, control-total, cutover, training-completion, adoption-health, or support-case model was found.

### 4.3 Missing domain model and workflow

Proposed conceptual records:

- `ImplementationPlan`: tenant, template, country, modules, locations, owners, target milestones, risk classification, and state.
- `ImplementationMilestone`: prerequisite, owner, evidence, due date, completion, waiver, and blocker.
- `ImportBatch`: source type, content hash, schema version, record counts, actor, tenant, status, and retention.
- `ImportMapping`: source column, target field, transformation, locale, version, and approval.
- `ImportValidationIssue`: row/field reference, severity, code, safe message, proposed correction, and resolution.
- `ImportControlTotal`: source/destination measure, amount/count/currency, tolerance, result, and signoff.
- `CutoverRun`: dry run, approved execution, rollback/compensation plan, source snapshot, destination snapshot, and close evidence.
- `RoleReadiness`: role, required workflows, training/evidence state, and go-live permission.
- `AdoptionMilestone`: first sale, first receipt, first stock count, first match, first payroll, first close, and sustained-use signals.

### 4.4 Target jobs and actor value

- Owner: know exactly what remains before the business can rely on Stoquify.
- Accountant: reuse client setup templates and prove opening balances reconcile.
- Implementation partner: deploy multiple tenants through one governed playbook.
- Cashier: start with correct location, terminal, catalogue, tax posture, tenders, permissions, and practice workflow.
- Stockkeeper/buyer: start with trusted item, supplier, location, unit, and opening-stock data.
- Supplier/customer: enter the system with clean identities, contact details, terms, and balances.
- Support: see the exact import, mapping, setup, and training evidence behind a problem.

### 4.5 Minimum viable vertical slice

Implement a controlled master-data import and readiness packet:

1. One CSV template each for customers, suppliers, and items.
2. Upload, content hash, versioned mapping, dry-run validation, duplicate detection, and safe row errors.
3. Pre/post record counts and required-field control totals.
4. Explicit user approval before commit.
5. Idempotent replay behavior and a compensating archive plan; no destructive reset.
6. Evidence manifest and unresolved-exception export.
7. Dashboard milestone showing imported, reconciled, blocked, or waived.
8. A cashier readiness checklist for location, terminal, catalogue, tenders, receipt, and shift close.

Opening accounting balances should be a separate, higher-control slice after master import proves reliable.

### 4.6 Architecture and integration boundaries

- A platform onboarding service owns orchestration, mapping, evidence, and milestones; domain services still own validation and writes.
- Imports call canonical service commands rather than writing Prisma models directly.
- Large batches require jobs, chunking, idempotency, progress, retry, and dead-letter handling.
- Mapping definitions are tenant-scoped and schema-versioned.
- Every batch must bind source hash, actor, target module, source/destination counts, and resulting record IDs.
- A dry run must not write business truth.
- Go-live readiness is a status with evidence, not a certification claim.

### 4.7 Data, audit, security, and privacy controls

- Encrypt source files and restrict retention; payroll files require stricter scope and redaction.
- Prevent spreadsheet formula injection in previews and exports.
- Quarantine unsupported file types and oversized files.
- Do not place raw sensitive rows in logs, exceptions, or AI prompts.
- Use tenant-scoped staging and prevent cross-tenant mapping reuse unless sanitized as a template.
- Require fresh auth and segregation of duties for opening accounting balances or bulk financial mutations.
- Require before/after control totals, tolerances, and signoff for monetary migration.
- Preserve source lineage and corrections; do not silently discard rejected rows.

### 4.8 OHADA/accounting impact

- Opening balances must post through controlled journals and source links, not direct balance-field mutation.
- Historical documents need clear conversion scope; importing a document does not make it a statutory original.
- Currency, fiscal year, tax, chart-of-account, and country-pack mappings need dated provenance and qualified review.
- Migration reconciliation should feed close/data-trust readiness but must not self-certify it.

### 4.9 Pros, cons, packaging, metrics, and dependencies

Pros:

- Shortens time to first trusted transaction and first close.
- Prevents poor source data from poisoning reports and automation.
- Lowers implementation and support cost.
- Enables accountant-portfolio and partner-led distribution.
- Makes module activation and adoption measurable.

Cons:

- Legacy data is inconsistent and mapping scope can expand indefinitely.
- Users may mistake successful technical import for accounting correctness.
- Source-file security and retention become material obligations.
- Bulk operations raise concurrency, rollback, and support complexity.

Commercial packaging:

- Core self-service templates for starter tenants.
- Assisted Migration package with reconciled control totals.
- Accountant Portfolio template library and multi-client rollout view.
- Enterprise migration, adapter, and evidence services.

Metrics:

- Registration-to-first-trusted-sale time.
- Time to reconciled master data and first close.
- Import acceptance, rejection, correction, and duplicate rates.
- Percentage of monetary imports covered by passed control totals.
- Training/readiness completion by role.
- Implementation support tickets and cost per activated tenant.
- 30/90-day multi-role active usage and module activation.

Dependencies:

- Stable canonical domain commands.
- File security/retention policy.
- Versioned import schemas and safe error vocabulary.
- Job/worker capacity and evidence storage.
- Clear line between self-service import and qualified accounting migration.

## 5. Capability 3 — Planning, Forecasting, and Working-Capital Command

### 5.1 Definition and why it is vital

Build a deterministic, explainable planning layer that uses trusted Stoquify operational evidence to project cash, collections, supplier commitments, payroll, tax, inventory requirements, and business scenarios.

Stoquify currently excels at explaining what happened and what remains unreconciled. The missing value is an evidence-bound answer to what is likely to happen, why, how uncertain it is, and what a human decision-maker can do.

### 5.2 Current repository evidence

- Permissions exist for viewing/generating financial forecasts, viewing/creating/approving budgets, and viewing budget variance.
- Source discovery found no general forecast, budget, scenario-planning, or working-capital files. The only named scenario file is payroll statutory test coverage, which is regulatory-fixture evidence rather than business planning.
- Finance and cash command expose an authoritative aggregate payroll forecast when payroll proof is complete.
- Purchase-order analytics now supplies commitment, receipt, overdue, supplier concentration, and evidence coverage signals.
- Customer receivable documents, settlements, supplier invoices/payments, payroll obligations, provider settlement, inventory, ledger, and business signals already provide many required source facts.

### 5.3 Missing domain model and workflow

Proposed conceptual records:

- `ForecastVersion`: organization, horizon, baseline date, currency, state, owner, source snapshot, and approval.
- `ForecastLine`: date bucket, category, direction, amount, source type/reference, confidence, and assumption override.
- `PlanningAssumption`: versioned value, unit, effective dates, author, evidence, sensitivity range, and approval.
- `Scenario`: baseline/upside/downside/custom, parent forecast, overrides, rationale, and comparison.
- `BudgetVersion` and `BudgetLine`: organizational dimension, account/category, period, amount, state, and approval.
- `VarianceSnapshot`: actual, plan, variance, source freshness, explanation, and evidence.
- `WorkingCapitalRecommendation`: deterministic rule, evidence, impact range, constraint, owner, human disposition, and expiry.

### 5.4 Target jobs and actor value

- Owner/manager: see the next 13 weeks of cash and the decisions that change the outcome.
- Accountant: move from retrospective reporting to evidence-backed advisory and variance review.
- Buyer/stockkeeper: prioritize replenishment within cash and service constraints.
- Supplier: benefit from more predictable purchasing and fewer surprise late payments.
- Customer: benefit from better availability and fewer sudden credit or fulfillment disruptions.
- Cashier: benefit indirectly from stocked items, planned staffing, and fewer emergency policy changes.
- Bank/fintech: consume only consented, explainable forecast exports, never raw autonomous credit decisions.

### 5.5 Minimum viable vertical slice

Build a read-only 13-week cash forecast before budgets or AI recommendations:

1. Opening reconciled cash by currency/account.
2. Expected customer collections from open receivables, terms, promises, and historical behavior with explicit assumption labels.
3. Approved supplier invoices and purchase commitments, separated by evidence grade.
4. Payroll and statutory obligations from the existing authoritative aggregate payroll forecast.
5. Provider settlement expectations and unresolved suspense exclusions.
6. Recurring manual assumptions with owner, reason, expiry, and review.
7. Baseline, delayed-collections, and supplier-cost scenarios.
8. Source coverage, missing-input blockers, confidence, last refresh, and actual-versus-prior-forecast error.
9. No automatic orders, payments, credit changes, journal entries, or financing decisions.

### 5.6 Architecture and integration boundaries

- Finance/planning owns forecasts and scenarios; source domains own facts.
- Use immutable or versioned source snapshots so an approved forecast remains reproducible.
- Never read client-supplied organization scope or currency as business truth.
- Separate actual facts, system projections, and manual assumptions in contracts and UI.
- Rebuild asynchronously and invalidate forecasts when source facts materially change.
- Explain every amount through drill-through source references and exclusion reasons.

### 5.7 Data, audit, security, and model-risk controls

- Forecasts are decision-support artifacts, not guarantees or accounting records.
- Record model/rule version, data horizon, missing inputs, assumption owner, approval, and actual error.
- Redact person-level payroll and sensitive provider/customer data.
- Apply role/entitlement boundaries to scenarios, budget approval, and exports.
- Human review is mandatory for recommendations; AI may summarize evidence but cannot generate untraceable amounts or mutate operations.
- Prevent stale forecasts from appearing current after close, source correction, or entitlement changes.

### 5.8 OHADA/accounting impact

- Forecasts and budgets must remain outside posted ledger truth.
- Actual-versus-budget reporting should resolve actuals through source-linked accounting or service-owned operational measures.
- Tax and statutory obligations require country-pack provenance and qualified review.
- Any export used for financing requires consent, purpose limitation, evidence grading, and explicit non-certification language.

### 5.9 Pros, cons, packaging, metrics, and dependencies

Pros:

- Converts trusted history into daily economic decisions.
- Creates premium advisory value for owners and accountants.
- Improves cash discipline, collections, purchasing, and inventory productivity.
- Reuses existing source facts instead of creating a separate planning database of truth.

Cons:

- Missing commitments or bad assumptions can create false confidence.
- Seasonality, currency, inflation, and sparse history complicate accuracy.
- Small businesses can be overwhelmed by complex planning UX.
- Recommendation features introduce model-risk and liability concerns.

Commercial packaging:

- Finance Pro: 13-week cash forecast and variance.
- Growth Operations: inventory/purchasing scenarios.
- Accountant Advisory: multi-client forecast review and commentary.
- Enterprise: approved budgets, scenario governance, and consented forecast APIs.

Metrics:

- Forecast source coverage and blocked-source count.
- Forecast weighted absolute percentage error by 1/4/8/13-week horizon.
- Unexpected cash-shortfall frequency.
- Overdue receivable reduction and collection-plan completion.
- Inventory days, stockout rate, and slow-stock cash released.
- Budget cycle time, approval time, and explained variance coverage.
- Human review/accept/reject rate for recommendations.

Dependencies:

- Trustworthy opening cash, receivable, payable, payroll, and provider-settlement read models.
- Stable source-link and snapshot semantics.
- Data-quality and onboarding controls.
- Explicit forecast vocabulary and non-guarantee UX.

## 6. Capability 4 — Resilient Offline Field Operations Beyond POS

### 6.1 Definition and why it is vital

Extend Stoquify's proven offline evidence approach beyond checkout so stockkeepers, receivers, delivery staff, buyers, and managers can continue bounded work when connectivity is intermittent.

Offline continuity is not a convenience in the target operating environment. If sales can continue but receiving, stock counts, deliveries, and issue capture stop, the system creates a split reality: cash and receipts progress while inventory and purchasing evidence lag behind.

### 6.2 Current repository evidence

- The POS local queue accepts only `OFFLINE_SALE_CAPTURED`, `OFFLINE_TENDER_CLAIMED`, `OFFLINE_RECEIPT_PROVISIONED`, `OFFLINE_DRAWER_EVIDENCE`, and `OFFLINE_SESSION_EVIDENCE`.
- Its storage key is explicitly `aqstoqflow:pos-offline-queue:v1`.
- The queue rejects non-provisional receipt behavior until country policy permits fiscal finalization.
- Offline hooks and UI are POS-specific: `useEnqueueOfflinePOSEvent`, `useFlushOfflinePOSQueue`, and `OfflineSyncStatusStrip`.
- The offline POS readiness gate reports 16/16 internal control checks ready, including device hash chain, idempotency, quarantine, exact-once finalization/recovery, active cashier scope, signature verification, and policy expiry.
- The gate explicitly does not certify hardware, real connectivity, authority, or statutory compliance.
- No offline queue files were found for inventory count, goods receipt, delivery, transfer, expense capture, or manager approval.

### 6.3 Missing domain model and workflow

Do not generalize POS semantics prematurely. First define a shared edge contract with domain-specific payloads:

- `EdgeDevice`: tenant, user/device binding, keys, status, capabilities, policy version, expiry, and revocation.
- `OfflineWorkPack`: server-issued subject snapshot, allowed commands, version/etag, location scope, expiry, and disclosure policy.
- `EdgeCommandEnvelope`: domain, command type, local sequence, client timestamp, payload hash, prior hash, policy snapshot, and signature.
- `EdgeCommandIngestion`: received/quarantined/accepted/rejected/replayed status and reason.
- `EdgeConflict`: subject version conflict, duplicate, policy expiry, quantity conflict, missing prerequisite, or unauthorized scope.
- `EdgeResolution`: reviewer, disposition, accepted data, compensating command, and evidence.

Domain services retain final authority. Offline capture is provisional evidence until replayed and accepted.

### 6.4 Target jobs and actor value

- Stockkeeper: capture count observations, damage, and movement evidence in a warehouse with poor signal.
- Receiver: record delivery, quantities, photos, and supplier document references at the receiving point.
- Supplier/delivery partner: receive immediate signed acknowledgement of provisional delivery capture.
- Buyer/manager: review conflicts and overdue offline work after reconnection.
- Cashier: gains a consistent device/continuity model instead of an isolated POS exception.
- Accountant: receives complete replay lineage and can distinguish event time, ingestion time, acceptance time, and posting time.
- Customer: continues to receive service and delivery evidence during connectivity failure.

### 6.5 Minimum viable vertical slice

Start with offline inventory count observation, not offline posting:

1. Server issues a location/item work pack with expiry, item IDs, units, and version.
2. Enrolled device records count observations, photos metadata, actor, local sequence, and hash chain.
3. Sync verifies tenant/location/device/user scope, signature, policy, work-pack version, and idempotency.
4. Accepted observations populate an existing count session as unsubmitted evidence.
5. Quantity/version conflicts enter a manager queue.
6. Final count submission, adjustment, valuation, journal posting, and write-off approval remain online protected actions.
7. Prove lost-device revocation, expired work pack, duplicate replay, tamper, partial sync, and recovery.

Only after this is stable should goods-receipt draft capture be considered.

### 6.6 Architecture and integration boundaries

- Reuse POS cryptographic and replay concepts, not POS-specific service ownership or event types.
- Each domain registers explicit offline-capable commands and reconciliation rules.
- Server-issued work packs bound what the device may see and do while offline.
- Edge storage must be encrypted where platform capabilities permit and data minimized.
- Business events emit only after server acceptance, not local capture.
- Client clocks are evidence, never authoritative accounting or fiscal time.

### 6.7 Data, audit, security, fraud, and privacy controls

- Device enrollment, user binding, location scope, remote revocation, key rotation, and policy expiry.
- Per-command payload/schema allowlist; never queue arbitrary server actions.
- Tamper-evident local sequence and hash chain plus server-side signature verification.
- Minimize customer, payroll, price, and bank data in offline work packs.
- Bound queue size, retention, retry, and stale-data behavior.
- Make conflicts visible; never silently apply last-write-wins to inventory or money.
- Require online fresh auth for final financial, fiscal, bank, payroll, write-off, and approval mutations.

### 6.8 OHADA/accounting impact

- Offline event time, ingestion time, acceptance time, stock effective time, accounting time, and fiscal time must remain distinct.
- Offline observations do not become posted stock or accounting movements until authoritative services accept them.
- Country-pack rules govern fiscal numbering and statutory document timing.
- Close assurance must surface unreplayed/quarantined events that could affect a period.

### 6.9 Pros, cons, packaging, metrics, and dependencies

Pros:

- Preserves operational continuity and evidence completeness.
- Differentiates Stoquify for real low-connectivity operations.
- Reduces later reconstruction of stock and delivery activity.
- Reuses a sophisticated existing POS replay foundation.

Cons:

- Distributed consistency, lost devices, stale reference data, and conflict UX are difficult.
- Offline sensitive data raises theft and privacy risk.
- Every added offline command multiplies failure-path testing.
- Users may mistake provisional capture for final accepted truth.

Commercial packaging:

- POS offline remains core for eligible packages.
- Operations Resilience add-on for inventory count and receiving.
- Multi-branch/regulated packages add device governance, longer evidence retention, and centralized conflict operations.

Metrics:

- Offline task completion and successful replay rate.
- Conflict, quarantine, duplicate, signature-failure, and expired-policy rates.
- Median reconnect-to-accepted time.
- Percentage of close blockers caused by unreplayed events.
- Lost/revoked device recovery time.
- Stock-count variance attributable to stale or conflicting offline observations.

Dependencies:

- Offline POS foundation remains stable.
- Shared edge security contract and device operations.
- Inventory count service support for provisional observations.
- Real hardware/connectivity pilot and qualified country-policy review.

## 7. Capability 5 — Customer Growth, Loyalty, and Revenue Lifecycle Engine

### 7.1 Definition and why it is vital

Build a consent-aware revenue domain that helps merchants understand customer behavior, retain valuable customers, run controlled offers, and measure whether promotions create profitable repeat business.

Stoquify currently protects the path from sale to evidence. It does not yet provide a structured path from customer behavior to retention and new demand. A business operating system that controls cost and cash but does not help create revenue risks being perceived as necessary administration rather than a growth tool.

### 7.2 Current repository evidence

- The `Customer` model stores identity, contact, tax, credit, payment terms, locale, balance, active state, orders, ledger, receivables, statements, and settlements.
- The customer management UI describes loyalty details as content that may be stored in the generic `notes` field.
- `LOYALTY_POINTS` appears in a payment-method list, but no issuing, earning, expiry, redemption, reversal, liability, or points-ledger service was found.
- Repository source search found no customer segment, campaign, promotion engine, membership tier, churn, win-back, consent preference, or customer lifetime value domain.
- Existing customer analytics and statements provide transactional inputs that can support a governed growth model.

### 7.3 Missing domain model and workflow

Proposed conceptual records:

- `CustomerConsentPreference`: channel, purpose, status, source, proof, effective dates, revocation, and locale.
- `CustomerLifecycleEvent`: purchase, return, payment, dispute, inactivity, enrollment, reward, and service event linked to canonical sources.
- `CustomerSegmentDefinition`: deterministic rules, version, owner, eligible fields, refresh cadence, and status.
- `CustomerSegmentMembership`: customer, segment, evaluated time, evidence, and expiry.
- `LoyaltyAccount`: program, customer, status, tier, and tenant scope.
- `LoyaltyLedgerEntry`: earn, redeem, expire, reverse, adjust, source sale/refund, value, balance, actor, and idempotency.
- `Offer` and `PromotionRule`: eligibility, location/item/time/channel constraints, budget, approval, stacking policy, and accounting treatment.
- `Campaign`: audience snapshot, consent policy, content version, channel, delivery outcome, cost, and attributed result.

### 7.4 Target jobs and actor value

- Owner/manager: know who returns, who is at risk, which offers create margin, and what revenue is repeatable.
- Cashier: identify eligible rewards quickly, obtain/confirm consent safely, and apply approved offers without manual price overrides.
- Customer: receive relevant, transparent benefits and control communication preferences.
- Accountant: see discount, loyalty liability, redemption, expiry, and campaign cost treatment with source evidence.
- Stockkeeper/buyer: connect planned campaigns to stock availability and avoid promoting unavailable items.
- Supplier: participate only in explicit funded promotions with transparent attribution and settlement.
- Implementation partner: configure a simple program and measure adoption without custom code.

### 7.5 Minimum viable vertical slice

Build consent and a reversible loyalty ledger before campaigns:

1. Customer communication consent/preferences with proof, purpose, locale, and revocation.
2. Rule-based recency/frequency/value segments from finalized sales and returns, with no AI classification.
3. One simple points program with explicit earn and redemption rules.
4. Append-only points ledger linked to sale/refund/void sources.
5. POS eligibility and redemption through an authoritative server command; no client-computed balance.
6. Refund/void reversal and idempotency.
7. Liability/discount evidence surfaced to finance without auto-claiming statutory treatment.
8. Customer-visible balance and transaction history through the external access foundation.
9. No automated messaging campaign in the first release.

### 7.6 Architecture and integration boundaries

- Sales/POS remains authoritative for finalized sales, returns, and tenders.
- A growth service owns consent, segmentation, loyalty, offers, and attribution.
- Accounting determines posting rules and liability/discount treatment through configurable, expert-reviewed policy.
- Inventory supplies eligibility and availability; promotion logic cannot reserve or reduce stock independently.
- External messaging uses communication providers/outbox with consent checks at send time.
- Campaign attribution is an analytic claim with method/version disclosure, not business truth equal to a sale.

### 7.7 Data, audit, security, fraud, and privacy controls

- Collect explicit purpose-bound consent and preserve revocation evidence.
- Apply data minimization, retention, export/delete workflows, and access controls to behavioral profiles.
- Protect against points farming, duplicate earn, refund abuse, cashier/customer collusion, account takeover, and manual adjustment abuse.
- Require fresh auth/maker-checker for program rule changes, high-value adjustments, and campaign approval.
- Rate-limit lookups and do not expose whether a phone/email belongs to another tenant's customer.
- Separate transactional communications from marketing consent.
- Avoid sensitive or discriminatory segmentation fields.

### 7.8 OHADA/accounting impact

- Loyalty points, vouchers, gift value, and discounts may create different accounting/tax treatments; policy must be country-pack/configuration driven and expert reviewed.
- Earn, redeem, expire, reverse, and adjust entries require source links and immutable history.
- Supplier-funded promotions require agreement, accrual, settlement, and evidence boundaries.
- Revenue reporting must show gross sales, discounts, redemption, returns, and program liability consistently.

### 7.9 Pros, cons, packaging, metrics, and dependencies

Pros:

- Moves Stoquify from control-only value to measurable revenue value.
- Increases merchant and customer engagement.
- Gives cashiers useful customer context without granting broad CRM access.
- Creates premium growth packages and supplier-funded opportunities.
- Reuses sales, customer, statement, analytics, messaging, and accounting foundations.

Cons:

- Marketing consent and behavioral data increase privacy risk.
- Rewards are fraud targets and can create accounting liabilities.
- Poor offers can destroy margin or create operational load.
- Attribution can be misleading without controlled methods and experiments.

Commercial packaging:

- Sales Core: consent and customer history.
- Growth: segments, loyalty, offers, and basic performance.
- Multi-branch Growth: centralized rules, branch experiments, and inventory-aware offers.
- Enterprise: provider integrations, advanced governance, and supplier-funded programs.

Metrics:

- Consent opt-in/revocation and preference completeness.
- Repeat-purchase rate and retained-customer revenue.
- Loyalty earn/redemption/reversal/expiry and fraud rates.
- Incremental margin, not only campaign revenue.
- Offer use when stock was available.
- Cashier redemption time and denied/failed redemption rate.
- Customer complaints and unsubscribe rate.

Dependencies:

- Stable customer and POS sources.
- Consent/privacy policy and country review.
- Accounting treatment for loyalty and promotions.
- Counterparty/customer self-service for transparent balances.
- Planning/inventory checks before inventory-intensive campaigns.

## 8. Cross-stakeholder value matrix

| Stakeholder | Counterparty network | Onboarding/adoption | Planning/working capital | Offline field operations | Customer growth/loyalty |
| --- | --- | --- | --- | --- | --- |
| Owner/CEO | External commitments and disputes become visible | Faster, controlled go-live | Forward cash and scenario visibility | Continuity risk and conflict visibility | Repeat revenue and margin growth |
| Manager | Assigned resolutions and response SLAs | Readiness ownership by branch/role | Actionable collection, purchasing, and cash plans | Conflict review after reconnection | Governed segments and offers |
| Accountant | Source evidence from actual counterparties | Reconciled opening data and reusable client setup | Advisory forecasts and explained variance | Complete event/replay lineage | Discount, loyalty, and promotion evidence |
| Supplier | PO, delivery, invoice, remittance, dispute transparency | Clean identity, terms, and opening state | More predictable purchase/payment behavior | Provisional receiving evidence during outages | Funded promotion participation when governed |
| Customer | Receipt, invoice, statement, dispute, and status self-service | Correct identity/balance/preferences from start | Better availability and service continuity | Service and delivery continue during outages | Transparent consent and relevant rewards |
| Cashier | Fewer receipt/account status investigations | Correct terminal, catalogue, tender, and training setup | Better stocking/staffing decisions indirectly | Proven POS plus consistent device-continuity model | Fast approved rewards without manual discounts |
| Stockkeeper/receiver | Supplier response and delivery visibility | Clean item/location/unit/supplier masters | Cash-aware replenishment | Count/receiving evidence without network | Promotion demand connected to availability |
| Buyer/AP team | Shared PO/invoice resolution | Trusted supplier/opening data | Commitment and payment scenarios | Receiving continuity and conflict evidence | Supplier-funded offer evidence |
| Implementation partner | External participant rollout | Scalable governed delivery playbook | Premium advisory configuration | Resilience deployment service | Growth program configuration |
| Bank/fintech | Consented transaction evidence | Verified integration/readiness evidence | Explainable, consented forecasts | Continuity evidence and replay health | Payment-linked offers only through governed boundaries |

## 9. Consolidated pros, cons, and control matrix

| Capability | Largest upside | Largest downside | Non-negotiable controls |
| --- | --- | --- | --- |
| Counterparty network | Network effects and evidence at source | External identity, disclosure, fraud, and adoption | Explicit grants, no auto-merge, idempotency, redaction, maker-checker, malware scanning |
| Onboarding/adoption | Faster trustworthy activation and partner scale | Mapping sprawl and migration liability | Dry run, canonical commands, control totals, source hashes, retention, compensation, qualified signoff |
| Planning/working capital | High-value forward decisions and accountant advisory | False confidence from incomplete data | Source coverage, versioned assumptions, error measurement, human decisions, no autonomous mutation |
| Offline field operations | Real continuity and complete field evidence | Distributed consistency and stolen-device risk | Signed allowlisted envelopes, work-pack scope/expiry, quarantine, conflict queue, no offline final posting |
| Growth/loyalty | Revenue retention and premium packaging | Privacy, fraud, margin erosion, accounting complexity | Purpose consent, append-only ledger, server balance, reversal, approval, inventory and accounting policy |

## 10. Recommended implementation sequence and dependency map

### 10.1 Precondition — finish one current releaseable slice

Before starting these capabilities, complete and isolate one existing customer/supplier/reconciliation release path. The 2026-08-10 recovery assessment's central warning remains valid: many concurrent partially completed workstreams reduce verified product delivery. New strategic work begins only with a named owner, exact scope, acceptance evidence, and non-goals.

### 10.2 Delivery sequence

1. Onboarding foundation:
   - implementation plan and milestone vocabulary;
   - customer/supplier/item dry-run import;
   - evidence, errors, control totals, and cashier readiness.
2. Shared external and edge foundations in narrow slices:
   - counterparty relationship/grant/disclosure contract;
   - shared edge device/work-pack/envelope security contract;
   - do not build broad portals or general offline command frameworks yet.
3. Offline inventory-count pilot:
   - provisional observation only;
   - real-device/connectivity evidence;
   - conflict and revocation exercises.
4. Counterparty pilot:
   - supplier PO acknowledgement;
   - customer statement resolution lifecycle.
5. Read-only 13-week cash forecast:
   - source coverage and error measurement before budgets or recommendations.
6. Customer consent and loyalty ledger:
   - no automated campaign until accounting, privacy, fraud, and inventory controls pass.
7. Expansion decisions based on measured adoption:
   - supplier invoice exchange;
   - goods-receipt offline capture;
   - budgets/scenarios;
   - offers/campaigns.

### 10.3 Dependency summary

`release stability -> onboarding/data quality -> {counterparty foundation, edge foundation} -> {network pilot, offline count pilot} -> forecast accuracy -> consent/loyalty -> controlled expansion`

The braces show capabilities that may share a platform foundation, not authorization to execute independent large programs simultaneously.

## 11. Reviewer disagreements and selected positions

### 11.1 Product growth versus control/release

- Growth view: build loyalty and counterparty experiences immediately because visible revenue/customer value is needed.
- Controls/release view: do not expand until existing slices are isolated and verifiably released.
- Selected position: release one slice first, then onboarding; growth enters only as a narrow consent/ledger slice after core evidence is reliable.

### 11.2 Counterparty network versus simple public links

- Simplicity view: extend signed links per document without a relationship domain.
- Architecture/security view: repeated document tokens without a counterparty relationship and disclosure contract will fragment consent, revocation, and support.
- Selected position: keep signed links as an access method but introduce a minimal relationship/grant/disclosure spine before multiplying workflows.

### 11.3 Generic offline framework versus domain-specific pilots

- Platform view: extract the POS queue immediately into a universal offline SDK.
- Distributed-consistency view: POS semantics do not safely generalize to stock, approvals, or accounting.
- Selected position: define shared security envelopes but validate one provisional inventory-count command before generalizing domain behavior.

### 11.4 AI forecast versus deterministic forecast

- Innovation view: AI can infer collections, demand, and recommendations quickly.
- Finance/model-risk view: untraceable amounts and advice would undermine Stoquify's proof positioning.
- Selected position: deterministic, versioned, source-linked forecast first. AI may later explain or summarize but not originate authoritative amounts or mutations.

### 11.5 Integration marketplace versus customer growth as the fifth capability

- Integration view: a connector marketplace is necessary for banks, mobile money, e-commerce, and authorities.
- Product-value view: Stoquify already has business events, outboxes, provider adapters, country-adapter pilot, and connector-health foundations; the missing end-user outcome is revenue retention.
- Selected position: treat integration operations as an enabling platform investment inside each capability. Select customer growth as the fifth strategic product domain.

### 11.6 Multi-entity consolidation versus broader SMB outcomes

- Accounting-enterprise view: consolidation and intercompany are valuable and currently absent.
- Market/product view: this benefits a narrower later-stage segment than onboarding, network, planning, offline continuity, and growth.
- Selected position: defer group consolidation to a later enterprise-accounting strategy review.

## 12. Deferred candidates and reasons

- Generic case-management platform: action queue, workflow-assurance incidents, close comments/assignments, accountant evidence queues, and manager action center already provide substantial foundations. Unify only when the selected vertical slices expose a proven cross-domain contract.
- Connector marketplace/developer portal: important, but provider adapters, country adapters, events/outbox, and connector health are already active foundations. Build required connector contracts per selected capability before commercializing a marketplace.
- Multi-entity consolidation/intercompany: strategically valuable for larger groups, but narrower cross-role reach than the selected five.
- Embedded lending/financing: prohibited as an early recommendation. It depends on forecast provenance, consent, provider governance, regulatory review, and human credit decisions.
- Broad AI autonomy: existing copilot guardrails correctly favor proposals and approvals. No selected capability requires autonomous financial mutation.
- Full e-commerce storefront: sales/customer foundations can support later commerce, but the immediate missing domain is consented lifecycle/retention, not a new storefront.

## 13. Commercial packaging implications

| Package | Included capability slices | Commercial promise boundary |
| --- | --- | --- |
| Starter Shop | Guided setup, master templates, cashier readiness, customer receipt/statement access, POS offline | Fast trusted launch and continuity; no planning or marketing automation claim |
| Growth Operations | Supplier acknowledgement, offline count, 13-week cash forecast, customer consent/loyalty | Better collaboration, continuity, cash decisions, and retention |
| Accountant Portfolio | Multi-client implementation templates, migration control totals, forecast review, evidence requests/resolution | Repeatable client onboarding and advisory evidence; no statutory self-certification |
| Enterprise/Regulated | Extended counterparty APIs, device governance, budget approvals, advanced retention, provider connectors | Governed scale and integration; external authority certification remains separate |

Each capability should have an explicit module slug, dependency contract, entitlement behavior, locked/degraded states, audit policy, and support owner before commercialization.

## 14. Portfolio success measures

Measure outcomes across the sequence rather than celebrating route count:

- Activation: registration-to-first-trusted-sale, first reconciled import, first complete shift close, and first close.
- Data trust: source coverage, import control-total pass rate, unresolved migration exceptions, and stale-data blockers.
- Collaboration: PO acknowledgement, digital evidence submission, dispute resolution, and self-service containment.
- Continuity: accepted replay, conflict/quarantine, device revocation, and unreplayed-period blocker rates.
- Decision value: cash forecast error, unexpected shortfalls, working-capital improvements, and human decision outcomes.
- Growth: repeat revenue, incremental margin, consent health, loyalty fraud/reversal, and customer complaint rates.
- Commercial: activation cost, support cost, conversion, retention, module attachment, accountant/partner productivity, and expansion revenue.
- Safety: denied cross-tenant attempts, fresh-auth enforcement, audit coverage, idempotency conflicts, data retention compliance, and incident rates.

## 15. Success criteria for this strategy review

- Exactly five capabilities selected: met.
- Every selection supported by current source or dated repository evidence: met.
- Existing features distinguished from missing domains: met.
- Each capability has a narrow MVP: met.
- Stakeholder benefits, disadvantages, controls, metrics, and packaging are explicit: met.
- Sequence avoids five uncontrolled parallel workstreams: met.
- Current repository truth is separated from conceptual model proposals: met.

## 16. Non-goals

- No application, route, service, schema, permission, migration, or UI implementation.
- No broad refactor or unrelated lint cleanup.
- No database mutation, migration deployment, seed, reset, or external provider call.
- No legal, accounting, OHADA, tax, privacy, security, accessibility, production, or release certification.
- No autonomous financial decisions.
- No forecast guarantee.
- No cross-tenant counterparty merge.
- No offline final fiscal, ledger, payment, bank, payroll, or write-off action.
- No embedded lending recommendation.

## 17. Verification record

Read-only discovery performed:

- Read the supplied execution prompt and changed its exact selection constraint from three to five.
- Read the prompt-architect skill and output skeleton.
- Inspected current `git status --short` to preserve the dirty worktree.
- Inspected the 19-module catalogue in `services/modules/module-catalog.service.ts`.
- Inspected direct schema regions for Organization, Customer, Supplier, purchase/sales documents, statements, settlements, business events, outbox, and workflow assurance.
- Inspected recent customer, public statement, supplier, purchase-order analytics, payment entitlement, role cockpit, offline POS, country adapter, public identity, report trust, payment cash truth, close truth, and recovery reports.
- Inspected `innovation/`; current artifacts cover command-surface reruns and payment transaction proof/assurance rather than the five proposed domains.
- Inspected graph summaries for actions, app routes, components, and hooks.
- Ran focused source searches for budgets/forecasts, onboarding/import/migration, counterparty portals, offline behavior, loyalty/growth, case management, integrations, and multi-entity consolidation.

Verification result:

- Strategy artifact only; code tests, typecheck, Prisma validation, browser smoke, and policy gates were not applicable because no runtime behavior changed.
- Structural check passed: exactly five capability sections, success criteria, evidence index, no unresolved prompt placeholders, and 8,075 words across 894 lines at the verification point.
- Focused `git diff --no-index --check` emitted no whitespace diagnostics; its exit code `1` represents the expected new-file difference from `NUL`, not a failed whitespace check.
- Focused `git status --short` reports only this new untracked strategy artifact for the reviewed path. Existing unrelated dirty-worktree changes were not modified or reverted.

## 18. Evidence index

Primary repository truth:

- `services/modules/module-catalog.service.ts:61-268` — canonical module catalogue and descriptions.
- `prisma/schema.prisma:237-259` — organization onboarding metadata.
- `services/dashboard/dashboard-read-model.service.ts:914-963` — service-owned setup-progress steps.
- `components/dashboard/todays-operating-truth.ts:860-909` — onboarding presentation model.
- `prisma/schema.prisma:1028-1097` — supplier aggregate.
- `prisma/schema.prisma:1101-1140` — transactional customer aggregate.
- `components/customers/CustomerManagementDashboard.tsx:225-240` — loyalty stored only as possible free-text notes.
- `prisma/schema.prisma:5335-5768` — customer statement access, actions, delivery, and settlement foundations.
- `lib/permissions.ts:234-242` — forecast and budget permission vocabulary.
- `services/finance/finance-dashboard.service.ts:267-341` — payroll forecast evidence in finance.
- `lib/pos/offline-local-queue.ts:1-87` — POS-only offline event and storage vocabulary.
- `lib/pos/offline-local-queue.ts:208-357` — provisional policy, hash chain, queue, and replay preparation.
- `hooks/posHooks/useOfflineSync.ts:87-242` — POS offline dashboard/enqueue/flush hooks.
- `services/events/business-event.service.ts` and `prisma/schema.prisma:6856-6939` — business event/outbox foundation.
- `prisma/schema.prisma:7376-7789` — workflow assurance checks, incidents, events, alerts, and waivers.

Dated assessment and verification evidence:

- `what-next/platform-progress-recovery-assessment-2026-08-10.md:64,94-112,211-300` — product-value score, root causes, and single-critical-path recovery requirement.
- `what-next/platform-one-week-recovery-roadmap-2026-08-10.md:9-99` — release focus and non-goals.
- `what-next/STOQUIFY_SUPPLIER_WORKFLOW_VERIFICATION_2026-08-11.md:3-23` — internal supplier scope and exclusions.
- `what-next/STOQUIFY_CUSTOMER_WORKFLOW_VERIFICATION_2026-08-11.md:28-37` — customer aggregate and external-flow exclusions.
- `what-next/STOQUIFY_PUBLIC_CUSTOMER_STATEMENT_RECIPIENT_WORKFLOW_VERIFICATION_2026-08-13.md:3-36,132` — signed access/actions and unresolved external workflow gaps.
- `what-next/offline-pos-fiscal-replay-readiness.md` — 16/16 internal offline POS control checks and certification boundary.
- `what-next/purchase-order-analytics-modernization-2026-08-14.md` — current purchasing commitments, supplier, delivery, and evidence analytics.
- `what-next/payment-reconciliation-tenant-entitlement-provisioning-2026-08-14.md` — current entitlement and recovery controls.
- `what-next/role-based-operating-cockpit-readiness.md` — current Daily Digest role-cockpit boundary.
- `what-next/report-trust-export-readiness.md` — current customer/accountant evidence and export foundations.
- `what-next/public-identity-abuse-readiness.md` — public identity abuse-control foundation and release-secret warning.

Architecture discovery aids:

- `graphify-out/GRAPH_REPORT_actions.md:85-153` — action hubs and purchase-order/customer/supplier communities.
- `graphify-out/GRAPH_REPORT_app.md:189-211,258-270` — analytics, daily digest, cash command, manager action center, and owner war-room route communities.
- `graphify-out/GRAPH_REPORT_components.md:85-123,191-195` — operating truth/onboarding and statement workflow component communities.
- `graphify-out/GRAPH_REPORT_hooks.md:1-120` — current hook topology dominated by existing operational workflows.

## 19. Optional next execution prompts

1. Audit and design only the universal import/evidence contract for customer, supplier, and item master data; do not implement accounting opening balances.
2. Produce the counterparty relationship/grant/disclosure architecture for supplier PO acknowledgement and customer statement resolution; do not add payment initiation.
3. Design the offline inventory-count observation pilot using POS replay security concepts while preserving inventory service ownership.
4. Specify a deterministic 13-week cash forecast contract with source coverage and error measurement; exclude AI amounts and autonomous actions.
5. Audit consent and loyalty accounting/privacy requirements before designing a loyalty ledger; do not implement campaigns.
