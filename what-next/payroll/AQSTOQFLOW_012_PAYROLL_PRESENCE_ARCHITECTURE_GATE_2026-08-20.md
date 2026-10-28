# AqStoqFlow 012 Payroll and Presence Architecture Gate

Date: 2026-08-20  
Skill: `012-aqstoqflow-payroll-presence-architect`  
Repository state: `REPAIR`  
012 internal static gate: `READY` (13/13, zero static blockers)  
013 advancement decision: `BLOCKED`  
Production decision: `NO-GO`

## Executive decision

The repository contains a broad, coherent HRIS, presence, payroll, accounting, payment-reconciliation, event/outbox, RBAC, and operator-UI implementation. This is not greenfield and is beyond a partial build. It is classified as `REPAIR`, however, because source inspection found semantic approval and event-contract gaps that the static 012 gate does not detect:

1. Payroll payment release accepts `requestedById` from the client action payload while the authenticated user is assigned to both `approvedById` and `releasedById`. The service compares the release actor only with the caller-supplied requester. This does not provide authoritative requester provenance and violates the required requester/approver/releaser separation.
2. `approveAndPostPayrollRun` accepts either `CALCULATED` or `REVIEWED` and atomically changes the run through approval, payslip emission, and posting. There is no review mutation even though `payroll.runs.review` exists, and the distinct approve, emit, and post permissions are not independently enforced.
3. The minimum business-event contract is incomplete. Leave approval writes an audit record and leave-balance entry but no business event/outbox message; run approval has no distinct business event; payslip emission is an outbox message nested under `payroll.run.posted`, not a final business event with its own evidence contract.

These findings do not invalidate the controls that are present: tenant scoping, frozen attendance inputs, deterministic calculations, country-pack provenance, immutable finalized outputs, balanced source-linked posting, correction runs, payment reconciliation, close invalidation, and failure rollback all have concrete implementation and focused test evidence. They do prevent 012 from being approved for 013.

## Scope and evidence inspected

- Upstream 011 purchasing/AP gate and its current readiness artifact.
- `graphify-out/GRAPH_REPORT.md` and `graphify-out/GRAPH_REPORT_actions.md` for architectural relationships; the current source was treated as authoritative where the graph's 2026-06-14 snapshot is older.
- `prisma/schema.prisma` and payroll immutability migrations.
- `services/hris/*`, including employee, organization, contract, compensation, document, operational-time, time/leave, and payroll-readiness ownership facades.
- `services/payroll/*`, especially control, employee, contract, compensation, payments, reconciliation, declarations, register, country-pack review, release readiness, and correction services.
- `services/regulatory/country-packs/*`, `services/accounting/*`, `services/payments/*`, `services/events/*`, and `services/controls/*` boundaries.
- `actions/hris/*`, `actions/payroll/*`, route access/data definitions, payroll workbench components, permission catalogues, and focused tests.
- Current payroll, statutory, migration, immutability, and enterprise-release reports under `what-next/`.

The graph's payroll approval community and its ledger-first, tenant-defence, RBAC, and operational-backbone hyperedges match the current intended architecture. Current source inspection additionally shows HRIS ownership facades and payment/authority adapters that post-date the graph snapshot.

## Prerequisite 011 closure

`what-next/purchasing-ap-consolidation-readiness.md` was generated on 2026-08-20 and is `ready`: 11/11 checks, zero blockers. It includes `goods_receipt_atomic_stock_posting`, supplier-invoice three-way match evidence, AP ledger/audit proof, supplier payment maker-checker, reconciliation controls, and policy wiring.

Decision: 011 is closed sufficiently to permit 012 architecture and repair work. Its static/read-only nature is not treated as supplier, bank, tax, or statutory certification.

## Boundary decisions

