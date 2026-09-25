# Suspense posting currency — v102

Evidence date: 9 September 2026. Selected skill: `009-aqstoqflow-payment-reconciliation-moat`. This is an engineering correction within PR-09, not accounting, statutory or release approval. The platform-wide workflow assignment remains incomplete.

## What changed and why

The posting gateway previously set every line's exchange rate to 1 and copied its source amount into the base amount without reading the organization's accounting currency. A focused regression reproduced a EUR 5,000 posting with a base debit of 5,000 in an XAF setup. Balanced debits and credits did not make that conversion valid.

New suspense postings require an existing `OrganizationAccountingSettings` row with a valid base currency equal to the item's source currency. This supports XAF/XAF, EUR/EUR and other matching configured currency codes; it does not implement foreign-currency conversion. The service locks the settings row through posting, retains its ID, revision timestamp, base/source currency and rate in `LedgerPostingBatch.metadata.currencyBasis`, and verifies the retained rate and base amounts when that evidence is present. Concurrent settings changes return a reviewable conflict. Financial writes still occur in the existing serializable approval transaction.

Existing authorization, independent checking, fresh password assurance, reviewed source revision, open-period, source-link, correction-cycle, audit, notification and close controls remain applicable. The UI explains currency failures in EN/FR and keeps the reviewed request for explicit recovery. The new error code is preserved through the shared canonical and compatibility error adapters.

## What to do in the application

Open `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation`, then the suspense approval lane.

1. Review the saved item's amount, source currency, account, reason and accounting date. Complete the requested password confirmation as the independent checker.
2. If currency evidence is unavailable, leave the source amount and currency unchanged. The failed approval creates no completed posting; the saved review remains available after refresh.
3. Ask the accounting owner to compare the recorded source evidence with the organization's established accounting currency. If setup is genuinely missing or incorrect, its correction needs the ordinary authorized accounting setup process and assessment of existing records.
4. Retry explicitly only after the underlying issue has been resolved. A real foreign-currency item still needs a supported, reviewed conversion workflow. Renaming its currency or changing a real organization's base currency to force a match is not a resolution.
5. A concurrency message means settings or posting evidence changed during the attempt. Refresh and review the current evidence before retrying. The request cannot establish posting success from a local display alone.

## Inputs, owners and sources

| Input | Who supplies it | Where it comes from | Use |
| --- | --- | --- | --- |
| Actual amount and currency | Reconciliation operator | Original provider event, bank statement or underlying transaction | Compare with the suspense item; preserve original evidence |
| Established accounting currency | Organization's accounting owner | Approved accounting policy/setup and existing books; technical value is `OrganizationAccountingSettings.baseCurrency` | Verify the organization's setup, including historical effects before changing it |
| Suspense account and approved posting rule | Accounting administrator with the required authority | Existing chart of accounts, provider setup and active posting rule | Use existing mappings; this batch supplies no statutory account approval |
| Independent checker and current password assurance | Authorized approver | Current organization role and personal authentication | Approve the reviewed item; never share credentials |
| Foreign-currency rate evidence, effective date and rounding policy | Accounting owner, with an approved rate source | Applicable documented accounting policy and retained rate evidence | Needed for future conversion implementation; no production input field accepts a fabricated rate here |
| Unexpected retained-rate/base-amount failure | Accounting owner and engineering operator | Item ID, posting-batch ID, retained currency basis, journals and correlated error | Investigate; do not rewrite posted lines or historical proofs |

The owned browser verifier intentionally corrects a synthetic misconfigured setup to demonstrate recovery. It is not authorization or advice to change a live organization's accounting currency.

## Rollout and recovery

No schema change, migration, seed or production deployment is part of this batch. Before any rollout, inspect existing suspense currencies and accounting settings in the authorized target. Missing settings and mismatched currencies will now be refused instead of silently creating assumed conversions. Confirm operators know where to send those cases.

Already-posted approval retries use retained evidence rather than reinterpret an original posting under today's settings. Legacy batches without `currencyBasis` are not backfilled or retroactively certified by this change. Their currency provenance and any historical foreign-currency misstatements need separate investigation. The new optional metadata is not a migration of all historical records or an immutable external signature. Existing authorized access to history remains in place.

Do not roll back by deleting journals, replacing source amounts, weakening fresh authentication or removing the currency check. Keep affected proposals pending while correcting an engineering defect or completing approved accounting setup. Valid originals and counter-journals must remain retained. The v94 operational-notification cutover remains held under its earlier review decision.

## Review responsibilities

| Responsibility | Review outcome |
| --- | --- |
| Architecture, backend/API, database | Existing posting service and transaction retained; settings lock, stored basis and typed conflicts added |
| Security/IAM/privacy | Existing action scope, permissions, independent checker and fresh-auth gates retained; safe error mapping and no private payload added |
| Finance, reconciliation, ledger/close | Incorrect assumed conversion reproduced and refused; exact amounts, replay, retained journals and downstream controls covered by focused evidence |
| Frontend, UX, EN/FR/accessibility | Existing alert, review and recovery components/tokens reused; bilingual explanation preserves requests; browser evidence records its exact scope |
| Quality/release, SRE/performance | Unit/action checks, owned database effects and browser journeys recorded; route timings are local observations, not an approved performance budget |
| Statutory/country rules | No new rate, rounding, account or country rule approved; real conversion remains an engineering and accounting-policy boundary |
| Audit/records, analytics | New posting basis retained; old proofs not fabricated; correction does not establish historical FX accuracy or revise analytics totals |
| SaaS packaging, product/operations/support | No commercial entitlement change; operator guidance identifies owner and source of missing inputs |
| API/events, providers | No provider call or new event type; failure must not create completed financial effects |
| POS/offline, inventory, purchasing/AP, payroll | Not applicable to changed business behavior: their posting implementations are untouched; shared error adapters receive regression coverage |
| AI/agents | Not applicable: no model, agent tool or autonomous approval path changes |

## Remaining work

Final suspense resolution/write-off is still missing from the inspected source path. Before implementing it, establish its source evidence, authorized destination, accounting purpose, independent decision, exact financial effect and retained obligations. Foreign-currency posting needs an explicit source-owned conversion contract; this patch does not supply one. Historical currency evidence, broader provider/period/country contexts, screen-reader/contrast certification, production-scale performance and the rest of the workflow register remain open.

Next numbered skill after the reconciliation boundary is complete: `010-aqstoqflow-inventory-valuation-kernel`. It does not replace unfinished reconciliation or the full workflow mission.
