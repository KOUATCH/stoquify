# Exact-hash destructive migration approval — technical fields completed

Packet: `STOQUIFY-POS-PROD-GATE-20260817-01`

Evidence re-evaluated: 2026-08-17T16:11:10Z

Final condition: **REJECTED FOR PRODUCTION APPROVAL**

## Supplied DOCX signature assessment

The signature-labelled plaintext values in `docs/Compliance/Complaince authorization validation.docx` do not constitute maker/checker evidence: the package has no digital-signature part, certificate, image/ink signature, fresh-authentication record or binding to the exact migration/evidence hashes below. The values were not copied and must be rotated if used anywhere. The maker and checker completion status remains unchanged. Validation evidence: `docs/pos-enterprise-grade-audit/evidence/migration-certification/2026-08-17/compliance-authorization-document-validation.json`.

Development G0 is separately **PASSED** for the isolated, synthetic-only schemas. This document is technical review evidence, not a maker signature, checker signature, legal approval, fiscal certification, or production authorization.

## Approved scope supplied by the requester

- Organization: `Stoquify`
- Requested release scope: `Production + statutory`
- Certification environment: `localhost / 5432 / stoquify_dev_migrated_20260814`
- Final target schema: `codex_pos_commit_result_cert_20260817`
- Fresh restore schema: `codex_pos_commit_result_restore_20260817_r2`
- Preserved partial restore schema: `codex_pos_commit_result_restore_20260817`
- Requested decision: `CONDITIONALLY_APPROVED_EMPTY_TARGET_EXECUTE`
- Migration operator: `SANGO MALO — Database administrator / engineering lead`
- Independent checker named: `MAXIMILLIANO BONGA — Database administrator / engineering lead`
- Original repository migration modification: `NO`
- Public-schema application-data access or mutation during certification: `NO`
- Real customer or payment data during certification: `NO`

The supplied `2026-08-17T08:00:00Z` operator and checker timestamps predate the replay and final evidence generated between 10:51Z and 11:43Z. They cannot prove review of the final evidence bundle. Both people must sign again after the final bundle is frozen and hashed.

## Current exact hashes

The project deliberately has two migration hashes. The approval registry uses the canonical-LF hash. The older maker-checker packet binds the raw file-byte hash.

| Artifact | SHA-256 | Use/status |
|---|---|---|
| Canonical-LF migration SQL | `2fde92f4ad0cbb1a2a517b12e71c38997dc4956c9d57d70ff1ae0c636ff2f191` | Use in each `prisma/migration-risk-approvals.json` entry |
| Raw migration file, 24,674 bytes | `f7de8dc7ace0a5e063cdb7ecd9527e77807b7f872e474546819e9fca13a273d4` | Bound by the 2026-08-13 maker-checker packet |
| Destructive-operation inventory | `55d332c3319b65acfdf415e64042a15504d12861b664429af7e63155296e1ad1` | Binds D-001 through D-013 operation hashes |
| Refreshed maker-checker packet JSON | `ca401617bd7449a1d5d0df419370d3ff0566b812cb19f911250ce7c01a322413` | Live rolling-development packet; 27 bound files currently match |
| Refreshed evidence-manifest file | `37c4b416c2e58609866770bef995f85ec35839ecd8b0c497e760487b52a41911` | Manifest structure and supporting bindings pass; artifacts remain templates |
| Development technical hash manifest | `956fc6789101b39c57c6cad00e0a237f309c7557cd0fe8b6c76fcd1b7712f66d` | Binds the synthetic R2 certification evidence |
| Current Prisma schema | `cdbc9c64e88d642f2bfc716ee4fda2e8b7dfbfc26f08a5170645311268ae8af9` | Matches the refreshed evidence-manifest binding |
| Risk-review packet | `fa5eba96f0a1cb699028581e0337d56e859f0da5bbea3d6f3d6e243ec1abd0fa` | Contains the live 13 finding hashes |
| Empty approval registry | `6d386babbd94bcc3eabbdae9ba493717bbe47a12aa769a6cf7ed23ff85fc2192` | Version 2; zero approvals |

