# Item creation and online pictures

Date: 2026-09-19. Workspace: `E:\ohada saas\Focused projects\stoquify`.

## Result

The upload now uses an independent JSON endpoint with actual request cancellation. Follow-up verification passed 28 focused tests and a focused TypeScript check. Real 1.3 MB uploads completed on desktop and mobile, and the mobile creation/reload/image-display journey passed. The unresponsive configured localhost development server was subsequently restarted and its updated upload route responds correctly. Cold-start delays and a desktop navigation timeout occurred in the isolated browser checks; the complete browser suite is not green. This is local implementation and verification, not a production deployment or certification.

## Findings and corrections

### Follow-up: upload completion timeout

The user reported that the upload still timed out after the initial implementation. A read-only check of the configured development database found three recent, unattached uploads already marked `ready`: two 1,266,422-byte pictures completed in approximately 25 and 18 seconds, and a 91,309-byte picture completed in approximately 6 seconds. This distinguishes provider completion from the missing completion state in the browser. The exact failing user-browser request was not captured because the browser connection was unavailable.

The shared control now uploads through `POST /api/media/upload`, receiving a small JSON response independently of Next.js page server actions and their rendering/queue behavior. The client uses AbortController for cancellation, timeout, and unmount. The endpoint preserves the shared inventory authorization/tenant/entitlement checks, verifies same-origin requests, accepts exactly one file, and bounds multipart input even without Content-Length. Encryption, stable references, saved-image access, and the item transaction are unchanged. No additional schema migration is needed. The original user pictures were not deleted.

The final focused follow-up checks passed: 4 suites / 28 tests (`upload-timeout-tests-final.log`). These include rejection of missing/cross-site/spoofed origins and acceptance of the configured browser origin when Next.js constructs an internal request URL. The browser regression now uses a valid PNG over 1 MB on both viewports, checks the direct JSON response, creates using the keyboard, and checks the displayed saved image's natural width. The upload timeout remains 90 seconds; the overall test permits 420 seconds for cold page compilation and the rest of the journey.

Local runtime observations: an unauthenticated upload request on localhost:3000 exceeded 25 seconds and a warmed retry exceeded 20 seconds; an existing media-read route also exceeded 12 seconds without a session. The first follow-up browser run timed out during test-server startup. The second reached the wizard but cold compilation of the upload route took 129.3 seconds (4,025 modules), exceeding the upload timeout. Its warm mobile request exposed a 403 from comparing Origin with Next.js's internal request URL. Both runs cleaned their own fixture data. Multiple development processes were active and available physical memory was about 1.2 GB at inspection. These observations do not establish a provider outage.

The origin check now uses configured application origins through the existing trusted-origin helper, retaining cross-site rejection and never trusting forwarded host headers. The test environment sets its application URL explicitly. The UploadThing SDK is loaded natively using `serverExternalPackages`, avoiding bundling its large server Effect graph into each route. Native `uploadthing/server` and `uploadthing/next` loading was checked. This uses the [documented Next.js server dependency mechanism](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages). Tests ran sequentially to limit memory pressure; unrelated development servers were preserved.

Focused TypeScript checking of the endpoint, shared authorization, uploader, and imported dependencies passed with exit 0 (`upload-timeout-typecheck-focused.log`, no diagnostics). The full-workspace type check started during this follow-up was deliberately stopped to relieve memory pressure; its empty partial log is not a passing result. The previous full-workspace pass belongs to the initial implementation.

The revised cold browser run (`upload-timeout-browser-final.log`) still failed under local resource pressure: desktop exceeded the upload deadline before the server began the provider operation. On the warmed mobile run, the real 1,313,641-byte image uploaded and enabled Create in 11,718 ms, returned JSON 200, and decrypted byte-for-byte correctly. The Create action returned HTTP 200 in about 4.3 seconds, but the subsequent item-list navigation did not finish within 90 seconds. The trace shows the list request pending and the form in its creating state, so this is not a full end-to-end pass. Fixture setup and cleanup passed. An additional explicitly warmed functional run is recorded separately, without replacing these cold failures; the default browser test remains cold and retains the 90-second upload deadline.

