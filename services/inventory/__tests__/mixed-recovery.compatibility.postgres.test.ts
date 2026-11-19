import { randomUUID, createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import http from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'
import { db } from '@/prisma/db'
import { baseFixture, assertDisposableTarget } from './cross-workflow.phase3.fixture'
import { certifiedFixture, approveSchedules } from './certified-close.fixture'
import { recordBusinessEvent } from '@/services/events/business-event.service'
import { queueWorkflowAssuranceWebhookDelivery } from '@/services/assurance/assurance-alert-delivery.service'
import { postPurchaseReturn } from '@/services/purchasing/purchase-return-credit.service'

type Version = 'baseline' | 'current'
const pairs: readonly (readonly [Version, Version])[] = [['baseline', 'current'], ['current', 'baseline']]
const work = resolve('.codex-tmp/mixed-recovery-work'), evidence: any[] = []
const table = 'audit_mv_receiver_' + randomUUID().replaceAll('-', '').slice(0, 12)
const clock = new Date('2001-01-01T00:00:00Z') // Explicit logical lease clock; never changes host/database time.
function retain(scenario: string, details: any) { evidence.push({ scenario, status: 'PASS', ...details }); save() }
function save() { writeFileSync(join(process.env.MIXED_RECOVERY_EVIDENCE!, 'reconciliation.json'), JSON.stringify({ table, evidence }, null, 2)) }
beforeAll(async () => {
  assertDisposableTarget(); mkdirSync(work, { recursive: true })
  await db.$executeRawUnsafe(`CREATE TABLE ${table} (key text PRIMARY KEY, delivery_id text NOT NULL, requests integer NOT NULL DEFAULT 1, received_at timestamptz NOT NULL DEFAULT now())`)
  save()
})
afterAll(async () => { save(); await db.$disconnect() })

function start(source: Version, op: string, input: any, extra: any = {}) {
  const prefix = join(work, randomUUID()), job = prefix + '.json', output = prefix + '-result.json'
  writeFileSync(job, JSON.stringify({ op, input, table, ...extra }))
  const child = spawn(process.execPath, ['node_modules/jest/bin/jest.js', '--config', 'jest.mixed-recovery-worker.config.cjs', '--runInBand', '--silent'], { cwd: process.cwd(), windowsHide: true, env: { ...process.env, MIXED_SOURCE: source, MIXED_JOB: job, MIXED_RESULT: output }, stdio: ['ignore', 'pipe', 'pipe'] })
  let log = ''; child.stdout.on('data', b => { log += b }); child.stderr.on('data', b => { log += b })
  return new Promise<any>((accept, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(Error('Owned recovery worker timed out: ' + op)) }, 180000)
    child.on('error', e => { clearTimeout(timer); reject(e) })
    child.on('exit', code => {
      clearTimeout(timer); writeFileSync(prefix + '.log', log)
      if (code !== (op === 'outboxCrash' ? 73 : 0) || !existsSync(output)) return reject(Error('Worker infrastructure failed: ' + source + '/' + op + '; private log ' + prefix))
      accept({ ...JSON.parse(readFileSync(output, 'utf8')), exitCode: code })
    })
  })
}
async function run(source: Version, op: string, input: any, extra: any = {}) { const r = await start(source, op, input, extra); if (!r.ok) throw Error(source + '/' + op + ': ' + JSON.stringify(r.error)); return r.value }
async function receipts(id: string) { return db.$queryRawUnsafe<Array<{ key: string; delivery_id: string; requests: number }>>(`SELECT key, delivery_id, requests FROM ${table} WHERE delivery_id = $1 ORDER BY key`, id) }
async function outboxFixture() {
  const f = await baseFixture(), correlationId = randomUUID(), eventName = 'audit.mixed.recovery.' + randomUUID()
  const event = await recordBusinessEvent({ organizationId: f.organizationId, actorId: f.userId, eventType: eventName, eventSource: 'SYSTEM', sourceType: 'MANUAL', sourceId: f.salesOrderId, idempotencyKey: randomUUID(), correlationId, payload: { synthetic: true }, outboxMessages: [{ channel: 'NOTIFICATION', eventName, payload: { synthetic: true }, destination: 'synthetic-postgres-receiver' }] })
  if (!event) throw Error('Event not recorded')
  const message = await db.businessEventOutbox.findFirstOrThrow({ where: { businessEventId: event.event.id, eventName } })
  return { ...f, message, eventName, correlationId }
}

