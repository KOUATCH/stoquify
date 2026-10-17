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
    assert.ok(/^close-request-supervision-[a-f0-9-]{36}\.json$/.test(name || '')); assert.ok(/^[a-f0-9]{64}$/.test(hash || ''));
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
    await db.role.create({ data: { organizationId: x.organizationId, code: 'replacement-browser-' + run, nameEn: 'Synthetic dashboard access', permissions: ['dashboard.read'], users: { connect: Object.values(x.actorIds).map(id => ({ id })) } } });
    await db.role.create({ data: { organizationId: x.organizationId, code: 'supervision-browser-' + run, nameEn: 'Synthetic Close supervisor', permissions: ['accounting.close.read', 'accounting.close.evidence.request', 'accounting.close.finding.assign', 'accounting.close.accountant.review'], users: { connect: { id: x.actorIds.checker } } } }); return identities;
  }
  async function journey(browser, identities, locale, width) {
    const copy = copies[locale], row = { locale, width, passed: false, screenshots: [], timings: [], errors: [], blockedOrigins: [], viewports: [] }; let context, page, panel, session, stage = 'setup';
    const press = async target => { await expect(target).toBeEnabled(); await target.scrollIntoViewIfNeeded(); await target.focus(); await expect(target).toBeFocused(); await page.keyboard.press('Enter'); };
    const shot = async name => { const file = `close-request-supervision-browser-${run}-${locale}-${name}.png`; await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled' }); row.screenshots.push(file); };
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
      await open('maker'); const control = { actorId: x.actorIds.maker, session: { id: session.id, token: session.token } };
      const originalCollector = payment.getPaymentReconciliationDashboardData; let adverse;
      try { payment.getPaymentReconciliationDashboardData = async () => { throw Error('Explicit owned browser collector fault'); }; adverse = await service.runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: 'replacement-browser-' + locale + run }, control); }
      finally { payment.getPaymentReconciliationDashboardData = originalCollector; }
      const finding = await db.closeAssuranceFinding.findFirstOrThrow({ where: { organizationId: x.organizationId, closeRunId: adverse.run.id, checklistItem: { key: 'payment-reconciliation' } } });
      const missing = await db.closeEvidenceItem.findMany({ where: { organizationId: x.organizationId, closeRunId: adverse.run.id, available: false }, orderBy: { id: 'asc' } }); assert.ok(missing.length);
      await service.runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: 'replacement-browser-restored-' + locale + run }, control);
      const request = await service.requestMissingCloseEvidence(x.organizationId, { findingId: finding.id, requestedFromId: x.actorIds.checker, requestText: 'Synthetic browser replacement request ' + locale + run, dueAt: new Date(Date.now() + 86400000), correlationId: 'replacement-browser-request-' + locale + run }, control);
      const original = await db.accountantComment.findUniqueOrThrow({ where: { id: request.id } });
      await db.user.update({ where: { id: x.actorIds.maker, organizationId: x.organizationId }, data: { isActive: false } });
      stage = 'supervisor-discovery'; await open('checker');
      const tracking = panel.getByRole('region', { name: copy.supervisionTitle, exact: true }), retainedRow = tracking.getByRole('listitem').filter({ hasText: copy.reference + ': ' + request.id });
      await expect(retainedRow.getByText(copy.requesterUnavailable, { exact: true })).toBeVisible();
      assert.equal(await panel.getByRole('region', { name: copy.trackingTitle, exact: true }).getByRole('listitem').filter({ hasText: copy.reference + ': ' + request.id }).count(), 0); row.managerDiscoveredRequest = true; row.ownTrackingStayedSeparate = true;
      stage = 'replacement-draft'; await press(retainedRow.getByRole('button', { name: copy.replace, exact: true }));
      const reason = locale === 'fr' ? 'Le collègue est indisponible. Transférer la responsabilité sans modifier la demande ni son échéance.' : 'The colleague is unavailable. Transfer responsibility without changing the request or deadline.';
      await panel.getByRole('combobox', { name: copy.recipient, exact: true }).selectOption(x.actorIds.certifier); await panel.getByRole('textbox', { name: copy.replaceReason, exact: true }).fill(reason);
      await page.reload({ waitUntil: 'domcontentloaded' }); await expect(panel.getByRole('textbox', { name: copy.replaceReason, exact: true })).toHaveValue(reason); await expect(panel.getByRole('combobox', { name: copy.recipient, exact: true })).toHaveValue(x.actorIds.certifier); row.draftRetained = true;
      for (const viewport of [1440, 768, 320]) { await page.setViewportSize({ width: viewport, height: 1000 }); await panel.getByRole('textbox', { name: copy.replaceReason, exact: true }).scrollIntoViewIfNeeded(); const size = await panel.evaluate(element => ({ viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, width: element.clientWidth, content: element.scrollWidth, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches })); assert.ok(size.content <= size.width + 1); assert.ok(size.pageWidth <= viewport + 1); assert.equal(size.reducedMotion, true); row.viewports.push(size); await shot('draft-' + viewport); }
      stage = 'replace'; await press(panel.getByRole('button', { name: copy.confirmReplace, exact: true })); await expect(panel.getByText(copy.replaceSaved, { exact: true })).toBeFocused(); await expect(panel.getByText(copy.loading, { exact: true })).not.toBeVisible();
      assert.deepEqual(await db.accountantComment.findUniqueOrThrow({ where: { id: request.id } }), original);
      const changes = await db.ledgerAuditEvent.findMany({ where: { organizationId: x.organizationId, resourceId: request.id, action: 'CLOSE_MISSING_EVIDENCE_RECIPIENT_REPLACED' } }); assert.equal(changes.length, 1); assert.equal(changes[0].metadata.reason, reason); row.changeId = changes[0].id; await expect(retainedRow).toContainText(reason); row.originalRequestPreserved = true;
      stage = 'former-recipient'; await open('checker'); assert.equal(await panel.getByRole('listitem').filter({ hasText: copy.reference + ': ' + request.id, has: page.getByRole('button', { name: copy.respond, exact: true }) }).count(), 0); row.formerRecipientQueueRemoved = true;
      stage = 'new-recipient-response'; await open('certifier'); const assigned = panel.getByRole('listitem').filter({ hasText: copy.reference + ': ' + request.id }); await press(assigned.getByRole('button', { name: copy.respond, exact: true }));
      const responseText = locale === 'fr' ? 'Le collecteur est rétabli. Examiner la nouvelle source conservée.' : 'The collector is restored. Review the newer retained source.';
      await panel.getByRole('textbox', { name: copy.text, exact: true }).fill(responseText); await press(panel.getByRole('button', { name: copy.submitResponse, exact: true })); await expect(panel.getByText(copy.responseSaved, { exact: true })).toBeFocused(); row.newRecipientResponded = true;
      stage = 'independent-review'; await open('checker'); const review = panel.getByRole('listitem').filter({ has: page.getByRole('button', { name: copy.review, exact: true }), hasText: copy.reference + ': ' + request.id }); await press(review.getByRole('button', { name: copy.review, exact: true })); await expect(panel.getByText(responseText, { exact: true })).toBeVisible();
      await panel.getByRole('textbox', { name: copy.notes, exact: true }).fill(locale === 'fr' ? 'Revue indépendante de la réponse et de la nouvelle source conservée.' : 'Independent review of the response and the newer retained source.'); await panel.getByRole('checkbox', { name: copy.checked, exact: true }).check();
      await press(panel.getByRole('button', { name: copy.accept, exact: true })); await expect(panel.getByText(copy.accepted, { exact: true })).toBeFocused(); await expect(panel.getByText(copy.loading, { exact: true })).not.toBeVisible();
      const acceptance = await db.accountantComment.findMany({ where: { organizationId: x.organizationId, findingId: finding.id, visibility: 'ACCOUNTANT_RESPONSE_ACCEPTED' } }); assert.equal(acceptance.length, 1); assert.equal(acceptance[0].authorId, x.actorIds.checker); row.acceptanceId = acceptance[0].id;
      assert.equal((await db.closeAssuranceFinding.findUniqueOrThrow({ where: { id: finding.id } })).status, 'RESOLVED'); assert.deepEqual(await db.closeEvidenceItem.findMany({ where: { organizationId: x.organizationId, closeRunId: adverse.run.id, available: false }, orderBy: { id: 'asc' } }), missing);
      stage = 'retained-history'; const finalRow = panel.getByRole('region', { name: copy.supervisionTitle, exact: true }).getByRole('listitem').filter({ hasText: copy.reference + ': ' + request.id }); await expect(finalRow.getByText(copy.trackingStates.ACCEPTED, { exact: true })).toBeVisible(); await expect(finalRow).toContainText(reason); assert.equal(await finalRow.getByRole('button', { name: copy.replace, exact: true }).count(), 0); await finalRow.scrollIntoViewIfNeeded(); await shot('accepted-history'); row.acceptedHistoryRetained = true;
      assert.equal((await db.user.findUniqueOrThrow({ where: { id: x.actorIds.maker } })).isActive, false); row.originalRequesterInactiveThroughout = true;
      assert.deepEqual(await db.accountantComment.findUniqueOrThrow({ where: { id: request.id } }), original); row.originalRequestPreservedThroughAcceptance = true;
      assert.deepEqual(await h.financial(), report.financialBefore); row.passed = row.errors.length === 0;
    } catch (error) { row.error = safe(error); row.failedStage = stage; if (page) await shot('failure-' + stage).catch(() => {}); }
    finally { if (context) await context.close(); await db.user.update({ where: { id: x.actorIds.maker, organizationId: x.organizationId }, data: { isActive: true } }); }
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
    const filename = path.join(__dirname, 'close-request-supervision-browser-' + run + '.json'); fs.writeFileSync(filename, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ filename, passed: report.passed, error: report.error }));
  }
  return report;
}
if (require.main === module && process.argv[2] === '--run') main().then(report => process.exit(report.passed ? 0 : 1)).catch(error => { console.error(error.code || error.name); process.exit(1); });
