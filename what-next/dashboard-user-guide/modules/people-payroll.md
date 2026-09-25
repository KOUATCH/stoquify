# People, payroll and employee self-service

[Guide home](../README.md) · [Shared controls](../shared-controls.md) · [Detailed control notes](../control-notes.md) · [Metric dictionary](../metric-dictionary.md)

Evidence: source reviewed 2026-09-06. Dashboard interaction is blocked by sign-in. Instructions below describe implementation, not a completed live walkthrough.

People pages govern identity and change approvals; payroll pages assess source readiness and advance protected payroll stages. Several source workbenches are read-only. A calculated run is only one step toward issued payslips, payments, declarations and accounting evidence.

## Pages in this chapter

- [Attendance and payment readiness](#attendance-and-payment-readiness)
- [Compensation readiness](#compensation-readiness)
- [Payroll contract readiness](#payroll-contract-readiness)
- [Payroll declarations](#payroll-declarations)
- [Payroll employee sources](#payroll-employee-sources)
- [Payroll command center](#payroll-command-center)
- [Payroll payments and settlement evidence](#payroll-payments-and-settlement-evidence)
- [My payslips](#my-payslips)
- [Payroll register tie-out](#payroll-register-tie-out)
- [Payroll runs](#payroll-runs)
- [Payroll setup and proof controls](#payroll-setup-and-proof-controls)
- [People approvals](#people-approvals)
- [People movement history](#people-movement-history)
- [My employee workspace](#my-employee-workspace)
- [People directory](#people-directory)
- [Team workspace](#team-workspace)
- [Employee profile](#employee-profile)

## Attendance and payment readiness

**Open:** [/en/dashboard/payroll/attendance](http://localhost:3000/en/dashboard/payroll/attendance). **Reach it:** Attendance. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** payroll.payment_destination.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Attendance completeness and approved/pending/missing payment destinations, with blockers, redaction and proof controls.

**How to use it.**

1. Find the employee/period, read the blocker and inspect proof.
2. Resolve source requests/approvals and payment-destination evidence through their owning process before payroll advances.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Prevent rejected payments and incomplete time inputs at the end of the run.

**Limits and recovery.** An approved request is distinct from the frozen attendance snapshot consumed by payroll. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/attendance/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/payroll-route-data-access.ts:51>).

## Compensation readiness

**Open:** [/en/dashboard/payroll/compensation](http://localhost:3000/en/dashboard/payroll/compensation). **Reach it:** Compensation. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** payroll.compensation.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Rubrique catalogue, compensation assignments and salary-change queue with requested/approved and redacted states.

**How to use it.**

1. Inspect the relevant assignment and salary-change stage; complete a pending review/application through People approvals when available.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Avoid calculating from a proposed salary as though it were effective compensation.

**Limits and recovery.** The reviewed workbench reports source state; it does not expose a complete salary/assignment creation form. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/compensation/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/payroll-route-data-access.ts:68>).

## Payroll contract readiness

**Open:** [/en/dashboard/payroll/contracts](http://localhost:3000/en/dashboard/payroll/contracts). **Reach it:** Contracts. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** payroll.contracts.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Contracts and linked users with eligibility, status, evidence and redaction indicators.

**How to use it.**

1. Find the employee/contract, verify the effective period and evidence, then use the supported People approval/source process for outstanding changes.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Confirm the contract governing a payroll input before calculation.

**Limits and recovery.** The current screen is read-only; its lifecycle title does not imply full contract-authoring controls. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/contracts/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/payroll-route-data-access.ts:85>).

## Payroll declarations

**Open:** [/en/dashboard/payroll/declarations](http://localhost:3000/en/dashboard/payroll/declarations). **Reach it:** Declarations. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** payroll.command.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Prepared declaration rows, status, source-register proof, blockers, scope/redaction and adapter execution controls.

**How to use it.**

1. Inspect the declaration's locked-register source and readiness.
2. Use Queue adapter execution only when the supported adapter and required evidence are ready, then track later execution and response evidence.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Keep statutory preparation and delivery work tied to the same payroll source.

**Limits and recovery.** Queued execution is not authority acceptance. External credentials, adapter capability, country-pack review and response evidence may still block completion. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/declarations/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/payroll-route-data-access.ts:101>).

## Payroll employee sources

**Open:** [/en/dashboard/payroll/employees](http://localhost:3000/en/dashboard/payroll/employees). **Reach it:** Employees. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** payroll.employees.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Linked/unmapped users, active-contract and frozen-attendance readiness, candidates, orphan source rows and redactions.

**How to use it.**

1. Search the employee and inspect each readiness column.
2. Follow the linked People profile/source ownership to correct the named gap before calculating.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Stop missing identity links from becoming missing or duplicated pay.

**Limits and recovery.** This is a source/readiness workbench; no complete employee-creation form is exposed here. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/employees/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/payroll-route-data-access.ts:118>).

## Payroll command center

**Open:** [/en/dashboard/payroll](http://localhost:3000/en/dashboard/payroll). **Reach it:** Overview. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** payroll.command.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Run/payment/declaration/close readiness, action board, blockers, provider/authority health and specialist country-pack/pilot certification controls.

**How to use it.**

1. Start with current-period blockers and open the owning source workspace.
2. Use source employees, contracts, compensation and attendance to understand readiness; go to Runs for permitted transitions.
3. Specialist pack/pilot controls need reviewed references, versions, evidence and independent approvals.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Track one payroll period across preparation, approval, payment and proof without assuming a green summary completes all stages.

**Limits and recovery.** Evaluate pack, Record certificate, Approve certificate and pilot persistence create governance records; they do not confer legal certification by their presence in the UI. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/payroll-route-data-access.ts:28>).

## Payroll payments and settlement evidence

**Open:** [/en/dashboard/payroll/payments](http://localhost:3000/en/dashboard/payroll/payments). **Reach it:** Payments. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** payments.reconciliation.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Employee balance/recovery cases and payment-batch reconciliation proof. The page combines two workspaces.

**How to use it.**

1. For a genuine balance settlement, enter amount/date, responsible identity, evidence/document hashes, reference and notes in Record settlement.
2. For batch reconciliation, use Record settlement proof with the source register and supported provider/statement/match references, then inspect the returned state.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Connect released payroll amounts to traceable settlement evidence and distinguish partial from complete settlement.

**Limits and recovery.** These forms record protected evidence/state changes. They should not be described as an unrestricted bank-transfer initiation form; a manual reference is insufficient proof. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/payments/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/payroll-route-data-access.ts:150>).

## My payslips

**Open:** [/en/dashboard/payroll/payslips](http://localhost:3000/en/dashboard/payroll/payslips). **Reach it:** My Payslips. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** payroll.payslips.self.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Issued payslips available to the current employee, with permitted lines, proof and blockers.

**How to use it.**

1. Choose the intended period/document and inspect available proof.
2. If no payslip appears, check whether emission completed and your employee-user mapping is correct.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Give employees a consistent issued record without exposing other employees' compensation.

**Limits and recovery.** An approved run is not yet an issued payslip; self-service redaction and identity scope still apply. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/payslips/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/payroll-route-data-access.ts:134>).

## Payroll register tie-out

**Open:** [/en/dashboard/payroll/register](http://localhost:3000/en/dashboard/payroll/register). **Reach it:** Register. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** payroll.reports.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Run lines, employee counts, net payable, payslips, payment allocations and ledger/close evidence with hashes/source links.

**How to use it.**

1. Compare the register with issued payslips and payment/accounting proof; inspect missing links before accepting the reconciliation.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Detect an amount or employee-scope mismatch before close.

**Limits and recovery.** A hash identifies evidence; it does not by itself prove independent review or external settlement. The page is primarily an evidence/tie-out surface. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/register/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/payroll-route-data-access.ts:167>).

## Payroll runs

**Open:** [/en/dashboard/payroll/runs](http://localhost:3000/en/dashboard/payroll/runs). **Reach it:** Runs. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** payroll.command.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Runs with period, state, readiness/proof, accounting links and a service-provided list of next actions.

**How to use it.**

1. Open the eligible action drawer: calculation, review, approval, emission or posting.
2. Inspect required permission, Fresh auth, Maker-checker and source proof.
3. Supply the requested evidence/date inputs and confirm the action; verify the resulting run state.
4. Use separate declaration/payment drawers for those downstream stages.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Advance payroll through reviewable checkpoints instead of treating Calculate as completion.

**Limits and recovery.** Payment request, approval and release use separate actors where required. Release is a controlled batch transition, not proof the bank settled it; settlement evidence belongs in Payments. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/runs/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/payroll-route-data-access.ts:183>).

## Payroll setup and proof controls

**Open:** [/en/dashboard/payroll/setup](http://localhost:3000/en/dashboard/payroll/setup). **Reach it:** Setup. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** payroll.runs.calculate. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Payroll setup/readiness and specialist historical proof-backfill plans, dry-run results, certificates and approval/execution fields.

**How to use it.**

1. Review missing prerequisites with the payroll administrator.
2. For specialist backfill work, inspect the dry-run/certificate and independent approval evidence before the protected Persist certificate, Approve execution, Validate proof or Execute backfill actions.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Expose historical proof gaps before a payroll rollout or assurance review.

**Limits and recovery.** This is not a simple everyday payroll-preferences screen. Hashes, approval-token evidence and idempotency fields require the documented operational process; never invent values to clear a blocker. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/setup/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/payroll-route-data-access.ts:200>).

## People approvals

**Open:** [/en/dashboard/people/approvals](http://localhost:3000/en/dashboard/people/approvals). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** hris.people.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Lifecycle, contract, document, compensation, salary and payment-destination requests grouped by review/apply stage and readiness.

**How to use it.**

1. Filter All, Review or Apply and the relevant domain.
2. Open an item, inspect evidence, enter the decision reason and required evidence hash, then Approve, Reject or Apply as offered.
3. Verify the new stage and history.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Keep request, independent decision and application separate and traceable.

**Limits and recovery.** The requester cannot review their own request; the approver/requester may also be barred from applying it. A separate operator must finish application when the service requires it. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/people/approvals/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/people/people-route-data-access.ts:89>).

## People movement history

**Open:** [/en/dashboard/people/history](http://localhost:3000/en/dashboard/people/history). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** hris.people.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Recorded HR changes with domains, risk/proof filters and employee links.

**How to use it.**

1. Search/filter the movement and inspect supporting proof.
2. Open profile to compare the current employee state with the recorded change.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Explain who changed employment-related data and why a payroll input changed.

**Limits and recovery.** History is a review surface, not permission to overwrite prior records. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/people/history/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/people/people-route-data-access.ts:75>).

## My employee workspace

**Open:** [/en/dashboard/people/me](http://localhost:3000/en/dashboard/people/me). **Reach it:** My HR. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** hris.self_service.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Self-service employee information plus leave, overtime and attendance-correction requests and payslip navigation.

**How to use it.**

1. Choose the request type, enter required dates/minutes/reason and Submit request.
2. Check its returned/pending state; use Payslips for issued personal documents.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Provide the required time evidence early enough for manager review and payroll preparation.

**Limits and recovery.** Submitting a request is not approval or a frozen payroll input. Self-service does not expose all employees' pay. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/people/me/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/people/people-route-data-access.ts:61>).

## People directory

**Open:** [/en/dashboard/people](http://localhost:3000/en/dashboard/people). **Reach it:** People. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** hris.people.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Employee identity/readiness rows with search, sorting, date filters, pagination and links to profile, history and approvals.

**How to use it.**

1. Narrow to the intended employee or date range, read readiness/state and Open profile.
2. Use Approvals for governed changes and History to trace applied changes.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Resolve source-data gaps before they reach payroll.

**Limits and recovery.** The returned data is scoped and may be redacted. A directory count is not necessarily all employees in every location. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/people/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/people/people-route-data-access.ts:17>).

## Team workspace

**Open:** [/en/dashboard/people/team](http://localhost:3000/en/dashboard/people/team). **Reach it:** Workforce. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** hris.people.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Employees/requests within the manager's permitted responsibility and operational-time approval controls.

**How to use it.**

1. Inspect the scoped request and supporting dates/minutes/reason.
2. Approve or Reject only the intended item with required justification, then verify the resulting state.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Clear pending time requests before the payroll input cut-off.

**Limits and recovery.** Manager responsibility and separation rules still apply; being able to view a request does not guarantee the right to approve it. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/people/team/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/people/people-route-data-access.ts:47>).

## Employee profile

**Open:** `/en/dashboard/people/[employeeId]`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** hris.people.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** Employment identity, department/job/cost center/country/location/dates/user mapping and named readiness blockers.

**How to use it.**

1. Confirm the employee and responsibility scope.
2. Read blockers such as missing active contract, contract evidence, frozen attendance or payment-destination evidence.
3. Route each blocker to HR/payroll ownership; return to People for the next record.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Use a single profile to identify which upstream requirement prevents payroll readiness.

**Limits and recovery.** This profile is read-only. Location responsibility is expressly different from reporting-line authority; outside-scope profiles are denied, not empty. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/people/[employeeId]/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/people/people-route-data-access.ts:33>).

