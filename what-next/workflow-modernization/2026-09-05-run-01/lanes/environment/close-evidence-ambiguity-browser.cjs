"use strict";
// Inert without --run, exact passing runtime receipt and owned loopback listener.
async function main() {
  const h = require('./close-pack-write-race-runtime.cjs'), { f, db, root, helper } = h, { fs, path, crypto, assert } = f;
  const { chromium, expect: baseExpect } = require('@playwright/test'), { execFileSync } = require('node:child_process');
  const load = file => require(path.join(root, file)), service = load('services/accounting/close-assurance.service.ts'), payment = load('services/reconciliation/payment-reconciliation-dashboard.service.ts');
  const { hashPassword } = load('lib/password.ts'), { stepUpSessionWithPassword } = load('services/security/step-up-auth.service.ts');
  const copies = load('components/accounting/close-evidence-workflow-copy.ts').closeEvidenceWorkflowCopy;
  const run = crypto.randomUUID(), base = 'http://127.0.0.1:3110', secrets = [], expect = baseExpect.configure({ timeout: 60000 });
  const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex'), safe = error => f.safe(error, secrets);
  const product = ['components/accounting/CloseEvidenceWorkflowPanel.tsx', 'components/accounting/close-evidence-workflow-copy.ts', 'actions/accounting/close-evidence-workflow.actions.ts', 'services/accounting/close-evidence-recipient.service.ts', 'services/accounting/close-evidence-request-tracking.ts', 'services/accounting/close-evidence-workflow.service.ts', 'services/_shared/protect.ts', 'next.config.mjs'];
  product.push('services/accounting/close-evidence-investigation.ts', 'components/accounting/CloseEvidenceInvestigationPanel.tsx');
  product.push('services/accounting/close-evidence-resolution-records.ts', 'services/accounting/close-evidence-resolution.service.ts', 'components/accounting/CloseEvidenceResolutionForm.tsx');
  product.push('services/accounting/close-evidence-resolution.schemas.ts', 'hooks/accounting/close-evidence-resolution-draft.ts');
  const sources = () => ({ ...h.sources(), ...Object.fromEntries([__filename, ...product.map(file => path.join(root, file))].map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
  const report = { run, at: new Date().toISOString(), journeys: [], limitations: ['Only owned synthetic fixtures and actual application actions; no live customer approval, migration, reset, payment or external delivery.', 'Development timings and bounded keyboard/reflow checks do not establish production performance or accessibility certification.'] }; let x;
  function listener() {
    const pid = Number(process.env.STOQUIFY_CLOSE_BROWSER_PID); assert.ok(Number.isSafeInteger(pid) && pid > 0);
    const escaped = root.toLowerCase().replaceAll("'", "''"), command = `$ErrorActionPreference='Stop'; $rows=@(Get-NetTCPConnection -LocalPort 3110 -State Listen); if($rows.Count -ne 1){throw 'Expected one listener'}; $p=Get-CimInstance Win32_Process -Filter ('ProcessId='+$rows[0].OwningProcess); $q=Get-CimInstance Win32_Process -Filter ('ProcessId='+$p.ParentProcessId); $commands=(@($p.CommandLine,$q.CommandLine) -join ' '); [pscustomobject]@{address=$rows[0].LocalAddress;pid=$p.ProcessId;workspaceMatches=$commands.ToLowerInvariant().Contains('${escaped}');nextDevelopmentCommand=($commands -match 'next.+dev.+-p.+3110')}|ConvertTo-Json -Compress`;
    const value = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8', windowsHide: true, timeout: 30000 }).trim());
    assert.equal(value.pid, pid); assert.equal(value.address, '127.0.0.1'); assert.equal(value.workspaceMatches, true); assert.equal(value.nextDevelopmentCommand, true); return value;
  }
  function predecessor() {
    const name = process.env.STOQUIFY_CLOSE_BROWSER_RECEIPT, hash = process.env.STOQUIFY_CLOSE_BROWSER_SHA;
    assert.ok(/^close-evidence-ambiguity-[a-f0-9-]{36}\.json$/.test(name || '')); assert.ok(/^[a-f0-9]{64}$/.test(hash || ''));
    const bytes = fs.readFileSync(path.join(__dirname, name)); assert.equal(sha(bytes), hash); const value = JSON.parse(bytes);
    for (const flag of ['passed', 'sourceStable', 'outsideUnchanged', 'financialUnchanged']) assert.equal(value[flag], true);
    for (const file of ['services/accounting/close-assurance.service.ts', 'services/accounting/close-evidence-workflow.service.ts', 'services/accounting/close-evidence-recipient.service.ts']) assert.equal(sha(fs.readFileSync(path.join(root, file))), value.sourceAfter[file]);
    assert.equal(value.fixture.synthetic, true); assert.ok(value.fixture.organizationId.startsWith('workflow_close_write_')); x = value.fixture; h.organizations.push(x.organizationId); report.predecessor = { name, sha256: hash, organizationId: x.organizationId, periodId: x.periodId };
  }
  async function outside() {
    const other = {}; for (const model of ['account', 'session']) other[model] = f.hash(await db[model].findMany({ where: { user: { organizationId: { notIn: h.organizations } } }, orderBy: { id: 'asc' } }));
    other.comments = f.hash(await db.accountantComment.findMany({ where: { organizationId: { notIn: h.organizations } }, orderBy: { id: 'asc' } })); return { hash: f.hash({ base: await h.outside(), other }) };
  }
  async function credentials() {
    const identities = {};
    for (const [who, id] of Object.entries(x.actorIds)) {
      const password = 'Owned-replacement-' + crypto.randomUUID() + '!'; secrets.push(password); const hashed = await hashPassword(password); secrets.push(hashed);
      const user = await db.user.update({ where: { id, organizationId: x.organizationId }, data: { password: hashed, emailVerified: true } });
      const account = await db.account.findFirst({ where: { userId: id, accountId: id, providerId: 'credential' }, select: { id: true } });
      if (account) await db.account.update({ where: { id: account.id }, data: { password: hashed } }); else await db.account.create({ data: { userId: id, accountId: id, providerId: 'credential', password: hashed } });
      identities[who] = { user, password };
    }
    await db.role.create({ data: { organizationId: x.organizationId, code: 'replacement-browser-' + run, nameEn: 'Synthetic dashboard access', permissions: ['dashboard.read'], users: { connect: Object.values(x.actorIds).map(id => ({ id })) } } }); return identities;
  }
  async function journey(browser, identities, locale, width) {
    const copy = copies[locale], row = { locale, width, passed: false, screenshots: [], timings: [], errors: [], blockedOrigins: [], viewports: [] }; let context, page, panel, session, stage = 'setup';
    const press = async target => { await expect(target).toBeEnabled(); await target.scrollIntoViewIfNeeded(); await target.focus(); await expect(target).toBeFocused(); await page.keyboard.press('Enter'); };
    const shot = async name => { const file = `close-evidence-ambiguity-browser-${run}-${locale}-${name}.png`; await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled' }); row.screenshots.push(file); };
    const open = async who => {
      if (context) await context.close(); const credential = identities[who]; context = await browser.newContext({ viewport: { width, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce' }); context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000);
      await context.route('**/*', route => { const origin = new URL(route.request().url()).origin; if (origin === base) return route.continue(); if (!row.blockedOrigins.includes(origin)) row.blockedOrigins.push(origin); return route.abort(); });
      const previous = new Set((await db.session.findMany({ where: { userId: credential.user.id }, select: { id: true } })).map(item => item.id));
      const login = await context.request.post(base + '/api/auth/sign-in/email', { data: { email: credential.user.email, password: credential.password }, headers: { Origin: base }, timeout: 180000, maxRedirects: 0 }); assert.equal(login.status(), 200);
      const sessions = (await db.session.findMany({ where: { userId: credential.user.id, expiresAt: { gt: new Date() } } })).filter(item => !previous.has(item.id)); assert.equal(sessions.length, 1); session = sessions[0]; secrets.push(session.token);
      assert.equal((await stepUpSessionWithPassword({ sessionId: session.id, sessionToken: session.token, userId: credential.user.id, organizationId: x.organizationId, password: credential.password })).status, 'verified');
      page = await context.newPage(); page.on('pageerror', error => row.errors.push(safe(error))); const start = Date.now(); await page.goto(base + '/' + locale + '/dashboard/accounting/close', { waitUntil: 'domcontentloaded' }); panel = page.locator('section[aria-labelledby="close-evidence-title"]');
      await expect(panel.getByRole('heading', { name: copy.title, exact: true })).toBeVisible(); await expect(panel.getByText(copy.loading, { exact: true })).not.toBeVisible(); row.timings.push({ persona: who, elapsedMs: Date.now() - start });
    };

    try {
      await open('maker'); const makerControl = { actorId: x.actorIds.maker, session: { id: session.id, token: session.token } };
      const newRequest = async label => {
        const originalCollector = payment.getPaymentReconciliationDashboardData; let adverse;
        try { payment.getPaymentReconciliationDashboardData = async () => { throw Error('Explicit owned browser collector fault'); }; adverse = await service.runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: 'ambiguity-browser-' + label + locale + run }, makerControl); }
        finally { payment.getPaymentReconciliationDashboardData = originalCollector; }
        const finding = await db.closeAssuranceFinding.findFirstOrThrow({ where: { organizationId: x.organizationId, closeRunId: adverse.run.id, checklistItem: { key: 'payment-reconciliation' } } });
        await service.runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: 'ambiguity-restored-' + label + locale + run }, makerControl);
        return service.requestMissingCloseEvidence(x.organizationId, { findingId: finding.id, requestedFromId: x.actorIds.checker, requestText: 'Synthetic browser conflict request ' + label + locale + run, dueAt: new Date(Date.now() + 86400000), correlationId: 'ambiguity-request-' + label + locale + run }, makerControl);
      };
      const addConflict = async (request, visibility) => db.accountantComment.create({ data: { organizationId: x.organizationId, periodId: request.periodId, closeRunId: request.closeRunId, findingId: request.findingId, authorId: x.actorIds.maker, body: 'Explicit synthetic malformed retained history.', visibility, metadata: { syntheticLegacyConflict: true }, correlationId: 'browser-conflict-' + crypto.randomUUID() } });
      const state = async () => { const values = {}; for (const model of ['closeAssuranceFinding', 'accountantComment', 'ledgerAuditEvent', 'businessEvent', 'businessEventOutbox', 'businessEventAudit']) values[model] = f.hash(await db[model].findMany({ where: { organizationId: x.organizationId }, orderBy: { id: 'asc' } })); return values; };
      const request = await newRequest('response');
      stage = 'response-preview'; await open('checker');
      const assigned = panel.getByRole('listitem').filter({ hasText: copy.reference + ': ' + request.id });
      await press(assigned.getByRole('button', { name: copy.respond, exact: true }));
      const responseText = locale === 'fr' ? 'Conserver cette explication pour la personne chargée de l’examen.' : 'Preserve this explanation for the authorized investigator.';
      await panel.getByRole('textbox', { name: copy.text, exact: true }).fill(responseText);
      await addConflict(request, 'CLIENT_ACTION_REQUIRED'); const beforeResponse = await state();
      stage = 'response-refusal'; await press(panel.getByRole('button', { name: copy.submitResponse, exact: true }));
      await expect(panel.getByRole('alert').filter({ hasText: copy.trackingReviewHelp })).toBeFocused();
      await expect(panel.getByRole('textbox', { name: copy.text, exact: true })).toHaveValue(responseText); assert.deepEqual(await state(), beforeResponse);
      row.responseRefusedWithoutEffects = true; row.responseDraftRetained = true; await shot('response-investigation');
      const reviewRequest = await newRequest('review');
      await page.reload({ waitUntil: 'domcontentloaded' }); await expect(panel.getByText(copy.loading, { exact: true })).not.toBeVisible();
      const freshAssigned = panel.getByRole('listitem').filter({ hasText: copy.reference + ': ' + reviewRequest.id }); await press(freshAssigned.getByRole('button', { name: copy.respond, exact: true }));
      await panel.getByRole('textbox', { name: copy.text, exact: true }).fill(responseText);
      await press(panel.getByRole('button', { name: copy.submitResponse, exact: true })); await expect(panel.getByText(copy.responseSaved, { exact: true })).toBeFocused();
      stage = 'review-preview'; await open('maker');
      const review = panel.getByRole('listitem').filter({ has: page.getByRole('button', { name: copy.review, exact: true }), hasText: copy.reference + ': ' + reviewRequest.id });
      await press(review.getByRole('button', { name: copy.review, exact: true }));
      const notes = locale === 'fr' ? 'Notes indépendantes à conserver pendant l’examen de l’historique.' : 'Retain these independent notes while investigating the history.';
      await panel.getByRole('textbox', { name: copy.notes, exact: true }).fill(notes); await panel.getByRole('checkbox', { name: copy.checked, exact: true }).check();
      await addConflict(reviewRequest, 'CLIENT_RESPONSE_SUBMITTED'); const beforeAcceptance = await state();
      stage = 'acceptance-refusal'; await press(panel.getByRole('button', { name: copy.accept, exact: true }));
      await expect(panel.getByRole('alert').filter({ hasText: copy.trackingReviewHelp })).toBeFocused();
      await expect(panel.getByRole('textbox', { name: copy.notes, exact: true })).toHaveValue(notes); await expect(panel.getByRole('button', { name: copy.accept, exact: true })).toBeDisabled(); assert.deepEqual(await state(), beforeAcceptance);
      row.acceptanceRefusedWithoutEffects = true; row.reviewDraftRetained = true;
      for (const viewport of [1440, 768, 320]) { await page.setViewportSize({ width: viewport, height: 1000 }); await panel.getByRole('textbox', { name: copy.notes, exact: true }).scrollIntoViewIfNeeded(); const size = await panel.evaluate(element => ({ viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, width: element.clientWidth, content: element.scrollWidth, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches })); assert.ok(size.content <= size.width + 1); assert.ok(size.pageWidth <= viewport + 1); assert.equal(size.reducedMotion, true); row.viewports.push(size); await shot('review-investigation-' + viewport); }
      stage = 'investigation-history'; await press(panel.getByRole('button', { name: copy.refresh, exact: true })); await expect(panel.getByText(copy.loading, { exact: true })).not.toBeVisible();
      const history = panel.locator('section[aria-labelledby="close-request-tracking-title"]');
      for (const retained of [request, reviewRequest]) { const item = history.getByRole('listitem').filter({ hasText: copy.reference + ': ' + retained.id }); await expect(item.getByText(copy.trackingStates.REVIEW_REQUIRED, { exact: true })).toBeVisible(); assert.equal(await item.getByRole('button', { name: copy.replace, exact: true }).count(), 0); }
      row.investigationHistoryRetained = true;
      stage = 'inspect-records'; let inspection = panel.locator('section[aria-labelledby="close-investigation-title"]');
      const refLabel = locale === 'fr' ? 'Référence de la demande' : 'Request reference', inspectLabel = locale === 'fr' ? 'Examiner les enregistrements' : 'Inspect records';
      const beforeInspection = await state();
      await inspection.getByRole('textbox', { name: refLabel, exact: true }).fill(reviewRequest.id);
      await press(inspection.getByRole('button', { name: inspectLabel, exact: true }));
      await expect(inspection.getByRole('heading', { level: 4 })).toBeFocused();
      await expect(inspection.getByText('Explicit synthetic malformed retained history.', { exact: true })).toBeVisible();
      await expect(inspection.getByText(locale === 'fr' ? 'Plusieurs réponses sont rattachées à ce constat.' : 'Several responses are attached to this finding.', { exact: true })).toBeVisible();
      assert.equal(await inspection.locator('ol > li').count(), 3);
      assert.deepEqual(await state(), beforeInspection); row.investigationReadWithoutMutation = true; row.investigationViewports = [];
      for (const viewport of [1440, 768, 320]) { await page.setViewportSize({ width: viewport, height: 1000 }); await inspection.getByRole('heading', { level: 4 }).scrollIntoViewIfNeeded(); const size = await inspection.evaluate(element => ({ viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, width: element.clientWidth, content: element.scrollWidth })); assert.ok(size.content <= size.width + 1); assert.ok(size.pageWidth <= viewport + 1); row.investigationViewports.push(size); await shot('retained-records-' + viewport); }
      stage = 'propose-recovery';
      const recoveryCopy = locale === 'fr' ? { request: 'Demande conservée', response: 'Réponse conservée', reason: 'Motif de cette sélection', exclusion: 'Motif de conservation avec exclusion', propose: 'Enregistrer la proposition', review: 'Notes de revue indépendante', approve: 'Autoriser la sélection', confirm: 'J’ai examiné la sélection et chaque exclusion ; ceci n’accepte aucun justificatif et ne clôture pas le constat.', approved: 'Sélection autorisée' } : { request: 'Retained request', response: 'Retained response', reason: 'Reason for this selection', exclusion: 'Reason to retain but exclude', propose: 'Record proposal', review: 'Independent review notes', approve: 'Authorize selection', confirm: 'I reviewed the selection and every exclusion; this does not accept evidence or close the finding.', approved: 'Selection authorized' };
      const originalRecords = await db.accountantComment.findMany({ where: { organizationId: x.organizationId, findingId: reviewRequest.findingId }, orderBy: { id: 'asc' } });
      const validResponse = originalRecords.find(record => record.visibility === 'CLIENT_RESPONSE_SUBMITTED' && record.metadata?.responseType === 'MISSING_CLOSE_EVIDENCE_RESPONSE'); assert.ok(validResponse);
      const excludedRecord = originalRecords.find(record => record.id !== reviewRequest.id && record.id !== validResponse.id); assert.ok(excludedRecord);
      await inspection.getByRole('combobox', { name: recoveryCopy.request, exact: true }).selectOption(reviewRequest.id);
      await inspection.getByRole('combobox', { name: recoveryCopy.response, exact: true }).selectOption(validResponse.id);
      await inspection.getByRole('textbox', { name: recoveryCopy.reason, exact: true }).fill(locale === 'fr' ? 'Conserver la chaîne émise par le service ; garder le doublon pour audit.' : 'Keep the service-issued chain and retain the duplicate for audit.');
      await inspection.getByRole('textbox', { name: recoveryCopy.exclusion + ': ' + excludedRecord.id, exact: true }).fill(locale === 'fr' ? 'Doublon synthétique mal formé ; conserver sans utiliser pour le traitement.' : 'Malformed synthetic duplicate; retain without using it for processing.');
      row.recoveryViewports = [];
      for (const viewport of [1440, 768, 320]) { await page.setViewportSize({ width: viewport, height: 1000 }); await inspection.getByRole('combobox', { name: recoveryCopy.request, exact: true }).scrollIntoViewIfNeeded(); const size = await inspection.evaluate(element => ({ viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, width: element.clientWidth, content: element.scrollWidth })); assert.ok(size.content <= size.width + 1); assert.ok(size.pageWidth <= viewport + 1); row.recoveryViewports.push(size); await shot('proposal-' + viewport); }
      const reopen = async () => {
        await page.reload({ waitUntil: 'domcontentloaded' }); panel = page.locator('section[aria-labelledby="close-evidence-title"]');
        await expect(panel.getByText(copy.loading, { exact: true })).not.toBeVisible(); inspection = panel.locator('section[aria-labelledby="close-investigation-title"]');
        await expect(inspection.getByRole('textbox', { name: refLabel, exact: true })).toHaveValue(reviewRequest.id);
        await press(inspection.getByRole('button', { name: inspectLabel, exact: true })); await expect(inspection.getByRole('heading', { level: 4 })).toBeFocused();
      };
      const savedReason = await inspection.getByRole('textbox', { name: recoveryCopy.reason, exact: true }).inputValue(), savedExclusion = await inspection.getByRole('textbox', { name: recoveryCopy.exclusion + ': ' + excludedRecord.id, exact: true }).inputValue();
      stage = 'unsent-draft-reload'; const beforeReload = await state(); await reopen();
      await expect(inspection.getByRole('combobox', { name: recoveryCopy.request, exact: true })).toHaveValue(reviewRequest.id);
      await expect(inspection.getByRole('textbox', { name: recoveryCopy.reason, exact: true })).toHaveValue(savedReason); await expect(inspection.getByRole('textbox', { name: recoveryCopy.exclusion + ': ' + excludedRecord.id, exact: true })).toHaveValue(savedExclusion);
      assert.deepEqual(await state(), beforeReload); row.unsentDraftRestoredWithoutSubmission = true; await shot('restored-draft');
      stage = 'unknown-outcome-reload'; let lostResponse = false;
      await page.route(base + '/' + locale + '/dashboard/accounting/close', async route => {
        if (!lostResponse && route.request().method() === 'POST' && (route.request().postData() || '').includes('selectedRequestId')) { lostResponse = true; const actual = await route.fetch(); assert.equal(actual.status(), 200); return route.abort('failed'); }
        return route.continue();
      });
      await press(inspection.getByRole('button', { name: recoveryCopy.propose, exact: true }));
      await expect(inspection.getByRole('alert').filter({ hasText: locale === 'fr' ? 'Le résultat n’a pas pu être confirmé.' : 'The outcome could not be confirmed.' })).toBeVisible();
      assert.equal(lostResponse, true);
      const committedProposal = await db.ledgerAuditEvent.findFirstOrThrow({ where: { organizationId: x.organizationId, resourceId: reviewRequest.findingId, action: 'CLOSE_EVIDENCE_HISTORY_PROPOSED' } });
      await reopen(); assert.equal(await db.ledgerAuditEvent.count({ where: { organizationId: x.organizationId, resourceId: reviewRequest.findingId, action: 'CLOSE_EVIDENCE_HISTORY_PROPOSED' } }), 1);
      await press(inspection.getByRole('button', { name: locale === 'fr' ? 'Réessayer la soumission conservée' : 'Retry saved submission', exact: true }));
      await expect(inspection.getByRole('status').filter({ hasText: locale === 'fr' ? 'Proposition enregistrée.' : 'Proposal recorded.' })).toBeVisible();
      let proposal = await db.ledgerAuditEvent.findFirstOrThrow({ where: { organizationId: x.organizationId, resourceId: reviewRequest.findingId, action: 'CLOSE_EVIDENCE_HISTORY_PROPOSED' }, orderBy: { createdAt: 'desc' } });
      assert.equal(proposal.id, committedProposal.id); assert.equal(await db.ledgerAuditEvent.count({ where: { organizationId: x.organizationId, resourceId: reviewRequest.findingId, action: 'CLOSE_EVIDENCE_HISTORY_PROPOSED' } }), 1); row.pendingReloadReplayedExactly = true;
      assert.deepEqual(await db.accountantComment.findMany({ where: { organizationId: x.organizationId, findingId: reviewRequest.findingId }, orderBy: { id: 'asc' } }), originalRecords);
      row.proposalRecordedWithoutChangingEvidence = true;
      const decisionCopy = locale === 'fr' ? { withdraw: 'Retirer la proposition', reject: 'Rejeter la proposition', withdrawn: 'Proposition retirée', rejected: 'Proposition rejetée', reason: 'Motif de clôture de cette proposition', confirm: 'Clôturer cette proposition en attente et conserver son historique. Ceci ne modifie ni les justificatifs ni une autorisation existante.' } : { withdraw: 'Withdraw proposal', reject: 'Reject proposal', withdrawn: 'Proposal withdrawn', rejected: 'Proposal rejected', reason: 'Reason for closing this proposal', confirm: 'Close this pending proposal and keep its history. This does not change evidence or an existing authorization.' };
      const closePending = async decision => {
        const card = inspection.getByRole('listitem').filter({ has: page.getByText(proposal.id, { exact: true }) });
        await card.getByRole('textbox', { name: decisionCopy.reason, exact: true }).fill(locale === 'fr' ? 'Réexaminer cette proposition avant une nouvelle revue indépendante.' : 'Reconsider this proposal before another independent review.');
        await card.getByRole('checkbox', { name: decisionCopy.confirm, exact: true }).check();
        await press(card.getByRole('button', { name: decision === 'WITHDRAWN' ? decisionCopy.withdraw : decisionCopy.reject, exact: true }));
        await expect(card.getByText(decision === 'WITHDRAWN' ? decisionCopy.withdrawn : decisionCopy.rejected, { exact: true })).toBeVisible();
        assert.equal(await card.getByRole('button').count(), 0);
        const retained = await db.ledgerAuditEvent.findFirstOrThrow({ where: { organizationId: x.organizationId, resourceId: reviewRequest.findingId, action: 'CLOSE_EVIDENCE_HISTORY_CLOSED', metadata: { path: ['proposalId'], equals: proposal.id } } });
        assert.equal(retained.metadata.command.decision, decision); assert.equal(retained.actorId, decision === 'WITHDRAWN' ? x.actorIds.maker : x.actorIds.certifier);
        assert.deepEqual(await db.accountantComment.findMany({ where: { organizationId: x.organizationId, findingId: reviewRequest.findingId }, orderBy: { id: 'asc' } }), originalRecords);
        await card.scrollIntoViewIfNeeded(); await shot(decision.toLowerCase());
      };
      const proposeAgain = async () => {
        await inspection.getByRole('combobox', { name: recoveryCopy.request, exact: true }).selectOption(reviewRequest.id);
        await inspection.getByRole('combobox', { name: recoveryCopy.response, exact: true }).selectOption(validResponse.id);
        await inspection.getByRole('textbox', { name: recoveryCopy.reason, exact: true }).fill(locale === 'fr' ? 'Nouvelle proposition explicite après examen de la décision conservée.' : 'New explicit proposal after reviewing the retained decision.');
        await inspection.getByRole('textbox', { name: recoveryCopy.exclusion + ': ' + excludedRecord.id, exact: true }).fill(locale === 'fr' ? 'Conserver le doublon mal formé sans l’utiliser pour le traitement.' : 'Retain the malformed duplicate without using it for processing.');
        await press(inspection.getByRole('button', { name: recoveryCopy.propose, exact: true }));
        await expect(inspection.getByRole('heading', { level: 4 })).toBeFocused();
        proposal = await db.ledgerAuditEvent.findFirstOrThrow({ where: { organizationId: x.organizationId, resourceId: reviewRequest.findingId, action: 'CLOSE_EVIDENCE_HISTORY_PROPOSED' }, orderBy: { createdAt: 'desc' } });
        await expect(inspection.getByText(proposal.id, { exact: true })).toBeVisible();
      };
      stage = 'withdraw-proposal'; await closePending('WITHDRAWN'); row.proposalWithdrawn = true; await proposeAgain();
      stage = 'independent-recovery'; await open('certifier'); inspection = panel.locator('section[aria-labelledby="close-investigation-title"]');
      await inspection.getByRole('textbox', { name: refLabel, exact: true }).fill(reviewRequest.id); await press(inspection.getByRole('button', { name: inspectLabel, exact: true }));
      await expect(inspection.getByRole('heading', { level: 4 })).toBeFocused(); await expect(inspection.getByText(proposal.id, { exact: true })).toBeVisible();
      stage = 'reject-proposal'; await closePending('REJECTED'); row.proposalRejected = true;
      await open('maker'); inspection = panel.locator('section[aria-labelledby="close-investigation-title"]');
      await inspection.getByRole('textbox', { name: refLabel, exact: true }).fill(reviewRequest.id); await press(inspection.getByRole('button', { name: inspectLabel, exact: true }));
      await expect(inspection.getByRole('heading', { level: 4 })).toBeFocused(); await proposeAgain();
      stage = 'independent-recovery'; await open('certifier'); inspection = panel.locator('section[aria-labelledby="close-investigation-title"]');
      await inspection.getByRole('textbox', { name: refLabel, exact: true }).fill(reviewRequest.id); await press(inspection.getByRole('button', { name: inspectLabel, exact: true }));
      await expect(inspection.getByRole('heading', { level: 4 })).toBeFocused(); await expect(inspection.getByText(proposal.id, { exact: true })).toBeVisible();
      await inspection.getByRole('textbox', { name: recoveryCopy.review, exact: true }).fill(locale === 'fr' ? 'Revue indépendante de la chaîne et de chaque exclusion conservée.' : 'Independent review of the chain and every retained exclusion.');
      await inspection.getByRole('checkbox', { name: recoveryCopy.confirm, exact: true }).check();
      const retainedNotes = await inspection.getByRole('textbox', { name: recoveryCopy.review, exact: true }).inputValue(); await reopen();
      await expect(inspection.getByRole('textbox', { name: recoveryCopy.review, exact: true })).toHaveValue(retainedNotes); await expect(inspection.getByRole('checkbox', { name: recoveryCopy.confirm, exact: true })).not.toBeChecked(); row.reviewReloadRequiresConfirmation = true;
      const otherDraftReason = locale === 'fr' ? 'Réflexion non soumise pour une proposition distincte à conserver.' : 'Retain this unsent reasoning for a separate proposal.';
      await inspection.getByRole('textbox', { name: recoveryCopy.reason, exact: true }).fill(otherDraftReason);
      await inspection.getByRole('checkbox', { name: recoveryCopy.confirm, exact: true }).check(); await shot('independent-review'); await press(inspection.getByRole('button', { name: recoveryCopy.approve, exact: true }));
      await expect(inspection.getByText(recoveryCopy.approved, { exact: true })).toBeVisible();
      await expect(inspection.getByRole('textbox', { name: recoveryCopy.reason, exact: true })).toHaveValue(otherDraftReason); row.unrelatedDraftPreserved = true;
      assert.deepEqual(await db.accountantComment.findMany({ where: { organizationId: x.organizationId, findingId: reviewRequest.findingId }, orderBy: { id: 'asc' } }), originalRecords);
      const approval = await db.ledgerAuditEvent.findFirstOrThrow({ where: { organizationId: x.organizationId, resourceId: reviewRequest.findingId, action: 'CLOSE_EVIDENCE_HISTORY_APPROVED' } }); assert.equal(approval.actorId, x.actorIds.certifier); assert.notEqual(approval.actorId, proposal.actorId);
      row.recoveryIndependentlyAuthorized = true; await shot('recovery-authorized');
      stage = 'recovered-acceptance'; await press(panel.getByRole('button', { name: copy.refresh, exact: true })); await expect(panel.getByText(copy.loading, { exact: true })).not.toBeVisible();
      const recoveredWork = panel.getByRole('listitem').filter({ has: page.getByRole('button', { name: copy.review, exact: true }), hasText: copy.reference + ': ' + reviewRequest.id });
      await press(recoveredWork.getByRole('button', { name: copy.review, exact: true }));
      await panel.getByRole('textbox', { name: copy.notes, exact: true }).fill(locale === 'fr' ? 'Revue distincte des sources actuelles après régularisation autorisée.' : 'Separate review of current source evidence after authorized recovery.');
      await panel.getByRole('checkbox', { name: copy.checked, exact: true }).check(); await press(panel.getByRole('button', { name: copy.accept, exact: true }));
      await expect(panel.getByText(copy.accepted, { exact: true })).toBeFocused();
      assert.deepEqual(await db.accountantComment.findMany({ where: { organizationId: x.organizationId, id: { in: originalRecords.map(record => record.id) } }, orderBy: { id: 'asc' } }), originalRecords);
      row.recoveredAcceptanceCompleted = true; row.originalRecordsRetained = true;
      assert.deepEqual(await h.financial(), report.financialBefore); row.passed = row.errors.length === 0;
    } catch (error) { row.error = safe(error); row.failedStage = stage; if (page) await shot('failure-' + stage).catch(() => {}); }
    finally { if (context) await context.close(); }
    console.log(JSON.stringify({ locale, passed: row.passed, failedStage: row.failedStage, error: row.error })); return row;
  }
  try {
    report.listenerBefore = listener(); predecessor(); await helper.withClient(helper.targetUrl(), helper.assertOwned); report.sourceBefore = sources(); report.outsideBefore = await outside(); const identities = await credentials(); report.financialBefore = await h.financial();
    const browser = await chromium.launch({ headless: true }); try { for (const [locale, width] of [['en', 1440], ['fr', 320]]) report.journeys.push(await journey(browser, identities, locale, width)); } finally { await browser.close(); }
    report.financialAfter = await h.financial(); report.financialUnchanged = f.hash(report.financialBefore) === f.hash(report.financialAfter);
    const build = path.join(root, '.next-workflow-supplier/server/app/[locale]/(dashboard)/dashboard/accounting/close/page.js'), bytes = fs.readFileSync(build); assert.ok(bytes.includes(Buffer.from('CloseEvidenceWorkflowPanel'))); report.build = { file: path.relative(root, build), sha256: sha(bytes) };
  } catch (error) { report.error = safe(error); }
  finally {
    try { report.listenerAfter = listener(); report.sourceAfter = sources(); report.sourceStable = !!report.sourceBefore && f.hash(report.sourceBefore) === f.hash(report.sourceAfter); if (report.outsideBefore) { report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore.hash === report.outsideAfter.hash; } } catch (error) { report.finalizationError = safe(error); }
    await db.$disconnect(); report.passed = report.journeys.length === 2 && report.journeys.every(row => row.passed) && report.sourceStable && report.outsideUnchanged && report.financialUnchanged && !report.error && !report.finalizationError;
    const filename = path.join(__dirname, 'close-evidence-ambiguity-browser-' + run + '.json'); fs.writeFileSync(filename, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ filename, passed: report.passed, error: report.error }));
  }
  return report;
}
if (require.main === module && process.argv[2] === '--run') main().then(report => process.exit(report.passed ? 0 : 1)).catch(error => { console.error(error.code || error.name); process.exit(1); });
