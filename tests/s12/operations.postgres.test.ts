import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { spawnSync } from 'node:child_process'
import { Prisma } from '@prisma/client'
import { db } from '@/prisma/db'
import { commitPOSSale } from '@/services/pos/pos.service'
import { deriveCloseCurrentProof } from '@/services/accounting/close-assurance-current-proof'
import { runBusinessEventOutboxWorker, markBusinessEventOutboxDelivered } from '@/services/events/business-event-outbox.service'
import { dispatchWorkflowAssuranceWebhookAlerts } from '@/services/assurance/assurance-alert-delivery.service'

let f: any
const results: Record<string, unknown> = {}
beforeAll(async () => {
  require('../../scripts/s12-target.cjs').assertS12Target()
  expect(process.env.S12_DATABASE_NAME).toMatch(/^stoquify_restore_s12_/)
  f = JSON.parse(fs.readFileSync(process.env.S12_FIXTURE!, 'utf8'))
  const identity = await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`
  expect(identity[0].name).toBe(process.env.S12_DATABASE_NAME)
})
afterAll(async () => {
  fs.writeFileSync(process.env.S12_RESULT!, JSON.stringify(results, null, 2), { flag: 'wx' })
  await db.$disconnect()
})

it('preserves stock, cash, receivable, balanced journals, replay and blocked close proof after restore', async () => {
  const stock = await db.inventoryLevel.findFirstOrThrow({ where: { itemId: f.itemId, locationId: f.locationId } })
  expect(String(stock.quantityOnHand)).toBe('4'); expect(String(stock.totalValue)).toBe('16')
  expect(String((await db.customer.findUniqueOrThrow({ where: { id: f.customerId } })).currentBalance)).toBe('4')
  expect(String((await db.cashDrawer.findUniqueOrThrow({ where: { id: f.drawerId } })).currentBalance)).toBe('106')
  const journals = await db.journalEntry.findMany({ where: { organizationId: f.organizationId }, include: { lines: true } })
  expect(journals).toHaveLength(2)
  for (const journal of journals) {
    expect(journal.status).toBe('POSTED')
    expect(journal.lines.reduce((sum, line) => sum.plus(line.debit).minus(line.credit), new Prisma.Decimal(0)).eq(0)).toBe(true)
  }
  const accounts = await db.chartOfAccount.findMany({ where: { organizationId: f.organizationId } })
  const accountCodes = new Map(accounts.map(account => [account.id, account.code]))
  const balances: Record<string, Prisma.Decimal> = {}
  for (const line of journals.flatMap(journal => journal.lines)) {
    const code = accountCodes.get(line.accountId)!
    balances[code] = (balances[code] || new Prisma.Decimal(0)).plus(line.debit).minus(line.credit)
  }
  const ledgerBalances = Object.fromEntries(Object.entries(balances).map(([code, value]) => [code, value.toString()]))
  expect(ledgerBalances).toEqual({ TEST_AR: '4', TEST_CASH: '6', TEST_REVENUE: '-10', TEST_COGS: '4', TEST_STOCK: '-4' })
  const customerLedger = await db.customerLedgerEntry.findMany({ where: { organizationId: f.organizationId, customerId: f.customerId } })
  expect(customerLedger).toHaveLength(1)
  expect(customerLedger.reduce((sum, entry) => sum.plus(entry.debit).minus(entry.credit), new Prisma.Decimal(0)).toString()).toBe('4')
  expect(String((await db.customerReceivableDocumentState.findFirstOrThrow({ where: { organizationId: f.organizationId }, orderBy: { version: 'desc' } })).unpaidAmount)).toBe('4')
  expect(await db.customerReceivableDocument.count({ where: { organizationId: f.organizationId } })).toBe(1)
  const before = await db.inventoryTransaction.count({ where: { organizationId: f.organizationId } })
  expect((await commitPOSSale(f.request)).replayed).toBe(true)
  expect(await db.inventoryTransaction.count({ where: { organizationId: f.organizationId } })).toBe(before)
  expect(await db.pOSCommitResult.count({ where: { organizationId: f.organizationId } })).toBe(1)
  const close = await db.closeRun.findFirstOrThrow({ where: { id: f.closeRunId, organizationId: f.organizationId }, include: { findings: true, checklistItems: true, evidenceItems: true, packExports: true } })
  const proof = deriveCloseCurrentProof(close, new Date())
  expect(proof.grade).toBe('blocked')
  const expectedStatus = process.env.S12_EXPECT_UPGRADE_INVALIDATION === '1' ? 'BLOCKED' : 'CERTIFIED'
  expect(close.status).toBe(expectedStatus)
  expect(proof.blockers.map(b => b.id)).toEqual(expect.arrayContaining(['close-evidence-stale', expectedStatus === 'BLOCKED' ? 'close-runs-blocked' : 'close-certified-export-missing']))
  results.financialRestore = { stockQuantity: '4', stockValue: '16', receivable: '4', cash: '106', ledgerBalances, subledgerTieout: '4', balancedJournals: 2, duplicateEffects: 0, closeProof: proof }
})

it('recovers an actual worker exit after the consumer commit without a duplicate effect', async () => {
  const child = spawnSync(process.execPath, ['--conditions=react-server', '-r', 'ts-node/register/transpile-only', '-r', 'tsconfig-paths/register', 'scripts/s12-crash-probe.ts'], { cwd: process.cwd(), env: { ...process.env, TS_NODE_COMPILER_OPTIONS: JSON.stringify({ module: 'CommonJS', moduleResolution: 'node', jsx: 'react-jsx' }) }, encoding: 'utf8', timeout: 120000, windowsHide: true })
  if (child.status !== 73) throw new Error('Crash probe did not reach durable-effect boundary: ' + child.status + ' ' + (child.stderr || '').slice(-1200))
  const retained = await db.businessEventOutbox.findUniqueOrThrow({ where: { id: f.outboxId } })
  expect(retained.status).toBe('LOCKED'); expect(retained.attempts).toBe(1)
  const now = new Date(retained.lockedAt!.getTime() + 360000)
  const resumed = await runBusinessEventOutboxWorker({ organizationId: f.organizationId, workerId: 's12-resumed-worker', now, eventNames: ['s12.recovery.probe'] }, async message => {
    await db.$executeRaw`INSERT INTO s12_receiver_receipts (key) VALUES (${message.idempotencyKey}) ON CONFLICT (key) DO NOTHING`
  })
  expect(resumed).toEqual([expect.objectContaining({ status: 'SENT' })])
  expect(await db.$queryRaw`SELECT key FROM s12_receiver_receipts WHERE key = ${retained.idempotencyKey}`).toHaveLength(1)
  await expect(markBusinessEventOutboxDelivered({ organizationId: f.organizationId, workerId: 's12-crashed-worker', messageId: f.outboxId, attempts: retained.attempts, lockedAt: retained.lockedAt!, now })).resolves.toMatchObject({ status: 'LEASE_LOST' })
  const audit = await db.businessEventAudit.findFirstOrThrow({ where: { businessEventId: f.eventId, action: 'OUTBOX_DELIVERED' } })
  expect(audit.correlationId).toBe('s12-worker-correlation')
  results.workerRecovery = { crashExit: 73, deliveryAttempts: 2, durableConsumerEffects: 1, staleAcknowledgementRejected: true, correlationId: audit.correlationId, consumerDeduplication: 'Synthetic PostgreSQL receiver unique key; not an external provider guarantee' }
})

it('receives distinct incident alerts over localhost and deduplicates a lost acknowledgement', async () => {
  const delayed = new Date(Date.now() + 86400000)
  await db.workflowAssuranceAlertDelivery.updateMany({ where: { incidentId: { in: f.incidents.slice(2) } }, data: { nextAttemptAt: delayed } })
  let requests = 0, dropped = false
  const secret = 's12-synthetic-loopback-webhook-secret'
  const server = http.createServer((request, response) => {
    void (async () => {
      expect(request.headers.authorization).toBe('Bearer ' + secret)
      let text = ''; for await (const bytes of request) text += bytes
      const body = JSON.parse(text), key = String(request.headers['idempotency-key'])
      expect(body.incident.organizationId).toBe(f.organizationId)
      expect(body.deliveryId).toBeTruthy(); requests++
      await db.$executeRaw`INSERT INTO s12_receiver_receipts (key, incident_id) VALUES (${key}, ${body.incident.id}) ON CONFLICT (key) DO NOTHING`
      if (!dropped) { dropped = true; request.socket.destroy(); return }
      response.writeHead(200, { 'x-request-id': 's12-local-receiver' }); response.end('ok')
    })().catch(error => { response.writeHead(500); response.end('synthetic receiver failure'); results.receiverError = error.message })
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  process.env.STOQUIFY_ASSURANCE_ALERT_WEBHOOK_URL = `http://127.0.0.1:${(server.address() as any).port}`
  process.env.STOQUIFY_ASSURANCE_ALERT_WEBHOOK_SECRET = secret
  try {
    const now = new Date()
    expect(await dispatchWorkflowAssuranceWebhookAlerts({ workerId: 's12-alert-a', now, random: () => 0 })).toMatchObject({ delivered: 1, retried: 1 })
    expect(await dispatchWorkflowAssuranceWebhookAlerts({ workerId: 's12-alert-b', now: new Date(now.getTime() + 31000), random: () => 0 })).toMatchObject({ delivered: 1, retried: 0 })
    const receipts = await db.$queryRaw<Array<{ incident_id: string }>>`SELECT incident_id FROM s12_receiver_receipts WHERE incident_id IS NOT NULL ORDER BY incident_id`
    expect(receipts.map(x => x.incident_id).sort()).toEqual(f.incidents.slice(0,2).sort())
    expect(requests).toBe(3)
    results.alertReceipt = { requests, distinctIncidents: receipts.length, uniqueEffects: 2, lostAcknowledgementRetried: true, receiver: 'Loopback synthetic HTTP + durable deduplication', incidentIds: receipts.map(x => x.incident_id) }
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); delete process.env.STOQUIFY_ASSURANCE_ALERT_WEBHOOK_URL; delete process.env.STOQUIFY_ASSURANCE_ALERT_WEBHOOK_SECRET }
})

