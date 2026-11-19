# AF07 provider formats and account coverage: implementation and verification

**Date:** 20 October 2026. **Status:** VERIFIED within AF07's synthetic pilot scope.  
**Source revision:** `6ee84a90c760d2864f6aef672d8b393ac2b65971` plus the inspected working tree.  
**Latest run:** [2026-10-20-run-01](2026-10-20-run-01/). No deployment, production schema promotion, commit, live provider connection or real client enrollment was performed.

## Outcome

The existing statement importer now accepts explicit, bounded CSV/JSON pilot formats, preserves historical fingerprints and exact-file replay, holds changed transaction identities without partial imports, isolates receipt identity by account, and retains the existing transaction, event/outbox and Close invalidation controls.

The existing account-coverage read now excludes signed reconciliations whose retained certificate or current source manifest no longer matches. Missing statements and independently approved no-activity evidence remain distinct. Accounting firms continue using existing portfolio, reconciliation and AF06 evidence workflows; no parallel ingestion system or financial writer was introduced.

Supporting contracts: [supported formats](SUPPORTED_FORMATS.md), [normalization/fingerprints](NORMALIZATION_AND_FINGERPRINTS.md), [operations and recovery](OPERATIONS.md).

## Discovery, prerequisites and reuse

AF01's current-proof/complete-account contract and AF06's delegated evidence workflow were inspected as prerequisites and reused. Neither phase was rebuilt. The dated graph contains payment action communities 14 and 132, including `payments_reconciliation_actions_ts` and `payments_reconciliation_workbench_actions_ts`; graph metadata is older than current source, so behavior was established from actual services and tests.

| Area | Baseline classification | AF07 disposition |
|---|---|---|
| Statement parsing | Partial/risky: comma and newline splitting, permissive Date/amount conversion | Narrow strict parser in the affected adapter path |
| Replay, locks and transaction | Implemented | Reused; retained-file lookup now precedes new parsing |
| Changed identity and account receipt key | Partial | Same-identity guard; account-scoped new keys; retained legacy receipt reuse |
| Close invalidation | Implemented | Preserved; import correlation also reaches business event |
| No-activity and account windows | Implemented | Reused and tested against real late arrivals |
| Current signed coverage | Risky: status/hash presence alone | Certificate integrity and existing source-manifest comparison |
| Bank-balance approval/current snapshot | Implemented | Inspected and reused unchanged; pure contract regression coverage |
| Provider-operation uncertainty | Implemented | Existing intent/retry/review states retained; seven mocked regressions |
| Live provider dialects/connectivity | Unverified | Explicitly excluded from support claims |

The repository has unrelated dirty work across prior accounting-firm phases, onboarding, public pages and other areas. AF07 changed only its payment/coverage slice, focused tests/configuration/fixture runner and reports. The current 102nd migration, `20261020100000_accountant_active_named_scope`, was already present; it was applied only to the new disposable database. AF07 introduces no migration.

## Implementation evidence

| Source | Change |
|---|---|
| [statement-pilot-format.ts](<E:/ohada saas/Focused projects/stoquify/services/payments/adapters/statement-pilot-format.ts>) | CSV state machine, duplicate JSON key check, byte/row bounds, decimal/date validation and alias conflict detection |
| [mobile-money-hmac.adapter.ts](<E:/ohada saas/Focused projects/stoquify/services/payments/adapters/mobile-money-hmac.adapter.ts>) | Uses pilot parser; explicit fields; metadata records format v2/fingerprint v1; existing fingerprint and webhook logic preserved |
| [statement-import.service.ts](<E:/ohada saas/Focused projects/stoquify/services/payments/statement-import.service.ts>) | Retained replay before parsing, tenant/account receipts, changed-identity guards, bounded identity query and event correlation |
| [account-close-coverage.service.ts](<E:/ohada saas/Focused projects/stoquify/services/reconciliation/account-close-coverage.service.ts>) | Current certificate/source checks and actionable STALE_SIGNOFF |
| [statement-pilot-format.test.ts](<E:/ohada saas/Focused projects/stoquify/services/payments/__tests__/statement-pilot-format.test.ts>) | Adversarial format, fingerprint, Decimal and capacity regressions |
| [provider-formats.postgres.test.ts](<E:/ohada saas/Focused projects/stoquify/services/payments/__tests__/provider-formats.postgres.test.ts>) | Real importer/coverage services; replay, rollback, concurrency, late activity and capacity |

The run's `source-before.json` and `source-after.json` identify inspected and final owned source hashes. Test assertion names and individual results are retained in the Jest JSON outputs.

## Acceptance criteria

