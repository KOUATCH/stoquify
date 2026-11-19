# AF02 portfolio UI state and navigation contract

Date: 19 October 2026. Route: `/{en|fr}/dashboard/accounting/accountant-portfolio`. Canonical execution evidence and limitations: [RESULT.md](RESULT.md).

## Reused boundaries

The existing accounting route guard authenticates and checks the home workspace module and role. The client workspace calls `getAccountantPortfolioAction`; AF01 rechecks persisted actor membership, permission, modules and each client mandate. The view consumes the returned DTO and does not derive a score, certification, authorization or financial decision.

The existing work desk remains a separate read and review surface with its own client pages. Its counts are never added to portfolio counts. Client cards open the existing independently guarded accountant portal with the exact returned `clientOrganizationId` and selected `periodId`.

## State matrix

| State | Visible behavior | Recovery / private-data handling |
| --- | --- | --- |
| Initial loading | Bilingual shared loading panel and polite status; search remains visible | Protected action supplies a fresh page; no server-rendered private DTO is reused |
| Current selected assessment | Text says current assessment selected; evidence grade appears separately | CURRENT is never translated to certified; service-owned grade governs the displayed grade |
| Stale evidence | Explicit stale label, current grade and canonical blocker explanation | Open the authorized period's ledger evidence; no automatic assessment or financial write |
| Historical / ambiguous / voided | Each has its own EN/FR status label | Historical score remains explicitly historical, regardless of its value |
| No period / no assessment / unavailable | Explicit reason; absent score, date, grade and blocker evidence display unavailable | Missing information is never converted to zero or a healthy state |
| Partial scan | Loaded count is explicitly this page only; continuation remains available | Request the next AF01 cursor, including on a page with no visible clients |
| End of scan | End of this scan; no global client-total claim | Restart to reconcile grants or names that changed during traversal |
| Empty page or no search match | Generic authorized-client empty state | Search again, restart or continue if a cursor exists; no denied-client names or reasons |
| Failed request | Safe bilingual unavailable panel; no raw server message | Retry; previous portfolio and work-desk state have already been cleared |
| Invalid cursor / input | Restart-search state | Retains search and restarts with a valid default page size; does not reuse the invalid cursor |
| Permission/home workspace access lost | Generic access-unavailable panel | Clear private state and retry after restoration; no attempt to distinguish redacted client module reasons |
| Initial module locked | Existing server route guard's shared locked-module state | No portfolio mount; administrator restores entitlement through existing controls |
| Stale session | Renewal state with safe same-locale login return URL | Private data cleared; search retained in the recovery URL; no external redirect |
| Changed/revoked mandate | A subsequent response omits that client's card | Known expiry schedules reauthorization; the card does not invent a revocation reason |
| Hidden tab / pagehide | Private state cleared synchronously before page freeze | Invalidate in-flight requests; reauthorize on visibility return or persisted pageshow |
| Late response | Obsolete result discarded by request generation | Cannot restore data after hide, unmount or a newer request |
| Search or cursor navigation | Form submit resets cursor; continuation replaces the current page | Result heading receives keyboard focus after requested load; only safe navigation context enters the URL |

## Presentation and accessibility contract

- Reuse `AccountingPageShell`, dashboard semantic tokens, `ProofBadge` and `RouteStatePanel`. No new theme, chart package or persistence model.
- Distinguish selected period, assessment as-of, current proof check, historical score, historical blocker count and mandate expiry. Dates explicitly use UTC.
- Render all canonical blocker categories, with EN/FR descriptions mapped by service-owned IDs. Unrecognized French IDs receive a neutral review instruction; they are not silently treated as resolved.
- Native search has a visible label and helper text. Buttons and navigation have 44px minimum height, visible focus, wrapping and textual status cues. Cards reflow and tolerate long names and French labels.
- No private client DTO enters local/session storage. The URL holds search, page size and the AF01 continuation position. That position is never authority.
- Refresh, backgrounding and navigation clear the work-desk view and draft state. This protects privacy during reauthorization; draft persistence across a workspace refresh is not promised. Existing in-work-desk continuation behavior is unchanged.
- Browser screenshots and traces contain synthetic fixtures only. Mocked component assertions, live PostgreSQL-backed browser checks, automated accessibility scans and visual review are distinct evidence classes in RESULT.md.

## Verification boundaries

Revocation after a response is not a push notification. The view observes changed authority on its next read, visibility return, known expiry, navigation or refresh. Every sensitive destination/action remains server-authorized. No global lock, instantaneous cross-session revocation claim, production release or statutory certification is introduced.
