# AF16 development verification result

**2 November 2026 sealed obligation follow-up:** [AF11 operational browser verification](SEALED_OBLIGATION_BROWSER_2026-11-02.md) PASS: 8 workflow groups, 4 scoped EN/FR scans, exact retry, independent review, UNKNOWN statutory state and authority recovery. AF11 country qualification remains IMPLEMENTED_UNVERIFIED; production NO_GO. Next: AF06 delegated evidence workflow on the same artifact.

**2 November 2026 engagement repair follow-up:** [Replacement artifact and AF03–AF05 verification](ENGAGEMENT_REPAIR_2026-11-02.md) PASS within the selected scope: eight component recovery checks, reproduced old pending-refresh defect, full build/artifact verification, 11 lifecycle/layout groups and 6 restrictive recovery groups; 4 scoped axe scans. The 28 October failure remains historical. Next: AF11 operational register on this replacement artifact. Production remains NO_GO.

**28 October 2026 sealed engagement follow-up:** [AF03–AF05 browser attempt](SEALED_ENGAGEMENT_BROWSER_2026-10-28.md) FAILED during client-grant setup: the preparer grant saved but the form remained pending; a diagnostic recovered the form on reload, then failed in the next grant/password-confirmation flow. Lifecycle, EN/FR/axe and recovery matrices were not reached. Next: diagnose this blocker before AF11. Production remains NO_GO.

**26 October 2026 sealed opening follow-up:** [AF09–AF10 browser verification](SEALED_OPENING_BROWSER_2026-10-26.md) passes on the verified full application: three real identities, secure cookies, staged review, separate financial approval, injected failure rollback, lost-response recovery, replay and current-module denial; six scoped axe scans. Remaining browser, predecessor rollback and other release gates stay open.

**26 October 2026 follow-up:** [Local build assurance](BUILD_ASSURANCE_2026-10-26.md) records a current workflow PASS and full lint PASS (0 errors, 24 warnings). Attempt 5 completed the full build, sealed and independently verified 5,284 runtime files, and passed eight isolated HTTP checks. A separate fresh locked install passed with lifecycle scripts disabled. Earlier timeout/conflict attempts remain retained; production qualification remains open. The 25 October results below remain historical.


25 October 2026. **Development verification executed for AF01–AF13 using synthetic scenarios. Formal AF16 status: IMPLEMENTED_UNVERIFIED for release. Production decision: NO_GO. Pilot: PILOT_PREPARED.** Live pilot validation is deferred under the user's development-stage instruction. AF14 and AF15 are excluded.

## Candidate and changes

Source HEAD: 9ab93a2a1d81e37ef7e0b10357885b48a3bc5886. The checkout contains substantial pre-existing changes; HEAD alone does not identify the tested candidate. See initial-working-tree.txt, phase-suite-adapters-initial.json, phase-suite-adapters.json and AF13/browser-source-manifest.json in this run for current source/test hashes. Application sources were copied without environment files; only the isolated generated Prisma client was used. No production configuration, schema promotion, outreach, payment or deployment was performed.

Source comparison covered 5167 files. Concurrent differences from the retained browser snapshot: components/auth/v2/AuthV2Shell.tsx, components/Forms/ForgotPasswordForm.tsx, components/landing/public-detail.css. These files were preserved. The exercised accounting surfaces and direct authentication API are unchanged; the changed public authentication screens were not part of this browser journey. This run verifies the recorded snapshot, not an unbounded moving checkout.

Reused AF01–AF13 services, actions, components, schema, phase scenarios and browser workflows. Added AF16-only orchestration, a real queue recovery scenario, a shared reviewed-client journey, scoped type configuration and evidence/report tooling. Two existing tests were corrected: the delegated-recovery component suite needed a mock for its new obligation child; AF03's dormant-only assertions were superseded explicitly by the AF04 authority migration. Current assertions verify managed-key retention, live enrollment with current permissions, denial after suspension/end and inability to regain legacy access. No application business behavior or migration was changed.

## Verification by evidence class

| Class | Current result | Limits |
|---|---|---|
| Workflow/source | Initial workflow contract PASS; final check FAIL on concurrent PasswordRecoveryForms.test.tsx reviewed-file drift; schema validates and hashes retained | No registry hash was refreshed; the changed test:ecc:pilots lane was not executed |
| Pure/mocked service/unit | 1165 tests in 47 suites pass | No real database or authentication implied |
| Component/jsdom | 152 tests in 15 suites pass | Rendering/interaction in jsdom; separate from browser checks |
| Combined scoped source types | PASS, no emit | AF01–AF13 entrypoints and dependencies, not a full production build |
| Real PostgreSQL lanes | 161 cases pass across 13 phase/worker suites; one AF12 duration case is pure | Fresh named clones on owned loopback PostgreSQL 17; original phase data/receipts preserved |
| Shared client journey | 1 case passes | Same managed engagement combines reviewed workpapers, delivered advisory and confidential planning, with financial source hashes unchanged |
| Migration | 120 clean migrations and replay; populated 118→120 upgrade/replay passes | Twelve table counts/digests retained; some operational tables are empty; not every historical predecessor |
| Release artifact boundary | 17 tests pass | Fixture compiler/artifacts and mocked promotion; not an actual sealed Stoquify build/deployment |
| Authenticated browser | Three current journeys pass | Exact tested surfaces below; no whole-app accessibility certification |
| Artifact inspection | AF08 JSON/CSV/PDF byte hashes, selected reviewed balances in three PDFs, private-marker exclusion and downloaded planning hash reconcile | See export-artifact-verification.json, publication-verification.json and visual-review.json; only the selected schedules are expected in each export |

