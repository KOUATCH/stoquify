# Match-exception source integrity

Evidence date: 2026-09-08. Selected skill: `011-aqstoqflow-purchasing-ap-controls`. This service correction covers PA-017 request and PA-018 review, connected to PA-019 invoice approval. It does not complete those workflows.

## Finding and correction

The owned PostgreSQL reproduction accepted all four invalid operations: request without a known invoice maker, request using inconsistent stored variance, review after the invoice source changed, and review after invoice deletion. No payable was created by these probes. The issue was stale or absent source validation in the exception kernel; downstream invoice approval checks did not make those approval records trustworthy.

Requests now require the known maker and the shared invoice source validator. New request events bind the source fingerprint, absolute/signed variance, reason, evidence reference and expiry. Review reloads under locks, checks current invoice validity and requires the retained applied request event to match the source and exception. Independent review and expiry remain enforced. Concurrent decisions can claim only one open exception. Financial posting still happens through the separate invoice approval workflow.

The source fingerprint is an integrity binding, not a human signature or accounting certification. Existing old request records without the new fields are not silently attested: their review requires reconciliation. Do not manually manufacture evidence fields to remove this blocker.

## Operator inputs and remaining interface work

The invoice maker supplies the reason for a price variance, the organization's accessible supporting-document reference and a future expiry. Obtain the reason and evidence from the supplier invoice, purchase order and documented exception justification. An independent authorized reviewer supplies APPROVE or REJECT and a rejection reason. Neither selecting a capability nor signing an unrelated document supplies this evidence.

Current service work does not add a route. The request/review actions still need a service-owned current-session, revision-bound facade, exact interrupted-request recovery, retained history and EN/FR forms. Reconciliation for stale or legacy requests also remains engineering work, including a safe way to refuse/replace obsolete requests without approving them. These are not user approval requirements to bypass.

## Evidence and boundaries

The `before` receipt records acceptance of invalid operations; its passed checks mean successful reproduction, not correct application behavior. The first `after` receipt verified four rejections plus valid decisions. The final receipt adds tampered request proof, cross-tenant denial and competing reviews. Source hashes and original-record comparisons identify each tested state. See `../../evidence/match-exception-integrity-v65.json` when published for final results and exact files.

Focused tests cover the shared AP kernel and action regressions. Connected reviewed-approval PostgreSQL checks must still pass. No new browser evidence is claimed for this service-only patch; v64 UI screenshots remain historical. No schema change, migration, live payment, external notification delivery, production build or deployment occurred. Outbox records in owned fixtures are not proof of delivered notifications.

Architecture/backend/data/security/control review: source validation, tenant scope, maker independence, locking, immutable event verification and downstream approval are applicable. Finance: no new liability from an exception alone. UX/localization: current typed source-evidence errors feed existing error handling; full forms remain open. Quality/SRE: focused regressions and local concurrency, without production latency certification. Packaging: no catalogue or billing change. Statutory/country-pack rules, payroll, offline edge, external providers, AI and analytics: not applicable to this patch because their behavior is unchanged. No professional approvals are claimed.

Rollout requires the normal release process and explicit handling of legacy requests lacking proof. Preserve all old records; do not restore permissive approval to clear a queue. The broader inventory/AP/ledger/close and platform coverage remain incomplete.
