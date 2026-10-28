# Stoquify Production Unblocking and Skill 015 Execution Prompt

**Date:** 22 August 2026  
**Workspace:** `E:\ohada saas\Focused projects\stoquify`  
**Program:** Enterprise production unblocking and Country Adapter Pilot readiness  
**Current decision:** Internally engineering-ratified; production authorization remains `NO`

## Executive recommendation

Use a hybrid production-unblocking system:

1. One persistent Goal Agent controls sequencing, the blocker register, evidence completeness, and promotion decisions.
2. Bounded Stoquify skills execute technical work packages without expanding their authority.
3. Qualified humans approve statutory, security, database, provider, accessibility, operational, and final-release gates that an AI agent cannot self-certify.
4. Only one work package is active at a time. Any unresolved HIGH or CRITICAL invariant blocks promotion.
5. Every conclusion must identify the source evidence, environment, candidate commit, limitations, owner, and approval date.

The immediate next technical program is `015-aqstoqflow-country-adapter-pilot`, but it must run inside the production-unblocking control structure described below.

## Current verified truth

- Payroll Trust Spine Work Packages 0–8 are internally engineering-ratified.
- Skill 012 is approved for skill 013 internal engineering.
- Skill 013 is approved for skill 014 internal engineering.
- Skill 014 is approved for skill 015 internal engineering.
- Purchasing/AP is ready at 11/11, including `goods_receipt_atomic_stock_posting`.
- Payroll Trust Spine is ready at 6/6.
- Report trust is ready at 35/35.
- Offline POS replay is ready at 16/16.
- These results establish internal engineering readiness only. They do not constitute statutory, provider, infrastructure, accessibility, security, or production certification.

## Blockers and gates

A **blocker** is a failed requirement or missing evidence that prevents promotion. A **gate** is the automated or human-controlled decision mechanism that verifies whether the blocker is closed.

| Blocker | What is missing | Required gate and closure evidence | Primary owner |
|---|---|---|---|
| Statutory expert approval | Qualified review of country-pack sources, interpretations, parameters, effective dates, and legal limitations | Version-bound signed expert review; source hashes; review date and expiry; unresolved interpretations; revocation behavior | Qualified OHADA/SYSCOHADA, payroll, tax, or local regulatory expert |
| Production credentials and provider evidence | Managed credentials and production-shaped evidence for banks, mobile money, fiscal, authority, email, storage, and webhook integrations | Secret-vault evidence; least privilege; rotation; signed callback verification; idempotency; failure/retry; settlement and reconciliation evidence | Security owner and each provider-integration owner |
| Managed database and migration proof | Evidence from an approved production-representative managed PostgreSQL environment | Clean migration replay; snapshot upgrade; tenant isolation; constraints; concurrency; rollback; backup/restore; RPO/RTO; zero-loss reconciliation | DBA, data architect, SRE, and release manager |
| Dirty worktree and provenance | A clean, reproducible candidate whose changes have known owners and intent | Ownership manifest; clean candidate commit; reproducible checkout/build; reviewed diff; no user work discarded | Engineering lead and code owners |
| Eight inherited raw-error findings | Safe typed errors, redaction, stable operator recovery information, and regression coverage | Raw-error gate at zero applicable findings; focused negative tests; security review | Domain code owners and application-security reviewer |
| Operational release readiness | Production monitoring, recovery, deployment, accessibility, support, incident, and continuity proof | Operational rehearsal; observability; DR; browser/accessibility; rollback; runbooks; independent signoffs | SRE, security, QA, accessibility, operations, and release manager |
| Windows-locked generated policy report | A complete monolithic policy-chain run is unavailable from the locked local path | Reproduce and remove the lock in a clean workspace or CI runner; run the entire chain on the exact candidate commit | Build/release engineering |
| Country-specific production proof | One governed country adapter with expert-reviewed provenance and production capability constraints | Successful `015-aqstoqflow-country-adapter-pilot` evidence plus statutory and downstream release gates | Country-pack owner and qualified local expert |

## Refined execution prompt

Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

### Mission

Design and, where authorized, execute a complete production-unblocking program. Explain every blocker and gate in plain language, determine its live status from current evidence, identify the person or team capable of closing it, define the exact proof required, and arrange the work in a dependency-safe roadmap.

