# AqStoqFlow HRIS Payroll Self-Service

Date: 2026-07-26  
Skill: `aqstoqflow-hris-payroll-15-self-service`  
Decision: **OPERATIONAL TIME SELF-SERVICE COMPLETED FOR DEVELOPMENT**

## Employee surface

- Employees can submit leave, overtime, and attendance-correction requests.
- Employee identity is derived from the authenticated HRIS mapping.
- Evidence and idempotency values are created for every request.
- Current request status and leave balances are visible without exposing sensitive identifiers.

## Manager surface

- Pending requests are limited to effective manager/delegated/tenant HRIS scope.
- Eligible managers can approve or reject.
- Requesters cannot decide their own requests.
- Approval actions require fresh authentication and evidence.

## Safety

- Client state never mutates certified attendance or Payroll facts.
- Approval decisions are executed by tenant-scoped domain services.
- Salary, tax/social identifiers, payment destinations, raw documents, and evidence hashes remain redacted.

## Verification

- Parent self-service component tests passed.
- Interactive request/approval panel tests passed.
- Service-level own-record and manager-scope tests passed.
- TypeScript and focused lint passed.

Country-pack production approval does not disable these development surfaces, but live/legal Payroll use remains prohibited until the independent production gate passes.
