/** @jest-environment node */
// Real PostgreSQL + frozen current services. Only synthetic DRAFT/BLOCKED
// fixtures; no READY/T4/CERTIFIED/SIGNED setup or financial rows.
import fs from 'node:fs'
import crypto from 'node:crypto'
import { db } from '@/prisma/db'
import { runCloseAssurance } from '@/services/accounting/close-assurance.service'
import { exportClosePack, getRetainedClosePackExport, listClosePackExports } from '@/services/accounting/close-assurance-pack.service'
const url = new URL(process.env.RETENTION_POSTGRES_URL || '')
if (url.hostname !== 'localhost' || url.pathname !== '/' + process.env.RETENTION_DATABASE_NAME || !/^\/stoquify_replay_retention_upgrade_20261109_[a-f0-9]{10}$/.test(url.pathname) || url.searchParams.get('schema') !== 'public') throw Error('Exact new owned retention DB required')
const legacy = JSON.parse(fs.readFileSync(process.env.RETENTION_LEGACY_FIXTURE!, 'utf8'))
const hash = (value: string) => 'sha256:' + crypto.createHash('sha256').update(value).digest('hex')
const permissions = ['accounting.close.read', 'accounting.close.run', 'accounting.close.export', 'accounting.close.certify']
const evidence: Array<Record<string, unknown>> = []
async function fixture(existing?: { organizationId: string; periodId: string; closeRunId: string }) {
  const id = 'rt-' + crypto.randomBytes(5).toString('hex'), org = existing?.organizationId || id + '-org'
  if (!existing) await db.organization.create({ data: { id: org, name: 'Synthetic retained draft proof', slug: id, countryCode: 'CM', currency: 'XAF', requestedModules: ['accounting', 'close_assurance'] } })
  await db.tenantModuleConfiguration.create({ data: { organizationId: org, manifestHash: hash(id), selectedModules: ['accounting', 'close_assurance'], activeModules: ['accounting', 'close_assurance'] } })
  await db.tenantModuleGrant.createMany({ data: ['accounting', 'close_assurance'].map(moduleSlug => ({ id: id + '-' + moduleSlug, organizationId: org, moduleSlug, status: 'active', source: 'manual_override' })) })
  const role = await db.role.create({ data: { organizationId: org, code: id, nameEn: 'Synthetic retention operator', permissions } })
  const user = await db.user.create({ data: { id: id + '-user', organizationId: org, email: id + '@example.invalid', emailVerified: true, isVerified: true, roles: { connect: { id: role.id } } } })
  const session = await db.session.create({ data: { userId: user.id, token: 'rt_session_' + crypto.randomBytes(32).toString('hex'), expiresAt: new Date(Date.now() + 3600000), assuranceVerifiedAt: new Date(), assuranceMethod: 'password', assuranceOrganizationId: org, assuranceLevel: 1 } })
  const control = { actorId: user.id, actorPermissions: permissions, session: { id: session.id, token: session.token }, lastAuthAt: session.assuranceVerifiedAt! }
  let periodId = existing?.periodId, runId = existing?.closeRunId
  if (!existing) {
    const year = await db.fiscalYear.create({ data: { organizationId: org, name: id, startDate: new Date('2026-01-01Z'), endDate: new Date('2026-12-31T23:59:59.999Z') } })
    const period = await db.accountingPeriod.create({ data: { organizationId: org, fiscalYearId: year.id, name: 'Synthetic October', periodNumber: 10, startDate: new Date('2026-10-01Z'), endDate: new Date('2026-10-31T23:59:59.999Z') } }); periodId = period.id
    await db.organizationAccountingSettings.create({ data: { organizationId: org, accountingEnabled: true, setupStatus: 'IN_PROGRESS', baseCurrency: 'XAF' } })
    const assessed = await runCloseAssurance(org, { periodId }, control); expect(assessed.run.status).toBe('BLOCKED'); runId = assessed.run.id!
  }
  return { id, org, role, user, session, control, periodId: periodId!, runId: runId! }
}
type Fixture = Awaited<ReturnType<typeof fixture>>
let qualified: { f: Fixture; result: Awaited<ReturnType<typeof exportClosePack>> }
async function counts(org: string) {
  const where = { organizationId: org }
  return { exports: await db.closePackExport.count({ where }), audit: await db.ledgerAuditEvent.count({ where }), events: await db.businessEvent.count({ where }), comments: await db.accountantComment.count({ where }), runs: await db.closeRun.count({ where }) }
}
async function deniedSql(sql: string, args: unknown[], message?: RegExp) {
  let failure: any
  try { await db.$transaction(async tx => { await tx.$executeRawUnsafe(sql, ...args) }) } catch (error) { failure = error }
  expect(failure).toMatchObject({ code: 'P2010', meta: expect.objectContaining({ code: '23514' }) })
  if (message) expect(failure.message).toMatch(message)
}
afterAll(async () => { try { const finance = { journals: await db.journalEntry.count(), sales: await db.salesOrder.count(), settlements: await db.customerSettlement.count(), certifiedExports: await db.closePackExport.count({ where: { isCertified: true } }) }; expect(Object.values(finance).every(value => value === 0)).toBe(true); fs.writeFileSync(process.env.RETENTION_SERVICE_EVIDENCE!, JSON.stringify({ checks: evidence, finance, limitation: 'Real retained draft and DB invariants only; no earned close certificate, provider or authenticated browser claim' }, null, 2) + '\n') } finally { await db.$disconnect() } })
it('retains exact service bytes, replays once after source changes and retrieves/list original draft', async () => {
  const f = await fixture(), correlationId = 'retention-' + f.id
  const result = await exportClosePack(f.org, { closeRunId: f.runId, mode: 'DRAFT_NOT_CERTIFIED', correlationId }, f.control)
  expect(result.replayed).toBe(false); expect(result.isCertified).toBe(false); expect(result.documentDigest).toBe(hash(result.content))
  const row = await db.closePackExport.findUniqueOrThrow({ where: { id: result.exportId } }); expect(row.canonicalContent).toBe(result.content); expect(row.canonicalContentSha256).toBe(result.documentDigest); expect(row.exportRequestHash).toMatch(/^sha256:[a-f0-9]{64}$/)
  await db.closeRun.update({ where: { id: f.runId }, data: { summary: { syntheticSourceChangeAfterOriginal: true } } })
  const replay = await exportClosePack(f.org, { closeRunId: f.runId, mode: 'DRAFT_NOT_CERTIFIED', correlationId }, f.control)
  expect(replay.replayed).toBe(true); expect(replay.exportId).toBe(result.exportId); expect(replay.content).toBe(result.content)
  const got = await getRetainedClosePackExport(f.org, { exportId: result.exportId, mode: 'DRAFT_NOT_CERTIFIED' }, f.control)
  expect(got.content).toBe(result.content); expect(got.documentDigest).toBe(result.documentDigest); expect(got.historicalNotice).toMatch(/historical/i)
  expect((await listClosePackExports(f.org, { closeRunId: f.runId }, f.control)).map(item => ({ id: item.exportId, retained: item.retained }))).toEqual([{ id: result.exportId, retained: true }])
  expect(await db.closePackExport.count({ where: { organizationId: f.org } })).toBe(1)
  await expect(exportClosePack(f.org, { closeRunId: f.runId, mode: 'CERTIFIED' }, f.control)).rejects.toThrow()
  qualified = { f, result }; evidence.push({ name: 'real-retained-draft-replay-get-list', exportId: result.exportId, organizationId: f.org, documentDigest: result.documentDigest, exactOriginalBytes: true, sourceChangedAfterOriginal: true, duplicateExports: 0, isCertified: false })
})
it('preserves migrated legacy receipt with null original and refuses reconstruction/retrieval', async () => {
  const f = await fixture(legacy), row = await db.closePackExport.findUniqueOrThrow({ where: { id: legacy.exportId } })
  expect([row.canonicalContent, row.canonicalContentSha256, row.exportRequestHash]).toEqual([null, null, null])
  await expect(getRetainedClosePackExport(f.org, { exportId: row.id, mode: 'DRAFT_NOT_CERTIFIED' }, f.control)).rejects.toThrow(/not retained/i)
  await deniedSql('UPDATE close_pack_exports SET "canonicalContent"=$1,"canonicalContentSha256"=$2,"exportRequestHash"=$3 WHERE id=$4', ['{}', hash('{}'), hash('legacy-request'), row.id])
  expect((await listClosePackExports(f.org, { closeRunId: f.runId }, f.control)).find(item => item.exportId === row.id)?.retained).toBe(false)
  evidence.push({ name: 'legacy-original-not-fabricated', exportId: row.id, nullableFields: true, backfillDenied: true })
})
it.each(['partial', 'wrong-byte-hash', 'bad-request-hash', 'empty-content'])('rejects SQL canonical shape violation %s', async kind => {
  const { f } = qualified, id = 'rt-bad-' + crypto.randomBytes(5).toString('hex'), content = kind === 'empty-content' ? '' : '{}'
  await deniedSql('INSERT INTO close_pack_exports (id,"organizationId","periodId","closeRunId","watermarkId","contentHash","canonicalContent","canonicalContentSha256","exportRequestHash","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())', [id, f.org, f.periodId, f.runId, id, hash(id), content, kind === 'partial' ? null : kind === 'wrong-byte-hash' ? hash('wrong') : hash(content), kind === 'bad-request-hash' ? 'bad' : hash('request')])
  expect(await db.closePackExport.count({ where: { id } })).toBe(0); evidence.push({ name: 'sql-retention-shape-denial', kind, sqlstate: '23514' })
})
it.each(['canonicalContent', 'canonicalContentSha256', 'exportRequestHash', 'contentHash', 'watermarkId', 'correlationId'])('keeps retained %s immutable', async column => {
  const { result } = qualified; await deniedSql(`UPDATE close_pack_exports SET "${column}"=$1 WHERE id=$2`, ['synthetic-tamper', result.exportId])
  expect((await db.closePackExport.findUniqueOrThrow({ where: { id: result.exportId } })).canonicalContent).toBe(result.content); evidence.push({ name: 'sql-retained-field-immutable', column, sqlstate: '23514' })
})
it.each(['direct', 'parent-cascade'])('refuses retained document deletion through %s', async kind => {
  const { f, result } = qualified; await deniedSql(kind === 'direct' ? 'DELETE FROM close_pack_exports WHERE id=$1' : 'DELETE FROM close_runs WHERE id=$1', [kind === 'direct' ? result.exportId : f.runId], /Retained close pack documents cannot be deleted/); expect(await db.closePackExport.count({ where: { id: result.exportId } })).toBe(1); evidence.push({ name: 'sql-retained-delete-denied', kind, exactRetentionGuardMessage: true })
})
it('rejects correlation replay with a changed close-run identity', async () => {
  const { f, result } = qualified, before = await counts(f.org)
  await expect(exportClosePack(f.org, { closeRunId: 'not-the-original-run', mode: 'DRAFT_NOT_CERTIFIED', correlationId: result.correlationId }, f.control)).rejects.toMatchObject({ code: 'CONFLICT' })
  expect(await counts(f.org)).toEqual(before); evidence.push({ name: 'changed-request-identity-replay-denied', allScopedCountsUnchanged: true })
})
it('serializes concurrent identical export requests into one retained original', async () => {
  const f = await fixture(), input = { closeRunId: f.runId, mode: 'DRAFT_NOT_CERTIFIED' as const, correlationId: 'concurrent-' + f.id }
  const results = await Promise.all([exportClosePack(f.org, input, f.control), exportClosePack(f.org, input, f.control)])
  expect(new Set(results.map(item => item.exportId)).size).toBe(1); expect(results[0].content).toBe(results[1].content); expect(results.map(item => item.replayed).sort()).toEqual([false, true])
  expect(await db.closePackExport.count({ where: { organizationId: f.org } })).toBe(1); evidence.push({ name: 'real-concurrent-request-replay', committedOriginals: 1, oneReplayed: true, exactBytesEqual: true })
})
it('checks persisted freshness before a certified-mode retrieval without creating a certified fixture', async () => {
  const f = await fixture(), original = await exportClosePack(f.org, { closeRunId: f.runId, mode: 'DRAFT_NOT_CERTIFIED' }, f.control), before = await counts(f.org)
  await db.session.update({ where: { id: f.session.id }, data: { assuranceVerifiedAt: new Date(Date.now() - 301000) } })
  await expect(getRetainedClosePackExport(f.org, { exportId: original.exportId, mode: 'CERTIFIED' }, f.control)).rejects.toMatchObject({ code: 'FRESH_AUTH_REQUIRED' })
  expect(await counts(f.org)).toEqual(before); expect(await db.closePackExport.count({ where: { organizationId: f.org, isCertified: true } })).toBe(0)
  evidence.push({ name: 'certified-mode-read-freshness-denied', originalWasDraft: true, noCertifiedFixture: true, allScopedCountsUnchanged: true })
})
it('allows staleness metadata/updatedAt while preserving the original bytes', async () => {
  const { f, result } = qualified; await db.closePackExport.update({ where: { id: result.exportId }, data: { metadata: { sourceInvalidated: true, staleReason: 'Synthetic later source revision' } } })
  const got = await getRetainedClosePackExport(f.org, { exportId: result.exportId, mode: 'DRAFT_NOT_CERTIFIED' }, f.control); expect(got.content).toBe(result.content); expect(got.documentDigest).toBe(hash(got.content)); evidence.push({ name: 'staleness-metadata-remains-writable', originalBytesUnchanged: true })
})
it.each(['module', 'role', 'session'])('denies retrieval/list/request replay after committed %s revocation', async kind => {
  const f = await fixture(), correlationId = 'revocation-' + f.id, original = await exportClosePack(f.org, { closeRunId: f.runId, mode: 'DRAFT_NOT_CERTIFIED', correlationId }, f.control), before = await counts(f.org)
  if (kind === 'module') await db.tenantModuleGrant.update({ where: { id: f.id + '-close_assurance' }, data: { status: 'suspended' } })
  if (kind === 'role') await db.role.update({ where: { id: f.role.id }, data: { permissions: [] } })
  if (kind === 'session') await db.session.delete({ where: { id: f.session.id } })
  for (const call of [() => getRetainedClosePackExport(f.org, { exportId: original.exportId, mode: 'DRAFT_NOT_CERTIFIED' }, f.control), () => listClosePackExports(f.org, { closeRunId: f.runId }, f.control), () => exportClosePack(f.org, { closeRunId: f.runId, mode: 'DRAFT_NOT_CERTIFIED', correlationId }, f.control)]) { await expect(call()).rejects.toMatchObject({ code: kind === 'session' ? 'AUTH_REQUIRED' : 'FORBIDDEN' }); expect(await counts(f.org)).toEqual(before) }
  evidence.push({ name: 'committed-retention-authority-denial', kind, operations: 3, allScopedBusinessCountsUnchanged: true })
})
it('rejects foreign-tenant document access with current actor authority and no audit write', async () => {
  const f = await fixture(), before = await counts(f.org); await expect(getRetainedClosePackExport(f.org, { exportId: qualified.result.exportId, mode: 'DRAFT_NOT_CERTIFIED' }, f.control)).rejects.toMatchObject({ code: 'NOT_FOUND' }); expect(await counts(f.org)).toEqual(before); evidence.push({ name: 'foreign-tenant-retained-read-denied', noAuditOrExportWrite: true })
})
it('rolls back original export and retained-read audit on scoped audit failure', async () => {
  const { f, result } = qualified, name = 'qual_retention_' + crypto.randomBytes(5).toString('hex'), before = await counts(f.org); expect(f.org).toMatch(/^rt-[a-f0-9]{10}-org$/)
  await db.$executeRawUnsafe(`CREATE FUNCTION public."${name}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."organizationId"='${f.org}' AND NEW.action IN ('CLOSE_PACK_DRAFT_EXPORT','CLOSE_PACK_RETAINED_RETRIEVED') THEN RAISE EXCEPTION 'Owned retention audit failure'; END IF; RETURN NEW; END $$`)
  try {
    await db.$executeRawUnsafe(`CREATE TRIGGER "${name}" BEFORE INSERT ON ledger_audit_events FOR EACH ROW EXECUTE FUNCTION public."${name}"()`)
    await expect(exportClosePack(f.org, { closeRunId: f.runId, mode: 'DRAFT_NOT_CERTIFIED', correlationId: 'rollback-' + f.id }, f.control)).rejects.toThrow(/Owned retention audit failure/)
    expect(await counts(f.org)).toEqual(before)
    await expect(getRetainedClosePackExport(f.org, { exportId: result.exportId, mode: 'DRAFT_NOT_CERTIFIED' }, f.control)).rejects.toThrow(/Owned retention audit failure/)
    expect(await counts(f.org)).toEqual(before); evidence.push({ name: 'real-export-and-retrieval-audit-rollback', allScopedCountsUnchanged: true })
  } finally { await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${name}" ON ledger_audit_events`); await db.$executeRawUnsafe(`DROP FUNCTION public."${name}"()`) }
})
