# Work Breakdown Structure

Every work package includes the required implementation, verification, validation, rollout, rollback, evidence, ownership, estimate, and risk fields. Estimates are ideal engineer-day ranges, not commitments.

## Gate 0 — Program control

### G0-01 — Current-truth baseline and evidence ledger

- **Sources:** all audit findings; Gate 0.
- **Outcome / control:** freeze a reproducible repository baseline so later “fixed” claims compare against known truth.
- **Current evidence / revalidation:** 140 pages, 124 dashboard pages, 387 module surfaces, 67 dirty entries; rerun counts, graph freshness, exports, route duplicates, currency/theme/state/accessibility/test inventory on the execution branch.
- **Scope / non-goals / likely areas:** read-only scans of `app`, `actions`, `services`, `components`, `hooks`, `lib`, `config`, `prisma`, `scripts`, `graphify-out`, `what-next`; no application edits or unrelated cleanup.
- **Service/data/API:** inventory service/action/API boundaries and organization truth sources; no schema mutation.
- **Security/privacy/audit:** redact status/evidence; do not inspect production PII; record command provenance.
- **UX/a11y/localization:** baseline all route/state/theme/EN-FR/accessibility signals; do not claim certification.
- **Dependencies / parallelism:** root package; scans may run in parallel if outputs are deterministic and paths do not overlap.
- **Implementation:** create command ledger, stable scan definitions, baseline JSON/Markdown, discrepancy table, file-owner map.
- **Migration:** none.
- **Observability:** record timestamps, commit/worktree identity, tool versions, false-positive caveats.
- **Automated verification:** validate JSON schemas and rerun scans for deterministic counts.
- **Human validation:** architecture, QA, product, finance, security, and accessibility owners approve their baseline slice.
- **Rollout / rollback:** planning artifact only; regenerate rather than hand-edit results.
- **Evidence / DoR / DoD:** audit present; done when every proposal has current evidence status and no orphan.
- **Estimate / owner / reviewers:** 3–5 days; program lead; architecture + QA + domain owners.
- **Blockers / residual risk:** active worktree changes can move counts; timestamp and rebaseline each execution wave. Residual: low.

### G0-02 — Architecture decisions and contract ownership freeze

- **Sources:** CT-01–CT-10; all P0/P1 dependencies.
- **Outcome / control:** approve interfaces, owners, source-of-truth boundaries, versioning, and decision authority before implementation.
- **Current evidence / revalidation:** foundations exist but are fragmented; verify named owners and current architectural constraints.
- **Scope / non-goals / likely areas:** ADR-UI-001–010, service/client boundaries, route/capability/state/action/token contracts; no production code.
- **Service/data/API:** define server ownership, compatibility, error/failure, schema implications, and event/artifact boundaries.
- **Security/privacy/audit:** threat/tenant/privacy review for each contract; segregation of decision authorities.
- **UX/a11y/localization:** require accessibility and EN/FR behavior in every public contract.
- **Dependencies / parallelism:** depends G0-01; ADR reviews may run concurrently, final freeze is coordinated.
- **Implementation:** document alternatives, decision, consequences, version, adoption/rollback and reviewer.
- **Migration:** identify legacy adapters and sunset criteria.
- **Observability:** contract version and adoption metrics.
- **Automated verification:** schema/type examples and contract-test plan.
- **Human validation:** full multidisciplinary board; every role records finding or reviewed/no addition.
- **Rollout / rollback:** ADR amendments require impact review; no silent contract drift.
- **Evidence / DoR / DoD:** baseline accepted; done when ten ADRs have accountable approval or named blocker.
- **Estimate / owner / reviewers:** 3–5 days; principal architect; full roster.
- **Blockers / residual risk:** product/finance/billing decisions may delay freeze. Residual: medium until approved.

### G0-03 — Deterministic role, package, tenant, locale, and currency fixtures

