# AF04 firm engagement authorization and lifecycle services

**Updated:** 20 October 2026. **Status:** VERIFIED.  
**Scope:** AF04 only, reusing AF03 and existing consent, RBAC, session, module, evidence and event/outbox infrastructure.  
**Source:** `6ee84a90c760d2864f6aef672d8b393ac2b65971` plus the shared working tree. AF01–AF03 and unrelated landing/onboarding/retention edits were already present. No commit, deployment, production migration or real client enrollment was performed.

## Delivered behavior

Firm managers with the existing `accounting.close.accountant.invite` permission can create draft engagements, assign existing firm staff, explicitly enroll an existing named mandate, activate/suspend/end an engagement, remove an assignment and hand over to different staff. Commands require persistent current authority, a live password-confirmed session within five minutes, expected versions and a firm-scoped idempotency key. State, retained transition evidence, business event, audit and outbox commit together.

Managed access now requires every applicable predicate: usable firm-home account, current action permission, home/client module access, active named client mandate, active engagement and current assignment within their effective windows, role ceilings and the existing domain rules. Management ownership never grants export, financial posting or review authority. READ_ONLY remains read-only; PREPARER and REVIEWER retain existing meanings.

The shared resolver enforces these restrictions for portal, portfolio, work desk and notification history. Evidence request/acceptance reuse the existing transaction-level authorization locks. Delegated trust-pack export now holds that authority inside its publication transaction and revalidates before returning. Portal and review-queue reads recheck current access after reading; the work desk also removes earlier clients and their coverage counts if access is lost during later fan-out.

Existing unlinked grants retain their consent semantics. Existing module retention and legacy full-suite intent remain authoritative. Ended engagements retain management metadata but never retain financial access merely because their records must be kept.

## Implementation and reuse map

| Area | Implementation |
| --- | --- |
| Command validation | `services/accounting/firm-engagement.schemas.ts`: strict command union, existing role vocabulary, version/date/key/reason validation. |
| Protected actions | `actions/accounting/firm-engagement.actions.ts`: existing protect, management permission, home accounting module, trusted session context and fresh authentication. |
| Lifecycle and metadata | `services/accounting/firm-engagement.service.ts`: AF03 records, one-client transactions, assignment/handover, scoped replay, immutable transition receipts and existing business-event/outbox publication. |
| Managed intersection | `services/accounting/managed-accountant-access.service.ts`, shared consent resolver and portfolio grant selection. No second membership or permission store. |
| Sensitive boundaries | Existing `close-evidence-acceptance-authority.service.ts` extended for management/export; existing acceptance/request domain writers remain responsible for financial/evidence rules. |
| Export/read integration | `data-trust.actions.ts`, `data-trust.service.ts`, work desk and review queue; notification history already delegates to the shared work-client authorization path. |
| Persistence and rollback | `20261019140000_firm_engagement_authority/migration.sql`: replaces the temporary enrollment fence, retains immutable links, introduces a sticky managed namespace and cross-namespace named-scope uniqueness. |
| Runtime client | `prisma/db.ts` now rejects a hot-reload cached client missing the AF03 models. The schema change in AF04 is explanatory comments only; no new models were introduced. |

The historical graph dated 9 August 2026 identifies accountant access actions in community 58 and data-trust actions in community 69. Those nodes were discovery aids only; current source and callers supplied the behavior and boundary evidence. No graph was regenerated.

Source entry points at verification: [command validation](<E:/ohada saas/Focused projects/stoquify/services/accounting/firm-engagement.schemas.ts:10>), [lifecycle transaction](<E:/ohada saas/Focused projects/stoquify/services/accounting/firm-engagement.service.ts:23>), [retained metadata read](<E:/ohada saas/Focused projects/stoquify/services/accounting/firm-engagement.service.ts:151>), [managed authority intersection](<E:/ohada saas/Focused projects/stoquify/services/accounting/managed-accountant-access.service.ts:22>), [export lock wrapper](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-evidence-acceptance-authority.service.ts:63>) and [cross-namespace uniqueness](<E:/ohada saas/Focused projects/stoquify/prisma/migrations/20261019140000_firm_engagement_authority/migration.sql:4>). The source manifest fixes their verified file hashes.

