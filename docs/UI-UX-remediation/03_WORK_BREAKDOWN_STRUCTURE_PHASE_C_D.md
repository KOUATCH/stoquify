# Work Breakdown Structure — Phases C and D

This companion continues `03_WORK_BREAKDOWN_STRUCTURE.md`. Estimates are ideal engineer-day ranges, not commitments.

## Phase C — High-risk module convergence

### C-00 — Shared enterprise data view, dialog, image, and copy primitives

- **Sources:** P2-01–P2-06, CT-05–CT-09, Brief D.
- **Outcome / control:** module waves reuse governed responsive data, form/dialog, image, localization, and state behavior.
- **Current evidence / revalidation:** DataTable and transaction-history shell are useful foundations; 30+ dense tables, native prompt/confirm, 5 raw images, fixed-width legacy forms, distributed copy remain.
- **Scope / non-goals / likely areas:** shared primitives/adapters and reference pilot; do not force domain tables into a lowest-common-denominator abstraction.
- **Service/data/API:** server query/summary/export interfaces remain domain-owned; shared client contract accepts typed adapters.
- **Security/privacy/audit:** bulk action confirmation/reason/audit, safe file/image URLs, redacted evidence.
- **UX/a11y/localization:** column priority, mobile card, sticky identity/action, keyboard, 400% zoom, accessible controlled dialog, typed messages.
- **Dependencies / parallelism:** B-03/B-04/B-06 and A-05; design pieces can parallel, pilot integration coordinated.
- **Implementation:** compare existing primitives; contract/API; inventory pilot; dialog and image policies; localization extraction/exception guard.
- **Migration:** adapter-first; legacy views remain behind flags until parity.
- **Observability:** overflow, filter/export use, bulk failures, dialog abandonment, missing image, untranslated IDs.
- **Automated verification:** component/axe/keyboard/mobile, pagination/export parity, dialog focus/retry, image layout, pseudo-localization.
- **Human validation:** data-heavy users and accessibility reviewer approve pilot.
- **Rollout / rollback:** per-component/module adapters; no service rollback.
- **Evidence / DoR / DoD:** shared contracts ready; done when inventory pilot proves extensibility and rollback.
- **Estimate / owner / reviewers:** 12–20 days; design system/data UX; domain, accessibility, localization, QA/security.
- **Blockers / residual risk:** domain exceptions and table performance. Residual: medium.

### C-01 — Inventory and item-creation convergence wave

- **Sources:** P0-01/02/04, P1-01/02/06/07, P2 suite; CT-01–10.
- **Outcome / control:** inventory catalog, items, movements, transfers, loss, units, categories, and brands use trusted summaries and shared contracts.
- **Current evidence / revalidation:** A-01 addresses KPI truth; item wizard 1,683 lines, ItemManagement 959, several aliases/exports/theme states. Build route/workflow map.
- **Scope / non-goals / likely areas:** inventory routes/components/actions/read services/tests; no stock-ledger or valuation-kernel rewrite.
- **Service/data/API:** adopt DisplayContext/read models/capability/export/state; preserve transaction boundaries and history proof.
- **Security/privacy/audit:** inventory permissions, adjustment approvals, org/location scope, write-off evidence.
- **UX/a11y/localization:** data view, create/edit wizard, unsaved dialog, mobile supported tasks, EN/FR, currencies.
- **Dependencies / parallelism:** A-01, B contracts, C-00, C-07 characterization; purchasing characterization may begin.
- **Implementation:** characterize; canonical routes; migrate lists/forms/states/actions/tokens/copy/images; measured component extraction.
- **Migration:** route redirects/adapters; no inventory data reset.
- **Observability:** query/action latency, incomplete state, adjustment/export failures, route alias traffic.
- **Automated verification:** service/contract/tenant, page-size/filter, adjustment/transfer failure, browser/axe/screenshots, policy gates.
- **Human validation:** inventory controller completes catalog, stock review, movement, transfer, adjustment, export.
- **Rollout / rollback:** internal → pilot inventory tenants; route/component flags; service truth preserved.
- **Evidence / DoR / DoD:** common module gate plus inventory tie-out; done when all canonical inventory routes certify.
- **Estimate / owner / reviewers:** 15–25 days; inventory squad; finance/control, security, UX/accessibility, QA/support.
- **Blockers / residual risk:** legacy item forms and inventory-quality exceptions. Residual: medium.

