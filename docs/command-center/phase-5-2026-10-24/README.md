# Phase 5 — Work & Follow-up foundation

24 October 2026. **Status: bounded assurance assignment foundation implemented; full Phase 5 remains open.** No database commands, migrations, seeds, production writes or deployment were run by this task.

## Delivered

The existing Manager-to-Workflow-Assurance handoff now reaches an assignment command that requires a current source revision and a stable request ID. The server rechecks the current session, actor, tenant and assignee account/permissions, derives the role from the source definition, and records the assignment with its event and audit inside a serializable transaction. Exact current replays avoid duplicate assignment events; stale or changed requests produce a conflict. Assignment preserves in-progress work and existing deadlines when input is blank, and cannot reopen a finalized incident or certify a financial outcome.

The existing source form keeps the same request after an uncertain failure, disables editing until reload, and requires reload after conflict or access denial. Replacement/revocation clears the open form and ignores late responses. EN/FR recovery text makes clear that assignment is not business completion. Rendered checks also found and fixed dialog focus return and button contrast, using existing components and product tokens. Close controls are localized; the portal receives its dashboard color aliases explicitly.

[Source reuse decisions](SOURCE_REUSE_DECISIONS.md) cover signals, location signals, assurance, accountant requests, unavailable sources, reconciliation, branch close, Owner review and optional agent proposals. Work & Follow-up is still planned as an integrated capability across the existing three centers, **not a fourth center**. This slice does not add generic queue mutation controls or claim three-page durable synchronization.

## Acceptance status

| Criterion | Evidence now | Remaining requirement |
|---|---|---|
| CC-05.1 persistence across refresh/session | Existing incident/event/audit storage reused in code | Real cross-session persistence and all-origin follow-up proof |
| CC-05.2 eligible assignment | Mocked current account, tenant, role permission and session denials; server-owned role/actor/context | Source-specific location and module eligibility; full origin coverage |
| CC-05.3 concurrency/recovery | Expected revision, incident row lock and serializable transaction; mocked stale writer/P2034; rendered refresh recovery | Actual parallel PostgreSQL writers and authority races |
| CC-05.4 replay/atomicity | Exact replay creates no second assignment event/audit; changed payload refused; failure propagates | Real rollback on event/audit failure and simultaneous replay |
| CC-05.5 history | Source fingerprint/hash/type/occurrence count, actor, request, before/after state; existing event timestamps | Persisted retrieval/history and all-origin verification |
| CC-05.6 revocation | Actor/assignee authority rechecked on retries; replaced revoked form clears and late result is ignored | Live read/module/location revocation across the three pages |
| CC-05.7 same occurrence | Source incident identity retained; no new generic IDs invented | Producer-specific occurrence semantics and deduplication across all projections |
| CC-05.8 recurrence | Revision includes current source evidence/occurrence count; changed evidence rejects stale assignment | New episode/location/period recurrence without inherited resolution |
| CC-05.9 source truth | Assignment changes coordination fields only; final states require source reopen; success copy does not claim completion | Complete all-origin negative and source-return verification |
| CC-05.10 real PostgreSQL | **Not run** | Dedicated disposable target, persistence/isolation/concurrency/rollback/replay tests |

The program checklist remains unchecked for the full phase. Generic signal helpers still return transient objects/events. Durable signal follow-up and Owner review receipts require an explicit occurrence/storage design and later database authorization. Phase 6 notification and projection integration is not implemented here.

## Verification evidence

