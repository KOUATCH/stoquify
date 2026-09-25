# Daily Digest modes that change the working view

2026-09-15. Branch `codex/migration-control-plane-release-2026-08-29`; HEAD `a05a41ef66cd5d98fd69ae3df18225795f912232`. Existing unrelated changes preserved. Workflow `AN-DAILY-DIGEST` remains partially verified; full platform assignment remains active.

## Finding and correction

The mode buttons updated `mode`, but the same KPI, changes, actions, risks and first source zone rendered for every value. Users received selected styling without a different working view. Current source confirmed the historical design's Brief/Command/Investigate controls were not wired to content. Historical graph `daily_habit_dailyhabitdigestdashboard_tsx` (community 156) and the dashboard experience report located this boundary; source was authoritative.

Daily Digest now uses the existing shared components in three distinct regions:

| Mode | Purpose and content |
| --- | --- |
| Brief / Synthèse | Key figures and changes for the selected role. |
| Command / Pilotage | Existing authorized actions and risk signals; operations still occur in their owning source workflow. |
| Investigate / Examiner | All existing source zones, their evidence states, drill-through links and limitations. No fabricated proof drawer or verification is introduced. |

A persistent source-limitations notice shows blocker titles and blocker/redaction counts in every mode. Its Inspect sources action opens Investigate. Existing freshness/evidence and primary workflow link remain in the header. Mode help is localized and announced through a status paragraph; the displayed region has a localized accessible name. Existing mode buttons retain aria-pressed and keyboard behavior. Selecting another role workspace resets to its declared brief mode.

Restricted digest actions now use a genuinely disabled Button and display the server-provided reason. Previously they replaced the link with a span while leaving the button enabled. Authorized action hrefs and current server checks remain unchanged. This is local presentation state; it does not approve, activate, mutate, resolve, post or execute domain work.

## Verification

- **17 tests / three suites passed** (`334d83`): new EN/FR mode tests, existing role/timezone UI tests and shared BI primitives. Tests cover mutually exclusive content, persistent blockers, unchanged data object, disabled actions without links, source-inspection shortcut and role-switch reset.
- Two changed TypeScript files passed lint (`8e373f`); typecheck passed (`d85832`).
- Owned database `stoquify_local_registration_20260906_01`, app localhost:3110 with existing `.next-workflow-supplier`. Inspected fixture asserts database ownership and fences browser traffic to localhost. No app restart, migration, database reset or live integration.
- Actual runtime (`41b49e`): `lanes/environment/digest-recovery-v156-aaca61df-e71d-4bf8-934c-8117229e28cb.json`. Credential login, all three modes using focus + Enter at 1440/768/320 in EN/FR, selected state and mutually exclusive named regions, persistent limitations, role switching, localized source hrefs, rendering-error retry with fresh RSC, and permission-removal denial passed. No digest text hydration exceptions. Selected proposal/event/payment/journal counts stayed unchanged.
- Thirty screenshots retained. French 320px Command and 1440px Investigate screenshots inspected. Viewport captures show source limitations and distinct mode content; empty risks continue to explain that absence of signals does not establish absence of risk.
- Initial local loads: EN 8013ms, FR 5369ms, including unseparated development compile/cache effects. No production performance conclusion.
- Source baseline `evidence/source-baseline-v156.json` (`f24658`) and aggregate evidence bind this batch to actual source hashes.

## Remaining work and limits

Dynamic signal/blocker text and technical source identifiers remain in English in the French view. The inspected mobile notice includes inherited messages about provider setup, missing accounting-period coverage and missing location. Translate these at their semantic owning boundary, preserving evidence, values and user-entered text.

The sidebar still logs an attribute hydration warning. Prior full-page screenshot blanking is an evidence limitation; real scrolling was verified in v155 and again here. The deliberate invalid-currency error tests rendering recovery, not a database outage. Real populated/action execution, all role/tenant combinations, database failure/partial/stale cases, governed enabled agents/proposals and full screen-reader/zoom verification remain incomplete.

Mode choice is not persisted across a full reload; it is a view preference, not a draft business operation. This batch does not claim full workflow completion or release certification.

## User/operator guide and rollout

Open `/en/dashboard/daily-digest` or `/fr/dashboard/daily-digest`. Choose a visible workspace. Use Brief to scan figures, Command to find permitted next actions, and Investigate to inspect sources. Keyboard users can focus a mode and press Enter. Source limitations remain visible in each view; Inspect sources is a direct shortcut. A disabled action requires the reason shown to be addressed through the existing organization/workflow controls.

No new approval system or user input is required. Administrators continue to provide real membership, permissions, organization timezone and source setup through existing workflows. Missing providers, periods or locations must be handled using actual setup requirements; changing mode cannot clear a gate. Retry rereads current state and authority after a recoverable failure.

No schema migration, external message, provider operation, financial execution, production deployment, live activation or X1 change. Roll out through existing release controls after remaining checks. If needed, revert only this batch's DailyHabitDigestDashboard mode/disabled-button changes and associated tests; preserve v154/v155 recovery, timezone and localization work. Owned test currency was restored to XAF.

## Review responsibilities

| Responsibility | Assessment |
| --- | --- |
| Architecture/backend/data | Existing read model and shared components reused; no service, schema or domain mutation changed. |
| Security/IAM/privacy | Persistent limitations and disabled actions preserve server-owned authority; real permission-removal denial passes. No new protected-data fetch. |
| Frontend/design/UX/localization/accessibility | Distinct task views, shared tokens, named regions, status help and keyboard control verified; inherited source text and full accessibility remain open. |
| Product/operations/support | Mode selection now has an observable purpose. Source-inspection shortcut and disabled reason clarify next steps without adding process approvals. |
| Quality/release/SRE | Focused tests, lint, typecheck, actual EN/FR viewport and recovery evidence; production timing and release readiness unproven. |
| Finance/controls/audit/analytics | Existing figures/evidence remain untouched; blockers are visible in every mode; no selected financial/event effects observed. |
| SaaS/AI/agents | Capability and release policy unchanged; mode choice grants no execution or commercial authority. |
| OHADA/country rules, POS/offline, purchasing/AP, HR/payroll, payments/providers, ledger/close | Not applicable to this patch's domain behavior: no statutory calculations, posting, provider calls or lifecycle transitions changed. Full workflow review remains required. |
| APIs/events/integrations | Not applicable to external contract changes: existing route reads and links only. |

These are engineering assessments, not independent professional approvals. Continue through the full workflow register.
