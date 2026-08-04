# AqStoqFlow Accounting Control Center Event Outbox Pass

Date: 2026-08-01

Selected skill: `005-aqstoqflow-accounting-control-center`

## Scope

Implemented a narrow Accounting Control Center enhancement after the business event gateway work:

- Added read-only business event outbox health to the Accounting Control Center read model.
- Added an operational checklist row for the business event outbox.
- Classified failed/deferred outbox rows as warnings.
- Classified dead-lettered outbox rows as setup-lock blockers.
- Added a dashboard panel that shows open outbox messages, status counts, and the oldest open event name/time without exposing payloads or destinations.

No posting rules, journal writes, sales commits, receipt sends, tenant boundaries, RBAC checks, or module entitlement behavior were weakened or expanded.

## Files changed

- `services/accounting/control-center.service.ts`
- `services/accounting/__tests__/control-center.service.test.ts`
- `components/accounting/AccountingControlCenter.tsx`
- `components/accounting/__tests__/AccountingControlCenter.test.tsx`

## Gates passed

- `npm test -- --runInBand services/accounting/__tests__/control-center.service.test.ts components/accounting/__tests__/AccountingControlCenter.test.tsx`
  - Result: passed, 2 suites, 8 tests.
- `npm test -- --runInBand services/accounting/__tests__ components/accounting/__tests__`
  - Result: passed, 20 suites, 106 tests.
- `npm run typecheck`
  - Result: passed.
- `npx eslint services/accounting/control-center.service.ts services/accounting/__tests__/control-center.service.test.ts components/accounting/AccountingControlCenter.tsx components/accounting/__tests__/AccountingControlCenter.test.tsx --ext .ts,.tsx`
  - Result: passed.
- `npm run prisma:validate`
  - Result: passed.
- `git diff --check -- services/accounting/control-center.service.ts services/accounting/__tests__/control-center.service.test.ts components/accounting/AccountingControlCenter.tsx components/accounting/__tests__/AccountingControlCenter.test.tsx`
  - Result: passed with line-ending warnings only.

## Gates blocked

- `npm run policy:gates`
  - Result: blocked at `npm run inventory:boundary:fail`.
  - Cause: 66 active `UNKNOWN_STOCK_MUTATION` findings in generated `.next-dev` and `.next-slice410` server output.
  - This blocker is unrelated to the Accounting Control Center files touched in this pass.

## Verification result

The Accounting Control Center now reports the health of the business event outbox as operational evidence:

- Healthy queue: readiness stays `ready_to_lock`.
- Failed/deferred queue messages: readiness stays lockable but shows a warning.
- Dead-lettered queue messages: readiness becomes `blocked` and setup lock is disabled until reviewed.

## Next recommended skill

Next recommended numbered skill: `006-aqstoqflow-country-pack-factory`.
