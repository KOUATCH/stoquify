# v160 — Metric source truth and mobile status visibility

Evidence date 2026-09-15. Branch `codex/migration-control-plane-release-2026-08-29`, commit `a05a41ef66cd5d98fd69ae3df18225795f912232`. Dirty tree preserved; baseline `evidence/source-baseline-v160.json` (`754305`). Whole platform review remains incomplete.

## Findings and implementation

The digest converted a null close-readiness average into zero and assigned ready to finance, close and inventory metrics when a specific risk counter was zero. It also attached tenant-wide freshness to specialist metrics and left card source hashes/blockers empty. This could make an empty, stale or failed specialist source look ready or poorly traced. A populated French 320px screenshot separately showed the KPI status badge clipped outside the available width.

Each metric configuration now identifies its real source snapshot. Cards retain that source's status, freshness, evidence grade, hash, source kind, location, period, blockers and redactions. Close averages remain null when absent; a measured zero remains zero. Explicit source stale flags are reflected in the freshness label. Existing risk conditions can restrict availability; they cannot replace denied, redacted, failed, unavailable or loading states with ready/business-risk wording. Digest-level state combines the metric and tenant status with action risks, while the card represents its own source.

The shared KPI header now wraps and allows the title to wrap. Status badges remain within the card, retain icons/text and use the existing semantic colors. Long values can wrap. No new shell or design-system primitive was introduced.

## Verification

- 41 tests/four suites passed (`e44e8f`). Ten status/UI-state cases exercised for payment, inventory and close metrics: fresh, stale, partial, empty, failed, blocked, loading, redacted, permission denied and module unavailable. Tests bind source hashes/freshness, distinguish null from measured zero, and verify stale-flag behavior. Existing localization, observation, role, mode and shared BI regressions included.
- Three-file lint passed (`322bca`); typecheck passed (`447de1`). Final commands and source bindings are in `evidence/digest-metrics-v160.json`. Earlier checks before the stale-label refinement are historical only.
- Actual runtime passed (`c56310`): `lanes/environment/digest-observations-v160-adde0161-051b-4b12-acb3-7573750f797e.json`. Script `lanes/environment/verify-digest-metrics-v160.cjs` uses the owned localhost database and a submitted PO fixture. Real EN/FR credential login, keyboard workspace change, missing close-score presentation and KPI badge geometry at 1440/768/320 passed. Repeated observation, authorized source link and removal of source permission also passed.
- Twelve screenshots retained; French 320px missing-close and pending-order cards inspected. Close reads Aucune valeur with Aucune donnée; pending-order status Partiel fits fully inside the card. No unhandled page or hydration errors. PO remains SUBMITTED and selected event/journal/payment counts unchanged.
- No schema change, migration-bearing build, provider dispatch, live approval/activation, production deployment or X1 change. Runtime source-before/source-after hashes match the baseline. Browser tests use local origin fencing and no external business effects.

The availability matrix is isolated service verification, not an actual database-outage injection. Browser evidence covers real absence and populated pending purchasing data. Full production performance, all screen-reader/zoom combinations and complete domain lifecycles remain unverified.

## User/operator guide

Open `/en/dashboard/daily-digest` or `/fr/dashboard/daily-digest`. Select Accountant/Comptable to inspect close readiness. No value/Aucune valeur means the source supplied no average score; it does not mean a measured 0% or completion. Read the status, freshness and source limitations before relying on a metric. Open source leads to the existing authorized domain workspace. Expand setup blockers for the source explanation and next step.

The responsible accountant supplies the actual fiscal calendar, period and close-run evidence through existing accounting workflows; obtain these from the organization's accounting records and close owner. Treasury supplies actual reconciliation/provider evidence; inventory operations maintains real stock records. Administrators supply role permissions through the existing access process. No new input, signature or approval is required for this display correction. Do not create a fabricated zero or approval to make a status ready.

No migration is required. Roll out the paired service and KPI changes through existing release controls. If recovery is needed, revert only the v160 source-binding/state/null handling and card layout changes, preserving earlier observation, localization, access and recovery work. The registered source states remain authoritative.

## Remaining work and responsibility review

Pending purchase orders are still classified as receiving delay without demonstrated delivery-date comparison; verify and correct that signal rule next. Dynamic signal copy, singular/plural French units and empty observation wording remain open. Review urgency derivation and source freshness on action risks. Full tenant/role/query-failure/accessibility coverage, all signal types and the complete workflow register remain incomplete.

Architecture/backend/data: explicit metric-source binding and absence semantics. Security/IAM/privacy: denied/redacted/failure state precedence retained; no new protected query. Finance/controls/audit/analytics: absent score is no longer fabricated as zero; source evidence remains attached; no posting changes. Frontend/UX/localization/accessibility: shared tokens, wrapped title/status and measured three-width containment; EN/FR absence labels verified. Product/support: distinguish missing data from performance and keep status visible. Quality/SRE/release: focused matrix and actual runtime evidence; limitations explicit. SaaS/AI: no entitlement, packaging or agent authority change. OHADA/country rules, POS/offline, purchasing/AP transitions, HR/payroll, provider execution, ledger/close calculations, APIs/events: not applicable to domain changes in this batch; no statutory calculations, posting, financial transitions or external contracts changed. Full reviews remain required.

These are engineering assessments, not professional certifications.
