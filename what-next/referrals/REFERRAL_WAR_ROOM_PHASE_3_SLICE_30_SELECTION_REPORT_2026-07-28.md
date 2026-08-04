# Referral War Room Phase 3 Slice 30 Selection Report - 2026-07-28

## Selected Slice

Phase 3 / Slice 30 is selected as the POS cash-shortage alert delivery integration preflight.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_INCIDENT_COMMAND_INTEGRATION_PREFLIGHT_REPORT_2026-07-28.md`
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/assurance/assurance-incident.service.ts`
- `services/assurance/assurance-alert-delivery.service.ts`
- `services/assurance/assurance-alert-recovery.service.ts`
- `services/assurance/assurance-incident-contracts.ts`
- `prisma/schema.prisma`
- `docs/referrals/stoquify-referral-worthy-war-plan-report.md`
- `docs/referrals/stoquify-referral-worthy-execution-roadmap.md`
- `docs/referrals/referral-worthy-platform-features-report.md`

## Selection Rationale

The production activation preflight still lists `alert_delivery_integration` as unresolved. The platform already has generic Workflow Assurance alert-delivery surfaces: in-app incident alert recording, a durable `WorkflowAssuranceAlertDelivery` model, webhook queueing, delivery dispatch, retry/dead-letter behavior, and dead-letter recovery. What is missing is a narrow read-only preflight that certifies those surfaces as sufficient representation for the POS cash-shortage production activation checklist.

This slice is safe because it only inspects existing source contracts and composes activation evidence. It does not register a POS cash-shortage runner, send alerts, start a dispatcher, add notification UI, or mark production activation ready.

## In Scope

- Add a read-only alert delivery integration preflight.
- Require durable alert delivery schema evidence: incident relation, channel/status, dedupe key, retry/dead-letter fields, unique key, and status/channel indexes.
- Require generic incident alert recording evidence: in-app alert upsert, dedupe key, safe alert message, action route, and `alert_recorded` incident event.
- Require webhook queue evidence: exported queue function, incident source lookup, webhook channel, dedupe key, pending status, action route, and source-hash metadata.
- Require dispatch evidence: transport readiness check, lease/lock recovery, bounded limit, fetch dispatch, delivered status, retry scheduling, and dead-letter terminal status.
- Require recovery evidence: exported recovery command, active tenant operator validation, idempotency hash, terminal dead-letter guard, recovery delivery creation, event history, and audit history.
- Compose `alertDeliveryIntegrationCertified` only when the full preflight certifies and always keep `activationAuthorized: false`.
- Prove the production activation preflight can satisfy only `alert_delivery_integration` while remaining blocked by other requirements.

## Out Of Scope

- No alert dispatch execution.
- No scheduler, worker, cron, queue consumer, route, action, dashboard, notification surface, AI, or WhatsApp behavior.
- No POS-specific incident creation or alert invocation.
- No production activation marker change.

## Expected Files

- `services/leakage/pos-cash-shortage-alert-delivery-integration-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-alert-delivery-integration-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_ALERT_DELIVERY_INTEGRATION_PREFLIGHT_REPORT_2026-07-28.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-alert-delivery-integration-preflight.test.ts services/assurance/__tests__/assurance-alert-delivery.service.test.ts services/assurance/__tests__/assurance-alert-recovery.service.test.ts services/assurance/__tests__/assurance-incident.service.test.ts services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `npm run typecheck`
- `npx eslint services/leakage/pos-cash-shortage-alert-delivery-integration-preflight.ts services/leakage/__tests__/pos-cash-shortage-alert-delivery-integration-preflight.test.ts`
- Source-only activation scan over the new preflight source.
- Broad activation scan over POS cash-shortage surfaces.
- Scoped diff hygiene over touched files.

## Handoff

Run Slice 30 under `stoquify-cash-leakage-radar` guardrails. Return to war-room review after certification. No Slice 31 is preselected.
