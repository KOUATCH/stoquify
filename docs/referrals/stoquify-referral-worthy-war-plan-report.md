# Stoquify Referral-Worthy Execution War Plan

Source folder: `docs/referrals/`

Primary source documents:

- `referral-worthy-platform-features-prompt.md`
- `referral-worthy-platform-features-report.md`
- `stoquify-referral-worthy-roadmap-architect-prompt.md`
- `stoquify-referral-worthy-execution-roadmap.md`
- `stoquify-referral-worthy-executed-roadmap-report.md`
- `stoquify-referral-worthy-war-plan-prompt.md`

## Executive Command Intent

Stoquify should be executed as a trust-centered SMB operating platform, not as a bundle of disconnected features. The referral-worthy promise is achieved when a business owner, accountant, cashier, supplier, customer, employee, and financing partner can all see controlled proof that the business is professionally run.

The war plan is to build the platform in controlled layers:

1. Foundation of service-owned truth, evidence, RBAC, audit, and action-state primitives.
2. Daily operating truth that creates the owner habit.
3. Leakage and stock controls that protect money.
4. Accountant close workflows that create a distribution channel.
5. External proof surfaces that create referrals.
6. Financing readiness that turns operating data into credibility.
7. Copilot and WhatsApp automation that accelerate proven workflows without becoming sources of truth.

## 1. Strategic War Objective

### End State

Stoquify must become the daily control room for African/OHADA SMBs. The platform should answer five questions every operating day:

1. Did we sell what the system says we sold?
2. Did we collect the cash, bank, and mobile money that should exist?
3. Did stock move correctly, or did value leak?
4. Are payroll, compliance, accountant close, and supplier/customer obligations under control?
5. Can this business prove its quality to an accountant, lender, supplier, or owner without manual panic?

### Operational Meaning Of Referral-Worthy

Referral-worthy does not mean delightful copy or flashy dashboards. It means the product repeatedly creates moments where users say:

- "This showed me where money was leaking."
- "This made my accountant's month-end work easier."
- "This made my business look serious to customers and suppliers."
- "This helped me prove my business is finance-ready."
- "This gave me control without needing to be physically present every day."

### Execution Mission

Build a skill-driven implementation program that turns the roadmap into release-grade modules, each with clear domain ownership, service-owned read models, focused tests, saved evidence, and phase-specific release gates.

## 2. Source Document Synthesis

### Core Promises Across The Referral Documents

The documents converge on one main idea: Stoquify should be the **daily operating truth system** for SMBs. The core promises are:

- Daily truth beats passive record keeping.
- Leakage detection creates premium value.
- Accountant collaboration creates distribution.
- Customer and supplier proof creates organic visibility.
- Financing readiness creates aspiration and pricing power.
- Compliance readiness creates local defensibility.
- Copilot and WhatsApp are accelerators, not foundations.

### Overlapping Themes

- **Proof over data entry:** Every important claim should link to evidence.
- **Control over reporting:** The dashboard should drive action, not only display history.
- **External trust:** Receipts, statements, close packs, payslips, and financing passports should make the SMB look professional.
- **Accountant-led growth:** Accountants can become high-trust referral partners if Stoquify reduces close chaos.
- **Service-owned truth:** Dashboards, AI, and WhatsApp must consume server-side facts, not invent or own them.

### Gaps To Close

- The existing roadmap needs a skill factory: targeted execution skills for each pillar.
- The roadmap needs a governance cadence: phase register, release gates, owner assignments, and evidence artifacts.
- The roadmap needs an explicit first 30/60/90-day work order.
- The roadmap needs clear non-goals to avoid building benchmarking, loyalty, or broad AI too early.

### Dependencies

- Daily truth requires event, evidence, action, and read-model primitives.
- Leakage radar requires POS, payment, cash drawer, inventory, approval, and audit evidence.
- Accountant portal requires close period, evidence completeness, exports, and accountant access grants.
- Statement hub requires signed external links, redaction, expiry, contact delivery logs, and dispute tracking.
- Financing passport requires data-quality scoring before any health score is trusted.

### Contradictions

There are no major contradictions. The main tension is sequencing: the feature report includes exciting network-effect ideas, but the execution roadmap correctly delays benchmarking and loyalty until the evidence foundation and daily control loops are real.

## 3. Execution Pillars

### Pillar 1: Daily Business Truth

**User pain:** Owners lack one reliable daily answer for money, stock, obligations, and exceptions.

**Target users:** Owners, managers, accountants, multi-location operators.

**Service requirements:**

- Daily operating snapshot service.
- Rollups for sales, payments, cash drawer, stock alerts, customer debt, supplier balances, payroll flags, compliance reminders, and close blockers.
- Action queue and alert severity model.

**UI requirements:**

- Dense owner dashboard.
- Critical alerts first.
- Action cards with owner, due date, source evidence, and resolution path.

**Data requirements:**

- Business event spine.
- Daily snapshot read model.
- Action task table.
- Evidence references.

**Security controls:**

- Tenant isolation.
- Role-aware dashboard cards.
- Location-level filtering.
- Audit logs for action resolution.

