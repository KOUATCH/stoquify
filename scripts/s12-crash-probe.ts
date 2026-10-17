// Simulates worker death after a durable consumer effect but before acknowledgement.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { db } from '../prisma/db'
import { claimBusinessEventOutboxMessages } from '../services/events/business-event-outbox.service'
require('./s12-target.cjs').assertS12Target()
async function main() {
  const f = JSON.parse(fs.readFileSync(process.env.S12_FIXTURE!, 'utf8'))
  const [message] = await claimBusinessEventOutboxMessages({ organizationId: f.organizationId, workerId: 's12-crashed-worker', eventNames: ['s12.recovery.probe'] })
  assert.equal(message.id, f.outboxId)
  await db.$executeRaw`INSERT INTO s12_receiver_receipts (key) VALUES (${message.idempotencyKey}) ON CONFLICT (key) DO NOTHING`
  await db.$disconnect()
  process.exit(73) // Deliberately no outbox acknowledgement, finally or recovery.
}
main().catch(async error => { console.error(error.message); await db.$disconnect(); process.exitCode = 1 })
