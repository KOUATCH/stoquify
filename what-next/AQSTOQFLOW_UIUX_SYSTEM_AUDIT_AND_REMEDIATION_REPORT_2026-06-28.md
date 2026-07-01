# AqStoqFlow UI/UX System Audit And Remediation Report

Date: 2026-06-28
Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`
Requested lens: `$aqstoqflow-prompt-architect`

## Executive Assessment

AqStoqFlow is not suffering from a lack of UI ambition. The product already has a strong enterprise UI direction: dark authenticated shell, dashboard primitives, proof/trust language, robust route states, finance normalization, BI command components, and domain-specific workbenches. The main weakness is uneven execution across the system. Some screens feel like a controlled enterprise command center; others still feel like older admin pages, prototype dashboards, or isolated module products.

The deal-breaker risk is trust fragmentation. An OHADA SMB owner, accountant, or manager can see a polished command surface in one route, then hit a legacy-looking route, duplicated navigation path, unauthenticated smoke-only proof, hardcoded-looking analytics, or a workflow with no visible evidence trail. That inconsistency can make users question whether the business numbers are controlled, whether the platform is finished, and whether the product is safe enough to become their daily operating system.

Recommended UI maturity rating:

| Area | Current rating | Reason |
| --- | ---: | --- |
| Visual foundation | 8/10 | Strong dashboard theme, primitives, glass/stat/card language, role-aware shell. |
| Cross-module consistency | 5/10 | Payroll, customer order detail, purchase order, analytics, settings, and legacy routes still diverge. |
| Evidence/trust UX | 7/10 | Excellent direction, but not yet universal across all money/statutory/reporting surfaces. |
| Navigation clarity | 5/10 | Sidebar is cleaner, but route taxonomy still contains duplicates and legacy naming. |
| Accessibility and visual certification | 4/10 | Focused axe test exists, but no authenticated Playwright screenshots or broad route a11y coverage. |
| Enterprise demo readiness | 5/10 | Good story, but current route smoke mostly proves login redirects, not authenticated product quality. |

## Evidence Inspected

- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-prompt-architect\SKILL.md`
- `docs/UI/UX/skill-suite/README.md`
- `what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_01_DESIGN_SYSTEM_FREEZE_REPORT_2026-06-26.md`
- `what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_02_SHELL_NAVIGATION_REPORT_2026-06-26.md`
- `what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_03_COMMAND_CENTER_PRIMITIVES_REPORT_2026-06-26.md`
- `what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_04_TODAYS_OPERATING_TRUTH_REPORT_2026-06-26.md`
- `what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_05_ROBUST_STATES_REPORT_2026-06-26.md`
- `what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_06_FINANCE_NORMALIZATION_REPORT_2026-06-26.md`
- `what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_08_ONBOARDING_DEMO_REPORT_2026-06-26.md`
- `what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_09_GOVERNANCE_REPORT_2026-06-26.md`
- `what-next/ui-ux/AQSTOQFLOW_UI_ROUTE_SMOKE_2026-06-26.json`
- `docs/product/proposals/moat/AQSTOQFLOW_UI_COMPLETION_BACKBONE_GAP_REPORT_2026-06-18.md`
- `docs/product/proposals/moat/KONTAVA_BI_PROPOSAL_REPORT_2026-06-19.md`
- `docs/product/user-experience/ui-registry.md`
- `graphify-out/GRAPH_REPORT.md`
- Representative route/component scans across `app/`, `components/`, `config/sidebar.ts`, and dashboard modules.

## What Is Already Strong

1. The intended product language is clear.
   - The UI suite states the product should communicate: "Here is the state. Here is the risk. Here is the action. Here is the proof."
   - This is the right north star for OHADA SMBs because it ties daily operations to trust, evidence, and next action.

2. The authenticated dashboard has a usable visual standard.
   - Phase 01 documents the dashboard shell, stat cards, glass panels, filters, semantic tokens, and responsive dashboard content as the anchor.
   - The UI completion report explicitly says new pages should feel like AqStoqFlow, not separate admin products.

3. Shared command-center primitives now exist.
   - Phase 03 introduced `CommandBriefHeader`, `StatusStrip`, `KpiTile`, `ActionQueue`, `EvidenceTimeline`, `ProofBadge`, and `RouteStatePanel`.
   - These primitives are exactly the correct building blocks for enterprise SMB surfaces.

