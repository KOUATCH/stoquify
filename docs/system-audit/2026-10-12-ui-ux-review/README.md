# Stoquify UI/UX audit and modernization proposal

12 October 2026 · Audit and proposal only · Current working copy

**Recommendation: make the next useful action the visual center of the product.** Stoquify already contains much of the functionality needed for a valuable enterprise experience. Its strongest opportunity is to reduce competing summaries, make everyday language and navigation consistent, and carry users from a warning to the exact work that resolves it.

The rendered dashboard and owner overview spend substantial space explaining the system, setup, and evidence before exposing work. The owner page repeats information in a morning brief, change cards, risks, priority actions, business-truth zones, summary cards, control strips, and a second action queue. This makes existing depth harder to use. A new palette alone would not address this.

**Evidence limits:** 167 page files were inventoried across 27 route families. This includes aliases, redirects, previews, and public document routes, not 167 independent production features. Route source and representative components were inspected. Browser evidence covers three authenticated surfaces under one SUPER_ADMIN session, with a limited narrow-layout observation. Other roles and complete transaction journeys were not exercised. This is a substantive audit with explicit coverage gaps, not whole-system browser or accessibility certification.

## Deliverables

- [Route-by-route coverage matrix](coverage.md)
- [Machine-readable inventory, file hashes, graph references, and revision](route-inventory.json)
- [Browser evidence and verification ledger](browser-evidence.md)
- [Three annotated layout proposals](layout-proposals.html): owner overview, cashier workspace, and accountant handoff. Standalone design artifact; all proposal data is illustrative.

## Basis and method

Inspected HEAD: `6f7f6741cabfdeff61989a40455d6f3ea37b33c9`, plus the current working copy. The inventory recorded 368 tracked dirty files. Unrelated edits were preserved. Runtime deployment/source correspondence was not independently attested; matching screen content corroborates particular findings, not every file.

Read the ECC workflow and routing, design master, UI constitution, component registry, live product tokens, and public/auth, inventory, POS, AP-payment, and sales contracts. Applied the project UI/UX Pro Max review checklist and design-system token architecture. No replacement design system was generated.

The first focused UI/UX dataset search, `progressive disclosure complex forms`, returned heading balance and inline validation, which did not establish the requested progressive-disclosure guidance. That match was rejected. The narrower `error summary validation` search returned **Focusable Error Summary** and **Error Messages** from `ux-guidelines.csv`, applicable to web forms without a framework upgrade. Skill release version remains unverified. Progressive-disclosure recommendations below are expert design judgments based on observed repetition, not attributed to that rejected search.

Existing graphs were used for discovery: `graph_components.json` identifies `dashboard_enhancedenterprisedashboard_tsx` in community 32 and `dashboard_navbar_tsx` in community 77; `graph_app.json` identifies `owner_war_room_page_ownerwarroompage` in community 43. Graph filesystem modification dates were 9 August 2026 and do not establish current completeness. Current route/component source was checked before behavioral claims.

Priority is qualitative: task obstruction and misleading meaning first, then repeated friction across frequent roles, then growth hypotheses. Effort ranges are provisional engineering person-days excluding research recruitment, domain-policy decisions, and production rollout. They are not delivery commitments.

## What should be preserved

1. **Business truth and recovery.** The POS actually distinguishes expired access and offline-close conflicts. The owner screen exposes stale and blocked evidence. These are valuable controls; redesign must clarify them, not hide them.
2. **A reusable design foundation.** Product blue, dark operating surfaces, gold/chestnut variants, semantic state colors, `CommandBriefHeader`, `ActionQueue`, `KpiTile`, `FilterBar`, and detail/proof drawers already exist.
3. **Operational search.** `BusinessRecordSearch.tsx` already combines page destinations with items, customers, and purchase orders; it has keyboard handling, partial-result feedback, and authority-sensitive state. Improve this rather than proposing search as a missing feature.
4. **Useful scope handling in newer workflows.** `SalesDashboard.tsx` and `SalesPerformanceDashboard.tsx` use the sales scope hook, explicit view selection, identity-bound queries, and invalid/denied handling. Reuse these patterns where applicable.
5. **Collaboration foundations.** Accountant portfolio/work desk, evidence requests, customer statements, supplier acknowledgement, and referral instrumentation already have source implementations. They are opportunities to improve and validate, not greenfield feature suggestions.
6. **Some newer disclosure patterns are already better.** Module composition has context details, presets, retained-workspace states, history, and dependency cautions. Reuse its restrained disclosure approach where it fits; do not copy module administration into daily operator screens.

