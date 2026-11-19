# P04-V02 independent review plan

Reviewer: independent `v02_review` agent. Review started 2026-11-09. No readiness verdict is issued by this plan.

## Admission before execution

- Confirm current source snapshot includes R01–R04 changes and preserves unrelated edits; bind fixture-only additions/overrides separately.
- Inspect candidate preparation, build, database, runtime, browser and protocol runner definitions and delegates. Repository command classification is not approval of arbitrary arguments.
- Require a fresh exclusive local target, ownership marker, exact paths and ports, an environment allowlist, no application environment files, and blocked outbound traffic. Do not consume production credentials or data.
- Verify current schema/migration/client binding and isolated synthetic database identity; build and runtime databases must be explicit. Preserve historical evidence and targets.
- Review local artifact verification, private asset packaging, diagnostic redaction, deadlines and owned-process cleanup. Do not modify product source to satisfy a qualification result.

## Evidence required for the verdict

- Actual current Better Auth sign-in creates signed cookies and persisted sessions; no mocked session provider or manually forged accepted cookie substitutes.
- Revocation and expiration are observed through fresh HTTP calls and real browser reload/back/stale-tab recovery while the prior cookie remains available.
- Current permission and module changes are exercised, with independent authorized sessions as positive controls.
- An admitted private read and mutation have response/DOM private-canary assertions and before/after business-state evidence; intended session/audit/bookkeeping effects are explicitly separate.
- Inventory enumerates current plugin/callback/implicit methods, including public and disabled/provider-dependent behavior. Tested cases and source-only/excluded coverage remain distinct.
- UploadThing protocol fixtures exercise route/signature/origin boundaries without treating local fixture success as hosted-provider acceptance.
- Browser evidence identifies route, actor role, locale, viewport, actual action, observed result and retained screenshot/trace without storing real private data or credentials.
- Exact build/artifact/source/harness identities, failed attempts, skips, limitations, independent checks and cleanup are retained.

## Publication and decision packet

- P04-D01 describes actual current finance status/metadata/download paths without labeling ambiguous policy a defect; presents explicit options, recommendation, owner decision and acceptance cases.
- P04-V02 may close only if every acceptance criterion has qualifying evidence. A partial, failed or source-only result cannot be called verified.
- Parent P04 and production remain blocked by their other children and release gates.
- Controlled register publication preserves unrelated packages, historical evidence, dependencies, decisions, deferred commitments and CSV parity.

## Initial source observations to target

- Current `lib/security/rbac.ts` disables Better Auth cookie-cache reads for authorization, while `lib/auth.ts` enables a five-minute session cookie cache. Runtime/browser probes must distinguish fresh authority from cached profile transport.
- Current `app/api/auth/[...all]/route.ts` delegates GET and most POST methods to Better Auth and intercepts normalized `/api/auth/update-user` POST for the reviewed self-profile service.
- Current UploadThing router requires session, inventory module and create/update permission, then explicitly rejects upload initiation in favor of the managed upload control. Its completion callback returns an empty object. Public metadata and callback behavior require separate classification.
- The current account-session UI explicitly warns that already-open pages and legacy routes have not yet been comprehensively qualified; this is a test target, not evidence of a confirmed defect.
