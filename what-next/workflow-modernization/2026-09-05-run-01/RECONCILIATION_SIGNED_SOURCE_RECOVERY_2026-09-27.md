# PR-10: sources arriving after signature — 2026-09-27

Implementation milestone; PR-10 remains **In progress**. No workflow closure, deployment, migration, live customer activation or organizational approval is claimed.

## Delivered behavior

An authorized reconciliation operator can now review genuinely unallocated sources for a signed run. The preview identifies the retained certificate and explains that incorporation reopens the run and requires fresh preparation and an independent signature. The server verifies the original v2 signature envelope, canonical hash, tenant/run/provider/rail/period/date identity, signing actor/time, immutable metadata and retained signing audit before reopening.

The existing revision-bound Serializable transaction retains the full original signed run in its recovery receipt, clears only the current active signature, incorporates new evidence, and records the change. Existing claims keep their correction or independent source-review path. New payments can match automatically; later evidence for an existing match requires the existing nonfinancial review. Neither reopening nor source review creates a financial posting.

History exposes the original certificate hash. Preparation/signing validate the retained signature and audit in the recovery chain and exclude recovery/preparation actors from signing. Exact retries return the existing recovery receipt without overwriting a later signature. Affected close evidence becomes stale through the established PAYMENT_RECONCILIATION_SOURCE_REPAIRED contract; the reconciliation inbox records that fresh review is needed.

## Verification

- Baseline: signed event and statement arrivals reproduced the former unsigned-only restriction in lanes/environment/signed-additional-sources-675bfa9c-7800-4bb0-906e-2f3adeb4ecc0.json.
- Initial lifecycle: lanes/environment/signed-additional-sources-71aaca5d-71e2-4489-83fe-fc0189125b97.json passed for new payment/event and payment/statement pairs.
- Current boundary lifecycle: lanes/environment/signed-source-boundaries-87c1def0-9031-4322-b660-fe24ce9f9caf.json passed for both source types. Covers corrupted certificate, actual provider drift, unauthorized/stale-auth/cross-tenant refusal, audit failure rollback, competing incorporation, exact retry, preserved original matches, fresh preparation, independent signature/export and old retry after the new signature. An explicitly synthetic certified-state close fixture becomes BLOCKED with the original certificate hash and the correct stale-source code. This is boundary verification, not close certification.
- Focused checks: evidence/signed-additional-checks-d128bf7f-2362-4f0a-85fd-b58665fce620.json records **255 tests / 13 suites**, changed-file lint and full TypeScript passing with stable source hashes. Includes envelope tamper/identity/audit tests, protected actions, retained evidence, preparation/signing, UI recovery and withdrawal regressions.
- Preserved failed attempt: evidence/signed-additional-checks-c7582d21-04e5-417c-8d3b-a827ad3aa7f6.json had passing tests/lint but TypeScript rejected an unregistered close-invalidation code. Reused the existing source-repair contract, then verified actual stale-close effects and reran the checks.
- Browser: lanes/environment/signed-additional-browser-1e4e2146-84e2-4136-ae25-bf22bd0f7332.json passed both EN/FR journeys with stable source. Verified signed-run discovery; consequence and retained-hash presentation; preview keyboard focus; 320/768/1440 reflow; controlled 200% text enlargement; fresh authentication; response lost after commit; reload/exact retry and retained history; renewed preparation; recovery-actor sign refusal; independent signing; revoked-write denial; no journals. No page errors. Warm development entry was EN 6,446 ms / FR 7,438 ms; this does not establish production performance. First attempt df406d7c-a9cd-4300-9962-c8abe9941d30 timed out finding the run-list filter after the initial keyboard opening action. No browser exception was observed; cold entry was 41,569 ms. The verifier now requires the interactive list to be visible before proceeding. The failed receipt and screenshot are retained.

All database/browser work uses the guarded loopback database stoquify_local_registration_20260906_01 and uniquely owned synthetic records. External fetches are fenced. Scripts invoke Node/Jest/ESLint/tsc directly; the browser uses the inspected migration-free supplier-ack-local.cjs wrapper on port 3110. No seed or default build ran.

- Current corroboration: lanes/environment/signed-corroborating-source-f0978cf0-5d10-4109-9191-b538ed1006a2.json passes genuine signed callback/statement arrival, independent source approval, preparation, second signing/export, retained certificate and unchanged original allocation.
- Final source binding: [current hashes and receipts](evidence/signed-source-recovery-current-bindings.json). Actual EN/FR mobile and desktop screenshots were visually inspected; the long hash wraps and the reopening warning remains readable. Native screen-reader speech and browser-chrome zoom are not established by these checks.

## Operator procedure

Open /en/dashboard/finance/reconciliation or /fr/dashboard/finance/reconciliation. Open run preparation, select all runs and search. Review the signed run, then preview additional sources. Check the source counts and retained certificate reference. Enter the business reason and confirm; authenticate again if requested. Following a lost response, use the retained retry action rather than submitting a different request. Review any resulting exceptions, prepare the run, and ask an independently authorized signer to review/sign the current evidence. History retains the earlier certificate reference.

The operator supplies a meaningful reason from the source investigation. Source rows come from existing authenticated ingestion/statement import; the server provides their counts, revision, certificate hash and history. No manually invented approval/reference is required. A malformed legacy certificate or missing audit remains a review condition; this patch does not fabricate evidence or bypass period/provider controls.

## Boundaries and remaining criteria

No new design system: existing dashboard attention border, shared buttons/forms, focus region and inherited wrapping; EN/FR consequence/history/inbox copy. Selection and prior signing are not represented as current approval after reopening.

Architecture/data/security/finance/audit/quality reviews cover atomicity, tenant identity, independent signing, immutable historical proof, no duplicate financial effects and close invalidation. Product/workflow/localization review covers consequences and recovery. SRE/support retains explicit development latency and scheduling limits. Statutory/country rules: not applicable to this change; no statutory computation or certification changed. POS, inventory, purchasing, payroll, AI and commercial packaging: not applicable; no domain operation, package or price changed.

Next issue reproduced in lanes/environment/corroborating-total-observation-490cf975-afbc-41a8-b678-00f3560d546d.json: both signed corroboration fixtures contain one 100.25 XAF payment, one unchanged match and a RESOLVED source-review case, while stored/new-certificate totals say external 200.50 and suspense 100.25. Distinguish cumulative evidence amounts from current financial exposure and verify all consumers before correcting totals; do not silently reinterpret old signed certificates.

Still required for PR-10: source-volume/exposure-total review, remaining current-authority/sign-review accessibility and entry-latency diagnosis. Live worker scheduling and general exhausted-message repair/requeue remain separate operational limits. Published historical evidence stays intact. The full platform goal remains active.
