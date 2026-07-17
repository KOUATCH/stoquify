Let's create a skill with skill-creator. The skill audits an existing
dev project and produces a prioritized backlog of GitHub-issue-style
tickets to bring it from "works" to "professional, modern, robust" —
calibrated for a solo developer shipping publicly (not Fortune-500
compliance). Default stack is Next.js + Prisma, but it should adapt
to any JS/TS project.

The skill runs in two phases:

Phase 1 — Audit and propose

Scans the codebase directly: package.json (deps, scripts, versions),
tsconfig, Prisma schema, app/api structure, middleware, CI configs
(.github, vercel.json, etc.), env handling, test setup, lint/format
configs, README, .gitignore. Compares what's there against modern
best practices across these areas:

    - Authentication (who you are): session strategy, provider choice,
      password handling, OAuth flows, MFA, session invalidation,
      account recovery. Default recommendation when no auth exists:
      Auth.js v5 (App Router native, free, self-hosted) with the
      Prisma adapter and credentials + at least one OAuth provider.
      Only deviate if the project already has Clerk/Lucia/custom auth
      installed, in which case work with what's there.

    - Authorization (what you can do): role-based and policy-based
      access control, route/page guards, API and server-action
      protection, resource-level checks, organization/tenant
      boundaries. Default recommendation: a full permission-policy
      model in the style of Casbin or Cerbos — permissions defined
      declaratively (subject/action/resource), enforced through a
      central check function, with Prisma-backed role and permission
      tables, audit log of authorization decisions, and helpers for
      route guards, server actions, and DB-row-level checks. Even for
      solo projects this is the bar; suggest the lighter "single role
      column" pattern only when the project is clearly toy-scale and
      the user has said as much.

    - Security hardening: secrets management, input validation
      (Zod/Valibot), CSRF, rate limiting, security headers (CSP, HSTS,
      etc.), dependency auditing, SQL injection surface, XSS surface,
      file upload safety, CORS posture.

    - Architecture, code quality / DX
    - Testing
    - Observability (errors, logs, audit logs for auth events,
      analytics)
    - Performance
    - CI/CD
    - Accessibility
    - Documentation
    - Deployment

Authentication, authorization, and security are first-class — every
audit produces tickets in those three areas even when the project
looks "fine," because the bar is enterprise-grade posture, not
"nothing's on fire." Treat anything touching user data, payments,
or admin actions as security-critical by default.

Before scanning, asks the user about constraints (locked-in
platforms, libraries they refuse to use, multi-tenant or single-
tenant, what roles exist today if any, public-facing vs. internal).

Output: a set of GitHub-issue-style tickets in Markdown. Each ticket
has title, area label, priority (P0/P1/P2 — with security/auth
issues defaulting to P0 unless clearly low-impact), effort estimate
(S/M/L), problem statement, acceptance criteria, concrete
implementation notes with specific libraries/patterns. Tickets are
grouped into phases (Quick wins → Foundations → Polish) so the user
can ship incrementally. Recommendations are specific ("add Auth.js
v5 with Prisma adapter and GitHub provider; gate /admin in
middleware via session.user.permissions includes 'admin:access'")
not generic ("add authentication").

Phase 2 — Implement on demand

After presenting tickets, the skill offers to implement any subset
the user picks. Implementation reuses the project's existing
conventions and runs verification (typecheck, build, tests) before
declaring a ticket done. For auth/security tickets specifically,
implementation includes writing tests that cover the access control
boundaries (unauthorized user can't reach protected route, role X
can't perform action Y, policy denies forbidden resource access) —
not just wiring up the library.

Ask me the scoping questions you need, then draft the skill.
