# Stoquify Enterprise UI/UX Remediation — Executive Roadmap

**Prepared:** 2026-08-06  
**Authority:** `docs/system-audit/STOQUIFY_ENTERPRISE_UI_UX_SYSTEM_AUDIT_2026-08-06.md`  
**Planning status:** executable roadmap; application implementation has not started  
**Release posture:** `NEEDS WORK`; P0 trust, accessibility, and access-boundary gates remain open

## Program outcome

Bring Stoquify from a visually strong but uneven interface to a governed enterprise experience in which:

- displayed business and financial truth is server-owned, scoped, complete, and provenance-bearing;
- locale, currency, timezone, role, permission, and package decisions are shared system contracts;
- every visible action has a real result, explicit unavailability state, or governed upgrade path;
- every canonical route has complete, accessible, localized states;
- high-risk workflows are verified automatically and validated by the people who operate or assure them;
- release claims are backed by route-, role-, browser-, locale-, viewport-, package-, fixture-, and evidence-specific results.

## Revalidated current baseline

Repository truth on 2026-08-06 differs slightly from the audit snapshot and must supersede its counts.

| Signal | Audit snapshot | Revalidated value | Planning implication |
|---|---:|---:|---|
| All `page.tsx` routes | 141 | 140 | Rebuild the canonical route inventory at Gate 0. |
| Dashboard page surfaces | 126 | 124 | Current module inventory is the better route baseline. |
| App/component TSX files | 547 | 549 | UI surface is still growing during remediation planning. |
| Client TSX files | 212 | 213 | Bundle and client-boundary risk remains material. |
| Sidebar destinations | 81 | 81 | Navigation breadth is unchanged. |
| Layout/loading/error/not-found | 13/11/23/1 | 14/11/23/2 | Do not infer state completeness from file counts. |
| Module surfaces | 386 | 387 | Registry changed after the audit. |
| Mapped module surfaces | 352 | 353 | Mapping improved by one. |
| Enforcement candidates | 259 | 257 | Improvement is partial; default module mode is still `observe`. |
| Unmapped / missing permission | 6 / 4 | 6 / 4 | Both remain blocking registry debt. |
| Forced-dark heuristic lines | 90 | 91 | Theme divergence has not improved. |
| Manual-color TSX files | 73 | 72 | Design-token migration remains broad. |
| Global CSS | 1,925 lines | 1,924 lines | Central style surface remains oversized. |
| Raw `<img>` nodes | 5 | 5 | No change. |
| E2E specs | 9 | 10 | Coverage increased but remains narrow relative to 140 routes. |
| Axe-integrated files | 8 reported | 6 currently found | Rebuild the accessibility harness inventory. |

Additional confirmed facts:

- The worktree had 67 dirty entries: 25 modified and 40 untracked, plus two other status entries. Every execution batch must preserve unrelated work.
- Inventory item KPIs still reduce the paginated `initialItemData`, use a hard-coded `< 10` threshold, default to USD, and convert five reads to `null` on failure.
- `getInventoryStats()` already exists in `services/inventory/inventory-read.service.ts` and correctly uses `reorderPoint`, but it lacks the full filter, currency, as-of, completeness, and provenance contract required by the item page. Harden and adopt it rather than creating a parallel service.
- A source scan found 59 hard-coded currency/locale heuristic lines across 26 files. The scan intentionally over-includes selectors and test fixtures; Gate 0 must classify each occurrence.
- Module controls have a real catalog, evaluator, audit logging, tests, and explicit enforcement paths. However, the default is `MODULE_CONTROL_MODE = "observe"`, the control-center contract reports `hardEnforcementEnabled: false`, and 257 surfaces remain candidates.
- `/dashboard/inventory/items/new` and `/dashboard/items/new` now redirect to the canonical item create route. Other duplicates remain, including supplier, location, tax-rate, item-list, and V2 auth surfaces.
- The prior landing invalid-ARIA selectors are no longer present in current source, but the earlier rendered axe failures cannot be closed until the browser scan is rerun. Active login and registration forms still have no `aria-invalid`, `aria-describedby`, live error region, or autocomplete metadata.
- Current component hotspots have grown: POS 2,357 lines; locations 1,917; suppliers 1,743; item wizard 1,683; purchase-order detail 1,651; customers 1,582; reconciliation 1,465; payroll command center 1,356.
- The graph report is stale for implementation impact analysis: its graph/report dates are 2026-07-02/2026-07-14 and it reports 755 isolated nodes. Refresh it before high-risk decomposition or route migration.

