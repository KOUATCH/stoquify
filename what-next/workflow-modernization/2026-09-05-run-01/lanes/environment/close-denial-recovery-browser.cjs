// Author-only until the coordinator releases the frozen source and owned DB lane.
// Actual local application/authentication/services; synthetic actors are not customer approval.
if (require.main === module && process.argv[2] !== '--run') {
  console.log('Prepared only. Use --run after coordinated source freeze and set STOQUIFY_CLOSE_BROWSER_LISTENER_PID to the verified owned 3110 listener.');
} else {
  const d = require('./close-denial-recovery-runtime.cjs');
  const { f, db, helper, root, organizations } = d.h, { fs, path, crypto, assert } = f;
  const { execFileSync } = require('node:child_process');
  const { chromium, expect: baseExpect } = require('@playwright/test');
  const expect = baseExpect.configure({ timeout: 60000 });
  const { hashPassword } = require(path.join(root, 'lib/password.ts'));
  const { stableJsonStringify } = require(path.join(root, 'services/events/business-event.service.ts'));
  const base = 'http://127.0.0.1:3110', run = crypto.randomUUID(), secrets = [];
  const files = [
    'hooks/accounting/useCloseAssurance.ts', 'components/accounting/CloseAssuranceCenter.tsx',
    'components/accounting/CloseReadinessJourneyPanel.tsx', 'services/accounting/close-assurance-current-proof.ts',
    'actions/accounting/close-assurance.actions.ts', 'actions/security/step-up-auth.actions.ts',
    'app/[locale]/(dashboard)/dashboard/accounting/close/page.tsx',
    'app/[locale]/(dashboard)/dashboard/accounting/accounting-route-access.tsx',
    'app/[locale]/(dashboard)/dashboard/layout.tsx', 'services/modules/module-entitlement.service.ts',
    'services/_shared/protect.ts', 'lib/providers/query-provider.tsx', 'lib/password.ts',
    'lib/dashboard/snapshot-blocker-presentation.ts', 'lib/dashboard/snapshot-source-blocker-presentation.ts',
    'lib/security/auth-session.ts', 'services/modules/module-catalog.service.ts',
    'what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/close-denial-recovery-browser.cjs',
  ];
  const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const sources = () => ({ ...d.sources(), ...Object.fromEntries(files.map(file => [file, sha(fs.readFileSync(path.join(root, file)))])) });
  const copy = {
    en: {
      title: 'Close & Assurance Center', proof: 'Current close evidence', operational: 'Operational evidence', certified: 'Current certification evidence',
      review: 'Review required', invalidated: 'Close evidence has been invalidated', export: 'Export certified JSON', refresh: 'Refresh',
      denied: 'Certification was refused. Review current close evidence and resolve the reported conditions. If evidence is missing, changed or unavailable, run a new assessment. Then a different authorized person can certify it.',
      identity: 'Confirm your identity', password: 'Current password', verify: 'Verify identity', verified: 'Identity verified. Retry your selected action.',
      comment: 'Add source-linked review notes for this finding.', waiver: 'Document the compensating control or management-approved reason for this waiver request.',
      reviewNotes: 'Decision notes', recorded: 'Recorded status: ',
    },
    fr: {
      title: 'Centre De Cloture', proof: 'Preuves actuelles de clôture', operational: 'Preuves opérationnelles', certified: 'Preuves de certification à jour',
      review: 'Examen requis', invalidated: 'Les preuves de clôture ont été invalidées', export: 'Exporter JSON certifie', refresh: 'Actualiser',
      denied: 'Certification refusée. Examinez les preuves et corrigez les causes signalées. Si des preuves manquent, ont changé ou sont indisponibles, lancez une nouvelle évaluation. Une autre personne autorisée pourra certifier.',
      identity: 'Confirmez votre identité', password: 'Mot de passe actuel', verify: 'Vérifier l’identité', verified: 'Identité vérifiée. Réessayez l’action choisie.',
      comment: 'Ajouter des notes de revue liees a la source de ce constat.', waiver: 'Documenter le controle compensatoire ou la raison approuvee pour cette derogation.',
      reviewNotes: 'Notes de decision', recorded: 'Statut enregistré : ',
    },
  };
  const report = {
    run, at: new Date().toISOString(), journeys: [],
    scope: 'Two fresh owned local organizations, actual READY/T4 assessments and actual password sign-in. A submitted zero-variance count is posted only after each Close page is ready; certified export must refuse changed evidence and automatically reload blocked proof. A new assessment by the original maker is then manually refreshed and certified/downloaded by the separate authenticated certifier. No HTTP mocks, live activation, migrations, seeds, external origins or delivery workers. Fixture accounting setup posts one explicitly synthetic balanced journal per organization before operation fingerprints.',
    limitations: [
      'System certification evidence only; synthetic actors and count sheets do not establish professional, statutory or customer approval.',
      'Notes are filled only where the real assessed run exposes enabled fields; no finding is fabricated to enable a form.',
      'Keyboard/focus/reflow/reduced-motion observations are bounded browser checks, not screen-reader, contrast or accessibility certification.',
      'Financial stability excludes initial fixture setup and compares the explicitly enumerated financial models; source count status, evidence, exports and normal authentication/audit records are expected to change.',
      'No HTTP failure is injected; failed refresh is covered by focused hook/component tests, separately from these actual-response journeys.',
      'Recovery concerns the newly selected close run only. Cash aggregate obligations can still include the retained old blocked run; this verifier makes no Cash recovery claim.',
      'Existing export identity ambiguity: the document exportId is generated separately from the persisted ClosePackExport record ID. The verifier records both and binds the artifact through tenant, run, watermark and canonical content hash, then verifies the persisted certification and audit links. It does not assert the two IDs are equal.',
    ],
  };
  function listener() {
    const expected = Number(process.env.STOQUIFY_CLOSE_BROWSER_LISTENER_PID);
    assert.ok(Number.isSafeInteger(expected) && expected > 0, 'A verified owned listener PID is required before fixture creation');
    const escapedRoot = root.toLowerCase().replaceAll("'", "''");
    const command = `$ErrorActionPreference='Stop'; $rows=@(Get-NetTCPConnection -LocalPort 3110 -State Listen); if($rows.Count -ne 1){throw 'Expected one owned listener'}; $row=$rows[0]; $proc=Get-CimInstance Win32_Process -Filter ('ProcessId='+$row.OwningProcess); $parent=Get-CimInstance Win32_Process -Filter ('ProcessId='+$proc.ParentProcessId); $commands=(@($proc.CommandLine,$parent.CommandLine) -join ' '); [pscustomobject]@{address=$row.LocalAddress;pid=$proc.ProcessId;parentPid=$parent.ProcessId;workspaceMatches=$commands.ToLowerInvariant().Contains('${escapedRoot}');nextDevelopmentCommand=($commands -match 'next.+dev.+-p.+3110')} | ConvertTo-Json -Compress`;
    const state = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8', windowsHide: true, timeout: 30000 }).trim());
    assert.equal(state.address, '127.0.0.1'); assert.equal(state.pid, expected);
    assert.equal(state.workspaceMatches, true); assert.equal(state.nextDevelopmentCommand, true);
    return { ...state, checkedAt: new Date().toISOString() };
  }
  async function outside() {
    const existing = await d.outside(), user = { organizationId: { notIn: organizations } };
    const accounts = await db.account.findMany({ where: { user }, orderBy: { id: 'asc' } });
    const sessions = await db.session.findMany({ where: { user }, orderBy: { id: 'asc' } });
    // Fingerprint authentication records without returning credentials or tokens.
    return { hash: f.hash({ existing: existing.hash, accounts: f.hash(accounts), sessions: f.hash(sessions) }), existing };
  }
  async function browserFixture(locale) {
    let x = await d.prepareFixture('browser-' + locale);
    assert.ok(organizations.includes(x.organizationId));
    assert.ok((await db.organization.findUniqueOrThrow({ where: { id: x.organizationId } })).name.startsWith(helper.prefix));
    const role = await db.role.findFirstOrThrow({ where: { organizationId: x.organizationId, code: 'owned-close-verifier' } });
    assert.equal(role.nameEn, 'Synthetic local close verifier only');
    const addedPermissions = ['dashboard.read', 'accounting.close.finding.assign', 'accounting.close.finding.comment', 'accounting.close.waiver.request', 'accounting.close.accountant.review'];
    const permissions = [...new Set([...role.permissions, ...addedPermissions])];
    await db.role.update({ where: { id: role.id }, data: { permissions } });
    const modules = ['dashboard', 'finance', 'accounting', 'close_assurance', 'payment_reconciliation'];
    assert.equal(await db.tenantModuleConfiguration.count({ where: { organizationId: x.organizationId } }), 0);
    await db.tenantModuleConfiguration.create({ data: { organizationId: x.organizationId, manifestHash: 'owned-close-browser-' + run, selectedModules: modules, activeModules: modules } });
    await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ organizationId: x.organizationId, moduleSlug, status: 'active', source: 'requested_modules', metadata: { syntheticLocalTest: true, liveActivation: false } })) });
    const password = 'Owned-close-denial-' + crypto.randomUUID() + '!'; secrets.push(password);
    const passwordHash = await hashPassword(password); secrets.push(passwordHash);
    const actor = await db.user.update({ where: { id: x.certifierId }, data: { password: passwordHash, emailVerified: true } });
    assert.equal(actor.organizationId, x.organizationId); assert.notEqual(actor.id, x.makerId);
    await db.account.create({ data: { userId: actor.id, accountId: actor.id, providerId: 'credential', password: passwordHash } });
    // Establish READY under the exact managed grants used by the browser, not
    // the broader legacy access that existed before this fixture configuration.
    x = await d.assessment(x, 'browser-authorized-' + locale);
    return { x, actor, password, permissions, modules };
  }
  async function journey(browser, fixture, locale, width) {
    const { x, actor, password } = fixture, c = copy[locale];
    const row = { locale, width, organizationId: x.organizationId, initialCloseRunId: x.closeRunId, makerId: x.makerId, certifierId: actor.id,
      passed: false, screenshots: [], pageErrors: [], blockedOrigins: [], requests: [], manualExports: [], steps: [], noteFields: [], keyboard: [] };
    let context, page, stage = 'initial', downloads = [], noteFields = [];
    const shot = async name => {
      const file = 'close-denial-recovery-browser-' + run + '-' + locale + width + '-' + name + '.png';
      await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled', caret: 'initial' }); row.screenshots.push(file);
    };
    const layout = async locator => {
      const state = await locator.evaluate(element => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth,
        width: element.clientWidth, scrollWidth: element.scrollWidth, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches }));
      assert.ok(state.documentWidth <= state.viewport + 1, 'Close page must not overflow horizontally');
      assert.ok(state.scrollWidth <= state.width + 1, 'Current evidence/guidance must reflow inside its region');
      assert.equal(state.reducedMotion, true); return state;
    };
    const retainedNotes = async () => { for (const field of noteFields) await expect(field.locator).toHaveValue(field.value); };
    const press = async (button, label) => {
      await button.scrollIntoViewIfNeeded(); await button.focus(); await expect(button).toBeFocused();
      const focus = await button.evaluate(element => { const style = getComputedStyle(element); return { focused: document.activeElement === element, outline: style.outlineStyle, outlineWidth: style.outlineWidth, boxShadow: style.boxShadow }; });
      assert.ok(focus.focused && ((focus.outline !== 'none' && Number.parseFloat(focus.outlineWidth) > 0) || focus.boxShadow !== 'none'), 'Keyboard action needs visible focus');
      row.keyboard.push({ action: label, ...focus }); await page.keyboard.press('Enter');
    };
    const assertNoExport = async closeRunId => {
      assert.equal(downloads.length, 0, 'A refused export must not download an artifact');
      assert.equal(await db.closePackExport.count({ where: { organizationId: x.organizationId, closeRunId, isCertified: true } }), 0);
    };
    async function manualExport(closeRunId, expected) {
      const button = page.getByRole('button', { name: c.export, exact: true });
      const alert = page.locator('section[role="alert"]').filter({ hasText: c.denied });
      const identity = page.getByRole('form', { name: c.identity, exact: true });
      const requestsBefore = row.requests.length, downloadsBefore = downloads.length;
      const click = async label => { row.manualExports.push({ closeRunId, stage, label }); await press(button, label); };
      await expect(button).toBeEnabled(); await click(stage + '-export');
      const outcome = async () => {
        if (await identity.isVisible()) return 'identity';
        if (expected === 'denied' && await alert.isVisible()) return 'denied';
        if (expected === 'download' && downloads.length > downloadsBefore) return 'download';
        return 'pending';
      };
      await expect.poll(outcome, { timeout: 180000, intervals: [250, 500, 1000] }).not.toBe('pending');
      if (await outcome() === 'identity') {
        const beforeVerification = row.requests.length;
        await identity.getByLabel(c.password, { exact: true }).fill(password);
        await press(identity.getByRole('button', { name: c.verify, exact: true }), stage + '-verify-identity');
        await expect(page.getByText(c.verified, { exact: true })).toBeVisible();
        await expect(identity).not.toBeVisible(); await expect(button).toBeFocused();
        assert.equal(row.requests.length, beforeVerification, 'Identity verification must not automatically retry certification');
        assert.equal(downloads.length, downloadsBefore); await retainedNotes();
        row.steps.push({ id: stage + '-identity', manualVerification: true, noAutomaticExport: true, focusReturned: true });
        await click(stage + '-manual-retry-after-identity');
        await expect.poll(outcome, { timeout: 180000, intervals: [250, 500, 1000] }).toBe(expected);
      } else assert.equal(await outcome(), expected);
      const manualCount = row.manualExports.filter(item => item.closeRunId === closeRunId).length;
      await expect.poll(() => row.requests.length - requestsBefore).toBe(manualCount);
      if (expected === 'denied') { await expect(alert).toBeVisible(); await expect(button).toBeDisabled(); await assertNoExport(closeRunId); }
      return { requestsBefore, requestsAfter: row.requests.length, manualCount };
    }
    try {
      context = await browser.newContext({ viewport: { width, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce', acceptDownloads: true });
      context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000);
      await context.route('**/*', route => {
        const origin = new URL(route.request().url()).origin;
        if (origin === base) return route.continue();
        if (!row.blockedOrigins.includes(origin)) row.blockedOrigins.push(origin); return route.abort();
      });
      const signed = await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password }, timeout: 180000, maxRedirects: 0 });
      assert.equal(signed.status(), 200, 'Actual synthetic certifier sign-in must succeed');
      page = await context.newPage();
      page.on('pageerror', error => row.pageErrors.push(f.safe(error, secrets)));
      page.on('download', download => downloads.push(download));
      page.on('request', request => {
        if (request.method() !== 'POST' || !request.headers()['next-action']) return;
        const text = request.postData() || '';
        // Observe only the safe run ID/mode classification; never retain passwords, cookies or action bodies.
        if (text.includes('closeRunId') && text.includes('CERTIFIED')) row.requests.push({ stage, at: new Date().toISOString(), actionId: request.headers()['next-action'] });
      });
      const began = Date.now();
      await page.goto(base + '/' + locale + '/dashboard/accounting/close', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: c.title, exact: true })).toBeVisible();
      const proof = page.getByRole('region', { name: c.proof, exact: true });
      await expect(proof.getByText(c.operational, { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: c.export, exact: true })).toBeEnabled();
      await expect(page.getByText(c.recorded + 'READY', { exact: true }).first()).toBeVisible();
      row.readyMs = Date.now() - began;
      for (const [name, locator] of [['comment', page.getByPlaceholder(c.comment, { exact: true })], ['waiver', page.getByPlaceholder(c.waiver, { exact: true })], ['review', page.getByRole('textbox', { name: c.reviewNotes, exact: true })]]) {
        const enabled = await locator.isVisible() && await locator.isEnabled();
        row.noteFields.push({ name, enabled, status: enabled ? 'filled' : 'not-applicable', reason: enabled ? undefined : 'Actual READY assessment has no selectable finding; disabled field is retained as presented. Draft retention for this field is separately unit-covered.' });
        if (enabled) { const value = (locale === 'fr' ? 'Notes de test non soumises — ' : 'Unsubmitted owned test notes — ') + name; await locator.fill(value); noteFields.push({ name, locator, value }); }
      }
      assert.ok(noteFields.some(field => field.name === 'review'), 'Authorized review notes must be available');
      row.initialLayout = await layout(proof); await proof.scrollIntoViewIfNeeded(); await shot('ready-evidence');
      const beforeHistoryHash = f.hash(await d.history(x));
      const operationBefore = await d.h.financial();
      stage = 'denial';
      const posted = await d.postPreparedCount(x);
      const changed = await d.denialState(x);
      assert.equal(changed.run.status, 'READY'); assert.equal(changed.events.length, 0);
      assert.equal((await d.h.financial()).hash, operationBefore.hash);
      row.sourceChange = { countSessionId: x.countSetup.countSessionId, eventId: posted.eventId, zeroVariance: posted.varianceLineCount === 0, originalEvidenceHash: x.evidenceHash };
      const denied = await manualExport(x.closeRunId, 'denied');
      await expect(proof.getByText(c.review, { exact: true })).toBeVisible();
      await expect(proof.getByText(c.invalidated, { exact: true })).toBeVisible();
      await expect(page.getByText(c.invalidated, { exact: true })).toHaveCount(2);
      await retainedNotes();
      const denial = await d.denialState(x);
      assert.equal(denial.run.status, 'BLOCKED'); assert.equal(denial.run.metadata.staleState.status, 'EVIDENCE_STALE');
      assert.equal(denial.events.length, 1); assert.equal(denial.outbox.length, 1); assert.equal(denial.audit.length, 1);
      assert.equal(f.hash(await d.history(x)), beforeHistoryHash);
      const retainedDenialHash = f.hash(denial), deniedRequestCount = row.requests.length;
      const alert = page.locator('section[role="alert"]').filter({ hasText: c.denied });
      row.denialLayout = await layout(alert); await alert.scrollIntoViewIfNeeded(); await shot('denied-actionable-alert');
      await proof.scrollIntoViewIfNeeded(); await shot('blocked-current-proof');
      row.steps.push({ id: 'denied-export-refresh', ...denied, currentProof: 'blocked', retainedNotes: noteFields.map(field => field.name), noDownload: true, invalidationEventId: denial.events[0].id, originalHistoryHash: beforeHistoryHash, originalHistoryUnchanged: true });
      stage = 'reassessment';
      const recovered = await d.assessment(x, 'browser-recovery-' + locale);
      assert.notEqual(recovered.closeRunId, x.closeRunId); assert.notEqual(recovered.evidenceHash, x.evidenceHash);
      const newRun = await db.closeRun.findUniqueOrThrow({ where: { id: recovered.closeRunId } });
      assert.equal(newRun.runById, x.makerId); assert.notEqual(newRun.runById, actor.id);
      assert.equal(row.requests.length, deniedRequestCount, 'Reassessment must not automatically export');
      await press(page.getByRole('button', { name: c.refresh, exact: true }), 'manual-read-refresh-after-assessment');
      await expect(proof.getByText(c.operational, { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: c.export, exact: true })).toBeEnabled();
      await expect(page.getByText(c.recorded + 'READY', { exact: true }).first()).toBeVisible();
      await retainedNotes(); await assertNoExport(recovered.closeRunId);
      assert.equal(row.requests.length, deniedRequestCount, 'Manual Refresh must repeat reads only');
      row.recoveredLayout = await layout(proof); await proof.scrollIntoViewIfNeeded(); await shot('reassessed-ready');
      stage = 'recovery-certification';
      const successful = await manualExport(recovered.closeRunId, 'download');
      assert.equal(downloads.length, 1, 'Recovery must download exactly one certified artifact');
      const artifact = 'close-denial-recovery-browser-' + run + '-' + locale + '-certified.json';
      const artifactPath = path.join(__dirname, artifact); assert.equal(fs.existsSync(artifactPath), false);
      await downloads[0].saveAs(artifactPath); assert.equal(await downloads[0].failure(), null);
      const bytes = fs.readFileSync(artifactPath), payload = JSON.parse(bytes.toString('utf8'));
      assert.equal(payload.export.mode, 'CERTIFIED'); assert.equal(payload.closeRun.id, recovered.closeRunId);
      assert.equal(payload.organization.id, x.organizationId); assert.equal(payload.export.generatedById, actor.id);
      assert.equal(payload.annexes.inventoryValuation.freshness.status, 'FRESH');
      assert.ok(payload.export.certificationLimitations.length > 0);
      const canonical = { ...payload, export: { ...payload.export } }; delete canonical.export.contentHash;
      assert.equal('sha256:' + sha(stableJsonStringify(canonical)), payload.export.contentHash);
      row.artifact = { file: artifact, suggestedFilename: downloads[0].suggestedFilename(), byteLength: bytes.length, fileSha256: sha(bytes), canonicalContentHash: payload.export.contentHash, documentExportId: payload.export.exportId, systemCertificationOnly: true };
      const matches = await db.closePackExport.findMany({ where: { organizationId: x.organizationId, closeRunId: recovered.closeRunId, watermarkId: payload.export.watermarkId, contentHash: payload.export.contentHash } });
      assert.equal(matches.length, 1, 'Downloaded tenant/run/watermark/content hash must identify exactly one retained export');
      const stored = matches[0];
      assert.equal(stored.isCertified, true); assert.equal(stored.contentHash, payload.export.contentHash); assert.equal(stored.exportedById, actor.id);
      const certifiedRun = await db.closeRun.findFirstOrThrow({ where: { id: recovered.closeRunId, organizationId: x.organizationId, periodId: x.periodId } });
      assert.equal(certifiedRun.status, 'CERTIFIED'); assert.equal(certifiedRun.metadata.certifiedExportId, stored.id);
      assert.equal(certifiedRun.metadata.certifiedContentHash, stored.contentHash); assert.equal(certifiedRun.metadata.certifiedById, actor.id);
      const audits = await db.ledgerAuditEvent.findMany({ where: { organizationId: x.organizationId, resourceType: 'ClosePackExport', resourceId: stored.id, action: 'CLOSE_PACK_CERTIFIED_EXPORT' } });
      assert.equal(audits.length, 1, 'Exactly one certification audit must reference the retained export record');
      assert.equal(audits[0].actorId, actor.id); assert.equal(audits[0].metadata.closeRunId, recovered.closeRunId);
      assert.equal(audits[0].metadata.contentHash, stored.contentHash); assert.equal(audits[0].metadata.watermarkId, stored.watermarkId);
      Object.assign(row.artifact, { recordExportId: stored.id, documentAndRecordIdsMatch: payload.export.exportId === stored.id,
        existingIdentityAmbiguity: payload.export.exportId !== stored.id, contentHashMatchesStored: true,
        binding: 'organizationId + closeRunId + watermarkId + contentHash; exactly one record', certifiedRunMetadataMatches: true, auditEventId: audits[0].id, auditResourceMatches: true });
      await expect(proof.getByText(c.certified, { exact: true })).toBeVisible(); await retainedNotes();
      await proof.scrollIntoViewIfNeeded(); await shot('certified-current-evidence');
      assert.equal(f.hash(await d.denialState(x)), retainedDenialHash);
      assert.equal(f.hash(await d.history(x)), beforeHistoryHash);
      assert.equal(await db.closePackExport.count({ where: { organizationId: x.organizationId, closeRunId: x.closeRunId, isCertified: true } }), 0);
      assert.equal(row.requests.length, row.manualExports.length, 'Each certified request requires a recorded manual action');
      const operationAfter = await d.h.financial(); assert.equal(operationAfter.hash, operationBefore.hash);
      row.steps.push({ id: 'manual-reassessment-certification-recovery', ...successful, newCloseRunId: recovered.closeRunId, makerId: newRun.runById, certifierId: actor.id, oldBlockedHistoryRetained: true, notesRetained: true });
      row.financial = { before: operationBefore, after: operationAfter, noOperationFinancialEffects: true };
      row.passed = row.pageErrors.length === 0;
    } catch (error) {
      row.error = f.safe(error, secrets); row.stack = f.safe(error.stack || error, secrets); row.failedStage = stage;
      if (error.prerequisite) row.prerequisite = {
        closeRunId: error.prerequisite.closeRunId, status: error.prerequisite.status,
        trustLevel: error.prerequisite.trustLevel, portalTrustLevel: error.prerequisite.portalTrustLevel,
        blockers: error.prerequisite.blockers, inventoryAnnexStatus: error.prerequisite.inventoryAnnex?.blockerStatus,
      };
      try {
        const latest = await db.closeRun.findFirst({ where: { organizationId: x.organizationId, periodId: x.periodId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          select: { id: true, status: true, checklistItems: { where: { organizationId: x.organizationId, status: { in: ['FAILED', 'UNAVAILABLE'] } },
            select: { key: true, status: true, severity: true, blockerReason: true } }, findings: { where: { organizationId: x.organizationId, status: { in: ['OPEN', 'ASSIGNED', 'IN_REVIEW', 'REOPENED'] } },
            select: { title: true, detail: true, severity: true, sourceService: true } } } });
        row.failedAssessment = latest && { id: latest.id, status: latest.status,
          checklist: latest.checklistItems.map(item => ({ ...item, blockerReason: item.blockerReason ? f.safe(item.blockerReason, secrets) : null })),
          findings: latest.findings.map(item => ({ ...item, title: f.safe(item.title, secrets), detail: f.safe(item.detail, secrets) })) };
        if (page && !page.isClosed()) row.visibleAlerts = (await page.locator('section[role="alert"]').allTextContents()).map(text => f.safe(text, secrets));
      } catch (diagnosticError) { row.diagnosticError = f.safe(diagnosticError, secrets); }
      if (page && !page.isClosed()) await shot('failed-' + stage).catch(() => {});
    } finally { if (context) await context.close(); }
    console.log(JSON.stringify({ locale, width, passed: row.passed, failedStage: row.failedStage, error: row.error })); return row;
  }
  async function main() {
    report.listenerBefore = listener(); await helper.withClient(f.target, helper.assertOwned);
    report.sourcesBefore = sources(); report.outsideBefore = await outside(); report.financialBeforeFixtureSetup = await d.h.financial();
    const fixtures = [];
    for (const locale of ['en', 'fr']) fixtures.push(await browserFixture(locale));
    report.fixtures = fixtures.map(({ x, permissions, modules }) => ({ organizationId: x.organizationId, closeRunId: x.closeRunId, makerId: x.makerId, certifierId: x.certifierId, countSessionId: x.countSetup.countSessionId, countSheetHash: x.countSetup.countSheetHash, permissions, modules, syntheticLocalOnly: true }));
    report.financialAfterFixtureSetup = await d.h.financial();
    const browser = await chromium.launch({ headless: true });
    try { for (const [index, view] of [['en', 1440], ['fr', 320]].entries()) report.journeys.push(await journey(browser, fixtures[index], ...view)); }
    finally { await browser.close(); }
  }
  async function runMain() {
    try { await main(); } catch (error) {
      report.error = f.safe(error, secrets); report.failureKind = error.prerequisite ? 'blocked-prerequisite' : 'failed';
      if (error.prerequisite) report.prerequisite = { closeRunId: error.prerequisite.closeRunId, status: error.prerequisite.status,
        trustLevel: error.prerequisite.trustLevel, portalTrustLevel: error.prerequisite.portalTrustLevel, blockers: error.prerequisite.blockers };
    }
    finally {
      try {
        report.listenerAfter = listener(); report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
        report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore?.hash === report.outsideAfter.hash;
        report.financialAfterOperations = await d.h.financial(); report.noOperationFinancialEffects = report.financialAfterFixtureSetup?.hash === report.financialAfterOperations.hash;
      } catch (error) { report.finalizationError = f.safe(error, secrets); }
      report.fixtureOrganizations = [...organizations];
      report.passed = !report.error && !report.finalizationError && report.journeys.length === 2 && report.journeys.every(row => row.passed) && report.sourceStable && report.outsideUnchanged && report.noOperationFinancialEffects;
      const file = path.join(__dirname, 'close-denial-recovery-browser-' + run + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      console.log(JSON.stringify({ file, passed: report.passed, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged, noOperationFinancialEffects: report.noOperationFinancialEffects }));
      await db.$disconnect(); if (!report.passed) process.exitCode = 1;
    }
  }
  module.exports = { sources, browserFixture, journey };
  if (require.main === module) runMain();
}
