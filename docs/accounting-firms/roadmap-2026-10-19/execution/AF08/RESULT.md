# AF08: review workpapers and readable close deliverables

**Date:** 20 October 2026. **Status:** VERIFIED within AF08's bounded acceptance criteria. The shared workflow-registry gate remains failed outside this phase; this is not release certification.  
**Scope:** AF08 only. The implementation reuses AF04/AF06 live authority and the existing balance-sheet evidence, review/comment, Close export and audit records. No schema migration, production promotion, deployment, commit, real enrollment or provider delivery was performed.

## Delivered behavior

The existing Accountant Portal now hosts a period workpaper binder with four pilot headings: cash/settlement, AR, AP and inventory. It displays existing independently approved supporting schedules against their ledger opening, additions, reductions and closing balances. Missing, changed, invalid or revoked support is explicitly unavailable.

An authorized preparer records a source-bound conclusion. A different authorized accountant can record an independent workpaper review or request changes. A positive review requires all four pilot headings to be reconciled. Source drift and later preparation invalidate the former current review. These decisions never set `APPROVED_FOR_CLOSE`.

JSON remains canonical retained evidence. PDF and CSV render that same redacted publication with a durable watermark and hashes, current authorization/fresh-auth checks and transactional export audit. Exact retries retain one publication. Roll-forward copies only the fixed headings and origin period; the new period requires new support and decisions.

See [WORKPAPER_CONTRACT.md](WORKPAPER_CONTRACT.md) for permissions, metadata, source/locking semantics, limits and recovery behavior.

## Reuse and implementation

| Area | Starting condition | AF08 implementation |
|---|---|---|
| Ledger and supporting schedules | Implemented | Reuse `readBalanceSheetPopulation`, `readBalanceSheetClose` and the existing snapshot/Decimal reconciliation; no new financial calculation engine. |
| Current source and assessment ordering | Implemented | Reuse sorted period locks, source-revision lock, current assessment selection and post-lock database time. |
| Firm/client authority | Implemented by AF04/AF06 | Extend the shared locked authority adapter for workpaper read/prepare/review; preserve named consent, engagement, assignment, current roles/modules and exact-session checks. |
| Workpaper preparation/review | Missing | Add bounded, versioned `AccountantReview.metadata`, append-only decisions, exact source binding and independent reviewer checks. |
| Roll-forward | Missing pilot behavior | Store headings/origin/retry metadata on `AccountantComment`; no copied financial state or approval. |
| Readable binder exports | Missing | Reuse installed jsPDF/autotable, `ClosePackExport`, financial export safety, watermark and audit; add JSON/CSV/PDF rendering. |
| Spreadsheet escaping | Implemented in AR export | Extract the unchanged escaping helper for reuse by both AR and workpaper exports. |
| Firm UI | Portal already implemented | Add an English/French binder inside the existing portal, preserving shell/tokens and protected action/context conventions. |
| AR/AP aging, inventory valuation, settlement signing | Separate domain functionality | Remain authoritative in their existing workflows/Close pack. This binder presents supporting account controls and does not replace those operational schedules. |
| Large export jobs | Existing separate finance pipeline | Not connected to this bounded synchronous pilot; populations over its explicit cap are rejected. Do not silently widen the cap. |

Principal implementation files:

- [Binder service](<E:/ohada saas/Focused projects/stoquify/services/accounting/review-workpaper.service.ts>)
- [Contracts and command validation](<E:/ohada saas/Focused projects/stoquify/services/accounting/review-workpaper.contract.ts>)
- [Retained-object export renderer](<E:/ohada saas/Focused projects/stoquify/services/accounting/review-workpaper-export.ts>)
- [Protected actions](<E:/ohada saas/Focused projects/stoquify/actions/accounting/review-workpaper.actions.ts>)
- [Portal binder UI](<E:/ohada saas/Focused projects/stoquify/components/accounting/ReviewWorkpaperBinder.tsx>)
- [Shared locked authority](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-evidence-acceptance-authority.service.ts>)
- [Shared CSV escaping](<E:/ohada saas/Focused projects/stoquify/services/security/export-csv.ts>)

## Acceptance register

| Criterion | Result | Evidence |
|---|---|---|
| AC1 — four pilot schedules and unavailable inputs | PASS | Real SQL fixtures use nonzero posted ledger amounts and existing proposal/independent approval services. All four columns reconcile; missing support remains unavailable. Separate EUR/XAF account rows and revoked support are checked. |
| AC2 — actor/revision/conclusion and stale review | PASS | Retained preparation/review metadata, self-review denial, changed-source detection, superseded-review history and old export preview rejection in real PostgreSQL. |
| AC3 — PDF/CSV/JSON agreement, scope and redaction | PASS | Three-format real export, one retained canonical record, exact hash checks, actual five-page PDF/text/image inspection and CSV parsing against all four ledger/support/difference columns. |
| AC4 — current authority, fresh auth, client isolation | PASS | Current-authority regressions plus real foreign-period denial, expired freshness, managed engagement suspension and revoked mandate. Real browser password step-up, self-review denial and current module denial pass. |
| AC5 — roll-forward, stale/retry/failure/formula/usability | PASS | Ten SQL scenarios include copy-only structure, concurrent idempotent writes/exports, rollback after audit failure, session expiry during an audit wait and history-cap recovery. Pure tests cover CSV formulas and deterministic PDF retry. Component and authenticated EN/FR desktop/mobile checks cover recovery, stale sources, denied access and readability. |

