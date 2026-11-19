# P04-R03 — nine item-action response paths

Candidate **p04-r03-20261104-9c1182e0773a**. **Independently accepted for local nine-path completion** ([assessment](independent-review/ASSESSMENT.json)). Source/unit/native qualification passed; controlled publication review is recorded separately. **Parent P04 and production remain blocked.**

## Bounded repair

Refreshed the two read handlers and seven mutation catches in actions/item/items.ts. The repair changes one product file and adds one regression-test file. It reuses the existing safe logged action contract with explicit fallbacks and15 source-reviewed literal/type business messages. Unknown exceptions, provider-shaped codes, Prisma details, thrown strings and raw validation issues no longer become client error text. Explicit item-not-found, authentication recovery, framework control flow and authorized result shapes are preserved.

[Current inventory](inventory/INVENTORY.md), [source-before hashes](source-before.json), [owned source/candidate](owned-source.json), [response contract](RESPONSE-CONTRACT.md) and [independent source review](independent-review/SOURCE-REVIEW.json) establish the boundary. Reversing only the helper/import/catch changes reconstructs the pre-repair action, allowing CRLF normalization. Permission checks, service arguments, tenant/actor derivation, transactions, module admission, success messages and cache calls are unchanged.

## Verification

| Evidence class | Result | Receipt |
|---|---|---|
| Historical baseline reproduction |9 selected failures returned the synthetic private sentinel;203 other assertions explicitly filtered | [Baseline](unit/attempt01/result.json) |
| Isolated mocked unit/actions |224/224 tests,4 suites,0 failed/skipped;212 new boundary assertions,12 existing compatibility checks | [Unit](unit/attempt02/result.json) |
| Real PostgreSQL/actions |43/43 tests,0 skipped;121 migrations replayed/checksum-verified;5208 source inputs unchanged | [Native result](database/native-result-retry02.json), [database report](database/RESULT.md) |
| Denial/rollback state |32 equal before/after comparisons across24 business relation groups;25 allowed security-audit additions recorded separately | [Observations](database/native-observations-retry02.json) |
| Authorized behavior |All9actions positive; forged-list tenant binding; nonzero stock SUBMITTED approval request without posted inventory/ledger | [Matrix](VERIFICATION-MATRIX.md) |
| Static checks |Two-owned-entry/import-closure typecheck passed; lint2 files0 errors/0 warnings; workflow and owned diff checks passed | [Types](unit/typecheck01/result.json), [Lint](unit/lint01/result.json), [Workflow](workflow-check.json) |

The34 native snapshot pairs comprise32 denied/rolled-back outcomes, one unchanged forged-list read and one intended stock-submission mutation. Nine additional positives check their intended persisted/read result and foreign-item stability. Actual database trigger failure and downstream stock-service rejection prove rollback; foreign item/reference/location cases retain tenant boundaries.

Unit tests use real schemas/normalization with mocked guards/services. Native tests use actual guards, services and PostgreSQL with **Better Auth and Next transport/cache stubs**. Actual signed-cookie HTTP, session expiry/revocation, browser restoration, provider/hosted and operator acceptance were not run here. No full build or whole-domain production qualification is claimed. A post-write cache failure can still return failure after a successful write; seven unit cases preserve and redact that existing behavior without claiming rollback.

## Attempts, isolation and recovery

The initial native attempt encountered sandbox loopback EACCES before database creation/migrations/tests; its owned process ended and absence was verified, but clean shutdown is unproven. Retry01 replayed121 migrations but all43 tests stopped at a bad snapshot predicate before item-action invocation. The harness wrongly assumed an inventory_levels tenant column; all24predicates were then checked against current schema. Corrected retry02 reran all43checks in a fresh target. Both failed attempts remain in [database attempt history](database/RESULT.md). No assertions were skipped or weakened. A malformed unit configuration was rejected/fixed by independent review before execution and retained separately.

The final database was stoquify_local_p04_r03_20261104_r3 at127.0.0.1:57553. OwnedPID1740stopped cleanly, port released, clients empty; all owned clusters are stopped and synthetic data retained. Prior R01/R02 fixtures were not reset. Historical executable test sources are archived inertly with [hash/relocation evidence](database/test-source-relocation-retry02.json).

Rollback only the owned source hunks against the captured baseline while preserving unrelated edits. Unsafe actions must remain outside production admission if this repair is reverted. Invalidate this candidate after relevant source changes and repeat bounded verification. No product migration, flag, deployment, commit or push occurred.

## Remaining work and next action

[P04-R03-SCOPE-01](supplemental-findings.json) records a separate raw-error catch in actions/item/listItemsAction.ts, consumed by hooks/itemsHooks/useItemHooks.ts#useListItems. It is distinct from the repaired same-named items.ts export. Proposed **P04-R04** preserves this source-confirmed defect as unimplemented; this packet does not establish a rendered consumer or qualify all item-list surfaces.

Parent P04 still requires P04-R04, V01–V05 and D01; R01 signed-cookie/browser and production-role classification, R02 original-owner/hosted gates, broader release/operator acceptance and all deferred commitments remain explicit.

**Exact next action:** refresh the P04-R04 sibling list action, current authorization/Prisma chain and hook envelope, capturing hashes and a no-private-sentinel acceptance baseline before its separately authorized repair. Advancement needs isolated redaction negatives, authorized list/pagination positives, denied-state evidence and independent review.
