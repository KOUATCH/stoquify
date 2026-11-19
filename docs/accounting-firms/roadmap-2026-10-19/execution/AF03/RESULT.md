# AF03 firm engagement model: implementation and verification

**Date:** 19 October 2026. **Status:** VERIFIED within the additive schema/domain-contract scope. **Source revision:** `6ee84a90c760d2864f6aef672d8b393ac2b65971` plus the shared working tree and owned files listed below. No production migration, deployment, commit, account relocation or real client enrollment occurred. AF04/AF05 and AF16 qualification remain unexecuted.

AF03 adds explicit firm/client engagements, versioned team assignments, permanent mandate links and ordered transition receipts. It reuses Organization, User, existing tenant roles and AccountantAccessGrant. The new tables confer no access. A temporary database fence permits links only to revoked mandates and prevents linked mandates from reactivation until AF04's authorization integration is verified.

## Acceptance results

| Criterion | Result | Evidence |
| --- | --- | --- |
| AF03-AC1: entity ownership, scope, lifecycle, retention and access consequence | PASS | [ADR](ENGAGEMENT_ADR.md) entity matrix, diagram and transition table; [capability matrix](CAPABILITY_MATRIX.md); four Prisma models and SQL guards. Owner/creator/assigner/ending/enrolling/transition actors bind to the firm home organization. |
| AF03-AC2: tenant consistency and unique active identities enforced in database | PASS | Composite foreign keys reject mismatched firms, clients, staff, mandate identities and actors. Partial unique indexes allow one non-ended firm/client engagement and one unended assignment per accountant/engagement. Real competing-writer tests confirm only one identity claim or transition succeeds. |
| AF03-AC3: no new visibility or automatic legacy enrollment | PASS | Empty new tables after both migrations; original legacy grant compared byte-for-byte before/after upgrade. Existing resolver still accepts unlinked READ_ONLY read and rejects export. Assignment/active engagement without active mandate is denied; permanent linked revoked mandate stays denied after suspension/end. No name-based backfill or writer endpoint. |
| AF03-AC4: clean apply, populated upgrade and rollback compatibility | PASS | Latest [database results](2026-10-19-run-03/database-results.json): clean 100-migration replay, populated 99→100 upgrade, repeated deploy with no pending migrations, 31 real PostgreSQL tests on each target. Tests cover legacy reads/writes, transaction rollback, retained records and dormant-code rollback safety. |
| AF03-AC5: no production mutation, relocation, auth replacement or verification claim | PASS | Dedicated runner checks owned cluster identity and fresh database names; all records synthetic. User email/home-org model, existing services, roles, protected actions and entitlements retained. Firm identity is organizational identity, not professional/legal verification. |

Latest real-database evidence: [clean tests](2026-10-19-run-03/clean-tests.json), [upgrade tests](2026-10-19-run-03/upgrade-tests.json), [catalog and checksums](2026-10-19-run-03/database-results.json). Earlier run 01 retained 23 passing database tests per lane; run 02 added seven denial/lifecycle cases. Final run 03 adds a repeatable-read snapshot regression and hardens the migration fence by touching the revoked mandate tuple without changing values, so an older concurrent writer must serialize-fail instead of missing the new link.

## Reuse, discovery and owned changes

AF02's result and current portfolio sources were inspected; its existing focused test lane passes again. Graph action node `accounting_accountant_access_actions_ts` was used for discovery only: graph file dated 8 September 2026 is older than current services. Current source confirms that `resolveAccountantClientAccess` accepts active named mandates and does not yet inspect engagement assignments. Descriptive firm names and registration text cannot safely identify a firm.

