# AqStoqFlow 90-Day Feature And Module Implementation Action Plan

Date: 2026-06-13

Scope: recent planning and proposal documents from 2026-06-10 through 2026-06-13.

Verdict: APPROVED WITH REQUIRED CHANGES.

AqStoqFlow should proceed with the compliance and e-invoicing concept, but the implementation must be sequenced as a controlled platform hardening program, not as a direct "e-invoice MVP" bolted onto POS. The defensible product spine is:

`business event -> accounting posting -> source link -> fiscal document -> compliance submission -> certification artifact -> trusted dashboard/export`

The market opportunity is strong because regulated SMB compliance is a painkiller, especially when paired with POS, inventory, mobile-money reconciliation, and accountant/CGA workflows. The execution risk is also high because every country adapter has legal, API, sequencing, evidence, privacy, and support implications. The right strategy is to build one country-ready Compliance Center kernel first, with Cameroon as the natural first internal pack because the repo already has Cameroon/XAF/mobile-money regulatory foundations, while keeping Cote d'Ivoire and Senegal as parallel discovery tracks until official specifications and expert review are available.

## Documents Reviewed

| Date | Document | Main contribution |
| --- | --- | --- |
| 2026-06-13 | `moat proposals/AQSTOQFLOW_E_INVOICING_INTEGRATION_STAGE_GATE_REPORT_2026-06-13.md` | Strongest technical gate: e-invoicing must wait on ledger/POS preflight, fiscal document schema, country-pack metadata, outbox, immutability, tenant-scoped accountant access, and legal/API validation. |
| 2026-06-13 | `moat proposals/AQSTOQFLOW_COMPLIANCE_LAYER_INTEGRATION_PROPOSAL_2026-06-13.md` | Defines the Compliance Center module, fiscal documents, compliance submissions, obligations, reminders, adapters, accountant access, and RBAC surface. |
| 2026-06-13 | `moat proposals/The Compliance Layer for OHADA SMBs.md` | Defines the business wedge: mandatory e-invoicing, compliance deadlines, SMB pain, accountant/CGA channel, pan-OHADA expansion, and SaaS pricing logic. |
| 2026-06-12 | `ui-registry.md` | Captures the current enterprise dashboard visual language, button system, sidebar patterns, data-table treatments, and known UI drift that new modules must respect. |
| 2026-06-11 | `what-next/FREEZE_BASELINE_CHECKPOINT_2026-06-11.md` | Captures a known backend baseline, verification status, staging strategy, and unresolved risks: dirty worktree, auth/email hold-out, UI not browser-tested, legal review still needed. |
| 2026-06-11 | `what-next/PROJECT_TODAY_STATUS_AND_UI_NEXT_STEPS_2026-06-11.md` | Explains why UI must come next: operators cannot see posting readiness, denials, controls, evidence, provenance, or queues even though backend services have advanced. |
| 2026-06-11 | `what-next/STOCKFLOW_NEXT_IMPLEMENTATION_SEQUENCE_2026-06-11.md` | Provides the broader 12-week technical order: stabilize accounting/POS, control plane, regulatory packs, business events, reconciliation, offline sync, data trust, payroll, AI. |
| 2026-06-10 | `moat proposals/STOCKFLOW_MOAT_SKILLS_PROPOSAL_REPORT_2026-06-10.md` | Establishes the moat doctrine: ledger-first events, OHADA compliance, data trust, payroll, payment reconciliation, offline sync, fraud controls, and controlled AI. |

## Strategic Synthesis

The recent documents converge on one clear conclusion: the platform should become an OHADA SMB operating system whose compliance layer is the wedge, but whose defensibility comes from the full trust chain behind every number.

The business proposal is directionally right: mandatory e-invoicing and tax filing are urgent, high-retention needs for OHADA-region SMBs. However, the stage-gate report correctly refines the implementation: the product cannot safely promise certified fiscal documents until POS, accounting postings, source links, immutable evidence, country-pack metadata, and tenant-scoped controls are proven.

