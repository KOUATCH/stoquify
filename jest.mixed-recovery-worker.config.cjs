const config = require('./jest.mixed-version-worker.config.cjs');
module.exports = { ...config, testMatch: ['**/mixed-recovery.worker.postgres.test.ts'], testTimeout: 180000 };
