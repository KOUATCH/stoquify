# Stoquify UI/UX delivery roadmap

Started 12 October 2026. Owner: product/frontend lead. Source: October UI/UX audit and the user's instruction to convert its proposals into a roadmap and execute them. This document tracks delivery; the audit remains a historical baseline.

## Mission and boundaries

Make daily operations and ownership decisions clear, efficient and trustworthy through a coherent visual refresh and complete workflows. Cover implemented modules and all roles, prioritizing daily operators and owners. Follow AGENTS, ECC, the design master, existing page contracts and protected server read models.

Local implementation is authorized. Deployment, migrations, live financial transactions, external messages, invitations and production data changes are outside this execution. No new theme, component framework, dependency or speculative network marketplace. Existing dirty files are preserved; rollback must reverse only this run's patches.

The fixed `docs/prompt-execution/` report set belongs to the September platform program. It is preserved. This scoped roadmap uses the October audit directory instead; the fixed-output publisher workflow is not claimed as completed.

## Status definitions

- **Queued:** scope exists, implementation has not begun.
- **In progress:** source changes or verification underway.
- **Implemented locally:** code exists with specified checks; not deployed and not necessarily accepted.
- **Accepted:** every stated acceptance gate has current evidence.
- **Blocked:** name the missing fixture, decision, access or evidence; do not label unfinished work blocked merely because it is substantial.

## Current baseline

- Route inventory: 167 page files in 27 families, including redirects and aliases. Source inventory is not rendered coverage.
- Prior implementation: dashboard action ordering and setup disclosure; owner Brief/Command/Investigate separation; compact owner evidence header; selected French labels. These are local and partial.
- Prior focused verification: 36 component tests and SUPER_ADMIN EN/FR observations. Actual owner/operator sessions, complete transactional journeys and release certification remain open.
- Existing foundation accepted for reuse: constitution, component registry, semantic product/dashboard tokens, shared command primitives, five navigation lanes and permission/module filtering. Old phase report filenames alone do not prove completion; some historic reports contain only one byte.

## Delivery order and progress

| ID | Deliverable | Priority / dependency | State | Visible result |
|---|---|---|---|---|
| UX00 | Baseline, design decision and evidence ledger | P0 / none | Implemented locally | One plan; explicit acceptance and limitations |
| UX01 | Calm shared shell, navigation context and Stoquify identity | P1 / UX00 | Implemented locally; acceptance partial | Solid canvas; grouped mobile navigation; consistent identity; query and anchor survive language switching |
| UX02 | Complete owner and daily dashboard experience | P1 / UX01 | In progress; Delivery 03 implemented locally | Compact owner status strip and improved French interface; first-screen browser acceptance pending |
| UX03 | Reliable action-to-record handoffs | P1 / UX02 | In progress; shared controls implemented locally | Descriptive generic actions, localized unprefixed URLs and visible disabled reasons; service destination audit remains |
| UX04 | POS daily workspace and recovery | P1 / UX03 | Queued | Products/cart/tender dominate; safe recovery remains explicit |
| UX05 | Inventory and purchasing workbench normalization | P2 / UX04 | Queued | Consistent filters/tables/detail views and shorter controlled entry journeys |
| UX06 | Finance/accountant handoff and close evidence | P2 / UX05 | In progress; Deliveries 14–15 localized review surfaces | Reconciliation, trial balance, Accountant Access and portal improvements implemented locally; collaboration journeys remain |
| UX07 | HR/payroll, sales, settings and remaining module parity | P2 / UX06 | Queued | Shared visual/state/language conventions applied across remaining routes |
| UX08 | Public first impression and role-specific activation | P2 / UX07 | Queued | Realistic product previews and first useful outcomes for each role |
| UX09 | Retention, collaboration, network and referral experiments | P2 / UX08 | Queued | Measurable recurring value and useful collaboration; growth claims tested |
| UX10 | Accessibility, role coverage and release acceptance | P0 gate throughout / all packages | In progress, evidence gaps | Current evidence and controlled rollout for each package |

These packages map onto the existing UI/UX suite in sequence: freeze → shell → primitives/dashboard → robust states → module normalization → public → onboarding → accessibility/release. Each slice gets its own dated report. Existing implementations are inspected and reused, not regenerated.