The initial broad regression run had 1,312 passing tests and one suite that could not load. The corrected suite contributes five passing tests, giving 1317 tests across 62 distinct suites. Retain both receipts; no failed assertion was silently dropped. AF03's initial four obsolete assertions and AF04's omitted legacy harness fixture are retained; fresh-clone reruns pass 31 and 27 cases respectively.

The first new shared-journey attempt supplied an engagement field to the narrower workpaper scope. Existing strict validation rejected it before any planning record was created. The test now passes only client and period to that service; its corrected rerun passes without weakening the input contract. Both receipts are retained.

The first PDF comparison expected a receivable balance in a cash-only browser advisory. The checker now derives expected balances from each exact paired JSON; all three PDFs pass, including the cash-only selection. The initial checker result remains retained. This was an expectation correction, not a changed export.

## PostgreSQL scenario matrix

| Phase | Cases | Result | Evidence |
|---|---:|---|---|
| AF01 | 6 | PASS | [Jest receipt](2026-10-25-run-01/AF01/jest.json) |
| AF03 | 31 | PASS | [Jest receipt](2026-10-25-run-01/AF03/attempt-2/jest.json) |
| AF04 | 27 | PASS | [Jest receipt](2026-10-25-run-01/AF04/attempt-2/jest.json) |
| AF05 | 8 | PASS | [Jest receipt](2026-10-25-run-01/AF05/jest.json) |
| AF06 | 7 | PASS | [Jest receipt](2026-10-25-run-01/AF06/jest.json) |
| AF07 | 10 | PASS | [Jest receipt](2026-10-25-run-01/AF07/jest.json) |
| AF08 | 10 | PASS | [Jest receipt](2026-10-25-run-01/AF08/jest.json) |
| AF09 | 8 | PASS | [Jest receipt](2026-10-25-run-01/AF09/jest.json) |
| AF10 | 19 | PASS | [Jest receipt](2026-10-25-run-01/AF10/jest.json) |
| AF11 | 14 | PASS | [Jest receipt](2026-10-25-run-01/AF11/jest.json) |
| AF12 | 10 | PASS | [Jest receipt](2026-10-25-run-01/AF12/jest.json) |
| AF13 | 10 | PASS | [Jest receipt](2026-10-25-run-01/AF13/jest.json) |
| AF16WORKER | 1 | PASS | [Jest receipt](2026-10-25-run-01/AF16WORKER/jest.json) |

AF01 tests complete traversal, current/historical proof, stale publication and independent-writer snapshots. AF03–AF05 test legacy compatibility, explicit managed enrollment, identity/assignment constraints, permission/session/mandate revocation, expiry, concurrent suspension and retained handover. AF06 preserves independent response review and failed financial controls. AF07 checks decimal import, duplicate identity, account coverage and transactional failure. AF08 tests source-bound review/export and private data exclusion. AF09–AF10 exercise preview, tie-out, atomic apply, lost-response retry and recovery through existing writers. AF11 preserves unknown country evidence and scoped obligations. AF12–AF13 check advisory agreement/outcomes, manual effort, confidential currency-separated planning, replay, revision races and current authority.

Fixture boundaries matter: synthetic historical ledger rows and a typed payment-collector receipt are prepared inputs. Acceptance of that receipt does not constitute a successful full close assessment, reconciliation signoff, live provider delivery or statutory filing. AF12's pure duration calculation is not counted as proof of a database write.

## Current browser journeys

- **Evidence desk:** /en and /fr/dashboard/accounting/accountant-portfolio and the selected /dashboard/accounting/close/:periodId route. Separate preparer, client owner and reviewer sign-ins; retained request, response, password freshness challenge and independent acceptance; FAILED reconciliation remains FAILED. English/French at 1440px and 390px, four scoped axe checks, no horizontal overflow and keyboard refresh focus. [Receipt](2026-10-25-run-01/AF06/browser-results.json).
- **Advisory:** /en and /fr/dashboard/accounting/accountant-portal with the synthetic client/period. Lost successful response and exact retry, self-review denial, independent review, client agreement, delivered JSON/PDF, private-note exclusion, explicit missing baseline, source staleness and module denial. Four scoped axe checks and keyboard focus. [Receipt](2026-10-25-run-01/AF12/browser-verification.json).
- **Workload on that same reviewed client:** protected manual effort/correction, independent review with step-up, separate EUR/USD/XAF budgets, hashed JSON download, client denial and fee-permission removal. Four scoped axe checks. [Receipt](2026-10-25-run-01/AF13/shared-browser/browser-verification.json).

