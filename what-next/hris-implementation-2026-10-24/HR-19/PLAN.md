# HR-19 — Payroll-input handoff

IN_PROGRESS, 25 October 2026. Automatic continuation authorized. HR-18 sealed73 hashes; dependencies HR08/11/12/13/14 have retained scoped evidence. Shared60-case PostgreSQL correctness lane passes on current tree. Preserve unrelated edits.

Delivery mode: HR_CORE_WITH_HANDOFF. LIVE_PAYROLL is not selected. No country rule, recipient, employer approval or production readiness is invented. Named employer/recipient/template activation remains deployment configuration; synthetic recipient fixtures qualify software behavior only.

Large slice split before implementation:

1. **HR-19A — current input contract.** Entry: existing immutable attendance snapshots, native readiness proofs and current source owners inspected. Build complete bounded population/exclusion projection, validate mandatory contract/identity/compensation/payment proof and exact period attendance, unresolved inputs and source freshness. Fingerprint exact exported data and source revisions. Native Read Committed operational lock order required; do not reuse HR18 repeatable-read mode for operational revalidation. Exit: pure contract/CSV tests plus real200-person source reconciliation and denial tests.
2. **HR-19B — immutable issue and recipient outcomes.** Depends19A. Add narrowly scoped immutable manifests/exact bytes with revisions/replacement linkage, tenant constraints and append-only recipient outcomes where existing owners lack storage. Preview→issue hash compare, exact replay, live role/recipient checks, current-source stale detection, no payroll effects. Exit: migration/replay, concurrent issue/replay, stale/correction lineage, rollback and unauthorized receipt tests.
3. **HR-19C — operator/recipient workspace.** Depends19A/B. Existing UI primitives, EN/FR, prepare/resolve/issue/download/acknowledge/reject/correct, counts/units and limitations. Current source and retained original clearly distinguished; rejected rows retain exact IDs and reason. Exit: role/browser journey with synthetic recipient, final independent review/fixes, scoped checks, sealed evidence and execution register update.

Ownership: new `services/hris/payroll-handoff*`, corresponding protected actions/UI/route/tests, additive SQL/model and isolated migration runner; narrow People/daily-work link only. Reuse `payroll-readiness-contract`, native attendance certification validators/currentness guards, `safeCsvValue`, BusinessEvent/AuditLog IDs-only audit. No sensitive manifest in broadly readable event payloads. No shared payroll owner refactor or live service call.

Acceptance: exact200 eligible rows/totals; corrections mark old package stale and link new version; mandatory missing inputs block issuance with visible exclusions; recipient outcomes reconcile unique row IDs against exact package hash; no export/payment/filing conflation. Missing real recipient/template review remains explicit operational admission gap.
