# Customer Statement Entitlement Activation Certification - 2026-08-09

## Result

The customer-statement referral workflow is certified at the application entitlement boundary.

The workflow uses the existing `accounting` commercial module. It does not introduce a speculative referral module or force a second Sales entitlement. Customer visibility remains governed by `customers.read`; immutable statement creation and sharing remain governed by `accounting.exports.create` plus the Accounting module.

## Enforced surfaces

| Surface | Permission | Module intent | Enforcement |
| --- | --- | --- | --- |
| Customer statement page | `customers.read` and `accounting.exports.create` | Accounting export | Enforced and audited before customer lookup |
| Create immutable statement | `accounting.exports.create` | Accounting export | Enforced and audited |
| Queue consented delivery | `accounting.exports.create` | Accounting export | Enforced and audited |
| Revoke signed access | `accounting.exports.create` | Accounting write | Enforced and audited |

A denied page entitlement returns a locked-module state and performs no customer lookup. The three server mutations independently enforce the same tenant entitlement, so direct action invocation cannot bypass the page.

## Verification

- Exact action and route tests: 2 suites / 6 tests passed.
- Shared protected-action plus statement boundary regression: 3 suites / 16 tests passed.
- Canonical report-trust mutation suite: 1 suite / 318 tests passed, including negative mutations for missing Accounting action evidence and missing no-enumeration route evidence.
- Canonical live gate: 35/35 ready with zero blockers.
- Full TypeScript compiler: passed.
- Scoped ESLint: passed with zero findings.
- Production Next.js build: passed; post-build standalone output is valid and no orphaned build chain remains.

## Activation requirement

For an organization with an explicit `requestedModules` list, production provisioning must include `accounting`. Legacy organizations with an empty module list retain the catalog's compatibility behavior, but the pilot organization should receive an explicit Accounting entitlement and produce an audited allow decision before real recipients are invited.

This certification does not clear the separate migration-history, fresh-baseline, schema-drift, production-secret, provider, or real-user pilot gates.