| Area | Classification and implementation |
| --- | --- |
| Firm identity and staff | Implemented foundation reused: Organization and required User.organizationId with tenant roles. No duplicate profile/membership/auth subsystem. |
| Named consent and invitations | Existing access/invite services reused unchanged. Client consent remains per named accountant. |
| Engagement persistence | Missing at inspection; added four models in [schema.prisma](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:7761>). Supporting reverse relations and composite unique keys added to existing User, Organization and AccountantAccessGrant models. |
| Database controls | Added [20261019120000_firm_engagement_foundation](<E:/ohada saas/Focused projects/stoquify/prisma/migrations/20261019120000_firm_engagement_foundation/migration.sql:1>). Transactional additive SQL; no existing data updates. Partial indexes, tenant foreign keys, bounded windows, immutable terms, assignment versions, transition receipts, retained links and revoked-only fence. |
| Synthetic verification | New [runner](<E:/ohada saas/Focused projects/stoquify/scripts/run-firm-engagement-postgres.cjs:1>), [PostgreSQL tests](<E:/ohada saas/Focused projects/stoquify/services/accounting/__tests__/firm-engagement.postgres.test.ts:1>) and `jest.firm-engagement-postgres.config.cjs`; reuse installed Prisma, PostgreSQL, Next/Jest and existing resolver. |
| Managed access and workflow | Deliberately deferred to AF04/AF05. No service or UI activation in AF03. Dormant schema readiness is not live engagement functionality. |
| Publication | This result, ADR, capability matrix, migration plan, follow-up and current roadmap/index updates. Original analysis, phase prompts and historical phase results preserved. |

The pre-existing shared changes include AF01/AF02 and unrelated landing, onboarding and retention work. Those edits were preserved; no files were staged. See [owned source manifest](2026-10-19-run-03/source-manifest.json) for exact hashes.

## Verification by evidence class

| Class | Command / result | Practical boundary |
| --- | --- | --- |
| Workflow/source inspection | `npm run agent:workflow:check`: exit 0, 196 unclassified scripts. Reviewed definitions, npm hooks, command registry, Prisma config, migration history and dedicated runners before execution. | Workflow contract only; no application/database certification. |
| Schema validation | `node node_modules/prisma/build/index.js validate`: exit 0; [log](2026-10-19-run-02/prisma-validate.log). | Explicit synthetic connection variables; no target mutation. Prisma model unchanged by final SQL-fence hardening. |
| Generated types/client | Isolated `prisma generate --schema .codex-tmp/af03-prisma/schema.prisma`: exit 0; copied current schema changes only generator output. | Initial shared generation failed on a Windows engine-file lock; isolated output avoided stopping unrelated processes. An initial outside-repository generation also failed dependency resolution; repository-local isolated output succeeded. |
| Mocked/pure/component regressions | `node node_modules/jest/bin/jest.js --config jest.accountant-portfolio.config.cjs --runInBand --no-cache --json --outputFile .../run-01/portfolio-regressions.json`: exit 0, 9 suites / 268 tests. [Results](2026-10-19-run-01/portfolio-regressions.json). | 231 service/pure tests and 37 portfolio/route components. Separate work-desk suite was not rerun in AF03. |
| Focused TypeScript | `node node_modules/typescript/bin/tsc --project tsconfig.accountant-portfolio.json --noEmit --pretty false`: exit 0, [empty success log](2026-10-19-run-01/typecheck.log). | Existing portfolio dependency slice; no whole-repository type/build claim. |
| Real PostgreSQL | `node scripts/run-firm-engagement-postgres.cjs 2026-10-19-run-03` with explicit `AF03_CLUSTER_DIR` and `AF03_PRISMA_CLIENT`: exit 0. Clean apply/replay and populated upgrade/replay; 31 tests on each database. | Real SQL constraints/transactions/competing connections and existing resolver. Only event publisher is replaced with a throw-if-called stub; database is real. Synthetic tests do not prove future protected writer services. |
| Schema agreement | Prisma `migrate diff --from-url <explicit disposable clean target> --to-schema-datamodel prisma/schema.prisma --script`: exit 0. [Scoped analysis](2026-10-19-run-02/schema-comparison.json). | No AF03 model/key drift. Full repository diff contains existing unrelated drift; generated SQL was retained for inspection and never applied. Prisma does not model custom trigger/check/partial-index semantics; final real tests cover those. |
| Browser/accessibility | Not run; no UI changes. | AF02 browser evidence remains historical and separately scoped. |
| Rendered publication | Matching Markdown/PDF pairs generated by docs-report-publisher; verification retained in `2026-10-19-run-03/publication-verification.json`. | A4/text/headings/hash checks plus representative rendered-page inspection. Does not extend runtime evidence. |

