# Phase Gates and Release Criteria

No phase closes on narrative status alone. Required evidence must be present, fresh, attributable, and reviewed by the named authority.

## Status vocabulary

- `not_started`: no accepted evidence.
- `in_progress`: implementation or evidence gathering has begun.
- `blocked`: a named external decision/dependency prevents progress.
- `verification_failed`: implementation does not meet specification.
- `validation_failed`: verified behavior does not meet user/control need.
- `ready_for_review`: automated evidence is complete; human review pending.
- `accepted_with_residual_risk`: named authority accepts documented risk and expiry.
- `complete`: all blocking evidence and approvals are present.

## Gate 0 — Program baseline and decision freeze

### Entry

- Audit and prompt are accepted as planning inputs.
- Current repository and dirty-worktree status are captured.
- Program sponsor, architecture owner, and release-assurance owner are named.

### Blocking evidence

- Revalidated surface/count baseline and command log.
- Traceability register with every P0–P2 finding, ten contracts, four briefs, and acceptance groups.
- Current graph freshness decision and refresh plan.
- Updated module surface inventory.
- ADR-UI-001 through ADR-UI-010 have owner, due point, and provisional recommendation.
- Every work package has owner, dependencies, estimate range, verification, validation, rollout, rollback, and evidence target.
- Approved synthetic role/tenant/package/currency fixture design.
- Risk, assumption, decision, and dirty-worktree controls are acknowledged.

### Exit authority

Program sponsor + principal architect + release-assurance lead. Finance, security, accessibility, and product owners approve their decision inputs.

### Failure response

Do not start shared-contract implementation. Resolve orphan findings, conflicting owners, missing source-of-truth decisions, or circular dependencies.

## Phase A — P0 trust and release blockers

### Entry

- Gate 0 complete.
- Display, entitlement, metric, error, action-artifact, auth, and canonical-route ADRs accepted.
- Feature flags and evidence locations exist.

### Blocking functional/trust evidence

- Inventory KPIs are invariant across page sizes 10/25/50/100 and honor filters/location/org scope.
- Inventory value/profit labels match approved definitions; threshold logic uses source policy/reorder point.
- Failed or partial reads render explicit state with correlation; no catch-to-empty on the migrated path.
- DisplayContext supplies valid locale/currency/timezone; no silent USD fallback.
- Classified risk-tier currency scan has zero unapproved production occurrences.
- Every visible migrated action is executable, disabled with reason, locked, or hidden.
- Export success includes artifact ID, type, filters, row count, scope, timestamp, and retrievable result.
- Module capability decisions agree between UI and server for pilot package/role fixtures.
- Confirmed equivalent aliases redirect with locale/query preservation and no loops.

### Blocking accessibility evidence

- Current public/auth axe matrix has zero critical/serious violations.
- Login, register, forgot/reset/invited flows have labels, invalid state, described errors, autocomplete, focus, and live announcements.
- Keyboard-only completion succeeds in EN/FR.
- Manual screen-reader review passes the agreed auth/public flows.
- Initial registration control is visible at 320×568 and 390×844 under the accepted simplified flow.

### Blocking engineering evidence

- Focused unit/service/contract tests pass.
- `npm run typecheck`, focused lint, relevant policy gates, and `npm run build:app` pass.
- Public/auth smoke and screenshots pass in the supported Phase-A browsers.
- Rollback toggles and data-free rollback rehearsal pass.

### Exit authority

Finance/control owner + security/IAM owner + accessibility owner + product/auth owner + release-assurance lead.

### Failure response

Keep enterprise release blocked. Roll back the affected cohort or disable the action/surface. Never restore false completion, silent currency fallback, or catch-to-empty behavior.

## Phase B — Enterprise platform contracts

### Entry

- Phase A complete.
- CT-01 through CT-07 interfaces are versioned or explicitly scheduled.
- Route and appearance decisions are approved.

### Blocking evidence

- All active routes are present in the typed canonical registry with owner, module, capability, state contract, telemetry name, and alias disposition.
- Navigation, search, dashboard shortcuts, command palette, and deep links consume the same capability decision.
- Server/UI parity matrix passes for owner, cashier, inventory, purchaser/AP, accountant, payroll, external accountant, and support fixtures.
- Shared page states cover loading, empty, filtered empty, partial, stale, error, denied, locked, not configured, and success/recovery semantics.
- Appearance control exposes only supported modes; top 20 routes render consistently in each exposed mode.
- Semantic token exception register is approved; no new unregistered literal colors enter risk-tier routes.
- Registration handoff persists resumable onboarding state safely and does not weaken consent/security.
- Certification manifest schema validates and can drive public plus protected pilot routes.

### Exit authority

Principal architect + security/IAM owner + design-system/accessibility owner + product owner + QA/release lead.

### Failure response

Do not start broad module visual migration. Correct contract or adapter behavior first; module teams may continue characterization tests only.

## Phase C — High-risk module normalization

