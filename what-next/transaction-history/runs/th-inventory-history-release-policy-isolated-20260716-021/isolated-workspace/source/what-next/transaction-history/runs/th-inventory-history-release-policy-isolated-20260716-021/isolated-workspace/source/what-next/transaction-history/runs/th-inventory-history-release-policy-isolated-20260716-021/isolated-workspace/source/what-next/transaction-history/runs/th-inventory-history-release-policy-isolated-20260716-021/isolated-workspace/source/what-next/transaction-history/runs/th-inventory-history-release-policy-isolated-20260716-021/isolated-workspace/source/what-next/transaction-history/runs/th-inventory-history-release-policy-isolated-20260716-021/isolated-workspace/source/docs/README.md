# Project Documentation Index

Last reorganized: 2026-06-25

This folder is the canonical home for AqStoqFlow project documentation. Root-level tool files such as `README.md`, `AGENTS.md`, and `CLAUDE.md` remain in place because developer tooling expects them there.

## Top-Level Map

| Folder | Use it for |
| --- | --- |
| `architecture/` | System architecture, ADRs, graph/system analysis, core technical maps. |
| `domains/` | Business-domain documentation for accounting close, payments, inventory, POS, HR/payroll, compliance, BI, sales, purchasing, and workflow assurance. |
| `engineering/` | Contributor workflow, testing, database/seeding, scripts, release gates, ratchets, and codebase quality reports. |
| `operations/` | Runbooks and operational procedures. |
| `planning/` | Backlog, roadmaps, next-step plans, and migration plans. |
| `product/` | Product strategy, innovation, roadmap, proposals, platform insights, and user-experience reports. |
| `prompts/` | Skill prompts, implementation prompts, idea drafts, and prompt packs. |
| `security/` | Auth, RBAC, security reviews, findings, hardening, and audit material. |
| `archive/` | Legacy documentation, old exports, external notes, and ambiguous material retained for reference. |
| `_inventory/` | Move map and reorganization report. |

## Quick Entry Points

- Architecture decisions: `architecture/decisions/`
- Security and RBAC: `security/auth-rbac/` and `security/rbac/`
- Accounting close and OHADA docs: `domains/accounting-close/`
- Payment reconciliation docs: `domains/payments-reconciliation/`
- Workflow assurance docs: `domains/workflow-assurance/`
- HR/payroll docs: `domains/hr-payroll/`
- Product innovation reports: `product/innovation/`
- Moat and platform proposals: `product/proposals/moat/` and `product/strategy/`
- Release and quality gates: `engineering/quality-gates/`
- Full old-to-new path map: `_inventory/documentation-move-map-2026-06-25.csv`

## Counts By Destination

| Destination | Documents |
| --- | ---: |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 11 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 7 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 1 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 1 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 22 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 1 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 13 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 11 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 9 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 39 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 11 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 6 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 5 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 3 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 7 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 1 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 14 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 18 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 4 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 47 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 2 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 2 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 3 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 12 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 28 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 1 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 29 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 1 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 44 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 1 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 5 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 13 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 26 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 1 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 24 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 7 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 19 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 3 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 2 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 2 |
| $(Microsoft.PowerShell.Commands.GroupInfo.Name)/ | 4 |

## Filing Rules Going Forward

- Put stable product or technical docs in the matching `architecture/`, `domains/`, `engineering/`, `product/`, or `security/` folder.
- Put dated execution evidence and gate output in `engineering/quality-gates/` unless it clearly belongs to a specific domain folder.
- Put prompts and skill-build briefs in `prompts/` rather than mixing them with implementation reports.
- Keep generated JSON baselines beside the scripts that still consume them unless the consuming command is updated too.
- Avoid creating new top-level documentation folders; add a subfolder under `docs/` instead.
