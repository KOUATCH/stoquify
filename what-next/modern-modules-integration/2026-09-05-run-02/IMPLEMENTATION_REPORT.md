# Native module composition — current implementation record

Evidence date: 5 September 2026. Branch `codex/migration-control-plane-release-2026-08-29`, commit `a05a41ef66cd5d98fd69ae3df18225795f912232`, with preserved unrelated working-tree changes. This continuation supersedes the operational guidance in run-01 where stated below; the published design package and run-01 evidence remain historical records.

## Delivered journey

The authenticated `/en/dashboard/settings/modules` and `/fr/dashboard/settings/modules` routes use Stoquify's existing shell, tenant context, permissions, components and semantic colors. Retailer and service-business recipes lead through capability selection, dependency explanation, authoritative impact review, genuine password verification, durable preparation/activation, the resulting authorized workspace and history reopening. Selection, eligibility, setup, preparation, active configuration and health remain distinct. A waiting or failed preparation preserves the last verified workspace.

Run-01 implemented canonical catalogue mappings, legacy-rights preservation, server-owned previews, revision/idempotency checks, immutable commands/events, leased preparation recovery and the four additive migrations. Its six reports describe that foundation. This continuation completes directly affected behavior rather than replacing that journey with a narrower mock-up.

## Corrections in this continuation

1. **Accounting stop matches its real scope.** Only new manual journal creation stops. Existing posting/reversal, mandatory ledger effects, reconciliation and close controls continue. Operational dependencies now have their own explicit registry; POS→Sales remains, while catalogue eligibility/setup dependencies remain unchanged. The reviewed policy hash binds this distinction.
2. **Scope is visible before selection.** EN/FR explanatory text beside the accounting stop control makes its manual-entry limit explicit.
3. **The manual-journal draft survives failure.** The form retains every entered header/line field, focuses localized feedback, distinguishes stopped work from an unknown transport outcome, and directs the user to the existing journal queue. It does not automatically retry a potentially completed financial request. Confirmed success prevents repeated submission during navigation. Failed account/journal lookups are shown as failures; a genuinely empty eligible setup is a separate informational state.
4. **Earlier configurations remain discoverable.** History uses tenant-scoped cursor pages of 25 records. Lifecycle state is loaded for each actual page, including older operations. Loading failure preserves existing records and the draft; successful loading announces the result and focuses the first added record. Browser verification also found and corrected a props-refresh reset: loaded pages now survive within the same access/configuration scope, while scope changes and disjoint new pages invalidate the cache. Earlier statuses are explicitly described as snapshots. Reopening still creates a new draft under current permissions and fresh authentication.
5. **Authentication renders with the correct React instance.** Removing only `better-auth` from Next's external-package list lets its client hook use Next's server renderer. Native password hashing, core/adapters and Prisma remain external. Actual sign-in, session, permissions, transfer rendering and password step-up passed; the earlier cold-compile timeout and transient development bundle failure are preserved in the diagnostic record.
6. **The application build can validate the existing finance header.** Its anonymous returned renderer was given a component name to satisfy the blocking lint rule. This changes no table behavior or surrounding user work; unrelated warnings remain intact. `BUILD_FOLLOWUP.md` records why this small adjacent edit was necessary.

## Review responsibilities and limits

Architecture/backend/database review covers the reused service boundary, stable cursors, immutable evidence and existing migrations. Security/privacy review covers server-derived tenant/actor, foreign-cursor denial, current permission checks, scoped setup redaction and fresh authentication. Frontend/UX/localization review covers shared tokens, retained drafts, focus, status announcements and EN/FR copy. Finance/records review covers manual-entry admission versus mandatory posting and faithful historical lifecycle state. Quality/SRE review records actual commands, failures, source bindings and constrained development measurements. Packaging remains existing eligibility only; no prices or subscriptions are invented.

New statutory/country calculations, tax policy, AI/agent runtime behavior and new provider integrations are not applicable: this continuation changes none of those rules or execution paths. Existing country and provider setup checks remain effective. These are review responsibilities, not professional approvals or certification.

## Explicit remaining boundaries

Direct POS/Sales stopping remains unavailable. Automatic approval review twice rejected the specific offline-continuation mutation; the five-file candidate is still unapplied. Reconciliation stopping also remains unavailable: its source owner cannot yet distinguish required continuing settlement from elective new matching, including later payment of existing obligations. `RETAINED_RECONCILIATION_CONTRACT.md` records the engineering needed to offer that operation; it is not implemented or externally approved.

These restrictions do not prevent reconciliation configuration, preparation, activation, use or history. No universal deactivation claim is made. `COMPLETION_REVIEW.md` records the original request's supported-operation qualification and the stronger interpretation under which the additional deactivation program remains unfinished.

The recorded build revision passed optimized compilation, lint and type validation. Full page collection is limited by the existing invitation service's required email-provider key, deliberately excluded from the isolated build; the full build is not reported as passed. The later history correction passed current-source typecheck, lint, 79 focused tests and five real browser checks. Final EN/FR stopped-journal checks passed four observations; native EN/FR 200%/400% zoom passed all four cases, including French history keyboard paging. See `VERIFICATION.md` and `FINAL_COMPLETION_AUDIT.md` for exact coverage and remaining release conditions. No production deployment, customer activation or X1 closure has occurred.

## Open and review

The owned synthetic application remains available at `http://127.0.0.1:3107/en/dashboard/settings/modules` and `http://127.0.0.1:3107/fr/dashboard/settings/modules`. Use an authorized local account; private verification credentials are not published. `USER_GUIDE.md` explains configuration, evidence inputs, activation, retained work and recovery. The six current reports in this directory are the handover; run-01 and earlier checkpoint reviews preserve their original observations. `evidence/source-binding-final.json` identifies the final source and artifact hashes.
