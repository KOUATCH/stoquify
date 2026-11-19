// Actual old/current owners and schema-specific clients; no database/auth mocks.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

it('executes one isolated recovery operation', async () => {
  const url = new URL(process.env.DATABASE_URL ?? '')
  if (url.hostname !== 'localhost' || url.pathname !== '/stoquify_pos_audit_20261026_d30f' || url.searchParams.get('schema') !== 'public') throw Error('Wrong disposable target')
  const work = resolve('.codex-tmp/mixed-recovery-work')
  for (const file of [process.env.MIXED_JOB!, process.env.MIXED_RESULT!]) if (relative(work, resolve(file)).startsWith('..')) throw Error('Wrong worker file')
  const j = JSON.parse(readFileSync(process.env.MIXED_JOB!, 'utf8')), { db } = require('@/prisma/db')
  const outbox = () => require('@/services/events/business-event-outbox.service')
  const control = j.control ? { ...j.control, lastAuthAt: new Date(j.control.lastAuthAt) } : undefined
  const input = { ...j.input, ...(j.input?.now ? { now: new Date(j.input.now) } : {}), ...(j.input?.lockedAt ? { lockedAt: new Date(j.input.lockedAt) } : {}) }
  const save = (value: any) => writeFileSync(process.env.MIXED_RESULT!, JSON.stringify({ ok: true, source: process.env.MIXED_SOURCE, op: j.op, value }, null, 2))
  const consume = async (message: any) => {
    if (!/^audit_mv_receiver_[a-f0-9]{12}$/.test(j.table)) throw Error('Wrong synthetic receiver table')
    await db.$executeRawUnsafe(`INSERT INTO ${j.table} (key, delivery_id) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET requests = ${j.table}.requests + 1`, message.idempotencyKey, message.id)
  }
  try {
    let value: any
    switch (j.op) {
      case 'outboxCrash': {
        const messages = await outbox().claimBusinessEventOutboxMessages(input)
        if (messages.length !== 1) throw Error('Expected one owned message')
        await consume(messages[0]); save(messages[0]); await db.$disconnect(); process.exit(73)
      }
      case 'outboxRun': value = await outbox().runBusinessEventOutboxWorker(input, j.fail ? async () => { throw Error('private synthetic consumer failure') } : consume); break
      case 'outboxClaim': value = await outbox().claimBusinessEventOutboxMessages(input); break
      case 'outboxAck': value = await outbox().markBusinessEventOutboxDelivered(input); break
      case 'outboxFail': value = await outbox().markBusinessEventOutboxFailed({ ...input, error: Error('private synthetic failure') }); break
      case 'alert': {
        const target = new URL(j.url)
        if (target.hostname !== '127.0.0.1' || target.protocol !== 'http:') throw Error('Loopback receiver required')
        process.env.STOQUIFY_ASSURANCE_ALERT_WEBHOOK_URL = target.toString()
        process.env.STOQUIFY_ASSURANCE_ALERT_WEBHOOK_SECRET = 'synthetic-mixed-worker-secret'
        const owner = require('@/services/assurance/assurance-alert-delivery.service')
        if (j.barrier) {
          writeFileSync(j.ready, 'ready')
          for (let n = 0; !existsSync(j.barrier) && n < 600; n++) await delay(100)
          if (!existsSync(j.barrier)) throw Error('Worker start barrier timed out')
        }
        value = await owner.dispatchWorkflowAssuranceWebhookAlerts({ ...input, random: () => 0 }); break
      }
      case 'assess': value = await require('@/services/accounting/close-assurance.service').runCloseAssurance(j.organizationId, input, control); break
      case 'review': value = await require('@/services/accounting/close-assurance.service').updateAccountantReview(j.organizationId, input, control); break
      case 'export': {
        const owner = require('@/services/accounting/close-assurance-pack.service')
        if (j.barrier) {
          writeFileSync(j.ready, 'ready')
          for (let n = 0; !existsSync(j.barrier) && n < 600; n++) await delay(100)
          if (!existsSync(j.barrier)) throw Error('Certification barrier timed out')
        }
        value = await owner.exportClosePack(j.organizationId, input, control); break
      }
      case 'close': value = await require('@/services/accounting/periods.service').closeAccountingPeriod(j.organizationId, input.periodId, control.actorId, { ...control, expectedVersion: input.expectedVersion }); break
      case 'reopen': value = await require('@/services/accounting/period-control.service').reopenAccountingPeriod(input, control); break
      default: throw Error('Unknown recovery operation')
    }
    save(value)
  } catch (e: any) {
    writeFileSync(process.env.MIXED_RESULT!, JSON.stringify({ ok: false, source: process.env.MIXED_SOURCE, op: j.op, error: { name: e.name, code: e.code, message: String(e.message).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[redacted URL]') } }, null, 2))
  } finally { await db.$disconnect() }
})
