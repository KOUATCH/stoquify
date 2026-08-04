# Enterprise Release External Workstream Handoff

**Prepared:** 2026-07-27  
**Source plan:** `ENTERPRISE_RELEASE_BLOCKER_UNBLOCKING_EXECUTION_PLAN_2026-07-27.md`  
**Engineering tranche:** `READY` — consolidated integration suite passed 24/24  
**Release posture:** development may continue; pilot and production remain fail-closed  
**Assignment state:** authorized people and external systems are not yet assigned

## Control boundary

This handoff contains references and acceptance criteria only. It must not contain database URLs, passwords, secret values, authorization headers, personal identity documents, or invented approval/signature data. Repository engineering cannot self-issue external infrastructure evidence, independent statutory opinions, security-authority attestations, or operational acceptance.

The country-pack integration gate remains independent of the production country-pack gate. General feature development is not blocked by B03–B08; only the affected production, pilot, or authority-backed capability remains disabled.

## Current verified snapshot

| Workstream                    | Current gate result                          | Open condition                                                                              |
| ----------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| B03 — production database     | 8/9 checks; 2 blockers                       | `deployment_target_is_safe`, `database_url_missing`                                         |
| B04 — managed release secrets | 2/8 checks; 6 blockers                       | Three purpose-specific production secrets are absent or cannot be strength-verified         |
| B05/B06 — Cameroon review     | Review preflight 4/12; production gate 10/12 | Independent source hashes, qualified expert decision, signed artifact, checker verification |
| B07 — credential rotation     | 15 classes; 31 blockers                      | Stable managed references, named security authority, rotation/revocation evidence           |
| B08 — operational readiness   | 152 blockers; activation unauthorized        | Frozen identity, accepted owners, scheduler windows, alert lifecycle, credentials           |

## B03 — Platform/database owner handoff

**Accountable role:** platform/database owner  
**Named assignee:** `UNASSIGNED`  
**State:** `AWAITING_AUTHORIZED_OWNER_AND_TARGET`

### Authorized execution

1. Provision or select the approved non-local PostgreSQL production target in the managed production environment.
2. Create separate least-privilege migration and runtime access where the provider supports it. Store connection material only in the managed secret store and expose the required deployment reference as `DATABASE_URL`.
3. Record a redacted target attestation: provider/project reference, environment, non-secret host classification, database identifier, region, owner, and change/ticket reference. Do not record the URL.
4. Confirm an approved backup exists and execute or cite a current restore test. Record backup and restore-test references, timestamps, retention, RPO/RTO, and accountable operator.
5. In an authorized production release job with `DATABASE_URL` injected, run `npm run prisma:migration:release:preflight`.
6. Stop if target classification is unsafe, a destructive finding is unapproved, or backup/restore evidence is absent.
7. Under change control, run `npm run prisma:migrate:deploy`, `npm run prisma:migration:history:health`, then `npm run prisma:migrate:status`. The protected safe-deploy and verification commands already enforce this order.
8. Retain redacted command logs, execution IDs, post-deploy status, and the exact commit/artifact identity used.

### Acceptance evidence

- `databaseConfigured=true`
- `databaseTargetSafe=true`
- 41 migrations accounted for
- zero unapproved destructive findings
- migration deploy, direct history health, and status exit 0
- direct history health 8/8 with no unfinished, missing, checksum-mismatched, unknown, or duplicate successful migrations
- backup reference and successful restore-test reference
- change/release job ID and immutable commit/artifact reference
- no connection string or credential value in repository evidence

**Current evidence:** `what-next/blocker-execution/prisma-migration-production-preflight-2026-07-27.{md,json}`

## B04 — Security/platform owner handoff

**Accountable role:** security/platform owner  
**Named assignee:** `UNASSIGNED`  
**State:** `AWAITING_MANAGED_SECRET_PROVISIONING`

### Required managed secrets

| Environment variable                | Purpose                               |
| ----------------------------------- | ------------------------------------- |
| `PUBLIC_IDENTITY_ABUSE_HASH_SECRET` | Public-identity abuse-protection HMAC |
| `AQSTOQFLOW_RECEIPT_TOKEN_SECRET`   | Public receipt signing                |
| `AQSTOQFLOW_HISTORY_CURSOR_SECRET`  | Transaction-history cursor signing    |

