# Kontava Platform Innovation Run Report

Generated: 2026-06-21

Skill run: `platform-innovation`

Repository: `E:\ohada saas\newStockFlow\aqstoqflow`

## 1. Executive Summary

Kontava is no longer only a conventional accounting, POS, inventory, payroll, and finance application. The codebase now contains the beginnings of an evidence-backed operating platform: BI contracts, snapshot read models, business signals, an action queue, Owner War Room, Manager Action Center, module control, proof trails, redaction policy, export safety, workflow assurance, payment reconciliation, close assurance, ledger posting, business events, and release gates.

The strongest innovation opportunity is to make Kontava the daily command system for OHADA-zone SMBs:

- Owners open it every morning to know cash truth, stock cash exposure, risks, and actions.
- Managers open it to know what must be fixed today.
- Accountants open it to know close readiness, ledger trust, suspense, and evidence gaps.
- Finance teams open it to control reconciliation, receivables, payables, supplier pressure, and cashflow.
- Stockkeepers open it to prevent stockouts, shrinkage, dead stock, and receiving gaps.
- Payroll teams open it to manage payroll exposure without leaking person-level payroll data.

The system has enough foundations to begin this journey, but not enough to launch broad advanced innovation without discipline. The correct strategy is:

1. Harden security, tenant, MFA, token, receipt, upload, export, and guard foundations.
2. Expand BI and snapshot foundations in controlled slices.
3. Mature Manager Action Center and Owner War Room into daily read-only command surfaces.
4. Add durable action workflows only after read-only signals prove useful.
5. Delay partner APIs, AI copilot, broad evidence graph, and automated decision workflows until redaction, consent, proof, and live data-quality gates are stronger.

## 2. Inspection Scope and Limits

Inspected areas:

- BI contracts and adapter: `services/bi/bi-contracts.ts`, `services/bi/bi-evidence-adapter.service.ts`.
- Snapshot contracts/services: `services/snapshots/**`.
- Signals/action queue: `services/signals/**`, `actions/signals/business-signals.actions.ts`.
- Manager Action Center: `services/manager-action-center/**`, `actions/manager-action-center/**`, `components/manager-action-center/**`, `app/[locale]/(dashboard)/dashboard/manager-action-center/page.tsx`.
- Owner War Room: `services/owner-war-room/**`, `actions/owner-war-room/**`, `components/owner-war-room/**`, `app/[locale]/(dashboard)/dashboard/owner-war-room/page.tsx`.
- Module control: `services/modules/**`, `app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx`.
- Security/redaction/export/moat guard: `services/security/**`, `services/controls/sensitive-action.service.ts`.
- Auth/RBAC/session guard surfaces: `lib/security/rbac.ts`, `lib/security/auth-session.ts`, `services/_shared/protect.ts`.
- Ledger/accounting/evidence/reconciliation/assurance foundations through schema and services.
- Dashboard route list and `config/sidebar.ts`.
- Prior readiness, security, and moat reports in `moat proposals/`, `security/`, and `innovation/`.
- `graphify-out/GRAPH_REPORT.md` architecture summary.

Validation commands run:

```powershell
npm run prisma:validate
node scripts\kontava-moat-release-gate.js --mode fail
```

Validation result:

- Prisma schema is valid.
- Kontava moat release gate reports `ready`.
- Seed scenarios ready: 8/8.
- Backfill checks ready: 6/6.
- Release gates ready: 8/8.
- Blockers: 0.
- Critical blockers: 0.

Limits:

- This was a static architecture/product/code inspection.
- No browser E2E verification was run in this pass.
- No live production data, cloud infrastructure, backups, WAF, DNS, or external observability was inspected.
- No product code was modified.

## 3. Current State Assessment

### 3.1 Strong Foundations Already Present

