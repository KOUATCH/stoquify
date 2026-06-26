---
id: 009
title: Fix new-org signup picking up another org's admin role (createUser)
area: authorization
priority: P0
effort: M
phase: foundations
status: done
---

# Fix new-org signup picking up another org's admin role (createUser)

## Problem
`actions/users/createUser.ts:68-82` (per the prior security review) does:

```ts
let defaultRole = await tx.role.findFirst({
  where: { name: ADMIN_USER_ROLE.name },   // ← no organizationId filter
});
if (!defaultRole) {
  defaultRole = await tx.role.create({
    data: { ...ADMIN_USER_ROLE, code: "", organizationId: org.id },
  });
}
// ... newUser connected via roles: { connect: { id: defaultRole.id } }
```

The `findFirst` returns the *first* admin role across all orgs — typically the oldest org's. New users in subsequent orgs inherit org A's permission set, including whatever custom permissions you've added to admin in your own dev/test org. The `code: ""` default also breaks the `@@unique([organizationId, code])` constraint on the second org's signup.

Also: `isVerified: true` is set unconditionally here, but `lib/auth.ts:259` enforces `existingUser.isVerified` for credentials login. This duplication is confusing and unsafe — if the OTP flow doesn't run, users are auto-verified.

## Acceptance criteria
- [ ] Signup transaction order: create `Organization` → create that org's admin `Role` (with explicit `code: "admin"`, permissions from `config/permissions.ts.adminPermissions`) → create the `User` connected to that role. No `findFirst({ where: { name } })`.
- [ ] `isVerified` defaults to `false`; flips to `true` only after OTP confirmation in `actions/users/verifyOtp.ts`
- [ ] `Role.code` is required and non-empty on all role rows (add a migration to fix any `code: ""` rows)
- [ ] `lib/auth.ts:259` credentials check remains the authoritative gate — verify it's not bypassable
- [ ] **Test:** create org A → create user → user's role is org A's admin role, not any other org's
- [ ] **Test:** create org A with permissions X, create org B → org B's user has admin role with the canonical permissions (from `config/permissions.ts`), not X
- [ ] **Test:** new user starts `isVerified: false`; cannot log in via credentials until OTP confirmed
- [ ] **Test:** OTP confirmation flips `isVerified` to `true` and login succeeds

## Implementation notes
- Pattern:
  ```ts
  await db.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { name, ... } })
    const adminRole = await tx.role.create({
      data: {
        organizationId: org.id,
        code: "admin",
        name: "Administrator",
        permissions: ADMIN_PERMISSIONS,  // from config/permissions.ts
      },
    })
    const user = await tx.user.create({
      data: { email, password: await hashPassword(password), organizationId: org.id, isVerified: false, roles: { connect: { id: adminRole.id } } },
    })
    return user
  })
  ```
- Backfill: query existing `Role` rows where `code = ""` and assign sensible codes based on `name` (admin → "admin", manager → "manager", etc.). Document the script in `scripts/backfill-role-codes.ts`.
- Audit existing users created during the bug window: query `Role` with `organizationId != User.organizationId` for users connected to mismatched roles. Likely zero rows since the schema FK should reject this — but worth a one-time check.

## Out of scope
- Role-based admin UI for managing permissions per role → out of scope for this ticket; consider if customer-defined roles become a feature request
- Email verification UX changes (link expiry, resend flow, etc.) → separate ticket if needed

## Resolution
Implemented 2026-05-23.

- `actions/users/createUser.ts`: removed the cross-org `findFirst({ where: { name } })`. Every new-org signup now creates its OWN admin Role row with `code: "admin"` (was `""` — collided with `@@unique([organizationId, code])` on subsequent signups). `nameEn` / `nameFr` populated per the bilingual Role schema. The legacy `ADMIN_USER_ROLE` constant replaced with `ADMIN_ROLE_SPEC`.
- Same file: `isVerified` defaults to `false`. The OTP-confirmation flow at `actions/users/verifyOtp.ts:21-28` flips it to true on a matching code. Previously it was unconditionally true, which made OTP cosmetic.
- `actions/users/createUser.test.ts`: 4 vitest cases — admin role created per-org (no cross-org leak), `code: "admin"` not empty, `isVerified: false`, duplicate-slug + duplicate-email rejection. 4/4 pass.

**Production backfill needed:** if any existing orgs share an admin role row (i.e. were created during the bug window), audit with:
```sql
SELECT "User"."id", "User"."email", "User"."organizationId" AS user_org,
       "Role"."id" AS role_id, "Role"."organizationId" AS role_org
FROM "User"
JOIN "_UserRoles" ur ON "User"."id" = ur."B"
JOIN "Role" ON "Role"."id" = ur."A"
WHERE "User"."organizationId" != "Role"."organizationId";
```
Fix each mismatch by creating a per-org admin role and re-pointing the user's role connection.
