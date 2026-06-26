# Owner Morning Brief Slice - 2026-06-23

## Scope

Built the first Owner Morning Brief slice on top of the existing Owner War Room, snapshot, signal, proof, and BI primitive stack.

## Implemented

- Added `morningBrief` to the Owner War Room DTO as a server-composed daily digest.
- Highlighted cash at risk, blocked close items, stale evidence, and proof-linked action count since yesterday.
- Ranked top owner risks from payment truth, close readiness, stale evidence, and stock-to-cash exposure.
- Built the top proof-linked action board from the permission-filtered action queue and visible signal proof links.
- Added business truth zones for cash truth, stock-to-cash truth, close readiness, and payment/reconciliation truth.
- Rendered the brief first in the Owner War Room with existing BI primitives and mobile-friendly grid behavior.
- Added session-only acknowledgement state in the client; no accounting, cash, close, inventory, payroll, evidence, or workflow record is mutated.
- Preserved existing Owner War Room cards, strips, action queue, proof buttons, module observe state, and summary counts below the new brief.

## Safety Notes

- Trust state, freshness, blockers, redactions, proof availability, and permission-filtered actions remain server-owned.
- The server action remains read-only and unchanged in behavior.
- The acknowledgement is local React state only because no durable acknowledgement model exists in the current Owner War Room contract.

## Verification

- `npm test -- services/owner-war-room/__tests__/owner-war-room.service.test.ts --runInBand` - passed.
- `npm test -- components/owner-war-room/__tests__/OwnerWarRoomDashboard.test.tsx --runInBand` - passed.
- `npm test -- actions/owner-war-room/__tests__/owner-war-room.actions.test.ts --runInBand` - passed.
- `npm test -- services/owner-war-room/__tests__/owner-war-room.service.test.ts actions/owner-war-room/__tests__/owner-war-room.actions.test.ts components/owner-war-room/__tests__/OwnerWarRoomDashboard.test.tsx --runInBand` - passed.
- `npm run typecheck` - passed.
- `npm run lint` - passed with pre-existing warnings in unrelated files.
- `npm run build:app` - passed and verified `/[locale]/dashboard/owner-war-room` in the Next.js route output.