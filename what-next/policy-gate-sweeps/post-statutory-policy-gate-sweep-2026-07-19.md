# Post-Statutory Policy Gate Sweep - 2026-07-19

This sweep runs policy/release gates that are hidden when `npm run policy:gates` stops at `statutory:country-pack:gate`.

| Gate | Status | Exit | Duration | Key summary |
| --- | --- | ---: | ---: | --- |
| `report:trust:export:gate` | passed | 0 | 2.2s | Status: ready<br>- Checks ready: 9/9<br>- Blockers: 0<br>- ready: service_owned_accounting_export_data<br>- ready: versioned_self_describing_export_manifest |
| `role:cockpit:gate` | passed | 0 | 2.1s | Status: ready<br>- Checks ready: 9/9<br>- Blockers: 0<br>- ready: tenant_metadata_is_service_owned<br>- ready: route_propagates_roles_without_currency_override |
| `settings:surface:fail` | passed | 0 | 1s |  |
| `workflow:assurance:runtime-check` | passed | 0 | 2s | Status: `ready`<br>- Blockers: 0<br>- A passing result does not replace a healthy Prisma migration workflow for release. |
| `workflow:assurance:release-gate` | passed | 0 | 3.1s | - Enforce-mode status: `ready`<br>- Checks ready: 37/37<br>- Indexes ready: 6/6<br>- Engine-health gates ready: 2/2<br>- Blockers: 0 |
| `kontava:moat:release-gate` | passed | 0 | 2.1s | - Release status: `ready`<br>- Seed scenarios ready: 8/8<br>- Backfill checks ready: 6/6<br>- Release gates ready: 8/8<br>- Blockers: 0 |
| `receipt:token:config-gate` | passed | 0 | 2.1s | - Status: `ready`<br>- Checks ready: 4/4<br>- Blockers: 0<br>- Warnings: 1 |
| `payroll:immutability:runtime` | passed | 0 | 11.2s | Status: `ready`<br>- Forbidden mutation checks blocked: 14/14<br>- Allowed lifecycle checks passed: 3/3<br>- Blockers: 0<br>- blocked: block_run_update - P2010: PrismaClientKnownRequestError |
| `hard-delete:fail` | passed | 0 | 3.1s |  |
| `regulatory:hardcode:fail` | passed | 0 | 10.1s | Status: `pass` |
| `demo:trust:fail` | passed | 0 | 2.1s |  |
| `error:boundary:fail` | passed | 0 | 2.1s | > STOQUIFY@0.1.0 error:boundary:fail<br>> node scripts/raw-error-boundary-gate.js --mode fail<br># AqStoqFlow Raw Error Boundary Gate Report<br>Scan directories: `actions`, `app/api`, `services`, `lib/error-handling`<br>- Active unsafe raw-error findings: 0 |
| `ci:release:gate` | passed | 0 | 2.1s | Status: `ready`<br>- Checks ready: 10/10<br>- Blockers: 0<br>- ready: workflow_exists<br>- ready: workflow_permissions_are_read_only |
| `prisma:migration:safety:gate` | passed | 0 | 3.1s | Status: `ready`<br>- Checks ready: 8/8<br>- Blockers: 0<br>- ready: migration_history_present<br>- ready: migration_files_nonempty |
| `release:secrets:preflight` | passed | 0 | 2.1s | Status: `conditional`<br>- Checks ready: 2/8<br>- Blockers: 0<br>- Warnings: 6 |
| `release:evidence:gate` | passed | 0 | 2.1s | Status: conditional<br>- Structural checks ready: 10/11<br>- Structural blockers: 1<br>- Release-only blockers: 3<br>- blocked: public_identity_hash_secret via release:secrets:preflight:release |
