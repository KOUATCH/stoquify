# Risk, Assumption, and Decision Log

## Risk register

| ID | Risk | Likelihood | Impact | Owner | Mitigation / evidence | Trigger / response | Residual target |
|---|---|---:|---:|---|---|---|---|
| R-001 | Inventory KPI definition disagrees with accounting or operator expectation | High | Critical | Finance control + inventory product | ADR-UI-002; shadow comparison; page-size/filter tests; named validation | Any unexplained old/new drift blocks cutover | Low |
| R-002 | Currency migration changes persisted values rather than display only | Medium | Critical | Data architect | Schema/read audit; separate stored monetary code from formatter; no destructive migration | Roll back UI adapter; investigate data before retry | Low |
| R-003 | Global entitlement enforcement locks legacy tenants out | High | Critical | Security/platform + billing | Observe → pilot → cohort; legacy entitlement migration; would-block telemetry | Denial spike or mismatch restores affected cohort to observe | Medium |
| R-004 | UI hides a surface while server still allows it, or shows it while server denies it | High | High | Security/IAM | One capability object; route/action/API matrix; deep-link tests | Any parity mismatch blocks phase | Low |
| R-005 | Redirect consolidation breaks saved links, locale, query, or analytics | Medium | High | Route-registry owner | Traffic instrumentation; locale/query contract; no-loop tests; deprecation window | Restore alias mapping/implementation | Low |
| R-006 | Existing dirty-worktree changes are overwritten | High | High | Every package owner | Pre/post status capture; scoped patches; no reset/checkout; owner coordination | Stop on overlap; request owner decision | Low |
| R-007 | Accessibility “fix” passes axe but fails real screen-reader use | High | High | Accessibility owner | Keyboard and NVDA/VoiceOver scripts with human reviewer | Validation failure reopens package | Low |
| R-008 | Auth simplification removes required legal/security data or consent | Medium | Critical | Auth product + legal/security | Field classification ADR; defer fields to governed onboarding; consent preserved | Revert funnel cohort; retain accessible field repairs | Low |
| R-009 | Theme migration produces unreadable mixed-mode screens | High | High | Design-system owner | Semantic tokens; route flags; contrast snapshots; expose only supported modes | Disable affected mode/route adapter | Low |
| R-010 | Shared data-table abstraction erases domain-specific controls | Medium | High | Enterprise UX + domain owner | Contract supports adapters; pilot inventory; domain validation | Keep legacy table behind flag; revise contract | Low |
| R-011 | Monolith decomposition changes behavior or offline/POS recovery | High | Critical | Domain engineering | Characterization tests; stable workflow boundaries; incremental extraction | Roll back extraction without data rollback | Medium |
| R-012 | Export artifact contains sensitive or cross-tenant data | Medium | Critical | Security/privacy + audit | Server scope, redacted fixtures, content assertions, retention/access policy | Revoke artifact, incident response, suspend exporter | Low |
| R-013 | Certification matrix becomes too large/flaky to block releases | High | High | QA/release | Risk tiers, deterministic fixtures, shard strategy, flake budget, quarantine rules | Failing blocking tier stops release; flaky tests require owner/expiry | Medium |
| R-014 | Production performance budgets are accepted from development timing | Medium | High | SRE/performance | RUM or representative production telemetry; dev smoke marked non-performance | Missing representative data blocks performance claim | Low |
| R-015 | EN/FR literal migration changes regulated/accounting meaning | Medium | High | Localization + domain control | Typed messages, glossary, bilingual expert review, pseudo-localization | Revert copy bundle; keep functionality | Low |
| R-016 | Graph-based decomposition plan uses stale/partial dependencies | High | Medium | Architecture owner | Refresh graph; verify code paths manually; record extraction gaps | Do not use stale graph as approval evidence | Low |
| R-017 | Country-pack/legal/accounting claims exceed evidence | Medium | Critical | Compliance authority | Dated provenance and qualified review; neutral UI language before approval | Remove/qualify claim; block certification | Low |
| R-018 | Phone POS requirements enter scope without product decision | Medium | Medium | POS product | Explicit desktop/tablet boundary and change-control decision | Treat phone behavior as N/A until approved | Low |
| R-019 | AI/copilot surfaces bypass new capability/action contracts | Medium | High | AI safety + platform | Register AI proposals as actions; human approval; injection/evaluation tests | Suspend unsafe agent version | Low |
| R-020 | Support/training lags route and workflow changes | High | Medium | Change-management owner | Route map, release notes, playbooks, pilot training, support telemetry | Pause cohort expansion | Low |

## Assumptions

| ID | Assumption | Confidence | Must validate by | Consequence if false |
|---|---|---:|---|---|
| AS-001 | Organization currency/timezone/default locale are sufficient roots for DisplayContext v1. | Medium | G0-02 / A-03 | Schema/provider design may expand; estimate increases. |
| AS-002 | Inventory `totalValue` in inventory levels is closer to approved stock valuation than selling-price multiplication. | Low | ADR-UI-002 | A-01 metric design changes materially. |
| AS-003 | Existing module catalog and evaluator should be evolved, not replaced. | High | ADR-UI-003 | Capability program becomes larger. |
| AS-004 | `requestedModules` is transitional commercial intent, not a complete billing ledger. | Medium | ADR-UI-003 | Enforcement source and migration must change. |
| AS-005 | Current shared route-state and command primitives are acceptable foundations. | High | B-03/C-00 pilot | New primitive work expands. |
| AS-006 | EN and FR remain the release languages for this program. | High | Product decision | Certification matrix expands. |
| AS-007 | XAF, XOF, EUR, and USD are sufficient fixture currencies for initial certification. | Medium | Finance/product decision | Add currency-specific precision/display cases. |
| AS-008 | Existing local screenshots and smoke evidence are baseline-only. | High | B-06 | No release consequence; current plan already requires fresh evidence. |
| AS-009 | Three stable squads can be staffed for the 5–7 month scenario. | Low | Program planning | Calendar extends toward sequential scenario. |
| AS-010 | No destructive schema change is required for UI remediation. | Medium | Gate 0 data review | Migration work needs separate approval and zero-loss plan. |

