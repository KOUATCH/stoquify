# Kontava Cybersecurity, Resilience, Reliability, and Abuse-Resistance Assessment

Date: 2026-06-21

System reviewed: Kontava / AqStoqFlow OHADA-zone SMB operating platform

Scope: defensive security, resilience, abuse resistance, operational continuity, tenant safety, compliance trust, and enterprise launch readiness.

## 1. Executive Summary

Kontava is becoming a critical SMB operating system that can touch cash, stock, purchasing, payroll, payments, finance, compliance, accounting evidence, and business decisions. Once launched, a failure is not merely a software bug. It can create business loss, incorrect books, leaked payroll data, fraudulent stock movement, wrong tax evidence, broken close periods, or loss of trust with accountants and owners.

The system already has several strong foundations:

- BetterAuth-based authentication with email verification requirements, password policy work, Argon2 password hashing, session refresh through database-backed RBAC context, account lock checks, and login lockout logic.
- A centralized `protect` wrapper for server actions, with tenant checks, RBAC checks, optional fresh-auth checks, safe errors, and correlation IDs.
- A richer RBAC layer in `lib/security/rbac.ts`, including permission expansion, audit logging for denied access, stale organization checks, and account-state checks.
- Ledger-first accounting foundations with journal entries, ledger posting batches, source links, evidence-oriented models, close/certification work, and idempotency patterns.
- Business event and outbox foundations, including idempotency and payload hash semantics.
- Payment reconciliation and close assurance foundations that are moving toward proof-backed workflows.
- Security headers in middleware and some production-minded upload constraints.
- Module entitlement foundations in observe mode.

However, the platform is not yet ready to be considered extremely hard to attack or operationally unbreakable. The largest pre-launch risks are not exotic attacks. They are predictable enterprise SaaS failure modes:

- Weak or plaintext verification/reset token patterns.
- MFA and step-up authentication foundations that exist but are not fully connected.
- Public receipt access based on a raw business identifier instead of a signed public token.
- Upload storage under `public/uploads` and broad document/archive upload capability without malware scanning, content disarm, quarantine, or signed private delivery.
- Legacy server actions and API routes that do not all use the same guard contract.
- Client-propagated `organizationId` patterns and fallback tenant IDs that must never become authorization authority.
- Admin wildcard and superuser behavior that can bypass tenant boundaries unless converted into controlled break-glass access.
- Module entitlements still running in observe mode, meaning non-subscribed modules are not yet a security boundary.
- Audit logging that can skip pre-organization or failed organization events.
- In-memory rate limiting and permissive CSP tradeoffs that are not enough for production abuse resistance.
- Report/export paths that must be centralized, watermarked, permission-gated, and audited before broad use.

The professional goal should not be to claim that Kontava is "unattackable." No serious cybersecurity expert would make that claim. The correct goal is:

> Make Kontava tenant-safe, least-privilege by default, tamper-evident, export-controlled, abuse-resistant, resilient under failure, recoverable after incidents, and unable to silently corrupt accounting truth.

## 2. Assessment Basis

This report is based on static inspection of the codebase and architecture surfaces, including:

- Authentication and session files: `lib/auth.ts`, `lib/auth-server.ts`, `lib/security/auth-session.ts`.
- RBAC and authorization: `lib/security/rbac.ts`, `lib/security/server-authz.ts`, `services/_shared/protect.ts`, `services/_shared/resolve-action-organization.ts`.
- Module control: `services/modules/module-entitlement.service.ts`.
- Audit and security events: `lib/security/audit-log.ts`.
- Middleware and headers: `middleware.ts`.
- Upload and file delivery surfaces: `app/api/uploads/[...path]/route.ts`, `app/api/uploadthing/core.ts`, `actions/storage/photo-upload-actions.ts`, `actions/storage/storage-config-actions.ts`.
- Public receipt surface: `app/api/receipts/[receiptId]/route.ts`, `services/pos/receipt.service.ts`.
- User verification and token helpers: `lib/generateOtp.ts`, `lib/token.ts`, `services/users/user-identity.service.ts`, user verification/reset actions.
- Representative legacy and modern server action patterns across inventory, purchasing, users, units, accounting, payroll, payment reconciliation, and reports.
- Prisma schema foundations around tenant scope, ledger posting, audit logs, business events, outbox, reconciliation, close certification, and indexes.
- Existing Kontava security-redaction skill expectations.

Limits:

- This was not a live penetration test.
- No exploit execution was performed.
- No secrets were extracted or validated.
- No external infrastructure, cloud account, DNS, WAF, backups, or production telemetry was inspected.
- The findings should be treated as a serious engineering security review and launch-readiness plan, not as a formal certification.

## 3. Security Posture Rating

