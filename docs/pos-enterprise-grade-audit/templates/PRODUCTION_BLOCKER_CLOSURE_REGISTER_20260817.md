# Stoquify production blocker closure register

Recorded: 2026-08-17

Release verdict: **REJECTED / NO-GO**

Development verdict: **AUTHORIZED TO CONTINUE** only for the approved development-only, cash-only, synthetic-data, non-statutory receipt scope.

This register reconciles the live repository gates with the supplied templates. A populated template is not proof of an event that did not occur. Human signatures, production infrastructure evidence, secrets, qualified statutory opinions, and hardware test results remain fail-closed.

## Candidate and cryptographic identity

| Field | Current value | Production effect |
| --- | --- | --- |
| Commit | `35b4cc6a06a50ee11de5bfce6b04993e38bd589a` | Observed only; not a frozen release |
| Tree | `7efce91d5ba871e91470f60ed3b53833a1c3b4b4` | Observed only |
| Worktree | `DIRTY` | Blocks final hashing, signatures, and promotion |
| Migration raw SHA-256 | `f7de8dc7ace0a5e063cdb7ecd9527e77807b7f872e474546819e9fca13a273d4` | Verified |
| Migration canonical-LF SHA-256 | `2fde92f4ad0cbb1a2a517b12e71c38997dc4956c9d57d70ff1ae0c636ff2f191` | Required in approval registry |
| 13-finding inventory SHA-256 | `55d332c3319b65acfdf415e64042a15504d12861b664429af7e63155296e1ad1` | Verified |
| Prisma schema SHA-256 | `cdbc9c64e88d642f2bfc716ee4fda2e8b7dfbfc26f08a5170645311268ae8af9` | Bound in rolling manifest |
| Rolling evidence-manifest SHA-256 | `37c4b416c2e58609866770bef995f85ec35839ecd8b0c497e760487b52a41911` | Structure/bindings pass; not final production evidence |
| Development R2 technical manifest SHA-256 | `956fc6789101b39c57c6cad00e0a237f309c7557cd0fe8b6c76fcd1b7712f66d` | Synthetic development evidence only |

## Repository-owned closures completed in this run

| Control | Before | Current result | Evidence |
| --- | --- | --- | --- |
| Inventory boundary | 25 active findings: 24 temporary-copy contaminations and 1 local fixture | **PASS: 0 active violations** | `node scripts/inventory-boundary-gate.js --mode fail` |
| Role cockpit | 7/9 | **PASS: 9/9** | direct `buildRoleCockpitReadiness(..., mode=fail)` evaluation |
| Focused regression | Not rerun after repair | **PASS: 2 suites, 8 unique tests** | inventory-boundary and role-cockpit gate tests |
| Jest source isolation | `.codex-tmp` could be discovered as tests | **REPAIRED** | `jest.config.ts` now excludes `.codex-tmp` |

The inventory fix ignores the repository-owned `.codex-tmp` certification-copy directory and marks `scripts/supplier-po-ack-e2e-fixture.js` as the local synthetic fixture it already enforces at runtime. It does not allow a production runtime stock mutation.

The role-cockpit fix recognizes that analytics permissions and denied/no-organization states are owned by the route-data-access and route-access helpers. It retains all nine controls.

## Enterprise gate disposition

| Gate | Current status | What is already proven | Exact closure action |
| --- | --- | --- | --- |
| B01 — production build | **RETEST REQUIRED** | Stored diagnostic build is marked passed; fresh compilation/static generation succeeded | Run the final frozen candidate in approved Linux CI or enable audited Windows symlink capability, require successful standalone packaging, then bind artifact digest and CI run |
| B02 — payroll immutability | **READY FOR NON-PRODUCTION SCOPE** | Isolated PostgreSQL: 9/9 triggers, 14/14 forbidden mutations blocked, 3/3 allowed lifecycle changes | Preserve evidence; rerun against the final production-like candidate without claiming production DB verification |
| B03 — production DB/migration history | **BLOCKED_EXTERNAL_CONFIG** | Development R2 replay and fingerprint evidence exist | Supply an authorized redacted production target, approved path, backup, isolated restore, direct Prisma history, post-deploy health, and hashes in `05-production-restore-evidence.json` |
| B04 — managed release secrets | **BLOCKED_EXTERNAL_CONFIG: 5/21** | Gate prints no secret values and confirms distinct-secret policy | Provision the six dedicated secret/key boundaries plus HTTPS public URL and live delivery flags through the managed secret platform; rerun without recording values |
| B05 — Cameroon source hashes | **READY: 7/7** | Source artifacts are bound and hashes verify | Preserve hashes in the final frozen packet |
| B06 — qualified Cameroon approval | **BLOCKED_HUMAN_EXPERT** | Technical statutory gate is 11/12 | Qualified Cameroon reviewer must complete CM-A–CM-H, recompute sources, sign an artifact-bound opinion, and a separate checker must verify it |
| B07 — credential rotation/revocation | **BLOCKED_EXTERNAL_SECURITY** | Register and validator exist | Security owner must classify every credential, create managed references, record rotation/revocation evidence, fresh-auth attestation, and final release binding |
| B08 — operational release evidence | **BLOCKED_EXTERNAL_OPERATIONS** | Gate structure exists | Assign primary/backup owners; bind runbooks; prove scheduler, three successful windows, alert delivery/ack/retry/dead-letter/recovery/escalation, CI and governance evidence |
| B09 — clean immutable freeze | **BLOCKED_DIRTY_TREE** | Current commit/tree recorded | Attribute all current changes, review them, create a clean `codex/` release candidate, rerun all gates, then generate a new immutable manifest. Do not sign this rolling tree |
| B10 — governance/ownership | **BLOCKED_HUMAN_APPROVAL** | Product/controller names were supplied | Provide qualified role/authority records, fresh approval after freeze, security approval, six owner acceptances, backups, escalation references, and artifact hashes |
| B11 — Phase 2B | **BLOCKED_DOWNSTREAM** | Entry gate exists | Rerun its 23 checks only after B01–B10 and gate 017 are GO |
| B12 — Phase 3 | **NOT STARTED** | Phase gate exists | Complete controlled pilot observation and exit evidence, then obtain the 34-check artifact-bound decision |

