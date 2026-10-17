# Cameroon HRIS lifecycle and product UX evidence

Date: 2026-10-07. Scope: source audit and proposed roadmap for the confirmed first-release segment, Cameroon private-sector SMEs with 10–250 employees. This document changes no application behavior. It is a supporting evidence note for the consolidated Cameroon HRIS/payroll plan; legal applicability and payroll rule conclusions belong to that plan and its authoritative sources.

## Decision

Retain the substantial HRIS implementation and finish its operating journeys. Do not start a second employee master, replace the payroll kernel, or treat the July architecture gap list as current truth. Prioritize complete employee visibility, correct time certification, effective-date behavior, scoped authority and atomic evidence before cosmetic redesign or additional countries.

The 10–250 employee segment is a user decision. Retail, wholesale, hardware and pharmacy examples in go-to-market material are prospect hypotheses, not evidence of actual customers. Employer sector, collective agreement, work patterns, location count, existing data quality and staff access remain pilot discovery inputs. Do not silently infer these from company size.

## Evidence and limitations

- Read repository workflow, skill routing, design master, existing UI constitution/component registry, applicable HRIS skill guidance, July architecture/roadmap and August trust-spine execution evidence. Inspected current source after graph discovery.
- Relevant graph nodes: components `hris_hrisapprovalinbox_tsx` (community 55), `hris_hrisemployeeselfservice_tsx` (80), `hris_hrismanagerselfservice_tsx` (114); actions `hris_approval_inbox_actions_ts` (41), `hris_compensation_actions_ts` (20); app People page (134), approvals (135), history (136), payroll employees (219). These are discovery anchors, not current behavior or coverage proof.
- Executed `npm run agent:workflow:check`: passed; reported 198 scripts outside the reviewed manifest; no selected application/database commands executed. Existing command definition and registry were inspected first.
- Executed focused UI/UX Pro Max searches with `python -B`, without persistence. `error summary validation --domain ux -n 1` returned **Focusable Error Summary**, a relevant forms/accessibility recommendation. Dialog searches returned general focus/AAA focus-appearance advice, not a verified dialog-mechanics match; reject them as evidence for dialog trap behavior. React pagination searches returned no matches; use current source and normal server pagination acceptance criteria instead.
- Current design master records Next 15.5.18, React 19.2.6 and Tailwind 3.4.19. Recheck installed versions before API-specific implementation. UI/UX Pro Max's installed release version remains unknown; no inferred version or generic replacement theme is used.
- Source review is not runtime proof. No current HRIS unit/component suite, real PostgreSQL test, rendered/browser check, production data query, migration, seed or external provider operation was executed in this workstream. Historical passing suites and August disposable-database proof remain historical evidence only.
- Line anchors below refer to the inspected working tree, which contains substantial pre-existing edits. They are not a clean committed-release certification.

## Existing capabilities: retain and complete

| Lifecycle area | Current evidence | Disposition |
|---|---|---|
| Employee identity | `services/hris/employee.service.ts:27` declares HRIS ownership and compatibility storage in `PayrollEmployee`; own profile resolves from server actor at `:155`. `prisma/schema.prisma:2734` has employee identity, organization-scoped unique keys and masked/hash fields. | Retain one logical master; finish writer and user-link integrity inventory. A table rename is not the first-release objective. |
| Organization and manager scope | `prisma/schema.prisma:2818,2849,2884,2922,2967` define org units, positions, assignments, reporting relationships and delegation. `services/hris/org.service.ts:154` resolves effective authority. | Retain models/resolver; confirm maintenance writers and build the smallest missing admin journey. July claims that these models are absent are stale. |
| Contract/lifecycle | `services/hris/lifecycle.service.ts:31` defines onboarding, transfer, promotion, suspension, reinstatement, termination, offboarding and rehire; `:571` guards conflict with certified payroll; `:631` closes leaver contract/rubrique periods. Contract services and action tests exist. | Retain approval and frozen-history guards; improve future-date application, projections and operator UI. |
| Compensation and payment destination | Existing HRIS compensation/payment-destination services and approval inbox provide separate review/evidence boundaries. | Retain; complete ergonomic request/review and ensure every physical writer follows the same authority and snapshot invalidation contract. |
| Documents | `services/hris/document-evidence.service.ts:360` checks tenant/scope and evidence metadata; `:397` explicitly denies raw download. | Retain safe metadata/redaction; original-document delivery and retention execution require a bounded secure-storage design. Do not display a download action as working. |
| Time/leave | `prisma/schema.prisma:3349,3420,3473,3510,3537` contain calendar, policy, request, import batch and time-entry models. `services/hris/operational-time.service.ts:213` creates foundation; `:365` assigns schedules; `:692` imports time; `:825` builds certification. | Retain the pipeline; fix correctness/atomicity gaps and finish HR operator screens before calling it operationally complete. |
| Self-service | `services/hris/self-service.service.ts` resolves linked own record, masked destination and scoped payslips; `:81` original documents and `:171` profile correction are explicitly not configured. | Retain own-record access; add correction requests, not direct edits to approved truth. |
| Migration/import | `services/hris/migration-backfill-pilot.service.ts` implements dry-run readiness and signoff; `mutationModeAvailable: false` is explicit. Operational time import exists separately. | Keep dry-run checks; do not describe them as an employee-import implementation. Specify reviewed preview/commit/replay/rollback for the pilot dataset. |

