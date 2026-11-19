# HR-11 — Reviewed employee import

Entry: HR-10 VERIFIED scoped, 81 hashes checked with zero drift before starting. User authorized ordered automatic continuation. One active slice. No live import or production activation.

Ownership: new HRIS employee-import parser/service/action/client/route, narrow People navigation link, focused parser/action/DB/browser tests and evidence. Existing employee owner is reused with explicit createOnly; no schema/new master or permission elevation.

Supported v1: UTF-8 comma CSV, exact ISO dates, at most 200 nonblank records / 256 KiB. Explicit field mapping from source headers to employeeNumber, displayName, hireDate, countryCode, optional department/jobTitle. User IDs, salary, bank details, status and approved history are unsupported. All new people remain DRAFT. Existing numbers are errors, never merges. Blank records are ignored explicitly; every nonblank record appears in totals. Formula-leading cells are rejected and report cells use existing safeCsvValue.

Current generic onboarding import targets CUSTOMER/SUPPLIER/ITEM; its private parser tolerates malformed quote placement and domain schemas are unrelated. Reuse existing CSV export escaping and business-event/idempotency facilities; keep a bounded strict HR parser, not a new general import platform.

Preview stores a source digest, mapping, template version, counts, row error codes and expiry in existing business-event evidence; no raw CSV/name/account fields retained in the preview. Commit requires that server-issued preview and the identical source/mapping/version, current live pilot/manager authority, and a new duplicate check under the profile writer's organization lock. Commit is all-or-nothing and creates at most 200 drafts through the existing owner in one transaction. A retained commit receipt binds request key to digest and result IDs/counts; exact retries recover after expiry, changed payload conflicts. No generic undo.

Source CSV stays in the operator's browser/session and is never stored as a download artifact. Error exports contain row numbers/field/error codes only. Download requires a fresh protected action and current actor/tenant authority. Preview expiry: 24 hours; retained minimal receipts follow existing audit retention. No raw source export endpoint.

Acceptance: 200-row reconciled import; duplicate/malicious/malformed row totals; exact retry and conflicting payload; concurrent commit/rollback/interrupted response; foreign/revoked actor denials; EN/FR preview→correct→commit→receipt and restricted-role browser checks. Test only the existing owned loopback PostgreSQL target with bounded synthetic namespaces. Independent review after candidate implementation; final checks/evidence/register before HR-12.
