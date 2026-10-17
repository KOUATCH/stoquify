// Prepared only until the coordinator releases this source and the owned DB lane.
// Actual app, auth and services. Synthetic records never establish customer approval.
if (require.main === module && process.argv[2] !== '--run') {
  console.log('Prepared only; --run requires source freeze and verified STOQUIFY_CLOSE_BROWSER_LISTENER_PID.');
} else {
  const b = require('./close-denial-recovery-browser.cjs'), d = require('./close-denial-recovery-runtime.cjs');
  const { f, db, root, helper, organizations } = d.h, { fs, path, crypto, assert } = f;
  const { chromium, expect: baseExpect } = require('@playwright/test'), { execFileSync } = require('node:child_process');
  const expect = baseExpect.configure({ timeout: 60000 }), load = file => require(path.join(root, file));
  const close = load('services/accounting/close-assurance.service.ts');
  const payment = load('services/reconciliation/payment-reconciliation-dashboard.service.ts');
  const replacement = load('services/accounting/close-evidence-replacement.service.ts');
  const collection = load('services/accounting/close-evidence-collection.ts');
  const { getCloseReadinessSnapshot } = load('services/snapshots/close-readiness-snapshot.service.ts');
  const { getProofTrail } = load('services/evidence/proof-trail.service.ts');
  const { grantAccountantAccess } = load('services/accounting/accountant-access.service.ts');
  const { grantAccountantAccessInputSchema } = load('services/accounting/accountant-access.schemas.ts');
  const { getAccountantWorkDetail } = load('services/accounting/accountant-work-desk.service.ts');
  const { accountantWorkDeskCopy: copy } = load('components/accounting/accountant-work-desk-copy.ts');
  const run = crypto.randomUUID(), base = 'http://127.0.0.1:3110', secrets = [];
  const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const files = [__filename, ...[
    'services/accounting/close-evidence-collection.ts', 'services/accounting/close-evidence-replacement.service.ts',
    'services/accounting/close-assurance.service.ts', 'services/accounting/close-assessment-order.service.ts',
    'services/accounting/accountant-access.service.ts', 'services/accounting/accountant-access.schemas.ts',
    'services/accounting/accountant-work-desk.service.ts', 'services/accounting/accountant-work-desk.contracts.ts',
    'services/accounting/missing-close-evidence-response-acceptance-contracts.ts',
    'services/accounting/missing-close-evidence-accountant-review-queue.service.ts',
    'services/accounting/close-assurance.schemas.ts', 'services/snapshots/close-readiness-snapshot.service.ts',
    'services/snapshots/tenant-operating-snapshot.service.ts', 'services/evidence/proof-trail.service.ts',
    'services/reconciliation/payment-reconciliation-dashboard.service.ts',
    'actions/accounting/accountant-work-desk.actions.ts', 'actions/accounting/accountant-access.actions.ts',
    'components/accounting/AccountantWorkDesk.tsx', 'components/accounting/accountant-work-desk-copy.ts',
    'app/[locale]/(dashboard)/dashboard/accounting/accountant-portfolio/page.tsx',
  ].map(file => path.join(root, file))];
  const sources = () => ({ ...b.sources(), ...Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
  const report = {
    run, at: new Date().toISOString(), journeys: [],
    scope: 'Actual owned app3110 EN1440/FR320 accountant work desk. Two fresh synthetic organizations use actual accounting setup, password authentication, an actual same-organization internal REVIEWER access grant, missing-proof request/response and completed assessments. An explicitly injected payment collector exception creates missing evidence only during fixture setup and is restored in finally. A newer actual assessment after preview must conflict; notes stay and a manually reviewed retry binds the new source receipt. No browser response mocks, migrations, seeds, delivery workers or external origins.',
    limitations: [
      'This exercises an internal accountant listed through a real persisted mandate; cross-tenant delegated access is not established by this browser journey.',
      'Grant consent evidence is a retained synthetic test-scope record with explicitly no real-customer authority, not an organizational approval.',
      'Payment source fault injection is process-local fixture setup, not an observed production outage. Actual persisted unavailable records are then handled by unmodified services and browser actions.',
      'A successful empty payment collection is availability evidence, not signed reconciliation or close certification. Other retained obligations can remain.',
      'Keyboard/focus, reduced-motion and narrow reflow checks are not native assistive-technology or accessibility certification.',
      'Financial comparisons begin after balanced synthetic accounting setup. Authentication, close records, review evidence, grants, audit and queued events can change.',
      'No notification delivery claim or worker execution; source fingerprints cover explicitly enumerated models and files.',
    ],
  };
  function listener() {
    const expected = Number(process.env.STOQUIFY_CLOSE_BROWSER_LISTENER_PID);
    assert.ok(Number.isSafeInteger(expected) && expected > 0, 'Verified owned app listener PID required before fixture writes');
    const escaped = root.toLowerCase().replaceAll("'", "''");
    const command = `$ErrorActionPreference='Stop'; $rows=@(Get-NetTCPConnection -LocalPort 3110 -State Listen); if($rows.Count -ne 1){throw 'Expected one owned listener'}; $row=$rows[0]; $proc=Get-CimInstance Win32_Process -Filter ('ProcessId='+$row.OwningProcess); $parent=Get-CimInstance Win32_Process -Filter ('ProcessId='+$proc.ParentProcessId); $commands=(@($proc.CommandLine,$parent.CommandLine) -join ' '); [pscustomobject]@{address=$row.LocalAddress;pid=$proc.ProcessId;parentPid=$parent.ProcessId;workspaceMatches=$commands.ToLowerInvariant().Contains('${escaped}');nextDevelopmentCommand=($commands -match 'next.+dev.+-p.+3110')} | ConvertTo-Json -Compress`;
    const state = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8', windowsHide: true, timeout: 30000 }).trim());
    assert.equal(state.address, '127.0.0.1'); assert.equal(state.pid, expected); assert.equal(state.workspaceMatches, true); assert.equal(state.nextDevelopmentCommand, true);
    return { ...state, checkedAt: new Date().toISOString() };
  }
  async function outside() {
    const existing = await d.outside(), scope = { organizationId: { notIn: organizations } }, hashes = {};
    for (const model of ['accountantComment', 'accountantAccessGrant']) hashes[model] = f.hash(await db[model].findMany({ where: scope, orderBy: { id: 'asc' } }));
    for (const model of ['account', 'session']) hashes[model] = f.hash(await db[model].findMany({ where: { user: scope }, orderBy: { id: 'asc' } }));
    return { hash: f.hash({ existing: existing.hash, hashes }), existing, hashes };
  }
  const snapshot = x => getCloseReadinessSnapshot({ organizationId: x.organizationId, periodStart: x.period.startDate, periodEnd: x.period.endDate, now: new Date() });
  const preview = (x, findingId) => db.$transaction(tx => replacement.getCloseEvidenceReplacementInTx(tx, x.organizationId, findingId), { isolationLevel: 'RepeatableRead' });
  async function retained(x) {
    const where = { organizationId: x.organizationId, closeRunId: x.oldRunId };
    return { run: await db.closeRun.findFirstOrThrow({ where: { id: x.oldRunId, organizationId: x.organizationId } }),
      evidence: await db.closeEvidenceItem.findMany({ where, orderBy: { id: 'asc' } }),
      checklist: await db.closeChecklistItem.findMany({ where, orderBy: { id: 'asc' } }),
      exports: await db.closePackExport.findMany({ where, orderBy: { id: 'asc' } }) };
  }
  async function setup(locale) {
    const fixture = await b.browserFixture('replacement-' + locale), { x, actor, password } = fixture;
    secrets.push(password);
    x.period = await db.accountingPeriod.findFirstOrThrow({ where: { id: x.periodId, organizationId: x.organizationId } });
    assert.ok(organizations.includes(x.organizationId)); assert.notEqual(actor.id, x.makerId);
    const role = await db.role.findFirstOrThrow({ where: { organizationId: x.organizationId, code: 'owned-close-verifier' } });
    assert.equal(role.nameEn, 'Synthetic local close verifier only');
    fixture.permissions = [...new Set([...role.permissions, 'accounting.audit.read'])];
    await db.role.update({ where: { id: role.id }, data: { permissions: fixture.permissions } });
    const now = new Date(), expiresAt = new Date(now.getTime() + 86400000);
    const grantEvidence = { kind: 'OWNED_LOCAL_REVIEW_GRANT_TEST_SCOPE', version: 1, syntheticLocalTest: true, realCustomerApproval: false,
      organizationId: x.organizationId, accountantId: actor.id, setupActorId: x.makerId, requestedRole: 'REVIEWER',
      issuedAt: now.toISOString(), expiresAt: expiresAt.toISOString(), scope: 'Internal synthetic browser review fixture only; no customer or professional mandate.' };
    const grantFile = 'close-replacement-browser-' + run + '-' + locale + '-grant-test-scope.json', grantBytes = JSON.stringify(grantEvidence, null, 2) + '\n';
    fs.writeFileSync(path.join(__dirname, grantFile), grantBytes, { flag: 'wx' });
    const grantHash = 'sha256:' + sha(grantBytes);
    fixture.grant = await grantAccountantAccess(x.organizationId, x.makerId, grantAccountantAccessInputSchema.parse({
      accountantEmail: actor.email, accountantFirmName: 'Synthetic internal local test accountant', role: 'REVIEWER',
      consentEvidenceHash: grantHash, effectiveFrom: now, expiresAt, correlationId: 'owned-browser-grant-' + locale + '-' + run,
    }), now);
    assert.equal(fixture.grant.status, 'ACTIVE'); assert.equal(fixture.grant.accountantUserId, actor.id);
    fixture.grantEvidence = { file: grantFile, fileSha256: sha(grantBytes), grantId: fixture.grant.id, syntheticOnly: true, sameOrganization: true };
    const actualCollector = payment.getPaymentReconciliationDashboardData;
    try {
      payment.getPaymentReconciliationDashboardData = async () => { throw new Error('Explicit owned browser fixture payment collector unavailable'); };
      const failed = await close.runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: 'owned-browser-payment-fault-' + locale + '-' + run }, { actorId: x.makerId });
      x.oldRunId = failed.run.id;
    } finally { payment.getPaymentReconciliationDashboardData = actualCollector; }
    fixture.finding = await db.closeAssuranceFinding.findFirstOrThrow({ where: { organizationId: x.organizationId, closeRunId: x.oldRunId, sourceType: 'PaymentReconciliationDashboard', checklistItem: { key: 'payment-reconciliation' } } });
    fixture.missing = await db.closeEvidenceItem.findMany({ where: { organizationId: x.organizationId, closeRunId: x.oldRunId, available: false, checklistItem: { key: 'payment-reconciliation' } }, orderBy: { id: 'asc' } });
    assert.equal(fixture.missing.length, 1);
    fixture.request = await close.requestMissingCloseEvidence(x.organizationId, { findingId: fixture.finding.id, requestedFromId: x.makerId,
      requestText: 'Synthetic local review: restore the payment collector and record the new Close observation.', dueAt: expiresAt, correlationId: 'owned-browser-request-' + locale + '-' + run }, { actorId: actor.id });
    fixture.response = await close.respondToMissingCloseEvidence(x.organizationId, { requestId: fixture.request.id,
      responseText: 'Synthetic local reply: the source collector is restored; inspect the new recorded assessment.', correlationId: 'owned-browser-response-' + locale + '-' + run }, { actorId: x.makerId });
    fixture.recovered = await close.runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: 'owned-browser-restored-' + locale + '-' + run }, { actorId: x.makerId });
    fixture.initialPreview = await preview(x, fixture.finding.id); assert.equal(fixture.initialPreview.status, 'AVAILABLE');
    const observed = await db.closeChecklistItem.findFirstOrThrow({ where: { id: fixture.initialPreview.selection.checklistItemId, organizationId: x.organizationId }, include: { evidenceItems: true } });
    assert.equal(observed.evidenceItems.length, 0, 'Actual restored payment dashboard must be an honest empty collection');
    assert.equal(collection.verifyCloseEvidenceCollectionReceipt(observed, observed.evidenceItems, observed.metadata.collectionReceipt), true);
    assert.equal(fixture.initialPreview.binding.replacementRunId, fixture.recovered.run.id);
    fixture.workActor = { homeOrganizationId: x.organizationId, actorId: actor.id, actorPermissions: fixture.permissions };
    const detail = await getAccountantWorkDetail(fixture.workActor, x.organizationId, fixture.request.id);
    assert.deepEqual(detail.replacement.selection, fixture.initialPreview.selection);
    fixture.retainedHash = f.hash(await retained(x)); fixture.snapshotBefore = await snapshot(x);
    assert.ok(fixture.snapshotBefore.metrics.unavailableEvidenceCount >= fixture.missing.length);
    return fixture;
  }
  async function journey(browser, fixture, locale, width) {
    const { x, actor, password } = fixture, c = copy[locale];
    const row = { locale, width, organizationId: x.organizationId, actorId: actor.id, oldRunId: x.oldRunId,
      findingId: fixture.finding.id, requestId: fixture.request.id, responseId: fixture.response.id, grant: fixture.grantEvidence,
      screenshots: [], keyboard: [], requests: [], responses: [], reads: [], pageErrors: [], blockedOrigins: [], passed: false };
    let context, page, latest, stage = 'initial', manualAccepts = 0;
    const observe = async () => {
      const wire = await page.evaluate(() => window.__ownedReplacementWire ? { responses: window.__ownedReplacementWire.responses, reads: window.__ownedReplacementWire.reads, errors: window.__ownedReplacementWire.errors } : null);
      assert.ok(wire, 'Actual response observer is installed'); row.responses = wire.responses; row.reads = wire.reads; row.responseObserverErrors = wire.errors;
    };
    const setStage = async value => { stage = value; await page.evaluate(({ stage, latestSelection }) => { window.__ownedReplacementWire.stage = stage; window.__ownedReplacementWire.latestSelection = latestSelection; }, { stage, latestSelection: latest?.selection || null }); };
    const shot = async name => { const file = 'close-replacement-browser-' + run + '-' + locale + width + '-' + name + '.png'; await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled' }); row.screenshots.push(file); };
    const keyboard = async (element, action, key = 'Enter') => {
      await expect(element).toBeEnabled(); await element.scrollIntoViewIfNeeded(); await element.focus(); await expect(element).toBeFocused();
      const state = await element.evaluate(target => { const css = getComputedStyle(target); return { focused: document.activeElement === target, outline: css.outlineStyle, width: css.outlineWidth, shadow: css.boxShadow }; });
      assert.ok(state.focused && ((state.outline !== 'none' && Number.parseFloat(state.width) > 0) || state.shadow !== 'none'), 'Keyboard operation requires visible focus'); row.keyboard.push({ action, ...state }); await page.keyboard.press(key);
    };
    const layout = async element => {
      const value = await element.evaluate(target => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, width: target.clientWidth, scrollWidth: target.scrollWidth, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches }));
      assert.ok(value.documentWidth <= value.viewport + 1, 'Portfolio page must reflow'); assert.ok(value.scrollWidth <= value.width + 1, 'Review region must reflow'); assert.equal(value.reducedMotion, true); return value;
    };
    try {
      context = await browser.newContext({ viewport: { width, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce' });
      context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000);
      await context.addInitScript(({ requestId, responseId, organizationId, actorId, initialSelection }) => {
        const nativeFetch = window.fetch;
        const wire = window.__ownedReplacementWire = { stage: 'initial', latestSelection: null, responses: [], reads: [], errors: [] };
        function acceptedEnvelope(stream) {
          // The action result shares an RSC stream with unrelated application
          // metadata. Identify the successful action envelope and its DTO;
          // do not treat every field named "code" as an action error.
          const records = new Map();
          for (const line of stream.split('\n')) {
            const match = /^([0-9a-f]+):(\{.*|\[.*)$/.exec(line.trim());
            if (!match) continue;
            try { records.set(match[1], JSON.parse(match[2])); } catch { /* Non-JSON RSC records are not action envelopes. */ }
          }
          const seen = new Set();
          function dereference(value, depth = 0) {
            if (depth > 16 || typeof value !== 'string') return value;
            const ref = /^\$(?:@)?([0-9a-f]+)$/.exec(value);
            return ref && records.has(ref[1]) ? dereference(records.get(ref[1]), depth + 1) : value;
          }
          function visit(value, depth = 0) {
            value = dereference(value);
            if (!value || typeof value !== 'object' || depth > 64 || seen.has(value)) return null;
            seen.add(value);
            const dto = dereference(value.data);
            if (value.success === true && dto && typeof dto === 'object' &&
                dto.kind === 'ACCOUNTANT_MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE' && dto.version === 1 &&
                dto.decision === 'ACCEPTED' && dto.findingStatus === 'RESOLVED' &&
                dto.requestId === requestId && dto.responseId === responseId &&
                dto.organizationId === organizationId && dto.acceptedById === actorId && typeof dto.id === 'string') {
              const selected = dereference(dto.replacement);
              if (selected && typeof selected.checklistItemId === 'string' && typeof selected.bindingHash === 'string') {
                return { id: dto.id, requestId: dto.requestId, responseId: dto.responseId, organizationId: dto.organizationId,
                  acceptedById: dto.acceptedById, checklistItemId: selected.checklistItemId, bindingHash: selected.bindingHash };
              }
            }
            for (const child of Object.values(value)) { const found = visit(child, depth + 1); if (found) return found; }
            return null;
          }
          for (const record of records.values()) { const found = visit(record); if (found) return found; }
          return null;
        }
        window.fetch = async function (...args) {
          const init = args[1], headers = new Headers(init?.headers || (args[0] instanceof Request ? args[0].headers : undefined)), body = typeof init?.body === 'string' ? init.body : '';
          const action = headers.has('next-action'), acceptance = action && body.includes(requestId) && body.includes('responseId') && body.includes('resolutionNotes');
          const detail = action && body.includes(requestId) && !body.includes('responseId'), atStage = wire.stage, latestSelection = wire.latestSelection;
          const result = await Reflect.apply(nativeFetch, this, args);
          // Clone the actual response; never replace network data or retain raw bodies/passwords/tokens.
          if (acceptance || detail) result.clone().text().then(text => {
            if (acceptance) wire.responses.push({ stage: atStage, status: result.status,
              code: /"code"\s*:\s*"(CONFLICT|FRESH_AUTH_REQUIRED|FORBIDDEN)"/.exec(text)?.[1] || null,
              codeFieldPresent: /"code"\s*:/.test(text), successFalse: /"success"\s*:\s*false/.test(text),
              acceptanceEnvelope: acceptedEnvelope(text),
              targetsInitial: body.includes(initialSelection.checklistItemId) && body.includes(initialSelection.bindingHash),
              targetsLatest: !!latestSelection && body.includes(latestSelection.checklistItemId) && body.includes(latestSelection.bindingHash) });
            else wire.reads.push({ stage: atStage, containsInitial: text.includes(initialSelection.checklistItemId),
              containsLatest: !!latestSelection && text.includes(latestSelection.checklistItemId) && text.includes(latestSelection.bindingHash) });
          }).catch(() => wire.errors.push('Actual review action response clone could not be read'));
          return result;
        };
      }, { requestId: fixture.request.id, responseId: fixture.response.id, organizationId: x.organizationId, actorId: actor.id, initialSelection: fixture.initialPreview.selection });
      await context.route('**/*', route => { const origin = new URL(route.request().url()).origin; if (origin === base) return route.continue(); if (!row.blockedOrigins.includes(origin)) row.blockedOrigins.push(origin); return route.abort(); });
      const signed = await context.request.post(base + '/api/auth/sign-in/email', { data: { email: actor.email, password }, headers: { Origin: base }, timeout: 180000, maxRedirects: 0 }); assert.equal(signed.status(), 200, 'Actual synthetic accountant sign-in succeeds');
      page = await context.newPage(); page.on('pageerror', error => row.pageErrors.push(f.safe(error, secrets)));
      page.on('request', request => { if (request.method() !== 'POST' || !request.headers()['next-action']) return; const body = request.postData() || '';
        if (body.includes(fixture.request.id) && body.includes('responseId') && body.includes('resolutionNotes')) row.requests.push({ stage, targetsInitial: body.includes(fixture.initialPreview.selection.bindingHash), targetsLatest: !!latest && body.includes(latest.selection.bindingHash) }); });
      const began = Date.now(); await page.goto(base + '/' + locale + '/dashboard/accounting/accountant-portfolio', { waitUntil: 'domcontentloaded' });
      const desk = page.getByRole('region', { name: c.title, exact: true }); await expect(desk).toBeVisible();
      const review = desk.getByRole('button', { name: new RegExp('^' + c.review + ':') }); await expect(review).toHaveCount(1); await keyboard(review, 'open-actual-response');
      const detail = page.locator('section[aria-labelledby="accountant-work-detail"]'), notes = page.getByLabel(c.notes, { exact: true });
      const checkbox = page.getByRole('checkbox', { name: c.reviewReplacement, exact: true }), accept = detail.getByRole('button', { name: c.accept, exact: true });
      await expect(detail).toBeVisible(); await expect(detail.getByText(c.collectors['payment-reconciliation'], { exact: true })).toBeVisible();
      await expect(detail.getByText(c.controlOutcome + ': ' + c.controlStatuses[fixture.initialPreview.controlStatus], { exact: true })).toBeVisible();
      await expect(checkbox).not.toBeChecked(); await expect(accept).toBeDisabled();
      const note = locale === 'fr' ? 'Revue locale synthétique : conserver ces notes après le conflit de justificatif.' : 'Synthetic local review: preserve these notes through replacement evidence conflict.';
      await notes.fill(note); await keyboard(checkbox, 'review-first-observation', 'Space'); await expect(checkbox).toBeChecked(); await expect(accept).toBeEnabled();
      row.readyMs = Date.now() - began; row.initialLayout = await layout(detail); await detail.scrollIntoViewIfNeeded(); await shot('initial-source-review');
      if (locale === 'fr') { await accept.scrollIntoViewIfNeeded(); await shot('initial-notes-checkbox-primary-action'); }
      const financialBefore = await d.h.financial();
      const newer = await close.runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: 'owned-browser-newer-' + locale + '-' + run }, { actorId: x.makerId });
      latest = await preview(x, fixture.finding.id); assert.equal(latest.status, 'AVAILABLE'); assert.equal(latest.binding.replacementRunId, newer.run.id);
      assert.notEqual(latest.selection.bindingHash, fixture.initialPreview.selection.bindingHash);
      await setStage('stale-submit');
      async function submit(expected) {
        const pressAccept = async label => { manualAccepts += 1; await keyboard(accept, label); };
        await pressAccept(stage + '-accept');
        const identity = page.getByLabel(c.password, { exact: true });
        const outcome = async () => await identity.isVisible() ? 'identity' : await desk.getByText(expected === 'conflict' ? c.sourceChanged : c.saved, { exact: true }).isVisible() ? expected : 'pending';
        await expect.poll(outcome, { timeout: 180000, intervals: [250, 500, 1000] }).not.toBe('pending');
        if (await outcome() === 'identity') {
          await expect.poll(async () => { await observe(); return row.responses.filter(value => value.code === 'FRESH_AUTH_REQUIRED').length; }).toBeGreaterThan(0);
          const beforeIdentity = row.requests.length; await expect(identity).toBeFocused(); await identity.fill(password);
          await keyboard(detail.getByRole('button', { name: c.confirmIdentity, exact: true }), stage + '-confirm-identity');
          await expect(desk.getByText(c.authenticated, { exact: true })).toBeVisible(); await expect(identity).not.toBeVisible(); await expect(accept).toBeFocused();
          assert.equal(row.requests.length, beforeIdentity, 'Fresh identity cannot automatically accept a review'); await expect(notes).toHaveValue(note);
          await pressAccept(stage + '-manual-after-identity'); await expect.poll(outcome, { timeout: 180000 }).toBe(expected);
          row.identityChallengeObserved = true;
        } else { assert.equal(await outcome(), expected); row.identityChallengeObserved ??= false; }
        await expect.poll(async () => { await observe(); return row.responses.length; }).toBe(manualAccepts);
        assert.equal(row.requests.length, manualAccepts, 'Only manual acceptance requests are permitted');
      }
      await submit('conflict');
      await expect.poll(async () => { await observe(); return row.responses.filter(value => value.code === 'CONFLICT' && value.targetsInitial).length; }).toBe(1);
      await expect.poll(async () => { await observe(); return row.reads.some(value => value.stage === 'stale-submit' && value.containsLatest); }).toBe(true);
      await expect(checkbox).toBeEnabled(); await expect(checkbox).not.toBeChecked(); await expect(accept).toBeDisabled(); await expect(notes).toHaveValue(note);
      assert.equal(await db.accountantComment.count({ where: { organizationId: x.organizationId, findingId: fixture.finding.id, visibility: 'ACCOUNTANT_RESPONSE_ACCEPTED' } }), 0);
      assert.equal((await db.closeAssuranceFinding.findUniqueOrThrow({ where: { id: fixture.finding.id } })).status, 'IN_REVIEW');
      assert.equal(f.hash(await retained(x)), fixture.retainedHash);
      await detail.scrollIntoViewIfNeeded(); await shot('conflict-refreshed-notes-preserved');
      if (locale === 'fr') { await accept.scrollIntoViewIfNeeded(); await shot('conflict-notes-checkbox-primary-action'); }
      await setStage('explicit-latest-review'); await keyboard(checkbox, 'review-replacement-after-conflict', 'Space'); await expect(checkbox).toBeChecked();
      await submit('saved');
      await expect(detail).not.toBeVisible();
      const acceptances = await db.accountantComment.findMany({ where: { organizationId: x.organizationId, findingId: fixture.finding.id, visibility: 'ACCOUNTANT_RESPONSE_ACCEPTED' } });
      assert.equal(acceptances.length, 1); const acceptance = acceptances[0];
      const binding = replacement.parseCloseEvidenceReplacementBinding(acceptance.metadata.replacementBinding); assert.ok(binding);
      assert.deepEqual(replacement.closeEvidenceReplacementSelection(binding), latest.selection); assert.equal(binding.replacementRunId, newer.run.id);
      assert.equal(acceptance.authorId, actor.id); assert.equal(acceptance.body, note); assert.ok(acceptance.createdAt >= new Date(latest.observedAt));
      const verified = await db.$transaction(tx => replacement.getVerifiedCloseEvidenceReplacementsInTx(tx, x.organizationId), { isolationLevel: 'RepeatableRead' });
      assert.deepEqual(verified.evidenceIds, fixture.missing.map(item => item.id).sort());
      const after = await snapshot(x); assert.equal(after.metrics.unavailableEvidenceCount, fixture.snapshotBefore.metrics.unavailableEvidenceCount - fixture.missing.length);
      assert.equal(f.hash(await retained(x)), fixture.retainedHash);
      const historical = await getProofTrail({ organizationId: x.organizationId, subjectType: 'close.run', subjectId: x.oldRunId }, db);
      assert.equal(historical.evidenceGrade, 'blocked'); assert.ok(historical.blockers.some(value => value.id === 'close-evidence-unavailable'));
      assert.equal((await d.h.financial()).hash, financialBefore.hash);
      const acceptedResponse = row.responses.filter(value => value.stage === 'explicit-latest-review' && value.targetsLatest &&
        value.acceptanceEnvelope?.id === acceptance.id && value.acceptanceEnvelope.checklistItemId === latest.selection.checklistItemId &&
        value.acceptanceEnvelope.bindingHash === latest.selection.bindingHash);
      assert.equal(acceptedResponse.length, 1); assert.equal(row.requests.length, manualAccepts);
      row.finalLayout = await layout(desk); await desk.scrollIntoViewIfNeeded(); await shot('review-accepted-history-retained');
      row.acceptance = { id: acceptance.id, replacementSelection: latest.selection, replacementRunId: newer.run.id, originalEvidenceIds: verified.evidenceIds,
        unavailableBefore: fixture.snapshotBefore.metrics.unavailableEvidenceCount, unavailableAfter: after.metrics.unavailableEvidenceCount,
        beforeSnapshotHash: fixture.snapshotBefore.sourceHash, afterSnapshotHash: after.sourceHash, retainedOriginalHash: fixture.retainedHash,
        historicalProofGrade: historical.evidenceGrade, actualEmptyReplacementRows: true };
      row.noAutomaticRetry = true; row.draftNotesPreserved = true; row.noOperationFinancialEffects = true; row.passed = row.pageErrors.length === 0;
    } catch (error) { row.error = f.safe(error, secrets); row.stack = f.safe(error.stack || error, secrets); row.failedStage = stage; if (page && !page.isClosed()) await shot('failed-' + stage).catch(() => {}); }
    finally { if (page && !page.isClosed()) await observe().catch(error => row.pageErrors.push('Observer finalization: ' + f.safe(error, secrets))); if (context) await context.close(); if (row.pageErrors.length || row.responseObserverErrors?.length) row.passed = false; }
    console.log(JSON.stringify({ locale, width, passed: row.passed, failedStage: row.failedStage, error: row.error })); return row;
  }
  async function main() {
    report.listenerBefore = listener(); await helper.withClient(f.target, helper.assertOwned);
    report.sourcesBefore = sources(); report.outsideBefore = await outside(); report.financialBeforeSetup = await d.h.financial();
    const fixtures = []; for (const locale of ['en', 'fr']) fixtures.push(await setup(locale));
    report.fixtures = fixtures.map(value => ({ organizationId: value.x.organizationId, oldRunId: value.x.oldRunId, initialReplacementRunId: value.recovered.run.id,
      actorId: value.actor.id, findingId: value.finding.id, requestId: value.request.id, responseId: value.response.id, grantEvidence: value.grantEvidence }));
    report.financialAfterSetup = await d.h.financial();
    const browser = await chromium.launch({ headless: true });
    try { for (const [index, pair] of [['en', 1440], ['fr', 320]].entries()) report.journeys.push(await journey(browser, fixtures[index], ...pair)); }
    finally { await browser.close(); }
  }
  async function runMain() {
    try { await main(); } catch (error) { report.error = f.safe(error, secrets); report.stack = f.safe(error.stack || error, secrets); report.prerequisite = error.prerequisite; }
    finally {
      try {
        report.listenerAfter = listener(); report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
        report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore?.hash === report.outsideAfter.hash;
        report.financialAfter = await d.h.financial(); report.noOperationFinancialEffects = report.financialAfterSetup?.hash === report.financialAfter.hash;
      } catch (error) { report.finalizationError = f.safe(error, secrets); }
      report.fixtureOrganizations = [...organizations]; report.passed = !report.error && !report.finalizationError && report.journeys.length === 2 && report.journeys.every(value => value.passed) && report.sourceStable && report.outsideUnchanged && report.noOperationFinancialEffects;
      const file = path.join(__dirname, 'close-replacement-browser-' + run + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      console.log(JSON.stringify({ file, passed: report.passed, error: report.error, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged, noOperationFinancialEffects: report.noOperationFinancialEffects }));
      await db.$disconnect(); if (!report.passed) process.exitCode = 1;
    }
  }
  module.exports = { sources, setup, journey };
  if (require.main === module) runMain();
}
