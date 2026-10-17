import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import { db } from '@/prisma/db'
import { fixture } from './pos-fixture'
import { commitPOSSale } from '@/services/pos/pos.service'
import { hashPassword } from '@/lib/password'
import { recordBusinessEvent } from '@/services/events/business-event.service'
import { queueWorkflowAssuranceWebhookDelivery } from '@/services/assurance/assurance-alert-delivery.service'

beforeAll(() => { require('../../scripts/s12-target.cjs').assertS12Target() })
afterAll(async () => { await db.$disconnect() })
it('creates a balanced real POS sale, credential identity, retained close blocker and operational messages', async () => {
  const f = await fixture()
  await commitPOSSale(f.request)
  const email = 's12-operator@rehearsal.invalid'
  await db.user.update({ where: { id: f.userId }, data: { email, emailVerified: true, isVerified: true, isActive: true } })
  await db.account.create({ data: { userId: f.userId, providerId: 'credential', accountId: f.userId, password: await hashPassword('S12-only-synthetic-password!') } })
  const period = await db.accountingPeriod.findFirstOrThrow({ where: { organizationId: f.organizationId } })
  const close = await db.closeRun.create({ data: { organizationId: f.organizationId, periodId: period.id, status: 'CERTIFIED', correlationId: 's12-close-retained-blocker', metadata: { staleState: { status: 'EVIDENCE_STALE', sourceId: f.salesOrderId } } } })
  const event = await recordBusinessEvent({ organizationId: f.organizationId, actorId: f.userId, eventType: 's12.recovery.probe', eventSource: 'SYSTEM', sourceType: 'MANUAL', sourceId: close.id, idempotencyKey: 's12-recovery-' + randomUUID(), correlationId: 's12-worker-correlation', payload: { synthetic: true }, outboxMessages: [{ channel: 'NOTIFICATION', eventName: 's12.recovery.probe', payload: { synthetic: true }, destination: 's12-local-receiver' }] })
  if (!event) throw new Error('Synthetic business event was not recorded')
  const definition = await db.workflowAssuranceCheckDefinition.create({ data: { checkKey: 's12-rehearsal', version: 1, workflow: 'LEDGER', moduleSlug: 'accounting', invariantName: 'Synthetic restore proof', executionMode: 'SCHEDULED_SCAN', defaultSeverity: 'BLOCKING', requiredPermission: 'accounting.audit.read', ownerRole: 'accountant', sourceTables: ['journal_entries'], actionRoute: '/dashboard/assurance' } })
  const incidents: string[] = []
  for (const sourceId of ['source-a', 'source-b', 'source-race', 'source-exhausted']) {
    const incident = await db.workflowAssuranceIncident.create({ data: { organizationId: f.organizationId, definitionId: definition.id, checkKey: definition.checkKey, definitionVersion: 1, workflow: 'LEDGER', moduleSlug: 'accounting', sourceType: 's12-synthetic', sourceId, sourceHash: 'same-synthetic-source-hash', fingerprint: sourceId, title: 'Synthetic incident', detail: 'Local S12 rehearsal only', severity: 'BLOCKING', actionRoute: '/dashboard/assurance' } })
    incidents.push(incident.id)
    await queueWorkflowAssuranceWebhookDelivery({ incidentId: incident.id, reason: 'created' })
  }
  // Durable local consumer fixture: a receiver's unique key models its own
  // idempotency guarantee. This table is not an application schema change.
  await db.$executeRawUnsafe('CREATE TABLE s12_receiver_receipts (key text PRIMARY KEY, incident_id text, received_at timestamptz NOT NULL DEFAULT now())')
  const outbox = await db.businessEventOutbox.findFirstOrThrow({ where: { businessEventId: event.event.id, eventName: 's12.recovery.probe' } })
  fs.writeFileSync(process.env.S12_FIXTURE!, JSON.stringify({ ...f, periodId: period.id, closeRunId: close.id, eventId: event.event.id, outboxId: outbox.id, incidents, email }, null, 2), { flag: 'wx' })
  expect(await db.pOSCommitResult.count({ where: { organizationId: f.organizationId } })).toBe(1)
})
