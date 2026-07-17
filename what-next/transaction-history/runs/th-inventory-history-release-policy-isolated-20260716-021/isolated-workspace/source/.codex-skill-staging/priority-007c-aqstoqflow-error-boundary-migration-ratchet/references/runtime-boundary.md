# Runtime Boundary

Use this skill only for canonical error-boundary migration after Priority 007B.

## Stop Conditions

Stop and report when:

- a change would require rewriting unknown UI callers;
- a route or action cannot derive tenant or actor context safely;
- the only fix would hide an authorization or accounting blocker;
- verification cannot isolate the touched slice;
- a proposed retry touches non-idempotent economic writes.

## Required Controls

- Preserve tenant and RBAC behavior.
- Keep action and route public shapes compatible.
- Add correlation IDs to failure responses.
- Redact internal exception details.
- Keep logs operator-useful but client-safe.
- Do not add a new taxonomy outside `lib/error-handling`.
