"use strict";

// Inert on import and without --run. The coordinator supplies a passed, source-bound fixture receipt.
async function main() {
  const p = require('./purchase-close-recovery-fixtures.cjs');
  const { db, f, root, helper, organizations } = p, { fs, path, crypto, assert } = f;
  const { chromium, expect: baseExpect } = require('@playwright/test'), { execFileSync } = require('node:child_process');
  const { hashPassword } = require(path.join(root, 'lib/password.ts'));
  const { stepUpSessionWithPassword } = require(path.join(root, 'services/security/step-up-auth.service.ts'));
  const handoff = require(path.join(root, 'services/purchasing/payment-reconciliation-service.ts'));
  const evidence = require(path.join(root, 'services/purchasing/payment-reconciliation-evidence.ts'));
  const { paymentReconciliationCopy } = require(path.join(root, 'components/purchasing/payment-reconciliation-copy.ts'));
  const expect = baseExpect.configure({ timeout: 60000 }), base = 'http://127.0.0.1:3110', run = crypto.randomUUID(), secrets = [];
  const sha = value => crypto.createHash('sha256').update(value).digest('hex');
  const safe = error => { let value = String(error?.stack || error?.message || error); for (const secret of secrets) if (secret) value = value.split(secret).join('[secret redacted]'); return value.replace(/postgres(?:ql)?:\/\/\S+/gi, '[database URL redacted]'); };
  const report = { run, at: new Date().toISOString(), journeys: [], limitations: [
    'Uses one passed owned payment-handoff-runtime fixture; no new financial payment, source approval, provider or bank statement is fabricated.',
    'New local credentials and roles are synthetic. Real password service assurance is deliberately aged on the owned session only to exercise an actual fresh-auth refusal.',
    'The receipt-pointer corruption is an explicit owned test fault. Recovery uses actual withdrawal, proposal and independent approval; the invalid pointer is never directly repaired.',
    'Cash review records an internal evidence decision; a URI/hash does not authenticate a payee signature or external settlement.',
    'This browser proof does not establish bank admission, the original four purchase reversal criteria, production performance, full accessibility certification or browser zoom behavior.',
  ] };
  const productFiles = ['components/purchasing/PaymentReconciliationHandoffWorkbench.tsx', 'components/purchasing/payment-reconciliation-copy.ts', 'actions/purchasing/payment-reconciliation.actions.ts', 'actions/security/step-up-auth.actions.ts', 'app/[locale]/(dashboard)/dashboard/purchases/payables/payments/reconcile/page.tsx', 'app/[locale]/(dashboard)/dashboard/purchases/purchases-route-data-access.ts', 'services/purchasing/payment-reconciliation-service.ts', 'services/purchasing/payment-reconciliation-contracts.ts', 'services/purchasing/payment-reconciliation-authority.ts', 'services/purchasing/payment-reconciliation-evidence.ts', 'services/purchasing/payment-reconciliation-close.ts', 'services/security/step-up-auth.service.ts', 'components/ui/dialog.tsx', 'next.config.mjs'];
  const sources = () => ({ ...p.sources(), ...Object.fromEntries([__filename, ...productFiles.map(file => path.join(root, file))].map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
  const additionalModels = ['paymentTransaction', 'paymentException', 'providerAccount', 'providerEvent', 'statementFile', 'statementLine', 'matchRecord', 'suspenseItem', 'reconciliationRun'];
  let x, paymentId, transactionId, originalEvidence, beforeAccepted;
  async function outside() {
    const original = await p.outside(), extra = {};
    for (const model of additionalModels) extra[model] = f.hash(await db[model].findMany({ where: { organizationId: { notIn: organizations } }, orderBy: { id: 'asc' } }));
    for (const model of ['account', 'session']) extra[model] = f.hash(await db[model].findMany({ where: { user: { organizationId: { notIn: organizations } } }, orderBy: { id: 'asc' } }));
    return { hash: f.hash({ original, extra }), original, extra };
  }
  const financial = () => p.rows(x, p.economicModels);
  async function decisions() { return db.businessEvent.findMany({ where: { organizationId: x.organizationId, sourceType: 'SUPPLIER_PAYMENT', sourceId: paymentId, eventType: evidence.PAYMENT_RECONCILIATION_EVENT }, orderBy: { id: 'asc' } }); }
  function listener() {
    const expected = Number(process.env.STOQUIFY_PAYMENT_HANDOFF_LISTENER_PID); assert.ok(Number.isSafeInteger(expected) && expected > 0, 'Verified listener PID is required');
    const escaped = root.toLowerCase().replaceAll("'", "''"), command = `$ErrorActionPreference='Stop'; $rows=@(Get-NetTCPConnection -LocalPort 3110 -State Listen); if($rows.Count -ne 1){throw 'Expected one listener'}; $p=Get-CimInstance Win32_Process -Filter ('ProcessId='+$rows[0].OwningProcess); $q=Get-CimInstance Win32_Process -Filter ('ProcessId='+$p.ParentProcessId); $commands=(@($p.CommandLine,$q.CommandLine) -join ' '); [pscustomobject]@{address=$rows[0].LocalAddress;pid=$p.ProcessId;parentPid=$q.ProcessId;workspaceMatches=$commands.ToLowerInvariant().Contains('${escaped}');nextDevelopmentCommand=($commands -match 'next.+dev.+-p.+3110')}|ConvertTo-Json -Compress`;
    const value = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8', windowsHide: true, timeout: 30000 }).trim());
    assert.equal(value.address, '127.0.0.1'); assert.equal(value.pid, expected); assert.equal(value.workspaceMatches, true); assert.equal(value.nextDevelopmentCommand, true); return value;
  }
  function buildIdentity() {
    const file = path.join(root, '.next-workflow-supplier/server/app/[locale]/(dashboard)/dashboard/purchases/payables/payments/reconcile/page.js');
    const bytes = fs.readFileSync(file); assert.ok(bytes.includes(Buffer.from('PaymentReconciliationHandoffWorkbench')));
    return { file: path.relative(root, file).replaceAll('\\', '/'), sha256: sha(bytes), bytes: bytes.length };
  }
  function fixtureReceipt() {
    const name = process.env.STOQUIFY_PAYMENT_HANDOFF_FIXTURE_RECEIPT, expected = process.env.STOQUIFY_PAYMENT_HANDOFF_FIXTURE_SHA;
    assert.ok(/^payment-handoff-runtime-[a-f0-9-]{36}\.json$/.test(name || ''), 'An exact local runtime receipt filename is required'); assert.ok(/^[a-f0-9]{64}$/.test(expected || ''));
    const file = path.join(__dirname, name), bytes = fs.readFileSync(file); assert.equal(sha(bytes), expected);
    const value = JSON.parse(bytes); assert.equal(value.passed, true); assert.equal(value.sourceStable, true); assert.equal(value.outsideUnchanged, true); assert.equal(value.noHandoffFinancialEffects, true);
    assert.equal(value.identity.database, 'stoquify_local_registration_20260906_01'); assert.ok(['localhost', '127.0.0.1'].includes(value.identity.host));
    assert.equal(value.checks.length, 5); assert.ok(value.checks.every(row => row.status === 'passed'));
    for (const relative of productFiles.filter(file => file.startsWith('services/purchasing/'))) assert.equal(value.sourcesAfter[relative], sha(fs.readFileSync(path.join(root, relative))), 'Source changed since the actual fixture receipt: ' + relative);
    assert.ok(typeof value.organizationId === 'string' && value.organizationId.startsWith('workflow_'));
    x = { organizationId: value.organizationId }; organizations.push(x.organizationId); paymentId = value.checks[0].result.paymentId; transactionId = value.checks[0].result.transactionId;
    assert.ok(paymentId && transactionId); report.predecessor = { file: name, sha256: expected, organizationId: x.organizationId, paymentId, transactionId };
    return value;
  }
  async function credential(purpose, permissions) {
    const password = 'Owned-handoff-' + crypto.randomUUID() + '!'; secrets.push(password); const passwordHash = await hashPassword(password); secrets.push(passwordHash);
    const role = await db.role.create({ data: { organizationId: x.organizationId, code: 'handoff-browser-' + purpose + '-' + run.slice(0, 8), nameEn: 'Synthetic payment evidence browser ' + purpose, permissions } });
    const actor = await db.user.create({ data: { organizationId: x.organizationId, name: 'Synthetic handoff browser ' + purpose, email: crypto.randomUUID() + '@example.invalid', password: passwordHash, isActive: true, isVerified: true, emailVerified: true, roles: { connect: { id: role.id } } } });
    await db.account.create({ data: { userId: actor.id, accountId: actor.id, providerId: 'credential', password: passwordHash } }); return { actor, password };
  }
  async function contextFor(browser, credential, locale, width, row) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce' }); context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000);
    await context.route('**/*', route => { const origin = new URL(route.request().url()).origin; if (origin === base) return route.continue(); if (!row.blockedOrigins.includes(origin)) row.blockedOrigins.push(origin); return route.abort(); });
    const before = new Set((await db.session.findMany({ where: { userId: credential.actor.id }, select: { id: true } })).map(session => session.id));
    const response = await context.request.post(base + '/api/auth/sign-in/email', { data: { email: credential.actor.email, password: credential.password }, headers: { Origin: base }, timeout: 180000, maxRedirects: 0 }); assert.equal(response.status(), 200);
    const sessions = (await db.session.findMany({ where: { userId: credential.actor.id, expiresAt: { gt: new Date() } } })).filter(session => !before.has(session.id)); assert.equal(sessions.length, 1); const session = sessions[0]; secrets.push(session.token);
    const scope = { organizationId: x.organizationId, actorId: credential.actor.id, sessionId: session.id, sessionToken: session.token };
    const verified = await stepUpSessionWithPassword({ sessionId: session.id, sessionToken: session.token, userId: credential.actor.id, organizationId: x.organizationId, password: credential.password }); assert.equal(verified.status, 'verified');
    await context.addInitScript(({ paymentId }) => { const nativeFetch = window.fetch; window.__handoffWire = { calls: [], responses: [], errors: [] };
      window.fetch = async function(...args) { const init = args[1], headers = new Headers(init?.headers || (args[0] instanceof Request ? args[0].headers : undefined)), body = typeof init?.body === 'string' ? init.body : '';
        const consequential = headers.has('next-action') && body.includes(paymentId) && body.includes('idempotencyKey');
        if (consequential) window.__handoffWire.calls.push({ targetMatches: true, kind: body.includes('CASH_VOUCHER') ? 'propose' : body.includes('APPROVE') ? 'approve' : body.includes('REJECT') ? 'reject' : 'other-decision' });
        const response = await Reflect.apply(nativeFetch, this, args);
        if (consequential) response.clone().text().then(text => window.__handoffWire.responses.push({ status: response.status, code: /"code"\s*:\s*"(FRESH_AUTH_REQUIRED|FORBIDDEN|AUTH_REQUIRED|SOD_VIOLATION|CONFLICT|REVIEW_REQUIRED)"/.exec(text)?.[1] || null, successTrue: /"success"\s*:\s*true/.test(text), successFalse: /"success"\s*:\s*false/.test(text) })).catch(() => window.__handoffWire.errors.push('Action response observation unavailable'));
        return response;
      };
    }, { paymentId });
    return { context, scope, credential };
  }
  async function age(scope) { const changed = await db.session.updateMany({ where: { id: scope.sessionId, userId: scope.actorId, assuranceOrganizationId: x.organizationId, assuranceMethod: 'password', assuranceLevel: 1 }, data: { assuranceVerifiedAt: new Date(Date.now() - 301000) } }); assert.equal(changed.count, 1); }
  async function journey(browser, credentials, locale, width) {
    const copy = paymentReconciliationCopy(locale), row = { locale, width, screenshots: [], operations: [], errors: [], blockedOrigins: [], passed: false }; let session, page, stage = 'start';
    const screenshot = async name => { const filename = 'payment-handoff-browser-' + run + '-' + locale + width + '-' + name + '.png'; await page.screenshot({ path: path.join(__dirname, filename), animations: 'disabled', caret: 'initial' }); row.screenshots.push(filename); };
    const wire = () => page.evaluate(() => window.__handoffWire);
    const press = async target => { await expect(target).toBeEnabled(); await target.scrollIntoViewIfNeeded(); await target.focus(); await expect(target).toBeFocused(); await page.keyboard.press('Enter'); };
    const navigate = async () => { const start = Date.now(); await page.goto(base + '/' + locale + '/dashboard/purchases/payables/payments/reconcile?payment=' + encodeURIComponent(paymentId), { waitUntil: 'domcontentloaded' }); await expect(page.getByRole('heading', { name: copy.title, exact: true })).toBeVisible(); await expect(page.locator('section[aria-labelledby="handoff-payment"]')).toContainText(originalEvidence.paymentNumber); row.loads ??= []; row.loads.push({ stage, elapsedMs: Date.now() - start }); row.build ??= buildIdentity(); };
    const openContext = async who => { if (session) await session.context.close(); session = await contextFor(browser, credentials[who], locale, width, row); page = await session.context.newPage(); page.on('pageerror', error => row.errors.push(safe(error))); await navigate(); };
    const noFinance = async () => assert.deepEqual(await financial(), beforeAccepted, 'Evidence workflow must preserve all prior economic records');
    const dialogControls = async dialog => { for (let i = 0; i < 8; i++) { await page.keyboard.press('Tab'); assert.equal(await dialog.evaluate(element => element.contains(document.activeElement)), true); } const sizes = await dialog.evaluate(element => ({ width: element.clientWidth, content: element.scrollWidth, viewport: innerWidth, document: document.documentElement.scrollWidth })); assert.ok(sizes.content <= sizes.width + 1); assert.ok(sizes.document <= sizes.viewport + 1); };
    const verify = async dialog => { const before = (await wire()).calls.length, records = f.hash(await decisions()), at = Date.now(); await expect(dialog.getByLabel(copy.password, { exact: true })).toBeFocused(); await dialog.getByLabel(copy.password, { exact: true }).fill(session.credential.password); await press(dialog.getByRole('button', { name: copy.verify, exact: true })); await expect(dialog.getByLabel(copy.password, { exact: true })).not.toBeVisible(); await expect(dialog.getByRole('status')).toHaveText(copy.verified); assert.equal((await wire()).calls.length, before); assert.equal(f.hash(await decisions()), records); const current = await db.session.findUniqueOrThrow({ where: { id: session.scope.sessionId } }); assert.ok(current.assuranceVerifiedAt.getTime() >= at); await noFinance(); };
    try {
      stage = 'stale-retained-evidence'; const transaction = await db.paymentTransaction.findFirstOrThrow({ where: { id: transactionId, organizationId: x.organizationId } });
      await db.paymentTransaction.update({ where: { id: transaction.id, organizationId: x.organizationId }, data: { metadata: { ...transaction.metadata, paymentReconciliationReceiptId: 'owned-browser-invalid-pointer-' + run + '-' + locale } } });
      await openContext('reviewer'); await expect(page.getByText(copy.proofStale, { exact: true })).toBeVisible(); await screenshot('retained-evidence-invalid');
      const beforeWithdraw = await decisions(); await press(page.getByRole('button', { name: copy.reopen, exact: true })); let dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible(); await dialogControls(dialog);
      const reason = locale === 'fr' ? 'Retirer la preuve synthétique incohérente et conserver l’historique financier.' : 'Withdraw inconsistent synthetic evidence while preserving the original financial history.';
      await dialog.getByLabel(copy.reason, { exact: true }).fill(reason); await age(session.scope); stage = 'actual-fresh-auth-refusal'; await press(dialog.getByRole('button', { name: copy.reopen, exact: true }));
      await expect(dialog.getByRole('alert').filter({ hasText: copy.freshRequired })).toHaveText(copy.freshRequired); await expect.poll(async () => (await wire()).responses.filter(value => value.code === 'FRESH_AUTH_REQUIRED').length).toBe(1);
      await screenshot('actual-auth-refusal'); assert.deepEqual(await decisions(), beforeWithdraw); await noFinance(); await expect(dialog).toContainText(reason);
      await verify(dialog); const retry = dialog.getByRole('button', { name: copy.retry, exact: true }); await expect(retry).toBeFocused(); await expect(dialog).toContainText(reason); await screenshot('identity-verified-explicit-retry');
      stage = 'withdrawal-explicit-retry'; await press(retry); await expect(dialog).not.toBeVisible(); await expect(page.getByText(copy.saved, { exact: true })).toBeFocused(); let current = await handoff.readPaymentReconciliation(paymentId, session.scope); assert.equal(current.status, 'REOPENED'); assert.equal((await wire()).calls.length, 2); await noFinance(); row.operations.push({ operation: 'reopen', receiptId: current.receiptId, wire: await wire(), explicitRetry: true, reasonRetained: true });
      stage = 'recipient-acknowledgment-draft'; await openContext('proposer'); const body = originalEvidence.evidence;
      for (const field of ['voucherReference', 'recipientName', 'acknowledgedAt', 'purpose', 'evidenceUri', 'evidenceSha256']) await page.getByLabel(copy[field], { exact: true }).fill(body[field]); await page.getByRole('checkbox', { name: copy.acknowledgment, exact: true }).check();
      await page.reload({ waitUntil: 'domcontentloaded' }); await expect(page.getByLabel(copy.purpose, { exact: true })).toHaveValue(body.purpose); await expect(page.getByLabel(copy.evidenceSha256, { exact: true })).toHaveValue(body.evidenceSha256); await expect(page.getByRole('checkbox', { name: copy.acknowledgment, exact: true })).toBeChecked(); await screenshot('draft-retained');
      await press(page.getByRole('button', { name: copy.preview, exact: true })); dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible(); await expect(dialog).toContainText(copy.cashHelp); await dialogControls(dialog); await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible(); await expect(page.getByRole('button', { name: copy.preview, exact: true })).toBeFocused();
      await press(page.getByRole('button', { name: copy.preview, exact: true })); dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible(); stage = 'actual-proposal'; await press(dialog.getByRole('button', { name: copy.propose, exact: true })); await expect(dialog).not.toBeVisible(); await expect(page.getByText(copy.saved, { exact: true })).toBeFocused(); current = await handoff.readPaymentReconciliation(paymentId, session.scope); assert.equal(current.status, 'PROPOSED'); assert.equal(current.canDecide, false); await expect(page.getByText(copy.independent, { exact: true })).toBeVisible(); assert.equal(await page.getByRole('button', { name: copy.approve, exact: true }).count(), 0); await screenshot('proposer-independent-review-required'); await noFinance(); row.operations.push({ operation: 'propose', receiptId: current.receiptId, wire: await wire(), draftRetainedAfterReload: true, makerCannotApprove: true });
      stage = 'readonly-proposal'; await openContext('reader'); await expect(page.getByText(copy.independent, { exact: true })).toBeVisible(); for (const label of [copy.propose, copy.approve, copy.reject, copy.reopen, copy.finalize]) assert.equal(await page.getByRole('button', { name: label, exact: true }).count(), 0); await screenshot('readonly-proposal'); await noFinance();
      stage = 'independent-review'; await openContext('reviewer'); await press(page.getByRole('button', { name: copy.approve, exact: true })); dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible(); await expect(dialog).toContainText(body.recipientName); await expect(dialog).toContainText(body.voucherReference); await dialog.getByLabel(copy.reason, { exact: true }).fill(locale === 'fr' ? 'Examen indépendant de l’accusé de réception et du paiement enregistré.' : 'Independent review of the recipient acknowledgment and retained recorded payment.'); await screenshot('independent-review');
      await press(dialog.getByRole('button', { name: copy.approve, exact: true })); await expect(dialog).not.toBeVisible(); await expect(page.getByText(copy.saved, { exact: true })).toBeFocused(); current = await handoff.readPaymentReconciliation(paymentId, session.scope); assert.equal(current.status, 'CASH_REVIEWED'); assert.equal(current.evidenceCurrent, true); assert.equal(current.evidenceIssue, null); const proof = await db.$transaction(tx => evidence.readCurrentPaymentReconciliationEvidenceInTx(tx, x.organizationId, paymentId)); assert.equal(proof.decisionId, current.receiptId); await noFinance(); row.operations.push({ operation: 'approve', receiptId: current.receiptId, proof, wire: await wire(), independentActorId: session.scope.actorId });
      stage = 'current-history'; await screenshot('current-reviewed-history'); await openContext('reader'); const beforeRead = f.hash(await decisions()); row.viewports = [];
      for (const size of [1440, 768, 320]) { await page.setViewportSize({ width: size, height: 1000 }); await page.locator('#handoff-payment').scrollIntoViewIfNeeded(); const observation = await page.evaluate(() => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches })); assert.equal(observation.viewport, size); assert.ok(observation.documentWidth <= size + 1); assert.ok(observation.bodyWidth <= size + 1); assert.equal(observation.reducedMotion, true); row.viewports.push(observation); await screenshot('readonly-history-' + size); }
      assert.equal(f.hash(await decisions()), beforeRead); await noFinance(); row.noFinancialEffects = true; row.buildAfter = buildIdentity(); assert.equal(row.build.sha256, row.buildAfter.sha256); assert.ok(row.operations.every(operation => operation.wire.errors.length === 0)); row.passed = row.errors.length === 0;
    } catch (error) { row.error = safe(error); row.failedStage = stage; if (page && !page.isClosed()) { row.failureObservation = await page.evaluate(() => ({ activeTag: document.activeElement?.tagName ?? null, dialogCount: document.querySelectorAll('[role="dialog"]').length, wire: window.__handoffWire })).catch(() => ({ unavailable: true })); await screenshot('failure-' + stage).catch(() => {}); } }
    finally { if (session) await session.context.close(); }
    console.log(JSON.stringify({ locale, width, passed: row.passed, failedStage: row.failedStage, error: row.error })); return row;
  }
  try {
    report.listenerBefore = listener(); await p.guard(); const predecessor = fixtureReceipt(); report.sourcesBefore = sources(); report.outsideBefore = await outside();
    assert.equal(await db.supplierPayment.count({ where: { id: paymentId, organizationId: x.organizationId, status: 'RELEASED', method: 'CASH' } }), 1);
    const read = ['dashboard.read', 'payments.reconciliation.read', 'accounting.journal.read'];
    const credentials = { proposer: await credential('proposer', [...read, 'payments.reconciliation.exception.resolve']), reviewer: await credential('reviewer', [...read, 'payments.reconciliation.exception.resolve', 'payments.reconciliation.sign']), reader: await credential('reader', read) };
    report.actors = Object.fromEntries(Object.entries(credentials).map(([key, value]) => [key, value.actor.id])); assert.equal(new Set(Object.values(report.actors)).size, 3);
    const existing = await db.businessEvent.findFirstOrThrow({ where: { id: predecessor.checks[4].result.renewedDecisionId, organizationId: x.organizationId } }); originalEvidence = { evidence: existing.payload.draft.evidence, paymentNumber: (await db.supplierPayment.findUniqueOrThrow({ where: { id: paymentId } })).paymentNumber };
    assert.equal(originalEvidence.evidence.kind, 'CASH_VOUCHER'); report.retainedDecisionsBefore = (await decisions()).map(event => ({ id: event.id, hash: f.hash(event) })); beforeAccepted = await financial(); report.financialBefore = f.hash(beforeAccepted);
    const browser = await chromium.launch({ headless: true }); try { for (const [locale, width] of [['en', 1440], ['fr', 320]]) report.journeys.push(await journey(browser, credentials, locale, width)); } finally { await browser.close(); }
    const after = await decisions(); for (const retained of report.retainedDecisionsBefore) assert.equal(f.hash(after.find(event => event.id === retained.id)), retained.hash, 'Original decision history must stay unchanged');
    report.financialAfter = f.hash(await financial()); report.noFinancialEffects = report.financialBefore === report.financialAfter;
  } catch (error) { report.error = safe(error); }
  finally {
    try { report.listenerAfter = listener(); report.sourcesAfter = sources(); report.sourceStable = !!report.sourcesBefore && f.hash(report.sourcesBefore) === f.hash(report.sourcesAfter); if (report.outsideBefore) { report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore.hash === report.outsideAfter.hash; } } catch (error) { report.finalizationError = safe(error); }
    try { await db.$disconnect(); } catch (error) { report.disconnectError = safe(error); }
    report.passed = !report.error && !report.finalizationError && !report.disconnectError && report.journeys.length === 2 && report.journeys.every(row => row.passed) && report.noFinancialEffects && report.sourceStable && report.outsideUnchanged;
    const file = path.join(__dirname, 'payment-handoff-browser-' + run + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ file, passed: report.passed, journeys: report.journeys.length, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged }));
  }
  return report;
}
module.exports = { main };
if (require.main === module) {
  if (process.argv[2] !== '--run') console.log('Prepared only. Coordinator must supply passed fixture receipt/SHA and verified listener PID.');
  else main().then(report => process.exit(report.passed ? 0 : 1)).catch(error => { console.error(String(error?.message || error).replace(/postgres(?:ql)?:\/\/\S+/gi, '[database URL redacted]')); process.exit(1); });
}
