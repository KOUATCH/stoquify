# Hardened close: production deployment preparation

Hosting and domain are **undecided**. Live customer-statement email and accountant invitations are in scope. Vercel + Neon is a **proposal**, not an approved target or a provisioned environment. This package does not deploy, connect to a database, send email, create credentials, or approve production.

The retained Windows/x64 artifact with its loopback origin remains historical local qualification. Preserve it and its trusted digest. Select the real host, architecture, Node runtime and HTTPS origin, then build and qualify a new candidate for those facts. New source/schema changes invalidate the previous candidate binding. A copied dependency tree is not a new clean installation.

The latest preserved local baseline is [R2](../stoquify-potential/development/close-integrity-release-candidate-2026-11-10-r2/RESULT.md), with 123 migrations, artifact SHA256 `6d0147749362b359969b6113bf3e6a94918dc6df8d19ee1fcc5c208db4724d2f` and build ID `4CtAnxpXoochpr8CsDOPH`. Its admission is `PASS_LOCAL_RELEASE_CANDIDATE_WITH_PRODUCTION_GATES`, not production approval. The [2026-11-11 preparation packet](../stoquify-potential/development/close-production-preparation-2026-11-11/RESULT.md) records subsequent delivery-worker and admission changes. R2 does not qualify those changed source bytes. Keep the production plan's candidate and evidence fields unbound until a new target-compatible build and qualification exist.

## Inputs and accountable owners

Responsibility roles below need named people in the release record; these are not assignments to GitHub users.

| Decision/evidence | Accountable role | Required input |
| --- | --- | --- |
| Hosting | Platform lead | Provider, account/project ID, region, platform/architecture/Node version, artifact format, accepted deployment/promotion mechanism and protected environment |
| Domain | Domain owner | Owned HTTPS origin, authoritative public DNS results and trusted TLS evidence; no loopback/private/reserved/test domain |
| Database | Database operator + independent checker | Provider/project/branch, direct endpoint identity, production attestation, exact migration history/catalog/pending risk and baseline adoption decision |
| Secrets | Security/release operator | Protected provider/secret-manager variable bindings; no values in the public plan, evidence, repository or chat |
| Resend | Delivery owner | Account ID, verified owned sender domain and both sender identities, provider records for owned-test statement and invitation delivery |
| Worker | Platform operator | Private scheduled job identity, tenant scopes, worker ID, bounded limit, secret-manager bindings and signed scheduler execution evidence |
| Recovery | Incident commander, recovery operator, domain acceptor | Provider backup/PITR configuration, retention and point, approved RPO/RTO, measured hosted restore drill and reconciliation acceptance |
| Release | Release lead + independent checker | Trusted source/artifact/plan digests, protected required-check settings, compatible prior artifact, cohort/stop/rollback acceptance |

Start from [the deliberately incomplete template](../../config/release/hardened-close-production.template.json). Keep unknown fields null. No default provider, domain, project, sender or approval is inferred. `evidenceMaxAgeHours: 24` is a proposed bounded admission policy (maximum supported: 168 hours); the release reviewer must accept or tighten it. Historical evidence remains retained, but cannot satisfy a fresh deployment proof by changing its date.

## Offline readiness check

The new [readiness script](../../scripts/hardened-close-production-readiness.cjs) reads only the reviewed plan, pinned evidence files, candidate/artifact files and explicitly injected process environment. It reuses the existing release-secret preflight, production target decision and artifact verifier. It never loads `.env`, calls a provider, resolves DNS, opens a database, starts the app/worker, sends a message or promotes a schema.

After independent review, retain the plan's SHA-256 outside the editable plan/evidence directory. Invoke the check in a controlled release environment:

```text
node scripts/hardened-close-production-readiness.cjs --plan <reviewed-plan.json> --trusted-plan-sha256 <independently-retained-digest>
```

The stdout report contains blocker IDs, variable-name presence and non-secret evidence hashes. It does not print/hash secret values or the private connection URL. A missing/changed input or unresolved fact returns exit 1 / `BLOCKED`. The shipped template is expected to block. There is no `--force`, target override or pilot profile.

The successful status is `READY_FOR_CONTROLLED_PRODUCTION_REVIEW`, with deployment/schema/application approval fields still false. This is evidence admission, not independent verification that an external record is authentic. The reviewer must obtain provider/control-plane records through trusted access and verify them before pinning the plan. A file hash proves retained bytes; a self-authored JSON summary or self-signed assertion does not prove provider acceptance, DNS ownership, branch protection or recovery.

The CLI uses the actual artifact verifier. Unit tests inject an artifact verifier and synthetic records to exercise admission/denial rules; they are not host, database or Resend qualification.

