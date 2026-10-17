# Cash Command proof portal and current access

2026-09-28T09:33:32.597Z. Parent workflow remains In progress.

## Delivered behavior

The proof portal now establishes its own aliases to Stoquify product tokens, has an opaque canvas, wraps long identifiers and honors reduced motion in its panel and overlay. Shared labels, close control, loading/empty/error states, grade labels and freshness are EN/FR. Server-authored evidence is preserved verbatim; this is not full proof-content localization. Loading is announced as status and failure as alert. Current proof request-state protections remain intact.

The stale-button browser test reproduced a security defect: after payment_reconciliation was suspended, the actual proof action still returned the protected transaction. The four protected proof actions now require their owning module with read intent, enforcement and audit before calling the proof service. Suspended and expired modules deny; active and retained read modules allow. The central module policy remains the authority.

## Verification

- evidence/proof-portal-checks-54966775-b83b-4038-a5ad-e6385376676f.json: 90 tests/nine suites, changed-file lint and full TypeScript passed. Real protected wrappers verify dispatcher and dedicated actions for all four proof subjects; no data query follows RBAC/module denial or a module lookup failure.
- lanes/environment/proof-portal-fd60a0ea-c222-44c3-97be-1e092ab490cc.json: six real EN/FR views at 1440, 768 and 320px. 96 text contrast samples, minimum 6.779:1, exceeded 4.5:1. Opaque background, keyboard containment, Escape/focus return, actual proof retry, reduced motion and 200% controlled root-text reflow passed. Twelve viewport screenshots retained.
- lanes/environment/proof-module-8f759c2c-13c9-4d56-94ea-92a60f5743ff.json: eight real EN/FR cached-button cases with active, suspended, expired and read_only grants. Access changes occurred after rendering. Actual response inspection confirmed denied identifiers absent and permitted proof present; synthetic payment remained unchanged.
- Before-fix security reproduction: lanes/environment/proof-module-26e65938-cee9-4942-aa3f-1942c545601d.json. Earlier portal run fa67860a failed reduced-motion specificity; the open-state animation overrode the initial class. Corrected with state-specific reduced-motion variants. Initial unit test loader failure f3c529a3 was an ESM icon import; existing icon mocking resolved it while retaining the real drawer/portal tests.

Exact source, receipt, screenshot and prior proof-state impact bindings are in evidence/proof-portal-review-2026-09-28.json. ProofTrailDrawer uses the existing product aliases in its own portal; all consumers receive an opaque background. BIProofDrawerHost adds an optional locale with unchanged English default. SheetContent adds an optional overlay class with unchanged default behavior. Cash Command passes its existing locale. Four existing proof actions now enforce their owning module read contract; RBAC and server tenant derivation remain unchanged. No evidence-grade semantics, financial records or domain service operations were changed.

## User and operator guidance

Open /en/dashboard/finance/cash-command or /fr/dashboard/finance/cash-command and choose an available proof. On failure close and reopen to retry. Escape returns to the opening button. A current suspended/expired workspace cannot serve proof from an old button. Authorized historical access requires the owning module's supported retained-read state and the subject permission; it does not authorize new work. The organization administrator supplies the role and module configuration through existing controls. No new document, external approval or live activation is required for this code correction.

## Remaining and recovery

Proof portal tokens and its own EN/FR controls are corrected. Server-authored proof reasons/nodes remain English, other proof subjects need actual browser lifecycle evidence, and native screen-reader/browser zoom remain unverified. Source read scoping and finance/payroll/inventory handoffs remain open.

No migration, real payment, external delivery or production deployment occurred. Reverting the module gate would reopen the reproduced disclosure; prefer withholding proof access while diagnosing a regression. Revert only a faulty visual change independently if necessary. Existing audit/read behavior remains enabled. Full rollout and Cash Command closure still require the registered source/handoff/lifecycle work.

## Review responsibilities

Architecture/backend/security: shared portal ownership and current action gate verified. Data/finance/audit: no business mutation, no new assurance or posting claim. Frontend/workflow/localization/accessibility: six real views and explicit limits above. Quality/SRE: isolated environment, serialized checks and failed attempts retained; no production performance claim. Product/SaaS operations: retained read remains distinct from operational entitlement. Statutory/country packs, pricing, providers, offline, agents and migrations: not applicable to these changes; no behavior altered.
