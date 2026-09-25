# Stoquify Analytics and Controlled-Network Execution Roadmap: Phases 0–3

Date: 2026-08-30  
Workspace: `E:\ohada saas\Focused projects\stoquify`  
Planning horizon: 42–50 weeks from approved mobilisation  
Decision status: execution recommendation; not legal, accounting, privacy, security, accessibility, or production-release certification  
Companion registry: `what-next/STOQUIFY_ANALYTICS_NETWORK_PHASES_0_TO_3_WORK_PACKAGE_REGISTRY_2026-08-30.json`

## 1. Executive verdict

Execute Phases 0–3 as a controlled analytics-to-network program. Do not build an open marketplace.

Stoquify already has the foundations for the three recommended analytical jobs: Cash Command carries evidence and forecast signals, Payment Reconciliation exposes suspense and failure evidence, and Accountant Access provides consent-bound client visibility. It also has immutable referral attribution, consented customer-statement delivery records, and an invite-only supplier PO proposal boundary. The roadmap therefore hardens and composes existing source truth; it does not create replacement ledgers or another family of generic dashboards.

The recommended sequence is:

1. Phase 0: freeze semantics, ownership, access, evidence, and external-delivery controls.
2. Phase 1: deliver decision-grade Cash, Reconciliation, and Accountant Advisory surfaces, with no more than two major feature streams active at once.
3. Phase 2: instrument privacy-bounded participation, prove delivery and support operations, and rehearse every external lane.
4. Phase 3: run a closed, allowlisted pilot covering accountant, supplier, customer-statement, and implementation-partner loops.

The program must stop before Phase 3 if live delivery, purpose-bound consent, tenant isolation, abuse controls, support ownership, or rollback evidence is missing. A public directory, public ratings, lending, escrow, credit scoring, public supplier identity, commission settlement, and open discovery are explicitly outside Phases 0–3.

## 2. Evidence-backed baseline

### 2.1 Current capability truth

| Capability | Current truth | Roadmap consequence |
|---|---|---|
| Cash Command | `services/cash-command/` composes payment, close, drawer, payroll, evidence-grade, freshness, blocker, and permission-aware signals. Its existing contract is `CashCommandData`; no general governed 13-week scenario domain was found. | Extend the existing route and service. Introduce a proposed `CashForecastCommandReadModel` as a read-only composition first; saved or approved scenarios are later governed work. |
| Payment reconciliation | `services/payments/payment-reconciliation-workbench.service.ts` and `components/finance/PaymentReconciliationWorkbench.tsx` already expose runs, failures, suspense exposure, provider evidence, workflow state, and certification controls. | Add an executive leakage read model and root-cause/aging view over the authoritative workbench. Never relabel unresolved exposure as proven loss. |
| Accountant access and portfolio | `services/accounting/accountant-access.service.ts` enforces active, effective, unexpired, revocable consent grants and READ/EXPORT/REVIEW capabilities. The portfolio route exists. | Extend the portfolio with per-client bands and actions only after per-row grant checks. Never sum monetary values across currencies. |
| Referral funnel | `services/referrals/referral-funnel-read-model.service.ts` is tenant-scoped and aggregate-only, but `ALL_TIME` and limited to issuance, click, conversion, and accountant-invite activation. | Phase 2 adds cohort, delivery, first-trusted-value, retention, quality, and denominator semantics without exposing recipients. |
| Customer statements | Prisma and accounting services contain immutable snapshots, token access, delivery state, attribution, outbox evidence, consent hashes, and recipient actions. | Use as the customer participation lane only after provider delivery, consent, expiry, revocation, and support evidence pass. |
| Supplier PO participation | Supplier acknowledgement is invite-only; supplier changes are proposals reviewed by the buyer and cannot directly mutate PO, AP, stock, journals, or bank truth. The service currently returns no supplier-invite outbox messages. | Preserve the proposal boundary. Add controlled notification/delivery and no-rekey measurement before the pilot; never create public supplier ratings. |
| Business Pulse semantics | `services/analytics/sales-analytics.service.ts` still contains a hard-coded `XAF` default and server-local day boundaries. | Organization currency, timezone, and explicit period contracts are a Phase 0 release dependency for all new analytics. |
| Access and module inventory | Refreshed 2026-08-30: 414 surfaces, 371 mapped, 5 unmapped, 79 missing-permission findings, 77 dashboard-only risks, 293 enforcement candidates, and 6 review-required findings. Live route wrappers do protect relevant pages, while the scanner does not always infer the wrapper. | Phase 0 reconciles route-wrapper truth, action authorization, entitlement policy, and inventory classification. Do not infer safety solely from either a page file or the scanner. |
| Production readiness | Schema validation passes. Recent policy evidence still fails closed on external/statutory approval and earlier external-readiness evidence lacks live cohort approval. | Static completeness is not production evidence. Phase 3 requires fresh environment, provider, real-cohort, and rollback evidence. |

### 2.2 Architecture and graph implications

