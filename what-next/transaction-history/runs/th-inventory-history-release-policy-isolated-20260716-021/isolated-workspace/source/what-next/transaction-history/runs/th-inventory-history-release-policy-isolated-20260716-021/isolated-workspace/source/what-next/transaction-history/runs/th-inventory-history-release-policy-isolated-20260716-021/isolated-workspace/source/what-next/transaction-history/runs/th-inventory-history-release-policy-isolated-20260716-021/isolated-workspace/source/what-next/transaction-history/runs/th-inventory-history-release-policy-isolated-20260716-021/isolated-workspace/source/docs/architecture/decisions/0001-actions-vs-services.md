# ADR-0001: business logic lives in `services/`, not `actions/`

**Status**: Accepted, 2026-05-23

## Context

Three places currently hold business logic:
- `actions/` (114 files, mix of "use server" exports and inline DB work)
- `services/` (organised by domain — `brand/`, `category/`, `customer/`, `inventory/`, `item/`, `location/`, `pos/`, `purchase-order/`, `supplier/`, `tax-rate/`, `unit/` — with co-located unit tests)
- `lib/` (utilities, but with creeping business logic in some files)

The duplication has produced collisions (`updatTaxRateById.ts` and `updateTaxRateByIdNew.ts`, four user-list variants, `actions/item/listAllItems.ts` shipping mock data). New contributors don't know which to use, and code review can't enforce a convention if there isn't one.

## Decision

**Canonical layer: `services/<domain>/<domain>.service.ts`.** Business logic lives here. It accepts validated, typed inputs and an `AuthedContext` (or domain-specific context) — never raw client data. It does not call `auth()` or `requireOrg()` itself; the caller is expected to have done that.

**Server-action layer: `actions/<domain>/<verb>.ts`.** Each is a thin wrapper:

```ts
"use server"
export const createCategory = protect(
  { permission: "categories.create" },
  async (ctx, raw: unknown) => {
    const input = parseInput(createCategorySchema, raw)
    if (!input.ok) throw new Error(input.message)
    return categoryService.create(ctx, input.value)
  },
)
```

The wrapper handles auth, permission check, input validation, and error reporting via Sentry. It then delegates to the service.

**`lib/` reserved for framework adapters and utilities.** No domain business logic. Things like `logger`, `env`, `prisma client`, `audit/record-event`, `permissions` — yes. Things like "compute the discount tier for a sale" — no, that's `services/sales/`.

## Consequences

- A clear answer to "where does this code go?" in code review.
- Server-action files become tiny (~10-15 lines each); the bulk of the logic is testable as a pure service call.
- Services get unit-test coverage out of the box (the existing `services/<x>/<x>.service.test.ts` pattern continues).
- 114 existing `actions/` files need migrating. The migration is incremental: each PR that touches an action moves the logic to the service and converts the action to the wrapper shape. Ticket #027 tracks the rollout.
- The ESLint rule from ticket #019 will eventually enforce "every `"use server"` file in `actions/` imports `protect`" — making non-wrapped actions impossible by construction.

## Alternatives considered

- **Keep both layers indefinitely.** Status quo. Rejected — the collisions are real and growing.
- **Delete `services/` and keep `actions/`.** Loses the test ergonomics; harder to extract reusable logic for cross-action use (e.g. one service method called by both a server action and a background job).
- **Move everything to API routes (`app/api/`).** Loses Next.js server-action ergonomics (no need to fetch by hand from the client). Rejected.