it.each(['success', 'failure'] as const)('fences a stale %s acknowledgement after another worker reclaims the alert', async outcome => {
  const row = await db.workflowAssuranceAlertDelivery.findFirstOrThrow({ where: { incidentId: f.incidents[2] } })
  await db.workflowAssuranceAlertDelivery.update({ where: { id: row.id }, data: { status: 'PENDING', nextAttemptAt: new Date(0), attemptCount: 0 } })
  process.env.STOQUIFY_ASSURANCE_ALERT_WEBHOOK_URL = 'http://127.0.0.1:1'
  try {
    const result = await dispatchWorkflowAssuranceWebhookAlerts({ workerId: 's12-old-worker', fetchImpl: async () => {
      await db.workflowAssuranceAlertDelivery.update({ where: { id: row.id }, data: { lockedBy: 's12-new-worker', lockedAt: new Date(Date.now()+360000), attemptCount: 2 } })
      if (outcome === 'failure') throw new Error('old request rejected')
      return new Response('ok')
    } })
    const current = await db.workflowAssuranceAlertDelivery.findUniqueOrThrow({ where: { id: row.id } })
    expect(current).toMatchObject({ status: 'PROCESSING', lockedBy: 's12-new-worker', attemptCount: 2 })
    expect(result).toMatchObject({ delivered: 0, retried: 0, failed: 0 })
    await db.workflowAssuranceAlertDelivery.update({ where: { id: row.id }, data: { status: 'PENDING', lockedBy: null, lockedAt: null, nextAttemptAt: new Date(Date.now()+86400000) } })
    results['staleAck_' + outcome] = true
  } finally { delete process.env.STOQUIFY_ASSURANCE_ALERT_WEBHOOK_URL }
})

it('does not send another request when a crashed alert has exhausted its attempts', async () => {
  const row = await db.workflowAssuranceAlertDelivery.findFirstOrThrow({ where: { incidentId: f.incidents[3] } })
  await db.workflowAssuranceAlertDelivery.update({ where: { id: row.id }, data: { status: 'PROCESSING', lockedBy: 's12-crashed', lockedAt: new Date(0), attemptCount: 5 } })
  process.env.STOQUIFY_ASSURANCE_ALERT_WEBHOOK_URL = 'http://127.0.0.1:1'
  const fetchImpl = jest.fn(async () => new Response('ok'))
  try {
    const result = await dispatchWorkflowAssuranceWebhookAlerts({ workerId: 's12-final', fetchImpl })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(result.deadLettered).toBe(1)
    expect((await db.workflowAssuranceAlertDelivery.findUniqueOrThrow({ where: { id: row.id } })).status).toBe('DEAD_LETTER')
    results.exhaustedCrash = true
  } finally { delete process.env.STOQUIFY_ASSURANCE_ALERT_WEBHOOK_URL }
})
