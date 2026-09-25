# v158 — Understand Daily Digest setup limitations

Evidence: 2026-09-15; branch `codex/migration-control-plane-release-2026-08-29`; commit `a05a41ef66cd5d98fd69ae3df18225795f912232`. Current source and dirty tree recorded in `evidence/source-baseline-v158.json` (receipt `e0c8ba`). Preserve unrelated changes. Full platform review remains incomplete.

## Delivered behavior

Daily Digest setup blockers now expand to show the source explanation and next step. Native details/summary controls retain a compact initial view, keyboard operation, visible brand focus and the existing attention-color panel. They execute no setup operation and grant no authority. The three observed missing-setup cases now read in French throughout the digest and source-zone views. The fourth verified static message, no reconciliation run in the period, also has French presentation.

The new `lib/dashboard/snapshot-blocker-presentation.ts` matches the source blocker ID, gate and each original static message. Unknown IDs, changed/custom text and absent next actions remain intact. English copy is unchanged. `daily-habit-digest-presentation.ts` applies presentation after current role and authority filtering. IDs, severity, gate, source tables, monetary values, evidence and source hashes are retained; original snapshots are not modified. Domain snapshot services, schema and activation controls are unchanged.

Verified source owners: payment-truth snapshot (`payment-provider-account-missing`, `payment-reconciliation-run-missing`), close-readiness snapshot (`close-periods-missing`), tenant-operating snapshot (`tenant-active-location-missing`). Matching original copy protects against replacing later source-specific instructions with an outdated translation; source-message changes require a corresponding translation review.

## Verification and limitations

- 20 tests in four suites passed (`15bcfe`): helper fallback/custom-text preservation, digest evidence/identity invariants, existing role filtering, mode behavior and native disclosure content. Initial new test failed because it incorrectly expected a metric card to own digest-wide blockers (`90d33e`); corrected to assert that card blockers stay empty. No application behavior was changed to satisfy that assumption.
- Six changed TypeScript files passed lint (`df221c`); typecheck passed (`93b590`). Direct inspected Jest/ESLint/TypeScript commands; no migration-bearing build invoked.
- Actual owned localhost runtime passed (`d4c781`): `lanes/environment/digest-recovery-v158-e2818c5c-427d-42c8-9f92-e0b0cca7a098.json`. Real EN/FR credential login, keyboard disclosure opening/closing and translated next steps at 1440/768/320; all mode/role/source-link checks retained. Deliberate rendering failure, fresh-server keyboard retry and current-permission denial passed. No hydration warnings or unhandled page errors. Expected invalid-currency error-boundary console output remains recorded.
- Selected proposal/event/payment/journal counts unchanged. Network fenced to owned localhost; fixture currency restored to XAF. No live provider, notification, migration, deployment, activation or X1 change.
- 36 screenshots retained. French 320px expanded setup guidance visually inspected: wrapped text, visible focus, next steps and source-inspection button remain readable. Initial development loads EN 7700ms / FR 4142ms are observations, not production performance certification.
- Current source bindings include all three changed production files. No claims of full accessibility or whole-workflow completion: full screen-reader/zoom and all populated/role/tenant/query-failure cases remain open. Other dynamic source/signal/blocker messages and technical source names still need localization. Full-page screenshot blanking remains a separate capture limitation.

## How to use it and information required

Open `/en/dashboard/daily-digest` or `/fr/dashboard/daily-digest`. Under Source limitations / Limites des sources, select a blocker title to expand its explanation. Keyboard: focus the title and press Enter; press Enter again to collapse it. Inspect sources changes the digest view. A displayed next step is guidance; use the existing authorized setup workflow to perform it. Refresh or retry after actual setup changes so the service can reassess the condition.

| Condition | Responsible person | Information needed and where to obtain it |
| --- | --- | --- |
| No active provider account | Authorized treasury/payment administrator | Actual bank, cash or mobile-money account configuration and required supporting statements/provider evidence; obtain from the organization's account owner and provider. Use existing account setup and its controls. |
| No accounting-period coverage | Authorized finance/accounting administrator | Approved fiscal year and accounting-period dates covering the selected digest range; obtain from the organization's accounting calendar and responsible accountant. |
| No active location | Authorized organization/location administrator | Real branch or warehouse details and whether an existing site should be reactivated; obtain from the operations owner and location records. |
| No reconciliation run in period | Authorized reconciliation operator | Selected period, configured provider account and actual statement/provider records; obtain from treasury/provider evidence and run the established reconciliation workflow. |

No new approval document is required by this display change. Existing prerequisites and authority still apply. Missing information is not approval, and expanding a message cannot clear a gate.

## Rollout and recovery

No schema change or migration. Release through existing controls with the remaining verification limits visible. If this presentation needs rollback, revert only the v158 helper, its integration into digest presentation, and the expandable limitation markup/tests. Preserve earlier timezone, role, mode, error-recovery and screenshot corrections. Keep original evidence and hashes. No deployed environment was changed.

## Review responsibilities

Architecture/backend/data: service-owned truth preserved, presentation applied after filtering. Security/IAM/privacy: unchanged authority and tenant scope; custom source text preserved; no new data fetch. Frontend/design/UX/accessibility/localization: existing tokens and native controls; tested keyboard and responsive French guidance. Product/operations/support: source explanations and next steps are now reachable without adding a process stage. Finance/controls/audit/analytics: original blockers and evidence remain effective; no recorded financial effects. Quality/SRE/release: focused tests, actual browser evidence and explicit limits. SaaS/AI: no packaging, entitlement or agent authority change. OHADA/country rules, POS/offline, purchasing/AP, HR/payroll, ledger/close, payment-provider execution, APIs/events: not applicable to domain behavior in this presentation patch; no calculation, posting or transition changed. Their full reviews remain required.

These are engineering assessments, not professional certifications. Continue through the full workflow register.