**Business impact:** Creates daily active usage and becomes the anchor habit for the whole platform.

### Pillar 2: Cash Leakage Radar

**User pain:** Cash, bank, mobile money, refunds, discounts, voids, and stock movement disagree, but the owner discovers it too late.

**Target users:** Owners, finance leads, branch managers, auditors.

**Service requirements:**

- Deterministic reconciliation engine.
- Exception model with severity, amount at risk, source evidence, actor, location, and resolution state.
- Refund, void, discount, override, and cash adjustment monitoring.

**UI requirements:**

- Leakage radar dashboard.
- Exception drillthrough.
- Manager explanation and owner approval flow.

**Data requirements:**

- POS transactions.
- Payment records.
- Cash drawer records.
- Inventory movements.
- Staff/terminal/location attribution.
- Approval audit events.

**Security controls:**

- Maker-checker for high-risk resolution.
- Immutable audit events.
- Permission-gated exception dismissal.

**Business impact:** Highest direct monetary value and strongest upgrade driver.

### Pillar 3: Accountant Portal And Close Pack

**User pain:** Month-end close is chaotic because evidence is missing, transactions are unclear, and accountants chase clients manually.

**Target users:** Accountants, accounting firms, owners, finance/admin staff.

**Service requirements:**

- Accountant-client access grants.
- Close period model.
- Close readiness read model.
- Missing evidence queue.
- Export generation.

**UI requirements:**

- Accountant firm dashboard.
- Client close status board.
- Missing-proof request workflow.
- Close pack export surface.

**Data requirements:**

- Period close state.
- Evidence completeness scores.
- Accountant notes.
- Export history.

**Security controls:**

- RBAC for accountant roles.
- Client-scoped access.
- Redacted proof packs.
- Audit of accountant views, notes, requests, and exports.

**Business impact:** Turns accountants into repeat users and referral partners.

### Pillar 4: Customer And Supplier Statement Hub

**User pain:** Statements, debts, supplier balances, delivery proof, and payment promises are scattered in WhatsApp, notebooks, screenshots, and memory.

**Target users:** Owners, sales/admin staff, accountants, customers, suppliers.

**Service requirements:**

- Customer and supplier statement generation.
- Signed external access token service.
- Delivery log service.
- Dispute and promise-to-pay workflows.

**UI requirements:**

- Internal statement workbench.
- Recipient-safe external statement view.
- Confirmation, dispute, and promise-to-pay actions.

**Data requirements:**

- Customer ledger.
- Supplier ledger.
- Invoices, receipts, payments, delivery records, purchase orders.
- External view logs.

**Security controls:**

- Expiring signed links.
- Least-privilege payloads.
- Redaction by recipient type.
- Revocation and audit logs.

**Business impact:** Creates natural exposure to external parties and improves collections.

### Pillar 5: Inventory Control And Anti-Theft

**User pain:** Stock loss is often invisible until it becomes cash loss.

**Target users:** Owners, store managers, warehouse staff, purchasing teams.

**Service requirements:**

- Cycle count workflow.
- Variance calculation.
- Write-off and adjustment approvals.
- Loss analytics.

**UI requirements:**

- Count workbench.
- Variance review.
- Loss dashboard by product, location, staff, supplier, and period.

**Data requirements:**

- Stock ledger.
- Physical count records.
- Variance events.
- Adjustment/write-off evidence.

**Security controls:**

- Approval thresholds.
- Immutable stock adjustment trail.
- Role and location scoping.

**Business impact:** Reduces leakage and deepens inventory module stickiness.

### Pillar 6: Compliance Readiness

**User pain:** Tax, payroll, licensing, social contributions, and OHADA close obligations cause anxiety and penalties.

**Target users:** Owners, accountants, payroll operators, compliance/admin staff.

**Service requirements:**

- Country-pack compliance calendar.
- Obligation readiness model.
- Evidence requirements.
- Reminder and escalation rules.

**UI requirements:**

- Compliance readiness dashboard.
- Missing evidence actions.
- Accountant review and override path.

**Data requirements:**

- Country-pack obligation definitions.
- Due dates and filing state.
- Evidence requirements.
- Review metadata.

**Security controls:**

- Versioned country packs.
- Expert review provenance.
- Audit trail for filing readiness changes.

**Business impact:** Builds local trust and protects customers from penalties.

### Pillar 7: Financing Passport

**User pain:** SMBs cannot prove operational quality to lenders, suppliers, investors, or partners.

**Target users:** Owners, accountants, lenders, MFIs, supplier-credit partners.

**Service requirements:**

- Data-quality scoring.
- Business health score.
- Financing proof pack generation.
- Consent-based partner sharing.

**UI requirements:**

- Financing readiness dashboard.
- Improvement checklist.
- Partner-share review screen.
- External lender-safe view.

**Data requirements:**

- Revenue trend.
- Payment discipline.
- Stock turnover.
- Gross margin.
- Payroll consistency.
- Compliance readiness.
- Leakage exception history.

**Security controls:**

