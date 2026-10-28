# Referral War Room Phase 3 Slice 34 Selection Report - 2026-07-28

Selected slice: POS cash-shortage service/release activation marker evidence preflight  
Selected pillar skill: `stoquify-cash-leakage-radar` through `/stoquify-leakage-radar`  
Program control: `stoquify-referral-war-room-orchestrator`

## Decision

Slice 34 is selected to define a fail-closed evidence contract for the POS cash-shortage production activation preflight requirements `service_activation_marker` and `release_gate_activation_marker`.

This slice may validate marker evidence through deterministic fixtures and prove how those marker booleans are composed. It must not set `metadata.productionActivationCertified: true` in the live definition, must not enable the definition, and must not authorize detector execution, worker activation, scheduling, notifications, incident command invocation, rollback execution, product UI, AI authority, or WhatsApp authority.

## Why This Slice

Slices 21 and 22 added service-contract and release-gate ratchets around the shared `productionActivationCertified` marker. The production activation preflight still accepts marker booleans without a POS-specific evidence contract. The next safe step is to define what those marker booleans mean and keep the live repository honest: current activation markers remain absent.

## Expected Files

- `services/leakage/pos-cash-shortage-activation-marker-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-activation-marker-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_ACTIVATION_MARKER_PREFLIGHT_REPORT_2026-07-28.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Acceptance Criteria

- A marker fixture certifies only when service and release-gate markers are certified, release-bound, evidence-backed, distinct, and consistent with a definition carrying `productionActivationCertified: true`.
- The current live disabled definition with `productionActivationCertified: false` remains blocked even if a marker fixture is supplied.
- Composed activation evidence can satisfy only `service_activation_marker` and `release_gate_activation_marker` in the production activation preflight when paired with a marker-certified fixture definition.
- No live registry definition, scheduler, worker, route, action, alert, incident command, rollback, AI, or WhatsApp behavior is activated.

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-activation-marker-preflight.test.ts`
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-activation-marker-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts services/assurance/__tests__/assurance-registry-contracts.test.ts scripts/__tests__/workflow-assurance-release-gate.test.js`
- `npm run typecheck`
- Focused ESLint for touched TypeScript files.
- Source-only activation scan for forbidden runtime wiring terms.
- Scoped diff hygiene.