# Aqstoqflow HR/Payroll Prompt 12 Command Center UX And Proof Drawer Report

Date: 2026-06-26

Source skill: `aqstoqflow-hrpayroll-12-command-center-ux`

Source prompt suite: `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`

## Decision

Prompt 12 is implemented for the payroll command center UX slice.

The payroll page now consumes the service-owned command read model from Prompt 11 and renders a role-aware command center with a command brief, readiness rail, blocker-first flow, action board, run review shell, finance state panels, freshness panel, and payroll-local proof drawer.

This slice deliberately does not add fake payroll subroutes, self-service, declaration automation, payment release UI, statutory formula expansion, or UI-derived payroll totals.

## Expert Lenses Applied

- Structural UI/UX design expert
- Workflow architect
- Security and privacy reviewer
- Payroll controls reviewer
- Accounting/finance controls reviewer

## Source Prerequisite IDs

- P2.03
- P2.04
- P2.05
- P2.06
- P0.20
- P0.34

## Files Inspected

- `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_11_COMMAND_READ_MODEL_REPORT_2026-06-26.md`
- `services/payroll/command-read-model.service.ts`
- `actions/payroll/payroll-command-read-model.actions.ts`
- `app/[locale]/(dashboard)/dashboard/payroll/page.tsx`
- `components/payroll/PayrollControlWorkbench.tsx`
- `components/evidence/ProofTrailDrawer.tsx`
- `components/ui/sheet.tsx`
- `config/sidebar.ts`
- `config/__tests__/sidebar.test.ts`

## Prerequisite Gate

Status: passed.

Evidence:

- Prompt 11 report handed off to Prompt 12 with no blockers.
- Command read-model service/action tests passed.
- Route existence smoke confirmed the command center can link only to existing implemented pages.
- Sidebar tests continue to block missing `/dashboard/presence`, `/dashboard/payroll/employees`, and `/dashboard/payroll/salary-list` links.

Prerequisite command:

`npm test -- --runTestsByPath services/payroll/__tests__/payroll-command-read-model.service.test.ts actions/payroll/__tests__/payroll-command-read-model.actions.test.ts --runInBand`

Result: 2 suites passed, 5 tests passed.

## Implemented

### Payroll Command Center Component

File: `components/payroll/PayrollCommandCenter.tsx`

Added a client-side render component that receives only the server-provided `PayrollCommandReadModel` and renders:

- Command brief
- Trusted count metrics from the read model
- Readiness rail
- Blocker-first flow
- Action board
- Line-level run review shell where payroll run data exists
- Payment, declaration, and close state panels
- Freshness panel
- Payroll-local proof drawer backed only by command read-model evidence fields

The component does not compute payroll totals, payment truth, attendance readiness, declaration readiness, posting state, close state, salary visibility, or module access in the browser.

### Payroll Route Recomposition

File: `app/[locale]/(dashboard)/dashboard/payroll/page.tsx`

Changed the route to:

- Require `payroll.command.read`
- Keep payroll module entitlement enforcement before rendering
- Call `getPayrollCommandReadModelAction({ limit: 25 })`
- Render `PayrollCommandCenter`
- Preserve safe route-state rendering for RBAC, no-active-org, and module-disabled states

### Sidebar Permission Alignment

Files:

- `config/sidebar.ts`
- `config/__tests__/sidebar.test.ts`

Updated the HR & Payroll sidebar entry from the legacy workbench permission to `payroll.command.read` and retained a single link to the implemented `/dashboard/payroll` page.

No missing payroll or presence subroutes were exposed.

### Command Action Contract Fix

Files:

- `actions/payroll/payroll-command-read-model.actions.ts`
- `actions/payroll/__tests__/payroll-command-read-model.actions.test.ts`

TypeScript caught that the server action forwarded `asOf` as a string. The action now coerces string/Date input to `Date` before calling the service-owned read model. The action test was updated accordingly.

## Security And Privacy Decisions

- UI preserves salary redaction and renders `[REDACTED:PAYROLL]` exactly as supplied by the service-owned read model.
- Proof drawer shows evidence hashes, statuses, and source pointers only.
- No raw salary, bank account, mobile money, or person-sensitive hidden values are introduced.
- Command route requires `payroll.command.read` and payroll module entitlement.
- Action links only point to existing routes; missing workflows render as blocked, not clickable.
- No client-side payroll truth or duplicated metric logic was added.

## Accounting And Finance Decisions

Finance-facing UI sections render service-provided:

- Payroll payment batch state
- Reconciliation exception pressure
- Declaration state
- Ledger blocker state
- Close assurance state
- Evidence hashes and freshness metadata

