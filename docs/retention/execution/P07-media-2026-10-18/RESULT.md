# P07 continuation — item import/media compatibility

18 October 2026. **PASS — bounded P07 implementation and complete synthetic import journey.** This continuation resolves the item-import/media contract identified in [the original P07 report](../P07/RESULT.md), preserving tenant-owned media controls. All four P07 acceptance criteria now have current local evidence. Provider upload success, live cutover and production readiness remain separate, unproved claims. No later prompt was executed.

## Scope, baseline and prerequisites

Baseline HEAD `6ee84a90c760d2864f6aef672d8b393ac2b65971`; [baseline](evidence/BASELINE.json) records 99 selected source/artifact hashes and inherited tracked changes. Those changes include public workflow/landing work and `opening-readiness.postgres.test.ts`; this execution does not own them. Concurrent changes were observed in landing files and left intact; [final validation](evidence/VALIDATION.json) records the exact unowned drift. The item/media domain and authorization files remain unchanged. No commit, staging, reset, dependency installation or graph regeneration was requested or performed.

P03's synthetic source contract and P04's local access foundation remain the prerequisites. [Current revalidation](evidence/SOURCE_REVIEW.json) compares the selected predecessor artifacts and fixture files against the previous P07 baseline. Their live cutover, accountant/D05, access-pilot and restore gates remain open; local completion does not clear them.

Existing graph discovery: `item_item_service_createitem`, community 35; `inventory_inventory_stock_event_service_postopeningstock`, community 9; `forminputs_enhancedimageuploadbutton_enhancedimageuploadbutton`, component community 177. These August 9 graphs predate the current media implementation. Current importer, item/media owner, upload route and authorization source were inspected; no graph node is presented as proof of today's media behavior.

Skills/guidance: ECC security-review and verification-loop, adapted to the repository's command and environment boundaries; project UI/UX Pro Max focus, keyboard and recovery rows 28/41/80. Design master, constitution, registry, inventory page contract, current upload component and semantic tokens were inspected. There is no dedicated onboarding page contract. No global palette or shared upload behavior was changed.

## Implementation and decision

The CSV adapter now supports one managed tenant-owned image reference per item. Version-2 item templates require `imageUrls`; staged availability checks reject foreign, missing, deleted, uploading and wrong-entity assets without revealing their ownership. The existing domain transaction still claims the image at commit, so approval cannot bypass a later deletion or cleanup claim.

An EN/FR workbench helper reuses the existing authenticated uploader and preserves each completed reference for CSV preparation. A corrected source requires fresh validation and approval. Existing mappings, failed batches and approvals are retained. Item retry recovery also requires the existing image to match the staged reference, preventing a same-name/key item with different media from being adopted.

The item/media write services, media authorization, upload route, schemas and provider policy are unchanged. No new opening-stock, AR/AP or ledger write was added. **No Prisma schema change.** The automatic new ITEM mapping version is persisted using the existing mapping model and unique version control, tested against the disposable database.

See [compatibility and recovery](COMPATIBILITY_AND_RECOVERY.md) for old mappings/batches, reference collection, partial progress, approval and rollback rules.

## Exact ownership

Changed existing production files:

- `services/onboarding/master-data-csv.ts`
- `services/onboarding/master-data-import.service.ts`
- `components/onboarding/MasterDataOnboardingWorkbench.tsx`

New production file: `components/onboarding/ItemImportImages.tsx`.

Updated existing tests: `services/onboarding/__tests__/master-data-csv.test.ts`, `master-data-import-guards.test.ts`. New tests: `services/onboarding/__tests__/item-import-media.test.ts`, `item-import-media.postgres.test.ts`; `components/onboarding/__tests__/ItemImportImages.test.tsx`, `ItemImportImages.upload.test.tsx`.

Artifacts: this dated directory, dated continuation links on P07's report/blocker/setup journey, and only P07's row in `../STATUS.md`. Prior results remain historical evidence. Before files, patches and final source hashes are saved with the evidence.

## Acceptance and verification