The near-term platform bottleneck is not another backend domain. It is operator visibility. The backend has accounting, POS, regulatory, payment, and controls foundations, but users cannot yet manage readiness, exceptions, source traces, or compliance queues through a coherent UI. Therefore the next features should first expose and harden the existing backbone, then add fiscal document and e-invoicing modules.

The UI registry adds an important execution constraint: new accounting, POS controls, payment reconciliation, and Compliance Center screens should use the existing enterprise dashboard language. That means dark dashboard shell, compact dense panels, `dashboard-glass-panel`, `dashboard-stat-card`, `dashboard-table-shell`, dashboard semantic tokens, gold/chestnut action buttons, and restrained data-heavy layouts. New modules should not introduce a separate marketing-style or card-heavy design language.

## Non-Negotiable Architecture

1. Every money, stock, tax, payroll, supplier, customer, or cash event must pass through a typed business event and ledger/source-link pipeline.
2. POS must not call DGI/FNE/e-facture or any tax-authority adapter inside the sale transaction.
3. Authority calls must run after commit through a durable compliance outbox.
4. Final fiscal numbers must be allocated server-side in a serialized transaction.
5. Offline POS may use provisional receipts only unless an officially validated offline fiscal device scheme is implemented.
6. Fiscal documents must be immutable after finalization/certification. Corrections use refund, credit note, avoir, or controlled reversal.
7. Country-specific legal behavior must live in versioned country packs plus adapters, not in POS, accounting, or UI branches.
8. Dashboards, reports, exports, and statutory surfaces must distinguish posted truth from estimates and expose provenance, as-of date, period status, and source.
9. Accountant/CGA portfolio access must require explicit client consent, tenant scope, permissions, expiry, and audit logs.
10. Real country adapter launch requires official technical specs, sandbox proof, accountant/legal validation, and production credentials kept outside source code/country packs.

## Implementation Principles

### Build order principle

Implement features in dependency order:

`Accounting/POS proof -> Control visibility -> Payment/fraud evidence -> Country-pack compliance metadata -> Compliance Center kernel -> POS fiscal integration -> Real adapter pilot -> Statutory exports -> Offline/payroll/AI`

### Data trust principle

Every finance/compliance surface must answer:

- Which source tables and source documents produced the figure?
- Is it posted, estimated, queued, rejected, certified, or unavailable?
- What is the as-of timestamp?
- Which tenant, period, country pack version, and posting batch does it belong to?
- Can the user trace it back to a sale, refund, payment, journal line, fiscal document, and authority artifact?

### Market principle

Target accountants, CGAs, and compliance-heavy SMBs first. They have the strongest reason to adopt, they influence multiple businesses, and they can validate real-world obligations. Do not sell broad pan-OHADA automation before one country adapter is operationally proven.

## Recommended 90-Day Roadmap

The dates below assume work starts immediately after this report on 2026-06-13. Each phase should be treated as a gate: if a P0 gate fails, do not advance to the next regulated layer.

### Phase 0: Baseline consolidation and implementation ticketing

Target dates: 2026-06-13 to 2026-06-16

Objective: freeze the current truth and turn the recent documents into an actionable backlog.

Implement now:

- Create tickets from the e-invoicing stage-gate P0/P1 list.
- Decide first-country build scope: recommended internal default is Cameroon because the codebase already has Cameroon country-pack foundations.
- Decide first document types: POS receipt, sales invoice envelope, credit note/avoir, compliance submission, certification artifact.
- Decide first certification policy values as configuration placeholders: `SUPPORTED`, `PARTIALLY_SUPPORTED`, `REQUIRES_EXPERT_REVIEW`, or `UNSUPPORTED`.
- Update stale docs that still imply POS accounting commit is not wired, if code proves otherwise.
- Preserve the freeze checkpoint staging strategy: do not mix unrelated auth/email changes with accounting/compliance baseline work.

Where:

- `what-next/*` for execution tickets and sequencing.
- `docs/ACCOUNTING_BACKBONE.md` and readiness docs for stale-state corrections.
- Existing test folders for POS/accounting/regulatory baseline checks.

