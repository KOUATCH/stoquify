# Country-Pack Decoupling Target Architecture Prompt

Using the recommendations in the [Country-Pack Decoupling Assessment](./COUNTRY_PACK_DECOUPLING_ASSESSMENT_2026-07-26.pdf), determine the single best implementation strategy for temporarily removing the country-pack module from the normal development and feature-integration critical path.

The solution should be clean, modern, enterprise-grade, reversible, and consistent with widely accepted software architecture and DevSecOps practices. Optimize for minimal developer friction, CI blocking, manual intervention, and human approval during ordinary development—without weakening financial integrity, security, tenant isolation, auditability, or production regulatory safeguards.

Do not simply provide several alternatives. Evaluate the available approaches, select one recommended target architecture, justify the decision, and turn it into an implementation-ready plan.

Please:

1. Identify precisely where country-pack dependencies currently enter application runtime, CI, testing, release, and deployment workflows.
2. Define a clear architectural boundary that allows unrelated modules to operate without importing or depending directly on country-pack implementations.
3. Separate development and feature-integration verification from production regulatory certification and promotion.
4. Specify how country-pack-dependent operations should behave when the module is unavailable, using explicit states such as `DEFERRED`, `SANDBOX`, `NON_AUTHORITATIVE`, or `PENDING_COUNTRY_PACK`.
5. Design durable asynchronous handling for deferred obligations—particularly POS fiscalization—so core transactions can complete without losing evidence or required future work.
6. Preserve all essential controls, including:
   - Authentication and authorization
   - Tenant isolation
   - Input validation
   - Payment idempotency
   - Inventory integrity
   - Balanced ledger posting
   - Transactional consistency
   - Audit evidence and provenance
   - Prevention of unsupported production tax calculations
7. Define automated guardrails that make non-production modes impossible to activate accidentally in production.
8. Minimize human approval in development while retaining mandatory independent approval for authoritative regulatory publication, live submissions, certified accounting close, and production promotion.
9. Explain how pending records and deferred operations will be reconciled when country-pack enforcement is restored.
10. Provide:
    - The chosen architecture and decision rationale
    - Exact modules and files affected
    - Required interfaces, states, and data-model changes
    - CI and command changes
    - Migration sequence
    - Test strategy
    - Rollback strategy
    - Measurable acceptance criteria
    - Key risks and mitigations

Prefer the smallest coherent change that creates a durable architectural boundary. Avoid a generic `COUNTRY_PACK_DISABLED` switch, scattered conditional checks, fabricated regulatory values, silent success, or deletion of country-pack contracts and provenance fields.

The desired outcome is a development and integration workflow in which unrelated features can be built, tested, and merged with minimal friction, while every production regulatory action remains explicit, traceable, and fail-closed.
