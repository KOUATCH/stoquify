# v159 — Current observations are not historical changes

2026-09-15. Branch `codex/migration-control-plane-release-2026-08-29`; commit `a05a41ef66cd5d98fd69ae3df18225795f912232`. Current dirty tree and source hashes: `evidence/source-baseline-v159.json` (`1674c0`). Unrelated changes preserved. Entire platform review remains incomplete.

## Finding and delivered correction

`changeFromSignal` previously assigned `new` to the first signal and `changed` to all later signals based solely on array index. It supplied no previous value, yet the shared strip displayed a before/after arrow from an unavailable value to the signal severity score. A current snapshot and a list position cannot establish a change over time.

The BI contract now supports `observed`. Daily Digest emits this direction for current signals, independent of position. The shared strip labels these Observed / Observé, shows the existing Risk score / Score de risque as a current value, and explicitly states that historical comparison is unavailable. Observations are counted as observations. Existing real comparison directions keep their previous/current rendering. No signals were discarded, scores changed or evidence upgraded to implement this correction.

Source module, permission, signal ID/hash, current severity score, timestamp and blockers remain attached. The current source rules still determine signal type, severity and suggested action; this patch does not certify their policy. The strip remains read-only. Links continue to the existing domain workflow.

## Verification

- 28 tests/three suites passed (`461fc4`): populated manager signals remain observations across repeated composition; source hashes retained; denied source permissions remove signals. Shared EN/FR tests distinguish observation scores from genuine before/after comparisons. Existing Daily Digest modes and BI primitive regressions included.
- Five changed files passed lint (`1872a4`); typecheck passed (`ca94a7`). Commands use direct inspected Jest/ESLint/TypeScript binaries. No build/migration invoked.
- Actual populated runtime passed (`5bfeb3`): `lanes/environment/digest-observations-v159-09c64205-942a-47b9-964f-315257c6f639.json`. One owned submitted PO, supplier and location in `stoquify_local_registration_20260906_01`; real manager credential login; localhost:3110 with browser traffic fenced to that origin. EN/FR at 1440/768/320 shows Observed, source score 50 and no implied comparison arrow. Repeated read still shows an observation. Keyboard Command navigation exposes the authorized source link. Removing `purchases.orders.read` removes the observation while retaining dashboard access.
- Order remains SUBMITTED; event/journal/payment counts unchanged. No approval, dispatch, receipt or payment. No unhandled page or hydration errors. Six actual screenshots retained; French 320px inspected.
- Runtime source-before/source-after hashes match and are bound to the source baseline. No live customer, provider, production deployment or X1 change.

Exact commands and receipts are also in `evidence/digest-observations-v159.json`.

## User and operator guidance

Open `/en/dashboard/daily-digest` or `/fr/dashboard/daily-digest`. In Summary/Brief, read current observations as current source conditions. A risk score is the signal rule's existing classification, not a measured increase or decrease. Historical comparison unavailable means no earlier-snapshot comparison was performed. Reopening or reloading the digest does not turn an observation into a new event. Use Command/Pilotage and the authorized source link to investigate through the domain workflow.

No new user input is required for this display correction. The authorized purchasing operator maintains the actual PO status, expected delivery and receiving records in the existing purchasing workflow. The system administrator assigns source permissions from the organization's real role requirements. Neither a score nor an observation establishes approval or posting authority.

## Remaining findings and next work

The inspected French mobile view still contains English signal titles/impact text and the KPI status badge is clipped at 320px. These are recorded follow-up defects. Source inspection also shows `averageReadinessScore ?? 0` and ready-state overrides in Daily Digest: investigate missing metric values and source-specific freshness before claiming correct metric readiness. Risk urgency is inferred from severity and requires separate policy/provenance review. The fact producer labels pending orders as receiving delay without checking delivery dates; its semantic correctness also needs review.

All signal types, populated financial cases, complete tenant/role/accessibility coverage, query failures and the full workflow inventory remain unfinished. This one populated purchasing observation does not verify order-to-receipt or other complete workflows. Prior rendering recovery evidence remains historical; this change's runtime verifies populated observations and current source-permission filtering.

## Rollout, recovery and review responsibilities

No migration. Ship the coordinated contract, producer and renderer changes through existing release controls after remaining checks. If reverting this batch, revert those three changes together; retain previous localization, setup, recovery and access corrections. Existing genuine comparison records continue to use their current directions. No deployment occurred.

Architecture/backend/data: explicit observation semantics replace inferred history. Security/IAM/privacy: source permission filtering verified, no new query or authority. Finance/controls/audit/analytics: no invented change or financial effect; evidence retained. Frontend/design/UX/localization/accessibility: explicit non-color label and EN/FR comparison limitation; three widths verified, KPI clipping remains open. Product/operations: users can distinguish a present condition from a measured change. Quality/SRE/release: focused tests, typecheck, lint and actual persisted-source evidence; no performance or release certification. SaaS/AI: no entitlement, packaging or execution-policy change. Purchasing/AP: one submitted PO used only as a current observation; no lifecycle mutation. OHADA/country rules, POS/offline, HR/payroll, payments/providers, ledger/close, APIs/events: not applicable to domain changes in this batch because no calculations, posting or transitions changed; full reviews remain required.

These are engineering assessments, not independent professional approvals.