## Shared controls and gates

Every package preserves tenant isolation, RBAC, module entitlement, server-owned values, maker-checker, evidence grades, uncertainty and recovery. No absent result becomes zero. No acknowledgement implies accounting/payment completion. Unknown/denied destinations must not broaden access or silently drop the user's scope.

For every changed surface record route, role, EN/FR locale, actual viewport, theme and state. Verify keyboard focus, long-copy wrapping, empty/partial/loading/failed/denied/locked/stale states where relevant. Separate source, mocked tests, real database and browser results. At least 1440×900, 1024×768 and ~390×844 for applicable layouts; real touch and screen reader remain separate checks.

Review package scripts, hooks, imports and configuration against `docs/ecc/command-registry.json` before execution. Start with `npm run agent:workflow:check`. Use installed, isolated Jest runners with explicit test paths and inspected mocks. Do not run the migration-bearing build or seed scripts as verification. Record exact commands in each execution report.

All packages have no planned migration. If implementation reveals a schema or domain change, split it into a reviewed dependency and keep that work out of presentation edits. Release gate: scoped checks pass, screenshots reviewed, relevant roles/states verified, domain controls preserved, rollback patch available, and explicit deployment authority. No package is called released merely because localhost renders.

## Package specifications

### UX00 — Baseline and design decision

**Outcome:** preserve the approved blue identity and semantic colors; use calm existing canvas/surface tokens, compact typography and restrained navigation. **State:** existing design foundation revalidated; no replacement palette. **Paths:** design master, constitution/registry, October audit, current shell and graphs. **Owner:** frontend/design lead. **Effort:** 0.5–1 day. **Assumption:** historical source must be corroborated. **Done:** roadmap, owned-file baseline, scoped design decision and verification lane recorded. **Rollout:** documents only.

### UX01 — Shared shell and identity

**Outcome:** remove decorative grid/stacked background effects from authenticated work surfaces; simplify sidebar chrome while preserving all permitted destinations; make topbar title subordinate to page content; consistent customer-facing Stoquify titles; retain query and anchor on EN/FR switches. **Paths:** `app/globals.css`, `components/dashboard/{Navbar,Sidebar}.tsx`, locale-switch component, route metadata, `components/bi/BITrustLegend.tsx`. **Owner:** frontend lead. **Effort:** 2–4 days. **Control:** preserve fresh shell session, module visibility and permission filtering; no resource identifier renames. **Tests:** sidebar permission/current-route tests, language-link navigation tests, EN/FR desktop and mobile menu browser checks. **Done:** no decorative grid in normal authenticated theme; long route names available without duplicate content h1; active menu/keyboard focus preserved; query duplicates and anchor survive language switch; discovered legacy customer-facing metadata renamed. **Open dependency:** restricted-role browser session and controlled full visual matrix. **Rollout:** shared-shell change requires representative module review before production; revert owned CSS/shell hunks together.

### UX02 — Owner and operator dashboard

**Outcome:** one actionable overview, then optional investigation. **Paths:** `EnhancedEnterpriseDashboard`, owner dashboard, BI header/priority/risk primitives, existing read-model presentation. **Owner:** frontend + product lead. **Effort:** 4–7 days. **Current:** mode separation/setup disclosure/header compaction implemented; repeated badges/card density and English narrative remain. **Tests:** owner mode/proof tests, dashboard setup states, focus, complete EN/FR. **Done:** at 1440×900 context and up to the first three available issues fit without traversing setup; first useful action appears in a narrow first screen; no invented queue entries to meet a count; blockers/freshness remain legible; role-authorized evidence reachable; before/after images at identical viewport and fixture. **Assumption:** canonical issue identity may require read-model clarification before deduplication. **Rollout:** pilot owner/operator fixtures before broad shell reuse.

### UX03 — Action handoffs and language completeness

