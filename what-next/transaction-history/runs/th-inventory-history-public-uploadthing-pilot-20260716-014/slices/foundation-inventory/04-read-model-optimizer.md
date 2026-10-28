# Stage 04 Public UploadThing Pilot Exception

| Field | Value |
| --- | --- |
| Run | `th-inventory-history-public-uploadthing-pilot-20260716-014` |
| Date | `2026-07-16` |
| Skill | `stoquify-transaction-history-04-read-model-optimizer` |
| Scope | Inventory transaction-history background export artifacts |
| Decision | Temporarily permit UploadThing `public-read` storage for encrypted export chunks only |
| Verdict | `READY_FOR_PILOT_WITH_PUBLIC_STORAGE_EXCEPTION` |

## Executive Summary

The private UploadThing path remains the finance-grade target, but the user explicitly approved a temporary public UploadThing pilot until go-live funding is available for private files. This run therefore progressed Stage 04 by adding an explicit `public-pilot` mode rather than silently weakening the default.

The implementation keeps the default storage ACL private. Public storage must be selected deliberately through the artifact-store option or `STOQUIFY_INVENTORY_HISTORY_EXPORT_STORAGE_ACL=public-pilot`. Even in public-pilot mode, uploaded chunks are encrypted ciphertext only, tenant and export identifiers are hashed out of object IDs, reads verify byte length and SHA-256 ciphertext hash, and cleanup remains bounded by deterministic custom IDs.

## Code Changes

- `scripts/inventory-history-export-provider-preflight.js`
  - Added `--mode public-pilot`.
  - Uploads a 4 KiB `public-read` canary, reads it through the public URL, verifies byte integrity, deletes by custom ID, and records `PUBLIC_UPLOADTHING_STORAGE_PILOT`.
  - Keeps `live` mode private by default.

- `services/inventory/inventory-history-export-artifact-store.ts`
  - Added explicit storage ACL selection: `private` or `public-pilot`.
  - Default remains `private`.
  - Public-pilot upload uses `public-read`, stores `publicReadUrl`, and still validates ciphertext length and hash on read.

- `services/inventory/inventory-history-background-export.service.ts`
  - Preserves `storageAcl` and `publicReadUrl` in artifact payload parsing so public-pilot downloads can read stored chunks.

- Focused tests were updated for private default behavior, public-pilot opt-in behavior, public canary behavior, and encrypted artifact verification.

## Live Provider Evidence

Saved JSON evidence:

- `what-next/transaction-history/runs/th-inventory-history-public-uploadthing-pilot-20260716-014/logs/04-provider-public-pilot-preflight.json`

Observed result:

- Status: `ready`
- UploadThing token present: `true`
- UploadThing token structurally valid: `true`
- Public-pilot upload: `ready`
- Public-pilot read: `ready`
- Canary integrity: `ready`
- Canary cleanup: `ready`
- Secret printed: `false`
- Provider identifier printed: `false`
- Warnings:
  - `LEGACY_UPLOADTHING_VARIABLES_PRESENT`
  - `PUBLIC_UPLOADTHING_STORAGE_PILOT`

The live command also emitted UploadThing SDK deprecation warnings about legacy file URL aliases. The saved JSON report remained redacted and did not include secret or provider identifiers.

## Verification

Commands run:

```powershell
npm test -- scripts/__tests__/inventory-history-export-provider-preflight.test.js services/inventory/__tests__/inventory-history-export-artifact-store.test.ts --runInBand
```

Result:

- `2` test suites passed
- `19` tests passed

```powershell
npm run typecheck
```

Result:

- Passed

```powershell
node --env-file=.env scripts/inventory-history-export-provider-preflight.js --mode public-pilot --json-out what-next/transaction-history/runs/th-inventory-history-public-uploadthing-pilot-20260716-014/logs/04-provider-public-pilot-preflight.json
```

Result:

- Passed with public-pilot warning
- 4 KiB canary uploaded, read, verified, and deleted

## Remaining Risks

This is not the final finance-grade storage posture. Public URLs can be copied, retained in logs, cached, or accessed without server-side authorization. The current mitigation is that export artifact payloads are encrypted before upload, downloads still require the Stoquify download grant and data key, and expired jobs crypto-shred the wrapped key. That is acceptable for a pilot only.

Before go-live, replace this exception with private object storage:

1. Upgrade UploadThing to private files and rerun `--mode live`, or approve S3/R2/Azure private storage.
2. Remove `STOQUIFY_INVENTORY_HISTORY_EXPORT_STORAGE_ACL=public-pilot` from production-like environments.
3. Confirm new exports store private artifacts and signed reads pass.
4. Expire and delete any public-pilot artifacts.

## Next Logical Step

Continue Stage 04 implementation against the now-unblocked artifact-storage pilot path, then run the orchestrator selector/validator. The pilot can proceed, but release review must keep this public-storage exception as a go-live blocker.