Why:

The platform is in a large, dirty, high-value worktree. Before adding schemas and modules, the team needs a precise baseline and a shared definition of "ready for compliance".

Acceptance gate:

- POS sale/payment/refund/void tests are identified and runnable.
- Country scope and first document types are explicitly recorded.
- P0/P1 backlog exists with owner, acceptance criteria, and test command.
- No production e-invoicing claim is made yet.

### Phase 1: Accounting Control Center UI

Target dates: 2026-06-17 to 2026-06-23

Objective: expose the accounting backbone so admins/accountants can see readiness before compliance automation is layered on top.

Implement:

- Accounting readiness dashboard.
- Posting rule and account-mapping status.
- Fiscal period status and closed-period warnings.
- Journal/source-link trace viewer.
- Missing mapping and failed posting exception queue.
- Setup lock banner for tenants that cannot safely post regulated documents.

Where:

- `services/accounting/*` or existing control-center/read-model services.
- `actions/accounting/*` as thin protected server actions.
- `hooks/accountingHooks/*` or the repo's existing accounting hook convention.
- `app/[locale]/(dashboard)/dashboard/accounting/control-center/page.tsx`.
- `components/accounting/control-center/*`.

Technical reasons:

- E-invoicing depends on posted accounting truth. If operators cannot see missing mappings, closed periods, unposted events, or source-link gaps, certification will hide defects instead of reducing them.
- This phase converts invisible backend controls into an operational cockpit.
- This also creates reusable UI patterns for the later Compliance Center: readiness badges, provenance badges, exception queues, audit drawers, and period banners.

Acceptance gate:

- The page uses service DTOs, not Prisma in UI/hooks.
- Every displayed financial/statutory value has provenance and as-of metadata.
- Missing data renders as unavailable with reason, not fake zero.
- Admin/accountant can identify whether the tenant is ready to post POS sales and issue fiscal documents.

### Phase 2: POS Financial Controls and receipt truth

Target dates: 2026-06-24 to 2026-06-30

Objective: make POS commit, refund, void, tender evidence, receipt status, and accounting trace visible and testable.

Implement:

- POS commit status panel.
- Tender evidence fields for mobile money/card/bank references.
- Provider evidence badge and duplicate-reference feedback.
- Refund/void control dialog with reason, approval, and step-up/fresh-auth flow where needed.
- POS accounting trace drawer linking receipt -> sale -> payment -> posting batch -> journal/source link.
- Receipt status surface that can later show provisional, queued, submitted, certified, rejected, or fallback-approved states.

Where:

- `services/pos/pos.service.ts` for service-level behavior only where gaps remain.
- `actions/pos/*` for protected workflows.
- `hooks/posHooks/*` for TanStack Query invalidation.
- `components/pos/*`.
- POS route under `app/[locale]/(dashboard)/dashboard/pos/`.

Technical reasons:

- POS is the highest-frequency source of fiscal documents.
- Checkout must stay operational during authority outages, so certification status must be truthful and decoupled from direct adapter calls.
- Refunds and voids are fraud-sensitive and must use compensation, not deletion or hidden mutation.

Acceptance gate:

- Finalized ticket cannot be voided as if it never existed.
- Refund quantity cannot exceed original sold/remaining quantity.
- Duplicate tender/provider references are rejected or surfaced according to provider rules.
- A user can trace a POS receipt to accounting postings and audit evidence.

### Phase 3: Payment Reconciliation Workbench and Fraud Control Console

Target dates: 2026-07-01 to 2026-07-14

Objective: prove that cash, mobile money, card, bank, refunds, and settlement evidence match the accounting ledger.

Implement:

- Payment reconciliation workbench for provider statements, settlement batches, unmatched lines, suspense items, duplicate provider references, and reconciliation drift.
- Fraud/sensitive-action console for high-risk actions: refunds, voids, manual journals, account mapping changes, fiscal document reversal, export, fallback approval, and credential changes.
- Operator-visible exception queues instead of hidden logs.
- Risk-tier badges, approval evidence, and audit trail drawers.

