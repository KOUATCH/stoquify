import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { db } from '@/prisma/db'
import { baseFixture, assertDisposableTarget } from './cross-workflow.phase3.fixture'
import { fixture as receivingFixture, approvedOrder, receivingCommand } from './workflow-closure-ap.fixture'

type Version = 'baseline' | 'current'
const work = resolve('.codex-tmp/mixed-version-work'), evidence: any[] = []
beforeAll(() => { assertDisposableTarget(); mkdirSync(work, { recursive: true }) })
afterAll(async () => { save(); await db.$disconnect() })
function save() { writeFileSync(join(process.env.MIXED_EVIDENCE!, 'reconciliation.json'), JSON.stringify(evidence, null, 2)) }
function record(scenario: string, status: 'PASS' | 'UNSUPPORTED', details: any) { evidence.push({ scenario, status, ...details }); save() }

function start(source: Version, op: string, input: any, ctx: any, flags = { ui: false, writes: false }, extra: any = {}) {
  const id = randomUUID(), job = join(work, id + '.json'), output = join(work, id + '-result.json')
  writeFileSync(job, JSON.stringify({ op, input, ctx, ...extra }))
  const child = spawn(process.execPath, ['node_modules/jest/bin/jest.js', '--config', 'jest.mixed-version-worker.config.cjs', '--runInBand', '--silent'], {
    cwd: process.cwd(), windowsHide: true,
    env: { ...process.env, MIXED_SOURCE: source, MIXED_JOB: job, MIXED_RESULT: output, PURCHASE_ORDER_AUTHORING_UI_ENABLED: String(flags.ui), PURCHASE_ORDER_AUTHORING_WRITES_ENABLED: String(flags.writes) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let log = ''; child.stdout.on('data', b => { log += b }); child.stderr.on('data', b => { log += b })
  return new Promise<any>((accept, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(Error('Owned worker timed out: ' + op)) }, 180000)
    child.on('error', e => { clearTimeout(timer); reject(e) })
    child.on('exit', code => {
      clearTimeout(timer); writeFileSync(join(work, id + '.log'), log)
      if (code !== 0 || !existsSync(output)) return reject(Error('Worker infrastructure failure: ' + source + '/' + op + '; private log ' + id))
      accept(JSON.parse(readFileSync(output, 'utf8')))
    })
  })
}
async function run(source: Version, op: string, input: any, ctx: any, flags?: { ui: boolean; writes: boolean }, extra?: any) {
  const r = await start(source, op, input, ctx, flags, extra)
  if (!r.ok) throw Error(source + '/' + op + ': ' + JSON.stringify(r.error))
  return r.value
}
const enabled = { ui: true, writes: true }, disabled = { ui: false, writes: false }
async function fixture() {
  const f = await baseFixture(), permissions = ['purchases.orders.create', 'purchases.orders.read', 'purchases.orders.update', 'inventory.levels.adjust']
  const role = await db.role.create({ data: { organizationId: f.organizationId, code: 'MIXED', nameEn: 'Synthetic compatibility buyer', permissions } })
  await db.user.update({ where: { id: f.userId }, data: { isVerified: true, emailVerified: true, roles: { connect: { id: role.id } } } })
  const session = await db.session.create({ data: { userId: f.userId, token: randomUUID(), expiresAt: new Date(Date.now() + 86400000) } })
  const supplier = await db.supplier.create({ data: { organizationId: f.organizationId, name: 'Mixed version supplier', code: randomUUID() } })
  const day = new Date().toISOString().slice(0, 10)
  const ctx = { orgId: f.organizationId, userId: f.userId, permissions, sessionId: session.id, sessionToken: session.token }
  const content = { supplierId: supplier.id, locationId: f.locationId, date: day, expectedDeliveryDate: day, paymentTerms: 'Net 30 days', notes: 'Synthetic mixed-version request', shippingCost: '0', orderLines: [{ itemId: f.itemId, quantity: '1', unitPrice: '100', taxRate: '0', discount: '0', notes: '' }] }
  const payload = { ...content, organizationId: f.organizationId, createdById: f.userId, shippingCost: 0, orderLines: [{ itemId: f.itemId, quantity: 1, unitPrice: 100, taxRate: 0, discount: 0, notes: '' }] }
  return { ...f, ctx, content, payload }
}
type Fixture = Awaited<ReturnType<typeof fixture>>
async function snapshot(f: { organizationId: string; itemId: string; locationId: string }) {
  const where = { organizationId: f.organizationId }, level = await db.inventoryLevel.findUniqueOrThrow({ where: { itemId_locationId: { itemId: f.itemId, locationId: f.locationId } } })
  const journals = await db.journalEntry.findMany({ where, include: { lines: { include: { account: true } } }, orderBy: { id: 'asc' } })
  for (const journal of journals) expect(journal.lines.reduce((n, l) => n + Number(l.debit) - Number(l.credit), 0)).toBeCloseTo(0, 8)
  return { organizationId: f.organizationId, stock: { quantity: level.quantityOnHand.toFixed(3), value: level.totalValue.toFixed(2), reserved: level.quantityReserved.toFixed(3) }, orders: await db.purchaseOrder.count({ where }), receipts: await db.goodsReceipt.count({ where }), movements: await db.inventoryTransaction.count({ where }), commits: await db.pOSCommitResult.count({ where }), payments: await db.payment.count({ where }), journals: journals.map(j => ({ id: j.id, lines: j.lines.map(l => ({ account: l.account.code, debit: l.debit.toString(), credit: l.credit.toString() })) })) }
}
async function fillStock(f: Fixture, value = '300.03') { await db.inventoryLevel.update({ where: { itemId_locationId: { itemId: f.itemId, locationId: f.locationId } }, data: { quantityOnHand: 3, quantityAvailable: 3, averageCost: '100.01', totalValue: value } }) }
function stockCommand(f: Fixture, saleId = randomUUID()) { return { organizationId: f.organizationId, actorId: f.userId, locationId: f.locationId, saleId, orderNumber: saleId, lines: [{ itemId: f.itemId, quantity: 3, unitCost: '100.01' }] } }

it.each([['baseline', 'current'], ['current', 'baseline']] as const)('hands a prepared durable request from %s to %s and reads its receipt with writes disabled', async (producer, consumer) => {
  const f = await fixture(), id = randomUUID()
  await run(producer, 'save', { id, expectedRevision: 0, title: 'Mixed version draft', content: f.content }, f.ctx, enabled)
  await run(producer, 'prepare', { id, expectedRevision: 1 }, f.ctx, enabled)
  const created = await run(consumer, 'create', { id, expectedRevision: 2 }, f.ctx, enabled)
  const replay = await run(producer, 'create', { id, expectedRevision: 2 }, f.ctx, disabled)
  const read = await run(producer, 'get', { id }, f.ctx, disabled)
  expect(replay.receipt).toEqual(created.receipt); expect(read.receipt).toEqual(created.receipt)
  const state = await snapshot(f); expect(state).toMatchObject({ orders: 1, movements: 0, payments: 0 })
  record('durable handoff ' + producer + ' -> ' + consumer, 'PASS', { receipt: created.receipt, state })
})

it('preserves legacy transport and retained create/clone recovery through all existing flag combinations', async () => {
  const f = await fixture(), id = randomUUID(), input = { ...f.payload, requestId: id }
  const created = await run('current', 'actionCreate', input, f.ctx, enabled); expect(created.success).toBe(true)
  const cloneInput = { id: created.id, organizationId: f.organizationId, requestId: randomUUID() }
  const cloned = await run('current', 'actionClone', cloneInput, f.ctx, enabled); expect(cloned.success).toBe(true)
  const transitions = []
  for (const flags of [{ ui: false, writes: false }, { ui: true, writes: false }, { ui: false, writes: true }, enabled]) {
    const replay = await run('current', 'actionCreate', input, f.ctx, flags)
    const cloneReplay = await run('current', 'actionClone', { ...cloneInput, recoverOnly: true }, f.ctx, flags)
    expect(replay.id).toBe(created.id); expect(cloneReplay.id).toBe(cloned.id)
    transitions.push({ flags, createId: replay.id, cloneId: cloneReplay.id })
  }
  const changed = await run('current', 'actionCreate', { ...input, notes: 'Changed payload' }, f.ctx, disabled); expect(changed.success).toBe(false)
  const oldRead = await run('baseline', 'readOrder', { id: cloned.id }, f.ctx)
  const oldReceipt = await run('baseline', 'get', { id: cloneInput.requestId }, f.ctx)
  expect(oldRead.id).toBe(cloned.id); expect(oldReceipt.receipt.orderId).toBe(cloned.id)
  const state = await snapshot(f); expect(state.orders).toBe(2)
  record('current flag transitions and old reader', 'PASS', { transitions, changedPayload: changed, oldReceipt: oldReceipt.receipt, state })
})

it('refuses incomplete creation with writes disabled and respects a discarded tombstone across versions', async () => {
  const f = await fixture(), id = randomUUID()
  await run('baseline', 'save', { id, expectedRevision: 0, title: 'Interrupted work', content: f.content }, f.ctx, enabled)
  await run('baseline', 'prepare', { id, expectedRevision: 1 }, f.ctx, enabled)
  const stopped = await start('current', 'create', { id, expectedRevision: 2 }, f.ctx, { ui: true, writes: false }); expect(stopped.ok).toBe(false)
  const retained = await run('current', 'get', { id }, f.ctx); expect(retained.status).toBe('PREPARED'); expect((await snapshot(f)).orders).toBe(0)
  const discarded = await run('current', 'discard', { id, expectedRevision: 2 }, f.ctx, enabled); expect(discarded.status).toBe('DISCARDED')
  const stale = await start('baseline', 'create', { id, expectedRevision: 2 }, f.ctx, enabled); expect(stale.ok).toBe(false)
  const state = await snapshot(f); expect(state.orders).toBe(0)
  record('write-stop and discard handoff', 'PASS', { stopped: stopped.error, stale: stale.error, state })
})

it('keeps new-request admission and keyless legacy-client behavior within the existing flag contract', async () => {
  const f = await fixture(), admissions = []
  for (const flags of [disabled, { ui: true, writes: false }, { ui: false, writes: true }, enabled]) {
    const r = await run('current', 'actionCreate', { ...f.payload, requestId: randomUUID() }, f.ctx, flags)
    expect(r.success).toBe(!flags.ui || flags.writes)
    admissions.push({ flags, result: r })
  }
  const before = await snapshot(f)
  const keyless = await run('current', 'actionCreate', f.payload, f.ctx, enabled)
  expect(keyless.success).toBe(false); expect(await snapshot(f)).toEqual(before)
  const noIntentRecovery = await run('current', 'actionClone', { id: admissions[0].result.id, organizationId: f.organizationId, requestId: randomUUID(), recoverOnly: true }, f.ctx, disabled)
  expect(noIntentRecovery.success).toBe(false); expect(await snapshot(f)).toEqual(before)
  expect(before.orders).toBe(3)
  record('new admissions and older client contract', 'PASS', { admissions, keyless, noIntentRecovery, state: before, limitation: 'The 00 cohort retains legacy behavior; this is not duplicate-safety certification for that cohort.' })
})

it('identifies unsafe rollback to the pre-adapter legacy writer without claiming duplicate safety', async () => {
  const f = await fixture(), input = { ...f.payload, requestId: randomUUID() }
  const first = await run('current', 'actionCreate', input, f.ctx, enabled); expect(first.success).toBe(true)
  const old = await run('baseline', 'actionCreate', input, f.ctx, disabled); expect(old.success).toBe(true); expect(old.id).not.toBe(first.id)
  const recovery = await run('current', 'actionCreate', input, f.ctx, disabled); expect(recovery.id).toBe(first.id)
  const cloneInput = { id: first.id, organizationId: f.organizationId, requestId: randomUUID() }
  const clone = await run('current', 'actionClone', cloneInput, f.ctx, enabled); expect(clone.success).toBe(true)
  const oldClone = await run('baseline', 'actionClone', { ...cloneInput, recoverOnly: true }, f.ctx, disabled)
  expect(oldClone.success).toBe(true); expect(oldClone.id).not.toBe(clone.id)
  const cloneRecovery = await run('current', 'actionClone', { ...cloneInput, recoverOnly: true }, f.ctx, disabled); expect(cloneRecovery.id).toBe(clone.id)
  const state = await snapshot(f); expect(state.orders).toBe(4)
  record('pre-adapter legacy rollback', 'UNSUPPORTED', { trigger: 'Same retained request sent to baseline legacy action after current durable commit', first, old, recovery, clone, oldClone, cloneRecovery, state })
})

it('identifies unsafe new-request admission under inconsistent current-node flags', async () => {
  const f = await fixture(), input = { ...f.payload, requestId: randomUUID() }
  const off = await run('current', 'actionCreate', input, f.ctx, disabled); expect(off.success).toBe(true)
  const on = await run('current', 'actionCreate', input, f.ctx, enabled); expect(on.success).toBe(true); expect(on.id).not.toBe(off.id)
  const state = await snapshot(f); expect(state.orders).toBe(2)
  record('mixed current flags at first admission', 'UNSUPPORTED', { trigger: 'Off-node legacy admission precedes on-node durable intent', off, on, state })
})

it.each([['baseline', 'current'], ['current', 'baseline']] as const)('recovers a full POS commit from %s on %s with unchanged payment and stock effects', async (producer, consumer) => {
  const f = await fixture(); await fillStock(f)
  const committed = await run(producer, 'posCommit', f.request, f.ctx)
  const before = await snapshot(f), replay = await run(consumer, 'posCommit', f.request, f.ctx), after = await snapshot(f)
  expect(replay.replayed).toBe(true); expect(after).toEqual(before); expect(after).toMatchObject({ commits: 1, payments: 1, movements: 1, stock: { quantity: '0.000', value: '0.00' } }); expect(after.journals).toHaveLength(2)
  const changed = await start(consumer, 'posCommit', { ...f.request, tenders: [{ method: 'CASH', amount: 451 }] }, f.ctx); expect(changed.ok).toBe(false); expect(await snapshot(f)).toEqual(after)
  record('POS receipt handoff ' + producer + ' -> ' + consumer, 'PASS', { committed, replay, changedPayload: changed.error, state: after })
})

it('replays an old receiving decision on the current owner without duplicate stock or receipt rows', async () => {
  const f = await receivingFixture(), order = await approvedOrder(f, 3, 100), command = await receivingCommand(f, order, 3)
  const first = await run('baseline', 'receive', command, null, undefined, { actor: f.receiver })
  const before = await snapshot(f), replay = await run('current', 'receive', command, null, undefined, { actor: f.receiver })
  expect(replay.replayed).toBe(true); expect(await snapshot(f)).toEqual(before); expect(before).toMatchObject({ receipts: 1, movements: 1, stock: { quantity: '3.000', value: '300.00' } })
  const changed = await start('current', 'receive', { ...command, draft: { ...command.draft, items: [{ ...command.draft.items[0], receivedQuantity: 2 }] } }, null, undefined, { actor: f.receiver })
  expect(changed.ok).toBe(false); expect(await snapshot(f)).toEqual(before)
  record('receiving handoff baseline -> current', 'PASS', { first, replay, changedPayload: changed.error, state: before, limitation: 'Receipt stock/replay evidence; this fixture has no receipt posting rule, so no receipt-to-GL certification is inferred.' })
})

it('serializes competing baseline/current last-stock writers using independent processes', async () => {
  const f = await fixture(); await fillStock(f)
  const barrier = join(work, randomUUID() + '.start'), readyA = barrier + '.old.ready', readyB = barrier + '.new.ready'
  let unlock!: () => void, locked!: () => void, blockerPid = 0
  const lockedSignal = new Promise<void>(r => { locked = r }), release = new Promise<void>(r => { unlock = r })
  const blocker = db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM inventory_levels WHERE "itemId" = ${f.itemId} AND "locationId" = ${f.locationId} FOR UPDATE`
    blockerPid = (await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`)[0].pid
    locked(); await release
  }, { timeout: 120000, maxWait: 1000 })
  await lockedSignal
  const a = start('baseline', 'issue', stockCommand(f), f.ctx, disabled, { barrier, ready: readyA })
  const b = start('current', 'issue', stockCommand(f), f.ctx, disabled, { barrier, ready: readyB })
  let waits: Array<{ pid: number; blockers: number[] }> = []
  try {
    for (let n = 0; (!existsSync(readyA) || !existsSync(readyB)) && n < 600; n++) await delay(100)
    expect(existsSync(readyA) && existsSync(readyB)).toBe(true); writeFileSync(barrier, 'start')
    for (let n = 0; n < 80; n++) {
      const rows = await db.$queryRaw<Array<{ pid: number; blockers: number[] }>>`SELECT pid, pg_blocking_pids(pid) AS blockers FROM pg_stat_activity WHERE datname = current_database() AND cardinality(pg_blocking_pids(pid)) > 0`
      const direct = rows.filter(row => row.blockers.includes(blockerPid))
      waits = rows.filter(row => row.blockers.includes(blockerPid) || row.blockers.some(id => direct.some(parent => parent.pid === id)))
      if (waits.length >= 2) break
      await delay(100)
    }
    expect(waits.length).toBeGreaterThanOrEqual(2)
  } finally { unlock(); await blocker }
  const results = await Promise.all([a, b]); expect(results.filter(r => r.ok)).toHaveLength(1)
  const state = await snapshot(f); expect(state).toMatchObject({ movements: 1, stock: { quantity: '0.000', value: '0.00' } })
  record('mixed-process stock competition', 'PASS', { blockerPid, observedWaits: waits, results, state })
})

