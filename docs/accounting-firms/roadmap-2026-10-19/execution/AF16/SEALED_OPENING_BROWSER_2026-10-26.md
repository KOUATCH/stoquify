# AF16 sealed opening workflow verification

26 October 2026. **AF09–AF10 authenticated browser workflow PASS against the retained full application artifact. Production remains NO_GO; AF16 remains IMPLEMENTED_UNVERIFIED for release.** Live pilot validation remains deferred. This continuation closes the selected opening staging/apply/recovery browser gap; it does not qualify every accounting-firm screen.

## Exact candidate and reused functionality

Build ID: eoW9-NZPj4rd9OHTZxMDM. Artifact manifest SHA-256: 987da3ead9c716cdbf5d2a22ac1723aa8a8ed15113f40a6b8abd3c1fb64d151f. The existing release verifier checked the source identity, manifest and all 5284 sealed files before use and again after the browser journey. The retained outside-repository runtime copy matched those files before startup. No application source, dependency, migration or built file was changed; the frozen candidate was not rebuilt or refreshed.

Reused scripts/verify-opening-cutover-browser.cjs and the retained AF16 AF10 PostgreSQL scenario fixture. The new runner adds local orchestration, exact target guards and an adapter; the original financial assertions remain. It clones stoquify_local_af16_20261025_af10_r1 into stoquify_local_af16_20261026_opening_r3 only after checking the owned PostgreSQL data directory and all 120 migration names/checksums against the frozen candidate. The original fixture database and earlier receipts remain unchanged. The clone contains synthetic scenario data; only its selected empty opening client receives browser writes and fresh credentials.

The fixture is a bounded CM/XAF empty-client opening, with separate source and independent control files, existing account/customer/supplier/item/location mappings and three independent identities. It is not evidence of country qualification, a nonempty-client conversion, another currency or whole-cutover undo.

## Executed browser and database observations

1. Real preparer uploads separate source/control files, maps existing client records and stages a new revision.
2. Reviewer completes password step-up and explicitly retries the saved command.
3. Independent review is persisted against the exact manifest; preview review remains separate from financial authorization.
4. Client operator completes real password step-up and explicitly retries the separate financial approval.
5. Financial approval persists without effects; keyboard confirmation enables apply. Approval/apply form axe scans have no violations.
6. Real protected apply fails after stock; all financial effects roll back and UI retains the exact retry command.
7. Lost response after real commit is recovered from ACTIVE receipt; exact retry does not duplicate financial effects.
8. EN/FR desktop/mobile retained results: four axe scans without violations and no panel overflow.
9. Named firm reviewer can inspect committed recovery evidence but has no client financial actions.
10. Current module denial clears retained financial details.

The browser completed 10 recorded workflow assertions. Secure HttpOnly session cookies were checked for preparer, reviewer, owner after real credential sign-in. There were 6 scoped axe scans and 0 recorded page errors. Screenshots cover the approval form, approved state, rollback/retry state, active EN/FR desktop/mobile states and current-access denial. All eight screenshots were visually inspected: labels and focus are visible, mobile text wraps, and no overlap was observed in the captured panels. The module-denial assertion and screenshot concern the controlled-cutover panel; the separate preview remains visible. See [visual review](2026-10-26-run-03/browser-visual-review.json). Automated checks and screenshot inspection remain separate evidence classes.

Financial approval alone left all observed balances and writer counts unchanged. The injected database failure after stock handling rolled back the attempted financial effects and retained APPROVED. The next real apply committed while its response was deliberately lost; recovery read ACTIVE and replay of the original command did not duplicate effects. Final selected-client counts were 1 journal entry, 1 stock transaction, 1 inventory level, 1 customer ledger entry and 1 supplier ledger entry; customer balance 100 and supplier balance 50. These assertions exercise actual protected actions and PostgreSQL in the browser lane, not mocked service results.

The retained reconciliation payload is in browser-verification.json. No new unit suite, full lint/type/build, migration replay, dependency installation or export check ran in this continuation. Those evidence classes retain their prior dates and scopes. Opening screenshots and reconciliation receipts are not new AF08/AF12 export proof.

## Local HTTPS and authority boundary

The server ran in production mode from the sealed runtime, bound to a temporary 127.0.0.1 port. A task-owned HTTPS proxy listened only on 127.0.0.1:3186 and forwarded requests to that local process. Requests used https://localhost:3186 because Next canonicalizes loopback addresses to localhost. DNS was checked for loopback-only resolution; browser resolution was pinned to 127.0.0.1. Host and forwarded protocol were preserved for the server-action origin checks.

Fresh synthetic secrets and database configuration were supplied through an explicit environment allowlist. No application environment files were loaded; live statement/invitation delivery remained disabled. The certificate was self-signed for localhost and 127.0.0.1; only the isolated browser contexts ignored its trust error. No operating-system trust setting was changed. This proves local secure-cookie/action behavior for the exercised flow, not hosted TLS, certificate trust, every bundled public URL or production secret readiness. The build's bundled public origin remains unchanged.

