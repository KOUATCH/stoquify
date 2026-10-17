# P07 — Opening readiness states

17 October 2026. Service-owned projection: `services/onboarding/opening-readiness.ts`. The projection is assembled inside the server dashboard service from permission-filtered records. Overall opening state is always `REVIEW_REQUIRED` in this slice; there is no synthetic “ready” switch.

| Evidence | Display state | Meaning / next action |
|---|---|---|
| No permitted batch or milestone | NOT_STARTED | Download the current template, stage and validate. |
| UPLOADED / VALIDATED batch | PROPOSED | Source is staged; inspect validation and obtain required approval. |
| APPROVED batch | REVIEWED | Exact batch reviewed; explicit import remains required. |
| COMMITTING batch / partial IMPORTED milestone without recent details | IN_PROGRESS | Recover original batch; completion is not established. |
| COMMITTED batch / older RECONCILED milestone | IMPORTED | Masters only. No implication for quantities, balances or postings. |
| BLOCKED batch / matching blocked commit milestone | BLOCKED | Retain rejection/failure evidence; correct or recover under existing controls. |
| WAIVED milestone | WAIVED | Waiver is distinct from imported proof and does not waive financial requirements. Latest batch stage and historical evidence remain separately visible in import details. |

Latest permitted batch evidence can differ from retained master evidence. A newer blocked proposal does not erase an older imported reference. The projection returns identifiers, filename and fingerprint, not staged row contents, balances or credentials. Empty target visibility reveals no other tenant or restricted target progress. All proposed/reviewed/imported labels describe masters only; `POSTED` is deliberately not a possible master stage.

| Opening requirement | Current state | Domain boundary / required proof |
|---|---|---|
| Stock | NOT_VERIFIED | Inspect existing stock movements and item/location quantities at the agreed date. `postOpeningStock` retains `OPENING_STOCK_LEDGER_REVIEW`; a stock event or posting-batch ID is not a posted opening ledger. |
| Customer balances (AR) | UNSUPPORTED external opening import | Existing AR documents depend on sales lineage. Retain original invoices, settled/residual amounts and source identities. Existing receivables and legacy backfill are not a general external importer. |
| Supplier balances (AP) | UNSUPPORTED external opening import | Existing AP relies on purchasing/receipt/matching controls. Retain original obligations; do not fabricate purchasing transactions to satisfy a source contract. |
| Opening ledger | NOT_VERIFIED | Existing AN/OPENING journal supports manual drafts and governed posting. Proposed, reviewed and posted are distinct. A draft or accounting setup READY cannot establish cutover completion. |
| Reconciliation and independent approval | NOT_VERIFIED | A source-bound, reviewed tie-out contract is missing. Reconcile source totals to stock/AR/AP/GL, resolve differences, retain approval. No completion or automatic clearing in P07. |

`NOT_VERIFIED` means this view lacks a source-bound cutover proof, not that the customer certainly has no stock or journals. `UNSUPPORTED` refers narrowly to general external opening imports, not all receivable/payable functionality. The first slice supplies honest navigation and requirements, not live domain completeness aggregation. Later implementation must define the source, effective date, revision, owner and review evidence before replacing these states.

## Evidence classes

Pure/component cases check every master state, older/newer references, waiver, partial and blocked commit recovery, all opening requirements, EN/FR and refresh. Mocked action/service cases verify fresh tenant/target filters and permission/module/foreign-batch denial. Browser and independently queried PostgreSQL evidence are recorded in RESULT; they are separate from those mocks. No customer adoption, qualified accounting approval, regulatory certification, production isolation or operational restore result follows from this state model.