### C-02 — Purchasing, suppliers, AP, and purchase-order convergence wave

- **Sources:** P0-02/04, P1-01/02/06/07, P2-01/04/05; CT suite.
- **Outcome / control:** one supplier/PO/AP workflow with real actions, maker-checker, currency truth, and responsive evidence views.
- **Current evidence / revalidation:** duplicate supplier paths, PO detail 1,651 lines, create PO 1,269, supplier 1,743, AP tables 980–1080px; working PO export is reference.
- **Scope / non-goals / likely areas:** supplier aliases, PO create/detail/list, purchases/AP workbenches, actions/services/tests; no procurement-policy invention.
- **Service/data/API:** canonical supplier ownership, AP history/read models, artifact export, idempotent approvals/receipts.
- **Security/privacy/audit:** supplier data, maker-checker, payment evidence, receiving/ledger boundaries, SoD.
- **UX/a11y/localization:** dense AP/PO tasks, table/card, approval/exception states, EN/FR/currency/timezone.
- **Dependencies / parallelism:** C-00 and C-01 platform lessons; finance characterization may start.
- **Implementation:** canonicalize suppliers; characterize PO/AP; adopt contracts; controlled decomposition; retire aliases after traffic window.
- **Migration:** redirect/support/bookmark map; no PO/supplier data duplication/deletion.
- **Observability:** alias use, approval/receipt/export failures, AP exception age, query latency.
- **Automated verification:** supplier/PO/AP permissions, maker-checker, currency/export parity, route/browser/axe, purchasing gate.
- **Human validation:** purchaser, AP clerk, approver, accountant complete procure-to-pay exceptions.
- **Rollout / rollback:** pilot procurement cohort; route/adapter rollback; audit history immutable.
- **Evidence / DoR / DoD:** supplier canonical decision; done when purchasing/AP module gate and validation pass.
- **Estimate / owner / reviewers:** 18–30 days; purchasing/AP squad; controls/security/finance/accessibility/QA.
- **Blockers / residual risk:** legacy supplier URLs and receiving/accounting coupling. Residual: medium.

### C-03 — Finance, accounting, reconciliation, and close convergence wave

- **Sources:** P0-02/04, P1-02/06/07, P2-01/02/04/05; CT suite.
- **Outcome / control:** finance and assurance surfaces expose ledger/cash/suspense/close truth with defensible evidence and no false certification.
- **Current evidence / revalidation:** reconciliation 1,465 lines, close 1,323, accounting control 1,059, multiple 860–1120px tables; strong domain services/gates exist.
- **Scope / non-goals / likely areas:** finance command surfaces, payments/reconciliation, accounting control/journals/reports/close/accountant portal; no ledger-rule rewrite without separate audit.
- **Service/data/API:** consume finance/close/reconciliation read models, DisplayContext, artifact contract; preserve posting/idempotency.
- **Security/privacy/audit:** fresh auth/SoD, accountant grants, suspense approval, immutable proof, export retention/redaction.
- **UX/a11y/localization:** partial/stale/unmatched, evidence drill-through, accessible revoke dialog, responsive tables, EN/FR/OHADA terminology.
- **Dependencies / parallelism:** C-02 and common contracts; HRIS/payroll characterization can start.
- **Implementation:** characterize high-risk flows; migrate states/tables/actions/tokens/copy; replace window.prompt; extract stable orchestration units.
- **Migration:** adapters only unless domain audit identifies schema need; no ledger data rewrite.
- **Observability:** read freshness, evidence gaps, action/artifact, suspense/close blockers, performance.
- **Automated verification:** ledger/cash truth gates, reconciliation/close tests, authorization/tenant, exports, browser/axe/screenshots/failure paths.
- **Human validation:** accountant, controller, treasury/reconciliation, external accountant validate explainability/evidence.
- **Rollout / rollback:** internal finance → selected pilot; disable affected action or restore adapter, never alter posted truth.
- **Evidence / DoR / DoD:** finance control scenarios approved; done when domain gates and human sign-off pass.
- **Estimate / owner / reviewers:** 22–36 days; finance/accounting squad; audit/security/OHADA/accessibility/SRE/QA.
- **Blockers / residual risk:** statutory wording and close evidence dependencies. Residual: medium.