## The first five changes

| Order | Change | Why it matters immediately | Completion evidence |
|---|---|---|---|
| 1 | Put daily work first on the dashboard and owner overview | The first screen becomes useful for returning operators and owners; removes repeated narratives | At 1440×900, context, next action, and first three actionable issues are visible without traversing setup cards; narrow layouts preserve this order |
| 2 | Apply one restrained shell, page-header, and brand treatment | Makes the existing product look coherent across modules | Consistent title/action hierarchy; no customer-facing Kontava labels; existing approved palette and button semantics retained |
| 3 | Finish EN/FR task language and preserve work context across navigation | Removes visible incompleteness and prevents users losing filters | French item creation/payroll/self-service copy complete; locale switch retains valid search parameters; back navigation returns to prior scope |
| 4 | Compress the POS status/setup area around the active sale | Restores screen space to products, cart, tender, and recovery | Active lease/sync context fits a compact strip; blocked states name one safe next step; cashier can reach cart/tender using keyboard and supported touch layouts |
| 5 | Repair and standardize dashboard-to-record handoffs | Converts an informative dashboard into a useful work surface | Every priority action opens an existing authorized destination with the relevant record/scope and a clear return path; stale/uncertain states remain explicit |

These five work together: hierarchy provides focus, shared styling provides polish, language provides clarity, POS provides daily value, and dependable handoffs provide completion. None requires removing maker-checker or server-owned financial controls.

## Prioritized findings register

Evidence classes: **B** = rendered browser/AX observation; **S** = current source; **H** = hypothesis requiring user validation. P1 = next remediation cycle; P2 = follow-on improvement. No production incident severity is implied.

### F01 · P1 · Setup crowds out daily work

**Evidence (B/S):** `evidence/dashboard-en-desktop.png`; `components/dashboard/EnhancedEnterpriseDashboard.tsx:551` renders `WorkspaceSetupPanel` before status and action queues. At 1851×891, the first screen is occupied by a large command brief and the eight-card setup section; the observed setup was 6/7 required steps ready. The full document measured 3,330 px high.

**Impact:** returning owners/operators must scroll past mostly completed work before reaching the urgent queue. Task-time impact is an inference, not measured user behavior.

**Change:** retain a compact “One setup task remains” disclosure for administrators; make next actions the first substantial section. Expand onboarding for first-use users and genuine blockers, with completed steps available on demand. Keep obligatory setup blockers visible when they prevent the current task.

**Acceptance:** correct hierarchy for first-use, almost-ready, and fully configured workspaces; no unauthorized setup prompts; keyboard-accessible disclosure; first three issues visible on the target desktop layout. **Effort:** 2–4 days. **Confidence:** high. **Risk/dependency:** reliable setup state and persona rules.

### F02 · P1 · Owner overview repeats the same decision several times

**Evidence (B/S):** `evidence/owner-en-desktop.png`, `evidence/owner-en.txt`; `OwnerWarRoomDashboard.tsx:279–640`. Measured desktop document height: 5,513 px. The heading sequence includes a morning brief, risks, priority actions, five business-truth zones, another Owner War Room heading, eight top cards, control strips, and a second owner action queue.

**Change:** make Brief, Work, and Evidence genuinely different information depths. Brief: one sentence, up to four decision metrics, and a deduplicated queue. Work: full queue with domain/owner/status filters. Evidence: lineage, module state, provenance, and diagnostic details. Preserve all permitted evidence and contextual warnings.

