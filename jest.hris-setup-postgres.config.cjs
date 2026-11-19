// Isolated explicit-target lane. No dotenv, Next config or global Prisma mocks.
module.exports = {...require('./jest.hris-correctness-postgres.config.cjs'), testMatch: ['**/workspace-setup.postgres.test.ts'], testTimeout: 60000}
