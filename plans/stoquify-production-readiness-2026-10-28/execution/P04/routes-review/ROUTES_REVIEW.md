# P04 route, page and capability boundary register

This is a current-source qualification register, not production admission. All 22 route-handler files (30 explicit HTTP-method exports), 190 pages and 21 layouts are inventoried in `route-page-guard-register.json`. The register distinguishes manually traced entry guards from syntax-derived candidates and unresolved downstream checks. The 2026-08-09 app graph was consulted for discovery; its 290-file/622-node snapshot is not current coverage evidence.

The working tree was already changed. The 275-file `source-manifest.json` records content hashes; no captured route/page/layout drift was found while preparing this packet. No application code, production flag, data, migration, deployment or Git state was changed by the route reviewer.

## Deliverables and evidence classes

| Artifact | Meaning |
|---|---|
| `route-page-guard-register.json` | Every route method/page/layout, inherited layouts, exact file hash, guard candidates, imports and unresolved boundary fields |
| `declared-route-surfaces.json` | 146 syntax-extracted page-surface objects, with permissions and optional module mode; declarations alone do not prove enforcement |
| `app-server-actions.json` | 13 server-action functions in app: 11 inline functions (including one redirect-only function) and two default page exports in file-level `use server` files |
| `existing-negative-test-inventory.json` | 25 existing relevant test files, case names and mocked/pure/database classification; test-source inventory is not a passing result |
| `source-manifest.json` | Current source provenance, including installed Next runtime source used for the static-path finding |
| `static-upload-component-http.cjs` | Bounded reproduction using synthetic data, current middleware and installed Next filesystem/static-serving components |
| `synthetic-static-run-O6X3iX/result.json` | Parent-executed component HTTP receipt: no credentials, HTTP 200, sentinel returned, middleware passed, `publicFolder` match |

The component HTTP test uses synthetic minimal manifests and a synthetic public directory. It is **not a full current application build, deployed ingress test, real-tenant file test or database test**. The parent executed it through a scrubbed-environment launcher. The route reviewer executed source inspection only and authored the harness. The execution summary owns any additional test outcomes.

## Confirmed finding P04-R-01: alternate static path bypasses the legacy upload API guard

Severity: high for retained tenant-private images; actual production data exposure requires deployment-content verification. Confidence: confirmed current-source defect, reproduced using synthetic component HTTP. No real uploaded image was opened or served during reproduction.

The protected route and public static transport address the same underlying file:

1. `app/api/uploads/[...path]/route.ts:43` obtains the current server organization; line 60 rejects a different organization; lines 64 and 78 enforce the dashboard module and `dashboard.read`.
2. The route then reads `public/uploads/<organizationId>/<fileName>` at lines 92–110 and returns private/no-store headers.
3. The same bytes are addressable at `/uploads/<organizationId>/<fileName>`. `middleware.ts:145–152` passes filename paths through without a session/permission check. `next.config.mjs:165–176` only rewrites security.txt paths and does not protect uploads.
4. Installed Next indexes the public directory in `node_modules/next/dist/server/lib/router-utils/filesystem.js:166–168`, resolves `publicFolder` entries at lines 482–484, and `node_modules/next/dist/server/lib/router-server.js:384` serves the static output.
5. There are three existing JPG paths under `public/uploads/cmp_org_005`. Only filenames were inventoried; their contents and deployment inclusion were not examined.
6. The synthetic component HTTP request to `/uploads/synthetic-tenant/sentinel.jpg` sent no credentials and returned status 200 and the exact synthetic bytes. The protected API route was not invoked.

Proposed bounded repair package **P04-R01-LEGACY-MEDIA-BOUNDARY** (implementation not performed):

- Owner: application security + media/storage maintainer; independent reviewer: security engineer; verification: QA/platform.
- Inventory legacy references and public-directory assets using an explicitly isolated target before deciding migration scope. Preserve old references until a reviewed compatibility path exists.
- Remove private bytes from public static delivery and use an authenticated tenant-bound transport, or explicitly classify individual assets as public with an approved data-owner decision. Never treat an unguessable filename as authorization.
- Add a regression that requests both the API URL and the alternate static URL with no session, wrong tenant, missing permission and disabled module. Neither URL may return the private sentinel. Retest valid same-tenant access and traversal/encoded path cases.
- Acceptance: current release artifact contains no unintended private files under its public root; denied requests reveal no bytes; a valid authorized read still works; legacy references reconcile without silent broken images.
- Recovery: preserve source assets and a mapping manifest until authorized references and backups are verified. Roll back to a private serving path rather than restoring public access. No destructive deletion before verified retention/copy checks.
- Required evidence: independent patch review, two-path isolated HTTP negatives, release-artifact public-content inventory, tenant-reference reconciliation and deployment/ingress acceptance. Do not infer deployed exposure from this local component reproduction.

## Entry guards traced

