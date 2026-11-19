# P04-R01 — reserved-role operating authority

3 November 2026. Candidate p04-r01-20261103-b82be2ba13f7. Technical gates passed; independent final assessment is pending. Parent P04 and production readiness remain blocked.

## Repair and authority

The source refresh covers role creation/editing, member assignment/reactivation, invitation issue/replacement/delivery/redemption and access-request preview/approval/application/replay. The [call-chain register](call-chain-inventory.md), [pre-repair hashes](source-before.json) and [authority contract](AUTHORITY-CONTRACT.md) bind the scope. Exact prior bytes are retained as inert .source.txt snapshots; the historical expected-red P04-F01 evidence is unchanged.

The bounded repair changes17 product files and13 test files. Current stored tenant permissions and role codes determine whether an actor can grant reserved admin/administrator/super_admin authority. Limited delegates cannot mint or confer latent empty reserved roles, or activate tenant scope by combining an ordinary dashboard.read role with an existing reserved role. Replays and reactivation reauthorize; role/member/account removal retains an existing usable tenant-wide grant custodian. Existing explicit permission, same-tenant, session/freshness, revision, transaction and custody controls remain required.

New invitation receipts bind issuer and target codes. Legacy ordinary-role receipts remain usable when current checks pass. Legacy reserved receipts without contemporaneous code authority fail closed; no pending invitation/evidence is automatically rewritten or reissued. Default provider delivery remains disabled.

## Verification evidence

| Evidence class | Result | Receipt |
|---|---|---|
| Workflow contract | Pass; current registered definitions | [workflow check](workflow-check.json) |
| Source inspection |106 prior snapshots;30 owned files;17 product files independently reviewed | [candidate](candidate.json), [owned hashes](owned-source.json), [source review](independent-review/SOURCE-REVIEW.json) |
| Isolated pure/mocked/action tests |432/432 across16 suites;0 failures/skips;108 inputs unchanged | [final unit receipt](unit/attempt06/result.json), [independent reconciliation](independent-review/UNIT-RECONCILIATION.json) |
| Static types/lint |17 product entry files typechecked;30 owned files linted;0 errors/warnings | [types](unit/typecheck02/result.json), [lint](unit/lint01/result.json) |
| Real PostgreSQL + action composition |37/37,0 skipped;121 current migrations replayed and checksum-verified;5,204 source hashes stable | [native result](database/native-result-retry01.json), [tests](database/native-jest.json) |
| Denial/rollback persistence |33 matching before/after selected-business-state observations; explicit allowed effects below | [observations](database/native-observations.json) |
| Actual signed-cookie HTTP/browser |NOT RUN for this repair; retained P04-V02 obligation | [work register](../../../work-register.json) |
| Hosted/provider/operator |NOT RUN; no production acceptance | [local gates](advancement-gates.json) |

The native lane executes actual production service/action functions with real RBAC and fresh persisted sessions. Better Auth transport and Next headers/cache invalidation are stubbed; this is not real HTTP or browser evidence. Mocks are not presented as persistence proof. The environment is a fresh PostgreSQL17 cluster at loopback127.0.0.1:64932 and database stoquify_local_p04_r01_20261103_r1; no retained P03/R02 target was modified.

Denial digests cover organizations, users, role memberships, roles, sessions, accounts/password history, locations, invitations, access requests, business events/audits/outbox and module state. Security audit writes are separately counted. Invalid public redemption may add one synthetic abuse bucket; denied legacy reserved redemption left business state unchanged. A failed access-request application records only the explicit FAILED/REVIEW_REQUIRED transition. The lock-race fixture deliberately changes the actor role code; its excluded fixture mutation is recorded. Legitimate positive operations deliberately change fixture data. No claim of zero writes across an entire positive test run is made.

Real contention observed the organization lock before denying after code revocation. Failure after proposed session revocation/member mutation proved transaction rollback. Legitimate administrator create/update/assign/invite/application and ordinary delegation/reactivation/redemption controls passed.

Earlier unit fixture/expectation/environment-guard failures and the unit config syntax error are retained. Environment-file access was blocked before bytes were read. Native initial admission stopped before process/database creation on a formatting comparison; the accepted retry used the installed Prisma6.19.3 canonical formatter to prove exact source/generated/private-schema compatibility. No test was skipped or guard weakened to obtain a pass.

## Recovery and limits

The owned cluster stopped successfully, no client remained, and port64932 was released. All new fixture data, logs and prior failures are retained. Do not blindly rerun the exclusive-output recipe or reset retained fixtures; prepare a new reviewed run identity. Recovery must preserve the operating-authority restriction, source/evidence and a legitimate tenant grant custodian; never restore the exploitable policy.

This binds the scoped source candidate, not a built full-app artifact or production checkout. Existing production reserved-code roles still need owner classification and a separately reviewed remediation decision before release; no production census or role rewrite occurred. Current full-app signed-cookie/browser transport remains P04-V02. Clean-install/build/deployment, provider, hosted and operator gates remain separate. All other P04 packages,57 domains and deferred commitments remain in the roadmap.

No commit, push, production flag/data migration or deployment occurred.

## Next eligible package

P04-R03 — normalize item action failure responses. Exact first action: refresh P04-F03 against actions/item/items.ts and its existing safe-action error contract, then capture source hashes and the nine affected handler/catch paths before preparing the bounded response repair. Advancement needs no-private-sentinel denials, stable approved business/success responses and independent review. P04-R03 implementation is outside this package.

Custodian-specific negative/recovery cases are unit-tested only. The native suite verifies underlying real lock/member/rollback behavior, but no dedicated last-tenant-custodian PostgreSQL case was run. The [verification matrix](VERIFICATION-MATRIX.md) separates these claims. Executed native test source is retained inertly with its [relocation receipt](database/test-source-relocation.json).

INVALIDATED BEFORE PUBLICATION: final caller sweep found delivery-issues read projection missing the new contract. Superseded by current RESULT and final32-file candidate.
