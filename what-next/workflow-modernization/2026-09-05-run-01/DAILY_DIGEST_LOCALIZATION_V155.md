# Daily Digest templates and shared BI presentation

2026-09-15. Branch `codex/migration-control-plane-release-2026-08-29`, HEAD `a05a41ef66cd5d98fd69ae3df18225795f912232`. Existing dirty tree preserved. Workflow `AN-DAILY-DIGEST` remains partially verified; the complete platform assignment is still active.

## Changes and practical benefits

The guarded Daily Digest page passes EN/FR to the existing service. A presentation step translates all seven current templates: owner, manager, finance, accountant, stockkeeper, end of day and weekly. French titles, summaries, metric descriptions, static conclusions and source-link labels replace the English template text. Existing source routes receive the selected language prefix. IDs, evidence hashes, monetary values, snapshot scope, guard decisions and required permissions stay unchanged.

Shared BI state, severity, evidence, freshness, review, mode, KPI failure and empty-state labels accept the explicit page locale. The default remains English for existing callers. The small bilingual helper follows the existing `lib/dashboard/presentation` approach: it formats presentation only and infers no entitlement, approval or health. Shared components retain their existing tokens/icons and disabled-control behavior. Raw, operational, posted, reconciled, certified and blocked evidence are still separate states.

Daily Digest workspace controls now expose selection with `aria-pressed`; role names, banners, section descriptions and source-action controls are localized. French accents in the existing page copy are corrected. Risk views receive locale/currency. Change timestamps receive locale and organization timezone; shared change views use UTC when none is supplied, avoiding server/browser timezone disagreement. No domain values are recalculated.

## Verification and source scope

Final tests: **41 passed / nine suites** (`9913b0`), covering BI primitives; digest UI/service; daily route proposal availability; cash command; owner; manager and manager-location dashboards; agent panel. Added tests cover all seven templates preserving identity/evidence/authority, French denied KPI values and unavailable proof controls, and French metadata/modes/empty/stale states. Intermediate 28 tests/five suites passed (`e5cfdf`).

Seventeen changed TypeScript files passed lint (`7f2872`). Final typecheck passed (`2a60a8`). An intermediate typecheck found the presentation helper widening a mandatory risk drill-through to nullable (`aee137`); the mapping now preserves that non-null contract. No tests were weakened to accept a control failure. Invalid patch contexts/order and transient file write failures were corrected through ordinary patch retries; no automatic approval denial was bypassed.

Existing parent consumers were found in analytics, agents, cash command, assurance, proof drawer, manager, stock-to-cash and owner views. Regression tests exercise the available relevant owner/manager/cash/agent components and shared primitives; this is not full runtime certification of every consumer. Historical graph node `bi_bicommandbriefheader_bicommandbriefheader` in community 50 located the shared header; current imports/source were rechecked.

Owned runtime: database `stoquify_local_registration_20260906_01`, localhost:3110, `.next-workflow-supplier`, existing server session 32685 (confirmed live `411902`). No restart or migration. Test records are isolated under `digest-recovery-` slugs, with real credential login, ownership assertion and localhost browser fence.

Final receipt `b0cc7c`: `lanes/environment/digest-recovery-v155-35c79026-519d-4eb2-a55c-d47e80010fc6.json`. EN/FR loaded views at 1440/768/320px; keyboard owner/end-of-day switching; selected-state announcement; localized source href; French template/shared strings; UTC organization with America/New_York browser; controlled invalid-currency rendering failure; keyboard fresh-server recovery; and permission-removal denial passed. Selected proposal/event/payment/journal counts did not change. Twelve screenshots retained. No digest text hydration exceptions occurred.