**Outcome:** every action clearly states its purpose and reaches the intended authorized workflow. **Paths:** owner/digest/manager and dashboard presentation, existing locale helpers, affected service link builders, route inventory, domain scope hooks. **Owner:** frontend + relevant domain engineer. **Effort:** 3–5 days. **Current:** Delivery 04 replaces the owner stock destination with the implemented items workspace and checks both overview and item permissions; selected shared action/evidence links preserve locale and supplied URL context. Remaining destinations and actual runtime outcomes still need coverage. **Tests:** destination existence, scope/query parsing, EN→FR→Back, changed organization, denied/locked record, exact-return path. **Done:** no generic Open when the task is known; no broken priority route; record/period/location maintained and revalidated; complete user-visible EN/FR for the delivered journeys. **Control:** destination validation is not authorization; retain destination server guard. **Rollout:** link change reversible independently of backend data.

### UX04 — POS workspace

**Outcome:** compact register/shift/sync strip and a dominant active sale workspace. **Paths:** POS contract, `ProfessionalPOSSystem`, existing lifecycle/recovery controls. **Owner:** POS frontend + POS domain engineer. **Effort:** 4–7 days. **Tests:** isolated ready, expired lease, offline conflict, changed cart, uncertain checkout and sale-complete fixtures; keyboard/cart/tender and touch. **Done:** blocked state shows one safe next action; recovery does not obscure products/cart unnecessarily; no retry creates a new transaction identity; close shift remains explicit. **Blocker for transactional certification:** named disposable environment/fixtures; never use live sales to prove layout. **Rollout:** register pilot with domain acceptance and rollback.

### UX05 — Inventory/purchasing

**Outcome:** common filters, quiet tables, dense review and controlled short item entry. **Paths:** inventory/AP contracts, item wizard, inventory movement/loss/transfer views, purchasing/receiving/AP workbench. **Owner:** inventory/AP frontend + domain leads. **Effort:** 6–10 days. **Tests:** filter/back scope, optional reference failure, error summary, zero/empty distinction, receiving review and approval constraints. **Done:** all allowed tasks remain reachable; mandatory costing/tax/stock evidence preserved; role task walkthrough improves completion without bypasses. **Assumption:** minimum usable-item fields need domain confirmation. **Rollout:** module-by-module; no blanket form rewrite.

### UX06 — Finance and accountant collaboration

**Outcome:** accountant work desk with clear owner, due date, evidence request status and exact return-to-item path. **Paths:** finance/accounting/close/accountant portfolio, existing proof drawers/evidence request flows. **Owner:** finance frontend + accounting domain lead. **Effort:** 5–9 days. **Tests:** independent roles, denied/redacted evidence, stale/withdrawn proof, request/resolution states and return context using isolated fixtures. **Done:** reviewer can understand what is missing and who can act; operational vs posted/reconciled/certified states remain distinct. **Dependency:** existing collaboration permissions and immutable evidence semantics. **Rollout:** local fixtures then approved accountant pilot; no invitations or external sends during UI work.

### UX07 — Remaining module parity

**Outcome:** normalize HR/payroll, sales, settings, compliance and other inventoried surfaces with the same control vocabulary and robust states. **Paths:** module contracts/components, shared error/state components, existing EN/FR messages. **Owner:** module leads + localization reviewer. **Effort:** 8–15 days, sliced by module. **Tests:** each role's five frequent tasks, long French copy, loading/empty/error/denied/locked/partial states. **Done:** coverage matrix has evidence or an explicit gap for every family; no backend diagnostic keys in normal task copy; diagnostics remain available to authorized users. **Control:** payroll/private data never exposed to broader roles through presentation simplification. **Rollout:** one module at a time; preserve newer sales scope patterns.

### UX08 — Public and activation

**Outcome:** actual product capabilities visible early and role-specific first useful outcomes. **Paths:** public-auth contract, landing/auth, onboarding and existing demo surfaces. **Owner:** product/frontend + content lead. **Effort:** 4–7 days. **Tests:** demo vs real state clarity; EN/FR; complete/incomplete/first-use setup; public mobile/accessibility. **Done:** no unimplemented capability claims; role-specific activation completion is meaningful (usable item, confirmed test sale, reviewed evidence), not signup alone. **Control:** no fake business data in a real tenant; demo clearly separate. **Rollout:** content review and public previews before publication.

### UX09 — Recurring value and growth experiments