### C-04 — HRIS and payroll convergence wave

- **Sources:** P1-02/06/07/08, P2-01/04/05/06; CT suite.
- **Outcome / control:** sensitive employee/payroll workflows use complete states, privacy-aware evidence, accessible dense views, and semantic tokens.
- **Current evidence / revalidation:** payroll is largest manual-color cluster; command center 1,356 lines; tables 980–1680px; authenticated E2E foundations exist.
- **Scope / non-goals / likely areas:** people, contracts, compensation, attendance, runs, declarations, payments, payslips, self-service; no statutory formula change without country-pack review.
- **Service/data/API:** existing payroll/HRIS read/actions, immutability, country-pack provenance, payment/close integration.
- **Security/privacy/audit:** least privilege, employee self vs manager/admin scope, redaction, fresh auth, immutable snapshots, SoD.
- **UX/a11y/localization:** privacy-safe states, dense table/card policy, payslip accessibility, EN/FR, country terminology.
- **Dependencies / parallelism:** C-03 control patterns and common contracts; settings characterization may run.
- **Implementation:** role workflow map; migrate states/data views/forms/tokens/copy; characterization-led command-center extraction; certify auth roles.
- **Migration:** no payroll reseed/reset; schema changes require zero-loss/backfill/pilot gate.
- **Observability:** denied access, input readiness, stale evidence, declaration/payment failures, sensitive-log audit.
- **Automated verification:** payroll immutability/accounting/payment/declaration gates, role negative E2E, browser/axe/screenshots, privacy scans.
- **Human validation:** payroll operator, employee, manager, accountant, privacy/country-pack reviewer.
- **Rollout / rollback:** synthetic → internal payroll → expert pilot; module flag, preserve snapshots and evidence.
- **Evidence / DoR / DoD:** country/privacy scenarios ready; done when payroll gates plus human reviews pass.
- **Estimate / owner / reviewers:** 22–36 days; HRIS/payroll squad; privacy, statutory, finance, accessibility, QA/SRE.
- **Blockers / residual risk:** qualified country-pack reviewers and sensitive fixtures. Residual: medium-high.

### C-05 — Settings and configuration convergence wave

- **Sources:** P0-03, P1-01/02/06/07, P2-01/02/04/05/06; CT suite.
- **Outcome / control:** organization, location, tax, users, roles, terminals, modules, appearance, security, and notifications are canonical, explain impact, and recover safely.
- **Current evidence / revalidation:** location 1,917, organization table 1,335, tax/terminal 1,147; duplicate create routes; settings classification gate exists.
- **Scope / non-goals / likely areas:** settings routes/components/actions/services/tests; no billing/package redesign beyond capability integration.
- **Service/data/API:** configuration truth, version/audit, validation, effect preview, safe action result.
- **Security/privacy/audit:** fresh auth for sensitive changes, SoD, invite/user data, module/package decisions, actor/scope/effect.
- **UX/a11y/localization:** canonical create/edit, controlled dialogs, forms/data views, help/recovery, EN/FR.
- **Dependencies / parallelism:** B/C contracts and entitlement source; POS characterization may run.
- **Implementation:** canonical routes; adopt fields/states/tables/dialogs/tokens/copy; decompose stable workflows; document effects.
- **Migration:** aliases and existing setting values; no reset; config version adapters.
- **Observability:** change/failure/rollback, denied actions, alias traffic, support incidence.
- **Automated verification:** settings surface gate, permissions/fresh auth, route/currency/theme, browser/axe, audit evidence.
- **Human validation:** org admin, security admin, support, finance/tax reviewer.
- **Rollout / rollback:** admin pilot; route/component/config adapter rollback.
- **Evidence / DoR / DoD:** canonical and entitlement decisions ready; done when settings gate and admin validation pass.
- **Estimate / owner / reviewers:** 14–22 days; settings/platform squad; security, finance, UX/accessibility, support/QA.
- **Blockers / residual risk:** module/billing ownership and tax configuration semantics. Residual: medium.

