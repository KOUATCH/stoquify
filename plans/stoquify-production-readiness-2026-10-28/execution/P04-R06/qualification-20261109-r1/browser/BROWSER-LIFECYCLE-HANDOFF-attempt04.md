# P04-R06 browser lifecycle handoff after attempt04

Prepared 2026-11-10 from current source and actual isolated evidence. Read-only trace; no product changes, new runtime execution or automatic waiver.

## Observed outcome

Attempt04 result: `browser-diagnostic-attempt04/result.json`, SHA256 `e2bd19a57a0f635141891441cdbc62428ce312a8684a7c77b1a359d0b5fd5318`. Observation review: `../independent-review/BROWSER-DIAGNOSTIC-OUTCOME-REVIEW-attempt04.json`, SHA256 `406cee76f531bd45f75f2b1acf1bdc4ea150519a18166067b93d3af2db349de5`.

All six cases ran and all six screenshots were inspected. Both externally revoked reloads passed: login is visible, original profile-response bytes have no actor canary, and native data remains unchanged. Four authorized/restored views show the correct current profile and each has a completed current-subject session response, but strict network-completion gates fail.

Exactly eight RSC fetches have unambiguous original-response-ID/CDP-request-ID correlation followed by `Network.loadingFailed`, `net::ERR_ABORTED`, `canceled:true`: sequences 2,4,7,9,11,13,16,18. Four are locale-prefetch GETs; four are current-profile POSTs. All are status 200, gzip `text/x-component`, without disk/prefetch-cache or service-worker delivery. Original bridge bytes completed and downstream writes finished. In every case the summed CDP decoded `dataLength` equals the bridge decoded byte count. This is a length observation, not an independent body hash, successful terminal or proof every byte reached application code. All six native pairs independently match across 245 business tables and full user/session/account/audit rows.

## Current consumer trace

1. `components/dashboard/Navbar.tsx:256` renders `DashboardLanguageLink`. `components/dashboard/DashboardLanguageLink.tsx:30` renders a standard Next Link to the same pathname in the other locale without an explicit prefetch override. The actual GET has `next-router-prefetch:1` and `rsc:1`, matching this source path. It is speculative route data, not the current profile query. This mapping is source-supported; the precise initiating stack was not retained.
2. `app/[locale]/(dashboard)/dashboard/profile/page.tsx` checks `profile.read` and current session, then passes only actor ID, organization ID and locale to `SelfProfile`. It does not pass the profile record as initial query data.
3. `SelfProfile` checks the actual auth-client session, mounts `SelfProfileForActor`, and calls `useSelfProfile`. `hooks/useSelfProfile.ts:8` awaits `getSelfProfileAction`, checks actor/organization identity and returns its data. `actions/users/self-profile.actions.ts:11` obtains current session scope and calls `getSelfProfile`. The service rechecks current user, organization, permission and exact session in a read transaction, then returns profile fields, email, checkedAt and snapshotHash.
4. The displayed account email, fields, checkedAt and history section depend on successful `query.data` (`SelfProfile.tsx:29,94-110`). All four positive screenshots contain this account-data branch, including the per-read checked timestamp. This is evidence that a profile read result was consumed; it does not by itself bind the exact canceled POST response to that result. No save button was used and no profile mutation was observed.
5. Installed Next server-action reducer sends POST to the current canonical URL with `Next-Action`, accepts `text/x-component`, decodes `response.a`, then resolves the action result. The observed POST path/media type and sole current-profile query are consistent with `getSelfProfileAction`. Attempt04 did not whitelist/persist the Next-Action header or initiator stack, so exact compiled-action attribution remains an explicit gap; no action ID is invented.

## Cancellation disposition

The inspected installed Next prefetch transport has an explicit pagehide AbortController path; its server-action POST transport does not pass that signal. The inspected React RSC reader keeps reading its stream and reports reader errors; no source line in these inspected paths establishes that these eight specific cancellations are an intended successful terminal. Attempt04 did not collect pagehide/navigation lifecycle events or stream cancellation call stacks. No application cancellation signal appears in useSelfProfile.

Consequently, classify these as confirmed browser cancellations with visible successful profile consumption and unresolved transport/lifecycle attribution. Do not label the required POST an optional prefetch, assert a product defect from ERR_ABORTED alone, or declare the cancellations benign solely because the profile rendered. Raw strict attempt04 failures remain immutable. The prior attempt03 missing-body diagnosis is now narrowed by actual CDP evidence.