Live source is authoritative. Graph reports were used only for dependency navigation. `graphify-out/GRAPH_REPORT_app.md` identifies FinanceRouteAccess as a major route hub; `GRAPH_REPORT_actions.md` places analytics actions in a distinct community; and `GRAPH_REPORT_components.md` keeps PaymentReconciliationWorkbench and StockToCashFlowDashboard in separate component communities. The implementation pattern should therefore remain:

- source-domain services own facts and write authority;
- command read models compose redacted, permission-checked facts;
- shared BI primitives render evidence, freshness, blockers, and robust states;
- analytical routes drill into source workflows and do not perform corrective mutations;
- external actors submit bounded requests or proposals, never authoritative accounting, inventory, payment, or purchasing truth.

### 2.3 Program assumptions requiring approval

| Assumption | Base-plan decision | Replan trigger |
|---|---|---|
| Capacity | Two product squads plus shared Data/BI, QA, Design/Accessibility, Security/Privacy, SRE, and Support. | Fewer than 7 effective FTE for two consecutive sprints. |
| Pilot geography | One country-pack and one operating-currency cohort at pilot start. | Legal/compliance owner approves a broader cohort with country-specific controls. |
| External channels | Transactional email first; WhatsApp only where provider, template, consent, and country rules are proven. | Provider or legal evidence rejects email-first or requires a narrower channel. |
| Forecasting | Deterministic read-only baseline; no autonomous prediction and no unapproved saved scenarios. | Finance owner approves a governed scenario lifecycle and audit model. |
| Network identity | Tenant-scoped identities plus explicit invitations. No cross-tenant counterparty identity merge. | A separately approved verified-identity program exists. |
| Pilot scale | 10–20 operating organizations, 3–5 accountants/firms, 20–40 suppliers, and 100–300 statement recipients, all allowlisted. | Support capacity, provider limits, or privacy thresholds require a smaller cohort. |

## 3. Target operating model and dependency graph

```text
P0 ownership + money/time + metrics + event taxonomy
                 |             |
                 v             v
        access/entitlement   delivery/consent/abuse
                 \             /
                  v           v
              shared evidence/read-model contract
                            |
                  Phase 0 foundation gate
                            |
            +---------------+---------------+
            |                               |
            v                               v
  reconciliation leakage             13-week cash command
    read model + UX                   read model + UX
            +---------------+---------------+
                            |
                accountant advisory portfolio
                            |
                  Phase 1 product-value gate
                            |
       cohorts + first value + delivery + privacy + support
                            |
                  Phase 2 pilot-ready gate
                            |
     accountant | supplier | customer | partner closed lanes
                            |
              weekly evidence review and exit decision
```

Critical path: `P0-03 -> P0-04 -> P0-07 -> P1-01 -> P1-02/P1-04 -> P1-06 -> P1-08 -> P2-01/P2-02/P2-05/P2-06 -> P2-07 -> P2-08 -> P3-01 -> P3-02/P3-03/P3-04/P3-05 -> P3-07`.

External critical blockers are provider secrets and HTTPS callback proof, purpose-bound consent, tenant-isolation tests, privacy thresholds and retention, abuse throttles, real-cohort approval, support/on-call ownership, and a tested kill switch. Schedule compression must not bypass them.

## 4. Phase 0 — foundation and control closure

Duration: weeks 1–6.  
Outcome: one approved semantic, access, evidence, and external-readiness foundation.  
WIP rule: at most two major packages in build; governance reviews may run concurrently.