**Outcome:** measure usefulness before claiming stickiness. **Owner:** product/analytics + privacy lead. **Effort:** 3–5 days discovery, experiment delivery estimated separately. **Paths:** existing daily digest, accountant handoff, customer statements, supplier acknowledgement and referral instrumentation. **Current:** foundations exist; rendered/behavioral outcomes unvalidated. **Tests:** privacy-safe event contract, permission/revocation, notification preferences and experiment analysis. **Done:** separate hypotheses, baseline, success/guardrail metrics and opt-in pilot for each mechanism below. **Release:** no external messages, invitations, rewards or analytics rollout without reviewed authority and privacy decisions.

| Mechanism | Hypothesis | Metric / guardrail |
|---|---|---|
| Retention | Useful role-specific work brings users back at their task cadence | Successful return task completion; no forced daily visits for monthly payroll users |
| Collaboration | Evidence requests reduce handoff delay | Time to accepted evidence, reopening rate, notification burden |
| Genuine network effect | An authorized accountant/supplier connection adds value to both participating organizations | Incremental cross-party task success as participation grows; compare with ordinary collaboration; no automatic shared tenant data |
| Referrals | A successfully served user recommends the product | Qualified referred activation and recommendation reasons; no nagging or unsupported incentive claims |

### UX10 — Quality and release assurance

**Outcome:** current role/state/locale/viewport evidence and recoverable releases. **Owner:** QA + frontend + relevant domain lead. **Effort:** 20–30% of each package, then 3–5 days consolidated acceptance. **Paths:** coverage matrix, focused tests, browser evidence, existing release contracts. **Done:** each package records implementation vs acceptance separately, real browser evidence for required roles, keyboard/screen-reader/contrast/zoom checks, reviewed rollback and known-build performance baseline. **Current gaps:** restricted roles, disposable transactional fixtures, actual screen reader, deployed-build performance. **Rollout:** no production release claimed until these gates and deployment authority are satisfied.

## Execution ledger

| Date | Package | Result | Evidence |
|---|---|---|---|
| 2026-10-12 before roadmap | UX02 partial | Dashboard ordering, owner modes, compact evidence implemented locally | `../implementation/README.md`, `../compact-header/README.md` |
| 2026-10-12 | UX00 | Workflow check passed; foundation and existing scope reviewed | [Execution report](EXECUTION-01.md) |
| 2026-10-12 | UX01 | Shared shell implemented; 70 focused tests passed; SUPER_ADMIN browser checks recorded; restricted-role acceptance open | [Execution report](EXECUTION-01.md), [owned patch](evidence/owned-changes.patch) |
| 2026-10-13 | UX01-A | Dashboard denial/session classification corrected; 20 regression tests passed; post-fix browser acceptance pending | [Delivery 02](EXECUTION-02.md) |
| 2026-10-13 | UX02/UX03 | Compact owner summary, French interface copy and shared context-preserving action controls; 42 component tests and scoped lint passed; rendered acceptance pending | [Delivery 03](EXECUTION-03.md), [owned patch](evidence/command-center-2026-10-13.patch) |
| 2026-10-13 | UX03 | Owner stock handoff repaired with item-access checks; duplicate zone controls removed; 22 mocked service and 47 component tests passed; browser acceptance pending | [Delivery 04](EXECUTION-04.md) |
| 2026-10-13 | UX02/UX03 | Owner-generated EN/FR narratives and canonical source copy localized; reconciliation/payroll/settings handoffs aligned; 57 tests passed; EN/FR owner views and 11 destination surfaces inspected under SUPER ADMIN, broader role/journey acceptance open | [Delivery 05](EXECUTION-05.md) |
| 2026-10-13 | UX02/UX03 destination follow-up | Owner recommendation and main action aligned; purchase-order pending/loading feedback added; French payroll and inventory interface copy expanded. 152 focused tests passed. French payroll command center rendered; remaining post-change browser/role checks open after repeated browser timeouts | [Delivery 06](EXECUTION-06.md) |
| 2026-10-13 | UX02/UX03 and inventory follow-up | French inventory table/formatting and payroll proof/outcome labels completed locally; 49 mocked tests and semantic check of 21 production roots passed. Live inventory gap reproduced, but post-change browser acceptance remains blocked by local server connectivity | [Delivery 07](EXECUTION-07.md) |
| 2026-10-13 | UX02/UX03 rendered acceptance | Cash-variance default route repaired; owner metadata/proof defaults localized; payroll drawer close/focus fixed. 132 mocked tests, 23-root semantic check and scoped lint passed. Local browser recovered; owner/purchase-order handoff and French payroll/inventory destinations checked under SUPER ADMIN. Restricted-role and broader responsive/theme acceptance remain open | [Delivery 08](EXECUTION-08.md) |
| 2026-10-13 | UX02/UX03 labels and responsive acceptance | Localized known change units, owner role labels and declaration evidence modes; enabled inventory's named keyboard-focusable table scroll area. 108 mocked tests, scoped semantic TypeScript and lint passed. Reconciliation populated under SUPER ADMIN; measured owner/declaration/inventory phone and tablet containment plus keyboard menu focus. Restricted-role sessions unavailable; dev-runtime recovery and full state/theme matrix tracked separately | [Delivery 09](EXECUTION-09.md) |

