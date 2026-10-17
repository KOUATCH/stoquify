# P07 — Execution result

**PARTIAL — opening-readiness guidance implemented and verified; complete master import is blocked by the current item/media contract.** Run: 17 October 2026. P08 and later prompts were not run.

The new FR/EN view separates proposed, reviewed, imported, blocked and waived master evidence from opening stock, AR/AP, ledger and reconciliation requirements. Customer and supplier imports passed through the actual authenticated application. Item staging and independent approval passed, but commit cannot satisfy the current tenant-owned-image requirement. This failure is retained and correctly shown as blocked; it is not reported as successful onboarding.

## Baseline and prerequisite decision

Baseline HEAD `b044764248f1ac47705371c235c2ba273dd973a7`; inherited branch `codex/migration-control-plane-release-2026-08-29`. [Baseline](evidence/BASELINE.json) captured 87 selected file fingerprints and 15,913 working-tree status entries. HEAD advanced independently during execution to `bc625fd17666b20910ffa71b15c14f178f461c9d` (`fix(deps): patch Sharp and Axios security advisories`). The final comparison found no unowned drift among the 87 captured files; only P07's status row changed. This bounded comparison is not a claim that the entire large checkout stayed unchanged. No stage, commit, reset or cleanup of unrelated work was performed by this execution. This is a dirty checkout, not an immutable release candidate.

P03 completed its synthetic fixture contract, and P04 completed its local access foundation. P03 explicitly hands off a read-only opening preview; P04 permits local implementation while live gates remain open. [Revalidation](evidence/SOURCE_REVIEW.json) found all 29 selected predecessor artifact/fixture files unchanged. The onboarding action, route, RBAC and module entitlement source matched P04's historical fingerprints. P03's fixture/CSV/control-boundary tests were rerun within the focused lane. D05/accountant mapping, live cutover approval, P04 T01–T08 and operational restore remain unresolved; none is treated as passed by P07.

Skills applied: ECC security-review and verification-loop, adapted to the repository's scoped command controls; project UI/UX Pro Max focus, keyboard and error-recovery guidance. No build, broad test suite, dependency installation, graph regeneration, provider operation or customer contact was performed. The documented onboarding E2E migration wrapper was not invoked.

## Delivered and exact ownership

- [SETUP_JOURNEY](SETUP_JOURNEY.md): actual operator path, prerequisite boundary, source identity, recovery and domain navigation.
- [OPENING_READINESS_STATES](OPENING_READINESS_STATES.md): state meanings, evidence limits and unsupported opening paths.
- [ITEM_IMPORT_BLOCKER](ITEM_IMPORT_BLOCKER.md): reproduced conflict, retained batch, protected controls and exact continuation.
- New `services/onboarding/opening-readiness.ts`: pure service-owned projection from already permission-filtered milestones and batches.
- Narrow extension to `services/onboarding/master-data-import.service.ts`: dashboard includes that projection. Existing import mutations, risk, approvals, rejections, replay and domain owners are unchanged.
- New `components/onboarding/OpeningReadinessPanel.tsx`: FR/EN requirements, evidence disclosure, locale-aware review links and explicit refresh.
- Narrow extension to `components/onboarding/MasterDataOnboardingWorkbench.tsx`: panel after import work area, master-only milestone wording, localized control labels and refresh that clears stale local batch/approval state.
- Scoped fix to `app/[locale]/(dashboard)/dashboard/settings/data-onboarding/error.tsx`: retry refreshes the server route before resetting the error boundary. The actual failed-read test reproduced the original retry failure; prior file and evidence are retained.
- New tests: `services/onboarding/__tests__/opening-readiness.test.ts`, `opening-readiness-access.test.ts`, `opening-readiness.postgres.test.ts`; `components/onboarding/__tests__/OpeningReadinessPanel.test.tsx`.
- This P07 artifact/evidence directory and only P07's row in `docs/retention/execution/STATUS.md`.

**Application schema/persistence impact: none.** No financial completion field, opening write, new permission or mutation endpoint was added. The verification process created a new disposable cluster and synthetic records; its datamodel bootstrap is not application migration-history certification.

## Acceptance