| Boundary | Current source of truth | Architecture decision |
| --- | --- | --- |
| Employee and organization | `services/hris/*`, backed partly by payroll-named compatibility tables and explicit `Hris*` models | HRIS remains the only business writer. Payroll consumes certified, tenant-scoped snapshots; compatibility storage does not change ownership. |
| Contract and compensation | HRIS facades plus `services/payroll/contract.service.ts` and `compensation.service.ts` compatibility persistence | HRIS owns intent, evidence, approval, effective dates, and activation. Country packs own statutory meaning. Payroll owns calculated component output only. |
| Presence, leave, and overtime | `services/hris/operational-time.service.ts`, `time-leave.service.ts`, operational ledgers, and `PayrollAttendanceSnapshot` | HRIS/presence owns requests, decisions, source/device evidence, anomaly handling, balances, and certification. Payroll may consume only a frozen certified snapshot. |
| Payroll | `services/payroll/*` and `PayrollPeriod`, `PayrollRun`, lines, payslips, declarations, and payment-batch models | Payroll owns deterministic calculation, immutable run/payslip proof, correction runs, register, payment intent, and declaration read models. It must not encode country-specific rates. |
| Country packs | `services/regulatory/country-packs/*` | Own legal parameters, effective dates, capability, provenance, labels, and review status. Unsupported or expert-review-only production automation fails closed. |
| Accounting | posting rules, posting batches, journals, source links, periods, and close services | Own exact tenant account mappings, balanced posting, open-period enforcement, source links, and close invalidation/blockers. Payroll supplies signed component facts, not account codes. |
| Payments/reconciliation | payment transaction, exception, provider/statement, and reconciliation services | Own settlement truth, suspense, matching, exceptions, and reconciliation certificates. Payroll release creates the outbound obligation and evidence atomically but cannot self-certify settlement. |
| Events/outbox | business-event service and transaction-scoped event/outbox writes | Every final transition must create one idempotent tenant/actor/source-bound business event and its outbox messages in the same database transaction. |
| Actions and UI | protected server actions, route catalogue/access layer, server-rendered pages, client workbench panels | Actions derive tenant and acting identity, validate input, and delegate rules. Components and routes render permissions and evidence; they never become financial truth owners. |

No migration from current payroll-named compatibility tables is recommended in this repair slice. Such a rename would create unnecessary data and deployment risk. Ownership remains contractual and service-enforced until a separately gated migration is justified.

## Data model assessment

The current schema explicitly models the necessary foundation:

- organization-scoped employees, identifiers, status, dates, manager/location/cost-center associations, protected payment destination fingerprints, and duplicate/ghost-worker evidence;
- effective-dated contracts, signed-document/approval metadata, rubriques, assignments, salary changes, and destination-change requests;
- HRIS organization units, positions, assignments, reporting relationships, delegations, calendars, holidays, schedules, leave policies and append-only balances, time requests/imports/entries, and anomaly queues;
- payroll periods, frozen/corrected attendance snapshots, typed runs and correction linkage, run lines with calculation snapshots and hashes, payslips and lines, declarations/evidence, payment batches/allocations, and employee balance cases/events;
- organization scope and compound uniqueness throughout the payroll kernel;
- immutable database enforcement for finalized runs, run lines, emitted payslips and lines, released batches and allocations, declaration payloads, and balance history.

Required repair is behavioral rather than a broad schema redesign. Existing payment-batch actor/status fields and payroll-run state fields are sufficient for staged transitions. Add only any transition-evidence or version fields proven necessary by the engine repair; do not duplicate the aggregate models.

## Target service, action, hook, component, and route structure

| Layer | Keep | Repair/add |
| --- | --- | --- |
| HRIS/presence services | Existing `services/hris/*` ownership facades and certified payroll-readiness contract | Emit final leave-decision and attendance events through the common business-event/outbox service. Keep corrections append-only. |
| Payroll services | Existing calculation, register, correction, reconciliation, declaration, and readiness services | Split run review, approval, payslip emission, and posting into explicit transition services. Split payment request, approval, and release; load stored actors rather than accepting decision actors from payloads. |
| Accounting integration | Existing posting-rule resolver and transaction-aware posting helpers | Require `APPROVED`/`EMITTED` run state for posting and preserve the single transaction across journal, source link, run update, event/outbox, audit, and close invalidation. |
| Actions | Existing `protect` wrappers, module enforcement, organization derivation, safe results, and cache invalidation | Add dedicated review/approve/emit/post and payment request/approve/release actions. Derive every acting actor from auth context. Declaration preparation must require fresh auth. |
| Hooks | No dedicated `hooks/payrollHooks/*` layer currently exists; server route loaders and server actions are the established pattern | Do not add a speculative hook abstraction. Add mutation hooks only where a client panel needs standardized pending/error/invalidation behavior; hooks must never access Prisma or calculate payroll. |
| Components | Existing command center, contract/compensation/attendance/run/declaration/payment/register/setup/self-service workbenches | Expose staged approval history and authoritative actor separation. Disable actions from server-provided capabilities, not client role assumptions. |
| Routes | `/dashboard/payroll`, employees, contracts, compensation, attendance, runs, payslips, payments, declarations, register, setup | Add a payroll segment `loading.tsx` or equivalent route-level skeleton; preserve the existing segment error boundary, permission/no-org states, empty/error panels, redaction, and evidence links. |

