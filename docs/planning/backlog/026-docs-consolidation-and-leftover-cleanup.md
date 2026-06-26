---
id: 026
title: Consolidate docs/ — single ARCHITECTURE.md, RUNBOOK.md, ADRs; delete leftover files
area: documentation
priority: P2
effort: M
phase: polish
status: done
---

# Consolidate docs/ — single ARCHITECTURE.md, RUNBOOK.md, ADRs; delete leftover files

## Problem
The `docs/` directory has accumulated 19+ "report" files from past sessions: `ARCHITECTURE_ROADMAP.md`, `ENTERPRISE_READINESS_ROADMAP.md`, `INFRASTRUCTURE_HARDENING_REPORT.md`, `MODERNIZATION_REPORT.md`, `PROJECT_AUDIT.md`, `REFACTOR_COMPLETION_REPORT.md`, `REFACTOR_REPORT.md`, `STRATEGIC_NEXT_STEPS_2026-05.md`, `SYSTEM_EVALUATION.md`, and so on. They overlap, contradict each other in places, and a new contributor (or future-you) cannot tell which one is current.

The repo root also has stray files: `python test_connection.py`, `contries.ts` (typo for "countries.ts"), `notes.md`, `install.cmd` (Windows-only installer of unclear purpose), and a file named `E:retailifycomponentsnotificationsNotificationProvider.tsx` which appears to be a malformed path that ended up as a literal filename. There's also `documentations/` (separate from `docs/`).

This ticket is about cleaning the surface so the project looks like a serious codebase someone would want to fund.

## Acceptance criteria
- [ ] `docs/ARCHITECTURE.md` — single canonical architecture doc covering: stack, multi-tenant model, auth/authz, server-action vs service-layer convention, data model overview, deployment topology. Replaces `ARCHITECTURE_ROADMAP.md` (which is more of a plan than current state)
- [ ] `docs/RUNBOOK.md` — single canonical operational doc covering: deploy procedure, DB-down/Sentry-down/OAuth-down playbooks, rollback steps, on-call contact list, severity definitions, post-mortem template
- [ ] `docs/adr/` — Architecture Decision Records, one file per decision. Initial set: `0001-actions-vs-services.md`, `0002-policy-based-authz.md`, `0003-multi-tenant-via-prisma-extension.md`, `0004-mfa-via-otplib.md`. Each ADR follows the template at https://adr.github.io/madr/
- [ ] Old reports moved to `docs/archive/` (don't delete — they have historical value but shouldn't appear in the live `docs/` listing). `docs/archive/README.md` explains "these are snapshots of past audits; the current state is in ARCHITECTURE.md"
- [ ] Repo root cleanup:
  - [ ] Delete `python test_connection.py` (unused) or move to `scripts/` if it has value
  - [ ] Rename `contries.ts` → `countries.ts` and update all imports
  - [ ] Delete the malformed-named file `E:retailifycomponentsnotificationsNotificationProvider.tsx` after confirming it isn't imported anywhere (`git grep` the name)
  - [ ] Move `install.cmd` to `scripts/install.cmd` or delete if obsolete
  - [ ] Move `notes.md` to `docs/notes.md` or delete
- [ ] Delete the `documentations/` directory (or merge content into `docs/`)
- [ ] `README.md` updated to point to the new canonical docs: ARCHITECTURE.md, RUNBOOK.md, the backlog
- [ ] **Test:** `npm run build` succeeds after all the deletes/renames
- [ ] **Test:** `git grep "contries"` returns zero hits (all updated)

## Implementation notes
- The "delete" step is mostly `git mv` to `docs/archive/` rather than `git rm` — preserves history; can be re-deleted later if anyone agrees they're truly dead
- ADR template (4-section, brief):
  ```markdown
  # ADR-0001: actions/ vs services/
  ## Status
  Accepted, 2026-05-22
  ## Context
  ...
  ## Decision
  ...
  ## Consequences
  ...
  ```
- For the malformed-name file: verify its content before deleting. It's likely a duplicate of `components/notifications/NotificationProvider.tsx` that ended up at the wrong path due to a shell typo
- This is the kind of ticket that often gets deferred forever. Time-box it to one afternoon

## Out of scope
- Generating API docs from JSDoc / TypeDoc
- Storybook / component catalog
- Customer-facing help docs

## Resolution
Implemented 2026-05-23.

**Canonical docs created:**
- `docs/ARCHITECTURE.md` — stack, folder map, multi-tenant model, authn/authz, audit, observability, deployment, testing, known shape.
- `docs/RUNBOOK.md` — deploy procedure, rollback, incident playbooks (500s, DB down, Sentry down, OAuth down, Inngest down), customer requests (GDPR delete/export, manual user add), backup posture, secret rotation, severity definitions, post-mortem template.
- `docs/adr/0001-actions-vs-services.md` — codifies the migration path; supersedes the memory's "no services layer" line.
- `docs/adr/0002-org-scoped-prisma-extension.md` — defence-in-depth rationale, alternatives considered.
- `docs/adr/0003-mfa-via-otplib.md` — TOTP + AES-GCM + backup-codes decision.

**Old reports archived:**
- 20+ `docs/*.md` report files moved to `docs/archive/`. `docs/archive/README.md` explains the layer is historical only.

**Repo-root cleanup:**
- `contries.ts` → `countries.ts` (typo fixed); the one import in `components/Forms/RegisterForm.tsx` updated to match.
- `E:retailifycomponentsnotificationsNotificationProvider.tsx` (0-byte malformed-path file) deleted.
- `python test_connection.py` deleted (unused leftover).
- `install.cmd` moved to `scripts/install.cmd`.
- `notes.md` moved to `docs/notes.md`.

**Left alone (intentionally):**
- `documentations/` — contains working `.docx` references (the product brief, country-codes lookup), older `.prisma` schema proposals (`schemazzzxx.prisma`, etc.), and `DEPLOYMENT_GUIDE.md` / `SECURITY_IMPLEMENTATION.md` / `WORKFLOW_SYSTEM_OVERVIEW.md`. These are substantive enough that they need a human eye before being merged into `docs/` or archived. Filed as a follow-up.

The README still needs an update to point at the new canonical docs (`ARCHITECTURE.md`, `RUNBOOK.md`, the backlog). Folding into the next docs-touching PR.
