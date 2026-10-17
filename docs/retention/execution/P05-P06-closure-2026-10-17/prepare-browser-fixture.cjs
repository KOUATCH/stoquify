// Reuse the current full-commit fixture verbatim in a separately owned test.
const fs = require('node:fs'), path = require('node:path')
const root = path.resolve(__dirname, '../../../..')
const source = fs.readFileSync(path.join(root, 'services/pos/__tests__/pos-full-commit.postgres.test.ts'), 'utf8')
const target = path.join(root, 'services/pos/__tests__/retention-recovery.browser-fixture.test.ts')
if (fs.existsSync(target)) throw new Error('Refusing to replace fixture')
const fixture = source.slice(source.indexOf('function assertDisposableTarget()'), source.indexOf('type Fixture ='))
if (!fixture.includes('async function fixture()')) throw new Error('Fixture extraction boundary changed')
fs.writeFileSync(target, `/** @jest-environment node */
// P05/P06 synthetic browser fixture; copied from current full-commit fixture.
import { randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
jest.unmock('@/prisma/db')
import { db } from '@/prisma/db'
import { acquirePOSCheckout, preparePOSCheckout } from '../checkout.service'
import { posCartRevision } from '../cart-revision'
import { hashPassword } from '@/lib/password'
${fixture}
const suite = process.env.RUN_RETENTION_BROWSER_FIXTURE === '1' ? describe : describe.skip
suite('P05/P06 owned synthetic browser fixture', () => {
  jest.setTimeout(120000)
  afterAll(async () => { await db.$disconnect() })
  it('creates a verified cashier and retained original sale for actual application recovery', async () => {
    const input = await fixture()
    const password = 'Retention-Synthetic-Only-2026!'
    const email = input.userId + '@retention.invalid'
    const permissions = ['pos.read','pos.use','pos.transactions.read','pos.session.start','pos.session.end','inventory.read','customers.read','locations.read','sales.read']
    const role = await db.role.create({ data: { organizationId: input.organizationId, code: 'RETENTION_CASHIER', nameEn: 'Synthetic cashier', nameFr: 'Caissier de test', permissions } })
    await db.user.update({ where: { id: input.userId }, data: { email, emailVerified: true, isVerified: true, roles: { connect: { id: role.id } } } })
    await db.account.create({ data: { userId: input.userId, accountId: input.userId, providerId: 'credential', password: await hashPassword(password) } })
    // Expiry permits the actual browser to acquire its own lease; original intent is retained.
    await db.pOSCheckoutWorkspace.update({ where: { sessionId: input.sessionId }, data: { leaseExpiresAt: new Date(0) } })
    const output = { ...input, email, permissions, passwordKind: 'known synthetic test credential only' }
    writeFileSync(join(process.cwd(), 'docs/retention/execution/P05-P06-closure-2026-10-17/BROWSER_FIXTURE.json'), JSON.stringify(output, null, 2))
    expect((await db.salesOrder.findUniqueOrThrow({ where: { id: input.salesOrderId } })).status).toBe('DRAFT')
  })
})
`)
console.log('Created owned synthetic browser fixture test')
