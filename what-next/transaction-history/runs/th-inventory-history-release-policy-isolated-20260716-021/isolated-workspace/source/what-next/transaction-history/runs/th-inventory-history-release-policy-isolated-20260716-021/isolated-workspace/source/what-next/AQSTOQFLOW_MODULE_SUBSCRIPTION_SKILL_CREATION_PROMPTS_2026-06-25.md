# AqStoqFlow Module and Subscription Skill Creation Prompts

Date: 2026-06-25
Source document: `what-next/AQSTOQFLOW_MODULE_CREATION_SUBSCRIPTION_PACKAGING_RUN_2026-06-25.md`
Purpose: Transform the module creation, entitlement, subscription packaging, and SaaS commercialization ideas into refined prompts for creating reusable Codex skills.

## Skill Suite Strategy

Do not create one giant skill for all module commercialization work. The document contains several related but distinct workflows. Create a focused skill suite with one orchestrator and specialized implementation skills.

Recommended order:

1. `aqstoqflow-module-commercialization-orchestrator`
2. `aqstoqflow-module-creation-lifecycle`
3. `aqstoqflow-module-surface-inventory-gate`
4. `aqstoqflow-subscription-package-schema`
5. `aqstoqflow-tenant-entitlement-provisioning`
6. `aqstoqflow-module-package-read-model`
7. `aqstoqflow-module-control-center-packages`
8. `aqstoqflow-module-deactivation-policy`
9. `aqstoqflow-billing-provider-boundary`
10. `aqstoqflow-module-release-gates`
11. `aqstoqflow-enforcement-pilot`
12. `aqstoqflow-package-strategy-matrix`

Use these prompts with the local skill creation workflow. Install skills under:

`C:\Users\J COMPUTER\.codex\skills`

Each created skill should:

- read the source report before acting;
- preserve service ownership, tenant isolation, RBAC, module entitlement, audit, redaction, and release gates;
- keep changes surgical;
- save execution reports under `what-next/`;
- run focused validation;
- avoid destructive migrations or hard enforcement unless explicitly approved.

---

## Prompt 1 - Module Commercialization Orchestrator Skill

```md
Create and install a reusable Codex skill named `aqstoqflow-module-commercialization-orchestrator` under `C:\Users\J COMPUTER\.codex\skills`.

Purpose:
Orchestrate the full AqStoqFlow module commercialization program, from module creation and surface inventory to subscription packaging, tenant entitlement, Module Control Center upgrades, release gates, and enforcement pilots.

Source documents to read:
- `what-next/AQSTOQFLOW_MODULE_CREATION_SUBSCRIPTION_PACKAGING_RUN_2026-06-25.md`
- `services/modules/module-control-contracts.ts`
- `services/modules/module-catalog.service.ts`
- `services/modules/module-entitlement.service.ts`
- `app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx`
- `config/sidebar.ts`
- `package.json`

The skill must guide an agent to:
1. Determine which module commercialization phase is currently safe to run.
2. Enforce dependency order:
   - surface inventory before hard enforcement,
   - package schema design before migrations,
   - service read models before UI,
   - observe-mode evidence before enforce-mode pilots.
3. Choose the correct specialized skill or workflow.
4. Refuse unsafe shortcuts such as dashboard-only module packaging, hard enforcement without coverage, or billing-provider-specific mutation of entitlements.
5. Require a `what-next/` report for every run.

The skill must include:
- a program dependency map;
- stop conditions;
- verification command guidance;
- report format;
- handoff prompts for the specialized skills.

Validation:
- Run the official skill validator.
- Manually confirm frontmatter, `agents/openai.yaml`, no placeholders, and a clear default prompt.

Default prompt:
Use `$aqstoqflow-module-commercialization-orchestrator` to choose and run the next safe module commercialization workflow for AqStoqFlow.
```

---

## Prompt 2 - Module Creation Lifecycle Skill

