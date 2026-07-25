#!/usr/bin/env node

const {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} = require("node:fs");
const { dirname, resolve } = require("node:path");
const { spawnSync } = require("node:child_process");

const root = process.cwd();
loadLocalEnv();

const reportPath = resolve(
  root,
  "what-next/agents-runtime/command-agent-enabled-playwright.json",
);
const rawReportPath = resolve(
  root,
  "test-results/command-agent-enabled-playwright.raw.json",
);
mkdirSync(dirname(reportPath), { recursive: true });
mkdirSync(dirname(rawReportPath), { recursive: true });

const playwrightPort = process.env.PLAYWRIGHT_PORT || "3107";
const playwrightBaseUrl =
  process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${playwrightPort}`;
const env = {
  ...process.env,
  PLAYWRIGHT_PORT: playwrightPort,
  PLAYWRIGHT_BASE_URL: playwrightBaseUrl,
  NEXTAUTH_URL: playwrightBaseUrl,
  NEXT_PUBLIC_BASE_URL: playwrightBaseUrl,
  PLAYWRIGHT_JSON_OUTPUT_NAME: reportPath,
  STOQUIFY_COMMAND_AGENT_ROLLOUT: "internal",
  STOQUIFY_COMMAND_AGENT_PILOT_ORG_IDS: [
    process.env.AQSTOQFLOW_E2E_ORG_ID || "org_payroll_e2e_local",
    process.env.AQSTOQFLOW_AGENT_CROSS_TENANT_ORG_ID ||
      "org_command_agent_cross_tenant_e2e",
  ].join(","),
  STOQUIFY_COMMAND_AGENT_PILOT_ROLE_CODES: "PAYROLL_E2E",
  STOQUIFY_COMMAND_AGENT_KILL_SWITCH: "0",
  STOQUIFY_AGENT_RELEASE_ENVIRONMENT: "e2e",
  STOQUIFY_AGENT_CERTIFICATION_MODE: "1",
  TS_NODE_COMPILER_OPTIONS: JSON.stringify({
    module: "commonjs",
    moduleResolution: "node",
  }),
};

const resume = process.argv.includes("--resume");
if (!resume) {
  run(
    process.execPath,
    [resolve(root, "scripts/agent-runtime-phase-2a-provision.js"), "--apply"],
    env,
  );
  runBootstrap("prepare", env);
}
run(
  process.execPath,
  [
    resolve(root, "node_modules/@playwright/test/cli.js"),
    "test",
    "--project=command-agent-enabled-pilot-degradation",
    "--reporter=json",
  ],
  {
    ...env,
    PLAYWRIGHT_JSON_OUTPUT_NAME: rawReportPath,
  },
);
sanitizePlaywrightReport(rawReportPath, reportPath);
runBootstrap("certify", env);

console.log(`Enabled-pilot Playwright certification passed: ${reportPath}`);

function runBootstrap(phase, childEnv) {
  run(
    process.execPath,
    [
      "--conditions=react-server",
      "-r",
      resolve(root, "scripts/server-only-node-shim.js"),
      "-r",
      "ts-node/register/transpile-only",
      "-r",
      "tsconfig-paths/register",
      resolve(root, "scripts/agent-enabled-pilot-e2e-bootstrap.ts"),
      phase,
    ],
    childEnv,
  );
}

function run(command, args, childEnv) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: childEnv,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

function sanitizePlaywrightReport(sourcePath, targetPath) {
  const raw = JSON.parse(readFileSync(sourcePath, "utf8"));
  const tests = [];
  for (const suite of raw.suites ?? []) {
    collectTests(suite, tests);
  }
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    evidencePolicy: {
      source: "distilled-playwright-json",
      rawReportRetained: false,
      environmentIncluded: false,
    },
    playwrightVersion: raw.config?.version ?? null,
    stats: {
      startTime: raw.stats?.startTime ?? null,
      durationMs: raw.stats?.duration ?? null,
      expected: raw.stats?.expected ?? 0,
      skipped: raw.stats?.skipped ?? 0,
      unexpected: raw.stats?.unexpected ?? 0,
      flaky: raw.stats?.flaky ?? 0,
    },
    projects: (raw.config?.projects ?? []).map((project) => ({
      id: project.id,
      name: project.name,
    })),
    tests,
  };
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (
    /"env"\s*:|password|secret|token|database_url|direct_url/i.test(serialized)
  ) {
    throw new Error("Sanitized Playwright evidence contains a forbidden key.");
  }
  writeFileSync(targetPath, serialized, "utf8");
  unlinkSync(sourcePath);
}

function collectTests(suite, tests) {
  for (const child of suite.suites ?? []) {
    collectTests(child, tests);
  }
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const result = test.results?.at(-1);
      tests.push({
        projectId: test.projectId,
        projectName: test.projectName,
        file: spec.file,
        title: spec.title,
        status: result?.status ?? test.status ?? "unknown",
        durationMs: result?.duration ?? null,
        retry: result?.retry ?? 0,
      });
    }
  }
}
function loadLocalEnv() {
  for (const envPath of [resolve(root, ".env.local"), resolve(root, ".env")]) {
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]] !== undefined) continue;
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[match[1]] = expand(value).replace(/\\n/g, "\n");
    }
  }
  for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
    if (process.env[key] && process.env[key].includes("${")) {
      process.env[key] = expand(process.env[key]);
    }
  }
}

function expand(value) {
  return value.replace(
    /\${([A-Za-z_][A-Za-z0-9_]*)}/g,
    (_, key) => process.env[key] || "",
  );
}
