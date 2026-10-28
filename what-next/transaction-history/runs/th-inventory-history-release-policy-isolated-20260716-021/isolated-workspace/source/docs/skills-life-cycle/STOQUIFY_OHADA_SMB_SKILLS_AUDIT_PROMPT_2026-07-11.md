# Stoquify OHADA SMB Operating-System Skills Audit Prompt

Date: 2026-07-11

Purpose: Source prompt used to request a systematic, evidence-grounded audit of the Stoquify codebase and identify the next most important Codex skills to create.

## Prompt

Go through this codebase thoroughly, methodically, and systematically.

Your mission is not to make code changes yet. Your mission is to audit the codebase as if it were being prepared to become the leading OHADA-focused SMB operating system: the daily workspace for owners, accountants, finance officers, cashiers, managers, warehouse managers, purchasing managers, POS operators, and other operational users.

Evaluate the project against the standard of a battle-tested, enterprise-grade, professional, finance-and-accounting-grade product: secure, auditable, correct, useful, efficient, modern, maintainable, and delightful to use.

Study the codebase deeply before making recommendations. Inspect, at minimum:

- architecture and module boundaries
- authentication, authorization, RBAC, tenant isolation, and access control
- accounting, ledger, OHADA/SYSCOHADA, POS, inventory, purchasing, payments, expenses, and reconciliation flows
- service-layer ownership of business truth
- data integrity, validation, idempotency, auditability, and financial correctness
- security posture, redaction, privacy, secrets, public routes, and abuse resistance
- UI/UX consistency, daily workflow usefulness, role-based ergonomics, and operational clarity
- testing strategy, CI/release gates, observability, error handling, and production readiness
- documentation, developer experience, and long-term extensibility

Then propose at least, the 10 most important Codex skills that should be created next to move this codebase toward its dream standard.

For each proposed skill, provide:

1. Skill name
2. Core mission
3. Why this skill matters strategically
4. Which parts of the codebase justify it, with concrete files/modules/examples
5. What the skill should inspect or modify when invoked
6. What "done" should mean for the skill
7. Suggested verification commands or evidence
8. Risks if this skill is not created
9. Priority ranking from 1 to 5

Important constraints:

- Ground every recommendation in actual codebase evidence.
- Do not invent generic skills that could apply to any SaaS product.
- Focus on skills that would repeatedly help this specific OHADA SMB operating system become more secure, correct, usable, and commercially defensible.
- Prefer skills that encode durable engineering judgment, not one-off fixes.
- Distinguish between skills for auditing, implementation, verification, UX improvement, and production hardening.
- Keep the recommendations practical enough that each skill can later be implemented as a real Codex skill under the local skills folder.

Final output:

Create a concise but serious report titled:

"Top 5 Codex Skills to Advance Stoquify Toward OHADA SMB Operating-System Leadership"

Include an executive summary, the ranked skill list, and a final recommendation on which skill should be created first and why.
