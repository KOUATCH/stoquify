module.exports={
  "rootDir": "E:\\ohada saas\\Focused projects\\stoquify",
  "roots": [
    "E:\\ohada saas\\Focused projects\\stoquify\\lib\\security"
  ],
  "testEnvironment": "node",
  "cache": false,
  "moduleNameMapper": {
    "^@/(.*)$": "E:/ohada saas/Focused projects/stoquify/$1",
    "^server-only$": "E:\\ohada saas\\Focused projects\\stoquify\\scripts\\server-only-node-shim.js"
  },
  "transform": {
    "^.+\\.(js|jsx|ts|tsx)$": "E:\\ohada saas\\Focused projects\\stoquify\\node_modules\\next\\dist\\build\\swc\\jest-transformer.js"
  },
  "setupFiles": [],
  "setupFilesAfterEnv": [
    "E:\\ohada saas\\Focused projects\\stoquify\\plans\\stoquify-production-readiness-2026-10-28\\execution\\P04-R06\\qualification-20261109-r1\\unit\\guard.cjs"
  ],
  "collectCoverage": false,
  "testTimeout": 20000
};
