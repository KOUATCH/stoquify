# Verification and Validation Matrix

**Applies to:** STQ-UIUX-REM-2026-08-06  
**Rule:** verification proves the implemented system meets a specified contract; validation proves the resulting experience is usable, trustworthy, and operationally acceptable for its intended role. Neither substitutes for the other.

## 1. Evidence rules

- Every run records commit SHA, environment, database/fixture version, browser/device, locale, currency, theme, role, package, timestamp, command, exit code, and artifact paths.
- Tier-0 and Tier-1 evidence expires after 14 days or any relevant code/configuration change, whichever comes first. Tier-2 evidence expires after 30 days or a relevant change.
- Screenshots without route, role, state, locale, currency, theme, and viewport metadata are illustrative, not certifying evidence.
- A retry must preserve the failed evidence and state why the retry is legitimate. Retrying until green without root-cause classification invalidates the run.
- A waived test is a failed gate until the named authority records scope, expiry, compensating control, rollback trigger, and follow-up owner.
- Production telemetry can confirm safety and adoption; it cannot retroactively replace a missing pre-release control test.

## 2. Existing command baseline

| Command | Status | Purpose | Required evidence | Blocking scope |
|---|---|---|---|---|
| `npm run typecheck` | Existing; passed 2026-08-06 | Type-system integrity | Full log and exit 0 | Every PR and phase gate |
| `npm run lint` | Existing; not rerun in this planning task | Current ESLint policy | Full log and exit 0 | Every PR and phase gate |
| `npm test -- --runInBand` | Existing; full suite not rerun | Unit/integration regression | JUnit/log, failed-test details, coverage where applicable | Phase and release candidate |
| `npm run build:app` | Existing; not rerun | Production application build | Build log, bundle output, warnings disposition | Phase and release candidate |
| `npm run policy:gates` | Existing; not rerun | Current control-plane gates | Generated readiness artifacts and log | Phase and release candidate |
| `npm run verify:repo` | Existing; not rerun | Prisma, types, lint, policy, build, tests | Consolidated immutable run record | D-01 |
| `npm run verify:release` | Existing; not rerun | Production-oriented release evidence | Consolidated immutable run record | D-05 |
| `npm run module:surface:inventory` | Existing; current inventory revalidated | Module-surface current truth | Markdown/JSON inventory and count delta | G0-01, A-08 |
| `npm run module:surface:fail` | Existing | No regression against approved module baseline | Inventory output and exit 0 | A-08 onward |
| `npm run role:cockpit:gate` | Existing | Role cockpit readiness | Markdown/JSON output | B-02 onward |
| `npm run report:trust:export:gate` | Existing | Export/report truth policy | Markdown/JSON output | A-05 onward |
| `npm run workflow:assurance:runtime-check` | Existing | Workflow assurance runtime table | Log and exit 0 | C/D gates |
| `npm run ui:smoke:public` | Existing; passed 6/6 on 2026-08-06 | EN/FR public route reachability and screenshots | Six screenshot artifacts and JSON/log | A-06 onward; not accessibility certification |
| `npm run test:e2e` | Existing; not rerun | Current Playwright projects | HTML/JUnit report, trace/video on failure | D-01 |

The focused 2026-08-06 planning baseline also passed 6 Jest suites / 45 tests covering module entitlement, sidebar, dashboard route state, operating truth, UI route-smoke policy, and public landing content. This is baseline evidence only; it does not certify the proposed contracts.

## 3. Required gates to implement

Names below are reserved execution commands. They are **planned** until their work package adds them to `package.json` and publishes a schema/versioned artifact.