## Verification by evidence class

Latest run: [2026-10-20-run-01](2026-10-20-run-01/).

| Evidence class | Result | Scope |
|---|---|---|
| Workflow contract | Initial PASS; final FAIL outside AF08 | The final `npm run agent:workflow:check` reports reviewed-file drift for `test:prisma:restart` → `scripts/prisma-dev-restart.ps1`. AF08 did not change that script or registry. This shared gate remains open; no application/database commands are executed by the checker. |
| Source inspection | Complete for changed boundaries | Current source and AF06 prerequisite result; dated component graph node `accounting_accountantportal_tsx`, community 17, used for discovery and checked against current code. No graph regeneration. |
| Pure/mocked/component tests | 135 PASS, five suites | `unit-authority-final.log`, exit 0: focused exports, CSV, input validation, live-authority regressions, balance-sheet controls and eight jsdom component cases. |
| Real PostgreSQL | Ten scenarios PASS across two runs | `postgres-authority-final.log`: nine scenarios, exit 0. After the history-cap fix, `postgres-history-limit.log`: one additional focused scenario passed, nine skipped, exit 0. Fresh guarded synthetic database; real evidence, managed engagements, sessions, persistence, rollback, concurrency, expiry during audit wait and cap recovery. |
| Scoped TypeScript | PASS | Final `typecheck-history-final.log`, exit 0, no diagnostics. Owned source and imports use the isolated generated client whose schema matches current source apart from generator output. |
| Authenticated browser | PASS across full journey and targeted fixture recovery | Real Better Auth and protected actions: prepare, self-review denial, fresh independent review, three downloads, EN/FR at 1440/390px, four scoped axe scans with zero violations, source drift and current module denial. No page errors. |
| Artifact reconciliation | PASS | Five-page A4 binder, four CSV schedules, all four columns/bases compared with canonical JSON; scope/date/watermark/redaction checks. |
| Publication | PASS | Existing publisher; 56 matching Markdown/PDF report pairs, nine identical supporting copies, heading/A4 checks and visual review. See `publication-verification.json` in the latest run. |

The initial database run passed five scenarios and found one fixture-validation error: a suspension command's idempotency key was shorter than AF04's minimum. The fixture was corrected; all nine final scenarios passed. This did not relax production validation. The final expiry case proves the audit wait was reached and that both export publication and audit record roll back when the session expires before the transaction returns.

The initial PDF layout emitted fixed-width table fit notices. Explicit table widths removed the notices. The final PostgreSQL run generated new sample formats from one retained canonical publication, and the artifact verifier inspected them again.

The final source review caught an off-by-one history guard. The 101st decision is now rejected before persistence, preserving read/export access at the 100-decision limit. The supplemental SQL scenario verifies rejection, unchanged row count, exact replay, reading and export. Existing passing scenarios were not repeated without a relevant change.

Browser recovery is explicit: the initial cold-build run timed out, and another development server later occupied port 3048. The isolated AF08 server moved to 3148. The final full journey passed through source-staleness recovery but its last fixture used an empty module list, which intentionally means legacy defaults in Stoquify. The fixture was corrected to select accounting while omitting Close; the targeted module-denial rerun passed. Failed-run evidence is retained. The four layout/axe scans were not rerun because no UI source changed. The supplemental browser run used the final history-cap service.

The shared workflow failure is independent of these scoped results. Its reported script hash was `598E5331EDFBED343A8D5F649F651FD8D5AC715EA0F321E1DDBB6263002D9ECD`. The registry was not rewritten to suppress the finding. Resolution and a fresh shared workflow check are required before release qualification.

## Reproduction commands and side effects

The existing command registry, selected configs and script definitions were inspected before execution. These direct phase-specific commands are scoped checks, not broad package build/migration aliases:

```powershell
npm run agent:workflow:check
node node_modules/typescript/bin/tsc --noEmit --pretty false -p tsconfig.review-workpaper.json
node node_modules/jest/bin/jest.js --config jest.review-workpaper.config.cjs --runInBand --no-cache
node node_modules/jest/bin/jest.js --config jest.review-workpaper-postgres.config.cjs --runInBand --no-cache
node node_modules/jest/bin/jest.js --config jest.review-workpaper-postgres.config.cjs --runInBand --no-cache --testNamePattern="101st decision"
node scripts/render-review-workpaper-sample.cjs
python scripts/verify-review-workpaper-artifacts.py
node scripts/verify-review-workpaper-browser.cjs
node scripts/verify-review-workpaper-browser.cjs --module-recovery-only
```