```md
Create and install a reusable Codex skill named `aqstoqflow-module-creation-lifecycle` under `C:\Users\J COMPUTER\.codex\skills`.

Purpose:
Guide the creation or review of any AqStoqFlow module so it is cataloged, owned, permissioned, package-eligible, dependency-aware, tenant-safe, auditable, and release-gate ready.

Source documents and code to read:
- `what-next/AQSTOQFLOW_MODULE_CREATION_SUBSCRIPTION_PACKAGING_RUN_2026-06-25.md`
- `services/modules/module-control-contracts.ts`
- `services/modules/module-catalog.service.ts`
- `config/sidebar.ts`
- relevant domain `services/`, `actions/`, `components/`, `hooks/`, and `app/` routes.

The skill must require every new or reviewed module to define:
- canonical slug;
- display name;
- owner;
- lifecycle status: internal, beta, available, deprecated;
- risk level;
- core/non-core flag;
- route prefixes;
- permissions;
- required and recommended dependencies;
- package eligibility;
- default availability policy;
- enforcement readiness state;
- service-owned read model;
- audit and redaction requirements;
- release-gate coverage.

The skill must prohibit:
- dashboard-only modules;
- UI before service-owned read models;
- module slug drift;
- permissions hidden only in UI;
- hard enforcement before inventory coverage.

Expected output from skill runs:
- module lifecycle checklist;
- catalog delta plan;
- service ownership map;
- permission and dependency map;
- package eligibility decision;
- verification results;
- `what-next/` report.

Validation:
- Run `quick_validate.py`.
- Confirm the skill references the source report and does not duplicate unrelated module implementation details.

Default prompt:
Use `$aqstoqflow-module-creation-lifecycle` to create or review an AqStoqFlow module before it becomes packageable.
```

---

## Prompt 3 - Module Surface Inventory Gate Skill

```md
Create and install a reusable Codex skill named `aqstoqflow-module-surface-inventory-gate` under `C:\Users\J COMPUTER\.codex\skills`.

Purpose:
Build and run a report-mode module surface inventory gate that maps every route, server action, API route, report, export, job, proof surface, and navigation entry to canonical commercial module slugs.

Source documents and code to read:
- `what-next/AQSTOQFLOW_MODULE_CREATION_SUBSCRIPTION_PACKAGING_RUN_2026-06-25.md`
- `services/modules/module-control-contracts.ts`
- `services/modules/module-catalog.service.ts`
- `config/sidebar.ts`
- `app/`
- `actions/`
- `app/api/`
- `services/`
- `scripts/`

The skill must guide implementation of a report-mode gate that classifies surfaces as:
- mapped;
- inferred;
- unmapped;
- unknown slug;
- dependency gap;
- missing permission;
- dashboard-only risk;
- module unavailable state missing;
- candidate for enforcement pilot.

The skill must require:
- JSON output under `what-next/`;
- markdown summary under `what-next/`;
- exit code zero in report mode;
- exact file paths and classifications;
- no hard enforcement until active critical gaps reach zero.

Verification commands:
- `npm run typecheck`
- focused test for the inventory script if added
- `npm run policy:gates`

Default prompt:
Use `$aqstoqflow-module-surface-inventory-gate` to inventory module coverage across routes, actions, APIs, reports, exports, jobs, and navigation.
```

---

## Prompt 4 - Subscription Package Schema Skill

```md
Create and install a reusable Codex skill named `aqstoqflow-subscription-package-schema` under `C:\Users\J COMPUTER\.codex\skills`.

Purpose:
Design the durable Prisma/service model for commercial packages, package-module bundles, tenant subscriptions, tenant module entitlements, entitlement decision logs, and migration from `Organization.requestedModules`.

Source documents and code to read:
- `what-next/AQSTOQFLOW_MODULE_CREATION_SUBSCRIPTION_PACKAGING_RUN_2026-06-25.md`
- `prisma/schema.prisma`
- `services/modules/module-control-contracts.ts`
- `services/modules/module-entitlement.service.ts`
- `services/modules/module-catalog.service.ts`
- `services/security/moat-guard.service.ts`

The skill must design, but not apply destructively without approval:
- `CommercialPackage`;
- `CommercialPackageModule`;
- `TenantSubscription`;
- `TenantModuleEntitlementRecord`;
- optional `ModuleEntitlementDecisionLog`;
- backfill plan from `Organization.requestedModules`;
- rollback plan;
- indexes and tenant-scoped uniqueness;
- audit evidence;
- entitlement source precedence.

The skill must require explicit review before:
- applying migrations;
- reseeding production-like data;
- replacing `requestedModules`;
- enabling hard enforcement.

Expected artifacts:
- schema design report under `what-next/`;
- migration/backfill strategy;
- rollback strategy;
- verification plan;
- next implementation prompt.

Default prompt:
Use `$aqstoqflow-subscription-package-schema` to design the durable package, subscription, and tenant entitlement model for AqStoqFlow.
```

---

## Prompt 5 - Tenant Entitlement Provisioning Skill

