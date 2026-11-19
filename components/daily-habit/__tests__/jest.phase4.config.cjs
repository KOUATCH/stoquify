const path = require('node:path')
const root = path.resolve(__dirname, '../../..')
// Bounded mocked/pure UI lane. No Next config, env files or database setup.
module.exports = require(path.join(root, 'node_modules/next/jest'))()({
  rootDir: root, testEnvironment: 'jsdom', collectCoverage: false,
  moduleNameMapper: {'^@/(.*)$':'<rootDir>/$1', '^lucide-react$':'<rootDir>/node_modules/lucide-react/dist/cjs/lucide-react.js'},
  setupFilesAfterEnv: ['<rootDir>/components/daily-habit/__tests__/phase3.setup.tsx'],
  roots: ['<rootDir>/components/daily-habit/__tests__','<rootDir>/components/owner-war-room/__tests__','<rootDir>/components/bi/__tests__','<rootDir>/components/agents/__tests__','<rootDir>/services/owner-war-room/__tests__','<rootDir>/services/daily-habit/__tests__','<rootDir>/components/manager-action-center/__tests__','<rootDir>/services/manager-action-center/__tests__','<rootDir>/components/evidence/__tests__','<rootDir>/lib/dashboard/__tests__'],
  testMatch: [
    '<rootDir>/components/daily-habit/__tests__/phase4-release.test.tsx',
    '<rootDir>/components/evidence/__tests__/ProofTrailDrawer.test.tsx',
    '<rootDir>/components/evidence/__tests__/EvidenceGradeBadge.test.tsx',
    '<rootDir>/components/bi/__tests__/BIEvidenceBadgeRow.test.tsx',
    '<rootDir>/lib/dashboard/__tests__/snapshot-blocker-presentation.test.ts',
    '<rootDir>/lib/dashboard/__tests__/snapshot-source-blocker-presentation.test.ts',
    '<rootDir>/services/daily-habit/__tests__/daily-habit-signal-presentation.test.ts',
    '<rootDir>/services/owner-war-room/__tests__/owner-signal-copy.test.ts',

    '<rootDir>/components/daily-habit/__tests__/phase3-context.test.tsx',
    '<rootDir>/components/manager-action-center/__tests__/ManagerActionCenterDashboard.test.tsx',
    '<rootDir>/components/manager-action-center/__tests__/ManagerLocationActionCenterDashboard.test.tsx',
    '<rootDir>/components/manager-action-center/__tests__/PaymentReconciliationSignOffCommand.test.tsx',
    '<rootDir>/services/manager-action-center/__tests__/manager-action-center.service.test.ts',
    '<rootDir>/services/manager-action-center/__tests__/manager-action-center-query.service.test.ts',
    '<rootDir>/services/manager-action-center/__tests__/manager-location-action-center.service.test.ts',
    '<rootDir>/components/daily-habit/__tests__/modes.test.tsx',
    '<rootDir>/components/daily-habit/__tests__/DailyHabitDigestDashboard.test.tsx',
    '<rootDir>/components/daily-habit/__tests__/phase2-briefings.test.tsx',
    '<rootDir>/components/owner-war-room/__tests__/OwnerWarRoomDashboard.test.tsx',
    '<rootDir>/components/agents/__tests__/AgentCommandPanel.test.tsx',
    '<rootDir>/components/bi/__tests__/BICommandBriefHeader.compact.test.tsx',
    '<rootDir>/components/bi/__tests__/bi-command-primitives.test.tsx',
    '<rootDir>/services/owner-war-room/__tests__/owner-war-room.service.test.ts',
    '<rootDir>/services/daily-habit/__tests__/daily-habit-digest.service.test.ts',
  ],
})
