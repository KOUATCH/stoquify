# HR-16 — Employee self-service and correction cases

Status: **VERIFIED_SCOPED**, subject to the evidence seal checks. Baseline `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886` plus preserved shared working-tree changes. This is scoped engineering evidence; no real employer policy, provider, pilot or deployment is approved.

The employee workspace now derives its employee from the current authenticated account under lock. Dedicated own-time actions and `/api/hris/my-documents` prevent dual-role HR users from switching to another employee through request data. Personal-data correction cases support submission, return, amendment, rejection, reviewer reassignment and approval through the existing profile writer. Exact retry recovery, source-version checks, independent review and atomic event/audit/case outcomes are enforced. Supporting originals and prior case versions remain retained. Published payroll results are unchanged.

| Acceptance | Result | Evidence |
|---|---|---|
| AC01 own identity, including dual-role users | PASS | Real DB injected identity, cross-employee cancellation/document denial, actual own HTTP GET/POST denial; browser dual-role/unlinked/revoked-scope |
| AC02 complete correction lifecycle and applied version | PASS | Real DB return/amend/reject/apply with native event/version; bilingual browser return/amend/approve |
| AC03 exact replay/no duplicate effect | PASS | Parallel submit/apply; changed replay payload conflict; rollback; unknown-response and postcommit-refresh component regressions |
| AC04 leave, attendance correction, protected document and status EN/FR at 360 | PASS | Actual React clients with real PostgreSQL services and named synthetic document store; 360/768/1440 correction layouts; 360 time/document journeys |
| AC05 truthful unavailable states | PASS | Missing-policy/reviewer DB tests, French unavailable component, denied browser views, successful write/read-failure distinction |

Verification classes remain separate:

- Source: independent reviewer closed R1–R4, final PASS_SCOPED. See INDEPENDENT-REVIEW.md.
- Mocked unit/action/component: 23 passing tests across 7 suites in `unit-third.log`.
- Real isolated PostgreSQL: 11 passing cases including browser integration in `postgres-browser-final.log`; all synthetic fixture organizations removed. 60 shared correctness regressions pass in `shared-correctness.log`.
- Browser: 14 result records in `browser/results.json`; actual own/correction/document components with synthetic session/action transport and actual service transactions. Keyboard submission, bilingual layout/overflow and role denial exercised. Screenshots use freshly compiled current application CSS. This does not certify production Next authentication/session delivery or full WCAG conformance.
- Provider: named in-memory synthetic document store/scanner only. No live scanner efficacy or storage acceptance claim.
- Schema validation, additive migration exact replay, scoped no-emit TypeScript, workflow contract and owned diff checks pass; see manifest for exact commands.

Failed attempts are retained: one component assertion selected two status nodes; first two browser attempts used exact labels around selects whose text included options. Those test selectors were corrected. Visual inspection identified stale fixture CSS; current application styles were compiled and the browser suite rerun. No failing attempt is counted as passing evidence.

Architecture/data: one employee master; small case table with tenant/employee FK; native writer/events/audits reused. Backend/integration: atomic apply, ordered locks, exact replay, bounded history and current policy checks. Security/privacy: live role intersection, account identity, strict own mode, independent reviewer, no public document hashes. Frontend/workflow: existing primitives, EN/FR, retained failed drafts and confirmed-success recovery. Product/operations: configured allowed fields/reviewer/support, shared-device access path; no fabricated employer choices. Quality/release: separate DB/browser/provider evidence and historical hashes. SRE/performance: bounded reads, explicit retry and source conflicts, safe error handling. Records: original evidence bound at submission/amendment. Statutory/finance: no country rule or published payroll changes. AI, inventory, purchasing and external account integrations: not applicable to this bounded slice.

Required real-pilot decisions: allowed personal fields, named reviewer/support owner and HR-15 qualified document provider/policy. No personal-smartphone-only requirement. See OPERATIONS.md for activation/recovery/rollback. These external qualifications remain open and do not become approved from synthetic tests.

Next eligible slice: **HR-17**, continuing automatically under the user's instruction. Historical HR-15/shared-file hashes remain historical; this slice does not reseal them.