it.each(pairs)('recovers a real %s process exit on %s after a durable consumer effect', async (producer, consumer) => {
  const f = await outboxFixture(), input = { organizationId: f.organizationId, workerId: 'crashed-' + producer, eventNames: [f.eventName] }
  const original = await run(producer, 'outboxCrash', input)
  const locked = await db.businessEventOutbox.findUniqueOrThrow({ where: { id: f.message.id } }); expect(locked.status).toBe('LOCKED'); expect(locked.attempts).toBe(1)
  const now = new Date(new Date(original.lockedAt).getTime() + 360000)
  const resumed = await run(consumer, 'outboxRun', { ...input, workerId: 'resumed-' + consumer, now }); expect(resumed).toEqual([expect.objectContaining({ status: 'SENT' })])
  const lease = { organizationId: f.organizationId, workerId: input.workerId, messageId: original.id, attempts: original.attempts, lockedAt: original.lockedAt, now }
  expect((await run(producer, 'outboxAck', lease)).status).toBe('LEASE_LOST')
  expect((await run(consumer, 'outboxFail', lease)).status).toBe('LEASE_LOST')
  expect((await run(consumer, 'outboxAck', { ...lease, organizationId: 'foreign-' + randomUUID() })).status).toBe('LEASE_LOST')
  expect(await run(producer, 'outboxRun', { ...input, workerId: 'duplicate', now })).toEqual([])
  const effects = await receipts(original.id), audits = await db.businessEventAudit.findMany({ where: { businessEventId: f.message.businessEventId, action: 'OUTBOX_DELIVERED' } })
  expect(effects).toHaveLength(1); expect(effects[0].requests).toBe(2); expect(audits).toHaveLength(1); expect(audits[0].correlationId).toBe(f.correlationId)
  retain('outbox crash ' + producer + ' -> ' + consumer, { organizationId: f.organizationId, exitCode: 73, original, resumed, effects, auditId: audits[0].id, state: await db.businessEventOutbox.findUniqueOrThrow({ where: { id: original.id } }) })
})

it.each(pairs)('preserves retry delay and dead-letter state from %s to %s', async (producer, consumer) => {
  const f = await outboxFixture(), now = new Date()
  await db.businessEventOutbox.update({ where: { id: f.message.id }, data: { maxAttempts: 2 } })
  const input = { organizationId: f.organizationId, workerId: producer, eventNames: [f.eventName], now }
  expect(await run(producer, 'outboxRun', input, { fail: true })).toEqual([expect.objectContaining({ status: 'FAILED' })])
  expect(await run(consumer, 'outboxClaim', { ...input, workerId: consumer })).toEqual([])
  expect(await run(consumer, 'outboxRun', { ...input, workerId: consumer, now: new Date(now.getTime() + 16000) }, { fail: true })).toEqual([expect.objectContaining({ status: 'DEAD_LETTER' })])
  expect(await run(producer, 'outboxClaim', { ...input, now: new Date(now.getTime() + 3600000) })).toEqual([])
  const row = await db.businessEventOutbox.findUniqueOrThrow({ where: { id: f.message.id } }); expect(row.attempts).toBe(2); expect(row.lastErrorMessage).toBe('Business-event outbox delivery failed.'); expect(await receipts(row.id)).toEqual([])
  retain('outbox bounded retry ' + producer + ' -> ' + consumer, { organizationId: f.organizationId, state: row, effects: [] })
})

