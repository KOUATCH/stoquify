# Destructive migration production-approval direct-fill packet

Status: **TEMPLATE_NOT_EVIDENCE**

Organization: `Stoquify`

Migration: `prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql`

This folder contains the live 13-finding inventory, named maker/checker forms, 13 disabled approval-registry entries, and a production restore-evidence form. It does not create an approval, prove a production restore, or authorize execution.

Cross-gate status and the ordered closure procedure are recorded in `../PRODUCTION_BLOCKER_CLOSURE_REGISTER_20260817.md`.

## Current technical identity

- Gate/canonical-LF migration SHA-256: `2fde92f4ad0cbb1a2a517b12e71c38997dc4956c9d57d70ff1ae0c636ff2f191`
- Raw migration-file SHA-256: `f7de8dc7ace0a5e063cdb7ecd9527e77807b7f872e474546819e9fca13a273d4`
- Destructive inventory SHA-256: `55d332c3319b65acfdf415e64042a15504d12861b664429af7e63155296e1ad1`
- Current Prisma schema SHA-256: `cdbc9c64e88d642f2bfc716ee4fda2e8b7dfbfc26f08a5170645311268ae8af9`
- Approval registry SHA-256: `6d386babbd94bcc3eabbdae9ba493717bbe47a12aa769a6cf7ed23ff85fc2192`
- Current approvals: `0/13`
- Observed commit/tree: `35b4cc6a06a50ee11de5bfce6b04993e38bd589a` / `7efce91d5ba871e91470f60ed3b53833a1c3b4b4`
- Candidate state: `DIRTY_NOT_FREEZEABLE_FOR_PRODUCTION_APPROVAL`
- Rolling packet bindings: `27/27` files match
- Rolling evidence-manifest SHA-256: `37c4b416c2e58609866770bef995f85ec35839ecd8b0c497e760487b52a41911`
- Completed production artifacts: `0/14`

## Completion order

1. Freeze a clean candidate and regenerate the inventory.
2. Complete production target census and choose `EMPTY_TARGET_EXECUTE` or `EXISTING_TARGET_RESOLVE_ONLY`.
3. Capture an encrypted backup/snapshot, restore it into a different isolated production-like target, and complete `05-production-restore-evidence.json`.
4. Prove aggregate-only data reconciliation, migration history, schema fingerprint, authentication, failure rollback, fix-forward, RPO/RTO and secure disposal.
5. Freeze and hash the final evidence manifest.
6. SANGO MALO completes and signs `02-maker-attestation.json` with fresh-auth proof.
7. MAXIMILLIANO BONGA independently verifies and signs `03-checker-decision.json` with a later timestamp.
8. Only after `APPROVE_EXACT_HASH`, the checker manually converts the 13 disabled entries in `04-proposed-approval-registry-entries.json` into registry entries.
9. Rerun the evidence and migration-safety gates from the unchanged clean candidate.

Do not reuse the previously supplied `2026-08-17T08:00:00Z` maker/checker timestamps: they predate the final evidence bundle and cannot attest to it. The supplied `localhost / stoquify_dev_migrated_20260814` target is development evidence only; production restore proof must identify a separately authorized production backup and isolated restore target using redacted identifiers.

Accepted signature proof is a verified detached cryptographic signature or an immutable enterprise approval record containing authenticated identity, MFA/step-up proof, artifact SHA-256, decision, and UTC timestamp. A typed name is not signature proof.

Do not record database URLs, passwords, tokens, customer/payment data, PAN, CVV, PIN, or raw session/token values.
