# Project Status Report And UI/UX Next Steps

Date: 2026-06-11
Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`

## 1. Rollback / Undo Status

The interrupted prompt was:

> Wire the regulatory resolver into actual tax/payroll/payment consumers.

That prompt reached only inspection and analysis. No file edits were applied during that interrupted step, so there was nothing from that specific prompt to undo.

The earlier completed regulatory data foundation remains in the worktree. It was a separate completed milestone, not part of the interrupted consumer-wiring attempt. If that earlier milestone must also be removed, it should be treated as a separate rollback because it includes new regulatory services, tests, seed cleanup, POS schema constants, and UI placeholder cleanup.

## 2. Where The Platform Stands Now

The platform is currently in a backend-hardening and control-plane phase. The strongest work completed today is below the UI layer:

- POS sales, payments, refunds, and voids have been moved toward atomic operational/accounting flows.
- Posting-rule, source-link, reconciliation, and customer-ledger services now form a stronger accounting operational spine.
- Payment reconciliation has duplicate provider-reference controls and settlement-failure tests.
- Sensitive financial actions have a centralized control service with risk tiers, permissions, fresh-auth, self-approval blocking, and transaction-scoped audit logging.
- Cameroon regulatory pack infrastructure now exists, with versioned values, provenance, validation, golden fixtures, and hardcode detection.

The important architectural reality is that backend/control infrastructure is ahead of UI/UX. The next professional build step should not be more deep backend wiring into absent modules. It should be to expose the built services through controlled server actions, hooks, and enterprise UI surfaces, while delaying invoice/payroll resolver wiring until those domains have real service/model structures.

## 3. Work Completed Today

### 3.1 Accounting And POS Checkpoint Hardening

What happened:

- The POS/accounting slice was stabilized around sale, payment, refund, and void flows.
- POS sale commitment was connected to accounting posting services inside the same Prisma transaction.
- Refund and void accounting paths were added through dedicated posting modules.
- Rollback tests were added or completed to prove accounting failure rolls back operational effects.
- Direct ledger mutation paths were reduced in favor of accounting service calls.

Why this choice was made:

POS is the most dangerous place to allow partial writes. A completed sale affects inventory, payment, drawer/session totals, customer balance, tax totals, and ledger truth. If any one of those commits while another fails, the system becomes unreconcilable.

Advantages:

- Stronger atomicity: failed accounting posting should roll back the operational sale/payment/refund/void.
- Better auditability: POS events now have clearer accounting source linkage.
- Lower fraud risk: it becomes harder to hide money movement outside the ledger.
- Easier future UI: the UI can show one sale status instead of trying to reconcile half-completed backend state.

Disadvantages / tradeoffs:

- More service complexity at the transaction boundary.
- Tests need heavier mocks because each POS workflow now touches multiple domains.
- Debugging failures requires understanding POS, accounting, payments, and inventory together.

Effect on the platform:

This moved the POS/accounting layer from a feature implementation toward an enterprise operational control slice. It is not just "POS works"; it is "POS events are becoming ledger-first and rollback-safe."

### 3.2 Payment Reconciliation Hardening

What happened:

- Provider reference evidence was centralized for card, mobile-money, and bank-transfer payments.
- Duplicate provider capture checks were added before payment creation.
- Settlement batch reconciliation logic detects:
  - duplicate internal provider references,
  - duplicate provider settlement references,
  - missing provider references,
  - unmatched provider lines,
  - amount mismatches,
  - settlement gross mismatches,
  - fee deviations.
- A payment-provider uniqueness migration was added and applied in the dev/test database.

Why this choice was made:

Payments are not true simply because the UI says "paid." Payment truth requires internal payment records, provider/bank evidence, and ledger agreement. Provider references are the natural anti-duplicate anchor for MoMo/card/bank flows.

Advantages:

- Prevents duplicate payment capture using the same provider transaction reference.
- Gives reconciliation failures a typed structure instead of a vague mismatch.
- Creates a path for suspense handling and close blocking.
- Improves future payment UI: failures can be displayed as actionable reconciliation rows.

Disadvantages / tradeoffs:

- Provider references must be captured consistently at POS and payment-entry time.
- More strictness may reject weak historical/demo data until it is cleaned.
- Provider-specific behavior still needs richer adapters before production MoMo/card/bank integration.

Effect on the platform:

The platform now has the beginning of a payment moat: provider references cannot be casually reused, and reconciliation differences can be classified instead of hidden.

### 3.3 Fraud-Control Backbone

What happened:

- A centralized sensitive-action control service was introduced.
- Critical actions were classified by risk tier.
- Permissions, separation-of-duties, fresh-auth requirements, export controls, detector signals, and audit action metadata were centralized.
- Control checks were wired into critical accounting operations such as journal post/reverse, period close, setup lock, and export.
- POS tender actions were also brought under the control plane where appropriate.

Why this choice was made:

Fraud controls cannot live only in UI buttons. They must be service-enforced so API calls, server actions, background jobs, or future UI rewrites cannot bypass them.

Advantages:

- One policy spine for critical financial operations.
- Self-approval and stale-auth controls become consistent.
- Denied attempts can be logged and analyzed.
- Future UI can render policy requirements from a shared service model.

Disadvantages / tradeoffs:

- More friction for users performing high-risk actions.
- Requires careful UX so fresh-auth and approvals feel controlled, not broken.
- Policies must be maintained as the permissions model evolves.

Effect on the platform:

The platform now has a financial control plane that can govern critical workflows. This is a major enterprise-readiness step because controls are centralized and testable instead of scattered.

### 3.4 Seed And Demo Data Improvements

What happened:

- The comprehensive seed was refactored around an organization context model.
- The intent is exactly 5 organizations with corresponding operational/accounting data.
- Seed data was also updated so VAT demo values resolve from the regulatory pack instead of embedding legal/tax literals.

Why this choice was made:

Enterprise demos must prove tenant isolation and referential integrity. One large pile of sample data does not prove multi-tenant behavior. A structured organization loop does.

Advantages:

- Better multi-tenant test realism.
- Easier to spot cross-tenant leaks.
- Better demo environment for UI development.
- Seed VAT values no longer drift from the regulatory source.

Disadvantages / tradeoffs:

- Seed scripts become more complex.
- More data means slower seed runs.
- Seed validation must be kept in sync with schema changes.

Effect on the platform:

The seed is becoming a serious integration fixture, not just demo decoration. This will be very useful for UI/UX work because screens can be tested against dense, realistic data.

### 3.5 Cameroon Regulatory Data Foundation

What happened:

- A `services/regulatory` module was added.
- Cameroon country-pack data was created with:
  - VAT/TVA parameters,
  - CNPS/social contribution parameters,
  - NIU/RCCM identity rules,
  - filing names/deadlines,
  - labels,
  - holidays,
  - mobile-money provider legality metadata,
  - legal references,
  - effective dates,
  - verification fields,
  - pack version,
  - deterministic hash.
- A resolver was added to resolve values by country/date/entity/pack version.
- Publish validation was added for required paths, legal references, hash checks, effective windows, and golden fixtures.
- A hardcode detector was added and run.
- Production regulatory hardcode scan returned no findings after seed/UI/POS cleanup.

Why this choice was made:

Regulatory values cannot be app settings and cannot be hidden inside engine code. They need versioning, legal provenance, effective dating, and reproducible historical resolution.

Advantages:

- Legal/tax/payroll values are centralized in a versioned pack.
- Historical artifacts can pin a pack version.
- Defective packs fail validation.
- Hardcoded legal/tax/payroll/provider values can be detected.
- Future countries can be added through pack data rather than engine forks.

Disadvantages / tradeoffs:

- Legal values still require qualified expert review before production reliance.
- The pack infrastructure is ahead of real invoice/payroll UI structures.
- Resolver integration must be done carefully so it does not create awkward dependencies in unfinished modules.

Effect on the platform:

The platform now has a regulatory data foundation. It should be treated as a platform service and surfaced through UI after the user-facing regulatory/settings workflows are designed.

### 3.6 Interrupted Consumer-Wiring Attempt

What happened:

- I started tracing where the resolver should be wired into POS, invoice, payroll, and payment consumers.
- I found:
  - POS has real tax calculation in `services/pos/pos.service.ts`.
  - Payment provider checks exist in `services/payments/payment-reconciliation.service.ts` and POS tender/payment creation.
  - There is no real invoice domain model/service yet; sales orders/receipts are currently the closest invoice-like surface.
  - Payroll is not yet a full domain module; the visible payroll-related issue is an analytics estimate with a hardcoded payroll-tax ratio.
- No code edits were applied during that interrupted step.

Why stopping was correct:

Wiring regulatory logic into incomplete invoice/payroll structures would create premature architecture. It would make the platform look more complete while hiding that the required service/model/action/UI workflow does not yet exist.

Advantages of stopping:

- Avoids building fake invoice/payroll integrations.
- Prevents regulatory service coupling to weak or temporary surfaces.
- Keeps the next work focused on UI/service architecture rather than forced backend wiring.

Disadvantages:

- POS tax and payment-provider legality are not yet fully resolved through runtime pack calls.
- Payroll CNPS has infrastructure data but not yet a full payroll domain consumer.
- Invoice tax needs an actual invoice/sales-document service before proper integration.

Effect on the platform:

This revealed an important sequencing issue: regulatory infrastructure exists, but the UI and domain workflows for invoice/payroll/payment-provider configuration must be built before deep resolver integration.

## 4. Verification Performed Today

The following checks were run during today's hardening work:

- `npm test -- services/accounting services/payments services/controls services/pos --runInBand`
  - Passed in the earlier checkpoint: 17 suites, 64 tests.
- `npm test -- services/regulatory services/pos --runInBand`
  - Passed: 3 suites, 17 tests.
- `npm run typecheck`
  - Passed.
- `npm run prisma:validate`
  - Passed.
- Regulatory hardcode scan
  - Returned `[]` after cleanup.

Residual verification risk:

- Full application UI flows were not manually tested in browser during this backend hardening phase.
- The worktree is dirty with many related files, so any final merge/commit should do a fresh focused review first.
- Legal/regulatory values require qualified professional review before production statutory use.

## 5. Key Architectural Choices And Their Consequences

### Choice 1: Service Layer First

Need:

StockFlow is a financial/operational system. Business invariants must be enforced in services, not only in UI.

Advantages:

- Server actions and UI cannot bypass the rules.
- Tests can target domain behavior directly.
- Future UI rewrites remain safe.

Disadvantages:

- More upfront backend work before screens appear.
- Users may not see progress immediately.

Platform effect:

The platform becomes safer and more maintainable, but now needs UI surfaces to expose the value.

### Choice 2: Transactional POS Accounting

Need:

A POS sale changes money, stock, tax, customer balance, payment records, cash drawers, and accounting.

Advantages:

- Reduces partial-write risk.
- Makes rollback behavior testable.
- Better supports audit and reconciliation.

Disadvantages:

- Larger transactions require careful performance and concurrency checks.
- Error messages must be polished so cashiers understand failures.

Platform effect:

POS is becoming a serious enterprise workflow rather than a sales form.

### Choice 3: Payment Reconciliation Moat

Need:

MoMo/card/bank transfer truth depends on provider evidence.

Advantages:

- Duplicate provider references are blocked.
- Settlement failures become actionable.
- Suspense workflows become possible.

Disadvantages:

- Requires provider discipline and clean reference capture.
- More setup before digital payments feel seamless.

Platform effect:

Payment records are moving toward auditable, reconcilable financial evidence.

### Choice 4: Central Sensitive-Action Controls

Need:

Financial systems need consistent controls for high-risk actions.

Advantages:

- Central policy matrix.
- Better SoD and fresh-auth enforcement.
- Audit logs become consistent.

Disadvantages:

- More UX work is required to explain denials and step-up prompts.
- Policy drift must be actively managed.

Platform effect:

The platform has a foundation for enterprise governance across accounting, POS, payments, exports, and future payroll.

### Choice 5: Regulatory Country Packs

Need:

Tax/payroll/legal-provider values change by country and date. They must not be hardcoded in engines.

Advantages:

- Effective-dated legal values.
- Pack-version pinning for historical reproducibility.
- Better country expansion.
- Hardcode detection catches regressions.

Disadvantages:

- Requires legal review and pack governance.
- Adds an abstraction that must be surfaced clearly in UI.

Platform effect:

The system can become country-aware without forking core engines.

## 6. Why UI/UX Should Be The Next Major Phase

The platform now has enough backend/control infrastructure that the next bottleneck is usability and operational visibility.

Without UI/UX:

- Administrators cannot see setup readiness clearly.
- Accountants cannot review posting rules, period gates, or close blockers.
- Managers cannot understand why a sensitive action was denied.
- Cashiers cannot see payment provider evidence requirements clearly.
- Reconciliation teams cannot work failure queues.
- Regulatory pack provenance remains invisible.

With UI/UX:

- Backend controls become understandable workflows.
- Users can fix setup gaps before they cause failed operations.
- Fraud controls become transparent rather than mysterious.
- Accountants can trust what the system shows because provenance and status are visible.

## 7. Proposed Next Build Sequence

### Phase 0: Freeze And Baseline

Goal:

Create a stable checkpoint before adding UI.

Work:

- Review current dirty worktree and separate intended files from unrelated drift.
- Run:
  - `npm test -- services/accounting services/payments services/controls services/pos services/regulatory --runInBand`
  - `npm run typecheck`
  - `npm run prisma:validate`
- Save a short build checkpoint report.

Done gate:

- Current backend hardening is known-good.
- No accidental extra changes are mixed into the UI phase.

### Phase 1: Accounting Control Center UI

Purpose:

Give administrators and accountants one place to see whether accounting is operationally ready.

UI components:

- `AccountingControlCenter`
- `AccountingReadinessChecklist`
- `AccountMappingsPanel`
- `DefaultJournalsPanel`
- `PostingRulesStatusTable`
- `OpenPeriodBanner`
- `SetupLockControl`

Services to use:

- `services/accounting/accounting-settings.service.ts`
- `services/accounting/default-posting-rules.service.ts`
- `services/accounting/posting-rules.service.ts`
- `services/accounting/periods.service.ts`

Server actions:

- Extend or normalize `actions/accounting/settings.actions.ts`
- Add read-only dashboard action for setup readiness.
- Add controlled setup-lock action using the sensitive-action service.

Hooks:

- `useAccountingControlCenter`
- `useAccountingSetupReadiness`
- `usePostingRules`
- `useAccountingPeriods`

UX requirements:

- Dense enterprise layout, not a marketing page.
- Clear setup blocker states.
- Show which blocker is operational, accounting, regulatory, or permission-related.
- Bilingual labels.
- Dark/light theme compatibility.

Done gate:

- Admin/accountant can see exactly why accounting is or is not ready.
- Setup lock cannot be triggered unless service preflight passes.

### Phase 2: POS Financial Controls UI

Purpose:

Expose the backend POS/accounting hardening in cashier and manager workflows.

UI components:

- `POSCommitStatusPanel`
- `TenderEvidenceFields`
- `PaymentProviderEvidenceBadge`
- `RefundVoidControlDialog`
- `POSAccountingTraceDrawer`
- `ReceiptPostingStatus`

Services to use:

- `services/pos/pos.service.ts`
- `services/payments/payment-reconciliation.service.ts`
- `services/accounting/postings/post-sale.ts`
- `services/accounting/postings/post-payment.ts`
- `services/accounting/postings/post-refund.ts`
- `services/accounting/postings/post-void.ts`

Server actions:

- Existing POS actions should return richer typed results with posting/payment trace information where safe.
- Denied attempts should use client-safe messages.

Hooks:

- Extend `hooks/posHooks/usePosOperations.ts`
- Add optimistic-safe mutation states for commit/refund/void.
- Add query invalidation for cart/session/receipt/reconciliation surfaces.

UX requirements:

- Cashier sees actionable error: missing provider reference, duplicate provider reference, active shift missing, accounting not ready.
- Manager sees audit trace and posting status.
- No raw internal exception text.

Done gate:

- Cashier can complete, refund, or void with clear controlled states.
- Failed accounting still rolls back and UI shows a safe reason.

### Phase 3: Payment Reconciliation Workbench

Purpose:

Turn the reconciliation engine into a usable finance workflow.

UI components:

- `SettlementBatchList`
- `ProviderStatementImportPanel`
- `ReconciliationRunSummary`
- `ReconciliationFailuresTable`
- `SuspenseItemsQueue`
- `ProviderReferenceDuplicateAlert`
- `ReconciliationSignoffDialog`

Services to use:

- `services/payments/payment-reconciliation.service.ts`
- `services/controls/sensitive-action.service.ts`

Server actions:

- `actions/payments/reconciliation.actions.ts`
  - run reconciliation,
  - fetch failures,
  - create/sign reconciliation run,
  - export reconciliation certificate.

Hooks:

- `useSettlementBatches`
- `useReconciliationRun`
- `useReconciliationFailures`
- `useSuspenseItems`

UX requirements:

- Failures grouped by rail: MoMo, card, bank transfer.
- Critical failures visually distinct.
- Sign-off requires permissions and fresh auth.
- Export is permission-gated and audited.

Done gate:

- Finance user can identify duplicate/missing/unmatched provider evidence and see why close should be blocked.

### Phase 4: Sensitive Action And Fraud-Control Console

Purpose:

Give administrators/auditors visibility into controlled actions.

UI components:

- `SensitiveActionPolicyMatrix`
- `DeniedAttemptLog`
- `FreshAuthPrompt`
- `ApprovalInbox`
- `RiskSignalTimeline`
- `ExportAuditLog`

Services to use:

- `services/controls/sensitive-action.service.ts`
- Existing auth/RBAC permission helpers.

Server actions:

- `actions/controls/sensitive-actions.actions.ts`
  - list policies,
  - evaluate action for UI preview,
  - list audit events,
  - approve/reject when approval models exist.

Hooks:

- `useSensitiveActionPolicies`
- `useSensitiveActionAudit`
- `useFreshAuthRequirement`
- `useApprovalInbox`

UX requirements:

- Explain "why denied" without leaking internals.
- Show fresh-auth age and required assurance level.
- Show SoD/self-approval blocks clearly.

Done gate:

- Critical financial operations are understandable and auditable from the UI.

### Phase 5: Regulatory Pack Console

Purpose:

Expose the regulatory country-pack foundation without pretending the system has full legal automation everywhere.

UI components:

- `CountryPackRegistry`
- `CountryPackDetail`
- `RegulatoryParameterViewer`
- `PackProvenanceBadge`
- `GoldenFixtureStatus`
- `HardcodeScanResults`
- `PackPublishPreflight`

Services to use:

- `services/regulatory/country-packs/registry.ts`
- `services/regulatory/country-packs/resolve.ts`
- `services/regulatory/country-packs/validation.ts`
- `services/regulatory/hardcode-detector.ts`

Server actions:

- `actions/regulatory/country-packs.actions.ts`
  - list packs,
  - validate pack,
  - resolve parameter,
  - run hardcode scan in dev/admin context,
  - show provenance.

Hooks:

- `useCountryPacks`
- `useCountryPackValidation`
- `useRegulatoryParameter`
- `useRegulatoryHardcodeScan`

UX requirements:

- Read-only first.
- Every value shows pack version, effective date, verified date, legal reference, and hash.
- Clear warning that pack values require professional validation before statutory reliance.

Done gate:

- Admin/auditor can inspect regulatory values and provenance without editing legal data.

### Phase 6: Accounting Operations UI

Purpose:

Make journal posting, reversal, exports, and period close professional and safe.

UI components:

- `JournalPostDialog`
- `JournalReverseDialog`
- `PeriodClosePreflightPanel`
- `CloseBlockersList`
- `AccountingExportDialog`
- `LedgerAuditTrail`

Services to use:

- `services/accounting/posting.service.ts`
- `services/accounting/periods.service.ts`
- `services/controls/sensitive-action.service.ts`
- Accounting report actions/services.

Server actions:

- Normalize journal post/reverse actions to typed safe responses.
- Add period-close preflight action.
- Add export action with sensitive-action evaluation.

Hooks:

- `useJournalPost`
- `useJournalReverse`
- `usePeriodClosePreflight`
- `useAccountingExports`

UX requirements:

- Period close shows blockers before the user attempts close.
- Critical actions require fresh auth.
- Exports show scope, filters hash, watermark, and audit status.

Done gate:

- Accountants can operate close/post/reverse/export from UI without bypassing controls.

### Phase 7: Invoice And Payroll Domain Preparation

Purpose:

Do not wire regulatory resolver deeply into invoice/payroll until these domains exist structurally.

Invoice prerequisites:

- Decide whether `SalesOrder` remains the invoice-like artifact or whether a real `Invoice` model is required.
- Build invoice service:
  - draft invoice,
  - finalize invoice,
  - tax calculation,
  - customer ledger impact,
  - accounting posting,
  - correction/credit note path.
- Add server actions and hooks only after service invariants exist.

Payroll prerequisites:

- Add payroll models:
  - employee,
  - contract,
  - payroll period,
  - payroll run,
  - payslip,
  - contribution lines,
  - declaration/export records.
- Build payroll calculation service using the country-pack resolver.
- Add approval and immutability states.
- Add posting and payment-batch flow.

Why this must come after UI/control surfaces:

Invoice and payroll are not simple calculators. They are statutory financial workflows. Wiring pack values before the models and lifecycle exist creates misleading completeness.

Done gate:

- Invoice/payroll services exist with lifecycle, audit, tests, and UI contracts before pack values are consumed in production paths.

## 8. Recommended UI Component System For The Next Phase

Shared components to build first:

- `ControlDecisionBanner`
  - Shows allowed/denied/fresh-auth-required/self-approval-blocked states.
- `ProvenanceBadge`
  - Shows pack version, effective date, source, hash, and verified date.
- `AuditTrailDrawer`
  - Displays audit events for the selected business object.
- `PreflightChecklist`
  - Reusable checklist for setup lock, period close, posting readiness, and reconciliation sign-off.
- `RiskTierBadge`
  - Low/medium/high/critical display for controlled actions.
- `FinancialStatusPill`
  - Posted/pending/reversed/failed/blocked states.
- `EvidenceRequiredField`
  - Provider reference, authorization code, bank reference, support document hash.
- `AsOfMetadataBar`
  - Generated-at, period, pack version, filters hash, and scope.

Advantages:

- Avoids each page inventing its own compliance UI.
- Makes controls feel coherent.
- Lets users understand why the system blocks certain operations.

Disadvantages:

- Requires a small upfront design-system pass.
- Shared components must be careful not to hide domain-specific meaning.

## 9. Immediate Next Step Recommendation

The best next step is:

Build the Accounting Control Center UI first.

Reason:

It sits above the services already built and does not require missing invoice/payroll structures. It gives immediate value, exposes setup gaps, and becomes the administrative home for the accounting backbone.

Suggested implementation order:

1. Add a read-only accounting control-center service function that aggregates:
   - accounting settings,
   - setup status,
   - required mappings,
   - default journals,
   - open periods,
   - posting rules,
   - latest audit/control events.
2. Add a typed server action:
   - `getAccountingControlCenterAction`.
3. Add a TanStack Query hook:
   - `useAccountingControlCenter`.
4. Build UI:
   - route/page,
   - readiness checklist,
   - setup blockers,
   - posting rule status,
   - period status,
   - control plane status.
5. Add focused tests:
   - service aggregation,
   - missing mapping state,
   - locked/setup-ready state,
   - permission denied response,
   - UI empty/loading/error states if frontend test harness is available.

This is the cleanest bridge from the backend built today to a professional user-facing platform.

## 10. Final Recommendation

Do not continue deep resolver wiring into invoice/payroll yet. The needed structures are not ready.

Proceed in this order:

1. Stabilize the current backend checkpoint.
2. Build Accounting Control Center UI.
3. Build POS Financial Controls UI.
4. Build Payment Reconciliation Workbench.
5. Build Fraud-Control Console.
6. Build Regulatory Pack Console.
7. Then design invoice and payroll domain models.
8. Only after that, wire regulatory resolver into invoice and payroll production calculations.

This order keeps the platform professional: every screen reflects real service truth, every financial operation remains controlled, and the missing statutory domains are built deliberately rather than patched around.