### Authorized execution

1. Generate three independent, purpose-specific random values in the managed secret system. Each must satisfy the release policy (at least 32 characters and 12 distinct characters where checked).
2. Do not reuse a value across the three purposes and do not reuse `AUTH_SECRET` or `NEXTAUTH_SECRET`.
3. Record only provider secret identifiers, version identifiers, creation/activation timestamps, authorized operator reference, and change/ticket reference.
4. Inject managed references into the production deployment and restart/redeploy through the normal protected pipeline.
5. Run `npm run release:secrets:preflight:release`, `npm run public-identity:abuse:gate:release`, `npm run receipt:token:config-gate:release`, and `npm run release:evidence:gate:release` in the protected environment.
6. Preserve redacted outputs proving values were not printed. Keep prior versions available only under the approved rollback/incident policy.

### Acceptance evidence

- release secret preflight 8/8
- all three secrets present and strong
- all three values distinct and not shared with auth/session secrets
- provider/version references and activation timestamps retained
- deployment/restart reference retained
- no secret value, derived value, or environment dump committed

**Current evidence:** `what-next/release-secret-preflight.{md,json}`

## B05/B06 — Cameroon reviewer and checker dispatch

**Compliance/legal owner:** `UNASSIGNED`  
**Qualified independent reviewer:** `UNASSIGNED`  
**Separate authorized checker:** `UNASSIGNED`  
**State:** `READY_FOR_EXTERNAL_DISPATCH`

Use the existing evidence-preserving package; do not create a substitute approval internally:

- `docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/QUALIFIED_REVIEW_DISPATCH_2026-07-20.md`
- `docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/qualified-review-dispatch-manifest.json`
- `docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/review-package/`

The reviewer must supply verifiable identity, qualifications, organization, conflict declaration, review dates, independent digests for every retained source, decisions and tie-out hashes for all four CNPS fixture families, effective dates, final production-suitability decision, and a signed approval artifact. The checker must independently authenticate the return, verify the signed artifact hash and signature, and confirm the maker/checker separation.

Current failed review checks are: reviewer identity, review window, recomputed source digests, four-family decisions, all-family approval, final-decision consistency, signed-artifact metadata, and signed-artifact verification.

After an authentic return, follow the packet’s post-signature runbook and run, in order:

1. `npm run statutory:country-pack:review:preflight`
2. After 12/12, perform the maker-checker-controlled manifest, seven-hash, and runtime authority transition.
3. Record the reviewed code/change reference in `statutory.runtimeAuthorityPromotionReference`.
4. `npm run statutory:country-pack:gate`

The runtime transition must promote `CNPS_CAPABILITY_STATUS` from `SUPPORTED_DRAFT` and `CNPS_VERIFICATION_STATUS` from `SOURCE_CHECKED` only within the signed decision scope. The gate rejects a signed manifest if this binding is absent. `REGULATOR_CONFIRMED` remains prohibited without actual retained regulator confirmation.

Expected result is review preflight 12/12 and production country-pack gate 12/12 with `EXPERT_REVIEWED`. `REGULATOR_CONFIRMED` is optional and must never be asserted without actual regulator evidence. Production activation remains subject to every other enterprise release gate.

## B07 — Credential rotation handoff

**Security authority:** `UNASSIGNED`  
**Service owners:** `UNASSIGNED`  
**State:** `WAIT_FOR_B03_B04_AND_STABLE_DEPLOYMENT`

The authoritative register is `docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_CREDENTIAL_ROTATION_REGISTER_2026-07-25.md`. It contains 15 unresolved credential classes and must never receive secret values.

Do not start final rotation while endpoints, deployment identities, or managed references are still changing. After B03/B04 and the stable deployment baseline exist:

1. Assign a real security authority and each dependent service owner.
2. Complete provider-side create/activate/redeploy/revoke/rejection-test evidence for every class.
3. Record provider/version IDs, workload deployment IDs, timestamps, old-version rejection references, and release binding only.
4. Run `npm run agent:credential-rotation:evidence:apply` and `npm run agent:credential-rotation:gate`.

