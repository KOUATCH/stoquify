# Kontava Snapshot Read Models Skill Update Report

Generated: 2026-06-20

## Summary

Updated and validated the installed Codex skill:

`kontava-snapshot-read-models`

The skill already existed, so it was improved in place instead of creating a duplicate. The update strengthens the skill around governed snapshot/read-model foundations for cross-module BI, Owner War Room, Cash Command, Manager Action Center, Cash Leakage Radar, Stock-to-Cash Twin, Close Autopilot, Accountant Trust Pack, Compliance Radar, and future evidence-backed dashboards.

No application snapshot/read-model feature was implemented in this run. This was a skill creation/update and validation task only.

## Installed Skill Path

`C:\Users\J COMPUTER\.codex\skills\kontava-snapshot-read-models`

Updated files:

- `C:\Users\J COMPUTER\.codex\skills\kontava-snapshot-read-models\SKILL.md`
- `C:\Users\J COMPUTER\.codex\skills\kontava-snapshot-read-models\agents\openai.yaml`

## Updated Frontmatter

```yaml
---
name: kontava-snapshot-read-models
description: Use when designing or implementing Kontava tenant, branch, cash, payment, inventory, close, receivable, payable, payroll, compliance, manager action, BI, Owner War Room, or cross-module snapshot/read-model foundations with freshness, source hashes, blockers, redactions, rebuild idempotency, stale fallback, tenant isolation, and performance-safe dashboard contracts.
---
```

## Updated UI Metadata

```yaml
interface:
  display_name: "Kontava Snapshot Read Models"
  short_description: "Build governed snapshot/read-model foundations for Kontava command surfaces."
  default_prompt: "Use this skill to design or implement tenant, branch, cash, payment, inventory, close, receivable, payable, payroll, compliance, manager action, BI, Owner War Room, and cross-module snapshots with freshness, source hashes, blockers, redactions, rebuild idempotency, stale fallback, tenant isolation, and performance-safe dashboard contracts."
```

## Main Improvements

The upgraded skill now gives stronger guidance for:

- contract-first snapshot/read-model work
- tenant-scoped reads and rebuilds
- freshness, source hash, blocker, redaction, and evidence-grade metadata
- stale, partial, blocked, redacted, permission-denied, module-unavailable, and safe-error states
- safe fallback behavior when snapshot generation or rebuilds fail
- idempotent and retry-safe rebuilds
- persistence decisions based on measured need instead of speculation
- redaction of payroll, supplier bank, provider, close, partner, and export-sensitive data
- avoiding low-value snapshot tables and BI data warehouse bloat
- preserving existing tenant, branch, payment truth, inventory cash, and close readiness snapshots
- saving run reports in `moat proposals`

## Scope Preserved

The skill explicitly protects:

- existing tenant operating snapshot
- branch operating snapshot
- payment truth snapshot
- inventory cash snapshot
- close readiness snapshot
- Owner War Room
- analytics pages
- release gate readiness
- tenant isolation
- RBAC checks
- module entitlement behavior
- redaction rules
- evidence grade propagation
- ledger-first accounting semantics
- existing dashboards if snapshot generation fails

## Validation Results

Official skill validation:

```text
Skill is valid!
```

Manual checks:

- Skill folder exists: yes.
- `SKILL.md` exists: yes.
- `agents/openai.yaml` exists: yes.
- Required frontmatter exists: yes.
- Skill name matches folder name: yes.
- Placeholder/TODO text found: no.
- Skill body length: 223 lines.

## Validation Command Used

```powershell
python 'C:\Users\J COMPUTER\.codex\skills\.system\skill-creator\scripts\quick_validate.py' 'C:\Users\J COMPUTER\.codex\skills\kontava-snapshot-read-models'
```

## Work Not Performed

This run did not:

- implement new snapshot models in the app
- edit `services/snapshots/**`
- edit `actions/snapshots/**`
- edit `prisma/schema.prisma`
- run database migrations
- add dashboard UI
- add release-gate checks
- run application typecheck/lint/tests

Those steps belong to a future execution of the `kontava-snapshot-read-models` skill itself.

## Next Recommended Step

Restart Codex if the updated skill metadata does not appear immediately in skill discovery.

Then run:

`kontava-snapshot-read-models`

Recommended first implementation slice:

1. Inspect `services/snapshots/snapshot-contracts.ts` and current snapshot services.
2. Identify one missing high-value read model, preferably `cash command` or `manager action center`, depending on current product priority.
3. Add or refine TypeScript contracts first.
4. Avoid Prisma persistence until usage or performance proves the need.
5. Add focused tests for tenant scope, freshness, source hash stability, stale fallback, blockers, and redactions.
6. Run focused validation and save a run report in `moat proposals`.