| P07 criterion | Status | Current evidence / limit |
|---|---|---|
| Import synthetic masters and see the exact remaining opening-position steps | **PARTIAL** | Customer and supplier stage/review/import pass through actual actions. Item stage and independent review pass, but commit is blocked by image ownership. The new view shows that failure plus all five opening requirements. Full import acceptance remains open. |
| Master success does not complete opening stock, AR/AP or accounting | **PASS — bounded** | 75 focused checks include stage separation and P03 contract. Real read projection and independent DB snapshot show review required, zero stock levels/movements/journals/postings and zero customer/supplier opening balances. |
| Wrong tenant, unauthorized role and reviewer self-approval denied according to current controls | **PASS — tested paths** | Mocked fresh-context/target/module cases; actual supplier/item self-approval rejection using the exported current digest; separate checker approval; foreign evidence action denial and unauthorized route denial. Not a platform-wide security certification. |
| FR/EN, loading, empty, error and recovery usable in tested view | **PASS — tested paths** | EN empty/import/rejection/retry and FR mobile/keyboard checks passed. Actual loading, failed-read and keyboard retry recovery passed in both locales after the scoped error-boundary fix. No assistive-technology certification. |

## Verification and environment

All commands were run from the workspace root after reviewing their definitions/configuration and effects. Custom runners use exact suites and explicit environment allowlists, not ambient application targets. Individual execution JSON files retain complete delegated arguments, exit codes and dates.

| Class | Procedure and result | Practical limit |
|---|---|---|
| S — source | Workflow, common contract, P07, roadmap R03/R04, predecessor contracts, authority chain, importer/domain boundaries, UI sources and dated graph nodes inspected. [Source review](evidence/SOURCE_REVIEW.json), [final ownership validation](evidence/VALIDATION.json). | Graph dated 9 August predates governed onboarding; current source prevails. No full repository or deployment audit. |
| V1 | `npm run agent:workflow:check` — exit 0, 196 unclassified scripts; [log](evidence/workflow.log). Runner imports only fs/path/crypto; pre/post hooks absent. | Contract check does not execute application checks. |
| M — pure/mocked/component | `node docs/retention/execution/P07/evidence/run-unit.cjs` → installed Jest, `jest.unit.cjs`, runInBand/no-cache, exact seven suites. Final **75 passed, 0 failed/skipped**, exit 0, 92.148 s. [Results](evidence/unit-1792244000236.results.json). | Includes source/pure fixture assertions and mocked authority/components; not PostgreSQL or browser proof. Earlier overlapping runs are retained, not added to the count. |
| D — real PostgreSQL | `node docs/retention/execution/P07/evidence/run-db.cjs` → `jest.database.cjs`, exact `opening-readiness.postgres.test.ts`, no Prisma/shared mock setup. **2 passed**, exit 0, 66.251 s. [Results](evidence/database-1792244327382.results.json). | One positive persisted read projection; one expected image rejection with rollback/no item write. Passing diagnostics prove the blocker, not successful item import. No new financial concurrency/posting claim. |
| D — independent source/effect check | `node docs/retention/execution/P07/evidence/lineage-check.cjs` — exit 0. [Snapshot](evidence/LINEAGE_AND_NO_OPENING_WRITES.json). | One customer, one supplier, zero items; retained business keys/row hashes; independently reviewed supplier; customer/supplier balances zero; zero stock levels, movements, journals and postings. |
| B — full actual import journey | `node docs/retention/execution/P07/evidence/browser.cjs` — **FAIL at item commit**, exit 1. [Final full attempt](evidence/browser-1792243991449.json). | Authentic credentials, actual Next route/actions and real DB. Earlier customer/supplier success and both high-risk self-denials are retained. No mock or direct DB insertion substitutes for item import. |
| B — independent continuation | `node docs/retention/execution/P07/evidence/browser-continuation.cjs` — **PASS, five checks**, exit 0. [Results](evidence/browser-continuation-1792244279171.json), [FR mobile screenshot](evidence/GUIDANCE_FR_MOBILE.png). | Original item-batch retry stays blocked without writes; customer replay idempotent; foreign export and unauthorized route denied; FR 390×844 reflow, keyboard disclosure/focus and locale links. Desktop EN 1440×1000. Screenshots inspected. |
| B — loading/error/recovery | `node docs/retention/execution/P07/evidence/browser-states.cjs` — **PASS, four checks**, exit 0. [Final result](evidence/browser-states-1792244669386.json). EN/FR actual loading and failed-read/keyboard-retry recovery passed; `injectionRestored: true`. | Controlled table lock/temporary rename only in the owned synthetic DB, restored in finally. The initial failed retry is retained in [prior result](evidence/browser-states-1792244545366.json); it led to the route refresh/reset fix. Separate from successful import evidence. FR error screenshot inspected. |
| P — provider/authority | NOT_RUN. | Browser external origins blocked; no real image provider, payment provider or filing. |
| C — customer outcomes | NOT_RUN. | No customer task observation, activation, retention or satisfaction measurement. |
| E — qualified expert | NOT_RUN. | No accounting, legal, country, security or accessibility certification. D05 remains open. |
| O — restore/load/operations | NOT_RUN. | No backup restore, RPO/RTO, production load or deployed durability proof. Service cleanup is recorded separately. |