| Area | Current posture | Launch readiness |
|---|---:|---:|
| Authentication foundation | Medium to strong | Needs MFA and token hardening |
| Session and RBAC | Strong foundation | Needs universal enforcement and break-glass controls |
| Tenant isolation | Good foundation | Needs zero client-authority and direct URL/API tests |
| Module entitlements | Early foundation | Not ready as security boundary |
| Ledger/accounting integrity | Strong direction | Needs uniform service-only mutation and close guards |
| Auditability | Good foundation | Needs immutable security event sink and no-skip policy |
| Upload/file safety | Medium | Not production-safe for sensitive files yet |
| Public receipt sharing | High risk | Must be redesigned before launch |
| Reports/exports | Medium | Needs central export guard, watermarking, fresh auth |
| Rate limiting/abuse control | Basic | Needs distributed controls |
| DevOps/recovery | Unknown to medium | Needs backup, restore, secret, deployment, and incident drills |
| Observability | Medium | Needs security and reliability dashboards |

Overall: promising enterprise foundation, but not yet launch-hardened for a vital financial operating system.

## 4. Highest Priority Pre-Launch Fixes

These should be treated as P0 or P1 before broad production use by real SMBs.

1. Replace all weak token and OTP generation with cryptographic randomness.
   - Use `crypto.randomInt`, `crypto.randomBytes`, or a secure token generator.
   - Store token hashes, not raw tokens.
   - Add attempt counters, resend throttles, IP/device rate limits, expiry, one-time use, and audit events.

2. Complete MFA and true step-up authentication.
   - The schema has MFA-related fields, and sensitive actions use `freshAuth`, but the finished enrollment/challenge flow is not fully connected.
   - Fresh auth must be based on recent reauthentication or MFA verification, not only session creation time.

3. Redesign public receipts.
   - Do not expose receipts by raw `salesOrderId` or predictable internal IDs.
   - Use signed random public receipt tokens, expiration, revocation, optional PIN, rate limiting, and strict redaction.

4. Move sensitive uploads out of public storage.
   - Use private object storage or a private filesystem outside `public`.
   - Serve through signed, permission-checked routes.
   - Add malware scanning, content disarm, magic-byte checks, image transcoding, and quarantine.

5. Put every mutation and sensitive read behind the same server-side guard contract.
   - Use `protect`, `requirePermission`, or a single equivalent guard.
   - Remove ad hoc authorization patterns from legacy actions over time.
   - Add route/API tests for direct URL access, API denial, tenant mismatch, and permission denial.

6. Treat client `organizationId` as untrusted.
   - Protected routes and actions must derive organization from the server session or a server-verified membership.
   - URL, props, search params, and client stores can select context only after server validation.

7. Replace admin wildcard behavior with break-glass access.
   - Wildcard permissions must not bypass tenant isolation, module entitlements, consent, maker-checker, close certification, evidence rules, or export controls.
   - Cross-tenant access should require fresh auth, reason, ticket/reference, time-bound session, and audit trail.

8. Convert module entitlements from observe-only to staged enforcement.
   - Observe mode is useful for migration, but it is not a security boundary.
   - Enforce on server actions, APIs, reports, exports, background jobs, and navigation.

9. Centralize reports and exports.
   - Every export should require permission, module entitlement, tenant scope, fresh auth for sensitive exports, watermarking, export registry entry, row count, hash, and audit.

10. Add production-grade abuse controls.
   - Distributed rate limits, bot protections, WAF rules, suspicious login detection, per-tenant quotas, and anomaly alerts are required for a financial SMB platform.

## 5. What Can Be Broken Most Easily and Why

This section intentionally avoids exploit instructions. It identifies failure surfaces at the level needed for defensive engineering.

