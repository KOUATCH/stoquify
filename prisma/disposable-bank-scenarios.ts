/** Synthetic reference setup plus real service workflows; no provider connection. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Prisma } from '@prisma/client';
import { db } from './db';
import { hasRbacPermission } from '../lib/security/rbac-permissions';
import { createChartAccount } from '../services/accounting/accounts.service';
import { createManualJournalEntry } from '../services/accounting/journals.service';
import { postJournalEntry } from '../services/accounting/posting.service';
import { previewPaymentRequest, submitPaymentRequest, reviewPaymentRequestApproval, confirmPaymentRequestApproval } from '../services/purchasing/payment-request.service';
import { previewPaymentRelease, confirmPaymentRelease, readPaymentReleaseOutcome } from '../services/purchasing/payment-release.service';
import { paymentReconciliationAuthority } from '../services/purchasing/payment-reconciliation-authority';
import { previewPaymentReconciliation, proposePaymentReconciliation, reviewPaymentReconciliation, decidePaymentReconciliation, finalizePaymentReconciliation } from '../services/purchasing/payment-reconciliation-service';
import { MobileMoneyHmacAdapter } from '../services/payments/adapters/mobile-money-hmac.adapter';
import type { PaymentProviderAdapter } from '../services/payments/payment-ingestion.types';
import { importProviderStatement } from '../services/payments/statement-import.service';
import { importProviderStatementForReview } from '../services/payments/provider-operations.service';
import { previewReconciliationSignOff, signReconciliationRun, loadRunForCertification, validateReconciliationRunEvidenceInTx, certificatePayloadHash } from '../services/reconciliation/payment-reconciliation-certification.service';
import { retainedReconciliationSignatureInTx } from '../services/reconciliation/reconciliation-retained-signature';
import { stableReconciliationEvidenceStringify } from '../services/reconciliation/payment-reconciliation-evidence.service';

type Actor = { organizationId: string; actorId: string; sessionId: string; sessionToken: string; actorPermissions: string[]; lastAuthAt: Date };
const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const fixedAt = '2026-10-28T20:00:00.000Z';
function uuid(key: string) { const h = sha(key); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`; }
function ensure(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

export async function seedBankScenario(org: string, actors: Record<string, Actor>, out: string) {
  const { OUT, NAME, assertManifestTarget } = require('../scripts/disposable-business-dataset.cjs');
  ensure(process.env.NODE_ENV === 'test' && ['synth12_douala', 'synth12_yaounde', 'synth12_bafoussam'].includes(org), 'Synthetic test organization required');
  ensure(path.resolve(out) === path.resolve(OUT), 'Owned dataset output directory required');
  const target = new URL(process.env.DATABASE_URL || ''), manifest = JSON.parse(readFileSync(path.join(out, 'manifest.json'), 'utf8'));
  ensure(['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) && NAME.test(decodeURIComponent(target.pathname.slice(1))), 'Disposable localhost database required');
  ensure(manifest.status === 'schema-verified', 'Schema-verified disposable manifest required');
  assertManifestTarget(target, manifest);
  ensure((await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`)[0].name === manifest.target.database, 'Database identity mismatch');
  ensure(new Date().toISOString() === fixedAt, 'Parent must install the Date-only synthetic clock at 2026-10-28T20:00:00Z');
  for (const role of ['owner', 'checker', 'accountant', 'manager']) ensure(actors[role]?.organizationId === org, `Scoped ${role} actor required`);
  ensure(new Set(['owner', 'checker', 'accountant', 'manager'].map(role => actors[role].actorId)).size === 4, 'Four independent synthetic personas required');
  const scope = (role: string) => ({ organizationId: org, actorId: actors[role].actorId, sessionId: actors[role].sessionId, sessionToken: actors[role].sessionToken });
  // Reuse the service's persisted role/session/module checks before import or setup.
  const authority = await db.$transaction(tx => paymentReconciliationAuthority(tx, scope('owner'), 'propose', true));
  for (const permission of ['payments.reconciliation.import', 'payments.reconciliation.run']) ensure(hasRbacPermission(authority.permissions, permission), `Current owner permission required: ${permission}`);

  const documents = path.join(out, 'synthetic-documents'); mkdirSync(documents, { recursive: true });
  const retain = (name: string, bytes: string) => {
    const file = path.join(documents, name);
    if (existsSync(file)) ensure(readFileSync(file, 'utf8') === bytes, `Retained synthetic document changed: ${name}`);
    else writeFileSync(file, bytes, 'utf8');
    return { file, uri: `http://127.0.0.1:3188/${name}`, sha256: sha(bytes) };
  };
  const doc = (name: string, data: unknown) => retain(name + '.json', JSON.stringify({ classification: 'SYNTHETIC_TEST_ONLY', externalTransferPerformed: false, data }, null, 2) + '\n');
  const marker = `${org}-manual-bank-20261028`, providerCode = 'SYNTHETIC_MANUAL_BANK';
  const bankLedger = await db.chartOfAccount.findFirstOrThrow({ where: { organizationId: org, mappingKey: 'BANK', isActive: true } });
  let suspenseLedger = await db.chartOfAccount.findFirst({ where: { organizationId: org, code: '471900' } });
  if (!suspenseLedger) suspenseLedger = await createChartAccount(org, { code: '471900', nameEn: 'Synthetic bank suspense', nameFr: 'Compte transitoire bancaire synthétique', type: 'ASSET', normalBalance: 'DEBIT', mappingKey: 'SYNTHETIC_BANK_SUSPENSE', currency: 'XAF', syscohadaClass: '4' }, actors.owner.actorId);
  ensure(suspenseLedger.isActive && suspenseLedger.mappingKey === 'SYNTHETIC_BANK_SUSPENSE', 'Synthetic suspense account differs from retained fixture');
  const configDocument = doc(marker + '-configuration', { providerCode, railType: 'BANK_TRANSFER', currency: 'XAF', settlementLedgerAccountId: bankLedger.id, suspenseLedgerAccountId: suspenseLedger.id,
    requestedById: actors.owner.actorId, fixtureCheckerId: actors.checker.actorId, recordedAt: fixedAt,
    setupMode: 'EXPLICIT_SYNTHETIC_REFERENCE_FIXTURE', approvalWorkflowTested: false, providerCertificationClaimed: false, accountReference: `NON-ROUTABLE-${org}` });
  const metadata = { synthetic: true, classification: 'SYNTHETIC_REFERENCE_CONFIGURATION', setupApprovalWorkflowTested: false, providerCertificationClaimed: false, documentSha256: configDocument.sha256, documentUri: configDocument.uri };
  // Only reference configuration is inserted directly: no transaction, posting,
  // evidence decision, provider authority, match or certificate is fabricated.
  const rail = await db.paymentRail.upsert({ where: { organizationId_code: { organizationId: org, code: providerCode } }, update: {}, create: {
    id: `${org}_manual_bank_rail`, organizationId: org, code: providerCode, name: 'Synthetic manual bank rail; no live connection', type: 'BANK_TRANSFER', currencyCode: 'XAF', countryCode: 'CM', isActive: true, metadata } });
  const provider = await db.providerAccount.upsert({ where: { organizationId_providerCode: { organizationId: org, providerCode } }, update: {}, create: {
    id: `${org}_manual_bank_provider`, organizationId: org, paymentRailId: rail.id, providerCode, displayName: 'Synthetic manual bank; non-routable', status: 'ACTIVE', currencyCode: 'XAF', countryCode: 'CM', externalAccountHash: sha(`NON-ROUTABLE-${org}`), externalAccountMasked: 'SYNTHETIC-NON-ROUTABLE', statementSource: 'SYNTHETIC_MANUAL_CSV', settlementLedgerAccountId: bankLedger.id, suspenseLedgerAccountId: suspenseLedger.id, metadata } });
  const settlement = await db.settlementAccount.upsert({ where: { id: `${org}_manual_bank_settlement` }, update: {}, create: {
    id: `${org}_manual_bank_settlement`, organizationId: org, providerAccountId: provider.id, ledgerAccountId: bankLedger.id, accountReferenceHash: sha(`NON-ROUTABLE-${org}`), accountReferenceMasked: 'SYNTHETIC-NON-ROUTABLE', approvalStatus: 'APPROVED', requestedById: actors.owner.actorId, approvedById: actors.checker.actorId, approvedAt: new Date(fixedAt), effectiveFrom: new Date('2025-11-01T00:00:00Z'), metadata } });
  ensure(rail.organizationId === org && rail.type === 'BANK_TRANSFER' && rail.isActive && rail.currencyCode === 'XAF' && (rail.metadata as typeof metadata)?.documentSha256 === configDocument.sha256
    && provider.organizationId === org && provider.paymentRailId === rail.id && provider.status === 'ACTIVE' && !provider.archivedAt && provider.currencyCode === 'XAF' && provider.externalAccountHash === sha(`NON-ROUTABLE-${org}`)
    && provider.settlementLedgerAccountId === bankLedger.id && provider.suspenseLedgerAccountId === suspenseLedger.id && (provider.metadata as typeof metadata)?.documentSha256 === configDocument.sha256
    && settlement.organizationId === org && settlement.providerAccountId === provider.id && settlement.ledgerAccountId === bankLedger.id && settlement.approvalStatus === 'APPROVED'
    && settlement.requestedById === actors.owner.actorId && settlement.approvedById === actors.checker.actorId && settlement.approvedAt?.toISOString() === fixedAt && settlement.effectiveFrom.toISOString() === '2025-11-01T00:00:00.000Z'
    && !settlement.effectiveTo && (settlement.metadata as typeof metadata)?.documentSha256 === configDocument.sha256, 'Retained synthetic bank configuration differs from fixture');

  const invoice = await db.supplierInvoice.findFirstOrThrow({ where: { organizationId: org, supplierId: `${org}_supplier_0`, invoiceNumber: `${org}-history-2026-03-2` } });
  ensure(invoice.total.lte(5000000), 'Synthetic deposit must cover the bank transfer');
  const cashLedger = await db.chartOfAccount.findFirstOrThrow({ where: { organizationId: org, mappingKey: 'CASH_ON_HAND', isActive: true } });
  const balance = async (accountId: string) => {
    const totals = await db.journalEntryLine.aggregate({ where: { organizationId: org, accountId, currency: 'XAF', journalEntry: { organizationId: org, status: 'POSTED', entryDate: { lte: new Date(fixedAt) } } }, _sum: { debit: true, credit: true } });
    return new Prisma.Decimal(totals._sum.debit ?? 0).minus(totals._sum.credit ?? 0);
  };
  const fundingReference = marker + '-cash-to-bank-deposit';
  const fundingProof = doc(fundingReference, { reference: fundingReference, effectiveAt: fixedAt, debitAccountId: bankLedger.id, creditAccountId: cashLedger.id, amount: '5000000.00', currency: 'XAF', purpose: 'Simulated transfer of existing cash capital to bank; no external deposit claimed' });
  let funding = await db.journalEntry.findFirst({ where: { organizationId: org, reference: fundingReference } });
  if (!funding) {
    ensure((await balance(cashLedger.id)).gte(5000000), 'Insufficient posted synthetic cash for bank deposit');
    const journal = await db.journal.findFirstOrThrow({ where: { organizationId: org, code: 'GEN', isActive: true } });
    funding = await createManualJournalEntry(org, { journalId: journal.id, entryDate: new Date(fixedAt), reference: fundingReference, memo: 'Synthetic cash-to-bank funding; no external deposit', lines: [
      { accountId: bankLedger.id, debit: '5000000', credit: '0', currency: 'XAF', metadata: { syntheticDocumentHash: fundingProof.sha256 } },
      { accountId: cashLedger.id, debit: '0', credit: '5000000', currency: 'XAF' },
    ] }, actors.owner.actorId);
  }
  const retainedFunding = await db.journalEntry.findUniqueOrThrow({ where: { id: funding.id }, include: { lines: true } });
  ensure(retainedFunding.organizationId === org && retainedFunding.reference === fundingReference && retainedFunding.createdById === actors.owner.actorId
    && retainedFunding.entryDate.toISOString() === fixedAt && retainedFunding.lines.length === 2
    && retainedFunding.lines.every(line => line.organizationId === org && line.currency === 'XAF')
    && retainedFunding.lines.some(line => line.accountId === bankLedger.id && line.debit.eq(5000000) && line.credit.isZero()
      && (line.metadata as { syntheticDocumentHash?: string } | null)?.syntheticDocumentHash === fundingProof.sha256)
    && retainedFunding.lines.some(line => line.accountId === cashLedger.id && line.credit.eq(5000000) && line.debit.isZero()), 'Retained funding journal differs from the fixture; refusing to post');
  if (funding.status === 'DRAFT') {
    ensure((await balance(cashLedger.id)).gte(5000000), 'Insufficient posted synthetic cash to post the retained deposit');
    await postJournalEntry(org, funding.id, actors.accountant.actorId, { actorPermissions: actors.accountant.actorPermissions, lastAuthAt: actors.accountant.lastAuthAt });
  }
  const funded = await db.journalEntry.findUniqueOrThrow({ where: { id: funding.id }, include: { lines: true } });
  ensure(funded.status === 'POSTED' && funded.createdById === actors.owner.actorId && funded.postedById === actors.accountant.actorId && funded.lines.length === 2
    && funded.lines.some(line => line.accountId === bankLedger.id && line.debit.eq(5000000) && line.credit.isZero())
    && funded.lines.some(line => line.accountId === cashLedger.id && line.credit.eq(5000000) && line.debit.isZero()), 'Funding journal differs from the independent posted fixture');
  const destination = await db.supplierBankAccount.findFirstOrThrow({ where: { organizationId: org, supplierId: invoice.supplierId, status: 'APPROVED' } });
  let payment = await db.supplierPayment.findFirst({ where: { organizationId: org, notes: marker } });
  if (!payment) {
    ensure(invoice.status === 'POSTED' && invoice.amountPaid.isZero(), 'Expected untouched posted history invoice');
    const proof = doc(marker + '-request', { invoiceId: invoice.id, total: invoice.total.toFixed(2), currency: 'XAF' });
    const draft = { supplierId: invoice.supplierId, bankAccountId: destination.id, method: 'BANK_TRANSFER' as const, paymentDate: '2026-10-28', documentReference: proof.uri, documentSha256: proof.sha256, notes: marker, allocations: [{ supplierInvoiceId: invoice.id, amount: invoice.total.toFixed(2) }] };
    const preview = await previewPaymentRequest(draft, scope('owner'));
    const result = await submitPaymentRequest({ draft, expectedRevision: preview.revision, idempotencyKey: marker + ':request' }, scope('owner'));
    payment = await db.supplierPayment.findUniqueOrThrow({ where: { id: result.paymentRequestId } });
  }
  ensure(payment.method === 'BANK_TRANSFER' && payment.amount.eq(invoice.total), 'Retained bank payment differs from fixture');
  if (payment.status === 'DRAFT') {
    const preview = await reviewPaymentRequestApproval(payment.id, scope('checker'));
    await confirmPaymentRequestApproval({ paymentRequestId: payment.id, expectedRevision: preview.revision, idempotencyKey: marker + ':approve' }, scope('checker'));
    payment = await db.supplierPayment.findUniqueOrThrow({ where: { id: payment.id } });
  }
  const executionDocument = doc(marker + '-execution', { paymentId: payment.id, executedAt: fixedAt, executionReference: marker, total: payment.amount.toFixed(2), mode: 'SIMULATED_MANUAL_BANK_TRANSFER', externalTransferPerformed: false });
  let releaseReplay = false;
  if (payment.status === 'APPROVED') {
    const draft = { paymentRequestId: payment.id, executionReference: marker, executedAt: fixedAt, evidenceUri: executionDocument.uri, evidenceSha256: executionDocument.sha256 };
    const preview = await previewPaymentRelease(draft, scope('accountant'));
    const command = { draft, expectedRevision: preview.revision, idempotencyKey: marker + ':release' };
    const released = await confirmPaymentRelease(command, scope('accountant'));
    ensure(released.ledgerStatus === 'POSTED', 'Bank payment posting requires review');
    releaseReplay = (await confirmPaymentRelease(command, scope('accountant'))).replayed;
    ensure(releaseReplay, 'Exact release replay was not recognized');
  }
  const released = await readPaymentReleaseOutcome(payment.id, scope('accountant'));
  ensure(released.ledgerStatus === 'POSTED', 'Bank payment must have a posted source ledger');

  // Reuse the strict shipped pilot parser; this fixture adapter cannot accept a
  // webhook and explicitly labels manually authored synthetic bank evidence.
  const parser = new MobileMoneyHmacAdapter(providerCode);
  const adapter: PaymentProviderAdapter = {
    providerCode, railType: 'BANK_TRANSFER', maxPayloadBytes: parser.maxPayloadBytes, timestampToleranceSeconds: parser.timestampToleranceSeconds,
    canonicalPayload: raw => raw, verifySignature: () => false,
    parseEvent: () => { throw new Error('Synthetic manual statement adapter rejects provider events'); },
    parseStatement: input => ({ ...parser.parseStatement(input), sourceType: 'SYNTHETIC_MANUAL_BANK_STATEMENT' }),
    fingerprintStatementLine: line => parser.fingerprintStatementLine(line),
  };
  const csv = 'providerTransactionId,providerReference,direction,amount,currencyCode,occurredAt,description\n'
    + `${marker}-transaction,${marker},DEBIT,${payment.amount.toFixed(2)},XAF,${fixedAt},SYNTHETIC TEST ONLY - no external transfer\n`;
  const statementDocument = retain(marker + '-statement.csv', csv);
  const imported = await importProviderStatement({ organizationId: org, providerAccountId: provider.id, adapter, rawContent: csv, fileName: path.basename(statementDocument.file), importedById: actors.owner.actorId, correlationId: uuid(marker + ':import') });
  ensure(['IMPORTED', 'DUPLICATE_FILE'].includes(imported.status) && imported.statementFileId && imported.fileHash === statementDocument.sha256, 'Statement import did not retain the expected bytes');
  const duplicate = await importProviderStatement({ organizationId: org, providerAccountId: provider.id, adapter, rawContent: csv, fileName: path.basename(statementDocument.file), importedById: actors.owner.actorId, correlationId: uuid(marker + ':import') });
  ensure(duplicate.status === 'DUPLICATE_FILE' && duplicate.statementFileId === imported.statementFileId, 'Exact statement replay duplicated the file');
  const lines = await db.statementLine.findMany({ where: { organizationId: org, statementFileId: imported.statementFileId } });
  ensure(lines.length === 1 && lines[0].amount.eq(payment.amount) && lines[0].direction === 'DEBIT', 'Expected exactly one retained bank debit');
  const draft = { paymentRequestId: payment.id, evidence: { kind: 'BANK_STATEMENT' as const, statementLineId: lines[0].id } };
  let current = await reviewPaymentReconciliation(payment.id, scope('owner'));
  if (current.status === 'AWAITING_EVIDENCE') {
    const preview = await previewPaymentReconciliation(draft, scope('owner'));
    await proposePaymentReconciliation({ draft, expectedRevision: preview.revision, idempotencyKey: marker + ':propose' }, scope('owner'));
  }
  current = await reviewPaymentReconciliation(payment.id, scope('manager'));
  if (current.status === 'PROPOSED') await decidePaymentReconciliation({ paymentRequestId: payment.id, proposalId: current.proposalId!, decision: 'APPROVE', reason: 'Independent synthetic bank evidence review; no external transfer or provider certification is represented', expectedRevision: current.revision, idempotencyKey: marker + ':admit' }, scope('manager'));
  current = await reviewPaymentReconciliation(payment.id, scope('manager'));
  ensure(['ADMITTED', 'RECONCILED'].includes(current.status) && current.evidenceCurrent, 'Bank evidence must be independently admitted before matching');
  const operation = { providerAccountId: provider.id, adapter, rawContent: csv, fileName: path.basename(statementDocument.file), businessDate: new Date('2026-10-28T00:00:00Z'), idempotencyKey: uuid(marker + ':review') };
  const control = { organizationId: org, actorId: actors.owner.actorId, actorPermissions: authority.permissions };
  const run = await importProviderStatementForReview(operation, control);
  ensure(run.stage === 'REVIEW_REQUIRED', `Bank run did not complete: ${run.stage}`);
  const runReplay = await importProviderStatementForReview(operation, control);
  ensure(runReplay.stage === 'REVIEW_REQUIRED' && runReplay.runId === run.runId, 'Provider operation replay duplicated the run');
  current = await reviewPaymentReconciliation(payment.id, scope('manager'));
  if (current.status === 'ADMITTED') await finalizePaymentReconciliation({ paymentRequestId: payment.id, expectedRevision: current.revision, idempotencyKey: marker + ':finalize' }, scope('manager'));
  current = await reviewPaymentReconciliation(payment.id, scope('manager'));
  ensure(current.status === 'RECONCILED' && current.evidenceCurrent && current.bankMatch?.runId === run.runId, 'Expected current independent bank reconciliation');
  const signerAuthority = await db.$transaction(tx => paymentReconciliationAuthority(tx, scope('manager'), 'finalize', true));
  const beforeSign = await db.reconciliationRun.findUniqueOrThrow({ where: { id: run.runId } });
  let expectedSourceVersionHash: string, expectedEvidenceRevision: string;
  if (beforeSign.status === 'SIGNED') {
    const payload = beforeSign.certificatePayload as Record<string, unknown>;
    ensure(typeof payload?.sourceVersionHash === 'string' && typeof payload.reviewedEvidenceRevision === 'string', 'Retained application signature lacks its reviewed revisions');
    expectedSourceVersionHash = payload.sourceVersionHash; expectedEvidenceRevision = payload.reviewedEvidenceRevision;
  } else {
    const preview = await previewReconciliationSignOff({ organizationId: org, runId: run.runId, actorId: actors.manager.actorId, actorPermissions: signerAuthority.permissions });
    ensure(preview.canSign && preview.expectedSourceVersionHash && preview.expectedEvidenceRevision, `Application reconciliation sign-off is blocked: ${preview.blocker}`);
    expectedSourceVersionHash = preview.expectedSourceVersionHash; expectedEvidenceRevision = preview.expectedEvidenceRevision;
  }
  const signCommand = { organizationId: org, runId: run.runId, signedById: actors.manager.actorId, expectedSourceVersionHash, expectedEvidenceRevision,
    control: { actorPermissions: signerAuthority.permissions, lastAuthAt: actors.manager.lastAuthAt }, correlationId: uuid(marker + ':application-signoff') };
  const signed = await signReconciliationRun(signCommand), signedReplay = await signReconciliationRun(signCommand);
  ensure(signed.status === 'SIGNED' && !signed.completedByAnotherActor && signedReplay.replayed && signedReplay.certificateHash === signed.certificateHash, 'Application sign-off replay changed the retained certificate');
  const signatureEvidence = await db.$transaction(async tx => {
    const saved = await loadRunForCertification(tx, org, run.runId, new Date());
    await retainedReconciliationSignatureInTx(tx, org, saved);
    const evidence = await validateReconciliationRunEvidenceInTx(tx, saved, org);
    const payload = saved.certificatePayload as Record<string, unknown>, signedEvidence = payload.evidence as Record<string, unknown>;
    ensure(saved.signedById === actors.manager.actorId && saved.runById === actors.owner.actorId && saved.certificateHash === certificatePayloadHash(payload)
      && signedEvidence.sourceHash === evidence.sourceEvidence.sourceHash && evidence.sourceEvidence.counts.paymentTransactionCount === 1
      && evidence.sourceEvidence.counts.statementLineCount === 1 && evidence.sourceEvidence.counts.matchRecordCount === 1, 'Signed certificate does not cover the current synthetic bank evidence');
    return { run: saved, sourceHash: evidence.sourceEvidence.sourceHash };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 30000 });
  const retainedRun = signatureEvidence.run;
  const certificateDocument = retain(marker + '-application-certificate.json', stableReconciliationEvidenceStringify(retainedRun.certificatePayload));
  ensure(certificateDocument.sha256 === retainedRun.certificateHash, 'Retained application certificate bytes differ from its canonical hash');
  current = await reviewPaymentReconciliation(payment.id, scope('manager'));
  ensure(current.status === 'RECONCILED' && current.evidenceCurrent, 'Application sign-off changed current supplier reconciliation evidence');
  const transaction = await db.paymentTransaction.findUniqueOrThrow({ where: { id: released.paymentTransactionId } });
  const counts = { payments: await db.supplierPayment.count({ where: { organizationId: org, notes: marker } }), files: await db.statementFile.count({ where: { organizationId: org, providerAccountId: provider.id, fileHash: statementDocument.sha256 } }), runs: await db.reconciliationRun.count({ where: { organizationId: org, providerAccountId: provider.id, voidedAt: null } }), matches: await db.matchRecord.count({ where: { organizationId: org, paymentTransactionId: transaction.id, statementLineId: lines[0].id, status: 'AUTO_MATCHED' } }) };
  ensure(Object.values(counts).every(count => count === 1) && retainedRun.matchCount === 1 && retainedRun.exceptionCount === 0 && retainedRun.suspenseAmount.isZero() && !transaction.providerAuthorityEventId, 'Bank reconciliation cardinality or authority invariant failed');
  const closingCash = await balance(cashLedger.id), closingBank = await balance(bankLedger.id);
  ensure(closingCash.gte(0) && closingBank.gte(0), 'Synthetic funding/payment left a negative cash or bank balance');
  return { scenario: 'synthetic-manual-bank-reconciliation', organizationId: org, paymentId: payment.id, transactionId: transaction.id, statementFileId: imported.statementFileId, statementLineId: lines[0].id, runId: run.runId, status: current.status,
    fundingJournalId: funded.id, fundingDocumentSha256: fundingProof.sha256, closingCash: closingCash.toFixed(2), closingBank: closingBank.toFixed(2),
    runStatus: retainedRun.status, evidenceCurrent: current.evidenceCurrent, counts, releaseReplay, statementReplay: duplicate.status, runReplay: true,
    referenceSetup: { mode: 'SYNTHETIC_FIXTURE', setupApprovalWorkflowTested: false, configurationSha256: configDocument.sha256 },
    statementSha256: statementDocument.sha256, certificateHash: retainedRun.certificateHash, certificateSourceHash: signatureEvidence.sourceHash,
    certificateDocumentSha256: certificateDocument.sha256, signReplay: signedReplay.replayed, signedRunCount: await db.reconciliationRun.count({ where: { organizationId: org, providerAccountId: provider.id, status: 'SIGNED' } }),
    externalTransferPerformed: false, providerCertificationClaimed: false, applicationSignOffVerified: true, runSigningPerformed: !signed.replayed };
}