## Source-traced priorities

### HR-01 — Employee visibility is incomplete above 50 records (P0)

`app/[locale]/(dashboard)/dashboard/people/page.tsx:37` supplies `limit: 50`. `services/payroll/employee.service.ts:512` applies `take: parsed.limit`; `:578` reports `totalEmployees: records.length`. `components/hris/HrisEmployeeDirectoryTable.tsx:30` passes the already limited array to `useHrPayrollTable`; `components/hr-payroll/HrPayrollTableControls.tsx:63,100,102` filter/count/slice in memory. Search and pagination therefore cannot reach the omitted employees, and summary labels do not establish a full-organization total. The service's limit is capped at 100, so merely increasing the route limit does not satisfy 250 employees.

Deliver server-side authorized pagination and search with explicit scoped total/page metadata, stable ordering and filter-preserving links. Acceptance: 51, 100 and 250-record fixtures, an employee on the last page findable by search, truthful totals, empty/filtered-empty/error states, and cross-tenant/location/manager isolation. Inspect manager read models too: `services/hris/manager-self-service.service.ts:57` builds allowed IDs from the capped directory before filtering approvals at `:99`.

### HR-02 — Approved attendance correction does not change certification (P0)

`services/hris/operational-time.service.ts:47–48,517–518` accepts and stores proposed worked/absence minutes. The decision path at `:537` approves request status but only the leave branch applies a ledger effect. Certification at `:931–959` filters approved leave/overtime and reduces original imported time entries; no consumer of the proposed correction values was found beyond storage. It then sets `sourceRevision: 1` at `:971` and `correctionCount: 0` at `:1002`. `components/hris/HrisOperationalTimeRequestPanel.tsx` also does not submit the proposed correction values.

Deliver an explicit correction-to-revision flow with previewed before/after minutes, independent approval, deterministic replay and invalidation of affected readiness. Never mutate a certified snapshot or paid run. Acceptance: import → correction request → approval → revised source certification → expected payroll-input change; denial/duplicate/changed-payload cases; a frozen-period correction enters the approved adjustment path. Test how approved overtime authorizes imported overtime, avoiding either unapproved inclusion or double counting.

Certification selects overlapping leave requests and sums their full requested minutes. This is a source-indicated cross-period attribution risk, not a proven production incident. Add a request spanning two periods and verify schedule-aware allocation without double attribution. Review leave-type/policy selection when multiple active policies exist rather than using one latest country policy as a universal employee policy.

### HR-03 — Leave balance check/write/audit is not atomic (P0)

`services/hris/leave-balance.service.ts:46` defaults to the shared database client. It reads the balance at `:97`, creates an entry at `:112`, then writes audit at `:127`; the action calls this default path without a wrapping transaction. Concurrent distinct negative postings can both pass the same balance check, and an audit failure can follow an already committed entry. This is a source-traced concurrency/partial-write risk requiring PostgreSQL proof.