| ID | Work package and owner | Dependencies | Deliverable and acceptance evidence | Verification and rollback | Effort / confidence |
|---|---|---|---|---|---|
| P0-01 | Program baseline and decision register — Product Program Lead | None | Signed scope, named owners, capacity, pilot boundary, decisions, risk register, and baseline metrics. Every unresolved assumption has an owner and deadline. | Review against strategy and repository truth. Rollback: pause mobilisation; no runtime change. | S / high |
| P0-02 | Surface ownership and duplication map — Product + UX Architecture | P0-01 | Canonical job-to-route map for Business Pulse, Finance Analytics, Cash Command, Reconciliation, Accountant Portfolio, Owner War Room, Manager Action Center, Daily Digest, and Referral Funnel. Each KPI and action has one presentation owner and authoritative drill-through. | Route-catalog and sidebar tests; design review. Rollback: retain current navigation while removing proposed consolidation from scope. | M / high |
| P0-03 | Organization money, timezone, and period contract — Finance Platform | P0-01 | Organization currency, IANA timezone, ISO period boundaries, location scope, generated-at time, fixed-precision aggregation, and unsupported-state behavior defined for every target read model. The Business Pulse XAF/server-day gap has an approved remediation design. | Contract/unit cases for midnight, DST, XAF/XOF and decimal currencies, empty timezone, and cross-period cutoff. Rollback: feature flags keep new analytics off; existing source views remain. | M / high |
| P0-04 | Metric registry and semantic ownership — Data/BI Lead | P0-02, P0-03 | Versioned registry for all Phase 1–3 metrics: definition, formula, denominator, source owner, grain, scope, currency rule, freshness SLA, evidence grade, exclusions, and display language. “Exposure” and “loss” are separate definitions. | Finance, Accounting, Payments, Product, and Data sign-off; automated uniqueness/schema validation. Rollback: block affected KPI, never silently substitute. | M / high |
| P0-05 | Participation event taxonomy — Growth Analytics + Privacy | P0-01, P0-04 | Versioned events for issued, queued, delivered, failed, dead-lettered, clicked, accepted, activated, first trusted value, retained, expanded, revoked, and abuse-blocked, with source-event keys and quality rules. | Replay/idempotency tests, missing-denominator tests, event-to-source trace. Rollback: aggregate legacy stages separately with a visible quality blocker. | M / medium |
| P0-06 | Pilot access and entitlement closure — Security + Module Platform | P0-02 | Reconciled inventory for all target pages, server actions, exports, and public-token APIs. Explicit RBAC, entitlement, tenant, per-client grant, token, fresh-auth, and maker-checker decisions. Scanner false positives/negatives classified. | Route/action/API tests; cross-tenant denial; revoked-grant denial; module-disabled denial; refreshed inventory has zero unexplained pilot-scope findings. Rollback: deny by default or hide target feature flag. | L / high |
| P0-07 | Shared evidence and read-model contract — BI Platform | P0-03, P0-04, P0-06 | Contract for period, currency, timezone, source coverage, evidence grade, freshness, confidence, blockers, redactions, permissions, drill-through, robust UI states, and export manifest. | Contract tests, schema checks, proof-trail integration, EN/FR and accessibility review. Rollback: target screen renders blocked/degraded state and source workflow link. | M / high |
| P0-08 | Delivery, consent, abuse, and retention plan — Security/Privacy + SRE | P0-05, P0-06 | Channel allowlist, provider ownership, secret/callback requirements, consent purposes, template review, destination redaction, token expiry/revocation, retry/dead-letter policy, throttles, suppression, retention/deletion, incident and kill-switch design. Supplier-invite delivery gap is explicitly owned. | Threat model; provider sandbox test design; abuse cases; retention review; kill-switch drill plan. Rollback: outbound delivery disabled while internal analytics remain. | L / medium |
| P0-09 | Phase 0 foundation gate — Steering Group | P0-01 through P0-08 | Signed gate packet and sequenced Phase 1 backlog. No unresolved critical control decision. | Gate checklist in section 9. Rollback: remain read-only/internal and resolve failed package. | S / high |

### Phase 0 exit gate

Pass only when:

- every Phase 1 metric has an approved registry entry and source owner;
- target routes/actions/exports/APIs have explicit and tested access classifications;
- organization currency/timezone/period semantics are contractually fixed;
- evidence, freshness, coverage, blocker, and redaction states are shared;
- participation events have idempotent source keys and denominator-quality rules;
- delivery, consent, abuse, retention, support, and kill-switch owners are named;
- no proposed screen duplicates a canonical job without a consolidation decision.

## 5. Phase 1 — three decision surfaces

Duration: weeks 7–22.  
Outcome: evidence-backed analytical surfaces create measurable owner, controller, and accountant value without new write authority.  
WIP rule: Reconciliation and Cash may run in parallel after P1-01. Accountant Advisory begins when their stable bands/contracts are available.

| ID | Work package and owner | Dependencies | Deliverable and acceptance evidence | Verification and rollback | Effort / confidence |
|---|---|---|---|---|---|
| P1-01 | Shared analytical foundation — BI Platform | P0-09 | Reusable server contract adapters, metric identifiers, period/currency context, evidence/freshness/coverage, permission-aware links, instrumentation envelope, robust states, and export manifest. | Contract, tenant-isolation, stale/partial/blocked, localization, a11y, and performance tests. Rollback: disable target routes while source workflows remain. | L / high |
| P1-02 | `CashForecastCommandReadModel` v1 — Finance/Cash Command | P1-01 | Proposed 13 weekly buckets with opening cash, trusted inflows/outflows, closing cash, minimum buffer, first deficit week, driver lines, source coverage, baseline assumptions, blockers, and links. No saved scenario writes. | Reconcile bucket totals to source facts; double-count tests; cutoff/timezone/currency cases; finance sample review. Rollback: retain current `CashCommandData` and hide forecast section. | XL / medium |
| P1-03 | Cash Command decision UX and instrumentation — Finance UX | P1-02 | Extend `/dashboard/finance/cash-command`; first viewport shows runway, first deficit week, top drivers, coverage, and three actions; full robust states and accessible tabular alternatives. | Component/page/browser tests, EN/FR parity, keyboard/zoom/screen-reader checks, action-link authorization, telemetry quality. Rollback: flag off forecast mode only. | L / medium |
| P1-04 | `ReconciliationLeakageReadModel` v1 — Payments/Reconciliation | P1-01 | Exposure by rail, location, age, root cause, control state, owner/SLA, evidence grade, confidence, signed-run coverage, and authoritative links. Unresolved amounts are labeled exposure, never proven loss. | Reconcile to workbench/runs/suspense; root-cause exhaustiveness; provider completeness; time cutoff; permission and redaction tests. Rollback: existing workbench remains authoritative. | L / high |
| P1-05 | Reconciliation executive mode and instrumentation — Payments UX | P1-04 | Extend `/dashboard/finance/reconciliation`; total exposure, trust state, aging, top root causes, owner/SLA queue, and why-flagged evidence, with no new override capability. | Component/page/browser/a11y tests; read vs override/sign/export permissions; empty/stale/partial states; telemetry. Rollback: flag off executive mode. | M / high |
| P1-06 | `AccountantAdvisoryPortfolioReadModel` v1 — Accounting | P1-02, P1-04, P1-01 | One row per active grant with permission scope, currency, close readiness, blockers, reconciliation-exposure band, cash-runway band, evidence freshness, next action, and consent expiry. Counts/bands only at firm level. | Per-row grant recheck; revoke/expire tests; cross-tenant and cross-currency aggregation denial; stale-evidence behavior. Rollback: existing portfolio rows remain. | L / high |
| P1-07 | Accountant advisory UX and internal beta — Accounting UX | P1-06 | Extend `/dashboard/accounting/accountant-portfolio`; triage queue, mandate health, client evidence/action links, and privacy-bounded invite summary. Internal/design-partner beta only. | Role/grant/export tests; a11y and EN/FR; response-time budget; internal task-completion study. Rollback: flag off advisory fields and preserve current portfolio. | M / medium |
| P1-08 | Phase 1 product-value gate — Product + Finance/Accounting Controls | P1-03, P1-05, P1-07 | Signed usability, correctness, access, performance, evidence, and instrumentation packet. | Gate checklist in section 9; 2-week internal/design-partner observation. Rollback: keep individual screens internal until their failed criterion clears. | M / high |