Earlier same-source receipt `589834` (`digest-recovery-v155-bfad5f46-9ac3-4c2a-af48-4a0f37484722.json`) passed the same checks without scrolled screenshots. Its French full-page screenshot showed an apparent blank lower area again. Follow-up actually scrolled to the risk section: visible, opacity 1, in viewport, with content captured in EN/FR. French scrolled screenshot visually inspected. This supports working normal scrolling; the intermittent full-page capture blanking remains an evidence limitation, not a proven fixed browser-compositor defect. No speculative height/style patch was made.

Final initial-load observations: EN 2158ms, FR 3545ms. Earlier EN 8543ms, FR 4132ms. Development compile/cache effects were not separated; no production improvement or budget compliance is claimed.

## Remaining engineering and verification

- Dynamic business-signal titles, details, next steps, source blocker messages and technical module identifiers remain inherited from their source contracts, often in English. Complete semantic localization at those boundaries; never machine-rewrite audit evidence or user-entered text indiscriminately.
- Some shared parents do not yet forward their own locale; their defaults remain English. Full parent workflows require their own locale verification.
- Brief/command/investigate controls emit their selected mode, but Daily Digest currently only stores that mode; their complete intended content behavior still needs review.
- Sidebar attribute hydration warning remains separate and unresolved. React development reporting of the deliberate invalid-currency error is expected. Do not claim console-clean status.
- Full populated role/tenant/source navigation, failed database reads, partial/stale data, live governed agent/proposal availability, screen-reader, zoom and full keyboard traversal remain unverified. Runtime error injection covered rendering, not database outage recovery.

## User and operator guidance

Open `/fr/dashboard/daily-digest` or `/en/dashboard/daily-digest`. Select a visible role workspace; keyboard Enter activates the focused workspace. Source links retain the chosen language and the destination still enforces its own access rules. Timestamp metadata displays the organization timezone. A selection is not an approval or operational success.

Administrators supply organization membership, role permissions and operating timezone through existing organization setup. No new approval or input is needed for translation. For a remaining untranslated source message, capture its route, language and visible message with appropriate privacy redaction so its owning source contract can be identified. Use Retry for a recoverable read/render failure; it requests current server data/access. Do not widen permissions to bypass account or release restrictions.

## Rollout/recovery and review accountability

No schema change, migration, production deployment, provider call, message dispatch, live activation, payment or X1 change. Roll out via existing release controls after remaining consumer checks. Roll back only this batch's locale propagation/presentation together if necessary, retaining prior access/timezone fixes and unrelated work. Monitor localized render failures, disabled controls and language-preserving destination links. Owned invalid-currency fixtures are restored to XAF.

| Review responsibility | Assessment |
| --- | --- |
| Architecture/backend/data | Presentation applied after existing authority/filtering. Additive locale input; IDs, evidence and money preserved by seven-template tests. |
| Security/IAM/privacy | No permission or entitlement changes; denied values remain hidden and unavailable links disabled. Existing permission-removal runtime check passes. |
| Frontend/design/localization/accessibility | Explicit locale reuse, shared tokens retained, aria-pressed selection and keyboard switching verified. Dynamic messages and full accessibility remain open. |
| Product/workflow/operations | French template comprehension and language continuity improved; no new administrative steps. Source-message follow-up guidance provided. |
| Quality/release/SRE | 41 tests, 17-file lint, typecheck, actual EN/FR runtime and screenshots. Runtime parent coverage and production performance unproven. |
| Finance/controls/audit/analytics | Metric values and evidence/control state preserved. Source blockers are not reinterpreted or hidden. No selected financial/event changes in runtime. |
| SaaS/AI/agents | Existing capability/release rules preserved; no enabled proposal approval fabricated. |
| Country/statutory, POS/offline, AP, HR/payroll, payments/providers, ledger/close | Not applicable to domain behavior changes: no calculation, posting, provider operation or domain transition modified. Their complete workflow review remains required. |
| APIs/events/integrations | Not applicable to external contracts: no transport/event/provider contract changed. Internal read-model presentation and URLs only. |

These are engineering review findings, not certifications or professional approvals. Continue through the complete workflow register.
