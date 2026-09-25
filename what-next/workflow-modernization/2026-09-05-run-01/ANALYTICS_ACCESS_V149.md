# Analytics access and recovery

## Finding and change

The three analytics routes share `analytics-route-access.tsx`. Its earlier error handling mapped every RBAC error except `NO_ACTIVE_ORG` to an English role-denial message. The actual guard also emits `UNAUTHENTICATED`, `EMAIL_NOT_VERIFIED` and `ACCOUNT_LOCKED`. `FORBIDDEN` can mean a stale organization context as well as insufficient permissions. A role change is not the correct remedy for all these conditions.

The wrapper now uses the existing EN/FR message catalogues and gives a distinct explanation for each error code. Unverifiable sessions and unverified email offer the existing localized sign-in route with a callback to the registered analytics route. No private error message, subject ID or permission inventory is rendered. Missing organizations and locked accounts receive administrator guidance. Forbidden access mentions both role and organization context without asserting an unproven cause.

Permission functions, their single/any/all semantics, object scope and the callback that loads authorized data are unchanged. Unknown source errors still propagate to the actual error boundary. The generic `FORBIDDEN` code is deliberately not inferred from error-message text. The sign-in callback preserves the catalogue route and language, not arbitrary report query parameters.

The inherited dashboard layout can redirect authentication, verification and locked-account failures before a page renders. This batch improves the analytics wrapper when it handles the error; it does not replace that layout or claim all authentication recovery journeys are verified.

## User and operator guidance

| Observed condition | User action | Owner and source of needed information |
| --- | --- | --- |
| Session cannot be verified | Use Sign in / Se connecter. If sign-in also fails, contact support. | Account holder uses their normal credentials; support examines actual session/service failures. No password should be put in an approval register. |
| Email verification incomplete | Return to sign-in and use the existing verification instructions. | Account holder obtains the verification code through the existing verification process. No code is manufactured by this workflow. |
| No active organization | Return to the dashboard; ask the administrator to check organization access. | Authorized administrator checks the account's actual organization and its active/deleted state. Refresh alone is not promised to reactivate it. |
| Account locked | Contact the administrator to review account access. | Authorized security/account administrator examines the recorded lock and recovery policy. A report-permission change does not clear the lock. |
| View not authorized | Ask the administrator to review access; return to the dashboard if the session/organization changed. | Administrator checks current server roles and account organization. No permission is granted by this screen. |

Routes: `/en/dashboard/analytics`, `/en/dashboard/analytics/reports`, `/en/dashboard/analytics/referrals`, and corresponding `/fr/` routes.

## Verification and source binding

See `evidence/analytics-access-v149.json` for exact receipts, runtime source hashes and retained screenshots. Twenty-three tests cover EN/FR recovery for all five codes, no protected callback on denial, each current route's permission requirement, all-permission/object handling and non-RBAC error propagation. Lint and typecheck passed.

Actual owned-database browser checks revoke permissions after a failed read, retry by keyboard, visit all three denied routes in EN/FR, restore permissions and recover the completed 100 EUR sale. Selected sale, payment, journal, stock and shift records remain unchanged by those reads. They do not prove immutability of every database table; existing access audit writes remain expected. Desktop and mobile denial screenshots are retained, with the French mobile report screen visually inspected.

The first browser run passed its business assertions but recorded one English `Invalid or unexpected token` page error without a location. A follow-up configured location and stack capture and passed all assertions with zero page errors in either language. The original cause remains unclassified. Both outcomes are recorded separately in the evidence; a passing repeat does not explain the first observation.

Two initial Jest runs exposed test setup failures: unmocked next-intl ESM exports, then resetting the global IntersectionObserver mock. Test-local mocks and resets were corrected; production guards and framework behavior were not weakened.

Historical graph hints: `locale_dashboard_dashboard_analytics_page_tsx` community 34 and `locale_dashboard_dashboard_analytics_reports_page_tsx` community 78. Current route imports and the three-entry catalogue verify the shared wrapper relationship. Graphs do not establish runtime coverage.

## Design and review

Uses existing DashboardRouteState, dashboard shell, typography and tokens. Session failures use the established stale-session treatment; role/account restrictions retain permission-denied semantics; no-active-organization retains its attention treatment. Text, a heading and an icon identify the state independently of color. French mobile copy wraps within the card, and the dashboard link has visible focus.

Architecture/backend/API: one shared wrapper, server authorization remains authoritative. Security/IAM/privacy: distinct safe explanations, no private details, current permission denial tested. Finance/audit/data integrity: no report rows on denial, selected records stable, no financial transition changes. UX/accessibility/localization: EN/FR states and keyboard focus tested; full screen-reader, zoom and auth recovery remain open. Product/SRE/support: cause-appropriate next action, retained failed attempts, no production latency claim. Database migrations, statutory/country rules, POS/offline business rules, AP/payroll, provider payments, ledger/close rules, AI execution and SaaS pricing: not applicable to this presentation correction; none changed. These are engineering reviews, not professional approvals.

## Rollout, recovery and remaining work

Release the wrapper and the additive `analyticsAccess` keys through the normal reviewed application release. No migration is needed. Preserve the many unrelated edits already in the message files; do not roll back the entire catalogues or reset the worktree. A bounded rollback restores the known misleading English-only classification.

Outstanding: browser verification of the other four error-code paths including parent-layout redirects, source-error location investigation as recorded, actual loading timing, complete successful analytics localization, precise stock drill-through, freshness, accessibility, volume performance and the remaining platform workflow register. This batch does not complete the platform review or clear X1.
