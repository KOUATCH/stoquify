const config = require('./jest.mixed-version.config.cjs');
module.exports = { ...config, testMatch: ['**/mixed-recovery.compatibility.postgres.test.ts'], testTimeout: 600000 };