Deliver transactionally coupled ledger/audit writes with an appropriate per-employee/policy concurrency strategy, conflict retry and immutable correction entries. Include transaction boundary ownership when a caller already supplies a transaction. Acceptance: two simultaneous debits cannot overspend; failed audit leaves no entry; same-key replay returns the original; changed payload conflicts. Separately test concurrent approved leave requests: the operational request transaction uses the default transaction helper, and same-request compare-and-set alone does not prove different requests cannot overspend.

### HR-04 — Future lifecycle dates do not defer current-state mutation (P0)

`services/hris/lifecycle.service.ts:705` reads the approved effective date, but the apply path sets `status: pending.targetStatus` immediately at `:731`; hire/termination dates and legacy department/location/job-title projections follow at `:735–746`. No due-date comparison was found in that apply path. Existing frozen-payroll safeguards must be preserved.

Choose and document one effective-date contract: scheduled application with an idempotent due transition, or consistent as-of projections. Approval today must not silently suspend/terminate an employee whose change starts next month. Acceptance includes future, today and backdated changes, denied historical conflicts, replay, competing transitions and rehire. Reconcile employment assignments, reporting/delegation periods, compensation/contracts and offboarding access policy. No session-revocation or assignment update was found in this service; confirm ownership and downstream execution before claiming full offboarding. This audit does not assert an observed access bypass.

### HR-05 — Authority and displayed capability disagree (P1, security-sensitive)

`services/hris/org.service.ts:214,274` reads and resolves reporting/delegated authority; explicit as-of resolution fails closed without durable authority at `:310`. The manager read model nevertheless returns `REPORTING_LINE_AUTHORITY_NOT_MODELED` at `services/hris/manager-self-service.service.ts:160`, and `components/hris/HrisManagerSelfService.tsx:217` displays a static “Not modeled.” The adjacent operational status should not certify incomplete correction behavior.

Derive capability from actual period, employee, operation and authority evidence. Existing operational decisions require broad `hris.people.manage`; the scope resolver treats that permission as tenant-wide HR administration (`org.service.ts:182`). Do not grant it to line managers to make buttons work. Design a narrow delegated decision permission plus server-side employee/effective-date scope, expiry and separation-of-duties checks. Acceptance includes manager own request, outside-team employee, expired delegation, revoked access and HR administrator cases.

### HR-06 — Service actions are ahead of operating UI (P1)

Targeted searches across `app/` and `components/` found no callers of `upsertHrisEmployeeProfileAction`, `requestHrisEmployeeLifecycleAction`, `createTimeFoundationAction`, `assignWorkScheduleAction` or `importOperationalTimeAction`; these exist in `actions/hris/employee.actions.ts:127`, `lifecycle.actions.ts:91` and `operational-time.actions.ts:194–206`. Treat this as a scoped caller-search result, not proof that no alternative route exists anywhere.

Build bounded People setup/profile edit/lifecycle request and Time setup/import/review journeys on those existing controls. Search and inventory any alternative writers first. `actions/payroll/payroll-employee.actions.ts:8,91` already routes through HRIS, so the July “payroll owns all writes” claim is outdated. `actions/payroll/payroll-contract.actions.ts:6,114` still calls the physical payroll contract writer; complete that boundary inventory. The employee user link is a nullable scalar without a User relation; add orphan/duplicate-link checks before choosing a schema migration.

No non-test `hrisOrgUnit`, `hrisPosition`, assignment or relationship create/update/upsert writer was found in the audited application service/action paths. Schema and read authority are present; confirm seeds/migrations/integration writers, then add only missing maintenance behavior. Do not invent a replacement organization graph.

### HR-07 — Localized and accessible decisions need a shared contract (P1)

People/approval/time surfaces contain English labels and capability codes even when locale-based routes are used. `components/payroll/PayrollEmployeeSourceWorkbench.tsx:50` formats dates with hard-coded `"en"`. Locale-aware links alone do not provide a French workflow.

