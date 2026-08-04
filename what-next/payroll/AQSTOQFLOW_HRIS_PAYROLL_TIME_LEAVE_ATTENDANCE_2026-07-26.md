# AqStoqFlow HRIS Payroll Time, Leave, and Attendance

Date: 2026-07-26  
Skill: `aqstoqflow-hris-payroll-08-time-leave-attendance`  
Decision: **READY FOR DEVELOPMENT AND SANDBOX USE**

## Scope completed

- Tenant-owned, versioned work calendars and public holidays.
- Employee work schedules with preparation and independent approval.
- Versioned leave policies and an append-only balance/accrual ledger.
- Leave, overtime, and attendance-correction requests.
- Maker-checker decisions with effective manager scope and self-approval denial.
- Time import batches, validated entries, and actionable anomaly records.
- Operational record aggregation into the existing certified HRIS attendance manifest.
- Frozen Payroll attendance remains the only Payroll-consumable time truth.

## Data ownership

- HRIS owns schedules, calendars, holidays, policies, balances, requests, time entries, anomalies, approvals, and evidence.
- Payroll receives only the approved, frozen certification.
- Final Payroll facts remain immutable; retroactive changes continue through correction lineage.

## Tenant, access, audit, and redaction

- Every persistence model and query is organization-scoped.
- Employee requests derive the employee from the authenticated user.
- Manager decisions use effective HRIS scope and fresh authentication.
- Requester self-approval and schedule/policy self-approval fail closed.
- Audit records store hashes and decision facts without raw reasons or imported payloads.

## Verification

- Operational service, leave-balance, and UI tests passed.
- Broader current HRIS/payroll/actions/components bundle: 32 suites, 187 tests passed.
- Prisma schema validation passed.
- TypeScript typecheck passed.
- Focused lint and migration destructive-SQL scan passed.
- `payroll:presence:gate`: 12/12 ready.

## Residual risk

- The new migration must be deployed through the normal controlled Prisma migration process.
- External clock-provider adapters and jurisdiction-specific accrual formulas remain adapter/policy configuration work; no unreviewed statutory formula was embedded.
- Country-pack production approval remains a separate release workstream.

The historical handoff to input readiness is already implemented in this repository. This completed tranche can therefore rejoin the numbered program at Skill 013.
