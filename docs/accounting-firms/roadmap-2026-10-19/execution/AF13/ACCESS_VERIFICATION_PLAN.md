# AF13 access and verification record

**Date:** 25 October 2026. Current evidence: [run 03](2026-10-25-run-03/). Synthetic development scenarios only. This replaces the earlier future-test proposal.

## Authority and privacy

| Boundary | Implemented behavior | Evidence |
|---|---|---|
| Own declarations | Current firm actor sees own plans/effort. Only original declarer may correct effort. | PostgreSQL own-scope, non-manager and foreign-correction cases |
| Management | Existing accounting.close.accountant.invite authority, effective assignment, enrolled named mandate and current module access. Assignment alone grants nothing. | Real own/manager denial and module-removal cases; reused authority regressions |
| Economics | Management plus current finance.profitability.read; no automatic preparer/client access. | Real budget reads/writes denied after role removal; browser fee controls checked |
| Review | Current review authority, fresh session, reviewer different from original recorder and latest editor. Correction removes current review status. | Real review/self-review and browser password step-up |
| Export | Current export permission, fresh authentication, same read scope/economics checks, watermark and audit. No client ClosePackExport insertion. | PostgreSQL export case and browser JSON download |
| Revocation | Current session, mandate, roles, module and engagement restrictions checked before reads, writes, replay and commit. | Revoked permission/mandate/session tests; expiry while waiting rolls back row and audit |
| Source references | Same firm/engagement/client/period advisory IDs; same client/period review IDs. No private evidence text copied. | Real AF12/workpaper references and foreign-reference denial |
| Retention | Append-only revisions, idempotent exact retry, stale-write conflict, composite tenant FKs and explicit nonnull constraints. | Real concurrent writes and direct invalid SQL/Prisma mutations denied |

The service reuses existing authority locks and protected actions. Sensitive responses are cleared on scope changes, hidden pages and lost current access. Uncertain commands retain their exact input/idempotency key for explicit retry. No new role, identity system, payroll reader, billing writer or monitoring stream was added.

## Distinct verification lanes

| Lane | Result and scope |
|---|---|
| Source/workflow | Current files inspected; workflow-registry check passed. 196 package scripts remain outside the reviewed manifest; no registry hashes were changed to pass. |
| Schema/client | Canonical schema validates; isolated current Prisma client generated without application environment files. |
| Type checking | Focused tsconfig.firm-practice.json passed, exit 0. Not a repository-wide build. |
| Pure/mocked/component | 111 passing: seven arithmetic/input tests, six component tests, 98 existing authority regressions. Component tests cover EN/FR, unknown values, local-client non-mounting, exact retry, step-up and hidden-page clearing. |
| Real PostgreSQL | Ten scenarios passed against the explicit local AF13 database on PostgreSQL 17. Session/permission/concurrency/reference behavior uses real rows and transactions. |
| Migration upgrade | Populated AF12 baseline test passed. Upgrade 118→120 migrations and replay preserved counts and row digests across ten selected operational/advisory tables. Ledger/advisory rows populated; some other tables empty. |
| Browser | PASS: real three-role workflow, correction/review/step-up, JSON download and fee-permission removal. Four EN/FR desktop/mobile scoped axe scans: zero violations; no horizontal overflow or page errors. Separate from Jest and PDF rendering. |
| Documents | Matching Markdown/PDF publication and page/content checks are separate artifact verification. |

The first eight-scenario PostgreSQL run passed. A later staff-scope test initially failed because an empty requestedModules array deliberately invokes the existing legacy module fallback. The fixture was corrected to explicitly retain accounting while excluding close_assurance. The final ten-scenario run passes. The failed receipt is retained; no production module semantics were changed.

## Reviewed execution commands

Run from the repository root. Database commands require AF13_POSTGRES_URL identifying the fixed loopback database and AF13_CLUSTER_DIR identifying its owned data directory; scripts reject different targets.

- npm run agent:workflow:check
- node scripts/prepare-firm-practice-verification.cjs (reviewed schema/client and guarded local migration preparation)
- node node_modules/typescript/bin/tsc --project tsconfig.firm-practice.json --pretty false
- node node_modules/jest/bin/jest.js --config jest.firm-practice-regression.config.cjs --runInBand --json --outputFile docs/accounting-firms/roadmap-2026-10-19/execution/AF13/2026-10-25-run-03/regression-final.json
- node node_modules/jest/bin/jest.js --config jest.firm-practice-postgres.config.cjs --runInBand --json --outputFile docs/accounting-firms/roadmap-2026-10-19/execution/AF13/2026-10-25-run-03/postgres-final.json
- node scripts/fixtures/firm-practice-baseline.cjs; baseline fixture through jest.firm-practice-upgrade.config.cjs; node scripts/fixtures/firm-practice-upgrade.cjs
- node scripts/prepare-firm-practice-browser.cjs; node scripts/fixtures/firm-practice-browser.cjs; node scripts/start-firm-practice-browser.cjs; node scripts/verify-firm-practice-browser.cjs

Semicolons above separate documented stages, not an instruction to bypass success checks. Source copy excludes environment files; synthetic sign-in secrets remain in the private task directory, never published. No application build, production schema promotion, deployment or live-client mutation was performed.

## Limits

Passing these lanes establishes the bounded synthetic implementation, not production release, complete accessibility certification, scale performance or customer demand. Actual firm validation and AF16 remain deferred. AF11 country evidence is still outstanding.


## Browser correction

The initial browser attempt exposed dropdown accessible names that included option text. Explicit localized aria-label values were added using the existing AF12 pattern. The six component tests were rerun after that UI-only correction; these overlap the 111-test regression total and are not counted twice. Earlier browser receipts are retained.

The completed authenticated workflow is retained in browser-attempt-03.json. A presentation assertion then matched both a budget summary and its revision card. The harness selector was narrowed, and --presentation-only completed layout/access checks against the same source and retained synthetic records. The final browser receipt combines those sequential checks; no extra manual declarations were created for that continuation.
