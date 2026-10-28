# Certification Scope Catalog

Use this reference to classify certification work.

## Allowed Claims

System evidence certification:

- The system created a deterministic, hash-backed pack from internal evidence.
- The pack is source-linked and audit-backed.
- The pack is not statutory legal certification unless external prerequisites are complete.

Statutory readiness:

- The system has enough source evidence and blockers for accountant/legal/authority review.
- Authority adapter and country pack status are visible.
- Expert-review gaps remain explicit.

Statutory authority certification:

- Only valid when a real authority adapter, verified country pack, required credentials, legal/expert approval, and jurisdiction workflow exist.
- Do not simulate this with local hashes, demo adapters, or internal approvals.

## Required Blockers

Create or preserve blockers for:

- `AUTHORITY_NOT_CONFIGURED`
- `REQUIRES_EXPERT_REVIEW`
- `COUNTRY_PACK_UNVERIFIED`
- `ADAPTER_SANDBOX_ONLY`
- `EVIDENCE_STALE`
- `INVENTORY_VALUATION_MISMATCH`
- `LEDGER_OUT_OF_BALANCE`
- `SOURCE_LINK_MISSING`
- `PAYMENT_RECONCILIATION_UNSIGNED`
- `OFFLINE_POS_PENDING_REPLAY`
- `SAME_ACTOR_CERTIFICATION`
- `FRESH_AUTH_REQUIRED`

## Inventory Valuation Annex

The annex should expose:

- organization id and accounting period id;
- as-of timestamp;
- valuation method summary;
- inventory transaction count;
- inventory level count;
- stock adjustment/write-off count;
- stock count variance count;
- purchase receipt count;
- POS movement count;
- opening stock count;
- class 3 ledger balance total;
- inventory subledger value total;
- mismatch amount;
- source hash;
- blocker status.

## Invalidation Evidence

For every stale event, record:

- certification/export id;
- source model;
- source id;
- source event name;
- stale reason;
- detected timestamp;
- actor id when available;
- previous evidence hash when available;
- new evidence hash when available;
- audit log id or business event id.

## UI Wording

Use:

- "System-certified evidence pack"
- "Statutory readiness blocked"
- "Requires expert review"
- "Authority adapter not configured"
- "Evidence stale"

Avoid:

- "legally certified"
- "tax-authority certified"
- "statutory certified"
- "OHADA certified"

unless real external prerequisites are implemented and verified.
