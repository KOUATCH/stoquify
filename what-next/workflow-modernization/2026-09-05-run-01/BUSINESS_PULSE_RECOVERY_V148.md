# Analytics: recover a failed server read

## Reproduced defect

The analytics error boundary called only Next.js `reset()`. Local framework source (`node_modules/next/dist/client/components/error-boundary.js`) shows that reset clears the boundary's client error state; it does not fetch a new Server Component response. An actual French browser journey reproduced the consequence: after correcting the owned fixture's invalid organization timezone, Try again left the old error visible and issued zero new RSC requests. The error title and button were English on the French route.

The first reproduction attempt used the wrong button label, Retry instead of the existing Try again. Its timeout is retained separately and is not evidence of the retry defect. The corrected reproduction binds the old source and confirms the cached failure.

## Changes

The analytics boundary now refreshes the server route and resets the error boundary in one React transition. It keeps the current URL and delegates identity, tenant, permission and source validation to the existing server path. It does not return an empty report or reuse client data as a successful read.

Error title, guidance and retry label come from the existing EN/FR message catalogues. The error is announced through an alert region, with the inherited dashboard error component and a localized route back to the dashboard. The analytics boundary does not forward arbitrary error objects to that component's client console logger. This is limited to the analytics boundary; it does not assert global log sanitization.

A route loading fallback uses the shared DashboardRouteState with status/busy semantics and localized copy. It displays no synthetic figures. The fallback applies to the analytics route subtree. Its EN/FR rendering and busy semantics have unit coverage; a separately controlled runtime loading-duration/screenshot check remains open.

## User and operator procedure

When the read fails, no report figures are shown. Press Retry / Réessayer to request current server data. If the source problem persists, the screen remains unavailable; do not interpret it as a zero-row report. The dashboard link preserves the language.

If retry continues to fail, an authorized administrator should inspect the server's actual error and organization configuration. The controlled reproduction used an invalid timezone; the real cause can differ. Obtain the correct timezone from the organization's operating-location configuration and have the authorized owner correct it through the normal settings process. Do not change stock, sales or accounting amounts to clear a loading error. The application does not ask the user to supply a new approval ID or subscription.

If permissions were revoked, retry must show the server's access-denied state. Recovery is not authority to bypass that denial.

## Verification and limits

See `evidence/pulse-recovery-v148.json` for commands, final source hashes, before/after records and failed attempts. Focused tests exercise EN/FR rendering, alert and busy semantics, no raw-error rendering/logging by this boundary, refresh before reset, the analytics route catalogue, report page and shared error component.

Actual EN/FR browser journeys use the owned local PostgreSQL database and localhost:3110 application. Each creates a completed sale through the POS domain service, introduces an invalid timezone only in the isolated fixture, observes failure, repairs the fixture, activates retry by keyboard and sees the original sale again. A second failure followed by permission revocation verifies that retry rechecks current authority. Selected financial/stock records are unchanged by the reads. Six error screenshots cover desktop, tablet and mobile; French mobile was visually inspected.

The local server's old process handle was missing and port 3110 had no listener. The inspected wrapper restarted the owned server. Live verification handles were polled rather than duplicated; a read-only PostgreSQL check found idle client connections and no query lock wait during the slow initial run. Cold startup latency is not production performance evidence.

The new test initially needed the repository's customary Lucide mock because Jest cannot parse that package's ESM build in this test environment. The application implementation was not weakened to pass the test.

No migration, production deployment, external message, provider operation, live-customer activation or X1 change. Full loading-timing, network interruption, screen-reader, zoom and broader analytics-subroute error coverage remain incomplete. The existing access-denied title still contains English on the French route and remains separate localization work.

## Review, rollout and recovery

Architecture/backend: refresh retrieves new server-owned state; source guards are unchanged. Security/IAM/privacy: retry revalidates permissions and the boundary avoids forwarding raw error objects to its client logger. Finance/audit: failed reads do not become zero figures and no financial transition is changed. Frontend/product/UX/localization/accessibility: shared semantic colors/components, readable EN/FR guidance, alert/busy semantics and keyboard retry; full accessibility certification is not claimed. QA/SRE/support: controlled before/after reproduction and retained attempts; no production latency claim. Statutory/country-pack, inventory/POS business rules, AP/payroll, providers, offline replay, AI execution and packaging: not applicable to the read-recovery changes; their domain rules are unchanged.

Release the analytics error/loading files and two message-catalogue additions through the existing reviewed application process after remaining requirements. No database rollback is needed. If a code rollback is required, prepare a bounded patch preserving unrelated changes rather than resetting the branch. A rollback restores the known stale-error retry problem and should be recorded.

The broader workflow review remains incomplete. Continue exact stock drill-through, complete localization, actual freshness, loading/failure variants, accessibility, volume performance and the remaining platform register.