4. The default dashboard has moved in the right direction.
   - Phase 04 replaced metric-first dashboard hero work with "Today's Operating Truth."
   - It also moved missing close/payroll/compliance details into explicit partial/unavailable states instead of inventing fake numbers.

5. Robust route states exist.
   - Phase 05 standardized loading, empty, error, forbidden, locked-module, and not-found states.
   - Error details are redacted from UI and permission states avoid exposing protected resources.

6. Finance normalization is a good model.
   - Phase 06 moved finance to shared command primitives, action queue, status strip, and testable mapping.
   - This route family should become the template for remaining module normalization.

7. BI/proof primitives are promising.
   - BI components such as `BICommandBriefHeader`, `BIKpiCard`, `BITrustLegend`, `BIProofDrawerHost`, `BIActionPriorityBoard`, and `BIBusinessTruthZone` show a serious trust-and-action vocabulary.

## Deal-Breaker Flaws And Weak Points

### 1. Authenticated visual quality is not yet certified

Evidence:
- `what-next/ui-ux/AQSTOQFLOW_UI_ROUTE_SMOKE_2026-06-26.json` shows `screenshotTool: "unavailable"` and screenshot capture skipped because "playwright package is not installed."
- The same route smoke shows authenticated routes such as `/en/dashboard`, `/en/dashboard/finance`, `/en/dashboard/payroll`, `/en/dashboard/inventory/items`, and `/en/dashboard/pos` returned 200 only after redirecting to `/en/login?callbackUrl=...`.
- Phase 09 says protected route smoke proves routes do not 500 and redirect safely, but does not replace authenticated visual screenshots.

Why it matters:
For enterprise-grade UI, especially a financial/OHADA product, "it redirects safely" is not visual proof. The current evidence does not prove that logged-in desktop, tablet, and mobile dashboards render without overlap, blank panels, broken drawers, unreadable tables, or unusable workflows.

Remedy:
- Add Playwright deliberately, including browser binaries in the dev/test environment.
- Create authenticated storage states for owner, accountant, manager, cashier, payroll admin, and restricted user.
- Run visual smoke on core routes with desktop/tablet/mobile screenshots.
- Require screenshot artifacts for release-candidate UI work, especially dashboard, finance, POS, inventory, payroll, accounting close, compliance, and settings.

### 2. UI primitives are strong but not uniformly adopted

Evidence:
- Finance uses `CommandBriefHeader`, `StatusStrip`, and `ActionQueue`.
- BI/cash/daily surfaces use `BICommandBriefHeader` and BI primitives.
- Payroll command center still uses local slate/white card classes and its own page anatomy rather than the shared command-center primitive family.
- Customer order detail and purchase-order management still show older `bg-white/80`, `dark:bg-slate-800/80`, `rounded-2xl`, `shadow-xl`, and slate/blue-gradient visual patterns.

Why it matters:
Users experience the product as one system, not as implementation history. When screens switch from proof-driven enterprise command center to older admin dashboard styling, it weakens confidence and makes the product feel unfinished.

Remedy:
- Define one canonical authenticated page anatomy:
  - command brief
  - status/KPI strip
  - action queue
  - evidence/proof row
  - workbench/table
  - detail drawer
  - robust empty/error/locked state
- Keep BI-specific primitives only if they wrap or extend the same base primitives.
- Normalize payroll, customer detail, purchase orders, settings, daily sales, and older analytics pages to the same anatomy.

### 3. Route taxonomy contains duplicate and legacy-feeling surfaces

Evidence:
- Route scan shows both `/dashboard/purchases/suppliers/...` and `/dashboard/suppliersSystem/...`.
- Route scan shows both `/dashboard/finance/cash-drawer` and `/dashboard/cashDrawer`.
- Route scan shows `/dashboard/inventory/items` and older `/dashboard/items`.
- Purchase routes are split between `/dashboard/purchases/...` and `/dashboard/purchase-orders/...`.
- `notifications-demo` still exists under the authenticated dashboard route tree.
- `config/sidebar.ts` is cleaner than before but still exposes a very large set of nested destinations across finance, payroll, inventory, purchases, sales, settings, command, accounting, compliance, and assurance.

Why it matters:
Duplicate or legacy routes create training burden, support confusion, bad demos, and direct-link inconsistencies. For enterprise buyers, route sprawl looks like a platform that grew organically without product governance.