| Reserved command | Owner WP | Contract | Inputs | Pass condition | Failure owner | Retry/rollback policy |
|---|---|---|---|---|---|---|
| `npm run uiux:baseline:gate` | G0-01 | Current-truth ledger | source scans, graph manifest, inventory | Counts classified; evidence fresh; no unexplained drift | Program Director | Correct inventory; never change thresholds to hide drift |
| `npm run uiux:fixtures:gate` | G0-03 | Deterministic certification inputs | seeded tenants, roles, packages, locales, currencies, states | Repeatable hashes and tenant isolation | QE Lead | Rebuild fixture environment; preserve failed seed logs |
| `npm run inventory:summary:contract` | A-01 | CT-01 | inventory summary service/read model | Page-size invariant; reorder thresholds; as-of/scope/provenance; reconciliation exact | Inventory Lead | Disable new read path; show degraded state |
| `npm run read-state:contract` | A-02 | CT-02 | service results and page-state adapters | No unavailable/failed read renders as genuine empty/zero | Platform Architecture | Compatibility adapter retaining error semantics |
| `npm run display-context:gate` | A-03/A-04 | CT-03 | server context, UI, notifications, exports | EN/FR × XAF/XOF/EUR/USD correct; no unapproved literals/defaults | I18n Lead | Roll back surface flag; no USD fallback |
| `npm run action-truth:gate` | A-05 | CT-06 | control registry and action handlers | Every enabled control has executable outcome; export metadata complete | App Platform | Disable affected action with reason |
| `npm run accessibility:public-auth` | A-06/A-07 | CT-07 | public/auth route manifest | Zero critical/serious axe; keyboard complete; form errors associated; reflow pass | Accessibility Lead | Block rollout; revert layout only with semantic fixes intact |
| `npm run capability:parity:gate` | A-08 | CT-04 | route/action registry and package-role fixtures | UI visibility and server authorization agree for every protected fixture | Entitlements Lead | Return policy cohort to observe |
| `npm run route-registry:gate` | B-01 | CT-05 | Next route tree and typed registry | Every route classified; aliases redirect; no duplicate implementation | Web Platform | Restore alias redirect, not duplicate surface |
| `npm run route-state:gate` | B-03 | CT-02/05/07 | canonical route/state manifest | Required states declared, rendered, announced and correlated | Design Systems | Compatibility renderer preserving state truth |
| `npm run theme-contract:gate` | B-04/B-05 | CT-08 | tokens, CSS, screenshots | No new unapproved literals/islands; theme/contrast matrix passes | Design Systems | Token compatibility alias with expiry |
| `npm run onboarding:contract` | B-07 | CT-09 | signup/onboarding state machine | Minimal signup, resumability, idempotency, role-aware steps | Growth Product | Retain persisted progress across version fallback |
| `npm run uiux:manifest:gate` | B-06 | CT-10 | `05_...MANIFEST.json`, route registry, fixtures | Schema valid; every canonical protected route covered by risk policy | QE Lead | Block change/release until coverage is restored |
| `npm run uiux:changed-route:gate` | B-06 | CT-10 | git diff and manifest | Every changed Tier-0/1 route has required functional/a11y/visual evidence | QE Lead | No retry without cause; block merge |
| `npm run uiux:copy:gate` | C-00 | CT-03/08 | message catalog and UI source | No new unapproved literal copy; missing keys zero; pseudo-locale pass | Localization Lead | Revert copy migration or add governed key |
| `npm run uiux:dialog:gate` | C-00 | CT-06/07 | source and component tests | No native audited prompt/confirm; focus/reason/idempotency pass | Accessibility Lead | Use shared controlled dialog |
| `npm run uiux:image:gate` | C-00 | CT-08 | interactive image inventory | Dimensions/aspect/alt/offline policy complete; CLS within budget | Frontend Platform | Use known-dimension fallback |
| `npm run uiux:module:certify -- --module <id>` | C-01..C-06 | CT-01..10 as applicable | module route subset and fixtures | Module DoD, route matrix, domain controls and screenshots pass | Domain Lead | Roll back module cohort/flag |
| `npm run uiux:performance:gate` | D-03 | Performance SLO | production build and representative data | Approved route/bundle/interaction budgets, no material regression | SRE Lead | Roll back cohort; profile before retry |
| `npm run uiux:release:gate` | D-01/D-05 | All | all evidence indexes and manifests | No open P0, all Tier-0/1 evidence fresh, signoffs and rollback ready | Independent Assurance | Release denied or cohort reversed |

