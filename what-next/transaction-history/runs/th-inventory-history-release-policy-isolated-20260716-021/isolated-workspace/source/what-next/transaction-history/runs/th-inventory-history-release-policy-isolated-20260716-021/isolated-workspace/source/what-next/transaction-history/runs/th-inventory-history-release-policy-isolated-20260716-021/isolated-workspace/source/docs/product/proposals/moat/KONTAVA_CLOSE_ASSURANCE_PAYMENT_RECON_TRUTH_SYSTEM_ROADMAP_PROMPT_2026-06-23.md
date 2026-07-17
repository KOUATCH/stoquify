# Kontava Close Assurance And Payment Reconciliation Truth-System Roadmap Prompt

Date: 2026-06-23

```text
Read the saved report titled:

“AqStoqFlow Close Assurance And Payment Reconciliation Truth-System Refinement Report”

Analyze the report deeply, together with the current AqStoqFlow/Kontava codebase, to extract every important proposal, prerequisite, strength, weak point, missing foundation, implementation dependency, and product opportunity related to Close Assurance and Payment Reconciliation.

Goal:
Create a concrete execution roadmap that moves the system toward a north-star experience: smooth, fluent, professional, modern, efficient, enterprise-grade, robust, ledger-backed, evidence-aware, OHADA-friendly Close Assurance and Payment Reconciliation.

Focus on how Close Assurance and Payment Reconciliation can become a “truth system” for the business, where managers, accountants, owners, and finance teams can trust that cash, payments, ledger entries, reconciliations, exceptions, close packs, and source evidence are aligned.

For the analysis, identify:

1. Current strengths of the system.
   - Existing models, services, workflows, dashboards, evidence trails, checks, release gates, and assurance foundations that should be preserved and extended.

2. Current weak points.
   - Missing links, incomplete workflows, weak evidence coverage, stale data risks, reconciliation gaps, close-readiness risks, UI/UX weaknesses, test gaps, schema limitations, or operational blind spots.

3. Prerequisites.
   - Prisma models and relationships.
   - Source-document and evidence requirements.
   - Ledger/source-link requirements.
   - Payment provider ingestion and reconciliation requirements.
   - Suspense, exception, and signoff requirements.
   - Close readiness, close pack, and accountant handoff requirements.
   - Notification, alert, and Manager Action Center requirements.
   - RBAC, redaction, tenant isolation, maker-checker, and audit requirements.
   - Snapshot/read-model and performance requirements.
   - Tests and release gates required before enforce-mode.

4. Concrete actions to take.
   For each action, provide:
   - Action name.
   - Problem it solves.
   - Why it matters for users and business trust.
   - Existing repo anchors likely affected.
   - Dependencies and prerequisites.
   - Implementation steps.
   - Tests required.
   - Release gate requirement.
   - Risk if skipped.
   - Business value.
   - Priority: quick win, medium-depth platform work, or strategic moat.

5. Integrated truth-system design.
   Explain how Payment Reconciliation, Close Assurance, ledger posting, evidence trails, Manager Action Center, Control Tower, notifications, and accountant trust packs should work together as one coherent system.

6. User experience requirements.
   Define how the system should feel for:
   - owner,
   - finance manager,
   - accountant,
   - branch manager,
   - operations lead,
   - admin/support.

   Include what each role should see daily, weekly, during reconciliation, during close, and when anomalies appear.

7. Roadmap.
   Produce a phased roadmap:

   Phase 0: readiness audit and gap map.
   Phase 1: payment reconciliation truth foundation.
   Phase 2: close assurance evidence and readiness hardening.
   Phase 3: incident/action routing, notifications, and Manager Action Center integration.
   Phase 4: accountant trust pack, proof trails, and OHADA-friendly close certification.
   Phase 5: Control Tower, BI trust gates, release gates, and enforce-mode readiness.
   Phase 6: enterprise-grade polish, performance, automation, and strategic moat features.

For each phase, include:
- objective,
- concrete implementation items,
- dependencies,
- files/modules likely affected,
- verification commands or tests,
- release gate,
- expected user-facing improvement,
- risk if delayed.

End with:

1. The top 15 concrete actions to take first.
2. The safest first implementation slice.
3. The highest-risk gaps that must be solved before production trust.
4. What must stay observe-mode.
5. What must be completed before enforce-mode.
6. How this roadmap makes AqStoqFlow/Kontava feel enterprise-grade, manager-ready, accountant-trustworthy, OHADA-friendly, modern, efficient, and hard to replace.

Constraints:
- Do not modify application code unless explicitly requested.
- Preserve existing services and data sources.
- Reuse current assurance, evidence, ledger, notification, Manager Action Center, Control Tower, close assurance, and payment reconciliation foundations.
- Every proposed insight must link to proof and corrective workflow action.
- Use dashboard color semantics for any UI recommendations.
- Save the final roadmap report under `what-next/` with a date-stamped filename.
```