The PostgreSQL lane requires explicit `AF08_POSTGRES_URL` and `AF08_CLUSTER_DIR` values. It refuses production and any target other than the named loopback AF08 database, then verifies the actual cluster directory. `scripts/fixtures/review-workpaper-database.cjs` created a fresh database and applied the existing 102 migrations through an env-free Prisma config; it refuses an existing database and has no reset/seed hook. The tests seed synthetic historical ledger rows, then use the real existing evidence and engagement writers. They do not assert that historical fixture seeding itself is a production posting journey.

The database is `stoquify_local_af08_20261020_r1` on the existing task-owned loopback cluster at port 55441. It is separate from application configuration. Test records and failed-run evidence are retained.

The browser snapshot excludes environment files and uses a task-owned dependency junction and isolated Next output. Credentials remain in the task-private visualization directory. Browser verification writes only synthetic actors, source state and module intent in the guarded database.

## Output and reconciliation evidence

- [Canonical sanitized JSON](2026-10-20-run-01/sample-workpapers.json)
- [Spreadsheet-compatible CSV](2026-10-20-run-01/sample-workpapers.csv)
- [Readable five-page PDF](2026-10-20-run-01/sample-workpapers.pdf)
- [Reconciliation checks](2026-10-20-run-01/reconciliation-checks.json)
- [Artifact inspection result](2026-10-20-run-01/artifact-inspection.json)
- [PDF contact sheet](2026-10-20-run-01/workpapers-contact-sheet.png)
- [Authenticated browser results](2026-10-20-run-01/browser-verification.json)
- [English desktop](2026-10-20-run-01/workpaper-en-1440.png) and [French mobile](2026-10-20-run-01/workpaper-fr-390.png)
- [Publication verification](2026-10-20-run-01/publication-verification.json)
- [Workpaper contract](WORKPAPER_CONTRACT.md)

The synthetic closing controls are XAF 100.20 cash, XAF 200.10 receivables, XAF 80.00 payables and XAF 50.05 inventory. These separate account values are not summed into a cross-domain financial statement total. Opening/reduction values and differences are zero in this sample because that is the explicit fixture, not a fallback for missing evidence.

## Source and change ownership

Baseline commit: `6ee84a90c760d2864f6aef672d8b393ac2b65971`, plus the existing dirty working tree. Prior phase work and unrelated changes were preserved.

AF08 owns the new workpaper contract/service/renderer/actions/component, its test/config/verification scripts, and its canonical documents. Shared-file changes are limited to the authority operation cases, extraction of AR's CSV helper, the portal import/navigation/section and additional authority regression cases. No unrelated cleanup, dependency update or schema edit was included.

## Release boundaries and operational limits

This is a pilot summary binder, not a complete document-management or practice-management suite. Its deliberate limits are 50 balance-sheet account/currency population entries, 100 workpaper decisions per period, ten visible recent decisions and ten earlier-period choices. Larger populations are explicitly rejected, not silently truncated.

The binder requires an eligible completed-period Close assessment and existing supporting evidence. It does not add a new balance-sheet evidence preparation UI, item-level AR/AP aging export, full inventory valuation engine, asynchronous workpaper queue, historical-file download endpoint or automated delivery. Those are separate extensions, not hidden completeness claims.

The source hash invalidates the whole binder conservatively. No production-scale performance, real client pilot, statutory support, legal/tax opinion, external approval or release certification is established by synthetic tests.

Activation uses current portal/module/permission/mandate controls. Rollback removes the new portal/write/export surface while preserving its guarded read service and retained records; source evidence and existing Close packs remain the fallback. See the contract for retained-data and historical-publication constraints.

## Multidisciplinary review

| Discipline | Decision/evidence |
|---|---|
| Architecture/backend/integration | One service-owned projection and existing domain locks/records; no replacement ledger or parallel consent system. |
| Database/integrity | No migration; versioned metadata, exact bindings, transaction rollback and concurrent duplicate tests. |
| IAM/privacy/security | Current locked authority, independent review, fresh exports, strict inputs, redaction, formula escaping and no public file URLs. |
| Accounting/evidence | Existing four-column controls and explicit missing support; currencies remain separate and workpaper review is not certification. |
| Frontend/UX/localization/accessibility | Existing portal/tokens; EN/FR authenticated desktop/mobile checks, four scoped axe scans without violations, focusable scrollable schedule tables, stale and module-denied recovery. |
| QA/release | Separate pure, component, real SQL, browser and artifact lanes; no production release performed. |
| SRE/performance | Explicit caps/timeouts and retained audits; larger-population async/performance qualification remains a separate gate. |
| Product/customer operations/packaging | A concrete prepare-review-deliver loop inside the current accountant portal; no new pricing or entitlements invented. |
| Country/legal/statutory | Not applicable to new rules: AF08 introduces none and makes no expert certification claim. |
| AI/offline/provider integration | Not applicable to this slice: no AI decision, offline financial mutation or new provider connector. |

## Next step

AF09 is the next sequential roadmap phase: staged opening position and tie-out preview. AF12/AF14/AF15 can reuse this bounded workpaper contract when their prerequisites are met. AF16 remains the release and measured-pilot gate. No later phase was started.