Where:

- `services/payments/payment-reconciliation.service.ts` and related payment services.
- New or extended models only if current schema lacks settlement/statement/suspense concepts.
- `services/controls/sensitive-action.service.ts`.
- `actions/payments/*`, `actions/controls/*`.
- `hooks/payments/*`, `hooks/controls/*`.
- Routes under `dashboard/finance/reconciliation` and `dashboard/settings/controls` or equivalent existing dashboard taxonomy.

Technical reasons:

- E-invoicing proves document issuance; reconciliation proves collected money and settlement truth.
- Mobile-money and card settlement disputes are a major SMB pain and a defensible moat if tied to ledger/source evidence.
- Fraud controls must be visible to be effective.

Acceptance gate:

- Duplicate provider reference attempts are auditable.
- Settlement drift appears as an exception, not as overwritten balances.
- Sensitive actions require permission, step-up/fresh auth where configured, and segregation-of-duties checks for approvals.

### Phase 4: Regulatory country-pack compliance extension

Target dates: 2026-07-15 to 2026-07-28

Objective: prepare the platform for country-by-country fiscal behavior without hardcoding legal rules into business modules.

Implement:

- Extend country packs with e-invoicing capability metadata.
- Add required fiscal document fields by document type.
- Add certification timing policy: before issue, after issue allowed, manual fallback allowed, unsupported, or requires expert review.
- Add authority channel metadata, endpoint placeholders, filing types, deadline rules, artifact schema, legal provenance, effective dates, and verification status.
- Add pack validation fixtures for Cameroon first.
- Keep Cote d'Ivoire, Senegal, Benin/Niger, Burkina Faso, and other target markets as discovery packs unless official data is available.

Where:

- `services/regulatory/country-packs/*`.
- Regulatory validation tests and golden fixtures.
- Country-pack resolver and capability validation services.

Technical reasons:

- The original proposal's pan-OHADA vision is commercially useful but legally dangerous if implemented as generic assumptions.
- Country packs let the platform scale across countries while making unsupported behavior explicit.
- `REQUIRES_EXPERT_REVIEW` is a product safety state, not a weakness.

Acceptance gate:

- No POS/accounting/compliance service hardcodes country-specific tax rates, authority endpoints, fiscal labels, deadlines, or required fields.
- Unsupported countries cannot silently borrow another country's behavior.
- Every production-impacting country-pack value has effective date, source/provenance field, and verification status.

### Phase 5: Compliance Center kernel and sandbox adapter

Target dates: 2026-07-29 to 2026-08-11

Objective: create the core e-invoicing/fiscal-document engine without depending on any real authority API.

Implement:

- Prisma models:
  - `FiscalDocument`
  - `FiscalDocumentLine`
  - `FiscalSequence`
  - `ComplianceSubmission`
  - `ComplianceAdapterConfig`
  - `ComplianceEvidence`
  - `ComplianceObligation`
  - `ComplianceReminder`
  - `AccountantFirm`
  - `AccountantClientAccess`
- Service layer:
  - `services/compliance/fiscal-document.schemas.ts`
  - `services/compliance/fiscal-document.service.ts`
  - `services/compliance/adapter-contract.ts`
  - `services/compliance/adapters/fake-sandbox.ts`
  - `services/compliance/adapters/registry.ts`
  - `services/compliance/certification-outbox.service.ts`
  - `services/compliance/evidence.service.ts`
  - `services/compliance/obligations.service.ts`
  - `services/compliance/compliance-center.service.ts`
  - `services/compliance/portfolio.service.ts`

Technical reasons:

- Fiscal documents are not replacements for accounting postings. They are immutable statutory envelopes linked to posted source events.
- A fake/sandbox adapter allows UI, tests, queue behavior, rejection handling, retries, and artifacts to be built before legal/API dependencies are ready.
- The outbox keeps checkout and authority integration failure modes separate.

Acceptance gate:

- Fiscal document creation requires a posted source event, posting batch, source link, document hash, country-pack resolution, and tenant context.
- Sequence allocation is serialized and unique by legal scope.
- Certification artifact hash is required for certified state.
- Rejected submissions surface in an operator queue.
- Certified fiscal document fields cannot be edited or deleted.

### Phase 6: POS fiscal-document integration and Compliance Center UI

Target dates: 2026-08-12 to 2026-08-25

Objective: connect POS to fiscal documents and give operators a usable compliance cockpit.

Implement:

- POS commit integration:
  - Commit sale/payment/inventory/drawer/session.
  - Post sale/payment accounting entries.
  - Verify source link.
  - Create fiscal document and lines.
  - Allocate provisional or final sequence according to country policy.
  - Enqueue compliance submission.
  - Return receipt payload with truthful certification status.
- Receipt delivery rules:
  - Block legal receipt delivery if the country requires certification before issue and no certification/fallback exists.
  - Allow queued/provisional receipt only where country policy permits it.
  - Display QR/sticker/reference only from stored certification artifacts.
- Compliance Center UI:
  - Certification queue.
  - Failed/rejected submissions.
  - Certified document trace.
  - Upcoming obligations/deadlines.
  - Adapter configuration health.
  - Manual portal fallback evidence.

Where:

- `services/pos/pos.service.ts` for orchestration only after ledger preflight is green.
- `services/compliance/*` for all fiscal document and submission logic.
- `actions/compliance/*`.
- `hooks/complianceHooks/*`.
- `app/[locale]/(dashboard)/dashboard/compliance/*`.
- `components/compliance/*`.

Technical reasons:

- POS is the fastest path to a credible compliance demo, but only if fiscal state is grounded in posted source evidence.
- Compliance UI is necessary because rejections, outages, retries, and fallbacks are daily operational workflows, not backend details.

Acceptance gate:

- POS sale creates exactly one fiscal document and one queued submission under replay/concurrency.
- Posting failure rolls back sale and fiscal document creation.
- Authority outage does not roll back posted sale; it creates a visible queued/retry state.
- Receipt delivery respects country certification policy.
- Tenant A cannot read, retry, export, or probe Tenant B's fiscal documents.

### Phase 7: First real country adapter pilot readiness

Target dates: 2026-08-26 to 2026-09-08

Objective: prepare one real regulated adapter path, but only after official specifications and expert validation.

Implement:

- Choose the first real pilot country based on evidence:
  - Prefer Cameroon if official DGI technical specs, sandbox/portal process, and expert validation are available.
  - Prefer Cote d'Ivoire or Senegal only if their official specs and sandbox path are more concrete and easier to validate.
- Build the country adapter under `services/compliance/adapters/{country-code}/*`.
- Store credentials in secure configuration, not in country packs, logs, client DTOs, or source code.
- Add request/response hash storage, redacted logs, correlation ids, terminal vs retryable errors, and adapter health.
- Run a design-partner pilot with one accountant/CGA firm and one controlled SMB tenant.

Technical reasons:

- A real authority adapter is not just code. It is a legal, support, security, operational, and documentation surface.
- The platform should not expose production authority submission until the adapter has official specs, sandbox proof, fixtures, and review signoff.

Acceptance gate:

- Official API or portal specification is stored as a reference, with version/date.
- Expert accountant/legal review status is recorded.
- Sandbox submission and rejection fixtures pass.
- Credentials are vaulted/encrypted and secret scanning/redaction tests pass.
- The adapter can be disabled per tenant without breaking POS posting.

### Phase 8: Ledger-backed statutory reports and accountant portfolio

Target dates: 2026-09-09 to 2026-09-22

Objective: turn certified documents and ledger postings into accountant-usable compliance workflows.

Implement:

- VAT return draft from ledger and fiscal documents, not operational tables.
- Filing/export draft workflow with evidence pack and computation audit trail.
- Accountant/CGA portfolio:
  - Client consent grant/revoke.
  - Scoped role and expiry.
  - Multi-client queue.
  - Comments and evidence review.
  - Full audit trail.
