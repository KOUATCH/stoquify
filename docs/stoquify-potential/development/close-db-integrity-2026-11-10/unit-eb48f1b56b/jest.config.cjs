module.exports={
  "rootDir": "E:\\ohada saas\\Focused projects\\stoquify",
  "roots": [
    "E:\\ohada saas\\Focused projects\\stoquify\\services\\accounting\\__tests__",
    "E:\\ohada saas\\Focused projects\\stoquify\\actions\\accounting\\__tests__"
  ],
  "testEnvironment": "node",
  "cache": false,
  "moduleNameMapper": {
    "^@prisma/client$": "E:\\ohada saas\\Focused projects\\stoquify\\.codex-tmp\\close-integrity-execution-clients-20261110-b96b309c4c\\clients\\current\\orm\\client",
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