## Acceptance criteria

All five AF04 acceptance criteria passed within the evidence boundaries below. The final frozen-migration run passed on both clean and populated AF03-upgrade databases.

| Criterion | Verified evidence |
| --- | --- |
| PASS — AF04-AC1: every predicate required | Managed-access matrix tests; persisted session/RBAC/module authority regressions; actual SQL deactivation, role removal, expiration, revocation, suspension and assignment removal. |
| PASS — AF04-AC2: deterministic competing writes | Real SQL authority-lock races; actual successful certified synthetic exports versus suspend/revoke; actual retained acceptance replay versus suspend/revoke; retained audit/event/outbox and post-restriction denial. |
| PASS — AF04-AC3: replay, version and atomicity | Same-key replay, changed-payload and stale-version conflicts, competing same-key transitions, failure after real outbox insertion followed by full rollback and retry. |
| PASS — AF04-AC4: no self-elevation or tenant guessing | Strict direct-action tests, persistent manager permission/session checks, foreign staff and guessed client/engagement denials; assignments never create or transfer consent. |
| PASS — AF04-AC5: legacy and rollback safety | Existing unlinked-grant regressions, populated AF03 preservation, sticky-key reset/delete denial and rejection of an older invitation writer's second active namespace. |

## Verification record

Canonical latest evidence: [20 October run 04](2026-10-20-run-04/). Earlier attempts are retained, including the interrupted-cluster connection failure, advisory-lock decoding correction, harness corrections and the superseded pre-final migration run. Run 03 is not the final migration checksum baseline: the named-scope index was added during that earlier run.

| Evidence class | Command or method | Scope |
| --- | --- | --- |
| Workflow contract | `npm run agent:workflow:check` | Read-only command-contract verification; no application/database command dispatch. |
| Generated client | `node node_modules/prisma/build/index.js generate --schema .codex-tmp/af04-prisma/schema.prisma` | Current models generated into an isolated repository-local output, avoiding the shared Windows engine lock. No database writes. |
| Schema | `node node_modules/prisma/build/index.js validate` | Explicit synthetic loopback environment variables; no application target mutation. |
| Focused types | `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.firm-engagement.json` | Lifecycle/actions plus existing portfolio, export and work-desk dependency slice; incremental output disabled. |
| Mocked/service/action/component | `node node_modules/jest/bin/jest.js --config jest.firm-engagement.config.cjs --runInBand --no-cache --json --outputFile <evidence>/unit-complete.json` | Existing regressions plus strict direct-action and managed-intersection tests. Test authentication adapters are mocked; persistent authority is tested separately against SQL. |
| Real PostgreSQL | `node scripts/run-firm-engagement-authority-postgres.cjs 2026-10-20-run-04` | New clean and populated-AF03-upgrade databases; full migration application/replay and real service/race tests. |
| Publication | Repository docs-report-publisher and PDF text/page/hash/render checks | Matching Markdown/PDF pairs; report publication is separate from runtime verification. |
| Browser / full build / release | Not run | No UI changes. AF02 browser results are historical; AF16 release/pilot gates remain open. |

**Results:** 16 focused suites / 538 tests passed. All 27 real PostgreSQL tests passed on each target (54 executions). The clean target applied 101 migrations; the populated upgrade applied the 100-migration AF03 predecessor followed by AF04. Both final migration replays passed, with unchanged migration checksums, preserved legacy/AF03 records and zero automatic enrollments. Focused TypeScript, Prisma validation and workflow-contract checks passed. The workflow check still reports 196 unclassified package scripts; this is not whole-repository certification.