### Phase 1 release order

1. Ship shared contracts internally.
2. Run Reconciliation and Cash work concurrently; Reconciliation is the lower-effort, higher-readiness early proof.
3. Start Accountant Advisory after stable reconciliation-exposure and cash-runway band contracts exist.
4. Release each screen behind an independent flag; do not couple rollback.
5. Do not start external acquisition or outbound pilot traffic in Phase 1.

## 6. Phase 2 — participation analytics and pilot readiness

Duration: weeks 23–32.  
Outcome: Stoquify can measure and safely operate external participation before inviting a real cohort.

| ID | Work package and owner | Dependencies | Deliverable and acceptance evidence | Verification and rollback | Effort / confidence |
|---|---|---|---|---|---|
| P2-01 | `ParticipationFunnelReadModel` cohorts — Growth Analytics | P1-08, P0-05 | Source/campaign/cohort funnel for issued, queued, delivered, clicked, accepted, activated, first trusted value, retained, expanded, revoked, with cohort threshold and event-quality status. | Source-event reconciliation, unique-human/unique-org denominators, late-event and replay tests, threshold suppression. Rollback: retain current aggregate all-time funnel. | L / medium |
| P2-02 | Delivery health and outbox operations — SRE + Communications | P0-08, P1-08 | Provider health, queue age, retry, dead-letter, suppression, template/version, channel, and destination-redaction metrics. Customer statement and accountant invite paths proven; supplier invitation path connected or pilot-disabled. | Sandbox/provider callbacks, idempotency, retry/dead-letter recovery, secret rotation, HTTPS, rate and failure drills. Rollback: channel/provider/tenant kill switches and queue quarantine. | XL / medium |
| P2-03 | First trusted value and retained activation — Product Analytics | P2-01, P1-08 | Versioned activation milestone tied to an evidence-backed action or trusted analytical review, plus 30/90-day retention eligibility and data-quality flags. | Trace sampled organizations from invite to trusted event; exclude test/seed/internal; anti-gaming review. Rollback: suppress invalid milestone and restate cohorts with version tag. | M / medium |
| P2-04 | Lane effectiveness and no-rekey metrics — Domain Owners | P2-01 | Accountant close-intervention, supplier proposal/acceptance, customer self-service, and partner activation metrics; supplier/customer actions measured as proposals/requests, not authoritative outcomes. | Domain-event tie-out; manual sample; denominator completeness; no raw PII in growth view. Rollback: disable affected lane metric. | M / medium |
| P2-05 | Privacy, consent, abuse, and retention controls — Privacy + Security | P0-08, P2-01, P2-02 | Purpose matrix, minimum cohort thresholds, aggregate-only growth view, suppression list, throttles, token expiry/revocation, data retention/deletion, DSAR/evidence handling, and abuse dashboards. | Privacy review, cross-tenant tests, rate-limit/spam simulation, revocation latency, retention deletion proof. Rollback: outbound off, token revoke, cohort suppression. | L / high |
| P2-06 | Support, incident, and participant operations — Support + SRE | P2-02, P2-05 | Support runbooks, SLAs, ownership, participant verification playbooks, provider incidents, consent disputes, wrong-recipient response, escalation, status communication, and staffing plan. | Tabletop and live non-production drills; ticket routing; on-call acknowledgement; evidence packet. Rollback: intake freeze and cohort pause. | M / high |
| P2-07 | End-to-end closed-pilot rehearsal — Release/QA | P2-01 through P2-06 | Synthetic/non-production rehearsal of accountant, supplier, customer, and partner lanes including denial, expiry, revocation, provider failure, duplicate submission, tenant isolation, support, and kill switch. | Browser/API/service tests and operator drill with signed evidence. No waived critical failures. Rollback: repeat rehearsal after remediation. | L / high |
| P2-08 | Phase 2 pilot-ready gate — Steering Group | P2-07 | Named real cohort, signed approvals, fresh environment evidence, support coverage, limits, metrics baseline, and rollback authority. | Gate checklist in section 9. Rollback: remain internal/non-production. | S / high |

