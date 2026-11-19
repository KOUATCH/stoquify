# AF09: staged opening position and tie-out preview

**Executed:** 20 October 2026. **Status:** VERIFIED within the AF09 preview scope. **Scope:** CM/XAF synthetic preview only. **Source:** HEAD `6ee84a90c760d2864f6aef672d8b393ac2b65971` plus the existing dirty workspace. No commit, deployment, production migration or real client enrollment was performed.

## Outcome and reuse

AF09 adds a separately staged financial-opening manifest, source-to-client mapping, exact detail/control reconciliation and an independently reviewed preview. It reuses the AF04/AF05 engagement and named-consent intersection, AF08 current-authority transaction wrapper, existing protected actions and fresh authentication, existing master identities and hashing, the accounting page shell, shared controls and portfolio navigation.

The AF05 result and current implementation were inspected before implementation. The user explicitly requested AF09; this changes the roadmap's default AF16-before-expansion sequence for this bounded task. No AF16 RELEASE_SCOPE or GO_NO_GO result exists. Core and expanded release qualification remain open.

The master importer and financial readiness engine are unchanged. There is no apply endpoint. Review of an opening preview does not post journals, create stock movements, modify receivables/payables or certify a Close run. The known domain gaps are deliberately retained for AF10.

## Acceptance evidence

| Criterion | Result | Evidence |
|---|---|---|
| AF09-AC1: explainable differences and provenance | PASS | Pure calculation tests, retained balanced/mismatched PostgreSQL previews, source/control/mapping/master hashes and immutable manifest digest |
| AF09-AC2: no operational financial writes | PASS | Real stage/review journey compares before/after journals, inventory movements/levels, customer/supplier ledgers, master batches and sentinel balances; all unchanged |
| AF09-AC3: invalidate review and detect duplicates | PASS | Concurrent retries, semantic duplicates, changed source/mapping, mapped-master staleness and latest-revision rejection are exercised against PostgreSQL |
| AF09-AC4: controlled writer or explicit blocker | PASS, source inspection/design | [Domain write plan](DOMAIN_WRITE_PLAN.md) identifies sanctioned stock and journal machinery, missing AR/AP writers, ledger ownership and AF10 recovery gates. Financial apply is unimplemented and unqualified |
| AF09-AC5: independent synthetic tie-out and accountant review | PASS | Real service and authenticated browser journeys upload separately authored controls, map existing client records, and record a different accountant's source-bound review after password step-up and explicit retry |

## Implementation ownership

| Owned files / hunks | Purpose |
|---|---|
| `services/onboarding/opening-position.contract.ts` | Strict, bounded pilot source/control/mapping/action schemas and DTOs |
| `services/onboarding/opening-position-preview.ts` | Exact integer-scaled arithmetic, detail ownership, independent comparisons, issues and digest |
| `services/onboarding/opening-position.service.ts` | Current authorization, immutable staging, duplicate/replay/version checks, independent review and audit |
| `actions/onboarding/opening-position.actions.ts` | Protected read/stage/review adapters with current module checks and review step-up |
| `components/onboarding/OpeningPositionWorkbench.tsx` | EN/FR uploads, mapping, validation, readable totals, retained revisions, privacy and explicit recovery |
| `app/[locale]/(dashboard)/dashboard/accounting/opening-position/page.tsx` | Existing accounting shell/access wrapper |
| Route registry and `AccountantPortfolio.tsx` narrow additions | Register the accounting page and link the selected client's opening preview |
| `prisma/schema.prisma` narrow additions; migration `20261020130000_opening_position_preview` | Separate `FinancialOpeningRevision` model/relation, bounded additive table, retention/review-shape checks and immutability trigger |
| Focused Jest/TypeScript configs, pure/component/PostgreSQL tests, two JSON fixtures and `scripts/*opening-position*` helpers | Isolated verification without application environment files or configured application database |

Unrelated dirty work, including AF01–AF08, branding and overlapping master-onboarding edits, was preserved. No master-import component or importer was replaced. The dated graph component evidence was used only to locate relationships; current callers and implementation determine behavior.

## Verification by evidence class

All run artifacts are under [2026-10-20-run-01](2026-10-20-run-01/). Commands were inspected before execution against the repository command registry. Unclassified helpers were reviewed for explicit synthetic target guards, file writes, subprocesses and environment handling. No package build or production schema promotion ran.

| Evidence class | Command / execution | Result |
|---|---|---|
| Workflow contract | `npm run agent:workflow:check` | Initial and final PASS, exit 0; 196 package scripts remain unclassified |
| Schema | `node node_modules/prisma/build/index.js validate --config .codex-tmp/af09-prisma/prisma.config.ts` | PASS, exit 0 |
| Isolated Prisma client | Same CLI `generate --config .codex-tmp/af09-prisma/prisma.config.ts` | PASS, exit 0; Prisma 6.19.3, task-local output |
| Focused types | `node node_modules/typescript/bin/tsc --project tsconfig.opening-position.json --noEmit` | Final PASS, exit 0 |
| Pure and component/jsdom | `node node_modules/jest/bin/jest.js --config jest.opening-position.config.cjs --runInBand --silent` | 5 suites / 101 tests PASS, exit 0; includes calculation fixtures, existing readiness checks and portfolio/component regressions |
| Clean database migration | `node scripts/fixtures/opening-position-database.cjs` | Fresh synthetic database: all 103 migrations applied |
| Real PostgreSQL | `node node_modules/jest/bin/jest.js --config jest.opening-position-postgres.config.cjs --runInBand --silent` | Final 8/8 PASS, exit 0 |
| Populated migration and replay | `node scripts/fixtures/opening-position-upgrade.cjs` | 102→103 and replay PASS, exit 0; all nine operational table counts and row digests unchanged |
| Real browser | `node scripts/verify-opening-position-browser.cjs` | PASS, exit 0; real upload/mapping/review, password step-up, four EN/FR desktop/mobile scans with zero scoped axe violations, stale master and module-denial recovery, operational state unchanged |
| Targeted browser mismatch | Same script with `--mismatch-only` | PASS, exit 0; separately changed AR control produces +1.00 difference, supersedes review and disables positive review while allowing corrections |
| Publication | Repository docs-report-publisher and PDF content/render inspection | Matching Markdown/PDF pairs; archive counts, source hashes, heading checks and render results are recorded separately in [publication verification](2026-10-20-run-01/publication-verification.json) |