- **Sources:** P0-03, P1-08, CT-10, Phase D.
- **Outcome / control:** reusable, redacted fixtures make UI/server parity and browser evidence reproducible.
- **Current evidence / revalidation:** payroll/transaction-history auth setups exist; no complete cross-domain role/package matrix.
- **Scope / non-goals / likely areas:** Playwright auth setup, seed helpers, fixture contracts, evidence retention; no real customer data.
- **Service/data/API:** seed only supported states through service-safe paths; no destructive reset in shared environments.
- **Security/privacy/audit:** synthetic identities, least privilege, no secrets in artifacts, tenant separation assertions.
- **UX/a11y/localization:** owner/cashier/inventory/AP/accountant/payroll/external-accountant/support; EN/FR; XAF/XOF/EUR/USD.
- **Dependencies / parallelism:** depends G0-01; may run beside ADR work; manifest population later depends B-01.
- **Implementation:** fixture catalog, stable IDs, setup/teardown, role/package/location combinations, redaction policy.
- **Migration:** none; fixtures version with schema.
- **Observability:** seed version, fixture freshness, setup failures, leaked-secret scan.
- **Automated verification:** fixture schema, login, permission/entitlement expectations, cross-tenant negative tests.
- **Human validation:** domain owners confirm realism without sensitive data.
- **Rollout / rollback:** test-only; retire fixtures through versioned manifest.
- **Evidence / DoR / DoD:** role list approved; done when pilot routes can run repeatably with isolated fixtures.
- **Estimate / owner / reviewers:** 3–8 days; QA automation; security/privacy + domain owners.
- **Blockers / residual risk:** country-pack/payroll fixture complexity. Residual: medium.

## Phase A — P0 trust and release blockers

### A-01 — Inventory headline truth read model and UI cutover

- **Sources:** P0-01, CT-01/02/05, Brief A.
- **Outcome / control:** item-page KPIs are organization/location/filter scoped, page-size invariant, currency-correct, provenance-bearing, and explicitly complete/partial.
- **Current evidence / revalidation:** page reduces paginated `initialItemData`; `getInventoryStats()` uses reorder points but lacks filter/as-of/provenance/currency contract. Reconfirm approved metric definitions and all item locations.
- **Scope / non-goals / likely areas:** inventory read service/action, item page, KPI components/tests; do not rewrite stock ledger or valuation kernel.
- **Service/data/API:** extend service-owned summary; precise decimal/money representation; query totals independently from page rows.
- **Security/privacy/audit:** organization and location scope; RBAC/module decision; no cross-tenant aggregation.
- **UX/a11y/localization:** label cost value vs retail potential/margin; show scope, as-of, completeness, error/partial states in EN/FR.
- **Dependencies / parallelism:** G0-02, A-02, A-03; service characterization may start early; UI cutover waits.
- **Implementation:** approve formulas; extend/harden inventory stats; adapter/action; shadow compare; cut over KPIs; remove page reductions and hard-coded threshold/USD.
- **Migration:** no persisted-value change expected; schema change requires separate approval.
- **Observability:** summary latency, source completeness, scope, old/new drift, failure correlation.
- **Automated verification:** page-size 10/25/50/100 invariance, filters, multiple locations, reorder point, zero/negative, currency, failure/partial, tenant negative.
- **Human validation:** inventory controller + accountant/finance owner approve values and labels.
- **Rollout / rollback:** shadow flag → internal → pilot; rollback UI adapter, retain service logs.
- **Evidence / DoR / DoD:** metric ADR and contracts ready; done when KPI tie-out and P0 gate pass.
- **Estimate / owner / reviewers:** 6–10 days; inventory backend/frontend; finance, data, QA, accessibility.
- **Blockers / residual risk:** valuation semantics and legacy inventory quality. Residual: medium.

### A-02 — Completeness, freshness, and safe error taxonomy

