# Referral War Room Phase 3 Slice 33 Selection Report - 2026-07-28

Selected slice: POS cash-shortage owner/security approval evidence preflight  
Selected pillar skill: `stoquify-cash-leakage-radar` through `/stoquify-leakage-radar`  
Program control: `stoquify-referral-war-room-orchestrator`

## Decision

Slice 33 is selected to define a fail-closed approval evidence contract for the POS cash-shortage production activation preflight requirement `owner_security_approval`.

This slice may certify the shape of approval evidence through deterministic fixtures. It must not claim that live product/security approvals exist, must not set production activation markers, and must not enable the POS cash-shortage detector, worker, scheduler, alert dispatch, incident command invocation, dashboard, route, action, AI authority, or WhatsApp authority.

## Why This Slice

The production activation preflight already lists owner/security approval as a required condition. The previous Slice 32 observability runbook clarified what operators must watch and how stop conditions work. The next safe step is to make approval evidence machine-checkable while preserving the fact that real approvals are external operational evidence.

## Expected Files

- `services/leakage/pos-cash-shortage-owner-security-approval-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-owner-security-approval-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_OWNER_SECURITY_APPROVAL_PREFLIGHT_REPORT_2026-07-28.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Acceptance Criteria

- Valid product and security approval fixture can certify only when approvals are approved, current, distinct, release-bound, evidence-backed, and non-synthetic.
- Missing, expired, rejected, shared-actor, or synthetic approvals remain blocked.
- The composed production activation evidence can satisfy only `owner_security_approval` when certified, while keeping activation unauthorized.
- The current repository state remains honest: live owner/security approval evidence is absent and production activation remains blocked.
- No runtime detector, scheduler, worker, route, action, alert dispatch, incident command, rollback execution, AI, or WhatsApp behavior is added.

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-owner-security-approval-preflight.test.ts`
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-owner-security-approval-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `npm run typecheck`
- Focused ESLint for the touched TypeScript files.
- Source-only activation scan for forbidden runtime wiring terms.
- Scoped diff hygiene.