# Change Management, Support, and Training Plan

**Program:** STQ-UIUX-REM-2026-08-06  
**Accountable owner:** Change and Adoption Lead  
**Objective:** make the remediated system understandable, adoptable, supportable, and governable without weakening financial, access, privacy, or accessibility controls.

## 1. Change outcomes

The program is successful only when users can recognize current truth, complete their primary work, understand unavailable/locked/partial states, recover from errors, and trust exports and financial presentation. Training is not a compensating control for a misleading interface. Documentation must describe the certified system, not teach workarounds for unresolved defects.

Target outcomes:

- primary roles complete Tier-1 tasks without privileged support intervention;
- users can distinguish `empty`, `filtered_empty`, `partial`, `stale`, `error`, `permission_denied`, `module_locked`, and `not_configured`;
- support can explain a capability decision using a correlation/policy version without exposing sensitive policy internals;
- finance, inventory, AP, payroll, and POS operators can reconcile screen, action, export, and source evidence;
- EN/FR guidance uses the same controlled glossary and message semantics as the product;
- release communications state scope, changed routes, compatibility/alias behavior, and rollback status;
- legacy routes, theme islands, and workflow versions are retired with measured adoption, not by date alone.

## 2. Stakeholder map

| Audience | What changes | Primary concern | Engagement owner | Required artifact |
|---|---|---|---|---|
| Owners/administrators | Role home, modules, users, settings, onboarding | Purchased capability, control, organization setup | Product + CSM | Owner change brief and admin lab |
| Cashiers/store managers | POS presentation, offline/replay states | Speed, duplicate transactions, recovery | POS Lead | Task card and incident/replay guide |
| Inventory controllers | KPI truth, items, movements, transfers, loss | Scope, thresholds, partial data | Inventory Lead | Reconciliation lab and state guide |
| Purchasers/AP clerks | Suppliers, POs, receipt/invoice/payable controls | Approval status and evidence | Purchasing/AP Lead | End-to-end scenario lab |
| Accountants/external accountants | Finance, reconciliation, journal/close, export | Currency, as-of, provenance, evidence integrity | Accounting Controls | Control/evidence handbook |
| Payroll operators/HR/managers/employees | Command center, readiness, payslips, scoped self-service | Privacy, readiness, declaration/payment truth | Payroll + Privacy | Role-separated guides |
| Security admins | Permission/module/capability model | Server/UI parity and audit decisions | Security Lead | Capability administration lab |
| Support | New states, aliases, flags, correlation IDs, known issues | Diagnosis and recovery | Support Readiness Lead | Decision tree, KB, escalation map |
| Sales/CSM/implementation | Package visibility and onboarding | Promise consistency and adoption | Commercial Product | Package/capability narrative |
| Engineering/QE/SRE | Contracts, manifest, gates, telemetry, rollback | Reproducibility and operational safety | Program Director | Engineering playbook and drills |
| Accessibility/localization reviewers | Semantic primitives and EN/FR behavior | WCAG and language quality | Validation Director | Validation protocols and glossary |
| Leadership/release board | Risk, timeline, evidence, adoption | Readiness and residual risk | Program Director | Executive scorecard/final report |

## 3. Communication cadence

| Moment | Audience | Content | Channel/owner | Proof of receipt |
|---|---|---|---|---|
| Gate 0 approval | All workstream leads | Scope, contracts, ADRs, RACI, non-goals, evidence rules | Program kickoff / Program Director | Attendance and decision log |
| Two-week execution cadence | Leads, support, SRE, control owners | Completed/blocked WPs, evidence health, dependency/risk changes | Program review | Updated roadmap/register |
| Before each module pilot | Pilot users, support, CSM, SRE | What changes, eligibility, tasks, safeguards, feedback, rollback | Pilot briefing | Participant acknowledgement |
| 48 h before cohort promotion | Release board and support | Evidence summary, cohort, guardrails, on-call, rollback owner | Release notice | Go/no-go record |
| During heightened monitoring | Support, SRE, owners | Health, incidents, decision timing | Rollout channel/status board | Time-stamped updates |
| After cohort | Pilot/users/leads | Outcome, defects, changes, next cohort | Cohort review | Accepted actions |
| Deprecation announcement | Users/support/docs/analytics | Canonical route/workflow, redirect period, retirement trigger | In-product + email/CSM | Alias traffic and acknowledgement |
| Full release | All affected users | Outcome-oriented changes, support links, accessibility/help | Release notes/in-product | Delivery and adoption metrics |
| Post-release 7/30 days | Leadership and workstream owners | SLOs, task success, adoption, support, residual risk | Benefits review | Signed benefit report |