### First five changes, in execution order

**17 October — Delivery 26:** restored port 3000 using the current Prisma-client reuse path without replacing the engine DLL. EN/FR queue keyboard navigation now reaches the correct destinations; a localized journal loading boundary addresses slow-transition feedback. Dashboard appearance controls now explain the approved fixed-dark workspace, with native dark controls verified under a saved light preference. Seven mocked component tests pass; original dark preference restored. The queue currently shows unavailable counts because the protected read fails with Prisma P2022; populated queue acceptance requires schema diagnosis, not a permission change. No entry submitted or migration run. See [Delivery 26](EXECUTION-26.md).

**17 October — Delivery 25:** recovered built-in page control after capturing a chunk-loading error and reloading. Super Admin full journal form now has EN/FR responsive and keyboard evidence: desktop/tablet/phone overflow measurements, named table focus, both scrolling arrows and focus-only draft-button access. No entry submitted or stored permissions changed; normal viewport restored. French queue rendered by direct navigation, but link activation and light-theme appearance remain open findings. The local server later became unavailable; standard restart failed on a Windows Prisma engine DLL lock. See [Delivery 25](EXECUTION-25.md).

**16 October — Delivery 24:** after continued Chrome attachment failures, the user authorized the built-in browser. Rendered inspection works there with an existing Accountant session. EN/FR journal-denial pages fit at measured 320 × 844, recovery-link focus is visible, and EN forward/reverse tab order passes. French destination activation remains unverified. Full form acceptance awaits the existing Super Admin account in this browser; stored permissions are unchanged and viewport was restored. See [Delivery 24](EXECUTION-24.md).

**16 October — Delivery 23:** both older Accountant seed definitions now explicitly select chart-account reading. The owned delta adds one read grant and leaves runtime guards and existing-role update/preservation rules intact; no seed or stored-role change ran. All 18 permission/boundary tests and 20 journal component tests passed, with a strict no-emit test-source check. The user supplied Chrome Super Admin for live form acceptance, but page-control and direct journal navigation timed out; live form, restricted Accountant, Owner/Cashier and broader accessibility acceptance remain open. See [Delivery 23](EXECUTION-23.md).

**16 October — Delivery 22:** English journal permission recovery verified at desktop and 320px; Enter returns to the populated queue, empty-search recovery passes, and normal viewport is restored. An exact-user read-only database diagnostic confirms the Accountant role has journal grants but no chart-account read grant. Older keyword-based seed definitions omit that dependency; newer seed paths preserve existing roles. No permission or production code changed. Full form acceptance requires an authorized fixture; Owner/Cashier and assistive-technology gaps remain. See [Delivery 22](EXECUTION-22.md).

**16 October — Delivery 21:** actual Accountant overview ArrowLeft and Tab/Shift+Tab exit checks passed at 320px. Live French journal verification exposed denied chart-account access being shown as a retryable load failure. EN/FR recovery now explains the access requirement and returns to journals; all 20 mocked tests, scoped TypeScript and lint passed. French phone recovery and focus verified. Full journal-form acceptance still needs a session permitted to read chart accounts; no access was granted. See [Delivery 21](EXECUTION-21.md).

