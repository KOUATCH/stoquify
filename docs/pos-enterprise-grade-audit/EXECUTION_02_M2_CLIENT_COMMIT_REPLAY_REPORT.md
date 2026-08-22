# M2 Development Execution Report — POS Client Commit Replay and Fail-Closed Pilot Scope

Date: 2026-08-17  
Outcome: **M2-A01 through M2-A04 complete for development; G2 remains blocked**

## Outcome first

The authorized development-only M2 slice is implemented without applying a database migration or altering transaction history. The existing `commitPOSSale` service remains the sole sale finalizer. It now owns a tenant/terminal-scoped client commit claim, canonical request hash, atomic committed-result envelope, exact replay, and durable payload-conflict audit.

The pilot is enforced as cash only, online only, and non-statutory receipt only. Store credit, electronic tenders, on-account tender, offline replay, and receipt delivery channels fail closed before the sale transaction begins. The retained receipt snapshot excludes customer email/phone and does not issue a public bearer token.

G2 is not passed. The real PostgreSQL certification harness is authored but deliberately skipped until a named isolated migration target, migration checker, and backup/restore/history/authentication evidence are supplied. Cart versioning, cart-line uniqueness, silent-clamp removal, the authenticated EN/FR browser matrix, and the wider access/privacy matrix are outside this authorization and remain open.

## Skill execution contract

- Suite: `000-aqstoqflow-execution-suite`
- Selected numbered skill: `002-aqstoqflow-control-plane`
- Authorized chunk: M2-A01 through M2-A04 and direct access/control dependencies
- Next recommended numbered skill: `003-aqstoqflow-error-notification-foundation`
- Dispatch decision: not dispatched; the current authorization ends at this development slice

## Implemented transaction contract

1. The caller supplies a stable `clientCommitId` scoped by organization and terminal.
2. The server hashes the normalized actor, tenant, sale, location, terminal, session, customer, cash tender, locale, and notes command.
3. The existing sale transaction checks for an earlier registry result before requiring a draft sale.
4. A new `CLAIMED` registry record is inserted after all read-only validations and before stock, drawer, payment, ledger, event, or audit consequences.
5. Sale, stock, cash, payment, accounting, fiscal-source event, and audit writes run in the same serializable transaction.
6. The transaction transitions the registry to `COMMITTED` with a hashed, redacted result envelope.
7. Post-commit receipt hydration uses a read-only snapshot that omits customer contact details and never issues a public receipt token.
8. The registry transitions to `COMPLETED`; an identical retry returns the stored result with `replayed: true`.
9. Reuse of the same key with any material request change returns `DUPLICATE_KEY_CONFLICT` and writes a redacted, tenant-scoped audit record.

Database triggers make the identity/request fields immutable, allow only `CLAIMED → COMMITTED → COMPLETED`, forbid deletion, freeze completed evidence, and verify that organization, location, terminal, session, sale, and actor belong to the same POS source boundary.

## Files changed by this slice

- `prisma/schema.prisma`
- `prisma/migrations/20260817120000_pos_commit_result_registry/migration.sql`
- `services/pos/pos.schemas.ts`
- `services/pos/pos.service.ts`
- `services/pos/receipt.service.ts`
- `services/pos/offline-sync.service.ts`
- `components/pos/ProfessionalPOSSystem.tsx`
- `services/pos/__tests__/pos.service.test.ts`
- `services/pos/__tests__/pos-commit-result.postgres.test.ts`
- `actions/pos/__tests__/tender.actions.test.ts`
- `components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx`
- `scripts/verify-realistic-development-seed.ts`
- `scripts/__tests__/pos-commit-result-registry-migration.test.js`
- `docs/pos-enterprise-grade-audit/EXECUTION_02_PAYMENT_CASH_TRUTH_GATE.md`
- `docs/pos-enterprise-grade-audit/EXECUTION_02_PAYMENT_CASH_TRUTH_GATE.json`
- `docs/pos-enterprise-grade-audit/EXECUTION_02_OFFLINE_POS_REPLAY_GATE.md`
- `docs/pos-enterprise-grade-audit/EXECUTION_02_OFFLINE_POS_REPLAY_GATE.json`
- `docs/pos-enterprise-grade-audit/EXECUTION_02_M2_GATE_EVIDENCE.json`
- `docs/pos-enterprise-grade-audit/EXECUTION_02_M2_CLIENT_COMMIT_REPLAY_REPORT.md`
- `docs/pos-enterprise-grade-audit/EXECUTION_02_M2_CLIENT_COMMIT_REPLAY_REPORT.pdf`
- `docs/pos-enterprise-grade-audit/render-execution-pdfs.cjs`
- governed execution registers under `docs/pos-enterprise-grade-audit/`