| Foundation | Evidence | Innovation value |
|---|---|---|
| Shared BI contract | `services/bi/bi-contracts.ts` | Gives every KPI state, evidence grade, freshness, blockers, redactions, drill-through, and action link metadata. |
| BI evidence adapter | `services/bi/bi-evidence-adapter.service.ts` | Normalizes snapshots and signals into shared KPI/insight shapes. |
| Snapshot contracts | `services/snapshots/snapshot-contracts.ts` | Provides tenant/branch/payment/inventory/close read models with freshness, source hash, source modules, blockers, and redactions. |
| Business signals | `services/signals/business-signal-contracts.ts`, `business-signal-rules.service.ts` | Turns cross-module conditions into action-oriented signals. |
| Action queue | `services/signals/action-queue.service.ts` | Filters visible actions by tenant and permission and creates role-aware daily work. |
| Owner War Room | `app/[locale]/(dashboard)/dashboard/owner-war-room/page.tsx` | Evidence-backed owner command surface exists and is server-guarded. |
| Manager Action Center | `app/[locale]/(dashboard)/dashboard/manager-action-center/page.tsx` | Daily manager surface exists and is server-guarded. |
| Workflow assurance | `services/assurance/**`, assurance control tower route | Turns workflow health into incidents, severity buckets, waivers, redactions, and engine health. |
| Module control | `services/modules/module-control-contracts.ts`, `module-entitlement.service.ts` | Provides a catalog and observe-mode entitlement decisions. |
| Redaction policy | `services/security/redaction-policy.service.ts` | Protects payroll, supplier bank, payment references, suspense, fiscal payloads, close evidence, partner data, exports, and proof IDs. |
| Export safety | `services/security/export-safety.service.ts` | Adds watermark and sensitive-action checks for controlled exports. |
| Moat guard | `services/security/moat-guard.service.ts` | Combines module, RBAC, sensitive action, consent, export, and redaction decisions. |
| Ledger/event spine | `prisma/schema.prisma`, `services/accounting/**` | Journal entries, source links, business events, outbox, ledger audit events, close packs, reconciliation data, and idempotency exist. |
| Release gate | `scripts/kontava-moat-release-gate.js` | Static seed/backfill/release readiness can be checked before promotion. |

### 3.2 Incomplete or Fragile Foundations

| Gap | Evidence | Impact |
|---|---|---|
| Snapshot coverage is still narrow | `SNAPSHOT_KINDS` includes tenant, branch, payment truth, inventory cash, and close readiness only | Supplier AP risk, payroll profitability, receivables, payables, compliance readiness, offline branch, and stock-to-cash twin need new read models. |
| Action queue is mostly derived/read-only | No Prisma `BusinessSignal` or `ActionItem` models found in schema search | Great for MVP; not yet enough for durable assignment, SLA, notification, resolution, audit, and escalation history. |
| Module entitlements are observe-first | `MODULE_CONTROL_MODE = "observe"`, `hardEnforcementEnabled: false` | Good for migration; not yet a true subscription security boundary. |
| Sidebar includes modules/routes not confirmed in route list | `config/sidebar.ts` includes production, presence, commercial agents, content, and several sales/order paths not present in sampled dashboard pages | Product promise and navigation should not outrun implemented, guarded, usable surfaces. |
| Fresh auth is not full MFA/reauth | `lib/security/auth-session.ts` derives `lastAuthAt` from session creation; security settings page says MFA enrollment/challenge route is not connected | Advanced exports, partner evidence, sensitive approvals, and AI evidence should wait for real step-up. |
| Token helpers still use `Math.random` | `lib/generateOtp.ts`, `lib/token.ts` | Verification/reset flows must be hardened before broad daily-use adoption. |
| Public receipt route uses raw receipt/order ID | `app/api/receipts/[receiptId]/route.ts` calls `getPublicSalesReceipt({ salesOrderId: receiptId })` | Any public sharing/partner evidence work must first redesign public tokens and redaction. |
| Upload serving still uses `public/uploads` | `app/api/uploads/[...path]/route.ts` serves from `public/uploads/{organizationId}` | Daily proof, receipt, and partner evidence uploads need private storage, scanning, and signed URLs. |
| Guard consistency still varies by generation | Some modern actions use `protect`; some pages still mount client workbenches directly | Before broad BI/action automation, routes/actions/APIs/exports/jobs need guard inventory and coverage tests. |
| Legacy cross-org helper still allows wildcard | `services/_shared/resolve-action-organization.ts` permits `*` to resolve another active org | Break-glass access must be explicit, fresh-auth protected, time-bound, and audited. |