it.each(pairs)('protects a live outbox lease across %s to %s and foreign scope', async (producer, consumer) => {
  const f = await outboxFixture(), now = new Date(), input = { organizationId: f.organizationId, workerId: 'reused-worker-id', eventNames: [f.eventName], now }
  const [first] = await run(producer, 'outboxClaim', input); expect(first.id).toBe(f.message.id)
  const lease = (m: any) => ({ organizationId: f.organizationId, workerId: 'reused-worker-id', messageId: m.id, attempts: m.attempts, lockedAt: m.lockedAt })
  const firstState = await db.businessEventOutbox.findUniqueOrThrow({ where: { id: first.id } })
  expect((await run(consumer, 'outboxAck', { ...lease(first), organizationId: 'foreign-' + randomUUID() })).status).toBe('LEASE_LOST')
  expect(await db.businessEventOutbox.findUniqueOrThrow({ where: { id: first.id } })).toEqual(firstState)
  const [second] = await run(consumer, 'outboxClaim', { ...input, now: new Date(now.getTime() + 360000) }); expect(second.attempts).toBe(2)
  const active = await db.businessEventOutbox.findUniqueOrThrow({ where: { id: first.id } }); expect(active.status).toBe('LOCKED')
  expect((await run(producer, 'outboxAck', lease(first))).status).toBe('LEASE_LOST')
  expect((await run(consumer, 'outboxFail', lease(first))).status).toBe('LEASE_LOST')
  for (const changed of [{ ...lease(second), attempts: first.attempts }, { ...lease(second), lockedAt: first.lockedAt }]) expect((await run(producer, 'outboxAck', changed)).status).toBe('LEASE_LOST')
  expect(await db.businessEventOutbox.findUniqueOrThrow({ where: { id: first.id } })).toEqual(active)
  expect((await run(consumer, 'outboxAck', lease(second))).status).toBe('SENT')
  const state = await db.businessEventOutbox.findUniqueOrThrow({ where: { id: first.id } }); expect(await receipts(first.id)).toEqual([])
  expect(await db.businessEventAudit.count({ where: { businessEventId: f.message.businessEventId, action: 'OUTBOX_DELIVERED' } })).toBe(1)
  retain('outbox live lease ' + producer + ' -> ' + consumer, { organizationId: f.organizationId, activeLeasePreserved: active, state, effects: [], scope: 'Lease control probe; no external effect dispatched' })
})

