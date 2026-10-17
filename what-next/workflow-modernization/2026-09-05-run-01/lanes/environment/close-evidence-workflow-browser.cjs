"use strict";
// Local synthetic verification only; inert without --run and exact receipt/PID bindings.
async function main() {
  const h = require('./close-pack-write-race-runtime.cjs'), { f, db, root, helper } = h, { fs, path, crypto, assert } = f;
  const { chromium, expect: baseExpect } = require('@playwright/test'), { execFileSync } = require('node:child_process');
  const load = name => require(path.join(root, name)), service = load('services/accounting/close-assurance.service.ts'), payment = load('services/reconciliation/payment-reconciliation-dashboard.service.ts');
  const workflow = load('services/accounting/close-evidence-workflow.service.ts'), { hashPassword } = load('lib/password.ts');
  const { stepUpSessionWithPassword } = load('services/security/step-up-auth.service.ts'), copyByLocale = load('components/accounting/close-evidence-workflow-copy.ts').closeEvidenceWorkflowCopy;
  const run = crypto.randomUUID(), base = 'http://127.0.0.1:3110', expect = baseExpect.configure({ timeout: 60000 }), secrets = [];
  const sha = value => crypto.createHash('sha256').update(value).digest('hex'), safe = error => f.safe(error, secrets);
  const product = ['components/accounting/CloseEvidenceWorkflowPanel.tsx', 'components/accounting/close-evidence-workflow-copy.ts', 'components/accounting/CloseAssuranceCenter.tsx', 'actions/accounting/close-evidence-workflow.actions.ts', 'actions/accounting/close-assurance.actions.ts', 'actions/security/step-up-auth.actions.ts', 'services/_shared/protect.ts', 'services/accounting/close-evidence-workflow.service.ts', 'app/[locale]/(dashboard)/dashboard/accounting/close/page.tsx', 'services/security/step-up-auth.service.ts', 'next.config.mjs'];
  const sources = () => ({ ...h.sources(), ...Object.fromEntries([__filename, ...product.map(file => path.join(root, file))].map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
  const report = { run, at: new Date().toISOString(), journeys: [], limitations: ['Owned synthetic runtime fixture only; passwords, sessions and role assignments are local test data.', 'Explicit payment-collector fault injection creates genuine missing-evidence assessments; source observations and acceptance use actual services.', 'No migration, seed, reset, real payment, external message, live activation or professional approval.', 'Development latency is observational; browser coverage is limited to the recorded journeys and viewport checks.'] };
  let x;
  function listener() {
    const pid = Number(process.env.STOQUIFY_CLOSE_BROWSER_PID); assert.ok(Number.isSafeInteger(pid) && pid > 0);
    const escaped = root.toLowerCase().replaceAll("'", "''"), command = `$ErrorActionPreference='Stop'; $rows=@(Get-NetTCPConnection -LocalPort 3110 -State Listen); if($rows.Count -ne 1){throw 'Expected one listener'}; $p=Get-CimInstance Win32_Process -Filter ('ProcessId='+$rows[0].OwningProcess); $q=Get-CimInstance Win32_Process -Filter ('ProcessId='+$p.ParentProcessId); $commands=(@($p.CommandLine,$q.CommandLine) -join ' '); [pscustomobject]@{address=$rows[0].LocalAddress;pid=$p.ProcessId;workspaceMatches=$commands.ToLowerInvariant().Contains('${escaped}');nextDevelopmentCommand=($commands -match 'next.+dev.+-p.+3110')}|ConvertTo-Json -Compress`;
    const value = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8', windowsHide: true, timeout: 30000 }).trim());
    assert.equal(value.pid, pid); assert.equal(value.address, '127.0.0.1'); assert.equal(value.workspaceMatches, true); assert.equal(value.nextDevelopmentCommand, true); return value;
  }
  function predecessor() {
    const name = process.env.STOQUIFY_CLOSE_BROWSER_RECEIPT, hash = process.env.STOQUIFY_CLOSE_BROWSER_SHA;
    assert.ok(/^(close-evidence-workflow-runtime|close-request-uniqueness)-[a-f0-9-]{36}\.json$/.test(name || '')); assert.ok(/^[a-f0-9]{64}$/.test(hash || ''));
    const bytes = fs.readFileSync(path.join(__dirname, name)); assert.equal(sha(bytes), hash); const value = JSON.parse(bytes);
    for (const flag of ['passed', 'sourceStable', 'outsideUnchanged', 'financialUnchanged']) assert.equal(value[flag], true);
    for (const file of ['services/accounting/close-assurance.service.ts', 'services/accounting/close-evidence-workflow.service.ts']) assert.equal(sha(fs.readFileSync(path.join(root, file))), value.sourceAfter[file]);
    assert.equal(value.fixture.synthetic, true); assert.ok(value.fixture.organizationId.startsWith('workflow_close_write_'));
    x = value.fixture; h.organizations.push(x.organizationId); report.predecessor = { name, sha256: hash, organizationId: x.organizationId, periodId: x.periodId }; return value;
  }
  async function outside() {
    const snapshot = await h.outside(), other = {};
    for (const model of ['account', 'session']) other[model] = f.hash(await db[model].findMany({ where: { user: { organizationId: { notIn: h.organizations } } }, orderBy: { id: 'asc' } }));
    other.comments = f.hash(await db.accountantComment.findMany({ where: { organizationId: { notIn: h.organizations } }, orderBy: { id: 'asc' } }));
    return { hash: f.hash({ snapshot, other }), snapshot, other };
  }
  async function credentials() {
    const result = {};
    for (const [name, actorId] of Object.entries(x.actorIds)) {
      const password = 'Owned-close-' + crypto.randomUUID() + '!'; secrets.push(password); const hashed = await hashPassword(password); secrets.push(hashed);
      const user = await db.user.update({ where: { id: actorId, organizationId: x.organizationId }, data: { password: hashed, emailVerified: true } });
      const account = await db.account.findFirst({ where: { userId: actorId, accountId: actorId, providerId: 'credential' }, select: { id: true } });
      if (account) await db.account.update({ where: { id: account.id }, data: { password: hashed } });
      else await db.account.create({ data: { userId: actorId, accountId: actorId, providerId: 'credential', password: hashed } }); result[name] = { user, password };
    }
    await db.role.create({ data: { organizationId: x.organizationId, code: 'browser-dashboard-' + run, nameEn: 'Synthetic dashboard access', permissions: ['dashboard.read'], users: { connect: Object.values(x.actorIds).map(id => ({ id })) } } });
    return result;
  }
  async function journey(browser, identities, locale, width) {
    const copy = copyByLocale[locale], row = { locale, width, passed: false, screenshots: [], timings: [], errors: [], blockedOrigins: [], continuation: { findings: 0, recipients: 0, requests: 0, reviews: 0, tracking: 0 } }; let context, page, scope, credential, panel, stage = 'setup';
    const actor = actorId => ({ organizationId: x.organizationId, actorId });
    const screenshot = async name => { const filename = `close-evidence-browser-${run}-${locale}-${name}.png`; await page.screenshot({ path: path.join(__dirname, filename), animations: 'disabled' }); row.screenshots.push(filename); };
    const press = async target => { await expect(target).toBeEnabled(); await target.scrollIntoViewIfNeeded(); await target.focus(); await expect(target).toBeFocused(); await page.keyboard.press('Enter'); };
    const financial = async () => assert.deepEqual(await h.financial(), report.financialBefore);
    const records = async () => db.accountantComment.findMany({ where: { organizationId: x.organizationId }, orderBy: { id: 'asc' } });
    const more = async kind => { assert.ok(row.continuation[kind] < 10); await press(panel.getByRole('button', { name: copy.more[kind], exact: true })); await expect(panel.getByText(copy.loading, { exact: true })).not.toBeVisible(); await expect(panel.getByText(copy.pageLoaded, { exact: true })).toBeVisible(); row.continuation[kind]++; };
    const open = async who => {
      if (context) await context.close(); credential = identities[who]; context = await browser.newContext({ viewport: { width, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce' }); context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000);
      await context.route('**/*', route => { const origin = new URL(route.request().url()).origin; if (origin === base) return route.continue(); if (!row.blockedOrigins.includes(origin)) row.blockedOrigins.push(origin); return route.abort(); });
      const before = new Set((await db.session.findMany({ where: { userId: credential.user.id }, select: { id: true } })).map(item => item.id));
      const login = await context.request.post(base + '/api/auth/sign-in/email', { data: { email: credential.user.email, password: credential.password }, headers: { Origin: base }, timeout: 180000, maxRedirects: 0 }); assert.equal(login.status(), 200);
      const current = (await db.session.findMany({ where: { userId: credential.user.id, expiresAt: { gt: new Date() } } })).filter(item => !before.has(item.id)); assert.equal(current.length, 1); scope = current[0]; secrets.push(scope.token);
      const verified = await stepUpSessionWithPassword({ sessionId: scope.id, sessionToken: scope.token, userId: credential.user.id, organizationId: x.organizationId, password: credential.password }); assert.equal(verified.status, 'verified');
      page = await context.newPage(); page.on('pageerror', error => row.errors.push(safe(error))); const start = Date.now();
      await page.goto(base + '/' + locale + '/dashboard/accounting/close', { waitUntil: 'domcontentloaded' }); panel = page.locator('section[aria-labelledby="close-evidence-title"]');
      await expect(panel.getByRole('heading', { name: copy.title, exact: true })).toBeVisible(); await expect(panel.getByText(copy.loading, { exact: true })).not.toBeVisible(); row.timings.push({ persona: who, elapsedMs: Date.now()-start });
    };
    try {
      const old = payment.getPaymentReconciliationDashboardData; let adverse;
      try { payment.getPaymentReconciliationDashboardData = async () => { throw Error('Owned browser collector failure'); }; adverse = await service.runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: 'browser-missing-' + locale + run }, { actorId: x.actorIds.maker }); }
      finally { payment.getPaymentReconciliationDashboardData = old; }
      const finding = await db.closeAssuranceFinding.findFirstOrThrow({ where: { organizationId: x.organizationId, closeRunId: adverse.run.id, checklistItem: { key: 'payment-reconciliation' } } });
      const missing = await db.closeEvidenceItem.findMany({ where: { organizationId: x.organizationId, closeRunId: adverse.run.id, available: false }, orderBy: { id: 'asc' } }); assert.ok(missing.length);
      await service.runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: 'browser-restored-' + locale + run }, { actorId: x.actorIds.maker });
      stage = 'request-draft'; await open('maker'); let requesterView = await workflow.getCloseEvidenceWorkflow(actor(x.actorIds.maker), x.periodId), allFindings = [...requesterView.findings];
      while (!allFindings.some(item => item.id === finding.id) && requesterView.cursors.findings) { await more('findings'); requesterView = await workflow.getCloseEvidenceWorkflow(actor(x.actorIds.maker), x.periodId, { kind: 'findings', cursor: requesterView.cursors.findings }); allFindings.push(...requesterView.findings); }
      const findingIndex = allFindings.findIndex(item => item.id === finding.id); assert.ok(findingIndex >= 0);
      const findingRow = panel.getByRole('listitem').nth(findingIndex); await expect(findingRow).toContainText(load('components/accounting/close-evidence-workflow-copy.ts').closeEvidenceFindingTitle(finding.title,locale));
      const retainedRun=await db.closeRun.findFirstOrThrow({where:{id:adverse.run.id,organizationId:x.organizationId}});
      await expect(findingRow.locator('time')).toHaveAttribute('datetime',retainedRun.asOf.toISOString());await expect(findingRow).toContainText(copy.assessmentReference+': '+adverse.run.id);await expect(findingRow).toContainText(copy.reference+': '+finding.id);
      await press(findingRow.locator('summary'));await expect(findingRow.getByText(finding.detail,{exact:true})).toBeVisible();await screenshot('historical-assessment-context');row.historicalContextVerified=true;
      await press(findingRow.getByRole('button', { name: copy.request, exact: true }));
      const text = (locale === 'fr' ? 'Vérifier les justificatifs manquants du rapprochement et la nouvelle observation conservée.' : 'Review missing reconciliation evidence and the newer retained source observation.') + ' ' + run;
      row.recipientLabels = await panel.getByRole('combobox').evaluate(element => Array.from(element.labels || []).map(label => label.textContent));
      while (await panel.getByRole('combobox', { name: copy.recipient, exact: true }).locator(`option[value="${x.actorIds.checker}"]`).count() === 0) await more('recipients');
      await panel.getByRole('combobox', { name: copy.recipient, exact: true }).selectOption(x.actorIds.checker); await panel.getByLabel(copy.due, { exact: true }).fill(new Date(Date.now()+86400000).toISOString().slice(0,16)); await panel.getByRole('textbox', { name: copy.text, exact: true }).fill(text);
      await page.reload({ waitUntil: 'domcontentloaded' }); await expect(panel.getByRole('textbox', { name: copy.text, exact: true })).toHaveValue(text); await screenshot('draft-retained');
      // A second actual tab keeps an independently editable draft before the first commits.
      const stalePage=await context.newPage();await stalePage.goto(base+'/'+locale+'/dashboard/accounting/close',{waitUntil:'domcontentloaded'});
      const stalePanel=stalePage.locator('section[aria-labelledby="close-evidence-title"]');await expect(stalePanel.getByText(copy.loading,{exact:true})).not.toBeVisible();
      const staleFinding=stalePanel.getByRole('listitem').filter({hasText:copy.reference+': '+finding.id});
      while(await staleFinding.count()===0){await stalePanel.getByRole('button',{name:copy.more.findings,exact:true}).click();await expect(stalePanel.getByText(copy.loading,{exact:true})).not.toBeVisible();}
      await staleFinding.getByRole('button',{name:copy.request,exact:true}).click();
      while(await stalePanel.getByRole('combobox',{name:copy.recipient,exact:true}).locator(`option[value="${x.actorIds.checker}"]`).count()===0){await stalePanel.getByRole('button',{name:copy.more.recipients,exact:true}).click();await expect(stalePanel.getByText(copy.loading,{exact:true})).not.toBeVisible();}
      await stalePanel.getByRole('combobox',{name:copy.recipient,exact:true}).selectOption(x.actorIds.checker);await stalePanel.getByLabel(copy.due,{exact:true}).fill(new Date(Date.now()+86400000).toISOString().slice(0,16));await stalePanel.getByRole('textbox',{name:copy.text,exact:true}).fill(text+' — second tab');
      await press(panel.getByRole('button', { name: copy.submit, exact: true })); await expect(panel.getByText(copy.requestSaved, { exact: true })).toBeFocused(); await financial();
      const beforeStale=await records(),findingBeforeStale=await db.closeAssuranceFinding.findUniqueOrThrow({where:{id:finding.id}});
      await stalePanel.getByRole('button',{name:copy.submit,exact:true}).click();await expect(stalePanel.getByText(copy.requestConflict,{exact:true})).toBeFocused();await expect(stalePanel.getByRole('textbox',{name:copy.text,exact:true})).toHaveValue(text+' — second tab');
      assert.deepEqual(await records(),beforeStale);assert.deepEqual(await db.closeAssuranceFinding.findUniqueOrThrow({where:{id:finding.id}}),findingBeforeStale);await financial();
      const staleScreenshot=`close-evidence-browser-${run}-${locale}-second-request-refused.png`;await stalePage.screenshot({path:path.join(__dirname,staleScreenshot),animations:'disabled'});row.screenshots.push(staleScreenshot);row.secondRequestRefusedWithoutEffects=true;row.conflictingDraftPreserved=true;await stalePage.close();
      let queue = await workflow.getCloseEvidenceWorkflow(actor(x.actorIds.checker), x.periodId), request = queue.requests.find(item => item.findingId === finding.id);
      while (!request && queue.cursors.requests) { queue = await workflow.getCloseEvidenceWorkflow(actor(x.actorIds.checker), x.periodId, { kind: 'requests', cursor: queue.cursors.requests }); request = queue.requests.find(item => item.findingId === finding.id); }
      assert.ok(request); row.requestId = request.requestId;
      stage = 'assigned-response'; await open('checker'); assert.equal(await panel.getByRole('button', { name: copy.request, exact: true }).count(), 0); const responseRow = panel.getByRole('listitem').filter({ hasText: text }); while (await responseRow.count() === 0) await more('requests'); await press(responseRow.getByRole('button', { name: copy.respond, exact: true }));
      const responseText = locale === 'fr' ? 'Le collecteur est rétabli. Examiner la nouvelle évaluation et ses justificatifs.' : 'The collector is restored. Review the new assessment and its retained evidence.';
      await panel.getByRole('textbox', { name: copy.text, exact: true }).fill(responseText); await press(panel.getByRole('button', { name: copy.submitResponse, exact: true })); await expect(panel.getByText(copy.responseSaved, { exact: true })).toBeFocused(); await expect(panel.getByText(copy.loading, { exact: true })).not.toBeVisible(); while (await responseRow.count() === 0) await more('requests'); await expect(responseRow.getByText(copy.submitted, { exact: true })).toBeVisible(); assert.equal(await panel.getByRole('button', { name: copy.review, exact: true }).count(), 0); await responseRow.scrollIntoViewIfNeeded(); await screenshot('response-awaits-independent-review'); await financial();
      stage = 'independent-review'; await open('certifier'); let reviewView = await workflow.getCloseEvidenceWorkflow(actor(x.actorIds.certifier), x.periodId), reviewRows = [...reviewView.reviews];
      while (!reviewRows.some(item => item.request.requestId === request.requestId) && reviewView.cursors.reviews) { await more('reviews'); reviewView = await workflow.getCloseEvidenceWorkflow(actor(x.actorIds.certifier), x.periodId, { kind: 'reviews', cursor: reviewView.cursors.reviews }); reviewRows.push(...reviewView.reviews); }
      const reviewIndex = reviewRows.findIndex(item => item.request.requestId === request.requestId); assert.ok(reviewIndex >= 0); await press(panel.getByRole('listitem').nth(reviewIndex).getByRole('button', { name: copy.review, exact: true })); await expect(panel.getByText(responseText, { exact: true })).toBeVisible(); await panel.getByRole('textbox', { name: copy.notes, exact: true }).fill(locale === 'fr' ? 'Revue indépendante de la réponse et de la source actuelle conservée.' : 'Independent review of the response and current retained source observation.'); await panel.getByRole('checkbox', { name: copy.checked, exact: true }).check();
      const beforeAccept = f.hash(await records()); await db.session.updateMany({ where: { id: scope.id, userId: credential.user.id, assuranceOrganizationId: x.organizationId }, data: { assuranceVerifiedAt: new Date(Date.now()-301000) } });
      stage = 'fresh-auth-refusal'; await press(panel.getByRole('button', { name: copy.accept, exact: true })); await expect(panel.getByLabel(copy.password, { exact: true })).toBeFocused(); assert.equal(f.hash(await records()), beforeAccept); await screenshot('identity-required');
      await panel.getByLabel(copy.password, { exact: true }).fill(credential.password); await press(panel.getByRole('button', { name: copy.verify, exact: true })); await expect(panel.getByText(copy.verified, { exact: true })).toBeFocused(); assert.equal(f.hash(await records()), beforeAccept); await financial();
      const stored = await page.evaluate(() => Object.values(sessionStorage)); assert.ok(stored.every(value => !value.includes(credential.password))); await screenshot('explicit-retry-required');
      stage = 'explicit-acceptance'; await press(panel.getByRole('button', { name: copy.retry, exact: true })); await expect(panel.getByText(copy.accepted, { exact: true })).toBeFocused(); await expect(panel.getByText(copy.loading, { exact: true })).not.toBeVisible();
      const retained = await db.closeAssuranceFinding.findFirstOrThrow({ where: { id: finding.id, organizationId: x.organizationId, periodId: x.periodId } }); assert.equal(retained.status, 'RESOLVED');
      const acceptances = await db.accountantComment.findMany({ where: { organizationId: x.organizationId, findingId: finding.id, visibility: 'ACCOUNTANT_RESPONSE_ACCEPTED', metadata: { path: ['requestId'], equals: request.requestId } } }); assert.equal(acceptances.length, 1); assert.equal(acceptances[0].authorId, x.actorIds.certifier); row.durableAcceptanceId = acceptances[0].id;
      await assert.rejects(workflow.getCloseEvidenceReview(actor(x.actorIds.certifier), request.requestId), error => error.code === 'NOT_FOUND');
      assert.deepEqual(await db.closeEvidenceItem.findMany({ where: { organizationId: x.organizationId, closeRunId: adverse.run.id, available: false }, orderBy: { id: 'asc' } }), missing); await financial(); row.originalMissingRetained = true; row.freshAuthNoImplicitAcceptance = true;
      stage = 'requester-history'; await open('maker');
      const history=panel.locator('section[aria-labelledby="close-request-tracking-title"]'), acceptedRow=history.getByRole('listitem').filter({hasText:copy.reference+': '+request.requestId});
      while(await acceptedRow.count()===0) await more('tracking');
      await expect(acceptedRow.getByText(copy.trackingStates.ACCEPTED,{exact:true})).toBeVisible();await expect(acceptedRow.getByText(copy.acceptanceRecorded+':',{exact:false})).toBeVisible();
      assert.equal(await history.getByText(responseText,{exact:true}).count(),0);row.requesterAcceptedHistory=true;await acceptedRow.scrollIntoViewIfNeeded();await screenshot('requester-accepted-history');
      stage = 'responsive'; row.viewports = [];
      for (const viewport of [1440,768,320]) { await page.setViewportSize({ width: viewport, height: 1000 }); await panel.scrollIntoViewIfNeeded(); const measurement = await panel.evaluate(element => ({ viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, width: element.clientWidth, content: element.scrollWidth, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches })); assert.ok(measurement.content <= measurement.width+1); assert.ok(measurement.pageWidth <= viewport+1); assert.equal(measurement.reducedMotion, true); row.viewports.push(measurement); await screenshot('accepted-' + viewport); }
      row.passed = row.errors.length === 0;
    } catch (error) { row.error = safe(error); row.failedStage = stage; if (panel) await screenshot('failure-' + stage).catch(() => {}); }
    finally { if (context) await context.close(); }
    console.log(JSON.stringify({ locale, passed: row.passed, failedStage: row.failedStage, error: row.error })); return row;
  }
  try {
    report.listenerBefore = listener(); predecessor(); await helper.withClient(helper.targetUrl(), helper.assertOwned); report.sourceBefore = sources(); report.outsideBefore = await outside(); const identities = await credentials(); report.financialBefore = await h.financial();
    const browser = await chromium.launch({ headless: true }); try { for (const [locale,width] of [['en',1440],['fr',320]]) report.journeys.push(await journey(browser, identities, locale, width)); } finally { await browser.close(); }
    report.financialAfter = await h.financial(); report.financialUnchanged = f.hash(report.financialBefore) === f.hash(report.financialAfter);
    const build = path.join(root, '.next-workflow-supplier/server/app/[locale]/(dashboard)/dashboard/accounting/close/page.js'), bytes = fs.readFileSync(build); assert.ok(bytes.includes(Buffer.from('CloseEvidenceWorkflowPanel'))); report.build = { file: path.relative(root,build), sha256: sha(bytes) };
  } catch (error) { report.error = safe(error); }
  finally {
    try { report.listenerAfter = listener(); report.sourceAfter = sources(); report.sourceStable = !!report.sourceBefore && f.hash(report.sourceBefore) === f.hash(report.sourceAfter); if(report.outsideBefore) { report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore.hash === report.outsideAfter.hash; } } catch(error) { report.finalizationError = safe(error); }
    await db.$disconnect(); report.passed = report.journeys.length === 2 && report.journeys.every(row => row.passed) && report.sourceStable && report.outsideUnchanged && report.financialUnchanged && !report.error && !report.finalizationError;
    const filename = path.join(__dirname, 'close-evidence-browser-' + run + '.json'); fs.writeFileSync(filename, JSON.stringify(report,null,2)+'\n', { flag:'wx' }); console.log(JSON.stringify({ filename, passed:report.passed, error:report.error, sourceStable:report.sourceStable, outsideUnchanged:report.outsideUnchanged }));
  }
  return report;
}
module.exports = { main };
if (require.main === module && process.argv[2] === '--run') main().then(report => process.exit(report.passed ? 0 : 1)).catch(error => { console.error(String(error.message).replace(/postgres(?:ql)?:\/\/\S+/gi,'[database URL redacted]')); process.exit(1); });