**Acceptance:** one entry per underlying issue in the default queue; one page h1 in the content hierarchy; no duplicated action boards in Brief; related records remain reachable; action identity and severity are server-backed. **Effort:** 4–7 days. **Confidence:** high. **Dependency:** canonical issue identity and consistent source scope.

### F03 · P1 · Technical evidence vocabulary dominates business language

**Evidence (B/S):** dashboard displays “dashboard read model” and “module source pending.” Owner overview exposes `payments.reconciliation.read`, `providerAccount.externalAccountHash`, “Observe mode,” source hashes, and repeated blocked/stale chips. Payroll source includes “Chaos release gate,” “Pilot cert,” and adapter operations (`PayrollCommandCenter.tsx:596,1329–1372`).

**Change:** use a compact business state and explanation: “Cash needs review — payment evidence is incomplete.” Place authorized diagnostics under “Why this status?” or administrative operations views. Do not conceal actual uncertainty, access restrictions, or regulatory prerequisites.

**Acceptance:** a daily operator can identify the issue and next action without interpreting permission keys or infrastructure vocabulary; diagnostics remain available to authorized users; stale evidence includes checked time and affected scope. **Effort:** 3–6 days across shared presentation. **Confidence:** high. **Risk:** oversimplification must not imply that an acknowledgement fixes a business blocker.

### F04 · P1 · Incomplete French task experiences

**Evidence (S):** `CreateItemWizard.tsx:158–162,567,691,838,1020,1436–1490` has literal English step names, field guidance, and header copy. `PayrollCommandCenter.tsx:1312–1372` has literal English headings/metrics despite receiving locale. `HrisEmployeeSelfService.tsx:38–74` has English profile labels, “My HR,” and “Payslips.” `OwnerWarRoomDashboard.tsx:281` omits locale when rendering `BICommandBriefHeader`, whose default is English (`BICommandBriefHeader.tsx:40`).

**Change:** finish complete journeys in French, including validation, errors, status meanings, metadata, and back/next labels. Use domain-reviewed French terminology rather than mechanically translating technical nouns.

**Acceptance:** no unintended English strings in these French journeys, except intentional product names/user data; long-copy reflow; pluralization; localized date/currency/unit presentation; shared primitives receive explicit locale. **Effort:** 4–8 days plus copy review. **Confidence:** high for source issue; French rendered completeness remains unverified.

### F05 · P1 · Navigation can lose filters and link to a missing destination

**Evidence (S/B):** `Navbar.tsx:110–113` builds the locale link from pathname alone, excluding query and fragment. `EnhancedEnterpriseDashboard.tsx:374–375` holds period/location only in component state. Owner “Open stock” links are visibly `/dashboard/inventory/stock`; `owner-war-room.service.ts:283,948,952` supplies that path. No corresponding page exists in the current route inventory, and the inspected Next rewrites only cover security.txt. The destination was not clicked to establish its runtime error response.

**Change:** preserve validated URL scope through language changes and back navigation; use locale-aware destination helpers; repair the stock destination to the correct existing workflow based on the intended stock question. Reuse the newer sales scope pattern. Bind saved scope to organization and revalidate permissions on arrival.

**Acceptance:** every critical queue link resolves to an existing authorized route; a filtered page survives EN→FR→Back without broadening its scope silently; changed organizations do not inherit another tenant's record IDs; unavailable target explains an authorized recovery path. **Effort:** 3–5 days. **Confidence:** high for source mismatch; destination runtime behavior unverified.

### F06 · P1 · POS recovery/setup consumes the working area

**Evidence (B/S):** `evidence/pos-en-desktop.png` shows expired register ownership, an offline-close conflict strip, and large setup/shift panels above the working catalog. `ProfessionalPOSSystem.tsx:1430` applies `mt-20` to lifecycle context, and the offline strip at approximately `1480` also has `mt-20`; screenshot shows substantial intervening blank space.

**Change:** one compact register/shift/sync context strip; expand setup only when configuration or access requires attention. A blocked workspace presents one prominent safe recovery action with the specific blocker and affected shift. Keep close-shift work in its explicit review flow, away from the primary sale path.

