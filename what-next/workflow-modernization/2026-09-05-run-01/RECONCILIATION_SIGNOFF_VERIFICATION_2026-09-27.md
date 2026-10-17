# PR-10 sign-off corrections and current verification

Evidence date: 2026-09-27 UTC. Branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`, with preserved shared working-tree changes. **PR-10 is In progress, not a completed workflow.** The full modernization goal remains active. Current counts are maintained in [CURRENT_PROGRESS.md](CURRENT_PROGRESS.md).

## Delivered corrections

### Valid committed signatures survive request ordering

An earlier request can wait for a connection while a later request signs first. The former implementation compared the retained certificate's signing timestamp with the waiting request's start time and rejected a valid certificate as inconsistent. The [failing real-database reproduction](lanes/environment/signoff-request-order-650d128d-7527-4f4f-a4b7-e6f664a0b331.json) used an actual service-created signature.

`payment-reconciliation-certification.service.ts` now validates retained evidence against its observation time. A newly created signature must still agree with its request clock, and a signature later than the observation time is rejected. Existing identity, integrity, revision and authority controls remain in force. Same-signer retry and another-signer completion return the one retained certificate without creating another audit/event or financial effect.

### Current sources must have a retained disposition

A ready run could receive new verified provider evidence without receiving a corresponding match or exception. A fresh review then offered sign-off with the new source hash but old run results. The [baseline reproduction](lanes/environment/signoff-request-order-b7a20a39-6779-4b58-96d2-4ec830768edc.json) stopped before signing this unsafe state.

`payment-reconciliation-evidence.service.ts` now optionally requires complete coverage. Preparation and signing enable it: each current payment, provider event and statement line must be represented by a completed match or an independently verified closed exception. Candidate/rejected/voided matches and unresolved exceptions do not satisfy this rule. The existing manifest format and hashes are unchanged for equivalent evidence; historical export does not silently acquire a new manifest format.

The service returns `UNRECONCILED_SOURCES` for this condition, and existing preparation/sign-review components display specific EN/FR guidance. This is distinct from uncertain provenance. No approval or readiness is inferred from record counts. No new schema, migration, ledger or billing behavior was introduced.

## Verification and retained attempts

All commands use the configured Node runtime and inspected repository tools. Jest is the existing test runner; TypeScript uses the exact migration-free `typecheck` script arguments. No default build, migration or seed wrapper was invoked for this checkpoint.

| Check | Result and evidence |
|---|---|
| Delayed first request, same/different signer | Passed with actual HMAC capture, matching and service-created signature. |
| Simultaneous real Serializable transactions, same/different signer | Passed: both observe ready state; one certificate, one signing audit/event, no new journal. All four current cases: [receipt](lanes/environment/signoff-request-order-e81e719d-f40d-408c-b239-e0900c1e1dd2.json). |
| Late provider event, refreshed review, direct commit without preview hashes | Passed: specific blocker, no signable revision, direct signing refused, no signing audit/event. Same-date rerun also rejected with original run/match retained: [receipt](lanes/environment/signoff-request-order-3fe31c03-b0bf-4791-a97d-a5dd2fea7c46.json). |
| Genuine closed-exception preparation/sign/export/reversal regression | [Five lifecycle assertions passed](lanes/environment/run-preparation-v114-cc12ed82-2d1.json): unresolved obligation and denied actors, rollback, concurrent preparation/exact retry, independent sign/export, reversal reopening/invalidation, and missing external evidence refusal. Source was stable during execution. The subsequent change only specializes the uncovered-source error class/blocker and locale copy; the positive coverage predicate and successful lifecycle are unchanged. This is explicitly reused evidence, not a new execution against the final hashes. |
| Focused tests | 78/78 across certification, manifest, preparation and sign-review actions: [Jest receipt](evidence/signoff-coverage-guidance-tests-2026-09-27.json). Includes payment/event/statement coverage, acceptable and unacceptable dispositions, source drift, authority, future timestamp and replay controls. |
| Changed-file lint | Four changed TypeScript files, zero errors/warnings: [receipt](evidence/signoff-lint-2026-09-27.json). |
| TypeScript | Compiler exit 0, empty diagnostics, unchanged bound source during execution: [receipt](evidence/signoff-typecheck-ea7da870-e033-46a8-a406-6ca377fd3a16.json). |
| Browser/accessibility | New blocker copy is connected through existing translation keys; no new browser or contrast/enlargement execution claimed. Existing v117–v119 evidence requires the remaining current-binding review. |

Exact focused command: `node node_modules/jest/bin/jest.js --runInBand --runTestsByPath services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts services/reconciliation/__tests__/payment-reconciliation-evidence.service.test.ts services/reconciliation/__tests__/reconciliation-run-preparation.service.test.ts actions/payments/__tests__/reconciliation-sign-review.actions.test.ts --json --outputFile=what-next/workflow-modernization/2026-09-05-run-01/evidence/signoff-coverage-guidance-tests-2026-09-27.json`.

Runtime commands: `node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-signoff-request-order.cjs`, repeated with `--source-arrival`; preparation regression uses `verify-run-preparation-v114.cjs`. Typecheck: `node node_modules/typescript/bin/tsc --noEmit --pretty false`. Lint uses `node node_modules/eslint/bin/eslint.js` and the two changed services plus their two test files.

Failed attempts remain retained. The first source-coverage test run had 73 passes/four fixture failures (missing `receivedAt` and a read-only mocked export); corrected fixtures yielded 77 passes, then the new blocker test raised the final count to 78. No production rule was relaxed. One race fixture initially landed both requests in the same millisecond; a controlled 5 ms start separation made its intended ordering measurable. The first typecheck compiler passed but source changed during execution, so its receipt correctly reports `passed:false`; it was replaced by the stable run above. Final Jest tests initially passed but the sandbox denied the output-file write; the authorized retry retained the passing receipt. No automatic approval rejection occurred.

The database is the existing guarded disposable `stoquify_local_registration_20260906_01`. Fixtures assert loopback target, database identity and organization ownership before writes. Provider authentication uses synthetic HMAC secrets; settlement setup is synthetic. External fetch is disabled. No real payment, external notification, production activation, reset or deployment occurred.

## Remaining engineering work and operator instructions

1. **Late-source recovery is not implemented.** The current same-provider/date run is unique, and previously allocated evidence cannot simply be allocated again. The reproduced rerun refusal confirms this is an engineering gap, not missing organizational approval. Preserve existing run/matches/history. Next: implement a controlled way to incorporate additional sources, invalidate obsolete preparation, and require renewed independent review without duplicate allocations or financial effects. PR-10 remains primary; PR-19 owns the preparation contract.
2. **Notification delivery is not established.** Signing transactionally creates a `payment.reconciliation.signed` NOTIFICATION outbox entry. The generic worker supports claiming, retry and delivery states, but targeted production-source search found no event-specific signing handler. An outbox row proves durable intent, not recipient delivery. Complete the operator/recovery handoff to the existing notification workflow before claiming closure.
3. Finish current authority/binding reconciliation, EN/FR browser recovery, rendered contrast/text enlargement and targeted entry latency measurements. Native screen-reader speech, browser-chrome zoom and production performance remain unverified.

For a blocked run, the reconciliation owner needs the tenant, provider, business date and run ID displayed in review, plus the additional provider event/payment/statement references from source records. Retain those records and escalate for the engineering recovery path; do not delete matches, edit certificate evidence or repeatedly start another run. No new approval document will repair this source-allocation gap.

For a submitted request whose response was lost, use the existing exact retry from the same review. A valid completed signature returns its retained certificate; another authorized signer's completion is identified. If the evidence changed, obtain a fresh review and resolve the stated condition. Existing signer authority/fresh authentication and certificate-export permissions still apply.

Review routes: `/en/dashboard/finance/reconciliation` and `/fr/dashboard/finance/reconciliation` in the existing authenticated application. No verification server is promised to be running after this checkpoint.

## Review accountability and skill record

Applied skill: `009-aqstoqflow-payment-reconciliation-moat`, using its chunk blueprint. Historical referenced spec files were unavailable; current source, recorded contracts and the explicit user assignment define this bounded change. Graph payment/ledger/certification relationships were used as discovery aids and checked against source.

| Responsibility | Evidence or scope decision |
|---|---|
| Architecture/backend/data | Service-owned coverage and retained-signature recovery; real transactions and original-record preservation. No schema change. |
| Security/IAM/privacy | Existing server identity, fresh authentication, tenant and independent signer controls retained; focused denial tests and preparation lifecycle regression. No private source payload added to UI. |
| Finance/ledger/audit/close | Complete source disposition, one certificate/audit/event, no duplicate journal, verified financial exception closure and reversal invalidation. |
| Frontend/workflow/localization/accessibility | Existing sign-review/preparation rendering and semantic tokens reused; specific EN/FR blocker added. New browser/accessibility proof remains outstanding. |
| Product/quality | Valid retry restored and unsafe sign-off refused. Recovery gap remains explicit; patch completion is not workflow completion. |
| SRE/API/events/operations | Four real ordering cases, durable event intent, generic worker trace. Event-specific delivery and performance remain open. |
| SaaS/modules/packaging | Existing module boundary retained. No subscription/price/entitlement policy changed. |
| Statutory/country rules | No rule change; no legal/accounting certification claimed. |
| POS/offline, purchasing, HR/payroll, analytics and AI | Not applicable to changed behavior: no corresponding domain operation, projection or model modified. |

Files changed: the two reconciliation services, their two focused test files and `messages/en.json`/`messages/fr.json`; verification helpers and this workflow's evidence/register/progress documents. Passed gates: focused tests, lint, stable typecheck, actual signing races and late-source refusal. Open gates: retained-record recovery, event/operator handoff and remaining browser/operational closure. Skill sequence recommends `010` for inventory-boundary work only when that workflow becomes active; it does not justify switching away from unfinished PR-10.

Digest closure is preserved with a strict comparison: remove only the newly added `UNRECONCILED_SOURCES` label and every previous dictionary byte matches its historical closure hash. The original closure receipt remains intact; the comparison is recorded in `evidence/current-reconciliation.json`.