| Area | How it can break or be abused at a high level | Why it is vulnerable | Impact | Priority |
|---|---|---|---|---|
| Email verification, OTP, reset tokens | Guessing, replay, leakage, brute force, or token reuse | Some helper patterns use non-cryptographic randomness and plaintext comparisons | Account takeover, fake tenant creation, unauthorized reset | Critical |
| MFA and fresh auth | Sensitive actions can rely on session age instead of proven recent authentication | MFA schema exists, but finished challenge/enrollment is not fully connected | Payroll, export, close, payment, and admin actions become easier to misuse | Critical |
| Public receipts | Receipt data can be accessed by a raw receipt/order identifier | Public route does not require a signed public-share token | Customer/payment/business leakage, reputational damage | Critical |
| Tenant isolation via explicit org IDs | User-supplied org IDs can accidentally become authority | Some pages/actions pass or accept `organizationId`; some helpers allow wildcard cross-org access | Cross-tenant data exposure or mutation | Critical |
| Superuser/wildcard permissions | Admin can bypass normal tenant checks unless controlled | `*` and superuser paths exist for cross-org utility | Insider misuse, support-account compromise blast radius | Critical |
| Uploads and attachments | Stored files can carry malware, hidden content, or leak through public paths | Files are stored under public paths in some flows; broad docs/archives are allowed | Malware distribution, data leakage, storage abuse | High |
| Legacy server actions | Mutations can bypass modern guard and audit semantics | Multiple generations of action patterns coexist | Permission gaps, missing audit, tenant mismatch | High |
| Reports and exports | Sensitive data can leave the platform without complete controls | Export controls are not yet uniformly centralized | Payroll/supplier/payment leaks, compliance risk | High |
| Module entitlements | Users may see/use modules they did not subscribe to | Current control plane is in observe mode | Revenue leakage, inconsistent UX, trust loss | High |
| Middleware protection | Dashboard cookie checks can be mistaken for authorization | Middleware is a UX gate, not a full server authorization layer | Direct API/action access may bypass assumptions | High |
| CSP and browser exposure | XSS impact remains high where inline scripts are allowed | CSP uses `unsafe-inline`; dev uses `unsafe-eval` | Session theft, data scraping, fraudulent actions | High |
| Rate limiting | Abuse controls reset per process and are not distributed | In-memory limiter is not production-grade | Brute force, scraping, email abuse, DoS | High |
| Audit logging | Some security events can be skipped when no org is present | Tenant audit log requires organization context | Lost evidence for attacks before org context exists | High |
| Background jobs | Jobs can process stale, unauthorized, or cross-tenant data if not guarded | Worker identity and module checks need centralization | Silent ledger/report corruption | High |
| Seed, reset, migration, backfill scripts | Operational mistake can erase or corrupt production data | Scripts are powerful and may be safe only in dev | Catastrophic data loss | Critical |
| Ledger posting bypass | Non-ledger service writes can create inconsistent books | Some older workflows may not be fully event/ledger routed | Incorrect accounts, bad close, audit failure | Critical |

## 6. Module-by-Module Risk Analysis

### 6.1 Authentication, Registration, Verification, and Password Reset

Current strengths:

- BetterAuth is used as the authentication foundation.
- Email verification is required.
- Password length and policy foundations exist.
- Argon2 hashing is present.
- Login lockout logic exists.
- Raw session usage is increasingly wrapped by stronger RBAC context in newer code.

Risks:

- OTP and token helpers must use cryptographic randomness.
- Verification and reset tokens should be stored as hashes, not raw values.
- Verification endpoints need attempt limits, device/IP throttles, resend throttles, and audit.
- Public registration should be protected against scripted tenant creation, disposable email abuse, and spam.
- MFA setup is not production-complete.

Required controls:

- Cryptographic tokens only.
- Hashed token storage.
- Token family/versioning to invalidate older tokens.
- Email verification attempt limit per user, email, IP, and tenant.
- Reset request response normalization to avoid account enumeration.
- MFA enrollment, recovery, backup codes, WebAuthn or TOTP, and step-up challenge.
- Security event sink that works before organization creation.

### 6.2 Tenant Isolation

Current strengths:

- Most major models include `organizationId`.
- Prisma schema contains many tenant-scoped indexes and unique constraints.
- RBAC context checks stale session organization state against database state.
- `protect` checks common tenant IDs in action inputs.

Risks:

- Client-provided `organizationId` appears in pages, props, actions, and report surfaces.
- Some protected pages use fallback or explicit organization IDs.
- `assertCanUseOrganization` and `resolveActionOrganization` allow superuser or wildcard cross-tenant behavior.
- `protect` checks common input shapes but cannot guarantee deep nested or handler-derived tenant safety everywhere.

Required controls:

- Create a strict "server-derived tenant" rule for all protected surfaces.
- Allow explicit organization selection only through a verified membership selector.
- Add tests that attempt direct URL/API access across tenant IDs.
- Add a tenant-scoped database access helper or repository convention that makes unscoped queries difficult.
- Consider PostgreSQL Row-Level Security for the most sensitive tables as a second layer.
- Treat break-glass support access as a separate audited workflow, not normal wildcard authorization.

### 6.3 RBAC, Permissions, and Admin Wildcard

Current strengths:

- Permission expansion exists.
- Denied access is audited.
- Critical and high-risk permissions can be audited when allowed.
- Many actions now use `requirePermission` or `protect`.

Risks:

- Multiple authorization styles coexist.
- Wildcard permission can create a large blast radius.
- Some legacy actions use custom permission logic or only organization scoping.
- Permission labels alone do not capture entitlement, evidence trust, consent, maker-checker, or close state.

Required controls:

- Define one composite authorization decision contract:
  - session
  - tenant
  - module entitlement
  - RBAC permission
  - data classification
  - fresh auth
  - maker-checker
  - consent
  - evidence grade
  - export policy
  - audit result
- Add a permission risk registry.
- For critical actions, require separation of duties.
- Make admin wildcard unable to bypass module, consent, fresh auth, maker-checker, certification, evidence, or export rules.

