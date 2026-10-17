// Local file preparation only; reviewed fixtures and runners remain opt-in.
const fs = require('node:fs'), path = require('node:path')
const root = path.resolve(__dirname,'../../../..'), prior = path.join(__dirname,'../P05-P06-closure-2026-10-17')
if (fs.existsSync(path.join(__dirname, 'database.cjs'))) throw new Error('Initial preparation already completed; preserve reviewed runners and evidence')
for (const name of ['database.cjs','application.cjs','jest.database.cjs']) {
  let source = fs.readFileSync(path.join(prior,name),'utf8').replaceAll('retention-p05p06','retention-p06-operator')
  if (name === 'database.cjs') source = source.replaceAll('retention-recovery.browser-fixture.test.ts','retention-offline-operator.browser-fixture.test.ts')
  if (name === 'jest.database.cjs') source = source.replaceAll('retention-recovery.browser-fixture.test.ts','retention-offline-operator.browser-fixture.test.ts')
  fs.writeFileSync(path.join(__dirname,name),source)
}
let fixture = fs.readFileSync(path.join(root,'services/pos/__tests__/retention-recovery.browser-fixture.test.ts'),'utf8')
fixture = fixture.replace('P05/P06 synthetic browser fixture','P06 authenticated offline operator fixture').replaceAll('P05-P06-closure-2026-10-17','P06-operator-2026-10-17')
fixture = fixture.replace('  await preparePOSCheckout(request)','  // No pending online commit: isolate local-offline close blocking.')
fixture = fixture.replace("const output = { ...input, email, permissions, passwordKind: 'known synthetic test credential only' }", `const device = await db.pOSOfflineDevice.create({ data: {
      organizationId: input.organizationId, locationId: input.locationId, terminalId: input.terminalId,
      deviceFingerprintHash: 'operator-' + input.userId, deviceLabel: 'Synthetic operator recovery', status: 'ACTIVE',
      policyExpiresAt: new Date(Date.now() + 86400000), policySnapshotHash: 'operator-policy', sourceSnapshotHash: 'operator-reference',
    } })
    const output = { ...input, deviceId: device.id, email, permissions, passwordKind: 'known synthetic test credential only' }`)
fs.writeFileSync(path.join(root,'services/pos/__tests__/retention-offline-operator.browser-fixture.test.ts'),fixture)
const base = `const path = require('node:path')\nconst root = path.resolve(__dirname,'../../../..')\nmodule.exports = { ...require(path.join(root,'jest.payroll-trust-spine.config.cjs')), rootDir: root, roots:['<rootDir>/lib/pos/__tests__'], testEnvironment:'node', testMatch:['**/offline-local-queue.test.ts'], collectCoverage:false }\n`
fs.writeFileSync(path.join(__dirname,'jest.storage.cjs'),base)
console.log('Prepared scoped harnesses; no application/database started')