- Owner consent.
- Redacted partner payload.
- View logs and revocation.
- Clear disclaimer that readiness is not a loan guarantee.

**Business impact:** Creates aspiration, premium packaging, and partner-led growth.

### Pillar 8: Copilot And WhatsApp Automation

**User pain:** Users need guidance and reminders, but channels are fragmented.

**Target users:** Owners, managers, accountants, cashiers, customers, suppliers.

**Service requirements:**

- Copilot action policy.
- Prompt/result audit.
- Notification delivery adapter.
- WhatsApp template and consent registry.

**UI requirements:**

- Copilot explanations on evidence-backed pages.
- Safe suggested actions.
- WhatsApp delivery status and retry states.

**Data requirements:**

- Service-owned facts only.
- Approved templates.
- Delivery logs.
- User and recipient consent state.

**Security controls:**

- No AI-created financial truth.
- No approval bypass.
- Redacted context.
- Human confirmation for external or financial actions.

**Business impact:** Speeds workflows after the core truth loops exist.

### Pillar 9: Referral Loops

**User pain:** SMBs struggle to look professional and trustworthy to others.

**Target users:** Owners, customers, suppliers, accountants, employees, lenders.

**Service requirements:**

- Branded proof artifacts.
- External sharing logs.
- Referral attribution.
- Invite workflows.

**UI requirements:**

- Professional receipts, statements, close packs, payslips, and financing passports.
- Subtle Stoquify trust branding.
- Simple invite and referral flows.

**Security controls:**

- No recipient sees data outside their scope.
- All shared artifacts expire or are revocable where appropriate.

**Business impact:** Makes growth a product behavior, not only a marketing campaign.

## 4. Specialized Skill Suite

The roadmap should be executed through a suite of narrow skills. Existing local skills should be reused where they already match the work; new skills should fill the gaps.

### Existing Skills To Reuse

| Skill | Use |
|---|---|
| `004-aqstoqflow-business-event-gateway` | Business event spine and event publication patterns. |
| `005-aqstoqflow-accounting-control-center` | Accounting truth, close controls, and ledger alignment. |
| `007-aqstoqflow-pos-ledger-controls` | POS sale, payment, receipt, and ledger control alignment. |
| `009-aqstoqflow-payment-reconciliation-moat` | Payment reconciliation and leakage detection foundations. |
| `010-aqstoqflow-inventory-valuation-kernel` | Inventory value, stock truth, and cost/valuation controls. |
| `010-aqstoqflow-stock-adjustment-writeoff-finalizer` | Write-off and stock adjustment controls. |
| `013-aqstoqflow-data-trust-accountant-portal` | Accountant collaboration and trust portal foundation. |
| `016-aqstoqflow-ai-copilot-guardrails` | AI safety, prompt constraints, and action boundaries. |
| `017-aqstoqflow-enterprise-release-gate` | Phase-level release evidence and verification gates. |
| `020-aqstoqflow-close-assurance-engine` | Close readiness, blockers, evidence, and certification logic. |
| `021-aqstoqflow-close-assurance-portal` | Close assurance user surfaces. |
| `022-aqstoqflow-close-pack-certification` | Certified close pack exports and proof artifacts. |
| `aqstoqflow-dashboard-daily-habit-completion` | Daily habit dashboard and operating truth surfaces. |
| `aqstoqflow-module-package-strategy` | Packaging, tiers, and modular entitlement strategy. |
| `aqstoqflow-release-verification-foundation` | Verification structure and release reporting. |

### New Skills To Create

#### Skill 1: `stoquify-referral-war-room-orchestrator`

**Trigger:** `/stoquify-referral-war-room`

**Purpose:** Coordinate the full referral-worthy roadmap execution across phases, skills, reports, and release gates.

**Responsibilities:**

- Read all `docs/referrals/` roadmap documents.
- Maintain a phase status register under `what-next/referrals/`.
- Select the next narrow implementation slice.
- Route work to domain skills.
- Save before/after evidence and verification results.

**Inputs:**