The effective runtime auth secret (`AUTH_SECRET ?? NEXTAUTH_SECRET`) must also pass the existing strength policy. A non-Vercel controlled schema stage must explicitly opt in with `AQSTOQFLOW_DEPLOY_MIGRATIONS=1` as required by the existing target decision; this readiness script does not add that opt-in itself.

## Evidence contract

Each `evidence.<name>` is `{ "path": "<non-secret-receipt.json>", "sha256": "<reviewed-file-digest>" }`. Paths are relative to the plan; raw-record paths inside a receipt are relative to that receipt. Linked inputs are refused. Do not put bearer tokens, signed access URLs, passwords, connection strings, recipient addresses or financial payloads in retained public records. Retain redacted provider exports with durable IDs; secure originals remain in approved provider custody.

Every receipt requires `kind` equal to its evidence key, `observedAt`, named `observer`, durable `externalRecordId`, exact `sourceManifestSha256`, `artifactSha256`, `buildId`, `origin`, and a nonempty `records` list of path/SHA-256 bindings to independently reviewed raw exports. Future/stale timestamps, changed raw bytes and changed subjects fail. An `accepted: true`/`passed: true` field alone is insufficient.

| Key | Required facts beyond the common envelope |
| --- | --- |
| `build` | Host platform, architecture, Node major, artifact format, raw catalog-file SHA, retained runtime qualification ID and private-configuration-exclusion report ID. The actual verifier checks the sealed artifact/source/build digest; native Prisma files must match the declared platform. |
| `worker` | Same source, web-artifact/build/origin envelope; worker platform/architecture/Node major matching the target; `sourceEntryPoint: scripts/referral-delivery-worker.ts`; exact candidate `package-lock.json` SHA256 in `packageLockSha256`; independently reviewed `workerArtifactSha256`; runtime/native-runtime/private-configuration-exclusion qualification IDs; both `statement-email` and `accountant-invitation-email` capabilities. The pinned raw records must establish the runnable worker package and actual qualification, not merely a help screen or source file. |
| `hosting` | Actual provider/project/region; protected environment, required-check export, promotion mechanism, TLS verification IDs; observed DNS addresses must all be public. The script does not itself authenticate the exports or perform DNS/TLS requests. |
| `database` | Actual provider/project/branch/direct endpoint/public schema; exact catalog SHA; target-history report, pending-risk report and baseline-decision IDs from controlled existing gates. No credentials or URL in this receipt. |
| `recovery` | Exact DB project/branch; provider backup export, retention days, restore-drill ID and recovery point; approved and measured RPO/RTO seconds; named incident commander, recovery operator and domain acceptor. Measurements must satisfy approved objectives. |
| `sender` | `provider: resend`, account/domain IDs, `domainStatus: verified`, DNS-verification export ID and both configured sender identities. |
| `scheduler` | Actual schedule/run IDs, worker revision and both capabilities (`statement-email`, `accountant-invitation-email`); `invocationKind: private-cli`, `entryPoint: scripts/referral-delivery-worker.ts`, nonempty `organizationIds`, stable `workerId`, `limit` 1–100, job identity, secret-manager binding and signed control-plane execution receipt IDs. |
| `statementAcceptance` / `inviteAcceptance` | Resend account, correct capability/sender, `recipientClass: owned-test` plus opaque recipient reference; delivery/internal idempotency/message/request IDs, provider HTTP acceptance status, `eventType: email.delivered`, provider event ID and operator receipt ID. Request acceptance alone is insufficient. |

The source identity is SHA-256 of the artifact's ordered `source` array; catalog identity is the raw SHA-256 of `prisma/migration-catalog-manifest.json`. Never substitute an artifact manifest's newly calculated digest for a previously trusted emitted digest. Retain the actual source snapshot, lock/vendor inputs, candidate build command and host-specific runtime probes.

## Controlled build and release sequence

