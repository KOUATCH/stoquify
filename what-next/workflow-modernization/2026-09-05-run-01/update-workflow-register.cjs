const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'evidence/source-baseline-v160.json'), 'utf8'));
const identitySource = 'services/users/user-identity.service.ts';
const authRoot = 'app/[locale]/(auth)';
const identity = [
  ['ID-01', 'Register an organization owner', 'createOrganizationOwner', `${authRoot}/register/page.tsx`, 'Create scoped organization, administrator credentials and an unverified account; request verification delivery.', ['Validate and rate-limit', 'Create organization/role/user/credential transaction', 'Request email verification'], ['Provider rejection handling corrected; actual delivery, durable recovery and full onboarding visit remain unverified.']],
  ['ID-02', 'Guided registration and onboarding', 'registerOrganizationAccount', `${authRoot}/register-v2/page.tsx`, 'Record business setup intent, location and owner identity without fabricating operational readiness.', ['Validate and rate-limit', 'Create setup and identity records', 'Send verification', 'Return onboarding context'], ['Full EN/FR business-data setup and downstream activation remain unvisited.']],
  ['ID-03', 'Invite a workspace user', 'sendInviteWorkflow', 'app/[locale]/(dashboard)/dashboard/settings/users/page.tsx', 'Invite a recipient to an explicitly permitted same-tenant role.', ['Check role-grant authority', 'Check duplicate pending invitation', 'Persist token', 'Send email', 'Audit'], ['Provider effect is currently inside the database transaction; ambiguous delivery and retry need durable handling.', 'Real delivery is not authorized for local verification.']],
  ['ID-04', 'Redeem an invitation', 'acceptInvitationWorkflow', `${authRoot}/user-invite/[organisationId]/page.tsx`, 'Create the invited identity and credential with current invitation authority.', ['Validate pending token and expiry', 'Validate role tenant', 'Hash compliant password', 'Create credential and mark invitation accepted'], ['Current role grant/organization status, expiry during hashing and concurrent redemption require further review.']],
  ['ID-05', 'Change a password', 'changeUserPasswordWorkflow', 'actions/users/updateUserPassword.ts', 'Change authorized credentials and revoke sessions.', ['Resolve scoped user', 'Verify old password for self change', 'Apply policy', 'Synchronize credentials and revoke sessions', 'Audit'], ['Real session revocation and concurrent password updates remain unverified.']],
  ['ID-06', 'Request password reset', 'requestPasswordResetLinkWorkflow', `${authRoot}/forgot-password/page.tsx`, 'Issue an expiring reset link while preserving account-existence privacy.', ['Rate-limit', 'Generic response for unknown user', 'Store cryptographically random token', 'Request email delivery', 'Audit request'], ['Secure generation and provider rejection handling corrected with isolated tests; real recipient recovery and durable delivery remain unverified.']],
  ['ID-07', 'Complete password reset', 'completePasswordResetWorkflow', `${authRoot}/reset-password/page.tsx`, 'Consume one current token and update credentials atomically with session revocation.', ['Rate-limit and validate reset-token format', 'Check password policy', 'Conditionally consume current token in transaction', 'Synchronize credentials/revoke sessions', 'Audit actual completion'], ['Real PostgreSQL concurrency, expiry/replacement and rollback checks passed; full public EN/FR reset recovery remains unvisited.']],
  ['ID-08', 'Verify email ownership', 'verifyEmailOtpWorkflow', `${authRoot}/verify/[userId]/page.tsx`, 'Verify a current unexpired code once with honest and limited resend recovery.', ['Rate-limit and require six-digit OTP', 'Resolve user and compare code and expiry', 'Conditionally set email verification and consume current code', 'Audit actual verification', 'Request resend against matching pending identity; preserve active reset link and conditionally rotate expired OTP'], ['Resend/expiry/single-use/format checks and EN/FR component recovery tests pass; real browser proof is in progress and provider delivery is unverified.', 'Legacy exported form now delegates to the real v2 workflow; it has no current production route caller.']],
].map(([id, name, symbol, entry, purpose, transitions, remaining]) => ({
  id, name, purpose, domain: 'identity', personas: ['Prospective owner, invited user or account holder; administrator where action requires it'], authority: 'Public abuse controls and token authority; authenticated actor/role checks for management actions. Per-branch runtime proof pending.', entryPoints: [entry], services: [`${identitySource}#${symbol}`], records: ['User', 'Account', 'Session', 'PasswordHistory', 'Invite or Organization where applicable', 'Security audit'], transitions, sideEffects: ['Credential/session changes and mail where specified by transition; no real mail sent in verification'], implementationStatus: id === 'ID-07' ? 'corrected_pending_runtime' : 'existing_with_open_review', reviewStatus: 'partially_reviewed', runtimeStatus: 'not_visited', completeWorkflowVerified: false, evidence: ['evidence/source-baseline-v2.json', ...(id === 'ID-07' ? ['evidence/identity-reset-before-receipt.json', 'evidence/identity-reset-after.json'] : [])], remaining,
}));
const workflows = [...identity], laneInputs = [];
for (const workflow of identity) {
  if (['ID-01', 'ID-02'].includes(workflow.id)) {
    workflow.services = [`${identitySource}#registerOrganizationAccount`, 'services/users/registration-input.ts', ...(workflow.id === 'ID-01' ? [`${identitySource}#createOrganizationOwner`] : [])];
    workflow.entryPoints.push('actions/auth.ts#registerUser', 'hooks/useRegisterWorkflow.ts', workflow.id === 'ID-01' ? 'components/auth/BeautifulRegisterForm.tsx' : 'components/auth/v2/RegisterV2Form.tsx');
    if (workflow.id === 'ID-01') workflow.entryPoints.push('actions/users/createUser.ts');
    workflow.implementationStatus = 'bounded_atomic_creation_audit_explicit_selection_review_fence_and_en_fr_recovery_corrected';
    workflow.reviewStatus = 'current_source_and_owned_runtime_review';
    workflow.runtimeStatus = 'partial_real_postgres_and_en_fr_browser_verified';
    workflow.transitions = ['Validate bounded identity and strict guided consent/confirmation', 'Apply real abuse and password policy', 'Review intent without submitting from Continue', 'Create scoped owner, credential, history, optional first branch, referral conversion and mandatory audit atomically', 'Preserve an explicit empty capability selection without operational approval claims', 'Attempt existing email delivery; return only an unverified verification handoff', 'Keep drafts after uncertainty and show actual server retry interval'];
    workflow.evidence.push('evidence/source-baseline-v21.json', 'lanes/environment/REGISTRATION.md', 'evidence/registration-receipt.json');
    workflow.evidence.push('evidence/source-baseline-v23.json', 'evidence/registration-completion-receipt.json', 'lanes/environment/REGISTRATION_COMPLETION.md');
    workflow.implementationStatus = 'atomic_creation_explicit_review_submission_and_owned_current_browser_completion_verified_onboarding_open';
    workflow.evidence.push('evidence/role-catalogue-and-registration-receipt.json', 'lanes/environment/registration-standard-fr-fbb37a5a-a97.json');
    workflow.remaining = ['Guided and standard EN/FR creation have now passed, including French standard after its unchanged ordinary IP cooldown. Full downstream onboarding remains unverified.', 'Live email delivery, durable delivery recovery and accountant-mandate activation remain separate unverified workflows.', 'Native zoom, actual screen reader and comprehensive contrast remain open. EnhancedRegisterForm has no current route caller; retain its legacy exported surface separately.', 'All created owners remain unverified; no statutory, subscription, release or X1 readiness is asserted. No counter reset, clock change or client identity workaround was used.'];
  }
  if (workflow.id === 'ID-03') {
    workflow.entryPoints.push('actions/users/sendInvite.ts', 'actions/users/getOrgInvites.ts', 'actions/security/step-up-auth.actions.ts', 'components/Forms/users/userInvitationForm.tsx', 'components/dashboard/Tables/Invites.tsx');
    workflow.services.push(`${identitySource}#listOrganizationInvites`, 'services/users/invitation-input.ts', 'services/security/step-up-auth.service.ts', 'services/users/user-invitation-options.service.ts');
    workflow.authority = 'Current server identity/organization, invitation and role-assignment permissions, explicit role-grant ceiling and separate password assurance. Read requires users.read or users.invite.';
    workflow.implementationStatus = 'bounded_input_honest_register_and_en_fr_step_up_recovery_corrected_delivery_open';
    workflow.runtimeStatus = 'partial_real_postgres_and_en_fr_browser_verified';
    workflow.evidence.push('lanes/environment/INVITATION_REGISTER_AND_ISSUANCE.md', 'evidence/invitation-register-receipt.json', 'evidence/invitation-register-step-up-03.json', 'lanes/environment/invitation-register-browser-8428c4a8-011.json');
    workflow.transitions = ['Read scoped token-free register with effective expiry and checked time', 'Enter bounded email and role or receive unavailable-role guidance', 'Submit through current permissions and fresh assurance', 'Confirm own password through the existing step-up action when needed', 'Explicitly resubmit; role grant authority is still mandatory', 'Retain draft and distinguish uncertain/provider-accepted/recipient-accepted outcomes', 'Refresh register with visible failure and preserved search'];
    workflow.remaining = ['Provider effect remains inside the invitation transaction; atomic audit/outbox intent, unknown outcomes, safe replay/reissue and current issuer provenance still need implementation.', 'Successful issuance/provider delivery and complete admin lifecycle remain unverified; no real email was sent.', 'Directory-wide EN/FR, native zoom, actual screen reader and comprehensive contrast remain open.'];
    workflow.evidence.push('lanes/environment/INVITATION_ROLE_OPTIONS.md', 'evidence/invitation-options-receipt.json');
    workflow.implementationStatus = 'service_owned_grantable_options_bounded_input_honest_register_and_en_fr_step_up_corrected_delivery_open';
    workflow.services.push('services/users/user-invitation-issuance.service.ts', 'services/users/user-invitation-authority.service.ts', 'services/users/user-invitation-delivery-contract.ts', 'services/communication/user-invitation-delivery-worker.service.ts');
    workflow.records.push('BusinessEvent', 'BusinessEventOutbox', 'BusinessEventAudit');
    workflow.transitions.push('Revalidate stored issuer and role ceiling in a serializable transaction', 'Persist invitation, immutable issuance event, queue and mandatory audit atomically', 'Replay the same client request without rotating credentials', 'Keep external delivery disabled; isolated adapter verifies fenced retries and review holds');
    workflow.remaining = ['Automatic approval review rejected the proposed live Resend adapter; production transport is absent and the default worker is disabled.', 'Redemption must enforce issuance permission revisions; legacy pending invitations need an explicit provenance/reissue transition.', 'Administrative cancel/reissue, delivery history and operator review/recovery UI remain open.', 'Directory-wide EN/FR, native zoom, actual screen reader and comprehensive contrast remain open. No complete workflow or release certification.'];
    workflow.evidence.push('lanes/environment/INVITATION_QUEUE_AND_RECOVERY.md', 'evidence/invitation-queue-receipt.json');
    workflow.implementationStatus = 'atomic_issuance_and_idempotent_queue_verified_transport_disabled_redemption_provenance_open';
    workflow.entryPoints.push('actions/users/cancelInvite.ts');
    workflow.services.push('services/users/user-invitation-management.service.ts', 'services/users/invitation-revision.ts');
    workflow.transitions.push('Open a revision-bound cancellation or replacement review', 'Require reason, fresh authentication and authority over the existing and new role', 'Commit new decision and audit while retaining prior delivery history', 'Reject conflicting reviews and refresh before another action');
    workflow.evidence.push('lanes/environment/INVITATION_CANCELLATION_AND_REISSUE.md', 'evidence/invitation-management-receipt.json');
    workflow.remaining = ['Production email adapter remains absent after automatic approval rejection; the implementation-only approval question has been asked asynchronously and no answer assumed.', 'Redemption must enforce issuance permission revisions and current issuer authority; legacy pending records now have an explicit replacement path but evidence-required redemption is not yet implemented.', 'Delivery/decision history and operator review UI remain open.', 'Directory-wide EN/FR, native zoom, actual screen reader, comprehensive contrast and full build/release assurance remain open.'];
    workflow.implementationStatus = 'atomic_queue_revision_bound_cancellation_reissue_verified_redemption_provenance_and_transport_open';
    workflow.services.push('services/users/user-invitation-redemption-authority.service.ts');
    workflow.evidence.push('lanes/environment/INVITATION_REDEMPTION_AUTHORITY.md', 'evidence/invitation-provenance-receipt.json');
    workflow.remaining = ['Production email adapter remains absent after automatic approval rejection; the implementation-only approval question has already been asked and no answer assumed.', 'Delivery/decision history and operator review UI remain open.', 'Directory-wide EN/FR, native zoom, actual screen reader, comprehensive contrast and full build/release assurance remain open.'];
    workflow.implementationStatus = 'atomic_queue_revision_bound_management_and_redemption_authority_verified_transport_and_operator_history_open';
  }
  if (workflow.id === 'ID-04') {
    workflow.entryPoints.push('actions/users/createInvitedUser.ts', 'components/Forms/InvitedUserRegistration.tsx');
    workflow.services.push(`${identitySource}#getInviteRegistrationContext`);
    workflow.implementationStatus = 'current_invitation_claim_atomic_credentials_audit_and_en_fr_recovery_corrected';
    workflow.runtimeStatus = 'partial_real_postgres_and_en_fr_browser_verified';
    workflow.transitions = ['Rate-limit and validate token', 'Check current invitation, role and active organization', 'Apply password policy and recheck expiry', 'Conditionally claim current token/state/role/email with current organization/role eligibility', 'Atomically create user/credential/history and mandatory redemption audit', 'Retain server-confirmed success through consumed-link refresh; sign in using current authority'];
    workflow.evidence.push('lanes/environment/INVITATION_REDEMPTION.md', 'evidence/invitation-redemption-receipt.json', 'lanes/environment/invitation-redemption-8152b922-f7b.json', 'lanes/environment/invitation-browser-browser-af443af6-01c.json');
    workflow.remaining = ['Issuer identity/permission snapshot is not retained by Invite; revalidation of the original grant ceiling remains an engineering gap. Wildcard, foreign-role and inactive-organization checks are now enforced.', 'Invitation issuance/provider delivery, ambiguous delivery/reissue and complete administration recovery remain separately unverified.', 'Native zoom, actual screen reader and comprehensive contrast remain open. Profile-input server bounds were added in source v13; semantic profile-data validation remains subject to its wider review.', 'No complete downstream onboarding/module/domain activation or full-build certification.'];
    workflow.evidence.push('lanes/environment/INVITATION_REGISTER_AND_ISSUANCE.md', 'evidence/invitation-register-receipt.json');
  }
  if (workflow.id === 'ID-04') {
    workflow.services.push('services/users/user-invitation-redemption-authority.service.ts');
    workflow.records.push('BusinessEvent issuance permission snapshot');
    workflow.transitions = ['Rate-limit and validate token', 'Match one applied issuance record to the current private invitation generation', 'Require the original grant ceiling, unchanged target permission set and currently authorized issuer', 'Apply password policy', 'Lock current issuance, organization, target role, issuer and issuer role memberships; revalidate after hashing', 'Conditionally claim the current invitation and create credential/history/audit atomically', 'Bind redemption audit to issuance ID and permission snapshot', 'Retain success or actionable rejection after the server refresh; replace links without valid evidence'];
    workflow.implementationStatus = 'redemption_authority_database_verified_hydration_error_recovery_implemented_final_browser_cooldown_pending';
    workflow.evidence.push('lanes/environment/INVITATION_REDEMPTION_AUTHORITY.md', 'evidence/invitation-provenance-receipt.json');
    workflow.remaining = ['Final EN/FR changed-authority/replacement browser journeys await the genuine local cooldown ending 2026-09-06T07:33:11.574Z; split locales across the existing per-IP windows. Latest browser 3d94908e-01e passed zero complete journeys. Do not reset counters or change client identity.', 'Invitation delivery/history/operator recovery remain open under ID-03; production sender absent after approval rejection.', 'Native zoom, actual screen reader, comprehensive contrast and full downstream onboarding verification remain open.', 'No full-build, release, X1 or professional certification; semantic profile-data rules remain subject to wider identity review.'];
  }
  if (workflow.id === 'ID-03') {
    workflow.entryPoints.push('actions/users/getInvitationHistory.ts', 'components/Forms/users/InvitationHistory.tsx');
    workflow.services.push('services/users/user-invitation-history.service.ts');
    workflow.transitions.push('Read current-authority scoped decision and delivery history', 'Verify evidence and receipt bindings without exposing private payloads', 'Load older decisions with a scoped cursor; retry failed reads while retaining the previous checked time', 'Clear private history on access revocation');
    workflow.evidence.push('evidence/source-baseline-v18.json', 'lanes/environment/INVITATION_HISTORY.md', 'evidence/invitation-history-receipt.json');
    workflow.implementationStatus = 'atomic_queue_revision_bound_management_redemption_authority_and_history_verified_transport_open';
    workflow.remaining = ['Production email adapter remains absent after automatic approval rejection; the implementation-only approval question is unanswered.', 'Operator delivery/retry mutation controls and actual provider outcomes remain open. History is read-only and makes no delivery claim.', 'Directory-wide EN/FR, native zoom, actual screen reader, comprehensive contrast and full build/release assurance remain open.'];
  }
  if (workflow.id === 'ID-04') {
    workflow.evidence.push('evidence/source-baseline-v18.json', 'lanes/environment/invitation-provenance-browser-browser-671da972-87e.json', 'lanes/environment/invitation-provenance-browser-browser-faf0e1ef-d62.json', 'evidence/invitation-recipient-final-receipt.json');
    workflow.implementationStatus = 'redemption_authority_and_en_fr_changed_authority_replacement_browser_verified';
    workflow.remaining = ['Production invitation transport and operator mutation controls remain open under ID-03. Read-only decision/delivery history is now verified.', 'Native zoom, actual screen reader, comprehensive contrast and full downstream onboarding remain open.', 'No full-build, release, X1 or professional certification; semantic profile-data rules remain subject to wider identity review.'];
  }
  if (['ID-03', 'ID-04'].includes(workflow.id)) {
    workflow.evidence.push('evidence/invitation-grant-controls-receipt.json', 'lanes/organization-access/INVITATION_GRANT_CONTROLS.md');
    workflow.services.push('services/roles/role-permission-policy.ts', 'services/security/role-grant-policy.service.ts');
    workflow.transitions.push('Distinguish stored user-role assignment, role-permission assignment/removal and legacy role controls', 'Require stored-grant provenance for powerful role-control invitations; review and reissue older ambiguous records', 'Recheck current raw authority at role selection, issuance, worker and recipient boundaries');
    workflow.implementationStatus = 'stored_role_control_authority_provenance_and_connected_invitation_boundaries_corrected_transport_open';
    workflow.remaining.push('Other shared permission alias families, member deactivation/assignment and coordinated last-administrator protection remain under review. No platform-wide authority certification.');
  }
  if (workflow.id === 'ID-05') {
    workflow.entryPoints.push('app/[locale]/(dashboard)/dashboard/change-password/page.tsx', 'components/Forms/ChangePasswordForm.tsx', 'components/UserDropdownMenu.tsx', 'app/[locale]/(auth)/login-v2/page.tsx');
    workflow.services.push('services/users/user-password-change.service.ts', 'services/users/password-change-input.ts', 'services/security/step-up-auth.service.ts', 'lib/security/auth-credentials.ts');
    workflow.authority = 'Current same-tenant actor, canonical profile.password.update for own password or users.password.reset for an administrative target, actual password assurance and final locked authority/session revalidation.';
    workflow.transitions = ['Discover permission-scoped account-menu action', 'Enter masked current/new passwords through hydrated POST', 'Confirm actual current-password assurance and policy', 'Revalidate credential generation, tenant, actor, role and session under transaction locks', 'Atomically synchronize credentials/history, revoke target sessions, invalidate prior reset links and audit', 'Hand self-service success to the localized sign-in page; retain administrator session', 'Reject old password and accept new password; retain draft after recoverable failures'];
    workflow.implementationStatus = 'transactional_current_authority_password_change_and_en_fr_recovery_verified';
    workflow.runtimeStatus = 'partial_real_postgres_and_en_fr_browser_verified';
    workflow.evidence.push('evidence/source-baseline-v19.json', 'evidence/password-change-receipt.json', 'lanes/environment/PASSWORD_CHANGE.md');
    workflow.remaining = ['Native zoom, actual screen reader and comprehensive contrast remain unverified.', 'Administrative service/action branch is verified in tests and PostgreSQL; no dedicated target-password UI is introduced.', 'Static module scan retains three parser gaps for conditional permission/custom route wrapper; runtime denial and current-guard tests are separate evidence.', 'No production password change, provider notification, full-build, release, X1 or professional certification.'];
  }
  workflow.evidence.push('evidence/identity-controls-receipt.json', 'evidence/identity-recovery-receipt.json');
  if (workflow.id === 'ID-06' || workflow.id === 'ID-07') {
    workflow.entryPoints.push('components/Forms/' + (workflow.id === 'ID-06' ? 'ForgotPasswordForm' : 'ResetPasswordForm') + '.tsx', workflow.id === 'ID-06' ? 'actions/users/sendResetLink.ts' : 'actions/users/updateUserPassword.ts');
    workflow.services.push('services/users/password-recovery-input.ts', 'services/security/public-identity-abuse.service.ts', 'lib/security/auth-credentials.ts');
    workflow.evidence.push('evidence/source-baseline-v20.json', 'evidence/password-recovery-receipt.json', 'lanes/environment/PASSWORD_RECOVERY.md');
    workflow.runtimeStatus = 'partial_real_postgres_and_en_fr_browser_verified';
    workflow.implementationStatus = workflow.id === 'ID-06' ? 'bounded_request_and_en_fr_privacy_preserving_acknowledgement_corrected_delivery_open' : 'atomic_audit_current_account_single_use_reset_and_en_fr_failure_recovery_verified';
    workflow.transitions = workflow.id === 'ID-06' ? ['Enter bounded account email', 'Apply current subject/IP limits without exposing account existence', 'Request recovery through the existing provider boundary for an eligible account', 'Acknowledge request without claiming delivery', 'Review preserved email before an explicit retry; use ordinary support if no link arrives'] : ['Open a current private reset link', 'Keep link when switching language; disable credential input before hydration', 'Validate matching new passwords and current password policy', 'Recheck active organization and account, credential generation and link expiry under transaction locks', 'Consume link and synchronize credential/history/session revocation/mandatory audit atomically', 'Retain draft for policy or uncertain failure and prevent duplicate pending submission', 'Confirm actual completion and sign in with the new password'];
    workflow.remaining = ['Actual reset request delivery, durable provider failure/retry and operator visibility remain open; no email was sent. The historical exported components/auth/ForgotPasswordForm still simulates success but has no current direct route caller and remains separately recorded for reconciliation.', 'Native zoom, actual screen reader, comprehensive contrast and full end-to-end onboarding remain unverified.', 'No production mutation, full-build, release, X1 or professional certification.'];
  }
  if (workflow.id === 'ID-07') workflow.evidence.push('lanes/environment/POSTGRES_VERIFICATION.md', 'lanes/environment/postgres-run-f799fb30e867.json', 'lanes/environment/environment-binding.json');
  if (workflow.id === 'ID-08') {
    workflow.entryPoints.push('actions/users/resendVerificationCode.ts', 'actions/users/verifyOtp.ts', 'components/auth/v2/VerifyV2Form.tsx', 'components/auth/EmailVerificationForm.tsx');
    workflow.services.push(`${identitySource}#requestEmailVerificationCodeWorkflow`);
    workflow.implementationStatus = 'verification_and_resend_corrected';
    workflow.runtimeStatus = 'partial_real_browser_and_postgres_verified';
    workflow.remaining = ['Actual EN/FR verification passed with the same unconsumed accounts after mismatch-resend and invalid-code checks; real provider delivery, full onboarding and remaining recovery paths are unverified.', 'The first French valid-code attempt did not complete navigation within the observation window; its cause remains unclassified. No token rotation or abuse-counter reset was used for the successful follow-up.', 'Legacy exported form now delegates to the real v2 workflow; it has no current production route caller.'];
    workflow.evidence.push('lanes/environment/EMAIL_VERIFICATION_BROWSER.md', 'lanes/environment/email-recovery-48b21da20a.json', 'lanes/environment/otp-readonly-diagnosis-48b21da20a.json', 'lanes/environment/email-valid-recovery-89401f67.json');
  }
}
for (const workflow of identity.filter(row => ['ID-01', 'ID-02'].includes(row.id))) {
  workflow.evidence.push('evidence/organization-handoff-receipt.json', 'lanes/organization-access/ORGANIZATION_HANDOFF.md');
  workflow.crossDomainHandoff = 'OA-CREATE now opens existing owner registration; actual EN/FR creation preserves the current account session. New owners remain unverified. One-account multi-organization membership is not implemented.';
}
const lanes = path.join(__dirname, 'lanes');
if (fs.existsSync(lanes)) for (const lane of fs.readdirSync(lanes, { withFileTypes: true }).filter(item => item.isDirectory())) {
  const file = path.join(lanes, lane.name, 'WORKFLOW_REGISTER.json');
  if (!fs.existsSync(file)) continue;
  const document = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(document.workflows)) throw new Error(`Missing workflows array: ${file}`);
  laneInputs.push(path.relative(__dirname, file).replaceAll('\\', '/'));
  workflows.push(...document.workflows);
}
const workflowAliases = {
  'NTF-STATEMENT-QUEUE': 'CS-STATEMENT-DELIVERY-QUEUE',
  'NTF-STATEMENT-DELIVER': 'CS-STATEMENT-DELIVERY-WORKER',
};
for (const [alias, canonicalId] of Object.entries(workflowAliases)) {
  const index = workflows.findIndex(item => item.id === alias);
  if (index === -1) continue;
  const canonical = workflows.find(item => item.id === canonicalId);
  if (!canonical) throw new Error(`Missing canonical workflow for ${alias}`);
  const [additionalReview] = workflows.splice(index, 1);
  canonical.crossDomainReviews = [...(canonical.crossDomainReviews || []), additionalReview];
}
const ids = workflows.map(item => item.id);
if (new Set(ids).size !== ids.length) throw new Error('Duplicate workflow ID');
const entries = baseline.sources.filter(item => item.entryKind || item.backgroundCandidate).map(item => ({ path: item.path, kind: item.entryKind || 'background-candidate', symbols: item.exports, matchedWorkflowIds: workflows.filter(workflow => JSON.stringify([workflow.entryPoints, workflow.services, workflow.evidence, workflow.crossDomainReviews]).includes(item.path)).map(workflow => workflow.id) }));
const families = ['Identity/onboarding', 'Organization/access management', 'Module configuration', 'Master data', 'Sales/order-to-cash', 'POS/offline', 'Inventory', 'Purchasing/AP', 'Payments/reconciliation', 'Finance/accounting/close', 'HRIS/payroll', 'Compliance', 'Reporting/analytics', 'Evidence/governance', 'Notifications', 'Integrations/background jobs', 'AI/agent capabilities'];
const register = { updatedAt: new Date().toISOString(), objective: baseline.task, discoveryComplete: false, coverage: { discoveredWorkflows: workflows.length, completeWorkflowsVerified: workflows.filter(item => item.completeWorkflowVerified === true).length, sourceCandidateCounts: baseline.summary, unmappedEntrySources: entries.filter(item => !item.matchedWorkflowIds.length).length, interpretation: 'Provisional semantic workflow denominator grows with discovery. No route/export/control count establishes workflow completion.' }, families, laneInputs, workflows, entrySourceReconciliation: entries };
register.sourceBaseline = 'evidence/source-baseline-v160.json';
register.workflowAliases = workflowAliases;
// Preserve the closure queue and explicitly reviewed criteria across historical lane aggregation.
const priorFile = path.join(__dirname, 'WORKFLOW_REGISTER.json');
if (fs.existsSync(priorFile)) {
  const prior = JSON.parse(fs.readFileSync(priorFile, 'utf8'));
  register.executionPolicy = prior.executionPolicy;
  for (const workflow of register.workflows) {
    const previous = prior.workflows.find(item => item.id === workflow.id);
    if (previous?.status) workflow.status = previous.status;
    if (previous?.closureReview) workflow.closureReview = previous.closureReview;
  }
  if (register.executionPolicy) register.coverage.statusCounts = Object.fromEntries(['Queued', 'In progress', 'Verification pending', 'Blocked—engineering', 'Blocked—external', 'Complete—verified'].map(status => [status, register.workflows.filter(item => (item.status || 'Queued') === status).length]));
}
fs.writeFileSync(path.join(__dirname, 'WORKFLOW_REGISTER.json'), JSON.stringify(register, null, 2) + '\n');
console.log(JSON.stringify(register.coverage));
