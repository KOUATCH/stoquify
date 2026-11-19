# Disposable synthetic business dataset

**SYNTHETIC_SCENARIOS_WITH_REGULATORY_BLOCKERS**. Monthly trading: **complete**. Full-system/payroll certification remains blocked.

Database: `stoquify_replay_dataset_20261028_01`, localhost:5432/public. The application database and .env are unchanged. All identities and documents are fictional.

## Coverage

| Coverage | Records |
|---|---:|
| Organizations / locations | 5 / 10 |
| Personas / roles | 38 / 41 |
| Products / suppliers | 39 / 21 |
| Journal entries / lines | 1421 / 3802 |
| Purchase orders / receipts | 123 / 120 |
| Supplier invoices / payments | 120 / 12 |
| POS commit records / stock movements | 477 / 2853 |
| Supplier returns / credit notes | 3 / 3 |
| Customer settlements / receivable documents | 6 / 9 |
| Stock transfers / counts | 3 / 3 |
| Delivery goods issues / billings | 3 / 3 |
| Bank statements / reconciliation runs | 4 / 4 |
| Employees / contracts | 36 / 36 |
| HR positions / assignments | 18 / 36 |
| Reporting relationships / delegations | 33 / 3 |
| Daily time observations / imports | 13035 / 39 |
| Leave-ledger entries / time requests | 39 / 12 |
| Pending salary reviews / stock adjustments | 3 / 3 |

Wouri Distribution (Douala), Mfoundi Office Supplies (Yaoundé) and Hauts Plateaux Commerce (Bafoussam) each have two stores and a warehouse. Accounting and attendance cover November 2025 through October 28, 2026; October is partial.

Two auxiliary organizations are separate disposable capability laboratories. `synth12_opening_aux` has three independent personas and one location for controlled financial opening, firm review and negative bank reconciliation. Its local Africa/Douala month boundaries bind the October 1 opening to the correct period. `synth12_close_aux` has two personas, zero locations/providers and a minimally funded August period for independent system-evidence close certification and controlled period sealing, supported by one independently posted synthetic owner contribution. Their outcomes are in the firm/close receipt; neither claims statutory authority approval. Counts above include both auxiliaries; core employees remain 36 and historical coverage remains 36 core organization/month combinations.

Historical trading adds **108 purchases/receipts/invoices and 432 completed sales**, across 36 organization/month combinations. Each intended month has three purchasing branches and twelve sales across two stores per organization. These are monthly synthetic scenarios concentrated on the tenth, not a production-volume daily trading simulation.

Normal services perform submission, independent approval, receiving/inspection, invoicing, stock posting, checkout and shift closure. A process-isolated Date-only clock supplies historical business dates; timers, machine clock and normal application are unchanged. Additional scenarios use October 28 at 20:00 UTC. Real generation-attempt timestamps and PostgreSQL creation timestamps remain distinct. Historical authorization/session validity is not claimed.

Additional workflows include catalogue/customer-location links; cash vouchers (two CASH_REVIEWED, one PROPOSED); partial/full customer collections; completed delivery orders with reservation, goods issue and billing; warehouse transfers; stock-count variances; supplier returns/credits; leave accrual, approved/pending leave, rejected overtime and approved attendance corrections; and pending future salary reviews. Exact results: [additional scenarios](additional-scenarios.json).

Each core organization also has a synthetic bank-transfer supplier payment matched to a retained CSV statement, with independent admission and current AP reconciliation evidence. A separately posted cash-to-bank journal funds the test bank account. Each run is SIGNED through the application by an independent manager; its retained canonical certificate hash, current source coverage and replay are checked. Bank configuration is an explicitly labelled reference fixture; setup approval workflows and live provider settlement are not certified. [Bank evidence boundaries](bank-scenario-notes.md).

HR reference fixtures add six positions, twelve primary assignments, eleven reporting links and one temporary Operations read delegation per core organization. Existing read services check manager, self-service and delegated scope boundaries. Reference configuration was inserted directly with exact replay checks and provenance files; this does not demonstrate an authoring UI/API lifecycle. [HR structure evidence boundaries](hr-structure-notes.md).

HRIS preserves raw imports and separate approved corrections. One-hour approved leave reconciles to corrected 420 worked / 60 absence minutes. Eleven employees per core organization link to application personas; one deliberately unlinked employee per core organization is a self-service readiness case. Raw attendance is not certified payroll input.

## Remaining-table continuation

The retained starting inventory had **111 populated tables and 131 pending model tables**, across **247 physical tables** including implicit relation tables. All **131 originally pending tables** now have an explicit scenario/status, current source reference and exact prerequisite where they remain empty. Of that original set, **116 now contain rows and 15 remain empty**. These counts describe data coverage; a populated table may contain a rejected, blocked, pending or reference-only scenario.

Five lanes execute sequentially: commerce, people, firm/close, platform, and stock/POS. Together they retain 15 organization/lane execution receipts. Their actual outcomes and the complete 131-table register appear in [Remaining table scenarios](REMAINING-TABLE-SCENARIOS.md), backed by [table assessment](remaining-table-assessment.json).

Reference setup is identified explicitly. Synthetic locations can name existing synthetic managers; payroll policies and company parameters do not imply regulatory admission; agent activation can remain PROVISIONED_INACTIVE; pending invitations/alerts stay local; and negative source/permission/reconciliation cases remain visibly rejected or blocked. Neither a row count nor a test-persona approval establishes production readiness, statutory validity, external delivery or provider settlement.

## Verification