1. **Choose and record the target.** Resolve the table above. Obtain protected-environment access and actual provider records. Host/domain uncertainty blocks production; no secret provisioning or DNS change is implied by this document.
2. **Freeze the new candidate.** Preserve unrelated work and old evidence. Review source/schema changes and the current immutable migration catalog. Install locked dependencies on the intended platform with reviewed native inputs; distinguish a fresh install from reuse. Bind source, catalog and build inputs.
3. **Build without production DB/provider credentials.** Use the actual production public origin with isolated synthetic build configuration/database. Qualify the intended native platform, compiled public URLs, private-configuration exclusion, authenticated actions, denied/revoked sessions and artifact bytes. Store emitted digest + exact artifact/source in controlled durable custody. The compiler must not receive the target migration credentials.
4. **Prepare a separate owned nonproduction deployment and delivery cohort.** Its DB and recipients must be explicitly scoped. Qualify real credential/session behavior, both delivery queues and actual provider delivery receipts. Verify sender/domain ownership, tenant/consent boundaries, unknown-outcome recovery and operator lookup. Never enable production sends merely to clear a gate or use uncontrolled customer recipients.
5. **Qualify operations.** Verify the actual scheduled worker, protected job identity, tenant scopes, bounded claims, lease/replay handling and logs/alerts. Run a hosted restore drill on a separate authorized target, preserve before/after evidence, prove auth/financial invariants, and obtain RPO/RTO/domain acceptance. Local `pg_dump` evidence cannot replace this step.
6. **Review protected CI/environment controls.** Existing `.github/workflows/ci.yml` is verification CI, not a production promotion implementation. Add a separately reviewed, protected release job after target selection; require successful relevant status checks, immutable artifact download/digest validation and independent release approval. Do not expose production secrets to pull requests or rebuild after schema promotion.
7. **Admit the exact release plan.** Inject production configuration only into the controlled release process. Require `NODE_ENV=production`, exact auth/public origin and explicit production database attestation. Run this offline check and the existing secret/target/history/risk gates. Preserve all failures; do not rewrite historical approvals to match new source.
8. **Explicit schema stage, only after authorization.** From the matching candidate, the authorized operator runs `npm run release:schema:promote -- <artifact-directory> <trusted-artifact-digest>`. It retains artifact verification, non-local target/secret checks, direct public-schema connection rules, advisory serialization, safe migration and post-history health. This stage mutates the DB and does not deploy the app. Keep Prisma's lock enabled; migration failure stops application publication. Reconcile `DIRECT_URL` with `DATABASE_URL`; no transaction-pool/alternate override. Existing nonempty baseline adoption needs the documented independent manual path.
9. **Promote exactly the qualified provider-compatible bytes.** Provider deployment/promotion is currently an external implementation gate. Verify source/artifact custody again, migration outcome, hosted health, auth, delivery/operator visibility and cohort results before domain/capability expansion. Retain deployment IDs, receipts and accountable acceptance. No generic CLI in this package publishes anything.
10. **Stop/rollback.** Stop on changed bytes/history, failed auth, balance mismatch, duplicate/unknown deliveries, stale lease acknowledgment or missing alert/receiver proof. Code rollback requires a prior artifact proven compatible with the expanded schema. Source reversion does not reverse SQL. Schema/data recovery needs a reviewed fix-forward or restore/reconciliation decision; never overwrite the source during rehearsal.

The retention migration is an expansion: historical receipts keep three null fields, and the database still accepts an old client's null-field insert. The new application always retains its document in the export transaction. Quiesce close exports during a version handoff and verify every receipt created after the declared cutover has the retained body, byte digest and request binding. An older writer is not a custody-compatible rollback merely because its SQL still executes; keep certification stopped until a compatible writer is qualified. The current first pilot has no selected production deployment to hand off.

Migration `20261110190000_close_scope_integrity` is the additive 123rd migration. Its deterministic nine-table `ACCESS EXCLUSIVE` lock cohort requires a planned window with affected fiscal-year, period and close writers paused. The lock timeout is five seconds; the 120-second statement timeout is not a total migration-duration bound. Measure index/constraint validation at target scale. The fourteen mismatch preflights intentionally reject corrupt predecessors before DDL, without repairing or deleting records. Preserve failure counts, transaction/history evidence and any unfinished Prisma migration record; review a repair/forward-fix plan rather than automatically resolving it to a pass. A prior application must be qualified against the new scope/identity guards before it can be used for rollback. The small local replay/restore fixtures establish neither production migration duration nor hosted recovery objectives.

## Live delivery and secrets

Both statement email and accountant invitations must be enabled in the eventual controlled production configuration; there is no closed-pilot exception. Existing code and `.env.example` defaults remain disabled. Required secret names and sender/provider configuration are in [release secret provisioning](../operations/runbooks/release-secret-provisioning.md). Real values stay in the selected host/secret manager.

Use the existing tenant-scoped private worker entry point, not an invented unauthenticated cron URL:

```text
npm run worker:referrals -- --organization-id <approved-tenant-id> --worker-id <stable-owned-worker-id> --limit <1..100>
```

This is a **future mutating/sending invocation**, not a readiness test command. Review its current npm definition and imports before use. The CLI dispatches both existing services and requires organization/worker identities. Keep its runtime private under a protected scheduled-job identity with secret-manager access and signed scheduler records. There is no public statement/invitation cron handler established by this package. The existing agent reconciliation endpoint is a different capability; do not repurpose it or bypass its signed/authenticated invocation controls.

