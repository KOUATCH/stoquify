# AQSTOQFLOW Skill 014 — Offline POS Sync Architect/Builder Execution Report

Date: 2026-07-27  
Primary skill: `014-aqstoqflow-offline-pos-sync-architect-builder`  
Parent assurance skill: `014-aqstoqflow-offline-pos-sync`

## Outcome

The offline POS synchronization slice is development-ready and passes its fail-mode
release gate. The implementation preserves the server-authoritative accounting,
inventory, cash, receipt, and fiscal boundaries: offline clients record immutable
provisional events, while the server performs validated, exact-once replay through
the existing POS sale finalization path.

The slice may advance to Skill 015. This result is not a country-pack, fiscal
authority, hardware, connectivity, or production deployment certification.

## Architecture decision

The accepted design is an append-only device event stream with:

- tenant, location, terminal, device, user, and active cashier-session scope;
- deterministic per-device sequence and hash-chain validation;
- optional public-key enrollment with mandatory cryptographic signature
  verification for enrolled devices;
- immutable accepted-event evidence followed by `PENDING_REPLAY`;
- quarantine and operator-visible conflicts instead of unsafe automatic repair;
- exact-once replay through the canonical `commitPOSSale` boundary;
- provisional offline receipts only, followed by authoritative server receipt and
  fiscal evidence after replay;
- explicit policy expiry and reference-snapshot freshness controls;
- stable, machine-readable action outcomes and error codes.

Legacy devices that do not yet have an enrolled signing key remain visibly marked
`LEGACY_UNVERIFIED`. New or migrated key-enrolled devices are signature-enforced.
Production rollout should require enrollment rather than treating legacy mode as
cryptographically certified.

## Implemented changes

### Persistence and migration

- Extended `POSOfflineDevice` with canonical signing public key, policy/reference
  snapshot hashes, and policy expiry.
- Added the `OFFLINE_POLICY_EXPIRED` conflict type.
- Added the missing durable Prisma migration for all offline POS tables, enums,
  indexes, uniqueness constraints, foreign keys, and new device trust fields:
  `prisma/migrations/20260727110000_offline_pos_sync_foundation/migration.sql`.
- Validated the Prisma schema and regenerated the Prisma client.

The migration was created in source control but was not applied to any production
database.

### Trust and replay enforcement

- Canonicalizes enrolled public keys and derives their SHA-256 fingerprints.
- Verifies event signatures over the deterministic entry hash.
- Rejects economic event envelopes without an active, correctly scoped POS session.
- Quarantines expired device policy, policy-hash mismatch, stale reference
  snapshots, invalid signatures, sequence conflicts, and hash conflicts.
- Retains replay revalidation and canonical sale finalization.

### API and operator experience

- Added a backward-compatible `ok` discriminant to offline sync actions.
- Added stable offline sync error codes while retaining the existing protected
  action response fields.
- Added expired-policy visibility to the offline sync status strip and dashboard
  blocker count.

### Assurance

The static fail-mode gate was expanded from 10 to 16 checks. New checks cover:

- durable schema migration;
- active cashier-session scope;
- cryptographic device signature verification;
- policy expiry and reference-snapshot quarantine;
- stable action discriminants;
- operator-visible expired policy.

## Verification evidence

- Focused regression bundle: 4 suites passed, 33 tests passed.
- TypeScript: `npx tsc --noEmit --pretty false` passed.
- Prisma validation: passed.
- Targeted ESLint for modified Skill 014 files: passed.
- Inventory boundary fail-mode gate: passed with zero active violations.
- Offline POS fiscal replay gate: 16/16 ready, zero blockers.
- Production-only placeholder/mock scan: no findings.
- `git diff --check`: passed.

Machine-readable and human-readable gate evidence:

- `what-next/offline-pos-fiscal-replay-readiness.json`
- `what-next/offline-pos-fiscal-replay-readiness.md`

## Certification boundary and rollout requirements

Before production activation, operations must:

1. Apply the migration through the controlled deployment process.
2. Enroll and securely distribute a signing key for every permitted offline device.
3. Remove or explicitly prohibit `LEGACY_UNVERIFIED` devices from production
   offline operation.
4. Provision signed policy and reference snapshots with monitored expiry.
5. Exercise device revocation, key rotation, conflict resolution, replay recovery,
   and reconnect behavior against representative hardware and network conditions.
6. Complete country-specific receipt/fiscal authority validation independently.

These are deployment and external-certification activities. They do not block
continued platform development or progression to Skill 015.

## Final decision

**Development gate: READY**  
**Skill 014 checks: 16/16 ready; 0 blockers**  
**Advance to Skill 015: YES**  
**Production certification: NOT CLAIMED**