| Surface | Current enforcement and relevant qualification limit |
|---|---|
| Dashboard shell | `dashboard/layout.tsx:22,29` reads session then `requireRbacContext`. RBAC bypasses cookie cache, selects the live user by stable subject ID, requires active verified unlocked account/active organization, filters roles by tenant and rebuilds permissions (`lib/security/rbac.ts:87–199`). Middleware cookie presence is optimistic routing only. |
| `/api/auth/permissions`, `/api/me/permissions` | `requireSession` checks the live session mirror including ID/token/user/expiry, then current RBAC; own identity/permissions only. |
| `/api/auth/[...all]` | Better Auth adapter; POST `/api/auth/update-user` routes to the profile HTTP service. The complete installed provider endpoint/plugin matrix remains a blocking verification gap. |
| `/api/me/profile` | `readSelfProfileHttp` derives server actor/org/session before calling the self-profile service. Deep self-profile service review is coordinated with the action reviewer. |
| Organization/item APIs | Current-org or requested-org equality via server authz, enforced settings/inventory module and appropriate permission before data service. POST exports unconditionally return 405. DTO and related-location scope still need downstream proof. |
| Managed media | Read permission plus inventory/POS module; `readItemPicture` queries ID + server organization + ready item asset. Write compares requested org to fresh RBAC, checks create/update and inventory module, trusted origin, body/type limits. Provider data is encrypted. |
| UploadThing | Application upload middleware checks current org/module/create-update permission and then rejects legacy upload, directing managed upload. Provider GET/callback protocol verification is not claimed complete. |
| HR documents | Fresh-auth subject/tenant equals current RBAC; payroll module enforced. Service reloads live tenant permissions, applies self-only/employee scope, org predicates, document revision and actor/org-bound grants; reauthorizes after storage latency before returning bytes. Manager/location graph and real concurrency proof remain required. |
| Public customer statement | Signed token + live registry binds organization, snapshot ID, token/jti hashes, content hash, expiry/revocation and action permission before response. Read access writes allowed access evidence; this is separate from forbidden business mutation on denial. |
| Public supplier PO | Signed token + registry binds organization/envelope/order/content, active status/expiry/revocation and VIEW/respond permission bits. Token-based public access is intentional; a missing session is not itself a defect. |
| Public receipt API/page | Token verification + registry binds organization and sales order; service uses that org to read receipt, suppresses customer contact and operational diagnostic text. Server page renders an explicit allowlist. |
| User invitation page | 64-hex token, pending/unexpired invitation, active organization, tenant role, no wildcard role and redemption authority precede invitation email/role/org DTO. Route organization text does not supply authority. |
| Internal agent reconciliation | Configured bearer secret and constant-time comparison precede GET readiness and POST envelope/idempotency/work. This is intentionally system-wide machine authority; downstream worker admission remains separate. |
| Security disclosure routes | Intentional public constant text. |
| Referral redirect | Public attribution entry was read, but downstream referral/invite binding and denied-write semantics remain untraced. |

Page module declarations must be read precisely: `mode: "observe"` is not enforcement. Several family wrappers default to observe when no mode is supplied. People route wrapper checks permissions but has no module check itself; its service/action continuation may enforce one. These are qualification gaps, not asserted exploitable defects without tracing the downstream operation.

## Explicit unresolved qualification work

Inventory completeness does not close authorization qualification. Five sensitive public page boundaries were manually traced. The other 185 page rows retain `inferred_candidates_blocking_data_trace`: current imports, candidate calls, inherited layouts and matching declared contracts are recorded, but every data-producing branch has not been manually traced. This includes client component calls as well as server page loaders. Existing shell authentication does not prove authorization of independently callable actions.

| Package proposal | Dependency and acceptance evidence |
|---|---|
| P04-V01-PAGE-CONTINUATIONS | Work by route family in parallel with separate ownership. Trace every action/service/client data continuation and record stable subject, tenant, permission, object/location/module checks before each read/mutation. Close each of the 185 explicit rows only with exact source and bounded denial evidence. |
| P04-V02-PROVIDER-ENDPOINTS | Enumerate current Better Auth plugin endpoints and UploadThing protocols including implicit HEAD/OPTIONS. Confirm anonymous/public exceptions, session rotation/revocation, trusted origins and callback signatures; no live providers needed for initial isolated protocol tests. |
| P04-V03-CAPABILITY-NEGATIVES | Customer statement, supplier envelope, receipt and invitation: malformed/wrong-resource/expired/revoked/cross-tenant tokens; verify no private response and no denied business writes, preserving separately classified security audit events. |
| P04-V04-HR-DOCUMENT-BOUNDARIES | Disposable PostgreSQL and fake storage/scanner: self versus manager/HR, forged employee/document IDs, cross-tenant, changed role/module, grant expiry/revision, revocation during storage latency. Assert no plaintext response or unauthorized storage/business writes. |
| P04-V05-HTTP-AND-ARTIFACT | Current-source isolated application HTTP plus release artifact static-content/ingress checks. Component mocks and synthetic manifests cannot close this package. |

The 13 app server-action functions are handed to the action reviewer. In particular, accounting form closures must be qualified through the delegated action rather than through page access alone. Two default page exports occur in files marked `use server`; they remain explicit action surfaces pending framework reachability qualification.

## Reviewed bounded mocked test lane

These seven files have explicit mocks for application auth/data/provider collaborators and do not need repository `jest.setup.ts`: uploads route; organization collection/items/briefItems routes; media read/upload routes; HR document authorization. The exact paths and case names are in `existing-negative-test-inventory.json` and were sent to the parent executor.

The route error path imports canonical error classes and generated Prisma constructors, so the isolated harness must map a private generated Prisma client and fail on unapproved application/database imports. HR source uses `server-only`, which needs the existing empty test mapping. Media upload uses Node `File`/`FormData` and explicitly sets synthetic app origins. No live storage client or Prisma singleton is needed for these selected tests. Running all discovered suites would exceed this reviewed bounded lane: the PostgreSQL document suite requires its separate disposable-target review.

## Next action

Independently review P04-R-01 with its synthetic receipt and resolve the release-blocking legacy static media path in a separately authorized repair package. In parallel, continue P04-V01 page/service/action mapping and P04-V02 provider endpoint inventory. Before any P04 admission, supply current-source isolated HTTP/database denial evidence for every admitted surface and close or explicitly exclude every unresolved register row. Do not mark the package complete because the entrypoint inventory is complete.
