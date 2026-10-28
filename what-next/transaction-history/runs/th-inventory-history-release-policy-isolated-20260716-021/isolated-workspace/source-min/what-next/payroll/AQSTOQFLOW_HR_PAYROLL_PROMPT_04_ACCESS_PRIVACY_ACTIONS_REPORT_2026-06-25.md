# AqStoqFlow HR/Payroll Prompt 04 Access, Privacy, And Protected Actions Report

Generated: 2026-06-25

Skill executed: `aqstoqflow-hrpayroll-04-access-privacy-actions`

Prompt phase: Prompt 04, RBAC, Module Entitlement, Privacy, And Protected Actions.

Source prompt suite: `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`

## Decision

Prompt 04 passed for the current implemented payroll surface.

The current payroll route, protected server actions, and salary-bearing workbench read model now prove the required access/privacy boundary for the present slice: tenant scope and actor identity are derived server-side, payroll module entitlement is enforced before current payroll workflows run, salary-bearing projections are redacted and audited, and current critical payroll actions keep fresh-auth and maker-checker controls.

No production code was added for future HR source-data, payslip self-service, payroll register, declaration submission, or employee self-service routes. Those remain later prompts.

## Prerequisite Gate

| Gate | Status | Evidence |
| --- | --- | --- |
| Prompt 01 governance/source-of-truth passed | Passed | `docs/domains/hr-payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_0_INVENTORY_AND_OWNERSHIP_REPORT_2026-06-25.md` |
| Prompt 02 runtime immutability proof passed | Passed | `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_RUNTIME_IMMUTABILITY_PROOF_REPORT_2026-06-25.md` |
| Prompt 03 country-pack gate passed | Passed | `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_03_COUNTRY_PACK_GATE_REPORT_2026-06-25.md` |
| Current payroll route/action/read model exists | Passed | `/dashboard/payroll`, `actions/payroll/payroll-control.actions.ts`, `services/payroll/payroll-control.service.ts` |
| Payroll module catalog entry exists | Passed | `services/modules/module-catalog.service.ts` includes `payroll` |
| Salary redaction policy exists | Passed | `services/security/redaction-policy.service.ts` includes `payroll_person_amount` |

## Implementation Completed

1. Added optional module entitlement enforcement to the shared `protect` wrapper.
   - New `module` option calls `observeModuleAccess` with server-derived `ctx.orgId`, `ctx.userId`, and `ctx.permissions`.
   - Enforcement denies before the action handler runs when the tenant is not entitled to the module.
   - Wildcard RBAC no longer bypasses an enforced payroll module denial.

2. Opted current payroll protected actions into the payroll module gate.
   - `getPayrollWorkbenchAction`: payroll module, page surface, read intent.
   - `calculatePayrollRunAction`: payroll module, action surface, write intent.
   - `approveAndPostPayrollRunAction`: payroll module, action surface, write intent, fresh auth preserved.
   - `releasePayrollPaymentBatchAction`: payroll module, action surface, write intent, fresh auth preserved.
   - `preparePayrollDeclarationsAction`: payroll module, action surface, write intent.

3. Hardened the payroll page route boundary.
   - The server page now checks RBAC and payroll module entitlement before rendering the workbench.
   - Disabled payroll modules return a safe dashboard route state rather than loading payroll evidence.

4. Preserved server-owned tenant and actor derivation.
   - Payroll action inputs still overwrite caller-supplied `organizationId`, approver, preparer, and release actor fields from authenticated context.
   - No client-supplied tenant or actor identity is trusted.

5. Added read-model module-aware redaction support.
   - `getPayrollWorkbenchData` can consume a payroll module decision.
   - Salary-bearing amounts redact when the payroll module is unavailable, even when the actor has strong payroll permissions.
   - Payroll workbench salary reads continue to write audit evidence with redaction reason and returned record counts.

## Persona And RBAC Matrix For Current Surface

| Persona | Current capability | Required controls |
| --- | --- | --- |
| Payroll reader / HR manager | Open payroll workbench and see non-sensitive queues | `payroll.read`, active payroll module entitlement, tenant-bound route/action context |
| Salary-authorized payroll reader | See salary-bearing workbench amounts | `payroll.payslips.read` or `EMPLOYEE_SALARY_READ`, active payroll module entitlement, salary-read audit |
| Payroll processor | Calculate current payroll runs | `payroll.runs.calculate`, active payroll module entitlement, service-owned payroll calculation |
| Payroll approver / controller | Approve and post payroll run | `payroll.runs.approve`, active payroll module entitlement, fresh auth, not self-approving preparer-owned work |
| Payroll treasury releaser | Release payroll payment batch | `payroll.payments.release`, active payroll module entitlement, fresh auth, separate requester/approver/releaser control |
| Payroll compliance preparer | Prepare payroll declarations | `payroll.declarations.prepare`, active payroll module entitlement, country-pack provenance from Prompt 03 |
| Employee self-service | Not implemented in current slice | Must remain hidden until identity, employee scope, payslip archive, redaction, and export gates are implemented |

