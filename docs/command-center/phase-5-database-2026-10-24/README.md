# Phase 5 location and disposable database verification

24 October 2026. **Assurance assignment location checks are implemented and verified: 31 real PostgreSQL tests and 126 mocked/pure/component tests passed.** Existing changes were preserved. Production and the configured application database were not accessed.

This is the next bounded implementation after the [module enforcement continuation](../phase-5-follow-through-2026-10-24/README.md). The user authorized disposable database verification in this turn, superseding the earlier prohibition for that environment only. It does not declare Phase 5, Phase 6 or Release B complete.

## Implemented behavior

`assurance-assignment-scope.ts` resolves authority from persisted sources inside the existing serializable assignment transaction. Both actor and assignee must retain their existing tenant, account, session, action/source permission and module eligibility.

| Source | Assignment authority |
|---|---|
| Registered `pos.closed_shift_cash_shortage.review` / `POSSession` | Resolve the real session and terminal in the same organization and location, then the active, undeleted location. Each party needs current `Location.managerId` responsibility or existing tenant-wide operating authority. |
| Explicit known registry aggregate identities | Both parties require existing tenant-wide operating authority, in addition to their source/action permissions. A branch role alone cannot authorize a tenant aggregate. |
| Unknown or employee-bound source | Denied until a source-specific binding adapter exists, including for administrators. No scope is inferred from labels, routes, caller metadata or payroll location alone. |

The implementation reuses `resolveTenantWideOperatingAuthority` and current locked tenant roles; it adds no role or permission. A closed historical POS session need not be the terminal's current session. Source, terminal and location locks remain held until the assignment transaction ends. Current scope is resolved again on replay, and history receives a scope kind/fingerprint without a raw location ID. Assignment still changes only source-owned coordination fields, never a payment, payroll, inventory, reconciliation or close outcome.

The POS producer's activation state is unchanged. Tests construct synthetic definitions. This work does not enable its resolution command. Existing source-hash differences between the cash-shortage resolution loader and assurance evaluation remain a separate source-owner issue; the assignment guard does not reuse that loader or claim to certify resolution.

## Verification evidence

| Evidence class | Result | Boundaries |
|---|---|---|
| Workflow contract | Passed; 196 package scripts outside reviewed manifest | Does not execute or certify those commands |
| Source inspection | Current assignment, registry identities, operating scope, module evaluator, schema, real test imports and isolated runner inspected | Not browser or release proof |
| Mocked/pure/component | **126 passed, 8 suites; zero skipped** | Includes 15 disposable-target guard cases and existing assignment/action/tower/Manager/UI checks; not PostgreSQL proof |
| Real PostgreSQL | **31 passed, 2 suites; zero skipped** | 26 assignment cases plus 5 existing stable-case identity cases; real Prisma/SQL/transactions, only `server-only` mocked |
| TypeScript | Focused no-emit check passed | Selected service/action/component import closure and new database test, not a whole-app build |
| ESLint | Five owned TypeScript files; zero errors and warnings | No autofix or unrelated sweep |
| Rendered/browser | Not rerun in this backend-only slice | Earlier EN/FR synthetic browser evidence remains historical; no live database/browser journey claimed |
| Migration/release/production | Not run | Schema-model bootstrap is not migration-history rehearsal; no deployment, release build, worker execution or external messages |

Real assignment cases cover a fresh client and new authentication session, exact replay, changed intent, competing assignments, identical concurrent requests, event/audit failure rollback, tenant isolation, account/membership/session revocation, module revocation on replay, current manager acceptance, wrong actor/assignee, inactive/deleted/foreign locations, foreign session/terminal, terminal-location mismatch, unsupported POS checks, manager replacement and unknown employee sources. Concurrent account and manager revocations include observed PostgreSQL lock waits before verifying refusal and zero assignment events.

The existing incident identity suite additionally proves simultaneous first detection converges on one case and one creation-alert row, active evidence drift stays on the same case without a second alert, changed evidence reopens a finalized case, suppression survives evidence changes, and definition versions retain distinct identities. These are retained assurance case semantics. They do not establish generic signal episodes or delivery to a user; no alert transport or worker ran.

## Disposable target and reproducibility