Remedy:
- Create a route maturity registry with statuses: canonical, alias, legacy-hidden, admin-only, demo-only, blocked, deprecated.
- Pick canonical paths for each domain.
- Hide legacy routes from navigation.
- Add safe redirects for aliases where data ownership is clear.
- Remove or gate demo routes from normal tenant experiences.

### 4. Some analytics surfaces still look like mock/demo reporting

Evidence:
- `components/analytics/CompleteIntegratedDailySalesDashboard.tsx` includes static-looking targets and progress examples such as `$2,847 of $3,000 target`, hardcoded progress values, "Based on recent feedback", and "Loading..." fallbacks inside metric text.
- The system already has a demo/report trust gate doctrine, but not every analytics surface appears equally disciplined.

Why it matters:
This is a direct trust breaker. A daily business system cannot show numbers that look hardcoded, fake, or generic unless they are clearly labelled as demo data. OHADA SMB users and accountants need to know what is operational truth, what is estimate, what is demo, and what is unavailable.

Remedy:
- Ban unlabelled demo/mock values from authenticated enterprise dashboards.
- Add a `DataProvenanceBadge` or `ProofBadge` to every KPI and insight.
- Use explicit unavailable states instead of "Loading..." as final display text.
- Gate demo mode at tenant/workspace level and watermark all demo values.

### 5. Accessibility governance is too narrow for enterprise release

Evidence:
- Phase 09 added focused `axe-core` coverage to shared command-center primitive tests and fixed one serious issue.
- Phase 09 also states Playwright screenshots are not enforceable until Playwright is added and browser binaries are available.
- The route smoke file confirms screenshots were skipped.

Why it matters:
One focused axe smoke is a good start, but enterprise UI needs route-level and workflow-level accessibility coverage: keyboard navigation, focus traps in dialogs/drawers, table navigation, labels, contrast, live regions, mobile menu behavior, and form errors.

Remedy:
- Add `eslint-plugin-jsx-a11y`.
- Add axe checks for the authenticated route set, not only primitives.
- Add keyboard-flow tests for: sidebar search, mobile menu, POS sale, finance filters, payment reconciliation proof drawer, payroll approval, accounting journal form, and settings dialogs.
- Require contrast and focus-visible checks in screenshot review.

### 6. Several high-value UI moats remain partial or not visible enough

Evidence:
- The UI completion backbone report lists missing or future surfaces such as audit/event explorer, source links, posting rules, inventory counts/valuation/reconciliation, POS offline evidence, provider operations, reconciliation run detail, and evidence archive.
- The BI proposal says the product moat is not generic charts but ledger-backed control tower intelligence with evidence and actions.

Why it matters:
The system has backend/proof foundations, but users buy visible workflows. If audit, source links, posting rules, provider operations, close evidence, inventory valuation, and compliance evidence are hidden or partial, the strongest moat remains mostly invisible.

Remedy:
- Prioritize trust-critical surfaces before decorative reporting:
  1. audit/event explorer
  2. accounting source links
  3. posting rules readiness
  4. reconciliation run detail and certificate proof
  5. inventory count/valuation/reconciliation
  6. POS offline replay evidence
  7. compliance evidence archive
  8. accountant trust pack drill-through

### 7. Mobile and dense-workflow ergonomics are not proven

Evidence:
- Finance uses horizontal scroll tables such as `min-w-[860px]`.
- POS has a large operational surface with many focused interactions and fixed/min-height panels.
- Existing route smoke includes mobile/tablet targets, but screenshots were skipped.

Why it matters:
OHADA SMB operators may use lower-resolution laptops, tablets, and phones in shops. A surface can be visually polished on desktop and still fail if POS, drawers, tables, dialogs, or sidebar search are hard to use on mobile.

Remedy:
- Define mobile acceptance criteria per workflow, not only per route.
- For data tables, add mobile summary cards for high-frequency actions instead of relying only on horizontal scroll.
- For POS, certify touch targets, tender flow, cart review, offline state, and cashier session controls.
- Add screenshot and interaction tests at 390px, 768px, 1280px, and 1440px widths.

### 8. Localization and professional copy are inconsistent