**Acceptance:** inspect ready, expired lease, offline conflict, changed cart, uncertain checkout, and completed sale in isolated fixtures; keyboard/touch cart and tender access; fixed headers never obscure focus; no retry creates a new transaction identity. **Effort:** 4–7 days. **Confidence:** high for observed layout; completed checkout not tested. **Risk:** high domain coupling; preserve existing recovery contracts.

### F07 · P1 · Graphical bars imply a scale they do not measure

**Evidence (S):** `OwnerWarRoomDashboard.tsx:648–655` draws a bar at 72% whenever the value is positive and 18% when it is zero. Summary counts therefore share a quantitative-looking shape without a denominator.

**Change:** remove the bars or replace them with a clearly decorative constant accent. Use a measured proportion only where numerator, denominator, units, and period are meaningful and available.

**Acceptance:** 0, 1, and 100 issues do not falsely imply comparable completion/health proportions; any retained chart has a real labelled scale. **Effort:** 0.5–1 day. **Confidence:** high. **Risk:** low; no domain data change needed.

### F08 · P1 · Mixed branding weakens product coherence

**Evidence (B/S):** browser title “Owner War Room | Kontava”; visible trust legend “How Kontava labels…”; `owner-war-room/page.tsx:10`, `BITrustLegend.tsx:96`. Similar metadata exists in manager, cash command, stock-to-cash, daily digest, and assurance routes.

**Change:** adopt Stoquify consistently in user-facing titles, help, state copy, and document presentation. Internal resource identifiers are separate technical contracts and should not be renamed as a cosmetic sweep.

**Acceptance:** customer-facing audit of all discovered route titles and shared states finds no unintended old product name; route identity/authorization unchanged. **Effort:** 1–2 days. **Confidence:** high.

### F09 · P2 · Shared styling exists but visual treatment is uneven

**Evidence (B/S):** rendered screens combine visible grid texture, translucent nested cards, accent outlines, duplicate title bands, and many small labels. Customer/supplier/item headers use `text-3xl sm:text-4xl`, while command primitives use compact headings. Payroll uses local slate/cyan/rose palettes. Navbar and Sidebar contain literal color values; the component registry explicitly warns against copying them into new surfaces.

**Change:** quiet table/work surfaces, restrained borders, one compact page header, one main action, existing 8 px radius, and consistent numeric alignment. Reduce decorative texture behind operational data, keeping approved semantic colors and gold/chestnut variants. Treat any global texture/token change as a scoped design decision.

**Acceptance:** visual comparison of home, inventory, POS, sales, finance, payroll, AP, and settings at agreed breakpoints; focus/contrast checks using rendered colors; no blanket recoloring of controls. **Effort:** 4–8 days for the first representative set. **Confidence:** high for visible inconsistency, medium for preferred density until user testing.

### F10 · P2 · Module navigation does not establish a daily-work hierarchy

**Evidence (S/B):** `config/sidebar.ts` declares many modules as primary; `getDefaultSidebarLinks` retains primary/utility/active entries. Observed super-admin navigation has 10 modules, with Finance showing 16 child destinations and HR/Payroll 13. Role-specific rendered menus were not tested. Dashboard, Command Center, Daily Digest, owner, manager, analytics, and finance entry points overlap conceptually.

**Change:** offer a permission-safe “My work” landing and a small set of suggested shortcuts per work responsibility, with all permitted modules still searchable. Let users pin useful destinations if research supports it. Preserve expert navigation and direct links. Avoid forcing a cashier through an executive dashboard.

**Acceptance:** role-specific destination tests; five frequent tasks found in moderated sessions without navigating multiple competing overview pages; pinned targets rechecked after permission changes. **Effort:** 4–7 days. **Confidence:** medium; role research needed.

### F11 · P2 · Product creation treats enrichment as a long serial workflow

**Evidence (S):** five steps in `CreateItemWizard.tsx:158–162`: Basic Info, Details, Pricing, Inventory, Media. Source includes bilingual descriptions, images, stock setup, and purchasing reference inputs. Existing partial-reference-data warnings are a positive feature.