- **Sources:** P0-01, P1-06, CT-02/05.
- **Outcome / control:** failed, partial, stale, empty, and unavailable reads cannot be confused.
- **Current evidence / revalidation:** item page has five catch-to-null calls; DashboardRouteState and BI/history completeness foundations exist. Find all catch-to-empty and manual state mappings.
- **Scope / non-goals / likely areas:** service result types, error handling, route states, correlation; no broad error-system rewrite beyond UI read paths.
- **Service/data/API:** typed source status, completeness, snapshot/as-of, reason code, safe correlation ID.
- **Security/privacy/audit:** public messages reveal no secrets/tenant data; logs retain protected detail.
- **UX/a11y/localization:** localized recovery actions; live announcement/focus; filtered-empty distinct from source-empty.
- **Dependencies / parallelism:** G0-02/ADR-UI-005; may run beside A-03/A-05.
- **Implementation:** inventory taxonomy; extend shared state; adapters; replace silent fallbacks risk tier first; route registry later enforces declaration.
- **Migration:** response-version adapters only.
- **Observability:** state distribution, retries, source failures, stale age, recovery success.
- **Automated verification:** mapping tables, failure injection, timeout/partial sources, accessible state semantics.
- **Human validation:** support and domain operators can distinguish and recover from each state.
- **Rollout / rollback:** route flags; rollback renderer, never restore silent empty.
- **Evidence / DoR / DoD:** error ADR accepted; done when migrated P0 reads expose explicit state.
- **Estimate / owner / reviewers:** 5–8 days; backend platform + design system; SRE, accessibility, support.
- **Blockers / residual risk:** inconsistent legacy action result shapes. Residual: medium.

### A-03 — DisplayContext v1

- **Sources:** P0-02, CT-01, Brief A.
- **Outcome / control:** one trusted locale/currency/timezone context governs UI, notifications, reports, and exports.
- **Current evidence / revalidation:** org fields and multiple domain implementations exist; `lib/i18n/formatters.ts` defaults USD. Confirm organization/accounting base-currency precedence.
- **Scope / non-goals / likely areas:** platform display contract/resolver/formatters/adapters; no monetary-value conversion or FX feature.
- **Service/data/API:** server resolution, validation, immutable v1 payload, accounting-setting precedence, invalid-context error.
- **Security/privacy/audit:** tenant-scoped read; context version in evidence; no client override of business currency.
- **UX/a11y/localization:** EN/FR number/date/money; timezone labels; bidirectional-safe formatting if future locales.
- **Dependencies / parallelism:** G0-02/ADR-UI-001; parallel with A-02/A-05/A-06.
- **Implementation:** inventory current formatters; define resolver; tests; legacy adapter; pilot dashboard/inventory.
- **Migration:** additive; no schema unless audit proves missing truth.
- **Observability:** missing/invalid context, fallback/adaptor usage, version.
- **Automated verification:** XAF/XOF/EUR/USD, precision, locale separators, invalid timezone/currency, server/client parity.
- **Human validation:** finance + bilingual reviewer approve examples.
- **Rollout / rollback:** module flag; rollback to explicit organization-aware adapter, not USD default.
- **Evidence / DoR / DoD:** precedence ADR approved; done when pilot surfaces and notification/export adapters pass.
- **Estimate / owner / reviewers:** 5–8 days; platform/backend; finance, localization, QA.
- **Blockers / residual risk:** base vs transaction currency ambiguity. Residual: medium.

### A-04 — Currency/locale migration and hard-code guard

- **Sources:** P0-02, P2-04, CT-01/09, Brief A.
- **Outcome / control:** production business UI has no unapproved hard-coded money/locale behavior.
- **Current evidence / revalidation:** heuristic 59 lines/26 files; classify selectors, tests, examples, real displays; current report/POS/notification/purchase paths are highest risk.
- **Scope / non-goals / likely areas:** inventory, purchasing/AP, finance, POS, notifications, reports, analytics, settings; no FX conversion.
- **Service/data/API:** pass context/currency through read models and artifacts; remove UI fallback.
- **Security/privacy/audit:** exported/notification values match tenant context and source transaction.
- **UX/a11y/localization:** typed messages and formatters; EN/FR; currency-code disambiguation where symbols collide.
- **Dependencies / parallelism:** depends A-03; domains can migrate in parallel with non-overlapping ownership.
- **Implementation:** classify register; migrate risk tier; add CI gate with fixtures/selectors exception file; remove obsolete formatters.
- **Migration:** display-only unless separate data finding; no persisted rewrite.
- **Observability:** exception count, fallback use, mismatched export/UI currency.
- **Automated verification:** scan gate, snapshots, notification/export parity, domain tests.
- **Human validation:** finance/accountant/bilingual reviewers sample each domain.
- **Rollout / rollback:** module flags; revert adapter while keeping context resolver.
- **Evidence / DoR / DoD:** A-03 stable; done when classified register has zero unapproved risk-tier occurrence.
- **Estimate / owner / reviewers:** 12–22 days; platform + module teams; finance/localization/QA.
- **Blockers / residual risk:** literal scan false positives and hidden server-generated strings. Residual: low after classification.