`components/hris/HrisApprovalInbox.tsx:339` implements a custom `role="dialog"`/`aria-modal` container; the inspected component has no keyboard/focus-trap/return-focus implementation. Replace it with the existing shared Dialog behavior and verify it in the browser. At `:380`, the user is asked for an “Approval evidence hash.” Prefer selecting a retained evidence record or uploading through an approved evidence workflow; the system derives provenance/hash, while the server keeps its integrity checks. Do not weaken evidence validation to improve copy.

The operational request panel selects the first available leave-policy ID without an explicit policy choice/label and uses raw minutes. Show applicable policy, units and schedule-aware duration preview; retain authoritative server calculation. Add translated error summaries linked to invalid fields, inline constraints and non-color state cues. Confirm keyboard focus, Escape/return, long French text, narrow-screen reflow, loading/empty/error/denied/stale-session and uncertain-mutation outcomes. No rendered accessibility result is claimed by this audit.

### HR-08 — Policy data exists without demonstrated accrual execution (P1/P2)

Operational foundation accepts `accrualRule` and `carryOverLimitMinutes`; targeted non-test service searches found storage references but no executing accrual/carry-over evaluator. The leave ledger supports opening/accrual/carry-over/manual/correction entry types. For the first pilot, either implement the reviewed required policy behavior with dated source evidence and tests, or explicitly provide reviewed manual ledger postings with reconciliation and a visible limitation. Do not present configured JSON as an operating entitlement engine.

Time import can retain valid entries while marking a batch rejected if any row fails. Specify accepted/rejected counts and whether the UI represents partial acceptance. Add preview, source identity, exact replay and changed-payload tests; a unique-key constraint alone is not a friendly replay contract.

## Role journeys and minimum useful screens

| Role | Journey | Truth, privacy and recovery |
|---|---|---|
| Owner / general manager | Employer setup → readiness overview → independent approval → payroll funding/payment status → unresolved obligations | Show period and employer applicability; distinguish prepared, approved, sent, acknowledged and reconciled. Avoid displaying full personal data in summary widgets. Never infer production support from a country-pack header. |
| HR administrator | Complete People directory → onboard/import preview → identity/contract/assignment → dated changes → document metadata → offboarding checklist/history | Explain missing fields and next owner; preserve one employee master and effective dates. Original documents remain unavailable until storage/access controls exist. Rejected import rows remain reviewable without duplicating accepted identities. |
| Line manager | Scoped team → request/attendance exceptions → delegated decision → history | Only relevant employees and fields; show authority source/expiry where useful. A manager cannot approve their own request or obtain tenant-wide HR access as a shortcut. |
| Payroll officer / accountant | Period checklist → source exceptions → certified attendance/compensation snapshot → calculation review → independent approval → payment/declaration/ledger proof | Show revision, source dates, country-rule applicability and blocking reasons. Correct source or create an authorized adjustment; never edit frozen source to make totals pass. |
| Employee | Linked own profile → leave/overtime/correction request → status/history → payslip → correction request | Own-record access, masked payment fields, explicit units, accessible EN/FR copy. Requests do not directly rewrite approved HR/payroll truth. Fresh-auth/export/privacy rules remain authoritative. |
| Auditor / reviewer | Scoped read-only chain from employee event to snapshot/run/payment/declaration/accounting | Redacted evidence and provenance with bounded export; no action enabled from an evidence-only role. Distinguish unavailable evidence from a failed or zero value. |

Keep the initial information architecture small: People; Time and leave; Approvals; Payroll period; Employee self-service. Use existing routes and primitives where possible. Profile tabs can group identity/employment, contracts/pay, time/leave, documents and history without creating disconnected employee records. A separate all-purpose HR dashboard or new theme is not required for the first release.

## Proposed delivery slices

Estimates below are planning ranges in engineering days for an experienced contributor with reviewer access; they exclude unresolved legal interpretation, external providers, recruitment, data cleanup and release waiting time. Validate after the first reproduction slice rather than treating them as a commitment.

