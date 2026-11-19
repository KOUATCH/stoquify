# Independent full-application admission contract

29 October 2026. Source/design review only; no build, application, database or browser execution by this reviewer. Final acceptance awaits the concrete orchestration scripts and evidence. Local R02 qualification is authorized; production changes, deployment, commit and push are excluded.

## Required local boundaries

1. Freeze a new combined current candidate rather than extending the old AF16/P03 candidate. Bind source/configuration/migrations, installed dependency provenance and separately inventoried ignored uploads. Build only in a fresh owned directory using physical private dependencies and no application environment files. Inspect current build/preflight/Prisma/artifact commands; no implicit schema promotion, installation or weakened compiler/lint gate.
2. Pin the browser-facing HTTPS origin before compilation because public environment values are bundled. Distinguish the internal HTTP listener from the sole browser origin. Allocate/check owned ports; preserve unrelated running services. Use synthetic secrets and explicitly disabled live send/provider paths, exposing only variable names in evidence.
3. Compare the candidate schema and every migration name/checksum with the guarded empty template. Reusing the P03 cluster does not establish schema compatibility. Clone only fresh explicitly named databases after exact loopback, database-name and `SHOW data_directory` checks. Reject existing names rather than reusing or dropping unknown data. Serialize build and fixture ownership of the shared cluster; one lifecycle must not stop another's server.
4. Use private generated Prisma client/runtime dependencies whose configured environment paths resolve within the owned tree and are absent. The root generated client can read root environment files even in tests; do not import it or the global mocked Jest setup. Fixture/control scripts may create synthetic credential users directly, but real application HTTP must mint and validate actual signed cookies.
5. Package with the repaired v2 mapper and verify exact private asset mappings, no public/traced copies and no renamed known-private byte copies. The runtime is a separate verified copy outside the source checkout. Do not run the old P03 v1 artifact as current qualification or treat its old source as a combined current release.
6. Define allowed mutable runtime data in advance. Image optimizer tests can write `.next/cache/images`; inventory that exact owned subtree separately while verifying every sealed code/private-asset byte and unexpected additions elsewhere. Do not exclude the entire `.next` directory from integrity. A seeded private cache entry must survive immediately before and after denial.

## Required local authority and browser proof

Use real Better Auth endpoints/UI and server-issued secure HttpOnly cookies for distinct synthetic users/tenants. No synthetic actor headers or substituted authorization/error adapters in the served application. Test both URL families with absent authority, foreign tenant, expired and revoked saved sessions, current permission removal and module denial after an allowed read. Bind each controlled DB transition to exact fixture identities and the disposable target; do not let a prior failure accidentally satisfy later negatives. Preserve cookie identity during replay rather than reauthenticating after revocation.

Authorized reads must match exact synthetic asset bytes and private cache/MIME policy. Denied reads must contain no private bytes and must not cause unauthorized business mutations. Declare allowed session/audit effects separately rather than claiming zero database writes. Include aliases, HEAD, conditional/range requests and optimizer negatives with ordinary public controls.

Render actual private-image consumers in the full application, checking native/unoptimized image loading and current-auth recovery. Record HTTP denial/body evidence alongside browser state; screenshots alone cannot prove no private bytes. Test fresh fetch/reload/back-restoration and actor switching. Do not promise erasure of pixels already legitimately displayed or data retained beyond application control. No requests to original tenant asset URLs or production providers are permitted.

## Reusable P03 controls and required adaptations

Reuse fresh-directory ownership markers, scrubbed environment, bounded child/tree termination, explicit pg_ctl log descriptors, exact owned data-directory checks, cleanup despite earlier failures and code/asset identity verification. Do not reuse old source-delta assumptions, dynamically extracted AF05 seed fragments, old database names, old public origin or broad unguarded imports. Full current-source compilation may reveal unrelated failures; preserve diagnostics and resolve scope explicitly rather than silently weakening checks or falling back to the old build.

## Separate hosted release requirements

Hosted ingress/static/CDN exclusion, cache purge/namespace transition, operator storage permissions, rolling-version compatibility and production acceptance remain G09 release requirements. They are not prerequisites to close local R02 and do not authorize deployment. Local closure requires G08 evidence on the isolated current full application, independent review and source/asset/reference reconciliation. Broader P04 repairs and decisions remain separate.
