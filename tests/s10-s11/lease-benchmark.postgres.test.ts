import { randomUUID } from 'node:crypto'
import { writeFileSync, appendFileSync } from 'node:fs'
import { db } from '@/prisma/db'
import { Client } from 'pg'
import * as checkout from '@/services/pos/checkout.service'
jest.mock('@/prisma/db', () => ({ db: new (require('@prisma/client').PrismaClient)({ log: [{ emit: 'event', level: 'query' }], transactionOptions: { timeout: 15000, maxWait: 10000 } }) }))
const client = db
const queries: { query: string; params: string; duration: number }[] = []
;(client as any).$on('query', (event: { query: string; params: string; duration: number }) => queries.push(event))
const target = new URL(process.env.DATABASE_URL!)
const schema = target.searchParams.get('schema')!
const quote = (s: string) => '"' + s.replaceAll('"', '""') + '"'
const percentile = (values: number[], p: number) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1]

it('measures actual checkout transactions on isolated indexed tables and retains recovery access', async () => {
  if (process.env.NODE_ENV !== 'test' || target.hostname !== 'localhost' || !/^stoquify_pos_audit_\d{8}_[a-f0-9]{8,16}$/.test(target.pathname.slice(1)) || target.pathname.slice(1) !== process.env.POS_DISPOSABLE_DATABASE_NAME || !/^s10_\d+$/.test(schema)) throw new Error('Explicit disposable target required')
  const observer = new Client({ connectionString: target.toString() })
  const progress = (phase: string) => appendFileSync(process.env.S10_BENCH_OUTPUT! + '.progress.log', new Date().toISOString() + ' ' + phase + '\n')
  progress('start')
  let created = false, sampling = false
  let lockSamples = 0, observerSamples = 0
  const report: any = { mode: process.env.S10_BENCH_MODE, schema, workload: 'Synthetic sensitivity study; not an agreed capacity/SLO', cases: [] }
  try {
    await observer.connect()
    progress('connected')
    report.database = (await observer.query('SELECT current_database() AS name, version() AS version')).rows[0]
    await client.$executeRawUnsafe(`CREATE SCHEMA ${quote(schema)}`); created = true
    // pg does not interpret Prisma's ?schema= URL parameter. Bind EXPLAIN to the
    // same fixture search_path as the Prisma client, including unqualified renewal SQL.
    await observer.query(`SET search_path TO ${quote(schema)}, public`)
    for (const table of ['pos_terminals', 'pos_sessions', 'pos_checkout_workspaces', 'sales_orders', 'sales_order_lines', 'pos_commit_results', 'pos_offline_events', 'pos_offline_sync_certificates', 'audit_logs']) {
      // Indexes are recreated after enum rebinding. No foreign keys: this is a query-cost fixture, not financial qualification.
      await client.$executeRawUnsafe(`CREATE TABLE ${quote(schema)}.${quote(table)} (LIKE public.${quote(table)} INCLUDING DEFAULTS)`)
    }
    const columns = await client.$queryRawUnsafe<any[]>(`SELECT table_name,column_name,udt_name,column_default FROM information_schema.columns WHERE table_schema='${schema}' AND data_type='USER-DEFINED'`)
    for (const name of new Set<string>(columns.map(c => c.udt_name))) {
      const labels = await client.$queryRaw<any[]>`SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE t.typname=${name} AND n.nspname='public' ORDER BY e.enumsortorder`
      await client.$executeRawUnsafe(`CREATE TYPE ${quote(schema)}.${quote(name)} AS ENUM (${labels.map(l => "'" + l.enumlabel.replaceAll("'", "''") + "'").join(',')})`)
    }
    for (const c of columns) {
      const table = `${quote(schema)}.${quote(c.table_name)}`, col = quote(c.column_name), type = `${quote(schema)}.${quote(c.udt_name)}`
      await client.$executeRawUnsafe(`ALTER TABLE ${table} ALTER COLUMN ${col} DROP DEFAULT, ALTER COLUMN ${col} TYPE ${type} USING (${col}::text::${type})`)
      if (c.column_default) {
        const value = c.column_default.match(/^'([^']*)'::/)?.[1]; if (!value) throw new Error('Unexpected enum default')
        await client.$executeRawUnsafe(`ALTER TABLE ${table} ALTER COLUMN ${col} SET DEFAULT '${value.replaceAll("'", "''")}'::${type}`)
      }
    }
    const indexes = await observer.query(`SELECT indexdef FROM pg_indexes WHERE schemaname='public' AND tablename IN (SELECT table_name FROM information_schema.tables WHERE table_schema=$1)`, [schema])
    for (const row of indexes.rows) await client.$executeRawUnsafe(row.indexdef.replaceAll('public.', `${quote(schema)}.`))
    progress('schema ready')
    const extended = process.env.S10_EXTENDED === '1'
    report.topology = extended ? 'Shared organization/location, distinct cashier/terminal per till' : 'Independent organization per till'
    for (const { volume, tills } of (extended ? [{ volume: 10, tills: 16 }, { volume: 100, tills: 16 }] : [{ volume: 0, tills: 4 }, { volume: 10, tills: 4 }, { volume: 10, tills: 16 }, { volume: 100, tills: 4 }])) {
      progress(`seed ${tills}/${volume}`)
      const scopes = []
      const shared = randomUUID()
      for (let till = 0; till < tills; till++) {
        const id = randomUUID(), scope = { organizationId: 'org-' + id, userId: 'actor-' + id, locationId: 'loc-' + id, terminalId: 'terminal-' + id, sessionId: 'session-' + id, checkoutLeaseId: randomUUID() }
        if (extended) { scope.organizationId = 'org-' + shared; scope.locationId = 'loc-' + shared }
        scopes.push(scope)
        await client.pOSStation.create({ data: { id: scope.terminalId, organizationId: scope.organizationId, locationId: scope.locationId, terminalNumber: id, name: 'S10 synthetic till', currentSessionId: scope.sessionId } })
        await client.pOSSession.create({ data: { id: scope.sessionId, organizationId: scope.organizationId, userId: scope.userId, locationId: scope.locationId, terminalId: scope.terminalId, sessionNumber: id, openingBalance: 0 } })
        const oldIds = Array.from({ length: volume }, (_, n) => `${id}-${n}`)
        await client.pOSSession.createMany({ data: oldIds.map(old => ({ id: 'old-' + old, organizationId: scope.organizationId, userId: scope.userId, locationId: scope.locationId, terminalId: scope.terminalId, sessionNumber: old, openingBalance: 0, status: 'CLOSED' as const, endTime: new Date() })) })
        await client.pOSCheckoutWorkspace.createMany({ data: oldIds.map(old => ({ sessionId: 'old-' + old, organizationId: scope.organizationId, actorId: scope.userId, pendingRequest: { clientCommitId: 'pos:' + old, salesOrderId: 'missing-' + old, locationId: scope.locationId, terminalId: scope.terminalId, sessionId: 'old-' + old, expectedCartRevision: 'a'.repeat(64), tenders: [{ method: 'CASH', amount: 100 }] } })) })
        await client.salesOrder.createMany({ data: Array.from({ length: volume * 5 }, (_, n) => ({ id: `park-${id}-${n}`, organizationId: scope.organizationId, createdById: scope.userId, locationId: scope.locationId, terminalId: scope.terminalId, sessionId: scope.sessionId, customerId: 'customer-' + id, orderNumber: `P-${id}-${n}`, status: 'DRAFT' as const, posCartState: 'PARKED' as const })) })
        if (!extended) await checkout.acquirePOSCheckout(scope)
      }
      await client.$executeRawUnsafe(`ANALYZE ${quote(schema)}.pos_checkout_workspaces`)
      await client.$executeRawUnsafe(`ANALYZE ${quote(schema)}.sales_orders`)
      const operation = process.env.S10_BENCH_MODE === 'renew' ? (checkout as any).renewPOSCheckout : checkout.acquirePOSCheckout
      if (!operation) throw new Error('Requested operation absent')
      const startupFailures: string[] = [], startupDurations: number[] = []
      if (extended) await Promise.all(scopes.map(async scope => {
        const start = performance.now()
        try { await checkout.acquirePOSCheckout(scope) } catch (error) { startupFailures.push((error as any).code || (error as Error).message) }
        finally { startupDurations.push(performance.now() - start) }
      }))
      for (const scope of scopes) { await checkout.acquirePOSCheckout(scope); await operation(scope) }
      progress(`measure ${tills}/${volume}`)
      queries.length = 0; lockSamples = 0; observerSamples = 0; sampling = true
      const monitor = (async () => { while (sampling) { const rows = await observer.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'"); observerSamples++; lockSamples += rows.rows[0].n; await new Promise(resolve => setTimeout(resolve, 10)) } })()
      const durations: number[] = []
      const outcomes: any[] = []
      const failures: string[] = []
      try {
        for (let round = 0; round < (extended ? 25 : 5); round++) await Promise.all(scopes.map(async scope => { const start = performance.now(); try { outcomes.push(await operation(scope)) } catch (error) { failures.push((error as any).code || (error as Error).message) } finally { durations.push(performance.now() - start) } }))
      } finally { sampling = false; await monitor }
      const captured = [...queries]
      const selects = [...new Map(captured.filter(q => /^\s*SELECT/i.test(q.query)).map(q => [q.query, q])).values()]
      const plans = []
      for (const q of selects) {
        const plan = (await observer.query('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' + q.query, JSON.parse(q.params))).rows[0]['QUERY PLAN']
        plans.push({ sql: q.query, plan })
      }
      const snapshots = []
      progress(`discover ${tills}/${volume}`)
      for (const scope of scopes) snapshots.push(await checkout.acquirePOSCheckout(scope))
      for (const snapshot of snapshots) { expect(snapshot.historicalRequests).toHaveLength(volume); expect(snapshot.parked).toHaveLength(volume * 5) }
      const recoveryStart = performance.now(); let recoveryAfter: string | null | undefined, recoveryPasses = 0
      if (extended) do {
        const recovery = await checkout.acquirePOSCheckout({ ...scopes[0], recoveryAfter })
        recoveryAfter = recovery.recoveryAfter; recoveryPasses++
        expect(recovery.historicalRequests).toHaveLength(volume)
        if (recoveryPasses > Math.ceil(volume / 20) + 1) throw new Error('Recovery continuation did not terminate')
      } while (recoveryAfter)
      report.cases.push({ activeTills: tills, pendingPerCashier: volume, parkedPerCashier: volume * 5, samples: durations.length, failures, latencyMs: { p50: percentile(durations, .5), p95: percentile(durations, .95), all: durations }, sqlCount: captured.length, sqlPerCall: captured.length / durations.length, rolledBackAttempts: captured.filter(q => q.query === 'ROLLBACK').length, sampledLockWaits: lockSamples, observerSamples, resultBytes: JSON.stringify(outcomes).length, representativeSelectPlans: plans, recoveryDiscoverable: true, startup: { failures: startupFailures, durations: startupDurations }, recoverySweep: { passes: recoveryPasses, elapsedMs: performance.now() - recoveryStart, unresolvedRetained: volume, settled: 0 } })
      progress(`complete ${tills}/${volume}`)
    }
    writeFileSync(process.env.S10_BENCH_OUTPUT!, JSON.stringify(report, null, 2), { flag: 'wx' })
  } finally {
    sampling = false
    if (created) await client.$executeRawUnsafe(`DROP SCHEMA ${quote(schema)} CASCADE`)
    await client.$disconnect(); await observer.end()
  }
})
