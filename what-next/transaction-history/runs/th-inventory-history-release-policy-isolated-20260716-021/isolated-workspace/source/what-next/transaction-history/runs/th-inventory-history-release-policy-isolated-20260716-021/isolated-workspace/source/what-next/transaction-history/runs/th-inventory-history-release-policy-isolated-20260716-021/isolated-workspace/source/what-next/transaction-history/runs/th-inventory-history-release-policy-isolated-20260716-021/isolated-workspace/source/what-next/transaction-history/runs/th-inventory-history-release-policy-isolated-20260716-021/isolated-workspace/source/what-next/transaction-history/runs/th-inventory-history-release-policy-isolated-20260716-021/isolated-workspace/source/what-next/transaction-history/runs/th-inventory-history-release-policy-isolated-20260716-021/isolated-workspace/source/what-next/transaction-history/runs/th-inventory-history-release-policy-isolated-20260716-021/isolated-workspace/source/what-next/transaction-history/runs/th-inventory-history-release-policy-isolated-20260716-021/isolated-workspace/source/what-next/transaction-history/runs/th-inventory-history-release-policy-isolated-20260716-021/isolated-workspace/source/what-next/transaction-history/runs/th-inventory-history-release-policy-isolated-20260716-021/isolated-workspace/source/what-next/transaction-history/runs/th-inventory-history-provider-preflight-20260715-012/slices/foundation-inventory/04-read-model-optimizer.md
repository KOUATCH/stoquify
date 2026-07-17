# Stage 04 Provider and Worker Operational Preflight

## Run identity

| Field | Value |
| --- | --- |
| Run | `th-inventory-history-provider-preflight-20260715-012` |
| Trace | `1d378358-cf80-4c8b-8652-f0f2c1433583` |
| Slice | `foundation-inventory` |
| Mode | `implement` |
| Skill | `stoquify-transaction-history-04-read-model-optimizer` |
| Base and final HEAD | `8a406e93b0e798ed6f476ca5d81df37a2aaa38be` |
| Verdict | **BLOCKED** |
| Stage 05 eligible | **No** |

## Executive result

Run012 converts the run011 object-storage uncertainty into an executable, secret-redacted gate and then runs that gate against the configured UploadThing account. The static contract passes: `UPLOADTHING_TOKEN` is present, decodes to the installed v7 runtime shape, and identifies one configured region without exposing the token, API key, app ID, region name, object identity, or URL.

The live 4 KiB private canary fails at upload. The first diagnostic provider response stated that private files are unavailable for free apps and require a paid tier. No object was created. The final clean rerun emits only `PROVIDER_CANARY_UPLOAD_FAILED`, verifies idempotent cleanup, and writes no provider identifier or secret to the saved artifact.

This is a production-blocking capability mismatch: run011 correctly requires private objects, while the configured account cannot create them. Stage 04 cannot advance until the account is upgraded or another approved private object store implements the existing adapter contract. Public encrypted objects are not accepted as an enterprise substitute.

## Prerequisites and ownership

- Stage 02 security proof remains `PASS`: SHA-256 `6bb0621ad7701c5f9cd096acb7be5d9f6803921d0bb179319a69e4c599414739`.
- Stage 03 accounting control proof remains `PASS`: SHA-256 `db3e40670a12cb354359523bb832f371c12a998770facb4d458d1551cee7db93`.
- Run011 Stage 04 bounded-artifact evidence is `PARTIAL`: SHA-256 `6ba3e6cb4f3a465ff609667503280b7b4762ac44893c9e1b9202467e4d96ac48`.
- Stage 04 forbids route, UI and authentication-policy edits. Authenticated HTTP delivery remains a later delivery-stage responsibility.
- `package.json`, `.env.example`, the artifact adapter and worker script were evidence-only inputs because they already had worktree changes. Run012 did not overwrite them.

## Implemented preflight

The new `scripts/inventory-history-export-provider-preflight.js` provides:

- `static` mode for installed UploadThing token-shape validation;
- `live` mode for a random 4 KiB private upload, one-minute signed read, byte-integrity comparison and immediate custom-ID deletion;
- fail-closed handling for missing/invalid tokens, upload/read/integrity failures and unverifiable cleanup;
- deterministic blocker codes with no serialized provider errors;
- output confinement to the current workspace;
- SDK log level `None` so signed request metadata is not printed during provider failures;
- a redacted JSON evidence contract containing only booleans, counts, stable codes and duration.

The focused test suite proves argument bounds, token redaction, private ACL request, signed-read options, custom-ID cleanup, successful canary behavior, upload/read failure cleanup, deletion failure handling, free-tier private-ACL classification, SDK log suppression, and workspace-confined output.