Do not treat external approval, credentials, or production infrastructure evidence as ordinary code defects. Do not fabricate or simulate evidence that must come from qualified experts, providers, managed infrastructure, or production-shaped environments.

### Review board

Permanent core reviewers:

- Principal enterprise/platform architect.
- Staff backend/domain and integration engineer.
- Principal data/database and migration architect.
- Principal application-security, IAM, privacy, and abuse-resistance architect.
- Senior frontend and design-systems engineer.
- Principal workflow/service designer, accessibility specialist, and localization/content strategist.
- Principal product strategist and business-process analyst.
- Principal quality engineer and release-assurance lead.
- Principal SRE/DevSecOps, observability, resilience, and performance engineer.
- Principal SaaS platform, packaging, billing, growth, customer-success, and product-operations strategist.

Required domain reviewers:

- OHADA/SYSCOHADA statutory, tax, payroll, labor, privacy, and country-pack specialist.
- Finance, accounting, treasury, reconciliation, fraud-risk, and internal-controls specialist.
- Audit, records-governance, evidence, and data-quality specialist.
- Purchasing/AP, POS, inventory, offline-sync, payroll, payment, close-assurance, and accountant-portal specialists.
- API, webhook, outbox, provider-integration, secrets-management, and infrastructure specialists.
- Change-management, training, support, incident-response, and rollout specialists.

Require an explicit finding or `not applicable` determination from every reviewer.

### Program-control method

Use one persistent Goal Agent as program controller. Maintain a machine-readable execution register, permit only one active work package, and stop promotion on any unresolved HIGH or CRITICAL invariant.

Use bounded skills or specialist work packages for implementation and verification. Skills may produce technical evidence but may not manufacture statutory approval or external production proof.

Apply four approval classes:

- `INTERNAL_ENGINEERING_READY`
- `EXTERNAL_EVIDENCE_REQUIRED`
- `PRODUCTION_CONTROL_VERIFIED`
- `PRODUCTION_AUTHORIZED`

Only an explicitly identified qualified human review body may grant `PRODUCTION_AUTHORIZED`.

## Work-package roadmap

### WP0 — Production truth and ownership baseline

- Inspect Git branch, HEAD, worktree, ownership boundaries, recent reports, gates, scripts, migrations, and saved evidence.
- Distinguish current source truth from stale reports.
- Inventory dirty files and classify them as user-owned, roadmap-owned, generated, or unknown.
- Reproduce the Windows report lock in a disposable clean workspace or CI runner.
- Establish the execution register and evidence directories.

**Promotion condition:** Every blocker has an ID, severity, owner, evidence contract, dependencies, closure test, and decision authority.

### WP1 — Skill 015 Country Adapter Pilot

- Run `015-aqstoqflow-country-adapter-pilot` for one explicitly approved pilot country and bounded capability set.
- Keep statutory parameters outside application code.
- Require source provenance, effective dates, versioning, capability state, review expiry, and unsupported-operation failure behavior.
- Prove golden fixtures, unsupported-country behavior, version selection, and country-pack isolation.
- Do not treat fixtures, static gates, or local tests as legal approval.

**Promotion condition:** The adapter is internally deterministic, versioned, provenance-linked, fail closed, and ready for qualified review.

### WP2 — Statutory expert approval

- Define reviewer qualifications, jurisdiction, scope, independence, and conflict-of-interest requirements.
- Prepare a packet containing source artifacts, hashes, effective dates, parameter tables, assumptions, unresolved interpretations, golden cases, and known limitations.
- Obtain signed or otherwise verifiable approval tied to the exact country-pack version.
- Enforce expiry, revocation, mismatch, and supersession behavior.

**Promotion condition:** The production country-pack gate recognizes a valid, current, version-bound qualified approval.

### WP3 — Credentials and provider/authority certification

- Inventory live banks, mobile-money providers, fiscal services, authorities, email, storage, webhook, and identity integrations.
- Store credentials in an approved managed secret service; never in source, reports, screenshots, fixtures, or logs.
- Prove least privilege, environment separation, rotation, signed callbacks, replay protection, idempotency, timeouts, retries, circuit breaking, redaction, and reconciliation.
- Exercise sandbox and production-shaped scenarios without real-money or legally effective actions unless explicitly authorized.
- Save acknowledgement, callback, rejection, settlement, exception, and reconciliation evidence.