The evidence-bundle gate now reports `27/27` bound files matching and no supporting-evidence hash mismatch. This closes the stale-binding defect only. The packet is deliberately marked `DEVELOPMENT_ROLLING`, was refreshed from a dirty tree, and has `0/14` completed production artifacts, so it is not a production approval packet.

## Replay and restore evidence hashes

| Evidence | SHA-256 | Result |
|---|---|---|
| R2 target verification | `15d2b01dffffea239841c65cbff91eec20325f60c99a3f58ade0f0dc7ad8319c` | PASS: target empty; R2 restore absent/empty; no public data or real data used |
| R2 migration history before | `1ad0fc48f66ea29845f3f168e3d0adf511b3d7980cfcde27198c564823417d78` | PASS: no target migration rows before replay |
| R2 migration history after | `5cda1d63f324057b137aee82c54a1b2968509304d3f16025686d58eba26e5069` | PASS: 67/67 migrations finished |
| Original replay comparison | `a0796eb9fcc9d3744deb2c32d4a60583c8b070981bedc089375b8000c0684f89` | SUPERSEDED FALSE NEGATIVE: equal counts but raw constraint-name hashes differed |
| Corrected read-only fingerprint reassessment | `c593b8c7aedd8202e0713cc5944a33f4fe20b0ec31306007ba2916f74272d441` | PASS: canonical restore and target hashes match |
| Post-execution boundary verification | `fc075fe4dc040401165774357289f2449fa3c2d8ec5f1bd7a29ae7df284cb86c` | PASS: final/R2 complete; original partial restore preserved |
| Schema-rebound projection manifest | `4eb7eb68d3fb8b11f5c6c3c0fa842605886ef60998cde8e5557474a833a4a92e` | Development-only projection evidence |
| Authenticated EN/FR Edge report | `fcb109ac5e434c032846cbb3b133b7c8615dc09df923b26caaaa83738c596036` | PASS for synthetic development pilot |
| G0 final report | `ec4d30dd91798fe0c828e1acdfd4e65147580bb96edcf1788064429a74046de5` | Development PASS; production/statutory BLOCKED |
| G0 machine evidence | `1aa862367a92e188b1fb41f84dc86e213f573c05fcf1dcf6cf4af3dae6f1ac35` | Machine-readable development result |

The corrected comparator normalizes only PostgreSQL-generated OID-dependent `*_not_null` names. It retains column definitions and stable CHECK, foreign-key, unique, primary-key, and index identities. It reports matching component hashes: columns `8613c74823462866fa15356d8167836adcf71a044d2dbe960bae615c2cf7f6e0`, constraints `59e4e0c56aae7505aa2d83176b04a2f2f127e282e5080685a5f8533e05e561fb`, and indexes `c99c46a01a237d615bc617939136e7393333fb1000676a86b2835770c6724feb`.

## Exact 13 destructive operations and release classification

Severity below is the proposed production review classification. `Rule` and `finding SHA-256` are the values enforced by the repository gate. Any non-empty existing production database must not execute this baseline migration; it must use the separately rehearsed resolve-only adoption path after schema and data verification.