| Acceptance | Result / evidence |
|---|---|
| Complete customer/supplier/item import through actual application | **PASS — bounded synthetic journey.** One customer, one supplier and two items imported through actual authentication/actions. [Browser result](evidence/browser-1792340911022.json). The image fixtures represent pre-existing ready assets; external provider success remains untested. |
| Tenant-owned ready media remains required | **PASS.** Pure/mocked validation and real PostgreSQL denial, approval-time change and claim checks passed. Actual browser foreign-image validation was blocked with no master writes. Item/media owner files are unchanged. |
| Source identity, independent approval and original-batch replay preserved | **PASS.** Real source/mapping/approval, interrupted checkpoint and retry cases passed. Browser self-approval attempts for supplier/item were rejected; separate checker completed them. Same-file replay retained the original batch and four result IDs. |
| Masters do not complete opening positions | **PASS.** [Independent snapshot](evidence/LINEAGE_AND_NO_OPENING_WRITES.json) confirms source row hashes, four result IDs, two owned attached images, zero customer/supplier opening balances, inventory levels/movements, journals and ledger postings. The view still marks opening positions unverified/unsupported. |
| EN/FR loading, empty, failed-read and recovery usable | **PASS — tested paths.** Empty/import/replay and mobile checks passed. Six final state checks cover both locales' loading, failed-read/keyboard retry and honest upload failure/retry. [State result](evidence/browser-states-1792341446824.json). |

| Class | Executed evidence | Limits |
|---|---|---|
| S — source | Workflow, prompt contracts, predecessors, graphs, CSV/mapping/risk/approval/domain authority, media upload/claim/cleanup, UI and diff review. | Bounded source review; no platform-wide audit. |
| V1 — workflow | `npm run agent:workflow:check`: exit 0, 196 unclassified package scripts. [Recorded output](evidence/WORKFLOW_CHECK.json). Definition, imports, registry and absent npm pre/post hooks inspected first. | Contract check executes no app/database command. |
| M — mocked/pure/component | `node docs/retention/execution/P07-media-2026-10-18/evidence/run-unit.cjs`: **107 passed, 12 suites, zero failed/skipped**, exit 0. [Final results](evidence/unit-1792340632787.results.json). | Includes existing import guards, P03 fixture contract, scoped auth, media service/upload route, readiness and actual uploader component with mocked network. No provider proof; initial 105-check run overlaps. |
| D — PostgreSQL | `node docs/retention/execution/P07-media-2026-10-18/evidence/run-db.cjs`: **12 passed, one suite, zero failed/skipped**, exit 0, 86.32 s. [Final result](evidence/database-1792341206330.results.json). Initial 11-case run overlaps. | Actual Prisma/domain/import/media transactions, no shared Jest mocks. Includes media-claim rollback on insert failure, interrupted checkpoint, partial progress, original-batch retry, conflict-image rejection and cleanup contention. Synthetic pre-existing media records, no provider objects. |
| B — full application | `node docs/retention/execution/P07-media-2026-10-18/evidence/browser.cjs`: **PASS**, exit 0. [Final result](evidence/browser-1792340911022.json). Customer/supplier/item imports, same-file replay, foreign-image rejection, wrong-tenant and denied-role checks, separate checker, French mobile reflow and keyboard navigation. | Actual Next/Better Auth/actions and PostgreSQL. Existing media boundary seeded explicitly; not an upload success simulation. Unconfigured real upload returned 503, showed retry and created no ready asset. Initial selector failure retained in [attempts](evidence/ATTEMPTS.md). |
| B — states | `node docs/retention/execution/P07-media-2026-10-18/evidence/browser-states.cjs`: **PASS, six checks**, exit 0; [result](evidence/browser-states-1792341446824.json), `injectionRestored: true`. [French guidance](evidence/GUIDANCE_fr.png) and [French upload failure](evidence/MEDIA_ERROR_fr.png) inspected visually. | Disposable-only lock/rename failure injection with restoration; EN/FR mobile helper failure and keyboard recovery. The development error badge comes from intentional fault injection. Browser-native file labels use the browser's locale. No assistive-technology certification. |
| D — independent effects/lineage | `node docs/retention/execution/P07-media-2026-10-18/evidence/lineage-check.cjs`: **PASS**, exit 0. [Snapshot](evidence/LINEAGE_AND_NO_OPENING_WRITES.json). | Browser fixture source IDs, image bindings, approvals, replay, zero opening balances/stock/ledger effects and trigger cleanup. |
| P — provider/authority | NOT_RUN. Actual unconfigured upload failure is observed; successful upload/encryption/decryption uses mocks in the unit lane. | No external provider contact, production upload/read, durability or deployment claim. |
| C — customer outcomes | NOT_RUN. | No customer contact, satisfaction, activation or retention measurement. |
| E — qualified expert | NOT_RUN. | No accounting, country, compliance, accessibility or release certification. |
| O — restore/load | NOT_RUN. | No backup restore, RPO/RTO or load proof. Owned process cleanup recorded separately. |

