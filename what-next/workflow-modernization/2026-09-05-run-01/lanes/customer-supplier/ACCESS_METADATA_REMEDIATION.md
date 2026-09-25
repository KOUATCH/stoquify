# CS-F08 — omitted statement-access metadata rejected by PostgreSQL

Evidence date: 2026-09-05. The verification owner found a real PostgreSQL `23514` failure while preparing the customer-statement recipient retry check. `issueCustomerStatementAccessTokenInTx` wrote `Prisma.JsonNull` when its optional `metadata` input was omitted. The check stopped before any recipient action. The initial failure remains in the verification owner's `environment/postgres-run-f799fb30e867.json` receipt.

The current schema declares `CustomerStatementAccessToken.metadata` as `Json?`. The existing `20260809130000_customer_statement_external_access/migration.sql` constraint `customer_statement_access_tokens_metadata_check` accepts SQL NULL or a JSON object. JSON `null` is a JSON value and satisfies neither branch. The public issuance wrapper accepts the same optional input; the delivery service supplies an object with its existing consent/channel evidence.

The correction changes only the omitted-metadata branch in `services/accounting/customer-statement-access.service.ts` from `Prisma.JsonNull` to `Prisma.DbNull`. Supplied objects still go through the existing JSON normalization. Token scopes, content/hash binding, active tenant issuer lookup, lifetime, registry persistence, transaction isolation and audit behavior are unchanged. No schema, migration or constraint was weakened or applied.

The focused existing issuance test now covers omitted metadata, an empty object and a nested metadata object. It checks the exact database-null sentinel for omission, preserves object values, and asserts one token write and issuance audit. Before the source correction: **1 failed, 5 passed, one suite, 2.887 seconds**. The failure distinguishes `Prisma.JsonNull` from `Prisma.DbNull`; deep equality alone cannot distinguish these Prisma sentinel objects.

After the correction, **25 tests passed across four suites in 7.249 seconds**, exit 0 (session 90592):

```text
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath
services/accounting/__tests__/customer-statement-access.service.test.ts
services/accounting/__tests__/customer-statement-token.test.ts
services/accounting/__tests__/customer-statement-recipient-action.service.test.ts
services/accounting/__tests__/customer-statement-delivery.service.test.ts
--silent
```

Changed-file lint emitted no diagnostics. The parent completed its combined typecheck immediately before this bounded change; that earlier check does not bind the new line.

The verification owner's real PostgreSQL rerun **passed**: `../environment/postgres-statement-dd56bf1aa069.json`. The same omitted-metadata issuance succeeded under the unchanged constraint. A late identical promise returned the same action and state with one action/event/state retained; changed payload, a new expired promise, expired/revoked access and foreign snapshot access were denied. Source hashes were captured before/after. The initial `23514` failure remains at `../environment/postgres-run-f799fb30e867.json`. This verifies the scoped issuance/recipient service path; it does not establish statement generation, external delivery or a browser visit.

Source bindings:

| Path | Before SHA-256 | After SHA-256 |
| --- | --- | --- |
| `services/accounting/customer-statement-access.service.ts` | `9768f75d576312cb3cbd074fd0ead2abf8a7e1875946007682db0c988a3cae08` | `296a9d920760aa1b4196b29c5321ef33b8d1e253c9c667b72e4c42109a23e4b5` |
| `services/accounting/__tests__/customer-statement-access.service.test.ts` | `37610c181ead58aa62f1551785bfd73e8f5c3a76a5eb618b35ebfc2434224272` | `e4274102c1ef0dbb831da28baa81aa856c0e4ee712f356f308b96d9f517caefe` |

The before hashes were captured in `evidence/RETRY_VERIFICATION.json`. Its earlier passing access tests did not assert the nullable-metadata database representation. This is a useful limit of mocked persistence evidence, not grounds to weaken the production constraint. No real messages, provider deliveries, customer approvals or financial postings were issued by this lane.

Existing rows need no migration. A failed issuance had no successful token record under the constraint; retry under the current authorized workflow after deploying the normal application change. Reverting the line restores the omitted-input failure. Complete statement generation, public browser visits and end-to-end delivery remain separately tracked in the workflow register.