The repository was already materially dirty. Unrelated modified and untracked paths remain user-owned and were neither reverted nor attributed to this slice.

## Verification results

| Check | Result | Evidence/limitation |
| --- | --- | --- |
| Prisma schema validation | PASS | `npm run prisma:validate`; schema valid |
| Prisma client generation | PASS | v6.19.3 generated after a controlled restart of the workspace dev server; no database connection |
| TypeScript | PASS | `npm run typecheck`; exit 0 |
| Targeted ESLint | PASS | Ten changed implementation/test files; exit 0 |
| POS service/action/migration tests | PASS | 3 suites, 43 tests |
| Combined targeted test run | PASS | 5 suites and 60 tests passed; the 3 guarded PostgreSQL certification tests were skipped |
| POS component tests | PASS | Shift-close/POS component suite 12 tests; receipt-token visibility suite 5 tests |
| PostgreSQL certification harness compilation | PASS | Suite loads and is skipped unless explicit certification environment is present |
| Real PostgreSQL commit race | **BLOCKED / NOT RUN** | Strict local schema guard requires `codex_pos_commit_result_cert_20260817`; migration application is not authorized |
| Service-boundary fail gate | PASS | 0 active violations, 13 allowed test/mock findings |
| Payment cash-truth gate | PASS | 14/14 static checks; no provider or production proof |
| Offline replay gate | PASS | 16/16 static checks; runtime replay remains explicitly disabled for this pilot |
| Public receipt-token config gate | PASS WITH WARNING | 4/4 local checks; production secret enforcement is off and no secret is configured |
| Migration status | EXPECTED HOLD | 68 repository migrations; the new additive registry migration is pending and was not applied |

## Local evidence versus production proof

This report proves local source validation, unit behavior, component behavior, static controls, and that a guarded PostgreSQL harness exists. It does not prove the new migration on any database, a real concurrent sale finalization, production tenant isolation, a named browser/OS/hardware combination, fiscal legality, Cameroon tax/receipt rules, provider behavior, restore readiness, or production release safety.

## Remaining blockers

- Pilot location and terminal are still placeholders.
- Browser/OS and reference peripheral matrix are still placeholders.
- Product and controller approver names/roles are still placeholders.
- Migration target disposition and migration checker are still placeholders.
- Backup, restore, history, and authenticated migration evidence paths are still placeholders.
- The historical migration-safety gate still has 13 unapproved destructive findings in `20260611130000_accounting_auth_baseline_bridge`; that historical file was not edited.
- M2-A05 through M2-A09 (beyond the guarded registry harness) and M2-B01 through M2-B09 are not authorized or complete.
- Production, provider, offline, statutory/fiscal, legal, accounting-certification, PCI, accessibility, and release-readiness claims remain prohibited.

## Exact continuation condition

To execute the PostgreSQL certification without weakening controls, supply a verified-empty isolated target or an already-applied target disposition, a named migration checker, and evidence paths for backup, restore, migration history, and operator authentication. To continue beyond A01–A04, separately authorize the remaining M2 cart-concurrency and access/privacy workstreams and name the pilot browser/OS, location, terminal, product approver, and controller approver.