Evidence:
- Many dashboard and workflow components include hardcoded English strings.
- Some surfaces have bilingual copy objects, while others rely on inline English.
- Payroll, purchase-order, customer-order, and analytics examples show inline English page text and status labels.

Why it matters:
For OHADA SMBs, bilingual consistency is not polish. It is market fit. Mixed localization makes the product feel less reliable and less locally adapted.

Remedy:
- Require every authenticated route to have English/French copy coverage.
- Add a hardcoded-copy scan for user-facing strings in `app/[locale]/(dashboard)` and `components/`.
- Separate legal/statutory wording from UI copy and require expert-reviewed provenance for country-pack terms.

### 9. Module entitlement UX is not yet product-grade

Evidence:
- Prior module architecture reports note durable subscription/package/tenant entitlement models are designed but not fully implemented.
- The UI completion report warns that UI-only module gating is high risk.
- The sidebar includes `moduleSlug` metadata, but route-level user experience for locked/upgrade/read-only states is not yet uniformly proven.

Why it matters:
If a module-based SaaS shows routes the tenant cannot use, hides routes inconsistently, or lets direct URLs reach confusing states, buyers feel the product is unstable or commercially immature.

Remedy:
- Build a module-surface inventory gate for routes, actions, APIs, exports, jobs, and reports.
- Standardize locked, read-only, upgrade, trial, and unavailable states using `DashboardRouteState`.
- Enforce entitlements server-side before depending on navigation filtering.

### 10. The product has too many "interesting surfaces" and not enough certified daily journeys

Evidence:
- The route tree is broad: accounting, analytics, assurance, cash command, compliance, customers, finance, inventory, manager action center, owner war room, payroll, POS, purchases, purchase orders, settings, suppliers, daily digest, and more.
- The BI proposal says the winning direction is a daily operating reference where users see what is true, what is at risk, what evidence supports each number, and what action should happen next.

Why it matters:
Breadth without certified journeys creates demo risk. A buyer may click into a lower-maturity route and lose confidence even if the architecture behind it is strong.

Remedy:
- Certify 5 role-based daily journeys before widening UI work:
  1. Owner: daily truth, cash risk, top actions, proof drill-through.
  2. Store manager: POS session, stock risk, drawer variance, offline status.
  3. Finance/accountant: payments, reconciliation, close readiness, source evidence.
  4. Inventory manager: stockouts, counts, transfers, valuation, exceptions.
  5. Payroll/admin: setup readiness, payroll run, payment/declaration evidence.

## Missing Capabilities That Would Elevate The UI

| Missing capability | Why it matters | Recommended build |
| --- | --- | --- |
| Authenticated screenshot certification | Proves actual logged-in product quality | Playwright with saved auth states and screenshot artifacts |
| Route maturity registry | Prevents legacy/dead routes from reaching users | JSON/MD registry with canonical/alias/legacy/demo/blocked statuses |
| Universal proof drawer | Makes every critical number defend itself | One proof drawer contract backed by evidence services |
| Universal KPI trust labels | Separates ledger-backed, operational-only, stale, blocked, missing evidence | Extend `ProofBadge` into all KPI cards |
| Canonical module page anatomy | Makes all modules feel like one product | Command brief, status strip, action queue, evidence timeline, workbench, drawer |
| Demo watermarking and data provenance | Prevents fake-looking analytics | Tenant-level demo mode plus visible provenance |
| Bilingual UI release gate | Makes OHADA fit visible | Hardcoded-copy scan and locale coverage review |
| Mobile workflow certification | Proves shop-floor usability | Workflow screenshots and interaction tests across common widths |
| Accessibility release gate | Prevents serious keyboard/screen-reader failures | jsx-a11y, axe route tests, focus-flow tests |
| Navigation status governance | Reduces route sprawl and training burden | Sidebar generated from route registry and module entitlement state |

## Recommended Remediation Roadmap

### Phase 0: UI Truth Inventory

Goal: Know exactly what is canonical, partial, legacy, duplicate, demo-only, or blocked.

Tasks:
- Generate a route inventory for all authenticated routes.
- Map each route to module, owner role, service/read model, action boundary, permission, module slug, UI maturity, test coverage, screenshot coverage, and data trust posture.
- Classify routes into: canonical, alias, legacy-hidden, demo-only, blocked, or deprecated.
- Save `what-next/AQSTOQFLOW_UI_ROUTE_MATURITY_REGISTRY_2026-06-28.json` and markdown summary.

