// Actual SQL/Prisma and existing resolver; only event publisher is forbidden.
jest.mock('@/services/events/business-event.service', () => ({ recordBusinessEventInTx: () => { throw Error('No event write expected') } }))
jest.mock('@/prisma/db', () => {
  const { PrismaClient } = require(process.env.AF03_PRISMA_CLIENT!)
  const url = new URL(process.env.AF03_POSTGRES_URL || '')
  if (url.hostname !== '127.0.0.1' || url.port !== '55441' || !/^\/stoquify_local_af03_2026_10_19_run_\d{2}_(clean|upgrade)$/.test(url.pathname)) throw Error('Explicit AF03 disposable target required')
  return { db: new PrismaClient({ datasources: { db: { url: url.toString() } } }) }
})
import { db } from '@/prisma/db'
import { resolveAccountantClientAccess } from '../accountant-access.service'

const start = new Date('2020-01-01'), expiry = new Date('2099-01-01')
let seq = 0
async function fixture() {
  const id = `af03-${++seq}`
  const firm = id + '-firm', client = id + '-client', other = id + '-other', staff = id + '-staff', outsider = id + '-outsider'
  await db.organization.createMany({ data: [firm, client, other].map(id => ({ id, name: id, slug: id })) })
  await db.user.createMany({ data: [{ id: staff, email: staff + '@example.invalid', organizationId: firm }, { id: outsider, email: outsider + '@example.invalid', organizationId: other }] })
  const terms = { firmOrganizationId: firm, clientOrganizationId: client, ownerUserId: staff, createdById: staff, scope: 'REVIEWER' as const, effectiveFrom: start, expiresAt: expiry }
  const engagement = await db.firmEngagement.create({ data: { id, ...terms } })
  const assignment = { engagementId: id, firmOrganizationId: firm, clientOrganizationId: client, accountantUserId: staff, createdById: staff, scope: 'READ_ONLY' as const, effectiveFrom: start, expiresAt: expiry, version: 1 }
  const grantData = { organizationId: client, accountantUserId: staff, accountantFirmName: 'Synthetic descriptive name', role: 'READ_ONLY' as const, status: 'REVOKED' as const, consentGrantedById: 'synthetic-client', consentEvidenceHash: 'sha256:' + 'a'.repeat(64), effectiveFrom: start, expiresAt: expiry }
  const grant = await db.accountantAccessGrant.create({ data: grantData })
  const link = { engagementId: id, firmOrganizationId: firm, clientOrganizationId: client, accountantUserId: staff, grantId: grant.id, enrolledById: staff }
  return { id, firm, client, other, staff, outsider, terms, engagement, assignment, grant, grantData, link }
}
type F = Awaited<ReturnType<typeof fixture>>
async function transition(f: F, toStatus: 'ACTIVE'|'SUSPENDED'|'ENDED') {
  return db.$transaction(async tx => {
    const e = await tx.firmEngagement.findUniqueOrThrow({ where: { id: f.id } })
    const receipt = await tx.firmEngagementTransition.create({ data: { engagementId: f.id, firmOrganizationId: f.firm, clientOrganizationId: f.client, version: e.version+1, fromStatus: e.status, toStatus, actorId: f.staff, reason: 'Synthetic controlled transition', idempotencyKey: `${f.id}-${e.version+1}` } })
    return tx.firmEngagement.update({ where: { id: f.id }, data: { status: toStatus, version: receipt.version, lastTransitionId: receipt.id } })
  })
}
afterAll(async () => { await db.$disconnect() })

