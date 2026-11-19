module.exports={
  "rootDir": "E:\\ohada saas\\Focused projects\\stoquify",
  "roots": [
    "E:\\ohada saas\\Focused projects\\stoquify\\components\\finance\\__tests__"
  ],
  "testEnvironment": "jsdom",
  "moduleNameMapper": {
    "\\.module\\.css$": "E:\\ohada saas\\Focused projects\\stoquify\\node_modules\\next\\dist\\build\\jest\\object-proxy.js",
    "^@/(.*)$": "E:/ohada saas/Focused projects/stoquify/$1",
    "^server-only$": "E:\\ohada saas\\Focused projects\\stoquify\\scripts\\server-only-node-shim.js"
  },
  "transform": {
    "^.+\\.(js|jsx|ts|tsx)$": "E:\\ohada saas\\Focused projects\\stoquify\\node_modules\\next\\dist\\build\\swc\\jest-transformer.js"
  },
  "setupFiles": [],
  "setupFilesAfterEnv": [
    "E:\\ohada saas\\Focused projects\\stoquify\\node_modules\\@testing-library\\jest-dom\\dist\\index.js"
  ],
  "collectCoverage": false,
  "testTimeout": 20000
};
