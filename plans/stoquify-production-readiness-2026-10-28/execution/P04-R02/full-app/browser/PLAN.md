# P04-R02 full-application browser and HTTP contract

Status: **prepared, not executed**. `node --check run-browser.cjs` passed; this is syntax inspection, not application or browser qualification. The parent must supply the frozen candidate/artifact identity, running isolated HTTPS application, and guarded disposable database controls before execution.

## Current consumers and guards

| Surface | Current source and behavior | Admission required |
|---|---|---|
| `/{locale}/login` | `EnhancedLoginForm`; labelled `#email` and `#password`; keyboard Enter submits real Better Auth credentials and preserves localized return URL | Verified active synthetic credential account; real server-issued session |
| `/{locale}/dashboard/inventory/items` | `ItemManagement` renders native `img` from stored `thumbnail`; locator is the exact synthetic legacy URL | Same organization, `inventory.items.read`, enforced inventory read module admission; image separately requires dashboard read admission |
| `/{locale}/dashboard/inventory/items/{id}/edit` | `ModernItemFormForEditing` renders `next/image` with `unoptimized`; stored `imageUrls` is preserved | Same organization, `inventory.items.update`, enforced inventory write admission; image separately requires dashboard read admission |
| `/{locale}/dashboard/inventory/items/{id}` | Current `ItemOverview` renders item identity and permitted stock; it has **no product photo** | `inventory.items.read`, organization-bound overview service and enforced inventory module admission; this is a route/identity test, not an image-rendering claim |
| `/uploads/{org}/sentinel.png` and `/api/uploads/{org}/sentinel.png` | Same repaired upload handler after early legacy routing | Fresh persisted session, current organization match, enforced dashboard module read and `dashboard.read` |

Legacy image admission does not derive item/location permissions from a database reference. This harness preserves that policy; it does not silently qualify a finer item/location boundary. UI permissions and image permissions are independently required. Test roles must not include wildcards that survive removal of `dashboard.read`.

`source-inspection.json` binds the inspected files. Dated graph nodes are discovery only: component `auth_enhancedloginform_tsx` (community 97), `dashboard_items_modernitemformforediting_tsx` (5), app `api_uploads_path_route_ts` (15), inventory list (9), and edit (112). Current source supersedes the 2026-08-09 graph. The previous P03 `run-final-browser.cjs` supplies the established localhost HTTPS proxy and Secure/HttpOnly Better Auth login pattern; its old candidate and results are not reused as current proof.

## Fixture and execution handoff

`run-browser.cjs` exports `runBrowserQualification(privateFixture, controls)`. It does not start an application, seed a database, read application environment files, import Prisma, or create deployment artifacts. The parent reads credentials from the ignored fixture JSON, passes them in memory, and owns application/database shutdown.

Required fixture fields:

- `runId`: new `p04r02-*` identifier, `candidateId`, `artifactSha256`, and `baseURL` exactly `https://localhost:3192`. Port 3193 is the parent's private HTTP upstream, never a browser origin.
- `users`: `ui`, `foreign`, `revocation`, `expiry`, `permissionChange`, `moduleChange`, `permissionDenied`, `moduleDenied`; each has `email`, `password`, and `organizationId`.
- `assets`: generated **synthetic only** assets for `p04-upload-a`, `p04-upload-b`, `p04-upload-disabled`, each named `sentinel.png` with `synthetic:true`, SHA-256, `byteLength`, `mimeType:image/png`, width, height, and both delivery URLs.
- `item`: ID, organization ID, localized names, `imageUrl` equal to the main synthetic legacy URL, and unlocalized edit path. `publicControlPath` identifies a separate synthetic public image that may be optimized.
- `controls.transition({kind,actorAlias})`: DB-worker-owned guarded state transitions for `revoke`, `expire`, `remove-permission`, `disable-module`, `restore-module`; returns a redacted receipt. No re-login follows a transition.
- `controls.snapshot(label)`: DB-worker-owned guarded snapshot with `businessSha256`, excluding separately reported expected session/security/module-access audit writes and declared fixture authority changes. A denied batch must leave this digest unchanged.

The original three `cmp_org_005` images are explicitly forbidden by organization and filename. They may be included only in the parent's separate byte-preservation inventory, never in browser requests. Manual request paths and local optimizer targets are decoded and checked before sending; native browser URL blocking also excludes literal original paths, and an unexpected target fails the run. **The parent HTTPS ingress must additionally refuse decoded original paths and nested local optimizer targets before forwarding**: literal CDP blocking and asynchronous observation alone are not preventive guards for every encoded path. Browser traffic uses a test-owned deny-only HTTP/CONNECT proxy at `127.0.0.1:3194`, bypassing the loopback application origin. It never forwards external traffic. Proxy binding must succeed before Chromium starts; shutdown verifies port release. External fonts/providers are blocked and recorded by hostname; no credentials, cookie values, request bodies, HAR or raw authentication responses are published. The harness uses no `context.route`, request interception or cache-disable commands, so normal browser HTTP caching remains enabled.

## Gates

1. Real EN and FR form login with labels and keyboard submission. Verify server-issued Secure/HttpOnly session cookies by metadata only. List and editor must decode the exact synthetic legacy image into expected natural dimensions without `_next/image`. Capture screenshots. Detail verifies localized item identity without claiming a photo.
2. Both delivery URLs and HEAD: anonymous 401; foreign tenant, missing permission and same-organization disabled module 403. Encoded namespace, slash, case and dot aliases must deny without image content.
3. Separate actor for each persisted transition. Warm successful exact-byte reads, retain original cookies in memory, change only one server authority condition, replay those exact cookies in a fresh context, and require denial for both GET and HEAD. Revocation/expiry expect 401; changed permission/module expect 403. Module changes are restored in `finally`.
4. A revoked actor returns through browser history after viewing the real list; a new fetch and image load using the browser's default cache must deny, and reload must render the login recovery form with no private image consumer. CDP records private image response cache provenance without disabling cache. Private assets must not be served from browser cache. Previously authorized pixels are not expected to disappear from memory. The test does not assert that a particular history navigation used bfcache and does not qualify a pre-repair image already held in an old browser profile.
5. Final authorized GET/HEAD and encoded legacy reads return exact hashes/MIME/length and private no-store policy. Private image optimizer requests deny on first and repeat requests, including encoded endpoint aliases; the public direct and optimized control remain 200. A repeat denied request is not proof of purging a preexisting shared CDN cache.
6. Parent reconciles source/artifact/runtime hashes, synthetic and preserved asset hashes, expected authority changes, security audit writes, business no-write snapshots, and owned-process cleanup. Failed/skipped checks remain failures; no production advancement from syntax checks alone.

## Evidence and recovery

Each run writes a fresh child of this directory: `progress.json`, `result.json`, and EN/FR list/editor/detail screenshots. Request evidence includes status, safe path, response hash, MIME, length and cache headers. Credentials and cookie values remain only in memory/private fixture files. The result must identify the tested candidate and artifact.

Browser contexts, Chromium and the deny-only proxy are closed in `finally` with per-resource deadlines; the parent exclusively stops its app/HTTPS-proxy/database processes and verifies their ports are released. A failed module transition/restore or cleanup remains a failing check, and the disposable environment is quarantined until its state is reconciled. Unreviewed runtime page exceptions and unexpected browser targets fail the result rather than disappearing behind successful HTTP rows. No application writes, item saves, uploads, flags, schema changes, production data changes or deployment are authorized by this browser module.