**Promotion condition:** Every production integration has an owner, healthy credential boundary, verified callback contract, failure recovery, reconciliation, monitoring, and current certification evidence.

### WP4 — Managed database and migration certification

- Use an approved production-representative managed PostgreSQL environment.
- Replay every migration from an empty database.
- Upgrade a sanitized production-shaped snapshot.
- Prove tenant isolation, schema constraints, immutable-history triggers, monetary precision, indexes, transaction isolation, concurrency, retry, idempotency, and failure rollback.
- Prove backup creation, restore, point-in-time recovery where supported, RPO/RTO, and zero-loss reconciliation.
- Require explicit approval before any destructive migration, reset, reseed, or data correction.

**Promotion condition:** A named database/release owner approves migration, rollback, backup/restore, reconciliation, and production topology evidence for the exact candidate.

### WP5 — Dirty-tree and raw-error closure

- Establish a clean candidate from an owned commit without discarding user work.
- Attribute every inherited modification to an owner and decision.
- Close the eight raw-error findings with typed safe errors, redaction, correlation details, and focused negative tests.
- Avoid unrelated lint cleanup, broad refactors, or unrelated module changes.
- Produce a clean diff and reproducible build.

**Promotion condition:** The release candidate is attributable and reproducible, and the applicable raw-error gate has zero unresolved release-blocking findings.

### WP6 — Operational readiness

- Verify metrics, structured logs, tracing, alerts, dashboards, queue health, dead-letter handling, scheduled jobs, capacity, latency, and cost limits.
- Exercise provider outage, database degradation, backup/restore, rollback, feature deactivation, credential rotation, incident response, and disaster recovery.
- Verify tenant-safe support and audit tools.
- Produce deployment, rollback, incident, escalation, DR, and business-continuity runbooks.

**Promotion condition:** Named SRE, security, operations, and service owners approve the rehearsal evidence and runbooks.

### WP7 — UX, accessibility, localization, and support readiness

- Run authenticated English and French browser verification for critical workflows.
- Test keyboard operation, screen-reader behavior, focus management, error recovery, loading, empty, degraded, responsive, and permission-denied states.
- Verify sensitive-data redaction and fresh-auth behavior.
- Produce support, training, onboarding, known-limitations, and escalation material.

**Promotion condition:** Critical journeys have saved browser/accessibility evidence and independent accessibility, product, support, and security review.

### WP8 — Full release rehearsal and final decision

- Run the complete policy chain from a clean workspace or CI runner where generated reports cannot be locked by another process.
- Run focused domain gates before the monolithic policy chain.
- Run the build, migrations, security verification, authenticated browser checks, rollback rehearsal, and evidence-integrity checks on the exact candidate commit.
- Make every artifact dated, hashed, environment-labelled, immutable, and candidate-linked.
- Convene an independent release review and issue `GO`, `CONDITIONAL_GO`, or `NO_GO`.

**Promotion condition:** No HIGH or CRITICAL blocker remains; all mandatory human approvals and production-shaped evidence exist; the complete policy chain passes; rollback is proven; and the authorized release body signs the decision.

## Evidence to inspect

- `docs/HRIS-Payroll/payroll-trust-spine-execution/EXECUTION_REGISTER.md`
- `docs/HRIS-Payroll/payroll-trust-spine-execution/execution-register.json`
- `docs/HRIS-Payroll/payroll-trust-spine-execution/evidence/WP-08/WP8_DECISION.md`
- `docs/HRIS-Payroll/payroll-trust-spine-execution/evidence/WP-08/wp8-verification.json`
- `what-next/payroll/AQSTOQFLOW_012_PAYROLL_PRESENCE_RATIFICATION_2026-08-22.md`
- `what-next/accounting/AQSTOQFLOW_013_DATA_TRUST_ACCOUNTANT_PORTAL_RATIFICATION_2026-08-22.md`
- `what-next/AQSTOQFLOW_014_OFFLINE_POS_SYNC_RATIFICATION_2026-08-22.md`
- relevant statutory, release, migration, workflow-assurance, security, accessibility, provider, and country-pack reports under `what-next/`
- architecture and dependency reports under `graphify-out/`
- policy and release scripts in `package.json`
- applicable source and tests under `app/`, `actions/`, `services/`, `components/`, `hooks/`, `lib/`, `config/`, `prisma/`, and `scripts/`