The explicitly warmed run (`upload-timeout-browser-warm.log`) finished with **3 passed / 1 failed**. Desktop English uploaded 1,313,641 bytes and enabled Create in 24,597 ms; mobile French did so in 6,747 ms. Mobile then passed the complete creation, reload, visible saved image (natural width 640), byte-for-byte retrieval, and unauthenticated HTTP 401 checks. Desktop again exceeded the 90-second navigation deadline after upload succeeded. Fixture setup and provider/database cleanup passed with zero fixture residue. Route preparation took 172 seconds for the item list, 118 seconds for creation, 10 seconds for the upload endpoint, and 26 seconds for the read endpoint. This confirms working upload completion but does not certify reliable cold development startup or every desktop navigation. Follow-up screenshots are under `browser/upload-timeout/`; `saved-390.png` is the successful new end-to-end result. No successful desktop follow-up screenshot is claimed.

Reproduce the normal cold browser check with `node scripts/item-media-test-database.cjs --browser --media-only`. For the separate warmed diagnostic, set `PLAYWRIGHT_WARM_MEDIA_ROUTES=1` before running the same command. Warming is test-only, explicitly logged, and does not lengthen the client upload deadline. Unrelated development processes and original user uploads were preserved; this task's test server was stopped by Playwright teardown.

### Configured local app recovery

The configured application origin is `http://localhost:3000`. After testing, its upload route still timed out at 45 seconds and again at 20 seconds. The listening process and parent were verified as this workspace's `next dev -p 3000` before restarting only that server with the same command, in a hidden window. It became ready in 10.5 seconds. The updated upload route then compiled in 9.8 seconds with 937 modules, compared with the earlier 4,025-module route. A GET returned the expected 405, and a POST without a session returned 401 `AUTH_REQUIRED` in 259 ms. Neither probe sent a picture or changed business rows. Evidence: `upload-timeout-local-smoke.log`, `local-server.out.log`, and `local-server.err.log`.

The replacement local development server remains running for the user. An already-open creation page should be hard-refreshed to load the revised uploader. The exact previously failing authenticated browser session was unavailable, and the complete browser suite was not rerun against the user's database. Production was not deployed. First-load performance under heavy concurrent development work and the recorded desktop navigation timeout remain explicit limits; they must not be presented as passing release checks.

### Initial implementation

1. `actions/storage/storage-config-actions.ts` built a fresh local configuration on every read. Updates did not persist. The old uploader depended on that configuration and switched to online on a read failure. This combined settings authorization, local disk availability, and provider behavior into the item form. The configured local limit also differed from the displayed/online limit. New pictures now consistently use online storage; the UI and service enforce JPEG/PNG/GIF/WebP and 4 MB. Unsupported settings overrides return an error instead of pretending to persist.
2. `components/inventory/CreateItemWizard.tsx` used the full form resolver while validating individual steps. Each step now validates its own fields, including the inventory range and enabled opening-stock fields. Hidden opening stock is cleared when disabled. The complete schema still runs on explicit Create, and an uploaded image remains required. Earlier tests alone did not establish the reported navigation failure; the new real-uploader tests establish the corrected behavior, including an invalid stock range and recovery.
3. The live UploadThing account rejected private uploads because its current tier does not support private files. The application now encrypts each picture with AES-256-GCM before uploading the ciphertext. The random key, IV, authentication tag, owner, content hash, MIME type, size, and provider identity stay in the database. Tenant and asset IDs are authenticated as encryption context. `/api/media/<id>` verifies the current session, permissions, module access, and tenant before fetching and decrypting. Stored references never contain credentials or expiring URLs. Tampered ciphertext is rejected.
4. Real browser testing confirmed that an item could commit while navigation remained on the creation screen. The trace showed a redirect from the unlocalized item-list URL during client navigation. The action now returns and revalidates the destination for the current language. The immediate refresh following navigation was also removed.
5. The older `ItemManagement` form discarded the uploaded reference with `imageUrls: itemImageUrl ? "" : ""`. It now saves the actual reference, starts without a placeholder, and blocks submission during upload. Missing images are also rejected in both service creation paths.

Graph discovery used `inventory_createitemwizard_tsx` (community 23) and `forminputs_enhancedimageuploadbutton_tsx` (community 177); implementation decisions were checked against current source. Existing unrelated edits in the dirty workspace were preserved.

## Picture workflow coverage