- `docs/referrals/*.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- Existing relevant `what-next/` release reports.

**Outputs:**

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- Dated phase reports.
- Task packets for each execution pillar.

**Verification gates:**

- Phase report exists.
- Each phase has scope, owner, artifacts, risks, and next action.
- No task starts without evidence files and focused verification plan.

**Success criteria:**

- The roadmap becomes a tracked execution program, not a static document.

#### Skill 2: `stoquify-daily-truth-command-center`

**Trigger:** `/stoquify-daily-truth`

**Purpose:** Build the daily business truth dashboard and owner action loop.

**Responsibilities:**

- Inspect POS, inventory, payment, payroll, compliance, and accounting read models.
- Define daily snapshot service and action queue contracts.
- Implement or plan the dashboard only after service-owned truth exists.

**Inputs:**

- `services/`
- `actions/`
- `app/[locale]/(dashboard)/dashboard/`
- `components/dashboard/`
- `what-next/referrals/`

**Outputs:**

- Daily truth read model.
- Action center schema/workflow.
- Dashboard route/component updates.
- `what-next/referrals/DAILY_TRUTH_COMMAND_CENTER_REPORT_YYYY-MM-DD.md`

**Verification gates:**

- Unit tests for read model.
- Route/page smoke where applicable.
- RBAC check.
- Report with evidence links.

**Success criteria:**

- Owner can see daily operating state and resolve at least three high-value actions.

#### Skill 3: `stoquify-cash-leakage-radar`

**Trigger:** `/stoquify-leakage-radar`

**Purpose:** Detect and resolve cash, payment, POS, stock, refund, and discount mismatches.

**Responsibilities:**

- Build deterministic exception rules.
- Link exceptions to source evidence.
- Add maker-checker approval for dismissal/resolution.
- Produce leakage summary read models.

**Inputs:**

- POS services.
- Payment/reconciliation services.
- Inventory movement services.
- Cash drawer services.
- Audit and permission services.

**Outputs:**

- Leakage exception model.
- Reconciliation read model.
- Exception resolution workflow.
- `what-next/referrals/CASH_LEAKAGE_RADAR_REPORT_YYYY-MM-DD.md`

**Verification gates:**

- Unit tests for mismatch scenarios.
- Permission tests for exception resolution.
- Safe error tests.
- Release gate report.

**Success criteria:**

- High-risk mismatches are detected, evidenced, and resolvable without losing audit history.

#### Skill 4: `stoquify-accountant-close-portal`

**Trigger:** `/stoquify-accountant-close`

**Purpose:** Build accountant-led close readiness, missing evidence, and close pack workflows.

**Responsibilities:**

- Define accountant-client access grants.
- Build close period readiness model.
- Create missing evidence queue.
- Generate close pack artifacts.

**Inputs:**

- Close assurance services.
- Accounting services.
- Payroll evidence services.
- Receipt/payment/inventory evidence services.
- RBAC and redaction helpers.

**Outputs:**

- Accountant portal read model.
- Close readiness dashboard.
- Missing evidence workflow.
- Close pack export/report.

**Verification gates:**

- Accountant access tests.
- Redaction tests.
- Close readiness fixture tests.
- Export snapshot tests.

**Success criteria:**

- Accountant can identify client blockers and request missing proof from one workspace.

#### Skill 5: `stoquify-statement-proof-network`

**Trigger:** `/stoquify-statement-network`

**Purpose:** Build customer and supplier statements with signed external proof links.

**Responsibilities:**

- Generate statements from service-owned balances.
- Create signed token access.
- Add expiry, revocation, view logs, and redaction.
- Support dispute and promise-to-pay states.

**Inputs:**

- Customer services.
- Supplier/AP services.
- Invoice/payment services.
- Receipt token/public access patterns.

**Outputs:**

- Statement generation service.
- External statement route.
- Signed access token helper.
- Statement workbench.

**Verification gates:**

- Token expiry/tamper tests.
- Redaction tests.
- External route tests.
- Audit log tests.

**Success criteria:**

- External recipients can view only intended statement data and respond with traceable action.

#### Skill 6: `stoquify-inventory-loss-control`

**Trigger:** `/stoquify-inventory-loss`

**Purpose:** Build inventory variance, write-off, cycle count, and loss analytics workflows.

**Responsibilities:**

- Define cycle count workflow.
- Require approval for write-offs and high-risk adjustments.
- Link variance to product, location, actor, and evidence.
- Feed loss summary into daily truth and leakage radar.

**Inputs:**

- Inventory services.
- Stock movement services.
- Adjustment/write-off services.
- Permission and audit helpers.

**Outputs:**

- Cycle count model.
- Variance approval workflow.
- Loss analytics read model.
- Inventory loss report.

**Verification gates:**

- Stock ledger integrity tests.
- Approval tests.
- RBAC tests.
- Loss read model tests.

**Success criteria:**

- Stock value cannot disappear without traceable reason, approval, and analytics visibility.

#### Skill 7: `stoquify-compliance-readiness-calendar`

**Trigger:** `/stoquify-compliance-readiness`

**Purpose:** Build country-pack compliance reminders and filing readiness workflows.

**Responsibilities:**

- Define obligation registry.
- Attach evidence requirements.
- Track readiness state.
- Route accountant review and owner reminders.

**Inputs:**

- Compliance services.
- Country pack configuration.
- Payroll/accounting close services.
- Notification layer.

**Outputs:**

- Compliance calendar model.
- Filing readiness read model.
- Reminder workflow.
- Compliance readiness report.

**Verification gates:**

- Country-pack fixture tests.
- Deadline/readiness tests.
- Notification tests.
- Redaction and access tests.

**Success criteria:**

- Owners and accountants can see upcoming obligations and missing proof before deadlines.

#### Skill 8: `stoquify-financing-passport`

**Trigger:** `/stoquify-financing-passport`

**Purpose:** Turn clean operating evidence into financing readiness without overclaiming credit outcomes.

**Responsibilities:**

- Build data-quality score.
- Build business health score.
- Generate lender-safe proof pack.
- Support consent-based sharing.

**Inputs:**

- Daily truth snapshots.
- Close pack evidence.
- Payment discipline records.
- Inventory turnover summaries.
- Compliance readiness.
- Leakage exception history.

**Outputs:**

- Financing readiness model.
- Passport report.
- External lender-safe view.
- Improvement checklist.

**Verification gates:**

- Data-quality tests.
- Redaction tests.
- Consent/share tests.
- Score explainability tests.

**Success criteria:**

- Owner can understand readiness, improve weak areas, and share controlled proof.

#### Skill 9: `stoquify-copilot-whatsapp-ops`

**Trigger:** `/stoquify-copilot-whatsapp`

**Purpose:** Add copilot and WhatsApp automation on top of proven service-owned workflows.

**Responsibilities:**

- Define copilot allowed actions.
- Restrict copilot to evidence-backed facts.
- Add WhatsApp delivery templates and logs.
- Require human confirmation for sensitive actions.

**Inputs:**

- Action center.
- Statement hub.
- Close evidence queue.
- Compliance reminders.
- AI/copilot guardrail skill outputs.

**Outputs:**

- Copilot policy registry.
- WhatsApp template registry.
- Delivery logs.
- Automation report.

**Verification gates:**

- Prompt safety tests.
- Redaction tests.
- No-approval-bypass tests.
- Delivery state tests.

**Success criteria:**

- Automation speeds trusted workflows without creating untrusted business truth.

#### Skill 10: `stoquify-referral-proof-artifacts`

**Trigger:** `/stoquify-proof-artifacts`

**Purpose:** Make every external artifact professional, safe, and referral-generating.

**Responsibilities:**

- Standardize branded receipts, statements, close packs, payslips, and financing passports.
- Add subtle referral/invite surfaces.
- Preserve redaction and signed access.
- Track artifact views and referral conversion.

**Inputs:**

- Receipt service.
- Statement service.
- Close pack export.
- Payslip service.
- Financing passport.

**Outputs:**

- Proof artifact design standard.
- Referral attribution model.
- Artifact view logs.
- Growth report.

**Verification gates:**

- Snapshot tests for payload shape.
- Redaction tests.
- External view tests.
- Referral attribution checks.

**Success criteria:**

- External proof artifacts increase trust and create measurable referral paths.

## 5. Phased Delivery Plan

### Phase 0: Program Control Plane, Week 1-2

**Scope:**

- Create `what-next/referrals/` status register.
- Install or draft the orchestrator skill.
- Define the first three work packets: daily truth foundation, action center, leakage baseline.

**Dependencies:** Referral docs, existing skills, module entitlement strategy, release verification.

**Implementation tasks:**

- Create roadmap status register.
- Define phase IDs and done criteria.
- Create skill backlog.
- Select first code slice.

**Risks:** Program stays as documentation only.

**Success criteria:** A status register exists with owners, next task, blockers, and verification expectations.

**Artifacts:**

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_PHASE_0_REPORT_YYYY-MM-DD.md`

