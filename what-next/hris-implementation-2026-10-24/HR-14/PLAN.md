# HR-14 — Controlled review and decision receipts

IN_PROGRESS after HR-13 sealed with 108 hashes and zero drift. User authorized ordered continuation and independent review. Preserve shared edits and historical evidence.

Ordered child deliverables:
1. Exact-fact review for the six existing inbox domains: lifecycle, contract activation, contract document, compensation assignment, salary change, payment destination. Use native source owners, explicit salary privacy, masked payment details, current scope, stable request identity and canonical server fingerprints. Serialize comparison/decision against competing native writers. Retain the acknowledged decision envelope and accurate receipt atomically in existing audit storage; no second approval engine/table.
2. Accessible EN/FR review UI and time-workspace adapters. Replace manual cryptographic hash entry with displayed facts, acknowledgement, reason and eligible evidence references. Preserve drafts and uncertain-commit recovery. Existing request/approval/apply permissions remain unchanged; no aggregated manufactured permissions. Source hashes remain integrity data, not assertions of human or statutory approval.
3. Independent review and scoped pure/action/component, real PostgreSQL and rendered browser checks. Cover stale facts, direct-writer races, changed replay payload, actor separation, revoked/out-of-scope authority, masked data, keyboard entry/trap/return, failure preservation and decision receipts for every accepted domain. Save results and append the existing register before HR-15.

Preflight findings: most non-lifecycle native owners read then update without explicit source row serialization; compare-before-dispatch alone is insufficient. Inbox currently reports COMPLETED even when lifecycle application is only scheduled. Existing contract-ID-only UI command keys do not distinguish successive pending requests. Address these within this slice.

No production effects, migrations, provider calls, country/rate changes, rollout or external messages. Existing owned synthetic PostgreSQL remains the verification target. Ordinary evidence references are not assumed to be linked document downloads; record that limitation explicitly.
