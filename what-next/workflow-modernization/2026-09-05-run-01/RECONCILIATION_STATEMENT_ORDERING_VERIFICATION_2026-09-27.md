# PR-10 — statement recovery and transaction ordering

Evidence date: 2026-09-27. Branch `codex/migration-control-plane-release-2026-08-29`; HEAD `62a56036a5ac9b37236a20c9b148052199069479`, with existing shared changes preserved. PR-10 remains **In progress**. No workflow is newly closed. This milestone adds real database verification and confirms a specific remaining implementation gap; it does not change application code.

## Verified outcomes

| Criterion | Actual result | Receipt |
|---|---|---|
| Additional statement/payment lifecycle | Actual adapter import, one new 25.00 XAF allocation, original 100.25 allocation unchanged, fresh preparation, independent signature, verified certificate export, old recovery replay returns signed state; no journal entries | [Initial receipt](lanes/environment/recovery-statement-2b1e8a8c-4429-457b-bc24-6d7ac7ac98a1.json), first successful check only |
| Immutable source | Attempted statement-file hash change rejected by PostgreSQL. Complete file row and reconciliation records unchanged; preview revision remains valid; recovery adds exactly one match, no journals | [Corrected hypothesis](lanes/environment/recovery-statement-f40e3fe8-59b7-4056-96d2-e7374c09d0d0.json) |
| Signing commits before recovery | Actual Serializable signing transaction starts before new evidence arrives, recovery reads the earlier run, signing commits first, stale recovery fails with no effects. One signed event; original allocation retained; unsigned recovery cannot reopen signed evidence | [Two ordering cases](lanes/environment/recovery-reverse-order-a6d00e74-0d8a-4124-980d-45a79ddfbcb4.json) |
| Preparation commits before recovery | Earlier preparation commits first; stale recovery fails without effects. A newly reviewed recovery succeeds, adds one match and requires preparation again | Same ordering receipt |
| Late evidence for retained payment | Actual imported statement agrees with the existing payment's provider, transaction ID, reference, amount, currency and direction. Recovery retains the sole original allocation, creates an investigation exception, prevents preparation and refuses financial closure; no new payment or journal | [Reproduction](lanes/environment/retained-statement-investigation-9bc7a155-4031-4d96-b51b-a8ab5439b1e2.json) |

The initial statement receipt has `passed:false`: its positive lifecycle succeeded, but the subsequent test incorrectly assumed the statement file hash could be changed. The database immutable-evidence trigger rejected that operation. This is a rejected test hypothesis, not a source mutation defect. The corrected verifier asserts this protection; no trigger was disabled and no evidence edited to manufacture a race.

Reverse ordering controls actual transaction scheduling through barriers after real run reads. It preserves service queries, returned data and transaction isolation. It complements the earlier checks where recovery committed first. A signer's transaction snapshot can precede later source arrival; this does not mean the later evidence was included in that signature or permit silently replacing the signed certificate. The signed-source recovery workflow remains necessary for that case.

## Confirmed engineering requirement

`payment-reconciliation-run.service.ts` routes a late source that touches retained references to `MANUAL_REVIEW_REQUIRED` / `ADDITIONAL_EVIDENCE_FOR_RETAINED_SOURCE`. This prevents duplicate allocation. `payment-exception-closure.service.ts` exposes `INVESTIGATION_REQUIRED`, and `payment-exception-closure-evidence.service.ts` deliberately restricts financial closure to financial exception types. The current manual-match writer does not implement exception disposition. No implemented nonfinancial decision path was found in the inspected reconciliation services and actions.

The reproduced case is ordinary corroborating statement evidence, not merely a different transaction reusing an ambiguous reference. Completing PR-10 requires a reviewed nonfinancial disposition that binds this source to the retained allocation, validates exact source identity and compatibility, keeps the original match unchanged, provides independent current authority and durable decision history, and makes preparation/sign-off coverage consume that verified decision. It must reject conflicting amounts, currencies, directions, identifiers and already claimed sources. It must not create another payment, post money or let a financial write-off establish source truth. This is engineering work, not missing organizational approval.

Next bounded implementation: define and implement that disposition using the existing proposal/independent-decision and retained-receipt conventions, then connect the existing exception panel and verify the genuine late-statement case end to end. Preserve the unresolved state until that implementation exists. No new workflow ID or completion-count subdivision is needed.

## Commands, environment and evidence reuse

All commands used the bundled Node executable at `C:\Users\J COMPUTER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe` from the repository root:

```text
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-recovery-statement.cjs --drift-only
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-recovery-reverse-order.cjs
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-retained-statement-investigation.cjs
```

The full initial statement verifier ran before compaction in this execution. It is retained as the failed attempt above rather than rewritten as an overall pass. `--drift-only` avoids repeating its already successful lifecycle. Each new receipt reports unchanged before/after application hashes. The milestone binding receipt checks those hashes against current source and also binds the verification scripts and immutable-evidence migration.

The existing ownership guard verifies loopback database `stoquify_local_registration_20260906_01` and synthetic tenant ownership before writes. Imported services use the guarded client; external fetch is disabled. No migration, reset, live approval, payment, deployment or external notification was performed. All verification processes completed; no application server was started for this milestone.

Application source and UI are unchanged, so the prior focused unit/lint/TypeScript and EN/FR browser results remain relevant within their recorded bindings. They were not rerun or relabeled as new evidence. This milestone provides no new accessibility or latency result.

## Review and remaining scope

Backend/data/security/finance/audit review: real concurrency and no-duplicate/no-journal effects pass; immutable source protection is verified. The nonfinancial investigation gap remains open. Product/workflow review: common callback-then-statement arrival must have a complete reviewed path, not an unexplained permanent block. Quality/SRE review: guarded environment, deterministic scheduling and source bindings retained; volume, entry latency and production operation remain unverified. Frontend/accessibility/localization review: no UI change; remaining sign-review checks stay open. SaaS/access review: no entitlement change; current authority evidence still needs its final reconciliation.

Statutory/country-rule changes, payroll, purchasing, POS, inventory, AI behavior and commercial packaging are **not applicable to this milestone** because their rules, records and interfaces are unchanged. No professional certification is claimed.

Remaining PR-10 criteria: nonfinancial retained-source disposition, signed-source recovery boundary, source-volume review, remaining current-authority/sign-review accessibility evidence and entry-latency diagnosis. Live worker scheduling and exhausted-message repair/requeue remain separately unverified operating boundaries. The full platform goal is active; discovery remains incomplete.

Current source/script/migration binding: [statement-ordering-bindings-99e48012-2f68-4adb-949c-9baf7a6b5f70.json](evidence/statement-ordering-bindings-99e48012-2f68-4adb-949c-9baf7a6b5f70.json).
