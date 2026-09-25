const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = __dirname, repo = path.resolve(root, '../../..');
const name = 'digest-contrast-4e7576e0-4418-45c3-bf2c-647b7318aa7f.json';
const receipt = JSON.parse(fs.readFileSync(path.join(root, 'lanes/environment', name), 'utf8'));
function update(file, text) { const fd = fs.openSync(file, 'r+'); try { fs.writeFileSync(fd, text); fs.ftruncateSync(fd, Buffer.byteLength(text)); } finally { fs.closeSync(fd); } }
if (!receipt.scanCompleted || !receipt.sourceStable || !receipt.noFinancialEffects) throw new Error('Incomplete receipt');
for (const [file, hash] of Object.entries(receipt.sourceAfter)) {
  if (crypto.createHash('sha256').update(fs.readFileSync(path.join(repo, file))).digest('hex') !== hash) throw new Error('Changed binding: ' + file);
}
const measurements = receipt.browser.flatMap(b => b.scans.flatMap(s => s.renderedContrast));
if (measurements.some(m => !m.measured || !m.passes)) throw new Error('Incomplete rendered contrast');
const summary = { at: new Date().toISOString(), receipt: name, sourceHashes: receipt.sourceAfter, before: 'digest-contrast-a595f8aa-1b2e-41d3-8fa5-38c3e92f29c8.json', scans: receipt.browser.map(b => ({ locale: b.locale, scans: b.scans.map(s => ({ mode: s.mode, measured: s.renderedContrast.length, minimum: Math.min(...s.renderedContrast.map(m => m.minimumRatio)), axeViolations: s.violations.length, axeIncomplete: s.incomplete.map(i => i.id), reflow: s.reflow })), primaryStates: b.primaryStates, screenshot: b.screenshot })), checks: { focusedTests: '21 passed, 2 suites (e248d8)', lintAndDiff: 'passed (4d78ef)', typecheck: 'passed (eb15d7), preceding final class-only focus-spacing change', browser: 'passed (4276e9)' }, completeWorkflowVerified: false };
fs.writeFileSync(path.join(root, 'evidence/digest-contrast-final.json'), JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
const detail = `# Daily Digest contrast and focus verification — 2026-09-19

Scope: AN-DAILY-DIGEST, existing authenticated EN/FR Manager view. Branch codex/migration-control-plane-release-2026-08-29, HEAD a05a41ef66cd5d98fd69ae3df18225795f912232 with unrelated working-tree changes preserved. Exact source SHA-256 values and checks are in [the final binding](evidence/digest-contrast-final.json). This is a bounded accessibility correction, not workflow completion or accessibility certification.

## Finding and correction

The existing primary brand gradient put white compact text on backgrounds as light as RGB 83/148/254. [Corrected baseline measurement](lanes/environment/digest-contrast-a595f8aa-1b2e-41d3-8fa5-38c3e92f29c8.json) found Manager/Responsable at 3.08–3.12:1 and the source action at 2.99–3.02:1, below the 4.5:1 threshold reported by the installed axe rule. Both failures occurred across all three modes in EN 1440px and FR 320px.

DailyHabitDigestDashboard now imports a small scoped CSS module. Its primary controls derive both gradient endpoints from existing dash-brand tokens at 74% mixed with black; hover uses 68%. White text, semantic brand selection, existing button components and all state labels remain. A two-pixel dash-text focus outline with a three-pixel offset provides a clear keyboard indicator. Six pixels of internal space in the horizontally scrollable workspace selector accommodates the outline. The shared global primary style and other BI consumers are unchanged. No production dependency, service, database, permission, source record or business action changes were required.

## Runtime and measurement method

[Final actual application receipt](lanes/environment/${name}) uses the owned local database stoquify_local_registration_20260906_01 and http://127.0.0.1:3110. A unique synthetic organization, manager credential, supplier, location and submitted overdue purchase order are created after database ownership verification. Normal local sign-in is used; browser traffic is fenced to the exact local origin. No external messages or migrations run.

Brief, Command and Investigate are selected by keyboard Enter in each language. Six scoped axe scans of dashboard-landing-content report zero violations and one incomplete rule group: color-contrast. Decorative theme pseudo-elements prevent axe from resolving the background. This result is retained as incomplete, not relabeled a pass.

The separate rendered-background helper supplements that incomplete result: it collects visible text ranges, temporarily removes glyph paint and text shadows, screenshots the real gradients/transparency/pseudo-elements, restores the page, and computes luminance contrast against each range's actual foreground. It excludes clipped screen-reader-only labels from visual ranges and hides only the development nextjs-portal overlay during this measurement. It does not alter production styles or retained user-view screenshots. Unsupported opacity/filter and disabled controls are explicitly unmeasured; none of the ${measurements.length} incomplete text-node measurements in this final fixture remained unmeasured. Each met its rule threshold. This is focused browser evidence, not a replacement for comprehensive manual accessibility review.

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
`;
fs.writeFileSync(path.join(root, 'DAILY_DIGEST_ACCESSIBILITY_VERIFICATION.md'), detail, { flag: 'wx' });
const checklist = path.join(root, 'DAILY_DIGEST_CLOSURE.md');
update(checklist, fs.readFileSync(checklist, 'utf8').replace('Color-contrast remains incomplete. Native zoom, screen reader, manual contrast and full reduced-motion proof remain.', 'Manager EN 1440px / FR 320px all-mode rendered text contrast, primary hover/focus and unclipped keyboard outlines now pass scoped measurements; axe contrast remains incomplete because of pseudo-elements. [Evidence and method](DAILY_DIGEST_ACCESSIBILITY_VERIFICATION.md). Native zoom, screen reader, other persona contrast and full reduced-motion proof remain.'));
const updaterFile = path.join(root, 'reconcile-current-progress.cjs');
let updater = fs.readFileSync(updaterFile, 'utf8');
updater = updater.replace("'stale_source_timing_visible_without_clearing_blockers'", "'digest_scoped_primary_contrast_and_unclipped_focus_corrected'");
updater = updater.replace("'owned_en_fr_stale_source_refresh_and_controlled_payment_failure_verified'", "'owned_en_fr_three_mode_rendered_contrast_and_primary_keyboard_hover_verified'");
updater = updater.replace('Axe command-view color-contrast remains incomplete.', 'EN/FR Manager all-mode rendered text contrast and primary focus/hover verified; axe contrast remains incomplete due to pseudo-elements. Other persona contrast remains.');
updater = updater.replace('const itemRead =', "digest.closureReview.verifiedCriteria.push('en_fr_manager_three_mode_rendered_contrast', 'primary_hover_keyboard_focus_and_clipping');\nif (!digest.evidence.includes('DAILY_DIGEST_ACCESSIBILITY_VERIFICATION.md')) digest.evidence.push('DAILY_DIGEST_ACCESSIBILITY_VERIFICATION.md');\nconst itemRead =");
updater = updater.replace('Stale source timing and retained blockers verified in EN/FR; payment-query rejection/retry preserves null semantics', 'EN/FR three-mode text contrast; primary hover, keyboard focus and clipping verified');
updater = updater.replace('Verify remaining source-failure, stale-read and access cases', 'Close remaining source-failure and accessibility cases');
const start = updater.indexOf('**Since the previous report:**'), end = updater.indexOf('**Priority rationale:**', start);
if (start < 0 || end < start) throw new Error('Progress anchors');
updater = updater.slice(0, start) + '**Since the previous report:** corrected two primary controls whose white labels measured about 3:1 against the blue gradient. Scoped brand shading now exceeds 5:1 in normal/focused states, with visible unclipped focus outlines. Actual EN 1440px and FR 320px checks cover all three modes, hover and keyboard focus; six axe scans have no violations but contrast remains formally incomplete. The supplementary rendered-background method and its limitations are [documented once](DAILY_DIGEST_ACCESSIBILITY_VERIFICATION.md). Two bounded criteria added; no full workflow closed. Existing focused tests: 21 passed; lint and typecheck passed. A hover-measurement error was corrected and its failed attempt retained. Other source failures, module cases, dynamic localization, native screen-reader/zoom and reduced-motion checks remain.\n\n' + updater.slice(end);
update(updaterFile, updater);
const matrix = path.join(repo, 'docs/UI/UX/AQSTOQFLOW_UI_ROUTE_MATURITY_MATRIX_2026-06-26.md');
update(matrix, fs.readFileSync(matrix, 'utf8') + '\n## Daily Digest scoped review — 2026-09-19\n\n`/en/dashboard/daily-digest` and `/fr/dashboard/daily-digest`: **partial**. Manager views have current EN desktop / FR 320px rendered contrast, hover and unclipped keyboard-focus evidence. Native screen-reader/zoom and other persona/theme coverage remain. See the [single detailed review](../../../what-next/workflow-modernization/2026-09-05-run-01/DAILY_DIGEST_ACCESSIBILITY_VERIFICATION.md). No route certification or unrelated maturity upgrade is implied.\n');
const review = path.join(repo, 'docs/UI/UX/AQSTOQFLOW_UI_REVIEW_CHECKLIST_2026-06-26.md');
update(review, fs.readFileSync(review, 'utf8') + '\n## Contrast and focus evidence note — 2026-09-19\n\nKeep automated contrast `incomplete` separate from a pass when themed pseudo-elements prevent analysis. Record any supplementary rendered-background method, exclusions and remaining manual checks. Check focus outlines against scrolling/clipping ancestors, not only computed outline styles. [Daily Digest example](../../../what-next/workflow-modernization/2026-09-05-run-01/DAILY_DIGEST_ACCESSIBILITY_VERIFICATION.md).\n');
fs.writeFileSync(path.join(repo, 'what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_09_GOVERNANCE_REPORT_2026-09-19.md'), '# Phase 09 scoped governance — 2026-09-19\n\nApplied the accessibility/visual-regression skill to the active AN-DAILY-DIGEST workflow. The [detailed correction, measurements, screenshots, limitations and rollback](../workflow-modernization/2026-09-05-run-01/DAILY_DIGEST_ACCESSIBILITY_VERIFICATION.md) are recorded once. The route maturity matrix and review checklist now link to this evidence. Scope is two primary controls in the existing authenticated Digest; the skill’s whole-platform acceptance criteria remain incomplete.\n', { flag: 'wx' });
console.log(JSON.stringify({ receipt: name, measuredTextInstances: measurements.length, sourceBindings: Object.keys(receipt.sourceAfter).length, completeWorkflowVerified: false }));