Success criteria:
- No sidebar link has unknown status.
- No duplicate route remains user-visible without explanation.
- No UI claims trust without data/proof source.

### Phase 1: Visual System Convergence

Goal: One authenticated product language.

Tasks:
- Merge or bridge dashboard primitives and BI primitives.
- Publish a `CommandSurfaceShell` pattern for all module pages.
- Replace local slate/white/rounded-2xl legacy card systems in payroll, customer order detail, purchase orders, and analytics surfaces.
- Standardize page-level loading, empty, error, forbidden, locked, and unavailable states.

Success criteria:
- Every module opens with command brief, status/proof context, and clear primary actions.
- Pages no longer feel like separate products.
- Finance normalization becomes the reference implementation.

### Phase 2: Deal-Breaker Route Cleanup

Goal: Remove confusing route and navigation weaknesses.

Priority routes:
- Hide or redirect `/dashboard/suppliersSystem/*`.
- Decide canonical treatment for `/dashboard/cashDrawer` versus `/dashboard/finance/cash-drawer`.
- Decide canonical treatment for `/dashboard/items` versus `/dashboard/inventory/items`.
- Clean purchase taxonomy between `/dashboard/purchases/*` and `/dashboard/purchase-orders/*`.
- Gate or remove `/dashboard/notifications-demo` from normal tenant navigation.

Success criteria:
- Navigation is understandable to a new owner in under 60 seconds.
- Direct legacy URLs either redirect safely or show a controlled deprecated state.

### Phase 3: Trust And Evidence Universalization

Goal: Every critical number has visible evidence posture.

Tasks:
- Add trust labels to every KPI and financial/statutory metric.
- Add proof drawers to money, stock, payroll, compliance, close, and reconciliation numbers.
- Remove all unlabelled demo/mock/hardcoded analytics values from authenticated dashboards.
- Add `demo`, `sample`, `operational`, `ledger-backed`, `reconciled`, `certified`, `stale`, `blocked`, and `missing evidence` visual states.

Success criteria:
- A user can answer: "Can I trust this number?" from the UI.
- Demo mode cannot be confused with production data.
- Accountant-facing pages expose source links and close evidence.

### Phase 4: Certified Visual And Accessibility Governance

Goal: Make UI quality verifiable.

Tasks:
- Add Playwright and screenshot capture.
- Seed or store authenticated sessions for major roles.
- Add route screenshot checks for dashboard, finance, POS, inventory items, payroll, accounting close, compliance, settings, owner war room, manager action center, and daily digest.
- Add axe route checks and keyboard-flow tests.
- Require screenshots for release-candidate UI changes.

Success criteria:
- Protected routes are tested as authenticated product pages, not only login redirects.
- Mobile, tablet, and desktop screenshots are saved.
- Serious accessibility issues fail the gate.

### Phase 5: Daily Habit Productization

Goal: Turn AqStoqFlow into the daily trusted place for OHADA SMBs.

Tasks:
- Build role-based daily briefs:
  - owner daily truth
  - manager action center
  - cashier/POS shift control
  - accountant close readiness
  - inventory control
  - payroll/statutory readiness
- Each brief should answer:
  - what changed
  - what is risky
  - what is blocked
  - what action is due
  - what proof supports it

Success criteria:
- The first five minutes of daily use create value.
- Users see both visible pain points and invisible control gaps.
- The product becomes an operating habit, not a reporting destination.

## Priority Backlog

| Priority | Work item | Main files/surfaces | Why first |
| --- | --- | --- | --- |
| P0 | Add authenticated Playwright screenshot/a11y gate | `scripts/ui-route-smoke-gate.js`, core dashboard routes | Current evidence does not prove logged-in visual quality. |
| P0 | Build route maturity registry | `app/[locale]/(dashboard)/dashboard`, `config/sidebar.ts` | Prevents legacy and duplicate routes from damaging demos. |
| P0 | Remove or gate unlabelled mock/demo analytics values | `components/analytics/CompleteIntegratedDailySalesDashboard.tsx` | Fake-looking numbers are a trust killer. |
| P0 | Normalize payroll command center to shared primitives | `components/payroll/PayrollCommandCenter.tsx` | Payroll is sensitive, statutory, and currently visually separate. |
| P1 | Consolidate suppliers/cashDrawer/items duplicate routes | Dashboard route tree and sidebar | Reduces confusion and support burden. |
| P1 | Normalize customer order detail and purchase-order workflows | Customer/order and purchase-order routes/components | Important daily workflows still show older UI style. |
| P1 | Universal KPI proof/trust labels | Dashboard, finance, BI, accounting, inventory, payroll | Turns UI polish into confidence. |
| P1 | Add bilingual copy gate | Dashboard routes and components | OHADA market fit requires English/French consistency. |
| P2 | Build missing trust moat screens | audit explorer, source links, posting rules, inventory counts, provider operations | Makes invisible controls visible. |
| P2 | Create role-based daily journey certification | Owner, manager, cashier, accountant, payroll admin | Moves from many pages to daily habit loops. |