it('tests stock receipt replay across versions and exposes old restoration arithmetic', async () => {
  const f = await fixture(); await fillStock(f, '300.02'); const input = stockCommand(f)
  const issued = await run('current', 'issue', input, f.ctx), replay = await run('baseline', 'issue', input, f.ctx)
  // This owner returns the cost of newly applied movements, not the retained
  // original cost on replay. Reconcile durable movements instead.
  expect(replay.replayed).toBe(true); expect(Number(issued.totalCost)).toBe(300.02); expect(Number(replay.totalCost)).toBe(0)
  const issuedState = await snapshot(f)
  expect(issuedState).toMatchObject({ movements: 1, stock: { quantity: '0.000', value: '0.00' } })
  const movement = await db.inventoryTransaction.findFirstOrThrow({ where: { organizationId: f.organizationId } })
  expect(movement.totalCost.toFixed(2)).toBe('300.02')
  const correction = { ...input, correctionType: 'REFUND', reason: 'Mixed version restoration' }
  const restored = await run('baseline', 'return', correction, f.ctx), before = await snapshot(f)
  expect(before.stock).toMatchObject({ quantity: '3.000', value: '300.03' })
  const retry = await run('current', 'return', correction, f.ctx); expect(retry.replayed).toBe(true); expect(await snapshot(f)).toEqual(before)
  record('legacy restoration writer after repaired issue', 'UNSUPPORTED', { issued, replay, issuedState, retainedIssueCost: movement.totalCost.toFixed(2), restored, retry, state: before, valueDrift: '0.01', reason: 'Baseline return arithmetic predates B1; do not route new restoration writes back to that writer.' })
})

