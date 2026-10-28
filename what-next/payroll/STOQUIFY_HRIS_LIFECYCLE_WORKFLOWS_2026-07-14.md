# Stoquify HRIS Lifecycle Workflows

Date: 2026-07-14

Skill: `stoquify-hris-05-lifecycle-workflows`

Status: IMPLEMENTED AND FOCUSED-GATE GREEN

Next handoff: `stoquify-hris-06-org-position-manager-scope`

## Executive Result

Stoquify now has a payroll-grade HRIS employee lifecycle service for onboarding, transfer, promotion, suspension, reinstatement, termination, offboarding, and rehire.

Lifecycle changes are no longer permitted as ordinary status edits on existing employee profiles. They must pass through a tenant-scoped, fresh-authenticated request, independent approval or rejection, and approved application workflow.

The implementation uses the existing append-only `BusinessEvent` gateway as event authority and a strict `PayrollEmployee.metadata.hrisLifecycle` projection as the current-workflow read model. No Prisma schema migration was required.

## Implemented Surface

### Lifecycle authority

Added `services/hris/lifecycle.service.ts` with:

- `requestHrisEmployeeLifecycle`
- `approveHrisEmployeeLifecycle`
- `rejectHrisEmployeeLifecycle`
- `applyApprovedHrisEmployeeLifecycle`
- `getHrisEmployeeLifecycleTimeline`
- strict parsing of the lifecycle metadata projection
- tenant-scoped employee and event queries
- auditable request, approval, rejection, application, and timeline-read actions

Supported transitions:

| Workflow | Allowed source | Target |
| --- | --- | --- |
| ONBOARD | DRAFT | ACTIVE |
| TRANSFER | ACTIVE | ACTIVE |
| PROMOTION | ACTIVE | ACTIVE |
| SUSPEND | ACTIVE | SUSPENDED |
| REINSTATE | SUSPENDED | ACTIVE |
| TERMINATE | ACTIVE or SUSPENDED | TERMINATED |
| OFFBOARD | TERMINATED | ARCHIVED |
| REHIRE | TERMINATED or ARCHIVED | ACTIVE |

### Policy and security gates

Added `actions/hris/lifecycle.actions.ts` with:

- `hris.people.read` on lifecycle timeline reads
- `hris.people.manage` on lifecycle mutations
- fresh authentication on every mutation
- organization, actor, and permission context derived from the authenticated server context
- revalidation of People, payroll employee, and payroll command-center views

Service-level enforcement remains in place behind the actions:

- requesters cannot approve their own request
- requesters cannot apply their own request
- approval evidence is mandatory
- reasons and decision reasons are persisted only as SHA-256 hashes
- evidence is stored and emitted only as references/hashes
- employee state is rechecked before approval and application
- invalid transitions fail before an event or employee mutation is emitted

### Starter and leaver controls

ONBOARD and REHIRE application require:

- an active contract covering the effective date
- signed contract evidence
- an activated contract business event
- a verified payment-destination hash

TERMINATE application:

- ends current active/suspended contracts at the day before termination
- cancels draft and future contracts
- ends current and future payroll rubrique assignments without creating inverted effective dates
- sets the employee termination date and status atomically with lifecycle evidence

All lifecycle applications refuse to proceed when a payroll run line or frozen attendance snapshot overlaps the requested effective date. The operator must use the existing attendance/payroll correction workflow first.

### Payroll input readiness

Added `PAYROLL_INPUT_LIFECYCLE_PENDING` to the payroll input readiness verdict.

Before loading active employees, payroll calculation now:

1. Reads tenant-scoped lifecycle request, approval, rejection, and application events.
2. Reconstructs open requests from the append-only event history.
3. Ignores requests closed by rejection or application, independent of timestamp ties.
4. Blocks requests effective on or before the payroll period end.
5. Fails closed when a requested event has an invalid or missing effective date.

This catches pending starters even when they are still DRAFT and pending leavers before their status changes.

The employee HRIS/payroll readiness view also exposes `LIFECYCLE_REQUEST_PENDING` from the strict current projection.

### Direct-edit bypass closed

`upsertPayrollEmployeeSourceProfile` now rejects an explicit status change for an existing employee with:

`Existing employee status changes require the HRIS lifecycle workflow.`

Ordinary profile edits that omit `status` preserve the existing status rather than applying the input schema's DRAFT default.

## Verification Evidence

Passed:

- `node .\node_modules\jest\bin\jest.js --runInBand services/hris/__tests__/lifecycle.service.test.ts actions/hris/__tests__/lifecycle.actions.test.ts services/payroll/__tests__/payroll-employee.service.test.ts services/payroll/__tests__/payroll-control.service.test.ts`
  - 4 suites passed
  - 59 tests passed
- focused ESLint across the eight lifecycle/payroll implementation and test files
- `node .\node_modules\typescript\bin\tsc --noEmit --pretty false --incremental false`
- scoped `git diff --check` for the modified tracked payroll files
- trailing-whitespace scan for all four new lifecycle files

The repository-wide `git diff --check` still reports trailing whitespace in the unrelated existing file `docs/missing/needed.md` at lines 2, 10, 18, and 20. This slice did not modify that file.

The generic graph artifacts in `graphify-out/` did not contain current HRIS lifecycle nodes, so the live Prisma, service, action, and test sources were treated as authoritative.

## Files In This Slice

New:

- `services/hris/lifecycle.service.ts`
- `services/hris/__tests__/lifecycle.service.test.ts`
- `actions/hris/lifecycle.actions.ts`
- `actions/hris/__tests__/lifecycle.actions.test.ts`
- `what-next/payroll/STOQUIFY_HRIS_LIFECYCLE_WORKFLOWS_2026-07-14.md`

Modified:

- `services/payroll/employee.service.ts`
- `services/payroll/__tests__/payroll-employee.service.test.ts`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`

## Commit Readiness

Behavior and focused gates are ready to land.

The four modified tracked payroll files are currently `MM`: they contained staged work before this lifecycle slice and now also contain unstaged lifecycle changes. Do not use `git add -A` for a lifecycle-only commit. Review and stage explicit files or hunks, or intentionally land the accumulated HRIS stack as one commit.

The working tree also contains many unrelated staged and untracked HRIS/payroll artifacts. They were not reverted, reformatted, or claimed by this slice.

## Deliberate Limits

- The metadata object is a current-state projection, not event authority. The `BusinessEvent` history remains authoritative.
- One open lifecycle request per employee is supported. Concurrent request orchestration can move to a dedicated schema model when workflow volume proves the need.
- The service/action foundation is complete, but the proposal's visual action queue and lifecycle timeline UI are not part of this backend control slice.
- Manager-scoped lifecycle visibility is not widened here. The current `hris.people.read` boundary remains tenant-wide until the next org/position/manager-scope skill establishes effective manager authority.
- No browser validation was required because this slice adds no rendered UI.

## Final Decision

READY TO LAND after deliberate staging.

Proceed next with `stoquify-hris-06-org-position-manager-scope` so manager authority, effective organizational placement, and manager-scoped lifecycle reads are established before adding the lifecycle action-queue UI.