The [runner](run-postgres.cjs) creates a brand-new local PostgreSQL 17 cluster under `.codex-tmp`, with a random database name, port and password. It refuses production environment markers, reuses the disposable target guard, strips inherited libpq routing variables, and verifies the actual database, loopback address and exact owned data directory. It never derives a target from the application environment file. The temporary password file is removed.

A snapshot of the unchanged current Prisma schema is pushed into this new cluster using an isolated Prisma config and `--skip-generate`. Synthetic records and temporary failure-injection triggers exist only there. The runner stops only its own cluster in `finally`. Final bootstrap, tests and shutdown all returned zero. The retained disposable files are stopped; no shared cluster or existing database was reset or deleted.

See [target identity and shutdown](target-evidence.json), [database test results](postgres-results.json), [database output](postgres.log), [schema bootstrap output](bootstrap.log), [mocked output](mocked-test-results.txt), [static checks](static-checks.json), and [verification attempts](verification-attempts.json). Two expanded fixtures initially failed foreign-key validation before reaching application code; they were corrected to create a real synthetic second tenant. No application guard or database constraint was weakened.

Run from the repository root after reviewing current scripts/imports and the repository command registry:

```powershell
npm run agent:workflow:check
node node_modules/jest/bin/jest.js --config docs/command-center/phase-5-database-2026-10-24/jest.config.cjs --runInBand
node node_modules/typescript/bin/tsc --noEmit -p docs/command-center/phase-5-database-2026-10-24/tsconfig.json
node node_modules/eslint/bin/eslint.js services/assurance/assurance-assignment.service.ts services/assurance/assurance-assignment-scope.ts services/assurance/__tests__/assurance-assignment.service.test.ts services/assurance/__tests__/assurance-assignment-scope.test.ts services/assurance/__tests__/assurance-assignment.postgres.test.ts
node docs/command-center/phase-5-database-2026-10-24/run-postgres.cjs
```

The last command is explicitly mutating, bounded to a new disposable cluster. It requires the installed PostgreSQL binaries at the runner's reviewed path. Do not substitute a production or existing application URL. The identity suite is included only through this isolated runner here.

## Acceptance status and next dependencies

| Criteria | Evidence gained | Remaining program gate |
|---|---|---|
| CC-05.1 | Assurance persists across new client/session | All-origin follow-up and browser refresh |
| CC-05.2 | Actual POS/aggregate assignment authority, permissions and module checks | Additional source adapters; unknown sources remain unavailable |
| CC-05.3–05.5 | Real competing writes, exact replay, rollback and retained scope/history | All-origin coordination and live recovery journey |
| CC-05.6 | Current assignment/replay denial after access changes | Full read/history privacy and rendered revocation recovery |
| CC-05.7–05.8 | Existing assurance case identity, source change and definition-version tests | Generic episode recurrence and consistent three-page projection; old-hash recurrence/review invalidation |
| CC-05.9 | Assignment preserves source business authority | Full integrated source-return journey |
| CC-05.10 | Disposable PostgreSQL gate passed for assurance slice | Generic signal/receipt persistence not implemented or certified |
| CC-06.7–06.8 | Existing assurance alert-row deduplication demonstrated | Recipient authorization, preferences/quiet hours, transport and retry remain unverified |

The source map, shared page contract and acceptance checklist now record this evidence. Whole-program checkboxes remain open. Generic signal coordination storage, source-specific episode adapters, durable Owner review receipts and the resulting three-center synchronization remain planned work. A disposable verification authorization does not itself approve an application schema design or production migration. Existing financial workflows and notification transports remain source-owned.

## Preservation and rollback

Baseline Git revision: `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886`, with pre-existing local changes. [Preservation manifest](preservation.json) compares only captured files and explicitly lists new files; it does not claim the whole working tree was clean. Existing HRIS schema changes, package changes and command registry changes match their captured hashes. No staging or commit occurred.

[Owned patch](implementation.patch) is relative to this turn's snapshots, retaining the earlier assignment/module/UI work. To roll back, review and reverse only these scope-guard/test/document hunks; remove new files only when no later work depends on them. No application schema or migration was authored. Disposable synthetic data is retained in the stopped owned cluster and is not application state.
