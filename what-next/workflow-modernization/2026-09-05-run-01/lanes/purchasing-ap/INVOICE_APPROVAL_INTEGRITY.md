# Invoice approval integrity — 2026-09-08

This is a prerequisite correction within PA-019, not completion of matching review, invoice approval, accounting posting or the platform review. The supported preparation UI from v57 remains available. No new approval UI or live approval was introduced in this checkpoint.

## Reproduced defects and corrections

| Finding | Before evidence | Correction and verified result |
| --- | --- | --- |
| Concurrent approvals of different invoices lost a liability in the supplier balance | Two 2,500.00 invoices produced two supplier entries but left currentBalance at 2,500.00 | Lock the same-tenant supplier before reading the invoice/supplier balance. Both liabilities now result in 5,000.00, with successive entry balances of 2,500.00 and 5,000.00. |
| Exact simultaneous approval retries returned a claim conflict | One request succeeded while the other failed after reading the old invoice status | Lock the invoice after its supplier. The waiting request reads the committed state and returns the same retained outcome; only one liability is created. |
| Approval was backdated to the invoice date | An approval performed in September wrote the August invoice date into postedAt | Record the operation time after acquiring the locks, in invoice.postedAt and the approval event's occurredAt. The invoiceDate, supplier ledger effective entryDate and accounting source date retain the document date. |
| Missing ledger evidence became a posted-journal claim on replay | Clearing ledgerStatus metadata caused a blocked invoice replay to return POSTED with no journal | Missing status now returns UNVERIFIED. This does not verify arbitrary existing metadata or create a journal; complete source/batch/journal proof remains a read-model and recovery requirement. |

The supplier-first lock order matches invoice preparation. This verifies concurrent **invoice approvals**. Other supplier balance writers, including payment releases and credits, still need their connected concurrency audit; this is not a claim that every supplier mutation now shares the same lock discipline.

No current source consumer outside the AP owner was found for `purchase.supplier_invoice.posted` or its notification name during the focused search. Effective accounting dates remain supplied explicitly to the posting owner. A full event-consumer audit remains part of the overall assignment.

## Evidence

- Before: `../environment/invoice-approval-integrity-e1ecdec2-61a.json` — all four expected integrity checks failed with the reproduced results above.
- After: `../environment/invoice-approval-integrity-e1af9c6b-25d.json` — all four checks passed. Both runs used real domain services and an owned isolated PostgreSQL database. A 100 ms delay after invoice/supplier snapshot read creates the same overlapping-read opportunity in both runs; after correction it occurs while holding the supplier lock.
- `../../evidence/invoice-approval-integrity-tests.json` — 74 tests across five AP/action/preparation/receiving suites passed, including operation-time and uncertain-evidence assertions.
- Final typecheck, changed-file lint, source baseline and verifier hashes are recorded by `../../evidence/invoice-approval-integrity-v58.json`.
- Original payments, journals and unrelated roles remained unchanged. No journal was created for the synthetic approvals: missing posting configuration continued to return `BLOCKED_PENDING_RULES`.
- The first verifier invocation had a syntax error before any database checks ran. It was corrected; the failed invocation remains in the task output.

This backend correction has no new browser, EN/FR, accessibility, performance, migration or production-build pass. Previous preparation screenshots are historical evidence for that interface, not proof of approval integration.

## What the user or operator supplies

| Information / action | Owner | Source and next step |
| --- | --- | --- |
| Original invoice/date | AP maker | Original retained invoice, linked during preparation. Do not change the document date to manufacture an approval timestamp. |
| Independent reviewer | Organization administrator / authorized reviewer | Current organization role and authenticated session. A different ID in a test fixture is not production signer or fresh-auth evidence. The reviewed approval interface remains to be implemented. |
| Approved matching exception, if needed | Invoice maker and independent match reviewer | Actual reason, supplier evidence and authorized active exception. Missing evidence must not be substituted with a sample approval. |
| Posting configuration | Authorized accounting owner | Existing organization journal, chart/mappings, posting rules and applicable country setup. Use expert-reviewed rules; this checkpoint does not supply statutory certification. |
| UNVERIFIED replay | AP/accounting operator | Inspect the same-tenant invoice, preparation/approval audit events, linked ledger batch, accounting source link and actual journal status. Do not relabel missing metadata as POSTED. |
| Possible historical balance loss | Authorized finance/data operator | Reconcile supplier ledger entries and liabilities against the supplier balance. Any repair must use a reviewed correction with its own evidence. No automatic historical repair was performed. |

## Remaining approval and accounting work

The existing invoice status POSTED can coexist with a failed ledger batch and `BLOCKED_PENDING_RULES`; it describes the existing AP liability transition, not necessarily a posted general-ledger journal. New UI must expose this distinction explicitly.

The approval function currently returns an already-approved invoice's existing blocked result. Configuring a posting rule and repeating approval does **not** yet retry the journal posting. Implement controlled ledger recovery that revalidates current authority, effective period, rule/account/country evidence and exact source amounts, without repeating the supplier liability or consuming an exception twice. Missing configuration alone is not the complete blocker; the recovery path is unfinished engineering.

Continue with service-owned matching request/review and invoice approval previews, fresh authentication, current role/module authority, immutable revisions, exact request recovery and retained decision discovery. Complete actual inventory → AP → ledger → close outcomes. Review the other raw AP callers and supplier-balance writers. None of this work is replaced by an external approval decision.

## Rollout and review responsibilities

No migration, deployment, live-customer activation, external message or real payment was performed. Retain all synthetic evidence. Roll back only this checkpoint's supplier/invoice locks, operation timestamps and missing-status fallback if an approved code rollback is necessary; preserve earlier preparation/quantity changes and historical records. Do not revert to the unreviewed public preparation writer.

Architecture/backend/database: existing AP owner and transaction reused; no second ledger or schema added. Finance/audit: liability accumulation, effective-versus-operation time and absence of journal proof tested. Security/IAM: tenant-scoped lock predicates retained; full current-session approval boundary remains open. QA/SRE: focused regression and controlled real concurrency evidence; supplier contention and other writers remain unverified. Product/frontend/accessibility/localization: no interface change; approval integration remains pending. Country/statutory: no rules changed or certification claimed. APIs/events: operation timestamp semantics corrected; full event/recovery integration remains open. Packaging, POS/offline, HRIS/payroll and AI/provider behavior: not applicable to this bounded correction, with their broader workflows retained in the register.
