# Rollout and recovery

No production deployment, customer activation, live migration or X1 closure is authorized or performed by these local checks. Run-01's deployment controls still apply; this continuation changes the accounting stop scope, history retrieval, affected form feedback and the shared authentication bundle setting.

## Database and build

The four existing integration migrations remain required on an explicitly authorized target: `20260905170000_add_tenant_module_composition`, `20260905173000_protect_module_configuration_authority`, `20260905200000_add_module_lifecycle_command_state`, and `20260905200100_add_module_lifecycle`. They were applied only to the two owned synthetic databases in run-01. This continuation adds no schema migration. Generate a client matching the applied schema through the existing controlled process.

Inspect the actual build command before rollout: the default build runs migrations. The continuation's direct Next build is deliberately migration-free and uses a unique output directory plus a database startup option enforcing read-only mode, verified through Prisma against the exact synthetic database. Its output is a verification artifact, not an authorized deployment target. Temporary generated TypeScript route references may be restored only when they are exactly the build's own change; unrelated edits must remain intact.

The current isolated build passed compilation, lint and type validation but failed full page collection because the existing invitation service eagerly requires an email-provider key. Before release, the release owner must provide governed build-time provider configuration or separately review that initialization, then rerun the full build. No provider key, invitation or successful provider readiness was fabricated for verification.

## Cohort review

1. Choose a real tenant and operator through the existing organization process. Verify current grants, role permissions, actual accounting setup, provider account evidence and any selected payroll/country scope.
2. Capture current effective access and active/desired configuration. Review the authoritative preview and exact operation consequences. A selected capability is not commercial or professional approval.
3. Confirm the supported stop scope. Accounting stops manual creation only; mandatory posting/reversal/reconciliation and close controls remain. Inventory, purchasing and payroll retain their documented existing-work paths.
4. Verify tenant/role denial, legacy preservation, stale review, preparation recovery, historical access and the user's actual locale/device before broadening the cohort. The local browser checks are complete within their documented scope; the full-build condition remains open. Use the final source binding and verification record.
5. Observe actual route and operation performance against the organization's adopted budget. Development timings in these reports are measurements only.

## Recovery

Keep the last verified active configuration while preparation waits or fails. Correct the named setup/obligation and resume the same recorded request under current authority. Reopening an older configuration creates a new draft and revalidates present-day rights; it does not roll back records or ledger effects. History paging is read-only and retry preserves the user's draft. Older pages show status at their last load; use Refresh to recheck changing preparation states. Authority, tenant or revision changes invalidate cached pages.

An unknown journal-submission result requires checking the authorized journal queue before another attempt. Do not auto-repeat a potentially completed financial write. A definite stopped-work denial preserves the fields and points to current records; only an authorized configuration review can request resuming new work.

If reverting UI code, retain the authoritative admission checks, schema, immutable commands/events and known stop state. Do not revert to date-only or client-supplied continuation authority. Reverting the shared-auth externalization fix reintroduces the observed renderer mismatch and requires its own route verification. Preserve all unrelated working-tree changes.

The owned 3107 verification app was restarted through the inspected local helper after the build attempts, bound to its exact synthetic database and existing private fixture. It is running for final checks/review (session 87013; `diagnostics/isolated-dev-restart.json`). Restart it only through that helper if needed. Do not stop or reconfigure the separate port-3000 application.

## Unavailable operations and exact approval boundary

The frozen POS/offline candidate in run-01 remains unapplied. Automatic approval review rejected changes to the core sale/replay path because it required specific authorization and adequate rollout safeguards. A review must cover the concrete five-file candidate, related fixture/migration-catalogue work and its named isolated test target; it does not authorize deployment, customer activation, enabling stop flags or weakening replay restrictions. Revalidate current dependency hashes before any later application; ordinary integration work has continued since that candidate was captured.

Reconciliation stopping remains an engineering prerequisite, not a missing signature. Late settlement of retained invoices/payroll/sales roots and incompatible active producers need the source-owned contract described in `RETAINED_RECONCILIATION_CONTRACT.md`. Continue ordinary authorized reconciliation under its existing controls. No historical proof, signer identity, prices or readiness evidence may be fabricated to clear either boundary.
