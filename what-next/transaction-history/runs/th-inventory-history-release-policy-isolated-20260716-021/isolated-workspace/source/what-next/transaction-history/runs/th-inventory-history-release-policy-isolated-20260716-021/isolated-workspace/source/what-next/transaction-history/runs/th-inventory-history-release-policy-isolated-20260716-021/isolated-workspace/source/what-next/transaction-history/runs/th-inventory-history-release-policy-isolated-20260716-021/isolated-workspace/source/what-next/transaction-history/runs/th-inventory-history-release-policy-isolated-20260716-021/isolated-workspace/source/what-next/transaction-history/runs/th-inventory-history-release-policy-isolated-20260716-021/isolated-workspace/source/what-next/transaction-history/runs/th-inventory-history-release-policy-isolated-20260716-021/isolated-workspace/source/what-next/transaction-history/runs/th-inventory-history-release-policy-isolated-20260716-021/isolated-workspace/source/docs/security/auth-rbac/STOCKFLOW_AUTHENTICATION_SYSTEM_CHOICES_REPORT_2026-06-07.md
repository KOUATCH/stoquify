# StockFlow Authentication System Design Choices Report

Date: 2026-06-07

## Summary

This report explains the design choices made for the `auth` skill and how those choices support a successful, secure authentication system for StockFlow.

The authentication system is designed for a multi-tenant Next.js SaaS serving OHADA / SYSCOHADA SMBs. It assumes a financial product where compromised identity can lead directly to cash loss, payroll manipulation, supplier fraud, accounting tampering, or cross-tenant data leakage. For that reason, the system treats authentication as a security control layer, not merely a login form.

The core design is:

- Auth.js v5 / NextAuth for the authentication backbone.
- Prisma and Postgres for durable identity, session, device, membership, MFA, and audit records.
- JWTs for fast session transport, backed by a server-side `auth_session` mirror for revocation.
- Strong MFA and recovery rules for users who touch money, books, payroll, supplier banking, or role assignment.
- A strict separation between authentication and authorization, with `auth` producing identity and tenant session claims and `rbac` deciding what those identified users may do.

## Installed Skill Context

The report is based on the installed skill:

```text
C:\Users\J COMPUTER\.codex\skills\auth
```

Installed files:

```text
auth/
  SKILL.md
  agents/
    openai.yaml
  references/
    auth-blueprint.md
    anatomy-examples.md
```

The `SKILL.md` contains the compact operating workflow. The reference files carry implementation details, schema additions, Auth.js callback patterns, and five end-to-end anatomy examples.

## Main Security Thesis

The most important choice is to treat authentication as the front door to a financial system. A weak login system is not just a user-experience issue; it is an entry point into cash drawers, supplier accounts, payroll runs, financial reports, and tenant data.

This means the authentication design must be:

- Fail-closed when identity is uncertain.
- Server-controlled, never client-decided.
- Audited whenever security state changes.
- Hardened against account takeover, credential stuffing, session theft, support fraud, and tenant confusion.
- Usable for mobile-first users, intermittent connectivity, and shared cybercafe devices.

That thesis is what makes the system successful: it aligns the security model with the actual business risk of an OHADA-zone SMB platform.

## Choice 1: Separate Authentication From RBAC

Decision: Authentication answers "who are you?" RBAC answers "what may this identified user do?"

Why this choice was made:

StockFlow needs both identity proof and permission enforcement, but mixing them creates weak boundaries. Authentication should verify the user, MFA state, device state, session validity, and active tenant. RBAC should interpret permissions, roles, modules, risk tiers, and resource scopes.

How it makes the system successful:

- Prevents login state from being mistaken for permission.
- Keeps sensitive authorization logic centralized in the `rbac` skill.
- Allows auth to focus on account takeover, sessions, MFA, recovery, and tenant selection.
- Makes the session contract explicit: `tenantId`, `roles`, `permissions`, `branchIds`, `modulesEnabled`, and `permsFetchedAt`.
- Reduces future confusion when implementing server actions and route handlers.

Security outcome:

A user can be authenticated but still denied by RBAC. That fail-closed boundary is essential for multi-tenant financial workflows.

