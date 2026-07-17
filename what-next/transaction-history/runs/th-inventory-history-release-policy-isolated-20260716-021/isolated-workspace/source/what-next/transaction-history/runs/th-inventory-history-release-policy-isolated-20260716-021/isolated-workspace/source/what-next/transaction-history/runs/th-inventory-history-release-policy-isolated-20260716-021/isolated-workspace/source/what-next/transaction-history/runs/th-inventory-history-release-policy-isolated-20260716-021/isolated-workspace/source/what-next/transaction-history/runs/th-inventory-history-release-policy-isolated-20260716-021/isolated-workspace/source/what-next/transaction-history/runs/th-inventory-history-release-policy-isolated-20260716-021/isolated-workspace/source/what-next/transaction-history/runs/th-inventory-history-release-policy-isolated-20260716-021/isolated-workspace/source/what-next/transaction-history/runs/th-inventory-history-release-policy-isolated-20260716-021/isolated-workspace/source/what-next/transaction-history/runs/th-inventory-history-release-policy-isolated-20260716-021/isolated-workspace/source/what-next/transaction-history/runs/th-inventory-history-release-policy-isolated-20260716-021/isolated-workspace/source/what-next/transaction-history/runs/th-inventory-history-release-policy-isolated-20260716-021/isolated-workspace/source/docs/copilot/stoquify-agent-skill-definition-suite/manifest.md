
# Stoquify Copilot Agent and Skill Definition Suite

**Status:** Source candidate, not installed and not production-certified  
**Agents:** 9  
**Skills:** 28

## Purpose

Provide the source-first registry, contracts, definitions, evaluations, and roadmap required to build Stoquify's evidence-backed operating Copilot on the future-ready backbone.

## Authoritative inputs

- `../STOQUIFY_FUTURE_READY_COPILOT_BACKBONE_ARCHITECTURE_PROMPT.md`
- `../../agents and skills/STOQUIFY_ENTERPRISE_AGENT_AND_SKILL_SYSTEM_ASSESSMENT_2026-07-15.md`
- `../STOQUIFY_AGENT_SKILL_DEFINITION_SUITE_REFINED_MASTER_PROMPT_2026-07-15.pdf`

## Source tree

- `registry/`: capability inventory, overlap decisions, matrix, DAG, compatibility.
- `contracts/`: structured outputs, evidence, approvals, handoffs, outcomes, risk/autonomy, templates, tool domains.
- `agents/`: nine three-field TOML definitions and manifest.
- `skills/`: twenty-eight source packages with schemas and evidence/verification references.
- `evaluations/`: machine-readable cases and testing plan.
- `reports/`: execution prompt, traceability, roadmap, first slice, installation proposal, unresolved issues, and validation evidence.
- `scripts/`: deterministic generation and validation.

## Promotion rule

Do not install or treat these definitions as production-ready until validation passes, exact service tools are allowlisted, required model/runtime records exist, independent reviews complete, and explicit installation approval is given.


## Reproducible source pipeline

Run `scripts/generate_suite.py`, then `scripts/augment_suite.py`, then `scripts/harden_suite.py`, and finally `scripts/validate_suite.py`. The hardening stage records corrections from independent adversarial definition reviews; it does not represent runtime execution evidence.
