# Scanner Classification

The raw-error boundary scanner should classify findings as:

- `CLIENT_BOUNDARY_UNSAFE`: action or route can leak raw errors or logs internal details.
- `SERVICE_RAW_DOMAIN_ERROR`: service uses raw `Error` where a typed domain error should be used.
- `INTERNAL_LOGGING_ONLY`: logging inside error-handling internals or non-client operational paths.
- `TEST_ONLY`: tests and mocks.
- `ALLOWED_CONTROL_FLOW`: Next.js redirect/not-found or intentionally rethrown framework control flow.
- `NEEDS_MIGRATION`: raw pattern that is not immediately client-leaking but should be migrated.

Report mode must never block. Warn mode exits zero with findings. Fail mode exits non-zero when active unsafe findings remain.

Scan these roots:

- `actions`
- `app/api`
- `services`
- `lib/error-handling`

Ignore:

- `__tests__`
- `.test.ts`, `.test.tsx`, `.spec.ts`, `.spec.tsx`
- generated reports
- `node_modules`
- `.next`