### 6.4 Module Entitlements

Current strengths:

- A module control plane exists.
- Observe mode is a safe migration strategy.
- Evaluation metadata records module decisions.

Risks:

- Observe mode permits actions that should eventually be blocked.
- Client-side hiding can be mistaken for enforcement.
- Background jobs, APIs, reports, and exports may not all be entitlement-aware.

Required controls:

- Move from observe mode to staged enforcement:
  - observe
  - warn
  - owner/admin visible upgrade surfaces
  - read-only fallback
  - hard enforcement
- Enforce server-side on:
  - route loaders
  - server actions
  - APIs
  - reports
  - exports
  - jobs
  - bulk actions
  - BI surfaces
- Add tests proving wildcard permissions cannot bypass module subscription rules.

### 6.5 Accounting, Ledger, Close, and OHADA Compliance

Current strengths:

- Ledger-first architecture is visible in schema and services.
- Journal entries, posting batches, ledger audit events, certification/export evidence, and close workflows exist.
- Several accounting actions require fresh auth.
- Idempotency and source links are present in important areas.

Risks:

- Any non-ledger mutation path that changes financial truth can break auditability.
- Legacy services may mutate operational state without business event or ledger evidence.
- Hard deletes or destructive corrections can damage accounting traceability.
- Failed jobs or partial rebuilds can make reports appear more trusted than they are.

Required controls:

- Service-only ledger mutation.
- No direct financial writes from UI/action layers.
- Immutable audit events for posting, reversal, close, export, certification, and override.
- Maker-checker for close, reversal, write-off, payroll approval, supplier bank release, and reconciliation override.
- Hash-chained close packs and export registry.
- Ledger trust labels: operational, posted, reconciled, certified, blocked.
- Period locks that block unsafe backdated changes.

### 6.6 POS, Inventory, Purchasing, Payroll, and Finance

Current strengths:

- These modules are increasingly connected to ledger, payment, reconciliation, and evidence foundations.
- Purchasing and payroll show fresh-auth patterns in critical paths.
- Inventory and purchasing have many tenant-scoped models.

Risks:

- POS can be abused through refund, void, discount, offline replay, receipt, and cashier-session logic.
- Inventory can be abused through stock adjustments, negative stock, transfer, valuation, and write-off paths.
- Purchasing/AP can be abused through supplier bank changes, invoice approval, duplicate payment, and receiving mismatches.
- Payroll can leak sensitive person-level amounts or be abused through approval/payment flows.
- Finance can lose trust if reconciliation, suspense, and posting states are inconsistent.

Required controls:

- Critical action classification per module.
- Cashier shift controls and offline replay idempotency.
- Inventory movement append-only log with valuation evidence.
- Supplier bank maker-checker and fresh auth.
- Payroll redaction by role and export controls.
- Payment reconciliation proof trail for every ledger-impacting match/override.
- Role-specific dashboards that show only what each user is allowed to know.

### 6.7 Reports, Dashboards, BI, and Exports

Current strengths:

- BI contracts and evidence-backed surfaces are being introduced.
- Owner War Room and action center foundations are emerging.
- Snapshot/read-model work reduces expensive live joins.

Risks:

- BI cards can accidentally compute trust client-side.
- Reports can leak data when organization IDs or filters come from the browser.
- Exports can become the easiest path to mass data exfiltration.
- Stale, partial, inferred, or blocked data can be presented as reliable.

Required controls:

- Server-side BI contract only.
- Every KPI must include:
  - organization
  - module slug
  - required permission
  - evidence grade
  - freshness
  - blockers
  - source modules
  - redaction state
  - drill-through availability
- No export without:
  - permission
  - entitlement
  - fresh auth when sensitive
  - watermark
  - export hash
  - row count
  - audit log
  - retention policy

### 6.8 Uploads, Imports, Attachments, and Storage

Current strengths:

- Upload routes check authenticated organization context.
- Filename validation and path prefix checks exist in local delivery.
- Some MIME and size limits exist.
- SVG is rejected in at least one delivery path.

Risks:

- Files stored under `public/uploads` can become directly reachable outside permission checks depending on static serving behavior.
- MIME checks alone do not prove content safety.
- Office documents, archives, and images can carry malicious or hidden content.
- Reading entire files into memory can create pressure under abuse.
- Storage settings appear partially default/in-memory and not a hardened policy store.

Required controls:

- Private storage outside `public`.
- Object storage with signed URLs and short TTLs.
- Magic-byte validation.
- Malware scanning.
- Content disarm and reconstruction for office/PDF where practical.
- Image re-encoding to safe formats.
- Archive restrictions or asynchronous scanning with zip bomb protection.
- Quarantine until scanned.
- Per-module upload permissions.
- Tenant storage quotas.
- Storage audit events.

### 6.9 APIs, Server Actions, and Direct URL Access

Current strengths:

- `protect` is a good foundation.
- API org checks exist in some routes.
- Many critical actions use fresh-auth options.

Risks:

- Some API routes authenticate but do not check specific permissions.
- Some actions still use custom authorization and may not audit consistently.
- Direct URL access can bypass UI hiding.
- Report functions imported into client code can create authority confusion.

Required controls:

- Route/API/action inventory with guard status.
- Required permission for every protected API.
- Deny-by-default server action wrapper.
- ESLint/custom static check that flags unguarded server actions.
- Tests for:
  - unauthenticated access
  - wrong tenant access
  - missing permission
  - missing module
  - stale session
  - fresh-auth required
  - direct URL denial

### 6.10 Middleware, Headers, Browser Security, and Rate Limiting

Current strengths:

- Security headers exist.
- HSTS is enabled in production.
- Middleware protects dashboard UX by checking auth cookies.
- Basic rate limiting exists.

Risks:

- CSP allows `unsafe-inline`.
- Dev allows `unsafe-eval`; production should be verified.
- In-memory rate limiting is not distributed and not enough behind multiple instances.
- Trusting request-derived origins can be unsafe behind misconfigured proxies.
- Middleware cookie checks are not an authorization boundary.

Required controls:

- Strict production CSP with nonce or hash-based scripts.
- Remove `unsafe-inline` where possible.
- Distributed rate limiting with Redis or managed edge/WAF controls.
- Fixed trusted origins per environment.
- Host header validation at proxy and app layers.
- Bot and credential-stuffing defenses.
- Central security headers tests.

### 6.11 Background Jobs, Outbox, Backfills, and Seeds

Current strengths:

- Business event/outbox models exist.
- Idempotency and hash semantics exist in several important services.
- Release-gate thinking is present.

Risks:

- Jobs may process stale or unauthorized data if worker contracts are inconsistent.
- Backfills can overwrite trusted evidence if not idempotent.
- Seed/reset commands are dangerous if they ever point to production.
- Partial rebuilds can create misleading dashboards.

Required controls:

- Worker identity and tenant-scoped job execution.
- Module entitlement checks inside jobs where output is module-sensitive.
- Idempotent rebuilds with source hash and version.
- Dead-letter queue and poison message handling.
- Backfill dry-run mode.
- Environment guard that refuses destructive scripts outside allowed dev/test databases.
- Restore rehearsal before migrations touching financial tables.

### 6.12 DevOps, Secrets, Deployment, and Recovery

Current posture could not be fully assessed from local code alone.

Required controls:

- Secret manager with rotation and least-privilege access.
- No production secrets in `.env` files or logs.
- SAST, dependency scanning, secret scanning, and IaC scanning.
- Signed builds or protected release pipeline.
- Production migration approval workflow.
- Blue-green or canary deploy for risky releases.
- Point-in-time recovery backups.
- Quarterly restore drills.
- Incident response playbooks.
- Security telemetry to SIEM.
- Uptime, error-rate, job-lag, and data-integrity monitors.

## 7. Target Defensive Architecture

### 7.1 Composite Guard Layer

Kontava should standardize a single server-side guard decision for every sensitive action and read.

The guard should evaluate:

1. Authenticated session.
2. Active user and active membership.
3. Tenant scope.
4. Module entitlement.
5. RBAC permission.
6. Data classification.
7. Fresh auth or MFA.
8. Maker-checker requirement.
9. Consent requirement.
10. Export policy.
11. Redaction policy.
12. Evidence grade.
13. Audit result.

The result should be structured:

- `allow`
- `deny`
- `observe`
- `redact`
- `mask`
- `requireFreshAuth`
- `requireMakerChecker`
- `requireConsent`
- `requireEntitlement`
- `requirePermission`
- safe user reason code
- internal audit reason
- redaction policy
- export policy

### 7.2 Tenant-Safe Data Access

Recommended pattern:

- UI never becomes authority for tenant selection.
- Server derives active tenant from session/membership.
- Explicit tenant switches go through a server-verified tenant switch action.
- Every service method accepts a trusted `SecurityContext`, not raw user input.
- Every Prisma query touching tenant data is scoped by `organizationId`.
- Cross-tenant support access uses a separate break-glass context.

Optional advanced control:

- Add PostgreSQL Row-Level Security for highest-risk tables after Prisma/service scope is stable.

### 7.3 Break-Glass Support Model

Superuser support access should not act like normal RBAC.

Required:

- Fresh auth.
- MFA.
- Time-bound access window.
- Required reason.
- Ticket or approval reference.
- Scope-limited tenant selection.
- Read-only by default.
- Extra maker-checker for mutations.
- Full audit trail visible to internal security and optionally tenant owners.
- No bypass of module entitlement, evidence, consent, export, or close certification rules.

### 7.4 Evidence and Ledger Trust Layer

Every financial surface should declare its trust level:

- operational
- posted
- reconciled
- certified
- partial
- stale
- blocked
- redacted

No dashboard, export, BI card, or owner insight should present financial truth without evidence metadata.

### 7.5 Redaction and Export Safety Layer

Sensitive data defaults:

- Payroll person-level amounts: redacted unless payroll entitlement and permission pass.
- Supplier bank details: redacted unless permission plus fresh auth pass.
- Payment provider references: masked unless reconciliation permission passes.
- Suspense details: redacted unless exception-management permission passes.
- Close certification proof: summary unless close/audit permission passes.
- Partner evidence: consent, scope, watermark, revocation, and audit required.
- Exports: export permission, fresh auth, watermark, hash, and audit required.

## 8. Professional Controls to Make Kontava Extremely Hard to Damage

### 8.1 Prevent Account Takeover

- Cryptographic tokens only.
- Hashed verification/reset tokens.
- MFA for owners, admins, accountants, payroll, finance, and support.
- Step-up for sensitive actions.
- Login risk scoring by IP, device, country, impossible travel, and velocity.
- Distributed brute-force protection.
- Session revocation dashboard.
- Device/session inventory.
- Security notifications.

### 8.2 Prevent Cross-Tenant Data Exposure

- Server-derived tenant context.
- Universal guard wrapper.
- Tenant-scoped repositories.
- Direct URL/API denial tests.
- Break-glass support workflow.
- RLS for critical tables where feasible.
- Audit every cross-tenant read, even if allowed.

### 8.3 Prevent Financial Tampering

- Append-only financial events.
- No hard delete for ledger-impacting data.
- Reversal, correction, and adjustment workflows.
- Maker-checker for critical accounting operations.
- Period locks.
- Source links for every posting.
- Ledger hash/fingerprint checks.
- Reconciliation proof requirements.

### 8.4 Prevent Data Exfiltration

- Export registry.
- Watermarked exports.
- Fresh auth for sensitive exports.
- DLP classification.
- Per-role row/field redaction.
- Download rate limits.
- Audit logs for every export.
- Partner consent and revocation.
- Short-lived signed URLs.

### 8.5 Prevent File-Based Abuse

- Private storage.
- Malware scanning.
- Quarantine.
- Magic-byte validation.
- Content disarm.
- Image transcoding.
- Archive restrictions.
- Upload quotas.
- Attachment audit logs.

### 8.6 Prevent Operational Catastrophe

- Production environment guard for destructive commands.
- Migration dry runs.
- Backup before schema/data migration.
- Point-in-time recovery.
- Restore drills.
- Feature flags.
- Canary release.
- Rollback plan.
- Read-only degraded mode.
- Incident response runbooks.

## 9. Reliability and Recovery Plan

Kontava should define reliability in business terms:

- Owners can still see cash and sales status during partial degradation.
- Accountants can trust that ledger and close state did not silently change.
- Payroll and payments cannot run twice.
- Stock movements cannot be lost or replayed without evidence.
- Reports show stale/partial/blocked states instead of fake certainty.

Recommended targets:

| Capability | Target |
|---|---|
| Authentication availability | 99.9 percent or better |
| Core dashboard read availability | 99.9 percent or better |
| POS transaction durability | No accepted sale lost |
| Ledger posting integrity | No unbalanced posted entry |
| Backup recovery point objective | 15 minutes or better for production |
| Backup recovery time objective | Defined by tenant tier, rehearsed quarterly |
| Critical job retry | Idempotent with dead-letter handling |
| Export traceability | 100 percent audit coverage |

Resilience requirements:

- Idempotency for all payment, POS, ledger, reconciliation, and job operations.
- Outbox pattern for external side effects.
- Retry with backoff and dead-letter queue.
- Job lag monitoring.
- Database connection pool monitoring.
- Read-only fallback for degraded accounting/BI surfaces.
- Snapshot rebuild status visible to admins.
- Alerting for failed postings, stuck outbox, suspicious exports, repeated denied access, and migration drift.

## 10. Security Testing and Release Gates

Kontava needs a security release gate that runs before every serious release.

### 10.1 Required Automated Tests

- Auth tests:
  - login failure lockout
  - reset token expiry
  - verification token expiry
  - token reuse denial
  - MFA enrollment/challenge
  - fresh-auth challenge

- Tenant tests:
  - direct URL cross-tenant denial
  - API cross-tenant denial
  - server action cross-tenant denial
  - report/export cross-tenant denial
  - background job tenant isolation

- RBAC tests:
  - missing permission denial
  - wildcard cannot bypass entitlement
  - wildcard cannot bypass consent
  - wildcard cannot bypass fresh auth
  - maker-checker separation

- Module entitlement tests:
  - non-subscribed module hidden from normal users
  - direct URL denied
  - API denied
  - export denied
  - job output denied
  - owner upgrade prompt allowed through controlled surface