## Live evidence

| Check | Result |
| --- | --- |
| Token present | `PASS` |
| Installed v7 token shape | `PASS` |
| Secret values serialized | `PASS`: none |
| Provider identifiers serialized | `PASS`: none |
| Private canary requested | `PASS` |
| Private upload | `FAIL`: configured provider account rejected the capability |
| Signed read | `NOT RUN`: upload did not create an object |
| Content integrity | `NOT RUN`: upload did not create an object |
| Cleanup verification | `PASS`: no residual custom-ID object found |

The sanitized machine result is saved at `logs/04-provider-preflight.json`. The initial diagnostic invocation allowed UploadThing's SDK logger to emit signed request metadata while revealing the free-tier limitation. No provider token was printed and no object was created. Run012 immediately disabled SDK logging, added a regression test for `logLevel: "None"`, and reran the probe cleanly. Only the clean redacted result is retained as an artifact.

## Configuration findings

1. The installed UploadThing runtime requires `UPLOADTHING_TOKEN`; the configured local token is present and structurally valid.
2. `.env` and `.env.example` still carry legacy `UPLOADTHING_SECRET` and `UPLOADTHING_APP_ID` names. The final preflight records `LEGACY_UPLOADTHING_VARIABLES_PRESENT` without values.
3. `.env.example` does not currently document `UPLOADTHING_TOKEN` or the tenant/worker scheduler inputs.
4. `package.json` has no production command binding for `scripts/inventory-history-export-worker.ts`.
5. Those two files were already dirty and explicitly excluded from this run; correcting them requires a conflict-free operational-binding run after the private-provider decision.

## Verification

| Command | Result |
| --- | --- |
| `node --check scripts/inventory-history-export-provider-preflight.js` | `PASS` |
| Focused preflight Jest suite | `PASS`: 10 tests |
| Complete inventory-history regression gate | `PASS`: 8 suites, 51 tests |
| ESLint on the two run012 files | `PASS` |
| `npm run typecheck` | `PASS` |
| Trailing-whitespace scan | `PASS`: no matches |
| Static token preflight | `PASS` with one legacy-variable warning |
| Live private provider canary | `FAIL`, exit code 1, cleanup verified |
| Orchestrator artifact validator | `PASS`: valid, zero errors, zero warnings |
| Orchestrator next-stage selector | `PASS`: no next stage; expected `STAGE_BLOCKED` |

## Changed files

- `scripts/inventory-history-export-provider-preflight.js`
- `scripts/__tests__/inventory-history-export-provider-preflight.test.js`
- run012 report, evidence, state and provider log under `what-next/transaction-history/runs/th-inventory-history-provider-preflight-20260715-012/`

No route, UI, service, schema, migration, package, environment template, authentication policy, accounting rule or worker implementation was changed.

## Blockers

1. **High - `PRIVATE_OBJECT_STORAGE_CAPABILITY_UNAVAILABLE`:** the configured UploadThing account cannot create the private objects required by run011.
2. **High - `OBJECT_STORAGE_CAPACITY_AND_GOVERNANCE_UNCERTIFIED`:** throughput, concurrency, lifecycle, cost, residency and contractual controls remain unproved even after private capability is resolved.
3. **Medium - `PRODUCTION_LIKE_PLAN_EVIDENCE_MISSING`:** representative analyzed PostgreSQL plans remain unavailable.
4. **Medium - `PRODUCTION_DELIVERY_BINDING_PENDING`:** worker process-manager/scheduler binding and later authenticated streaming delivery are not certified.
5. **Medium - `LEGACY_PROVIDER_CONFIGURATION_PRESENT`:** environment documentation still advertises legacy UploadThing variables and omits the v7 token/worker contract.
6. **Medium - `HISTORICAL_BALANCE_AUTHORITY_UNPROVEN`:** historical `balanceAfter` remains excluded until sequencing and backdating invariants are proved.
7. **Low - `V1_PILOT_JOB_DRAIN_REQUIRED`:** run009 schema-v1 pilot jobs must be drained before any production rollout.

## Verdict and next logical run

**Stage 04 is `BLOCKED`; Stage 05 is not eligible.** The next action requires an infrastructure decision:

1. Upgrade the configured UploadThing app to a tier that supports private objects, then rerun this exact live preflight.
2. Or approve a private S3-compatible, Azure Blob, R2 or equivalent store and implement it behind `InventoryHistoryExportArtifactStore`, preserving private ACLs, signed short-lived reads, deterministic idempotency, integrity verification and bounded deletion.

After private capability passes, run the 250,000-row provider load/concurrency/expiry certification and representative database plans. Do not weaken the artifact contract to public storage merely because ciphertext is application-encrypted.
