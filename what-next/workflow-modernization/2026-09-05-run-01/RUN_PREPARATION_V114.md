# Reviewed reconciliation preparation — v114

The server can now move an unsigned reviewed run from `NEEDS_REVIEW` to `READY_FOR_SIGNOFF`, and refresh an unsigned ready run after a new review. Preparation retains the reviewed revision, reason, actor, before-state and source digest in a private inbox receipt with audit evidence. It posts no money and creates no certificate. The existing independent signing service verifies that preparation remains current.

This is a verified service/action foundation. Preparation controls, history navigation and EN/FR browser journeys are still required. The whole-platform workflow review remains unfinished.

## Behavior and controls

- Preview and signing reuse provider setup, effective settlement account, open accounting period, complete obligation counts, ledger truth and source-manifest checks. Missing external evidence remains a blocker even after financial treatment and exception closure.
- Run lookup scopes the provider, rail and maker to the organization, and settlement-account selection is scoped and deterministic.
- A preview binds the full loaded run, setup and evidence. Serializable preparation recomputes that revision and uses a conditional update. Receipt, audit and in-app notification commit with the transition.
- Exact retry requires the same actor and command and verifies the retained receipt/audit. It returns the actual current run status; it never restores readiness after signing or reopening.
- Signing checks the prepared run and source digest. A changed setup or source requires new review and preparation. The signer must differ from both the original maker and preparation actor. Existing original zero-exception runs retain their existing independent-signing path.
- Source-owned clearing reversal reopens the obligation and run, invalidates the current certificate and retains preparation history. Signed runs cannot be changed through preparation.
- Protected actions derive identity, organization, permissions and password assurance from the server. Preparation uses existing `payments.reconciliation.run`, plus reconciliation/accounting read; fresh authentication is required within 300 seconds. Existing module enforcement remains in place.

## Verification

Final unit/action regression: **55 tests / four suites passed**, tool receipt `5e9f83`.

```powershell
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath services/reconciliation/__tests__/reconciliation-run-preparation.service.test.ts services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts services/reconciliation/__tests__/payment-reconciliation-run-detail.test.ts actions/payments/__tests__/reconciliation-preparation.actions.test.ts
node node_modules/typescript/bin/tsc --noEmit --pretty false
node node_modules/eslint/bin/eslint.js services/reconciliation/reconciliation-run-preparation.contracts.ts services/reconciliation/reconciliation-run-preparation-evidence.ts services/reconciliation/reconciliation-run-preparation.service.ts services/reconciliation/payment-reconciliation-certification.service.ts services/reconciliation/__tests__/reconciliation-run-preparation.service.test.ts services/reconciliation/__tests__/payment-reconciliation-run-detail.test.ts actions/payments/reconciliation-preparation.actions.ts actions/payments/__tests__/reconciliation-preparation.actions.test.ts
```

Executed with the bundled absolute Node runtime. Final typecheck passed (`ba18f2`), eight-file lint passed (`606bc3`). No migration-bearing build was invoked; no full-build pass is claimed.

Owned PostgreSQL: [run-preparation-v114-64f51086-ece.json](lanes/environment/run-preparation-v114-64f51086-ece.json), final receipt `67068c`, five check groups passed with stable source and unchanged monitored original records. The fixture starts with a synthetic external amount mismatch before running the real producer. It then uses real posting, clearing, independent financial treatment, exception closure, preparation, signing, export and reversal services. Synthetic provider setup does not verify provider authentication or establish professional approval. Direct trusted service controls do not prove browser authentication.

The database checks cover tenant/actor/permission/freshness denial; unresolved obligations; late-audit rollback; concurrent duplicate preparation; one durable receipt; unchanged financial records during preparation; maker refusal; changed setup refusal; explicit re-preparation; independent signing and certificate export; source-owned reversal and stale replay; missing external evidence after closure.

Initial checks are retained honestly: `49d7d4` had one outdated exact query expectation and one new test suite failing to load the authentication ESM dependency. The expectation now checks the stronger relation scopes; the focused service test uses the existing authentication-boundary mock pattern. Production authentication was unchanged. The first database attempt exited with evidence-file `EPERM` (`98ac62`); its lifecycle outcome was not retained and is not counted as a pass. The guarded rerun was authorized by automatic review and saved evidence successfully. An earlier pre-compaction test receipt was unavailable and is not counted.

## Inputs and procedure

The next UI batch must expose these steps in the existing reconciliation workspace, `/en/dashboard/finance/reconciliation` and `/fr/dashboard/finance/reconciliation`. No preparation button is delivered in this batch.

1. Select the existing run. Its ID comes from the server-owned reconciliation list/detail.
2. Review the source and resolve the reported prerequisite. Source records come from authorized provider-event ingestion or statement import; accounting setup comes from the accounting administrator; exception/financial decisions come from their existing independent workflows.
3. Enter a short, meaningful review reason. The server generates the evidence revision; the client retains a generated UUID for the exact request. Users should not invent either value.
4. Confirm current password assurance and submit preparation. Retain the returned receipt ID and actual current status. If the result is uncertain, retry the same request.
5. An independent authorized signer reviews current evidence through the existing sign-off workflow. Preparation is not approval. If source/setup changed, refresh the preparation preview and submit a newly reviewed request.
6. Use source-owned recovery for a signed financial correction. Browser reset or old preparation replay cannot undo a recorded decision.

## Rollout and recovery

No schema migration, seed deployment, production activation, external message, payment or X1 decision was performed. Verify the new actions and their module surface in an isolated browser cohort before releasing their UI. Do not activate preparation on customer data without the applicable release authorization.

If preparation fails before commit, its transaction rolls back. After an uncertain response, retry its original key rather than creating a duplicate request. Preserve private receipts, audit events and run metadata. Do not delete preparation pointers or directly reset signed statuses. Rolling code back after real preparations requires retaining the signer evidence validation; reverting to a signer that ignores preparation would remove the new protection.

## Review responsibilities and remaining work

Architecture/backend/data: shared validator, transactional ownership and source bindings verified in focused tests and PostgreSQL. Security/IAM/privacy: server action policy, scope injection, freshness, independent signer and private receipt boundaries reviewed; complete transport/browser entitlement permutations remain open. Finance/ledger/audit: no preparation posting, actual signed recovery and retained evidence verified with synthetic data. QA/release/SRE: rollback, duplicate concurrency, source-stable evidence verified; production performance, cohort rollout and full release verification remain open.

Frontend/design-system/UX/accessibility/localization: no presentation change in this batch; preparation UI, typed guidance, history/recovery, EN/FR and actual browser verification are required next. API/events/operations: protected actions and transactional in-app notification exist; operator presentation is pending. Commercial packaging: existing module enforcement retained; no price/terms change. Statutory/country-pack certification: not applicable to this transition; no statutory rule changed or expert approval claimed. POS/offline, purchasing/AP, HRIS/payroll, analytics and AI/agents: not applicable to this bounded change; their separate workflow reviews remain in the platform register.

Other required engineering: nonfinancial investigation and legacy/domain terminal-evidence adapters, complete source-allocation policy, broader concurrent and restricted-grant cases, real provider assurance, and every remaining platform workflow. No whole-workflow completion or platform certification is claimed.