| Order | Slice | Indicative effort | Exit evidence |
|---|---|---:|---|
| 0 | Reconcile status register, writer inventory and actual employer policy matrix; author HRIS page contract | 2–4 | Named owners, source-linked retained/gap inventory, scenario list, confirmed pilot data boundary; no greenfield rewrite |
| 1 | HR-01 server directory and truthful scoped summaries | 2–4 | 51/100/250 fixtures; scoped search/paging; role/EN/FR browser evidence |
| 2 | HR-02 correction/certification and cross-period allocation | 4–8 | Deterministic revision/replay fixtures plus real database and frozen-period proof |
| 3 | HR-03 atomic leave ledger and concurrent request consumption | 2–4 | Disposable PostgreSQL concurrency, rollback/audit failure and idempotency evidence |
| 4 | HR-04 lifecycle effective-date behavior and offboarding projections | 4–7 | Due/backdated/future/rehire tests; access ownership and frozen-history acceptance |
| 5 | HR-05 narrow manager permissions and capability projection | 3–5 | Scoped allow/deny/revocation/SoD tests; UI mirrors server capability |
| 6 | HR-06 bounded People/Time setup and import UX; HR-07 shared EN/FR accessible decisions | 6–10 | Realistic onboarding/import/leave/correction/offboarding browser journeys and failure recovery |
| 7 | Pilot-required policy automation, safe document/correction self-service and reconciled import | 4–8 | Domain-reviewed fixture pack, privacy/storage evidence and pilot rehearsal; defer nonessential extras explicitly |

Slices 1–4 repair product truth and should precede a broad visual refresh. Payroll-country-rule and statutory/provider gates from the consolidated plan are separate prerequisites for real pay runs. A prototype that passes these HRIS checks alone is not a Cameroon payroll release authorization.

## Persistent ECC and UI/UX operating plan

1. Keep repository workflow and command registry as the Codex entry point. Use qualified ECC search-first for each slice, a small implementation plan, security review for actions/authority/documents, and verification-loop only through inspected current commands. Missing external hooks or unavailable skills are recorded, not assumed.
2. Keep `design-system/stoquify/MASTER.md` as the retrieval adapter. Propose a scoped `pages/hris-payroll.md` contract after design/domain review, linking current primitives and tokens. Preserve blue identity and gold/chestnut variants; no generated replacement master or palette. Record employer/period context, capability states, units, privacy, approval evidence and EN/FR behavior in the contract.
3. Use focused UI/UX Pro Max searches only to answer a real design question; record returned category/version applicability and reject irrelevant results. For this audit the useful result is focusable error summary. Existing shared Dialog plus actual browser checks supplies dialog evidence; search absence for pagination is not a blocker to fixing server completeness.
4. Reuse the HRIS/payroll skill chain as a task router, not an instruction to regenerate every July deliverable or run all scripts. Current source supersedes stale gap descriptions. One slice owns one small acceptance matrix and the touched writer/read-model/UI boundary.
5. For each slice record source commit/local diff, invariants, mocked tests, real PostgreSQL tests, browser evidence by role/locale/viewport, domain review and remaining limitations separately. Update the realization register only from that evidence. Historical green reports cannot close new changes.
6. Add only meaningful regression cases to an inspected test lane: directory completeness; correction consumption; leave concurrency; future lifecycle; delegated denial; localized accessible approval. Larger browser/DB lanes require reviewed disposable targets. No migration-bearing build as a routine audit check.

## Recommended first implementation prompt

> Fix HR-01 only: make the existing People directory complete and truthful for authorized Cameroon SME workspaces containing up to 250 employees. Follow AGENTS, WORKFLOW, command registry and design master. Inspect the current directory source, manager scope and table callers before editing. Preserve unrelated changes, tenant/privacy guards and the single HRIS employee master. Implement server-authorized search/pagination with stable ordering, explicit scoped total/page metadata and filter-preserving locale-aware navigation; do not merely raise a hard limit. Define the smallest necessary route/service/table changes and tests. Verify 51/100/250 records, last-page search, filtered-empty state and cross-tenant/location/manager denial. Reuse current UI primitives and EN/FR conventions. Inspect commands before running them; no migrations, seeds, production data or migration-bearing build. Report source inspection, mocked unit tests, real database tests and rendered/browser checks separately, and leave unexecuted classes explicitly unverified. Update the scoped evidence register only after checks. Do not change payroll formulas, lifecycle semantics, installed skills or global tokens in this slice.

