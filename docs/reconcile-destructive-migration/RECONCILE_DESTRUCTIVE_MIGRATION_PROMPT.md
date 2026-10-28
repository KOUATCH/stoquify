# Stoquify destructive Prisma migration reconciliation prompt

Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

Project:
Stoquify / AqStoqFlow

Workspace:
`E:\ohada saas\Focused projects\stoquify`

Domain:
Destructive Prisma migration assurance, data preservation, authentication continuity, backup/recovery, and maker-checker release governance.

Mission:
Complete an evidence-led review and, only where explicitly authorized, prepare or execute isolated rehearsals for the destructive Prisma migration:

`prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql`

The migration is currently bound to:

- Migration SHA-256: `f7de8dc7ace0a5e063cdb7ecd9527e77807b7f872e474546819e9fca13a273d4`
- Destructive-operation count: `13`
- Destructive inventory SHA-256: `55d332c3319b65acfdf415e64042a15504d12861b664429af7e63155296e1ad1`
- Current disposition: `BLOCKED_EVIDENCE_INCOMPLETE_NO_DECISION`

Produce a hash-bound evidence bundle that either:

1. proves the exact migration hash safe for a precisely identified deployment path and submits it for independent human review; or
2. confirms `REJECT_AND_REWORK` with exact unresolved blockers.

Do not modify the migration, execute it against production or a shared environment, mutate production migration history, add an approval entry, or claim approval.

Active reviewers:

- Principal database and migration architect.
- Application-security, IAM/RBAC, privacy, and abuse-resistance architect.
- Authentication and session-lifecycle engineer.
- SRE, backup, recovery, and release-engineering lead.
- Quality and migration-test engineer.
- Audit, records-governance, and evidence-integrity specialist.
- Independent maker-checker/internal-controls specialist.
- Enterprise/platform architect responsible for tenant and accounting-boundary safety.

Operating constraints:

- Treat the existing maker-checker packet as the control baseline.
- Preserve all unrelated dirty-worktree changes.
- Do not edit any file under `prisma/migrations/`.
- Never copy a production database URL, password, token, OAuth credential, session token, account token, IP address, or personal data into repository evidence.
- Database-mutating rehearsals may run only against an explicitly attested, disposable, isolated database.
- Do not run `prisma migrate deploy` or `prisma migrate resolve` until the target has been proved isolated and the user has explicitly authorized that rehearsal.
- Use UTC ISO-8601 timestamps.
- Hash every artifact with SHA-256.
- Distinguish observed facts, test results, operator attestations, checker decisions, and proposals.
- A template or AI-generated placeholder is not completed evidence.
- Human identity, authority, independence, backup identifiers, RPO/RTO acceptance, and approval decisions must come from accountable humans or controlled systems.

Evidence to inspect:

- `docs/blockers/STOQUIFY_MIGRATION_RISK_MAKER_CHECKER_PACKET_2026-08-13.md`
- `docs/blockers/stoquify-migration-risk-maker-checker-packet-2026-08-13.json`
- `docs/blockers/stoquify-migration-risk-maker-checker-packet-2026-08-13.sha256`
- `prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql`
- `prisma/schema.prisma`
- `prisma/migration-risk-approvals.json`
- `prisma/migration-history-checksum-approvals.json`
- `docs/operations/runbooks/prisma-production-migrations.md`
- `scripts/prisma-production-migration-gate.js`
- `scripts/__tests__/prisma-production-migration-gate.test.js`
- Current auth/session/RBAC consumers cited by the packet.
- `graphify-out/GRAPH_REPORT.md`
- Relevant predecessor migration and blocker packets.

Required deliverables:

Rehearsal:

- R-01 `environment-census.json`
- R-02 `affected-data-profile.json`
- R-03 `execute-empty-baseline-rehearsal.log`
- R-04 `resolve-existing-database-rehearsal.log`
- R-05 `reconciliation.json`
- R-06 `auth-regression.log`

Backup and recovery:

- B-01 `backup-manifest.json`
- B-02 `restore-test.log`
- B-03 `recovery-runbook.md`
- B-04 `transaction-failure-injection.log`
- B-05 `resolve-metadata-recovery.log`