- Upload tests:
  - unsupported type rejected
  - MIME mismatch rejected
  - path traversal rejected
  - over-size rejected
  - unscanned file not downloadable
  - public direct path not accessible

- Ledger tests:
  - unbalanced posting rejected
  - duplicate idempotency key rejected or replayed safely
  - period lock enforced
  - reversal preserves audit trail
  - close blocker enforced

- Export tests:
  - export without permission denied
  - export without fresh auth denied
  - watermark present
  - export registry entry created
  - row count and hash captured
  - sensitive fields redacted

### 10.2 Required Manual Release Gates

- Migration dry run.
- Backup verified.
- Restore rehearsal for high-risk database releases.
- Security smoke test.
- Permission matrix review.
- Public endpoint inventory review.
- Dependency vulnerability review.
- Secret scan.
- Rollback rehearsal.
- Incident runbook review.

### 10.3 Suggested Commands

Use the actual project scripts as they exist, but the release gate should include equivalents of:

```bash
npm run typecheck
npm run lint
npm test
node scripts/kontava-moat-release-gate.js --mode fail
```

Add focused security suites for RBAC, tenant isolation, module entitlements, exports, uploads, and token flows.

## 11. Risk Register

| ID | Risk | Severity | Likelihood | Mitigation |
|---|---|---:|---:|---|
| SEC-001 | Weak OTP/token generation and plaintext token storage | Critical | High | Cryptographic tokens, hashed storage, attempt limits |
| SEC-002 | Incomplete MFA and step-up auth | Critical | High | Complete MFA, WebAuthn/TOTP, fresh challenge state |
| SEC-003 | Public receipts exposed by raw business ID | Critical | Medium | Signed public receipt token, expiration, revocation, redaction |
| SEC-004 | Cross-tenant access through explicit org IDs | Critical | Medium | Server-derived tenant context, tests, repository guard |
| SEC-005 | Superuser wildcard overreach | Critical | Medium | Break-glass workflow, no bypass rules |
| SEC-006 | Upload files reachable from public storage | High | Medium | Private storage, signed URLs, scanning |
| SEC-007 | Legacy actions bypass guard/audit | High | High | Guard inventory and migration to `protect` |
| SEC-008 | Module entitlements only observe | High | High | Staged server-side enforcement |
| SEC-009 | Export data leakage | High | Medium | Export guard, watermark, fresh auth, audit |
| SEC-010 | In-memory rate limit insufficient | High | High | Distributed rate limit and WAF |
| SEC-011 | CSP inline script exposure | High | Medium | Nonce/hash CSP, XSS testing |
| SEC-012 | Audit events skipped without organization | High | Medium | Global security event sink |
| SEC-013 | Backfill/seed/reset on production | Critical | Low to medium | Environment locks, approvals, backups |
| SEC-014 | Background job cross-tenant or stale processing | High | Medium | Worker guard, idempotency, DLQ |
| SEC-015 | Ledger mutation bypass | Critical | Medium | Service-only ledger posting and immutable events |
| SEC-016 | Partner/API evidence overexposure | High | Medium | Consent, scope, revocation, watermarking |
| SEC-017 | Secret leakage in local files or logs | Critical | Unknown | Secret manager, scans, log redaction |
| SEC-018 | No tested restore path | Critical | Unknown | PITR and restore drills |

## 12. Roadmap

### Phase 0: Immediate Security Freeze and Inventory

Objective: know every sensitive surface before adding more features.

Build:

- Public endpoint inventory.
- Server action guard inventory.
- API guard inventory.
- Upload/export inventory.
- Sensitive data classification map.
- Permission risk matrix.
- Production destructive-command lock policy.

Completion gate:

- Every public endpoint and server action has an owner, data classification, guard status, and test requirement.

### Phase 1: Account, Tenant, and Token Hardening

Objective: prevent account takeover and cross-tenant damage.

Build:

- Cryptographic tokens.
- Hashed token storage.
- OTP attempt/resend throttling.
- MFA enrollment and challenge.
- True fresh auth.
- Server-derived tenant context.
- Break-glass support model.

Completion gate:

- Auth, reset, verification, MFA, tenant mismatch, and break-glass tests pass.

### Phase 2: Guard Unification and Module Enforcement Readiness

Objective: make security decisions consistent across the platform.

Build:

- Composite guard service.
- Migration of legacy actions to `protect` or equivalent.
- Module entitlement warn/read-only/enforce modes.
- Direct URL/API denial tests.
- Admin wildcard non-bypass tests.

Completion gate:

- No critical action remains without a central guard or approved exception.

### Phase 3: Upload, Export, Receipt, and Data Exfiltration Controls

Objective: close the easiest paths for data leakage.

Build:

- Private file storage.
- Malware scanning/quarantine.
- Signed download URLs.
- Public receipt tokenization.
- Export registry.
- Watermarking.
- Fresh-auth export rules.
- Redaction policy service.

