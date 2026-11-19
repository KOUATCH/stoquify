# P04-R06 current-schema execution handoff

Prepared on 2026-11-10. This is a successor to the preserved E31 handoff. It records reviewed preparation and the work still required; it does not certify a build, a database migration, browser qualification or production readiness.

## Current state

- The separate D: dependency copy is complete and independently accepted: 152,806 files match the recorded manifest, and the frozen r2 dependency tree remained unchanged. Reuse this copy; do not copy it again.
- The admitted source snapshot contains 9,988 files at HEAD `80e4abb283216b9f8e04b94e5020393f7dcabf62`, with identity `0b8354d4f340ad5b82931e2e18e3e01a7ba18cfd089351a2536b41e23891332c`. Its expected candidate ID is `p04-r06-r3-0b8354d4f340`. This observation is time bound; capture, build and runtime each reject current-source drift.
- Authentication and dependency inputs remain unchanged, but the schema is now `937754a6034b37b82c98957ebb9b70f612659d40af562967151595562acc6ef0`. The selected-input register records 67 unchanged inputs and this one schema successor. The current migration set contains 123 entries; the original 122 remain byte identical.
- Seven metadata-only source documents have typed exclusion rules: four fixture/pack receipts and three client-build receipts. The successor exclusion helper passed 28 pure tests. Actual artifact exclusion remains unrun.
- Capture attempt04 stopped at its memory gate, before source copying or other D: mutations. It recorded approximately 7.87 GiB free physical memory and 11.30 GiB commit headroom. The required floors remain 6 GiB physical, 12 GiB commit and 12 GiB D: free space. These are admission thresholds, not a promise that a build will succeed.
- The independently admitted attempt05 preserves the failed attempt04 and all earlier attempts. It has not run. No current candidate, artifact, private runtime environment, new databases, native tests or browser tests exist yet.
- The retained r2 PostgreSQL cluster is stopped. Its original databases and private fixture are to remain unchanged. No unrelated process may be stopped to obtain memory.

## First action after capacity changes

From the repository root, use the reviewed read-only collector with a new exclusive receipt name:

```powershell
node plans/stoquify-production-readiness-2026-10-28/execution/P04-R06/qualification-20261110-r3/check-resources.cjs resource-current-schema-retry-ready-r1.json
```

Do this after the user frees memory or another observed resource change. Do not repeatedly poll unchanged capacity. The collector can require read-only host inspection access. A passing result permits an attempt; it does not bypass current-source, ownership, free-space or independent-review requirements.

Before consuming attempt05, reconcile the selected 68 inputs and full source against the admitted snapshot. If source has changed, preserve the snapshot and prepare a separately named successor binding. Keep the verified D: dependency copy. Do not weaken the capture selector or silently exclude newer source changes.

## Ordered execution and evidence

All paths below are relative to this evidence packet. Every executable definition must remain hash bound to its independent admission. A conditional source review is not an actual outcome review.

| Step | Exact entry point | Required evidence before moving on |
| --- | --- | --- |
| 1. Capture current candidate | `prepare-candidate-attempt05.cjs`, then `admit-candidate-attempt05.cjs` | Fresh unchanged capacity floors; exact source/HEAD/68 equality; `preparation-attempt05.json`, context and manifests, private asset classification, current-root/candidate equality and actual D: reserve; independent `CANDIDATE-OUTCOME-REVIEW.json`. |
| 2. Prepare separate current databases | `database-current/prepare.cjs` | Whole `DATABASE-CURRENT-RECIPE-ADMISSION.json` must first bind the completed lifecycle source set and actual candidate. Actual `database-current/preparation.json` must prove ownership, old-baseline preservation, new targets, the new migration and observed empty-table state. Independent `DATABASE-CURRENT-PREPARATION-OUTCOME-REVIEW.json` precedes seeding. |
| 3. Seed current synthetic fixture | `database-current/seed-fixture.cjs` | Sixteen new synthetic actors in two new organizations, 32 accounts, distinct private passwords and zero initial sessions; exact current migration ledger; independently accepted `DATABASE-CURRENT-OUTCOME-REVIEW.json` hash binding preparation and seed receipts. No credentials in published evidence. |
| 4. Generate private client and build | `run-build-v4.cjs` | Exact `BUILD-RECIPE-ADMISSION.json`, actual candidate/database outcomes and fresh resource checks. Normal private Prisma generation, canonical schema proof, full TypeScript/lint/build gates and sealed artifact verification remain enabled. `BUILD-OUTCOME-REVIEW.json` must bind actual build, artifact, client and private environment receipts. |
| 5. Reconcile source and fixture | `admit-runtime-source-v2.cjs`, then `database-current/fixture-preflight.cjs` | Exact preflight recipe admission; current source/artifact identity, current 123-migration target, initial fixture/native digests and preserved old databases; independent `RUNTIME-PREFLIGHT-OUTCOME.json`. |
| 6. Run actual qualification | `run-runtime-v2.cjs` | Whole `RUNTIME-RECIPE-ADMISSION.json` and all actual prior outcomes. The entry records `runtime-current/execution-started.json` before app/session/browser work. Preserve every raw result, including failures, original response capture and native before/after evidence. |
| 7. Review, clean up and stop | `database-current/finalize.cjs`, then `database-current/stop.cjs` | Independent native/browser outcome review; remove only owned synthetic sessions, retain all other evidence/state, prove business/audit preservation and both old databases unchanged, stop only the exact owned cluster, and prove recorded PID absence plus all scoped ports released. |
| 8. Final integrity and publication | `final-integrity-v3.cjs` | Exact final recipe admission, actual cleanup evidence, current source/artifact preservation, typed private-metadata exclusion and old-baseline integrity. Independent final review states qualification separately from source/cleanup integrity. Parent owns E32 work-register and shared-evidence publication. |

