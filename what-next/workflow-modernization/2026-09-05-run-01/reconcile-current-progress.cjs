const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = __dirname;
const file = path.join(root, 'WORKFLOW_REGISTER.json');
const register = JSON.parse(fs.readFileSync(file, 'utf8'));
const ids = new Set(register.workflows.map(w => w.id));
if (ids.size !== register.workflows.length) throw new Error('Duplicate workflow IDs');
const statuses = ['Queued', 'In progress', 'Verification pending', 'Blocked—engineering', 'Blocked—external', 'Complete—verified'];
for (const workflow of register.workflows) {
  // Queue position does not discard existing assessment, implementation or runtime evidence.
  workflow.status = workflow.id === 'AN-DAILY-DIGEST' ? 'In progress' : (statuses.includes(workflow.status) ? workflow.status : 'Queued');
  if (workflow.completeWorkflowVerified && workflow.status !== 'Complete—verified') throw new Error(`Closure/status disagreement: ${workflow.id}`);
  if (workflow.status === 'Complete—verified' && !workflow.completeWorkflowVerified) throw new Error(`Missing closure evidence: ${workflow.id}`);
}
const digest = register.workflows.find(w => w.id === 'AN-DAILY-DIGEST');
digest.implementationStatus = 'digest_expiry_navigation_and_selected_workspace_visibility_corrected';
digest.runtimeStatus = 'owned_en_fr_operating_handoffs_and_126_workspace_views_verified';
digest.remaining = [
  'Seven-day weekly aggregation and selected-period evidence are verified. Audit remaining source rules, generated labels/units and destination localization. Agent adapter/validator handoff and disabled release are verified; enabled governed-run lifecycle still requires genuine release authorization.',
  'Shared permission provenance, close and payment handoffs are verified. Finance/reconciliation and payroll module matrices are verified. Close module, direct-page and read-action boundaries are verified; inventory source/direct item read boundaries are verified; purchasing source/list read admission is verified; core/Weekly grants and analytics destination are verified; Owner/Manager/daily-close page and action grants are verified; Digest authority, keyboard handoff, current revocation, top entry and Back are verified in EN/FR; broader governed-agent lifecycle remains. Compilation overhead and full-document navigation were identified in development; production performance remains unverified. Inventory Loss has its own explicit module guard.',
  'Evidence badge aria rule and Chromium text exposure pass. EN/FR Manager all-mode rendered text contrast and primary focus/hover verified; axe contrast remains incomplete due to pseudo-elements. 126 seven-workspace EN/FR keyboard/reflow/reduced-motion views now pass, including selected-label visibility. Remaining: other workspace-content contrast and text enlargement. Native screen-reader speech/browser zoom are unverified limits.',
];
digest.closureReview = { checklist: 'DAILY_DIGEST_CLOSURE.md', evidence: 'DAILY_DIGEST_SOURCE_TRUTH_VERIFICATION.md', verifiedCriteria: ['overdue-count-date-status-tenant-location-contract', 'source-read-failure-not-zero', 'en-fr-purchasing-keyboard-handoff-and-date-correction', 'current-source-permission-removal', 'risk-source-freshness-isolated-regression', 'en-fr-empty-observation-non-assurance-three-widths', 'source-severity-preserved-with-unassessed-urgency', 'all-composed-source-organizations-validated', 'server-disabled-modes-and-first-enabled-keyboard-activation', 'en-fr-command-action-label-reflow-and-localized-source-impact'], completeWorkflowVerified: false };
if (!digest.evidence.includes('DAILY_DIGEST_SOURCE_TRUTH_VERIFICATION.md')) digest.evidence.push('DAILY_DIGEST_SOURCE_TRUTH_VERIFICATION.md');
digest.closureReview.verifiedCriteria.push('five-persona-en-fr-source-module-handoff-contracts', 'evidence-badge-text-chromium-and-aria-rule');
digest.closureReview.verifiedCriteria.push('stored-permission-provenance-en-fr-grant-revoke-and-api');
digest.closureReview.verifiedCriteria.push('en-fr-close-signal-handoff-back-and-revocation', 'close-reader-controls-fail-closed-and-refresh-retains-notes');
digest.closureReview.verifiedCriteria.push('payment-suspense-currency-scope-null-propagation-and-recovery', 'en-fr-payment-warning-handoff-back-and-revocation');
digest.closureReview.verifiedCriteria.push('en-fr-source-link-back-view-restoration-and-cached-link-current-authority');
digest.closureReview.verifiedCriteria.push('inventory_value_does_not_infer_dead_stock', 'inventory_summary_and_item_handoff_authority_en_fr');
digest.closureReview.verifiedCriteria.push('payroll_source_details_permission_module_and_revocation_before_serialization');
digest.closureReview.verifiedCriteria.push('payroll_destination_all_of_read_permissions_and_owner_finance_audiences', 'en_fr_payroll_evidence_handoff_back_and_cached_link_revocation');
digest.closureReview.verifiedCriteria.push('canonical_source_warnings_localized_in_nested_digest_representations', 'fr_320px_source_code_reflow_keyboard_and_revoked_privacy');
digest.closureReview.verifiedCriteria.push('persisted_payroll_module_read_matrix_en_fr', 'expired_session_en_fr_form_restores_digest_and_mode');
digest.closureReview.verifiedCriteria.push('stale_and_blocked_source_timing_en_fr_refresh', 'controlled_payment_query_failure_rejects_and_retry_retains_blockers');
digest.closureReview.verifiedCriteria.push('en_fr_manager_three_mode_rendered_contrast', 'primary_hover_keyboard_focus_and_clipping');
if (!digest.evidence.includes('DAILY_DIGEST_ACCESSIBILITY_VERIFICATION.md')) digest.evidence.push('DAILY_DIGEST_ACCESSIBILITY_VERIFICATION.md');
digest.closureReview.verifiedCriteria.push('actual_en_fr_app_query_exception_failed_retry_and_source_recovery');
digest.closureReview.verifiedCriteria.push('request_clock_preserves_one_utc_day_across_sources', 'owned_en_fr_overlapping_read_period_and_tenant_isolation');
digest.closureReview.verifiedCriteria.push('inventory_loss_canonical_french_copy_preserves_source_and_causation', 'en_fr_loss_detail_reflow_and_revoked_privacy');
digest.closureReview.verifiedCriteria.push('genuine_weekly_source_window_and_current_balance_semantics', 'en_fr_weekly_period_keyboard_refresh_and_revocation', 'weekly_midnight_overlapping_read_tenant_isolation');
digest.closureReview.verifiedCriteria.push('en_fr_real_digest_agent_projection_validator_and_revocation', 'hydrated_disabled_agent_and_missing_release_no_mutation', 'agent_request_language_and_workspace_revision_state_isolation');
digest.closureReview.verifiedCriteria.push('finance_reconciliation_persisted_read_matrix_en_fr', 'finance_denied_details_suppressed_with_source_limitations_retained', 'en_fr_hydrated_finance_and_command_keyboard_grant_transitions');
digest.closureReview.verifiedCriteria.push('close_assurance_persisted_read_matrix_en_fr', 'close_source_details_restricted_without_clearing_limitations', 'close_direct_pages_and_read_actions_share_current_read_gate');
digest.closureReview.verifiedCriteria.push('inventory_persisted_read_matrix_and_summary_detail_separation_en_fr', 'inventory_direct_page_action_and_retained_read_admission', 'item_query_failure_failed_retry_and_filtered_recovery_en_fr');
digest.closureReview.verifiedCriteria.push('purchasing_persisted_en_fr_read_matrix_and_restricted_manager_summary', 'purchasing_list_read_handoff_retention_and_recommended_dependency', 'purchasing_read_actions_and_route_wrappers_deny_before_domain_queries');
digest.closureReview.verifiedCriteria.push('core_and_weekly_persisted_19_state_read_matrix_en_fr', 'analytics_destination_any_of_permission_and_current_module_gate', 'en_fr_empty_workspace_and_disabled_weekly_handoff_explanations');
digest.closureReview.verifiedCriteria.push('operating_dashboard_pages_current_module_read_gate_en_fr', 'operating_read_actions_enforce_and_retained_admission');
digest.closureReview.verifiedCriteria.push('digest_operating_handoff_authority_persisted_service_matrix_en_fr');
digest.closureReview.verifiedCriteria.push('owner_handoff_denial_en_fr_route_recovery_unit_verified');
digest.closureReview.verifiedCriteria.push('expired_evidence_is_stale_not_a_business_blocker_en_fr', 'owned_en_fr_operating_handoff_authority_and_revocation', 'digest_top_entry_and_back_restore_en_fr', 'owner_denial_french_mobile_rendering');
digest.closureReview.verifiedCriteria.push('seven_workspace_en_fr_three_mode_three_width_keyboard_reflow_motion', 'selected_workspace_label_not_clipped_after_selection', 'digest_read_no_background_business_mutation');
const itemRead = register.workflows.find(w => w.id === 'MD-ITEM-01');
itemRead.runtimeStatus = 'en_fr_inventory_module_read_and_query_recovery_verified_full_localization_incomplete';
itemRead.remaining = itemRead.remaining.filter(value => value !== "Live French Digest handoff shows English item names, page labels and permission-denial copy; source item nameFr exists. Correct locale propagation and full item-page localization. Items page also coerces failed item reads to an empty list; verify and fix failure presentation.");
const itemGap = "Live French item destination still shows English names and page labels; source item nameFr exists. Complete full page localization and broader lifecycle/accessibility checks. Module/permission denial and query-failure/retry copy are localized and runtime verified; failed item reads no longer become successful empty inventory.";
if (!itemRead.remaining.includes(itemGap)) itemRead.remaining.push(itemGap);
if (!itemRead.evidence.includes('DAILY_DIGEST_SOURCE_TRUTH_VERIFICATION.md')) itemRead.evidence.push('DAILY_DIGEST_SOURCE_TRUTH_VERIFICATION.md');
const itemLaneFile = path.join(root, 'lanes/master-data/WORKFLOW_REGISTER.json');
const itemLane = JSON.parse(fs.readFileSync(itemLaneFile, 'utf8'));
const laneItem = itemLane.workflows.find(w => w.id === itemRead.id);
Object.assign(laneItem, { runtimeStatus: itemRead.runtimeStatus, remaining: itemRead.remaining });
if (!laneItem.evidence.includes('../../DAILY_DIGEST_SOURCE_TRUTH_VERIFICATION.md')) laneItem.evidence.push('../../DAILY_DIGEST_SOURCE_TRUTH_VERIFICATION.md');
fs.writeFileSync(itemLaneFile, JSON.stringify(itemLane, null, 2) + '\n');
const laneFile = path.join(root, 'lanes/analytics/WORKFLOW_REGISTER.json');
const lane = JSON.parse(fs.readFileSync(laneFile, 'utf8'));
const laneDigest = lane.workflows.find(w => w.id === digest.id);
Object.assign(laneDigest, { status: digest.status, implementationStatus: digest.implementationStatus, runtimeStatus: digest.runtimeStatus, remaining: digest.remaining, closureReview: digest.closureReview });
if (!laneDigest.evidence.includes('../../DAILY_DIGEST_SOURCE_TRUTH_VERIFICATION.md')) laneDigest.evidence.push('../../DAILY_DIGEST_SOURCE_TRUTH_VERIFICATION.md');
fs.writeFileSync(laneFile, JSON.stringify(lane, null, 2) + '\n');
register.executionPolicy = { version: 'closure-queue-1', primaryWorkflow: 'AN-DAILY-DIGEST', supportingDependency: null, nextPriorities: ['PR-10', 'PR-19', 'ID-05'], closureChecklist: 'DAILY_DIGEST_CLOSURE.md', note: 'Overdue source contract verified; no additional active workflow. Queued includes previously assessed work awaiting resumed closure. Historical detail retained.' };
register.updatedAt = new Date().toISOString();
register.coverage.discoveredWorkflows = register.workflows.length;
register.coverage.completeWorkflowsVerified = register.workflows.filter(w => w.completeWorkflowVerified === true).length;
register.coverage.unmappedEntrySources = register.entrySourceReconciliation.filter(e => !e.matchedWorkflowIds.length).length;
register.coverage.statusCounts = Object.fromEntries(statuses.map(s => [s, register.workflows.filter(w => w.status === s).length]));
fs.writeFileSync(file, JSON.stringify(register, null, 2) + '\n');
const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const unvisited = register.workflows.filter(w => /not[_-](visited|yet|executed)/i.test(w.runtimeStatus || '')).map(w => w.id);
const partial = register.workflows.filter(w => /verified|passed/i.test(w.runtimeStatus || '')).map(w => w.id);
const record = { at: register.updatedAt, registerSha256: hash, coverage: register.coverage, discoveryComplete: register.discoveryComplete, unvisitedIds: unvisited, workflowsWithSomeRuntimeEvidence: partial, note: 'Runtime labels are discovery aids, not closure evidence. Unmapped count recomputed from existing source reconciliation; discovery remains incomplete.' };
fs.writeFileSync(path.join(root, 'evidence/current-reconciliation.json'), JSON.stringify(record, null, 2) + '\n');
const report = `# Current progress

Updated ${register.updatedAt}; source HEAD a05a41ef66cd5d98fd69ae3df18225795f912232 on codex/migration-control-plane-release-2026-08-29, with preserved working-tree changes. Register policy closure-queue-1; exact binding: [reconciliation](evidence/current-reconciliation.json). Source inventory: [v160 baseline](evidence/source-baseline-v160.json); subsequent edits require affected checks.

**Position:** ${register.workflows.length} discovered workflows; discovery incomplete. ${register.coverage.unmappedEntrySources} source entries remain unmapped in the reconciled inventory. ${Object.entries(register.coverage.statusCounts).map(([s,n]) => `${s}: ${n}`).join('; ')}. No verified closures added since v160. ${unvisited.length} workflows explicitly report no visit/execution; ${partial.length} have some recorded runtime evidence, which does not establish closure. Queued includes earlier partial work awaiting resumed completion.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining closure criteria | Blocker / owner | Next action |
|---|---|---|---|---|---|---|
| Primary | AN-DAILY-DIGEST: reliable role-scoped digest and source handoff | In progress | Authority/revocation, top entry and Back verified; expired evidence states corrected | [Full checklist](DAILY_DIGEST_CLOSURE.md): source semantics/localization and accessibility | Engineering | Verify Inventory Loss handoff, then finite source-rule/localization gaps |
| Next 1 | PR-10: independently sign reconciliation run | Queued | Reviewed evidence, current signer, exact retry and certificate download | Additional provider/concurrency boundaries, native accessibility, manager latency | Engineering | Bind existing receipts to exact closure checklist |
| Next 2 | PR-19: prepare reviewed reconciliation run | Queued | Scoped discovery, real preparation and sign-review handoff | Conflicting reviewers/response loss in UI, source allocation/legacy evidence, accessibility | Engineering | Close preparation-to-signing contract |
| Next 3 | ID-05: change password and revoke sessions | Queued | Transactional credentials, current authority, EN/FR recovery | Native screen-reader/zoom/contrast; resolve static scanner gaps against runtime proof | Engineering | Reuse valid lifecycle evidence and finish missing checks |

**Since the previous report:** Expiry semantics and operating handoffs are verified; their full typecheck passed. Visual inspection then exposed a clipped selected-workspace label. Selection now scrolls it fully into view. All 126 EN/FR workspace/mode/width checks pass with keyboard, reflow, reduced motion and unchanged selected business records. Final component tests (17), lint and browser compilation pass; the full typecheck predates this last small UI adjustment. Failed fixture and clipping attempts are retained. Three bounded criteria added; no workflow closed. [Single detailed record](DAILY_DIGEST_ACCESSIBILITY_VERIFICATION.md#seven-workspace-reflow-and-selected-label-recovery--2026-09-19).

**Priority rationale:** finish the active digest closure checklist using current runtime evidence, then return to financially consequential sign-off/preparation. A new severe defect can supersede this order, with the reason recorded. External notification-provider access and approval-register evidence remain separate dependencies owned by the organization's administrator/authorized approver; they do not block local digest implementation.

**Backlog:** all 17 families remain in the [workflow register](WORKFLOW_REGISTER.json), including identity/access, modules/master data, sales/POS/inventory/purchasing, finance/reconciliation/payroll/compliance, analytics/evidence, notifications/integrations and agents. See [unvisited IDs and counts](evidence/current-reconciliation.json). Existing per-workflow remaining lists retain exact known gaps. ETA is not reliable while discovery and closure validation remain incomplete.
`;
if (report.split(/\s+/).length > 700) throw new Error('Progress report exceeds 700 words');
fs.writeFileSync(path.join(root, 'CURRENT_PROGRESS.md'), report);
console.log(JSON.stringify({ ...record, unvisitedIds: unvisited.length, workflowsWithSomeRuntimeEvidence: partial.length }));