## 4. Daily-Go-To BI and Insight Opportunity Map

### 4.1 Owner Daily Command Center

Business problem:

- Owners often do not know what cash is real, what stock is trapped, what supplier pressure exists, what payroll will consume, and what actions deserve attention today.

Why users return daily:

- It answers: "What changed since yesterday?", "What is at risk?", "What needs action today?", and "Can I trust these numbers?"

Current reusable foundations:

- Owner War Room route and service.
- Tenant operating snapshot.
- Payment truth snapshot.
- Inventory cash snapshot.
- Close readiness snapshot.
- Business signals and action queue.
- BI contracts and proof drill-through.

Missing prerequisites:

- Cash command snapshot.
- Receivables/payables snapshot.
- Supplier AP risk snapshot.
- Payroll profitability snapshot.
- Real MFA/fresh-auth for exports and sensitive drill-through.
- Browser E2E for owner command center.

MVP:

- Keep read-only.
- Add "since yesterday" strip using existing snapshots.
- Add owner action priority ranking.
- Show evidence grade and freshness on every item.

Production-grade:

- Add durable owner digest.
- Add acknowledged/ignored/resolved action workflow.
- Add owner notification preferences.

Moat-level:

- Owner gets daily business narrative: cash risk, stock risk, people cost, supplier commitments, compliance exposure, and close confidence in one trusted surface.

### 4.2 Manager Daily Action Center

Business problem:

- Managers need clear, permission-filtered actions, not dashboards that simply display numbers.

Why users return daily:

- It becomes the daily operating checklist for cash variance, stockout risk, receiving delays, open suspense, close blockers, and payroll exposure.

Current reusable foundations:

- Manager Action Center route/service/component.
- Action queue.
- Business signal rules.
- Assurance incidents.
- BI evidence adapter.

Missing prerequisites:

- Durable action item persistence.
- Assignment, escalation, resolution, and dismissal server actions.
- Notification service persistence and digest delivery.
- Action SLA and overdue evidence.

MVP:

- Keep read-only.
- Improve prioritization and reduce low-value action noise.
- Add filters by severity, role, module, evidence grade, and due state.

Production-grade:

- Add durable action assignment and resolution with audit.
- Add comments/proof attachment support.
- Add escalation to owner/accountant.

Moat-level:

- Kontava becomes the operational task brain for SMB managers, not just a data screen.

### 4.3 Cash Command Intelligence

Business problem:

- SMBs lose cash through drawer gaps, payment suspense, manual overrides, refund/void anomalies, duplicate provider references, supplier payments, and unreconciled channels.

Current reusable foundations:

- Payment truth snapshot.
- Payment reconciliation workbench.
- Sensitive action policies.
- Redaction policy.
- Export safety.
- Business signals.
- Ledger/source links.

Missing prerequisites:

- Cash command read model combining POS cash, drawer movement, payment provider events, suspense, AP/AR, payroll exposure, and bank/mobile money evidence.
- Drawer variance signal rules.
- Cash leakage severity taxonomy.
- Drill-through proof drawer coverage for cash events.

MVP:

- Read-only cash command cards: cash collected, unreconciled cash, open suspense, cash drawer risk, payment provider risk.

Production-grade:

- Daily cash close checklist.
- Exceptions by branch/cashier/payment channel.
- Controlled export and accountant review pack.

Moat-level:

- "Cash truth engine" that shows what cash exists, where it came from, what is missing, and what is risky.

### 4.4 Stock-to-Cash Digital Twin

Business problem:

- Stock is cash. SMBs often do not know which stock is turning into cash, which is trapped, which is leaking, and which purchase decisions are hurting margin.

Current reusable foundations:

- Inventory cash snapshot.
- POS/sales routes and services.
- Inventory movements and transfers.
- Purchasing/receiving surfaces.
- Ledger/source links.

Missing prerequisites:

- Stock-to-cash read model.
- Item margin and velocity snapshots.
- Receiving-to-sales lag.
- Shrinkage/adjustment anomaly signals.
- Supplier/item profitability signals.

MVP:

- Stock-to-cash board: inventory value, dead stock exposure, stockout risk, fast movers, slow movers, margin risk.

Production-grade:

- Branch and supplier drill-through.
- Suggested reorder/transfer/markdown actions.

Moat-level:

- Inventory decisions are connected to cashflow, supplier terms, margin, and sales velocity.

### 4.5 Payment Truth and Suspense Autopilot

Business problem:

- Manual reconciliation is slow, opaque, and error-prone, especially with mobile money, bank feeds, POS cash, and provider references.

Current reusable foundations:

- Payment provider events.
- Statement files.
- Reconciliation runs.
- Suspense items.
- Payment exceptions.
- Payment truth snapshot.
- Payment reconciliation workbench.

Missing prerequisites:

- Safe autopilot language: recommendation, not automatic posting.
- Confidence score contract.
- Evidence requirement for match proposals.
- Maker-checker on overrides/posting.
- Full export safety and fresh-auth.

MVP:

- Daily suspense summary and suggested review queue.

Production-grade:

- Match suggestions, confidence tiers, exception explanations, and audit-safe resolution workflow.

Moat-level:

- Kontava becomes the payment truth engine for OHADA SMBs with mobile money, POS, cash, and bank evidence unified.

### 4.6 Supplier Trust and AP Risk Shield

Business problem:

- Supplier debt, delayed receiving, duplicate invoices, bank detail changes, and payment timing can destroy cash control.

Current reusable foundations:

- Supplier services.
- Purchase order routes.
- AP/payables surfaces.
- Sensitive action policies for supplier bank/payment approval/release.
- Redaction policy for supplier bank details.

Missing prerequisites:

- Supplier AP risk snapshot.
- Supplier bank-change evidence model.
- Duplicate supplier invoice/payment detection.
- Receiving delay signals.
- AP aging and commitment pressure BI contract.

MVP:

- Supplier risk board: open POs, delayed receiving, AP exposure, supplier concentration, bank-change risk.

Production-grade:

- Maker-checker bank approval workflow and payment release controls.

Moat-level:

- SMB owners know which supplier relationships threaten cash, stock availability, and fraud exposure.

### 4.7 Payroll-to-Profitability Engine

Business problem:

- Payroll is often treated as a cost total, not connected to branch output, sales, stock movement, or profitability.

Current reusable foundations:

- Payroll routes/services.
- Payroll snapshot-style foundations in schema.
- Redaction policy for payroll person-level amounts.
- Sensitive action policies for payroll approval/release.

Missing prerequisites:

- Payroll profitability snapshot.
- Aggregation-only privacy contract.
- Branch/team/product line attribution.
- Strict role-aware redaction and export control.

MVP:

- Aggregated payroll exposure by period and branch, with no person-level data.

Production-grade:

- Payroll cost per revenue, margin, branch, shift, or business unit.

Moat-level:

- Owners understand whether payroll is producing economic output without exposing employee-sensitive details.

### 4.8 OHADA Close Autopilot and Accountant Trust Pack

Business problem:

- Close periods fail because evidence is scattered: unreconciled payments, unposted journals, stock issues, suspense, missing compliance evidence, and unverified exports.

Current reusable foundations:

- Close readiness snapshot.
- Close assurance services.
- Close pack exports.
- Journal/source links.
- Proof trail.
- Accountant portal route.

Missing prerequisites:

- Expanded close blocker taxonomy.
- Accountant review workflow.
- Export registry coverage for trust packs.
- Close pack watermarks and revocation.
- Direct collaboration surfaces for accountant-led growth.