```md
Create and install a reusable Codex skill named `aqstoqflow-tenant-entitlement-provisioning` under `C:\Users\J COMPUTER\.codex\skills`.

Purpose:
Implement or review tenant module entitlement provisioning from packages, trials, manual overrides, system defaults, legacy defaults, and billing states.

Source documents and code to read:
- `what-next/AQSTOQFLOW_MODULE_CREATION_SUBSCRIPTION_PACKAGING_RUN_2026-06-25.md`
- `services/modules/module-entitlement.service.ts`
- `services/modules/module-control-contracts.ts`
- `services/modules/__tests__/module-entitlement.service.test.ts`
- `prisma/schema.prisma`
- `services/security/moat-guard.service.ts`

The skill must define entitlement precedence:
1. system default,
2. manual suspension or revocation,
3. active package entitlement,
4. trial entitlement,
5. manual override,
6. legacy default,
7. unavailable.

The skill must handle:
- active;
- trial;
- read-only;
- suspended;
- expired;
- unavailable;
- legacy default;
- system default.

The skill must protect:
- tenant isolation;
- RBAC layering;
- audit logging;
- dependency gaps;
- read-only write denials;
- wildcard RBAC not bypassing entitlement;
- observe mode before enforcement.

Expected artifacts:
- entitlement service changes or design report;
- focused tests;
- audit evidence format;
- `what-next/` implementation report.

Verification commands:
- `npx jest services/modules/__tests__/module-entitlement.service.test.ts --runInBand`
- `npm run typecheck`
- `npm run policy:gates`

Default prompt:
Use `$aqstoqflow-tenant-entitlement-provisioning` to implement or review tenant module entitlement derivation and audit-safe provisioning.
```

---

## Prompt 6 - Module Package Read Model Skill

```md
Create and install a reusable Codex skill named `aqstoqflow-module-package-read-model` under `C:\Users\J COMPUTER\.codex\skills`.

Purpose:
Build service-owned read models that combine module catalog data, package definitions, tenant subscription state, entitlement decisions, dependency gaps, and would-block summaries for UI and release-gate consumers.

Source documents and code to read:
- `what-next/AQSTOQFLOW_MODULE_CREATION_SUBSCRIPTION_PACKAGING_RUN_2026-06-25.md`
- `services/modules/module-entitlement.service.ts`
- `services/modules/module-catalog.service.ts`
- `services/modules/module-control-contracts.ts`
- `app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx`

The skill must require:
- read model before UI;
- tenant-scoped reads;
- no client-calculated entitlement truth;
- package and entitlement source summaries;
- dependency warnings;
- unknown requested module reporting;
- would-block history or summary;
- enforcement readiness state.

The skill must not:
- create UI-only package logic;
- bypass RBAC;
- duplicate module catalog truth in components;
- hardcode package pricing in UI.

Expected artifacts:
- service/read-model contract;
- tests;
- optional UI integration plan;
- `what-next/` report.

Verification commands:
- focused Jest tests for the read model
- `npm run typecheck`
- `npm run policy:gates`

Default prompt:
Use `$aqstoqflow-module-package-read-model` to build service-owned module package and entitlement read models.
```

---

## Prompt 7 - Module Control Center Packages Skill

```md
Create and install a reusable Codex skill named `aqstoqflow-module-control-center-packages` under `C:\Users\J COMPUTER\.codex\skills`.

Purpose:
Extend the Module Control Center into an operator-grade package, subscription, entitlement, dependency, and enforcement readiness surface.

Source documents and code to read:
- `what-next/AQSTOQFLOW_MODULE_CREATION_SUBSCRIPTION_PACKAGING_RUN_2026-06-25.md`
- `app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx`
- `services/modules/module-entitlement.service.ts`
- the module package read model once it exists.

The skill must guide UI work that displays:
- current package;
- package membership;
- tenant subscription state;
- entitlement source;
- module dependency warnings;
- unknown requested modules;
- would-block decisions;
- surface coverage status;
- enforcement readiness score;
- audit evidence;
- safe next actions.

The skill must preserve:
- `MANAGE_SYSTEM_SETTINGS` protection;
- bilingual copy patterns;
- dashboard visual semantics;
- no hard enforcement toggle until inventory gate is clean;
- no UI-owned business truth.

Expected artifacts:
- UI changes only after read model exists;
- screenshots or route smoke evidence when possible;
- focused typecheck;
- `what-next/` report.

Default prompt:
Use `$aqstoqflow-module-control-center-packages` to evolve the Module Control Center into a package and entitlement operations surface.
```

---

## Prompt 8 - Module Deactivation Policy Skill