## Suggested Verification Commands

Use these after remediation work begins:

```powershell
npm test -- components/dashboard/primitives/__tests__/command-center-primitives.test.tsx components/dashboard/__tests__/DashboardRouteState.test.tsx --runInBand
npm test -- components/finance/__tests__/finance-command-center-normalization.test.ts --runInBand
npm run lint
npm run typecheck
node scripts/ui-route-smoke-gate.js --base-url http://localhost:3000 --require-screenshots
npm run policy:gates
```

For visual certification, add a Playwright command once the dependency and auth storage state exist:

```powershell
npx playwright test tests/ui/authenticated-dashboard.spec.ts --project=chromium
```

## Execution Prompt For The Next UI/UX Remediation Wave

```md
Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Project:
AqStoqFlow / Kontava platform.

Workspace:
`E:\ohada saas\newStockFlow\aqstoqflow`

Mission:
Remediate the highest-risk UI/UX system flaws found in `what-next/AQSTOQFLOW_UIUX_SYSTEM_AUDIT_AND_REMEDIATION_REPORT_2026-06-28.md`. Focus first on authenticated visual certification, route maturity governance, legacy/duplicate route cleanup, unlabelled demo/mock analytics values, and normalization of payroll/customer/purchase-order surfaces to the shared command-center product language.

Domain lens:
Act as a senior enterprise UI/UX architecture team:
- Senior enterprise software architect: preserve route, service, action, permission, tenant, module, and read-model boundaries.
- Structural UI/UX design expert: enforce one authenticated product language across command centers, workbenches, forms, tables, drawers, and robust states.
- Cybersecurity and RBAC specialist: preserve tenant isolation, RBAC, module entitlement, safe errors, redaction, and direct URL handling.
- OHADA/SYSCOHADA-aware product strategist: make trust, evidence, close readiness, payment truth, statutory posture, and accountant confidence visible without overclaiming.
- SaaS growth advisor: ensure the daily owner/manager/accountant experience is clear enough to become a habit.

Tasks:
1. Build a route maturity registry for authenticated dashboard routes.
2. Identify canonical, alias, legacy-hidden, demo-only, blocked, and deprecated routes.
3. Add or plan safe redirects/gated states for duplicate routes.
4. Remove or clearly label untrusted demo/mock values in authenticated dashboards.
5. Normalize one high-risk module surface, starting with payroll or customer order detail, to the shared command-center primitives.
6. Add authenticated screenshot/a11y verification or document exact dependency blockers.
7. Save a remediation report under `what-next/`.

Risk controls:
- Do not invent metrics or dashboard numbers.
- Do not make UI-only entitlement decisions.
- Do not change unrelated backend behavior.
- Do not touch unrelated lint warnings.
- Preserve current tenant/RBAC boundaries and safe error handling.

Success criteria:
- Every changed surface has route status, proof posture, and verification evidence.
- No normal user sees duplicate or legacy navigation without a controlled reason.
- At least one high-risk legacy surface moves to the shared command-center language.
- The final report states what is fixed, what remains risky, and which commands passed or were blocked.
```

## Final Recommendation

The fastest path to modern, professional, enterprise-grade UI is not another broad redesign. AqStoqFlow already has the right visual and product doctrine. The winning move is a ruthless convergence pass:

1. certify the logged-in product visually,
2. remove duplicate/legacy route confusion,
3. make every critical number prove itself,
4. normalize the remaining visual islands,
5. turn the broad module set into a few role-based daily journeys.

Done well, the UI will stop feeling like many capable modules and start feeling like one trusted OHADA SMB operating system.