MVP:

- Close readiness board with blockers and drill-through.

Production-grade:

- Accountant trust pack: period evidence, trial balance, reconciliation certificate, close blockers, source links, and export hash.

Moat-level:

- Accountants become distribution partners because Kontava reduces review effort and increases evidence confidence.

### 4.9 Compliance Readiness Radar

Business problem:

- OHADA-zone SMBs need compliance readiness, not just end-of-period panic.

Current reusable foundations:

- Compliance center route.
- Country pack schema/services.
- Fiscal/compliance evidence models.
- Close and ledger foundations.

Missing prerequisites:

- Country-specific compliance readiness snapshot.
- Jurisdiction-safe language.
- Due date and filing status model.
- Compliance evidence drill-through.
- External submission integration boundaries.

MVP:

- Read-only compliance readiness board: missing tax IDs, fiscal document gaps, unposted periods, close blockers, certification state.

Production-grade:

- Country pack-driven alerts and accountant handoff.

Moat-level:

- Kontava becomes the compliance operating layer for OHADA SMBs.

### 4.10 Fraud and Controls Case Manager

Business problem:

- Fraud signals usually die as dashboard warnings. They need case ownership, proof, resolution, waiver, escalation, and audit.

Current reusable foundations:

- Business signals.
- Assurance incidents.
- Sensitive action policies.
- Redaction and proof trail.
- Action queue.

Missing prerequisites:

- Controls case schema.
- Case lifecycle.
- Maker-checker for waiver/closure.
- Evidence attachment and redaction.
- Separation between "risk signal" and "accusation".

MVP:

- Convert selected critical signals into read-only assurance incidents.

Production-grade:

- Case manager with assignment, timeline, evidence, waiver, escalation, and resolution.

Moat-level:

- Kontava becomes a control system that helps SMBs detect, prove, resolve, and learn from operational risk.

## 5. Cross-Module Innovation Proposals

| Proposal | Priority | Why it matters | Current readiness | Build decision |
|---|---:|---|---|---|
| BI Baseline Expansion | P0 | Every insight needs consistent freshness/evidence/redaction | Strong contracts, narrow snapshots | Build now |
| Manager Action Center Maturity | P0 | Turns BI into daily work | MVP exists, read-only | Expand carefully |
| Owner Daily Command Center Expansion | P1 | Makes Kontava daily for owners | MVP exists | Expand after cash command |
| Cash Command Intelligence | P1 | Most painful SMB problem: cash truth | Payment truth + finance foundations exist | Build read-only next |
| Cash Leakage Radar | P1 | High-value risk detection | Signal foundation exists | Build after cash command vocabulary |
| Close Autopilot MVP | P1 | Accountant and compliance value | Close readiness exists | Build read-only blocker workflow |
| Payment Truth Autopilot | P1 | Major finance moat | Reconciliation exists | Keep recommendation-only first |
| Stock-to-Cash Twin | P2 | Converts inventory into cash intelligence | Inventory cash exists | Needs new read model |
| Supplier AP Risk Shield | P2 | Controls cash commitments and fraud | PO/AP/supplier exist | Needs AP snapshot and bank-change controls |
| Payroll Profitability | P2 | Rare and valuable owner insight | Payroll + redaction exist | Aggregated only first |
| Accountant Trust Pack | P2 | Drives accountant-led growth | Proof/close/accountant portal exist | Needs export safety coverage |
| Compliance Radar | P2 | OHADA strategic moat | Compliance center/country packs exist | Build after close data reliability |
| Offline Branch Certification | P3 | Multi-branch trust | Offline POS foundations exist | Needs replay trust and branch certificate contract |
| Business Evidence Graph | P3 | Defensibility and AI substrate | Proof/source links exist | Design first, persist later |
| Fintech Evidence API | P4 | Partner channel | Partner seed scenario exists | Wait for consent/API/token hardening |
| AI Operating Copilot | P4 | Long-term intelligence | Data contracts exist | Wait for redaction/source/no-write guardrails |

