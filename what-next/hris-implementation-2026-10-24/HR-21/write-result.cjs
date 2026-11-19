const fs=require('node:fs'),base='what-next/hris-implementation-2026-10-24/HR-21';
fs.writeFileSync(base+'/RESULT.md',`# HR-21 — connected core-HR qualification and DBakes pilot

Status: **BLOCKED — external pilot environment and operator acceptance**. The bounded native-service correctness fix is verified; HR21 as a whole is not VERIFIED. Engineering recommendation: hold deployment until the remaining pilot gates pass. No accountable human launch approval has been recorded. Mode remains **HR_CORE_WITH_HANDOFF**.

Baseline: 9ab93a2a1d81e37ef7e0b10357885b48a3bc5886 on the shared working tree. Preserve unrelated edits. HR08–19 historical engineering evidence remains unchanged; current source hashes and new qualification are recorded separately.

## What changed and why

The connected office/shift journey exposed a real integration defect: linking an imported employee to an account or applying an approved personal correction erased identity source proof. Handoff readiness then rejected a legitimate native workflow. The shared profile owner now records truthful native operation evidence, including effective saved facts, tenant, actor, request hash and preceding proof hash, while retaining the original external import reference. Explicit external references keep their meaning; actorless legacy calls do not receive invented authenticated provenance. No readiness guard was relaxed.

Independent review found an implicit-key retry conflict in the first fix. A single resolved event key now controls early recovery and event recording before any metadata rewrite. Tests prove stable metadata/time and one outcome for explicit and implicit retries, plus rollback of profile evidence and its event together.

Owned implementation: services/payroll/employee.service.ts. Owned verification: services/payroll/__tests__/payroll-employee.service.test.ts, services/hris/__tests__/integrated-core-pilot.postgres.test.ts and jest.hris-integrated-pilot-postgres.config.cjs. No schema or UI behavior change was required. Evidence scripts and the execution-register append are also owned.

## Verification classes

| Class | Actual evidence and limits |
|---|---|
| Source review | Independent PASS_SCOPED_SOURCE_ONLY after the provenance, retry and evidence-runner findings were fixed. Twelve dependency manifests and236 source files reconciled;233 unchanged. The two profile-owner/test changes belong to this slice; the document actor type difference is reconciled to HR16. |
| Mocked tests |23 focused profile/readiness tests passed. Earlier current document contract/authorization check:10 tests passed. Mocks do not qualify PostgreSQL or providers. |
| Real PostgreSQL, connected journey |4 sequential tests passed on the explicitly guarded owned loopback database, using native services and independently assigned synthetic actors. Import→account link→original document→contract/payment/compensation approvals→all starter tasks→own return/amend/correction→calendar/schedule/leave→daily queue resolution→raw time/certification→handoff rejection→approved correction→replacement/receipt→future leaver guards. Original raw entries, exported bytes and exact starter history are retained. |
| Real PostgreSQL, regression |60 shared correctness cases passed. Existing handoff regression rerun separately; final count and log in evidence.json. It uses seeded reviewed fixtures and is not another full connected journey. |
| Type/contract checks |Bounded production owner and connected-test TypeScript check:0 diagnostics. The wider existing mocked fixture file retains6 string-to-Date type diagnostics outside the added tests; its runtime suite passes. An initial wider run also exposed two new fixture typing issues, both fixed. No whole-repository typecheck/build success is claimed. Workflow and owned diff checks recorded separately. |
| Provider/test-store |Connected protected originals round-trip through the injected synthetic immutable encrypted store and protocol scanner. This does not qualify a real document gateway, malware scanner or key recovery. |
| Browser/operator |No new actual authenticated browser run in HR21. HR19 retains18 synthetic browser records, EN/FR360/768/1440 and200-person discovery; HR16–18 retain their own bounded browser evidence. These do not establish Next/BetterAuth/module admission or named human task completion. |

The connected result can become PASS only after all four stages, fixture cleanup and a zero Jest exit. Failed attempts remain retained. Initial calendar-boundary, future entitlement execution and current-versus-future leave-balance assertions were fixture corrections; the identity proof failure was the product defect. For the overnight shift,450 paid minutes belong wholly to31 October although the shift ends1 November. After the approved raw correction, total worked minutes change from750 to810 without overwriting the original390-minute shift record.

## Acceptance matrix

| Criterion | Result | Remaining evidence |
|---|---|---|
| HR-21-AC01 all mandatory journeys | FAIL — incomplete coverage | Connected native office/shift lane passes with no outstanding finding in the fix. Actual authenticated application/operator journeys and effective leaver execution remain unqualified in this integrated lane. |
| HR-21-AC02 separated evidence and baseline | PASS | Exact commands/logs/hashes in evidence.json; source, mocks, real DB, synthetic provider and browser/operator scope distinguished. |
| HR-21-AC03 operator completion without intervention | NOT_RUN | Named people supplied; verified tenant accounts and actual operator sessions are still required. |
| HR-21-AC04 recovery/support/migration | NOT_RUN | Reviewed procedure prepared; cumulative customer upgrade, actual restore/key recovery, support ownership and operational rehearsal remain open. |
| HR-21-AC05 accountable launch decision | NOT_RUN | Engineering hold recorded. Human acceptance and launch approval absent; live payroll remains excluded. |

## DBakes and next executable order

DBakes in Cameroon, HR operator Shagang Oliver, independent reviewer Bolimare Solange and payroll input recipient Kouatchoua Ronald are confirmed. The user selected a separate test environment. [Setup sheet](DBAKES-PILOT.md) records these facts and remaining configuration; it does not provision identities or grant permissions.

Identify the hosting project/server or test URL and infrastructure owner → prepare and authorize the concrete isolated deployment → bind verified tenant accounts and approved employer/provider policies → run authenticated synthetic journeys and the reviewed recovery exercise → train and observe named operators → record the accountable pilot decision. No further generic continue command is needed; the hosting question is pending.

HR12 still requires an operational scheduler for unattended entitlement execution. HR17 task completion remains manual evidence/attestation, not proof of external account revocation. The separate independent payment applier, employee/manager participants, support and release owners still need assignment. HR15 live gateway/scanner, employer retention/hold policy and object/key recovery remain unqualified.

## Release, recovery and review lenses

No deployment, production migration, customer backup/restore, live provider call, external message, account grant or actual operator session was performed. No schema change/backfill is needed for this fix: existing imported origin remains in retained evidence; subsequent native writes record new proof. Roll back application behavior only through a reviewed candidate; do not delete or rewrite issued evidence. The older code reintroduces the readiness defect. See [recovery/release procedure](RECOVERY-AND-RELEASE.md).

Architecture/data: reused the single employee owner and atomic event/audit transaction. Security/privacy: retained tenant/actor boundaries and strict readiness; no expanded grants. Records/integration: exact lineage, effective facts, replay and rollback verified. QA/release/operations: evidence guards and limitations explicit. UX: no visual changes, existing operator protocol retained. Statutory/finance: no country-rule calculation or live-payroll qualification claimed. AI, POS, inventory, purchasing and commercialization: not applicable to this bounded correctness/pilot slice.

HR20A–D LIVE_PAYROLL and HR22 expansion remain unselected; they are not the next eligible implementation while core pilot acceptance is open.
`);
