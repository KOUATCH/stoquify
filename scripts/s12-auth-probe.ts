// Real configured Better Auth handler + PostgreSQL on the restored synthetic DB.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { assertS12Target } from './s12-target.cjs'
assertS12Target()
async function main() {
  const { auth } = await import('../lib/auth')
  const { db } = await import('../prisma/db')
  const fixture = JSON.parse(fs.readFileSync(process.env.S12_FIXTURE!, 'utf8'))
  const request = (password: string) => new Request('http://localhost:3000/api/auth/sign-in/email', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' }, body: JSON.stringify({ email: fixture.email, password }) })
  try {
    const denied = await auth.handler(request('deliberately-wrong-password'))
    assert.equal(denied.status, 401)
    const signed = await auth.handler(request('S12-only-synthetic-password!'))
    assert.equal(signed.status, 200)
    const session = await signed.json()
    assert.equal(session.user.id, fixture.userId)
    assert.ok(session.token)
    const persisted = await db.session.findUnique({ where: { token: session.token } })
    assert.equal(persisted?.userId, fixture.userId)
    const cookie = signed.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
    const current = await auth.handler(new Request('http://localhost:3000/api/auth/get-session', { headers: { cookie } }))
    assert.equal(current.status, 200)
    assert.equal((await current.json()).user.id, fixture.userId)
    const signout = await auth.handler(new Request('http://localhost:3000/api/auth/sign-out', { method: 'POST', headers: { cookie, origin: 'http://localhost:3000' } }))
    assert.equal(signout.status, 200)
    assert.equal(await db.session.findUnique({ where: { token: session.token } }), null)
    console.log(JSON.stringify({ evidenceClass: 'Real Better Auth handler on restored PostgreSQL; no browser', wrongPassword: 401, signIn: 200, sessionRead: 200, signOut: 200, sessionRevoked: true }))
  } finally { await db.$disconnect() }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
