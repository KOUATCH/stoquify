# Payroll register: allocation is not settlement

Delivered correction within FA-CASH-COMMAND's payroll dependency. This is not full workflow closure or payment certification.

## Finding and change

The register summed every payment allocation, including CANCELLED and FAILED batches, into a field and metric called `paidAmount` / “Paid”. Release itself writes the legacy run status PAID while the outbound transaction can remain PENDING; neither a prepared allocation nor this status proves receipt of funds.

The read model now exposes `allocatedAmount`, excluding cancelled and failed batch allocations consistently from row totals, summary totals and the allocation tie-out. Draft, approved, released and settled allocations remain allocation evidence. All batch history and source references remain available; no historical payment record was rewritten. This change does not invent employee-level settlement attribution from batch-level evidence.

The register labels the metric and tie-out as allocation evidence in EN/FR, explains the distinction and links to `/en/dashboard/payroll/payments` or `/fr/dashboard/payroll/payments`. Its legacy PAID run badge reads “Payment released” / “Paiement transmis” with information styling. Existing settlement services remain authoritative for settlement evidence.

The register fingerprint is version 9 and binds sorted batch IDs/statuses and allocation IDs, payslips, employees, amounts and currencies. New controlled JSON exports use envelope version 2 with `allocatedAmount`; prior exported files remain unchanged. Consumers importing new exports must branch on the envelope version. There is no database migration.

## Bounded acceptance criteria and verification

- Cancelled and failed allocations must not inflate current allocation amounts; historical batch rows remain visible.
- Amount/status changes must change the register fingerprint.
- Existing controlled export authorization/redaction remains effective; new exports identify the contract version.
- The actual local register must render the service amount and explanation in EN desktop and FR narrow mobile, with a localized, keyboard-reachable settlement link.
- Cross-tenant reads must fail and payroll amount redaction must remain effective.

The four added regressions failed before the correction (12 existing tests passed): `evidence/register-allocation-before.log`. The source-bound final unit/lint/typecheck and owned-database/browser receipts are listed in `evidence/cash-register-allocation-review-2026-09-30.json`. Browser fixtures are synthetic allocations on the owned posted-run fixture, not evidence of actual bank release or provider approval. Screenshots cover the actual application. Sandbox-denied writes and a line-ending match failure were corrected before final verification; the local app launch found port 3110 already occupied, so the existing owned app was reused.

## Operating guidance and recovery

Open `/{locale}/dashboard/payroll/register?runId=<authorized run ID>` from a session permitted to read payroll reports. Compare the allocated amount to net payable, then follow the settlement-evidence link to investigate actual payment outcomes. A matched allocation tie-out only says those amounts agree. Cancelled/failed batches remain in history and may still have unresolved ledger or reconciliation obligations; excluding their allocations does not clear those controls.

No new user input or organizational approval is required for this correction. Actual settlement requires the existing authorized operator, current statement/provider evidence and controlled reconciliation process. Do not manufacture a settled total from this register. If a downstream importer requires the old contract, retain existing version-1 exports and update the importer for version 2 before using new exports. An application rollback must keep the service and component contract aligned; retain all immutable exports and history.

## Review and remaining work

Backend/data/finance: current allocation and settlement meanings separated; decimal arithmetic and historical evidence retained. Security/privacy: existing authorization, tenant filters, export/fresh-auth controls and redaction remain in use. Frontend/product/accessibility/localization: changed copy and handoff checked; the wider register still has English text, wide tables and an inherited nested-main issue. Native assistive technology, full zoom/contrast review and complete payroll UX remain open. Architecture/API: a deliberately versioned export contract; no schema, provider, billing or event-processing rewrite. SRE/release: local verification only; no production performance or rollout claim. Statutory calculations, POS/inventory, purchasing, AI/agents and commercial packaging: not applicable to this allocation read-model correction; their original workflow requirements remain in the register.

Complete HRIS-to-release/provider-settlement/declaration/forecast verification, controlled legacy recovery and wider PAID-status presentation remain required. The parent workflow and full modernization goal remain active.