No communication may claim “enterprise-grade,” “accessible,” “accurate,” or “certified” beyond the exact routes, roles, packages, states, locales, browsers, and evidence recorded in the certification manifest.

## 4. Role-based curriculum

| Module | Learners | Duration | Learning objectives | Practice and assessment | Release prerequisite |
|---|---|---:|---|---|---|
| T-00 State and trust vocabulary | All operators/support | 20 min | Interpret truth, partial/stale/error, locked/denied/not-configured, timestamps and provenance | Classify 10 realistic states; 90% score | All pilots |
| T-01 Owner cockpit and modules | Owners/admins/CSM | 45 min | Navigate capability-derived home, understand packages, configure organization, find audit/support evidence | Complete module enable/disable simulation and three priority tasks | B-02/A-08 rollout |
| T-02 Inventory truth | Inventory/accounting/support | 60 min | Apply scope/filters, interpret KPI provenance, reconcile totals, use thresholds and exports | Reconcile supplied fixture for 10/25/50/100 page sizes and partial failure | C-01 rollout |
| T-03 Purchasing and AP | Purchaser/AP/accountant | 75 min | Progress supplier/PO/receipt/invoice/payable states, approvals, exceptions and exports | Complete controlled happy/failure paths | C-02 rollout |
| T-04 Finance, reconciliation and close | Accountants/external accountants/support | 90 min | Interpret as-of/currency/evidence, resolve exceptions, export, close safely | Tie out fixture and recover stale/partial state | C-03 rollout |
| T-05 HRIS/payroll and privacy | Payroll/HR/manager/employee/support | 75 min role split | Understand readiness, privacy scope, payroll evidence, payslip/self-service boundaries | Role-specific scenarios with redacted fixture | C-04 rollout |
| T-06 Settings/security controls | Owner/security admin/support | 60 min | Explain capability decisions, user/permission actions, audited reason dialogs and recovery | Diagnose allow/locked/denied/not-configured fixtures | C-05/A-08 rollout |
| T-07 POS online/offline | Cashier/store manager/support | 60 min | Complete sale and supported reversals, recognize offline/replay/conflict, avoid duplicates | Desktop/tablet simulation and replay drill | C-06 rollout |
| T-08 Accessible operation | Support/trainers/design/engineering | 45 min | Keyboard operation, focus, error announcements, zoom/reflow and accessible support | Keyboard-only task and accessibility issue triage | A-06 and all C rollouts |
| T-09 Release and rollback | SRE/QE/support/release/domain leads | 90 min | Read evidence, manage cohorts, respond to triggers, execute rollback and communications | Timed tabletop plus technical drill | D-04 |

Training content is produced from certified fixtures and screenshots. Any product change invalidating a task script also invalidates the training version until refreshed.

## 5. Support readiness package

Support must receive and pass a readiness review containing:

1. canonical route/alias directory with retirement dates;
2. role/package/capability explanation and safe customer-facing wording;
3. route-state decision tree and recovery actions;
4. correlation ID, policy version, organization/location scope, `asOf`, and source-status lookup steps;
5. export artifact lookup and expiry behavior;
6. accessibility accommodation and escalation route;
7. EN/FR controlled glossary and screenshots;
8. current flags/cohorts, known issues, status page language, and rollback state;
9. data/privacy boundaries: what support may view, request, record, or redact; and
10. severity classification, on-call contacts, response targets, and evidence preservation.

### Support decision tree

