---
id: 007
title: Verify caller belongs to [id] in /api/v1/organisations/[id]/* routes
area: authorization
priority: P0
effort: S
phase: quick-wins
status: done
---

# Verify caller belongs to [id] in /api/v1/organisations/[id]/* routes

## Problem
Three API routes exist under `app/api/v1/organisations/[id]/`:
- `app/api/v1/organisations/[id]/items/route.ts`
- `app/api/v1/organisations/[id]/briefItems/route.ts`
- `app/api/v1/organisations/route.ts`

`requireApiSession()` from `lib/api/guard.ts` confirms the caller is authenticated and has *some* `organizationId`, but it does NOT compare that to the `[id]` URL parameter. A signed-in user from org A can call `/api/v1/organisations/<org-B-id>/items` and get back org B's data.

## Acceptance criteria
- [ ] All three routes either (a) verify `session.organizationId === params.id` and return 403 otherwise, or (b) drop the `[id]` segment in favor of session-scoped routes (`/api/v1/items` deriving org from session)
- [ ] Recommendation: option (b) — the segment is redundant
- [ ] `lib/api/guard.ts` gains a `requireApiSessionForOrg(orgId: string)` helper that does the comparison and throws 403
- [ ] **Test:** authenticated user from org A calling `/api/v1/organisations/<org-B-id>/items` returns 403, audit log has `PERMISSION_DENIED` with `reason: "Cross-org access attempt"`
- [ ] **Test:** authenticated user from org A calling `/api/v1/organisations/<org-A-id>/items` succeeds

## Implementation notes
- Recommended fix (option b): rename routes:
  - `app/api/v1/organisations/[id]/items/route.ts` → `app/api/v1/items/route.ts`
  - `app/api/v1/organisations/[id]/briefItems/route.ts` → `app/api/v1/items/brief/route.ts`
  - Update the route handlers to read `session.organizationId` directly
- If you keep option (a) for API contract compatibility:
  ```ts
  const session = await requireApiSession()
  const { id: orgId } = await params
  if (session.organizationId !== orgId) {
    await logSecurityEvent({ type: SecurityEventType.PERMISSION_DENIED, userId: session.userId, organizationId: session.organizationId, resource: `/api/v1/organisations/${orgId}` })
    return new Response("Forbidden", { status: 403 })
  }
  ```
- Document the breaking change in `docs/api/CHANGELOG.md` if any external API consumer relies on the current URL shape (probably none — this is internal)

## Out of scope
- Public-facing API key authentication for these routes (current model is session-only)
- API versioning beyond v1

## Resolution
Implemented 2026-05-23 via option (a) — `requireApiSessionForOrg(orgId)` helper. The URL contract `/api/v1/organisations/[id]/*` is preserved; the helper enforces `session.user.organizationId === params.id` and logs a `PERMISSION_DENIED` security event on mismatch.

- `lib/api/guard.ts`: added `requireApiSessionForOrg(orgIdFromUrl)` that delegates to `requireApiSession` then checks the org match. Cross-org access logs an audit event with `callerOrg` + `attemptedOrg` and throws `ApiError(403, "Forbidden")` — no detail leaked to the caller.
- `app/api/v1/organisations/[id]/items/route.ts`: switched from `requireApiSession()` to `requireApiSessionForOrg(orgId)`.
- `app/api/v1/organisations/[id]/briefItems/route.ts`: same.
- `lib/api/guard.test.ts`: 7 vitest cases covering both helpers — happy path, 401 (no session), 403 (no org), 403 (cross-org), and verifying the audit event payload.

Verification: `npx vitest run lib/api/guard.test.ts` → 7/7 passed (664ms).

Note: `app/api/v1/organisations/route.ts` (the LIST endpoint) returns every Organisation across every tenant. That's a separate info-leak finding not in this ticket's scope — flagged for the #003 sweep.