```md
Create and install a reusable Codex skill named `aqstoqflow-module-deactivation-policy` under `C:\Users\J COMPUTER\.codex\skills`.

Purpose:
Define and implement safe behavior when a tenant loses access to a module through suspension, cancellation, expiration, missing dependency, or manual revocation.

Source documents and code to read:
- `what-next/AQSTOQFLOW_MODULE_CREATION_SUBSCRIPTION_PACKAGING_RUN_2026-06-25.md`
- `services/modules/module-entitlement.service.ts`
- `services/security/moat-guard.service.ts`
- `services/security/redaction-policy.service.ts`
- `config/sidebar.ts`
- relevant API/report/export/job surfaces.

The skill must define behavior for:
- navigation hiding;
- action/API denial;
- read-only historical access;
- export redaction;
- proof drawer redaction;
- scheduled job suspension;
- report unavailable states;
- audit evidence;
- close/reconciliation/accounting impacts.

The skill must enforce:
- hiding navigation is not security;
- historical data must not be destroyed;
- sensitive data must be redacted when entitlement would block;
- write actions must deny under suspended/expired/read-only states when enforcement is active.

Expected artifacts:
- deactivation policy report;
- implementation plan or code changes;
- focused tests;
- `what-next/` report.

Default prompt:
Use `$aqstoqflow-module-deactivation-policy` to define safe tenant module loss, read-only, redaction, and deactivation behavior.
```

---

## Prompt 9 - Billing Provider Boundary Skill

```md
Create and install a reusable Codex skill named `aqstoqflow-billing-provider-boundary` under `C:\Users\J COMPUTER\.codex\skills`.

Purpose:
Design a provider-independent billing boundary so external billing systems can inform subscription state without directly mutating module entitlements unsafely.

Source documents and code to read:
- `what-next/AQSTOQFLOW_MODULE_CREATION_SUBSCRIPTION_PACKAGING_RUN_2026-06-25.md`
- `prisma/schema.prisma`
- module/subscription schema design once available
- `services/modules/module-entitlement.service.ts`
- `services/security/moat-guard.service.ts`

The skill must define:
- billing provider adapter boundary;
- event intake model;
- idempotency keys;
- tenant scoping;
- subscription state transition rules;
- audit events;
- manual override handling;
- retry and reconciliation behavior;
- rollback behavior.

The skill must prohibit:
- billing webhooks directly enabling/disabling modules;
- provider-specific logic inside module entitlement evaluator;
- unaudited subscription state changes;
- destructive cancellation of tenant data.

Expected artifacts:
- billing boundary design report;
- adapter contract proposal;
- risk controls;
- verification plan;
- `what-next/` report.

Default prompt:
Use `$aqstoqflow-billing-provider-boundary` to design a safe provider-independent billing and subscription event boundary.
```

---

## Prompt 10 - Module Release Gates Skill

```md
Create and install a reusable Codex skill named `aqstoqflow-module-release-gates` under `C:\Users\J COMPUTER\.codex\skills`.

Purpose:
Create or update release gates that prevent module packaging, entitlement, or enforcement regressions.

Source documents and code to read:
- `what-next/AQSTOQFLOW_MODULE_CREATION_SUBSCRIPTION_PACKAGING_RUN_2026-06-25.md`
- `package.json`
- `scripts/kontava-moat-release-gate.js`
- existing policy gate scripts
- module surface inventory output once available.

The skill must guide gates for:
- unmapped module surfaces;
- unknown module slugs;
- missing permissions;
- package dependency violations;
- UI-only module logic;
- hard enforcement without clean observe evidence;
- missing module unavailable UI states;
- unsafe export/report leakage from disabled modules.

Gate ladder:
1. report,
2. warn,
3. fail.

The skill must require:
- JSON and markdown output;
- exact file paths;
- active vs allowed findings;
- baseline/ratchet strategy;
- no broad unrelated lint cleanup.

Verification commands:
- `npm run typecheck`
- focused gate tests
- `npm run policy:gates`

Default prompt:
Use `$aqstoqflow-module-release-gates` to create or promote module packaging and entitlement release gates safely.
```

---

## Prompt 11 - Module Enforcement Pilot Skill

```md
Create and install a reusable Codex skill named `aqstoqflow-enforcement-pilot` under `C:\Users\J COMPUTER\.codex\skills`.

Purpose:
Plan and execute a narrow, reversible module enforcement pilot after observe-mode evidence is clean.

Source documents and code to read:
- `what-next/AQSTOQFLOW_MODULE_CREATION_SUBSCRIPTION_PACKAGING_RUN_2026-06-25.md`
- module surface inventory report
- module entitlement decision history
- `services/modules/module-entitlement.service.ts`
- `services/security/moat-guard.service.ts`
- `config/sidebar.ts`

The skill must require:
- one low-risk module or controlled tenant group;
- zero critical unmapped surfaces;
- clean dependency checks;
- explicit rollback;
- audit evidence;
- observe-mode would-block review;
- no false positives before expansion.

The skill must define:
- pilot scope;
- eligibility criteria;
- enforcement mode switch path;
- route/action/API/export/job behavior;
- route smoke plan;
- rollback plan;
- success/failure thresholds.

The skill must prohibit:
- platform-wide hard enforcement;
- enforcement before coverage inventory;
- silent denial without safe user-facing state;
- changing unrelated modules.

Default prompt:
Use `$aqstoqflow-enforcement-pilot` to plan or run a narrow module entitlement enforcement pilot after observe-mode evidence is clean.
```