### A-05 — Real action, export, and artifact contract

- **Sources:** P0-04, CT-06, Brief A/D.
- **Outcome / control:** no enabled UI control can report success without a real, auditable outcome.
- **Current evidence / revalidation:** inventory and users exports lack handlers; customer export simulates completion; working PO/reconciliation exports and report-trust gate are references. Inventory every enabled control.
- **Scope / non-goals / likely areas:** shared action state, export response/artifact schema, affected controls, tests; no speculative export feature for every page.
- **Service/data/API:** idempotency, artifact ID, scope, filters, row count, type/hash, created/expires, download authorization.
- **Security/privacy/audit:** tenant scope, permission/entitlement, redaction, retention, access logging.
- **UX/a11y/localization:** hidden/locked/disabled/executable states; progress/cancel/failure; accessible status; EN/FR.
- **Dependencies / parallelism:** G0-02/ADR-UI-006 and capability design; may run beside display/accessibility.
- **Implementation:** registry scan; disable false controls immediately; define contract; adapt working exporter; implement approved exports; remove simulated toast.
- **Migration:** no data migration; artifact retention/backfill not required for prior false actions.
- **Observability:** action/result/artifact/correlation, duration, failures, retries, downloads.
- **Automated verification:** file/artifact exists, metadata/filter parity, denial, idempotency, expired/revoked access.
- **Human validation:** auditor/accountant/support confirm evidence and recovery.
- **Rollout / rollback:** exporter flags; safe fallback is disabled control, never simulation.
- **Evidence / DoR / DoD:** artifact ADR and inventory complete; done when zero enabled false action remains in certified routes.
- **Estimate / owner / reviewers:** 8–14 days; backend/integration + frontend; audit/security/privacy/QA.
- **Blockers / residual risk:** export retention/provider storage. Residual: medium.

### A-06 — Public/auth WCAG remediation

- **Sources:** P0-05, CT-07, Brief C.
- **Outcome / control:** public and auth routes meet WCAG 2.2 AA automated and agreed manual gates.
- **Current evidence / revalidation:** earlier serious contrast/ARIA findings; invalid selectors absent in current source, so rerun axe. Auth chips/contrast and form semantics remain likely.
- **Scope / non-goals / likely areas:** landing/auth components, colors, semantics, focus, reduced motion, zoom; no public-site redesign.
- **Service/data/API:** safe server-error mapping only.
- **Security/privacy/audit:** accessibility changes preserve anti-abuse, consent, and non-disclosing errors.
- **UX/a11y/localization:** semantic groups, contrast, focus, announcements, keyboard, EN/FR, 320px/400% zoom.
- **Dependencies / parallelism:** G0-02; can run beside other A packages; auth field primitive aligns A-07.
- **Implementation:** rerun route axe; fix confirmed nodes; field/status semantics; manual scripts; regression tests.
- **Migration:** none.
- **Observability:** auth completion/error categories without PII; accessibility regression status.
- **Automated verification:** axe, keyboard automation, contrast, route smoke, screenshots, reduced motion.
- **Human validation:** NVDA/VoiceOver user and bilingual reviewer complete flows.
- **Rollout / rollback:** route flag only for structural changes; never roll back required contrast/semantics without equivalent fix.
- **Evidence / DoR / DoD:** current scan captured; done at zero critical/serious plus manual pass.
- **Estimate / owner / reviewers:** 4–8 days; auth/public frontend; accessibility, QA, product/security.
- **Blockers / residual risk:** screen-reader reviewer availability. Residual: low after manual validation.

### A-07 — Accessible auth fields, simplified signup, and safe handoff

