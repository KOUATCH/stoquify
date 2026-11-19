# AF01 portfolio read contract

**Date:** 19 October 2026. **Scope:** accountant portfolio read model and minimal existing-consumer compatibility. No firm engagement, financial posting, schema change or new scoring algorithm.

## Entry points and ownership

- [Protected action](<E:/ohada saas/Focused projects/stoquify/actions/accounting/accountant-access.actions.ts:37>) keeps `getAccountantPortfolioAction(input = {})`.
- [Access-service entry point](<E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-access.service.ts>) remains exported; its internal signature now receives a server-owned actor context and validated page input.
- [Portfolio service](<E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-portfolio.service.ts:80>) owns authorization, paging and aggregate response.
- [Proof projection](<E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-portfolio-proof.service.ts:10>) owns bounded database reads within each client snapshot.

The only production caller found was the protected action; its existing route/component consume the additive result. The old single portfolio test moved into dedicated service regressions. Historical graph action node `accounting_accountant_access_actions_getaccountantportfolioaction`, community 58, helped discovery; its 8 September 2026 graph was checked against current source.

## Input

```ts
{
  cursor?: string; // 1–2000 characters; opaque continuation from this response
  search?: string; // trimmed, maximum 100 characters; default ""
  pageSize?: number; // integer 1–20; default 10
}
```

The strict schema rejects additional client/period/actor identifiers. Identity comes exclusively from the protected action's current context. Services recheck persisted active/verified/unlocked membership, same-home roles, `accounting.audit.read` and home accounting entitlement. A granted READ_ONLY mandate is sufficient to read; no review capability is implied.

## Paging and changing data

Candidates are currently active/effective/unexpired grants to active, nondeleted external client organizations. The current home organization is excluded from this delegated portfolio; its own books remain available through the ordinary tenant routes. Each target grant must also match the exact existing activeScopeKey and pass the client close-assurance read entitlement, including its accounting dependency.

The query orders by immutable unique grant ID ascending and requests at most pageSize + 1 rows. It does not alphabetize by a mutable client name or expiry field. Search is case-insensitive client-name containment within the authorized grant candidate scope.

Cursor version 1 binds actor ID, home organization, normalized search and page size, plus the last scanned grant ID. Like existing evidence cursors, it is a position, not a capability or integrity token. Tampering cannot remove the current query/access filters. Direct reuse across different actor/home/search/page-size contexts is rejected.

The extra candidate determines continuation. A denied candidate page can contain zero visible rows and still have a next cursor; the UI must keep continuation available. The cursor contains no client name, evidence or financial score. `clientCount` and `page.loadedCount` mean visible rows on this page. No exact global total is returned.

`coverage: PARTIAL` means more candidate positions exist; `END_OF_SCAN` means the current scan reached its end, not that every possible client is available or the entire portfolio was read atomically.

Renaming a client does not move its grant position. A new grant whose ID sorts behind the cursor, or a newly matching renamed client behind that position, appears after restarting. Revoked grants disappear; replacements are reauthorized against the exact current grant ID. Current search/permissions are applied on every request. Start a fresh scan to reconcile concurrent additions/changes.

## Per-client proof and observation time

Each row includes:
- `selectedPeriod`: ID, name, status, start and end; null if none.
- `checkedAt`: when that client snapshot was initiated.
- `assessmentAsOf`: the assessment's source-as-of time, distinct from the read time.
- `proofState`: NO_PERIOD, NO_ASSESSMENT, CURRENT, STALE, UNAVAILABLE, HISTORICAL, AMBIGUOUS or VOIDED.
- `currentProof`: existing evidence grade, redacted canonical blockers, assessment-selection state and latest assessment creation time.
- `close`: retained status/score/blocker count/asOf, run ID, `scoreBasis: HISTORICAL_ASSESSMENT` and saved source revision, or null.

CURRENT identifies the selected assessment state; the evidence grade may still be raw, operational or blocked. It never means “certified” by itself. Historical selection is supported by the shared derivation; normal portfolio selection chooses the latest run and does not accept an arbitrary historical run ID.

The shared [period resolver](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-period-selection.service.ts:12>) uses the current date-containing period, then the latest OPEN period. Start-date/ID descending resolves ties deterministically. Each tenant resolves independently. Explicit period selection in existing close detail remains tenant-filtered.

The existing assessment-order reader selects the newest two creation times, including adverse, running and voided assessments. Equal latest timestamps produce AMBIGUOUS rather than falling back to an older certified assessment.

One RepeatableRead transaction reads each client's grant/organization, period, assessment order, run and proof aggregates. Client snapshots are sequential and independently timestamped; there is no claim of one global financial snapshot.

## Bounded evidence and canonical rules

The projection reuses `deriveCloseCurrentProof`, `deriveCloseAssessmentSelection` and the extracted `applyCloseAssessmentSelection`, also used by close detail. It never calls the dashboard collector/fallback or creates an assessment.

Open findings and failed/unavailable checklist controls are grouped by the finite severity enum. Missing evidence is counted. Retained certified exports are counted with a parameterized SQL predicate that treats SQL NULL, JSON null and absent staleState the same way as the existing pure derivation. These operations inspect every matching row without sending evidence bodies to the service or truncating to a display sample.

No publication lock, source-revision insert, event publication or financial write is invoked. The saved source revision is provenance only. Comparing it to a global tenant counter would incorrectly treat unrelated-period source changes as invalidation; existing publication guards and period/source invalidators remain authoritative through the run/export stale metadata.

No index was added. Queries and transaction fan-out are structurally bounded by page size; larger representative performance qualification remains AF16.

## Authorization timing and failure behavior

The service validates the actor at entry, checks each client's current mandate/module before the snapshot, then rechecks all collected client rows after fan-out and validates the actor again before return. A lost client mandate/module omits all that client's identity/proof. Lost home authority fails the whole response.

This is sequential fresh authorization at the read boundary, not a global lock on all client organizations or a promise that access cannot change after the response. Each subsequent detail/export/action remains independently authorized.

Operational database failures propagate to the existing safe-action boundary; they do not become a healthy empty portfolio. No detailed denial reason, inaccessible client name or proof is returned for omitted rows.

## Existing consumer transition

The route accepts cursor/search/pageSize through validated action input. The existing component has page-local counts, continuation/restart links (including an empty candidate page), and historical-score/blocker labels in English/French. Layout and cards remain intact. Rich proof-state presentation, search controls and complete browser UX are AF02.

Deploy the action/service/result/component changes together. Rolling back must not leave a new page expecting an old DTO or label a stored score as current proof. Preserve client grants and financial history; no migration/backfill is required.