Maker-checker:

- A-01 `maker-attestation.json`
- A-02 `checker-decision.json`
- A-03 conditional exact-hash migration-risk approval entry

Evidence-bundle location:
`docs/reconcile-destructive-migration/evidence/MIG-RISK-20260611130000-F7DE8DC7-RECONCILED-2026-08-13/`

Only redacted, repository-safe artifacts may be stored there. Secure raw evidence may remain in controlled external storage, but the repository manifest must record its immutable identifier, SHA-256, custodian, collection time, and redaction status.

Tasks:

1. Recalculate the migration, destructive-inventory, packet, consumer-file, and evidence-source hashes.
2. Confirm the current Git state and prove the migration has not been modified.
3. Search for all 14 required artifacts and classify each as `PRESENT_VALID`, `PRESENT_INVALID`, `PARTIAL`, `MISSING`, `NOT_APPLICABLE_PENDING_CHECKER`, or `EXTERNAL_HUMAN_ACTION_REQUIRED`.
4. Do not treat templates as evidence.
5. Create safe schemas/templates for missing artifacts when actual operational evidence cannot be collected.
6. Perform read-only discovery without targeting a database unless access and scope are explicitly authorized.
7. Before any rehearsal, prove the database is disposable, isolated, non-production, and has a recorded recovery path.
8. Bind every result to the exact migration hash, Prisma schema hash, Git commit, database-engine version, Prisma/Node versions, environment record, timestamps, commands, and exit codes.
9. Require deterministic before/after comparisons for affected application tables and `_prisma_migrations`.
10. Prepare the maker package, but leave maker identity fields empty unless supplied by the accountable maker.
11. Do not create an approving checker decision. An independent authorized human must review and decide.
12. Do not add A-03 unless A-02 contains a valid `APPROVE_EXACT_HASH` decision from a different authorized checker.
13. Rerun the migration safety gate after the evidence review.
14. Produce a final disposition of `REJECTED`, `READY_FOR_INDEPENDENT_CHECKER`, or `APPROVED_EXACT_HASH_BY_RECORDED_HUMAN_CHECKER`.
15. The third disposition may only report an approval already present in valid evidence. The agent must never create or impersonate that approval.

Verification:

- Recalculate all SHA-256 bindings.
- Confirm all 13 destructive operations are represented once.
- Verify all 24 consumer/evidence-source hashes.
- Run `npm test -- --runInBand scripts/__tests__/prisma-production-migration-gate.test.js`.
- Run `npm run prisma:validate`.
- Run the read-only migration readiness builder or `npm run prisma:migration:safety:gate`.
- Record its expected fail-closed result until a valid approval or migration rework exists.
- Use `prisma migrate status`, `migrate deploy`, `migrate resolve`, schema comparison, or database checks only on an explicitly authorized isolated database.
- Record passed, failed, skipped, blocked, and not-applicable checks separately.

Success criteria:

- Every destructive ID D-001 through D-013 has an evidence-backed disposition.
- All 14 artifacts are valid, or the final report identifies exactly why each remaining item cannot be completed.
- No secrets, token values, raw personal data, or production connection details enter the repository.
- Rehearsal and restoration results are independently reproducible.
- The selected deployment path is explicit for every controlled environment.
- Backup existence and restore viability are separately proved.
- Recovery steps are tested rather than merely described.
- Maker and checker are different accountable people.
- The approval registry remains unchanged unless a valid independent approval explicitly authorizes the exact hash.
- No migration or production database is modified.
- The final report makes no unsupported release or approval claim.

Non-goals:

- Do not rewrite the authentication system.
- Do not refactor unrelated code.
- Do not clean unrelated lint or type errors.
- Do not change the Prisma migration.
- Do not reset, reseed, or clone a production database without explicit authorization.
- Do not infer that absent runtime consumers make legacy security data disposable.
- Do not equate a successful Prisma schema validation with migration safety.
- Do not equate an available backup with a tested restore.
- Do not equate one `approvedBy` registry field with maker-checker separation.
