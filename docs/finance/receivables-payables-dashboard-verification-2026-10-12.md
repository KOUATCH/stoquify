# Receivables/payables verification follow-up

Date: 2026-10-12. Source baseline: `6f7f6741` plus the existing dirty tree. Scope: verify phases 2–3; preserve unrelated work and existing financial/access controls. The user explicitly directed this follow-up to use the current database.

## Database evidence

Added a separate **read-only** PostgreSQL lane:

```powershell
node scripts/run-open-items-readonly-verification.cjs --inspect 'Wilkinson - Feeney 001'
node scripts/run-open-items-readonly-verification.cjs --verify 'Wilkinson - Feeney 001'
```

The runner loads the current application's environment locally, pins PostgreSQL startup options to `default_transaction_read_only=on` and a 15-second statement timeout, limits connections to two, and checks read-only settings before source discovery. The suite checks read-only and repeatable-read settings inside each actual service transaction. It imports the real services and Prisma client, with no persistence mocks. The transaction instrumentation delegates to the real transaction and checks its settings; it does not substitute data.

No migration, bootstrap, seed, fixture write, reset or cleanup is performed. Connection credentials and raw financial records are not printed by the runner. The initial sandbox connection failed with TCP `EACCES`; the reviewed read-only command succeeded with local network access approved. This was a sandbox access issue, not evidence that the database was unavailable.

Preflight found 12 customer receivable documents and 12 supplier invoices in the existing organization. Its purchasing module configuration is inactive; no active organization had purchasing in its active module configuration. Configuration discovery alone is not an entitlement or role admission check.

**Executed: 1 suite, 9 tests passed**, including:

- Actual AR/AP source reads; invoice ownership, positive known remainders, original/settled/credit arithmetic, separate currency totals and aging totals; unknown evidence remains unavailable.
- Rankings and queue counts over the retrieved population; filtered rows leave currency summaries unchanged; stale pagination revisions are rejected.
- Foreign locations and nonexistent organizations are rejected by both invoice read services; receipt reads also reject foreign locations.
- AP workflow status counts agree with stored source counts. Restricted payment capabilities return null, and the response contains only the intended report fields.
- Receipt method totals and net arithmetic agree; missing timestamps preserve an unavailable net.
- PostgreSQL reports read-only, repeatable-read transactions; snapshot identifiers remain stable within a transaction.

These tests are existing-data consistency checks, not independent accounting certification. They do not create concurrent writers, prove rollback under writes, certify the action/session authorization layer, or exercise every possible financial status. AP service reads do not demonstrate that a browser user is admitted to the locked AP module.

## Mocked access and recovery evidence

Expanded existing action/hook suites with ten cases: separate approval/release capabilities, module loss during a read, actor/workspace changes, failed refresh after successful data, actor/workspace/permission cache separation, and independent supplement failures. No production behavior was changed. Initial assertions expected an absent `data` property; they were corrected to the existing safe-action failure contract, `data: null`.

The scoped mocked suite is separate from the PostgreSQL suite. Final results are recorded below.

## Rendered observations

Existing authenticated SUPER ADMIN session, organization Wilkinson - Feeney 001, local route `/en/dashboard/finance/receivables`, default browser viewport:

- Initial loading resolved to current invoice balances and the independent receipt panel.
- Searching the existing invoice reference narrowed the table to one matching invoice.
- Clearing filters emptied the search field and restored all three open invoice rows.
- Selecting Central Warehouse produced its location-scoped empty-open-invoice state while retaining the receipt panel.
- The French AP route `/fr/dashboard/finance/payables` progressed from its localized loading state to “MODULE INDISPONIBLE / Ce module n’est pas activé”, confirmed visually. It did not expose invoice or payment counts through the disabled module.

Prior phase 2–3 evidence separately records French/mobile layout, keyboard date entry, invoice drawer Escape/focus return and the English AP module-locked state. Those earlier observations are not repeated database or role certification.

## Verification commands and completion limits

The command definitions, configs and import paths were inspected against `docs/ecc/WORKFLOW.md`, `command-registry.json` and `test-lanes.md`. Applied ECC verification-loop guidance under those project controls; the migration-bearing build was not invoked. The new direct read-only runner is scoped reviewed evidence, not a new registry-wide permission to execute arbitrary commands.

- `npm run agent:workflow:check`: passed, 198 unclassified package scripts.
- `node node_modules/typescript/bin/tsc -p tsconfig.open-items-readonly.json --noEmit --incremental false`: passed.
- Scoped ESLint on the new PostgreSQL test, modified action/hook tests and runner/config: passed.
- `node --check` for runner and Jest config: passed.
- `node node_modules/jest/bin/jest.js --config jest.open-items-dashboard.config.cjs --runInBand --no-cache`: **11 suites, 91 tests passed** on the final run.
- Owned verification files: no trailing whitespace.

Full AP ready-state browser verification remains blocked by the existing module configuration. No module grants/settings were changed. Write-based concurrency/rollback verification still requires a separately identified disposable target; the user's current-database choice was used only for read verification. No alternate-role session was provisioned, so the expanded role matrix is mocked evidence, not rendered role certification. No release certification, financial mutation or payment execution is claimed.

Owned scope: new read-only runner, Jest/TypeScript configs and PostgreSQL suite; additional action/hook regression cases; this evidence record. Rollback removes only these new files and added test cases. Do not remove phase 0–3 implementation or unrelated changes. No staging or commit was requested or performed.