async function alertFixture() {
  // The dispatcher is global. Refuse the probe if its logical clock could claim
  // any retained delivery; never reschedule another fixture to make room.
  const through = new Date(clock.getTime() + 3600000)
  expect(await db.workflowAssuranceAlertDelivery.count({ where: { channel: 'WEBHOOK', OR: [{ status: 'PENDING', OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: through } }] }, { status: 'PROCESSING', lockedAt: { lt: through } }] } })).toBe(0)
  const f = await baseFixture(), checkKey = 'mixed-' + randomUUID()
  const definition = await db.workflowAssuranceCheckDefinition.create({ data: { checkKey, version: 1, workflow: 'LEDGER', moduleSlug: 'accounting', invariantName: 'Synthetic mixed worker recovery', executionMode: 'SCHEDULED_SCAN', defaultSeverity: 'BLOCKING', requiredPermission: 'accounting.audit.read', ownerRole: 'accountant', sourceTables: ['journal_entries'], actionRoute: '/dashboard/assurance' } })
  const incident = await db.workflowAssuranceIncident.create({ data: { organizationId: f.organizationId, definitionId: definition.id, checkKey, definitionVersion: 1, workflow: 'LEDGER', moduleSlug: 'accounting', sourceType: 'mixed-synthetic', sourceId: randomUUID(), sourceHash: 'same-mixed-synthetic-source', fingerprint: randomUUID(), title: 'Synthetic compatibility incident', detail: 'Disposable database only', severity: 'BLOCKING', actionRoute: '/dashboard/assurance' } })
  const delivery = await queueWorkflowAssuranceWebhookDelivery({ incidentId: incident.id, reason: 'created' }); if (!delivery) throw Error('No delivery')
  await db.workflowAssuranceAlertDelivery.update({ where: { id: delivery.id }, data: { nextAttemptAt: clock } })
  return { ...f, delivery }
}
async function receiver(deliveryId: string, onRequest: (count: number, response: http.ServerResponse, request: http.IncomingMessage) => void) {
  let count = 0; const errors: string[] = []
  const server = http.createServer((request, response) => { void (async () => {
    expect(request.headers.authorization).toBe('Bearer synthetic-mixed-worker-secret')
    let body = ''; for await (const chunk of request) body += chunk
    const parsed = JSON.parse(body), key = String(request.headers['idempotency-key'])
    expect(parsed.deliveryId).toBe(deliveryId); expect(parsed.idempotencyKey).toBe(key)
    await db.$executeRawUnsafe(`INSERT INTO ${table} (key, delivery_id) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET requests = ${table}.requests + 1`, key, deliveryId)
    onRequest(++count, response, request)
  })().catch(e => { errors.push(e.message); response.writeHead(500); response.end('Synthetic receiver failure') }) })
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
  return { url: 'http://127.0.0.1:' + (server.address() as any).port, errors, count: () => count, stop: async () => { server.closeAllConnections(); await new Promise<void>(r => server.close(() => r())) } }
}
function acknowledge(response: http.ServerResponse) { response.writeHead(200, { 'x-request-id': 'synthetic-mixed-receiver' }); response.end('ok') }

it.each(pairs)('recovers a lost HTTP acknowledgement from %s with %s', async (producer, consumer) => {
  const f = await alertFixture(), server = await receiver(f.delivery.id, (n, response, request) => n === 1 ? request.socket.destroy() : acknowledge(response))
  try {
    expect(await run(producer, 'alert', { workerId: producer, now: clock }, { url: server.url })).toMatchObject({ delivered: 0, retried: 1 })
    expect(await run(consumer, 'alert', { workerId: consumer, now: new Date(clock.getTime() + 31000) }, { url: server.url })).toMatchObject({ delivered: 1, retried: 0 })
    const effects = await receipts(f.delivery.id), state = await db.workflowAssuranceAlertDelivery.findUniqueOrThrow({ where: { id: f.delivery.id } })
    expect(effects).toHaveLength(1); expect(effects[0].requests).toBe(2); expect(state).toMatchObject({ status: 'DELIVERED', attemptCount: 2, externalReference: 'synthetic-mixed-receiver' }); expect(server.errors).toEqual([])
    retain('webhook unknown outcome ' + producer + ' -> ' + consumer, { organizationId: f.organizationId, logicalClock: clock, effects, state, requests: server.count() })
  } finally { await server.stop() }
})

