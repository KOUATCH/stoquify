# Stoquify POS G0 Final Reassessment

Date: 2026-08-17

Scope: development-only POS M2 baseline on the isolated certification database

Selected release skills: `aqstoqflow-release-verification-foundation`, followed by `017-aqstoqflow-enterprise-release-gate`

Candidate branch: `codex/pos-g0-release-20260817`

Repair implementation commit: `d7f2e691a5d0f1f53dd27d1ff7885032968e196f`

Evidence-reader commit: `bdad7bbe05f4d7b622281ec1bf74669cf00c1ec4`

## Executive decision

**Development G0: PASS. Production and statutory release: BLOCKED.**

The required execution sequence completed against the authorized local, synthetic-only boundary: fresh `_r2` restore replay, matching final-target replay, native Prisma status, real PostgreSQL concurrency and immutability tests, synthetic pilot setup, and fresh-authenticated EN/FR Microsoft Edge smoke. The original partial restore schema remains intact and the user-owned dirty worktree was not reset, stashed, cleaned, or absorbed into the isolated candidate.

This result proves a reproducible development baseline. It does not certify production deployment, statutory receipts, Cameroon fiscal compliance, physical hardware, electronic tender, offline operation, or legal/accounting readiness. The enterprise release gate remains closed because a historical destructive migration has no exact-hash maker-checker approval and required human/operational attestations remain unproven.

## Required sequence results

| Sequence step | Result | Evidence |
| --- | --- | --- |
| New restore preflight | PASS | `_r2` absent/empty; final target present with 0 tables and 0 migration rows before execution |
| Fresh restore replay | PASS | Prisma deploy exit 0; 67 migrations finished; 191 tables |
| Matching target replay | PASS | Prisma deploy exit 0; 67 migrations finished; 191 tables |
| Schema fingerprint | PASS after evidence-comparator repair | 3,442 columns, 3,011 constraints, and 965 indexes match |
| Native Prisma status | PASS | 67 migrations found; database schema up to date |
| PostgreSQL POS tests | PASS | 3/3: concurrent claim uniqueness, cross-tenant rejection, immutable monotonic lifecycle |
| Synthetic tenant setup | PASS | Organization, location, terminal, drawer, active session, user, role, permissions, and entitlements present exactly once |
| Authenticated Edge smoke | PASS | Fresh credential login; 3/3 Playwright tests; 12 protected route visits across EN and FR |
| Final static baseline | PASS | Prisma validate/generate, typecheck, 7 focused suites/67 tests, service-boundary gate, Kontava gate, production build |

## Migration repair and replay integrity

The additive migration `20260621102500_workflow_assurance_schema_scope_bridge` creates the eleven workflow-assurance enums only when they are absent from `current_schema()`. It contains no table drop, reset, data delete, shipped-migration rewrite, or hardcoded certification schema.

The first `_r2` execution completed both deploys but the evidence comparator reported different hashes despite identical counts. Read-only diagnosis proved that every difference was an automatically generated PostgreSQL NOT NULL constraint name containing relation OIDs. Those names are non-semantic and necessarily differ when identical schemas are created independently. The comparator now:

- canonicalizes database row order;
- normalizes only the PostgreSQL OID-derived `*_not_null` naming pattern;
- retains stable named CHECK, foreign-key, unique, and primary-key identities;
- emits component hashes for columns, constraints, and indexes; and
- supports a read-only reassessment mode that never overwrites the original failed comparison.

The original false-negative evidence remains preserved. The separate reassessment records 67/67 finished target migrations and matching canonical restore/target fingerprints.

## Database boundary after execution

| Schema | Tables | Migration history | Disposition |
| --- | ---: | --- | --- |
| `codex_pos_commit_result_restore_20260817` | 81 | 7 finished, 1 unresolved | Preserved partial restore; not dropped or reset |
| `codex_pos_commit_result_restore_20260817_r2` | 191 | 67 finished, 0 unresolved | Fresh restore replay complete |
| `codex_pos_commit_result_cert_20260817` | 191 | 67 finished, 0 unresolved | Final target complete; synthetic-only |

No public-schema application data was read or mutated by the certification harness. No real customer or payment data was used. Completed sales, payments, stock movements, receipts, fiscal documents, journals, and audit records were not deleted or rewritten.

## PostgreSQL certification

The default Jest setup globally mocks `@/prisma/db`; the original database-suite command therefore failed before reaching PostgreSQL. A dedicated Node-environment Jest configuration now excludes that mock. The final evidence-grade run used open-handle detection and passed all three real database tests:

1. two concurrent claims for the same organization, terminal, and client commit ID produce exactly one success and one unique-conflict result;
2. a cross-tenant source combination is rejected by the database scope trigger; and
3. the registry permits `CLAIMED → COMMITTED → COMPLETED`, then rejects result mutation and deletion.

The expected rejected database operations are visible in Prisma error logging and are asserted as successful control behavior.

## Synthetic pilot and Edge evidence

The idempotent fixture is hard-bound to localhost, database `stoquify_dev_migrated_20260814`, and schema `codex_pos_commit_result_cert_20260817`. It refuses production-marked environments and does not print the synthetic password.

Pilot evidence uses:

- organization `org_stoquify_pos_g0_cert_001`;
- location `loc_cm_dla_akwa_cert_001`;
- terminal `term_cm_dla_akwa_cert_001`;
- drawer `drawer_cm_dla_akwa_cert_001`;
- active session `session_cm_dla_pos_g0_cert_001`; and
- administrator user `usr_cm_dla_pos_g0_cert_001`.

The auth setup performs a real credential sign-in, calls `/api/me/permissions`, verifies the exact organization, required permissions, and `ADMINISTRATOR` role, and only then writes an ephemeral storage state. The storage state is intentionally excluded from evidence because it contains an authenticated session.

Microsoft Edge rendered all protected routes in both locales without a login redirect, 5xx response, missing document response, or application-error body:

- `/dashboard/pos`;
- `/dashboard/finance/reconciliation`;
- `/dashboard/finance/cash-command`;
- `/dashboard/accounting/close`;
- `/dashboard/owner-war-room`; and
- `/dashboard/manager-action-center`.

The smoke also confirmed the authenticated Finance navigation exposes Cash Command and Reconciliation. Final result: 3 Playwright tests passed in 6.9 minutes.

## Final baseline verification

| Gate | Result |
| --- | --- |
| Prisma schema validation | PASS |
| Prisma Client 6.19.3 generation | PASS |
| TypeScript typecheck | PASS |
| Focused unit/integration suites | PASS — 7 suites, 67 tests |
| PostgreSQL certification suite | PASS — 1 suite, 3 tests |
| Service-boundary fail mode | PASS — 0 active violations |
| Kontava static release gate | PASS — 0 blockers |
| Production Next.js build | PASS |
| Migration production-risk gate | BLOCKED — 13 historical destructive findings lack exact-hash approval |

The production build passed with two pre-existing `<img>` advisories and a standalone-output symlink advisory caused by the isolated worktree’s dependency junction. The compiled `.next` output is valid; a packaged standalone artifact was not certified.

## Enterprise release blockers

The development G0 pass must not be translated into production approval. The following remain blocking:

1. `prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql` contains 13 `DROP COLUMN`/`DROP TABLE` findings. The existing maker-checker packet recommends `HOLD_AND_REWORK`; `prisma/migration-risk-approvals.json` has no exact-file-hash approval.
2. The operator/checker authentication attestation path is still a template/status record, not signed authentication evidence.
3. The supplied product/controller titles do not independently prove accountable product and financial-controller approval for this exact candidate and evidence hash.
4. No qualified, dated Cameroon country-pack/fiscal review is bound to this commit. User-requested production/statutory authorization remains requested but unproven.
5. Cash-only development behavior and non-statutory browser/PDF receipts are the tested scope. Electronic tender, offline capture, statutory numbering, physical printer, drawer-kick interface, barcode scanner, customer display, and payment terminal remain disabled or uncertified.
6. The POS shell currently exposes nested visible `<main>` landmarks. It did not block route rendering but should be fixed and independently accessibility-tested before a production claim.
7. The browser dev server reports a future `allowedDevOrigins` warning and shutdown-time aborted requests after successful tests. These do not invalidate the route assertions but should be removed from the production smoke harness.
8. A legacy-baselined namespace lint policy is still needed so new migrations cannot introduce unscoped `pg_type`, `pg_constraint`, `pg_proc`, or equivalent catalog checks while shipped history remains immutable.

## Evidence paths

- Preflight: `docs/pos-enterprise-grade-audit/evidence/migration-certification/2026-08-17-r2/target-verification.json`
- Migration history before: `docs/pos-enterprise-grade-audit/evidence/migration-certification/2026-08-17-r2/migration-history-before.json`
- Projection manifest: `docs/pos-enterprise-grade-audit/evidence/migration-certification/2026-08-17-r2/schema-rebound-projection-manifest.json`
- Original replay comparison: `docs/pos-enterprise-grade-audit/evidence/migration-certification/2026-08-17-r2/restore-rehearsal-result.json`
- Migration history after: `docs/pos-enterprise-grade-audit/evidence/migration-certification/2026-08-17-r2/migration-history-after.json`
- Corrected read-only comparison: `docs/pos-enterprise-grade-audit/evidence/migration-certification/2026-08-17-r2/schema-fingerprint-reassessment.json`
- Final schema/fixture boundary: `docs/pos-enterprise-grade-audit/evidence/migration-certification/2026-08-17-r2/post-execution-boundary-verification.json`
- Passing authenticated Edge HTML report: `docs/pos-enterprise-grade-audit/evidence/migration-certification/2026-08-17-r2/authenticated-edge-report.html` (`SHA-256 fcb109ac5e434c032846cbb3b133b7c8615dc09df923b26caaaa83738c596036`)
- Machine-readable G0 result: `docs/pos-enterprise-grade-audit/EXECUTION_05_G0_FINAL_REASSESSMENT_GATE_EVIDENCE.json`

## Next controlled decision

The next release action is not production deployment. The accountable migration maker and checker must resolve the historical destructive migration through the existing evidence packet: either exact-hash approval backed by reviewed backup/restore and data-loss analysis, or an approved additive replacement/adoption strategy. After that, bind signed operator, product, controller, security, and qualified Cameroon country-pack evidence to the exact candidate commit and rerun the enterprise release gate.

Development work may proceed from the clean isolated candidate into the next roadmap slice, but every later report must retain the distinction between local synthetic proof and production/statutory proof.
