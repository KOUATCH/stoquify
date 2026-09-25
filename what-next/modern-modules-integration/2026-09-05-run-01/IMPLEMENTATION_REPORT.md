# Native module composition and lifecycle integration

Evidence date: 2026-09-05. Branch: codex/migration-control-plane-release-2026-08-29. Starting commit: a05a41ef66cd5d98fd69ae3df18225795f912232. The pre-existing dirty tree was preserved; baseline files remain in evidence/. The published docs/modern-modules design and original prototype are unchanged. Earlier workspace-only report text is archived under evidence/lifecycle-continuation/previous-record/.

## Delivered behavior

The existing authenticated /en/dashboard/settings/modules and /fr/dashboard/settings/modules routes host the native composition workbench in Stoquify's shared dashboard shell. Retailer and service-business starting selections are editable. The server resolves required capabilities, existing eligibility, consequences, actual setup requirements, retained access and supported stops before a fresh-authenticated submission.

A submitted request now has durable desired and active revisions. Accounting, reconciliation-provider, POS, scoped payroll and scoped compliance observations determine preparation progress. Missing inputs keep the previous verified workspace active. Resume records another attempt on the same operation, rechecks authority and changed evidence, and preserves unchanged successful steps. No artificial countdown or provider activation result is displayed. Requested, preparing, active, failed and retained states correspond to persisted records and events.

Workspace selection, commercial grants, operational setup and permission remain distinct. The sidebar, command search, mobile navigation and useful workspace links use the last active configuration and current grant/role decisions. Historical configuration can be reopened as a new draft; current authority and compatibility are checked again before reactivation.

## Integration map

| Accepted behavior | Reused implementation | Extension |
|---|---|---|
| Native settings entry | Existing settings registry, protected route and dashboard layout | React workbench; inherited organization context and theme |
| Catalogue and dependencies | Existing 19 canonical slugs and entitlement evaluator | Typed catalogue, explicit route mappings, recipes, unavailable proposals and dependency closure |
| Consequence review | Current tenant grants and domain setup services | Tenant/actor/permission/revision/catalogue/grant/stop/evidence-bound preview |
| Activation/preparation | protect, verified password step-up and domain-owned readiness | Desired/active split, durable operation, leased retry, step observations and append-only events |
| Supported stopping | Existing aggregate creation and continuation services | Tenant-lock serialized admission; inventory, purchase-order and payroll new-work scopes |
| History/recovery | Scoped audit log, immutable configuration commands | New draft from history, retained links, current-authority resume and recovery events |
| Resulting workspace | Shared sidebar, navigation search, real routes and RBAC | Persisted active configuration filters shortcuts while preserving grants/history |

Graphs located relationships including action communities 116 (module control) and 1 (organization settings); important paths were checked against source. Historical reports and prototype tests are not current integration verification.

## Access prerequisites addressed

Explicit empty grants stay empty; missing/inactive organizations receive no legacy defaults; grant intervals use inclusive starts and exclusive ends; invalid/duplicate grants fail closed; suspended and read-only dependencies cannot satisfy write intent. Read-only behavior follows operation intent across transports. Metadata describes actual enforcement, and the broad default observe mode was not promoted. Managed tenants use distinct durable grants. Legacy conversion snapshots existing effective access, preserves all 19 rights for empty legacy intent, retains unknown values and cannot fall back through orphan authority/history. Expiry without a row update also invalidates review.

## Operational scope and significant decisions

Inventory stopping rejects new counts, transfers and manual adjustments. A previously recorded count may create only the exact tenant-owned frozen-line adjustment, with server cutoff, line, quantity, cost and hash checks. Existing transfers, corrections, mandatory stock and ledger effects retain domain controls.

Purchasing stopping covers new and cloned purchase orders. Existing receipt, invoice and settlement obligations continue under their current controls. Payroll stopping covers new periods and ordinary calculations; duplicate results and governed corrections retain their original source/approval checks. Payment, declaration and posting controls remain effective. These are explicitly named operation scopes, not a claim that every metadata edit in a domain is prohibited.

