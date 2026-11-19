// Real owners/database, isolated source + ORM per process. Only HTTP request-context
// and Next cache APIs are supplied by this non-browser action harness.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

function job() { return JSON.parse(readFileSync(process.env.MIXED_JOB!, 'utf8')) }
jest.mock('next/cache', () => ({ revalidatePath: jest.fn(), revalidateTag: jest.fn() }))
jest.mock('@/lib/security/rbac', () => ({ requirePermission: async () => {
  const fs = require('node:fs'), j = JSON.parse(fs.readFileSync(process.env.MIXED_JOB!, 'utf8'))
  return { orgId: j.ctx.orgId, userId: j.ctx.userId, permissions: j.ctx.permissions }
} }))
jest.mock('@/lib/security/auth-session', () => ({ requireSession: async () => {
  const fs = require('node:fs'), j = JSON.parse(fs.readFileSync(process.env.MIXED_JOB!, 'utf8'))
  return { claims: { userId: j.ctx.userId, tenantId: j.ctx.orgId, sessionId: j.ctx.sessionId, sessionToken: j.ctx.sessionToken } }
} }))

it('executes one explicitly scoped mixed-version operation', async () => {
  const url = new URL(process.env.DATABASE_URL ?? '')
  if (url.hostname !== 'localhost' || url.pathname !== '/stoquify_pos_audit_20261026_d30f' || url.searchParams.get('schema') !== 'public' || process.env.WORKFLOW_PHASE3_DATABASE !== url.pathname.slice(1)) throw Error('Wrong disposable database')
  const work = resolve('.codex-tmp/mixed-version-work')
  for (const file of [process.env.MIXED_JOB!, process.env.MIXED_RESULT!]) if (relative(work, resolve(file)).startsWith('..')) throw Error('Wrong work directory')
  const j = job(), { db } = require('@/prisma/db'), { Prisma } = require('@prisma/client')
  const startedAt = new Date().toISOString()
  try {
    if (j.barrier) require('@/services/inventory/inventory-stock-event.service')
    if (j.barrier) {
      writeFileSync(j.ready, JSON.stringify({ pid: process.pid, source: process.env.MIXED_SOURCE }))
      for (let n = 0; !existsSync(j.barrier) && n < 600; n++) await delay(100)
      if (!existsSync(j.barrier)) throw Error('Concurrent start barrier timed out')
    }
    let value: any
    const authoring = () => require('@/services/purchase-order/purchase-order-authoring.service')
    const purchasing = () => require('@/services/purchase-order/purchase-order.service')
    const stock = () => require('@/services/inventory/inventory-stock-event.service')
    switch (j.op) {
      case 'save': value = await authoring().savePurchaseAuthoring(j.ctx, j.input); break
      case 'prepare': value = await authoring().preparePurchaseAuthoring(j.ctx, j.input); break
      case 'create': value = await authoring().createPurchaseOrderFromAuthoring(j.ctx, j.input); break
      case 'get': value = await authoring().getPurchaseAuthoring(j.ctx, j.input); break
      case 'discard': value = await authoring().discardPurchaseAuthoring(j.ctx, j.input); break
      case 'intent': value = await authoring().createPurchaseOrderFromLegacyIntent(j.ctx, j.input); break
      case 'actionCreate': {
        const r = await require('@/actions/purchaseOrderWorkflow/purchaseOrderSystemAction').createPurchaseOrder(j.input)
        value = { success: r.success, id: r.data?.id, orderNumber: r.data?.orderNumber, error: r.error, code: r.code }; break
      }
      case 'actionClone': {
        const r = await require('@/actions/purchaseOrderWorkflow/purchaseOrderSystemAction').clonePurchaseOrder(j.input)
        value = { success: r.success, id: r.data?.id, orderNumber: r.data?.orderNumber, error: r.error, code: r.code }; break
      }
      case 'readOrder': {
        const r = await purchasing().getPurchaseOrderById(j.input.id, j.ctx.orgId)
        value = { id: r.id, orderNumber: r.orderNumber, status: r.status, total: r.total, lines: r.lines.map((l: any) => ({ id: l.id, itemId: l.itemId, receivedQuantity: l.receivedQuantity })) }; break
      }
      case 'receive': value = await require('@/services/purchase-order/purchase-receiving-workbench.service').confirmPurchaseReceiving(j.input, j.actor); break
      case 'issue': value = await stock().postPOSStockIssue(j.input); break
      case 'return': value = await stock().postPOSStockReturn(j.input); break
      case 'reserve': value = await stock().postInventoryReservation(j.input); break
      case 'closeRead': {
        const owner = require('@/services/accounting/close-assurance.service')
        const dashboard = await owner.getCloseAssuranceDashboard(j.input.organizationId, j.input.periodId, j.input.closeRunId)
        const graph = await owner.getCloseEvidenceGraph(j.input.organizationId, { periodId: j.input.periodId, closeRunId: j.input.closeRunId })
        const certificate = await db.closePackExport.findFirstOrThrow({ where: { organizationId: j.input.organizationId, id: j.input.exportId } })
        const seals = await db.periodControlEvent.findMany({ where: { organizationId: j.input.organizationId, periodId: j.input.periodId }, orderBy: { id: 'asc' } })
        // Compare retained/business values, excluding only the two documented
        // wall-clock observation fields. Persisted source asOf stays intact.
        if (dashboard.currentProof) dashboard.currentProof.checkedAt = '[read-time]'
        graph.source.asOf = '[read-time]'
        const digest = (v: any) => require('node:crypto').createHash('sha256').update(JSON.stringify(v)).digest('hex')
        value = { dashboardHash: digest(dashboard), graphHash: digest(graph), certificateHash: digest(certificate), sealsHash: digest(seals), period: dashboard.period, run: dashboard.run, currentProof: dashboard.currentProof, certificate: { id: certificate.id, contentHash: certificate.contentHash, isCertified: certificate.isCertified }, sealCount: seals.length }; break
      }
      case 'posCommit': {
        const r = await require('@/services/pos/pos.service').commitPOSSale(j.input)
        value = { status: r.status, replayed: r.replayed, saleId: r.saleId, clientCommitId: r.clientCommitId, total: r.total, receiptStatus: r.receiptStatus }; break
      }
      default: throw Error('Unknown operation')
    }
    writeFileSync(process.env.MIXED_RESULT!, JSON.stringify({ ok: true, source: process.env.MIXED_SOURCE, operation: j.op, clientVersion: Prisma.prismaVersion.client, startedAt, endedAt: new Date().toISOString(), value }, null, 2))
  } catch (e: any) {
    const message = String(e.message).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[redacted URL]')
    writeFileSync(process.env.MIXED_RESULT!, JSON.stringify({ ok: false, source: process.env.MIXED_SOURCE, operation: j.op, startedAt, endedAt: new Date().toISOString(), error: { name: e.name, code: e.code, message: j.ctx?.sessionToken ? message.replaceAll(j.ctx.sessionToken, '[redacted token]') : message } }, null, 2))
  } finally { await db.$disconnect() }
})