The first evidence-browser attempt timed out after 90 seconds while the client workbench still showed loading after cold compilation. Its failed receipt and screenshots are retained. A warm retry used the same request and a bounded 180-second UI wait. Passing functional checks after that retry is not evidence of acceptable production responsiveness.

Current browser checks do not rerun every setup, opening and obligation screen or every screen-reader interaction. Historical phase screenshots remain historical. These are explicit release coverage gaps rather than inferred green results.

## Performance and recovery observations

The 105-client portfolio traversed 6 pages at a maximum 20 clients per page. Observed total 21555.7 ms, 2153 database queries and 191 ms maximum individual query duration; the scenario verifies read-only operation. This is a local combined run, not an agreed SLO or capacity certification. The query count warrants profiling before a live pilot.

The 1,000-row provider import's retained performance receipt measures its real locks, statement/inbox/event/outbox and invalidation path. Queue recovery used 105 synthetic messages plus one foreign-client message, bounded competing claims, a stale acknowledgement fence and one injected handler failure. Observed recovery elapsed 12562.7 ms. The local handler sent nothing externally; the other client's pending message remained untouched. No stakeholder latency/error budget has been agreed.

## Acceptance assessment

| Criterion | Result | Basis |
|---|---|---|
| AF16-AC1 current checks or explicit NO_GO | PASS as a decision requirement | Current receipts above; release gaps explicitly NO_GO in GO_NO_GO.md |
| AF16-AC2 truthful portfolio, consent and independent review | PASS within synthetic scope | Real service scenarios and current three-role evidence journey |
| AF16-AC3 no cross-client disclosure, duplicate financial effect or permissive rollback | PASS for exercised scenarios | Tenant boundaries, idempotency/atomicity, managed-key fences, source freshness and private-field clearing |
| AF16-AC4 rehearsed rollout/rollback and build/schema separation | PARTIAL | Local control/queue rehearsals and 17 release-fixture tests pass; full built previous-app/hosted rollout rehearsal not performed |
| AF16-AC5 metric definitions and baseline plan | PASS for preparation | PILOT_PROTOCOL.md defines cohorts, missingness, two-cycle collection and decision owners; live measurements remain pending |

## Commands and reproducibility

Reviewed command-registry definitions before execution. New scripts are explicitly scoped AF16 tools, not newly approved general commands. The exact run uses npm run agent:workflow:check; node scripts/prepare-af16-verification.cjs; node scripts/prepare-af16-phase-suites.cjs; node scripts/run-af16-phase-suites.cjs (AF03 and AF04 fresh attempt 2 retained); node scripts/verify-af16-upgrade.cjs; Jest with jest.af16-regression.config.cjs and the isolated PostgreSQL config; node scripts/verify-af16-types.cjs; the selected release-artifact test; and the guarded current browser adapters. JSON receipts retain individual test names, outcomes and timestamps. Scripts refuse existing fresh database targets; reruns need a new explicit attempt rather than destructive reset. The final workflow check exits 1 because the separately edited components/auth/v2/__tests__/PasswordRecoveryForms.test.tsx differs from the test:ecc:pilots reviewed manifest. Its owner must review that drift; AF16 did not change it or the registry. See workflow-check-final.log.

The combined shared-journey run uses the retained AF12 synthetic clone only after its phase suite succeeds. Browser credentials and server logs stay in the task-private directory. Final cleanup is recorded separately. Publication uses docs-report-publisher, followed by PDF/text/hash checks; rendering a report is not product verification.

## Release, ownership and next step

Keep the formal release status IMPLEMENTED_UNVERIFIED and the expanded production decision NO_GO. AF11 remains limited by qualified country review. Live recruitment, baseline benefit and two-cycle validation are deferred. The technical release owner must supply a full sealed build, selected-scope remaining browser checks, acceptable agreed performance/error budgets and compatible rollout/rollback evidence. Product and firm owners select the later pilot; no automatic AF14/AF15 work is justified by these results.

See [scope](RELEASE_SCOPE.md), [decision matrix](GO_NO_GO.md), [pilot protocol](PILOT_PROTOCOL.md) and [recovery runbook](ROLLBACK_RUNBOOK.md). Architecture/IAM/data, accounting evidence, UX, performance and operations are material and reflected in the checks. Country legal support is explicitly pending. AI model behavior, new pricing and live billing are not applicable to this verification slice.
