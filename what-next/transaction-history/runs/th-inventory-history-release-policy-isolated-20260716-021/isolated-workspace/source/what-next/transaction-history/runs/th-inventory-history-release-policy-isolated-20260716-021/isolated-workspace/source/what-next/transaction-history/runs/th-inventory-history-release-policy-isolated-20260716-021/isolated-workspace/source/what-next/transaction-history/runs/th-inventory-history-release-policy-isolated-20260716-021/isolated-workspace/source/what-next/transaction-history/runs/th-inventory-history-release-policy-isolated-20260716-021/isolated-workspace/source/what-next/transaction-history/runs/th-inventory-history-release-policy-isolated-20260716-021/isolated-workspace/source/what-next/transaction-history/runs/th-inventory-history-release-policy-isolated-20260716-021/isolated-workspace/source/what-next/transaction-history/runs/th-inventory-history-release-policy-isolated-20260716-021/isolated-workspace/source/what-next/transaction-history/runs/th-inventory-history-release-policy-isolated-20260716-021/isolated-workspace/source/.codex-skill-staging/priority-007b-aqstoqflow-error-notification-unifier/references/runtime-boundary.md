# Runtime Boundary

Use this skill only for error handling and notification unification.

## May Edit

- `lib/error-handling/**/*`
- `services/_shared/action-errors.ts`
- `services/_shared/protect.ts`
- focused `actions/**/*`
- focused `app/api/**/*`
- focused tests and reports

## Must Not Edit

- unrelated UI redesigns
- unrelated Prisma schema or migrations
- generated files unless a verified command produces them
- historical evidence records through destructive changes
- statutory, tax, payroll, or certification claims without explicit project evidence

## Stop Conditions

Stop and save a blocker report when:

- a change requires a broad action-result contract migration across unknown UI callers;
- a boundary cannot derive trusted tenant or actor context;
- verification cannot isolate touched-slice behavior;
- the proposed change would hide authorization failures or fiscal/accounting blockers;
- the change would introduce retry behavior for non-idempotent economic writes.

## Gates

- Unknown internal exceptions become safe responses.
- Domain errors retain stable codes.
- Prisma errors are classified without leaking Prisma internals.
- RBAC and authentication errors map explicitly.
- Every boundary failure has a correlation/request ID.
- Logs redact secrets and keep operator details out of client payloads.