- Data-trust badges for every statutory number: source, as-of, period status, pack version, method, and unavailable states.

Where:

- `services/compliance/filings.service.ts` or equivalent.
- `services/accounting/reports/*`.
- `services/compliance/portfolio.service.ts`.
- `actions/compliance/*`.
- `hooks/complianceHooks/*`.
- `app/[locale]/(dashboard)/dashboard/compliance/filings/*`.
- `app/[locale]/(dashboard)/dashboard/compliance/portfolio/*`.

Technical reasons:

- Accountants/CGA firms are the strongest distribution channel, but only if they can review, trace, and export evidence across clients without breaching tenant isolation.
- Statutory reports that cannot explain their computation are not trustworthy, even when totals appear plausible.

Acceptance gate:

- VAT/filing draft shows source journals, fiscal documents, period, filters, pack version, and tie-out checks.
- Missing posted data renders unavailable with a reason.
- Accountant from Firm A cannot access Tenant B without explicit consent.
- Every export is permissioned, audited, and fresh-auth gated where sensitive.

### Phase 9: Follow-on modules after the compliance kernel is stable

Target dates: 2026-09-23 onward

Objective: expand the platform moat without destabilizing regulated workflows.

Implement later:

- Offline POS/inventory sync:
  - Immutable local events.
  - Device sequence gaps.
  - Server dedupe and conflict queue.
  - Provisional receipts only.
  - Final fiscal numbers server-side after sync.
- OHADA payroll:
  - Country-pack-backed rates and declarations.
  - Payroll run lifecycle.
  - Payslips, liabilities, employee subledgers, posting batches.
  - No hardcoded social/tax rates.
- AI copilot:
  - Read-only first.
  - Query/proposal mode only for accounting/compliance.
  - No autonomous posting, filing, credential, refund, reversal, or approval action.
  - Every answer cites source tables, period, and provenance.

Why later:

- Offline sync and payroll are high-complexity regulated domains.
- AI is valuable only after data trust and action guardrails are strong enough to prevent hallucinated statutory advice or unsafe postings.

## Feature Priority Matrix

| Priority | Feature/module | Build timing | Reason |
| --- | --- | --- | --- |
| P0 | Ledger/POS preflight tests and readiness tickets | Phase 0 | Required before any fiscal certification. |
| P0 | Accounting Control Center UI | Phase 1 | Makes posting readiness, mappings, periods, and source traces visible. |
| P0 | POS Financial Controls UI | Phase 2 | Makes checkout, refund, void, tender, and receipt evidence operationally safe. |
| P0 | Country-pack e-invoicing metadata | Phase 4 | Prevents hardcoded legal behavior and enables country-by-country rollout. |
| P0 | FiscalDocument/ComplianceSubmission/outbox kernel | Phase 5 | Core foundation for certified receipts/invoices. |
| P0 | Sandbox adapter and rejection/outage tests | Phase 5 | Proves workflow before real authority risk. |
| P1 | Payment Reconciliation Workbench | Phase 3 | Strengthens mobile-money/card/bank settlement trust and SMB value. |
| P1 | Fraud/Sensitive Action Console | Phase 3 | Makes high-risk actions visible and auditable. |
| P1 | Compliance Center UI | Phase 6 | Required for operators, accountants, and support teams. |
| P1 | Accountant/CGA portfolio | Phase 8 | Supports strongest GTM channel but must follow consent/RBAC controls. |
| P2 | Real country adapter | Phase 7 | Only after official specs, sandbox, and expert review. |
| P2 | Ledger-backed statutory filing exports | Phase 8 | High value, but must wait on ledger/fiscal document trust. |
| P3 | Offline POS sync | Phase 9 | Useful for region realities, but dangerous before provisional/final fiscal policy exists. |
| P3 | Payroll engine | Phase 9 | Major moat, but requires country-pack maturity and payroll lifecycle design. |
| P3 | AI copilot | Phase 9 | Valuable after data trust; unsafe before guardrails. |