The runner's exact target names are `stoquify_local_af03_2026_10_19_run_03_clean` and `stoquify_local_af03_2026_10_19_run_03_upgrade`, on owned loopback port 55441. The predecessor fixture existed before AF03 upgrade. No configured application target was inferred to be disposable. All 100 migration names/checksums and test logs are retained. Databases remain available for inspection; the owned PostgreSQL server is stopped after verification.

## Domain and security decisions

Engagement scope uses the existing AccountantAccessRole vocabulary as a ceiling. READ_ONLY stays read-only; REVIEWER/PREPARER are not silently redefined or made a new rank hierarchy. Ownership is responsibility, not export/review approval. Future access must intersect active named consent, current assignment, engagement status/window, actor/tenant eligibility and existing permission/module/domain rules.

The database enforces aggregate identity, state order and retained history, not caller RBAC. AF04 must implement protected actor checks, named consent, fresh authority reads, revocation races, transaction/idempotency and existing business-event/outbox integration. This phase creates no balances, financial postings, notifications, client organizations, invitation tokens or entitlements.

Assignment termination records a firm-home actor and reason, is irreversible, and permits a nonoverlapping next version. Existing users cannot be moved to another organization while referenced. External reviewers keep their separate explicit mandates; multi-organization identity is out of scope.

## Rollout, rollback and operations

See [migration plan](DATA_MIGRATION_PLAN.md). There is no enrollment surface or rollout flag to enable in AF03. Leave the foundation dormant. Before any real rollout, separately authorize schema promotion and measure index-lock impact on a representative approved staging copy; this local rehearsal is not production approval.

The important safety boundary is the temporary fence: AF03 links require already-revoked mandates and linked mandates cannot be reactivated. No migration silently revokes existing consent. Suspended/ended engagements retain links, assignments and receipts. Reverting an application or switching a flag cannot remove those tombstones or restore access. Keep all additive tables on rollback.

AF04 must verify every sensitive managed-access boundary before a reviewed follow-up migration replaces this fence. Once live enrollment is supported, old readers lacking managed checks are not a safe fallback unless managed mandates are first explicitly disabled under the reviewed rollout procedure. AF05 enrollment workflows cannot be activated before that gate.

Observe rejected duplicate identities, tenant mismatches, stale transitions and attempted reactivation; these indicate invalid commands or stale callers. Accounting engineering owns the lifecycle contract; IAM owns access integration; database/release operations owns authorized promotion. Aggregate locks and bounded indexes were exercised with synthetic competing writers, not benchmarked at production scale. Retention is indefinite until a separately approved purge policy exists; no statutory-retention claim is made.

## Review lenses and remaining work

Architecture/backend/database/IAM/accounting-product lenses are material: existing identities and consent reused, database invariants enforced, review authority separated from management, and conservative rollout specified. QA/release/SRE lenses are supported by fresh migration/replay/race/rollback evidence and explicit promotion limits. Privacy is addressed by minimal identifiers/reasons and retained attribution. SaaS packaging/customer-success changes are not applicable to dormant schema. Frontend/accessibility/localization are not applicable because no UI changes. Country compliance, AI, payment/provider integrations and financial posting rules are not applicable because this phase introduces none of those capabilities.

**Outcome:** all five AF03 criteria pass within this boundary. No unresolved AF03 verification blocker remains. The smallest next phase is AF04 authorization/lifecycle services, including controlled replacement of the revoked-only fence. AF04 has not been started. AF16 technical release and pilot qualification remain open.