The focused Jest lane includes mocked actions for UI tests; it is not database or browser proof. The separate PostgreSQL lane uses the real services and database, with synthetic actors/sessions and only the database module redirected to the guarded test target.

The PostgreSQL scenarios cover: independent review and self-review denial; exact concurrent retries/semantic duplicates/conflicting keys; mismatched controls and correction decisions; changed source/mapping supersession; stale mapped masters; cross-tenant, expired assurance, module, suspended engagement and revoked mandate denial; immutable update/delete; audit rollback/retry; unavailable foreign mappings and unsupported tenant currency.

The main test database is `stoquify_local_af09_20261020_r1` on `127.0.0.1:55449`; the upgrade database is `stoquify_local_af09_upgrade_20261020_r1`, cloned from retained synthetic AF08 evidence. Each helper verifies the exact task-owned cluster path before mutation. The populated upgrade includes 24 journals and 120 journal lines; zero-count stock tables are explicitly represented and are not claimed as populated-stock migration evidence. Credentials are random and kept outside repository reports.

### Initial failures and recovery

The first type check rejected `BigInt` literals under the repository's ES2017 target; the implementation now uses `BigInt(...)`. The first Jest run passed 71 pure tests but could not parse the portfolio's Lucide ESM dependency; the focused config now reuses the installed CJS mapping. The first PostgreSQL run passed seven scenarios and failed a verification query that incorrectly assumed an organization column on inventory levels; it now scopes through item/location ownership. The corrected journey and final eight-scenario suite pass.

The first local PostgreSQL port was unavailable; the owned cluster was started on 55449. The first browser run timed out before any read action was dispatched during cold hydration. The harness now observes the actual POST and retries only that read if necessary. A subsequent run exposed ambiguous mapping selector names from wrapped option text; explicit accessible names corrected them. The final journey passed. These initial logs remain retained rather than being replaced with final-only success evidence.

### Rendered review

The real browser used Better Auth and protected server actions against the isolated synthetic database. English and French were checked at 1440 and 390 pixels. Screenshots show the reviewed preview, source hashes, independent control columns, a readable mobile layout, stale state and denied state. The desktop English, mobile French and mobile mismatch captures were visually inspected; scoped axe checks and panel width assertions cover all four layouts. The mismatch capture shows AR 100.00 versus control 99.00, the +1.00 difference, disabled positive review, available correction request and the financial-apply blocker. Browser-native file chooser text follows the browser language. No screen-reader certification is claimed.

## Rollout, fallback and limits

Activation requires the additive migration and a matching generated Prisma client, the existing accounting/Close modules and named mandates, and an explicitly selected CM/XAF client within the documented pilot bounds. Existing runtime module and capability controls remain authoritative; no new flag framework or billing entitlement was introduced.

Safe fallback is to disable access to the opening-position route/actions, preserve the new table and immutable evidence, and continue existing master onboarding. No financial reversal is needed. Do not drop evidence to roll back application code. Drafts may be abandoned; retained revisions remain readable to currently authorized actors. Retention blocks deletion and needs a governed production retention policy.

Observable failure signals are safe-action correlation/error responses, issue lists, stale revision state, explicit limit errors, duplicate receipts and `OPENING_POSITION_STAGED` / `OPENING_POSITION_REVIEWED` audits. No scheduler, external delivery, provider or AI work is added.

Bounds and exclusions: 100 source rows; 100,000 UTF-8 bytes per file; 200 active master choices per category; 100 revisions; fixed pilot date/country/currency; positive AR/AP outstanding and stock quantity; no arbitrary spreadsheets, currency conversion, historical restatement, credit-balance migration or financial apply. Production performance, full-application regression, screen-reader testing, statutory/expert accounting approval and AF16 release certification are not established by this result.

## Cross-discipline assessment

Architecture/backend/database: reuse existing boundaries, add one immutable evidence table and explicit per-cutover serialization. IAM/privacy: current named consent plus managed assignment/module/role checks, independent fresh review, tenant isolation and private state clearing. Accounting/integration: exact source/control tie-out and no-double-posting plan, with missing writers left blocked. UI/workflow: bilingual staged review, visible issues, keyboard-labelled inputs, explicit recovery and bounded catalogs. QA/release/operations: separate evidence classes, additive migration/replay, retained logs and non-destructive fallback. Product/packaging/customer success: optional migration pilot, no new commercial promise; training follows the JSON contract and reviewer interpretation.

Country/legal treatment remains a qualified-review dependency; this phase adds no statutory rule. AI, provider connectivity, billing changes and offline financial apply are not applicable because AF09 is a local evidence preview.

## Next justified work

If migration remains required, execute AF10 starting with the missing AR/AP opening writers and governed ledger/cutover ownership—not direct balances. AF16 core and expansion qualification remains open. See [CUTOVER_CONTRACT](CUTOVER_CONTRACT.md), [DOMAIN_WRITE_PLAN](DOMAIN_WRITE_PLAN.md) and the [roadmap status](../../STATUS.md).