**Verification commands:**

- `rg -n "Phase|Next task|Verification|Blocker" what-next/referrals`

### Phase 1: Service-Owned Operating Truth, Week 2-6

**Scope:**

- Business event spine.
- Evidence model.
- Action center schema.
- Daily snapshot read model.

**Dependencies:** POS, inventory, payment, payroll, compliance, accounting service boundaries.

**Implementation tasks:**

- Map source events.
- Define action lifecycle.
- Build daily snapshot service.
- Add focused fixtures for daily rollups.

**Risks:** Aggregating incomplete or UI-derived data.

**Success criteria:** A service-owned daily snapshot can be tested without rendering the dashboard.

**Artifacts:**

- `what-next/referrals/DAILY_TRUTH_FOUNDATION_REPORT_YYYY-MM-DD.md`

**Verification commands:**

- Focused unit tests for snapshot service.
- Typecheck for touched service contracts.

### Phase 2: Daily Truth Dashboard And Action Center, Week 6-10

**Scope:**

- Owner dashboard cards.
- Action center.
- End-of-day close checklist.

**Dependencies:** Phase 1 read models.

**Implementation tasks:**

- Build owner dashboard data contract.
- Add action center route/components.
- Add role-aware task filters.
- Add end-of-day close workflow.

**Risks:** Dashboard becomes decorative instead of operational.

**Success criteria:** Owner can see critical daily state and resolve/assign actions.

**Artifacts:**

- `what-next/referrals/DAILY_TRUTH_COMMAND_CENTER_REPORT_YYYY-MM-DD.md`
- Screenshots for desktop and mobile/tablet if UI changes are made.

**Verification commands:**

- Focused component tests.
- Route smoke tests.
- Accessibility smoke where feasible.

### Phase 3: Leakage Radar And Inventory Loss Control, Week 10-18

**Scope:**

- Deterministic leakage exception rules.
- Inventory variance/write-off approvals.
- Exception resolution workflow.

**Dependencies:** POS, payment, cash drawer, stock ledger, action center, audit.

**Implementation tasks:**

