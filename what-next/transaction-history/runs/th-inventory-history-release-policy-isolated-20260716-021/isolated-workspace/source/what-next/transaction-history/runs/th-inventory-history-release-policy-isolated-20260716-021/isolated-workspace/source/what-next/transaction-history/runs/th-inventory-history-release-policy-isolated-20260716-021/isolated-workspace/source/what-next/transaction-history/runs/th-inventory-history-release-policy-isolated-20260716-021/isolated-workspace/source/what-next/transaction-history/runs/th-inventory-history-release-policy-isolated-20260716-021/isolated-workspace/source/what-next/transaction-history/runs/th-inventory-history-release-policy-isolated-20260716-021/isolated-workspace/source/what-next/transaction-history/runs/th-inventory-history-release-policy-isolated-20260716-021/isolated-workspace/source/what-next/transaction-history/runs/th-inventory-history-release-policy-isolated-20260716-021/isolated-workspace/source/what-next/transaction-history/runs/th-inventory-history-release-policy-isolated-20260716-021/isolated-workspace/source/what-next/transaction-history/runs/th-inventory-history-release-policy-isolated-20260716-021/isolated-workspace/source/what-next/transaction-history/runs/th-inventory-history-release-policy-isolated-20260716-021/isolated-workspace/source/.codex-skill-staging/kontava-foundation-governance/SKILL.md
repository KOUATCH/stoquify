---
name: kontava-foundation-governance
description: Build Kontava foundation governance before moat implementation. Use for Phase 0 work covering module vocabulary, canonical module slugs, ownership maps, evidence-grade language, ADRs, route/action/service/report/job inventories, product language rules, and delivery gates for the cross-boundary moat foundation.
---

# Kontava Foundation Governance

## Purpose

Use this skill to lock the shared language and ownership rules before adding code-heavy moat foundations. The output should make later evidence, snapshot, entitlement, signal, redaction, and Owner War Room work safe to execute.

## Upgraded Mission

Run this skill as Phase 0 of the Kontava moat program. Its job is to create the governance backbone that prevents later skills from inventing conflicting module names, evidence semantics, ownership boundaries, guard rules, or product language.

The output must be practical enough for product, design, engineering, QA, sales, and partnerships to use. It should make the platform easier to sell, safer to build, and clearer to explain to SMB owners, accountants, advisors, and partners.

## Stakeholder Value

- Owners should understand Kontava as one operating system with controlled modules and trusted facts.
- Accountants should see conservative evidence grades, source links, and audit-friendly language.
- Managers and staff should see simple workflow names, not technical labels.
- Sales and partners should receive consistent module bundles, upgrade language, and proof points.
- Engineering and QA should receive one route/action/service/report/job ownership map.

## Governance Requirements

Create artifacts that answer:

- What are the canonical module slugs and user-facing names?
- Which module owns each route, sidebar entry, server action, service, report, export, background job, seed scenario, and test fixture?
- Which modules depend on accounting, payments, reconciliation, inventory, purchasing, payroll, compliance, close, analytics, controls, or partners?
- Which evidence words are allowed, and what server-side proof is required before using them?
- Which data classes are sensitive and must be redacted by default?
- Which release gates must pass before hard enforcement, Owner War Room, partner evidence, AI-readable evidence, or broad compliance intelligence?

## Inspect First

Read source docs if present:

- `moat proposals/KONTAVA_MOAT_EXECUTION_SKILL_PROMPTS_UPGRADED_2026-06-19.md`
- `moat proposals/KONTAVA_MOAT_FOUNDATION_EXECUTION_ROADMAP_2026-06-19.md`
- `moat proposals/KONTAVA_CROSS_BOUNDARY_INNOVATION_MOAT_REPORT_2026-06-19.md`

Inspect existing code:

- `config/sidebar.ts`
- `config/permissions.ts`
- `lib/security/rbac-permissions.ts`
- `lib/security/rbac.ts`
- `services/_shared/protect.ts`
- `app/[locale]/(dashboard)/dashboard`
- `actions`
- `services`
- `prisma/schema.prisma`
- `messages/en.json`
- `messages/fr.json`

## Phase 0 Output Standard

Prefer docs or lightweight registry files before schema work. If code must change, keep it limited to non-enforcing catalogs, constants, or tests that prove vocabulary consistency.

The Phase 0 deliverable should include:

- Module vocabulary ADR.
- Evidence-grade ADR.
- Proof-trail contract ADR.
- Module entitlement observe-mode ADR.
- Snapshot/read-model ADR.
- Redaction and sensitive-data ADR.
- Release-gate checklist.
- Route/action/service/report/export/job ownership inventory.
- Product language rules for English and French surfaces.
- Risk register and dependency map for later skills.

## Build

Create or update governance artifacts, preferably under `docs/architecture/` or `what-next/`:

- Module vocabulary ADR.
- Evidence-grade ADR.
- Proof-trail contract ADR.
- Module entitlement observe-mode ADR.
- Snapshot strategy ADR.
- Redaction and sensitive-data ADR.
- Release-gate checklist.
- Module ownership map for routes, sidebar links, services, server actions, reports, exports, background jobs, seeds, and tests.

Canonical module slugs:

- `pos`
- `inventory`
- `purchasing`
- `accounting`
- `finance`
- `payments`
- `reconciliation`
- `payroll`
- `compliance`
- `close`
- `analytics`
- `controls`
- `partners`

Evidence grades:

- `raw`
- `operational`
- `posted`
- `reconciled`
- `certified`
- `blocked`

## Product Language Rules

- Use Certified only after explicit server-side certification or sign-off.
- Use Reconciled only after matching, reconciliation evidence, or signed reconciliation.
- Use Posted only after ledger posting evidence.
- Use Operational for completed module records not yet posted or reconciled.
- Use Blocked when contradictions, missing source links, failed events, open suspense, or unresolved blockers exist.

## Validation Expectations

If only governance docs change, run `git diff --check` and verify links/paths. If vocabulary constants or tests change, run focused tests plus `npm run typecheck` and `npm run lint`.

Acceptance requires that a later skill can reference one canonical definition for module, evidence grade, ownership, sensitive data, and release gate without asking the same governance questions again.

## Must Not Do

- Do not add hard module enforcement.
- Do not introduce durable schema changes unless the user asks.
- Do not rename existing modules or routes.
- Do not weaken tenant, RBAC, audit, accounting, or compliance semantics.

## Validation

Run focused checks:

- `npm run typecheck`
- `npm run lint`

If documents only changed, also run:

- `git diff --check`

## Completion Criteria

Finish when every canonical module has an owner, dependencies, route/action/service/report/job mapping, evidence-grade language is accepted, and later skills can reference a single vocabulary instead of inventing terms.
