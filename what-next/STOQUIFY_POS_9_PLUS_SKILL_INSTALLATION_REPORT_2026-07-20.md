
# Stoquify POS 9+ Skill Installation Report

Date: 2026-07-20

## Outcome

Installed all 19 approved POS specialist skills under:

C:\Users\J COMPUTER\.codex\skills

No product code, schema, configuration, tests, migrations, or application artifacts were modified during installation.

## Installed suite

### Program

- stoquify-pos-9plus-program-orchestrator

### Financial, session, and corrections

- stoquify-pos-tender-accounting-truth
- stoquify-pos-shift-drawer-invariant
- stoquify-pos-provider-payment-lifecycle
- stoquify-pos-returns-reversal-controls
- stoquify-pos-payment-reconciliation-certifier

### Offline continuity and trust

- stoquify-pos-offline-durable-edge-queue
- stoquify-pos-offline-device-trust
- stoquify-pos-offline-replay-finalizer
- stoquify-pos-offline-conflict-operations

### Access and experience

- stoquify-pos-access-trust-hardener
- stoquify-pos-cashier-workstation-ux
- stoquify-pos-device-adapter-certification
- stoquify-pos-receipt-delivery-proof
- stoquify-pos-country-pack-money-localization
- stoquify-pos-responsive-accessibility-certifier

### Operability and assurance

- stoquify-pos-operability-slo-runbook-builder
- stoquify-pos-chaos-field-certifier
- stoquify-pos-release-gate-governor

## Installed anatomy

Every skill contains:

- A concise SKILL.md with only name and trigger-oriented description frontmatter.
- agents/openai.yaml with display name, short description, and a default prompt that explicitly invokes the skill.
- references/execution-contract.md with roadmap ownership, G1-G8 meanings, handoff schema, and stop conditions.

The program orchestrator additionally contains:

- references/skill-suite-manifest.json
- scripts/validate_suite.py

The validator is deterministic and read-only.

## Validation

| Check | Result |
|---|---|
| System quick_validate.py | 19/19 PASS |
| Suite manifest validator | 19/19 PASS |
| Required files | Complete |
| Frontmatter | Minimal and valid |
| UI metadata | Present and skill-addressable |
| Remaining TODO placeholders | None |
| SKILL.md size | 53-55 lines each, below 500-line limit |
| Unknown stoquify-pos-* folders | None |

The bundled document Python lacked PyYAML, so the required system validator was executed with the workspace Python 3.12 runtime, which provides PyYAML 6.0.3.

## Forward-test results

### Program orchestrator

Result: BLOCKED.

Correctly selected GOV-01 as the only dependency-safe next work package, detected that D-01 through D-08 remain unresolved, preserved HP-1, refused specialist implementation, and identified stale proposed-not-installed catalog status.

### Tender/accounting truth

Result: NO-GO for G1 and G6.

Correctly found that STORE_CREDIT lacks an authoritative balance/redemption instrument and that electronic tenders can become PAID from operator-entered evidence without authoritative provider acknowledgement.

### Shift/drawer invariant

Result: BLOCKED, with G2 failed and G5 not demonstrated.

Correctly found the out-of-transaction shift-open precheck, missing database active-session invariant, incomplete drawer ownership model, unresolved D-02, and missing real-database concurrency/migration evidence.

### Access trust

Result: NO-GO for G5; G4 evidence incomplete.

Correctly found inconsistent POS module entitlement across route, navigation, cart, session, catalog, sync, tender, and receipt surfaces while recognizing receipt-token and cash-payment-history actions as positive references.

## Iteration from forward testing

One forward test produced an ambiguous clean-worktree observation from the wrong execution context. All 19 skills were therefore hardened to:

1. Resolve the intended repository with git rev-parse --show-toplevel.
2. Stop if execution is not inside that repository.
3. Run git status --short from the exact resolved root.

Both validators passed again after this change.

## Execution readiness

The skill suite is installed and ready for controlled use. The POS itself remains NO-GO for a 9+ claim.

The next permitted operation is:

> Use $stoquify-pos-9plus-program-orchestrator to execute GOV-01 only: reconcile the installed-skill status, create the versioned program status and decision registers, bind evidence to a candidate identity, reserve mutation boundaries, and prepare the next dependency-safe handoff. Do not implement product code. Stop at HP-1 until D-01, D-02, D-07, and the G1/G2/G5 design contracts are approved.

