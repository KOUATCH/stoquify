# AqStoqFlow HR/Payroll Skill Suite Install, Validation, And Dry Run Report

Date: 2026-06-25

Source blueprint: `E:\ohada saas\newStockFlow\aqstoqflow\what-next\payroll\AQSTOQFLOW_HR_PAYROLL_SKILL_SUITE_BLUEPRINT_2026-06-25.md`

## Refined Prompt

From `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SKILL_SUITE_BLUEPRINT_2026-06-25.md`, create, install, validate, and dry-run the complete AqStoqFlow HR/payroll skill suite. Use one master orchestration skill plus focused implementation skills. Preserve the hybrid reconstruction decision and all payroll kernel, country-pack, ledger, audit, close-invalidation, stale-evidence, and certified export semantics. Validate each skill structurally and with the available validator, then run a non-code operational pass for each skill to confirm its first safe execution state and handoff.

## Installed Skills

- `aqstoqflow-hr-payroll-hybrid-reconstructor` -> `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-hr-payroll-hybrid-reconstructor` (created)
- `aqstoqflow-payroll-kernel-hardener` -> `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-payroll-kernel-hardener` (created)
- `aqstoqflow-hr-source-data-builder` -> `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-hr-source-data-builder` (created)
- `aqstoqflow-payroll-command-center` -> `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-payroll-command-center` (created)
- `aqstoqflow-payroll-country-pack-engine` -> `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-payroll-country-pack-engine` (created)
- `aqstoqflow-payslip-self-service` -> `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-payslip-self-service` (created)
- `aqstoqflow-payroll-declaration-compliance` -> `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-payroll-declaration-compliance` (created)
- `aqstoqflow-payroll-payment-recon` -> `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-payroll-payment-recon` (created)
- `aqstoqflow-payroll-accounting-close` -> `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-payroll-accounting-close` (created)
- `aqstoqflow-payroll-smb-ops` -> `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-payroll-smb-ops` (created)
- `aqstoqflow-payroll-assurance-chaos` -> `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-payroll-assurance-chaos` (created)

## Validator Results

- `aqstoqflow-hr-payroll-hybrid-reconstructor`: passed. Skill is valid!
- `aqstoqflow-payroll-kernel-hardener`: passed. Skill is valid!
- `aqstoqflow-hr-source-data-builder`: passed. Skill is valid!
- `aqstoqflow-payroll-command-center`: passed. Skill is valid!
- `aqstoqflow-payroll-country-pack-engine`: passed. Skill is valid!
- `aqstoqflow-payslip-self-service`: passed. Skill is valid!
- `aqstoqflow-payroll-declaration-compliance`: passed. Skill is valid!
- `aqstoqflow-payroll-payment-recon`: passed. Skill is valid!
- `aqstoqflow-payroll-accounting-close`: passed. Skill is valid!
- `aqstoqflow-payroll-smb-ops`: passed. Skill is valid!
- `aqstoqflow-payroll-assurance-chaos`: passed. Skill is valid!

## Manual Validation Results

- `aqstoqflow-hr-payroll-hybrid-reconstructor`: passed
- `aqstoqflow-payroll-kernel-hardener`: passed
- `aqstoqflow-hr-source-data-builder`: passed
- `aqstoqflow-payroll-command-center`: passed
- `aqstoqflow-payroll-country-pack-engine`: passed
- `aqstoqflow-payslip-self-service`: passed
- `aqstoqflow-payroll-declaration-compliance`: passed
- `aqstoqflow-payroll-payment-recon`: passed
- `aqstoqflow-payroll-accounting-close`: passed
- `aqstoqflow-payroll-smb-ops`: passed
- `aqstoqflow-payroll-assurance-chaos`: passed

## Dry Run Results

- `aqstoqflow-hr-payroll-hybrid-reconstructor` (Master orchestration): Selected next safe execution stream: Phase 0 kernel hardening; implementation deferred to aqstoqflow-payroll-kernel-hardener.
- `aqstoqflow-payroll-kernel-hardener` (Phase 0): Ready to run first for actual implementation. Recommended first executable slice: DB immutability plus tenant/privacy tests.
- `aqstoqflow-hr-source-data-builder` (Phase 1): Blocked behind Phase 0 safety gates; source-data execution should begin after kernel hardening report.
- `aqstoqflow-payroll-command-center` (Phase 2): Blocked until Phase 0 and core Phase 1 readiness inputs are available.
- `aqstoqflow-payroll-country-pack-engine` (Phase 3): Blocked until hardcode gate and country-pack provenance work are ready.
- `aqstoqflow-payslip-self-service` (Phase 4): Blocked until payslip immutability, redaction, and employee mapping are in place.
- `aqstoqflow-payroll-declaration-compliance` (Phase 5): Blocked until country-pack declaration metadata and declaration immutability are ready.
- `aqstoqflow-payroll-payment-recon` (Phase 6): Blocked until payment destination workflow and payment evidence policy exist.
- `aqstoqflow-payroll-accounting-close` (Phase 7): Partially ready for future invalidation work; broader close integration waits for register/payment/declaration evidence.
- `aqstoqflow-payroll-smb-ops` (Phase 8): Blocked until command center, register, payment, and declaration evidence exist.
- `aqstoqflow-payroll-assurance-chaos` (Phase 9): Blocked until core HR/payroll workflows exist; can later own release gating.

## Execution Decision

The full skill suite is installed and structurally ready. The operational dry run selects `aqstoqflow-payroll-kernel-hardener` as the first implementation skill. Actual product implementation should begin with Phase 0 hardening, especially DB immutability, tenant-escape tests, salary-read audit/privacy, and next close-invalidation source evaluation. Later skills are intentionally blocked behind those gates.

## Notes

This run installed and dry-ran skills. It did not implement the HR/payroll product roadmap itself. That is deliberate: the suite must first exist as reusable execution machinery, then implementation should proceed one gated slice at a time.