- Build mismatch rules.
- Build exception model.
- Add variance approval workflow.
- Link exceptions to daily truth dashboard.

**Risks:** False positives and unsupported accusations of theft.

**Success criteria:** System flags mismatches as "exceptions requiring review," not unsupported fraud claims.

**Artifacts:**

- `what-next/referrals/CASH_LEAKAGE_RADAR_REPORT_YYYY-MM-DD.md`
- `what-next/referrals/INVENTORY_LOSS_CONTROL_REPORT_YYYY-MM-DD.md`

**Verification commands:**

- Unit tests for mismatch scenarios.
- Permission tests for resolving exceptions.
- Audit log assertions.

### Phase 4: Accountant Portal And Close Pack, Week 18-26

**Scope:**

- Accountant access grants.
- Close readiness.
- Missing evidence queue.
- Close pack exports.

**Dependencies:** Evidence layer, daily truth, payroll/accounting/inventory proof flows.

**Implementation tasks:**

- Build accountant-client scoping.
- Add close period readiness model.
- Add missing proof requests.
- Add export history and redaction.

**Risks:** Exposing sensitive data to wrong accountant/client.

**Success criteria:** Accountant sees only authorized clients and can request missing proof with audit history.

**Artifacts:**

- `what-next/referrals/ACCOUNTANT_CLOSE_PORTAL_REPORT_YYYY-MM-DD.md`
- Export samples or fixture snapshots.

**Verification commands:**

- RBAC tests.
- Redaction tests.
- Close readiness service tests.
- Export shape tests.

### Phase 5: Statement Hub And External Proof Network, Week 26-34

**Scope:**

- Customer statements.
- Supplier statements.
- Signed external links.
- Dispute and promise-to-pay.
- WhatsApp/email delivery hooks where already safe.

**Dependencies:** External token pattern, customer/supplier ledgers, redaction, delivery logs.

**Implementation tasks:**

- Build statement generation service.
- Build signed recipient access.
- Build external view.
- Add dispute/promise-to-pay capture.

**Risks:** External data leakage.

**Success criteria:** Recipient sees only intended statement data and every view/action is logged.

**Artifacts:**

- `what-next/referrals/STATEMENT_PROOF_NETWORK_REPORT_YYYY-MM-DD.md`

**Verification commands:**

- Token expiry/tamper tests.
- External route tests.
- Redaction tests.

### Phase 6: Financing Passport, Week 34-44

**Scope:**

- Data-quality score.
- Business health score.
- Financing readiness checklist.
- Lender-safe proof pack.

**Dependencies:** Clean daily truth, close pack, payment discipline, stock turnover, compliance readiness.

**Implementation tasks:**

- Define scoring inputs.
- Build score explainability.
- Build owner consent workflow.
- Build external lender-safe view.

**Risks:** Overpromising financing outcomes.

**Success criteria:** Product says "readiness" and "proof," not "loan approval."

**Artifacts:**

- `what-next/referrals/FINANCING_PASSPORT_REPORT_YYYY-MM-DD.md`

**Verification commands:**

- Score fixture tests.
- Consent tests.
- Redaction and external view tests.

### Phase 7: Copilot, WhatsApp, And Referral Flywheel, Week 44+

**Scope:**

- Copilot explanations on trusted facts.
- WhatsApp reminders and delivery logs.
- Proof artifact referral tracking.
- Later: benchmarking and loyalty.

**Dependencies:** Mature action center, statement hub, close evidence queue, proof artifacts.

**Implementation tasks:**

- Build copilot policy registry.
- Add safe prompt templates.
- Add WhatsApp template registry.
- Add referral attribution to external artifacts.

**Risks:** Automation creates false trust or bypasses approvals.

**Success criteria:** Automation speeds already-safe workflows and never becomes the source of truth.

**Artifacts:**

- `what-next/referrals/COPILOT_WHATSAPP_OPS_REPORT_YYYY-MM-DD.md`
- `what-next/referrals/REFERRAL_PROOF_ARTIFACTS_REPORT_YYYY-MM-DD.md`

**Verification commands:**

- Prompt safety tests.
- Redaction tests.
- Delivery log tests.
- External artifact tests.

## 6. Product And Technical Architecture

### Business Event Spine

The event spine should capture sales, payments, drawer closes, stock receipts, transfers, adjustments, write-offs, payroll changes, approvals, evidence uploads, close tasks, statement shares, and partner-share events.

Events must include:

- Tenant ID.
- Actor.
- Source module.
- Event type.
- Timestamp.
- Related entity IDs.
- Evidence references.
- Audit metadata.

### Evidence Layer

Evidence is the proof substrate for the whole roadmap. Evidence should support:

- Source type.
- Owner and actor.
- Related transaction/workflow.
- Redaction classification.
- Integrity metadata.
- Retention policy.
- External visibility policy.

### Action Center

The action center should unify:

- Daily alerts.
- Missing evidence.
- Close blockers.
- Leakage exceptions.
- Inventory variances.
- Approval requests.
- Compliance deadlines.
- Collection reminders.

Every action needs owner, severity, due date, source, status, resolution note, and audit events.