## Expected artifacts

- `docs/production-readiness/stoquify-production-unblocking/EXECUTION_REGISTER.md`
- `docs/production-readiness/stoquify-production-unblocking/execution-register.json`
- evidence packages under `docs/production-readiness/stoquify-production-unblocking/evidence/WP-XX/`
- statutory expert-review packet and approval reference
- provider and managed-infrastructure evidence manifests
- migration, backup, restore, rollback, and reconciliation certificates
- deployment, incident-response, DR, accessibility, support, and operational runbooks
- `what-next/AQSTOQFLOW_PRODUCTION_UNBLOCKING_DECISION_<DATE>.md`
- final machine-readable `GO`, `CONDITIONAL_GO`, or `NO_GO` decision

## Verification commands

Discover authoritative commands from `package.json`; do not invent or silently substitute them. Run the applicable equivalents of:

```powershell
npm run typecheck
npm run prisma:validate
npm run build:app
npm run purchasing:ap:gate
npm run payroll:presence:gate
npm run payroll:trust-spine:gate
npm run report:trust:export:gate
npm run offline:pos:replay:gate
npm run workflow:assurance:runtime-check
npm run policy:gates
```

Add focused unit, integration, migration, concurrency, rollback, security, provider-contract, and browser/accessibility tests for every changed boundary. Record every command as passed, failed, skipped, timed out, or blocked.

## Risk controls and stop conditions

- Preserve inherited dirty-worktree changes and record ownership before editing.
- Never accept tenant, actor, permission, entitlement, approval, or fresh-auth facts from clients.
- Preserve RBAC, SoD, inspection holds, immutable history, ledger/source links, reconciliation, and close invalidation.
- Do not execute destructive database operations without explicit approval and a verified target.
- Do not place production secrets in Git, reports, fixtures, logs, or screenshots.
- Do not send real payments, filings, fiscal documents, payroll effects, or authority calls without explicit authorization.
- Do not allow implementers to self-certify statutory, security, database, accessibility, or final release approval.
- Do not bypass, weaken, mock, or hard-code a gate merely to obtain a green result.
- Do not treat local, static, or sandbox evidence as production evidence.
- Stop promotion on any HIGH or CRITICAL invariant failure.

## Success criteria

The platform is completely unblocked for controlled production only when:

- every blocker has a named owner, evidence contract, closure test, and signed decision;
- the country adapter has qualified, dated, version-bound expert approval;
- provider credentials and callbacks are managed, verified, rotated, reconciled, and production-shaped;
- the managed database passes clean migration, upgrade, tenant-isolation, concurrency, rollback, backup, restore, and reconciliation certification;
- the candidate worktree and build are clean, attributable, and reproducible;
- all release-blocking raw-error findings are closed without information leakage;
- operational, DR, accessibility, localization, security, support, and training readiness are evidenced;
- the Windows report-lock problem is absent in the clean release environment;
- the complete monolithic policy chain passes on the exact candidate commit;
- independent reviewers issue a documented production decision; and
- production remains unauthorized until every mandatory criterion is satisfied.

## Non-goals

- Do not add unrelated product features or redesign unrelated dashboards.
- Do not perform broad refactors or general lint cleanup.
- Do not deploy, rotate production credentials, migrate production data, or trigger live provider effects without explicit authorization.
- Do not overwrite historical reports; supersede them with dated evidence.
- Do not manufacture expert, provider, infrastructure, accessibility, or operational evidence.

## Recommended follow-up sequence

1. Establish WP0 and assign accountable owners for every blocker.
2. Execute `015-aqstoqflow-country-adapter-pilot` for one approved pilot country.
3. Prepare the statutory review packet while infrastructure teams build managed-database and provider evidence in parallel.
4. Resolve dirty-tree and raw-error issues before cutting the candidate release commit.
5. Perform the operational rehearsal and independent final release review only after upstream evidence is complete.