POS and Sales stopping remain unavailable: automatic approval review rejected the required offline continuation source change twice. The unapplied proposal and exact rejection reasons are retained in evidence/lifecycle-continuation/OFFLINE_CONTINUATION_APPROVAL.md. It also needs ingestion/stop serialization and isolated negative proof before enablement. No alternative tool or agent applied the rejected patch.

Reconciliation stopping remains unavailable because later provider evidence for an already accepted payment needs a durable retained-source scope and supplementary run behavior. A client-selected old date or a count of currently pending rows is insufficient. Accounting stopping inherits this limitation because reconciliation requires accounting; stopping accounting would also block new reconciliation runs. These are explicit implementation boundaries; configuring and preparing these workspaces is supported.

Canonical evidence hashing was added after actual PostgreSQL testing exposed JSONB key-order changes falsely invalidating reviewed stop maps. The correction preserves array order and changes the hash for actual value changes; it does not bypass stale authority checks.

Payroll readiness uses a selected existing tenant period's country and dates. Compliance readiness is limited to the registered Cameroon DGI sandbox adapter, current pack and recorded specification/credential/expert-review evidence. Production authority submission is unavailable in its existing owner service. The builder neither creates nor certifies these approvals. Scope metadata is hidden from administrators lacking the corresponding domain permission.

## Review responsibilities and limits

Architecture/backend/data: service-owned read models, scoped constraints, serialized admission, immutable evidence and additive migrations. Security/privacy/fraud: server-derived identity, existing settings authority, fresh authentication, tenant isolation, private scope filtering, no wildcard entitlement bypass. Design/UX/localization: native semantic colors, state text/icons, EN/FR, focus, mobile actions and recovery. Finance/audit: real readiness, failed-query propagation, explicit obligations and preserved mandatory effects. Product/packaging: existing grants only, no prices or invented subscriptions. QA/SRE/release: focused unit, real PostgreSQL and application-browser evidence with source bindings and measured development route timings.

Statutory calculation changes are not applicable: no tax/payroll formula, chart policy or country-pack rules were changed. AI model safety evaluation is not applicable: no agent execution or automated approval is added. Billing-provider integration is not applicable: no purchases, provider provisioning or subscription mutations occur. No legal, accounting, security, privacy, accessibility or release certification is claimed.

See FEATURE_STATUS.md, VERIFICATION.md and COMPLETION_AUDIT.md for the latest tested scope and remaining work. All migration/fixture writes in this assignment target explicitly owned synthetic local databases; no customer deployment or X1 closure occurred.

## Concrete source-change approval item

The complete review candidate is `evidence/lifecycle-continuation/offline-review-candidate/REVIEW.md`, with its exact patch, base hashes, proposed tests and isolated recovery instructions beside it. It supersedes the older incomplete proposal as a review artifact only. The final text check verified15 unchanged source bases and5 candidate files; no candidate code or SQL was applied or executed.

Approval is needed because automatic approval review twice rejected the POS/offline source mutation as a high-impact change without sufficiently specific authorization and rollout safeguards. The candidate covers the two POS owner files, one server-only continuation helper, the proposed `20260905210000_protect_offline_acceptance` SQL migration and one focused test file, plus related test-fixture adaptation and migration catalogue registration. The proposed verification target is a new, explicitly checked synthetic localhost database; production deployment, customer activation, stop-support enablement and weakening the replay restrictions are excluded. Older accepted events cannot receive fabricated proof. See the review before authorizing application and isolated verification.

The actual retained-transfer journey also exposed an existing permission-registry omission. `inventory.transfers.read` now maps only to the page's existing `TRANSFERS_READ` grant; ordinary inventory read, creation and approval remain separate, and wildcard access remains denied. All21 permission checks and the final full typecheck/lint passed. An observed shared-auth server-render warning recovered in the isolated browser but remains a production-bundle verification item in VERIFICATION.md.

Visual verification also corrected an occluded transfer-error toast. The actual stopped-work explanation now remains inside the transfer dialog in EN/FR while preserving its draft. A final French browser check verifies the alert is uncovered and the attempted transfer creates no record.