### C-06 — POS and cash-operations convergence wave

- **Sources:** P0-02/04, P1-02/06/07, P2-01/03/04/05; CT suite.
- **Outcome / control:** desktop/tablet cashier and cash-management workflows retain speed, offline/replay, receipt, payment, fiscal, and audit evidence while adopting shared contracts.
- **Current evidence / revalidation:** POS component 2,357 lines/dense graph hotspot, raw images, USD fallback; desktop/tablet scope explicit; offline/replay/receipt gates exist.
- **Scope / non-goals / likely areas:** POS catalog/cart/tender/session/receipt, cash drawer/history, terminal integration; phone POS remains out unless approved.
- **Service/data/API:** preserve atomic sale/payment/posting, offline queue/replay/idempotency, fiscal/provider boundaries.
- **Security/privacy/audit:** cashier role, terminal/location scope, receipt tokens, cash variance/shift evidence, fraud controls.
- **UX/a11y/localization:** fast keyboard/touch, offline/conflict/recovery states, image fallback, currency/locale, desktop/tablet accessibility.
- **Dependencies / parallelism:** all shared contracts and preceding control patterns; characterization C-07 mandatory.
- **Implementation:** end-to-end characterization; adopt display/action/state/token/image; extract by catalog/cart/tender/session/evidence boundaries; certify offline paths.
- **Migration:** no transaction rewrite; version offline payload/adapters only with replay compatibility.
- **Observability:** sale/tender latency, offline queue age, replay conflicts, receipt/fiscal failures, cash variance.
- **Automated verification:** POS/offline/receipt/payment/ledger gates, idempotency, failure/recovery, browser/tablet/axe/screenshots.
- **Human validation:** cashier, supervisor, finance/control, support execute opening-sale-refund-close-offline recovery.
- **Rollout / rollback:** internal terminal → pilot location → cohort; preserve prior compatible client/replay path.
- **Evidence / DoR / DoD:** offline compatibility/rollback approved; done when desktop/tablet and control gates pass.
- **Estimate / owner / reviewers:** 20–34 days; POS squad; offline/integration, finance/fraud, accessibility, SRE/QA.
- **Blockers / residual risk:** offline compatibility and hardware/provider availability. Residual: medium-high.

### C-07 — Characterization-led hotspot decomposition program

- **Sources:** P1-07 and graph risk; all module waves.
- **Outcome / control:** large components split only where stable workflow ownership improves testability, bundle/performance, or failure isolation without behavior drift.
- **Current evidence / revalidation:** 14 components exceed ~1,100 lines; graph stale and must refresh; line count alone is not justification.
- **Scope / non-goals / likely areas:** POS, locations, suppliers, item wizard, PO detail/create, customers, reconciliation, payroll, organization, close; no aesthetic rewrite.
- **Service/data/API:** preserve service/action contracts; move business logic server-side only through approved package.
- **Security/privacy/audit:** no guard/action bypass; preserve redaction/audit/SoD.
- **UX/a11y/localization:** no state/copy/focus/responsive regression.
- **Dependencies / parallelism:** G0 graph refresh, characterization tests, C-00; extraction occurs inside each wave with file ownership.
- **Implementation:** measure responsibility/bundle/change coupling; characterize; propose seams; extract orchestration/list/form/dialog/state; compare behavior/performance.
- **Migration:** import adapters; no data change.
- **Observability:** bundle size, render/interaction, errors, change failure, test duration.
- **Automated verification:** characterization, focused unit/integration, visual/browser, bundle comparison.
- **Human validation:** module operator sees no task regression.
- **Rollout / rollback:** small PR/batch; revert extraction only; keep tests.
- **Evidence / DoR / DoD:** measurable reason and seam approved; done per hotspot when behavior parity and target metric improve.
- **Estimate / owner / reviewers:** 25–45 days distributed; module owners; architecture, QA, performance, accessibility.
- **Blockers / residual risk:** shared dirty files and hidden coupling. Residual: medium.

