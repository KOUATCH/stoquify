#!/usr/bin/env node

const path = require("path");
const { spawnSync } = require("child_process");
const integrationGateContract = require("./policy-gates-integration-contract.json");

function validateGateContract(contract) {
  if (
    contract?.version !== 1 ||
    !Array.isArray(contract.gates) ||
    contract.gates.length === 0 ||
    contract.gates.some(
      (gate) => typeof gate !== "string" || gate.trim().length === 0,
    ) ||
    new Set(contract.gates).size !== contract.gates.length
  ) {
    throw new Error("Invalid integration policy gate contract");
  }
  return Object.freeze([...contract.gates]);
}

const GATES = validateGateContract(integrationGateContract);

const DEFAULT_ATTEMPTS = 5;
const DEFAULT_RETRY_DELAY_MS = 5000;

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function wait(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function npmCommand(env = process.env) {
  const npmCli = env.npm_execpath;
  if (!npmCli) {
    throw new Error(
      "npm_execpath is required to run the integration gate suite",
    );
  }
  return {
    command: process.execPath,
    prefixArgs: [path.resolve(npmCli), "run"],
  };
}

function runGate(gate, options = {}) {
  const attempts = options.attempts || DEFAULT_ATTEMPTS;
  const retryDelayMs = options.retryDelayMs || DEFAULT_RETRY_DELAY_MS;
  const command = options.command || npmCommand(options.env);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    console.log(`\n[integration-gates] ${gate} attempt ${attempt}/${attempts}`);
    const result = (options.spawnSync || spawnSync)(
      command.command,
      [...command.prefixArgs, gate],
      {
        cwd: options.cwd || process.cwd(),
        env: options.env || process.env,
        stdio: "inherit",
        shell: false,
        windowsHide: true,
      },
    );

    if (result.error) throw result.error;
    if (result.status === 0) {
      return { gate, attempts: attempt, status: "passed" };
    }
    if (attempt < attempts) wait(retryDelayMs);
  }

  return { gate, attempts, status: "failed" };
}

function runIntegrationGates(options = {}) {
  const results = [];
  for (const gate of options.gates || GATES) {
    const result = runGate(gate, options);
    results.push(result);
    if (result.status !== "passed") {
      return {
        status: "failed",
        failedGate: gate,
        results,
      };
    }
  }
  return {
    status: "passed",
    failedGate: null,
    results,
  };
}

function main() {
  const result = runIntegrationGates({
    attempts: parsePositiveInteger(
      process.env.POLICY_GATE_ATTEMPTS,
      DEFAULT_ATTEMPTS,
    ),
    retryDelayMs: parsePositiveInteger(
      process.env.POLICY_GATE_RETRY_DELAY_MS,
      DEFAULT_RETRY_DELAY_MS,
    ),
  });
  console.log(
    `\n[integration-gates] status=${result.status} passed=${result.results.filter((item) => item.status === "passed").length}/${GATES.length}`,
  );
  if (result.failedGate) {
    console.error(`[integration-gates] failedGate=${result.failedGate}`);
  }
  process.exitCode = result.status === "passed" ? 0 : 1;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  DEFAULT_ATTEMPTS,
  DEFAULT_RETRY_DELAY_MS,
  GATES,
  npmCommand,
  runGate,
  runIntegrationGates,
  validateGateContract,
};