No payment release UI, statutory declaration automation, posting mutation, or close certification action was added.

## UI/UX Decisions

- The interface is compact and operational rather than decorative.
- Repeated command items use stable `min-height`, grid tracks, truncation, wrapping, and `break-words`/`break-all` on long evidence hashes.
- The action board keeps missing workflows visibly blocked.
- The proof drawer uses the existing sheet pattern but remains payroll-local because Prompt 11 already supplies the necessary evidence hashes.
- The sidebar remains single-entry for HR & Payroll until real subroutes exist.

## Tests And Validation

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-command-read-model.service.test.ts actions/payroll/__tests__/payroll-command-read-model.actions.test.ts components/payroll/__tests__/PayrollCommandCenter.test.tsx config/__tests__/sidebar.test.ts --runInBand`
  - 4 suites passed
  - 17 tests passed
- `npx eslint components/payroll/PayrollCommandCenter.tsx components/payroll/__tests__/PayrollCommandCenter.test.tsx 'app/[locale]/(dashboard)/dashboard/payroll/page.tsx' config/sidebar.ts config/__tests__/sidebar.test.ts actions/payroll/payroll-command-read-model.actions.ts services/payroll/command-read-model.service.ts`
- `npm run prisma:validate`
- `npm run typecheck`
- `npm run service:boundary:fail`
- `npm run policy:gates`
  - inventory boundary: passed
  - service boundary: passed
  - workflow assurance runtime table check: ready
  - payroll immutability runtime check: ready, 7/7 triggers present, 9/9 forbidden mutations blocked, 3/3 allowed lifecycle checks passed
  - hard-delete gate: passed
  - regulatory hardcode gate: passed
  - demo/report trust gate: passed
  - raw error boundary gate: passed
- `git diff --check -- <Prompt 12 touched files>`
  - Passed; Git reported a line-ending warning for `config/sidebar.ts`.
- Route smoke against the already-running dev server:
  - `http://localhost:3000/en/dashboard/payroll` returned `307`, which is the expected unauthenticated redirect and not a server error.
- Route existence smoke:
  - Existing and linkable: `/dashboard/payroll`, `/dashboard/finance/payments`, `/dashboard/finance/reconciliation`, `/dashboard/accounting/close`
  - Missing and not exposed: `/dashboard/presence`, `/dashboard/payroll/employees`

Skipped:

- `npm run prisma:generate` was not run because Prompt 12 made no Prisma schema changes.
- Browser screenshot visual verification was not run because the running local route redirects without an authenticated browser session; responsive/no-overlap risk was covered through stable layout constraints, component rendering tests, lint, and typecheck.

## Files Changed In This Slice

- `app/[locale]/(dashboard)/dashboard/payroll/page.tsx`
- `components/payroll/PayrollCommandCenter.tsx`
- `components/payroll/__tests__/PayrollCommandCenter.test.tsx`
- `config/sidebar.ts`
- `config/__tests__/sidebar.test.ts`
- `actions/payroll/payroll-command-read-model.actions.ts`
- `actions/payroll/__tests__/payroll-command-read-model.actions.test.ts`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_12_COMMAND_CENTER_UX_REPORT_2026-06-26.md`

## Single Source Of Truth Controls

Preserved:

- Services own HR/payroll business truth.
- Server actions expose protected workflows.
- Dashboard renders trusted server-provided command data.
- RBAC governs user capability.
- Module entitlement governs tenant/module access.
- No client-computed payroll truth was introduced.
- No duplicated payroll metrics were introduced.
- No dashboard-specific payroll shadow service was introduced.
- No one-off production workflow route was introduced.
- No decorative bloat or fake wizard was introduced.

## Risks Found Or Avoided

Avoided:

- Exposing missing payroll employee/presence subroutes in the sidebar.
- Making payment release appear available before later prerequisites.
- Recomputing blockers, readiness, payment truth, or redaction in UI.
- Linking command actions to missing workflow routes.
- Revealing hidden salary/person data in the proof drawer.

Remaining:

- The command center is gated by `payroll.command.read`; tenant roles/seeds must grant that permission where appropriate before broad rollout.
- Real browser visual verification should be repeated in an authenticated session.

## Blockers

No Prompt 12 blockers remain.

## Not Implemented In This Slice

- Payroll employee management route
- Presence route
- Payslip self-service
- Payment release UI
- Declaration automation
- Statutory country-pack expansion
- Payroll calculation changes
- New database schema

## Handoff

Prompt 13 may proceed.

Recommended next skill: `aqstoqflow-hrpayroll-13-country-pack-expansion`.

Prompt 13 should keep the new command center honest by feeding country-pack capability and statutory blocker states from service-owned, expert-reviewed sources only.