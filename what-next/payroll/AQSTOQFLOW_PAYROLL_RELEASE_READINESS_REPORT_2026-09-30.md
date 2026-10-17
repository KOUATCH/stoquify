# Payroll payment reconciliation — release readiness

Skill: `aqstoqflow-payroll-payment-recon`. Phase 6, actual destination prerequisite verification and read/write readiness alignment within FA-CASH-COMMAND.

Changed the payroll control read model, run workbench and focused regression. Actual destination request/independent approval/application passed on owned synthetic data; self-approval, cross-tenant lookup and raw destination storage checks passed. Missing calculated HRIS proof still denies payment without effects. The workbench now explains and disables unavailable payment/declaration operations in EN/FR.

Verification: 33 focused tests, changed-file lint, TypeScript and actual EN desktop/FR mobile readiness checks pass. Full release, settlement and declaration checks remain unexecuted for this fixture, whose input provenance is incomplete. This is an engineering fixture dependency, not a cleared approval gate.

Detailed findings, preserved failures, source bindings, operator input sources and rollout limits are recorded once in [the release-readiness report](../workflow-modernization/2026-09-05-run-01/CASH_PAYROLL_RELEASE_READINESS_2026-09-30.md).

Next slice: construct a source-backed HRIS calculation fixture through identity, approved/scanned contract evidence, compensation where applicable, destination and certified attendance services; continue the release/settlement/declaration chain without synthetic readiness shortcuts.