| ID | Line | Rule | Severity | Canonical operation | Operation SHA-256 | Gate finding SHA-256 | Required treatment |
|---|---:|---|---|---|---|---|---|
| D-001 | 80 | `drop_column` | HIGH | `ALTER TABLE "accounts" DROP COLUMN "access_token"` | `5f9f80a6ef931e002134e4e2aa220ea9acf22c3c2134496e0671affe147988c0` | `4781af03745e807d47ccdc89b62f0562b923707465d36d215cbeaea3e3e164fb` | Prove zero rows or preserve/map token data; validate reauthentication and recovery |
| D-002 | 81 | `drop_column` | HIGH | `ALTER TABLE "accounts" DROP COLUMN "expires_at"` | `b7eab3bc9315a06e40938ff57ded5c5431ed2222fe68dd09b3f587aa7c69090f` | `277a312724a1c524d910f7c5966d70170825cf1d6a60679269b2388a6c9f3e55` | Prove zero rows or define integer-to-timestamp conversion and reconciliation |
| D-003 | 82 | `drop_column` | HIGH | `ALTER TABLE "accounts" DROP COLUMN "id_token"` | `9617601b5fa48b23905e69ab0709e24ac42a9aeac346621a19f4af0d4fa46889` | `5807ad92f5163c0922dce2373dd15df9d064a28a61b1601e063a510448c52c13` | Prove zero rows or preserve/map OIDC token data |
| D-004 | 83 | `drop_column` | CRITICAL | `ALTER TABLE "accounts" DROP COLUMN "provider"` | `8b5c158498132b69a3f1d9ee8fb82ccc46676000e296d6beead2cf6356a8b26d` | `fbc401c6980f7b01658bb2b2f3702c618e2378e92395b4caee631fd8d8bee2cb` | Prove zero rows or map provider identity without collisions before making `providerId` required |
| D-005 | 84 | `drop_column` | CRITICAL | `ALTER TABLE "accounts" DROP COLUMN "providerAccountId"` | `4e87e6a7aa428e2c1ff064889c6b7c140a9e458bbf99ca558d7fe461ad111252` | `b5d38ed4fd3e87f368f0948c54731873ffdbec440832c219a078af57364ec76b` | Prove zero rows or map provider subjects and verify uniqueness/collisions |
| D-006 | 85 | `drop_column` | HIGH | `ALTER TABLE "accounts" DROP COLUMN "refresh_token"` | `eb731b37536517b7ff029fb4029e0413b15b95911de15c47d49adee177966cfc` | `07a6cfdfae6507d5572505bc8a0505c74d4f0f1b496f0864b1e2d4e537ce1492` | Prove zero rows or preserve/map refresh tokens and test refresh behavior |
| D-007 | 86 | `drop_column` | HIGH | `ALTER TABLE "accounts" DROP COLUMN "session_state"` | `d78e048f5e398174730608db403aac86b2e829c97c731ef3e872a88683db3b82` | `6ad18571cee52ce1386eacb37d9b18e40c4d6ffbb3b3166de4ffe4710df83988` | Record retention/deletion decision and prove no required consumer or audit use |
| D-008 | 87 | `drop_column` | HIGH | `ALTER TABLE "accounts" DROP COLUMN "token_type"` | `0f20190067a5fe024673fb1985a6d656ac380dca7266d2469ade5831a37a1f3b` | `42bf676feeb19705c6bd4a57cf83ac0f99d8cbb830b46cd42b1f980243a31165` | Record retention/deletion decision and provider compatibility evidence |
| D-009 | 88 | `drop_column` | HIGH | `ALTER TABLE "accounts" DROP COLUMN "type"` | `d57e56dd40511f3240b0efd4eeeb8483d2589e5bef799c7d1fd458a0c8b3a8d6` | `5f168672b10fcdcbe1af94b0da9d9ead18688f6254a326c146ccb1aecda6d9de` | Record classification mapping or intentional deletion evidence |
| D-010 | 101 | `drop_column` | CRITICAL | `ALTER TABLE "sessions" DROP COLUMN "expires"` | `84c1f1c438a50d09814575e756f95e636c4d0cbd0b7814eecb622e500bd31a95` | `8f4f2215000c21bc293358a28c8c4f8df6b90abdbc7c5200cb0b4e7d814807b9` | Prove zero rows or map expiry accurately and test active-session continuity/revocation |
| D-011 | 102 | `drop_column` | CRITICAL | `ALTER TABLE "sessions" DROP COLUMN "sessionToken"` | `eba142f101ee62145d06759f392bea86a325dade07838aeff2d52be93ac73076` | `ec44f20e8dd677d05d2303eef1758a22bebb08077983362349f6d9c5e4fd9178` | Prove zero rows or preserve/map unique tokens; test sign-in, revocation, and step-up |
| D-012 | 112 | `drop_column` | CRITICAL | `ALTER TABLE "users" DROP COLUMN "emailVerified"` | `6ee6d1bbaa68a1cba355923e93db7f5489648b2dbe4d3685a0c865d1c36f7d88` | `4b1479492af21a9dd97c0a5212afe7c7383b8cd3b31045310e8ab0e0143bc95d` | Prove zero rows or map timestamp/null truth to Boolean without resetting verified users |
| D-013 | 116 | `drop_table` | CRITICAL | `DROP TABLE "auth_sessions"` | `0f5eb881cca0bd115195a7aa7f27045beb5d02b8d6dde09684cc190c3a5df3bd` | `69294f51328a0a7575cff0524e5196accf0159913177b11dd249b65e554295fe` | Prove zero rows or archive/retain security provenance and test recovery |