it('preserves unlinked legacy resolver access and denies export without changing global roles', async () => {
  const input = { homeOrganizationId: 'af03-legacy-firm', clientOrganizationId: 'af03-legacy-client', accountantUserId: 'af03-legacy-user', capability: 'READ' as const }
  expect((await resolveAccountantClientAccess(input)).mode).toBe('DELEGATED_ACCOUNTANT')
  await expect(resolveAccountantClientAccess({ ...input, capability: 'EXPORT' })).rejects.toThrow('read-only')
  await db.user.update({ where: { id: 'af03-legacy-user' }, data: { name: 'Old consumer remains writable' } })
  expect((await db.user.findUniqueOrThrow({ where: { id: 'af03-legacy-user' } })).organizationId).toBe('af03-legacy-firm')
  expect(await db.firmEngagementGrantLink.count()).toBe(0)
})
it.each(['wrong-owner', 'wrong-creator', 'same-tenant', 'bad-window', 'active-insert'] as const)('rejects invalid engagement %s', async kind => {
  const f = await fixture()
  const data: any = { ...f.terms, clientOrganizationId: f.other }
  if (kind === 'wrong-owner') data.ownerUserId = f.outsider
  if (kind === 'wrong-creator') data.createdById = f.outsider
  if (kind === 'same-tenant') data.clientOrganizationId = f.firm
  if (kind === 'bad-window') data.expiresAt = start
  if (kind === 'active-insert') data.status = 'ACTIVE'
  await expect(db.firmEngagement.create({ data })).rejects.toThrow()
})
it('rejects duplicate open identity under concurrent writers', async () => {
  const f = await fixture()
  const result = await Promise.allSettled([1,2].map(() => db.firmEngagement.create({ data: { ...f.terms, clientOrganizationId: f.other } })))
  expect(result.filter(r => r.status === 'fulfilled')).toHaveLength(1)
  expect(result.filter(r => r.status === 'rejected')).toHaveLength(1)
})
it.each(['client', 'firm', 'staff', 'creator', 'window', 'version'] as const)('rejects assignment mismatch %s', async kind => {
  const f = await fixture(), data: any = { ...f.assignment }
  if (kind === 'client') data.clientOrganizationId = f.other
  if (kind === 'firm') data.firmOrganizationId = f.other
  if (kind === 'staff') data.accountantUserId = f.outsider
  if (kind === 'creator') data.createdById = f.outsider
  if (kind === 'window') data.expiresAt = new Date('2100-01-01')
  if (kind === 'version') data.version = 2
  await expect(db.firmEngagementAssignment.create({ data })).rejects.toThrow()
})
it('serializes assignment versions and retains ended history', async () => {
  const f = await fixture()
  const results = await Promise.allSettled([1,2].map(() => db.firmEngagementAssignment.create({ data: f.assignment })))
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
  const row = await db.firmEngagementAssignment.findFirstOrThrow({ where: { engagementId: f.id } })
  const endedAt = new Date()
  await expect(db.firmEngagementAssignment.update({ where: { id: row.id }, data: { endedAt } })).rejects.toThrow()
  await db.firmEngagementAssignment.update({ where: { id: row.id }, data: { endedAt, endedById: f.staff, endReason: 'Synthetic staff handover' } })
  await expect(db.firmEngagementAssignment.create({ data: { ...f.assignment, version: 2 } })).rejects.toThrow()
  await db.firmEngagementAssignment.create({ data: { ...f.assignment, version: 2, effectiveFrom: endedAt } })
  await expect(db.firmEngagementAssignment.update({ where: { id: row.id }, data: { endedAt: null } })).rejects.toThrow()
  await expect(db.firmEngagementAssignment.delete({ where: { id: row.id } })).rejects.toThrow()
  await expect(db.user.update({ where: { id: f.staff }, data: { organizationId: f.other } })).rejects.toThrow()
})
it('allows only retained ordered lifecycle receipts and terminal replacement', async () => {
  const f = await fixture()
  await expect(db.firmEngagement.update({ where: { id: f.id }, data: { status: 'ACTIVE' } })).rejects.toThrow()
  await transition(f, 'ACTIVE'); await transition(f, 'SUSPENDED'); await transition(f, 'ACTIVE'); await transition(f, 'ENDED')
  await expect(transition(f, 'ACTIVE')).rejects.toThrow()
  expect(await db.firmEngagementTransition.count({ where: { engagementId: f.id } })).toBe(4)
  await expect(db.firmEngagement.delete({ where: { id: f.id } })).rejects.toThrow()
  await expect(db.firmEngagementAssignment.create({ data: f.assignment })).rejects.toThrow()
  await db.firmEngagement.create({ data: f.terms })
})
it('rejects orphan or wrong-tenant receipts and rolls back both receipt and state', async () => {
  const f = await fixture()
  const receipt = { engagementId: f.id, firmOrganizationId: f.firm, clientOrganizationId: f.client, version: 1, fromStatus: 'DRAFT' as const, toStatus: 'ACTIVE' as const, actorId: f.staff, reason: 'Synthetic activation attempt', idempotencyKey: 'synthetic-command' }
  await expect(db.firmEngagementTransition.create({ data: receipt })).rejects.toThrow()
  await expect(db.firmEngagementTransition.create({ data: { ...receipt, clientOrganizationId: f.other } })).rejects.toThrow()
  await expect(db.$transaction(async tx => {
    const r = await tx.firmEngagementTransition.create({ data: receipt })
    await tx.firmEngagement.update({ where: { id: f.id }, data: { status: 'ACTIVE', version: 1, lastTransitionId: r.id } })
    throw Error('synthetic rollback')
  })).rejects.toThrow('synthetic rollback')
  expect((await db.firmEngagement.findUniqueOrThrow({ where: { id: f.id } })).status).toBe('DRAFT')
  expect(await db.firmEngagementTransition.count({ where: { engagementId: f.id } })).toBe(0)
})
it('retains transition receipts and frozen engagement terms', async () => {
  const f = await fixture(); await transition(f, 'ACTIVE')
  const r = await db.firmEngagementTransition.findFirstOrThrow({ where: { engagementId: f.id } })
  await expect(db.firmEngagementTransition.delete({ where: { id: r.id } })).rejects.toThrow()
  await expect(db.firmEngagementTransition.update({ where: { id: r.id }, data: { reason: 'Changed history' } })).rejects.toThrow()
  await expect(db.firmEngagement.update({ where: { id: f.id }, data: { scope: 'PREPARER' } })).rejects.toThrow()
})
it.each(['client', 'accountant', 'firm', 'enroller'] as const)('rejects link mismatch %s', async kind => {
  const f = await fixture(), data: any = { ...f.link }
  if (kind === 'client') data.clientOrganizationId = f.other
  if (kind === 'accountant') data.accountantUserId = f.outsider
  if (kind === 'firm') data.firmOrganizationId = f.other
  if (kind === 'enroller') data.enrolledById = f.outsider
  await expect(db.firmEngagementGrantLink.create({ data })).rejects.toThrow()
})
it('enrolls live mandates with current authority and permanent managed tombstones', async () => {
  const f = await fixture()
  await db.firmEngagementAssignment.create({ data: f.assignment }); await transition(f, 'ACTIVE')
  const access = { homeOrganizationId: f.firm, clientOrganizationId: f.client, accountantUserId: f.staff, capability: 'READ' as const }
  await expect(resolveAccountantClientAccess(access)).rejects.toThrow('No active client consent')
  await db.accountantAccessGrant.update({ where: { id: f.grant.id }, data: { status: 'ACTIVE', activeScopeKey: `${f.client}:${f.staff}` } })
  expect((await resolveAccountantClientAccess(access)).mode).toBe('DELEGATED_ACCOUNTANT')
  // AF04 explicitly replaced AF03's temporary dormant-only enrollment fence.
  const link = await db.firmEngagementGrantLink.create({ data: f.link })
  expect((await db.accountantAccessGrant.findUniqueOrThrow({ where: { id: f.grant.id } })).activeScopeKey).toBe(`managed:${f.client}:${f.staff}`)
  await expect(resolveAccountantClientAccess(access)).rejects.toThrow()
  await db.organization.updateMany({ where: { id: { in: [f.firm, f.client] } }, data: { requestedModules: ['accounting', 'close_assurance'] } })
  const role = await db.role.create({ data: { organizationId: f.firm, code: f.id, nameEn: 'Synthetic reader', permissions: ['accounting.audit.read'] } })
  await db.user.update({ where: { id: f.staff }, data: { emailVerified: true, roles: { connect: { id: role.id } } } })
  expect((await resolveAccountantClientAccess(access)).mode).toBe('DELEGATED_ACCOUNTANT')
  await expect(db.firmEngagementGrantLink.create({ data: f.link })).rejects.toThrow()
  await expect(db.accountantAccessGrant.update({ where: { id: f.grant.id }, data: { activeScopeKey: `${f.client}:${f.staff}` } })).rejects.toThrow()
  await expect(db.firmEngagementGrantLink.delete({ where: { id: link.id } })).rejects.toThrow()
  await expect(db.firmEngagementGrantLink.update({ where: { id: link.id }, data: { enrolledAt: new Date() } })).rejects.toThrow()
  await transition(f, 'SUSPENDED')
  await expect(resolveAccountantClientAccess(access)).rejects.toThrow('Current firm engagement and assignment are required')
  await expect(db.accountantAccessGrant.delete({ where: { id: f.grant.id } })).rejects.toThrow()
})
it('concurrent enrollment and reactivation cannot restore legacy or draft engagement access', async () => {
  const f = await fixture()
  const results = await Promise.allSettled([
    db.firmEngagementGrantLink.create({ data: f.link }),
    db.accountantAccessGrant.update({ where: { id: f.grant.id }, data: { status: 'ACTIVE' } }),
  ])
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(2)
  const linked = await db.firmEngagementGrantLink.findUnique({ where: { grantId: f.grant.id } })
  const grant = await db.accountantAccessGrant.findUniqueOrThrow({ where: { id: f.grant.id } })
  expect(linked).not.toBeNull()
  expect(grant.activeScopeKey).toBeNull()
  await db.accountantAccessGrant.update({ where: { id: f.grant.id }, data: { activeScopeKey: `managed:${f.client}:${f.staff}` } })
  await expect(resolveAccountantClientAccess({ homeOrganizationId: f.firm, clientOrganizationId: f.client, accountantUserId: f.staff, capability: 'READ' })).rejects.toThrow('Current firm engagement and assignment are required')
  await expect(db.accountantAccessGrant.update({ where: { id: f.grant.id }, data: { activeScopeKey: `${f.client}:${f.staff}` } })).rejects.toThrow()
})

