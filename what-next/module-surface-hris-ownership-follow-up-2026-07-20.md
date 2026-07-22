# HRIS Module-Surface Ownership Follow-up

Date: 2026-07-20

Skill: `aqstoqflow-module-surface-inventory-gate`

Status: complete

## Scope

Complete only the narrow follow-up identified in `what-next/module-surface-inventory.md`:

- map the six `actions/hris/*.actions.ts` inventory surfaces to their canonical module owner;
- correct the `/dashboard/people` sidebar module slug;
- retain focused inventory regression coverage;
- regenerate the module-surface inventory; and
- report the isolated and whole-inventory baseline-gap deltas.

No unrelated HRIS functionality, entitlement enforcement, schema, tenant data, payroll calculation, or statutory formula was changed.

## Sources inspected

- `what-next/module-surface-inventory.md`
- `what-next/module-surface-inventory.json`
- `what-next/module-surface-registry-baseline-2026-07-12.json`
- `scripts/module-surface-inventory.js`
- `scripts/__tests__/module-surface-inventory.test.js`
- `scripts/__tests__/module-surface-hris-ownership.test.js`
- `services/modules/module-catalog.service.ts`
- `services/modules/module-control-contracts.ts`
- `config/sidebar.ts`
- `graphify-out/graph_actions.json`

The canonical catalog has no standalone `hris` slug. HRIS people surfaces belong to the available `payroll` commercial module, whose catalog owner is `People`; the generic `/dashboard` prefix is only the platform shell fallback.

## Ownership mapping

| Surface | Canonical module |
|---|---|
| `actions/hris/approval-inbox.actions.ts` | `payroll` |
| `actions/hris/compensation.actions.ts` | `payroll` |
| `actions/hris/employee.actions.ts` | `payroll` |
| `actions/hris/lifecycle.actions.ts` | `payroll` |
| `actions/hris/payment-destination.actions.ts` | `payroll` |
| `actions/hris/time-leave.actions.ts` | `payroll` |
| `config/sidebar.ts` → `/dashboard/people` | `payroll` |

The generator now resolves the `hris/` action namespace to `payroll`, and the People sidebar entry uses the same canonical slug. The focused test asserts every mapping and rejects both `unmapped` and `unknown slug` classifications.

## Baseline-gap delta

### Isolated HRIS ownership slice

- Target surfaces: 7
- Unmapped HRIS actions: 6 → 0
- Unknown People sidebar slugs: 1 → 0
- Canonically mapped targets: 0 → 7
- Active ownership gaps: 7 → 0 (**−7**)

### Whole regenerated inventory

- Baseline active gaps: 55
- Current active gaps: 46
- Active gap delta: **−9**
- New gaps: 0
- Resolved gaps: 9
- Ratchet status: passed

Only −7 is attributed to this narrow HRIS ownership follow-up. The additional −2 reflects unrelated changes already present in the preserved working tree.

## Controls

- Service ownership: HRIS remains people truth; mapping a surface to the commercial `payroll` module does not transfer data ownership to payroll calculations.
- Tenant/RBAC: existing `protect` boundaries and HRIS permissions were not changed.
- Entitlement: inventory remains report/warn mode; hard enforcement was not enabled.
- Audit/redaction: no audit payloads, employee data, exports, or redaction rules were changed.
- Release gate: the saved baseline ratchet passed with zero new findings.

## Verification

- `npx jest scripts/__tests__/module-surface-hris-ownership.test.js --runInBand` — passed, 1 suite / 7 tests.
- `npm run module:surface:ratchet` — passed, 367 records, zero new gaps, active-gap delta −9.
- Focused dispatch calculation against the pre-change inventory — 7 ownership gaps reduced to 0.

## Remaining blockers and next prompt

This tranche has no remaining HRIS module-ownership blocker. Forty-six active module-surface gaps remain elsewhere in the repository and are outside this narrow scope.

Next prompt: select the next reviewed module-surface cleanup from the regenerated inventory without broadening HRIS or enabling hard entitlement enforcement.