## Exact next verification action

Prepare a separately reviewed bounded request-to-consumer observation recipe for these two classes before another run. It must preserve all six EN/FR authorized, revoked reload and restored cases; keep the accepted artifact and actual sessions; retain the original bridge and native before/after evidence; and preserve every failed response.

- Capture only safe Next-Action identity (or hash with an in-memory matching proof), full URL hash, response capture ID and CDP request ID/hop; resolve the observed action against the exact artifact module/source mapping without dumping server-reference encryption keys or credentials.
- Capture monotonic request/response/data/terminal events plus pagehide/pageshow/visibility/main-frame navigation and the sanitized script initiator stack. Establish whether the cancellation occurs before a required read result, after its consumer resolves, or due to navigation/context teardown. Do not assume the pagehide source branch caused this run.
- Bind the exact server-returned profile actor/tenant, checkedAt and a hash of expected public-in-this-authorized-context profile fields to the actual rendered account details. Record success/error and fresh-result progression from the existing reload-current-account-record control using a separate native no-write bracket. No profile save or product instrumentation is required.
- For locale-prefetch GETs, retain original bytes and cancellation proof and separately demonstrate the real locale navigation succeeds with current authority. A canceled speculative response cannot substitute for that navigation.
- Retain no-private-byte and no-unauthorized-write assertions after revocation, including all observed response classes, and verify restored real-session reads.

Advancement requires either successful original network completion for the existing strict criterion, or independent review of a concrete lifecycle contract proving an intentionally canceled response has fulfilled its required consumer obligations while denied requests remain private-free. Any replacement acceptance rule must be explicit and reviewed; it cannot retroactively rewrite attempts 02–04 as passing. If exact source/consumer correlation shows an unresolved required read, propose a bounded repair before rerun. E29 origin-denial account mutation and the separate cookie-free origin-policy gap remain blocked independently.

## Source bindings

All seven current application files below match the accepted candidate source exactly. Existing graph_components.json and graph_hooks.json were consulted for discovery; they contain no matching SelfProfile/useSelfProfile/language-link nodes and supply no live behavioral guarantee.

| Source | Current/candidate SHA256 |
| --- | --- |
| `app/[locale]/(dashboard)/dashboard/profile/page.tsx` | `e6379f0fc71dcd51f070889006b6a9e05baa3b3f4e2054babf5a563492b1bdfc` |
| `components/settings/SelfProfile.tsx` | `326c95f04a2b8f0c2d1817cda9cac03b0acc1f8a80f1cec86f7f4d4929320b5c` |
| `hooks/useSelfProfile.ts` | `228ef4afb7d74bb096cb9fe9012b5240f12bd4172454a72b055d0bcf125f13c6` |
| `actions/users/self-profile.actions.ts` | `3ebaeebb34459710386533ea6f38e912c1e7a72150099592041c0012386751b2` |
| `services/users/self-profile.service.ts` | `d77613d9e944616cca27f40efe0066d3a484dd741a15d2a4ffedb8a13029df17` |
| `components/dashboard/DashboardLanguageLink.tsx` | `9a03f4a2233eb829c192f01b936295bb193b62e6639ac848f7c42afe90bc8e1d` |
| `components/dashboard/Navbar.tsx` | `8457239b4dfaf0e9c76576826f36d4a7e72a2ad7c97e479a45716d8af3466232` |


Installed framework source inspected read-only (not imported):

| Source | SHA256 |
| --- | --- |
| `node_modules/next/dist/client/components/router-reducer/fetch-server-response.js` | `b1995017677c1b6311f1fa48cbf10c3ea22e4ac5b1aec2027eb045ae4ae2345e` |
| `node_modules/next/dist/client/components/router-reducer/reducers/server-action-reducer.js` | `4ffe36522324e9e0494e59aa55badac485042b8c53067c9520c4180ebbbccd29` |
| `node_modules/next/dist/compiled/react-server-dom-webpack/cjs/react-server-dom-webpack-client.browser.production.js` | `796fabce442c98ba7507ef87333e580ca76e38dbc3304b12f79cc5334087a484` |

No further runtime, browser, database or compiler action was performed for this handoff. Primary reviewer owns independent acceptance.
