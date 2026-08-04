# AqStoqFlow Skill 012 Operational Time-Management Completion

Date: 2026-07-26  
Selected skill: `012-aqstoqflow-payroll-presence-engine`  
Development decision: **READY**  
Production statutory decision: **SEPARATELY BLOCKED**

## Outcome

The missing operational layer upstream of the certified attendance snapshot is now implemented. Work schedules, calendars, holidays, leave policies, leave balances, leave/overtime/correction requests, import validation, anomaly queues, employee requests, manager approvals, and certified snapshot preparation use a single tenant-scoped HRIS control path.

## Files added

- `services/hris/operational-time.service.ts`
- `services/hris/leave-balance.service.ts`
- `actions/hris/operational-time.actions.ts`
- `actions/hris/leave-balance.actions.ts`
- `components/hris/HrisOperationalTimeRequestPanel.tsx`
- `components/hris/HrisOperationalTimeApprovalPanel.tsx`
- `services/hris/__tests__/operational-time.service.test.ts`
- `services/hris/__tests__/leave-balance.service.test.ts`
- `components/hris/__tests__/HrisOperationalTimePanels.test.tsx`
- `prisma/migrations/20260726213000_hris_operational_time_management/migration.sql`

## Files integrated

- `prisma/schema.prisma`
- `services/hris/self-service.service.ts`
- `services/hris/manager-self-service.service.ts`
- `components/hris/HrisEmployeeSelfService.tsx`
- `components/hris/HrisManagerSelfService.tsx`
- related self-service tests
- `scripts/payroll-presence-readiness-gate.js`
- `scripts/__tests__/payroll-presence-readiness-gate.test.js`

## Gates passed

- Operational persistence models and migration.
- Tenant scope and authenticated own-record derivation.
- Manager scope, fresh authentication, and segregation of duties.
- Append-only leave balance/accrual evidence.
- Import validation and anomaly queue.
- Approved operational records to certified attendance snapshot.
- Employee and manager self-service.
- Existing Payroll snapshot immutability and correction rules.
- Presence readiness: 12/12.
- Country-pack development readiness: 11/11.
- Prisma validation, TypeScript, focused lint, and diff hygiene.
- Current broad regression: 32 suites, 187 tests passed.

## Gates blocked

No internal Skill 012 development gate is blocked.

The independent production country-pack gate remains blocked only by:

- `source_artifact_hash_verification`
- `source_artifact_expert_approval`

These blockers prohibit live/legal Payroll effects but do not block this development tranche.

## Next numbered skill

Proceed to `013-aqstoqflow-data-trust-accountant-portal`.