| Caller / entity | Write path and authorization | Storage and display |
| --- | --- | --- |
| `CreateItemWizard` / item | `POST /api/media/upload`; current tenant, inventory create or update permission, enforced inventory entitlement | Encrypted UploadThing object; authenticated `/api/media/<id>`; explicit final attachment |
| `ModernItemFormForEditing` / item | Same upload endpoint; item edit service checks every new reference in its transaction | Same media route; previous saved image retained until replacement commits |
| `ItemForm2` in `ItemManagement` / item | Same upload endpoint and service ownership checks | Same media route; legacy reference-discard bug corrected |
| `ImageUploadButton` compatibility export | Re-exports the managed uploader; no active callers found | Same policy; no separate direct provider path |
| Legacy `/api/uploadthing` item endpoint | Existing authentication helper retained; direct uploads reject with guidance to use the managed uploader | Cannot bypass ownership metadata with an untracked provider URL |
| Category `imageUrl`, brand `logoUrl`, user `image` | Existing URL/reference fields; no binary picture-upload caller found | Existing reads retained. No inventory permission imposed on these unrelated entities |
| POS item pictures | Current session plus item permission or POS permission and relevant module access | Browser fetch of the authenticated item media route |

Financial evidence/document file pickers are not picture-upload workflows and were left unchanged. Future entity upload controls must use their own authorization and asset type; they must not be added to the inventory endpoint by default.

## Lifecycle and operating behavior

- Selection comes from the user's device; permanent new picture bytes are online. There is no silent local-storage fallback. Upload failures retain entered item data and offer retry/cancel. The control aborts the browser request on cancellation, unmount, or a 90-second timeout and ignores late completions. A provider operation already accepted by the server may finish afterward; its metadata remains eligible for the existing safe cleanup process.
- Metadata is created before the provider call. A lost response leaves an identifiable cleanup candidate addressed by provider custom ID.
- Attachment locks the owned ready asset within the item write transaction. A foreign, deleted, unready, or arbitrary new URL cannot be attached. Only unchanged legacy references already on the saved item are accepted.
- Immediate deletion permits only the uploading user, matching tenant, and an unattached asset. Saved pictures survive form cancellation and failed replacement. Delayed cleanup also checks current references, including archived items.
- `scripts/cleanup-item-pictures.cjs --org=<organization-id>` is a read-only dry run. Add `--apply` after reviewing its output to delete at most 100 unreferenced managed pictures older than 48 hours. Tombstones make retries possible. The script is supplied, not scheduled automatically.
- Required provider configuration is the existing server-side `UPLOADTHING_TOKEN`. No subscription change or additional provider was introduced. `next.config.mjs` allows a 5 MB server-action request for a 4 MB picture plus multipart overhead.
- Online storage avoids dependence on a particular application instance's disk. It requires connectivity for new uploads. Existing offline POS behavior was not changed; no new offline media queue was introduced.
- Reads pass through the application and require provider availability; this adds server bandwidth and provider fetch latency. Size limits, bounded reads, timeouts, tenant access checks, and existing request throttling remain in place. Capacity/price forecasting and a restore drill were not performed.
- Database backups must include picture metadata and encryption keys. Losing those keys makes the encrypted pictures unreadable. Provider object retention and database recovery must be operated together. No production retention settings were changed.

## Existing pictures and migration

`scripts/audit-picture-storage.cjs` inventories `/uploads/` references without modifying files or database records. The inspected local database contained zero such references in items, categories, brands, and users. Existing remote and local read compatibility is retained; no historical picture migration or deletion is claimed.

The additive migration is `prisma/migrations/20260919110000_managed_picture_assets/migration.sql`. It was applied to the configured local development database and recorded with its checksum in Prisma migration history. No business rows changed and no legacy files were deleted (`local-migration.json`). Apply it before serving this code in another environment. Production deployment should use the repository's normal reviewed migration process; no production migration was executed. A local schema-only test database was used for browser verification, with no business rows copied.

For another environment with local references, rerun the audit first. Do not remove files or rewrite references based on this workspace's zero count. That environment needs a tenant-scoped, verified migration before retiring its legacy reads.

Rollback: disable new uploads or roll back the UI/write changes while retaining the media service, database table, and read route for already-created references. Do not drop metadata, keys, or provider objects. A full rollback to code without `/api/media` requires exporting/decrypting pictures and mapping saved references first. Existing legacy files were not removed.

Prisma client generation initially encountered a Windows DLL lock held by another running development task. Generation succeeded in an isolated folder; generated code was installed while retaining the byte-identical existing engine (SHA-256 equality checked). Other development servers were not stopped.

## Initial implementation verification

