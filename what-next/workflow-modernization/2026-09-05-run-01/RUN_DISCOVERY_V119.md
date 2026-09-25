# Reconciliation run discovery for limited roles — v119

## Problem and correction

The run browser reused preparation-history authorization and required accounting read access even for its minimal run list. An authorized reconciliation signer without that permission could review a known run link or a recent dashboard run but could not search the full run history. Giving that person accounting access solely to find a run would widen their authority unnecessarily.

The existing service now distinguishes run discovery from preparation evidence. Run queries require an active same-tenant actor and reconciliation-read permission. They expose only run ID, observed status, business date, provider display name and currency, with scoped pagination, total and observation timestamp. The protected action retains its enforced module-read policy and resolves identity server-side.

Preparation history, source preview and preparation still require accounting-read permission. Preparation writes also require reconciliation-run permission and fresh authentication. The existing sign-off action separately checks sign permission, independence, setup, evidence revisions and fresh authentication. Listing a READY_FOR_SIGNOFF record is not approval or proof of current signability.

The existing dashboard run browser is available to reconciliation readers. Its ready rows offer a direct sign-off review action for permitted signers. Preparation details remain disabled with EN/FR explanation when accounting access is absent. Restoring a saved preparation selection cannot bypass that restriction. After a failed read, previous results remain visibly stale and their preparation/sign actions stay disabled until a successful refresh.

## How to use it

1. Open `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation` in your authorized workspace.
2. Choose **Review reconciliation runs / Consulter les rapprochements**.
3. Search by the provider display name or actual run reference, or use the next/previous controls. The reference comes from the run result, review link or retained run list. You do not need an approval-register ID to search.
4. For a ready run, authorized signers can open its independent sign-off review directly. Review current evidence and address any reported setup or independence requirement. Opening the review does not sign it.
5. A finance reviewer with accounting-read access can inspect preparation details and history. Preparing a run additionally requires the existing run authority and fresh authentication.
6. If search fails, use **Retry loading / Réessayer le chargement**. Displayed previous results are not a successful new search or proof of zero matches.

No new information, signature reference or subscription purchase is required from the user for this correction. A workspace administrator supplies legitimate role permissions through existing access management; the code does not create authority. When an accounting prerequisite is genuinely absent, the finance owner must provide the actual configured period or evidence requested by the review.

## Review responsibilities and limits

| Responsibility | Assessment |
| --- | --- |
| Architecture/backend/API | Existing discriminated read contract, action and service reused. Discovery and evidence authorization are separated without a new transport or parallel read model. |
| Database/integrity | Existing scoped order/cursor/count retained; no schema or migration change. User, provider and rail tenant scope remains enforced. |
| IAM/privacy/security | Minimal run metadata can be read with reconciliation authority; private preparation records remain accounting-restricted. Client state cannot grant access. |
| Finance/audit/records | No financial posting, readiness transition, preparation or signature occurs during discovery. Required review and fresh authentication remain downstream. |
| Frontend/design/UX/EN/FR | Existing dashboard components, tokens, focus and responsive layout reused. Distinct role explanations and direct review handoff remove a navigation dead end. |
| Quality/release/SRE | Focused permission/recovery tests plus actual pagination/browser evidence. Development route timing is observational; performance and native assistive-technology assurance remain open. |
| SaaS packaging | Existing module read enforcement preserved. No commercial or eligibility changes. |
| Payments/providers/ledger/close | Discovery covers retained reconciliation runs; it does not authenticate provider data, certify accounting or clear close blockers. |
| Statutory/country rules | Not applicable to this patch: no statutory rule or country calculation changed. No compliance certification. |
| Inventory/POS/offline/purchasing/HRIS/payroll | Not applicable to this patch: no behavior or data in these domains changed. Their broader workflow review remains required. |
| Analytics/AI/agents/events | Not applicable to this patch: no analytics calculation, autonomous operation or event delivery changed. |
| Rollout/support | No migration or deployment performed. Check reconciliation-reader, signer and finance-reviewer roles separately during rollout; do not grant accounting-read merely to enable searching. |

## Recovery

Keep pending preparation/signature requests intact; this correction changes discovery only. A rollback may remove the direct navigation affordance but must not widen evidence permissions or discard drafts/history. Existing reviewed-run links remain subject to server authorization. No live customer, external delivery or X1 approval was changed.

Verification receipts, screenshots, source binding and remaining coverage are appended after the checks finish. The complete platform assignment remains active.


## Final evidence

evidence/source-baseline-v119.json, 2026-09-13T11:31:39.939Z, branch codex/migration-control-plane-release-2026-08-29, commit a05a41ef66cd5d98fd69ae3df18225795f912232. Current dirty working tree preserved. Runtime lanes/environment/run-discovery-v119-bac23aa2-f708-4f23-be93-4ecb6b36125a.json, receipt24089a; both languages passed with stable source, actual22-run pagination, minimal projection and permission denials. Six screenshots; French320px visually inspected. Expected injected503 per language retained; no page errors. EN30304ms/FR9712ms development route observations remain slow. Native select's long French review-filter label truncates in its closed320px presentation; full option and native assistive-technology/zoom validation remain follow-up work.

Tests42 receipt1adb44: services/reconciliation/__tests__/reconciliation-run-preparation.service.test.ts, components/finance/__tests__/ReconciliationPreparationWorkbench.test.tsx, actions/payments/__tests__/reconciliation-preparation.actions.test.ts. Regression44 receipt1a82f3: components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx and components/finance/__tests__/ReconciliationSignReview.test.tsx. Both commands used bundled Node with node_modules/jest/bin/jest.js --runInBand --runTestsByPath and those exact paths. Full typecheck b2beac: node_modules/typescript/bin/tsc --noEmit --pretty false. Lint0a1301: node_modules/eslint/bin/eslint.js on the changed preparation service, root workbench, preparation component and their two changed tests; zero warnings. Runtime command: bundled Node lanes/environment/verify-run-discovery-v119.cjs. No default migration-bearing build.

All v119 verification handles completed. Selected skill009-aqstoqflow-payment-reconciliation-moat; next recommended numbered skill010-aqstoqflow-inventory-valuation-kernel, without limiting the full platform objective. No current global blocker. This batch does not establish professional approval or whole-workflow/platform completion.