## Workflow state machines

| Aggregate | Required transition path | Current assessment and repair |
| --- | --- | --- |
| Contract | `DRAFT -> ACTIVE -> SUSPENDED -> ENDED` | Enum and evidence workflows exist. Treat activation approval plus signed-document evidence as the activation transition; do not mutate ended history. |
| Attendance | `DRAFT -> FROZEN -> CORRECTED | SUPERSEDED` | Implemented with certified source hashes and correction linkage. Freeze and post-freeze correction remain fresh-auth, maker-checker transitions. |
| Payroll period | `OPEN -> INPUTS_LOCKED -> CALCULATED -> APPROVED -> POSTED -> PAID -> CLOSED` | The reference text lists paid before posted, but ledger-safe execution must post payroll liabilities before releasing payment. Ratify `POSTED -> PAID` as the allowed accounting-safe order and test it explicitly. |
| Payroll run | `DRAFT -> CALCULATED -> REVIEWED -> APPROVED -> EMITTED -> POSTED -> PAID -> ARCHIVED` | Current code can go directly from `CALCULATED` to `POSTED` and fills approval/emission/posting fields in one service. Add explicit persisted transitions and require the preceding state. |
| Correction run | `DRAFT -> CALCULATED -> REVIEWED -> APPROVED -> EMITTED -> POSTED -> ARCHIVED` | Delta calculation, reversal-shaped lines, original proof hashes, and correction-only behavior exist. Apply the same staged review/approval/event contract; never rewrite the original run or payslip. |
| Payment batch | `DRAFT -> APPROVED -> RELEASED -> PARTIALLY_SETTLED | SETTLED | FAILED` | Current release creates `DRAFT` and advances to `RELEASED` within one transaction. Persist and authorize request and approval separately, then release from stored `APPROVED` state. |
| Declaration | `PREPARED -> SUBMITTED -> ACCEPTED | REJECTED -> PAYMENT_DUE -> PAID -> RECONCILED -> ARCHIVED` | Lifecycle and evidence transitions exist. Preparation is a read model from posted liabilities; authority calls remain adapter-gated and production-disabled until certified. |

Recalculation is allowed only before review/approval. A post-emission change creates correction artifacts. No finalized artifact is regenerated from current employee state.

## Business event contract

Existing lowercase/dotted event types remain compatibility topics. The canonical event contract below must be registered and versioned; historical topics are not rewritten.

| Canonical event | Current implementation | Decision |
| --- | --- | --- |
| `EMPLOYEE_CONTRACT_ACTIVATED` | `hris.contract.activation.approved` plus active contract/evidence | Semantically close. Add/verify activation-effective evidence and canonical mapping; approval alone must not claim activation if the state change did not commit. |
| `ATTENDANCE_SIGNED` | `attendance.period.frozen` with snapshot hash and outbox | Accept as the canonical semantic mapping. |
| `ATTENDANCE_CORRECTED` | `attendance.period.corrected` | Present; retain reason, before/after diff, approver, original source hash, and correction linkage. |
| `LEAVE_APPROVED` | Audit and append-only leave-balance debit only | **Missing final business event/outbox.** Add it in the same transaction as the approved request and leave-balance entry. |
| `PAYROLL_RUN_CALCULATED` | `payroll.run.calculated` | Present with country-pack, calculation, readiness, attendance, and input hashes. |
| `PAYROLL_RUN_APPROVED` | No distinct final event | **Missing.** Emit only after a stored `REVIEWED -> APPROVED` transition with SoD evidence. |
| `PAYSLIP_EMITTED` | `payslips.emitted` notification nested under run-posted event | **Incomplete.** Persist a distinct business event for each payslip or a deterministic batch event with per-payslip hashes/numbers/archive references before posting. |
| `PAYROLL_POSTED` | `payroll.run.posted` | Present with posting batch, journal/source evidence, outbox, audit, and close invalidation. Restrict source state to approved/emitted. |
| `PAYROLL_PAYMENT_RELEASED` | `payroll.payment_batch.released` | Present and atomic with ledger/reconciliation evidence, but blocked until actor provenance and three-role SoD are repaired. |
| `PAYROLL_DECLARATION_PREPARED` | `payroll.declaration.prepared` | Present. Add fresh-auth at the action boundary and preserve fail-closed expert-review metadata. |

