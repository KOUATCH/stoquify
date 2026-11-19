/** Owned disposable dataset only. Real commands, synthetic sources, local inbox publication; no external transports. */
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Prisma } from '@prisma/client';
import { db } from './db';
import { signIn } from './disposable-business-workflows';
import { hashPassword, verifyPassword } from '../lib/password';
import { hasRbacPermission } from '../lib/security/rbac-permissions';
import { createFiscalYearWithPeriods, closeAccountingPeriod } from '../services/accounting/periods.service';
import { ensureAccountingSettings, markAccountingSetupReady, REQUIRED_ACCOUNTING_MAPPINGS } from '../services/accounting/accounting-settings.service';
import { DEFAULT_POSTING_RULES } from '../services/accounting/default-posting-rules';
import { createPostingRule, type PostingRuleWriteInput } from '../services/accounting/posting-rules.service';
import { createChartAccount } from '../services/accounting/accounts.service';
import { ensureDefaultJournals, createManualJournalEntry } from '../services/accounting/journals.service';
import { postJournalEntry } from '../services/accounting/posting.service';
import { grantAccountantAccess } from '../services/accounting/accountant-access.service';
import { inviteOrGrantAccountantAccess } from '../services/accounting/accountant-client-invite.service';
import { executeFirmEngagementCommand } from '../services/accounting/firm-engagement.service';
import { executeFirmPracticeCommand } from '../services/accounting/firm-practice.service';
import { getObligationRegister, recordObligationRevision } from '../services/compliance/obligation-register.service';
import { runCloseAssurance, commentOnCloseFinding, updateAccountantReview, requestMissingCloseEvidence } from '../services/accounting/close-assurance.service';
import { exportClosePack } from '../services/accounting/close-assurance-pack.service';
import { proposeBalanceSheetEvidence, decideBalanceSheetEvidence } from '../services/accounting/balance-sheet-evidence.service';
import { proposeBankBalanceEvidence } from '../services/reconciliation/bank-balance-evidence.service';
import { getReviewWorkpaperBinder, recordWorkpaperDecision, type WorkpaperActor } from '../services/accounting/review-workpaper.service';
import { executeAdvisoryCommand } from '../services/accounting/advisory-outcomes.service';
import { WORKPAPER_KINDS } from '../services/accounting/review-workpaper.contract';
import { stageOpeningPosition, reviewOpeningPosition } from '../services/onboarding/opening-position.service';
import { approveOpeningCutover, applyOpeningCutover } from '../services/onboarding/opening-cutover.service';
import { submitAccessRequest } from '../services/access-requests/access-request.service';
import { startBranchDailyCloseReview } from '../services/end-of-day-close/end-of-day-close-review.service';
import { signBranchDailyClose } from '../services/end-of-day-close/branch-daily-close-sign-off.service';
import { importProviderStatement } from '../services/payments/statement-import.service';
import { MobileMoneyHmacAdapter } from '../services/payments/adapters/mobile-money-hmac.adapter';
import type { PaymentProviderAdapter } from '../services/payments/payment-ingestion.types';
import { adminPermissions } from '../config/permissions';
import { captureProviderEvent } from '../services/payments/provider-event.service';
import { runPaymentReconciliation } from '../services/reconciliation/payment-reconciliation-run.service';
import { hashBusinessPayload } from '../services/events/business-event.service';
import { runCloseEvidenceNotificationWorker } from '../services/accounting/close-evidence-notification.worker';