Runtime: Next 15.5.27, Chromium 149.0.7827.55, PostgreSQL 17.5. Actual route `http://127.0.0.1:3188/{en|fr}/dashboard/settings/data-onboarding`; synthetic maker/checker/foreign/denied accounts, [fixture](evidence/BROWSER_FIXTURE.json). Final tenant `p07-org-97ee2d2e0f76`. Database `stoquify_retention_p07_20261017_1f0304dc47`, loopback port 60401; [target](evidence/DATABASE_TARGET.json). New cluster `.codex-tmp/retention-p07-setup-1f0304dc47`; no existing data clone or ambient target. [Schema provenance](evidence/SCHEMA_PROVENANCE.json) records current datamodel-to-empty SQL and its hashes; custom migration triggers/history are not certified.

Runtime setup commands: `node docs/retention/execution/P07/evidence/database.cjs create`; `.../fixture.cjs` (subsequent `--new` creates additional synthetic identities and archives the prior fixture record); `.../application.cjs`. The application blocks ambient environment values and uses a fresh `.next-retention-p07-setup-session-DtrIsO` output and isolated tsconfig. Synthetic records from failed attempts remain retained. [Attempts](evidence/ATTEMPTS.md) distinguishes selector/hydration/digest/risk-assumption corrections from the genuine item import failure. No application timeout, approval or media ownership rule was weakened.

No full build, global typecheck, broad lint/test suite, migration-history test, live deployment, customer data query or later prompt ran. SWC execution and Next development rendering are not full TypeScript/release certification.

## Risks, recovery, metrics and handoff

The material blocker is the current ITEM-import/media incompatibility. P07's allowed scope is onboarding read model/action/UI and narrow tests; changing the item/media mutation contract or choosing an imageless-item policy would exceed it. Do not bypass `claimItemPictures`, whitelist a shared image, fabricate picture ownership, or report generic retry as resolution. The scoped continuation is in [ITEM_IMPORT_BLOCKER](ITEM_IMPORT_BLOCKER.md).

The opening requirements are explicitly unverified/unsupported, not dynamic financial completeness aggregation. A future source-bound cutover contract must define scope/date/revision, domain proof, reconciliation and independent approval before these can become complete. Existing stock posting, accounting READY, a draft journal, a waived master or a fixture pass cannot substitute. External AR/AP import remains unsupported in the inspected paths. No release/pilot gate is passed.

Rollback is limited to P07's added projection/panel/tests and captured workbench/service/error-route additions. Use the before files and patches in evidence; preserve all pre-existing changes and retained source/import evidence. Do not reset or delete domain history. The owned application was stopped with its session interrupt, and the disposable cluster stopped successfully with `database.cjs stop` (exit 0). [Cleanup](evidence/CLEANUP.json) confirms ports 3188 and 60401 both returned `ECONNREFUSED`. Cluster files and synthetic records remain retained for review; they are not production backups.

No product analytics instrumentation was added. Existing recent-12-batch adoption counts remain operating evidence, not activation or a retention cohort. Useful follow-up measures remain time from staged source to independently reconciled opening, blocked-step age, recoveries of the same batch and assistance per setup, with explicit eligible organizations and missing-data rules; no measured baseline is invented here.

**Next action:** resolve the item/media import compatibility within a separately scoped P07 continuation, then rerun the full synthetic import journey. P08/P12/P13 may consume the state contract and the explicit blocker only when separately requested; they cannot treat P07 as complete.

Review lenses: architecture/domain ownership, data/source integrity, IAM/tenant/privacy, UI/localization/keyboard/recovery, product setup friction, QA and operational containment were applied. Finance/audit continuity is protected through non-inference and zero opening effects. Country calculations, payroll, POS/offline execution, provider payments, AI, pricing and new APIs are not applicable to this read-only guidance slice. Customer adoption, statutory correctness and release readiness remain unproven.