## Required Platform Modifications

### Database and schema

Add compliance models only after Phase 0 and Phase 1 gates:

- Fiscal document envelope, lines, sequence, submissions, evidence/artifacts, obligations, reminders, adapter config, accountant firm/access.
- Unique constraints for tenant/source/document type, legal sequence scope, authority idempotency key, and authority reference.
- Immutability rules for certified fields.
- No cascade delete that could hide statutory evidence.
- Organization/tenant scope on every compliance table.

### Services

Keep the service boundaries clear:

- POS remains the checkout orchestrator.
- Accounting remains the book of truth.
- Regulatory country packs resolve law/capabilities.
- Compliance services create fiscal documents, enqueue submissions, store artifacts, and expose queues.
- Adapters only translate canonical payloads to authority-specific payloads.
- Workers execute authority submissions after commit.

### Actions and hooks

- Use protected server actions for compliance, accounting, POS, payment, and controls workflows.
- Hooks call actions only and invalidate tenant/locale/period-aware query keys.
- No Prisma imports in components or hooks.
- No adapter imports in POS or UI.

### UI implementation

Respect `ui-registry.md` for every new dashboard surface:

- Use the active dark enterprise dashboard shell and semantic dashboard tokens.
- Prefer compact, data-dense panels over landing-page composition.
- Use `dashboard-glass-panel`, `dashboard-stat-card`, `dashboard-table-shell`, `dashboard-control`, and `dashboard-button-*` utilities where they fit.
- Use gold/chestnut button variants for primary actions and preserve destructive red only for dangerous actions.
- Keep table filters in the existing one-row enterprise treatment where space allows.
- Add EN/FR strings together for new UI text.
- Avoid new one-off color systems; promote repeated literals into tokens only when the pattern spreads.
- Browser-test the new Accounting Control Center, POS controls, Compliance Center, and reconciliation screens because the freeze checkpoint explicitly says UI is not yet browser-tested.

### RBAC and controls

Add or confirm permissions:

- `compliance.documents.read`
- `compliance.documents.issue`
- `compliance.documents.certify`
- `compliance.documents.reverse`
- `compliance.submissions.retry`
- `compliance.filings.manage`
- `compliance.adapter.manage`
- `compliance.evidence.attach`
- `compliance.portfolio.manage`

Require fresh auth for:

- Adapter credential changes.
- Manual fallback approval.
- Filing submission/export.
- Fiscal document reversal.
- Accountant client consent grant/revoke.

### Observability and support

Add operator-visible health:

- Submission queue age.
- Retry count.
- Last successful adapter submission.
- Credential/config error state.
- Rejection reason.
- Manual fallback status.
- Sequence conflict or gap alerts.
- Tenant and country-pack version on every compliance diagnostic.

### Documentation

Maintain three document classes:

- Engineering readiness docs: what the platform can prove today.
- Legal/API pack docs: official specs, citations, effective dates, review status.
- Operator docs: how to resolve queue failures, rejections, fallbacks, and filing exports.

## Verification Plan

Permanent regression gates should include:

- POS sale creates sale/payment/inventory/drawer/session plus accounting posting/source link in one transaction.
- Posting failure rolls back sale and fiscal document creation.
- Fiscal document cannot be created without posted batch and source link.
- Fiscal sequence stays unique and gapless under concurrent finalization.
- Same idempotency key plus same payload returns original result.
- Same idempotency key plus different payload hash rejects and audits.
- Authority outage retries through outbox without duplicating documents.
- Terminal rejection moves to visible rejected queue.
- Certified document mutation/delete attempts are rejected and audited.
- Receipt delivery blocks when certification-before-issue policy requires it.
- Offline sync never assigns final legal fiscal number on device.
- Tenant A cannot list/read/export/retry Tenant B's compliance records.
- Accountant cannot access client without consent, scoped role, and audit.
- Compliance dashboards never use operational estimates as statutory truth.
- No POS/accounting code imports real country adapter code.
- No country-specific tax/legal values are hardcoded outside country packs.
- No mock/sample/faker fiscal data is reachable from production paths.