## Phase D — Certification, rollout, and assurance

### D-01 — Automated route/role/browser certification

- **Sources:** P1-08, CT-10, all automated acceptance gates.
- **Outcome / control:** every canonical route has fresh risk-proportionate automated evidence.
- **Current evidence / revalidation:** public smoke passes; 10 E2E specs and 6 axe files are insufficient for full breadth.
- **Scope / non-goals / likely areas:** manifest runner, role fixtures, three browsers, screenshots, axe, contract/artifact tests; no self-certification.
- **Service/data/API:** setup/teardown, deterministic server states, artifact assertions.
- **Security/privacy/audit:** redacted storage/evidence; cross-tenant negatives; no secret leakage.
- **UX/a11y/localization:** EN/FR/pseudo, themes, viewports/zoom, keyboard, route states.
- **Dependencies / parallelism:** B-06 and all required C waves; sharded runs parallel.
- **Implementation:** populate manifest; implement missing runners; stabilize flakes; run blocking tiers; archive evidence.
- **Migration:** historical evidence versioning.
- **Observability:** coverage/pass/fail/skip/flaky/duration/age.
- **Automated verification:** manifest schema/completeness and all specified commands.
- **Human validation:** QA reviews unexplained diffs and skips; human journey validation remains D-02.
- **Rollout / rollback:** advisory then blocking; release stops on blocking failure.
- **Evidence / DoR / DoD:** canonical routes/fixtures stable; done when blocking matrix is green and fresh.
- **Estimate / owner / reviewers:** 15–25 days; QA/release automation; security/accessibility/domain/SRE.
- **Blockers / residual risk:** runtime and browser flakiness. Residual: medium.

### D-02 — Human/domain validation and bounded certification

- **Sources:** multidisciplinary review and validation gates.
- **Outcome / control:** real operators and qualified reviewers confirm the verified system meets enterprise tasks and control needs.
- **Current evidence / revalidation:** no complete documented cross-role validation; recruit reviewers and scripts.
- **Scope / non-goals / likely areas:** scripted sessions/evidence/sign-off; no claim beyond reviewer boundary.
- **Service/data/API:** synthetic/pilot data with realistic states and evidence.
- **Security/privacy/audit:** consent, redaction, reviewer identity/role, evidence retention.
- **UX/a11y/localization:** owner, cashier, inventory, AP, accountant, payroll, external accountant, screen-reader, bilingual, support journeys.
- **Dependencies / parallelism:** D-01; sessions can parallel by domain.
- **Implementation:** task scripts; acceptance rubric; observe; record severity/outcome; remediate/retest; sign boundary.
- **Migration:** none.
- **Observability:** task success/time/error/recovery and open severity.
- **Automated verification:** evidence-template completeness only.
- **Human validation:** this package is the human validation authority; qualified finance/statutory/accessibility/security reviews required.
- **Rollout / rollback:** failed validation returns package to owning phase; no waiver for non-waivable P0.
- **Evidence / DoR / DoD:** automated matrix green; done when required reviewers sign or reject with blocker.
- **Estimate / owner / reviewers:** 8–16 days plus scheduling; UX research/release; full role roster.
- **Blockers / residual risk:** reviewer availability and representativeness. Residual: medium.

### D-03 — Production performance, resilience, and observability validation

