
# Verification — PO Receipt Invoice Variance

## Structural

- Validate frontmatter name equals `stoquify-po-receipt-invoice-variance` and contains only `name` and `description`.
- Validate `agents/openai.yaml` and confirm the default prompt invokes `$stoquify-po-receipt-invoice-variance`.
- Parse both JSON schemas and `references/capability-contract.json`.
- Confirm every dependency exists in the registry and the DAG is acyclic.

## Behavioral minimum

- Five nominal cases.
- Five malformed or boundary cases.
- Five tenant, RBAC, location, or entitlement denial cases.
- Five dependency or recovery cases.
- Five prompt-injection or adversarial cases.
- English and French parity cases.
- Stale, missing, contradictory, redacted, partial, and unavailable evidence cases.
- Domain-specific risk cases for `critical` risk and `draft` autonomy.

## Release

Require objective evidence, no unresolved critical/high invariant, feature-flag rollout, suspension path, rollback target, and named owner. A source-candidate package is not production certification.
