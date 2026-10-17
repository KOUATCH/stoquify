# Cash Command accessibility and authority denial

Primary workflow: FA-CASH-COMMAND. This is a delivered correction within the existing closure checklist, not a complete financial-workflow closure. The repository branch and HEAD remain `codex/migration-control-plane-release-2026-08-29` / `62a56036a5ac9b37236a20c9b148052199069479`, with existing user changes preserved.

## Findings and implementation

An authenticated user with `finance.read` but without tenant-wide operating authority passed the finance route guard and was rejected by the Cash service. The rejection escaped to the generic dashboard error boundary, which incorrectly described it as a failed or timed-out source. The Cash route now renders a localized permission-denied explanation and a dashboard return link. The service still decides admission and records denial. Genuine source failures continue to propagate; neither empty balances nor a successful dashboard are fabricated.

The authorized French 320px baseline showed two main landmarks and two content-level h1 headings. Four status labels were ellipsized when text size was doubled. Cash content now uses the dashboard shell's main landmark, retains the command brief's primary heading and wraps status labels. The first full matrix also found two French reconciliation links overflowing their risk cards at 1440px with doubled text. Cash's risk-section links now permit long-word wrapping through the existing component className extension. Shared components, tokens, permissions and financial services are unchanged.

## Verification and evidence

Exact commands, hashes, outcomes and screenshots are indexed by `evidence/cash-accessibility-review-2026-09-30.json`. The focused runner executes Cash route, component and service tests, changed-file lint, and the existing TypeScript command. The browser runner uses the owned local app on port 3110 and guards the disposable database identity before any fixture operation.

The browser matrix covers EN/FR at 320, 768 and 1440px, three keyboard-operated command modes, normal and doubled text, section-link keyboard navigation, main/heading structure, named controls and horizontal overflow. It separately exercises actual authenticated service denial in EN desktop and FR mobile. Journal/payment counts and payroll balance records are compared before and after. This does not establish every possible financial side effect or every downstream lifecycle.

The first browser attempt used an arbitrary role code with finance permission and therefore correctly failed service admission. The diagnostic receipt confirmed `FORBIDDEN`, which exposed the misleading page presentation. The corrected fixture uses the source-recognized `administrator` role in the already-owned synthetic organization; production authority logic was not changed. A sandbox attempt could not save its receipt (EPERM); it was retried through approved escalation. Retained failures are evidence, not passes.

The first focused-check batch returned zero from tests, lint and TypeScript, but its aggregate receipt correctly failed source stability because the subsequently discovered link-wrapping correction was made while TypeScript was running. Final verification requires a stable-source rerun; the intermediate receipt is retained.

The automated accessibility scan leaves color-contrast items incomplete. Full contrast verification, native screen-reader speech, browser zoom, shared denied-state landmark structure, all payroll tables and production latency remain open. Doubled CSS text is an enlargement check, not native browser zoom. No accessibility certification is claimed.

## Review, guidance and recovery

Architecture/frontend: narrow route handling and existing shell semantics. Security/backend: tenant-wide admission remains service-owned; unexpected errors propagate. Finance/data: no monetary or persisted business-state implementation changed; real financial activation is outside this correction. UX/localization: EN/FR denial explains the appropriate access-review action; text wrapping preserves full labels. QA/SRE: isolated source-bound checks and local observations, not production performance proof. Operations: ask the organization administrator to review role authority when denied; retry a genuine load failure according to the existing error screen. Admin status is not a substitute for missing module, source or statutory controls.

The existing component graph locates `cash_command_cashcommanddashboard_tsx` in community 0. Current imports and source confirm the route → Cash service → Cash dashboard relationship and reuse of DashboardRouteState; historical graph line numbers were not used as current implementation evidence.

Database/migrations, statutory rules, providers, billing, AI and commercial packaging: not applicable to these rendering changes. Existing statutory review and complete payroll/proof lifecycle requirements remain unresolved and tracked in CURRENT_PROGRESS.md. No schema migration, deployment, external message or real payment was performed.

Review routes: `/en/dashboard/finance/cash-command` and `/fr/dashboard/finance/cash-command`. Roll out through ordinary application review/release controls. Recovery is a scoped revert of this correction while preserving prior changes; no data rollback is needed. The previous denial presentation was misleading, so a rollback must retain the service guard and document that limitation.
