# Stage 04 Read Model Optimizer - Cash Payment

Status: PASS

Implemented backend read-model foundation for cash/payment history.

## Changed Files

- services/pos/cash-payment-history.schemas.ts
- services/pos/cash-payment-history.service.ts
- services/pos/__tests__/cash-payment-history.service.test.ts
- ctions/pos/cash-payment-history.actions.ts
- ctions/pos/__tests__/cash-payment-history.actions.test.ts

## Read Model Contract

- Adapter: cash-payment-history.v1
- Cursor: shared HMAC transaction-history cursor from services/history/transaction-history-cursor.ts
- Scope: trusted organizationId from server context
- Access: own cashier scope or manager scope
- Ordering: combined cash/payment rows sorted by effective time, recorded time, and id
- Cutoff: ecordedThrough
- Summary: server-side full filter population, not capped UI arrays and not cursor-page relative
- Redaction: provider references use payment_provider_reference redaction policy
- Export prep: controlled through payment.export, fresh auth, watermark, and export safety evaluation

## Verification

- 
pm test -- services/history/__tests__/transaction-history-cursor.test.ts services/security/__tests__/export-safety.service.test.ts services/security/__tests__/redaction-policy.service.test.ts services/pos/__tests__/cash-payment-history.service.test.ts actions/pos/__tests__/cash-payment-history.actions.test.ts --runInBand - PASS, 5 suites / 19 tests.
- 
px eslint services/pos/cash-payment-history.schemas.ts services/pos/cash-payment-history.service.ts services/pos/__tests__/cash-payment-history.service.test.ts actions/pos/cash-payment-history.actions.ts actions/pos/__tests__/cash-payment-history.actions.test.ts --ext .ts - PASS.

## Residual Risk

- 
pm run typecheck was attempted separately and failed because Node reached heap out-of-memory before returning TypeScript diagnostics.
- No Prisma schema or migration was changed, so no new index or query-plan claim is made.
- Browser/UI delivery is still pending Stage 05 and Stage 06.
- Full release verification remains Stage 07.
