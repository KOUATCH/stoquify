# Stage 07 Release Review - Inventory Movement History Browser Smoke

Status: BLOCKED
Run: th-inventory-history-browser-smoke-clean-20260716-020
Scope: foundation-inventory / workbench + inventory

## Result

Authenticated browser/mobile accessibility smoke is PASS for /en/dashboard/inventory/movements using the existing payroll storage state without reading raw auth material.

- Mobile 390x844: authenticated route reached, inventory movement history visible, export server history visible, no unauthorized redirect meta, no horizontal overflow, axe violations: 0.
- Desktop 1440x1100: authenticated route reached, inventory movement history visible, export server history visible, no unauthorized redirect meta, no horizontal overflow, axe violations: 0.
- Screenshots captured at screenshots/inventory-movements-mobile.png and screenshots/inventory-movements-desktop.png.

## Public UploadThing Dev/Test Decision

The public UploadThing storage gate is lifted for development and testing progression only.

This exception is allowed because Stoquify is not live yet and the current objective is to keep the transaction-history work moving through implementation and testing. Public UploadThing must remain explicitly classified as a non-production storage mode.

Required guardrails while public storage is used:

- Use only development, test, seed, fixture, or sanitized demo data.
- Do not upload real customer, employee, supplier, tax, payroll, bank, or production accounting data.
- Use random, non-guessable object keys and avoid sensitive filenames.
- Keep export filenames and metadata redacted from tenant/customer identifiers where practical.
- Treat public links as shareable artifacts, not confidential records.
- Keep the production go-live gate blocked until private UploadThing storage or an equivalent private object-storage strategy is enabled and verified.

## Evidence

- Browser smoke JSON: logs/07-browser-smoke.json
- Next dev log: logs/07-next-dev.log
- Validator log: logs/07-validator.log

## Remaining Blocker

- VERIFY_REPO_ISOLATED_RUN_PENDING: full 
pm run verify:repo and named release-policy gates still need to run in an isolated checkout or clean release environment.

## Verdict

The authenticated browser/accessibility blocker is cleared. The public UploadThing gate is accepted for dev/test and no longer blocks development progression. Stage 07 remains BLOCKED only for the isolated full policy/repo verification gate, and production go-live must still require private storage.
