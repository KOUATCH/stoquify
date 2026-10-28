# WP7 decision — gate ratchet and PostgreSQL certification

Decision date: `2026-08-22`  
Decision: `APPROVED_FOR_WP8_INTERNAL_RATIFICATION_ONLY`  
Production authorization: `NO`

## Decision basis

WP7 closes the false-confidence gap in the former 14-check payroll-presence gate without modifying payroll product workflows. A dedicated Payroll Trust Spine gate is now policy-wired and checks the persisted five-stage lifecycle, disabled collapsed shortcut, canonical transactional events, protected server-derived trust context, CAS/idempotency/rollback coverage, and the live PostgreSQL certificate.

The gate passes `6/6`. Eight negative mutations plus the ready fixture prove that it fails if a lifecycle stage, collapsed-command guard, canonical final event, fresh-auth fact, tenant derivation, CAS rollback evidence, PostgreSQL failure-injection evidence, or policy-chain entry is removed.

## Live PostgreSQL evidence

The guarded harness reset only `localhost/stockflow_immutability_test`, replayed all `76` migrations, and ran real serializable transactions.

- Concurrent approval: exactly `1` winner and `1` loser (`SQLSTATE 40001`).
- Winning commit: `1` transition, `1` canonical event, `1` outbox row, and `1` audit row, all linked to the same committed event.
- Duplicate evidence attempt: rejected (`SQLSTATE 23505`) with committed counts unchanged.
- Failure injected after CAS and before commit: run remained `REVIEWED` version `2`; approval transition, event, outbox, and audit counts were all `0`.

## Verification

- Focused WP7 matrix: `6/6` suites and `69/69` tests passed.
- Trust-spine mutation gate: `6/6` checks ready; `9/9` gate tests passed.
- PostgreSQL certification: `3/3` checks passed.
- Typecheck: passed with no diagnostics.
- Prisma validation: passed.
- Focused ESLint and diff hygiene: passed.
- Service boundary: zero active violations.
- Payroll presence: `14/14`.
- Purchasing/AP: `11/11`, including `goods_receipt_atomic_stock_posting`.
- Report trust: `35/35` using the unlocked WP7 evidence path.
- Offline POS: `16/16`.
- Workflow assurance static release: `38/38`.
- CI release configuration: `11/11` using the unlocked WP7 evidence path.
- Policy-wiring contract tests: `11/11`.

## Honest limits

The monolithic `policy:gates` rerun stopped before its known statutory check because Windows locked the unrelated generated file `what-next/ai-copilot-guardrails-readiness.md`. Relevant gates were run independently and passed. The earlier full chain established the separate production blocker `source_artifact_expert_approval` at statutory readiness `11/12`; that approval remains absent.

The broad inherited dirty tree, missing exact-hash approvals for inherited destructive migrations, inherited raw-error findings, external production credentials/provider evidence, and statutory expert approval continue to prohibit clean-candidate, production, statutory, or regulator claims.

## Promotion

WP8 is authorized only to replay the live 012 payroll, 013 data-trust/accountant-portal, and 014 offline-POS gates against current evidence and replace stale sequencing conclusions. It may not modify unrelated product code or convert internal evidence into a production claim.