it.each([
  ['baseline', 'current', 'success'], ['baseline', 'current', 'failure'],
  ['current', 'baseline', 'success'], ['current', 'baseline', 'failure'],
] as const)('fences a late %s acknowledgement after %s takes over (%s)', async (producer, consumer, outcome) => {
  const f = await alertFixture(); let oldResponse: http.ServerResponse | undefined, newResponse: http.ServerResponse | undefined
  const server = await receiver(f.delivery.id, (n, response) => { if (n === 1) oldResponse = response; else newResponse = response })
  const barrier = join(work, randomUUID() + '.start'), ready = barrier + '.ready'
  let successor: Promise<any> | undefined, predecessor: Promise<any> | undefined
  try {
    successor = start(consumer, 'alert', { workerId: 'reused-worker-id', now: new Date(clock.getTime() + 360000) }, { url: server.url, barrier, ready })
    for (let n = 0; !existsSync(ready) && n < 600; n++) await delay(100)
    expect(existsSync(ready)).toBe(true)
    predecessor = start(producer, 'alert', { workerId: 'reused-worker-id', now: clock }, { url: server.url })
    for (let n = 0; !oldResponse && n < 600; n++) await delay(100)
    expect(oldResponse).toBeDefined(); writeFileSync(barrier, 'go')
    for (let n = 0; !newResponse && n < 60; n++) await delay(50)
    expect(newResponse).toBeDefined(); expect(oldResponse!.destroyed).toBe(false); expect(newResponse!.destroyed).toBe(false)
    const retained = await db.workflowAssuranceAlertDelivery.findUniqueOrThrow({ where: { id: f.delivery.id } })
    expect(retained).toMatchObject({ status: 'PROCESSING', lockedBy: 'reused-worker-id', attemptCount: 2, lockedAt: new Date(clock.getTime() + 360000) })
    if (outcome === 'success') acknowledge(oldResponse!)
    else { oldResponse!.writeHead(503); oldResponse!.end('Synthetic late failure') }
    const older = await predecessor; expect(older.ok).toBe(true); expect(older.value).toMatchObject({ delivered: 0, retried: 0, failed: 0 })
    expect(await db.workflowAssuranceAlertDelivery.findUniqueOrThrow({ where: { id: f.delivery.id } })).toEqual(retained)
    expect(newResponse!.destroyed).toBe(false); acknowledge(newResponse!)
    const newer = await successor; expect(newer.ok).toBe(true); expect(newer.value.delivered).toBe(1)
    const state = await db.workflowAssuranceAlertDelivery.findUniqueOrThrow({ where: { id: f.delivery.id } }); expect(state).toMatchObject({ status: 'DELIVERED', attemptCount: 2 })
    const effects = await receipts(f.delivery.id); expect(effects).toHaveLength(1); expect(effects[0].requests).toBe(2); expect(server.errors).toEqual([])
    retain('late webhook ' + outcome + ' ' + producer + ' -> ' + consumer, { organizationId: f.organizationId, logicalClock: clock, effects, activeLeasePreserved: retained, state, older: older.value, newer: newer.value })
  } finally {
    if (!existsSync(barrier)) writeFileSync(barrier, 'release on failure')
    if (oldResponse && !oldResponse.writableEnded) { oldResponse.writeHead(503); oldResponse.end('Probe cleanup') }
    if (newResponse && !newResponse.writableEnded) { newResponse.writeHead(503); newResponse.end('Probe cleanup') }
    await Promise.allSettled([predecessor, successor].filter(Boolean) as Promise<any>[]); await server.stop()
  }
})

it.each(['baseline', 'current'] as const)('%s refuses another HTTP attempt for an exhausted expired lease', async source => {
  const f = await alertFixture(), server = await receiver(f.delivery.id, (_n, response) => acknowledge(response))
  // Explicit synthetic retained crash boundary, not a claim of five executed sends.
  await db.workflowAssuranceAlertDelivery.update({ where: { id: f.delivery.id }, data: { status: 'PROCESSING', lockedBy: 'synthetic-exhausted', lockedAt: new Date(clock.getTime() - 360000), attemptCount: 5 } })
  try {
    expect(await run(source, 'alert', { workerId: source, now: clock }, { url: server.url })).toMatchObject({ delivered: 0, deadLettered: 1 })
    expect(server.count()).toBe(0); expect(await receipts(f.delivery.id)).toEqual([])
    const state = await db.workflowAssuranceAlertDelivery.findUniqueOrThrow({ where: { id: f.delivery.id } }); expect(state).toMatchObject({ status: 'DEAD_LETTER', attemptCount: 5, failureCode: 'RETRY_EXHAUSTED' })
    retain('exhausted webhook ' + source, { organizationId: f.organizationId, logicalClock: clock, requests: 0, state })
  } finally { await server.stop() }
})