Every final event requires organization, authenticated actor, schema version, idempotency key, deterministic payload hash, source/document hash, source aggregate id, audit entry, and outbox messages. Event retries must compare the stored payload hash before returning an idempotent replay.

## RBAC and sensitive-action matrix

| Transition | Permission | Fresh auth | Required actor separation | Current result |
| --- | --- | --- | --- | --- |
| Contract activation/termination | `payroll.contracts.manage` / HRIS manage equivalent | Yes | requester != approver | Protected actions and evidence workflow present. |
| Salary change | request/approve/apply permissions | Yes | requester != approver; applier follows governed policy | Present and tested. |
| Payment destination change | request/approve/apply permissions | Yes | requester != approver; destination evidence must be approved | Present and tested. |
| Attendance certification/correction | `payroll.attendance.freeze` or scoped HRIS manage | Yes | source/preparer != certifier/correction approver | HRIS actions use fresh auth; frozen/correction evidence is present. |
| Payroll calculation | `payroll.runs.calculate` | Policy dependent | preparer becomes the SoD subject | Present and tenant-derived. |
| Payroll review | `payroll.runs.review` | Yes for final review | reviewer != preparer | Permission/read-model capability exists; mutation is missing. |
| Payroll approval | `payroll.runs.approve` | Yes | approver != preparer/reviewer according to approved policy | Current sensitive-action check separates preparer and approver, but review is not required. |
| Payslip emission | `payroll.payslips.emit` | Yes | emitter follows approved run and must not bypass approval | Permission exists; no independent action enforcement. |
| Payroll posting | `payroll.runs.post` | Yes | accountant/poster distinct from preparer and, where policy requires, approver | Permission exists; current approve action performs posting under approve permission. |
| Payment request | `payroll.payments.request` | Yes | authenticated requester persisted on `DRAFT` batch | Permission exists; no authoritative staged request action. |
| Payment approval | introduce/use explicit approve permission | Yes | approver != requester | Missing staged action/state transition. |
| Payment release | `payroll.payments.release` | Yes | releaser != requester and approver | **Critical gap:** requester is client-supplied and approver == releaser in the protected action. |
| Payment reconciliation | `payroll.payments.reconcile` | Yes | signer/reconciler follows reconciliation policy | Present with provider/statement evidence and exceptions. |
| Declaration preparation/submission | prepare/manage permissions | Yes | preparation and legally effective submission follow maker-checker policy | Lifecycle is present; preparation action currently omits fresh auth. |
| Register/payslip export | export/self-export permissions | Yes | own-record or policy scope | Present with fresh auth and redaction. |

All service reads and mutations must keep `organizationId` in the database predicate. Client-supplied `organizationId`, acting user ids, permissions, approval timestamps, or fresh-auth evidence are never authoritative.

## Typed error taxonomy

Continue returning safe `ApplicationError` results through protected actions. Normalize the following codes at the workflow boundary instead of relying on message parsing:

| Code | Meaning / operator action |
| --- | --- |
| `VALIDATION_FAILED` | Correct field-level input; no retry without change. |
| `APPROVAL_REQUIRED` | Complete the missing prior transition. |
| `SOD_VIOLATION` | Use a separately authenticated authorized actor; never accept an actor override. |
| `PERIOD_CLOSED` | Reopen under accounting policy or use a correction period. |
| `INVALID_ACCOUNT_MAP` | Configure active leaf-account tenant posting rules. |
| `REQUIRES_EXPERT_REVIEW` | Keep legal/authority automation inert pending signed country-pack review. |
| `MISSING_CONTRACT` | Activate a governed effective contract before readiness/calculation. |
| `ATTENDANCE_LOCKED` | Use the correction workflow; do not edit the frozen snapshot. |
| `PAYROLL_ALREADY_APPROVED` | Return matching idempotent replay or reject a divergent payload. |
| `PAYMENT_DESTINATION_UNAPPROVED` | Complete destination maker-checker evidence. |
| `RECONCILIATION_DRIFT` | Open/surface a payment exception and block material close. |
| `IDEMPOTENCY_CONFLICT` | Same key, different payload; reject before side effects. |
| `COUNTRY_PACK_UNSUPPORTED` | Disable calculation/filing/payment claims for the unsupported capability. |
| `PAYSLIP_IMMUTABLE` | Issue a correction payslip/run; do not overwrite. |

Add workflow-specific safe detail such as aggregate id, period, transition, and correlation id for operators. Do not expose salary, destination, document, authority credential, or raw provider payload data in errors.

## Notification and exception map

| Audience | Transactional notifications / queues |
| --- | --- |
| HR | duplicate/ghost identity signals, missing/expiring contract, destination change risk, leave/attendance anomalies. |
| Manager | time/leave request decision, correction request, overtime/absence review, freeze deadline. |
| Payroll | calculated run, readiness blockers, review/approval request, expert-review requirement, emitted payslips. |
| Employee | leave decision, payslip available, payment release/settlement status without sensitive destination detail. |
| Accountant | posting failure, invalid mapping, declaration liability drift, close invalidation/blocker. |
| Treasury/reconciliation | approved batch awaiting release, provider/statement evidence missing, partial/failed settlement, exception resolution. |
| Operator/SRE | idempotency conflict, outbox retry/dead letter, adapter failure, unsupported country pack, reconciliation drift. |

Severity contract: informational for committed expected transitions; warning/high for operator action and unreconciled evidence; critical for unbalanced/failed posting, SoD breach, cross-tenant attempt, unsupported production automation, or immutable-history violation.

## SYSCOHADA ledger design

Exact accounts are resolved from active tenant posting rules; only root shapes are architectural defaults:

- Payroll posting: debit salary expense `66x` and employer charges `664x`; credit employee payable `421x/422x`, social bodies `43x`, and tax/other withholding `44x`.
- Payroll payment: debit employee payable `421x/422x`; credit bank `52x`, cash/mobile-money `57x`, cheque/clearing `53x`, or a reviewed clearing mapping.
- Authority/social payment: debit `43x/44x` liabilities; credit treasury/provider clearing.

Posting invariants:

- debits equal credits before commit;
- the accounting period is open and the journal is appropriate;
- mapped accounts are active posting leaves;
- posting batch, journal, source link, run/payslip/declaration ids, document hashes, idempotency key, and event id remain linked;
- payslip/run totals tie to component register and liabilities;
- payment allocations tie to emitted payslip net payables and approved destination evidence;
- outbound payment transaction and exception are created with release, and settlement/reconciliation remains a downstream truth;
- material unreconciled payroll or declaration liabilities block close;
- any post-certification payroll source change invalidates the close certificate.

The current posting flow already uses one database transaction and has a focused failure test proving journal creation failure prevents payslip creation, run update, business event, and applied-event marking. Preserve this ordering and transaction boundary when splitting states.

## UI workbench architecture