it('fails closed when old and current reservation payload versions disagree', async () => {
  const f = await fixture(); await fillStock(f)
  const input = { organizationId: f.organizationId, actorId: f.userId, itemId: f.itemId, locationId: f.locationId, quantity: 1, reason: 'Synthetic retained reservation', idempotencyKey: 'mixed-reserve:' + randomUUID() }
  const first = await run('baseline', 'reserve', input, f.ctx), before = await snapshot(f)
  const currentRetry = await start('current', 'reserve', input, f.ctx); expect(currentRetry.ok).toBe(false); expect(await snapshot(f)).toEqual(before)
  const secondInput = { ...input, idempotencyKey: 'mixed-reserve:' + randomUUID() }
  const second = await run('current', 'reserve', secondInput, f.ctx), currentState = await snapshot(f)
  const oldRetry = await start('baseline', 'reserve', secondInput, f.ctx); expect(oldRetry.ok).toBe(false); expect(await snapshot(f)).toEqual(currentState)
  expect(currentState.stock.reserved).toBe('2.000')
  record('reservation payload-version boundary', 'PASS', { behavior: 'Fail-closed, not transparent replay compatibility; original reservations remain retained for review', first, currentRetry: currentRetry.error, second, oldRetry: oldRetry.error, state: currentState })
})