The current standalone web artifact does not qualify a delivery-worker executable. The selected platform needs a separately qualified worker package/runtime bound to the reviewed source and dependency inputs, plus the actual scheduled invocation evidence. The readiness check now requires that separate `worker` receipt, and the scheduler receipt's `workerArtifactSha256` must identify exactly the worker artifact it qualifies. Existing plans without this receipt intentionally remain blocked. Copying this CLI command into a scheduler is insufficient when its source or runtime dependencies are absent from the deployed package. These offline bindings still require independent inspection of genuine build/scheduler records; the checker does not authenticate external records or execute a worker.

Record a distinct digest for the separately qualified worker artifact. Reusing the current web-only artifact digest as that worker identity is rejected.

The CLI now preloads the existing Node `server-only` shim and resolves the installed local ts-node entry instead of allowing an `npx` installation fallback. The worker package must include that shim and its exact local compiler/path-resolution runtime; do not install or generate dependencies during a scheduled invocation. Qualify an actual invocation from the packaged runtime outside the build tree. A help screen alone does not exercise dynamic business imports or the native database client.

Exit 0 means the bounded batch completed, not that each message was sent or delivered. Inspect each result and the tenant's queue: `DEFERRED` can mean disabled configuration or an uncertain outcome held for review; `PROCESSING` and `LEASE_LOST` are dispatch/ownership states. `UNCONFIRMED` produces structured output and exit 1. A lease lost to a newer generation must not be settled by an old acknowledgement. Do not reset a reserved or unknown request to PENDING merely to clear an alert. Reconcile genuine provider records and the retained tenant/attempt/execution evidence before any separately reviewed retry or repair.

Current statement/invitation envelope readers each use one configured encryption key. Rotating a key while old envelopes remain queued can make them unreadable; statement signing-key changes can also invalidate existing links. Plan queue drain/hold and controlled reissue/reconciliation before rotation, retain required prior keys securely for reviewed recovery, and verify the actual readers. This preparation adds no keyring or automatic old-key fallback. Provider acceptance (`SENT`) remains distinct from an authentic delivered event and owned-recipient acceptance.

The Resend account must have a verified domain the team owns; Resend documents this prerequisite in [Verified domains](https://resend.com/docs/dashboard/domains/introduction). Record real statement and invitation delivery events and operator receipt. An SDK return or a queued `SENT` label does not establish inbox delivery, durable external deduplication or uncertain-outcome recovery.

## Proposed Vercel + Neon path: unresolved adapter gate

Vercel's [build command](https://vercel.com/docs/cli/build) produces `.vercel/output` according to its Build Output API; its `--standalone` option is Vercel's packaging option. This is distinct from Stoquify's current S11 `.next/standalone` → `runtime/` artifact. No adapter, byte mapping, origin/platform qualification or Vercel acceptance has been implemented here. The readiness gate deliberately blocks `provider: vercel` until that separate engineering gate is qualified; editing the label does not establish another host's acceptance.

If Vercel is selected, independently design and qualify the production-target prebuilt format and custody adapter. Its [deploy documentation](https://vercel.com/docs/cli/deploy) describes `--prebuilt` and production staging using `--prod --skip-domain`; these are reference capabilities, not an executable deployment recipe for the current S11 bundle. Review system-variable/build-ID requirements and ensure the staged production bytes are the qualified bytes. [Promoting a Preview-built deployment](https://vercel.com/docs/cli/promote) can create a new production deployment/build, so a generic Preview→promote flow violates the no-rebuild contract unless separately designed and qualified. No Vercel project is provisioned or selected here.

If Neon is selected, obtain actual project/region/root-branch/endpoint identities and history-window configuration. Neon's [restore documentation](https://neon.com/docs/postgres/backup-restore/branch-restore) describes root-branch restore and backup preservation; an in-place restore can overwrite current data, affect all databases on the branch and interrupt connections. Plan a separate authorized drill with a declared recovery point and retained prior state. Do not infer PITR from a plan name or execute a production restore from this preparation package.

## Current completion boundary

Available now: the deliberately incomplete public plan, stronger offline evidence admission, scoped worker/CLI fixes and tests, secret-name documentation and this operating sequence. Consult the latest [preparation result](../stoquify-potential/development/close-production-preparation-2026-11-11/RESULT.md) and its machine-readable qualification for the executed database/CLI evidence; failed attempts remain preserved separately. Unresolved: chosen host/domain/project, new target-compatible web and separately qualified worker artifacts, authentic provider/protection/DNS/TLS records, production target/history/risk decision, actual Resend acceptance, protected scheduled worker, hosted recovery objectives/drill and independent release authorization. Preparing these inputs does not approve production promotion, deployment, live delivery or a new financial close certificate.
