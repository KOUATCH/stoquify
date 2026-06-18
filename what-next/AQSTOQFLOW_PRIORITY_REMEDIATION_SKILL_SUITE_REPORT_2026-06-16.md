# AqStoqFlow Priority Remediation Skill Suite Report

Date: 2026-06-16

## Extracted Priorities

- `priority-001-green-baseline-ratchets`: Preserve the current green AqStoqFlow baseline before priority remediation changes continue.
- `priority-002-service-boundary-ratchets`: Ratchet App Router, actions, hooks, and components away from direct Prisma and action-owned business mutation.
- `priority-003-tenant-rbac-maker-checker`: Harden tenant scope, RBAC, and maker-checker controls across protected service and action boundaries.
- `priority-004-inventory-item-action-migrator`: Finish migration of inventory and item actions into service-owned stock, item, transfer, reservation, count, adjustment, and write-off workflows.
- `priority-005-purchasing-ap-consolidator`: Consolidate legacy purchase-order behavior into the statutory purchasing/AP service path.
- `priority-006-hard-delete-immutability`: Add and enforce hard-delete policy for evidence-bearing AqStoqFlow records.
- `priority-007-error-response-normalizer`: Normalize raw errors into typed, user-safe enterprise errors across priority economic services, actions, and routes.
- `priority-008-demo-report-trust-cleaner`: Remove production-visible mock/demo paths and make reports display real provenance, freshness, and certification state.
- `priority-009-offline-pos-replay-finalizer`: Convert accepted offline POS envelopes into final POS, inventory, payment, fiscal, and ledger truth through controlled replay services.
- `priority-010-certification-assurance-hardener`: Harden close-pack certification readiness while preserving explicit statutory certification blockers.
- `priority-011-compliance-provider-integration`: Move production compliance, country-pack, payment provider, and statutory payroll integrations from represented blockers toward real readiness gates.
- `priority-012-ci-release-gate-modernizer`: Create a release-ready verification command that runs Prisma, typecheck, lint, tests, build, and policy gates.

## Ordering Rationale

The suite converts the enterprise examination priorities and latest scan findings into implementation-capable skills. It starts with the baseline and static boundaries because later domain migrations need reliable gates. Inventory and purchasing/AP come before certification and CI because stock, ledger, payment, and close evidence must be service-owned before release hardening can be truthful.

## Installed Skills

- `priority-001-green-baseline-ratchets`: Preserve the current green AqStoqFlow baseline before priority remediation changes continue.
- `priority-002-service-boundary-ratchets`: Ratchet App Router, actions, hooks, and components away from direct Prisma and action-owned business mutation.
- `priority-003-tenant-rbac-maker-checker`: Harden tenant scope, RBAC, and maker-checker controls across protected service and action boundaries.
- `priority-004-inventory-item-action-migrator`: Finish migration of inventory and item actions into service-owned stock, item, transfer, reservation, count, adjustment, and write-off workflows.
- `priority-005-purchasing-ap-consolidator`: Consolidate legacy purchase-order behavior into the statutory purchasing/AP service path.
- `priority-006-hard-delete-immutability`: Add and enforce hard-delete policy for evidence-bearing AqStoqFlow records.
- `priority-007-error-response-normalizer`: Normalize raw errors into typed, user-safe enterprise errors across priority economic services, actions, and routes.
- `priority-008-demo-report-trust-cleaner`: Remove production-visible mock/demo paths and make reports display real provenance, freshness, and certification state.
- `priority-009-offline-pos-replay-finalizer`: Convert accepted offline POS envelopes into final POS, inventory, payment, fiscal, and ledger truth through controlled replay services.
- `priority-010-certification-assurance-hardener`: Harden close-pack certification readiness while preserving explicit statutory certification blockers.
- `priority-011-compliance-provider-integration`: Move production compliance, country-pack, payment provider, and statutory payroll integrations from represented blockers toward real readiness gates.
- `priority-012-ci-release-gate-modernizer`: Create a release-ready verification command that runs Prisma, typecheck, lint, tests, build, and policy gates.

## Validation Results

All twelve installed `priority-###-` skills passed the official Codex `quick_validate.py` structural validator on 2026-06-16.

Placeholder sweep also passed:

```powershell
rg -n "TODO|PLACEHOLDER|<skill-name>|<domain>|<.*>" "C:\Users\J COMPUTER\.codex\skills" --glob "priority-*/SKILL.md" --glob "priority-*/agents/openai.yaml"
```

Result: no matches.

## Validation Plan

Validate every installed skill with:

```powershell
python "C:\Users\J COMPUTER\.codex\skills\.system\skill-creator\scripts\quick_validate.py" "C:\Users\J COMPUTER\.codex\skills\<skill-name>"
```

## Recommended Execution Sequence

1. priority-001-green-baseline-ratchets
2. priority-002-service-boundary-ratchets
3. priority-003-tenant-rbac-maker-checker
4. priority-004-inventory-item-action-migrator
5. priority-005-purchasing-ap-consolidator
6. priority-006-hard-delete-immutability
7. priority-007-error-response-normalizer
8. priority-008-demo-report-trust-cleaner
9. priority-009-offline-pos-replay-finalizer
10. priority-010-certification-assurance-hardener
11. priority-011-compliance-provider-integration
12. priority-012-ci-release-gate-modernizer

## Known Blockers

- Existing service-boundary findings remain and must be migrated domain by domain.
- Statutory certification remains blocked until real authority adapters, expert-reviewed country packs, and legal/accounting approval exist.
- Provider integrations must distinguish not-configured, sandbox-only, provider-integrated, and statutory-ready states.

## Next Skill To Execute First

Run `priority-001-green-baseline-ratchets` first unless a saved baseline already proves all current gates are green. Then continue with `priority-002-service-boundary-ratchets`.
