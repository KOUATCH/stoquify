# Staged progression and rollback

1. **Engineering review now:** review the gate, fixture and build-verifier diffs and their red/green tests. Retain exact fixture source/dependency hashes and fail mode. Do not execute fixture stock setup against application data. Every dedicated disposable target still needs its own authorized setup before a real fixture run.
2. **G1 owner review:** assign actual people to the roles in [approval-packets.md](approval-packets.md); review all 11 exact selected options, resolve the stale declared workstation matrix and decide any contract revision. The existing register has no authentic approvals. Security/IAM and CI owners must designate the actual attestation issuer and provision its public trust anchors independently. See [approval-verifier-contract.md](approval-verifier-contract.md).
3. **Candidate and G2:** after G1, freeze a reviewed candidate boundary, reconcile the old candidate declaration and all 18 work packages against current source, then execute outstanding cart/concurrency/access acceptance. The prior 21 real PostgreSQL cases and completed postingCycle migration are reusable scoped evidence, not a substitute for missing scenarios. No application migration should be repeated.
4. **G3A/G3B and G4/G6:** obtain real provider sandbox, qualified country/independent review and named hardware/exclusion evidence. Implement later-gate business changes in dependency order. Keep unsupported electronic/offline/statutory/device/fulfillment behavior unavailable until its explicit scope is approved and proven.
5. **G5/G7/G8:** prove full close and delivery/returns cycles, source-linked corrections, operational drills, production configuration and complete candidate build. Capture real EN/FR cashier, device, accessibility and actual viewport evidence with authorized accounts.
6. **G9:** request a separate bounded pilot decision only when the entry package is complete. Each cohort requires an entry snapshot, accountable owner, operating limits, daily evidence review, stop-condition evaluation and signed expansion/rollback decision.

## Required owner inputs

Actual names have not been supplied. The first actionable handoff is to identify the product/retail owner, controller, payments/treasury owner, security/IAM owner, inventory/fulfillment owner, QA/support/SRE owner and qualified Cameroon/accounting reviewers. Several roles may be held by one person only where approved segregation-of-duties policy permits it; this task does not decide that policy.

The issuer/trust setup is necessary because arbitrary typed names and hashes previously passed the gate. Reuse the organization's approved authenticated approval/signing system if one exists; adapt its verified attestations to the documented envelope. Do not turn the unit-test signing key or this agent into a production approver. Evidence preparation has not sent messages to those owners.

## Stop and rollback

Stop promotion for cross-tenant/location access, duplicate financial or stock consequence, false paid/recorded states, unsupported tender activation, fiscal/ledger/stock mismatch, lost evidence, unowned exceptions, or unverified/expired approvals. Maintain visibility and ownership of existing exceptions during a stop.

For a fixture-guard regression, leave the fixture disabled and repair/review its isolation; do not restore the marker exemption. For verification defects, retain BLOCKED status while correcting the verifier and its tests. Do not revert the entire dirty worktree or discard others' changes. No data migration rollback applies because this run changes no database.

The application build uses `.next-pos-gates-20260924` with cleanup disabled. It does not replace running application output or deploy anything. Preserve its actual result and source/configuration provenance; restore only verified run-generated configuration changes. A successful local build does not establish Linux CI, physical peripherals, production secret custody, load/restore drills or pilot readiness.