## Verification executed for this planning run

| Command | Result | Meaning |
|---|---|---|
| `npm run typecheck` | Passed in 46.2 s | Current TypeScript baseline is green. |
| Focused Jest: entitlement, sidebar, route state, operating truth, public content, smoke harness | 6 suites, 45 tests passed | Existing foundations are reusable, but this is not end-to-end certification. |
| `npm run ui:smoke:public` | Six EN/FR routes passed with screenshots | Current public/auth routes render; local development durations are not production performance evidence. |

`lint`, `build:app`, full Jest, policy gates, authenticated E2E, three-browser visual runs, screen-reader validation, and production performance were not run because this is a roadmap-only exercise and several require stable fixtures, external configuration, or long-running release conditions. They are assigned to phase gates.

## Critical path

1. **G0-01 current-truth baseline** and **G0-02 architecture/ownership freeze**.
2. In parallel, establish **A-03 DisplayContext**, **A-02 completeness/error taxonomy**, **A-05 action/export contract**, **A-06 accessibility repair**, and the entitlement migration design in **A-08**.
3. Complete **A-04 currency migration**, **A-01 inventory headline truth**, **A-08 capability parity**, and **A-09 route safety** to close Phase A.
4. Deliver **B-01 canonical route registry**, **B-02 capability-derived discovery**, **B-03 page-state registry**, **B-04 semantic token contract**, and **B-06 certification manifest**.
5. Build shared data/form/dialog/copy primitives in **C-00**, then normalize modules in controlled waves **C-01–C-06**, with characterization-driven decomposition in **C-07**.
6. Execute automated certification **D-01**, expert/human validation **D-02**, performance/observability **D-03**, cohort rollout **D-04**, then final residual-risk decision **D-05**.

The route/capability path and display-truth path may run in parallel after Gate 0, but all P0 paths must converge before Phase A exits. Broad module normalization cannot begin until the shared state, action, table/form, token, and certification contracts are stable.

## Workstream structure

| Stream | Packages | Accountable outcome |
|---|---|---|
| Program control | G0-01–G0-03 | Current evidence, decisions, fixtures, ownership, and traceability are frozen. |
| Trust and release blockers | A-01–A-09 | No lying KPI, silent empty state, false action, inaccessible auth, or ungoverned entitlement transition. |
| Platform UI contracts | B-01–B-07 | One route/capability/state/theme/onboarding/certification language. |
| Module convergence | C-00–C-07 | Operational modules adopt shared contracts without domain-logic rewrites. |
| Certification and rollout | D-01–D-05 | Evidence-backed release decision, safe rollout, and accepted residual risk. |

## Planning range

This is an effort model, not a calendar commitment.

- Estimated total: **260–430 ideal engineer-days**, excluding waiting time for external reviewers and production telemetry.
- One cross-functional squad, mostly sequential: approximately **10–15 months**.
- Three stable squads (platform/trust, experience/accessibility, module assurance): approximately **5–7 months**.
- Four squads with dedicated QA automation and timely decisions: approximately **4–6 months**.
- Confidence: **low-to-medium (±35%)** until Gate 0 classifies all 387 module surfaces, freezes the route registry, measures bundle/performance baselines, and confirms the auth/onboarding product decision.

## Phase roadmap

| Phase | Indicative effort | Exit decision |
|---|---:|---|
| Gate 0 — baseline and decision freeze | 10–18 days | Every audit item has a disposition, dependency owner, and evidence target. |
| Phase A — P0 trust blockers | 65–110 days | All P0 gates have automated evidence and required human sign-off. |
| Phase B — platform contracts | 50–85 days | Route, capability, state, theme, onboarding, and certification contracts are stable. |
| Phase C — module normalization | 105–175 days | Six module waves meet shared contracts; decompositions preserve behavior. |
| Phase D — certification and rollout | 30–55 days plus telemetry window | Certification matrix is green or residual risks are explicitly rejected/accepted. |

