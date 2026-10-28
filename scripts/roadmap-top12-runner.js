#!/usr/bin/env node

const { spawnSync } = require("node:child_process");

const npmCommand = "npm";
const args = new Set(process.argv.slice(2));
const requestedPrismaRun = args.has("--with-prisma");
const forcePrismaRun = requestedPrismaRun && args.has("--force-prisma");
const skipPrismaRun =
  args.has("--skip-prisma") ||
  args.has("--no-prisma") ||
  args.has("--dry-run");

const shouldRunPrismaValidate = (() => {
  if (skipPrismaRun) {
    return false;
  }
  if (requestedPrismaRun && !forcePrismaRun) {
    console.log(
      "Prisma validation is disabled by default on roadmap runs. " +
        "Use --with-prisma --force-prisma to opt in explicitly.",
    );
  }
  return forcePrismaRun;
})();

const run = (command, args, allowFail = false) => {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0 && !allowFail) {
    process.exit(result.status ?? 1);
  }

  return result.status ?? 0;
};

const reportDate = "2026-08-03";

const commands = [
  ["node", ["scripts/top12-programme-gate.js", "--mode", "report"]],
  [
    "node",
    [
      "scripts/top12-evaluation-harness.js",
      "--mode",
      "fail",
      "--limit",
      "150",
      "--out",
      `docs/stoquify-skills-agents/execution/TOP12_FND_010_EVALUATION_HARNESS_REPORT_${reportDate}-roadmap.md`,
      "--json-out",
      `docs/stoquify-skills-agents/execution/top12-evaluation-harness-run-${reportDate}-roadmap.json`,
    ],
  ],
  ...(shouldRunPrismaValidate ? [[npmCommand, ["run", "prisma:validate"]]] : []),
  [npmCommand, ["run", "agent:tool-registry:gate"]],
  [npmCommand, ["run", "agent:prohibited-action:gate"]],
  [npmCommand, ["run", "agent:release-control:gate"]],
  [npmCommand, ["run", "ai:copilot:guardrails:gate"]],
  [npmCommand, ["run", "agent:phase2a:gate"]],
  [npmCommand, ["run", "agent:phase2b:entry:gate"]],
  [npmCommand, ["run", "agent:phase3:entry:gate"]],
  [
    "node",
    [
      "scripts/agent-external-input-readiness.js",
      "--mode",
      "fail",
      "--json-out",
      "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_EXTERNAL_INPUT_READINESS_2026-07-25.json",
      "--out",
      "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_EXTERNAL_INPUT_READINESS_2026-07-25.md",
    ],
  ],
  [
    npmCommand,
    [
      "test",
      "--",
      "--runInBand",
      "scripts/__tests__/top12-programme-gate.test.js",
      "scripts/__tests__/top12-evaluation-harness.test.js",
    ],
  ],
  [
    npmCommand,
    [
      "run",
      "typecheck",
    ],
  ],
];

for (const [command, args] of commands) {
  const status = run(command, args);
  if (status !== 0) {
    break;
  }
}
