const path = require('node:path')
const root = path.resolve(__dirname, '../../..')
// Explicit mocked lane, no Next config/env/DB setup.
module.exports = require(path.join(root, 'node_modules/next/jest'))()({
 rootDir: root, testEnvironment: 'jsdom', collectCoverage: false,
 moduleNameMapper: {'^@/(.*)$':'<rootDir>/$1', '^lucide-react$':'<rootDir>/node_modules/lucide-react/dist/cjs/lucide-react.js'},
 setupFilesAfterEnv: ['<rootDir>/docs/command-center/phase-5-2026-10-24/test-setup.ts'],
 roots: ['<rootDir>/services/assurance/__tests__','<rootDir>/actions/assurance/__tests__','<rootDir>/components/assurance/__tests__','<rootDir>/services/manager-action-center/__tests__'],
 testMatch: [
 '<rootDir>/services/assurance/__tests__/assurance-assignment.service.test.ts',
 '<rootDir>/services/assurance/__tests__/assurance-incident.service.test.ts',
 '<rootDir>/services/assurance/__tests__/assurance-control-tower.service.test.ts',
 '<rootDir>/actions/assurance/__tests__/workflow-assurance-incident.actions.test.ts',
 '<rootDir>/components/assurance/__tests__/AssuranceIncidentActions.test.tsx',
 '<rootDir>/services/manager-action-center/__tests__/manager-action-center.service.test.ts',
 ],
})