type Actor = Awaited<ReturnType<typeof signIn>>;
type Credential = Parameters<typeof signIn>[0];
type Finding = { scenario: string; status: 'COMPLETE' | 'BLOCKED'; detail: unknown };
const CORE = ['synth12_douala', 'synth12_yaounde', 'synth12_bafoussam'];
const AUX = 'synth12_opening_aux';
const CLOSE_AUX = 'synth12_close_aux';
const FIXED_AT = '2026-10-28T20:00:00.000Z';
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const uuid = (key: string) => { const h = sha(key); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`; };
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const work = (a: Actor): WorkpaperActor => ({ homeOrganizationId: a.organizationId, actorId: a.actorId, actorPermissions: a.actorPermissions, session: { id: a.sessionId, token: a.sessionToken }, lastAuthAt: a.lastAuthAt });
const closeControl = (a: Actor) => ({ actorId: a.actorId, actorPermissions: a.actorPermissions, session: { id: a.sessionId, token: a.sessionToken } });
const errorInfo = (error: unknown) => ({ code: (error as { code?: string })?.code ?? 'ERROR', message: error instanceof Error ? error.message : String(error) });

export async function seedRemainingFirmClose(org: string, suppliedActors: Record<string, Actor>, out: string) {
  const { OUT, NAME, assertManifestTarget } = require('../scripts/disposable-business-dataset.cjs');
  assert(process.env.NODE_ENV === 'test' && CORE.includes(org), 'Owned synthetic test organization required');
  assert(path.resolve(out) === path.resolve(OUT), 'Owned dataset output directory required');
  const manifest = JSON.parse(readFileSync(path.join(out, 'manifest.json'), 'utf8'));
  const target = new URL(process.env.DATABASE_URL || '');
  assert(['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) && NAME.test(decodeURIComponent(target.pathname.slice(1))), 'Disposable localhost database required');
  assert(manifest.status === 'schema-verified', 'Schema verified manifest required'); assertManifestTarget(target, manifest);
  assert(manifest.schemaSha256 === sha(readFileSync(path.resolve('prisma/schema.prisma'))), 'Schema changed since manifest verification');
  assert((await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`)[0].name === manifest.target.database, 'Database identity mismatch');
  assert(new Date().toISOString() === FIXED_AT, 'Parent Date-only synthetic clock required');
  assert(suppliedActors.owner?.organizationId === org && suppliedActors.accountant?.organizationId === org, 'Scoped authenticated actors required');
  const clock = (Date as unknown as { clock?: { setSystemTime(at: number): void } }).clock;
  assert(clock, 'Date-only fake clock must expose restoration');
  const savedTime = Date.now();
  // Authority uses database publication time. Authenticate separate sessions at
  // that real time; restore the parent's historical clock and actor objects.
  const realTime = (await db.$queryRaw<Array<{ at: string }>>`SELECT clock_timestamp()::text AS at`)[0].at;
  clock.setSystemTime(Date.parse(realTime));
  const privateDir = path.resolve('.seed-artifacts/disposable-dataset-2026-10-28');
  const credentials: Credential[] = JSON.parse(readFileSync(path.join(privateDir, 'credentials.json'), 'utf8'));
  const documents = path.join(out, 'synthetic-documents'); mkdirSync(documents, { recursive: true });
  const findings: Finding[] = [], issues: Array<{ scenario: string; code: string; message: string }> = [];
  const activeLogins = new Map<Actor, Credential>();
  const retain = (name: string, bytes: string) => {
    const file = path.join(documents, name);
    if (existsSync(file)) assert(readFileSync(file, 'utf8') === bytes, `Retained synthetic source differs: ${name}`);
    else writeFileSync(file, bytes, 'utf8');
    return { file, hash: 'sha256:' + sha(bytes), reference: `synthetic-document:${name}` };
  };
  const document = (name: string, value: unknown) => retain(name + '.json', JSON.stringify({ classification: 'SYNTHETIC_TEST_ONLY', externalCommunicationPerformed: false, value }, null, 2) + '\n');
  const login = async (organizationId: string, role: string) => {
    const credential = credentials.find(row => row.organizationId === organizationId && row.role === role);
    assert(credential, `Retained ${organizationId}/${role} credential required`);
    const actor = await signIn(credential); activeLogins.set(actor, credential); return actor;
  };
  const complete = (scenario: string, detail: unknown) => findings.push({ scenario, status: 'COMPLETE', detail });
  const blocked = (scenario: string, detail: unknown) => findings.push({ scenario, status: 'BLOCKED', detail });
  const attempt = async (scenario: string, fn: () => Promise<unknown>) => {
    try {
      clock.setSystemTime(Date.parse((await db.$queryRaw<Array<{ at: string }>>`SELECT clock_timestamp()::text AS at`)[0].at));
      for (const [actor, credential] of activeLogins) if (Date.now() - actor.lastAuthAt.getTime() > 120_000) Object.assign(actor, await signIn(credential));
      const result = await fn(); complete(scenario, result); return result;
    }
    catch (error) { const detail = errorInfo(error); issues.push({ scenario, ...detail }); blocked(scenario, detail); return null; }
  };
  const supportingRevision = async (organizationId: string) => String((await db.closeSourceChange.findFirst({
    where: { organizationId, sourceTable: { notIn: ['balance_sheet_evidence', 'bank_balance_evidence', 'reconciliation_no_activity_evidence'] } },
    orderBy: { revision: 'desc' }, select: { revision: true },
  }))?.revision ?? 0);

  async function engagement(firmActors: Record<string, Actor>, clientOwner: Actor, marker: string) {
    const firm = firmActors.owner.organizationId, client = clientOwner.organizationId;
    assert(firm !== client && hasRbacPermission(clientOwner.actorPermissions, 'accounting.close.accountant.invite'), 'Client consent authority required');
    const grants = [];
    for (const role of ['owner', 'accountant']) {
      const a = firmActors[role], user = await db.user.findUniqueOrThrow({ where: { id: a.actorId } });
      const consent = document(`${marker}-${role}-consent`, { firm, client, accountantUserId: a.actorId, consentGrantedById: clientOwner.actorId,
        role: 'PREPARER', effectiveFrom: '2026-01-01T00:00:00Z', expiresAt: '2027-10-28T20:00:00Z', syntheticConsentOnly: true });
      const input = { accountantEmail: user.email, accountantFirmName: `Synthetic practice ${firm}`,
        role: 'PREPARER' as const, consentEvidenceHash: consent.hash, effectiveFrom: new Date('2026-01-01T00:00:00Z'), expiresAt: new Date('2027-10-28T20:00:00Z'), idempotencyKey: `${marker}-${role}-grant` };
      const receipt = await db.businessEvent.findUnique({ where: { organizationId_eventSource_idempotencyKey: {
        organizationId: client, eventSource: 'INTERNAL', idempotencyKey: 'accountant-access-grant-command:' + input.idempotencyKey,
      } } });
      if (!receipt) grants.push(await grantAccountantAccess(client, clientOwner.actorId, input));
      else {
        // ENROLL's database guard changes only activeScopeKey to managed: and
        // deliberately preserves updatedAt. Recover that exact authorized
        // transition against the original command/snapshot, never a new grant.
        const payload = receipt.payload as { commandHash?: string; grantId?: string; grantSnapshotHash?: string };
        const expected = hashBusinessPayload({ organizationId: client, actorId: clientOwner.actorId, accountantUserId: user.id,
          accountantEmail: user.email.trim().toLowerCase(), accountantFirmName: input.accountantFirmName, accountantFirmRegistrationNumber: null,
          role: input.role, consentEvidenceHash: input.consentEvidenceHash, effectiveFrom: input.effectiveFrom.toISOString(), expiresAt: input.expiresAt.toISOString() });
        assert(receipt.actorId === clientOwner.actorId && receipt.eventType === 'ACCOUNTANT_ACCESS_GRANT_COMMAND_APPLIED' && receipt.status === 'APPLIED'
          && payload?.commandHash === expected && payload.grantId && receipt.sourceId === payload.grantId && receipt.payloadHash === hashBusinessPayload(payload), 'Retained consent command differs');
        const grant = await db.accountantAccessGrant.findUniqueOrThrow({ where: { id: payload.grantId } });
        const plainScope = `${client}:${user.id}`, managedScope = `managed:${plainScope}`;
        assert(user.isActive && grant.organizationId === client && grant.accountantUserId === user.id && grant.status === 'ACTIVE'
          && !grant.revokedAt && !grant.revokedById && grant.expiresAt > new Date() && [plainScope, managedScope].includes(grant.activeScopeKey ?? '')
          && payload.grantSnapshotHash === hashBusinessPayload({ ...grant, activeScopeKey: plainScope }), 'Retained consent or its approved terms changed');
        if (grant.activeScopeKey === managedScope) assert(await db.firmEngagementGrantLink.findFirst({ where: { grantId: grant.id,
          clientOrganizationId: client, firmOrganizationId: firm, accountantUserId: user.id } }), 'Managed consent requires its actual enrollment');
        grants.push(grant);
      }
    }
    const actor = work(firmActors.owner), window = { effectiveFrom: new Date('2026-01-01T00:00:00Z'), expiresAt: new Date('2027-10-28T20:00:00Z') };
    const e = await executeFirmEngagementCommand(actor, { command: 'CREATE', clientOrganizationId: client, ownerUserId: actor.actorId, scope: 'PREPARER', ...window, idempotencyKey: marker + '-create' });
    for (const [i, role] of ['owner', 'accountant'].entries()) {
      await executeFirmEngagementCommand(actor, { command: 'ASSIGN', engagementId: e.engagementId, expectedVersion: 0, accountantUserId: firmActors[role].actorId, expectedAssignmentVersion: 0, scope: 'PREPARER', ...window, idempotencyKey: `${marker}-${role}-assign` });
      await executeFirmEngagementCommand(actor, { command: 'ENROLL', engagementId: e.engagementId, expectedVersion: 0, grantId: grants[i].id, idempotencyKey: `${marker}-${role}-enroll` });
    }
    const active = await executeFirmEngagementCommand(actor, { command: 'TRANSITION', engagementId: e.engagementId, expectedVersion: 0, status: 'ACTIVE', reason: 'Activate explicitly consented synthetic multi-client practice scenario.', idempotencyKey: marker + '-activate' });
    assert(active.status === 'ACTIVE', 'Engagement activation failed'); return active.engagementId;
  }

  async function assess(organizationId: string, periodId: string, owner: Actor, accountant: Actor, marker: string, notify = true) {
    // Reassess only when retained source revision changes. Wall-clock retries
    // reuse the same run, requests and draft export without proof churn.
    marker += '-r' + String((await db.closeSourceRevision.findUnique({ where: { organizationId }, select: { revision: true } }))?.revision ?? 0);
    let run = await db.closeRun.findFirst({ where: { organizationId, periodId, correlationId: marker }, orderBy: { createdAt: 'desc' } });
    if (!run) {
      await runCloseAssurance(organizationId, { periodId, correlationId: marker }, closeControl(owner));
      run = await db.closeRun.findFirstOrThrow({ where: { organizationId, periodId, correlationId: marker } });
    }
    assert(run.completedAt && !['DRAFT', 'RUNNING', 'VOIDED'].includes(run.status), 'Completed retained close assessment required');
    if (!await db.accountantComment.findFirst({ where: { organizationId, correlationId: marker + '-comment' } }))
      await commentOnCloseFinding(organizationId, { closeRunId: run.id, body: 'Synthetic test close assessment: retain every observed blocker; this note does not certify completeness or statutory compliance.', correlationId: marker + '-comment' }, closeControl(accountant));
    if (!await db.accountantReview.findFirst({ where: { organizationId, correlationId: marker + '-review' } }))
      await updateAccountantReview(organizationId, { closeRunId: run.id, status: 'OPEN', decisionNotes: 'Independent synthetic accountant review opened. Missing support remains unresolved; no approval for close is asserted.', correlationId: marker + '-review' }, closeControl(accountant));
    if (notify) {
      const candidates = await db.closeAssuranceFinding.findMany({ where: { organizationId, closeRunId: run.id, status: { in: ['OPEN', 'ASSIGNED', 'IN_REVIEW', 'REOPENED'] } },
        include: { checklistItem: { select: { status: true, evidenceCount: true } }, evidenceItems: { where: { available: false }, select: { id: true }, take: 1 } }, orderBy: { id: 'asc' } });
      const finding = candidates.find(row => row.evidenceItems.length > 0 || row.checklistItem?.status === 'UNAVAILABLE' || row.checklistItem?.evidenceCount === 0);
      if (finding && !await db.accountantComment.findFirst({ where: { organizationId, correlationId: marker + '-request' } })) {
        await requestMissingCloseEvidence(organizationId, { findingId: finding.id, requestedFromId: accountant.actorId,
          requestText: 'Synthetic local evidence request: investigate the retained source finding and provide traceable support. No external message is sent.', dueAt: new Date('2027-01-15T12:00:00Z'), correlationId: marker + '-request' }, closeControl(owner));
      }
    }
    let pack = await db.closePackExport.findFirst({ where: { organizationId, closeRunId: run.id, correlationId: marker + '-draft' } });
    if (!pack) {
      const exported = await exportClosePack(organizationId, { closeRunId: run.id, mode: 'DRAFT_NOT_CERTIFIED', correlationId: marker + '-draft' }, owner);
      assert(!exported.isCertified && exported.mode === 'DRAFT_NOT_CERTIFIED', 'Draft export must remain uncertified');
      retain(marker + '-close-pack.json', exported.content);
      pack = await db.closePackExport.findUniqueOrThrow({ where: { id: exported.exportId } });
    }
    return { runId: run.id, status: run.status, highBlockers: run.highBlockerCount, criticalBlockers: run.criticalBlockerCount, draftExportId: pack.id };
  }

  async function setupAuxiliary() {
    const ownerId = `${AUX}_user_owner`, auxFile = path.join(privateDir, 'auxiliary-credentials.json');
    const existing = await db.organization.findUnique({ where: { id: AUX } });
    if (existing) assert(existing.slug === AUX && existing.name === 'Synthetic opening and close capability laboratory', 'Auxiliary identity collision');
    await db.organization.upsert({ where: { id: AUX }, update: {}, create: { id: AUX, slug: AUX, name: 'Synthetic opening and close capability laboratory',
      country: 'Cameroon', countryCode: 'CM', currency: 'XAF', timezone: 'Africa/Douala', defaultLocale: 'EN',
      requestedModules: ['accounting', 'finance', 'compliance', 'reports', 'close_assurance', 'payment_reconciliation', 'dashboard', 'inventory', 'purchasing', 'sales'] } });
    const auxCredentials: Credential[] = existsSync(auxFile) ? JSON.parse(readFileSync(auxFile, 'utf8')) : [];
    const permissions = [...new Set([...adminPermissions.filter(permission => /^(accounting|payments|compliance|dashboard|branch)\./.test(permission)),
      'accounting.close.evidence.request', 'inventory.stock.adjust', 'inventory.adjust.approve', 'purchasing.ap.invoice.post', 'customers.update', 'users.read'])];
    const auxActors: Record<string, Actor> = {};
    for (const [role, code, firstName, lastName] of [['owner', 'admin', 'Nadine', 'Fomba'], ['accountant', 'accountant', 'Alain', 'Mbah'], ['checker', 'administrator', 'Celine', 'Tchoumi']]) {
      const id = `${AUX}_user_${role}`, roleId = `${AUX}_role_${role}`;
      let credential = auxCredentials.find(row => row.role === role);
      const expectedEmail = `${role}@${AUX.replace(/_/g, '-')}.example.test`;
      if (!credential) {
        assert(!await db.user.findUnique({ where: { id } }), 'Existing auxiliary user has no retained credential');
        credential = { organizationId: AUX, userId: id, role, email: expectedEmail, password: `Synthetic!${randomBytes(22).toString('base64url')}9a` };
        auxCredentials.push(credential); writeFileSync(auxFile, JSON.stringify(auxCredentials, null, 2) + '\n', { mode: 0o600 });
      }
      assert(credential.organizationId === AUX && credential.userId === id, 'Auxiliary credential identity differs');
      // Recover only the exact synthetic fixture's earlier non-DNS underscore
      // domain; preserve password/account identity and all human data.
      if (credential.email === `${role}@${AUX}.example.test`) {
        const retainedUser = await db.user.findUnique({ where: { id } });
        assert(!retainedUser || retainedUser.organizationId === AUX && [credential.email, expectedEmail].includes(retainedUser.email), 'Auxiliary email recovery identity mismatch');
        if (retainedUser && retainedUser.email !== expectedEmail) await db.user.update({ where: { id }, data: { email: expectedEmail } });
        credential.email = expectedEmail; writeFileSync(auxFile, JSON.stringify(auxCredentials, null, 2) + '\n', { mode: 0o600 });
      }
      assert(credential.email === expectedEmail, 'Auxiliary email differs from retained fixture');
      const retainedRole = await db.role.upsert({ where: { id: roleId }, update: {}, create: { id: roleId, organizationId: AUX, code, nameEn: `Synthetic opening ${role}`, permissions } });
      assert(retainedRole.organizationId === AUX && retainedRole.code === code && JSON.stringify(retainedRole.permissions) === JSON.stringify(permissions), 'Auxiliary role fixture differs');
      if (!await db.user.findUnique({ where: { id } })) {
        const hashed = await hashPassword(credential.password);
        await db.user.create({ data: { id, organizationId: AUX, email: credential.email, name: `${firstName} ${lastName} (Synthetic)`, firstName, lastName,
          password: hashed, emailVerified: true, isVerified: true, preferredLocale: 'EN', mfaBackupCodes: [], roles: { connect: { id: roleId } },
          accounts: { create: { id: id + '_credential', accountId: id, providerId: 'credential', password: hashed } } } });
      }
      const account = await db.account.findFirstOrThrow({ where: { userId: id, providerId: 'credential' } });
      assert(await verifyPassword(credential.password, account.password), 'Auxiliary retained credential verification failed');
      auxActors[role] = await signIn(credential); activeLogins.set(auxActors[role], credential);
    }
    const location = await db.location.upsert({ where: { id: AUX + '_loc_0' }, update: {}, create: { id: AUX + '_loc_0', organizationId: AUX, code: 'OPENING', name: 'Synthetic capability laboratory', type: 'STORE', isDefault: true, managerId: ownerId } });
    assert(location.organizationId === AUX && location.managerId === ownerId, 'Auxiliary location fixture differs');
    await ensureAccountingSettings(AUX, ownerId);
    let fiscalYear = await db.fiscalYear.findFirst({ where: { organizationId: AUX, name: '2026' } });
    if (!fiscalYear) fiscalYear = await createFiscalYearWithPeriods(AUX, { name: '2026', startDate: new Date('2025-12-31T23:00:00Z'), endDate: new Date('2026-12-31T00:00:00Z'), createMonthlyPeriods: false }, ownerId);
    // The opening pilot's cutover is local midnight Africa/Douala (UTC+1).
    // The generic monthly builder uses UTC; explicitly author this fresh
    // reference calendar before any financial rows, with exact reuse checks.
    for (let month = 0; month < 12; month++) {
      const id = `${AUX}_period_2026_${String(month + 1).padStart(2, '0')}`;
      const startDate = new Date(Date.UTC(2026, month, 1) - 3600000), endDate = new Date(Date.UTC(2026, month + 1, 1) - 3600001);
      const row = await db.accountingPeriod.upsert({ where: { id }, update: {}, create: { id, organizationId: AUX, fiscalYearId: fiscalYear.id, periodNumber: month + 1, name: `2026-${String(month + 1).padStart(2, '0')} Africa/Douala`, startDate, endDate } });
      assert(row.organizationId === AUX && +row.startDate === +startDate && +row.endDate === +endDate, 'Auxiliary local calendar differs');
    }
    const accountSpecs = [
      ['571100', 'CASH_ON_HAND', 'ASSET', 'DEBIT'], ['101100', 'OWNER_CAPITAL', 'EQUITY', 'CREDIT'],
      ['411100', 'ACCOUNTS_RECEIVABLE', 'ASSET', 'DEBIT'], ['401100', 'ACCOUNTS_PAYABLE', 'LIABILITY', 'CREDIT'],
      ['311100', 'INVENTORY', 'ASSET', 'DEBIT'], ['521100', 'BANK', 'ASSET', 'DEBIT'],
      ['471900', 'SYNTHETIC_BANK_SUSPENSE', 'ASSET', 'DEBIT'],
    ] as const;
    for (const [code, mappingKey, type, normalBalance] of accountSpecs) {
      if (!await db.chartOfAccount.findUnique({ where: { organizationId_code: { organizationId: AUX, code } } }))
        await createChartAccount(AUX, { code, nameEn: 'Synthetic ' + mappingKey, type, normalBalance, mappingKey, currency: 'XAF', syscohadaClass: code[0] }, ownerId);
    }
    const journalCodes = ['GEN', 'OD', 'AN', 'VT', 'AC', 'CA', 'BQ', 'ST'];
    const retainedJournals = await db.journal.findMany({ where: { organizationId: AUX, code: { in: journalCodes } } });
    if (retainedJournals.length !== journalCodes.length) await ensureDefaultJournals(AUX, ownerId);
    else assert(retainedJournals.every(row => row.isActive && row.isDefault), 'Auxiliary default journal configuration changed');
    const accounts = await db.chartOfAccount.findMany({ where: { organizationId: AUX } });
    const cash = accounts.find(a => a.mappingKey === 'CASH_ON_HAND')!, equity = accounts.find(a => a.mappingKey === 'OWNER_CAPITAL')!;
    assert(cash && equity, 'Auxiliary opening mapping absent');
    const source = { version: 'opening-position-v1', country: 'CM', currency: 'XAF', cutoverDate: '2026-10-01', timezone: 'Africa/Douala',
      evidenceReference: 'SYNTHETIC opening owner contribution; no live balances', stock: [], openItems: [], ledger: [
        { sourceId: 'opening-cash', account: 'cash', domain: 'CASH', side: 'DEBIT', amount: '2500000.00', currency: 'XAF', covers: [] },
        { sourceId: 'opening-capital', account: 'capital', domain: 'EQUITY', side: 'CREDIT', amount: '2500000.00', currency: 'XAF', covers: [] },
      ] };
    const controls = { version: 'opening-controls-v1', evidenceReference: 'SYNTHETIC independent opening control totals', country: 'CM', currency: 'XAF', cutoverDate: '2026-10-01', stock: '0.00', ar: '0.00', ap: '0.00', debit: '2500000.00', credit: '2500000.00', quantities: [] };
    const sourceContent = JSON.stringify(source, null, 2) + '\n', controlsContent = JSON.stringify(controls, null, 2) + '\n';
    retain(AUX + '-opening-source.json', sourceContent); retain(AUX + '-opening-controls.json', controlsContent);
    const staged = await stageOpeningPosition(work(auxActors.accountant), { sourceFilename: AUX + '-opening-source.json', sourceContent,
      controlsFilename: AUX + '-opening-controls.json', controlsContent, mappings: { accounts: [{ source: 'cash', targetId: cash.id }, { source: 'capital', targetId: equity.id }], customers: [], suppliers: [], items: [], locations: [] }, expectedRevision: 0, idempotencyKey: AUX + '-stage-v1' });
    const revision = await db.financialOpeningRevision.findUniqueOrThrow({ where: { id: staged.id } });
    await reviewOpeningPosition(work(auxActors.checker), { revisionId: revision.id, expectedDigest: revision.manifestDigest, decision: 'REVIEWED', conclusion: 'Synthetic source and independent controls reconcile to 2,500,000 XAF cash and capital; no operational balances imported.', idempotencyKey: AUX + '-review-v1' });
    const approved = await approveOpeningCutover(work(auxActors.owner), { revisionId: revision.id, expectedDigest: revision.manifestDigest, conclusion: 'Independent client operator authorizes this disposable synthetic opening after matching source review.', idempotencyKey: AUX + '-approve-v1' });
    const input = { executionId: approved.id, idempotencyKey: AUX + '-apply-v1', confirmFinancialApply: true };
    const applied = await applyOpeningCutover(work(auxActors.owner), input), replay = await applyOpeningCutover(work(auxActors.owner), input);
    assert(applied.status === 'ACTIVE' && replay.replayed && applied.id === replay.id, 'Controlled opening activation/replay failed');
    assert(await db.financialOpeningOperation.count({ where: { organizationId: AUX, executionId: applied.id } }) === 1, 'One controlled ledger operation expected');
    complete('auxiliary-controlled-opening', { organizationId: AUX, personas: 3, locations: 1, chartAccounts: accounts.length, executionId: applied.id, status: applied.status, replayed: replay.replayed, reconciliation: applied.reconciliation });
    return { actors: auxActors, accounts };
  }

  async function cleanPeriodClosure() {
    const organizationId = CLOSE_AUX, periodId = CLOSE_AUX + '_period_2026_08';
    const identity = { name: 'Synthetic funded-period close capability laboratory', slug: CLOSE_AUX };
    const existing = await db.organization.findUnique({ where: { id: organizationId } });
    if (existing) {
      assert(existing.slug === identity.slug && [identity.name, 'Synthetic empty-period close capability laboratory'].includes(existing.name), 'Clean-close auxiliary identity collision');
      if (existing.name !== identity.name) await db.organization.update({ where: { id: organizationId }, data: { name: identity.name } });
    }
    else await db.organization.create({ data: { id: organizationId, ...identity, country: 'Cameroon', countryCode: 'CM', currency: 'XAF',
      timezone: 'Africa/Douala', defaultLocale: 'EN', requestedModules: ['accounting', 'finance', 'compliance', 'reports', 'close_assurance', 'dashboard', 'inventory'] } });
    const file = path.join(privateDir, 'close-auxiliary-credentials.json');
    const retainedCredentials: Credential[] = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
    const permissions = [...new Set([...adminPermissions.filter(permission => /^(accounting|dashboard|inventory|compliance)\./.test(permission)), 'users.read'])];
    const actors: Record<string, Actor> = {};
    for (const [role, name] of [['owner', 'Chantal Ntema'], ['checker', 'Denis Fouda']]) {
      const userId = `${organizationId}_user_${role}`, roleId = `${organizationId}_role_${role}`, email = `${role}@synth12-close-aux.example.test`;
      let credential = retainedCredentials.find(row => row.role === role);
      if (!credential) {
        assert(!await db.user.findUnique({ where: { id: userId } }), 'Clean-close user has no retained credential');
        credential = { organizationId, userId, role, email, password: `Synthetic!${randomBytes(22).toString('base64url')}9a` };
        retainedCredentials.push(credential); writeFileSync(file, JSON.stringify(retainedCredentials, null, 2) + '\n', { mode: 0o600 });
      }
      assert(credential.organizationId === organizationId && credential.userId === userId && credential.email === email, 'Clean-close credential identity changed');
      let storedRole = await db.role.findUnique({ where: { id: roleId } });
      if (!storedRole) storedRole = await db.role.create({ data: { id: roleId, organizationId, code: role === 'owner' ? 'admin' : 'administrator', nameEn: `Synthetic close ${role}`, permissions } });
      assert(storedRole.organizationId === organizationId && JSON.stringify(storedRole.permissions) === JSON.stringify(permissions), 'Clean-close role configuration changed');
      if (!await db.user.findUnique({ where: { id: userId } })) {
        const password = await hashPassword(credential.password);
        await db.user.create({ data: { id: userId, organizationId, email, name: name + ' (Synthetic)', firstName: name.split(' ')[0], lastName: name.split(' ')[1],
          password, emailVerified: true, isVerified: true, preferredLocale: 'EN', mfaBackupCodes: [], roles: { connect: { id: roleId } },
          accounts: { create: { id: userId + '_credential', accountId: userId, providerId: 'credential', password } } } });
      }
      const account = await db.account.findFirstOrThrow({ where: { userId, providerId: 'credential' } });
      assert(await verifyPassword(credential.password, account.password), 'Clean-close credential verification failed');
      actors[role] = await signIn(credential); activeLogins.set(actors[role], credential);
    }
    const fundingReference = organizationId + '-owner-contribution-20260815';
    const retainedFunding = await db.journalEntry.findFirst({ where: { organizationId, reference: fundingReference }, include: { lines: { include: { account: true } } } });
    assert(await db.providerAccount.count({ where: { organizationId } }) === 0
      && await db.journalEntry.count({ where: { organizationId } }) === (retainedFunding ? 1 : 0), 'Clean-close laboratory has unexpected bank sources or journal activity');
    const sealed = await db.periodControlEvent.findFirst({ where: { organizationId, periodId, operation: 'CLOSE' } });
    if (sealed) {
      const period = await db.accountingPeriod.findUniqueOrThrow({ where: { id: periodId } });
      const approval = sealed.approval as { closeRunId?: string; certifiedExportId?: string; contentHash?: string };
      const pack = approval.certifiedExportId && await db.closePackExport.findUnique({ where: { id: approval.certifiedExportId } });
      assert(period.status === 'CLOSED' && period.lastControlEventId === sealed.id && period.controlVersion === sealed.version
        && pack && pack.isCertified && pack.contentHash === approval.contentHash && pack.closeRunId === approval.closeRunId
        && pack.exportedById === actors.checker.actorId && retainedFunding?.status === 'POSTED' && retainedFunding.lines.length === 2
        && retainedFunding.createdById === actors.owner.actorId && retainedFunding.postedById === actors.checker.actorId
        && retainedFunding.lines.some(line => line.account.mappingKey === 'CASH_ON_HAND' && line.debit.eq(1000000) && line.credit.isZero())
        && retainedFunding.lines.some(line => line.account.mappingKey === 'OWNER_CAPITAL' && line.credit.eq(1000000) && line.debit.isZero()), 'Retained independent clean-period closure proof changed');
      return { organizationId, periodId, status: period.status, eventId: sealed.id, certifiedExportId: pack.id, replayed: true,
        certification: 'APPLICATION_SYSTEM_EVIDENCE_ONLY; statutory authority remains unconfigured' };
    }
    await ensureAccountingSettings(organizationId, actors.owner.actorId);
    let year = await db.fiscalYear.findFirst({ where: { organizationId, name: '2026' } });
    if (!year) year = await createFiscalYearWithPeriods(organizationId, { name: '2026', startDate: new Date('2025-12-31T23:00:00Z'), endDate: new Date('2026-12-31T00:00:00Z'), createMonthlyPeriods: false }, actors.owner.actorId);
    for (const month of [7, 9]) {
      const id = `${organizationId}_period_2026_${String(month + 1).padStart(2, '0')}`;
      const startDate = new Date(Date.UTC(2026, month, 1) - 3600000), endDate = new Date(Date.UTC(2026, month + 1, 1) - 3600001);
      let period = await db.accountingPeriod.findUnique({ where: { id } });
      if (!period) period = await db.accountingPeriod.create({ data: { id, organizationId, fiscalYearId: year.id, periodNumber: month + 1, name: `2026-${String(month + 1).padStart(2, '0')} Africa/Douala`, startDate, endDate } });
      assert(period.organizationId === organizationId && +period.startDate === +startDate && +period.endDate === +endDate && period.status === 'OPEN', 'Clean-close calendar differs');
    }
    const codes: Record<string, string> = { CASH_ON_HAND: '571100', BANK: '521100', CARD_CLEARING: '511100', MOBILE_MONEY_CLEARING: '552100', CHEQUE_CLEARING: '513100',
      ACCOUNTS_RECEIVABLE: '411100', ACCOUNTS_PAYABLE: '401100', GRNI: '408100', SUPPLIER_RETURN_CLAIM: '409100', STORE_CREDIT_LIABILITY: '419100',
      INVENTORY: '311100', SALES_REVENUE: '701100', OUTPUT_VAT: '443100', INPUT_VAT: '445100', COGS: '601100', INVENTORY_VARIANCE: '603100' };
    for (const mapping of [...REQUIRED_ACCOUNTING_MAPPINGS, { key: 'OWNER_CAPITAL', label: 'owner capital', type: 'EQUITY' as const, normalBalance: 'CREDIT' as const, syscohadaClass: '1' },
      { key: 'CASH_VARIANCE', label: 'cash shortage/overage clearing expense', type: 'EXPENSE' as const, normalBalance: 'DEBIT' as const, syscohadaClass: '6' },
      { key: 'OPERATING_EXPENSE', label: 'operating expense', type: 'EXPENSE' as const, normalBalance: 'DEBIT' as const, syscohadaClass: '6' }]) {
      const code = codes[mapping.key] ?? (mapping.key === 'OWNER_CAPITAL' ? '101100' : mapping.key === 'CASH_VARIANCE' ? '658100' : '622100');
      let account = await db.chartOfAccount.findUnique({ where: { organizationId_code: { organizationId, code } } });
      if (!account) account = await createChartAccount(organizationId, { code, nameEn: 'Synthetic ' + mapping.label, mappingKey: mapping.key,
        type: mapping.type, normalBalance: mapping.normalBalance, syscohadaClass: mapping.syscohadaClass, syscohadaReference: code, currency: 'XAF' }, actors.owner.actorId);
      assert(account.mappingKey === mapping.key && account.type === mapping.type && account.normalBalance === mapping.normalBalance && account.isActive, 'Clean-close mapping changed');
    }
    if (await db.journal.count({ where: { organizationId, isDefault: true, isActive: true } }) !== 8) await ensureDefaultJournals(organizationId, actors.owner.actorId);
    const accounts = await db.chartOfAccount.findMany({ where: { organizationId }, orderBy: { code: 'asc' } });
    const rules: PostingRuleWriteInput[] = DEFAULT_POSTING_RULES.filter(rule => rule.lines.every(line => accounts.some(account => account.mappingKey === line.mappingKey)))
      .map(rule => ({ code: rule.code, nameEn: rule.nameEn, nameFr: rule.nameFr, sourceType: rule.sourceType, postingPurpose: rule.postingPurpose, priority: rule.priority,
        lines: rule.lines.map(line => ({ lineNumber: line.lineNumber, side: line.side, amountSource: line.amountSource, mappingKey: line.mappingKey, description: line.description, condition: line.condition || undefined })) }));
    for (const [purpose, source, debit, credit] of [
      ['GOODS_RECEIPT', 'GOODS_RECEIPT', 'INVENTORY', 'GRNI'],
      ['CASH_DRAWER_CLOSE', 'CASH_DRAWER_CLOSE', 'CASH_VARIANCE', 'CASH_ON_HAND'],
      ['EXPENSE_APPROVAL', 'EXPENSE', 'OPERATING_EXPENSE', 'ACCOUNTS_PAYABLE'],
    ] as const) rules.push({ code: 'SYNTHETIC-CLOSE-' + purpose, nameEn: `Synthetic reference scaffold ${purpose}; no transactions exercised`, sourceType: source, postingPurpose: purpose,
      lines: [{ lineNumber: 1, side: 'DEBIT', mappingKey: debit, amountSource: 'SOURCE_AMOUNT' }, { lineNumber: 2, side: 'CREDIT', mappingKey: credit, amountSource: 'SOURCE_AMOUNT' }] });
    for (const rule of rules) if (!await db.postingRule.findFirst({ where: { organizationId, code: rule.code } })) await createPostingRule(organizationId, rule, actors.owner.actorId);
    document(organizationId + '-reference-configuration-v2', { classification: 'EXPLICIT_SYNTHETIC_REFERENCE_CONFIGURATION', mappings: accounts.map(row => ({ id: row.id, code: row.code, mappingKey: row.mappingKey })),
      postingRules: rules.map(rule => rule.code), financialTransactionsTested: false, productionAccountingAdmissionClaimed: false,
      boundary: 'Minimal synthetic capital-funded tenant for actual close approval and period seal. Required reference scaffolds are not evidence of transaction or regulatory correctness; its separate manual contribution is posted through normal controls.' });
    const tick = async () => { clock!.setSystemTime(Date.parse((await db.$queryRaw<Array<{ at: string }>>`SELECT clock_timestamp()::text AS at`)[0].at));
      for (const [actor, credential] of activeLogins) if (Date.now() - actor.lastAuthAt.getTime() > 120000) Object.assign(actor, await signIn(credential)); };
    await tick();
    const settings = await db.organizationAccountingSettings.findUniqueOrThrow({ where: { organizationId } });
    if (!settings.accountingEnabled || !['READY', 'LOCKED'].includes(settings.setupStatus))
      await markAccountingSetupReady(organizationId, actors.checker.actorId, { actorPermissions: actors.checker.actorPermissions, lastAuthAt: actors.checker.lastAuthAt });
    const cash = accounts.find(row => row.mappingKey === 'CASH_ON_HAND')!, equity = accounts.find(row => row.mappingKey === 'OWNER_CAPITAL')!;
    const fundingDoc = document(fundingReference, { organizationId, reference: fundingReference, effectiveAt: '2026-08-15T12:00:00.000Z',
      amount: '1000000.00', currency: 'XAF', debitAccountId: cash.id, creditAccountId: equity.id,
      nature: 'Synthetic owner cash-capital contribution for initial working funds; no external deposit, payment, signature or real capital claim.' });
    let funding = retainedFunding ?? await createManualJournalEntry(organizationId, {
      journalId: (await db.journal.findFirstOrThrow({ where: { organizationId, code: 'GEN', isActive: true } })).id,
      entryDate: new Date('2026-08-15T12:00:00.000Z'), reference: fundingReference, memo: 'Synthetic owner contribution for funded-period close test',
      lines: [{ accountId: cash.id, debit: '1000000', credit: '0', currency: 'XAF', metadata: { syntheticDocumentHash: fundingDoc.hash } },
        { accountId: equity.id, debit: '0', credit: '1000000', currency: 'XAF' }],
    }, actors.owner.actorId);
    const checkedFunding = await db.journalEntry.findUniqueOrThrow({ where: { id: funding.id }, include: { lines: true } });
    assert(checkedFunding.createdById === actors.owner.actorId && checkedFunding.entryDate.toISOString() === '2026-08-15T12:00:00.000Z'
      && checkedFunding.lines.length === 2 && checkedFunding.lines.some(line => line.accountId === cash.id && line.debit.eq(1000000) && line.credit.isZero())
      && checkedFunding.lines.some(line => line.accountId === equity.id && line.credit.eq(1000000) && line.debit.isZero()), 'Synthetic capital source differs');
    if (funding.status === 'DRAFT') await postJournalEntry(organizationId, funding.id, actors.checker.actorId, { actorPermissions: actors.checker.actorPermissions, lastAuthAt: actors.checker.lastAuthAt });
    funding = await db.journalEntry.findUniqueOrThrow({ where: { id: funding.id }, include: { lines: { include: { account: true } } } });
    assert(funding.status === 'POSTED' && funding.postedById === actors.checker.actorId, 'Independent capital posting failed');
    await tick();
    const revision = await supportingRevision(organizationId), balanceAccounts = accounts.filter(row => ['ASSET', 'LIABILITY', 'EQUITY'].includes(row.type));
    assert(accounts.length === 19 && balanceAccounts.length === 14, 'Clean-close reference footprint differs');
    for (const account of balanceAccounts) {
      const funded = ['CASH_ON_HAND', 'OWNER_CAPITAL'].includes(account.mappingKey ?? '');
      const doc = document(`${organizationId}-august-${account.code}-support-r${revision}`, { organizationId, periodId, accountId: account.id,
        journalEntryId: funded ? funding.id : null, assertion: funded ? 'Actual independently posted synthetic owner contribution: opening zero, additions 1000000 XAF, reductions zero, closing 1000000 XAF.'
          : 'No opening balance or posted lines for this account in August; the separate cash/capital contribution does not affect this account.' });
      const proposed = await proposeBalanceSheetEvidence({ ledgerAccountId: account.id, periodId, currency: 'XAF', idempotencyKey: `${organizationId}-${account.code}-r${revision}`,
        scheduleKind: account.type === 'EQUITY' ? 'EQUITY' : account.mappingKey === 'ACCOUNTS_RECEIVABLE' ? 'RECEIVABLES' : account.type === 'LIABILITY' ? 'PAYABLES' : account.mappingKey === 'INVENTORY' ? 'INVENTORY' : 'CASH',
        basis: funded ? 'SUPPORTING_SCHEDULE' : 'ZERO_ACTIVITY', explanation: 'Actual synthetic account activity and opening balance verified by the normal service.', sourceReference: doc.reference, sourceDocumentHash: doc.hash,
        items: funded ? [{ reference: fundingReference, description: 'Synthetic independently posted owner contribution', openingBalance: '0.00', additions: '1000000.00', reductions: '0.00', closingBalance: '1000000.00',
          sourceReference: fundingDoc.reference, sourceDocumentHash: fundingDoc.hash }] : [] }, actors.owner);
      const approved = await decideBalanceSheetEvidence({ evidenceId: proposed.id, expectedEvidenceHash: proposed.evidenceHash, decision: 'APPROVE' }, actors.checker);
      assert(approved.status === 'APPROVED' && approved.approvedById !== approved.proposedById, 'Clean-close independent support approval failed');
    }
    await tick();
    const assessment = await assess(organizationId, periodId, actors.owner, actors.checker, organizationId + '-august-close', false);
    assert(['READY', 'CERTIFIED', 'EXPORTED'].includes(assessment.status) && !assessment.highBlockers && !assessment.criticalBlockers, 'Clean-period assessment is not ready: ' + JSON.stringify(assessment));
    let pack = await db.closePackExport.findFirst({ where: { organizationId, closeRunId: assessment.runId, isCertified: true } });
    if (!pack) {
      await tick();
      const exported = await exportClosePack(organizationId, { closeRunId: assessment.runId, mode: 'CERTIFIED', correlationId: organizationId + '-august-certified' }, actors.checker);
      assert(exported.isCertified, 'Independent system-evidence certification failed');
      retain(organizationId + '-august-certified-close-pack.json', exported.content);
      pack = await db.closePackExport.findUniqueOrThrow({ where: { id: exported.exportId } });
    }
    await tick();
    const period = await db.accountingPeriod.findUniqueOrThrow({ where: { id: periodId } });
    const closed = await closeAccountingPeriod(organizationId, periodId, actors.checker.actorId, { actorPermissions: actors.checker.actorPermissions, lastAuthAt: actors.checker.lastAuthAt, expectedVersion: period.controlVersion });
    const event = await db.periodControlEvent.findFirstOrThrow({ where: { organizationId, periodId, operation: 'CLOSE' } });
    assert(closed?.status === 'CLOSED' && closed.controlVersion === 1 && closed.lastControlEventId === event.id && pack.exportedById !== actors.owner.actorId, 'Independent period closure was not retained');
    return { organizationId, periodId, status: closed.status, eventId: event.id, certifiedExportId: pack.id, accounts: accounts.length,
      balanceSheetSchedules: balanceAccounts.length, users: 2, locations: 0, periods: 2, replayed: false,
      certification: 'APPLICATION_SYSTEM_EVIDENCE_ONLY; statutory authority remains unconfigured' };
  }

  try {
    const actors: Record<string, Actor> = {};
    for (const role of ['owner', 'accountant', 'checker', 'manager', 'employee_self_service']) actors[role] = await login(org, role);
    const next = CORE[(CORE.indexOf(org) + 1) % CORE.length], clientOwner = await login(next, 'owner');
    const firmActors = { owner: actors.owner, accountant: actors.manager };
    const period = await db.accountingPeriod.findFirstOrThrow({ where: { organizationId: org, periodNumber: 9, fiscalYear: { name: '2026' } } });
    const clientPeriod = await db.accountingPeriod.findFirstOrThrow({ where: { organizationId: next, periodNumber: 9, fiscalYear: { name: '2026' } } });

    await attempt('inventory-access-request', async () => {
      const a = actors.employee_self_service, previousFlag = process.env.ACCESS_REQUEST_SUBMISSIONS_ENABLED;
      try {
        process.env.ACCESS_REQUEST_SUBMISSIONS_ENABLED = 'true';
        const request = await submitAccessRequest({ orgId: org, userId: a.actorId, permissions: a.actorPermissions }, { commandId: uuid(org + '-inventory-access'), target: 'items', reason: 'Synthetic employee requests read access for periodic stock-count assistance; awaiting independent access review.' });
        return { id: request.id, decision: request.decision, application: request.application };
      } finally { if (previousFlag === undefined) delete process.env.ACCESS_REQUEST_SUBMISSIONS_ENABLED; else process.env.ACCESS_REQUEST_SUBMISSIONS_ENABLED = previousFlag; }
    });

    await attempt('pending-accountant-invitation', async () => {
      const inviteKeyFile = path.join(privateDir, 'accountant-invite-envelope.key');
      if (!existsSync(inviteKeyFile)) writeFileSync(inviteKeyFile, randomBytes(32).toString('hex'), { mode: 0o600 });
      const consent = document(org + '-invite-consent', { client: org, ownerId: actors.owner.actorId, invitation: 'pending-peer@' + org + '.example.test', delivery: 'LOCAL_OUTBOX_ONLY', role: 'READ_ONLY' });
      const result = await inviteOrGrantAccountantAccess(org, actors.owner.actorId, { accountantEmail: 'pending-peer@' + org + '.example.test', accountantFirmName: 'Synthetic pending independent practice', role: 'READ_ONLY', consentEvidenceHash: consent.hash,
        effectiveFrom: new Date('2026-01-01T00:00:00Z'), expiresAt: new Date('2027-10-28T20:00:00Z'), idempotencyKey: org + '-pending-peer-invite-v1',
        environment: { ...process.env, NEXT_PUBLIC_BASE_URL: 'http://localhost:3187', ACCOUNTANT_INVITE_ENCRYPTION_KEY: readFileSync(inviteKeyFile, 'utf8') } });
      assert(result.outcome === 'INVITED', 'Nonexistent synthetic recipient must remain invited');
      return { outcome: result.outcome, inviteId: result.invite.id, delivery: 'LOCAL_OUTBOX_ONLY; workers disabled; no email sent' };
    });

    const engagementId = await attempt('consented-firm-engagement', () => engagement(firmActors, clientOwner, org + '-firm-to-' + next));
    if (typeof engagementId === 'string') {
      await attempt('firm-practice-plan-effort-budget', async () => {
        const scope = { clientOrganizationId: next, periodId: clientPeriod.id, engagementId }, result = [];
        for (const [recordKey, payload] of [
          ['plan:' + actors.owner.actorId, { kind: 'PLAN', assigneeId: actors.owner.actorId, minutes: 240 }],
          ['effort:synthetic-september-review', { kind: 'EFFORT', minutes: 90, workDate: '2026-09-28', advisoryRevisionId: null, reviewDecisionId: null }],
          ['fee:XAF', { kind: 'FEE', currency: 'XAF', amount: '75000.00' }],
        ] as const) result.push(await executeFirmPracticeCommand(work(actors.owner), { ...scope, command: 'SAVE', recordKey, payload, expectedVersion: 0, idempotencyKey: org + '-practice-' + payload.kind, reason: 'Explicit synthetic practice plan, effort declaration or budget; not revenue, realized capacity or profitability.' }));
        return result;
      });
      await attempt('operational-obligation-register', async () => {
        const register = await getObligationRegister(work(actors.owner), { clientOrganizationId: next, includePayroll: false });
        const source = register.sources.find(row => row.code === 'CLOSE_EVIDENCE_COLLECTION'); assert(source, 'Operational obligation source unavailable');
        return recordObligationRevision(work(actors.owner), { clientOrganizationId: next, command: 'SAVE', expectedVersion: 0, code: source.code, periodId: clientPeriod.id,
          applicability: 'APPLICABLE', dueAt: '2026-09-30T12:00:00.000Z', claimOwnership: true, evidenceId: null, reason: 'Synthetic operational collection obligation remains open pending complete close evidence; no statutory review is claimed.', expectedSourceHash: source.sourceHash, idempotencyKey: org + '-close-obligation-v1' });
      });
    }

    // Scope operating authority through explicit synthetic location-manager
    // reference configuration, preserving any existing non-fixture assignment.
    await attempt('branch-daily-review', async () => {
      const locations = await db.location.findMany({ where: { organizationId: org }, orderBy: { id: 'asc' } });
      for (const row of locations) {
        if (!row.managerId) {
          const changed = await db.location.updateMany({ where: { id: row.id, organizationId: org, managerId: null }, data: { managerId: actors.manager.actorId } });
          assert(changed.count === 1, 'Synthetic location responsibility changed concurrently');
          row.managerId = actors.manager.actorId;
        }
      }
      document(org + '-branch-responsibility-reference', { classification: 'EXPLICIT_SYNTHETIC_REFERENCE_CONFIGURATION', approvalWorkflowTested: false,
        locations: locations.map(row => ({ locationId: row.id, managerId: row.managerId })), purpose: 'Persisted operating scope for real branch close review', realManagementAppointmentClaimed: false });
      const location = locations.find(row => row.managerId && Object.values(actors).some(a => a.actorId === row.managerId));
      assert(location, 'Existing manager assignments do not match an authenticated synthetic actor; refusing overwrite');
      const actor = Object.values(actors).find(a => a.actorId === location.managerId)!;
      const user = await db.user.findUniqueOrThrow({ where: { id: actor.actorId }, include: { roles: true } });
      const accessContext = { orgId: org, userId: user.id, roles: user.roles.map(role => ({ ...role, name: role.nameEn })), permissions: actor.actorPermissions, isSuperUser: false };
      const retained = await db.branchDailyCloseRun.findUnique({ where: { organizationId_idempotencyKey: { organizationId: org, idempotencyKey: org + '-branch-review-v1' } } });
      if (retained) return { runId: retained.id, status: retained.status, blockerCount: retained.blockerCount, replayed: true };
      const review = await startBranchDailyCloseReview({ accessContext, actorId: actor.actorId, locationId: location.id, businessDate: '2026-09-28', idempotencyKey: org + '-branch-review-v1' });
      return { runId: review.run.id, status: review.run.status, blockerCount: review.run.blockerCount };
    });


    const aux = org === CORE[0] ? await setupAuxiliary() : null;
    // Consent receipt events are source revisions. Establish authority before
    // proposing auxiliary support or snapshotting any client workpapers.
    const auxEngagement = aux ? await attempt('auxiliary-firm-engagement', () => engagement(firmActors, aux.actors.owner, org + '-firm-to-' + AUX)) : null;

    await attempt('capital-support-independent-review', async () => {
      const revision = await supportingRevision(org);
      const capital = await db.chartOfAccount.findFirstOrThrow({ where: { organizationId: org, mappingKey: 'OWNER_CAPITAL' } });
      const lines = await db.journalEntryLine.findMany({ where: { organizationId: org, accountId: capital.id, journalEntry: { organizationId: org, status: { in: ['POSTED', 'REVERSED'] }, entryDate: { lte: period.endDate } } }, include: { journalEntry: true }, orderBy: { id: 'asc' } });
      let opening = new Prisma.Decimal(0), additions = new Prisma.Decimal(0), reductions = new Prisma.Decimal(0);
      for (const line of lines) {
        if (line.journalEntry.entryDate < period.startDate) opening = opening.plus(line.credit).minus(line.debit);
        else { additions = additions.plus(line.credit); reductions = reductions.plus(line.debit); }
      }
      const totals = { openingBalance: opening.toFixed(2), additions: additions.toFixed(2), reductions: reductions.toFixed(2), closingBalance: opening.plus(additions).minus(reductions).toFixed(2) };
      const doc = document(org + '-september-capital-support-r' + revision, { nature: 'Synthetic retained owner contribution schedule derived from its actual controlled ledger postings', accountId: capital.id, journalEntryIds: [...new Set(lines.map(row => row.journalEntryId))], totals });
      const proposed = await proposeBalanceSheetEvidence({ ledgerAccountId: capital.id, periodId: period.id, currency: 'XAF', idempotencyKey: org + '-capital-support-r' + revision, scheduleKind: 'EQUITY', basis: 'SUPPORTING_SCHEDULE',
        explanation: 'Synthetic owner contribution roll-forward supported by retained controlled journal entries.', sourceReference: doc.reference, sourceDocumentHash: doc.hash,
        items: [{ reference: 'owner-contribution', description: 'Synthetic owners capital contribution', ...totals, sourceReference: doc.reference, sourceDocumentHash: doc.hash }] }, actors.accountant);
      const reviewed = await decideBalanceSheetEvidence({ evidenceId: proposed.id, expectedEvidenceHash: proposed.evidenceHash, decision: 'APPROVE' }, actors.owner);
      assert(reviewed.status === 'APPROVED' && reviewed.approvedById !== reviewed.proposedById, 'Independent support review failed');
      return { evidenceId: reviewed.id, status: reviewed.status };
    });
    await attempt('september-close-assessment', () => assess(org, period.id, actors.owner, actors.accountant, org + '-remaining-close-202609'));
    await attempt('local-evidence-inbox-publication', async () => {
      const before = await db.closeEvidenceNotification.count({ where: { organizationId: org } });
      // This dedicated publisher has a hard-coded NOTIFICATION channel and
      // stores an internal inbox record. It has no email/network delivery path.
      const publication = await runCloseEvidenceNotificationWorker({ organizationId: org, workerId: org + '-synthetic-local-inbox', limit: 100 });
      const after = await db.closeEvidenceNotification.count({ where: { organizationId: org } });
      assert(after > 0, 'Actual missing-evidence request must publish a local inbox record');
      const replay = await runCloseEvidenceNotificationWorker({ organizationId: org, workerId: org + '-synthetic-local-inbox', limit: 100 });
      assert(await db.closeEvidenceNotification.count({ where: { organizationId: org } }) === after, 'Local notification replay duplicated publications');
      return { before, after, publication, replay, delivery: 'AUTHENTICATED_SYNTHETIC_LOCAL_INBOX_ONLY', externalCommunicationPerformed: false };
    });


    if (aux) {
      const auxPeriod = await db.accountingPeriod.findFirstOrThrow({ where: { organizationId: AUX, periodNumber: 9, fiscalYear: { name: '2026' } } });
      await attempt('bank-balance-unmatched-statement-negative-case', async () => {
        const code = 'SYNTHETIC_OPENING_BANK', ledger = aux.accounts.find(row => row.mappingKey === 'BANK')!, suspenseLedger = aux.accounts.find(row => row.mappingKey === 'SYNTHETIC_BANK_SUSPENSE')!;
        const rail = await db.paymentRail.upsert({ where: { organizationId_code: { organizationId: AUX, code } }, update: {}, create: { id: AUX + '_bank_rail', organizationId: AUX, code, name: 'Synthetic manual bank; no external connection', type: 'BANK_TRANSFER', currencyCode: 'XAF', countryCode: 'CM', metadata: { synthetic: true, referenceFixture: true } } });
        const provider = await db.providerAccount.upsert({ where: { organizationId_providerCode: { organizationId: AUX, providerCode: code } }, update: {}, create: { id: AUX + '_bank_provider', organizationId: AUX, paymentRailId: rail.id, providerCode: code, displayName: 'Synthetic unmatched bank test', currencyCode: 'XAF', countryCode: 'CM', status: 'ACTIVE', settlementLedgerAccountId: ledger.id, suspenseLedgerAccountId: suspenseLedger.id, externalAccountHash: sha(AUX + '-non-routable'), externalAccountMasked: 'SYNTHETIC-NON-ROUTABLE', metadata: { synthetic: true, referenceFixture: true } } });
        assert(provider.organizationId === AUX && provider.settlementLedgerAccountId === ledger.id && rail.type === 'BANK_TRANSFER', 'Auxiliary bank fixture differs');
        const reference = document(AUX + '-bank-reference-configuration', { providerId: provider.id, settlementLedgerAccountId: ledger.id, suspenseLedgerAccountId: suspenseLedger.id,
          requestedById: aux.actors.owner.actorId, fixtureCheckerId: aux.actors.checker.actorId, classification: 'EXPLICIT_SYNTHETIC_REFERENCE_CONFIGURATION', approvalWorkflowTested: false, liveProviderCertificationClaimed: false });
        const settlement = await db.settlementAccount.upsert({ where: { id: AUX + '_bank_settlement' }, update: {}, create: { id: AUX + '_bank_settlement', organizationId: AUX, providerAccountId: provider.id, ledgerAccountId: ledger.id,
          accountReferenceHash: sha(AUX + '-non-routable'), accountReferenceMasked: 'SYNTHETIC-NON-ROUTABLE', approvalStatus: 'APPROVED', requestedById: aux.actors.owner.actorId, approvedById: aux.actors.checker.actorId,
          approvedAt: new Date(FIXED_AT), effectiveFrom: new Date('2026-01-01T00:00:00Z'), metadata: { synthetic: true, referenceFixture: true, approvalWorkflowTested: false, sourceDocumentHash: reference.hash } } });
        assert(settlement.organizationId === AUX && settlement.ledgerAccountId === ledger.id && settlement.approvedById === aux.actors.checker.actorId && provider.suspenseLedgerAccountId === suspenseLedger.id, 'Auxiliary bank reference mapping differs');
        const csv = 'providerTransactionId,providerReference,direction,amount,currencyCode,occurredAt,description\n' + `${AUX}-unmatched-credit,synthetic-unidentified-receipt,CREDIT,1000.00,XAF,2026-09-20T12:00:00.000Z,SYNTHETIC intentionally unmatched bank credit\n`;
        const doc = retain(AUX + '-september-bank.csv', csv), parser = new MobileMoneyHmacAdapter(code);
        const adapter: PaymentProviderAdapter = { providerCode: code, railType: 'BANK_TRANSFER', maxPayloadBytes: parser.maxPayloadBytes, timestampToleranceSeconds: parser.timestampToleranceSeconds,
          canonicalPayload: raw => raw, verifySignature: () => false, parseEvent: () => { throw new Error('No provider events accepted by synthetic fixture'); },
          parseStatement: input => ({ ...parser.parseStatement(input), sourceType: 'SYNTHETIC_MANUAL_BANK_STATEMENT', periodStart: auxPeriod.startDate, periodEnd: auxPeriod.endDate }), fingerprintStatementLine: line => parser.fingerprintStatementLine(line) };
        const imported = await importProviderStatement({ organizationId: AUX, providerAccountId: provider.id, adapter, rawContent: csv, fileName: path.basename(doc.file), importedById: aux.actors.owner.actorId, correlationId: uuid(AUX + '-bank-import') });
        assert(imported.statementFileId && ['IMPORTED', 'DUPLICATE_FILE'].includes(imported.status), 'Auxiliary statement import failed');
        const keyFile = path.join(privateDir, 'auxiliary-provider-hmac.key');
        if (!existsSync(keyFile)) writeFileSync(keyFile, randomBytes(32).toString('hex'), { mode: 0o600 });
        const secret = readFileSync(keyFile, 'utf8'), timestamp = String(Date.now());
        const rawBody = JSON.stringify({ eventId: AUX + '-orphan-event', transactionId: AUX + '-orphan-250-credit', reference: 'SYNTHETIC-ORPHAN-250', eventType: 'SYNTHETIC_PAYMENT_RECEIVED', direction: 'INBOUND', amount: '250.00', currencyCode: 'XAF', occurredAt: '2026-09-20T12:00:00.000Z', synthetic: true });
        retain(AUX + '-provider-event.json', rawBody);
        const eventAdapter: PaymentProviderAdapter = { ...adapter, canonicalPayload: raw => parser.canonicalPayload(raw), verifySignature: input => parser.verifySignature(input), parseEvent: raw => parser.parseEvent(raw) };
        const eventInput = { organizationId: AUX, providerAccountId: provider.id, adapter: eventAdapter, rawBody, secret,
          headers: { 'x-provider-timestamp': timestamp, 'x-provider-signature': createHmac('sha256', secret).update(`${timestamp}.${parser.canonicalPayload(rawBody)}`).digest('hex') }, correlationId: uuid(AUX + '-provider-event') };
        const captured = await captureProviderEvent(eventInput), eventReplay = await captureProviderEvent(eventInput);
        assert(['CAPTURED', 'DUPLICATE'].includes(captured.status) && eventReplay.status === 'DUPLICATE', 'Signed synthetic provider event must replay without duplication');
        let recon = await db.reconciliationRun.findFirst({ where: { organizationId: AUX, providerAccountId: provider.id, correlationId: uuid(AUX + '-orphan-reconciliation') } });
        if (!recon) {
          const result = await runPaymentReconciliation({ organizationId: AUX, providerAccountId: provider.id, businessDate: new Date('2026-09-20T00:00:00Z'), runById: aux.actors.owner.actorId, correlationId: uuid(AUX + '-orphan-reconciliation') });
          recon = await db.reconciliationRun.findUniqueOrThrow({ where: { id: result.runId } });
        }
        const suspense = await db.suspenseItem.findMany({ where: { organizationId: AUX, reconciliationRunId: recon.id }, select: { id: true, status: true, amount: true, currencyCode: true } });
        assert(suspense.length === 2 && suspense.every(row => row.status === 'OPEN'), 'Distinct orphan event and statement must remain two open suspense items');
        complete('provider-event-and-suspense', { providerEventRecordId: captured.providerEventRecordId, replayStatus: eventReplay.status, reconciliationRunId: recon.id, suspense: suspense.map(row => ({ ...row, amount: row.amount.toFixed(2) })), externalProviderContacted: false });
        const proposed = await proposeBankBalanceEvidence({ providerAccountId: provider.id, statementFileId: imported.statementFileId, periodId: auxPeriod.id, idempotencyKey: AUX + '-bank-mismatch-v1',
          openingBalance: '0.00', closingBalance: '1000.00', sourceReference: doc.reference, sourceDocumentHash: doc.hash, timingItems: [] }, aux.actors.owner);
        const balances = (proposed.snapshot as { balances?: { balanced?: boolean; closingDifference?: string } }).balances;
        assert(proposed.status === 'PROPOSED' && balances?.balanced === false && balances.closingDifference === '1000.00', 'Unmatched bank source must remain an explicit difference');
        return { evidenceId: proposed.id, status: proposed.status, exactDifferenceXAF: balances.closingDifference, financialPostingInvented: false };
      });

      await attempt('auxiliary-branch-review-and-signature', async () => {
        const context = async (actor: Actor) => { const user = await db.user.findUniqueOrThrow({ where: { id: actor.actorId }, include: { roles: true } }); return { orgId: AUX, userId: user.id, roles: user.roles.map(role => ({ ...role, name: role.nameEn })), permissions: actor.actorPermissions, isSuperUser: false }; };
        const retained = await db.branchDailyCloseRun.findUnique({ where: { organizationId_idempotencyKey: { organizationId: AUX, idempotencyKey: AUX + '-branch-review-v1' } } });
        const retainedSign = retained && await db.branchDailyCloseSignOff.findFirst({ where: { organizationId: AUX, branchDailyCloseRunId: retained.id, status: 'ACTIVE' } });
        if (retained && (retained.status === 'BLOCKED' || retainedSign)) return { runId: retained.id, status: retained.status, signOffId: retainedSign?.id, replayed: true };
        const review = await startBranchDailyCloseReview({ accessContext: await context(aux.actors.owner), actorId: aux.actors.owner.actorId, locationId: AUX + '_loc_0', businessDate: '2026-09-28', idempotencyKey: AUX + '-branch-review-v1' });
        if (review.run.status !== 'IN_REVIEW') { blocked('branch-signature', { runId: review.run.id, status: review.run.status, blockers: review.run.blockerCount, reason: 'Current readiness must produce IN_REVIEW before the signature service will accept an independent signer.' }); return { runId: review.run.id, status: review.run.status }; }
        const signed = await signBranchDailyClose({ accessContext: await context(aux.actors.checker), actorId: aux.actors.checker.actorId, locationId: AUX + '_loc_0', businessDate: '2026-09-28', idempotencyKey: AUX + '-branch-sign-v1', lastAuthAt: aux.actors.checker.lastAuthAt });
        assert(signed.signOff.status === 'ACTIVE', 'Independent branch signature must be retained');
        return { runId: review.run.id, signOffId: signed.signOff.id, status: signed.signOff.status, finalFinancialCloseClaimed: false };
      });


      await attempt('auxiliary-zero-activity-support', async () => {
        const revision = await supportingRevision(AUX);
        const results = [];
        for (const account of aux.accounts) {
          const kind = account.mappingKey === 'ACCOUNTS_RECEIVABLE' ? 'RECEIVABLES' : account.mappingKey === 'ACCOUNTS_PAYABLE' ? 'PAYABLES' : account.mappingKey === 'INVENTORY' ? 'INVENTORY' : account.mappingKey === 'OWNER_CAPITAL' ? 'EQUITY' : 'CASH';
          const doc = document(`${AUX}-september-${account.code}-zero-activity`, { organizationId: AUX, periodId: auxPeriod.id, accountId: account.id, assertion: 'No opening balance or posted ledger lines before the 1 October controlled opening. September bank statement discrepancy remains separately unapproved.' });
          const row = await proposeBalanceSheetEvidence({ ledgerAccountId: account.id, periodId: auxPeriod.id, currency: 'XAF', idempotencyKey: AUX + '-zero-' + account.code + '-r' + revision, scheduleKind: kind, basis: 'ZERO_ACTIVITY', explanation: 'Synthetic pre-cutover September ledger has no opening balance and no posted lines; verified by the service.', sourceReference: doc.reference, sourceDocumentHash: doc.hash, items: [] }, aux.actors.owner);
          const reviewed = await decideBalanceSheetEvidence({ evidenceId: row.id, expectedEvidenceHash: row.evidenceHash, decision: 'APPROVE' }, aux.actors.checker);
          results.push({ id: reviewed.id, status: reviewed.status, account: account.code });
        }
        return results;
      });
      await attempt('auxiliary-close-assessment', () => assess(AUX, auxPeriod.id, aux.actors.owner, aux.actors.checker, AUX + '-remaining-close-202609'));
      await attempt('auxiliary-advisory-lifecycle', async () => {
        assert(typeof auxEngagement === 'string', 'Auxiliary consented firm engagement required');
        const e = auxEngagement, scope = { clientOrganizationId: AUX, periodId: auxPeriod.id, engagementId: e };
        let binder = await getReviewWorkpaperBinder(work(actors.owner), { clientOrganizationId: AUX, periodId: auxPeriod.id });
        assert(binder.schedules.every(row => row.availability === 'RECONCILED'), 'All four zero-activity schedules must be independently reconciled');
        const prepared = await recordWorkpaperDecision(work(actors.owner), { clientOrganizationId: AUX, periodId: auxPeriod.id, expectedSourceHash: binder.sourceHash, decision: 'PREPARED', conclusion: 'Synthetic pre-cutover ledger schedules have independently checked zero activity. Bank statement discrepancy is separate and remains unresolved.', idempotencyKey: AUX + '-workpaper-prepare' });
        const existingReview = await db.accountantReview.findFirst({ where: { organizationId: AUX, periodId: auxPeriod.id, metadata: { path: ['idempotencyKey'], equals: AUX + '-workpaper-review' } } });
        if (!existingReview) await recordWorkpaperDecision(work(actors.manager), { clientOrganizationId: AUX, periodId: auxPeriod.id, expectedSourceHash: binder.sourceHash, preparationId: prepared.id, decision: 'REVIEWED', conclusion: 'Independently reviewed synthetic pre-cutover zero ledger schedules. This review does not certify bank settlement, close or regulatory readiness.', idempotencyKey: AUX + '-workpaper-review' });
        binder = await getReviewWorkpaperBinder(work(actors.owner), { clientOrganizationId: AUX, periodId: auxPeriod.id });
        assert(binder.reviewState === 'REVIEWED', 'Independent current workpaper review required');
        const common = { ...scope, expectedSourceHash: binder.sourceHash, expectedReviewHash: binder.reviewHash, reason: 'Synthetic authenticated workspace advisory lifecycle; no external delivery or audit opinion.' };
        const draft = await executeAdvisoryCommand(work(actors.owner), { ...common, command: 'DRAFT', expectedVersion: 0, idempotencyKey: AUX + '-advisory-draft', narrative: {
          conclusions: WORKPAPER_KINDS.map(kind => ({ kind, text: 'The synthetic September pre-cutover ledger schedule is zero and independently supported. Separate bank source differences remain unresolved.' })),
          actions: [{ kind: 'CASH', ownerId: aux.actors.owner.actorId, dueAt: '2027-01-15T12:00:00.000Z', title: 'Investigate the unmatched synthetic bank credit before certifying close.' }] }, privateNote: 'Synthetic firm workflow rehearsal; no billing or audit opinion.' });
        const review = await executeAdvisoryCommand(work(actors.manager), { ...common, command: 'REVIEW', expectedVersion: draft.version, idempotencyKey: AUX + '-advisory-review' });
        const agree = await executeAdvisoryCommand(work(aux.actors.owner), { ...common, command: 'AGREE', expectedVersion: review.version, idempotencyKey: AUX + '-advisory-agree' });
        const deliver = await executeAdvisoryCommand(work(actors.owner), { ...common, command: 'DELIVER', expectedVersion: agree.version, idempotencyKey: AUX + '-advisory-publish' });
        return { engagementId: e, advisoryRevisionId: deliver.id, publication: 'AUTHENTICATED_LOCAL_WORKSPACE_ONLY', version: deliver.version };
      });


      // Exercise the real gate; the intentionally unmatched bank credit and any
      // unavailable statutory sources must not be bypassed to create seal rows.
      const retainedControlEvent = await db.periodControlEvent.findFirst({ where: { organizationId: AUX, periodId: auxPeriod.id } });
      if (!retainedControlEvent) {
        try {
          const result = await closeAccountingPeriod(AUX, auxPeriod.id, aux.actors.checker.actorId, { actorPermissions: aux.actors.checker.actorPermissions, lastAuthAt: aux.actors.checker.lastAuthAt, expectedVersion: auxPeriod.controlVersion });
          complete('period-control-event', { periodId: result?.id, status: result?.status });
        } catch (error) { blocked('period-control-event', { ...errorInfo(error), prerequisites: 'Resolve real close blockers, independently certify the current completed-period close pack, then invoke closeAccountingPeriod. Core October periods stay OPEN.' }); }
      }
      await attempt('clean-auxiliary-independent-period-closure', cleanPeriodClosure);
    }
    assert(await db.accountingPeriod.count({ where: { organizationId: { in: CORE }, periodNumber: 10, fiscalYear: { name: '2026' }, status: { not: 'OPEN' } } }) === 0, 'Core October periods must remain OPEN');
    return { organizationId: org, classification: 'SYNTHETIC_TEST_ONLY', findings, issues, externalCommunicationPerformed: false };
  } finally { clock.setSystemTime(savedTime); }
}