Machine-readable records: [verification summary](2026-10-20-run-04/verification-summary.json), [database results](2026-10-20-run-04/database-results.json), [source manifest](2026-10-20-run-04/source-manifest.json) and [publication checks](2026-10-20-run-04/accounting-publication-verification.json). The owned local PostgreSQL cluster was stopped after verification; its disposable databases were retained. No application or production database was changed.

The runner requires absolute `AF04_CLUSTER_DIR` and `AF04_PRISMA_CLIENT` paths, verifies `SHOW data_directory`, refuses existing database names and production mode, and checks migration hashes again before declaring success. It creates only `stoquify_local_af04_2026_10_20_run_04_clean` and `_upgrade` on owned loopback port 55441. The upgrade fixture includes an active unlinked grant plus retained AF03 draft engagement/revoked mandate/link before the AF04 migration. It verifies preservation and no automatic enrollment.

The SQL suites use the actual lifecycle, resolver, module, role, session, export and business-event/outbox implementations. Scheduling wrappers call the real lock functions; the rollback test publishes a real event/outbox before injecting failure. The synthetic financial fixture seeds a balanced journal and source/batch evidence; its export uses the actual trust calculation. This demonstrates the authorization/publication race, not production accounting certification. Actual acceptance replay and its SQL authority locks are exercised; new finding resolution/replacement behavior remains covered by existing mocked domain regressions rather than a new end-to-end replacement fixture.

The new runners were reviewed separately because they are not registered package commands. Prisma migrate deploy changes only the newly named disposable targets. No reset, seed hook, schema push, production promotion, provider execution or notification delivery worker was run. Existing unrelated schema drift was not repaired or applied.

## Activation, rollback and operating limits

1. Generate the current Prisma client and deploy the restrictive application readers/writers before any real enrollment. Apply AF04 only through the separately authorized schema-promotion process. AF03 remains an explicit prerequisite.
2. Preflight duplicate non-null named scopes before the new partial index on an approved target. Unexpected duplicates must be reviewed; this migration does not delete, merge or silently revoke consent.
3. Start with existing named client consent and eligible firm-home staff. Create → assign → explicitly enroll → activate. This phase adds services/actions, not the AF05 management UI.
4. Watch authority denials, stale version/key conflicts, transaction timeout/deadlock failures, failed command publication and outbox delivery failures separately. Delivery is never proof of authority.
5. On rollback, stop new commands through existing module write controls while retaining managed readers, sticky keys, uniqueness, links and receipts. Never rewrite managed keys to legacy or delete enrollment history. Downgrading to arbitrary historical readers is not an approved recovery.
6. A legacy AF03-era exact-key reader cannot see a managed grant. An old invitation writer cannot create a second non-null scope for that accountant/client pair. A genuinely new unlinked mandate requires fresh explicit client consent after the previous scope has been retired.

See [authority and lock order](AUTHORITY_AND_LOCK_ORDER.md) for the command contract and transaction ordering. Lifecycle commands are bounded to one client, although the number of that firm's retained grants for that client is not a production-scale benchmark. The deployment team must assess index-lock impact, timeout behavior and realistic portfolio/firm sizes before rollout.

## Review lenses and next step

Architecture/backend/database/IAM/privacy are material: existing identity and consent reused, current authority revalidated, immutable history retained, no financial privilege inferred from management labels. Accounting/evidence controls are material: existing domain writers and independent-review rules remain authoritative. QA/SRE/release are addressed by distinct mocked, SQL, migration, failure/retry and publication evidence.

Frontend/localization/accessibility changes are not applicable: no interface was added. Country legislation, authority filing, AI agents, payments/providers and SaaS packaging changes are not applicable: none were introduced. No external legal, tax, accounting, security or release certification is claimed.

The next phase is **AF05: firm engagement workflows**, using these commands and retained metadata reads. AF05 has not been started. Technical release, real pilot authorization and production qualification remain AF16/separate operational gates.