- **Sources:** P0-05, P1-04/05, CT-07, Brief C.
- **Outcome / control:** users can authenticate/accessibly start an account without front-loaded nonessential setup; required security/legal data remains governed.
- **Current evidence / revalidation:** active login has 3 controls and register 21 heuristic controls with no invalid/described/live/autocomplete semantics; V2 alternatives remain.
- **Scope / non-goals / likely areas:** active auth fields/layout/copy, minimum registration, handoff contract; onboarding implementation completes B-07.
- **Service/data/API:** preserve identity, abuse controls, consent, transactionality; classify required/deferred fields.
- **Security/privacy/audit:** no enumeration, password/autofill correctness, consent record, fresh auth where required.
- **UX/a11y/localization:** first mobile field above fold, one dominant task, accessible validation, EN/FR.
- **Dependencies / parallelism:** A-06 and ADR-UI-008; product/legal decision blocks field removal.
- **Implementation:** select canonical auth; accessible field primitive; simplify hierarchy; reduce required fields; emit resumable onboarding handoff.
- **Migration:** preserve existing registration API compatibility; no user data loss.
- **Observability:** completion, step abandonment, errors, autofill success, handoff creation; no sensitive field logging.
- **Automated verification:** unit/integration/auth abuse, axe, keyboard, mobile viewport, EN/FR, consent.
- **Human validation:** new user, screen-reader user, product, legal/security, customer success.
- **Rollout / rollback:** A/B or cohort with stable auth fallback; retain field semantics on rollback.
- **Evidence / DoR / DoD:** canonical auth/field decisions ready; done when agreed signup outcome and accessibility pass.
- **Estimate / owner / reviewers:** 7–12 days; auth product/engineering; accessibility, security, legal, localization.
- **Blockers / residual risk:** legal/data-minimum disagreement. Residual: medium.

### A-08 — Capability parity and staged entitlement enforcement

- **Sources:** P0-03, P1-03, CT-03, Brief B.
- **Outcome / control:** server and UI make the same permission/module/org/location/access-intent decision without locking out legacy tenants unexpectedly.
- **Current evidence / revalidation:** strong RBAC, module evaluator/tests, API enforcement and some explicit mode enforcement; default observe, hard flag false, 257 candidates, 6 unmapped, 4 missing permissions.
- **Scope / non-goals / likely areas:** module contracts/service, server authz, route/action/API inventory, billing/package source; no global big-bang enforcement.
- **Service/data/API:** stable decision/reason; read/write/export/job intent; package dependency; organization/location scope.
- **Security/privacy/audit:** least privilege, wildcard does not bypass entitlement, decision logging/redaction, fresh auth/SoD preserved.
- **UX/a11y/localization:** available/locked/hidden/read-only/not-configured/unavailable states and safe reasons.
- **Dependencies / parallelism:** G0-02/ADR-UI-003; migration design can parallel A packages; enforcement cohorts are sequential.
- **Implementation:** classify 257 candidates; resolve 6/4 debt; migrate source truth; observe parity; pilot enforce APIs/actions/routes; expand cohorts.
- **Migration:** legacy full-suite/requestedModules/package entitlements with reversible mapping and tenant communication.
- **Observability:** would-block/deny/mismatch/bypass/dependency/legacy usage and denial support rate.
- **Automated verification:** matrix across roles/packages/locations/intents, deep links, API/actions/jobs, cross-tenant negative.
- **Human validation:** security, billing/product, support, module owners validate intended access.
- **Rollout / rollback:** observe → shadow compare → pilot → cohort → default; cohort rollback to observe while RBAC stays enforced.
- **Evidence / DoR / DoD:** source ADR and migration fixtures ready; done when registered P0 pilot surfaces have parity and no unexplained denial.
- **Estimate / owner / reviewers:** 18–30 days; IAM/platform + billing; security, product, module teams, QA/support.
- **Blockers / residual risk:** entitlement source and legacy commercial commitments. Residual: medium.

### A-09 — Immediate route aliases and false-affordance containment