Suggested focused commands after each relevant phase:

```powershell
npm test -- services/accounting
npm test -- services/pos
npm test -- services/regulatory
npm test -- services/compliance
npm run typecheck
```

Adjust exact commands to the repo's current package scripts and test layout.

## Market Target Analysis

### Best first target

The best first buyer is not a random SMB. It is an accountant/CGA-backed SMB cluster in one country.

Recommended early segment:

- Retailers, pharmacies, mini-markets, wholesalers, restaurants, and service SMBs that already issue receipts/invoices and handle mobile money.
- Businesses with accountant/CGA support but weak digital systems.
- Firms affected by e-invoicing, VAT, filing deadlines, or certified receipt requirements.
- One country at a time.

### Advantages

- Compliance urgency creates a stronger purchase trigger than generic inventory software.
- Accountant/CGA channels can bring many SMB clients at once.
- POS plus inventory plus ledger plus e-invoicing is harder to replace than a standalone invoice tool.
- Country-pack architecture can become a pan-OHADA moat if implemented carefully.
- Mobile-money reconciliation is a practical pain in the target market and can become a differentiator.
- Data-trust and evidence trails support premium pricing for accountants and regulated businesses.

### Disadvantages and risks

- Country rules differ, and regulators may change APIs, deadlines, or portal workflows.
- Legal validation is expensive and cannot be skipped.
- SMBs may resist complex onboarding unless the product hides setup complexity.
- Accountants may see the platform as a threat unless it gives them portfolio workflows and client control.
- Offline realities create edge cases around sequence, sync, evidence, and certification timing.
- Support load will be high around rejected submissions, credential setup, and tax-deadline periods.
- Competitors may move faster with shallow invoice features, even if they are less robust.

### Positioning

Do not position AqStoqFlow as "generic pan-OHADA e-invoicing" on day one. Position it as:

"A ledger-backed POS, inventory, and compliance platform for OHADA SMBs, starting with one validated country path and expanding through verified country packs."

That message is narrower, more credible, and easier to sell through accountants.

## What Not To Build Yet

Do not build these before the gates above:

- Production real authority adapter without official specs and sandbox validation.
- Offline final fiscal numbering.
- Generic pan-OHADA legal claims.
- Statutory dashboards from operational tables or estimates.
- AI copilot that posts, reverses, files, certifies, or approves actions.
- Payroll declarations before the payroll engine and country packs are mature.
- Accountant portal without consent and tenant isolation.
- Compliance UI that hides rejection/failure details in logs only.

## Immediate Next Tickets

1. Convert the e-invoicing stage-gate P0/P1 items into tracked tickets.
2. Run focused baseline checks for POS/accounting/regulatory/typecheck and record current pass/fail.
3. Implement Accounting Control Center UI using existing accounting services/read models.
4. Add or strengthen POS/source-link/accounting trace tests.
5. Implement POS Financial Controls UI and receipt evidence surfaces.
6. Extend Cameroon country pack with e-invoicing compliance metadata placeholders and verification statuses.
7. Design and migrate fiscal document/compliance submission/outbox schema.
8. Build sandbox compliance adapter and rejection/outage fixtures.
9. Wire POS to fiscal document creation only after ledger preflight is green.
10. Build Compliance Center queue/document trace/obligation UI.

## Final Recommendation

Proceed, but keep the build disciplined:

- First 2 weeks: make the existing accounting and POS backbone visible and test-proven.
- Next 4 weeks: add payment/fraud evidence and country-pack compliance metadata.
- Next 4 weeks: build fiscal documents, sandbox adapter, outbox, and Compliance Center UI.
- Final 2 weeks of the 90-day window: prepare one real country adapter pilot only if official specs, sandbox access, and expert validation are available.

This route preserves the market opportunity from the compliance proposal while avoiding the main failure mode: issuing "certified" documents that the accounting system, country pack, audit trail, or tax authority workflow cannot actually defend.
