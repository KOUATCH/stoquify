# Kontava Safe Rebrand Guardrail Note

Date: 2026-06-19

## Purpose

This note records the safe rebrand work completed without touching runtime code, database schema, services, server actions, permissions, migrations, package scripts, or the active workspace folder.

The product-facing strategic name going forward is:

```text
KONTAVA
```

Recommended formal product expression:

```text
Kontava Business OS
```

Recommended tagline:

```text
Every operation, proved.
```

## Safe Changes Completed

The following forward-looking moat proposal artifacts were renamed and updated to use the Kontava brand:

1. `moat proposals/KONTAVA_BRAND_NAMING_EXERCISE_2026-06-19.md`
2. `moat proposals/KONTAVA_CROSS_BOUNDARY_INNOVATION_MOAT_REPORT_2026-06-19.md`

These are documentation-only artifacts and do not affect runtime behavior.

## Intentionally Not Changed

The following were intentionally left unchanged in this pass:

1. Application code in `app/`, `components/`, `services/`, `actions/`, `lib/`, `config/`, and `prisma/`.
2. Prisma schema, migrations, seed behavior, and database content.
3. RBAC, tenant isolation, audit, ledger, compliance, payroll, POS, inventory, purchasing, and reconciliation logic.
4. `package.json`, `package-lock.json`, and package scripts.
5. Existing historical reports, run logs, generated scans, and skill references that use the old project name as provenance.
6. The physical workspace folder `E:\ohada saas\newStockFlow\aqstoqflow`.

## Why The Folder Was Not Renamed In This Pass

Renaming the active project folder is not a code change, but it can break the current Codex workspace binding, terminal working directory, local dev server references, generated report paths, and scripts that still reference the old path.

The safer sequence is:

1. Finish or commit current in-flight code changes.
2. Update active runtime brand references in one controlled implementation pass.
3. Run verification.
4. Close dev servers and terminals using the old path.
5. Rename the folder from outside the active workspace.
6. Reopen Codex and the editor from the new folder path.

Recommended future folder:

```text
E:\ohada saas\newStockFlow\kontava
```

## Future Runtime Rebrand Plan

When code changes are allowed, the safe implementation order should be:

1. Add a central brand constant or config such as `Kontava`, `KONTAVA`, `Kontava Business OS`, and `kontava`.
2. Update landing page, login, register, auth shell, and locale messages to consume the new brand language.
3. Update seed/demo organization names and tests together.
4. Keep legacy onboarding source values accepted as aliases, then introduce `kontava-register-v2`.
5. Update report/export pack names only where the identifier is not part of a compatibility contract.
6. Run targeted tests for auth registration, user identity, accounting exports, close packs, and i18n.
7. Only after runtime verification, consider folder and package identity changes.

## Rebrand Rule

From this note forward, new business, product, marketing, and moat proposals should use `Kontava` or `KONTAVA`, unless explicitly referring to historical artifacts created under the old name.
