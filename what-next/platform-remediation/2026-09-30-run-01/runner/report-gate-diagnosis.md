# Remaining report-trust scanner clause diagnosis

**Captured:** 2026-09-30T20:39:23Z. **Method:** `diagnose-report-gate.cjs` parsed the current scanner and instrumented three predicate return expressions in memory. It evaluated every original conjunction and identified missing literal markers. The scanner file and its verdict were not changed. Exact expressions and scanner hash are in `report-gate-diagnosis.json`.

The scanner reported 32/35 ready. These three failures are refactoring-sensitive markers in the inspected source. This diagnosis does not certify the complete workflows, and the cited tests were inspected, not rerun as part of this probe.

## 1. Customer settlement compensating reversal

Only the posting-marker conjunction failed. The missing literals were:

- `original.sourceType===AccountingSourceType.CUSTOMER_SETTLEMENT`
- `return{sourceOwnedBlocked:trueasconst}`

`services/accounting/posting.service.ts:438` now rejects **every source type other than MANUAL**, writes `JOURNAL_ENTRY_SOURCE_OWNED_REVERSAL_BLOCKED`, returns the actual blocked source type, and throws the source-specific error after the transaction commits. This is stronger scope protection than checking only CUSTOMER_SETTLEMENT. The downstream blocked-result branch remains present at line 590.

`services/accounting/__tests__/posting.service.test.ts:353` covers the settlement/suspense rejection and absence of ledger/journal writes. A new parameterized case at line 415 covers every nonmanual AccountingSourceType. The accounting worker owns this active change and its runtime validation.

**Minimal scanner repair:** verify the new nonmanual guard, durable audit, source-carrying return and downstream rejection together. Do not merely accept the enum name anywhere in the file. Keep the existing marker/order checks for the actual settlement-reversal source service. Add a negative scanner fixture that removes the nonmanual restriction or blocked return and must fail.

## 2. Signed customer statement external access

Three literal checks failed: the two inline cache-header assignments, and the inline two-value `actionType` comparison.

- Both bearer routes import `privateStatementResponse` from `services/accounting/customer-statement-http.ts`. They return that helper's result on success **and** in their error handler. The helper sets `Cache-Control: private, no-store, max-age=0`, `Referrer-Policy: no-referrer`, and `X-Content-Type-Options: nosniff`.
- The POST route now calls `statementRecipientCommandSchema.safeParse(body)`, rejects a failed parse, and passes only `parsed.data` to the recipient-action service. `services/accounting/customer-statement.schemas.ts:43` uses the exact `z.enum(["DISPUTE", "PROMISE_TO_PAY"])`, strict object parsing and bounded fields. The schema also enforces document/date distinctions.
- The GET route tests inspect private headers; the POST route tests reject unsupported action types before service access and reject malformed/unbounded input privately (`app/api/customer-statements/[statementId]/actions/__tests__/route.test.ts:96,118`).

**Minimal scanner repair:** read the helper and schema as explicit predicate inputs. Require their correct imports, helper invocation on both success and failure for each route, actual header assignment in the helper, exact allowed schema enum, parse-failure rejection, and parsed-data forwarding before service invocation. Add negative fixtures for removed helper application, permissive schema, or service invocation before validation. Do not satisfy the header check by searching an unrelated helper without proving route wiring.

## 3. Consented customer referral launch

Two clauses failed:

- Expected `delivery.token.expiresAt.getTime()<=now.getTime()`; source instead uses `delivery.token.expiresAt <= clock()` at `services/communication/customer-statement-delivery-worker.service.ts:362`, checks token status/revocation, and returns a cancelled outcome before provider access. Reservation rechecks `expiresAt: { gt: clock() }` alongside ACTIVE status and null revocation at line 389. This protects expiry at dispatch reservation as well as at initial read. The captured source also verifies the signed token with the current clock.
- Expected inline `queueCustomerStatementDeliveryAction({`; the workflow now builds a consent-bearing command, persists that command at `components/customers/CustomerStatementWorkflow.tsx:229`, and calls `queueCustomerStatementDeliveryAction(command)` at line 231. This permits exact retry after uncertain delivery outcomes. Tests cover consent hashing, retrying the identical command, overlapping submission, recovery persistence failure, and fresh consent for a new request.

**Minimal scanner repair:** require the current-clock cancellation before provider call and the transactional reservation's expiry/revocation constraint. Accept the actual command-variable call only when it is tied to the built consent-bearing command and durable pre-submit persistence. Add negative fixtures deleting the expiry constraint, moving it after send, removing consent, or removing command persistence. Keep the other 51 clauses; do not waive the foundation as a whole.

## Runtime follow-up

After repairing scanner recognition, run the scanner's own positive/negative tests and the focused route, delivery-worker and workflow tests under ordinary Jest. A passing structural scanner alone cannot establish live provider delivery, database race safety, browser recovery, or consent qualification for a deployment.