## 7. Phase 3 — closed network pilot

Duration: weeks 33–46, with up to four additional weeks for cohort completion and decision.  
Outcome: prove whether governed participation improves activation, retention, operating efficiency, and trusted outcomes enough to justify a larger network program.

| ID | Work package and owner | Dependencies | Deliverable and acceptance evidence | Verification and rollback | Effort / confidence |
|---|---|---|---|---|---|
| P3-01 | Cohort governance and launch control — Pilot Director | P2-08 | Allowlisted cohort, lane limits, verified participant contacts, accepted terms/consent, channel limits, start/end dates, control group or pre-period baseline, stop thresholds, support rota, and named kill-switch authority. | Preflight packet signed by Product, Security, Privacy, SRE, Support, and domain control owner. Rollback: cancel launch without data migration. | M / high |
| P3-02 | Accountant client-network lane — Accounting + Partner Ops | P3-01 | Invite 3–5 verified accountants/firms and 10–20 consented client organizations; measure invite-to-activation, first trusted value, portfolio WAU, close/reconciliation intervention, mandate health, and retention. | Weekly grant audit; per-client access sampling; revocation SLA; growth metrics remain aggregate/banded. Rollback: revoke grants and disable invite channel/tenant cohort. | L / medium |
| P3-03 | Supplier participation lane — Purchasing + Supplier Ops | P3-01, P2-02 | Invite 20–40 suppliers for selected POs; measure delivery, acknowledgement, proposal latency, buyer acceptance, re-keying avoided, receipt cycle, and support. No public profile or rating. | Token and proposal integrity; buyer-review enforcement; duplicate/replay denial; notification health. Rollback: revoke tokens, disable new invites, continue internal PO workflow. | L / medium |
| P3-04 | Customer statement self-service lane — Receivables + Support | P3-01, P2-02 | Send consented statements to 100–300 recipients; measure delivery/open/self-service action/payment/dispute containment without marketing reuse. | Consent and destination sample; token expiry; wrong-recipient flow; delivery and support reconciliation. Rollback: revoke tokens, suppress destinations, disable channel. | L / medium |
| P3-05 | Implementation partner/template lane — Partner Ops | P3-01, P2-03 | Two verified implementation partners use approved onboarding templates to refer and activate allowlisted organizations; no commissions, lead marketplace, or public discovery. | Template/version audit; attribution quality; first-trusted-value proof; partner access has no cross-tenant data. Rollback: disable partner codes/templates. | M / low |
| P3-06 | Weekly network operations and learning — Pilot Director + Data | P3-02 through P3-05 | Weekly scorecard, delivery/abuse/support review, cohort quality, incidents, decisions, experiments, and corrective actions. Metrics are segmented by lane and cohort version. | Source reconciliation and steering review; all metric changes versioned. Rollback: pause affected lane when stop threshold is hit. | M / high |
| P3-07 | Exit, expand, revise, or stop decision — Executive Sponsor | Minimum 8 weeks observation after lane launch | Evidence-backed recommendation against value, safety, reliability, support cost, retention, referral, unit economics, and scope criteria. | Independent data/controls review; decision and residual-risk acceptance. Rollback: close cohort, revoke external access, retain internal analytical value. | M / high |

### Phase 3 is not a marketplace

The pilot has no public search, profile claims, star ratings, opaque ranking, cross-tenant scoring, lending, escrow, payment routing, commission settlement, public supplier graph, or self-service mass outreach. Every external relationship starts from a tenant-authorized invitation, is purpose-bound, auditable, revocable, rate-limited, and recoverable.

## 8. Timeline, capacity, milestones, and WIP

### 8.1 Base capacity model

| Role/capability | Effective allocation | Primary responsibility |
|---|---:|---|
| Product program lead | 1.0 FTE | Scope, priority, gates, outcomes |
| Engineering lead/architect | 1.0 FTE | contracts, boundaries, technical decisions |
| Backend/domain engineers | 2.0 FTE | read models, access, instrumentation, delivery |
| Frontend engineers | 2.0 FTE | three decision surfaces and robust states |
| Data/BI engineer | 1.0 FTE | registry, cohort, metric quality, scorecards |
| Product designer/accessibility | 0.75 FTE | command UX, research, accessibility |
| QA/release engineer | 1.0 FTE | contract, browser, isolation, release evidence |
| Security/privacy/SRE shared | 1.25 FTE combined | threat, consent, provider, operations |
| Support/partner operations | 0.5 FTE in Phase 2; 1.5 FTE in Phase 3 | rehearsal and cohort operations |

