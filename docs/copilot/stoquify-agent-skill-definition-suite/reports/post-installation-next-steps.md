# Post-Installation Activation and Rollout Plan

## Immediate — Reload and discovery smoke test

1. Reload Codex or start a new task so the global discovery index reads the newly installed definitions.
2. Confirm all 9 `stoquify-*` agents and 28 `stoquify-*` skills appear in discovery.
3. Invoke one harmless read-only case for S01, S02, S03, S09, S17, the Command Agent, and the Exception/Action Orchestrator.
4. Verify non-enumerating denial, stale-evidence labeling, French/English parity, prompt-injection isolation, trace creation, and no business side effects.

Exit gate: discovery and read-only smoke tests pass with tenant isolation and evidence references.

## Wave 1 — Runtime foundation in shadow mode

Implement the production runtime behind feature flags for S01–S12, S17, S18, the Stoquify Command Agent, and the Exception/Action Orchestrator. Connect only registered read models and control-plane persistence. Add exact service-function allowlists, server-derived tenant/RBAC/module context, redaction, evidence fingerprints, run-state storage, model/cost routing, observability, suspension, and rollback.

Do not enable business writes.

Exit gate: the designed access-control, malformed-input, dependency, adversarial, bilingual, stale-evidence, suspension, and rollback cases execute successfully in a non-production or shadow environment.

## Wave 2 — Execute the evaluation catalog

Turn the 999 designed cases into executable fixtures and record results using the evaluation-result contract. Add representative tenant, role, module, location, country-pack, offline/replay, provider-timeout, approval, and prompt-injection datasets.

Exit gate: no unresolved critical/high invariant, calibrated quality and latency baselines, and a proven kill switch.

## Wave 3 — Read-only domain pilots

Enable the Cash/Reconciliation and Inventory/Replenishment agents for a small set of consenting organizations. Keep outputs explanatory or proposal-only. Calibrate reconciliation thresholds, inventory confidence, stale-data rules, and user correction workflows.

Exit gate: measured accuracy, evidence coverage, denial correctness, correction rate, latency, cost, and support burden meet approved thresholds.

## Wave 4 — Approval-enabled drafts

Enable expiring drafts only: reconciliation resolution packets, reorder/transfer proposals, and draft purchase orders. Require exact tool contracts, checkpointing, maker-checker separation, fresh authentication, evidence revalidation, idempotency, unknown-outcome reconciliation, and one-time approval consumption.

Exit gate: canary, failure injection, ambiguous timeout, suspension, and rollback drills pass. No autonomous fund movement, posting, close, payroll approval, declaration, write-off, or certification.

## Wave 5 — Next and later capabilities

Sequence Purchasing/AP, Close/Compliance, Payroll/Workforce, and Customer Success/Adoption only after their data foundations and country-pack or telemetry prerequisites are proven. Payroll remains aggregate/readiness-focused and country-pack-bound. Customer-success automation remains blocked until consented product telemetry is reliable.

## Recommended next implementation slice

Start with the read-only foundation: S01–S12, S17, S18, the Command Agent, and the Exception/Action Orchestrator. Build the runtime registry loader, secure context resolver, permission/entitlement gate, evidence adapter, redaction boundary, run-state journal, and read-only smoke-test harness before connecting any business-write tool.