## 6. Proposal-by-Proposal Prerequisites

### 6.1 Must-Have Foundations Before More Innovation

1. Complete real MFA and step-up auth.
   - Required for exports, partner evidence, payroll, supplier bank, payment override, close certification, and AI-readable evidence.
   - Evidence: MFA schema and settings page exist, but the page states enrollment/challenge routes are not connected.

2. Replace weak token generation.
   - Required for registration, verification, password reset, partner tokens, signed receipts, and public shares.
   - Evidence: `lib/generateOtp.ts` and `lib/token.ts` use `Math.random`.

3. Tokenize public receipts.
   - Required before public/partner proof sharing.
   - Evidence: `/api/receipts/[receiptId]` currently calls public receipt lookup by `salesOrderId`.

4. Move uploads/evidence files to private storage.
   - Required for proof packs, partner documents, receipt evidence, and audit attachments.
   - Evidence: upload serving reads from `public/uploads/{organizationId}`.

5. Guard inventory and route/action/API/export/job coverage.
   - Required before action automation and hard module enforcement.
   - Evidence: modern routes use `requirePermission` and `protect`, while some older surfaces mount client workbenches or use legacy helpers.

6. Module entitlement staged enforcement.
   - Required before selling modules as subscription-bound.
   - Evidence: module mode is `observe`; hard enforcement is false.

7. Durable action persistence.
   - Required before Manager Action Center becomes a true operating workflow.
   - Evidence: action queue currently derives actions from snapshots/signals; no `BusinessSignal` or `ActionItem` persistence was found in Prisma schema search.

8. Snapshot expansion.
   - Required before advanced daily insight features.
   - Evidence: current formal snapshot kinds do not yet include receivables, payables, supplier AP risk, payroll profitability, compliance readiness, stock-to-cash twin, fraud case, or offline branch certification.

## 7. UX and Product Surface Recommendations

### 7.1 Make the First Screen Role-Aware

Current state:

- Kontava has a normal dashboard plus Owner War Room and Manager Action Center.

Recommendation:

- Owners land on Owner War Room.
- Managers land on Manager Action Center.
- Accountants land on Close/Accountant Trust Center.
- Finance users land on Cash Command/Reconciliation.
- Stockkeepers land on Stock-to-Cash.
- Payroll users land on Payroll Control/Profitability.

Effect:

- The platform becomes habit-forming because the first view answers the user's daily job.

### 7.2 Standardize Insight Cards

Every insight card should show:

- Metric.
- Evidence grade.
- Freshness.
- Source modules.
- Blockers.
- Redactions.
- Required permission.
- Drill-through.
- Next action.

Use:

- `services/bi/bi-contracts.ts`.
- `components/bi/**`.
- Existing Owner War Room and Manager Action Center patterns.

### 7.3 Add "What Changed Since Yesterday"

Build as a BI strip, not as AI first.

Sources:

- Snapshot source hash changes.
- New signals.
- Closed/resolved actions.
- New blockers.
- New redactions.
- Close readiness score movement.
- Cash/suspense/inventory deltas.

Value:

- Gives owners and managers an immediate reason to return daily.

### 7.4 Add "What Needs Action Today"

Use action queue severity, due state, evidence grade, and role.

Do not build:

- Broad workflow mutation yet.
- AI-generated task creation yet.

Build first:

- Read-only prioritization and drill-through to existing surfaces.

### 7.5 Improve Module Promise Integrity

If a sidebar module link exists, the route should either:

- Be implemented and guarded.
- Show a professional module-unavailable/coming-soon state controlled by module entitlements.
- Be removed from default navigation until ready.

Avoid:

- Selling or displaying modules as complete when only navigation exists.

## 8. Anti-Bloat Recommendations

Do not create a BI warehouse now.

- Use contract-backed read models first.
- Persist only hot, slow, or historical snapshots.

Do not persist every signal immediately.

