# RBAC Super Skill Report

Date: 2026-06-07

## Summary

Updated the existing Codex skill `rbac` into a consolidated super skill by merging the prior RBAC skill prompt with the new pasted prompt. The result is a stronger, more complete skill for designing, building, extending, hardening, and auditing a role-and-permission system for a multi-tenant SaaS in the OHADA / SYSCOHADA zone.

The upgraded skill focuses on a world-class SMB platform with accounting, POS, inventory, payroll, purchasing, administration, and reporting workflows. It keeps Auth.js v5 / NextAuth as the authentication and JWT session backbone, while making server-side authorization the source of truth.

## Installed Skill Location

```text
C:\Users\J COMPUTER\.codex\skills\rbac\SKILL.md
```

The same merged skill content is also saved in the workspace as:

```text
E:\professional management systems\stockflow\skil-auth-rbac\RBAC_SUPER_SKILL_2026-06-07.md
```

## Report Location

```text
E:\professional management systems\stockflow\skil-auth-rbac\RBAC_SUPER_SKILL_REPORT_2026-06-07.md
```

## What Changed

The previous `rbac` skill already covered:

- deny-by-default RBAC principles
- typed permission catalog
- bilingual OHADA SMB roles
- Auth.js v5 / NextAuth JWT enrichment
- permission freshness rules
- server-side authorization primitives
- subscription module gating
- resource-level scopes
- audit-log schema
- CI suites
- red flags and pre-ship checklist

The new pasted prompt required deeper module-specific anatomy examples. The upgraded skill now includes fully worked examples for:

- `accounting.period.close` (critical)
- `pos.cash.adjust` (critical)
- `inventory.adjust.approve` (high)
- `payroll.run.approve` (critical)
- `purchasing.payment.record` (high, critical above threshold)

Each anatomy example includes:

- fraud or abuse vector being prevented
- UI control
- middleware or route guard control
- server action / API control
- data-layer scoping control
- TypeScript server action shape
- transactional write
- explicit `can()` call with scope
- `withPermission()` wrapper
- `audit()` call
- sample audit-log row
- test cases
- OHADA / compliance angle

## Key Decisions

### Skill Name Preserved

The installed skill remains:

```text
rbac
```

This preserves the existing `$rbac` invocation and avoids creating a competing RBAC skill.

### Super Skill Draft Saved Separately

The merged skill content was saved in the workspace before being copied to the installed Codex skill path. This gives the project a durable copy of the full super prompt:

```text
skil-auth-rbac\RBAC_SUPER_SKILL_2026-06-07.md
```

### NextAuth Is Performance Cache, Not Final Authorization

The skill keeps the prompt's freshness model:

- low and medium risk permissions can use current JWT claims when tenant and module match
- high risk permissions re-fetch if claims are older than five minutes
- critical permissions always re-fetch from the database inside the server action, route handler, or service

This makes JWT claims useful for performance and UX without letting stale claims authorize financial or payroll-critical actions.

### Period Locks And OHADA Controls Are First-Class

The accounting anatomy example treats `accounting.period.close` as a critical SYSCOHADA workflow. It requires:

- unposted-entry check
- bank reconciliation completion
- trial balance validation
- transactional period close
- next-period opening snapshot
- guarded reopen path
- `accounting.period.reopen`
- two-party approval
- no self-approval
- mandatory audit reason

### Two-Party Approval Pattern Generalized

Two-party approval appears in:

- accounting period reopen
- high-value POS cash adjustments
- inventory stock adjustment approval
- payroll run approval
- fresh-supplier and recent-bank-change purchasing payment controls

The skill tells Codex to enforce no self-approval at the action layer, not only in the UI.

### Audit-Log Spec Strengthened

The skill keeps an append-only, hash-chained audit-log schema with:

- tenant ID
- actor user ID
- action
- permission
- resource and resource ID
- result
- before and after JSON
- reason
- IP address
- user agent
- request ID
- session ID
- previous hash
- current hash
- timestamp

The skill treats allowed and denied high-risk attempts as audit-worthy and keeps the 10-year retention requirement from the prompt.

## Validation Notes

The installed skill was checked for:

- `name: rbac` frontmatter
- `description` beginning with `Use when`
- skip rules in the description
- discipline anchor: `Violating the letter is violating the spirit`
- typed permission catalog with more than 30 permissions
- bilingual role matrix
- Auth.js v5 / NextAuth freshness rules
- module gating
- five required anatomy examples
- concrete TypeScript snippets
- sample JSON audit rows
- red flags / stop-and-restart section
- pre-ship checklist
- updated `agents/openai.yaml`

The local `quick_validate.py` validator is expected to fail in this environment because the bundled Python runtime is missing `PyYAML`, so manual validation remains the reliable local path.

## Restart Note

Restart Codex to pick up the updated `$rbac` skill in future sessions.