- Schema: 120 migrations applied to a fresh database; repeat deployment had no pending migrations; certification found no unexpected drift. Intentional retained schema differences are separately recorded.
- PostgreSQL: **1124 assertions, PASS**, including **43 remaining-scenario checks**. Includes FKs/tenant relationships, enabled constraints/triggers, exact core/auxiliary scopes, monthly coverage/dates/baskets, balanced journals, stock/customer ledger tie-outs, required scenario outcomes and document-byte hashes.
- Chronology: cumulative quantity/value uses effective date, inbound before outbound when timestamps tie. The fixture proves constant item cost. This does not certify varying-cost valuation or original execution-order intermediate balanceAfter values.
- Replay: **PASS** for tracked counts, account totals and business-state fingerprints. Baseline is captured after all extensions, before the ordered history → additional scenarios → all five remaining lanes → verification replay. Exact read-audit exclusions are retained in the replay evidence. A real serialization interruption was recovered with the retained checkout request.
- Real DB negative probes rejected invalid FK/duplicate keys, observed locking and proved rollback preservation: [probe evidence](negative-probes.json).
- Source/unit: four focused Node guard tests passed; 15 focused picture-service tests passed with mocked database/provider dependencies and no network ([unit evidence](picture-unit-summary.json)). Scoped TypeScript: 0 owned and 0 imported-source diagnostics. No full build/release certification.
- Browser: prior owner login, EN/FR dashboard and French HRIS directory/profile checks used this database. Added scenarios are verified through services/PostgreSQL; this continuation does not claim browser coverage of every scenario.

## Blockers and remaining scope

**18 November–December 2025 supplier invoices remain pending.** The installed Cameroon pack starts January 2026. A source-backed published `taxes.vat.standardRateBps` envelope covering the invoice dates is required even for zero-tax fixtures. Receipts and sales remain available.

**Payroll needs authentic reviewed 2025/2026 rule envelopes and fixtures, legal-owner approval/publication, and the separate production-admission envelope.** Current CNPS/IRPP gates are not satisfied. A source-confirmed YTD/adjustment integration gap also needs engineering work and cross-month service tests. Then periods, certified attendance/frozen inputs, calculations, payslips, payments, declarations and ledger/close tie-outs can proceed. [Exact payroll requirements](PAYROLL-UNBLOCK.md).

Inventory: 242 models / 247 physical tables; 227 populated tables and 0 tables still tagged PENDING_BUSINESS_SCENARIO by the general inventory. The specific dispositions for all 131 original pending tables are authoritative in [Remaining table scenarios](REMAINING-TABLE-SCENARIOS.md). Nonempty rows do not certify every lifecycle. Live provider settlement, authentic regulatory review, certified close where blocked, and omitted production release prerequisites are not claimed complete. No arbitrary filler, invented expert approval, external transfer or regulatory submission was used.

Unexpected scenario findings: **0**. Consult [summary](result-summary.json), [history](history-results.json) and [additional scenarios](additional-scenarios.json). The base seed retains payroll blockers and can exit 1; that is not full success.

## Use and rerun

Private core logins: `.seed-artifacts/disposable-dataset-2026-10-28/credentials.json`; auxiliary logins: `auxiliary-credentials.json` and `close-auxiliary-credentials.json` in the same ignored folder. Keep credentials, runtime secrets, invitation encryption keys and local provider HMAC keys out of version control and reports.

Run sequentially; do not overlap stock writers:

```powershell
node scripts/disposable-business-dataset.cjs history stoquify_replay_dataset_20261028_01
node scripts/disposable-business-dataset.cjs scenarios stoquify_replay_dataset_20261028_01
node scripts/disposable-business-dataset.cjs remaining stoquify_replay_dataset_20261028_01
node scripts/disposable-business-dataset.cjs inventory stoquify_replay_dataset_20261028_01
node scripts/disposable-business-dataset.cjs verify stoquify_replay_dataset_20261028_01
node --test scripts/__tests__/disposable-dataset-guards.node-test.cjs
node scripts/check-disposable-dataset-types.cjs
```

Do not replace verification-before-replay.json except to establish a new baseline after an authorized extension. Connections pin host/port/database/schema and certified schema digest; bootstrap refuses an existing database.

Reruns skip unchanged product category and brand assignments so accounting source revisions and retained review evidence remain stable. The first full continuation replay exposed redundant assignment updates; its before/after evidence is retained as verification-replay-attempt-1-before.json and verification-replay-attempt-1-after.json. The reported replay result uses the subsequent ordered execution after that fixture correction.

For interactive use, run the following in separate terminals, then open http://localhost:3187/en/login:

```powershell
node scripts/disposable-dataset-documents.cjs
node scripts/serve-disposable-dataset.cjs stoquify_replay_dataset_20261028_01
```

Source documents use port3188. The app uses isolated build output/test secrets and blanks provider settings. No external workers/providers launch. Ctrl+C stops helpers; the database persists. No automatic deletion is included.

## Provenance

Changes cover task-owned scripts, prisma/disposable-*.ts, focused tests, plan and evidence, plus a small optional server-side storage transport seam in services/media/picture.service.ts. Production calls retain the existing UploadThing transport and URL checks. The disposable image fixture stores actual encrypted bytes locally and exercises service upload/read/claim/delete and denial paths; ordinary application image routes do not use that test transport. Existing migrations were reused and unrelated edits preserved. No commit, PR, deployment or application-database promotion occurred.

Evidence: [manifest](manifest.json), [verification](verification.json), [replay](replay-result.json), [inventory](table-inventory.json), [remaining baseline](remaining-table-baseline.json), [remaining assessment](remaining-table-assessment.json), [source check](typecheck.json), [base seed findings](seed-results.json), [prior browser checks](browser-evidence.json).