Evidence files in this directory include command logs and browser screenshots. Across the focused suites, 69 distinct tests passed; the final changed suites were rerun after their corrections.

| Check | Result |
| --- | --- |
| Focused original + new uploader/service tests | 11 suites, 61 tests passed (`tests-final.log`) |
| Media API authorization + creation entitlement tests | 2 suites, 6 tests passed (`tests-route.log`) |
| Additional timeout/save-retry checks and affected route/service reruns | 3 suites, 17 tests passed (`tests-recovery.log`; includes 2 newly added cases and previously counted cases) |
| Prisma schema validation | Passed (`prisma-validate.log`) |
| TypeScript | Passed, exit 0 (`typecheck-final.log`) |
| Real-provider browser journey | 4 passed: fixture setup, English desktop, French mobile, and cleanup (`browser-final.log`) |
| Safe application build | Incomplete: timed out after the configured 300 seconds during optimized compilation; no successful production build claimed (`build.log`) |
| Service boundary gate | Passed (`service-boundary.log`) |
| Inventory boundary gate | Failed with 19 pre-existing violations in unrelated workflow scripts/fixtures (`inventory-boundary.log`) |
| Original broad browser release suite | Failed its existing color-contrast check; subsequent serial tests skipped. This is not an accessibility certification |

The browser test selects an actual PNG, uses the real server action and real provider, verifies byte-for-byte decrypted retrieval, explicitly creates the item, reloads its list entry and image, and checks HTTP 401 from an explicitly empty session. It covers English desktop (1440 px) and French mobile (390 px). Screenshots: `browser/media-1440.png`, `browser/saved-1440.png`, `browser/media-390.png`, and `browser/saved-390.png`. Cleanup passed with zero fixture tenants/users/items; fixture picture deletion was confirmed by the provider before metadata removal. New media controls and final action are translated; pre-existing English text elsewhere in the French wizard remains outside this narrow copy change. Unit coverage verifies that unrelated Enter submission cannot create an item; a comprehensive keyboard/accessibility audit was not completed.

Build output used `.next-item-media-build`, test output used `.next-item-media-test`, and other running development tasks were preserved. The production build still needs a complete run with sufficient time/resources before release. Its timeout is separate from the successful runtime route compilation, type check, and browser evidence.

Earlier failed checks were diagnostic: private provider uploads failed on the account tier; a desktop run saved successfully but timed out during unlocalized navigation; an anonymous test initially inherited Playwright's configured session. These were corrected before the final verification run. The fixture cleanup now removes only its own online custom IDs before deleting metadata/tenants.

## Review scope

Architecture/integration: single durable provider path with stable application references. Database: additive metadata, transactional attachment, preserved legacy reads. Security/privacy: fresh tenant scope, permission and entitlement checks, ciphertext at provider, integrity verification. Frontend/product: reachable Media, required image, explicit confirmation, recoverable errors. Quality: real uploader integration plus live-provider browser verification. Operations: timeout limits, cleanup dry run, rollback and backup requirements. Inventory/offline: existing opening-stock transaction and offline semantics retained. Records: no destructive legacy cleanup. Modularity: inventory writes enforced; POS read access considered.

Accounting, tax/OHADA statutory rules, payroll, payment reconciliation, billing/package changes, analytics, and AI governance are not applicable because this change does not alter those workflows. No security, accessibility, legal, accounting, or production-release certification is asserted.

### Live check of the user-supplied URL (19 September)

Opened `http://localhost:3000/en/dashboard/inventory/items/create` in the existing signed-in Edge session using a separate test tab. Entered the synthetic name `MEDIA VERIFICATION 20260919 1704` and SKU `MEDIA-CHECK-20260919-1704`, left opening stock disabled, and made the draft inactive. The wizard reached step 5 of 5 normally and displayed the online image chooser. Create remained disabled as expected before an image was selected.

Generated a synthetic 640 x 512 PNG (1,313,641 bytes) at `.codex-tmp/item-media-live-probe.png`. Edge's extension rejected `fileChooser.setFiles` with `Not allowed`; no upload was initiated and no item was submitted or created by this live check. This restriction is separate from the application's upload timeout. The test tab was retained at Media for continuation after enabling the extension's Allow access to file URLs setting. The existing user-owned tab was unchanged.

This live check proves the final Media step is reachable in the user's exact local session. It does not prove live upload or final creation in that session; earlier isolated real-provider test results and desktop-navigation limitations above still apply.
