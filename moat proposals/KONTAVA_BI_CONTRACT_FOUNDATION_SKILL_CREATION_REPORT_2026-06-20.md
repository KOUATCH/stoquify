# Kontava BI Contract Foundation Skill Creation Report

Generated: 2026-06-20

## Summary

Created, installed, and validated the Codex skill:

`kontava-bi-contract-foundation`

The skill is designed to guide future implementation of Kontava's shared BI contract foundation without directly implementing the BI feature itself. It focuses on tenant-safe, RBAC-aware, module-aware, evidence-backed, redaction-safe, ledger-first BI contracts for dashboards, Manager Action Center, Owner War Room, Cash Command, analytics, proof-backed KPIs, and cross-module insight surfaces.

## Install Path

`C:\Users\J COMPUTER\.codex\skills\kontava-bi-contract-foundation`

Installed files:

- `C:\Users\J COMPUTER\.codex\skills\kontava-bi-contract-foundation\SKILL.md`
- `C:\Users\J COMPUTER\.codex\skills\kontava-bi-contract-foundation\agents\openai.yaml`

## Skill Metadata

```yaml
---
name: kontava-bi-contract-foundation
description: Use when standardizing Kontava BI KPI, evidence, freshness, blocker, redaction, module, permission, ledger trust, action-link, and drill-through contracts before building BI, Manager Action Center, Owner War Room, Cash Command, analytics, or cross-module insight surfaces.
---
```

UI metadata:

```yaml
interface:
  display_name: "Kontava BI Contract Foundation"
  short_description: "Standardize Kontava evidence-backed BI contracts."
  default_prompt: "Use this skill to build or update Kontava BI contracts, evidence adapters, BI server actions, and BI UI primitives safely."
```

## What The Skill Covers

The skill instructs Codex to inspect:

- `services/analytics/**`
- `services/snapshots/**`
- `services/evidence/**`
- `services/owner-war-room/**`
- `services/signals/**`
- `services/modules/**`
- `services/security/**`
- `actions/analytics/**`
- `actions/owner-war-room/**`
- `actions/evidence/**`
- `actions/snapshots/**`
- `components/analytics/**`
- `components/owner-war-room/**`
- `components/evidence/**`
- `scripts/kontava-moat-release-gate.js`
- `package.json`

The skill allows focused edits in:

- `services/bi/**`
- `actions/bi/**`
- `components/bi/**`
- focused analytics consumers
- focused Owner War Room consumers
- focused tests
- release gate updates only when needed

## Main Responsibilities Encoded

The skill guides future work to:

- Create or refine `services/bi/bi-contracts.ts`.
- Define shared contracts for `BIKpiCard`, `BIKpiGroup`, `BIInsight`, `BIBlocker`, `BIDrillThrough`, `BIProvenance`, `BIActionLink`, `BITrustState`, and `BIFreshness`.
- Create `services/bi/bi-evidence-adapter.service.ts` only after the contract shape is clear.
- Normalize snapshots, analytics reports, proof trails, and business signals into one trusted BI contract.
- Add guarded `actions/bi/**` only when a UI surface needs the service.
- Add reusable `components/bi/**` only after service outputs are stable.
- Require every KPI to declare tenant scope, module slug, required permission, evidence grade, freshness, blockers, source modules, redaction state, ledger trust state, and drill-through availability.

## Guardrails Encoded

The skill explicitly protects:

- existing analytics pages
- Owner War Room route
- evidence grade semantics
- proof trail behavior
- snapshot services
- tenant isolation
- RBAC checks
- module entitlement observe/enforcement logic
- redaction rules
- ledger-first report trust labels
- existing unrelated tests

The skill prevents:

- BI data warehouse work in the MVP
- persistent BI tables before usage or measured performance proves the need
- dashboards before the shared contract exists
- client-side computation of trust, permissions, module access, or evidence state
- broad dashboard redesign
- AI, partner API, evidence graph persistence, prediction, or scoring logic
- schema migrations unless justified by contract and measured usage

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
- Skill body length: 159 lines.

## Validation Command Used

```powershell
python 'C:\Users\J COMPUTER\.codex\skills\.system\skill-creator\scripts\quick_validate.py' 'C:\Users\J COMPUTER\.codex\skills\kontava-bi-contract-foundation'
```

## Work Not Performed

This task created, installed, and validated the reusable Codex skill. It did not implement the actual Kontava BI contract feature in the application code, because the source prompt explicitly said not to implement the BI contract feature unless asked to run the skill after creation.

## Next Recommended Step

Restart Codex to pick up the newly installed skill in future skill discovery.

Then execute:

`kontava-bi-contract-foundation`

Expected first implementation slice:

1. Inspect current analytics, snapshots, evidence, signals, and Owner War Room contracts.
2. Create `services/bi/bi-contracts.ts`.
3. Add focused tests for BI contract normalization.
4. Add the evidence adapter only after contract shape is stable.
5. Keep the first slice schema-free and read-only.
