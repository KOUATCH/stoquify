# Stoquify HRIS Employee Self-Service

Date: 2026-07-15  
Skill: `stoquify-hris-14-employee-self-service`  
Next handoff: `stoquify-hris-15-manager-self-service`

## Executive Decision

The controlled employee self-service foundation is ready for review and commit. Stoquify now has a dedicated own-record permission boundary, a server-resolved employee self-service read model, an authenticated `/dashboard/people/me` route, redacted profile/document/payment/attendance status, and reuse of the existing own-payslip route.

This is not a claim that employee self-service is complete. Leave requests, profile and attendance correction requests, raw document access, and the payment-destination request form remain deliberately unavailable because their operational ledgers or evidence-upload controls do not yet exist.

## Implemented

### Dedicated Policy Gates

- Added `hris.self_service.read` as a low-risk, own-record read permission.
- Added `hris.self_service.request` as a high-risk self-service request permission.
- Kept `hris.people.read` and `hris.people.manage` separate and elevated.
- Added both new permissions to the canonical role catalog, legacy role templates, permission groups, risk classification, and sidebar filtering.
- Added `payroll.payslips.self.read` to the canonical staff, cashier, and viewer role defaults so the existing own-payslip route is usable without a broad payroll grant.

### Own-Record Resolution

- Own profile reads resolve `PayrollEmployee.userId` from the authenticated actor and active organization.
- Client-supplied employee, actor, tenant, and user identifiers cannot select another record.
- The HRIS facade delegates the compatibility `hris.people.read` permission only after the own-record guard has passed; the general employee directory API is not widened.
- Own payment destination reads use the dedicated read gate; own destination requests use the dedicated request gate and retain fresh-auth protection.
- Added an own-attendance reader that queries only the authenticated user's tenant employee record and writes a count-only audit event.

### Minimized Read Model

`services/hris/self-service.service.ts` composes only own-record services and emits a purpose-built projection. It excludes:

- Internal employee, user, location, request, snapshot, and correction identifiers.
- Raw or hashed tax, social, document, account, mobile-money, and payment-destination values.
- Source hashes, evidence hashes, actor identifiers, approval reasons, and salary amounts.
- Raw documents or signed object URLs.

The model exposes only employment status, safe employment facts, evidence presence/counts, latest certified attendance totals, masked payment destination status, and capability flags.

### Employee Route and UI

- Added `/[locale]/dashboard/people/me` behind `hris.self_service.read`.
- Added `My HR` to the HR and Payroll sidebar group.
- Added safe states for denied access, no employee mapping, and duplicate employee mappings.
- Linked to the existing `/dashboard/payroll/payslips` self-service route when the user has `payroll.payslips.self.read`.
- Rendered controlled unavailable states instead of inventing leave, correction, document-download, or payment-evidence workflows.

## Security Evidence

| Control | Result | Evidence |
| --- | --- | --- |
| Tenant and employee ownership | PASS | Own profile, payment, and attendance readers derive organization and user from the authenticated context |
| Client-selected employee blocked | PASS | Focused tests submit another employee identifier and prove it is ignored |
| DOM redaction | PASS | Component test proves raw account, document proof, actor, and other employee values are absent |
| Payload minimization | PASS | Service test proves internal IDs, hashes, user IDs, employee IDs, and source hashes are omitted |
| Payment request fresh auth | PASS | Existing HRIS payment action tests retain `freshAuth: true` before the request service runs |
| Payslip ownership | PASS | Existing payslip service tests retain authenticated employee and organization filters |
| Payslip export fresh auth | PASS | Existing action tests retain the critical export permission and fresh-auth requirement |
| Permission separation | PASS | Self-service grants do not satisfy `hris.people.read`; HRIS people grants remain high/critical |
| Read audit | PASS | Employee source, payment readiness, and own-attendance reads write tenant/actor-scoped audit evidence |

## Verification

Focused Jest command covered the new slice, existing HRIS ownership guards, permission catalogs, sidebar wiring, and established payslip self-service:

```text
Test Suites: 14 passed, 14 total
Tests:       86 passed, 86 total
Snapshots:   0 total
```

TypeScript:

```text
npm run typecheck
PASS (tsc --noEmit --pretty false)
```

Focused ESLint:

```text
0 errors
1 existing warning: config/permissions.ts anonymous default export
```

The new route also has a focused server-page smoke test covering the permission gate, session-derived context, localized payslip link, missing mapping, duplicate mapping, and denied state.

A local HTTP probe against the already-running development server returned 307 to /en/login?callbackUrl=%2Fen%2Fdashboard%2Fpeople%2Fme, confirming that the route resolves and remains behind authentication middleware.

## Deliberate Blockers

1. Leave self-service is not operational. Leave policies, accrual ledgers, balances, requests, schedules, holiday calendars, delegated approvals, and statutory rule models are still missing.
2. Profile and attendance correction request ledgers do not exist. The UI must not create unauditable pseudo-requests.
3. Raw HR document access is not ready. Object storage, encryption, quarantine, malware scanning, signed access, retention, legal hold, and access-event controls remain required.
4. The payment destination request service exists and is fresh-auth protected, but a professional employee form still needs a server-issued evidence attachment/upload workflow. Employees must not be asked to type document hashes.
5. Persisted/custom roles need an explicit permission backfill and rollout check before production activation. Updating code catalogs does not prove every existing tenant role has the intended new grants.
6. Production must configure `PAYROLL_PAYMENT_DESTINATION_HASH_SECRET` with the required strength before payment destination requests can execute.
7. Authenticated browser, responsive, and accessibility evidence for `/dashboard/people/me` has not been captured in this slice. That remains a later browser-release gate.

## Ready to Land

- Dedicated self-service read/request permission taxonomy and risk ratings.
- Canonical and legacy role-template wiring.
- Own profile, payment, and attendance service gates.
- Minimized HRIS employee self-service projection.
- Employee self-service route, sidebar entry, redacted UI, and safe error states.
- Focused ownership, redaction, route, permission, payslip, fresh-auth, typecheck, and lint evidence.

## Not Ready to Claim

- Full employee self-service completion.
- Operational leave or correction workflows.
- Raw HR document access.
- Browser-certified production readiness.
- Complete HRIS/payroll production readiness.

## Next Handoff

Proceed to `stoquify-hris-15-manager-self-service` using only the proven manager/location responsibility boundary. Do not represent location responsibility as direct-report authority, and do not expose salary, identifiers, payment destinations, raw documents, or invented leave/correction tasks.
