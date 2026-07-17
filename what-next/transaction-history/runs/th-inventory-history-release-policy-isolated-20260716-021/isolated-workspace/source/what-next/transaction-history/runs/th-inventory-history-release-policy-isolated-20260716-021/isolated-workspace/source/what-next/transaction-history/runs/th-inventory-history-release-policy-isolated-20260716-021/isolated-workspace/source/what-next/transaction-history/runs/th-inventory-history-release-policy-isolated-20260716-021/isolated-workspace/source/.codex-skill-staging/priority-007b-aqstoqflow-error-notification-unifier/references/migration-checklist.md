# Migration Checklist

Use this checklist for every migrated action or route.

## Before Editing

- Identify current callers and expected return shape.
- Confirm trusted tenant and actor source.
- Confirm whether the path performs economic mutation, evidence writes, ledger posting, or close blocking.
- Find focused tests for the boundary or add narrow tests.

## Server Actions

- Keep public result shape compatible.
- Use `protect` where RBAC and tenant checks are required.
- Convert raw `throw new Error` to typed domain errors or explicit safe results.
- Replace `console.error` with structured redacted logging.
- Return canonical safe metadata when callers can tolerate extra fields.

## API Routes

- Preserve `NextResponse` behavior and status codes.
- Use route helper mapping for all catches.
- Keep auth errors explicit.
- Include correlation/request ID in error response.
- Never rethrow raw internal errors to clients.

## Tests

- Domain error safe envelope.
- Prisma known error safe envelope.
- Validation field errors.
- RBAC/auth denial.
- Unknown error redaction.
- Correlation ID presence.

## Report

Record remaining raw-error surfaces by risk and recommended next slice.
