# AqStoqFlow HRIS/Payroll Self-Service

Date: 2026-07-19  
Skill: `aqstoqflow-hris-payroll-15-self-service`  
Status: **Independent self-service controls verified; overall production readiness remains blocked**  
Next handoff: `aqstoqflow-hris-payroll-16-browser-accessibility-release`

## Executive Decision

Employee, manager, and payslip self-service remain useful, scoped, redacted, auditable, and separate from payroll source truth. Focused verification passed without changing application code.

The user's instruction to proceed was accepted as program authorization to execute Skill 15. It was not treated as qualified Cameroon statutory approval because it did not contain the reviewer identity, professional capacity, effective dates, fixture-family decisions, or signed approval artifact required by the country-pack provenance gate.

Therefore:

- Skill 15 may advance independently;
- the self-service slice is ready for Skill 16 browser/accessibility verification;
- statutory, payment/declaration, accounting-close, and overall production certification remain blocked pending qualified signed approval.

## Scope Inspected

- `what-next/payroll/STOQUIFY_HRIS_EMPLOYEE_SELF_SERVICE_2026-07-15.md`
- `what-next/payroll/STOQUIFY_HRIS_MANAGER_SELF_SERVICE_2026-07-15.md`
- `services/hris/self-service.service.ts`
- `services/hris/manager-self-service.service.ts`
- `services/payroll/payslip-self-service.service.ts`
- `services/payroll/org-manager-scope.service.ts`
- `actions/payroll/payroll-payslip-self-service.actions.ts`
- `components/hris/HrisEmployeeSelfService.tsx`
- `components/hris/HrisManagerSelfService.tsx`
- `app/[locale]/(dashboard)/dashboard/people/me/page.tsx`
- `app/[locale]/(dashboard)/dashboard/people/team/page.tsx`
- `config/sidebar.ts`
- the ten focused service, action, component, route, scope, and navigation test suites
- available architecture graph evidence under `graphify-out/`

## Prerequisite Decision

The self-service prerequisites are present:

- employee identity resolves from authenticated organization/user context;
- manager scope uses server-owned organization/location scope;
- document, identifier, payment, and payroll fields remain redacted;
- input readiness is consumed from governed services;
- payslip proof access is own-record scoped and immutable;
- client state does not become approval or payroll truth.

The unresolved statutory source approval does not require self-service code to be disabled, but any country-pack proof shown through self-service must remain clearly incomplete and cannot be represented as production-certified.

## Controls Confirmed

### Employee own-data access

- The employee record is derived from authenticated tenant and user context.
- Client-supplied employee identifiers cannot select another employee.
- Internal employee/user/location IDs, source hashes, evidence hashes, salary values, identifiers, and payment details are excluded from the minimized read model.
- Own attendance and evidence-read activity remains auditable.

### Manager-scoped access

- Managers receive only current service-owned location responsibility scope.
- Location responsibility is not represented as a direct-report relationship.
- Out-of-scope employees and approvals are removed.
- Manager self-service excludes salary, tax/social identifiers, payment destinations, raw documents, document hashes, and approval source IDs.
- Approval authority remains server-owned and separate from client display state.

### Payslip access

- Payslip reads remain tenant- and authenticated-employee scoped.
- Cross-employee payslip access is denied.
- Exports require fresh authentication and emit watermarked immutable archive evidence.
- Missing country-pack provenance is surfaced rather than hidden.

### Routes and navigation

- `/dashboard/people/me` requires `hris.self_service.read`.
- `/dashboard/people/team` requires scoped HRIS people access.
- Route inputs derive organization, actor, locale, and permissions from authenticated server context.
- Denied, missing-mapping, duplicate-mapping, and missing-manager-scope states fail safely.
- Sidebar visibility remains permission filtered for `My HR` and `Workforce`.

## Data Ownership

- HRIS owns employee identity, employment facts, documents, attendance, and approval workflows.
- Payroll owns certified calculations and immutable payslip proof.
- Self-service reads minimized projections and submits only governed requests; it does not mutate payroll truth directly.
- Managers do not acquire payroll or HR approval authority from UI state.

## Tenant, RBAC, Audit, and Redaction

- Employee access is own-record and tenant-scoped.
- Manager access is tenant- and service-scope constrained.
- Payslip export retains permission and fresh-auth controls.
- Sensitive hashes, identifiers, destinations, documents, salaries, and source IDs remain excluded from unauthorized payloads and DOM output.
- Existing audit and business-event paths were preserved.
- No permission, route, or redaction policy was widened.

## Verification

Passed self-service core:

- HRIS employee self-service service
- HRIS manager self-service service
- payroll payslip self-service service
- payslip self-service actions
- employee self-service component
- manager self-service component
- employee `/people/me` route
- manager `/people/team` route
- organization/manager scope service

Result: **9 suites passed, 29 tests passed**.

Passed navigation contract:

- sidebar permission and route mapping

Result: **1 suite passed, 17 tests passed**.

Combined result: **10 suites passed, 46 tests passed**.

The existing relocated runtime and already-installed nested `@swc/helpers` were used. No dependency was installed or modified.

## Skipped Checks

- No authenticated browser session was available in this tranche.
- Responsive visual and automated accessibility checks are deferred to Skill 16.
- No live document download, provider, or authority integration was exercised.
- No full repository test, typecheck, or production release certification was claimed.

## Current Blockers

- Qualified signed Cameroon country-pack approval remains absent.
- Leave/accrual request ledgers and delegated leave approval remain outside the current self-service implementation.
- Profile and attendance correction-request ledgers remain unavailable.
- Raw document delivery requires controlled storage, scanning, signed access, retention, and access-event controls.
- Payment-destination UI still requires a governed server-issued evidence-upload workflow.
- Persisted/custom tenant roles still require permission rollout verification.
- Browser, responsive, accessibility, and negative-RBAC release evidence must be refreshed by Skill 16.

## Residual Risk

- Passing local tests does not certify live statutory, provider, authority, or production identity infrastructure.
- Current manager scope is location responsibility; historical/delegated reporting scope must not be inferred from it.
- The broad dirty worktree remains outside this tranche and was preserved.

## Handoff Decision

Proceed to `aqstoqflow-hris-payroll-16-browser-accessibility-release` for authenticated browser, responsive, accessibility, navigation, and negative-RBAC verification.

Do not mark the overall HRIS/payroll system production-ready until the qualified statutory approval is retained, the 12 → 13 → 14 chain is rerun, and Skill 16 release evidence passes.