- **Sources:** P1-01, P0-04, CT-04/06, Brief B.
- **Outcome / control:** confirmed equivalent routes converge safely and known false controls cannot mislead during the larger program.
- **Current evidence / revalidation:** item `/new` redirects now; suppliers, locations, tax-rate, item-list and V2 auth duplicates remain. Confirm traffic and behavioral equivalence.
- **Scope / non-goals / likely areas:** low-risk redirects, disabled states, analytics mapping; full typed registry is B-01.
- **Service/data/API:** no domain behavior change; redirects preserve query/locale.
- **Security/privacy/audit:** authorization remains at canonical route; no open redirect.
- **UX/a11y/localization:** clear disabled reason; no duplicate breadcrumbs/help paths.
- **Dependencies / parallelism:** A-05/A-08 and canonical-choice ADR; safe confirmed aliases may ship earlier.
- **Implementation:** usage evidence; choose destinations; tests; redirect/disable; deprecation notice.
- **Migration:** bookmarks/support docs; no destructive removal.
- **Observability:** alias traffic, redirect loops/failures/denials, disabled-control interactions.
- **Automated verification:** locale/query/analytics continuity, capability parity, route smoke.
- **Human validation:** support/product verify task continuity.
- **Rollout / rollback:** reversible route mapping; retain alias until traffic window closes.
- **Evidence / DoR / DoD:** equivalence and owner approved; done for confirmed P0/P1 aliases and controls.
- **Estimate / owner / reviewers:** 3–6 days; frontend platform; product, support, security, QA.
- **Blockers / residual risk:** auth V2 may be experiment rather than alias. Residual: medium.

## Phase B — Enterprise platform contracts

### B-01 — Typed canonical route registry

- **Sources:** P1-01, CT-04, Brief B.
- **Outcome / control:** every active route has one owner, module, capability, breadcrumb, state contract, telemetry name, aliases, and retirement policy.
- **Current evidence / revalidation:** 140 routes/124 dashboard; sidebar 81; several redirects/duplicates; module inventory page records provide seed data.
- **Scope / non-goals / likely areas:** typed registry, route inventory, adapters, redirect policy; no domain rewrite.
- **Service/data/API:** server-safe route metadata and capability key.
- **Security/privacy/audit:** protected routes cannot omit decision; aliases do not bypass guards.
- **UX/a11y/localization:** localized labels/breadcrumbs and not-found/deprecated states.
- **Dependencies / parallelism:** A-08 and ADR-UI-004; manifest B-06 consumes it.
- **Implementation:** import current routes; assign owners; canonicalize; register aliases; CI uniqueness/completeness gate; deprecate by evidence.
- **Migration:** traffic-instrumented redirects and support map.
- **Observability:** route/alias traffic, denial, 404, redirect, ownership debt.
- **Automated verification:** schema, unique intent/path, capability/state presence, no loops, locale/query.
- **Human validation:** product/UX/support/module owners approve intent map.
- **Rollout / rollback:** config version; restore mapping without restoring duplicate implementation.
- **Evidence / DoR / DoD:** capability schema ready; done when all active routes register and orphan check is zero.
- **Estimate / owner / reviewers:** 7–12 days; frontend platform/enterprise UX; security, QA, module/support.
- **Blockers / residual risk:** ownership disputes and auth experiment. Residual: low after registry.

### B-02 — Capability-derived navigation and role cockpit

- **Sources:** P1-03, CT-03/04, Brief B.
- **Outcome / control:** sidebar, search, shortcuts, command palette, notifications, and dashboard actions show only intentional available/locked states.
- **Current evidence / revalidation:** shell filters permissions; operating-truth core shortcuts and dashboard quick actions are static.
- **Scope / non-goals / likely areas:** shell search/navigation, dashboard model/actions, command palette/notifications; no new recommendation engine.
- **Service/data/API:** server-owned role-home/capability projection; priority from trusted read model.
- **Security/privacy/audit:** UI filtering is not authorization; all destinations remain server-guarded.
- **UX/a11y/localization:** role-relevant ordering, safe locked reasons, keyboard navigation, EN/FR.
- **Dependencies / parallelism:** A-08 and B-01; can parallel B-03/B-04.
- **Implementation:** consume capability projection; remove static core fallback or filter it; intentional upgrade state; parity tests.
- **Migration:** no data; cache/version role projection.
- **Observability:** shown/clicked/denied/locked and no-action roles.
- **Automated verification:** role/package matrix, deep links, keyboard/search, no denied shortcut.
- **Human validation:** each role completes top tasks without denial detours.
- **Rollout / rollback:** role/cohort flag; rollback to permission-filtered shell, never unguarded server.
- **Evidence / DoR / DoD:** registry/capability ready; done when all discovery surfaces share decision.
- **Estimate / owner / reviewers:** 6–11 days; dashboard/platform; UX, security, product, QA.
- **Blockers / residual risk:** priority rules and upgrade intent. Residual: low.