- Persist only signals that require assignment, SLA, notification, resolution, audit, or case history.

Do not build full AI Copilot now.

- Build source-cited, read-only explanation surfaces first.
- Add AI only after redaction, prompt-injection, no-write, and evaluation gates exist.

Do not build partner API now.

- Build accountant trust pack and export registry first.
- Add partner consent, scopes, revocation, watermarking, and API tokens before external access.

Do not automate postings from insights yet.

- Keep recommendations read-only.
- Require maker-checker and fresh-auth before ledger-impacting actions.

Do not build disconnected mini-apps.

- Every new capability should use shared:
  - BI contracts.
  - snapshots.
  - business signals.
  - proof trails.
  - module entitlements.
  - redaction.
  - audit.
  - ledger/source links.

## 9. Prioritized Roadmap

### Phase 0: Safety and Trust Preconditions

Timeframe: immediate

Build:

- Cryptographic OTP/token generation and hashed token storage.
- Real MFA enrollment/challenge and true step-up.
- Public receipt signed token redesign.
- Private upload storage and signed download URLs.
- Route/action/API/export/job guard inventory.
- Legacy cross-org wildcard helper replacement with break-glass support access.
- Browser E2E for Owner War Room and Manager Action Center.

Gate:

- Direct URL, API, action, export, and module-denial tests pass.

### Phase 1: BI Baseline Expansion

Timeframe: short term

Build:

- Shared BI section primitives.
- Receivables snapshot.
- Payables/AP snapshot.
- Payroll aggregated exposure snapshot.
- Supplier AP risk snapshot.
- Compliance readiness snapshot.
- "What changed since yesterday" read-only strip.
- "What needs action today" read-only strip.

Gate:

- Every KPI has evidence grade, freshness, source modules, blockers, redactions, and drill-through state.

### Phase 2: Cash Command and Daily Action Value

Timeframe: short to medium term

Build:

- Cash Command Intelligence surface.
- Cash leakage signal taxonomy.
- Suspense/action prioritization.
- Drawer variance signals.
- Duplicate provider reference visibility.
- Owner/manager digest.

Gate:

- Users can see daily cash truth without mutating ledger or reconciliation state.

### Phase 3: Durable Action Center

Timeframe: medium term

Build:

- Persistent `BusinessSignal`, `ActionItem`, and `ActionItemEvent` or equivalent models.
- Assignment, resolution, dismissal, escalation, and comment history.
- Notification preferences and digest delivery.
- Assurance incident bridge for high-risk signals.

Gate:

- Actions have audit history and permission-filtered lifecycle controls.

### Phase 4: Operational Moat Surfaces

Timeframe: medium term

Build:

- Stock-to-Cash Digital Twin.
- Supplier Trust and AP Risk Shield.
- Payroll-to-Profitability Engine.
- OHADA Close Autopilot MVP.
- Accountant Trust Pack.
- Compliance Readiness Radar.

Gate:

- Each surface is read-only first, proof-backed, redaction-safe, and validated with seeded tenants.

### Phase 5: Advanced Defensibility

Timeframe: later

Build:

- Fraud and Controls Case Manager.
- Business Evidence Graph.
- Module Intelligence maturity.
- Offline Branch Certification.
- Fintech Partner Evidence API.
- AI Operating Copilot.

Gate:

- Consent, redaction, source citation, no-write, export registry, evidence graph taxonomy, performance budgets, and external API audit pass.

## 10. Risk Register

