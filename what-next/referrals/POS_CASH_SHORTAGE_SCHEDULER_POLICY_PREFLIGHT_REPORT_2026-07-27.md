# POS Cash-Shortage Scheduler-Policy Preflight Report

Date: 2026-07-27
Slice: Phase 3 / Slice 24
Skill: `stoquify-referral-war-room-orchestrator`

## Outcome

Certified complete within the selected scheduler-policy preflight scope.

Stoquify now has a read-only POS cash-shortage scheduler-policy preflight contract. It proves the future POS cash-shortage scheduler policy can be represented as a scheduled, non-hot-path, tenant-scoped, source-hash-backed plan while still refusing to authorize activation.

## Before

- Slice 23 listed `scheduler_policy` as one remaining production activation preflight requirement.
- The shared Workflow Assurance scheduler service already exposed scheduler mode policies and schedule plans, but the POS cash-shortage activation path did not have a POS-specific scheduler-policy certification contract.

## After

- `services/leakage/pos-cash-shortage-scheduler-policy-preflight.ts` evaluates the POS cash-shortage definition, a scheduler plan, and the scheduled-scan mode policy.
- The preflight certifies only policy shape: scheduled scan mode, scheduled run type, non-hot-path execution, tenant-scoped cursoring, source-hash requirement, organization/source cursor fields, release-ready plan entry, and disabled activation hold.
- The current disabled POS cash-shortage definition evaluates as `certified` for scheduler policy while returning `activationAuthorized: false`.
- Unsafe drift, including missing fixture evidence, hot-path policy, non-tenant cursor policy, missing source hash, or already-enabled definition state, evaluates as `blocked`.

## Verification

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-scheduler-policy-preflight.test.ts`
  - Passed: 1 suite / 5 tests.
- Related focused tests:
  - `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-scheduler-policy-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts services/assurance/__tests__/assurance-scheduler.service.test.ts`
  - Passed: 3 suites / 12 tests.
- `npm run typecheck`
  - Passed.
- Focused ESLint:
  - `npx eslint services/leakage/pos-cash-shortage-scheduler-policy-preflight.ts services/leakage/__tests__/pos-cash-shortage-scheduler-policy-preflight.test.ts`
  - Passed.
- Static activation scan:
  - Finds only the new scheduler-policy preflight and existing release-gate metadata ratchet.
  - No app route, action, config, Prisma, scheduler job, worker execution, incident command, UI, AI, or WhatsApp activation surface was introduced.
- New-service side-effect scan:
  - No `CHECK_RUNNERS`, scheduler API, cron, worker lease identifiers, safe action, incident mutation command, Prisma, or database calls.
- Scoped `git diff --check`
  - Passed.
  - Warning only: `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` CRLF normalization.

## Remaining Blockers

- This slice certifies only scheduler-policy shape. It does not authorize detector execution, incident command invocation, worker activation, scheduling, notifications, routes, actions, dashboards, inventory-loss behavior, AI, or WhatsApp behavior.
- Production activation remains blocked until every preflight requirement has authoritative implementation evidence, including service/release activation markers, worker checkpoint persistence, incident command integration, alert delivery, rollback, observability, owner/security approval, and release certification.

## Next Handoff

Return to `stoquify-referral-war-room-orchestrator` through `/stoquify-referral-war-room` to review Slice 24 evidence and select at most one next narrow slice. No Slice 25 is preselected.
