# Sales to accounting development result

Date: 8 November 2026. Source revision: `80e4abb283216b9f8e04b94e5020393f7dcabf62` plus the existing working tree and the owned changes below. Customer discovery is deferred at the user's request; this continuation focuses on engineering evidence.

## Result

The selected synthetic service chain now has combined real PostgreSQL proof: mixed cash/credit POS sale, later bank-evidence collection, independent settlement reversal, customer-ledger/control-account/receivable tie-out, idempotent retries and downstream close invalidation. A separate inconsistency in reconciliation current-proof reporting was reproduced and corrected.

This is a bounded engineering result. It does not mark the retention programme, production release, deployed browser journey, statutory coverage or live-provider integration complete.

## Owned changes

- `services/reconciliation/payment-close-evidence.service.ts`: require the reconciliation run ID and certificate hash to match the already-validated account coverage before reporting a positive current signature. Existing status, date and cutoff rules remain. Invalid signatures become pending and lose positive signature fields. Account-level blockers remain independent.
- `services/reconciliation/__tests__/payment-close-evidence.service.test.ts`: cross-module mocked regressions for stale source evidence, tampered/missing certificates, uncovered runs, mismatched hashes, voided runs and the valid uncapped population.
- `services/pos/__tests__/pos-full-commit.postgres.test.ts`: one combined real-database scenario using actual sale, stock, collection, reversal, trial-balance, ledger and close-invalidation services. The test isolates the authentication bootstrap constants and supplies synthetic trusted control claims; it does not prove deployed session authentication.
- This evidence folder: guarded fresh-target runner, provenance, sanitized logs/results and this result. The private generated client/datamodel files are retained under the recorded `.codex-tmp` directory. No unrelated working-tree changes were reverted or staged.

## Corrected defect

Previously the close collector treated a SIGNED status plus signature timestamp as enough to count positive signed evidence. The nested account-coverage reader also checked payload/hash integrity and current source evidence. A stale certificate could therefore be counted as signed while coverage correctly rejected it. Six newly added mocked regressions failed before the fix.

The collector now reuses the validated account coverage IDs and hashes. It cannot promote stale, missing, tampered or uncovered proof merely from the stored status. This corrects inconsistent reporting; the review did not establish that the old inconsistency bypassed the separate financial-close blockers.

## Real database workflow tie out

The fixture uses synthetic zero-tax mappings. A sale of 10 is paid with cash 6 and on-account credit 4. A later bank-evidence collection of 4 is reversed by a different actor.

| Evidence | After sale | After collection | After reversal |
|---|---:|---:|---:|
| Customer balance and GL receivable | 4.00 | 0.00 | 4.00 |
| Bank control-account balance | 0.00 | 4.00 | 0.00 |
| Receivable paid amount | 6.00 | 10.00 | 6.00 |
| Receivable unpaid amount | 4.00 | 0.00 | 4.00 |
| Recognized revenue | 10.00 | 10.00 | 10.00 |
| Cost of goods sold | 4.00 | 4.00 | 4.00 |
| Stock quantity and retained value | 4 / 16.00 | 4 / 16.00 | 4 / 16.00 |

Assertions also verify balanced source-linked journals, unchanged POS cash/tender history during back-office bank collection, no duplicate effects on exact retries, changed-payload rejection, rejection of self-reversal, and stale close evidence after both collection and reversal. Synthetic CERTIFIED close rows are invalidation sentinels, not actual reviewed close certificates. Recording bank evidence does not initiate a bank transfer.

The machine-readable workflow evidence is [sales-accounting-workflow.json](sales-accounting-workflow.json).

## Verification evidence

| Class | Executed result | Scope and limitations |
|---|---|---|
| Source inspection | Existing financial writers traced; collector mismatch independently reviewed | No unsupported new writer or intentional receipt/offline gate removal. |
| Mocked regression | Before fix: 6 failed / 15 passed. After fix: 21 passed across 2 suites | Actual coverage reader and collector exercised with mocked persistence/source-manifest boundary. The implementation worker executed the exact command below. |
| Real PostgreSQL targeted chain | 1 passed; the other 16 cases excluded by test-name selection | [Targeted results](workflow-tests.results.json); not an additional unique case beyond the full-suite count below. |
| Real PostgreSQL POS financial regressions | 16 passed / 1 browser case skipped, 1 suite | [Results](pos-financial-regressions.results.json), [log](pos-financial-regressions.log). Includes the new chain, existing scope/retry/rollback and test-only offline cases. Injected transaction/DDL errors in the log are expected failure probes; the assertions pass. |
| Browser and real authentication | Not run | The optional browser case remained disabled. No authenticated UI, role/device or accessibility claim. |
| Migration and custom database triggers | Not qualified by this run | The target was built from the current Prisma datamodel, not the migration history or production triggers. |
| Provider, country and production | Not run | No provider initiation, fiscal filing, statutory certification or release approval. |

Mocked command:

```text
node node_modules/jest/bin/jest.js --config jest.close-scope.config.cjs --runInBand --no-cache --runTestsByPath services/reconciliation/__tests__/payment-close-evidence.service.test.ts services/reconciliation/__tests__/account-close-coverage.test.ts
```

Owned-database commands, after fresh target preparation:

```text
node docs/stoquify-potential/development/sales-accounting-2026-11-08/run-workflow-proof.cjs verify-existing
node docs/stoquify-potential/development/sales-accounting-2026-11-08/run-workflow-proof.cjs verify-existing .*
```

The runner explicitly pins all database URLs to a newly created loopback cluster, verifies database/user/data-directory identity, uses an isolated generated Prisma client, checks schema provenance and stops that cluster in a finally block. It never loads the application environment or clones existing data. The initial sandbox denied loopback TCP; the reviewed elevated run used only this owned target. An initial Jest authentication-bootstrap parse failure executed zero tests; its log/results are retained separately. The final selected and full financial runs pass.

Target identity: [DATABASE_TARGET.json](DATABASE_TARGET.json). Schema provenance: [SCHEMA_PROVENANCE.json](SCHEMA_PROVENANCE.json). Successful shutdown: [pg-stop-verification.execution.json](pg-stop-verification.execution.json). No application database or shared Prisma client was changed.

## Next engineering boundary

The next useful proof is an authenticated application journey through the same sale, customer collection, independent reversal and accountant close review on one qualified candidate artifact, including denied authority, recovery and EN/FR presentation. Migration-history/custom-trigger verification remains separate from this datamodel proof. Existing receipt, offline, provider and country limits remain in force until their own applicable development and qualification work is complete.

No commit, deployment, live enrollment or business communication was performed. The original assessment and 90-day PDF remain historical planning artifacts rather than updated release claims.
