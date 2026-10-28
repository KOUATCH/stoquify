#!/usr/bin/env node

process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: "commonjs",
  moduleResolution: "node",
})

require("./server-only-node-shim")
require("ts-node/register/transpile-only")
require("tsconfig-paths/register")
require("./agent-release-control-postgres-smoke.ts")