## Decision register

| Decision | Owner | Deadline/gate | Recommended option | Alternatives / tradeoff | Status |
|---|---|---|---|---|---|
| ADR-UI-001 DisplayContext | Platform + finance | G0 exit | Server-derived v1 from org settings; no silent currency fallback | Per-page formatting is rejected; client-only context is untrusted | Open |
| ADR-UI-002 Inventory KPI semantics | Finance + inventory | A-01 ready | Separate stock cost value, retail potential, and clearly named margin estimate | One ambiguous “Total Value/Profit Potential” is rejected | Open |
| ADR-UI-003 Entitlement source/enforcement | Security + billing | G0 exit | Evolve current evaluator; migrate source; staged enforce | Global big-bang is unsafe | Open |
| ADR-UI-004 Canonical routes | Product + UX | A-09/B-01 | Purchases/suppliers, settings/locations/create, settings/tax-rates/create, modern auth after validation | Keep aliases only as redirects with expiry | Open |
| ADR-UI-005 State/error taxonomy | Backend + design system | A-02 ready | Extend current DashboardRouteState and typed service results | New parallel state component is rejected | Open |
| ADR-UI-006 Action artifact schema | Audit + backend | A-05 ready | Stable artifact ID, scope, filters, row count, hash/type, created/expires timestamps | Toast-only completion rejected | Open |
| ADR-UI-007 Appearance support | Product + design | B-04 ready | Three-mode end state; expose only modes certified on current routes | Dark-only is acceptable interim if stated honestly | Open |
| ADR-UI-008 Registration/onboarding | Auth product + legal/security | A-07 ready | Minimal account creation + resumable controlled setup | Current front-loaded setup remains only if evidence supports it | Open |
| ADR-UI-009 Support matrix | QA + product | B-06 ready | Chromium/Firefox/WebKit; keyboard; NVDA/VoiceOver; declared viewport per route | Narrower matrix needs customer/risk justification | Open |
| ADR-UI-010 Release authority | Executive sponsor | Gate 0 exit | Distributed sign-off by evidence boundary; one final release authority | Single-team self-certification rejected | Open |

## Highest-risk unresolved decisions

1. Entitlement source of truth and how legacy full-suite access migrates before enforcement.
2. Financial definition of inventory value and profit potential.
3. Supported appearance modes during the migration window.
4. Canonical auth implementation and minimum registration data.
5. Named human reviewers and realistic synthetic role/package fixtures.
6. Acceptable module-wave parallelism given shared-file overlap and the dirty worktree.

## Reviewer-lens disposition

| Reviewer lens | Disposition for roadmap |
|---|---|
| Enterprise/platform architecture | Material: owns contracts, dependencies, tenancy, and critical path. |
| Backend/domain/integration | Material: read models, actions, exports, failure contracts. |
| Data/database/migration | Material: money precision, provenance, zero-loss migration review. |
| Security/IAM/privacy/abuse | Material: capability parity, entitlement enforcement, redaction, tenant isolation. |
| Frontend/design systems | Material: route/state/table/form/token adoption and decomposition. |
| Workflow/service design | Material: auth, dense workflows, recovery, role cockpits. |
| Accessibility | Material: WCAG automation plus human screen-reader validation. |
| Localization/content | Material: EN/FR, money/date terminology, pseudo-localization. |
| Product/business process | Material: route choices, KPI semantics, onboarding, scope. |
| Quality/release assurance | Material: manifest, test pyramid, phase gates, evidence freshness. |
| SRE/DevSecOps/performance | Material: telemetry, budgets, rollout, incident recovery. |
| SaaS packaging/billing/growth/CS | Material: entitlement source, locked states, adoption, support. |
| Finance/OHADA/internal controls | Material: display truth, inventory value, export/close evidence. |
| Statutory/tax/payroll/privacy | Material in module waves; no certification without provenance/review. |
| Audit/evidence/records/data quality | Material: artifacts, correlation, retention, final evidence. |
| POS/inventory/offline | Material: inventory truth and POS/offline preservation. |
| Purchasing/AP/payment controls | Material: suppliers, dense AP workflows, maker-checker. |
| HRIS/payroll/privacy | Material: payroll wave and fixtures/redaction. |
| Payments/reconciliation | Material: suspense, proof, export, completeness states. |
| Accounting close/portal | Material: finance wave and accountant validation. |
| Analytics/BI/metrics | Material: KPI definitions, provenance, decision support. |
| AI/agent safety | Material but secondary: AI actions must inherit capability/artifact controls. |
| API/webhook/event/import/export | Material: server enforcement and evidence-producing exports. |
| Change/training/support | Material: route deprecation, rollout, adoption, incident playbooks. |

No requested reviewer is immaterial to the complete remediation program; AI is secondary because this roadmap does not introduce a new model or autonomous capability.