**Change:** evaluate a short “Create usable item” path containing the actual mandatory domain fields, with optional enrichment afterward. Keep an explicit review for stock introduction, costing, tax, and other controlled inputs; do not make required business evidence optional for speed.

**Acceptance:** compare first usable item task completion with the current wizard in an isolated tenant; required validations retained; optional reference failures have clear impact; error summary links to fields. **Effort:** 4–6 days after requirements review. **Confidence:** medium; minimum field set requires domain validation.

### F12 · P2 · AP should emphasize the next case, not another summary layer

**Evidence (S):** `APControlWorkbench.tsx:344–415` renders a command brief, state panels, five KPI tiles, four control signals, then the action queue and invoice table. Table width is at least 1,040 px. Existing invoice preparation, approval, execution, recovery, and reconciliation routes are separate controlled stages.

**Change:** make the invoice/payment case the organizing unit: stage, amount/currency, blocker, responsible role, next action, and evidence drawer. Keep a compact status summary above the queue. Wide-table scrolling is not inherently a defect; test its labelled scroll region and action reachability.

**Acceptance:** requester→independent approver→execution→reconciliation handoff preserves the same case/revision; requested, approved, executed, and reconciled never collapse into one “done” status; reviewer sees current evidence before acting. **Effort:** 5–9 days. **Confidence:** medium-high source; browser flow pending.

### F13 · P2 · Payroll mixes daily operations with release/adapter administration

**Evidence (S):** `PayrollCommandCenter.tsx:1342–1372` includes ten metrics, pilot certification, blocker flow, run review, finance state, final release, country-pack review intake, adapter operations, and freshness. Operational and technical responsibilities share the same composition.

**Change:** make payroll period readiness and the next authorized action primary. Put run details, employee input gaps, payments, and declarations in coherent stages. Keep infrastructure/adapter certification visible to the appropriate administrative responsibility through a separate detail view; retain any blocker that affects the current run.

**Acceptance:** payroll preparer can find the earliest unresolved prerequisite and affected people without inspecting release terminology; employee self-service cannot expose administrative evidence; release gates stay authoritative. **Effort:** 5–8 days. **Confidence:** high source, runtime unverified.

### F14 · P2 · Collaboration is present but needs a clearer handoff experience

**Evidence (S):** `AccountantWorkDesk.tsx:164–229` already shows client, period, due/submitted time, owner, delivery, publication, evidence replacement, review notes, identity confirmation, and acceptance. `AccountantPortfolio.tsx` contains mandate-scoped client navigation. This is a strong starting point.

**Change:** turn that information into an explicit case timeline: requested → submitted → reviewed → resolved, with the responsible party, next step, and delivery status. Surface “Waiting on me” and “Waiting on client,” and return users to the exact case after authentication. Do not add a generic chat system before testing whether contextual evidence requests solve the coordination problem.

**Acceptance:** independent parties understand who must act; submitted proof is not labelled accepted; stale/replaced proof invalidates readiness appropriately; denied/revoked mandates remove access; no notification sends without the intended existing workflow. **Effort:** 5–8 days. **Confidence:** medium, validate with accountants and client operators.

### F15 · P2 · Accessibility and responsiveness need measured acceptance, not styling assumptions

**Evidence (B/S):** observed multiple h1s in shell and owner content; shared robust states and keyboard search are positive. Dense small labels and substantial mobile stacking need measurement. Narrow owner AX reflow was observed but screenshot capture failed. No full keyboard journey, screen-reader session, computed contrast audit, or mobile transaction test passed in this audit.

