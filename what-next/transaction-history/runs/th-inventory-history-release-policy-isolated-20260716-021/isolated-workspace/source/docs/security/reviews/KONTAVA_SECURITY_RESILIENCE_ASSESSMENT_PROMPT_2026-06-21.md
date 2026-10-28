# Kontava Security, Resilience, And Abuse-Resistance Assessment Prompt

Conduct a deep cybersecurity, resilience, reliability, and abuse-resistance assessment of the Kontava platform.

This platform will become a critical operating system for SMBs, so failure, compromise, data loss, fraud, tenant leakage, accounting corruption, payroll exposure, payment manipulation, or prolonged downtime would be unacceptable once the system is launched and actively used.

Analyze the system like a senior cybersecurity architect, cloud security engineer, application security expert, financial-systems auditor, and enterprise reliability engineer.

The goal is to identify which parts of the platform could be broken, abused, misconfigured, attacked, or destabilized intentionally or accidentally, explain why those areas are vulnerable, and propose modern, professional, enterprise-grade protections that make the system extremely difficult to compromise and fast to detect, contain, and recover from if something goes wrong.

Important: focus on defensive analysis, secure architecture, hardening, monitoring, detection, prevention, and recovery. Do not provide offensive exploit instructions beyond what is necessary to explain risk at a high level.

Analyze:

## 1. Critical Failure And Attack Surfaces

- Authentication and session management.
- Tenant isolation and organization scoping.
- RBAC, wildcard permissions, role escalation, and permission bypass.
- Module entitlements and subscription-based access control.
- Server actions, APIs, route guards, middleware, and direct URL access.
- Prisma/database access, migrations, seed scripts, and backfills.
- Accounting ledger, journal posting, OHADA compliance logic, close assurance, and audit trails.
- POS, inventory, purchasing, payroll, finance, reconciliation, reporting, exports, and dashboards.
- File uploads, imports, generated reports, PDFs, CSV/Excel exports, and attachments.
- Background jobs, queues, scheduled tasks, webhooks, and integrations.
- Payment reconciliation, mobile money/bank/payment provider ingestion, suspense handling, and provider references.
- Admin panels, settings, user invites, password reset, email verification, and organization registration.
- Frontend state, client-side trust assumptions, cached data, and hidden UI elements.
- DevOps, secrets, environment variables, CI/CD, deployment, logs, backups, and observability.

## 2. How The System Could Break

For each area, explain:

- What could fail accidentally.
- What could be abused intentionally.
- What could be misconfigured.
- What could corrupt financial, inventory, payroll, or compliance data.
- What could leak tenant data.
- What could allow unauthorized actions.
- What could create fraud, false reports, or audit gaps.
- What could cause downtime or degraded performance.
- What business impact the failure would have on SMBs.

## 3. Security Architecture Recommendations

Propose a professional hardening plan covering:

- Zero-trust internal architecture.
- Strict tenant isolation at every service, query, action, API, job, export, and report layer.
- Defense-in-depth RBAC and module entitlement enforcement.
- Server-side authorization only.
- Sensitive-action step-up authentication.
- Maker-checker approvals for high-risk actions.
- Immutable audit logs and evidence trails.
- Ledger-first accounting controls.
- Secure reconciliation evidence and source linking.
- Data redaction and field-level sensitivity policies.
- Export controls and watermarking.
- Fraud detection and anomaly alerts.
- Abuse-rate limits and bot protection.
- Secure file handling.
- Secrets management.
- Database constraints and transaction safety.
- Backup, restore, disaster recovery, and rollback strategy.
- Monitoring, alerting, SIEM-ready logs, and incident response.

## 4. Reliability And Resilience

Explain how to prevent operational failure through:

- Transactional integrity.
- Idempotent server actions.
- Background job retry safety.
- Queue poison-message handling.
- Safe migrations.
- Feature flags and observe mode.
- Staged rollouts.
- Circuit breakers.
- Read-only fallback modes.
- Degraded-mode UX.
- Performance budgets.
- Load testing.
- Data-quality gates.
- Automated release gates.

## 5. Security Testing Plan

Define the tests needed before launch:

- Unit tests.
- Service tests.
- Server action/API authorization tests.
- Tenant isolation tests.
- RBAC and module entitlement tests.
- Direct URL access tests.
- Export/report permission tests.
- Background job authorization tests.
- Payroll and payment redaction tests.
- Ledger immutability tests.
- Migration/backfill tests.
- E2E tests.
- Penetration testing scope.
- Threat modeling workshops.
- Disaster recovery drills.

## 6. Risk Register

Create a ranked risk register with:

- Risk name.
- Affected module.
- Severity.
- Likelihood.
- Business impact.
- Technical cause.
- Detection method.
- Prevention method.
- Mitigation.
- Recovery plan.
- Owner/team responsible.

## 7. Enterprise Security Roadmap

Produce a phased roadmap:

- Phase 0: immediate critical hardening before launch.
- Phase 1: tenant/RBAC/module enforcement hardening.
- Phase 2: ledger, audit, reconciliation, payroll, and export protection.
- Phase 3: monitoring, incident response, backup, and recovery maturity.
- Phase 4: fraud intelligence, anomaly detection, and advanced security automation.
- Phase 5: third-party security audit, penetration testing, compliance certification, and enterprise readiness.

## 8. Final Output

Produce a detailed professional report containing:

- Executive summary.
- Critical vulnerabilities and failure points.
- Attack and failure surface map.
- Module-by-module risk analysis.
- Defensive architecture recommendations.
- Security control checklist.
- Reliability and recovery plan.
- Testing and verification plan.
- Risk register.
- Prioritized security roadmap.
- Clear recommendation on what must be fixed before launch and what can be improved after launch.

The final report should be practical, direct, deeply technical, and enterprise-grade. It should help Kontava become extremely attack-resistant, resilient, auditable, recoverable, and trustworthy for SMBs, accountants, owners, staff, fintech partners, and regulators.
