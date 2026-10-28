---
name: stoquify-settings-surface-inventory-classifier
description: Classify Stoquify settings-related server actions, public identity flows, token-bound workflows, mixed authentication surfaces, and non-action helpers using the module surface inventory. Use when cleaning false missing-permission findings, preparing a settings RBAC enforcement slice, auditing users/roles/organization/master-data/storage actions, or producing report-only authorization evidence before hardening.
---

# Stoquify Settings Surface Inventory Classifier

## Purpose

Turn Stoquify's coarse action inventory into reviewed settings-surface evidence. Separate executable server actions from helpers, preserve legitimate public and token-bound identity boundaries, and identify unresolved protected settings actions without enabling entitlement enforcement.

## Required Reads

1. Read `scripts/module-surface-inventory.js` in the target repository.
2. Read `what-next/module-surface-inventory.json` after refreshing it.
3. Read `references/classification-contract.md` before interpreting results.
4. Read `references/verification.md` before running checks.

Prefer current code over generated reports when they conflict.

## Workflow

1. Confirm the repository is Stoquify and inspect `git status --short` without reverting unrelated changes.
2. Run `npm run module:surface:inventory` in report mode.
3. Resolve this skill's directory from the loaded `SKILL.md` path.
4. Run the bundled classifier with explicit repository and output paths:

```powershell
node <skill-root>\scripts\classify-settings-surfaces.js --repo . --inventory what-next\module-surface-inventory.json --json-out docs\skills-life-cycle\STOQUIFY_SETTINGS_SURFACE_CLASSIFICATION_<YYYY-MM-DD>.json --md-out docs\skills-life-cycle\STOQUIFY_SETTINGS_SURFACE_CLASSIFICATION_<YYYY-MM-DD>.md
```

5. Review every `review-required` record against the source file. Do not convert public identity exceptions into RBAC-protected dashboard actions.
6. Save a dated execution report under `docs/skills-life-cycle/` with inspected files, classification counts, active findings, allowed exceptions, verification results, and the recommended enforcement slice.
7. Keep module entitlement enforcement report-only unless the user explicitly authorizes a separate enforcement pass.

## Scope

Classify action records already mapped to the `settings` module plus Stoquify's users, roles, organization, locations, tax rates, brands, categories, units, and storage action folders. The classifier does not modify those business surfaces.

## Guardrails

- Treat `"use server"` as the executable action boundary; files without it are helpers unless they are pure re-exports.
- Use the exact public identity registry in the bundled script. Do not infer new public exceptions from missing guards.
- Require source evidence for token, OTP, fresh-auth, RBAC, tenant, and module-observe claims.
- Treat caller-supplied organization IDs as evidence only when paired with trusted-context validation.
- Do not change permissions, services, routes, schemas, or entitlement mode during classification.
- Keep sensitive values, tokens, emails, secrets, and personal data out of artifacts.

## Done

The skill is complete when JSON and Markdown artifacts agree, helper and public/token-bound exceptions no longer appear as generic missing-permission findings, every unresolved executable surface has a concrete reason and next action, the focused script test passes, and the repository's report-mode inventory remains successful.