The plan assumes roughly 10 effective FTE in build phases. If capacity drops, preserve P0 controls, Reconciliation, Cash, and the accountant lane; defer partner and secondary pilot lanes rather than run more WIP.

### 8.2 Milestones

| Milestone | Target | Evidence |
|---|---:|---|
| M0 Program baseline accepted | end week 2 | P0-01 decision register |
| M1 Phase 0 foundation gate | end week 6 | signed P0-09 packet |
| M2 Shared analytics contract usable | end week 9 | P1-01 verification |
| M3 Reconciliation executive mode internal beta | weeks 13–15 | P1-04/P1-05 evidence |
| M4 13-week Cash Command internal beta | weeks 16–18 | P1-02/P1-03 evidence |
| M5 Accountant Advisory internal beta and Phase 1 gate | weeks 20–22 | P1-06 through P1-08 |
| M6 Participation and external-ops rehearsal complete | weeks 29–32 | P2-07/P2-08 |
| M7 Closed pilot launched | weeks 33–34 | P3-01 preflight |
| M8 Pilot exit decision | weeks 46–50 | P3-07 decision packet |

### 8.3 WIP and dependency policy

- Maximum two major build work packages in progress across the program.
- A source-domain owner must review any composed metric before UI implementation.
- UI cannot begin from mock semantics; the versioned read-model contract and robust states must exist first.
- External lane work cannot consume production credentials before P2-08.
- Failed critical gates block downstream work; schedule pressure is not a waiver.

## 9. Gates, verification, and rollback

### 9.1 Gate matrix

| Gate | Required evidence | Stop condition |
|---|---|---|
| G0 Foundation | semantic registry, access matrix, shared evidence contract, event taxonomy, delivery/consent/abuse plan | Critical metric has no owner; target surface has unexplained access finding; money/time semantics ambiguous. |
| G1 Product value | source tie-outs, tenant isolation, route/action access, robust states, a11y, EN/FR, performance, task completion, usable telemetry | Any cross-tenant leak; material tie-out failure; misleading loss/profit claim; screen adds unauthorized mutation. |
| G2 Pilot readiness | live-like provider proof, secrets/callbacks, delivery/retry/dead-letter, consent, retention, abuse, support, real cohort, kill-switch rehearsal | Missing production evidence, signed owner, support rota, revocation, or tested kill switch. |
| G3 Continue pilot | weekly thresholds for security, delivery, abuse, support, data quality, and participant value | Security/privacy incident; wrong-recipient severity breach; delivery below agreed floor for 2 reviews; unresolved critical support backlog; invalid metrics. |
| G4 Expand network | retained activation, repeat participation, support/unit economics, safety, verified demand | Only vanity referral growth; no retained value; support cost or abuse exceeds approved threshold; demand is one-sided. |

### 9.2 Verification strategy

Each work package must include:

- deterministic unit tests for formulas, boundaries, and redactions;
- contract tests against source-owned fixtures and missing/stale/partial data;
- tenant, role, entitlement, grant, token, export, and revocation denial tests;
- integration tie-outs to source facts and outbox/provider states;
- browser tests for first-viewport decisions, drill-throughs, empty/degraded/error states, EN/FR, keyboard use, visible focus, 200% zoom, and mobile alternatives;
- performance budgets for server read model and page render, measured on pilot-size data;
- observability for latency, errors, stale evidence, missing denominators, delivery, retries, dead letters, abuse, and support;
- signed domain-owner sample reconciliation before a gate passes.

Repository-level baseline commands for this planning run are recorded in section 16. Implementation releases must run the scoped test suites plus the current repository policy gates; historical success is not reusable as fresh production proof.

### 9.3 Rollback layers

1. Screen flag: disable a new analytical mode without removing the source workflow.
2. Metric suppression: block a defective KPI and display a reason/evidence status.
3. Channel flag: disable provider, channel, tenant, campaign, or lane independently.
4. Token/grant revocation: immediately remove external access.
5. Queue quarantine: stop dispatch and retain auditable outbox evidence for controlled recovery.
6. Cohort freeze: admit no new participants while existing obligations are safely closed.
7. Pilot shutdown: revoke access, suppress destinations, close support loop, export evidence, and preserve internal analytical screens.

Rollback must not delete or rewrite authoritative source records. Corrections are append-only or performed in the owning workflow.

## 10. RACI

Roles: Executive Sponsor (ES), Product Program Lead (PP), Engineering/BI Lead (EB), Finance Owner (FO), Payments Owner (PO), Accounting Owner (AO), Purchasing Owner (PU), Security/Privacy (SP), SRE/Communications (SR), QA/Accessibility (QA), Growth/Data (GD), Support/Partner Operations (SO).