| Criterion | Outcome and evidence |
|---|---|
| AC1: CSV quoting, newlines, BOM, fees, reversals and malformed lines | **PASS** — Four-record synthetic CSV plus parser regressions; JSON aliases/keys; mandatory fields; strict calendar/timezone and monetary inputs |
| AC2: Decimal controls and no hidden partial/duplicate import | **PASS** — 126.70 unsigned amount sum, 0.20 fee-attribute sum; SQL event-failure rollback; full-file duplicate hold; 1,000 rows total 100.00 |
| AC3: No-activity, stale and missing coverage | **PASS** — Real independent no-activity approval, same-maker denial, late import contradiction; retained source-manifest signature fixture becomes STALE_SIGNOFF; account/currency/gap mocked regressions |
| AC4: Fingerprint compatibility and duplicates | **PASS** — Fixed historical hash input; exact legacy bytes replay without parsing; historical receipt reused; simultaneous exact/changed identity imports; account isolation |
| AC5: Honest live provider scope | **PASS** — Generic synthetic profiles documented; official MTN/Orange/bank dialects and connectivity remain NOT VERIFIED |

The signed-run SQL scenario uses a retained certificate fixture built from the real source manifest. It proves current-proof detection and preservation of the historical hash. It does not execute the full independent financial signing workflow or establish release certification.

## Verification by evidence class

| Class | Command / scope | Result |
|---|---|---|
| Workflow contract | Initial `npm run agent:workflow:check`; final `node scripts/verify-agent-workflow-contract.js` | Initial unrelated restart-script drift; final exit 0. AF07 did not edit that script or registry. 196 commands remain unclassified |
| Pure/mocked tests | `node node_modules/jest/bin/jest.js --config jest.provider-formats.config.cjs --runInBand --json --outputFile …/unit-results.json` | Exit 0; **112 tests, seven suites** |
| Real PostgreSQL | Same Jest CLI with `jest.provider-formats-postgres.config.cjs`, explicit AF07 URL/cluster guard | Exit 0; **nine scenarios** |
| Types | `node node_modules/typescript/bin/tsc --project tsconfig.provider-formats.json --noEmit` | Exit 0; focused production dependency closure |
| Schema/client preparation | Isolated Prisma config/client; fresh database `migrate deploy` | Exit 0; 102 existing migrations applied; application database and shared generated client untouched |
| Rendered/browser application | No UI, route or upload-flow change | Not applicable; no new browser or accessibility claim |
| Publication | Repository docs-report-publisher, A4/text/heading/pair checks and rendered sample inspection | Matching MD/PDF publication; machine-readable artifact results retained in run folder |

Focused test breakdown: adapter 12; strict format 41; statement import 13; account coverage 8; source-manifest evidence 16; bank-balance contract 15; provider operations 7.

The disposable target is `stoquify_local_af07_20261020_r1` on `127.0.0.1:55441`. Its task-owned PostgreSQL data directory was verified by realpath before database creation and tests. Creation refused an existing database. No reset or seed hook ran. SQL tests replace only the application's database binding with this guarded client; domain import, module admission, locks, events/outbox, invalidation and coverage services execute against PostgreSQL. Only the `server-only` marker is stubbed.

The test client uses the application's 10-second maxWait and 15-second transaction timeout. The final 1,000-row import took approximately **1.78 seconds** and the parser approximately **40.6 ms**. A 10,000-row exploratory import exceeded the application timeout budget; its retained evidence explains the final 1,000-record limit. These measurements do not certify production capacity.

Initial failures were resolved before final results: replay mock shape, within-file identity application, event correlation/rollback assertion and explicit TypeScript array type. The rollback injector first did not target the event because correlation was missing at its top level; after correlation was passed, the existing safe error boundary correctly returned INTERNAL_ERROR. The final test asserts that safe error and verifies all transactional effects rolled back. Exploratory/failed SQL logs remain separate from the final passing log.

## Controls and delivery review

- Architecture/integration: existing adapter/service boundaries, inbox, intent, source manifest and outbox reused; no new dependency, queue or provider feed.
- Database/accounting: exact Decimal persistence, all-or-nothing imports, scoped identity and retained hashes; no direct balance write, journal posting or signing-policy change.
- IAM/security/privacy: trusted action context and module controls remain the entry boundary; foreign-account SQL denial tested; raw row metadata removed for new lines; webhook verification unchanged.
- Product/firm process: stale or missing sources remain actionable reconciliation/evidence work. Empty imports do not eliminate blockers.
- Operations/performance: strict bounds, same-intent retries, source uncertainty and pilot capacity documented. Multi-account production load remains an AF16 gate.
- Frontend/accessibility/localization: not applicable to implementation; no UI change. Existing contracts receive generic reason strings, missing/partial signoff gaps and blocked counts.
- Country/AI/commercial: not applicable; no statutory rule, autonomous financial action, entitlement, package or billing change.

## Rollout, rollback and remaining gates

No schema or data migration is required by AF07. Introduce the application slice only with reviewed pilot format samples and the existing import authority/module controls. Unsupported files must remain rejected. Preserve fingerprints, retained receipts, exceptions and historical signatures.

For operational rollback, pause new ingestion and retain authorized reads/recovery; do not delete or reimport records. A code rollback must explicitly assess the risk of restoring permissive parsing or stale-proof coverage. See [OPERATIONS.md](OPERATIONS.md) for outage, uncertain result and rejected-format procedures.

Official provider samples/connectivity, full network-failure exercises, production account-scale performance and AF16 release/pilot qualification remain open. No production readiness claim is made. The next justified roadmap phase is **AF08: Review workpapers and readable close deliverables**; it has not been started.
