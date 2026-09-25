# Daily Digest contrast and focus verification — 2026-09-19

Scope: AN-DAILY-DIGEST, existing authenticated EN/FR Manager view. Branch codex/migration-control-plane-release-2026-08-29, HEAD a05a41ef66cd5d98fd69ae3df18225795f912232 with unrelated working-tree changes preserved. Exact source SHA-256 values and checks are in [the final binding](evidence/digest-contrast-final.json). This is a bounded accessibility correction, not workflow completion or accessibility certification.

## Finding and correction

The existing primary brand gradient put white compact text on backgrounds as light as RGB 83/148/254. [Corrected baseline measurement](lanes/environment/digest-contrast-a595f8aa-1b2e-41d3-8fa5-38c3e92f29c8.json) found Manager/Responsable at 3.08–3.12:1 and the source action at 2.99–3.02:1, below the 4.5:1 threshold reported by the installed axe rule. Both failures occurred across all three modes in EN 1440px and FR 320px.

DailyHabitDigestDashboard now imports a small scoped CSS module. Its primary controls derive both gradient endpoints from existing dash-brand tokens at 74% mixed with black; hover uses 68%. White text, semantic brand selection, existing button components and all state labels remain. A two-pixel dash-text focus outline with a three-pixel offset provides a clear keyboard indicator. Six pixels of internal space in the horizontally scrollable workspace selector accommodates the outline. The shared global primary style and other BI consumers are unchanged. No production dependency, service, database, permission, source record or business action changes were required.

## Runtime and measurement method

[Final actual application receipt](lanes/environment/digest-contrast-4e7576e0-4418-45c3-bf2c-647b7318aa7f.json) uses the owned local database stoquify_local_registration_20260906_01 and http://127.0.0.1:3110. A unique synthetic organization, manager credential, supplier, location and submitted overdue purchase order are created after database ownership verification. Normal local sign-in is used; browser traffic is fenced to the exact local origin. No external messages or migrations run.

Brief, Command and Investigate are selected by keyboard Enter in each language. Six scoped axe scans of dashboard-landing-content report zero violations and one incomplete rule group: color-contrast. Decorative theme pseudo-elements prevent axe from resolving the background. This result is retained as incomplete, not relabeled a pass.

The separate rendered-background helper supplements that incomplete result: it collects visible text ranges, temporarily removes glyph paint and text shadows, screenshots the real gradients/transparency/pseudo-elements, restores the page, and computes luminance contrast against each range's actual foreground. It excludes clipped screen-reader-only labels from visual ranges and hides only the development nextjs-portal overlay during this measurement. It does not alter production styles or retained user-view screenshots. Unsupported opacity/filter and disabled controls are explicitly unmeasured; none of the 448 incomplete text-node measurements in this final fixture remained unmeasured. Each met its rule threshold. This is focused browser evidence, not a replacement for comprehensive manual accessibility review.

Normal and keyboard-focus labels on the corrected controls exceed 5:1; hover exceeds 5.7:1. Each control is reached with a real Tab step after Shift+Tab, has focus-visible, and the outline's bounds fit every clipping ancestor. Hover presence is asserted during sampling. All six views have no page-level horizontal overflow. Zero pageerror events and unchanged journal, payment and business-event counts were observed. Source hashes were stable across the run. Synthetic setup writes are intentional; no assertion is made that all database records were immutable.

Screenshots in the receipt include full-page EN/FR Investigate views and viewport captures of both focused controls. The French focus captures were visually inspected: the workspace outline is fully visible and the long source action wraps within the button. The desktop full view also shows the source action's outline. Retained screenshots include a Next.js development issue indicator; no claim is made that all console or build diagnostics are absent.

## Checks and retained failed attempts

- Focused existing Digest dashboard and shared BI component tests: 21 passed in two suites, e248d8. CSS import is exercised by this run.
- Full repository typecheck: passed, eb15d7. The final subsequent source edit adds only static focus-spacing classes; browser compilation and final lint cover it.
- Final changed-file ESLint and scoped git diff --check: passed, 4d78ef.
- Final browser assertions: passed, 4276e9. No migration-bearing default build was invoked.
- Initial sandbox browser run c97dab/84662e could not save its evidence due to EPERM; its English scan output alone is not a completed receipt. Approved execution then retained the corrected baseline.
- Earlier raw measurement 97969e3c included artifacts from a clipped evidence label and the development overlay. The corrected baseline above excludes these artifacts; their initial apparent failures were not fixed in production because they were measurement errors.
- Post-style attempt cfa60ae5 failed its French source-action hover assertion because the helper scrolled to the page top after hovering. The helper now preserves scroll position and samples full-page coordinates. Receipt 63b8cda1 passed after that correction; final 4e7576e0 additionally verifies focus clipping and the spacing correction.