## Environment and command review

PostgreSQL 17: new loopback-only cluster `.codex-tmp/retention-p07-media-1574a9f2e0`, database `stoquify_retention_p07_20261018_1574a9f2e0`, port 55795, `public` schema; [target](evidence/DATABASE_TARGET.json), [schema provenance](evidence/SCHEMA_PROVENANCE.json). The runner generates datamodel-to-empty SQL and applies it only to the newly created database. This is not migration-history/custom-trigger certification and not a clone of customer data.

Next 15.5.27 at `http://127.0.0.1:3188`, fresh `.next-retention-p07-media-session-wPjCuF` output and isolated tsconfig; [application target](evidence/APPLICATION_TARGET.json). Environment allowlists and empty ambient dotenv keys prevent application/provider credentials being inherited. Browser external origins are blocked. Chromium 149.0.7827.55; EN desktop 1440×1000, FR/mobile states 390×844. Synthetic maker, independent checker, foreign tenant and denied-role actors are recorded in [fixture](evidence/BROWSER_FIXTURE.json); older attempts remain retained.

Setup commands: `node docs/retention/execution/P07-media-2026-10-18/evidence/database.cjs create`, `.../fixture.cjs` (subsequent `--new` preserves previous records), `.../application.cjs`. Custom runners/configs and their imports were inspected before execution. Unit runner uses `nextJest()` without an app directory; DB runner uses SWC and a server-only shim without Prisma mocks. The app uses the inspected safe dev-session helper, not npm predev or a schema promotion wrapper.

No full build, global typecheck, broad lint/test suite, production data query, package migration wrapper, dependency update or later prompt was run. SWC and development rendering are not full TypeScript or release validation.

## Recovery, remaining limits and handoff

Preserve all original batches and approvals. Image-free legacy sources need a corrected version-2 file and new review; they are not rewritten. For partial imports, preserve committed rows and retry only unchanged original references, or prepare a reviewed correction containing the remaining rows. Do not resurrect deleted assets or bypass image ownership to force completion.

Rollback uses only owned before files/patches; retain new source/mapping/media evidence. Provider configuration, image storage availability and durable upload/read testing remain operational prerequisites. Live cutover, accountant mapping and other predecessor gates remain separate. No product analytics or measured retention outcome was added.

The owned Next session was interrupted after verification (intentional process exit 1). `node docs/retention/execution/P07-media-2026-10-18/evidence/database.cjs stop` stopped the owned cluster. `.../cleanup-check.cjs` returned **PASS**, exit 0: ports 3188 and 55795 both returned `ECONNREFUSED`; [cleanup](evidence/CLEANUP.json). Synthetic files/records remain retained. No unrelated process or database was stopped.

**Handoff:** the P07 item-import blocker is closed for the tested managed-media path. P08 and later work may use this evidence only when separately requested; no downstream prompt or live gate is marked complete. Before a live pilot, verify actual provider configuration/upload/read and the existing cutover/authority prerequisites. No further local P07 code change is required by the tested acceptance criteria.

Review lenses applied: architecture/domain ownership, tenant/IAM/privacy, source integrity and recovery, UI/localization/keyboard behavior, onboarding usability, QA and operational containment. Finance controls are protected by keeping all opening-position writes outside the importer. Country calculations, payroll, POS/offline, payments, AI and billing changes are not applicable to this compatibility fix.
