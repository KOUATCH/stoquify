# AF12 advisory outcomes — implementation and verification

**Date:** 25 October 2026. **Status:** VERIFIED within the bounded AF12 scope. **Scope:** AF12 only. **Source revision:** `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886` plus the existing shared dirty working tree and the AF12 changes identified below.

## Outcome

The existing Accountant Portal now contains a client advisory workflow beside AF08 workpapers. A firm prepares conclusions and owner/date actions from reviewed source observations, a different accountant reviews the narrative, a client-local actor agrees to the displayed actions, and an authorized firm exporter publishes the version into the authenticated client workspace. PDF/CSV/JSON exports retain attribution and source hashes. Private firm notes and firm outcome metrics have separate permission boundaries.

Source or workpaper review changes mark old narrative and export envelopes for review. Historical delivered evidence remains attributable, including while a new assessment is incomplete. No new publication can proceed without current reviewed support. Outcome measures disclose their exact cohort, UTC window, denominators, missingness and elapsed-time interpretation; baseline improvement and active work time remain unmeasured.

## Baseline and reuse decisions

| Requested behavior | Before AF12 | Final implementation |
|---|---|---|
| Reviewed financial observations | AF08 already supplies exact reviewed account/currency schedules | Reused its transaction reader and source locks; no financial recalculation |
| Client conclusions and agreed follow-ups | No complete source-bound advisory lifecycle | Added bounded append-only engagement/period revisions with independent review and client agreement |
| Delivery and readable exports | AF08/Close export safety, watermarks and retained exports already exist | Reused export safety, CSV escaping, PDF libraries and ClosePackExport; added a public advisory canonical projection |
| Firm private notes | Shared workpaper/comment records could expose narrative through other readers | Kept notes in the new advisory revision field behind a separate firm-only preparation-authorized reader; excluded from public DTOs and exports |
| Outcome measures | Typed request/response/acceptance records and workpaper/engagement timestamps exist; retention service is sales/POS scoped | Reused typed tracking and source timestamps, with an explicitly authorized cohort and no sales endpoint reuse |
| Source-change recovery | AF08 rejects unavailable/currently incomplete proof | Kept strict writers, with a retained-history reader that marks unavailable current proof for review |

Inspected financial statements, AR open items, payable close balances, daily digest contracts, retention outcome principles and financial-statement export patterns. Independent live financial calculations would differ from the reviewed AF08 snapshot, so they were not introduced into the advisory pack. Existing dated graph evidence was used for discovery only; current source governs behavior.

## Owned changes

- `services/accounting/advisory-outcomes.contract.ts`: strict scope, command and metric contracts; missing-aware duration projection.
- `services/accounting/advisory-outcomes.service.ts`: authorized workspace, private-note read, lifecycle, source freshness, retained export and outcomes.
- `services/accounting/advisory-outcomes-export.ts`: one public projection for readable CSV/PDF and canonical JSON.
- `actions/accounting/advisory-outcomes.actions.ts`: existing protected-action, trusted-session, module and fresh-auth boundaries.
- `components/accounting/AdvisoryOutcomesDesk.tsx`: localized portal workflow and outcomes UI.
- Existing `review-workpaper.service.ts`: one internal transaction reader wrapper; existing workpaper behavior remains covered by regressions.
- Existing `AccountantPortal.tsx`: import and render the advisory panel beside workpapers.
- Existing `prisma/schema.prisma`: only the FirmAdvisoryRevision model is AF12-owned. `20261025090000_firm_advisory_outcomes/migration.sql` is the one AF12 migration.
- Scoped tests/configurations and guarded synthetic database/browser runners named `advisory-outcomes`.
- This phase's reports, one follow-up, and the shared publication index/roadmap/status summaries.

Earlier AF01–AF11 work and unrelated landing, retention, POS, HR and command-center edits were preserved. No commit, push, PR, production migration, deployment, real-client enrollment or outbound message was performed.

## Acceptance evidence

| Criterion | Service/database result | Evidence |
|---|---|---|
| AF12-AC1: exact reviewed sources | PASS | Real AF08 supporting-evidence proposals/approvals and workpaper review; advisory observations deep-equal the selected reviewed schedules; canonical hash and three export formats reconciled |
| AF12-AC2: no missing-to-zero or invented improvement | PASS | Missing support denies new drafts; missing/invalid/inverted timestamp pairs remain null; no baseline/active-work-time/improvement value is invented |
| AF12-AC3: explicit cohort/window/coverage | PASS | Real delegated request/response/acceptance loop measures timestamp pairs; an earlier window excludes later responses/acceptance; cohort/permissions/denominators are explicit |
| AF12-AC4: distinct boundaries | PASS | Real client cannot prepare/review/deliver as firm or read private notes; firm cannot fake client agreement; self-review, stale step-up, invalid sessions, foreign periods/owners and management-permission denial are tested |
| AF12-AC5: invalidate current narrative, retain history | PASS | Source mutation and new workpaper preparation invalidate old narratives; incomplete current assessment preserves historical delivered evidence with review-required exports; append-only retention is enforced |