| Decision/deliverable | A | R | C | I |
|---|---|---|---|---|
| Program scope, capacity, phase gates | ES | PP | all owners | delivery teams |
| Money/time and cash metric semantics | FO | EB | PO, AO, PU, GD | PP, QA |
| Reconciliation exposure semantics | PO | Payments team | FO, AO, EB | PP, QA |
| Accountant access and portfolio policy | AO | Accounting team | SP, EB, GD | PP, SO |
| Participation taxonomy and metrics | PP | GD | AO, PU, SP, SR | ES, QA, SO |
| RBAC, entitlement, token, privacy controls | SP | EB/domain teams | QA, AO, PO, PU | PP, ES |
| Provider/outbox operations | SR | Communications/SRE | SP, QA, domain owners | PP, SO |
| Accessibility and release evidence | QA | feature teams | Design, SP, domain owners | PP, ES |
| Pilot cohort and daily operations | PP | SO | SP, SR, AO, PU, GD | ES, QA |
| Pilot exit/expansion decision | ES | PP + GD | all control/domain owners | participants and teams |

No person may approve both a high-risk external-control exception and the evidence that closes it. Payments, accounting, purchasing, and privacy owners retain veto authority over claims and controls in their domains.

## 11. Packaging and commercial model

Phase 1 packaging should reinforce existing source modules:

- Cash Forecast mode: Finance/Analytics value layer, conditional on source entitlements; no separate forecast product until repeat use is proven.
- Reconciliation executive mode: part of Payment Reconciliation; advanced evidence/export retains existing permission and entitlement boundaries.
- Accountant Advisory: accounting-firm workspace/add-on priced initially by active consented client band, not data volume or opaque score.
- External collaboration: included controlled invitations with fair-use limits during pilot; no transaction take rate.
- Implementation partners: approved templates and attribution only; no commission marketplace in Phase 3.

Packaging experiments may compare accountant client bands, bundled Finance + Reconciliation, and assisted onboarding. They must not withhold evidence needed for safe accounting or charge recipients to access their own statement. Marketplace take rates, sponsored ranking, public lead sales, lending referral fees, and supplier pay-to-play are rejected for this horizon.

## 12. Change management and support readiness

- Recruit design partners in Phase 1, but keep data internal until external gates pass.
- Train owners/controllers on evidence grade, source coverage, exposure-versus-loss, and forecast assumptions.
- Train accountants on grant scope, expiry, revocation, exports, and per-client boundaries.
- Give buyers a clear explanation that supplier responses are proposals requiring review.
- Give recipients plain-language consent, expiry, wrong-recipient, dispute, and support routes.
- Publish operator runbooks, escalation paths, status communication templates, and decision authority before the pilot.
- Maintain a weekly change log for metric versions, cohort rules, templates, provider configuration, incidents, and experiment decisions.

Support readiness requires lane-specific ticket categories, response targets, a named duty owner, wrong-recipient severity handling, provider escalation contacts, token/grant revocation tools, audit access, and a rehearsed participant-notification process.

## 13. Risk register

| ID | Risk | Preventive control | Leading indicator / response |
|---|---|---|---|
| R1 | Currency/timezone/period errors misstate analytics | P0-03 contract and boundary tests | Tie-out or cutoff failures block KPI/release. |
| R2 | Forecast double counts orders, invoices, payroll, or cash | Source precedence and line-level deduplication | Coverage >100%, duplicate lineage, or unexplained bucket variance triggers suppression. |
| R3 | Exposure is presented as proven loss | Metric vocabulary and UI copy gate | Any unsupported loss claim blocks release. |
| R4 | Cross-tenant or expired-grant disclosure | Server-side tenant/grant checks and aggregate bands | Any isolation failure shuts affected surface/lane. |
| R5 | Provider delivery is incomplete or falsely counted | Outbox/provider state reconciliation | Delivery denominator gaps or stale callbacks pause acquisition. |
| R6 | Spam, abuse, or wrong-recipient harm | Allowlist, consent, throttles, suppression, expiry | Complaint/abuse threshold pauses tenant/channel. |
| R7 | Surface inventory creates false confidence | Reconcile scanner with live wrapper/action/API truth | Unexplained pilot-scope finding blocks G0/G2. |
| R8 | More dashboards increase fragmentation | P0-02 ownership and consolidation map | Duplicate job/KPI lacks canonical owner; block new route. |
| R9 | Pilot overwhelms support | cohort caps, staffing, runbooks, SLA | Critical backlog or response-time breach freezes intake. |
| R10 | Referral metrics are gamed or polluted | unique source keys, seed/test exclusion, trusted-value milestone | Abnormal replay/quality flags suppress cohort. |
| R11 | Tenant-owned suppliers are mistaken for shared identities | invitation-scoped identity and explicit copy | No cross-tenant merge, public profile, or rating. |
| R12 | Marketplace scope creep bypasses controls | explicit rejected scope and executive change control | Any public discovery/payment/reputation proposal requires a new program. |

## 14. Metrics tree and success criteria

North star: **monthly organizations completing at least one evidence-backed operating decision and one trusted external-participation outcome, without a critical control breach**.

