# AF12 sample advisory pack

**Synthetic fixture only.** This sample documents the same public canonical object rendered by the implemented JSON/CSV/PDF exporter. It does not represent a real client or a benefit claim.

## Scope and provenance

- Client: `af12-1792922029354-journey-client`
- Engagement: `cmvnnhmzb0007malgxi7ox8kj`
- Period: 2026-09-01T00:00:00.000Z to 2026-09-30T23:59:59.999Z (inclusive UTC)
- Observed: 2026-10-25T09:54:09.546Z
- Source revision: `23`
- Source hash: `sha256:e80810e3128e220c23c9b696c9c613be00ec50233133beb10a113509148205c5`
- Review hash: `sha256:4f2b159a8c880e6df461e55b78c886e571cba48087a3d1b5a1ad67d6cdd99827`
- Delivery hash: `sha256:7c9567a5226895d64d54994f727df828f65478d1e9c89a18bdfb261a9cbe1c48`
- Export-time freshness: CURRENT

## Reviewed observations

| Schedule | Account | Currency | Ledger closing | Support closing | Difference |
|---|---|---|---|---|---|
| CASH | 571 | XAF | 100.20 | 100.20 | 0.00 |
| RECEIVABLES | 411 | XAF | 200.10 | 200.10 | 0.00 |

These amounts are copied from the current independently reviewed AF08 workpaper object, with no recalculation or cross-currency aggregation. Only selected cash and receivable observations are included in this sample.

## Conclusions and agreed actions

- CASH: Cash matches the independently approved support.
- RECEIVABLES: Receivable balances match reviewed supporting evidence.
- Confirm next month cash evidence coverage Owner: `af12-1792922029354-journey-owner`. Due: 2026-11-15T23:59:59.999Z. Source category: CASH.

## Attributable decisions

- Prepared: `af12-1792922029354-journey-preparer` at 2026-10-25T09:54:09.998Z
- Independently reviewed: `af12-1792922029354-journey-reviewer` at 2026-10-25T09:54:19.059Z
- Client agreed: `af12-1792922029354-journey-owner` at 2026-10-25T09:54:22.911Z
- Published to authenticated client workspace: `af12-1792922029354-journey-reviewer` at 2026-10-25T09:54:24.268Z

## Source evidence

- CASH / 571: evidence `cmvnnhpkt0029malgf67id9r2`, hash `sha256:5fbce6839b536888c21fa5ef3292dd5f18ff28943c1eaafbcb321b73799c294e`, source `sha256:0d4226a606ed18904fa3530f9c602ba26dd769d4610060ad9828c93625b815a8`.
- RECEIVABLES / 411: evidence `cmvnnhpyz002bmalgtf25ma1i`, hash `sha256:015fc0f080b2ec4f31e120121c901d26eff5e3bf1c3ecee06aa6adce41668fdb`, source `sha256:75a67be4d510cc2baf044477ffab382b98c8bdba9636472f85e2264ff23fd5c2`.

## Limitations and artifacts

Historical observations copied from independently reviewed workpapers, by account and currency. No forecast, FX aggregation, audit opinion or close certification. Client agreement confirms the listed actions; delivery means publication in the authenticated client workspace, not email receipt. Recheck current source freshness before relying on a retained export.

Private firm notes and internal decision reasons are excluded. This sample proves export/source agreement, not customer adoption or accounting certification.

[Canonical JSON](2026-10-25-run-01/sample-advisory-pack.json) · [Readable product PDF](2026-10-25-run-01/sample-advisory-pack.pdf) · [CSV](2026-10-25-run-01/sample-advisory-pack.csv) · [Reconciliation checks](2026-10-25-run-01/reconciliation-checks.json)