## Decisions required before execution

1. **Appearance promise:** support light/dark/system fully, or declare dark-only until the migration is complete. Recommendation: retain the three-mode goal but hide unsupported choices until certified.
2. **Entitlement source of truth:** confirm whether `Organization.requestedModules` remains transitional or a durable subscription entitlement store is required. Do not hard-enforce the current legacy default without this decision.
3. **Inventory valuation definition:** confirm whether the item-page headline value uses inventory-level total value, average cost, selling-price potential, or separate named metrics. Finance/control approval is required.
4. **Profit-potential semantics:** define whether it is an operational estimate or an accounting measure. Recommendation: rename or remove until service-owned and explicitly scoped.
5. **Canonical route choices:** approve preferred supplier, location, tax, item-list, and auth routes before redirects.
6. **Registration minimum:** agree which fields are legally/security required before account creation and which move to resumable onboarding.
7. **Certification population:** identify role owners and approved synthetic fixtures for owner, cashier, inventory, AP, accountant, payroll, external accountant, and support roles.
8. **Browser/screen-reader support policy:** approve the minimum supported matrix and human accessibility reviewers.
9. **POS mobile scope:** keep phone POS out of scope unless product leadership explicitly changes it.
10. **Release authority:** name the people who may accept finance, accessibility, security, privacy, and operational residual risks.

## Program-level success indicators

- 100% of audit proposals trace to a work package or approved non-action.
- 100% of headline metrics expose scope, currency, as-of/period, and completeness.
- Zero failed reads displayed as successful empty/zero states.
- Zero unapproved hard-coded business currency displays.
- 100% of visible enabled actions produce a real result or artifact.
- 100% of canonical protected surfaces have permission and entitlement contract tests.
- 100% of aliases preserve locale/query state and telemetry continuity.
- Zero critical/serious axe violations on certified routes.
- All changed risk-tier routes have reviewed screenshots and no unexplained diff.
- The appearance control matches rendered behavior on every certified route.
- Production p75 LCP < 2.5 s, INP < 200 ms, and CLS < 0.1 for the agreed risk tier.
- Final readiness is decided by named humans with evidence, not self-certified by automation.

## RACI summary

| Accountability | A | R | C | I |
|---|---|---|---|---|
| Program gates and scope | Product/program sponsor | Program lead | Architecture, QA, module owners | Support/customer success |
| Financial/display truth | Finance control owner | Backend/data + inventory/finance teams | OHADA/accounting, QA | Product/support |
| Capability/entitlement | Security/platform owner | IAM/platform + billing | Module owners, finance, product | Support/sales |
| Design/state/theme contracts | Design-system owner | Frontend/design-system | Accessibility, localization, module teams | Product/support |
| Accessibility | Accessibility owner | Frontend + QA | Auth/product/legal, real users | Leadership/support |
| Module waves | Domain product owner | Domain engineering squad | Platform, finance/control, QA | Operations/support |
| Certification and release | Release authority | QA/SRE/release engineering | Security, accessibility, finance, privacy | All stakeholders |

## Artifact map

- Authoritative roadmap: `docs/system-audit/STOQUIFY_ENTERPRISE_UI_UX_REMEDIATION_ROADMAP_2026-08-06.md`
- Traceability: `01_AUDIT_TRACEABILITY_REGISTER.md` and `.json`
- Dependency and critical path: `02_DEPENDENCY_AND_CRITICAL_PATH.md`
- Detailed work packages: `03_WORK_BREAKDOWN_STRUCTURE.md`
- Verification/validation: `04_VERIFICATION_VALIDATION_MATRIX.md`
- Planned certification manifest: `05_ROUTE_ROLE_CAPABILITY_CERTIFICATION_MANIFEST.json`
- Phase gates: `06_PHASE_GATES_AND_RELEASE_CRITERIA.md`
- Rollout/rollback: `07_ROLLOUT_AND_ROLLBACK_RUNBOOK.md`
- Risks/decisions: `08_RISK_ASSUMPTION_DECISION_LOG.md`
- Adoption/support: `09_CHANGE_MANAGEMENT_SUPPORT_AND_TRAINING.md`
- Final decision template: `10_FINAL_READINESS_REPORT_TEMPLATE.md`