## 4. Work-package verification matrix

| Work package | Required automated verification | Required human validation | Evidence owner | Blocking gate |
|---|---|---|---|---|
| G0-01 | Baseline counts, graph freshness, module inventory, finding delta | Audit author and architecture review discrepancies | Program Director | Gate 0 |
| G0-02 | ADR completeness and unresolved-decision gate | Product/control/security/design owner signatures | Principal Architect | Gate 0 |
| G0-03 | Fixture determinism, isolation, reset, state coverage | Domain owner verifies realistic scenarios without production data | QE Lead | Gate 0 |
| A-01 | CT-01 contracts, reconciliation, tenant/location isolation, failure injection | Inventory controller and accountant tie-out | Inventory Lead | A-P0 |
| A-02 | Completeness taxonomy contract and correlation propagation | Support recovery and control interpretation | Platform Architecture | A-P0 |
| A-03/A-04 | Context resolution, format matrix, hard-code ratchet | EN/FR linguistic and accounting display review | I18n Lead | A-P0 |
| A-05 | Action inventory, export artifact, retry/idempotency, audit trail | Download/evidence inspection | App Platform | A-P0 |
| A-06/A-07 | axe, keyboard, responsive/zoom, auth error semantics, funnel E2E | NVDA/VoiceOver, low vision, cognitive/mobile walkthrough | Accessibility Lead | A-Accessibility |
| A-08 | Capability registry, role/package matrix, deep link/action parity | Security, commercial packaging, support review | Entitlements Lead | A-Entitlement |
| A-09 | Redirect and action-disable assertions | Support link/action inspection | Web Platform | Phase A exit |
| B-01 | Route inventory/registry parity and alias lifecycle | Support/analytics/documentation impact review | Web Platform | B-IA |
| B-02 | Shortcut/nav capability snapshots and task ranking tests | Each primary persona reaches assigned work | Product Experience | B-Navigation |
| B-03 | State registry and accessible renderer tests | Support/accessibility recovery walkthrough | Design Systems | B-State |
| B-04/B-05 | Token ratchet, light/dark/system screenshots, contrast | Design + accessibility review at representative surfaces | Design Systems | B-Theme |
| B-06 | Manifest schema, coverage, fixtures, trace/video capture | QE reviews reproducibility and flake | QE Lead | Phase B exit |
| B-07 | Resume, idempotency, state migration, analytics | First-value usability study | Growth Product | B-Onboarding |
| C-00 | Grid/dialog/image/copy component and source gates | Cross-domain primitive usability | Design Systems | C-Shared |
| C-01 | Inventory module certification | Inventory/accounting workflows | Inventory Lead | C-Inventory |
| C-02 | Purchasing/AP certification, three-way-match controls | Purchaser/AP workflow and control review | Purchasing/AP Lead | C-Purchasing |
| C-03 | Finance/reconciliation/close certification | Accountant/external accountant close walkthrough | Accounting Controls | C-Finance |
| C-04 | HR/payroll certification, privacy boundaries | Payroll operator/employee/manager journeys | Payroll Lead + Privacy | C-Payroll |
| C-05 | Settings/admin certification and high-risk audit actions | Security/admin/support workflows | Administration Lead | C-Settings |
| C-06 | POS desktop/tablet, offline/replay, cashier safety | Cashier/store-manager pilot | POS Lead | C-POS |
| C-07 | Characterization parity, graph refresh, bundle boundaries | Maintainer/domain review | Principal Frontend Engineer | Phase C exit |
| D-01 | `verify:repo`, policy, build, unit, E2E, manifest, changed-route gates | QE evidence audit | QE Lead | D-Automated |
| D-02 | Validation protocols below | Independent role/domain/accessibility/localization signoffs | Validation Director | D-Human |
| D-03 | Production build profiling, SLO, telemetry/alert tests | SRE operational review | SRE Lead | D-Operational |
| D-04 | Cohort health gates and rollback drills | Support readiness and pilot acceptance | Release Director | D-Rollout |
| D-05 | Evidence index integrity and open-risk check | Independent assurance decision | Assurance Lead | Final release |