Acceptance is 15/15 classes resolved, zero obsolete credentials accepted, no secret values printed, and an authentic security approval bound to the final artifact.

## B08 — Operational owner and runtime handoff

**Release manager:** `UNASSIGNED`  
**State:** `OWNER_ASSIGNMENT_CAN_START_PLATFORM_EXECUTION_WAITS`

The authoritative register is `docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_OPERATIONAL_RELEASE_EVIDENCE_2026-07-25.md`. Assign real primary and backup identities for all six responsibilities now: rollout, rollback, support, pilot, security incident, and on-call backup. Each must accept a runbook version, escalation reference, coverage window, and acceptance timestamp.

Scheduler and alert execution waits for B03/B04, stable managed credentials, and a release-bound inactive deployment. Then:

1. Deploy the five-minute reconciler inactive with managed authentication, bounded timeout, and concurrency control.
2. Capture readiness, missing-configuration, invalid-auth, and failure-alert evidence.
3. Capture three unique consecutive completed scheduler windows.
4. Prove HTTPS alert delivery, external request identity, acknowledgement within SLO, retry, dead letter, protected recovery, backup escalation, and alert-secret rotation.
5. Apply evidence with the repository commands and rerun `npm run agent:operational-release:gate`.

Acceptance is 152/152 checks with authentic owner acceptances and artifact-bound operational evidence. `activationAuthorized` must remain `false` until the later protected activation ceremony.

## Dependency-controlled execution order

1. **Now, in parallel:** appoint the platform/database, security/platform, compliance/legal, qualified reviewer, checker, release-manager, and operational owner roles; dispatch the existing Cameroon packet; begin B03/B04 provisioning.
2. **After B03/B04:** establish the stable inactive deployment, then execute B07 rotation and the B08 scheduler/alert evidence lifecycle.
3. **After B03–B08 pass:** stop release-affecting changes, select a clean candidate, run the full verification suite, and create the immutable freeze bundle.
4. **Only after freeze:** bind product, security, independent-review, operational, and statutory evidence to the exact commit/artifact; rerun gate 017 and Phase 2B entry.
5. **Only after an authorized successful pilot:** evaluate production promotion. No earlier document or gate result authorizes activation.

## External-input orchestrator state

The repository’s existing external-input orchestrator currently reports 1/13 checks passed with 102 blockers. Its human-intervention plan lists nine required interventions, zero evidence-ready, with safeguards intact. Use these authoritative next-command maps during external execution:

- `docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_EXTERNAL_INPUT_READINESS_2026-07-25.md`
- `docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_HUMAN_INTERVENTION_PLAN_2026-07-25.md`

## Downstream gates intentionally held

The current active-development tree is not a release candidate. The read-only freeze report is blocked with 206/207 historical manifest files verified, eight Phase 2A runtime drift paths, and 406 current changes. Phase 2B entry is 2/23 with 21 blockers. The phased-execution audit is 36/37; its remaining requirement is the historical freeze attestation and must not be repaired by rewriting signed evidence.

Do not create a new freeze or request gate-017 approval yet. After B03–B08 are complete and release-affecting changes stop, cut a clean candidate and generate a new immutable manifest and attestation from that candidate.

## Acceptance record

The authoritative work-management system must record, for each workstream: owner identity/reference, acceptance timestamp, target completion window, change/ticket reference, evidence location, current status, and escalation path. This repository handoff remains `UNASSIGNED` until those external records exist; editing placeholders here is not proof of acceptance.

## Machine-checkable return channel

Use `docs/blockers/enterprise-release-external-evidence-intake-2026-07-27.json` as the single redacted return manifest for B03–B08. Each accountable owner edits only their section and records authoritative references, not copied secret values, database URLs, personal documents, or free-form approval claims.

Run:

1. `npm run enterprise:release:external-evidence:report`
2. Complete the protected workstream commands listed in the generated report.
3. `npm run enterprise:release:external-evidence:gate`
4. `npm run enterprise:release:blockers:gate`

The validator currently reports 1/6 checks and 71 blockers. The passing check is the fail-closed safety boundary. A completed intake can only make the packet eligible for authoritative gate reruns; it cannot approve promotion, activation, Phase 2B, or Phase 3.