## Future Critical Action Classification

These actions must not be added as simple UI buttons or direct mutations in later prompts. Each needs service-owned workflows, protected server actions, module entitlement, RBAC, audit, and release-gated tests.

| Future action | Required controls before implementation |
| --- | --- |
| Salary change request/approval | Fresh auth, maker-checker, salary redaction, effective dating, immutable evidence, compensation approval permission |
| Employee payment destination change/approval | Fresh auth, maker-checker, approved destination evidence, redacted bank/payment details, no payment release without destination proof |
| Payslip archive/export | Fresh auth for exports, employee-scope enforcement, redaction/audit, immutable document hash, no cross-employee access |
| Payroll register/export | Salary permission, export watermark/audit, redaction, no client-computed totals, service-owned register tie-out |
| Statutory declaration submission | Expert-reviewed country-pack provenance, maker-checker, immutable payload hash, no unsupported legal claims |
| Payroll correction/reversal | Correction-only workflow, immutable finalized evidence, business event trail, ledger close invalidation |

## Files Changed In This Prompt 04 Slice

- `services/_shared/protect.ts`
- `services/_shared/__tests__/protect.test.ts`
- `actions/payroll/payroll-control.actions.ts`
- `actions/payroll/__tests__/payroll-control.actions.test.ts`
- `app/[locale]/(dashboard)/dashboard/payroll/page.tsx`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/__tests__/payroll-privacy.service.test.ts`

Some of these files already had uncommitted payroll/read-model work in the current worktree. This Prompt 04 slice only relied on the inspected current state and did not revert unrelated changes.

## Validation

| Command | Result |
| --- | --- |
| `npx jest services/_shared/__tests__/protect.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts services/payroll/__tests__/payroll-privacy.service.test.ts services/payroll/__tests__/payroll-tenant-boundary.service.test.ts services/security/__tests__/redaction-policy.service.test.ts config/__tests__/sidebar.test.ts services/modules/__tests__/module-entitlement.service.test.ts --runInBand` | Passed: 7 suites, 42 tests |
| Same focused Jest command after final cleanup | Passed: 7 suites, 42 tests |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed with 5 pre-existing warnings, 0 errors |
| `npm run policy:gates` | Passed; active findings 0 across configured gates |
| Fixed-string marker checks for touched files | Passed; no literal PowerShell newline markers remained |

Known lint warnings observed:

- `components/auth/EmailVerificationForm.tsx`: existing hook dependency warning.
- `components/dashboard/items/ModernItemFormForEditing.tsx`: existing `img` warning.
- `components/frontend/custom-carousel.tsx`: existing `img` warning.
- `components/ui/groups/inventory/ItemManagement.tsx`: existing `img` warning.
- `config/permissions.ts`: existing anonymous default export warning.

## Single-Source-Of-Truth Review

| Principle | Result |
| --- | --- |
| Services own business truth | Preserved. Payroll calculations/read models remain in `services/payroll`. |
| Server actions expose protected workflows | Strengthened. Payroll actions now enforce RBAC plus module entitlement before service calls. |
| Dashboards render trusted server-provided data | Preserved. The payroll page does not compute payroll truth. |
| RBAC governs capability | Preserved. Permission checks still come from `lib/security/rbac`. |
| Module entitlement governs tenant/module access | Strengthened. Payroll route/actions now enforce payroll entitlement for current surfaces. |
| No client-computed payroll truth | Preserved. No client payroll computation was introduced. |
| No duplicated payroll metrics | Preserved. Existing workbench read model remains the source for displayed counts/queues. |
| No dashboard-specific shadow services | Preserved. No shadow service was introduced. |
| No speculative UI routes | Preserved. Sidebar remains limited to the implemented payroll workbench. |
| No salary/person-data exposure without permission, audit, and redaction | Strengthened. Module-denied and permission-denied workbench amounts redact and are audited. |

## Blockers

No Prompt 04 blocker remains for the current implemented payroll surface.

Deferred items are not blockers for this phase, but they must gate later prompts:

- Employee self-service must wait for employee identity scope, payslip archive, redaction, and export controls.
- Salary change workflows must wait for compensation source-data and maker-checker implementation.
- Payment destination workflows must wait for destination evidence approval controls.
- Declaration submission must wait for expert-reviewed country-pack and authority adapter provenance.

## Handoff

Prompt 04 hands off safely to Prompt 05: `aqstoqflow-hrpayroll-05-accounting-close-gate`.

Prompt 05 should verify payroll ledger posting, close invalidation, accounting period controls, and source-link tie-out without adding UI-first payroll expansion.
