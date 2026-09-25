# Daily Digest access, recovery and timestamp consistency

Evidence date: 2026-09-15. Branch `codex/migration-control-plane-release-2026-08-29`; HEAD `a05a41ef66cd5d98fd69ae3df18225795f912232`. Existing dirty tree preserved. Workflow `AN-DAILY-DIGEST` remains partially verified; the platform assignment remains active.

## Delivered and why

Daily Digest distinguishes unauthenticated, unverified email, locked account, missing organization and forbidden access. Localized guidance directs users to the existing sign-in or dashboard route. The sign-in link retains the localized destination. Guard mode, current identity, organization/object scope and permissions remain authoritative; denied access never invokes the data callback. Non-RBAC failures propagate to error handling.

The EN/FR error boundary announces failure, shows no digest figures, and offers retry plus dashboard navigation. Retry refreshes server data before resetting the boundary. Raw error objects are no longer passed to the shared component's client console logger. Loading uses the shared busy/status component and locale messages rather than a custom English skeleton.

A browser in America/New_York reproduced a text hydration error in the generated timestamp. The service now selects the organization's timezone and includes it in the read model. Both metadata and the brief header receive this timezone; the latter also receives the page locale. Older callers without timezone use explicitly displayed UTC. No stored times, snapshot periods, monetary values or financial rules change.

## Reproduction and verification

- Earlier 22-test route check passed (`485a7b`). Expanded run initially failed one exact query-shape expectation after adding timezone (`520218`, `2446a8`); the service test now verifies the timezone read and returned value. Final **32 tests / six suites passed** (`6f88aa`).
- Eleven changed TypeScript files linted successfully (`8f129b`); the subsequently updated service test linted again (`06ebbb`). Final production-source typecheck passed (`cc0772`).
- Actual owned database/app: `stoquify_local_registration_20260906_01`, localhost:3110, existing server session 32685, `.next-workflow-supplier`; no restart or migration. Runtime scripts assert database ownership and fence browser traffic to this origin.
- Before timestamp correction: `lanes/environment/digest-recovery-v154-f03f1e74-407e-4e71-aa29-2ef8b062f6af.json` (`f578cf`) reproduces EN/FR timestamp text hydration failures. Recovery already worked in this intermediate source.
- Final: `lanes/environment/digest-recovery-v154-0276ee5e-e3c4-4971-826f-0798d03351c2.json` (`b744cd`). EN/FR credential login, loaded views at 1440/768/320px, organization UTC with browser America/New_York, controlled invalid currency rendering failure, localized error, keyboard Enter retry with fresh RSC request, and current permission removal/reload denial passed. Ten screenshots retained. No proposal, business-event, payment or journal counts changed through these reads.
- Injected invalid currency is a **rendering failure**, not proof of database-query outage recovery. Database failures must still propagate; no successful zero-row fallback was introduced. React's development error reporting remains visible for the deliberate failure.
- Final initial-load observations: EN 8329ms, FR 5311ms. Development compilation/cache effects were not separated; these are observations, not performance certification.

Graph discovery: `graph_app.json` nodes `daily_digest_error_dailydigesterror` (community 95), `daily_digest_loading_dailydigestloading` (36), `daily_digest_page_dailyhabitdigestpage` (37). Current source supersedes these historical graph details.

## Visual/interaction review and remaining engineering

French 320px loaded and error screenshots were inspected. Current full-page capture has content throughout, and measured document width equals viewport at 1440/768/320px; the earlier apparent blank lower area was not reproduced. No speculative height patch was applied. The error has visible retry and return actions and readable wrapping. Keyboard retry was exercised; full screen-reader, zoom, focus traversal and every role remain unverified.

The loaded digest still mixes French headings with English role, card, evidence and action content. Shared BI components and server-generated digest strings need complete localization with affected-consumer tests. The browser still logs an attribute hydration warning in the sidebar; its exact attribute cause is not diagnosed here. This is separate from the fixed digest text mismatch. Do not call the page console-clean or accessibility-certified.

Populated source workflows, failed database reads, stale/partial data, different organization roles, full source-link navigation, and governed enabled agent/proposal flows remain incomplete. No release evidence was fabricated. These are continuing work, not external decisions.

## User and operator instructions

Open `/en/dashboard/daily-digest` or `/fr/dashboard/daily-digest` with an authorized account. The generated time identifies the organization timezone. The administrator obtains this value from the organization's actual operating configuration; UTC is the compatibility fallback, not a statement about the user's location.

If data cannot load, use Retry. It rereads current server state and access. If the error persists, the administrator checks organization settings and source-service logs; provide the route, language, time and organization identifier through the existing support process, never passwords. A denied view requires checking actual membership/role/permissions. An expired session requires sign-in; a locked account or unverified email requires the corresponding existing recovery process. Adding report permissions does not clear an account lock.

## Rollout and recovery

No schema migration, seed/reset, external dispatch, live activation, deployment or X1 change. Roll out through the existing release process after remaining checks. If reverting, revert only this batch's route handling/messages and timezone propagation together; preserve all earlier and unrelated changes. Monitor route failures and digest timestamp mismatches. The owned test currency was restored to XAF after each run; isolated verification records remain identifiable by the `digest-recovery-` organization slug.

## Review responsibilities

| Responsibility | Assessment |
| --- | --- |
| Architecture/backend/data | Existing guarded route and service-owned read model reused; additive timezone, no migration; source failures remain failures. |
| Security/IAM/privacy | Five guard reasons tested EN/FR, no denied data callback, current permission removal checked in app; no private error rendered/logged by this boundary. Full transport/tenant lifecycle still open. |
| Frontend/design/accessibility/localization | Shared route/error states, alert/busy semantics, keyboard retry, mobile screenshots; complete digest localization and sidebar warning unresolved. |
| Product/workflow/support | Specific recovery action replaces misleading role-only guidance; stable timezone prevents server/client disagreement. |
| Quality/release | 32 tests, lint, typecheck, actual isolated recovery; whole workflow and production release not certified. |
| SRE/performance | Fresh RSC retry observed; local timings recorded, no production budget claim. |
| Finance/controls/audit/records | Digest periods/amounts/control logic unchanged; selected financial/event counts unchanged; access audits remain available. |
| SaaS packaging/AI/agents | Entitlements and release boundaries unchanged; enabled proposal journey remains unverified. |
| OHADA/country rules, POS/offline, AP, HR/payroll, payment providers, ledger/close | Not applicable to these changes: no statutory calculation, domain transition, provider call or financial write modified. Underlying workflow review remains in scope. |
| APIs/events/integrations | Not applicable to behavior changes: no API/event/provider contract changed; route recovery invokes existing server read. |

All entries are engineering assessments, not professional approvals. Continue through the full workflow register.