| Evidence class | Result | Scope / limits |
|---|---|---|
| Source inspection | Completed | Current assignment, session/role controls, existing source persistence and per-origin map; graph discovery is not runtime evidence |
| Workflow contract | Passed | `npm run agent:workflow:check`; 196 unclassified commands remain unapproved by the registry |
| Mocked unit/component | **88 tests passed in 6 suites** | Assignment service, existing incident lifecycle, protected actions, source UI, assurance tower and Manager service. No database; component dialog is mocked |
| Static TypeScript | Passed | Focused source import closure with no emit/incremental cache; not a whole-repository build |
| Scoped ESLint | Passed | 10 changed/new implementation and test files; zero errors/warnings |
| Rendered synthetic browser | **2 EN/FR journeys passed** | Actual source component and Radix dialog, headless Edge, mocked actions/DTOs; widths 375/768/1440, focus trap/return, uncertain replay, conflict reload and revoked form/late-response recovery |
| Automated accessibility | **2 scans, zero reported violations** | Open assignment form, WCAG A/AA tags through 2.2; incomplete checks retained in JSON. Not manual screen-reader certification |
| Screenshot review | French 375px reviewed | Error/retry form visually readable with actions reachable; other locale/width captures retained |
| Database / live authenticated browser | **Not run** | No cross-session, actual lock, rollback or live authorization certification |
| Build / migration / seed / deployment | **Not run** | No application environment or database configuration loaded by fixture runners |

The first sandboxed Edge launch failed due to Windows process restrictions. The synthetic fixture passed outside the sandbox with a temporary browser profile. The first rendered attempts detected missing focus restoration and button contrast defects; both were corrected before the final passing run. No logged-in user profile or application endpoint was used.

Evidence: [mocked results](mocked-test-results.txt), [browser/accessibility results](browser-results.json), [static checks](static-checks.json), [ESLint results](eslint-results.json), [French mobile capture](assignment-fr-375.png), [English desktop capture](assignment-en-1440.png).

Reproduce the reviewed fixture lanes from the repository root:

```powershell
node node_modules/jest/bin/jest.js --config docs/command-center/phase-5-2026-10-24/jest.config.cjs --runInBand
node node_modules/typescript/bin/tsc --noEmit -p docs/command-center/phase-5-2026-10-24/tsconfig.json
node docs/command-center/phase-5-2026-10-24/verify-browser.cjs
```

These direct commands were inspected for side effects: Jest replaces Prisma/session/action dependencies; Next Jest loads no application directory configuration; TypeScript uses no emit or incremental output. The browser runner writes only its owned temporary bundle/report/screenshots, serves loopback fixture HTML and mocks all server actions. It does not seed, migrate or connect to the database. A browser launch permission may be needed on Windows. This is not a command-registry expansion.

## Preservation and ownership

Baseline HEAD: `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886`, with existing working-tree changes retained. [Preservation manifest](preservation.json) compares 228 captured files: **216 unchanged, 11 owned changes, one unrelated concurrent schema change preserved**. Three implementation/test files are new. Package definitions, command registry and workflow checker are unchanged.

The concurrent `prisma/schema.prisma` difference adds HRIS setup reviewer grant relations/model. It was not authored, executed or reverted by this Phase 5 task and is explicitly excluded from the [owned patch](phase5-changes.patch). No claim is made that the whole shared working tree or schema remained byte-identical while other work continued. No files were staged or committed.

Owned application changes: assurance assignment service/revision helper and contracts/presenter; protected assignment action; existing source action form. Owned tests cover those paths. Documentation updates append Phase 5 progress to shared/Manager contracts, source map and acceptance checklist. Other source commands and database schema are outside the owned patch.

For rollback, reverse only reviewed Phase 5 hunks and remove newly introduced Phase 5 helpers after restoring their imports; do not reset files wholesale, delete historical work, or restore the captured schema. No migration rollback is required for this task because no migration was authored or run.

## Next gates

1. Define source-specific location/module assignment eligibility and verify revocation with real authority writers.
2. Decide occurrence identities and minimal coordination storage for generic signals and durable review receipts; preserve source-owned close/reconciliation/branch controls.
3. Once database work is authorized, run disposable PostgreSQL persistence, simultaneous assignment/replay, authority-race, rollback and new-session checks. Do not mark CC-05.10 complete from mocks.
4. Then implement Phase 6 projection and notification follow-through using the retained source identities. Keep assignment, reviewed evidence and confirmed business outcome separate.
