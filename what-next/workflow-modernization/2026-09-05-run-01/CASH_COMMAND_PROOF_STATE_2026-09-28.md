# Cash Command proof state — bounded correction

2026-09-28T09:15:02.844Z. Parent workflow remains In progress.

Multiple hosts previously shared one open flag and proof result; late responses could replace the selected record, and transport failure escaped recovery. Each opening now has a subject identity and request sequence. Selection/close clears old data; stale responses and unmatched tenant/subject payloads are discarded. A server scope change remounts the proof section immediately. One selected drawer receives loading, error or actual proof data. Close/reopen retries, with generic EN/FR recovery copy and focus returned to the initiating button.

## Evidence

- evidence/cash-visibility-checks-bddc10b4-7464-45e1-88bd-d1a4bb2aaf2f.json: 41 tests/four suites, lint and TypeScript passed. Tests cover overlapping requests, scope withdrawal, wrong subject/tenant response, EN/FR transport recovery and focus return.
- First focus-return failure retained: evidence/cash-visibility-checks-46f199bc-5ade-46e8-948e-2c035d646380.json. The inline test drawer's close button replaced the captured trigger; dialog buttons are now excluded from capture. Assertions were retained.
- lanes/environment/cash-proof-state-839a6d9d-9f7d-48c6-ba36-dcd123a78aeb.json: actual EN desktop and FR 320px browser. Forced failed server-action transport, keyboard open, one dialog, Escape/focus return, actual payment proof retry, permission revocation and identifier withdrawal passed. Synthetic PENDING payment row unchanged by reads; this is no payment execution/posting evidence.
- Source/receipt/screenshot bindings and aggregate impact: evidence/cash-proof-state-review-2026-09-28.json.

Only Cash Command proof state/rendering and its component tests changed. No domain projection, service, action, shared drawer, module guard or route source changed. All 35 previous regression cases still pass alongside six new cases; actual payment proof reads and aggregate denial on reload exercised on the current component. Earlier aggregate runtime receipt stays immutable and is reused with this bounded impact review.

## User procedure and remaining work

On /en/dashboard/finance/cash-command or /fr/dashboard/finance/cash-command, choose an available proof. A loading state replaces previous evidence. If loading fails, close the panel and reopen the same proof. Escape returns to its button. Current server permissions control both discovery and loading; role changes require current data to be fetched. This patch does not provide real-time server-pushed revocation of an already open page.

Cash proof state and payment-proof recovery are corrected and verified. Complete other proof types, pending-close browser races, full dialog localization, contrast and broader accessibility; no complete proof-workflow closure claimed. Source query scoping/provenance, finance/payroll/inventory handoffs, actual posted payroll and full Cash Command EN/FR remain open. The shared drawer still has English labels on the French route. No schema, production deployment, statutory approval, provider operation or release certification is included.

## Additional browser findings and retained attempts

Actual proof screenshot shows nearly unreadable dark text on a transparent portal over the page. ProofTrailDrawer uses an undefined --dash-bg and portal content lacks the local dashboard token scope. Correct inherited portal tokens/background and verify actual EN/FR readability, focus and reflow; prior interaction passes are not visual accessibility passes. See evidence/cash-proof-portal-finding-2026-09-28.json. The final interaction receipt does not establish readable visual presentation; the complete workflow remains open.

Earlier browser attempts remain retained: ed50864d failed before hydration was explicitly verified; eefde7ba failed while collecting the response body; b57169ef captured a successful action that also refreshed the page, then failed focus return because the display timestamp remounted the proof section. The key now uses actual tenant/period/locale/subject scope and a sixth regression preserves an open proof across an unchanged-scope refresh. One browser-driver replacement syntax error failed before execution; it created no fixture. Final actual responses were buffered and forwarded unchanged through the local route to inspect their identity without losing their body during page refresh.