| User report | First distinction | Evidence to collect | Safe response | Escalate to |
|---|---|---|---|---|
| “No data” | Empty vs filtered-empty vs partial/error | Route, filters, as-of, sourceStatus, correlation ID | Do not tell user the total is zero until completeness is confirmed | Domain + SRE |
| “Wrong money” | Display context vs transaction currency vs data | Organization, locale, currency, value, screen/export, timestamp | Stop financial decision if ambiguity remains | I18n + Accounting Controls |
| “Feature missing/blocked” | Hidden/locked/denied/not-configured/suspended | Role, package, capability decision/reason, policy version | Explain state; never change permission/package without authorized workflow | Entitlements/Security/CSM |
| “Export completed but no file” | Job running/failed/expired vs false completion | Correlation/artifact ID, filters, row count, timestamp | Do not assert completion without artifact evidence | App Platform/Domain |
| “Cannot complete with keyboard/reader” | Critical barrier vs usability issue | Route, browser, AT, viewport/zoom, step, recording if consented | Offer accessible supported path and escalate immediately | Accessibility Lead |
| “Link changed/404” | Alias expiry vs route/capability issue | Old URL, locale/query, referral, role/package | Use canonical link; preserve incident evidence | Web Platform |
| “POS duplicated/lost sale” | Pending/offline/replay/conflict | Transaction/replay/idempotency IDs, device/location, network state | Stop unsafe retry; follow POS incident guide | POS + Incident Commander |

## 6. Knowledge-base and documentation backlog

| ID | Artifact | Owner | Dependency | Acceptance |
|---|---|---|---|---|
| KB-01 | State vocabulary and recovery | Design Systems + Support | B-03 | Matches implemented copy/state contract; EN/FR |
| KB-02 | Capability/package FAQ | Entitlements + Commercial Product | A-08/B-02 | UI/server semantics and escalation correct |
| KB-03 | Currency, locale, time zone and multi-currency explanation | I18n + Accounting Controls | A-03/A-04 | Screen/export/transaction distinction approved |
| KB-04 | Inventory KPI scope/provenance | Inventory | A-01 | Reconciliation example and partial-state warning |
| KB-05 | Export and artifact lifecycle | App Platform | A-05 | Metadata, expiry, retry and privacy covered |
| KB-06 | Accessibility help and supported AT | Accessibility | A-06/B-06 | Tested steps, no unsupported certification claim |
| KB-07 | Canonical route migration | Web Platform | B-01 | Alias period, bookmarks and docs updated |
| KB-08 | Module-specific quick starts | Each C domain owner | C-01..C-06 | Validated against certification fixtures |
| KB-09 | Incident/status macros | Support + SRE | D-03/D-04 | Severity-safe, transparent, localized |
| KB-10 | Release evidence and known limitations | Release + Assurance | D-05 | Exact scope and residual risk disclosed |

## 7. Adoption and benefit measures

| Measure | Baseline owner | Target-setting point | Guardrail |
|---|---|---|---|
| Primary task completion by role | Product Analytics | Gate 0 baseline; target approved before pilot | No gain accompanied by control/accessibility regression |
| Time to first value/onboarding completion | Growth Product | B-07 design approval | Track device, locale and role; no dark patterns |
| Denial-to-recovery and module-lock comprehension | Entitlements/Product | A-08/B-02 pilot | Unauthorized access remains zero |
| Export artifact success/download | App Platform | A-05 pilot | False success zero; privacy incidents zero |
| Inventory reconciliation exception rate | Inventory/Accounting | A-01 shadow period | Material mismatch zero |
| Accessibility task success | Accessibility | A-06 baseline | Critical/serious blockers zero |
| Support contacts per active org and repeat contact rate | Support Ops | Before each module cohort | Severity and cohort normalized |
| Route alias traffic | Web Analytics | B-01 activation | Retire only below approved threshold |
| Performance/error SLO | SRE | D-03 | Defined per risk tier and representative data |
| Training completion and scenario score | Change Lead | Before pilot | Required operators/support meet threshold |

Metrics require privacy review, minimal collection, retention limits, and role/tenant-safe aggregation. “No support tickets” is not evidence of usability without adoption and task data.

## 8. Deprecation policy

A legacy route, component path, formatter, theme island, action implementation, or onboarding version may be removed only when:

- its replacement is certified for the intended dimensions;
- internal links, support content, analytics, training and customer documentation are migrated;
- alias/legacy-path traffic is below the approved threshold for two measurement windows;
- in-progress state and stored data remain readable;
- rollback window has elapsed without a material incident;
- code ownership and flag/compatibility cleanup are assigned; and
- the Release Director and relevant domain/control owner approve removal.

## 9. Change-control evidence

For each cohort, publish a compact change record containing scope, affected trace IDs and WPs, user-visible delta, canonical routes, training/KB versions, certification evidence IDs, baseline/guardrail metrics, cohort selection, start/end time, support/on-call roster, incidents, adoption outcome, rollback readiness/result, and promotion decision. D-05 rejects a final readiness pack with missing cohort records.
