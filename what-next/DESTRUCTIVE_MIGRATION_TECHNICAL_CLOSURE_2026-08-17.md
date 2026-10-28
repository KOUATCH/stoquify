# Destructive migration technical closure — 2026-08-17

Decision: **LOCAL TECHNICAL CHARACTERIZATION COMPLETE; PRODUCTION BUNDLE BLOCKED**

This report closes the locally provable, synthetic-only technical analysis. It does not create a maker/checker approval, set `humanAuthored: true`, authorize a production migration, or prove the state of any existing production database.

## Candidate and live result

- Current branch: `codex/service-boundary-burndown`
- Current commit: `35b4cc6a06a50ee11de5bfce6b04993e38bd589a`
- Worktree: dirty; user-owned changes preserved
- Prisma schema SHA-256: `cdbc9c64e88d642f2bfc716ee4fda2e8b7dfbfc26f08a5170645311268ae8af9`
- Migration directories: `68`
- Scanner result at `2026-08-17T14:19:01.528Z`: `8/9`, `13` findings, `0` approvals
- Blocking invariant: `destructive_sql_is_exact_hash_approved`
- Evidence-bundle result at `2026-08-17T14:13:20.578Z`: `REJECTED_BLOCKED_EVIDENCE_INCOMPLETE`
- Database execution attempted by this run: `false`

## Frozen SQL identities

| Identity | SHA-256 |
|---|---|
| Raw migration file (24,674 bytes) | `f7de8dc7ace0a5e063cdb7ecd9527e77807b7f872e474546819e9fca13a273d4` |
| Canonical-LF migration | `2fde92f4ad0cbb1a2a517b12e71c38997dc4956c9d57d70ff1ae0c636ff2f191` |
| Destructive-operation inventory | `55d332c3319b65acfdf415e64042a15504d12861b664429af7e63155296e1ad1` |
| Current technical hash manifest | `041baa5567bbfa6102b4e9421c26797d5b7e908fcefd762127ffa7093d7d40d9` |
| Current risk-review packet | `fa5eba96f0a1cb699028581e0337d56e859f0da5bbea3d6f3d6e243ec1abd0fa` |
| Empty approval registry | `6d386babbd94bcc3eabbdae9ba493717bbe47a12aa769a6cf7ed23ff85fc2192` |

## Exact finding register

| ID | Rule / line | Object removed | Severity | Finding SHA-256 |
|---|---|---|---|---|
| D-001 | `drop_column` / 80 | `accounts.access_token` | HIGH | `4781af03745e807d47ccdc89b62f0562b923707465d36d215cbeaea3e3e164fb` |
| D-002 | `drop_column` / 81 | `accounts.expires_at` | HIGH | `277a312724a1c524d910f7c5966d70170825cf1d6a60679269b2388a6c9f3e55` |
| D-003 | `drop_column` / 82 | `accounts.id_token` | HIGH | `5807ad92f5163c0922dce2373dd15df9d064a28a61b1601e063a510448c52c13` |
| D-004 | `drop_column` / 83 | `accounts.provider` | CRITICAL | `fbc401c6980f7b01658bb2b2f3702c618e2378e92395b4caee631fd8d8bee2cb` |
| D-005 | `drop_column` / 84 | `accounts.providerAccountId` | CRITICAL | `b5d38ed4fd3e87f368f0948c54731873ffdbec440832c219a078af57364ec76b` |
| D-006 | `drop_column` / 85 | `accounts.refresh_token` | HIGH | `07a6cfdfae6507d5572505bc8a0505c74d4f0f1b496f0864b1e2d4e537ce1492` |
| D-007 | `drop_column` / 86 | `accounts.session_state` | HIGH | `6ad18571cee52ce1386eacb37d9b18e40c4d6ffbb3b3166de4ffe4710df83988` |
| D-008 | `drop_column` / 87 | `accounts.token_type` | HIGH | `42bf676feeb19705c6bd4a57cf83ac0f99d8cbb830b46cd42b1f980243a31165` |
| D-009 | `drop_column` / 88 | `accounts.type` | HIGH | `5f168672b10fcdcbe1af94b0da9d9ead18688f6254a326c146ccb1aecda6d9de` |
| D-010 | `drop_column` / 101 | `sessions.expires` | CRITICAL | `8f4f2215000c21bc293358a28c8c4f8df6b90abdbc7c5200cb0b4e7d814807b9` |
| D-011 | `drop_column` / 102 | `sessions.sessionToken` | CRITICAL | `ec44f20e8dd677d05d2303eef1758a22bebb08077983362349f6d9c5e4fd9178` |
| D-012 | `drop_column` / 112 | `users.emailVerified` | CRITICAL | `4b1479492af21a9dd97c0a5212afe7c7383b8cd3b31045310e8ab0e0143bc95d` |
| D-013 | `drop_table` / 116 | `auth_sessions` | CRITICAL | `69294f51328a0a7575cff0524e5196accf0159913177b11dd249b65e554295fe` |

