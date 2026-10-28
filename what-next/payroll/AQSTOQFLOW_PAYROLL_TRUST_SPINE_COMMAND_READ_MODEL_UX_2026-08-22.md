# Payroll Trust Spine — WP6 command read model and operator UX

Date: `2026-08-22`  
Outcome: `APPROVED_FOR_WP7_INTERNAL_ENGINEERING_ONLY`

## Delivered boundary

WP6 introduced a shared, pure lifecycle projection that turns a tenant-scoped payroll run and its persisted transition ledger into one server-owned operational truth. Both the command center and run workbench now consume that projection instead of independently inferring capabilities in the browser.

The projection reports current status/version, transition-proof classification, controlled-write availability, lifecycle completeness, stage evidence, blocking codes, and the next legal action. Legal stages are calculate, review, approve, emit, and post. Each action carries its required permission, fresh-auth requirement, and independent-actor requirement.

The UI calls the existing protected transition actions with only the run identifier, expected version, idempotency key, optional evidence hashes, and UI metadata. It cannot assert organization, actor, permission, or authentication facts. Those remain derived at the server boundary.

## Control effects

- Modern post-cutover runs with missing transition proof are blocked.
- Legacy partial evidence remains visible and cannot become verified merely through read projection.
- Disabled controlled writes are visible and block mutation controls.
- Raw actor identifiers are not disclosed by lifecycle proof projections.
- A run is not marked ready merely because it exists; readiness requires verified lifecycle evidence or a clearly disclosed next action/blocker.
- Operator controls reflect server authorization and blockers without recomputing permission or tenant scope client-side.

## Verification outcome

Focused verification passed `61/61` tests across eight suites, plus typecheck, lint, diff hygiene, and the two targeted payroll route/browser smoke cases. The service-boundary, payroll-presence, purchasing/AP, report-trust, offline-POS, workflow-assurance, and CI release gates all remained green.

The broad route smoke retained its two pre-existing failures and added none. The full policy sequence stopped at the known external statutory approval requirement (`11/12`). Therefore this package is internally ready for WP7 but does not authorize production, statutory, or regulator claims.

## Next authorized package

WP7 must make these guarantees enforceable rather than descriptive: ratchet the payroll gate against lifecycle shortcuts and client-supplied trust facts, add mutation fixtures that prove the gate detects regressions, and certify winner/loser, idempotency, and rollback behavior against disposable PostgreSQL with failure injection. Promotion to WP8 requires saved live evidence and zero HIGH/CRITICAL invariant failures.