**16 October — Delivery 20:** native ArrowRight scrolling on the French Accountant overview reached its full 808px range at a 320px viewport while retaining focus. Reverse scrolling remains unverified after browser detachment. Continued source review found and fixed the manual journal form's unnamed scroll container and remaining French interface labels; business controls remain intact. Post-change journal browser acceptance is open. See [Delivery 20](EXECUTION-20.md).

**16 October — Delivery 19:** viewport recovery and live French portfolio refresh-focus checks passed in the Accountant session. French accounting overview now localizes headings/actions, setup and journal states, dates and shared table controls. Six mocked tests, scoped TypeScript and lint passed. EN/FR overview and journals navigation/pagination checked; narrow document containment passed. Horizontal table arrow scrolling remains unconfirmed; Owner/Cashier and broader accessibility acceptance remain open. See [Delivery 19](EXECUTION-19.md).

**16 October — Delivery 18:** Accountant trial-balance phone amounts are reachable, filters wrap and sorting exposes its direction; desktop frozen identities and full-report totals remain intact. French portfolio loading/empty states checked. Refresh focus loss fixed with duplicate-load prevention; final live focus check and viewport restoration were interrupted by browser timeouts. All 23 mocked tests, scoped TypeScript and lint passed. Owner/Cashier sessions and broader accessibility acceptance remain open. See [Delivery 18](EXECUTION-18.md).

**16 October — Delivery 17:** actual Chrome Accountant session restored to the acceptance matrix. Fixed the missing EN/FR keyboard bypass, low-contrast mobile navigation under light preference, stale document language after locale navigation, and dark date-picker icons on the Accountant Access form. All 15 mocked tests, scoped TypeScript and production lint passed. Portal desktop/tablet/phone checks, all three table keyboard scroll regions, menu focus trapping/return, Accountant Access narrow reflow, and populated reconciliation at 320px verified. Original dark preference and normal viewport restored. Owner/Cashier sessions and actual screen-reader/forced-colors/reduced-motion acceptance remain open; the approved dashboard remains dark under the global light preference. See [Delivery 17](EXECUTION-17.md).

**16 October — Delivery 16:** shared role badges/account-menu role names now use the supplied locale-specific role name. Remaining scoped loading narratives are bilingual, nested fallbacks retain one shell main, and silent finance/sales/customer skeletons have status text. All 18 mocked tests, scoped TypeScript and production lint passed. Edge recovered after the user opened the portal. Fresh Super Administrator checks passed for French desktop/tablet/phone containment, account/mobile menu keyboard focus return, blocker-table keyboard scrolling, control disclosure and actual EN/FR outer loading transitions. Screenshots recorded; normal viewport restored. Actual restricted roles, other route-specific pending renders and broader theme/assistive-technology acceptance remain open. See [Delivery 16](EXECUTION-16.md).

**15 October — Delivery 15:** French Accountant Access and portal presentation are implemented, including consent/expiry labels, trust/blocker narratives, recorded statuses, percentage formatting and translated blocker search. Authorization, raw evidence and certification controls are preserved. All 16 mocked tests, scoped TypeScript and production lint passed. Actual Accountant FR desktop reads, phone/tablet containment, form keyboard focus and EN→FR portal switching were verified. Desktop viewport restoration is now confirmed. Owner/Cashier sessions, full responsive visual review, light-theme/screen-reader checks and shared loading/role-badge cleanup remain open. See [Delivery 15](EXECUTION-15.md).

**15 October — Delivery 14:** populated reconciliation is now verified in the actual Accountant session in EN/FR. Local fixes remove duplicate main landmarks, wrap risk labels, name filters and translate recorded status/payment-method codes. Trial-balance account types and debit/credit labels are localized while filtering preserves report totals. All 73 mocked tests, both scoped TypeScript checks and production-file lint passed. French phone containment, table keyboard scrolling and mobile-menu focus return were verified; tablet evidence predates the final label cleanup. Browser inspection recovered but screenshot timeouts persist. Owner/Cashier sessions, French Accountant Access/portal copy, final viewport restoration confirmation and broader theme/accessibility acceptance remain open. See [Delivery 14](EXECUTION-14.md).