## R2 evidence reconciliation

The isolated R2 replay is valid development evidence: target verification passed; 67/67 migrations completed on both synthetic schemas; the original raw constraint-name comparison produced a false negative; the corrected read-only comparator normalized only PostgreSQL-generated OID-dependent `*_not_null` names and matched canonical columns, constraints, and indexes; the partial original restore schema remained preserved; and no public-schema or real customer/payment data was used.

The R2 evidence is not production-target evidence. It does not prove whether the destructive columns/tables contain data in an existing deployment, nor does it prove a resolve-only adoption path, production backup, restore, authentication continuity, or rollback ownership.

## Production bundle state

| Bundle item | Current state | Exact remaining proof |
|---|---|---|
| R-01 environment census | `REQUIRES_QUALIFIED_HUMAN_REVIEW` | Production target identity, owner, row counts, migration history, and approved capture |
| R-02 affected-data profile | `BLOCKED_EXTERNAL_CONFIGURATION` | Read-only counts/classification for all 13 affected objects on the intended target |
| R-03 empty-baseline rehearsal | `PASS_WITH_LIMITATIONS` | R2 synthetic replay exists; bind it to a clean candidate manifest |
| R-04 existing-DB resolve rehearsal | `BLOCKED_EXTERNAL_CONFIGURATION` | Rehearsed resolve/adoption path on a production-shaped clone |
| R-05 reconciliation | `PASS_WITH_LIMITATIONS` | Synthetic canonical fingerprints match; target-specific row/business reconciliation absent |
| R-06 auth regression | `BLOCKED_TECHNICAL` | Fresh sign-in, session continuity, revocation, step-up, and recovery proof on rehearsed path |
| B-01 backup manifest | `BLOCKED_EXTERNAL_CONFIGURATION` | Encrypted target backup identity, digest, retention, access, and owner |
| B-02 restore test | `BLOCKED_EXTERNAL_CONFIGURATION` | Successful restore of that exact backup plus reconciliation |
| B-03 recovery runbook | `PASS_WITH_LIMITATIONS` | Candidate/target-specific commands, abort criteria, owners, and prior compatible artifact |
| B-04 failure injection | `NOT_TESTED` | Interrupted migration and failed-auth recovery exercise |
| B-05 metadata recovery | `NOT_TESTED` | Rehearsed Prisma resolve/metadata repair and drift recheck |
| A-01 maker attestation | `REQUIRES_QUALIFIED_HUMAN_REVIEW` | Post-freeze signed identity/MFA evidence bound to the final manifest |
| A-02 checker decision | `REQUIRES_QUALIFIED_HUMAN_REVIEW` | Independent post-maker hash verification and signed decision |
| A-03 registry approvals | `REQUIRES_QUALIFIED_HUMAN_REVIEW` | Thirteen manually authored version-2 entries after checker approval |

## Why the gate cannot be technically promoted yet

The current packet binds six files whose hashes changed after the 2026-08-13 packet, and the evidence manifest binds an older Prisma schema hash. A dirty, changing candidate cannot be safely re-hashed into a production approval packet. Regenerating those hashes now would only make another transient manifest.

## Exact closure sequence

1. Finish and review current development changes, then create a clean immutable release candidate.
2. Run a target-specific read-only census and affected-data profile.
3. Select `EMPTY_TARGET_EXECUTE` only for a verified-empty target; otherwise rehearse the additive/resolve-only adoption path on a production-shaped clone.
4. Produce the exact backup manifest and restore rehearsal, then run authentication continuity and failure-injection tests.
5. Regenerate the packet, evidence manifest, schema hash, all bound-file hashes, and operation inventory from that candidate.
6. Obtain SANGO MALO's signed maker attestation after the final evidence timestamp.
7. Obtain MAXIMILLIANO BONGA's independent signed checker decision after the maker attestation; enforce that the checker is not the migration operator.
8. Only after an `APPROVE_EXACT_HASH` decision, manually enter the 13 approvals and rerun both evidence and migration safety gates.

Final condition: **REJECTED for production; PASS_WITH_LIMITATIONS for isolated synthetic development evidence.**