## Choice 2: Use Auth.js v5 / NextAuth With Prisma And Postgres

Decision: Use Auth.js v5 / NextAuth as the primary authentication library, with Prisma and Postgres as the durable data layer.

Why this choice was made:

StockFlow is already a Next.js App Router and Prisma application. Auth.js integrates naturally with Next.js route handlers, middleware, server components, server actions, and session callbacks. Prisma and Postgres provide a durable model for users, accounts, verification tokens, memberships, sessions, MFA factors, known devices, and audit trails.

How it makes the system successful:

- Fits the existing stack instead of introducing a disconnected identity layer.
- Allows the app to own tenant membership and financial audit data.
- Keeps identity data close to business records that depend on it.
- Makes callbacks available for claim enrichment, tenant switching, and RBAC session refresh.
- Supports credentials, magic links, Google, Microsoft, and passkey-oriented flows.

Security outcome:

The system can use a proven authentication framework while still owning the security-critical database truth needed for revocation, tenant safety, and auditability.

## Choice 3: JWT Sessions Plus A Server-Side Session Mirror

Decision: Use JWTs for session transport, but require every JWT to carry a `sessionId` that maps to a database-backed `auth_session` row.

Why this choice was made:

JWTs are fast, but a raw JWT-only system cannot reliably revoke compromised sessions before token expiry. Financial systems need immediate revocation after password reset, MFA removal, suspicious activity, "this was not me" reports, support recovery, or sign-out-other-devices.

How it makes the system successful:

- Keeps session checks fast enough for normal app usage.
- Provides immediate revocation when risk appears.
- Supports idle timeouts and hard maximum session age.
- Enables concurrent-session policies, such as three active sessions by default.
- Gives users a visible device/session list in account settings.

Security outcome:

A stolen JWT is not enough if the server-side mirror is revoked, expired, idle-expired, or tied to a suspicious device state.

## Choice 4: Server-Side Truth Over Client State

Decision: The client never decides identity, tenant, session validity, MFA state, sudo state, or device trust.

Why this choice was made:

Client state is easy to tamper with. In a financial SaaS, a hidden button, disabled input, or client-side permission flag is not security. The server must verify every protected path.

How it makes the system successful:

- Keeps security controls consistent across pages, server actions, and route handlers.
- Prevents bypasses through direct API calls.
- Makes UI state a convenience layer instead of a trust boundary.
- Forces sensitive operations through `requireSession`, `requireMfa`, `requireFreshAuth`, and RBAC checks.

Security outcome:

An attacker cannot gain access by editing browser state, changing route parameters, or calling a server action directly with a forged tenant ID.

## Choice 5: Global User Plus Tenant Membership Model

Decision: Use one global `User` per email, with a `Membership` join table for tenant-specific roles, branch scope, and status.

Why this choice was made:

In OHADA markets, fiduciaires and external accountants may legitimately manage multiple SMB tenants. Creating duplicate user records per tenant makes identity, recovery, MFA, and audit history fragmented.

How it makes the system successful:

- Allows one person to belong to many tenants.
- Makes tenant switching a first-class flow.
- Keeps MFA and recovery tied to the real person, not a duplicate tenant account.
- Lets RBAC evaluate membership-specific roles and branch scope.
- Improves audit quality by tracking one actor across tenant contexts.

Security outcome:

Cross-tenant access is controlled by active membership, not by raw email matching or client-supplied tenant IDs.

## Choice 6: Invitation-Based Onboarding And Deny-By-Default OAuth

Decision: Unknown OAuth users are denied by default unless an invitation or explicit tenant domain auto-join policy exists. Tenant owners invite staff with role and branch scope selected at invitation time.

Why this choice was made:

OAuth proves an identity at Google or Microsoft; it does not prove that the person belongs to a tenant. Auto-joining users by email domain can be dangerous for SMBs with shared domains, consultants, cybercafe usage, or domain misconfiguration.

How it makes the system successful:

- Keeps tenant access intentional.
- Makes onboarding auditable.
- Allows role and branch scope to be set before first access.
- Prevents unknown OAuth identities from landing in a financial tenant.
- Handles staff onboarding, accountants, and external consultants cleanly.

Security outcome:

No user enters a tenant simply because they can authenticate with an external provider.

## Choice 7: NIST-Aligned Password Policy With Argon2id

Decision: Use minimum 12 characters, no forced rotation, no arbitrary complexity rules, breached-password checks, context checks, and Argon2id hashing.

Why this choice was made:

Modern password security is not improved by forced rotation or confusing symbol rules. Users respond to those rules by creating predictable passwords. The stronger approach is longer passwords, breached-password rejection, context rejection, and a modern memory-hard hash.

How it makes the system successful:

- Reduces weak and reused passwords.
- Avoids user-hostile rules that create predictable patterns.
- Blocks passwords found in breach corpuses without sending plaintext outside the server.
- Makes offline cracking harder through Argon2id.
- Supports future parameter upgrades through rehash-on-sign-in.

Security outcome:

The password layer becomes stronger without punishing legitimate users with outdated complexity rituals.

## Choice 8: MFA Policy Based On Role And Risk

Decision: Use passkeys/WebAuthn as the preferred factor, TOTP as the compatibility factor, WhatsApp/SMS only as fallback, and require MFA for critical financial roles.

Why this choice was made:

StockFlow users include cashiers, accountants, payroll admins, tenant owners, and external accountants. Their risk is not equal. Roles that touch money, books, payroll, supplier bank accounts, or role assignment need stronger proof than a password. SMS is not sufficient for those roles because SIM-swap fraud is a known attack path.

How it makes the system successful:

- Gives modern phishing-resistant MFA to high-risk users.
- Keeps a practical fallback for mobile-first markets.
- Avoids treating SMS as a strong factor.
- Allows risk-based step-up for new devices, new networks, and suspicious behavior.
- Keeps lower-risk cashier workflows configurable without weakening critical roles.

Security outcome:

Compromised passwords alone are not enough to access critical financial surfaces.

## Choice 9: Risk-Based Step-Up Authentication

Decision: Require additional MFA when the device is new, ASN changes, impossible travel appears, the user is in shared-device mode, or the role holds critical permissions.

Why this choice was made:

Static login rules miss real attacks. A known user on a known device and familiar network is not the same risk as the same password used from a new device or network.

How it makes the system successful:

- Reduces friction for normal low-risk sessions.
- Adds friction when the context looks suspicious.
- Supports mobile-first users without weakening high-risk access.
- Creates useful signals for audit and alerting.

Security outcome:

The system adapts to risk without relying on a single weak signal.

## Choice 10: Account Enumeration Prevention And Abuse Defense

Decision: Use generic errors, timing-safe behavior, rate limits per IP/email/ASN, progressive delays, CAPTCHA, and sign-in attempt logging.

Why this choice was made:

Attackers often begin by discovering which emails exist, then credential-stuff those accounts. Financial SaaS cannot leak that information through messages like "user not found" or "wrong password."

How it makes the system successful:

- Makes account discovery harder.
- Slows credential stuffing.
- Creates evidence for security monitoring.
- Reduces automated abuse without fully blocking legitimate users.
- Keeps signup, password reset, magic link, and sign-in consistent.

Security outcome:

Attackers get less information and hit more resistance before reaching MFA or session creation.

## Choice 11: Sudo Mode For Sensitive Actions

Decision: Use `requireFreshAuth(300)` for high-risk actions such as password change, email change, MFA removal, supplier bank-account change, payroll approval, period close, and critical role assignment.

Why this choice was made:

A session that was authenticated hours ago should not be enough to perform a high-impact action. If a workstation or phone is left unlocked, sensitive operations still need fresh proof.

How it makes the system successful:

- Adds a final identity checkpoint before dangerous operations.
- Limits damage from abandoned sessions.
- Creates a clean reusable primitive for server actions.
- Links identity proof to business risk.
- Gives RBAC a stronger signal before critical approvals.

Security outcome:

Session possession alone is not enough to change the highest-risk account and financial settings.

## Choice 12: Hardened Account Recovery