### Read Models

Build read models for:

- Daily business truth.
- Leakage exceptions.
- Inventory loss.
- Close readiness.
- Customer and supplier statements.
- Compliance readiness.
- Financing passport.

Read models must be service-owned and tested independently from UI.

### External Sharing Model

External sharing should use:

- Signed tokens.
- Expiry.
- Revocation.
- Least-privilege payloads.
- Redaction.
- View logs.
- Recipient action logs.

### RBAC And Redaction Model

Access scopes must cover:

- Tenant.
- Location.
- Module/package entitlement.
- Role.
- Actor relationship.
- External recipient type.
- Data sensitivity.

### Copilot Safety Model

The copilot can:

- Summarize service-owned facts.
- Explain exceptions.
- Draft reminders.
- Suggest next actions.
- Guide users through workflows.

The copilot cannot:

- Invent financial values.
- Create accounting truth.
- Approve sensitive actions.
- Send external messages without user confirmation.
- Reveal redacted data.

## 7. UX And Habit Loops

### Owner Daily Loop

Open dashboard -> see daily truth -> review exceptions -> approve/assign actions -> monitor unresolved risk.

**Retention effect:** Stoquify becomes the morning operating ritual.

### Manager End-Of-Day Loop

Review shift totals -> count cash -> match mobile money/bank payments -> explain mismatches -> submit close.

**Trust effect:** Owner sees exceptions instead of raw noise.

### Cashier Loop

Sell -> record payment method -> issue receipt -> stay within permissions -> close shift cleanly.

**Control effect:** Risky actions require approvals.

### Accountant Monthly Loop

Open firm dashboard -> inspect close readiness -> request missing evidence -> review exceptions -> export close pack.

**Referral effect:** Accountants invite more clients to reduce monthly cleanup.

### Payroll Operator Loop

Review inputs -> confirm attendance/advances/deductions -> submit run -> release payslips -> feed close evidence.

**Trust effect:** Payroll becomes evidence-backed and close-ready.

### Supplier/Customer Loop

Receive statement/receipt -> view signed proof -> confirm/dispute/pay -> leave audit trail.

**Referral effect:** Professional proof spreads Stoquify beyond the tenant.

### Lender/Partner Loop

Receive consent-based passport -> inspect redacted proof -> understand data quality -> request next step.

**Growth effect:** Financing partners become distribution channels.

## 8. Implementation Backlog

### Epic 1: Referral War Room Status Register

**User story:** As the founder, I want a status register for the referral-worthy roadmap so execution does not drift.

**Acceptance criteria:**

- Register lists phases, current status, owner, blocker, next task, evidence artifacts, and verification plan.
- Register links to each phase report.

### Epic 2: Business Event And Evidence Foundation

**User story:** As an engineer, I want shared event and evidence primitives so roadmap features can link claims to proof.

**Acceptance criteria:**

- Event and evidence contracts are documented and tested.
- Daily truth and leakage features consume the same primitives.

### Epic 3: Action Center Lifecycle

**User story:** As an owner, I want all exceptions and required actions in one queue.

**Acceptance criteria:**

- Tasks support status, owner, due date, severity, source, and resolution.
- Task resolution creates audit events.

### Epic 4: Daily Snapshot Service

**User story:** As an owner, I want a daily operating snapshot generated by services.

**Acceptance criteria:**

- Sales, payments, stock alerts, receivables, payables, payroll flags, and compliance reminders are present.
- Snapshot can be tested without UI.

### Epic 5: Daily Truth Dashboard

**User story:** As an owner, I want a dashboard that tells me what needs attention today.

**Acceptance criteria:**

- Critical cards link to evidence and actions.
- Cards are role-aware and location-aware.

### Epic 6: End-Of-Day Close

**User story:** As a manager, I want to close the day with evidence.

**Acceptance criteria:**

- POS, cash drawer, and payment totals are compared.
- Differences require explanation.
- Close state is auditable.

### Epic 7: Leakage Exception Engine

**User story:** As an owner, I want mismatches flagged before money disappears.

**Acceptance criteria:**

- Configured thresholds create exceptions.
- Exceptions link to evidence and actor/location context.
- Resolution requires permission.

### Epic 8: Inventory Variance Controls

**User story:** As an owner, I want stock loss to require traceable reason and approval.

**Acceptance criteria:**

- Cycle counts create variances.
- Write-offs require reason and approval.
- Loss summary groups by product, location, actor, and period.

### Epic 9: Accountant Close Readiness

**User story:** As an accountant, I want to see which clients are close-ready and what evidence is missing.

**Acceptance criteria:**

- Accountant sees authorized clients only.
- Missing evidence requests flow to client action center.
- Close pack export is redacted and auditable.

### Epic 10: Signed Statement Network

**User story:** As an owner, I want to share customer and supplier statements safely.

**Acceptance criteria:**

- External links expire and can be revoked.
- Recipient sees only intended data.
- Views and responses are logged.

### First 10 Implementation Tasks