**14 October — Delivery 13:** live Accountant role reconfirmed; reconciliation's persistent loading skeleton and trial balance's misleading permissions recovery reproduced. Local fixes add an announced EN/FR reconciliation loading state with a dashboard exit, correct trial-balance recovery by failure type, and connect the French route to its bilingual table. Browser control remains intermittent; phone inspection failed and the viewport was restored. Actual owner/cashier and responsive acceptance remain open. See [Delivery 13](EXECUTION-13.md).

**14 October — Delivery 12:** finance denial instructions now use organization terminology and explain administrator recovery; both Cash and Payment History module-denial branches are localized in EN/FR. Activation dependency/audit/authentication disclosures remain intact. All 28 mocked route/component tests, scoped TypeScript and production-file lint passed. Edge now lists dashboard/accountant destinations, but page inspection and navigation still time out; this is a browser-control gap, not evidence that another sign-in is required. Real accountant, owner/cashier and responsive acceptance remain open. See [Delivery 12](EXECUTION-12.md).

**14 October — Delivery 11:** reconciliation now distinguishes an unconfirmed access check from a generic service failure, offers localized access review and refreshes the existing permission lookup. Local runtime recovered on port 3003; browser currently requires sign-in. This does not close the unresolved populated-accountant or responsive checks. See [Delivery 11](EXECUTION-11.md).

**Delivery 10 role acceptance update:** the Edge session now confirms ACCOUNTANT. The English dashboard correctly displays the permission limit and access-review action, closing that specific Delivery 02 rendered check. Reconciliation reached its accountant shell but remained loading; console reported workbench unavailable. Accountant portal, French and responsive checks remain blocked by runtime/browser failures, not by a missing sign-in. See [Delivery 10](EXECUTION-10.md). Historical role-gap notes below describe earlier observations.

1. **Shared canvas and navigation:** implemented in this run; broad visual impact and shorter mobile navigation.
2. **Owner/operator first screen:** continue prior work by reducing header and repeated evidence density while retaining warnings.
3. **Clear, localized action handoffs:** correct destinations and purpose labels; preserve and validate task context.
4. **POS task workspace:** prioritize products, cart and tender while preserving recovery and shift controls.
5. **Inventory/purchasing workbench:** normalize filters, review tables and controlled entry journeys.

Next acceptance slice: exercise the reviewed owner destinations and EN/FR modes in actual role sessions, then normalize remaining shared evidence units and technical labels. Delivery 08 repaired the generic cash-drawer signal default and restored local browser acceptance for the owner/purchase-order handoff and French payroll/inventory destinations. UX01–UX03 acceptance still requires remaining desktop/tablet/mobile checks, actual restricted-role sessions, the alternate/light-theme matrix and usability feedback; SUPER_ADMIN and mocked permission tests do not replace these. Reconciliation content and known presentation-only technical labels remain follow-ups; see Delivery 08's matrix.

**Role-check update:** Chrome now confirms an ACCOUNTANT shell with four modules. The dashboard displays a misleading missing-organization recovery message; current source maps every `FORBIDDEN` error to this diagnosis. Add P1 acceptance correction **UX01-A: distinguish denied access from stale/missing organization and provide an authorized entry path**, before accepting restricted-role navigation. Preserve all server guards; verify EN/FR denial, inactive organization, stale session, successful authorized read and unexpected error independently. Accounting destination verification was interrupted by browser connection timeouts. Firefox is not exposed to the browser tools, so cashier acceptance remains open. See [role-session evidence](ROLE-SESSION-RECHECK.md).

Estimates are engineering person-days, not calendar promises. User research, external dependencies and production approval can add elapsed time. Completion of the roadmap document is not completion of this program.

**13 October correction status:** UX01-A is implemented locally. Ordinary permission denial now offers localized access review without falsely claiming deletion or requesting sign-out. Explicit stale binding and unavailable organization retain accurate recovery. No guards changed. Fresh role acceptance is still pending because Chrome/Firefox were unavailable and the Edge localhost browser check could not complete. See Delivery 02 for 20 passing regression cases and runtime limits.
