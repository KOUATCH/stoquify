# Stoquify HRIS Skill Installation And Validation Report

Date: 2026-07-14
Status: Completed

## Scope

Created, validated, installed, and pilot-ran the Stoquify HRIS People Core skill suite requested from the saved HRIS implementation analysis and targeted skill-system blueprint.

The suite is an upstream HRIS layer for People Core. It does not replace the installed `aqstoqflow-hris-payroll-*` skills, which remain the downstream payroll assurance chain.

## Source Artifacts

- `docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md`
- `docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md`
- `docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_PROMPT_2026-07-14.md`
- `docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md`

## Skills Created And Installed

Installed under `C:\Users\J COMPUTER\.codex\skills`:

1. `stoquify-hris-00-orchestrator`
2. `stoquify-hris-01-current-state-register`
3. `stoquify-hris-02-people-boundary-facade`
4. `stoquify-hris-03-permissions-and-route-shell`
5. `stoquify-hris-04-employee-identity-profile`
6. `stoquify-hris-05-lifecycle-workflows`
7. `stoquify-hris-06-org-position-manager-scope`
8. `stoquify-hris-07-contract-document-evidence`
9. `stoquify-hris-08-compensation-benefits-control`
10. `stoquify-hris-09-payment-destination-privacy`
11. `stoquify-hris-10-time-leave-attendance-engine`
12. `stoquify-hris-11-approval-inbox`
13. `stoquify-hris-12-movement-history`
14. `stoquify-hris-13-payroll-readiness-contract`
15. `stoquify-hris-14-employee-self-service`
16. `stoquify-hris-15-manager-self-service`
17. `stoquify-hris-16-accounting-finance-assurance-bridge`
18. `stoquify-hris-17-browser-accessibility-rbac-release`
19. `stoquify-hris-18-migration-backfill-pilot`
20. `stoquify-hris-19-final-readiness`
21. `stoquify-hris-20-extended-hris`

Drafts were saved under:

`what-next/payroll/stoquify-hris-skill-suite-drafts-2026-07-14/`

## Files Created In Repo

- `what-next/payroll/generate_stoquify_hris_skill_suite_2026_07_14.py`
- `what-next/payroll/stoquify-hris-skill-suite-drafts-2026-07-14/*/SKILL.md`
- `what-next/payroll/stoquify-hris-skill-suite-drafts-2026-07-14/*/agents/openai.yaml`
- `what-next/payroll/STOQUIFY_HRIS_SKILL_INSTALLATION_AND_VALIDATION_REPORT_2026-07-14.md`
- `what-next/payroll/STOQUIFY_HRIS_ORCHESTRATOR_REPORT_2026-07-14.md`
- `what-next/payroll/STOQUIFY_HRIS_CURRENT_STATE_REGISTER_2026-07-14.md`

## Validation

Official draft validation:

```powershell
python C:\Users\J COMPUTER\.codex\skills\.system\skill-creator\scripts\quick_validate.py <draft-skill-folder>
```

Result: passed for all 21 draft skills.

Official installed validation:

```powershell
python C:\Users\J COMPUTER\.codex\skills\.system\skill-creator\scripts\quick_validate.py <installed-skill-folder>
```

Result: passed for all 21 installed skills.

Content checks:

- Placeholder scan for `TODO`, `PLACEHOLDER`, `Customize`, `Replace this`, and `Your skill`: no matches.
- Required-section scan confirmed descriptions, report paths, stop conditions, and report contracts are present.
- Installed count: 21.

## Installation Decision

Installed only non-conflicting `stoquify-hris-*` names. No installed `aqstoqflow-hris-payroll-*` skill was overwritten.

## Ordered Pilot Run

The installed suite was then run in dependency order:

1. `stoquify-hris-00-orchestrator`
2. `stoquify-hris-01-current-state-register`

The chain now correctly hands off to:

`stoquify-hris-02-people-boundary-facade`

That handoff is the first implementation slice because the live repo still does not have `services/hris`, `actions/hris`, `components/hris`, or `/dashboard/people`.

## Current Blockers

No blocker remains in the skill creation, validation, or installation process.

The roadmap execution chain is now blocked at the first real implementation prerequisite: create the HRIS People boundary facade without duplicating employee truth or breaking payroll compatibility.

## Next Handoff

Run `stoquify-hris-02-people-boundary-facade` next as a code implementation slice.

The first implementation should remain narrow:

- Add `services/hris/employee.service.ts` facade/read model over current payroll employee storage.
- Add `services/hris/movement-history.service.ts` read model from audit/business events.
- Add `actions/hris/*` only if needed for route-safe reads.
- Do not rename payroll tables.
- Do not create a duplicate employee master.
- Add focused tenant, redaction, duplicate, and payroll compatibility tests.
