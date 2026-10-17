# Cash Command rendered contrast and local latency baseline

FA-CASH-COMMAND remains in progress. Branch: `codex/migration-control-plane-release-2026-08-29`; HEAD: `62a56036a5ac9b37236a20c9b148052199069479`; existing working-tree changes retained. This milestone addresses the existing text-contrast requirement and establishes a local loading baseline. It does not close the financial workflow or establish production readiness.

## Reproduced defect and correction

The automated scan could not resolve themed backgrounds. Supplementary measurement found four low-contrast labels per language: the enabled primary action (minimum 3.24–3.27:1) and section numbers (3.46–3.82:1). The small-text comparison was 4.5:1. The numbers are decorative for assistive technology, but remain visible reading aids.

Cash now uses existing `--product-brand-action` and `--product-brand-action-hover` tokens for its primary action and `--dash-text-soft` for section numbers. A scoped CSS module keeps the correction within the current workflow. No new palette, component system, permissions, financial logic or schema was introduced. The only component change imports/applies this scope; layout and interaction markup remain identical. Shared gradient behavior on other surfaces remains subject to their workflow reviews. Daily Digest already has its own verified scoped treatment.

## Verification method and limits

The authoritative index is `evidence/cash-contrast-review-2026-09-30.json`, including exact source/receipt hashes and command results. The browser runs the real owned local application and synthetic authorized actor. For EN desktop and FR mobile, axe supplies unresolved contrast nodes; a supplementary helper hides glyph paint without changing geometry, captures the rendered background, and compares computed foreground colors against background pixels within text rectangles. Clipped text is brought into view before retry. Unsupported compositing, disabled controls and unmeasured text remain explicit rather than silently passing.

The corrected run also samples primary-action hover and keyboard focus. Coverage is the current authorized synthetic content in the existing theme, not every possible state, provider record or route. Native screen-reader speech, browser zoom, non-text focus/graphic contrast and the shared denied-state landmark remain open. Earlier normal/doubled-text geometry and keyboard evidence remains relevant through an exact review of this color-only component/CSS delta; no geometry or behavior changed. No broad accessibility certification is claimed.

The final run measured all 305 unresolved text nodes in each language, with no failures or unmeasured nodes. The lowest sampled text ratio was 4.80:1; the primary action measured 5.17:1 normally/with keyboard focus and 6.70:1 on hover. The complete retained scan also reported no automated violations in its scoped rule set.

Journal/payment counts and payroll-balance records are checked for unexpected effects. Focused Cash component tests, changed-file lint, TypeScript and actual CSS compilation/rendering provide proportionate regression evidence. The prior failing contrast receipt is retained.

## Latency findings and next action

Three direct service calls returned the actual authorized nine-card read model. Baseline times were approximately 1.03s initially and 0.39–0.44s on repetition. Six full navigations (three per locale) reached Cash content in 4.92–6.96s and enabled command-mode controls in 6.87–8.65s. No page errors were recorded. These measurements include local development rendering and browser loading; service calls run separately through the guarded test harness. Their difference does not isolate a particular server span or prove that a database query cannot be slow inside Next.js.

The same observations are repeated after the color correction; raw results are retained. First navigations reached content at 8.90s (EN) and 14.09s (FR), while repeats took 4.61–5.89s; repeat interactivity took 6.60–7.36s. The change is not a performance optimization, so timing differences are not claimed as an improvement or attributed to a specific cause. The local fixture is small and synthetic. No production percentile, SLA, approved budget or release decision is inferred. The inspected X1 artifacts concern other finance/table routes and describe pending human approval; they do not establish an approved Cash Command budget.

Next engineering step: profile the actual Next request across session/RBAC resolution, module navigation, Cash source reads, response streaming, asset loading and hydration before choosing a latency correction. The current layout source verifies those shell dependencies. Keep genuine source failures distinct from empty results, and retain the already verified authority-denial handling. Do not remove guards or cache cross-tenant results to chase a timing target.

## Review and operating guidance

Frontend/design/accessibility: use existing readable action/text tokens while preserving hierarchy, focus and responsive geometry. Architecture/backend/security: no admission or service implementation changed. QA/SRE: distinguish a measured local baseline from production performance and retain failed evidence. Finance/data/audit: no money or business-state mutation was requested; source/history and financial invariants remain in force. Product/operations: the user gets more readable navigation/action labels; review `/en/dashboard/finance/cash-command` and `/fr/dashboard/finance/cash-command` with existing authorized roles.

Database migration, statutory rules, providers, billing and AI: not applicable to this color correction. Their existing workflow requirements remain intact, including authentic country-pack review. No production deployment, external message, real payment or migration occurred. Ordinary release review applies. If rollback is necessary, remove only this import/root class and stylesheet, preserving earlier work and recording the return of the contrast defect; no data rollback is needed.
