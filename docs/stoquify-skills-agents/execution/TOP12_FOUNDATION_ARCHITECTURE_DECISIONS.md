# Top 12 Foundation Architecture Decisions

**Status:** Proposed for architecture/security council approval  
**Date:** 2 August 2026

These decisions narrow Phase 0 design. They do not authorize migrations, pilots, production use, or external actions.

## ADR-001 — Separate long-lived workflow cases from agent runs

**Decision:** Keep `AgentRun` as execution/trace record. Introduce or reuse service-owned workflow case contract for collections, advisor requests, supplier disputes, investigations, promises, and approvals. Case stores business lifecycle; run references case.  
**Reason:** Runs may retry or end while business cases remain open for days. Mixing both creates retention, ownership, idempotency, and legal-history ambiguity.  
**Required contract:** tenant, case type, subject/resource scope, status, owner, participants, purpose, opened/closed timestamps, SLA, evidence links, event history, version, retention class.  
**Gate:** schema decision, tenant/RBAC tests, idempotent transition tests, immutable event audit, expiry/retention review.

## ADR-002 — External access uses relationship plus resource grant

**Decision:** Existing tenant invitations do not become generic external authorization. Model external party, organization relationship, purpose-bound resource grant, delegated membership, expiry, revocation, and access audit.  
**Reason:** Advisor, customer, supplier, and finance-partner access has different subjects and scopes. Tenant membership alone risks over-sharing and cross-client leakage.  
**Gate:** deny-by-default matrix; cross-client/cross-supplier tests; fresh auth for sensitive downloads and bank-detail workflows; revocation SLA.

## ADR-003 — Consent is event-sourced and purpose-bound

**Decision:** Use consent ledger with grant, update, withdrawal, expiry, suppression, legal basis, channel, recipient/contact, purpose, source, version, actor, and evidence reference. Compute current consent from immutable events.  
**Reason:** Communication and finance sharing need provable consent at action time and history after withdrawal. Boolean fields cannot prove context or revocation sequence.  
**Gate:** no send/share without current valid consent; withdrawal propagation; quiet hours and suppression; audit/export/deletion policy.

## ADR-004 — Evidence envelope is common; domain truth stays service-owned

**Decision:** Standard evidence envelope carries tenant, source, source version, captured/observed times, freshness, hash, transformation chain, confidence, reviewer, retention and redaction. Domain services decide whether evidence can create drafts or facts.  
**Reason:** Shared provenance enables trust UI and evaluation without allowing document/model layer to post business truth.  
**Gate:** every claim has evidence state; stale/missing evidence degrades or blocks; source coordinates and reviewer retained for extracted fields.

## ADR-005 — Provider-neutral model router after deterministic boundary

**Decision:** Models sit behind provider-neutral adapter with structured outputs, prompt/version hashes, redaction, budgets, fallbacks, tenant/country policy and evaluation cohort. Calculations and authorization remain deterministic.  
**Reason:** Current runtime is provider-free. Provider adoption must not couple domain code, expose secrets, or create unbounded cost/quality drift.  
**Gate:** prompt injection, PII, outage, timeout, schema, budget, fallback, and model-change regression tests before shadow use.

## Approval needed

Architecture, Security, Privacy, Data Trust, Product, and Domain owners must accept or amend each ADR. Until then, related WBS items remain `PENDING`; no schema or production contract is implied.