**Change:** consolidate page/region hierarchy, labels, focus return, and linked validation summaries. Verify 320 CSS px reflow with appropriate exceptions for genuinely two-dimensional tables; WCAG 2.2 AA pointer targets require 24×24 CSS px or a qualifying exception, while a 44 px operational target is a useful product choice for frequent touch actions. Sources: [W3C Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) and [W3C Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

**Acceptance:** keyboard-only primary tasks; focus not obscured by headers/drawers; EN/FR zoom/reflow; measured contrast; statuses announced without focus theft; automated checks plus manual assistive-technology review. **Effort:** 3–6 days for prioritized journeys, further remediation depends on findings. **Confidence:** high that evidence is incomplete; specific conformance failures beyond observed semantics are not asserted.

### F16 · P2 · Referral reporting is an acquisition foundation, not proof of a network effect

**Evidence (S):** `ReferralFunnelDashboard.tsx:30–75` distinguishes accountant-invite/customer-statement sources and prepared links, clicks, and registrations. Public digital receipt, statement, and supplier-purchase-order routes exist. No conversion/retention dataset was analyzed.

**Change:** connect referral experiments to a completed useful outcome and track activation after signup. Keep recipient value independent of promotional requests. Treat network effects as hypotheses requiring evidence that existing users benefit from additional participants.

**Acceptance:** measure eligible useful outcomes→optional referral offer→intentional share→qualified signup→activation; compare cohorts without exposing private financial or HR data. **Effort:** 3–5 days for a bounded measurement experiment after event review. **Confidence:** medium; commercial uplift unproven.

## Module and role coverage

All 167 page files are listed in `coverage.md`. Below is the depth of assessment, not a claim that every leaf form was exercised.

| Surface group | Current evidence and useful foundation | Audit direction / gap |
|---|---|---|
| Public/auth/shared documents | Route composition, landing hero, auth contracts, login source; receipt/statement/supplier token route inventory | Preserve distinct public/auth styling; test sign-in/recovery/onboarding and recipient journeys; live public capture unavailable |
| Dashboard, owner, manager, daily digest | Dashboard/owner rendered; manager/digest component and graph/source review | F01–03, F05, F09–10; manager branch-close remains source-only |
| POS, cash drawer, terminals | POS rendered blocked/recovery state; main component and route inventory | F06; no checkout, refund, close, or recovery command executed |
| Inventory and master data | 23 inventory routes, wizard, movement/loss components, contracts | F04–05, F09, F11; list/detail/correction/transfer workflows not rendered |
| Sales and reports | Sales wrapper, performance query/scope model, detailed page contract | Preserve sales/collection/contribution distinctions; use scope persistence elsewhere; browser sales flow pending |
| Purchases, AP, suppliers | Route families, AP/request/receiving components, supplier composition | F12; preserve receiving/revision and independent payment approval controls |
| Finance, reconciliation, stock-to-cash | Shared finance dashboard, specialized routes, source statuses | F03, F05, F09; data distinction and unit consistency need runtime checks |
| Accounting, close, accountant portfolio | Close source, work desk/portfolio, page inventory | F03, F14; existing proof/review journey is strategic value |
| Payroll and HRIS | Payroll/employee self-service/approval source and route inventory | F04, F13; French payroll navigation attempted but rendered state not captured |
| Compliance and assurance | Dashboard components, incident routes, evidence presentation | Maintain policy gates; simplify frontline language; expert detail remains available |
| Customers, referrals, external relationships | Customer dashboard, referral source, public document inventory | F09, F16; evaluate useful outputs and consent-based introductions |
| Settings, modules, security, onboarding, access requests | 22 settings routes, module workbench/style and master-data onboarding source | Improve setup-to-first-value sequencing; preserve retained access and explicit dependency warnings |
| Legacy aliases, demos, previews | Included in route inventory; redirect evidence recorded | Do not count as independent product coverage; confirm intended exposure before retiring anything |

| Actual role/template or audience | Proposed daily starting point | Critical test remaining |
|---|---|---|
| SUPER_ADMIN | Organization context and authorized operating overview; administration separate | Observed role only; cross-org navigation not exercised |
| ADMIN | Owner/business overview when permissions support it; pending company setup | Do not assume ADMIN equals owner authority; role-specific gates and scoped figures |
| MANAGER | Branch exceptions, approvals, shift/stock follow-up | Location scope, delegation, and denied cross-branch actions |
| SUPERVISOR | Shift handoff, operational exceptions, review queue | Approval boundary and escalation without unauthorized action |
| EMPLOYEE | Assigned work and My HR | Own-data privacy; role and employee identity binding |
| CASHIER | Resume valid register/shift, search, cart, tender | Real keyboard/touch sale and uncertain-result recovery in disposable fixtures |
| VIEWER | Readable summaries and permitted drill-through | No misleading active mutation affordances; export independently authorized |
| Finance/payroll/inventory specialists | Domain-specific work queue based on effective permissions | These are personas, not presumed additional role templates |
| External accountant | Mandate-scoped portfolio and evidence requests | Revoked/expired mandate, step-up, independent review |
| Supplier/customer recipient | The specific shared order, receipt, or statement | Token expiry/revocation, privacy, mobile readability, meaningful next step |

The seven role templates are declared at `lib/permissions.ts:334–745`. Custom roles/effective permissions and external mandates require their own tests; the template list is not exhaustive of real assignments.

## Proposed visual and interaction direction

**Calm operational workspace.** Keep product blue and the existing dark surface hierarchy. Use color to direct attention to the next decision; reserve warning/danger for actual states, not decoration. Keep gold/chestnut variants in their approved contexts. Use existing typography and tokens rather than adding fonts or animation libraries.

- One compact page header: title, organization/location, period/freshness, and primary action. Avoid repeating organization and explanations across multiple oversized boxes.
- Owner view: four or fewer decision metrics followed by a deduplicated action queue. Detailed evidence and technical provenance live in contextual drawers.
- Operator view: stable record identity, controls, and main working area. Setup collapses when ready; blockers expand when they matter.
- Table view: one filter toolbar, clear active scope, right-aligned tabular numerals, row identity, named row action, and optional detail drawer. Preserve intentional horizontal scrolling for wide evidence tables.
- Mobile: context and next action first; do not merely stack the full desktop executive dashboard. Use a dedicated cart view or sheet on narrow POS layouts with focus restoration and an explicit return to the catalog.
- Copy: describe the business consequence and safe next step; use exact financial states. “Approved” is not “paid,” and “paid” is not “reconciled.”

The layout artifact illustrates these decisions with three selectable proposals and annotations. It is not a working product or evidence that the proposed UI has passed accessibility review.

## Retention, collaboration, network effects, and referrals

| Mechanism | Existing starting point | Proposed experiment and value | Measurement / guardrail |
|---|---|---|---|
| Retention | Daily brief, action queues, saved sales scope | Return directly to unresolved work with a useful “what changed” summary; remember permitted scope | Weekly completed core tasks per active operator; revisit→successful outcome rate; opt-in summaries only where valuable |
| Collaboration | Accountant work desk, approvals, proof requests | A shared case shows who acts next, what evidence is missing, and whether it was accepted | Time waiting between roles; first-pass acceptance; fewer duplicate evidence requests; mandate/privacy checks |
| Potential same-organization network effect | Shared operational handoffs | Additional authorized participants complete missing parts of a workflow, making shared status more useful for existing participants | Test whether adding the required role reduces existing users' blocked time; invitation count alone is not evidence |
| Potential accountant/client network effect | Mandate-scoped portfolio and client evidence exchange | Accountants serving more participating clients can reuse workflow knowledge; clients benefit if their accountant already knows the tool | Compare time to first reviewed evidence and ongoing effort; distinguish workflow familiarity from a genuine network effect; no cross-client data pooling |
| Potential supplier/customer network effect | Supplier acknowledgements, receipts, statements | Reliable reciprocal document exchange could reduce chasing/rekeying for both sides | Counterparty completion time and fewer discrepancies; require evidence of mutual value before investing in a broad network |
| Referrals | Existing invite/statement funnel | Offer an optional recommendation after a verified valuable outcome, with the useful document accessible regardless | Qualified activation, not just clicks/signups; avoid forced invitations and repeated promotional interruptions |

Do not prioritize a social feed, universal chat, gamified streaks, or AI summaries just to increase visits. The defensible reason to return is that work is easier to finish and the record is trustworthy. AI assistance is a separate hypothesis requiring its own accuracy and authorization review.

## Phased implementation backlog

| Phase | Scope and order | Indicative effort | Exit gate | Rollback |
|---|---|---:|---|---|
| 0 — Complete evidence | Working browser access; baseline representative tasks with 2 owners, 2 cashiers, 2 operations staff, 2 finance/accounting users where feasible; record current outcomes | 2–4 days plus scheduling | Roles/locales/viewports and missing paths documented; no invented baseline | Audit artifacts only |
| 1 — Immediate credibility | F08 branding; F07 misleading bars; F05 critical links/locale scope; F04 high-frequency copy; initial F09 header consistency | 5–9 days | Existing routes resolve; scoped EN/FR navigation; visual comparison; relevant regression checks | Revert owned presentation/link changes; no schema rollback |
| 2 — Daily usefulness | F01 home; F02 owner composition; F03 copy/disclosure; F06 POS workspace | 8–14 days | Timed representative tasks, state fixtures, desktop/mobile keyboard checks; domain review of recovery behavior | Retain previous presentation behind a controlled rollout where justified; preserve backend contracts |
| 3 — Cross-role completion | F10 responsibility navigation; F11 item path; F12 AP case; F13 payroll stages; F14 accountant handoff | 12–22 days, sequence by evidence | Independent-actor journey tests, permission denial, stale/replaced evidence, return-path continuity | Roll back each presentation phase independently; additive state requires explicit migration plan |
| 4 — Growth experiments | F16 plus voluntary return and collaboration experiments | 4–7 days per bounded experiment | Measured activation/retention/collaboration benefit with privacy guardrails | Disable experiment; retain lawful operational evidence and user preferences |

Efforts overlap and must not be summed mechanically. Suggested responsibility: product/design owns hierarchy and copy; frontend owns shared presentation and navigation; domain owners review stock/payment/payroll/close meaning; QA owns journey evidence. No individuals are assigned by this audit.

### Measurement plan

Establish baselines first. Candidate targets below are validation hypotheses, not forecasts:

- Owner identifies the highest-priority actionable issue and its next step in under 30 seconds in a moderated task.
- Returning operator reaches the intended workspace without passing through unrelated setup.
- Compare successful task completion, median time, and recovery errors before/after for stock investigation, cashier recovery, and evidence handoff; require no regression in financial/control errors.
- Track onboarding to first usable catalog item, first confirmed sale, or first reviewed close evidence, depending on persona. A signup is not activation.
- Use meaningful weekly/monthly return windows by role; monthly payroll users should not be judged by daily visits.
- Record non-sensitive event metadata: authorized role category, workflow type, step, result, and latency. Do not collect salary values, customer identities, raw evidence, or private document content for product analytics.
- Monitor support themes, user-rated confidence after recovery, and reason for recommendation. Review experiment cohorts and sample limitations before attributing causality.

## Verification and remaining uncertainty

`npm run agent:workflow:check` passed: 198 package scripts remain outside the reviewed manifest. This verifies the workflow contract, not application correctness. No build, migration, seed, database test, application unit suite, or production mutation was performed. Source search and inventory generation are not unit tests.

Browser navigation and capture intermittently timed out. The local port check did not locate the process, but the Edge session later proved the application was running; the earlier negative result was not treated as definitive availability evidence. The observed fixture-like names and stale records are not proof of production data health. Navigation delays cannot be attributed to the application rather than development compilation, database latency, or browser tooling without profiling.

Remaining work for implementation readiness: verify all restricted-role views; complete EN/FR browser coverage; exercise empty/denied/locked/loading/partial/failed/uncertain states in isolated fixtures; verify responsive/tablet/zoom/focus/contrast; validate menu-to-record and return paths; measure performance in a known build; interview users; and confirm domain acceptance of each simplified presentation.

Only audit documents, evidence, inventory output, and standalone proposals were added under this report directory. No application changes were implemented.