Rendered evidence and publication are tracked separately below; database passing results do not substitute for browser or artifact inspection. The authenticated journey, scoped accessibility checks and artifact reconciliation passed.

## Verification by evidence class

Latest run: [2026-10-25-run-01](2026-10-25-run-01/). The prior 21 October workflow log is retained as earlier discovery evidence.

| Evidence class | Executed check | Result |
|---|---|---|
| Workflow/source contract | `npm run agent:workflow:check`; current registry/definitions reviewed | PASS; 196 scripts outside the reviewed manifest; no application commands are run by this check |
| Generated schema client | Prisma generate with `.codex-tmp/af12-prisma/prisma.config.ts` | PASS, isolated client, no application environment loaded |
| Scoped TypeScript | `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.advisory-outcomes.json` | PASS; no emit/incremental output; final source recheck retained in run evidence |
| Reused pure/mocked/component regressions | Jest `jest.advisory-outcomes-regression.config.cjs --runInBand` | 135 PASS: 98 authority, 8 workpaper component, 4 AR export, 10 workpaper export, 15 balance-sheet contract |
| AF12 real PostgreSQL suite | Jest `jest.advisory-outcomes-postgres.config.cjs --runInBand` | Initial/final nine-scenario runs PASS; final freshness-targeted run adds one scenario and reruns two affected cases: 3 PASS, 7 skipped by the explicit filter. Ten distinct scenarios covered overall: nine database scenarios and one pure duration projection; additional targeted authority and owner-eligibility passes are retained |
| Migration application | Guarded fresh `stoquify_local_af12_20261025_r1` | 118 current migrations applied successfully |
| Populated upgrade/replay | Guarded `stoquify_local_af12_upgrade_20261025_r3`, cloned from retained populated AF11 upgrade fixture | 105→118 and replay PASS; counts and row digests unchanged across nine operational tables, including 35 journal entries / 163 lines |
| Authenticated rendered browser | `scripts/verify-advisory-outcomes-browser.cjs` on isolated loopback app | PASS; three identities, lost-response recovery, review/agreement/publication, export and denial; four initial plus four final EN/FR desktop/mobile scoped axe scans with zero violations |
| Product/report artifact inspection | Exact canonical JSON/CSV/PDF, PDF text/rendering and all Markdown/PDF pairs | PASS; 76 pairs, heading/A4/nonempty-page checks, product/source reconciliation and representative visual inspection; final hashes and counts in publication-verification.json |

The migration count includes twelve intervening HR/command-center migrations already in the shared workspace plus AF12. This is current-schema compatibility evidence, not authorship or release certification of those unrelated modules. The first upgrade candidate correctly stopped because its ledger was empty; a second run preserved rows but stopped at an outdated expected migration count. The final populated run uses the current migration count and retains complete preservation/replay evidence.

The first type check raced client generation and reported missing generated model types; the completed-client check passed. Windows initially refused the isolated browser client's junction; the reviewed elevated retry created that task-local junction. These are recorded verification setup issues, not hidden passing runs.

Temporary verification services were stopped after checking the owned process identity and confirming no other database clients were connected. Synthetic databases and evidence remain retained; see `cleanup.json`.

## Product and operational boundaries

See [ADVISORY_CONTRACT.md](ADVISORY_CONTRACT.md) for state transitions, source handling, permissions, limits and rollback. Delivery means publication in the authenticated client workspace, not email delivery or client receipt. Product review is not an audit opinion or close certification. UI authoring starts with one selected conclusion/action per replacement draft; the service supports four categories and ten actions. No forecasts, financial FX sums, employee surveillance or inferred ROI are introduced.

Outcome requests measure all authorized requesters in the selected client period, not exclusively the selected firm's labor. Active work time is not measured. A baseline and live benefit validation remain absent. See [METRIC_DICTIONARY.md](METRIC_DICTIONARY.md), [PILOT_BASELINE_PROCEDURE.md](PILOT_BASELINE_PROCEDURE.md) and [SAMPLE_ADVISORY_PACK.md](SAMPLE_ADVISORY_PACK.md).

## Rollout, rollback and next step

Activate only after the additive migration and compatible application/client are reviewed through the existing release process. Preserve managed engagement consent, current modules, owner permissions and fresh authentication. Monitor stale/source-limit refusals, audit failures and authorization denials; retry uncertain submissions with the retained command. Roll back the new panel/actions while retaining advisory evidence and continuing existing workpapers. Do not drop the table or erase deliveries.

AF16 core/expanded release qualification and the prospective pilot baseline are the next justified work. The user explicitly selected AF12 before AF16; that changes implementation sequencing, not production authorization. AF11's qualified-country-review gate remains unchanged. AF13–AF15 are not started by this execution.

Architecture, database, IAM/privacy, accounting evidence, UX/localization, QA/recovery and operational bounds were material. AI/model changes and new country-law rules were not applicable because AF12 introduces neither. Commercial packaging, provider integrations and broad infrastructure changes were outside this phase. No legal, accounting, accessibility-wide or release certification is claimed.