Recovery is not a down migration. The reviewed treatment must identify the encrypted snapshot/backup, a successful restore rehearsal, the prior compatible application artifact, stop conditions, and a fix-forward plan. Financial or audit records must never be repaired by deletion.

## Maker and checker completion

Current maker artifact: `TEMPLATE_NOT_EVIDENCE`. Current checker artifact: `TEMPLATE_NOT_EVIDENCE`. The approval registry contains `0/13` entries.

Required sequence:

1. Freeze a clean release-candidate commit and regenerate the risk-review packet.
2. Complete the bundle-local environment census, zero-row or affected-data profile, replay/resolve-path record, reconciliation, auth regression, backup manifest, restore proof, recovery runbook, failure injection, and metadata-recovery/path-selection evidence.
3. Regenerate `evidence-manifest.json` with the final file hashes and current Prisma schema hash. Do not change any bound file after this point.
4. SANGO MALO reviews the final manifest, fills `maker-attestation.json`, records a new UTC timestamp later than the evidence, and adds an independently verifiable signature or immutable SSO/MFA approval record.
5. MAXIMILLIANO BONGA independently verifies every bound hash, declares no conflict and that he is not the execution operator, fills `checker-decision.json`, records a later UTC timestamp, and signs that exact file/evidence-bundle hash.
6. Only if the checker decision is `APPROVE_EXACT_HASH`, the checker manually authors 13 separate version-2 approval entries—one per gate finding SHA-256. No template or generator may assert `humanAuthored: true` for the checker.
7. Run the evidence gate and migration safety gate. Both must pass from the frozen commit before the final condition may become `CLEARED`.

Acceptable signature proof is either a detached cryptographic signature whose public-key owner is verified, or an immutable enterprise approval record showing the authenticated identity, MFA/step-up event, artifact SHA-256, decision, and timestamp. A typed name alone is not signature proof.

Each manually authored registry entry must have this shape:

```json
{
  "migration": "prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql",
  "migrationSha256": "2fde92f4ad0cbb1a2a517b12e71c38997dc4956c9d57d70ff1ae0c636ff2f191",
  "findingSha256": "<one exact value from the table above>",
  "rule": "<drop_column or drop_table>",
  "humanAuthored": true,
  "consequenceAcknowledged": true,
  "approvedBy": "MAXIMILLIANO BONGA",
  "reviewerRole": "Database administrator / engineering lead",
  "reason": "<target-specific rationale referencing the final evidence-bundle SHA-256, recovery evidence, and selected execution/adoption path>",
  "approvedAt": "<actual UTC timestamp after final review>",
  "expiresAt": null,
  "revocation": null
}
```

## Current gate result

- Live migration scanner: `8/9` checks ready; `13` findings; `0` approved; blocker `destructive_sql_is_exact_hash_approved`.
- Destructive evidence bundle: `REJECTED_BLOCKED_EVIDENCE_INCOMPLETE`.
- Packet bindings: passed for the rolling-development packet; `27` files bound and `0` mismatches.
- Evidence manifest structure: passed with current Prisma schema hash and `0` supporting-evidence mismatches.
- Candidate freeze: blocked because mode is `DEVELOPMENT_ROLLING`, the bindings were refreshed from a dirty source tree, and the live source tree remains dirty.
- Completed production bundle artifacts: `0/14`; R2 evidence is classified as development/synthetic supporting evidence only.
- Maker signature: missing.
- Checker signature and decision: missing.
- Production execution authorized by evidence gate: `false`.

The condition may move to `CONDITIONAL` only after the technical bundle is complete and hash-stable. It may move to `CLEARED` only after independent signed approval, 13 valid registry entries, passing evidence/safety gates, and a production-target-specific deployment preflight. The supplied production/statutory authorization remains requested but unproven until those controls pass.