Both the TLS proxy and application child process were stopped after verification. The original fixture still has zero opening executions and zero journal entries for the selected client. With no other database clients connected, the owned PostgreSQL cluster was stopped cleanly. The synthetic clone, private certificate/credentials, runtime copy and sealed artifact are retained; cleanup.json records these outcomes. Private credentials, session tokens and server logs are outside the published report folder.

## Selected-scope browser coverage map

| Scope | Existing evidence | Remaining gap |
|---|---|---|
| AF01–AF02 portfolio | 25 October evidence-desk journey includes portfolio navigation; earlier phase run covers 105-client traversal | Full sealed-build portfolio traversal/search/fresh-authority matrix |
| AF03–AF05 engagements | 25 October real service cases; earlier phase browser setup/lifecycle evidence | Sealed-build enrollment, consent, assignment, suspension and handover journeys |
| AF06–AF08 evidence and workpapers | 25 October three-role evidence journey, retained workpaper/advisory exports and independent artifact inspection | Sealed-build evidence/provider/account-coverage/workpaper/export surface coverage |
| AF09–AF10 opening | This run: sealed staging, review, financial approval, transaction failure, lost response, exact retry, module denial and EN/FR responsive states | Broader source/period/tenant denial matrices and agreed performance budgets; no whole-cutover undo claim |
| AF11 obligations | 25 October real PostgreSQL cases and earlier phase browser evidence | Sealed-build operational obligation journey; qualified country evidence stays external |
| AF12–AF13 advisory and economics | 25 October reviewed shared-client browser, step-up, confidentiality and export evidence | Sealed-build replay of selected advisory/workload journeys |

Historical phase passes were not relabelled as current sealed-build passes. This is a coverage inventory, not a whole-product accessibility certification. The earlier 26–35 second public cold-response observations remain open; this functional workflow does not establish a latency budget.

## Predecessor rollback assessment

The bounded inventory of retained .codex-tmp/af* accounting-firm candidates found the current AF16 sealed artifact and its current build output. Earlier AF browser directories have neither an artifact manifest nor a .next/BUILD_ID. No retained sealed predecessor was identified within that scope. Unrelated projects' build directories were not assumed to be authorized predecessors. Therefore previous-application compatibility/rollback was not executed. Database upgrade checks, opening transaction rollback and stopping the current server cannot substitute for it.

## Verification, reports and next step

The workflow contract passed with 196 unclassified package scripts; no reviewed hashes were changed. New harness behavior was inspected for target, process, fixture, TLS and mutation boundaries. Initial attempts verified the artifact/copy but received EACCES and then ECONNREFUSED when connecting to the owned local database, before cloning or browser activity. Both failed prechecks are retained in blocked-local-connection.json and blocked-local-connection-2.json. The initially restricted database process did not remain available; a host-context restart required PostgreSQL recovery and exceeded pg_ctl's initial readiness wait. The browser runner proceeded only after database readiness, retaining the exact data-directory guard and rechecking the artifact. See [run summary](2026-10-26-run-03/sealed-opening-summary.json), [browser assertions](2026-10-26-run-03/browser-verification.json), [browser log](2026-10-26-run-03/browser.log), [predecessor inventory](2026-10-26-run-03/predecessor-inventory.json) and the separate publication/visual review receipts.

Keep production NO_GO and pilot PILOT_PREPARED. Next, reuse this verified artifact to exercise the missing AF03–AF05 engagement lifecycle in a fresh synthetic clone, followed by the AF11 operational register. Preserve the local TLS/current-authority controls, retain all failures and avoid rebuilding the frozen candidate. Identify an explicit compatible predecessor before any previous-application rollback rehearsal. Fresh-install lifecycle/clean-build qualification, performance budgets, hosted operations and qualified country evidence remain separate open gates. AF14/AF15 remain excluded.

Ready-to-use next prompt:

> Continue AF16 with sealed-build firm engagement browser verification. Reuse build eoW9-NZPj4rd9OHTZxMDM and artifact digest 987da3ead9c716cdbf5d2a22ac1723aa8a8ed15113f40a6b8abd3c1fb64d151f, verifying exact bytes before use. Reuse AF05 enrollment/consent, assignment, suspension, handover and restrictive recovery fixtures and protected workflows on a new owned synthetic database clone. Use the proven local HTTPS setup and fresh independent identities; check current authorization, denied/revoked states and EN/FR desktop/mobile behavior. Preserve prior receipts and do not rebuild the candidate. Update the coverage map, roadmap and Markdown/PDF reports with actual outcomes. Keep live activity, deployment, AF14/AF15 and country qualification deferred; do not claim predecessor rollback without an identified compatible predecessor artifact.