| Risk | Severity | Why it matters | Mitigation |
|---|---:|---|---|
| Innovation outruns security | Critical | More BI/export/partner surfaces increase data exposure | Complete Phase 0 before partner/API/AI work |
| Module navigation overpromises | High | Users may see promised modules that are not complete | Route inventory, module-unavailable states, entitlement gates |
| Action noise reduces trust | High | Managers stop using action center if it floods them | Severity thresholds, role filters, feedback loop |
| Snapshot gaps create shallow insights | High | Daily BI becomes decorative rather than useful | Expand snapshots by business value |
| Read-only MVP becomes mistaken for workflow completion | Medium | Users expect assignment/resolution that does not exist | Clear UI states and staged durable action plan |
| Export/receipt/upload leakage | Critical | Daily platform creates more sensitive artifacts | Private storage, signed tokens, export registry |
| AI copilot added too early | Critical | AI could leak, hallucinate, or suggest unsafe accounting actions | Delay until source-cited read-only guardrails pass |
| Partner API added too early | Critical | External consumers multiply trust and privacy risk | Consent, revocation, scoped tokens, watermarking |
| Performance degrades from live joins | High | Daily dashboards must be fast | Snapshot/read-model budgets and rebuild strategy |
| Legacy guard inconsistency | High | Some surfaces may bypass uniform policy | Guard inventory and migration to shared protect/moat guard |

## 11. Testing, Observability, Release-Gate, and Rollback Plan

Required tests:

- Unit tests for new snapshot builders.
- Service tests for BI adapter normalization.
- Action tests for tenant/RBAC/module checks.
- E2E tests for Owner War Room and Manager Action Center.
- Direct URL denial tests.
- Export/redaction/fresh-auth tests.
- Action queue permission filtering tests.
- Snapshot stale/partial/blocked state tests.
- Performance budget tests for BI endpoints.

Observability:

- BI endpoint latency.
- Snapshot build age and failure rate.
- Action signal count by severity.
- Redaction count by surface.
- Hidden-by-permission count.
- Export attempts and denials.
- Module would-block counts.
- Assurance incident age.
- Close blocker age.

Release gates:

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- focused Jest suites for touched services/actions
- `node scripts/kontava-moat-release-gate.js --mode fail`
- E2E smoke for role-specific daily surfaces

Rollback:

- New daily BI surfaces should be route/sidebar removable.
- New snapshots should be additive.
- New durable action models should start read-only/backfill-safe.
- Hard module enforcement must be reversible to observe mode.
- AI/partner/API features must be feature-flagged off by default.

## 12. Recommended First Build

The best next build is not AI, partner API, or a broad evidence graph.

Build next:

> Cash Command Intelligence MVP plus "What changed since yesterday" and "What needs action today" strips, using existing BI contracts, snapshots, payment truth, inventory cash, close readiness, and business signals.

Why:

- Cash is the highest-frequency owner problem.
- It reuses current foundations.
- It deepens daily usage.
- It improves Owner War Room and Manager Action Center immediately.
- It can remain read-only and safe.
- It creates the vocabulary needed for Cash Leakage Radar and Payment Truth Autopilot.

Must include:

- Evidence grade.
- Freshness.
- Source modules.
- Redactions.
- Blockers.
- Drill-through.
- No mutation.
- No automated posting.
- No broad export.

## 13. Items to Delay

Delay these until prerequisites pass:

- Full AI Operating Copilot.
- Fintech Partner Evidence API.
- Broad Business Evidence Graph persistence.
- Automated payment/suspense posting.
- Automated compliance certification.
- Hard module enforcement across all modules.
- Payroll person-level BI.
- External accountant/partner collaboration with live tenant data.

## 14. Final Recommendation

Kontava has crossed an important threshold: the core pieces for a daily operating platform are now visible in the codebase. The highest-value path is to make those pieces coherent, trusted, and habit-forming.

The platform should become:

- A cash truth system.
- A daily action system.
- A ledger trust system.
- A stock-to-cash system.
- A close readiness system.
- A compliance readiness system.
- A role-aware BI system.
- An evidence-backed accountant collaboration system.

But it should get there by disciplined stages:

1. Harden security and trust foundations.
2. Expand BI snapshots and action semantics.
3. Mature read-only daily command surfaces.
4. Add durable workflows only where daily use proves value.
5. Add advanced moat features only after consent, redaction, evidence, performance, and release gates are strong.

This path gives Kontava the best chance to become a platform SMB users open daily because it tells them what is true, what changed, what is risky, and what to do next.