it('rejects reactivation from a repeatable-read snapshot predating enrollment', async () => {
  const f = await fixture()
  await expect(db.$transaction(async tx => {
    await tx.accountantAccessGrant.findUniqueOrThrow({ where: { id: f.grant.id } })
    await db.firmEngagementGrantLink.create({ data: f.link })
    await tx.accountantAccessGrant.update({ where: { id: f.grant.id }, data: { status: 'ACTIVE' } })
  }, { isolationLevel: 'RepeatableRead' })).rejects.toThrow()
  expect((await db.accountantAccessGrant.findUniqueOrThrow({ where: { id: f.grant.id } })).status).toBe('REVOKED')
  expect(await db.firmEngagementGrantLink.count({ where: { grantId: f.grant.id } })).toBe(1)
})

it('rejects an assignment above a read-only engagement ceiling', async () => {
  const f = await fixture()
  const e = await db.firmEngagement.create({ data: { ...f.terms, clientOrganizationId: f.other, scope: 'READ_ONLY' } })
  await expect(db.firmEngagementAssignment.create({ data: { ...f.assignment, engagementId: e.id, clientOrganizationId: f.other, scope: 'REVIEWER' } })).rejects.toThrow()
})
it('rejects assignment rewriting and an ending actor from another firm', async () => {
  const f = await fixture(), row = await db.firmEngagementAssignment.create({ data: f.assignment })
  await expect(db.firmEngagementAssignment.update({ where: { id: row.id }, data: { scope: 'REVIEWER' } })).rejects.toThrow()
  await expect(db.firmEngagementAssignment.update({ where: { id: row.id }, data: { endedAt: new Date(), endedById: f.outsider, endReason: 'Unauthorized tenant actor' } })).rejects.toThrow()
})
it('preserves globally unique user email and rejects a link without a mandate', async () => {
  const f = await fixture()
  await expect(db.user.create({ data: { email: f.staff + '@example.invalid', organizationId: f.other } })).rejects.toThrow()
  await expect(db.firmEngagementGrantLink.create({ data: { ...f.link, grantId: 'missing' } })).rejects.toThrow()
})
it('serializes competing lifecycle transitions without duplicate receipts', async () => {
  const f = await fixture()
  const outcomes = await Promise.allSettled([transition(f, 'ACTIVE'), transition(f, 'ACTIVE')])
  expect(outcomes.filter(r => r.status === 'fulfilled')).toHaveLength(1)
  expect(await db.firmEngagementTransition.count({ where: { engagementId: f.id } })).toBe(1)
  expect((await db.firmEngagement.findUniqueOrThrow({ where: { id: f.id } })).version).toBe(1)
})
it.each(['DRAFT', 'SUSPENDED'] as const)('ends %s without losing retained managed links', async from => {
  const f = await fixture()
  await db.firmEngagementGrantLink.create({ data: f.link })
  if (from === 'SUSPENDED') { await transition(f, 'ACTIVE'); await transition(f, 'SUSPENDED') }
  await transition(f, 'ENDED')
  expect(await db.firmEngagementGrantLink.count({ where: { engagementId: f.id } })).toBe(1)
  await db.accountantAccessGrant.update({ where: { id: f.grant.id }, data: { status: 'ACTIVE', activeScopeKey: `managed:${f.client}:${f.staff}` } })
  await expect(resolveAccountantClientAccess({ homeOrganizationId: f.firm, clientOrganizationId: f.client, accountantUserId: f.staff, capability: 'READ' })).rejects.toThrow('Current firm engagement and assignment are required')
  await expect(db.accountantAccessGrant.update({ where: { id: f.grant.id }, data: { activeScopeKey: `${f.client}:${f.staff}` } })).rejects.toThrow()
})
it('requires the current version, a firm-home transition actor and unique command key', async () => {
  const f = await fixture()
  const data = { engagementId: f.id, firmOrganizationId: f.firm, clientOrganizationId: f.client, version: 1, fromStatus: 'DRAFT' as const, toStatus: 'ACTIVE' as const, actorId: f.outsider, reason: 'Synthetic actor scope check', idempotencyKey: `${f.id}-1` }
  await expect(db.firmEngagementTransition.create({ data })).rejects.toThrow()
  await transition(f, 'ACTIVE')
  await expect(db.firmEngagementTransition.create({ data: { ...data, actorId: f.staff } })).rejects.toThrow()
  await expect(db.firmEngagementTransition.create({ data: { ...data, actorId: f.staff, version: 2, fromStatus: 'ACTIVE', toStatus: 'SUSPENDED' } })).rejects.toThrow()
})
