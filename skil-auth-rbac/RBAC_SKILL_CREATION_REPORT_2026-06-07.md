# RBAC Skill Creation Report

Date: 2026-06-07

## Summary

Created and installed a Codex skill named `rbac` from the pasted prompt. The skill teaches Codex how to design, build, extend, harden, and audit a role-and-permission system for a multi-tenant SaaS serving SMBs in the OHADA / SYSCOHADA zone.

The skill is written for a Next.js App Router + TypeScript platform using Auth.js v5 / NextAuth as the authentication backbone, Prisma + Postgres as the default data layer, and server actions / route handlers as primary business-action surfaces.

## Installed Skill Location

```text
C:\Users\J COMPUTER\.codex\skills\rbac
```

Installed files:

```text
rbac/
  SKILL.md
  agents/
    openai.yaml
```

## Report Location

```text
E:\professional management systems\stockflow\skil-auth-rbac\RBAC_SKILL_CREATION_REPORT_2026-06-07.md
```

The report directory name follows the user-requested spelling: `skil-auth-rbac`.

## Source Prompt Refinement

The pasted prompt asked for a Claude-style skill at:

```text
~/.claude/skills/rbac/SKILL.md
```

For this Codex environment, the install target was adapted to:

```text
C:\Users\J COMPUTER\.codex\skills\rbac
```

The requested skill name `rbac` was preserved. The prompt's core security posture was retained and tightened into a self-contained Codex `SKILL.md` with frontmatter, operating principles, concrete TypeScript snippets, tables, red flags, and a pre-ship checklist.

## Key Design Decisions

### Authorization Is Load-Bearing

The skill frames authorization as a critical safety system. Missing permission checks are treated as production-grade defects because they can cause cross-tenant data leaks, unauthorized journal posting, payroll tampering, cash-drawer fraud, and period-close bypasses.

The skill includes the requested anchor:

```text
Violating the letter is violating the spirit.
```

### Permissions Over Role Names

The skill tells Codex to authorize capabilities, not role labels. Roles are treated as bilingual bundles of permissions, while permission keys use a stable English namespace:

```text
<module>.<resource>.<verb>
```

Examples include:

```text
accounting.journal.post
pos.sale.refund
inventory.stock.approveAdjustment
payroll.run.approve
purchasing.purchaseOrder.approve
admin.role.assign
reports.financial.export
```

### OHADA SMB Role Matrix

The skill includes a bilingual role table for typical SMB roles:

- Gerant / Owner
- Comptable / Accountant
- Caissier / Cashier
- Chef Caissier / Head Cashier
- Magasinier / Stock Clerk
- RH / HR
- Admin Paie / Payroll Admin
- Acheteur / Buyer
- Responsable Achats / Purchase Manager
- Commercial / Sales
- Auditeur / Auditor

The role matrix emphasizes least privilege and warns against granting every critical permission to an owner by reflex.

### NextAuth Freshness Rules

The skill keeps Auth.js v5 / NextAuth as the authentication and JWT session backbone, while stating that JWT claims are a performance cache, not final authorization truth.

Freshness policy:

- low risk: current JWT can be used if tenant and module match
- medium risk: current JWT can be used if tenant and module match
- high risk: re-fetch if permissions are older than five minutes
- critical risk: always re-fetch from the database inside the action/API/service

### Subscription Module Gating

The skill requires `modulesEnabled` to short-circuit permission checks. If a tenant does not subscribe to a module, the module is denied before permission grants are evaluated.

Middleware can redirect to `/upgrade`, but server actions and APIs must still enforce module gates.

### Resource-Level Scopes

Permissions are layered with resource scopes:

- tenant
- branch/location
- customer/supplier
- accounting period
- amount threshold
- approval state

This supports workflows such as POS terminal access, supplier invoice matching, payroll approval, purchase order approval, and closed-period accounting controls.

### OHADA Period Locks And Approval Workflows

The skill includes specific controls for:

- cloture exercice
- TVA declaration
- CNPS filing
- journal period reopening

These actions require critical permissions, two-party approval, no self-approval, and audit trails.

### Audit Log Specification

The skill includes a Prisma-style append-only `AuditLog` model with:

- tenant ID
- actor user ID
- action
- permission
- resource and resource ID
- result
- before/after JSON
- reason
- IP address and user agent
- previous hash
- current hash
- timestamp

The skill treats 10-year retention as the product requirement from the source prompt and notes that legal counsel can override production policy.

### Required CI Suites

The skill requires three CI suites before shipping major RBAC work:

- permission matrix suite
- cross-tenant leak suite
- privilege-escalation suite

The privilege-escalation suite specifically covers stale JWT claims, mass-assignment of tenant IDs, missing `admin.role.assign`, self-approval, and closed-period bypasses.

## Frontmatter And Triggering

The `SKILL.md` frontmatter includes:

```yaml
name: rbac
description: "Use when designing, building, extending, hardening, or auditing RBAC..."
```

The description starts with `Use when`, lists concrete triggers, includes French role names, and states skip rules for tasks that are only login UI, password reset, marketing copy, or frontend-only visibility with no server authorization surface.

## UI Metadata

Created `agents/openai.yaml` with:

```yaml
interface:
  display_name: "RBAC Auth Hardening"
  short_description: "Design watertight SaaS RBAC systems."
  default_prompt: "Use $rbac to design, build, harden, or audit a multi-tenant SaaS role and permission system."
```

## Validation Notes

Manual checks should confirm:

- `SKILL.md` exists.
- YAML frontmatter contains `name` and `description`.
- The skill name matches the directory name `rbac`.
- `agents/openai.yaml` exists.
- Scaffold placeholders were removed.
- The skill includes concrete TypeScript snippets and tables.
- The skill includes the requested red flags and pre-ship checklist.

The local `quick_validate.py` script has previously failed in this environment because the bundled Python runtime is missing `PyYAML`, so manual validation is the reliable fallback.

## Restart Note

Restart Codex to pick up the newly installed `rbac` skill in future sessions.
