import { randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { Prisma, PrismaClient } from '@prisma/client'
import { db } from '@/prisma/db'
import { baseFixture, assertDisposableTarget } from './cross-workflow.phase3.fixture'
import { createPurchaseOrder, getPurchaseOrderLifecyclePreview, executePurchaseOrderLifecycle, getPurchaseOrderApprovalPreview, approvePurchaseOrder } from '@/services/purchase-order/purchase-order.service'
import { previewPurchaseReceiving, confirmPurchaseReceiving, getPurchaseReceivingWorkbench } from '@/services/purchase-order/purchase-receiving-workbench.service'
import { commitPOSSale, refundPOSSale, voidPOSSale } from '@/services/pos/pos.service'
import { acquirePOSCheckout, preparePOSCheckout } from '@/services/pos/checkout.service'
import { posCartRevision } from '@/services/pos/cart-revision'
import { postPOSStockIssue, postPOSStockReturn } from '../inventory-stock-event.service'
import { postSale } from '@/services/accounting/postings/post-sale'

export async function fixture() {
  const f = await baseFixture(), organizationId = f.organizationId
  const permissions = ['purchases.orders.create', 'purchases.orders.read', 'purchases.orders.update', 'purchases.orders.approve', 'purchases.orders.receive']
  const role = await db.role.create({ data: { organizationId, code: 'CHAIN_BUYER', nameEn: 'Synthetic purchaser', permissions } })
  const actor = async (suffix: string) => {
    const user = await db.user.create({ data: { organizationId, email: `${randomUUID()}@chain.invalid`, firstName: suffix, lastName: 'Fixture', isActive: true, isVerified: true, emailVerified: true, mfaBackupCodes: [], roles: { connect: { id: role.id } } } })
    const session = await db.session.create({ data: { userId: user.id, token: randomUUID(), expiresAt: new Date(Date.now() + 3600000), assuranceOrganizationId: organizationId, assuranceMethod: 'password', assuranceLevel: 1, assuranceVerifiedAt: new Date() } })
    return { organizationId, actorId: user.id, sessionId: session.id, sessionToken: session.token }
  }
  const buyer = await actor('Buyer'), receiver = await actor('Independent approver and receiver')
  const supplier = await db.supplier.create({ data: { organizationId, name: 'Synthetic supplier', code: randomUUID() } })
  const accounts = await db.chartOfAccount.findMany({ where: { organizationId } })
  const account = (code: string) => accounts.find(a => a.code === code)!.id
  await db.journal.create({ data: { organizationId, code: 'TEST_GENERAL', nameEn: 'Synthetic reversal', type: 'GENERAL', isDefault: true } })
  for (const [sourceType, postingPurpose] of [['POS_REFUND', 'REFUND'], ['POS_VOID', 'VOID']] as const) {
    await db.postingRule.create({ data: { organizationId, code: sourceType, nameEn: sourceType, sourceType, postingPurpose, lines: { create: [
      { organizationId, accountId: account('TEST_REVENUE'), lineNumber: 1, side: 'DEBIT', amountSource: 'NET_AMOUNT' },
      { organizationId, accountId: account('TEST_CASH'), lineNumber: 2, side: 'CREDIT', amountSource: 'GROSS_AMOUNT' },
      { organizationId, accountId: account('TEST_STOCK'), lineNumber: 3, side: 'DEBIT', amountSource: 'COST_AMOUNT' },
      { organizationId, accountId: account('TEST_COGS'), lineNumber: 4, side: 'CREDIT', amountSource: 'COST_AMOUNT' },
    ] } } })
  }
  return { ...f, buyer, receiver, roleId: role.id, supplierId: supplier.id }
}
type Fixture = Awaited<ReturnType<typeof fixture>>
export async function approvedOrder(f: Fixture, quantity: number, unitPrice: number) {
  const today = new Date().toISOString().slice(0, 10)
  const order = await createPurchaseOrder({ organizationId: f.organizationId, createdById: f.buyer.actorId, supplierId: f.supplierId, locationId: f.locationId, date: today, expectedDeliveryDate: today, shippingCost: 0, orderLines: [{ itemId: f.itemId, quantity, unitPrice, taxRate: 0, discount: 0 }] })
  const submit = await getPurchaseOrderLifecyclePreview(order.id, f.buyer, 'submit')
  await executePurchaseOrderLifecycle(order.id, f.buyer, { kind: 'submit', expectedRevision: submit.revision, idempotencyKey: `submit:${randomUUID()}` })
  const approval = await getPurchaseOrderApprovalPreview(order.id, f.receiver)
  await approvePurchaseOrder(order.id, f.organizationId, f.receiver.actorId, { ...f.receiver, expectedRevision: approval.revision, idempotencyKey: `approve:${randomUUID()}` })
  return db.purchaseOrder.findUniqueOrThrow({ where: { id: order.id }, include: { lines: true } })
}
export async function receivingCommand(f: Fixture, order: Awaited<ReturnType<typeof approvedOrder>>, quantity: number, held = false) {
  const draft = { kind: 'receive' as const, orderId: order.id, inspectionOutcome: held ? 'FAILED' as const : 'PASSED' as const, ...(held ? { inspectionReason: 'Visible damage requires independent review' } : {}), items: [{ lineId: order.lines[0].id, receivedQuantity: quantity }] }
  const preview = await previewPurchaseReceiving(draft, f.receiver)
  return { draft, expectedRevision: preview.revision, idempotencyKey: `receive:${randomUUID()}` }
}
