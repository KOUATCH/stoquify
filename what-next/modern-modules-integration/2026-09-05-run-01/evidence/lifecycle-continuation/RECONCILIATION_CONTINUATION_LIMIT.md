# Reconciliation continuation and operational stop

Evidence date: 2026-09-05. Current source inspection and isolated tests; not a release or accounting certification.

## Delivered

The read-only obligations service returns thirteen bounded counts for run drafts/open runs, suspense, pending payment transactions, unmatched confirmed payments, unlinked electronic legacy payments, provider evidence, statement lines/imports, candidate matches, exceptions and inbox work. Counts overlap and must not be represented as a unique total. Query failure propagates; it is not converted into successful zero rows.

Completion evidence requires a full same-tenant, same-provider, same-currency match linked to a signed, non-voided run with signer, signing time and certificate hash. Partial or unsigned matches remain attention. Approved corrections can supersede earlier proposals. A historical UNMATCHED statement status alone is not enough to declare work pending when valid signed match evidence exists. Cross-tenant links and amount-mismatched legacy links do not discharge the obligation.

Six focused checks passed, including a real PostgreSQL fixture suite using a pinned transaction, temporary tables, a restricted search path and unconditional rollback in `stoquify_local_modern_modules_controls_20260905_01`. The fixture output contains counts rather than payment payloads.

## Why operational stopping remains unavailable

A newly created reconciliation run can finish payments already accepted before a stop. The current run admits transactions by business date, provider events by occurrence/receipt time and unmatched statement lines. A blanket new-run denial can therefore strand existing payments. A caller-provided business date or provider `receivedAt` value does not prove acceptance before stopping.

A narrower database-created-before-cutoff exception is also insufficient: authentic statement evidence or callbacks can arrive after the cutoff for an older payment. The current unique tenant/provider/business-date run has no general supplemental run workflow for such late evidence. Rejecting or ignoring it would not complete the original obligation.

Payment reconciliation and its required accounting dependency therefore keep operational stopping unavailable. Normal configuration, setup preparation and activation remain supported. Counts are useful operational attention evidence, not permission to enable stopping.

## Required continuation design

An authorized continuation change must preserve a server-owned obligation scope, identify the accepted payment/evidence records, retain their hashes and authority, admit authentic later evidence tied to that scope, and record supplemental or corrective run history without overwriting signed evidence. Ingestion and stopping need a shared serialization boundary or an explicitly controlled drained-source retirement procedure; a count checked before an unlocked upload is not sufficient.

Negative verification must cover forged old dates, cross-tenant/provider references, late valid statements, unsigned/partial/corrected matches, evidence arriving during stopping, duplicate run requests and preservation of the original signed record. No such continuation exemption has been implemented here.

The separate POS/offline proposal and its automatic approval-review rejection are retained in `OFFLINE_CONTINUATION_APPROVAL.md` and `offline-continuation-proposed.patch`. That refused production patch has not been retried or applied.

## Existing independent failure

The unchanged POS shift-close test at `services/pos/__tests__/pos-shift-close.service.test.ts:313` expects an exact business-event update without the current APPLIED audit payload emitted by unchanged `services/events/business-event.service.ts`. It was left intact. The affected new-admission suites plus unchanged offline-sync suite passed 75/75 after fixing the new denial fixture to use `ModuleNewWorkStoppedError`; those results do not claim the unrelated shift-close expectation passed.
