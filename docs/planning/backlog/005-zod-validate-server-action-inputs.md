---
id: 005
title: Zod-validate every server-action input at the boundary
area: security
priority: P0
effort: M
phase: foundations
status: partial
---

# Zod-validate every server-action input at the boundary

## Problem
Server actions accept `unknown` and trust the shape. Looking at `actions/users/createInvitedUser.ts:14` — `data: InvitedUserProps` is just a TypeScript hint, not a runtime guard. A malformed payload (50KB string, wrong types, extra fields, null bytes) reaches Prisma where it either crashes or silently corrupts data. Zod is already in `package.json` and used elsewhere — extend it to every action boundary.

## Acceptance criteria
- [ ] `schemas/` directory holds one schema file per domain (e.g. `schemas/user.ts`, `schemas/item.ts`)
- [ ] Each exported server action calls `.safeParse(input)` (or `.parse()` inside try/catch) as the first line after `protect()`
- [ ] Schemas enforce `.strict()` (no unknown keys), string `.max()` bounds (sensible per field — title 200, body 10000, etc.), numeric bounds, enum values
- [ ] Failed validation returns `{ error: { code: "VALIDATION", fields: ... }, status: 400 }`, never reaches Prisma
- [ ] Pilot scope: `actions/users/*`, `actions/pos-*`, `actions/item/*` (highest-risk surfaces)
- [ ] **Test:** `createUser` with a 50,000-char `firstName` returns validation error, no `User` row created
- [ ] **Test:** `createUser` with an extra `role: "admin"` field at top level is rejected by `.strict()`
- [ ] **Test:** valid input round-trips successfully

## Implementation notes
- Pair with `protect()` from #004:
  ```ts
  export const createUser = protect(
    { permission: "users.create" },
    async (ctx, raw: unknown) => {
      const input = createUserSchema.parse(raw) // throws on bad input → protect's catch turns it into a 400-ish
      // ... safe to use input
    }
  )
  ```
- Tighten existing types: replace `InvitedUserProps`, `CreateUserData`, etc. with `z.infer<typeof schema>` so TypeScript and runtime agree
- Coerce + trim strings; reject HTML in fields that aren't explicit rich-text
- For URL/query params on API routes (`app/api/v1/*/route.ts`), parse `searchParams` too — it's `unknown` until validated
- Don't write a generic `withValidation` helper yet — inline `.parse()` calls are clearer for the first ~20 actions; extract a helper once a real pattern emerges

## Out of scope (separate tickets)
- Sweep across all 114 actions → continues as part of #003
- Sanitization of rich-text fields (if any) — only relevant if you accept rich content; current schemas don't suggest you do

## Resolution
**Partial** 2026-05-23 — infrastructure landed, pilot done, full rollout deferred to #003 sweep.

- `services/_shared/validate.ts`: `parseInput()` helper + reusable Zod fragments (`trimmedString`, `optionalTrimmedString`, `cuid`, `emailLower`, `nonNegativeInt`, `positiveInt`). Returns `{ ok, value }` or `{ ok: false, message, fieldErrors, error }`. Strict-schema rejections surface unrecognized keys in the message.
- `schemas/user.ts`: `redeemInviteSchema`, `sendInviteSchema` — strict, bounded.
- **Pilot:** `actions/users/createInvitedUser.ts` parses via `redeemInviteSchema` at the boundary. Strict-mode rejection means a malicious caller that adds extra `organizationId`/`roleId`/`email` fields gets a 400 before any DB read. Tests updated accordingly (8/8 pass).
- `services/_shared/validate.test.ts`: 4 cases (happy path, structured error, strict rejection, max-length bound). 4/4 pass.

Full rollout to `actions/users/*`, `actions/pos-*`, `actions/item/*` deferred — combined with the broader sweep in #003 since they touch the same files.