Decision: Treat support-led recovery as the highest social-engineering risk. Email reset alone is insufficient for MFA-locked recovery; require evidence, cooldown, approval, session revocation, and financial hold.

Why this choice was made:

Attackers often bypass strong MFA by convincing support to reset it. A secure authentication system is only as strong as its recovery path.

How it makes the system successful:

- Keeps legitimate recovery possible.
- Prevents email-only reset from disabling MFA.
- Adds a 24-hour cooldown before high-risk access resumes.
- Revokes active sessions after recovery.
- Places financial actions on hold after suspicious or high-risk recovery.
- Creates an audit trail for later investigation.

Security outcome:

The recovery path stops being an easy bypass around MFA and becomes a controlled, monitored security workflow.

## Choice 13: Security Event Auditing And Notifications

Decision: Audit every security-relevant event and notify users or tenant owners when risk changes.

Why this choice was made:

Authentication failures, MFA changes, password resets, new-device sign-ins, tenant switches, and recovery events are security evidence. They must be visible to both the system and affected users.

How it makes the system successful:

- Builds an investigation trail.
- Helps users detect account takeover quickly.
- Lets tenant owners see risky member changes.
- Connects authentication events to the same `audit_log` used by RBAC.
- Supports "this was not me" response flows that revoke sessions and force reset.

Security outcome:

The system can detect, explain, and respond to suspicious identity events instead of silently accepting them.

## Choice 14: Shared-Device And Cybercafe Handling

Decision: Add explicit shared-device handling, short POS idle timeout, no remember-me in shared mode, no device trust, and visible sign-out.

Why this choice was made:

The target user base includes mobile-first users and people who may access the app on shared cybercafe devices. Treating this as "the user's problem" would leave a predictable session-theft gap.

How it makes the system successful:

- Reduces exposure from abandoned sessions.
- Avoids trusting devices that should not be trusted.
- Keeps POS contexts tighter than back-office contexts.
- Makes secure behavior visible and easy.

Security outcome:

The system is designed for the real operating environment, not just ideal private laptops.

## Choice 15: Bilingual And Localized Auth UX

Decision: Externalize auth UI strings, security emails, WhatsApp messages, and SMS messages with French primary and English secondary.

Why this choice was made:

Security flows fail when users do not understand them. Password reset, MFA setup, recovery warnings, "this was not me" links, and tenant switching must be clear in the user's language.

How it makes the system successful:

- Improves completion of legitimate MFA and recovery flows.
- Reduces support burden.
- Makes warnings understandable during stressful security events.
- Keeps the app aligned with OHADA-region French-speaking users.

Security outcome:

Users are more likely to take the right action when the system communicates clearly in their language.

## Choice 16: Tenant Switch As A First-Class Security Flow

Decision: Tenant switching verifies active membership, rebuilds JWT claims through Auth.js update flow, writes an audit row, and immediately changes the tenant context.

Why this choice was made:

Multi-tenant users, especially fiduciaires, may work across many tenants. Tenant context is security state. It cannot be a loose dropdown value.

How it makes the system successful:

- Supports normal external-accountant workflows.
- Prevents parameter tampering.
- Ensures old tenant data is inaccessible after switching.
- Refreshes RBAC claims for the new tenant.
- Audits the transition for investigation.

Security outcome:

Cross-tenant data does not mix because the active tenant is verified and rebuilt server-side.

## Choice 17: Progressive Disclosure In The Skill Structure

Decision: Keep `SKILL.md` compact and move heavier implementation guidance into reference files.

Why this choice was made:

The authentication prompt is large and detailed. A single giant skill file would be harder for Codex to use consistently. Progressive disclosure lets Codex load the main rules first, then read implementation references only when needed.

How it makes the system successful:

- Keeps the triggerable skill focused.
- Makes detailed examples available without overloading every invocation.
- Preserves the five end-to-end anatomy examples.
- Improves maintainability when future authentication guidance changes.

Security outcome:

Critical rules remain prominent, while detailed implementation guidance stays discoverable and structured.

## Choice 18: Include End-To-End Anatomy Examples

