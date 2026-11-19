# P04-R02 legacy upload inventory and compatibility review

Reviewed 2026-10-29. This reviewer owns only this directory. Application code, configuration, assets, environment and databases were not changed. No image contents were read or rendered. No application, provider, database, build or test command was executed by this reviewer.

The isolated inventory collector reads source text and filesystem metadata only. It imports the installed TypeScript parser, not application modules. It writes this directory only. Its invocation was `node plans/stoquify-production-readiness-2026-10-28/execution/P04-R02/inventory-review/collect-source-inventory.cjs`.

## Result

The current item photo producers use encrypted managed media and return `/api/media/{uuid}`. No current local upload writer was found within the scanned source roots. The dated action graph still contains `savePhotoLocally`, `deletePhotoLocally` and `ensureLocalStorageDirectories`; those functions are absent from their current source files. These graph nodes establish discovery history, not active behavior.

Legacy reads remain relevant: item update services explicitly retain existing nonmanaged image references, tests retain `/uploads/...`, and image components/POS use the stored URL directly. The legacy API requires a current same-organization session, dashboard module admission and `dashboard.read`, then reads `public/uploads/{org}/{filename}`. The direct public URL does not pass through that API guard.

Release preparation recursively copies the entire `public` directory into `runtime/public`. The Git-based candidate snapshot omits ignored untracked `public/uploads` files. Consequently, a source fingerprint and API-only tests cannot qualify private image admission. The exact runtime artifact file inventory and both URL routes are required.

This workspace contains three JPG files under one legacy organization directory, totaling **461,134 bytes**. No symlinks were observed. Only filename, size, modification time and file type metadata were inspected. The parent owns any isolated asset copy and hash evidence. This does not establish database references, asset ownership, production file prevalence or external cache state.

## Deliverables and review depth

- `source-reference-inventory.json`: 3,896 text source files and their hashes; 43 lexical legacy-upload references; 16 JSX image consumer candidates. Entries explicitly distinguish lexical/AST discovery from manual tracing.
- `legacy-asset-metadata.json`: three local files, one directory, no content reads.
- `dependency-source-evidence.json`: installed Next 15.5.27 source hashes and dated graph nodes. No dependency functions were executed.
- `compatibility-and-test-matrix.json`: eight manually reviewed traces, nine compatibility constraints, three bounded repair options and fifteen verification cases. All cases are **proposed/not run by this reviewer**.
- `collect-source-inventory.cjs`: reproducible bounded collector with no environment, application, database or network imports.

Scanned source roots include actions, app, components, lib, services, prisma, scripts, types, config, hooks, src, legacy dashboard and test/validation directories. Graph output, generated code, dependencies, migrations and build output are excluded from the broad scan. Selected graph and installed optimizer source are separately captured. The 16 JSX candidates are an inventory of direct `img`/`Image`/`AvatarImage` syntax, not proof that every dynamic renderer or dataflow is qualified.

## Compatibility requirements

Preserve the existing same-origin legacy URL and eligible bytes; do not rewrite database references or delete files as part of inventory. New item references are controlled by managed-media claims, while existing legacy references are intentionally retained. Categories, brands and users are also covered by the existing database audit script, but it loads environment and opens a database and was deliberately not run. Seed-generated assets use `/seed-images`, a separate path that should remain unaffected.

The legacy API admits exactly two path segments, a filename containing ASCII letters/digits/dot/underscore/hyphen but no `..`, and jpg/jpeg/png/gif/webp extensions. HTTP tests must exercise decoding, malformed/extra segments, case, query suffixes and encoded traversal through both URL forms. Checking only decoded route parameters does not establish Next routing behavior.

Most dynamic images use native `img`; the item editor's `next/image` explicitly uses `unoptimized`. Installed Next 15.5.27 builds an internal image request without forwarding the caller's headers/cookies. Protected optimized requests can therefore fail legitimate reads. Its image cache key lacks actor identity and optimized responses use public cache headers. Cold optimizer denial and cutover of previously public cache entries need separate evidence; this review did not reproduce a cache exploit or inspect existing cache contents.

The legacy policy is dashboard module plus `dashboard.read`; managed media uses inventory/POS permissions. A bounded repair should preserve and state the intended legacy policy. The path alone cannot prove item/location entitlement because no record association is resolved. Any broader policy change needs a separate reviewed decision and migration/data-mapping plan.

## Minimal safe direction

Prefer private legacy storage outside static roots, with both public-shaped legacy URLs and the existing API URL routed through one authenticated read boundary. Public artifact packaging must reject or exclude private uploads. Preserve URLs and content; prepare manifest-bound copying and recovery without moving/deleting production files automatically.

A rewrite to the existing API can be qualified as an interim Next-server boundary only when every serving path is covered. Leaving bytes in a directly served public directory does not resolve independently hosted static origins, old artifacts, optimizer caches or CDN copies. Migration to managed media is an explicit deferred option and must preserve ownership, byte integrity and reversible reference mapping.

## Evidence required for advancement

Use the parent's refreshed candidate identity and an explicitly isolated fixture manifest. For every admitted file, exercise anonymous and foreign-tenant denial through **both** `/uploads/{org}/{file}` and `/api/uploads/{org}/{file}`, checking response bytes, then prove eligible same-tenant reads return the exact expected hash, MIME, length and private cache policy. Record filesystem before/after hashes and any allowed security-audit events separately from forbidden business/asset writes.

Report real session refresh/revocation separately from injected auth contexts. Report HTTP routing separately from mocked route functions. Report browser rendering and cache/deployment/CDN qualification separately. The existing seven API tests mock authorization, filesystem and NextResponse; they do not qualify the original static URL or any deployment.

Do not advance the full production gate solely on this source inventory or a successful API-only mock lane. Preserve external cache invalidation, live reference inventory, location-policy decisions and production data movement as explicit unresolved/deferred work. Recovery must retain authenticated denial; re-exposing the old public directory is not an acceptable rollback.