- **Sources:** P1-07/08, performance gates, SRE lens.
- **Outcome / control:** supported routes meet measured performance/resilience budgets with actionable telemetry.
- **Current evidence / revalidation:** development smoke durations are compilation-influenced and invalid for production claims; establish RUM/synthetic baseline.
- **Scope / non-goals / likely areas:** top risk routes, client bundles, API/read latency, errors, queue/offline where applicable; no premature micro-optimization.
- **Service/data/API:** trace IDs, read-model latency/completeness, action/artifact duration.
- **Security/privacy/audit:** no PII in telemetry; tenant-safe labels; cost/retention.
- **UX/a11y/localization:** LCP/INP/CLS by route/device/locale/theme; recovery under failure.
- **Dependencies / parallelism:** representative C routes and D-01; data collection parallels D-02.
- **Implementation:** instrumentation; baseline; budgets; optimize measured hotspots; failure/load/recovery; alerts/runbooks.
- **Migration:** telemetry rollout and dashboard versioning.
- **Observability:** p75 LCP/INP/CLS, JS, API latency/error, action failures, queue age, cost.
- **Automated verification:** synthetic budget, bundle diff, load/failure/recovery, alert tests.
- **Human validation:** SRE/support/domain owner confirms usable degraded behavior.
- **Rollout / rollback:** performance regression blocks cohort; rollback release/flag.
- **Evidence / DoR / DoD:** production-like instrumentation ready; done after representative 7–14-day window or approved equivalent.
- **Estimate / owner / reviewers:** 8–14 days plus window; SRE/performance; frontend/backend/QA/support.
- **Blockers / residual risk:** production traffic representativeness. Residual: medium.

### D-04 — Cohort rollout, change management, support, and rollback rehearsal

- **Sources:** Phase D, change-management lens, Brief B/D.
- **Outcome / control:** migration reaches tenants safely with prepared users/support and proven rollback.
- **Current evidence / revalidation:** route/theme/entitlement changes need communication; confirm feature-flag/tenant cohort capability.
- **Scope / non-goals / likely areas:** flags/cohorts, release notes, training, support, telemetry thresholds, rollback exercises; no broad availability before evidence.
- **Service/data/API:** cohort configuration, compatibility, idempotent rollback, no data loss.
- **Security/privacy/audit:** approvals and operator actions logged; support least privilege.
- **UX/a11y/localization:** bilingual communications/help; accessible training; alias deprecation notice.
- **Dependencies / parallelism:** D-01/D-02/D-03; support preparation starts earlier.
- **Implementation:** internal/dogfood/pilot/limited/broad stages; observe; respond; rehearse; promote with sign-off.
- **Migration:** tenant/package/routes/preferences with reversible mappings.
- **Observability:** adoption, task success, denial/error, performance, support volume, rollback triggers.
- **Automated verification:** flag/cohort/rollback tests and evidence freshness.
- **Human validation:** pilot tenants, support, customer success, release authority.
- **Rollout / rollback:** explicit staged plan in runbook; stop/rollback on thresholds.
- **Evidence / DoR / DoD:** certification/validation green; done after broad cohort criteria or accepted hold.
- **Estimate / owner / reviewers:** 6–10 days plus observation; release/change lead; SRE, support, product, security.
- **Blockers / residual risk:** pilot availability and commercial commitments. Residual: medium.

### D-05 — Final enterprise UI/UX assurance decision

- **Sources:** all audit findings/contracts/gates; final readiness template.
- **Outcome / control:** evidence-backed release decision with no overclaim and time-bounded residual risks.
- **Current evidence / revalidation:** audit verdict NEEDS WORK; compare final state to every trace item and success indicator.
- **Scope / non-goals / likely areas:** evidence synthesis/decision only; no fixes hidden inside certification.
- **Service/data/API:** confirm no open truth/migration/tenant blockers.
- **Security/privacy/audit:** signed evidence boundaries, waivers/expiry, immutable index.
- **UX/a11y/localization:** certified scope and exclusions stated exactly.
- **Dependencies / parallelism:** final convergence of all required D evidence; no parallel approval shortcut.
- **Implementation:** validate registers/artifacts/freshness; list failures/skips; residual-risk review; release/hold decision.
- **Migration:** none.
- **Observability:** post-release review schedule and evidence expiry.
- **Automated verification:** traceability/schema/artifact completeness and current release commands.
- **Human validation:** executive release authority plus finance, security/privacy, accessibility, SRE, domain sign-offs.
- **Rollout / rollback:** approve next cohort or hold/rollback; define monitoring period.
- **Evidence / DoR / DoD:** all gates reviewed; done only with explicit `release`, `limited release`, or `hold` decision.
- **Estimate / owner / reviewers:** 3–5 days; release authority; full board.
- **Blockers / residual risk:** unresolved non-waivable P0 forces hold. Residual must be named, owned, and expiring.
