# Compatibility Contract

`services/_shared/action-errors.ts` is a facade during migration.

## Keep These Exports Stable

- `ApplicationError`
- `BusinessRuleError`
- `NotFoundError`
- `ConflictError`
- `isApplicationError`
- `toSafeActionError`
- `SafeActionStatus`
- `ApplicationErrorCode`

## Required Behavior

- Existing service tests expecting `instanceof BusinessRuleError`, `NotFoundError`, or `ConflictError` must continue to pass.
- Existing actions expecting `{ error, status, code }` from `toSafeActionError` must continue to work.
- New responses may add safe fields such as `correlationId`, `category`, `severity`, `retryable`, and `metadata`.
- Unknown errors must never expose raw messages.
- Exposed domain error messages must be intentionally safe.

## Canonical Mapping

- Validation and Zod errors map to `VALIDATION_ERROR`, status `400` or `422`.
- Authentication errors map to `AUTH_REQUIRED`, status `401`.
- Authorization errors map to `FORBIDDEN`, status `403`.
- Fresh-auth errors map to `FRESH_AUTH_REQUIRED`, status `403`.
- Not-found errors map to `NOT_FOUND`, status `404`.
- Conflict and Prisma unique errors map to `CONFLICT`, status `409`.
- Business-rule errors map to `BUSINESS_RULE_VIOLATION`, status `422`.
- Unknown errors map to `INTERNAL_ERROR`, status `500`.