---

## Prompt 12 - Package Strategy Matrix Skill

```md
Create and install a reusable Codex skill named `aqstoqflow-package-strategy-matrix` under `C:\Users\J COMPUTER\.codex\skills`.

Purpose:
Convert AqStoqFlow modules into sellable SaaS package strategy while preserving technical feasibility, tenant safety, dependency rules, and growth strategy.

Source documents and code to read:
- `what-next/AQSTOQFLOW_MODULE_CREATION_SUBSCRIPTION_PACKAGING_RUN_2026-06-25.md`
- `services/modules/module-catalog.service.ts`
- `services/modules/module-control-contracts.ts`
- current product/innovation reports under `what-next/` and `innovation/` when relevant.

The skill must produce package matrices such as:
- Starter Operations;
- Finance Control;
- Reconciliation and Close;
- Compliance and Payroll;
- Enterprise Assurance;
- add-on modules;
- beta/internal modules.

For each package, the skill must define:
- target client segment;
- included modules;
- required dependencies;
- optional add-ons;
- trial candidates;
- read-only fallback;
- operational value proposition;
- upsell path;
- risks and release readiness;
- implementation prerequisites.

The skill must avoid:
- pricing speculation unless asked;
- packaging modules with missing dependencies;
- treating internal/admin modules as sellable without security review;
- product claims unsupported by implemented controls.

Expected artifacts:
- package matrix report;
- module dependency map;
- recommended rollout sequence;
- risks and blockers;
- follow-up implementation prompts.

Default prompt:
Use `$aqstoqflow-package-strategy-matrix` to turn AqStoqFlow modules into safe, dependency-aware SaaS subscription packages.
```

## Recommended Creation Batch

If creating the skills in batches, use this order:

Batch 1:
- `aqstoqflow-module-commercialization-orchestrator`
- `aqstoqflow-module-creation-lifecycle`
- `aqstoqflow-module-surface-inventory-gate`

Batch 2:
- `aqstoqflow-subscription-package-schema`
- `aqstoqflow-tenant-entitlement-provisioning`
- `aqstoqflow-module-package-read-model`

Batch 3:
- `aqstoqflow-module-control-center-packages`
- `aqstoqflow-module-deactivation-policy`
- `aqstoqflow-billing-provider-boundary`

Batch 4:
- `aqstoqflow-module-release-gates`
- `aqstoqflow-enforcement-pilot`
- `aqstoqflow-package-strategy-matrix`

## Master Prompt To Create The Whole Suite

```md
Create, install, and validate a focused AqStoqFlow module commercialization skill suite under `C:\Users\J COMPUTER\.codex\skills`.

Source document:
`what-next/AQSTOQFLOW_MODULE_SUBSCRIPTION_SKILL_CREATION_PROMPTS_2026-06-25.md`

Create the skills in dependency order:
1. `aqstoqflow-module-commercialization-orchestrator`
2. `aqstoqflow-module-creation-lifecycle`
3. `aqstoqflow-module-surface-inventory-gate`
4. `aqstoqflow-subscription-package-schema`
5. `aqstoqflow-tenant-entitlement-provisioning`
6. `aqstoqflow-module-package-read-model`
7. `aqstoqflow-module-control-center-packages`
8. `aqstoqflow-module-deactivation-policy`
9. `aqstoqflow-billing-provider-boundary`
10. `aqstoqflow-module-release-gates`
11. `aqstoqflow-enforcement-pilot`
12. `aqstoqflow-package-strategy-matrix`

For each skill:
- use `init_skill.py` when helpful;
- write concise `SKILL.md` instructions with clear trigger descriptions;
- add `agents/openai.yaml` with display name, 25-64 character short description, and default prompt;
- add references only when they reduce repetition or keep the main skill lean;
- validate with `quick_validate.py`;
- if validator tooling fails due to environment dependency issues, manually validate frontmatter, naming, metadata, no placeholders, and file structure;
- save a creation report under `what-next/` listing installed paths, validation results, and any skipped/deferred skills.

Keep the suite focused. Do not merge everything into a monolithic skill unless explicitly asked.
```