## 5. Human validation protocols

| Protocol | Participants | Minimum scenarios | Acceptance | Evidence |
|---|---|---|---|---|
| V-01 Accessibility | Accessibility specialist plus keyboard-only, NVDA/Windows and VoiceOver/macOS testers | Signup, login/error recovery, dashboard navigation, one CRUD form, one dense grid, one dialog, one export, one denial/partial state | Task completion without inaccessible workaround; WCAG 2.2 AA issues classified; zero open critical/serious | Script, recording/notes, issue links, signed result |
| V-02 Localization | Native/professional French reviewer plus domain SME | Public/auth, currency/date/number, state copy, finance/inventory/payroll terms, exports/notifications, pseudo-locale truncation | Meaning preserved, OHADA terminology approved, no clipping or ambiguous money | Glossary delta, screenshot set, signed checklist |
| V-03 Inventory controls | Inventory controller and accountant | Filtered KPI tie-out, pagination invariance, location scope, low-stock policy, failed/partial reads, export | Screen/API/export reconcile to source dataset and provenance | Reconciliation workbook/log and signoff |
| V-04 Purchasing/AP | Purchaser and AP clerk | Supplier-to-PO-to-receipt-to-invoice, approval denial, export | Status/control/action states truthful and recoverable | Scenario transcript and signoff |
| V-05 Finance/close | Accountant and external accountant | Payment, reconciliation exception, journal/close, stale/partial evidence, export | Evidence chain complete; role/privacy boundary correct | Close packet reference and signoff |
| V-06 Payroll/privacy | Payroll operator, employee, manager, privacy reviewer | Readiness, payroll run evidence, payslip self-service, manager scope, denial | Personal data minimized; scopes correct; outputs reconcile | Redacted evidence pack and signoff |
| V-07 POS | Cashier and store manager | Sale, void/return if supported, offline transition, replay/conflict, receipt | No duplicate/false completion; desktop/tablet task success within boundary | Pilot log, replay evidence, signoff |
| V-08 Administration | Owner/security admin/support | Module purchase/disable, user/permission change, audit reason dialog, deep link | Capability and server decision agree; support can explain/recover | Decision log and signoff |
| V-09 Onboarding | New owner and invited user cohorts | Minimal signup, interruption/resume, role-specific checklist, first task | No data loss; first actionable control visible; completion/adoption target met | Study notes and analytics report |
| V-10 Release operations | SRE, support, release manager | Feature flag change, alert, cohort pause, rollback, evidence lookup | Runbook executable within RTO; no data loss or policy bypass | Timed drill record and approvals |

## 6. Failure classification and decision authority

| Class | Example | Default disposition | Authority to resume |
|---|---|---|---|
| Release blocker | Financial truth mismatch, cross-tenant leak, server/UI authorization disagreement, false completion, critical/serious accessibility issue on certified route | Stop rollout; contain; preserve evidence; execute rollback if exposed | Control/Security/Accessibility owner plus Release Director |
| Phase blocker | Contract, route, fixture, theme, or module gate failure | Stop affected workstream promotion; unrelated work may continue | Accountable work-package owner and independent reviewer |
| Advisory | Non-critical visual delta outside changed/risk-tier scope, non-regressing low-severity issue | Record with owner and expiry; may continue | QE Lead |
| Invalid test | Fixture/environment corruption proven by evidence | Preserve run, repair environment, rerun full affected scope | QE Lead, not feature implementer alone |

## 7. Planning-task evidence and exclusions

Completed while producing this roadmap:

- `npm run typecheck`: passed;
- focused Jest: 6 suites / 45 tests passed;
- `npm run ui:smoke:public`: 6/6 EN/FR routes passed with screenshots;
- current-source inventories and audit deltas were revalidated.

Not executed because this task produced planning artifacts only: lint, build, full unit/integration suite, policy gates, authenticated E2E, three-browser matrix, screen-reader validation, production performance, rollout drill, and final release verification. They remain explicit blocking work in D-01 through D-05.