### B-03 — Page-state registry and shared renderer

- **Sources:** P1-06, CT-05, Brief D.
- **Outcome / control:** every canonical route declares and tests all applicable states and recovery actions.
- **Current evidence / revalidation:** current primitive covers permission/no-org/error/empty/partial/locked/stale-session/not-found/loading; adoption is uneven and copy mostly hard-coded.
- **Scope / non-goals / likely areas:** extend/localize primitive, registry mapping, route adapters; no service data invention.
- **Service/data/API:** stable reason/completeness/correlation from A-02/A-08.
- **Security/privacy/audit:** denial/error copy is non-disclosing; correlations logged.
- **UX/a11y/localization:** filtered empty, stale data, not configured, success/recovery; focus/live semantics; EN/FR.
- **Dependencies / parallelism:** A-02/A-08/B-01; parallel with B-04.
- **Implementation:** type union and copy IDs; route declarations; high-risk adoption; CI completeness gate.
- **Migration:** route adapter; remove manual copy only after parity.
- **Observability:** state frequency, recovery, retries, abandonment.
- **Automated verification:** renderer semantics, route mappings, failure injection, localization.
- **Human validation:** operators/support identify meaning and next step.
- **Rollout / rollback:** route flags; keep safe explicit old state if needed.
- **Evidence / DoR / DoD:** taxonomy ready; done when canonical registry has no missing state contract.
- **Estimate / owner / reviewers:** 6–10 days; design system/backend; accessibility, localization, support, QA.
- **Blockers / residual risk:** service adapters. Residual: low.

### B-04 — Semantic tokens and appearance-mode decision

- **Sources:** P1-02, P2-05, CT-09, Brief D.
- **Outcome / control:** one semantic style API and an honest appearance preference.
- **Current evidence / revalidation:** 91 forced-dark lines, 72 manual-color files, 1,924-line globals, 288 hex/297 RGB literals, alternate theme islands.
- **Scope / non-goals / likely areas:** token API, mode policy, exception register, CI guard; no blanket visual redesign.
- **Service/data/API:** persisted/user theme preference only; no domain logic.
- **Security/privacy/audit:** no material boundary; CSP-compatible styling remains.
- **UX/a11y/localization:** contrast, reduced motion, density/text scaling; theme control copy.
- **Dependencies / parallelism:** ADR-UI-007; parallel B-03; B-05 consumes.
- **Implementation:** inventory semantic roles; freeze tokens; define supported modes; exception schema; lint/visual guard.
- **Migration:** adapter theme roots; no immediate removal of all literals.
- **Observability:** preference vs rendered mode, missing tokens, exceptions.
- **Automated verification:** contrast/visual snapshots, mode persistence/system change, token scans.
- **Human validation:** brand/accessibility/product approve modes.
- **Rollout / rollback:** expose only certified modes; module adapter rollback.
- **Evidence / DoR / DoD:** appearance ADR; done when token contract/exception gate and honest control ship.
- **Estimate / owner / reviewers:** 5–8 days; design-system owner; accessibility, brand, QA.
- **Blockers / residual risk:** light-mode scope. Residual: medium until migration.

### B-05 — Top-20 route theme and token migration