| Surface | Current route/component | Required operational behavior |
| --- | --- | --- |
| Command center | `/dashboard/payroll`, `PayrollCommandCenter` / control workbench | Show as-of time, blockers, actions by permission, country-pack and provider state, degraded partial data, and source/evidence links. |
| Employee registry | `/employees`, `PayrollEmployeeSourceWorkbench` | Scoped identity status, duplicate/ghost flags, redacted salary/destination evidence, lifecycle actions. |
| Contracts | `/contracts`, `PayrollContractLifecycleWorkbench` | Effective history, document/approval evidence, activation/termination controls, immutable prior versions. |
| Compensation | `/compensation`, `PayrollCompensationWorkbench` | Effective assignments, salary request/approve/apply queue, proof and redaction. |
| Attendance/presence | `/attendance`, `PayrollPaymentAttendanceReadinessWorkbench` plus HRIS time surfaces | Calendar/time/leave readiness, anomaly queue, frozen state, correction path, employee/manager scope. |
| Runs | `/runs`, `PayrollRunWorkbench` and action panel | Explicit calculate, review, approve, emit, and post stages with actor/evidence history and idempotent retry. |
| Payslips | `/payslips`, `PayrollPayslipSelfService` | Own-record enforcement, immutable archive/hash, correction lineage, fresh-auth export. |
| Payments | `/payments`, reconciliation workbench and settlement forms | Persisted request/approval/release actors, destination proof, outbound transaction, exception, partial/settled status. |
| Declarations | `/declarations`, declaration workbench and authority panel | Liability tie-out, evidence lifecycle, sandbox/production capability, adapter queue/retry, response evidence. |
| Register | `/register`, `PayrollRegisterTieOut` | Run/payslip/ledger/declaration/payment totals and blocker visibility. |
| Setup | `/setup`, `PayrollSetupControlPlane` | Readiness, dry-run plan, evidence and proof backfill; no production activation by UI assertion. |

The route catalogue and access layer already render no-active-organization and permission-denied states, the payroll segment has an error boundary, and workbenches commonly include empty/error/redaction states. Complete the UI contract with a segment loading state, consistent stale/as-of and retry states, authenticated EN/FR keyboard/screen-reader evidence, and server-provided capability checks for every sensitive button.

## Repair order

1. **Payment SoD and actor provenance — completed 2026-08-20:** authenticated request, approval, and release transitions now operate over a persisted batch; protected actions derive each actor from the authenticated context; requester, approver, and releaser separation is enforced; release posting/reconciliation/outbox behavior remains atomic.
2. **Payroll staged transitions:** add review, approval, payslip emission, and posting services/actions; restrict allowed source states; enforce each permission and fresh-auth/SoD rule; retain idempotency and correction behavior.
3. **Final event completeness:** add leave-approved, run-approved, and payslip-emitted business events with audit and outbox messages in the same transactions; register canonical-to-compatibility topic mapping.
4. **Declaration and UI boundary hardening:** require fresh auth for declaration preparation; add payroll loading/degraded/as-of UI coverage and focused route/action tests.
5. **Gate ratchet:** extend `payroll:presence:gate` so it detects client-supplied decision actors, approval/release actor collapse, missing transition handlers, direct `CALCULATED -> POSTED`, missing required final events/outbox, and declaration preparation without fresh auth.
6. **Production evidence only after code repair:** close qualified country-pack review, authoritative employer/identity governance, production DB immutability, certified provider/authority flows, tenant-shaped migration, authenticated accessibility/browser, secrets, observability, DR, and release-governance gates.

The sibling engine skill owns steps 1-5. The architect stage made no production service or schema change; the immediately following engine slice completed step 1 without changing the database schema.

## Gate checklist

| Gate | Result | Interpretation |
| --- | --- | --- |
| 011 purchasing/AP consolidation | `PASS` 11/11 | Upstream internal boundary closed. |
| 012 payroll presence static gate | `PASS` 14/14 | Includes the staged payment request/approval/release SoD ratchet; the remaining semantic gaps below remain. |
| Prisma schema validation | `PASS` | Schema parses; not deployment proof. |
| Focused payment-boundary tests | `PASS` 8 suites / 88 tests | Authenticated actor derivation, request persistence, approval contention, all three actor-equality violations, tenant predicates, UI payloads, and release rollback pass. |
| TypeScript | `PASS` | Current dirty workspace typechecks. |
| Payments/declarations development | `PASS` 9/9 | Synthetic/development only. |
| Accounting-close development | `PASS` 10/10 | Synthetic/development only. |
| Migration/backfill development | `PASS` 11/11 | Dry-run only; mutation/owner signoff disabled. |
| Country-pack production | `BLOCKED` 11/12 | Missing `source_artifact_expert_approval`; runtime capability remains draft/source-checked. |
| Production DB immutability | `PASS_WITH_LIMITATIONS` | Isolated non-production PostgreSQL proof only. |
| Enterprise release | `BLOCKED` | Production activation is not authorized. |

Commands executed in this run:

```text
npm run payroll:presence:gate
  PASS: ready, 14/14, blockers 0

npm run prisma:validate
  PASS: schema valid

npm test -- --runTestsByPath \
  services/payroll/__tests__/payroll-control.service.test.ts \
  services/payroll/__tests__/payroll-completion.service.test.ts \
  services/payroll/__tests__/payroll-tenant-boundary.service.test.ts \
  actions/payroll/__tests__/payroll-control.actions.test.ts \
  services/controls/__tests__/sensitive-action.service.test.ts \
  lib/security/__tests__/rbac-permissions.test.ts --runInBand
  PASS: 6/6 suites, 108/108 tests

npm run typecheck
  PASS

npm test -- --runInBand <8 focused payment/payroll/control/gate suites>
  PASS: 8/8 suites, 88/88 tests
```

The first two sandboxed attempts to write the static gate's atomic temporary JSON file failed with Windows `EPERM`; the authorized rerun completed and refreshed the markdown/JSON artifacts. This was a filesystem execution issue, not a failed gate check.

## Blocking findings

| Severity | Finding | Required closure evidence |
| --- | --- | --- |
| Resolved (was Critical) | Payment requester/approver/releaser provenance and separation. | Closed by authenticated staged transitions, stored actor evidence, client-actor override rejection, conditional approval claim, serializable request/release transactions, and focused rollback/concurrency tests. |
| High | Run can skip `REVIEWED`; approval, payslip emission, and posting collapse under `payroll.runs.approve`. | Explicit transitions/actions, state guards, independent permissions/fresh auth/SoD, rollback/idempotency/concurrency tests. |
| High | Required `LEAVE_APPROVED`, `PAYROLL_RUN_APPROVED`, and final `PAYSLIP_EMITTED` business-event contracts are absent/incomplete. | Transactional event, audit, payload/source hashes, and outbox tests for each transition. |
| High | Declaration preparation is sensitive but its protected action does not request fresh auth. | Fresh-auth enforcement and action regression test. |
| High | Qualified country-pack expert approval and production authority binding are incomplete. | Independently verified signed review artifact; review preflight and production gate both fully ready. |
| High | Authoritative legal employer/tenant, employee identity/contract evidence, appointments, and production migration ownership remain unresolved. | Signed governed source packet, current tenant-shaped dry run, stable rerun, correction-only rollback, reconciliation, and owner/checker acceptance. |
| High | Provider/authority production credentials, callback trust, settlement/filing responses, operations, and production DB evidence are incomplete. | Certified sandbox flows, managed secrets, production-shaped immutability/migration evidence, monitoring/DR/incident evidence, and release signoff. |
| Medium | Payroll segment lacks a dedicated loading state and current production browser/accessibility proof is incomplete. | Loading/degraded/as-of/retry coverage and authenticated EN/FR keyboard/screen-reader/RBAC-negative evidence. |

## Stop conditions

Stop implementation or promotion on any of the following:

- cross-tenant read/write or a client-controlled tenant/actor/permission/fresh-auth field;
- payment release without authoritative persisted request/approval actors and required SoD;
- payroll approval without active contract, frozen certified attendance, deterministic input hashes, or reviewed country-pack provenance;
- direct calculated-to-posted transition or missing review/approval/emission evidence;
- mutable emitted payslip, finalized run, released batch, declaration payload, or correction history;
- unbalanced, unmapped, closed-period, or unlinked payroll posting;
- attendance correction that mutates the original snapshot/run instead of a correction chain;
- unreconciled material payroll payment or declaration/ledger/payslip drift at close;
- production calculation, payment, or declaration automation while the country-pack/provider/authority capability is draft, unsupported, or expert-review-only;
- missing authenticated browser, migration, secrets, observability, DR, or release-governance evidence.

## Residual risks and final disposition

The codebase has strong implementation depth and the current local verification is green. The payment boundary now has authoritative actor provenance and independent request, approval, and release states; the static gate and focused tests ratchet that behavior. The remaining high-severity findings concern staged payroll-run transitions, final event completeness, declaration fresh auth, and external production evidence.

Final disposition: **`REPAIR`; 012 is not `APPROVED_FOR_013`.** Synthetic or approved anonymized development may continue with all production, real-money, real-employee, legal filing, and authority effects disabled. Advance to 013 only after the remaining three internal architecture findings are repaired and their focused negative/concurrency/rollback gates pass, followed by closure of the external production evidence blockers.
