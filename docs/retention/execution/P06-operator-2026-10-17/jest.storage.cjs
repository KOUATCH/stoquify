const path = require('node:path')
const root = path.resolve(__dirname,'../../../..')
module.exports = { ...require(path.join(root,'jest.payroll-trust-spine.config.cjs')), rootDir: root, roots:['<rootDir>/lib/pos/__tests__'], testEnvironment:'node', testMatch:['**/offline-local-queue.test.ts'], collectCoverage:false }
