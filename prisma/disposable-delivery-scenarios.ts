/** Bounded synthetic delivery simulation. Invoked only by the owned disposable runner. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Prisma } from '@prisma/client';
import { db } from './db';
import { expandPermissions, hasRbacPermission } from '../lib/security/rbac-permissions';
import { isUsableAccount } from '../services/roles/role-custodian-policy';
import {
  createDeliveryOrder, confirmDeliveryOrder, postDeliveryGoodsIssue,
  createDeliveryBillingOutcome, getDeliveryOrder,
} from '../services/order-to-cash/delivery-order.service';
import {
  createDeliveryOrderSchema, confirmDeliveryOrderSchema,
  postDeliveryGoodsIssueSchema, createDeliveryBillingOutcomeSchema,
} from '../services/order-to-cash/delivery-order.schemas';

type Actor = {
  organizationId: string; actorId: string; sessionId: string; sessionToken: string;
  actorPermissions: string[]; lastAuthAt: Date;
};
const referenceTime = '2026-10-28T20:00:00.000Z';
const organizations = ['synth12_douala', 'synth12_yaounde', 'synth12_bafoussam'];
const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
function requireFact(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Synthetic delivery: ${message}`);
}

async function assertTarget(org: string, out: string) {
  requireFact(process.env.NODE_ENV === 'test', 'isolated test child required');
  requireFact(organizations.includes(org), 'organization is outside the fixture');
  requireFact(new Date().toISOString() === referenceTime, 'the parent must install the fixed scenario clock');
  const manifest = JSON.parse(readFileSync(path.join(out, 'manifest.json'), 'utf8'));
  const target = new URL(process.env.DATABASE_URL || '');
  requireFact(['localhost', '127.0.0.1', '[::1]'].includes(target.hostname.toLowerCase()), 'loopback target required');
  requireFact(manifest.status === 'schema-verified' && /^stoquify_replay_dataset_[a-z0-9_]{1,35}$/.test(manifest.target.database), 'owned schema-verified manifest required');
  requireFact(target.hostname.toLowerCase() === manifest.target.host.toLowerCase()
    && (target.port || '5432') === String(manifest.target.port || '5432')
    && decodeURIComponent(target.pathname.slice(1)) === manifest.target.database
    && target.searchParams.get('schema') === manifest.target.schema, 'connection differs from retained manifest');
  requireFact(manifest.schemaSha256 === sha(readFileSync(path.resolve('prisma/schema.prisma'))), 'schema differs from retained manifest');
  const identity = await db.$queryRaw<Array<{ database: string }>>`SELECT current_database() AS database`;
  requireFact(identity[0]?.database === manifest.target.database, 'connected database differs from retained manifest');
}

// Delivery services take actor IDs; the HTTP action guards are outside those services.
// Check real current account/session evidence here without fabricating an HTTP context.
// This is fixture preflight, not a substitute for action/browser authorization tests.
async function assertActor(org: string, actor: Actor, permission: string, fresh = false) {
  requireFact(actor?.organizationId === org, 'authenticated actor must belong to this organization');
  const now = new Date();
  const user = await db.user.findFirst({
    where: { id: actor.actorId, organizationId: org, organization: { isActive: true, deletedAt: null } },
    include: { roles: { where: { organizationId: org } } },
  });
  requireFact(user && isUsableAccount(user, now), 'current usable account required');
  requireFact(hasRbacPermission(expandPermissions(user.roles.flatMap(role => role.permissions)), permission), `current ${permission} permission required`);
  const session = await db.session.findFirst({
    where: { id: actor.sessionId, token: actor.sessionToken, userId: actor.actorId, expiresAt: { gt: now } },
  });
  requireFact(session, 'authenticated session expired or was revoked');
  if (fresh) requireFact(session.assuranceOrganizationId === org
    && session.assuranceMethod === 'password' && session.assuranceLevel >= 1
    && session.assuranceVerifiedAt && session.assuranceVerifiedAt <= now
    && now.getTime() - session.assuranceVerifiedAt.getTime() <= 300000
    && (!session.assuranceLockedUntil || session.assuranceLockedUntil <= now), 'fresh persisted password assurance required for billing');
}

export async function seedDeliveryScenario(org: string, actors: Record<string, Actor>, out: string) {
  await assertTarget(org, out);
  const actor = actors.owner;
  const marker = `${org}:delivery-fixture:v1`;
  const locationId = `${org}_loc_0`, customerId = `${org}_customer_10`;
  const lines = [{ itemId: `${org}_item_4`, quantity: '2' }, { itemId: `${org}_item_6`, quantity: '3' }];
  const documents = path.join(out, 'synthetic-documents');
  mkdirSync(documents, { recursive: true });
  const proofPath = path.join(documents, `${org}-delivery-fixture-v1.json`);
  const proofBytes = JSON.stringify({
    classification: 'SYNTHETIC_TEST_ONLY', scenario: marker, occurredAt: referenceTime,
    organizationId: org, locationId, customerId, lines,
    purpose: 'Fictional fully fulfilled delivery and unpaid invoice for local workflow testing',
    physicalDeliveryPerformed: false, externalTransferPerformed: false, statutoryCertificationClaimed: false,
  }, null, 2) + '\n';
  if (existsSync(proofPath)) requireFact(readFileSync(proofPath, 'utf8') === proofBytes, 'retained fictional document differs from fixture');
  else writeFileSync(proofPath, proofBytes);
  const proofSha256 = sha(readFileSync(proofPath));
  const base = { organizationId: org, actorId: actor?.actorId };
  const createInput = createDeliveryOrderSchema.parse({
    commandId: `${marker}:create`, customerId, locationId,
    dueDate: new Date('2026-11-11T20:00:00Z'),
    deliveryAddress: { classification: 'SYNTHETIC_TEST_ONLY', address: 'Fictional central-store delivery route', documentSha256: proofSha256 },
    notes: `${marker}; synthetic document SHA-256 ${proofSha256}; no real-world delivery or payment`, lines,
  });
  let stage = 'preflight';
  let orderId: string | undefined;
  const reportPath = path.join(out, `${org}-delivery-scenario.json`);
  const save = (result: unknown) => writeFileSync(reportPath, JSON.stringify(result, null, 2) + '\n');
  try {
    for (const permission of ['sales.orders.create', 'sales.orders.update', 'inventory.levels.adjust', 'accounting.journal.post']) {
      await assertActor(org, actor, permission, permission === 'accounting.journal.post');
    }
    stage = 'create';
    const created = await createDeliveryOrder({ ...createInput, ...base });
    orderId = created.order.id;
    // Persisted service events own the exact payload. Fixed original versions are
    // intentional: replay after a partially committed run must retain that payload.
    const confirmInput = { ...confirmDeliveryOrderSchema.parse({ commandId: `${marker}:confirm`, salesOrderId: orderId, expectedVersion: 0 }), ...base };
    const issueInput = { ...postDeliveryGoodsIssueSchema.parse({ commandId: `${marker}:issue`, salesOrderId: orderId, expectedVersion: 1, occurredAt: new Date(referenceTime) }), ...base };
    const billingInput = { ...createDeliveryBillingOutcomeSchema.parse({ commandId: `${marker}:bill`, salesOrderId: orderId, expectedVersion: 2, issuedAt: new Date(referenceTime) }), ...base };
    stage = 'confirm-and-reserve';
    await assertActor(org, actor, 'sales.orders.update');
    await confirmDeliveryOrder(confirmInput);
    stage = 'goods-issue';
    await assertActor(org, actor, 'inventory.levels.adjust');
    await postDeliveryGoodsIssue(issueInput);
    stage = 'billing';
    await assertActor(org, actor, 'accounting.journal.post', true);
    await createDeliveryBillingOutcome(billingInput);
    stage = 'verify';
    const order = await getDeliveryOrder(org, orderId);
    requireFact(order.channel === 'DELIVERY' && order.status === 'COMPLETED' && order.version === 3 && order.paymentStatus === 'PENDING', 'order must be fulfilled, billed and unpaid');
    requireFact(order.customerId === customerId && order.locationId === locationId && order.lines.length === lines.length, 'order identity or line count differs from fixture');
    requireFact(order.total.eq(10800) && order.taxAmount.eq(0), 'retained catalogue no longer produces the expected synthetic zero-tax total');
    for (const expected of lines) {
      const line = order.lines.find(entry => entry.itemId === expected.itemId);
      requireFact(line && line.quantity.eq(expected.quantity) && line.reservedQuantity.eq(0)
        && line.deliveredQuantity.eq(expected.quantity) && line.billedQuantity.eq(expected.quantity), 'ordered, reserved, delivered and billed quantities do not tie');
    }
    requireFact(order.deliveryReservations.length === 1 && order.deliveryReservations[0].status === 'CONSUMED', 'exactly one consumed reservation required');
    const reservation = order.deliveryReservations[0];
    requireFact(reservation.lines.length === lines.length && reservation.lines.every(line => line.consumedQuantity.eq(line.quantity)), 'reservation consumption is incomplete');
    requireFact(order.deliveryGoodsIssues.length === 1 && order.deliveryGoodsIssues[0].kind === 'ISSUE', 'exactly one goods issue required');
    const issue = order.deliveryGoodsIssues[0], billing = order.deliveryBillingOutcome;
    requireFact(issue.lines.length === lines.length && issue.journalEntryId && issue.ledgerPostingBatchId, 'goods issue lacks stock or accounting evidence');
    requireFact(billing && billing.status === 'POSTED' && billing.lines.length === lines.length
      && billing.journalEntryId && billing.ledgerPostingBatchId && billing.customerLedgerEntryId
      && billing.customerReceivableDocumentId && billing.totalAmount.eq(order.total), 'billing evidence is incomplete');
    const movements = await db.inventoryTransaction.findMany({ where: { organizationId: org, referenceType: 'SALES_ORDER', referenceId: { in: order.lines.map(line => line.id) } } });
    requireFact(movements.length === lines.length * 2, 'expected one reservation and one sale movement per line');
    for (const line of issue.lines) {
      const stock = movements.find(movement => movement.id === line.inventoryTransactionId);
      requireFact(stock && stock.type === 'SALE' && stock.locationId === locationId && stock.itemId === line.itemId
        && stock.quantity.eq(line.quantity.negated()) && stock.totalCost.abs().eq(line.totalCost), 'goods-issue stock movement does not tie');
      const reserved = movements.filter(movement => movement.type === 'RESERVATION' && movement.referenceId === line.salesOrderLineId);
      const reservationLine = reservation.lines.find(entry => entry.salesOrderLineId === line.salesOrderLineId);
      // Reservation movements have zero physical quantity/value; the reservation
      // document retains the reserved and subsequently consumed quantity.
      requireFact(reserved.length === 1 && reserved[0].quantity.eq(0) && reserved[0].totalCost.eq(0)
        && reservationLine?.quantity.eq(line.quantity), 'reservation stock movement does not tie');
    }
    const journals = await db.journalEntry.findMany({ where: { organizationId: org, id: { in: [issue.journalEntryId, billing.journalEntryId] } }, include: { lines: true } });
    requireFact(journals.length === 2, 'two accounting journals required');
    for (const journal of journals) {
      const debit = journal.lines.reduce((sum, line) => sum.plus(line.debit), new Prisma.Decimal(0));
      const credit = journal.lines.reduce((sum, line) => sum.plus(line.credit), new Prisma.Decimal(0));
      const isIssue = journal.id === issue.journalEntryId;
      requireFact(journal.status === 'POSTED' && debit.eq(credit) && debit.eq(isIssue ? issue.totalCost : order.total)
        && journal.sourceId === (isIssue ? issue.id : billing.id)
        && journal.sourceType === (isIssue ? 'DELIVERY_GOODS_ISSUE' : 'DELIVERY_INVOICE'), 'journal is unbalanced or differs from its delivery source');
    }
    const receivable = await db.customerReceivableDocument.findFirstOrThrow({
      where: { organizationId: org, id: billing.customerReceivableDocumentId, sourceSalesOrderId: order.id, customerId },
      include: { lifecycleStates: { orderBy: { version: 'desc' }, take: 1 } },
    });
    requireFact(receivable.totalAmount.eq(order.total) && receivable.initialUnpaidAmount.eq(order.total)
      && receivable.lifecycleStates[0]?.unpaidAmount.eq(order.total) && receivable.lifecycleStates[0]?.paidAmount.eq(0), 'unpaid receivable does not tie to invoice');
    const ledger = await db.customerLedgerEntry.findFirstOrThrow({ where: { id: billing.customerLedgerEntryId, organizationId: org, customerId } });
    requireFact(ledger.type === 'SALE' && ledger.debit.eq(order.total) && ledger.credit.eq(0)
      && ledger.referenceType === 'CUSTOMER_RECEIVABLE_DOCUMENT' && ledger.referenceId === receivable.id, 'customer ledger does not tie to receivable');
    const commandKeys = [createInput.commandId, confirmInput.commandId, issueInput.commandId, billingInput.commandId];
    const events = await db.businessEvent.findMany({ where: { organizationId: org, eventSource: 'INTERNAL', idempotencyKey: { in: commandKeys } } });
    requireFact(events.length === 4 && events.every(event => event.status === 'APPLIED' && event.sourceId === order.id), 'four applied lifecycle command events required');
    stage = 'exact-replay';
    const replays = [
      await createDeliveryOrder({ ...createInput, ...base }), await confirmDeliveryOrder(confirmInput),
      await postDeliveryGoodsIssue(issueInput), await createDeliveryBillingOutcome(billingInput),
    ];
    requireFact(replays.every(result => result.replayed && result.order.id === order.id
      && result.order.version === 3 && result.order.deliveryGoodsIssues.length === 1
      && result.order.deliveryReservations.length === 1 && result.order.deliveryBillingOutcome?.id === billing.id), 'exact replay changed delivery identity or lifecycle');
    const [movementCount, journalCount, receivableCount, ledgerCount] = await Promise.all([
      db.inventoryTransaction.count({ where: { organizationId: org, referenceType: 'SALES_ORDER', referenceId: { in: order.lines.map(line => line.id) } } }),
      db.journalEntry.count({ where: { organizationId: org, OR: [{ sourceType: 'DELIVERY_GOODS_ISSUE', sourceId: issue.id }, { sourceType: 'DELIVERY_INVOICE', sourceId: billing.id }] } }),
      db.customerReceivableDocument.count({ where: { organizationId: org, sourceSalesOrderId: order.id } }),
      db.customerLedgerEntry.count({ where: { organizationId: org, referenceType: 'CUSTOMER_RECEIVABLE_DOCUMENT', referenceId: receivable.id } }),
    ]);
    requireFact(movementCount === movements.length && journalCount === 2 && receivableCount === 1 && ledgerCount === 1, 'exact replay duplicated stock or financial records');
    const result = {
      organizationId: org, scenario: marker, classification: 'SYNTHETIC_TEST_ONLY', status: 'completed',
      occurredAt: referenceTime, actorId: actor.actorId, orderId: order.id, orderNumber: order.orderNumber,
      reservationId: reservation.id, goodsIssueId: issue.id, billingOutcomeId: billing.id,
      invoiceNumber: billing.invoiceNumber, receivableDocumentId: receivable.id, customerLedgerEntryId: ledger.id,
      journalEntryIds: journals.map(journal => journal.id), inventoryTransactionIds: movements.map(movement => movement.id),
      fiscalDocumentId: billing.fiscalDocumentId, total: order.total.toFixed(2), currency: 'XAF', paymentStatus: order.paymentStatus,
      document: { path: proofPath, sha256: proofSha256 }, commandKeys, exactReplayVerified: true,
      checks: ['full quantity conservation', 'consumed reservation', 'stock movement/source tie-out', 'balanced posted journals', 'unpaid receivable and customer ledger tie-out', 'applied command events', 'stable exact replay'],
      limitations: ['Direct service fixture; no HTTP action or browser authorization claim', 'No real delivery or settlement occurred', 'Any fiscal artifact/submission is locally queued sandbox evidence; no certification worker or provider was run'],
    };
    save(result);
    return result;
  } catch (error) {
    const message = (error instanceof Error ? error.message : String(error)).replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, '[REDACTED_DATABASE_URL]');
    save({ organizationId: org, scenario: marker, status: 'blocked', stage, orderId, message, document: { path: proofPath, sha256: proofSha256 }, resume: 'Reinvoke with the same authenticated actors and fixed clock; service events recover committed stages.' });
    throw new Error(`Synthetic delivery ${org} blocked at ${stage}: ${message}`);
  }
}