Completion gate:

- Sensitive data cannot be downloaded/exported without permission, entitlement, fresh auth, redaction, and audit.

### Phase 4: Ledger, Evidence, and Job Integrity

Objective: prevent silent financial corruption.

Build:

- Ledger mutation guard.
- Immutable correction/reversal workflows.
- Worker identity.
- Outbox lease/retry/DLQ controls.
- Snapshot source-hash validation.
- Close/reconciliation blocker enforcement.

Completion gate:

- Financial state can be traced from source event to ledger, report, close, and export.

### Phase 5: Enterprise Resilience and Monitoring

Objective: make failures visible, recoverable, and operationally managed.

Build:

- SIEM/security telemetry.
- Job lag dashboard.
- Failed posting dashboard.
- Suspicious export/login alerting.
- PITR backups.
- Restore drills.
- Incident runbooks.
- Canary releases and rollback runbooks.

Completion gate:

- The team can detect, contain, recover, and explain a production incident.

## 13. What Should Not Be Built Yet

The following should wait until the foundation gates pass:

- Partner Evidence API with broad third-party access.
- AI Operating Copilot that reads sensitive business evidence.
- Broad Owner War Room exports.
- Full Business Evidence Graph exposure.
- Automated compliance certification that users may treat as official.
- Hard module enforcement without observe/warn data and migration support.
- Large BI warehouse or broad persistent snapshots before hot paths prove the need.

Reason: these features multiply the blast radius of data trust, tenant isolation, redaction, and evidence gaps.

## 14. Recommended First 30, 60, 90 Days

### First 30 Days

- Create public endpoint and server action security inventory.
- Fix token/OTP generation and storage.
- Add reset/verification attempt throttling.
- Design and implement real MFA and fresh-auth challenge state.
- Replace public receipt ID sharing with signed receipt tokens.
- Add tests for tenant mismatch and direct URL denial.
- Define break-glass support workflow.

### First 60 Days

- Move uploads to private storage.
- Add malware scanning and quarantine.
- Centralize export guard and export registry.
- Migrate highest-risk legacy actions to `protect`.
- Add module entitlement warn/read-only mode.
- Add wildcard non-bypass tests.
- Add global security event sink for pre-org events.

### First 90 Days

- Enforce module entitlements on selected low-risk modules.
- Add distributed rate limiting and WAF rules.
- Harden CSP with nonce/hash strategy.
- Add worker identity and job guard contract.
- Add PITR backup and restore rehearsal.
- Add SIEM/security dashboard.

### First 180 Days

- Add RLS or equivalent second-layer controls for critical tables if feasible.
- Mature maker-checker and separation of duties.
- Harden partner evidence consent and revocation.
- Add data-loss prevention for exports.
- Add fraud/control case management.
- Prepare external security assessment.

## 15. Team Responsibilities

Product:

- Define critical actions, sensitive data classes, and acceptable degraded states.
- Decide which module entitlements are observe, warn, read-only, or enforced.

Design:

- Standardize denied, redacted, fresh-auth required, module unavailable, consent required, and blocked states.
- Make trust and evidence understandable without exposing sensitive details.

Engineering:

- Build composite guard, token hardening, MFA, private storage, export registry, and job guard.
- Migrate legacy actions and APIs to the standard guard.

QA:

- Own security regression suites for auth, RBAC, tenant isolation, module entitlements, uploads, exports, and ledger integrity.

DevOps:

- Own secrets, WAF, rate limits, backups, restore tests, deploy safety, monitoring, and incident response.

Security:

- Own risk register, threat model, security event taxonomy, abuse monitoring, and external assessment coordination.

Sales and Partnerships:

- Do not promise "unattackable."
- Position Kontava as evidence-backed, controlled, audit-ready, resilient, and enterprise-grade.

## 16. Final Recommendation

Kontava should not move directly into broad cross-boundary innovation until the security and resilience foundations are tightened. The platform has enough foundations to become a serious enterprise-grade SMB operating system, but it must first close the predictable failure paths:

- account takeover
- cross-tenant leakage
- public receipt leakage
- unsafe uploads
- inconsistent guards
- observe-only entitlements
- wildcard overreach
- export leakage
- audit gaps
- destructive operational scripts
- untested recovery

The correct first build is a Security Foundation Hardening Sprint:

1. Cryptographic token and OTP hardening.
2. MFA and true step-up authentication.
3. Public receipt tokenization.
4. Central guard inventory and migration plan.
5. Private upload and export safety architecture.
6. Break-glass support controls.
7. Tenant/module/direct-access test suite.

Once these are in place, Kontava can confidently continue toward Owner War Room, Business Evidence Graph, Cash Leakage Radar, partner evidence, and AI-assisted operations without turning its moat features into new attack surfaces.