## Destructive migration packet

Current technical result:

- Packet bindings: **PASS**, 27 bound files, 0 mismatches.
- Evidence-manifest structure: **PASS**, current Prisma schema bound, 0 supporting-evidence mismatches.
- Candidate freeze: **BLOCKED**, rolling mode and dirty source tree.
- Production artifacts: **0/14 completed**.
- Exact-hash approvals: **0/13**.
- Production target validation: **BLOCKED**, no production database URL or approved target proof.

Required human-controlled order:

1. Complete B09 and freeze a clean candidate.
2. Select `EMPTY_TARGET_EXECUTE` or `EXISTING_TARGET_RESOLVE_ONLY` from the real target census.
3. Complete the production backup/isolated-restore packet and all 13 data-impact dispositions.
4. Regenerate the final evidence manifest after no further candidate changes.
5. SANGO MALO performs fresh authentication and signs the exact final manifest and maker attestation.
6. MAXIMILLIANO BONGA independently verifies the hashes and evidence, declares independence/conflicts, authenticates freshly, and signs a later checker decision.
7. Only after `APPROVE_EXACT_HASH`, the checker manually authors all 13 approval registry entries. Generated entries remain disabled.
8. Rerun destructive-evidence, migration-safety, history, build, security, statutory, operational, and gate 017 checks from the unchanged commit.

The supplied 2026-08-17T08:00:00Z names/timestamps cannot approve evidence created later that day. Typed names are not signatures.

## Template completion map

| Template | Machine-filled now | Must still be completed by accountable humans/systems |
| --- | --- | --- |
| `TEMPLATE-01-...FILLED_20260817.md` | Exact hashes, 13 findings, R2 evidence, current rolling packet status | Production restore, clean freeze, maker/checker signatures, 13 approvals |
| `TEMPLATE-02-...FILLED_20260817.md` | Names, roles as supplied, environment, actual rolling commit/tree, dirty status | Identity-provider/MFA records, fresh timestamps, signatures, authority validation |
| `TEMPLATE-03-...FILLED_20260817.md` | 11/12 technical country-pack controls, 7/7 hashes | Qualified Cameroon legal/statutory review and independent verification |
| `TEMPLATE-04-...FILLED_20260817.md` | Pilot identifiers and explicit simulation-only exclusions | Qualified product/controller signatures; physical device evidence if any device is in production scope |
| `migration-production-approval-20260817/*.json` | Current technical hashes and development evidence | Every field that represents a production event, decision, identity verification, secret reference, or signature |

## Secret provisioning register

Do not place values in this repository. Store only managed references and rotation evidence.

| Boundary | Environment variable | Required property |
| --- | --- | --- |
| Public identity abuse hashing | `PUBLIC_IDENTITY_ABUSE_HASH_SECRET` | Random, at least 32 characters and 12 distinct characters |
| Receipt token signing | `AQSTOQFLOW_RECEIPT_TOKEN_SECRET` | Independent strong random signing secret |
| Transaction-history cursor signing | `AQSTOQFLOW_HISTORY_CURSOR_SECRET` | Independent purpose-specific strong random secret |
| Statement token signing | `AQSTOQFLOW_STATEMENT_TOKEN_SECRET` | Independent purpose-specific strong random secret |
| Statement delivery encryption | `AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY` | Exactly 32 random bytes, base64 or 64 hex |
| Accountant invite encryption | `AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY` | Exactly 32 random bytes, base64 or 64 hex |
| Canonical public URL | `NEXT_PUBLIC_BASE_URL` | Approved HTTPS origin |

Live customer statement and accountant-invite delivery must also be explicitly enabled and backed by configured providers.

## Final release rule

Production remains **NO-GO** until every production-only or human gate above has authentic evidence bound to one unchanged clean commit and gate 017 returns GO. Development can proceed without waiting for those external events only within the previously authorized development scope.

## Verification run

| Verification | Result |
| --- | --- |
| Prisma schema validation | **PASS** |
| TypeScript typecheck | **PASS** |
| Focused release/transaction regressions | **PASS: 10 suites, 122 unique tests** |
| Inventory boundary fail mode | **PASS: 0 active violations** |
| Role cockpit fail mode | **PASS: 9/9** |
| Template JSON parsing | **PASS: 6/6** |
| Template hash manifest | **PASS: 6 files, 0 mismatches** |
| Template-manifest sidecar | **PASS: `641e49f731c71a2e914166699eeb8dd05a7232c559df60648d42db87a6923d48`** |
| Destructive packet bindings | **PASS: 27 files, 0 mismatches** |
| Destructive candidate freeze | **BLOCKED: rolling/dirty** |
| Enterprise blockers | **BLOCKED: 3 ready, 9 open** |
| Cameroon technical production gate | **BLOCKED: 11/12; expert approval missing** |
