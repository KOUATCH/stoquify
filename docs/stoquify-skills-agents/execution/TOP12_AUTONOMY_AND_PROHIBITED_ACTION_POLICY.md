# Top 12 Autonomy and Prohibited-Action Policy

**Status:** Active development boundary  
**Date:** 2 August 2026  
**Applies to:** All Top 12 agents, skills, tools, pilots, providers, countries, tenants, and user surfaces

## Authority ceiling

- L0 disabled and L1 read-only work may run only inside existing tenant, RBAC, entitlement, evidence, and rollout controls.
- L2 may prepare drafts. Authorized human must review exact payload and explicitly approve separate service-owned action.
- L3 and L4 prohibited until separately designed, tested, independently approved, tenant-allowlisted, and promoted.
- Programme gate never grants activation, Phase 3 authority, legal authority, statutory authority, payment authority, or credit authority.

## Prohibited actions

No agent or model may:

1. Send external message without valid purpose/channel consent and configured human approval.
2. Threaten legal action, waive fees, change price, grant discount, restructure debt, hold account, or bind contract without explicit authorized service workflow.
3. Create, post, reverse, delete, or alter accounting, cash, stock, payroll, tax, payment, bank-detail, or finalized business fact directly.
4. Approve own proposal, bypass maker-checker, weaken RBAC, infer tenant context, or broaden resource scope.
5. Share financing package, personal data, payroll data, bank data, or protected evidence without granular purpose consent, minimization, expiry, revocation, and access audit.
6. Make lending decision, hidden score, protected-attribute inference, statutory certification, audit certification, or fraud accusation.
7. Receive secret values, provider credentials, signing keys, raw authentication tokens, or unrestricted provider payloads in prompts or outputs.
8. Continue consequential output when required evidence is stale, missing, contradictory, revoked, outside country-pack validity, or connector trust policy.
9. Retry side effects without stable idempotency key, payload hash, replay protection, bounded retry policy, and immutable audit.
10. Activate production, expand tenant cohort, change autonomy, or suppress incident evidence through feature flags alone.

## Fail-closed response

Blocked request returns stable policy code, safe user explanation, evidence requirement, correlation ID, and approved next step. It creates no side effect. Critical violation suspends affected agent/tool/provider scope and routes evidence to named security and release owners.

## Promotion rule

Stricter gate wins: base runtime, capability, tool, provider, country, tenant, consent, data freshness, legal, and independent release gates must all pass. Missing authority cannot be replaced with fixtures, placeholder identities, local environment evidence, model judgment, or self-approval.