```text
Trusted operating value
├── Decision value
│   ├── cash forecast reviews and deficit actions
│   ├── exception-free close / reconciliation resolution time
│   └── accountant portfolio interventions and close readiness
├── Participation growth
│   ├── delivered → accepted → activated
│   ├── time to first trusted value
│   ├── 30/90-day retained activation
│   └── activated organizations per referring organization (bounded K-factor)
├── Efficiency
│   ├── no-rekey supplier/customer actions
│   ├── self-service containment
│   └── support contacts and cost per activated organization
└── Trust guardrails
    ├── source/evidence coverage and freshness
    ├── tenant/access/consent failures
    ├── delivery/retry/dead-letter health
    └── abuse, complaints, incidents, and rollback time
```

Provisional Phase 3 decision thresholds must be baselined in Phase 1/2 and approved at P3-01. Suggested starting hypotheses, not commitments:

- at least 60% of activated pilot organizations reach first trusted value within 14 days;
- at least 50% of activated organizations remain eligible and active at day 30;
- accountant portfolio users review or action at least 50% of at-risk client rows weekly;
- supplier digital response reduces median acknowledgement/re-keying time by at least 25% versus pilot baseline;
- statement self-service contains at least 20% of eligible routine requests;
- delivery state completeness is at least 99% for dispatched items, excluding explicitly suppressed destinations;
- zero critical tenant-isolation, consent, or wrong-recipient incidents;
- support volume and cost stay within the capacity approved at P3-01.

Do not optimize K-factor before trusted activation and retention are healthy. Referral volume without retained value is a negative signal.

## 15. First 30/60/90 days

### Days 0–30

- Complete P0-01 and P0-02.
- Approve money/time/period contract draft and metric-registry schema.
- Inventory every target route, action, export, API, entitlement, grant, and token boundary.
- Freeze exposure/loss and forecast vocabulary.
- Name provider, privacy, support, and kill-switch owners.
- Establish current baselines for screen usage, reconciliation resolution, portfolio activity, referrals, delivery quality, and support.

### Days 31–60

- Pass P0-09 or remain in remediation.
- Implement P1-01 behind internal flags.
- Start P1-04/P1-05 and P1-02 in parallel.
- Test organization currency/timezone/period edge cases and source tie-outs.
- Run first controller/owner task-completion studies on internal fixtures.
- No outbound production pilot traffic.

### Days 61–90

- Complete the Reconciliation internal beta and the first Cash read-model vertical slice.
- Begin Cash UX and validate forecast coverage/double-count controls.
- Freeze the band contracts needed by Accountant Advisory.
- Draft Phase 2 event, provider, privacy, and support evidence templates.
- Reforecast the 42–50 week plan from actual throughput and unresolved gates.

Phase 3 is not a 90-day target. A safe external pilot begins only after Phase 1 value and Phase 2 operational gates pass.

## 16. Planning-run verification record

Performed on 2026-08-30 without changing application code or database schema:

- `git status --short`: confirmed a dirty working tree with pre-existing user changes; this plan did not revert them.
- repository file and keyword inventories: confirmed target routes, services, components, actions, schema records, strategy artifacts, and graph reports.
- `npm run prisma:validate`: passed; Prisma schema is valid.
- `npm run module:surface:inventory`: passed after running outside the restricted sandbox because the script creates a temporary file; refreshed 414 records, including 371 mapped, 5 unmapped, 79 missing-permission, 77 dashboard-only-risk, 293 enforcement-candidate, and 6 review-required classifications.
- full `npm run policy:gates`: not rerun for this planning-only artifact. The recent repository evidence remains the relevant release baseline and is not treated as production certification.
- companion JSON registry: must parse successfully before handoff.

## 17. Final prioritization

### Do now

- Phase 0 semantic, ownership, access, evidence, and external-control closure.
- Shared analytical contract.
- Reconciliation Leakage and Cash Forecast vertical slices.
- Baseline product, control, and support metrics.

### Start only after the named gate

- Accountant Advisory after cash/reconciliation bands stabilize.
- Participation cohorts after Phase 1 value evidence.
- Live provider and external-lane rehearsal after delivery/privacy design closure.
- Closed real cohort after P2-08.

### Defer

- governed saved cash scenarios and approvals;
- broader inventory, AP, receivables, margin, and branch analytical screens;
- verified partner directory or integration catalog;
- multi-country or multi-channel pilot expansion;
- cross-tenant benchmarking and shared counterparty identity.

### Reject for Phases 0–3

- open marketplace or public discovery;
- public star ratings, supplier scores, or opaque rankings;
- lending, credit scoring, escrow, marketplace payouts, or payment routing;
- automatic supplier/customer writes into ledgers, stock, POs, AP, journals, or bank truth;
- unconsented mass outreach, contact-list growth analytics, or marketing reuse of transactional consent;
- autonomous financial recommendations or claims unsupported by source evidence.

The successful outcome of this roadmap is not “a marketplace.” It is a trusted analytical operating layer that causes accountants, suppliers, customers, partners, and organizations to participate repeatedly because each invitation resolves a real workflow with less re-keying and more evidence. Only that behavior can justify a later, separately governed marketplace decision.