1. Create `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`.
2. Draft `stoquify-referral-war-room-orchestrator` skill.
3. Map existing services to business event and evidence sources.
4. Define action center task schema and lifecycle.
5. Build daily operating snapshot service contract.
6. Add focused fixtures for daily snapshot generation.
7. Define end-of-day close state machine.
8. Define deterministic leakage exception rules.
9. Define accountant-client access grant model.
10. Define signed external statement token contract.

## 9. Verification And Release Gates

### Universal Gates

- Every feature has a saved phase report under `what-next/referrals/`.
- Every user-visible metric links to service-owned data.
- Every external share has signed access, expiry, redaction, and view logs.
- Every sensitive workflow has RBAC tests.
- Every close/accounting/payroll/compliance claim has evidence.

### Focused Verification By Phase

| Phase | Verification |
|---|---|
| Control plane | Status register, phase report, skill backlog. |
| Foundation | Unit tests for event/evidence/action contracts. |
| Daily truth | Snapshot service tests, dashboard route smoke, role-aware card checks. |
| Leakage | Mismatch fixture tests, permission tests, audit trail tests. |
| Inventory loss | Stock ledger integrity tests, write-off approval tests. |
| Accountant close | Accountant access tests, close readiness tests, redaction/export tests. |
| Statement hub | Token expiry/tamper tests, external route tests, recipient redaction tests. |
| Financing passport | Score fixture tests, consent tests, explainability checks. |
| Copilot/WhatsApp | Prompt safety tests, no-bypass tests, delivery log tests. |

### Suggested Commands

Use focused commands per slice rather than full-suite reflexes:

```powershell
npm run typecheck
npm run lint
npm test -- --runInBand <focused-test-files>
npm run policy:gates
```

For UI work, add the narrow route smoke or screenshot checks already used in this repository.

## 10. Monetization And GTM Alignment

### Packaging Map

| Tier | Feature Set | Upgrade Driver |
|---|---|---|
| Free/Starter | Digital receipts, basic dashboard, limited inventory, limited statements. | Professional proof visibility. |
| Core | POS, inventory, daily truth, customer/supplier balances, basic accounting. | Daily operating habit. |
| Professional | Leakage radar, approvals, inventory controls, accountant portal, close pack. | Money protection and accountant readiness. |
| Premium | Financing passport, advanced analytics, multi-location, automated reconciliation, WhatsApp bundles. | Financing and scale. |
| Accountant Firm/Enterprise | Multi-client portal, staff roles, bulk close, firm branding, API/export, advanced audit. | Accountant-led distribution. |

### GTM Loops

- Accountants invite clients for close readiness.
- Customers see digital receipts and statements.
- Suppliers see professional reconciliation links.
- Employees see payslips and self-service proof.
- Lenders see financing passport proof packs.
- Owners refer when leakage controls save money or prevent embarrassment.

## 11. Risks And Controls

| Risk | Control |
|---|---|
| Scope explosion | Start with foundation, daily truth, action center, leakage baseline. |
| Dashboard-only truth | Require service-owned read models before UI. |
| Weak data quality | Show evidence completeness and data-quality score. |
| False fraud accusations | Use "exception requiring review" language, not automatic blame. |
| Compliance drift | Versioned country packs with expert review provenance. |
| AI hallucination | Copilot consumes only service-owned facts and cannot approve actions. |
| WhatsApp becoming truth | WhatsApp is a delivery channel only. |
| External data leakage | Signed tokens, expiry, revocation, redaction, view logs. |
| Accountant overexposure | Client-scoped grants and audit logs. |
| Adoption friction | Role-based daily/weekly/monthly workflows with clear next action. |

## 12. Final Execution Recommendation

### First 30 Days

- Create referral war room status register.
- Draft/install the orchestrator and first three pillar skills.
- Map business event and evidence sources.
- Define action center lifecycle.
- Define daily snapshot service contract.
- Save a Phase 0 report.

### First 60 Days

- Implement daily operating snapshot.
- Build first daily truth read model.
- Build action center minimum workflow.
- Build end-of-day close contract.
- Add focused tests and a first dashboard/report surface.

### First 90 Days

- Add deterministic leakage exceptions.
- Add inventory variance/write-off control foundation.
- Start accountant close readiness model.
- Produce first phase evidence reports.
- Decide the first production-ready packaging gate.

### Do Not Build Yet

- Peer benchmarking.
- Loyalty campaigns.
- Broad autonomous AI.
- Financing partner integrations before data-quality scoring.
- Full WhatsApp automation before action center and external redaction patterns are proven.
- Decorative dashboards that do not link to source evidence and next actions.

## Clearest Path To Differentiation

The clearest path is to make Stoquify the platform that proves a business is well-run. Start with daily truth, action center, end-of-day close, leakage exceptions, and inventory loss controls. Then use accountant close packs, statements, and financing passports to turn internal control into external trust. Once these workflows are trusted, add copilot and WhatsApp to accelerate them.

That path makes Stoquify stand apart from ordinary POS, accounting, and inventory tools because it does not merely record business activity. It helps owners control, prove, share, and improve the business every day.