Each wave has an independent entry/exit gate. A later wave may begin characterization while the prior wave is validating, but production cutover follows the approved sequence unless the architecture board accepts a documented exception.

### Common entry for a module wave

- Service/read-model and capability dependencies are ready.
- Characterization tests capture current critical behavior.
- Route, state, table/form/dialog, token, localization, and certification mappings exist.
- Module-specific finance/privacy/offline/maker-checker reviewers are named.

### Common blocking evidence

- All canonical module routes use the approved capability and state contracts.
- Headline metrics and totals are server-owned with provenance/completeness.
- Tables/forms/dialogs meet the shared contracts at supported viewports and zoom.
- Enabled actions produce real outcomes; export filters match visible/query state.
- EN/FR and approved currencies/timezones pass fixtures.
- WCAG automated checks pass and module-specific keyboard/screen-reader validation is complete.
- Characterization, unit, integration, contract, failure-path, browser, screenshot, and relevant policy tests pass.
- Performance does not regress beyond the approved budget.
- Telemetry, support article, rollout, and rollback rehearsal are complete.

### Domain-specific additions

- **Inventory:** quantity/value/reorder and movement-history proof tie out.
- **Purchasing/AP:** supplier aliases retired, maker-checker and payment evidence preserved.
- **Finance/close/reconciliation:** ledger/cash/suspense/close evidence ties out; no self-certification.
- **HRIS/payroll:** sensitive-data redaction, employee privacy, country-pack provenance, and self-service boundaries pass.
- **Settings:** configuration changes expose effect, actor, scope, and recovery; destructive actions remain controlled.
- **POS:** desktop/tablet cashier workflow, offline replay, receipt/fiscal/payment evidence, and shift recovery pass; phone remains out of scope unless approved.

### Wave exit authority

Domain product owner + domain control specialist + security/privacy where applicable + accessibility/QA + release lead.

### Failure response

Roll back only the failing module adapter/cohort. Preserve service truth and audit history. Continue on other parallel work only if contracts are unaffected.

## Phase D — Enterprise certification and rollout

### Entry

- All required Phase C waves complete.
- Manifest enumerates canonical routes and risk tiers.
- Supported platform matrix and evidence freshness windows are approved.

### Automated release evidence

- Route/role/package/capability contract suite passes.
- Chromium/Firefox/WebKit matrix passes at supported viewports.
- EN/FR, pseudo-localization, XAF/XOF/EUR/USD fixtures pass where applicable.
- Axe has zero critical/serious findings on certified routes.
- Screenshot diffs are reviewed with no unexplained changes.
- Artifact/export and audit correlation assertions pass.
- Relevant policy, service-boundary, module-surface, report-trust, workflow-assurance, security, migration, typecheck, lint, build, and test gates pass.
- Production p75 LCP <2.5 s, INP <200 ms, CLS <0.1 for the approved route tier, or named authority accepts a time-bounded exception.

### Human validation evidence

- Owner validates headline truth and cockpit prioritization.
- Inventory controller validates stock/reorder/value decisions.
- Purchaser/AP operator validates supplier, invoice, approval, and exception work.
- Accountant/external accountant validates currency, reports, exports, close, and evidence.
- Cashier validates POS focus, recovery, receipt, payment, and offline behavior.
- Payroll operator validates privacy, sensitive states, evidence, and self-service boundaries.
- Screen-reader reviewer completes agreed journeys.
- EN/FR reviewer approves terminology and truncation.
- Support/customer success validates diagnostics, migration communications, and recovery guidance.
- Security/privacy/finance/accessibility reviewers sign only their own evidence boundaries.

### Cohort progression

`internal synthetic → internal dogfood → pilot tenants → limited cohort → broad availability`.

Every promotion requires:

- minimum observation window;
- no unresolved severity-1/2 incident;
- error/denial/conversion/performance metrics within thresholds;
- rollback readiness;
- support readiness;
- named approval.

### Final exit authority

Executive product sponsor + release authority, supported by signed finance/control, security/privacy, accessibility, SRE, and domain evidence. No single reviewer may self-certify the whole system.

## Evidence freshness

| Evidence | Maximum age at release |
|---|---:|
| Typecheck/build/policy/unit/integration | Current commit |
| Browser/axe/screenshot matrix | Current commit and fixture version |
| Capability/entitlement inventory | Current commit and package schema |
| Migration rehearsal | Current migration set |
| Performance telemetry | 7–14 day representative window |
| Human validation | Current major workflow version; re-review after material change |
| Legal/accounting/country-pack provenance | Dated source and expert-reviewed validity period |
| Rollback rehearsal | Current release train or material architecture change |

## Waiver policy

A waiver must include scope, evidence, user/control impact, compensating control, owner, expiry, rollback trigger, and release-authority signature. P0 financial truth, tenant isolation, unauthorized access, false action completion, and critical/serious accessibility defects on required journeys are non-waivable for enterprise certification.