- **Sources:** P1-02, P2-05, CT-09, Brief D.
- **Outcome / control:** highest-risk routes honor supported modes and establish migration examples.
- **Current evidence / revalidation:** select routes by revenue/control/use/complexity, not convenience; payroll and forced-dark command centers are likely priority.
- **Scope / non-goals / likely areas:** top-20 registry routes, visual baselines, token exceptions; no domain behavior changes.
- **Service/data/API:** none except theme setting projection.
- **Security/privacy/audit:** screenshots use synthetic/redacted fixtures.
- **UX/a11y/localization:** contrast/mode/zoom/reduced motion/EN-FR truncation.
- **Dependencies / parallelism:** B-04/B-06; routes may migrate in non-overlapping batches.
- **Implementation:** baseline; replace forced roots/literals; verify; document patterns; ratchet.
- **Migration:** CSS/token adapters and exception expiry.
- **Observability:** mode mismatch, visual diff, exception count.
- **Automated verification:** three-mode where supported, screenshot/contrast/axe, route smoke.
- **Human validation:** UI/accessibility/domain owner per route.
- **Rollout / rollback:** route flag/theme adapter; rollback individual route.
- **Evidence / DoR / DoD:** top-20 list and baselines approved; done when all expose honest consistent mode.
- **Estimate / owner / reviewers:** 12–20 days; design system + route owners; accessibility/QA/brand.
- **Blockers / residual risk:** broad global CSS coupling. Residual: medium.

### B-06 — Certification manifest and browser-fixture harness

- **Sources:** P1-08, CT-10, Brief D.
- **Outcome / control:** machine-readable evidence requirements drive deterministic automated and human certification.
- **Current evidence / revalidation:** 10 E2E specs, 6 axe-integrated files, multiple smoke scripts; no broad manifest.
- **Scope / non-goals / likely areas:** manifest schema/loader, fixture references, result/evidence paths, risk tiers; not certification execution.
- **Service/data/API:** test setup uses supported APIs/services; no production data.
- **Security/privacy/audit:** storage-state secrets excluded; artifacts redacted/access-controlled; evidence immutable enough for audit.
- **UX/a11y/localization:** browser/locale/viewport/theme/role/package/screen-reader fields.
- **Dependencies / parallelism:** G0-03 and B-01; schema can start before route population.
- **Implementation:** JSON schema; seed top routes; command mapping; result format; freshness/owner; CI validator.
- **Migration:** map existing smoke/E2E evidence; retain historical versions.
- **Observability:** coverage, pass/fail/skip/flaky, age, missing reviewer.
- **Automated verification:** schema, references, artifact existence, fixture redaction, completeness.
- **Human validation:** QA/accessibility/release owners approve matrix.
- **Rollout / rollback:** advisory → blocking by risk tier; revert blocking status, not evidence truth.
- **Evidence / DoR / DoD:** fixture/route registry ready; done when top-20 plus universal coverage rule validate.
- **Estimate / owner / reviewers:** 8–14 days; QA automation; security, accessibility, SRE, domain owners.
- **Blockers / residual risk:** test runtime/flakiness. Residual: medium.

### B-07 — Resumable, role-aware onboarding lifecycle

- **Sources:** P1-04/05, CT-04/05/07, Brief C.
- **Outcome / control:** deferred setup becomes resumable, role-aware, capability-safe, and measurable.
- **Current evidence / revalidation:** registration currently carries extensive operational setup; dashboard has operating-truth/onboarding concepts. Map existing onboarding persistence.
- **Scope / non-goals / likely areas:** onboarding state/read model/checklist/handoff, first-run routes; no speculative growth gamification.
- **Service/data/API:** server-owned step state, idempotent completion, org scope, prerequisites.
- **Security/privacy/audit:** permission-gated steps; sensitive settings require fresh auth/approval.
- **UX/a11y/localization:** progress, skip/defer policy, recovery, role ordering, EN/FR, accessible checklist.
- **Dependencies / parallelism:** A-07, B-01/B-02/B-03; may design while top-20 theme migrates.
- **Implementation:** lifecycle/state contract; map deferred fields; build handoff/read model; route actions; telemetry.
- **Migration:** existing organizations start from detected completed state, not forced restart.
- **Observability:** activation, time/abandonment, blocker, role, completion; no PII.
- **Automated verification:** idempotency, role/capability, resume, migration, accessibility/browser.
- **Human validation:** new owner/admin/customer-success workflows.
- **Rollout / rollback:** new organizations/pilot; fallback to settings links without losing state.
- **Evidence / DoR / DoD:** auth handoff and route/capability ready; done when agreed activation flow validates.
- **Estimate / owner / reviewers:** 8–14 days; product/onboarding + platform; security, UX, CS, QA.
- **Blockers / residual risk:** product activation definition. Residual: medium.