async function financialState(organizationId: string) {
  const stock = await db.inventoryLevel.findMany({ where: { item: { organizationId } } }), journals = await db.journalEntry.findMany({ where: { organizationId }, include: { lines: true } })
  for (const j of journals) expect(j.lines.reduce((n, l) => n + Number(l.debit) - Number(l.credit), 0)).toBe(0)
  return { stock: stock.map(s => ({ quantity: s.quantityOnHand.toFixed(3), value: s.totalValue.toFixed(2) })), journals: journals.length, payments: await db.supplierPayment.count({ where: { organizationId } }), paymentTransactions: await db.paymentTransaction.count({ where: { organizationId } }), returns: await db.purchaseReturn.count({ where: { organizationId } }) }
}
async function auditFault(organizationId: string, action: string, call: () => Promise<any>) {
  const name = 'mixed_close_' + randomUUID().replaceAll('-', '')
  if (!/^org-full-pos-[a-f0-9-]+$/.test(organizationId) || !['CLOSE_PACK_CERTIFIED_EXPORT', 'ACCOUNTING_PERIOD_CLOSE'].includes(action)) throw Error('Unsafe fault scope')
  await db.$executeRawUnsafe(`CREATE FUNCTION ${name}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."organizationId" = '${organizationId}' AND NEW.action = '${action}' THEN RAISE EXCEPTION 'Synthetic mixed close audit failure'; END IF; RETURN NEW; END $$`)
  try {
    await db.$executeRawUnsafe(`CREATE TRIGGER ${name} BEFORE INSERT ON ledger_audit_events FOR EACH ROW EXECUTE FUNCTION ${name}()`)
    const r = await call(); expect(r.ok).toBe(false); expect(r.error.message).toContain('Synthetic mixed close audit failure')
  } finally { await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${name} ON ledger_audit_events`); await db.$executeRawUnsafe(`DROP FUNCTION ${name}()` ) }
}
function canonical(v: any): string { return v === null || typeof v !== 'object' ? JSON.stringify(v) : Array.isArray(v) ? '[' + v.map(canonical).join(',') + ']' : '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}' }
function verifyPack(pack: any, name: string) {
  const payload = JSON.parse(pack.content), hash = payload.export.contentHash; delete payload.export.contentHash
  expect('sha256:' + createHash('sha256').update(canonical(payload)).digest('hex')).toBe(hash); expect(pack.contentHash).toBe(hash)
  writeFileSync(join(process.env.MIXED_RECOVERY_EVIDENCE!, name + '.json'), pack.content)
  return { id: pack.exportId, hash, runId: pack.closeRunId, mode: pack.mode }
}

it.each(pairs)('checks explicit close denials for retained %s to %s artifacts', async (producer, consumer) => {
  const previous = JSON.parse(readFileSync(join(process.env.MIXED_RECOVERY_EVIDENCE!, 'initial-full-reconciliation.json'), 'utf8'))
  const prior = previous.evidence.find((e: any) => e.scenario === 'close reopen correct recertify ' + producer + ' -> ' + consumer)
  expect(prior).toBeDefined()
  const organizationId = prior.organizationId, runRow = await db.closeRun.findUniqueOrThrow({ where: { id: prior.newPack.runId } })
  const approvedById = prior.seals[2].approval.approvedById, where = { organizationId }, before = await db.closePackExport.count({ where }), denials = []
  for (const source of [producer, consumer]) {
    const control = { actorId: approvedById, actorPermissions: ['accounting.close.certify'], lastAuthAt: new Date() }
    const cases = [
      { kind: 'permission', extra: { organizationId, control: { ...control, actorPermissions: [] } }, expected: /Missing accounting.close.certify permission/ },
      { kind: 'self-certification', extra: { organizationId, control: { ...control, actorId: runRow.runById } }, expected: /close runner cannot certify/i },
      { kind: 'foreign-tenant', extra: { organizationId: 'foreign-' + randomUUID(), control }, expected: /Close run not found/ },
      { kind: 'stale-authentication', extra: { organizationId, control: { ...control, lastAuthAt: new Date(Date.now() - 600000) } }, expected: /Fresh authentication is required/ },
    ]
    for (const c of cases) {
      const result = await start(source, 'export', { closeRunId: runRow.id, mode: 'CERTIFIED' }, c.extra)
      expect(result.ok).toBe(false); expect(result.error.message).toMatch(c.expected)
      if (c.kind === 'stale-authentication') expect(result.error.code).toBe('FRESH_AUTH_REQUIRED')
      denials.push({ source, kind: c.kind, error: result.error })
    }
  }
  expect(await db.closePackExport.count({ where })).toBe(before)
  retain('specific close denials ' + producer + ' -> ' + consumer, { organizationId, runId: runRow.id, denials, exportsBefore: before, exportsAfter: before })
})

it.each(pairs)('hands earned close writes and recovery from %s to %s', async (producer, consumer) => {
  const f = await certifiedFixture(), organizationId = f.organizationId, periodId = f.period.id
  const extra = (permissions: string[], actorId = f.reviewerId) => ({ organizationId, control: { organizationId, actorId, actorPermissions: permissions, lastAuthAt: new Date() } })
  const assess = (version: Version) => run(version, 'assess', { periodId }, extra(['accounting.close.run'], f.buyer.actorId))
  const exportControl = () => extra(['accounting.close.export', 'accounting.close.certify'])
  const blocked = await assess(producer); expect(blocked.run.status).toBe('BLOCKED')
  const draft = await run(consumer, 'export', { closeRunId: blocked.run.id, mode: 'DRAFT_NOT_CERTIFIED' }, exportControl()); expect(draft.isCertified).toBe(false)
  expect((await start(consumer, 'export', { closeRunId: blocked.run.id, mode: 'CERTIFIED' }, exportControl())).ok).toBe(false)
  retain('close blocked handoff ' + producer + ' -> ' + consumer, { organizationId, periodId, runId: blocked.run.id, pack: verifyPack(draft, producer + '-blocked-draft') })
  await approveSchedules(f); const ready = await assess(producer); expect(ready.run.status).toBe('READY')
  const input = { closeRunId: ready.run.id, mode: 'CERTIFIED' }, before = await financialState(organizationId)
  for (const ex of [extra([]), extra(['accounting.close.certify'], f.buyer.actorId), { ...exportControl(), organizationId: 'foreign-' + randomUUID() }, { ...exportControl(), control: { ...exportControl().control, lastAuthAt: new Date(Date.now() - 600000) } }]) expect((await start(consumer, 'export', input, ex)).ok).toBe(false)
  await run(consumer, 'review', { closeRunId: ready.run.id, status: 'APPROVED_FOR_CLOSE', decisionNotes: 'Independent mixed-version review after reconciliation' }, extra(['accounting.close.review']))
  await auditFault(organizationId, 'CLOSE_PACK_CERTIFIED_EXPORT', () => start(consumer, 'export', input, exportControl()))
  expect(await db.closePackExport.count({ where: { closeRunId: ready.run.id, isCertified: true } })).toBe(0)
  const barrier = join(work, randomUUID() + '.start'), readyA = barrier + '.a', readyB = barrier + '.b'
  const a = start(producer, 'export', input, { ...exportControl(), barrier, ready: readyA }), b = start(consumer, 'export', input, { ...exportControl(), barrier, ready: readyB })
  for (let n = 0; (!existsSync(readyA) || !existsSync(readyB)) && n < 600; n++) await delay(100)
  expect(existsSync(readyA) && existsSync(readyB)).toBe(true); writeFileSync(barrier, 'go')
  const attempts = await Promise.all([a, b]); expect(attempts.filter(r => r.ok)).toHaveLength(1)
  const pack = attempts.find(r => r.ok).value; expect(pack.isCertified).toBe(true)
  expect(await db.closePackExport.count({ where: { closeRunId: ready.run.id, isCertified: true } })).toBe(1)
  expect(await financialState(organizationId)).toEqual(before)
  retain('close certification race and rollback ' + producer + ' -> ' + consumer, { organizationId, periodId, attempts: attempts.map(r => ({ source: r.source, ok: r.ok, error: r.error })), pack: verifyPack(pack, producer + '-certified'), financialState: before })
  const closeInput = { periodId, expectedVersion: 0 }, closeControl = () => extra(['accounting.period.close'])
  await auditFault(organizationId, 'ACCOUNTING_PERIOD_CLOSE', () => start(consumer, 'close', closeInput, closeControl()))
  expect((await db.accountingPeriod.findUniqueOrThrow({ where: { id: periodId } })).status).toBe('OPEN'); expect(await db.periodControlEvent.count({ where: { organizationId } })).toBe(0)
  await run(producer, 'close', closeInput, closeControl())
  expect((await start(consumer, 'close', closeInput, closeControl())).ok).toBe(false)
  const seal = await db.periodControlEvent.findFirstOrThrow({ where: { organizationId, operation: 'CLOSE' } }); expect(seal.approval).toMatchObject({ certifiedExportId: pack.exportId, contentHash: pack.contentHash })
  const correction = { organizationId, purchaseOrderId: f.order.id, goodsReceiptId: f.receipt.id, postedById: f.receiver.actorId, idempotencyKey: randomUUID(), reason: 'Controlled mixed-version close correction', occurredAt: f.period.endDate, lines: [{ sourceGoodsReceiptLineId: f.receipt.lines[0].id, quantity: '1' }] }
  await expect(postPurchaseReturn(correction)).rejects.toThrow()
  const reopen = { periodId, expectedVersion: 1, idempotencyKey: randomUUID(), reason: 'Controlled mixed-version reopening for supplier return' }, reopenControl = () => extra(['accounting.period.reopen'])
  const opened = await run(consumer, 'reopen', reopen, reopenControl())
  expect((await run(producer, 'reopen', reopen, reopenControl())).event.id).toBe(opened.event.id)
  expect((await start(producer, 'reopen', { ...reopen, reason: 'Changed reopening payload' }, reopenControl())).ok).toBe(false)
  expect((await start(producer, 'export', input, exportControl())).ok).toBe(false)
  const old = await db.closePackExport.findUniqueOrThrow({ where: { id: pack.exportId } }); expect(old.contentHash).toBe(pack.contentHash); expect(old.metadata).toMatchObject({ staleState: { status: 'EVIDENCE_STALE' } })
  const returned = await postPurchaseReturn(correction); expect((await postPurchaseReturn(correction)).purchaseReturn.id).toBe(returned.purchaseReturn.id)
  expect((await assess(consumer)).run.status).toBe('BLOCKED')
  await approveSchedules(f); const refreshed = await assess(consumer); expect(refreshed.run.status).toBe('READY')
  const newPack = await run(producer, 'export', { closeRunId: refreshed.run.id, mode: 'CERTIFIED' }, exportControl()); expect(newPack.contentHash).not.toBe(pack.contentHash)
  await run(consumer, 'close', { periodId, expectedVersion: 2 }, closeControl())
  const seals = await db.periodControlEvent.findMany({ where: { organizationId }, orderBy: { version: 'asc' } }); expect(seals.map(s => s.operation)).toEqual(['CLOSE', 'REOPEN', 'CLOSE']); expect(seals[2].approval).toMatchObject({ certifiedExportId: newPack.exportId, contentHash: newPack.contentHash })
  const final = await financialState(organizationId); expect(final.stock).toEqual([{ quantity: '1.000', value: '100.00' }]); expect(final.payments).toBe(1); expect(final.paymentTransactions).toBe(1)
  retain('close reopen correct recertify ' + producer + ' -> ' + consumer, { organizationId, periodId, seals, oldPack: { id: old.id, hash: old.contentHash }, newPack: verifyPack(newPack, producer + '-recertified'), final })
})