Execute each entry directly with `node <packet>/<entry>` only after its actual prerequisites pass. D: writes and local process/database operations require the exact reviewed environment access. Do not run the whole table as an unguarded shell chain.

## Database separation and migration meaning

The physical cluster remains `D:/p04-r06-fullapp-20261110-r2/postgres`, bound to `127.0.0.1:55517`. Its lifecycle owner is preserved before any update. New source, dependencies, generated client, signing secrets, fixture and runtime copies belong to `D:/p04-r06-fullapp-20261110-r3`.

Preserved read-only baselines:

- `stoquify_local_p04r06_20261110_build_r2`
- `stoquify_local_p04r06_20261110_full_r2`

Separate writable qualification targets:

- `stoquify_local_p04r06_20261110_build_r3`
- `stoquify_local_p04r06_20261110_full_r3`

The reviewed strategy clones the proved-empty 122-migration build baseline into the new build target, executes only `20261110190000_close_scope_integrity`, then clones the newly migrated empty build target into the new full-app target. This is **122 inherited migrations plus one executed migration**, not a fresh replay of all 123. The new SQL hash is `334b580ac161ed37b6eccd6bc33234b3aabd0d6935215d60d6dd3318166b53e7`; the current migration-set hash is `4bc9837046bf41549a682d5f2fe9d53b539e2b554d28e6bc393d7865fb4b614c`.

Both baseline databases must retain their complete logical table and public catalog fingerprints, old fixture hash and original migration ledgers before and after new work. Never migrate, reseed or drop either baseline. Applying the new migration successfully in these empty isolated targets would not qualify the concurrent accounting/Close behavior or populated production migration.

## Qualification contract

The raw result remains `runtime-result.json`, with candidate and artifact identities. Every admitted case must be present:

- `protectedCore.checks`: 50 protected-core cases.
- `expanded.checks`: 36 cases, comprising 10 credential cases, 24 origin cases and two connection-failure/recovery cases.
- `expanded.expiry.checks`: three independently issued, retained-expired-row cases.
- `expanded.browserDiagnostic.checks`: 18 actual consumer checks in English and French.

These 107 cases reconcile to the preserved 58 logical requirements and 57 mandatory auxiliary proofs in `runtime-current/qualification-contract.json`. Preserve all case identities and assertions. No unaffected historical pass is silently substituted for a current-artifact result.

The origin contract distinguishes an authorized native client using its own credentials from browser cross-site requests and cookie-bearing forged-origin requests. Rejected browser requests must leave credential bookkeeping unchanged even near the lock threshold and with expired/future locks. Correct authorized successes, intended failed-password counting, the exact 30-minute lock interval and authorized recovery must still work.

The browser contract requires exact compiled profile-action identity, original delivered response bytes, the root Flight result and consumed displayed values/checked time, with separate source DTO provenance. Canceled transport observations remain visible. The isolated closed-port probe qualifies its early database-unavailability path only; it is not evidence of a post-password session-creation failure.

## Failure and recovery

- A failed capture or build consumes its exclusive receipt. Preserve partial outputs and logs; inspect before preparing a named successor. Never rerun blindly or overwrite a failure.
- Database preparation owns its startup/migration-failure recovery. It stops a just-started cluster only after matching PID, data directory, port, native start time and exclusive client state. Uncertain ownership must be reconciled without terminating unrelated work. Newly created failed targets remain preserved for inspection.
- After preparation but before actual runtime begins, use the separately reviewed `database-current/stop-before-qualification.cjs` if seeding, private-client generation, build or preflight fails. It must prove the runtime-start marker and runtime result are absent, exact target ownership and no other clients before attempting an owned stop. Zero current sessions and native preservation are required for an accepted cleanup. If session/ledger inspection or baseline proof fails, it can still stop an exclusively owned cluster while retaining all rows/private files and reporting `passed:false` with the failed diagnostic.
- After the runtime-start marker exists, use the admitted runtime cleanup and finalizer path. Preserve failed assertions and restore only owned fixture mutations; do not infer that a failed run left the native fixture pristine.
- If the launcher reports a timeout or abnormal exit, retain that diagnostic and reconcile actual PID/port/native identity before claiming success or cleanup. Do not infer a cause from the diagnostic alone.

## Admission status at handoff creation

Attempt05 capture, current source disposition, dependency staging, the typed metadata helper tests and current orchestration/helper source reviews are accepted. Candidate capture has not run. The whole current database/lifecycle admission, actual database outcomes, final build admission, actual artifact review and runtime/final admissions remain dependent on their completed inputs. Root has completed the current lifecycle definitions and their syntax checks; their hashes must be frozen and independently reviewed before any database startup.

P04-R06, parent P04 and production readiness remain blocked. No commits, pushes, deployment, production flag changes or production data operations are authorized by this handoff.
