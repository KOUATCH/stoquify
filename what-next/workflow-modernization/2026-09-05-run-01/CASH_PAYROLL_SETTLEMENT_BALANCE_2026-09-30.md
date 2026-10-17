# Cash Command: cumulative payroll settlement balances

2026-09-30 engineering checkpoint. Primary FA-CASH-COMMAND; supporting payroll settlement/forecast dependency. Branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`; existing working-tree edits retained. Full workflow and platform completion remain unproved.

## Defect and correction

The prior settlement writer accepted a selected status and amount without validating their relationship. Six reproduction tests accepted negative, zero, excessive, NaN, infinite and over-precise amounts as settled. The evidence hash incorporated an amount, but the persisted business-event payload omitted it. Partial obligations could not be reconstructed. Default database transactions also permitted competing reads of the same prior state.

`payment-settlement-balance.ts` defines a service-owned incremental contract. Each new settlement event records the amount settled by that evidence, original batch amount/currency, cumulative settled amount, remaining amount, sequence and prior event ID. Readers validate the complete applied-event chain, batch identity, tenant, arithmetic and status. Gaps, duplicates, unapplied events, inconsistent amounts and legacy events without the contract do not establish a balance.

The writer now uses serializable transactions with bounded conflict retry. Positive finite amounts with no more than two decimals must not exceed the current remainder. A partial settlement requires an explicit increment and must leave a positive remainder. A final settlement must exhaust the remainder; an omitted final amount resolves to that remainder. Approved match amount/currency and linked transaction amount/currency must agree. Reuse of an existing provider event, statement line, match or input evidence hash is rejected. A command fingerprint binds new idempotency keys to the submitted financial/evidence fields; changing the command under an existing key conflicts. Legacy replay accepts only the original evidence-only full-settlement shape, never an ambiguous new amount.

Existing sensitive-action authorization, maker-checker, audit, event/outbox, close invalidation and released-batch content remain in place. Original amounts are not edited. New settlement business events use schemaVersion 2; the embedded balance contract is version 1. No migration or historical backfill was performed.

The forecast now queries the complete settlement event history for partial batches. It adds verified remainders rather than original amounts, includes event content in its fingerprint and settlement processing time in freshness. Legacy or incomplete history retains the localized unverified-balance warning. Query failure propagates. Fully settled obligations remain excluded as established in the preceding checkpoint.

## Verification and limits

- Reproduction: `evidence/payroll-settlement-amount-before.json`: six failed, nine passed; all six invalid amounts previously accepted.
- Final focused checks: `evidence/payroll-balance-checks-f526e688-80e2-4494-a33c-a6fddb2b9d17.json`: **130 tests / five suites**, changed-file lint and migration-free TypeScript pass. Runner `run-payroll-balance-checks.cjs` retains exact commands/hashes. Earlier receipt `payroll-balance-checks-a124323f-5496-4609-8a74-1c3db05f1d6b.json` retained its type error for a nullable approved-match amount; fixed with explicit rejection.
- Real database writer: `lanes/environment/payroll-settlement-balance-6d93a3a4-7fdf-4f0e-9427-52beb96eb479.json`: 100.00 → settle 30.10 → 69.90 → settle 20.20 → 49.70 → final remaining settlement → 0.00. Three applied events. Same-key replay does not duplicate; changed amount conflicts; excessive settlement rejects. Two concurrent 60.00 submissions leave one event and 40.00 remaining. Unproved legacy partial history and a foreign tenant's batch access reject.
- Runtime fixtures explicitly synthesize released-payment prerequisites and reference the earlier local payroll journal. They verify the settlement writer, not payment release, provider authenticity, bank transfer or statutory readiness. Two initial fixture attempts failed before batch creation because the required requester was omitted; both receipts are retained. A denied local script edit meant the second attempt still used the old fixture; the actual patch then supplied the field.
- Forecast tests verify 350,000 less 100,000 = 250,000; another 50,000 produces 200,000; statutory 90,000 remains separate. Failed event reads do not produce successful zero totals.
- Current EN/FR browser results and screenshot bindings are recorded separately in `evidence/cash-settlement-balance-review-2026-09-30.json`; inspect that receipt before claiming browser coverage.

Owned environment: `stoquify_local_registration_20260906_01`, app `http://127.0.0.1:3110`. No production mutation, real payment, external message, declaration submission or deployment.

## Operator inputs and recovery

Each settlement amount means **the amount paid by this new evidence**, not the lifetime cumulative total. The payroll/reconciliation operator obtains it and its currency from the actual approved match or provider/statement record. The source register hash comes from the released payroll register; evidence references come from the corresponding controlled provider or statement records. Never invent hashes to satisfy a control.

For a partially settled batch with a verified chain, the next increment must be within the remainder. The final increment must equal that remainder. After a timeout, retry the same unchanged request/key; if the original committed it replays, otherwise the transaction can proceed. Refresh after a concurrent conflict. Do not select a new key merely to bypass a reused-evidence rejection.

Legacy partial records with no amount history need controlled reconciliation of original statements and events. There is no automatic inference/backfill in this patch, and no supported instruction to edit immutable batch amounts or manufacture events. A controlled reconstruction/recovery workflow remains engineering work; actual evidence and its authorized owner are the required inputs.

## Review, rollout and remaining work

Backend/data/finance: exact decimal, status, cumulative chain, serializable writes and replay checked. Security: existing sensitive-action checks retained; cross-tenant batch denial exercised. Audit/events: new durable contract, existing outbox/close invalidation preserved. UI/localization: read warning uses the existing EN/FR contract; the full settlement form and server-error translation still need completion. Statutory: not recalculated or approved. SRE/release: bounded transaction retry, query failure propagation, isolated tests only; no performance certification. Commercial/billing, AI, POS/offline: not applicable, no changed behavior at those boundaries.

Roll out reader and writer together through the existing reviewed release process. Monitor settlement conflicts, legacy-history warnings and query latency. No schema migration. Rollback must preserve events and original released amounts. A writer rollback can recreate amountless events and unsafe settlement behavior; disable affected writes through established operational controls pending repair rather than deleting history.

Next: connect verified remainder/defaults to the settlement workbench with complete EN/FR errors and recovery; exercise real release/provider/payment/declaration and forecast admission; implement controlled legacy balance recovery where evidence supports it. Actual bank evidence verification and certification are not established by these synthetic fixtures. Full Cash accessibility, enlargement and route-latency closure remain open.
