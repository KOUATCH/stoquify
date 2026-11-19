module.exports={
  "rootDir": "E:\\ohada saas\\Focused projects\\stoquify",
  "roots": [
    "E:\\ohada saas\\Focused projects\\stoquify\\services\\reconciliation\\__tests__",
    "E:\\ohada saas\\Focused projects\\stoquify\\actions\\accounting\\__tests__"
  ],
  "testEnvironment": "node",
  "moduleNameMapper": {
    "^@/(.*)$": "E:/ohada saas/Focused projects/stoquify/$1",
    "^server-only$": "E:\\ohada saas\\Focused projects\\stoquify\\scripts\\server-only-node-shim.js"
  },
  "transform": {
    "^.+\\.(js|jsx|ts|tsx)$": "E:\\ohada saas\\Focused projects\\stoquify\\node_modules\\next\\dist\\build\\swc\\jest-transformer.js"
  },
  "setupFiles": [],
  "setupFilesAfterEnv": [],
  "collectCoverage": false,
  "testTimeout": 20000
};