## User guidance, rollout and recovery

Open /en/dashboard/daily-digest or /fr/dashboard/daily-digest. Tab to the workspace selector or the primary source action; the bright outline indicates keyboard focus. Enter activates the current button/link through its existing behavior. Blue selection remains selection, not approval or health. Existing source permissions and read-only controls still apply.

No migration or configuration input is required. Review the final screenshots and ship through the existing application release process. To recover from a styling regression, revert only the scoped CSS import/module, root class and selector focus spacing; keep the existing data, authorization and localization fixes. Do not weaken source blockers to obtain a visually successful state.

Review responsibilities: frontend/design-system/accessibility owns token derivation, contrast and focus; quality/SRE owns source bindings, instrumentation limits and runtime checks; architecture/backend/security/finance/audit confirm the patch has no service, authority or monetary change. New statutory rules, country packs, POS/offline, payroll processing, APIs/events, AI execution and commercial packaging are not applicable to this styling correction. Native screen-reader output, actual browser zoom, full reduced-motion behavior, other personas and other themed routes remain unverified here. The full [Digest closure checklist](DAILY_DIGEST_CLOSURE.md) remains partial.


## Seven-workspace reflow and selected-label recovery — 2026-09-19

A new actual application matrix covers all seven Digest workspaces, three modes, EN/FR and widths 1440/768/320: **126 views passed**. It verifies keyboard activation and pressed state, visible keyboard focus, named visible controls, nonempty mode content, no page-level horizontal overflow, and no spatial/repetitive animation with reduced motion. Color/opacity transitions remain permitted and are recorded. This is a synthetic user with administrator and separately assigned Manager audiences; it does not replace the existing denied-persona matrices.

The first fixture omitted the Manager audience; its correctly hidden selector stopped the attempt after three views. The corrected baseline passed 126 layout checks, but visual inspection of the French narrow screenshot revealed a clipped selected-workspace label. A targeted assertion then reproduced Finance extending to x=355.27 beyond its selector edge x=297. Selection now scrolls the chosen button into the nearest visible position instantly, preserving the current URL, role, mode and authority behavior. Final verification includes unclipped selected-button bounds across every view. Browser geometry establishes the correction; the jsdom tests only stub the unsupported scrolling API.

[Final source-bound runtime receipt](lanes/environment/digest-reflow-982478dc-5b69-43f1-8ad2-b48ba6cf1a75.json); [index with exact failures and check references](evidence/digest-reflow-final.json). The final French narrow screenshot was visually inspected. The populated synthetic purchase order remains unchanged; payment, journal and business-event counts remain unchanged. Authentication/setup and access-audit writes are intentional. No migration, external transmission, production activation or deployment.

The two component suites pass **17 tests** (ebd861), changed-file lint and diff pass (0fb5c4). The existing full typecheck passed earlier with stable hashes (c4088e); it predates the final two-line selection-scroll adjustment and its jsdom API stub. Those final edits have browser compilation, focused regression and lint evidence; no later whole-repository typecheck pass is claimed. Installed TypeScript explicitly supports instant scrolling (a8ceda).

**Use:** open /en/dashboard/daily-digest or /fr/dashboard/daily-digest, choose an available workspace with keyboard or pointer, and switch modes. The selected label remains visible within the horizontal selector. No new user input or approval is needed. Recovery can remove only the selection scroll call if it causes a navigation regression, retaining all data, access and prior source-navigation fixes.

**Limits:** 320 CSS-pixel layout evidence does not establish native browser zoom or screen-reader speech. Manager contrast/focus evidence is retained; contrast measurements for other workspace content, text enlargement, the Inventory Loss destination handoff and the remaining finite source-rule/localization audit remain open. The disabled governed-agent boundary stays verified; its enabled execution belongs to the already registered AI-COMMAND workflow and requires its genuine authorization. No requirement is removed from the platform-wide register. No workflow closure or accessibility certification is claimed.

Frontend/accessibility review owns selection visibility, reflow, named controls and motion; quality/SRE owns geometry, cold login (58.752 seconds, bc820c), preserved failed attempts and stable source bindings. Backend/security/finance review records no service, permission or business mutation change. New statutory, country-pack, billing, provider and offline behavior is not applicable.

After verification, only the owned server process tree was stopped (8caa96); generated types and synthetic records were retained. The one-page progress report is 451 words (067fef). The next implementation step is the Inventory Loss action handoff and current-authority recovery check.