Decision: Include five worked scenarios: invitation signup, risk-based MFA sign-in, sudo mode, MFA-locked recovery, and tenant switch.

Why this choice was made:

Authentication systems fail in transitions: invite acceptance, MFA interruption, recovery, tenant changes, and sensitive-action reauth. The skill needed full examples for these stateful flows rather than isolated snippets.

How it makes the system successful:

- Makes implementation expectations concrete.
- Forces Codex to think through failure states.
- Connects code, audit rows, tests, and OHADA-specific risk notes.
- Reduces the chance of partial auth features with missing security edges.

Security outcome:

The highest-risk flows are defined as state machines with tests and audit expectations.

## Choice 19: Keep Alternative Providers In A Decision Matrix

Decision: Include a brief "When NextAuth Is Not The Right Choice" section covering Clerk, Better-Auth, WorkOS, and Supabase Auth.

Why this choice was made:

NextAuth is the chosen default for StockFlow's current stack, but a mature engineering process should name when that choice may no longer fit.

How it makes the system successful:

- Keeps the design honest.
- Helps future decisions if enterprise SSO, SCIM, hosted auth, or Supabase alignment becomes more important.
- Makes data residency and cost trade-offs visible.
- Avoids locking the product into a tool by habit.

Security outcome:

Provider choice stays tied to business, residency, and control requirements instead of developer convenience alone.

## How These Choices Work Together

The choices reinforce one another:

- NextAuth gives the framework surface.
- Prisma/Postgres provide durable identity truth.
- The session mirror fixes JWT revocation weakness.
- MFA limits damage from credential compromise.
- Risk-based step-up adjusts to suspicious context.
- Sudo mode protects sensitive actions inside an already-authenticated session.
- Hardened recovery closes the social-engineering bypass.
- Audit and notifications make security visible.
- RBAC integration ensures identity never becomes permission by accident.
- Shared-device handling and localization make the system usable in its real market.

Together, this creates a system that is secure, operable, auditable, and appropriate for StockFlow's financial risk profile.

## Success Criteria For Implementation

The authentication implementation should be considered successful when:

- Users can sign up through controlled invitation, password, magic link, or approved OAuth paths.
- Email verification is required before tenant access.
- Unknown OAuth users cannot auto-join tenants by default.
- Critical roles cannot access protected flows without MFA.
- SMS is never the sole factor for critical-permission users.
- JWT sessions are rejected when their `auth_session` mirror is revoked or expired.
- Tenant switching rebuilds session claims and blocks tenant tampering.
- Password reset revokes active sessions and triggers security notifications.
- MFA-locked recovery cannot be completed by email reset alone.
- Sensitive actions require fresh authentication.
- Auth security events are written to the shared audit log.
- French and English auth messages are externalized.
- Shared-device mode shortens sessions and disables device trust.
- Tests cover happy paths, denial paths, enumeration prevention, revocation, MFA enforcement, tenant tampering, and audit rows.

## Implementation Risks To Watch

- Treating middleware as the final identity authority instead of a coarse edge gate.
- Letting OAuth account linking happen without sudo mode and verified email match.
- Using JWTs without checking `auth_session`.
- Adding MFA UI without enforcing MFA server-side.
- Allowing recovery support staff to reset MFA without evidence, cooldown, and audit.
- Letting client-supplied tenant IDs drive session claims.
- Creating duplicate user records per tenant instead of global identity plus membership.
- Making SMS the default or sole factor for critical roles.
- Forgetting locale preservation across auth redirects.
- Forgetting audit rows for failed and denied security events.

## Conclusion

The authentication choices are deliberately stricter than a default NextAuth setup because StockFlow is not a casual web app. It is a multi-tenant financial operating system for SMBs, with accounting, POS, inventory, payroll, purchasing, and reporting surfaces. Secure authentication must therefore prove identity, preserve tenant context, resist account takeover, support real user conditions, and hand clean claims to RBAC.

The resulting design is successful because it balances security and usability: strong controls for high-risk actions, practical flows for mobile-first users, auditable state transitions, and clear separation between identity and permission enforcement.
