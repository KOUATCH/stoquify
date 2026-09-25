const path = require("node:path");
const { spawnSync } = require("node:child_process");

function modeFromArguments(argumentsList) {
  const modeIndex = argumentsList.indexOf("--mode");
  return modeIndex >= 0 ? argumentsList[modeIndex + 1] : null;
}

function runAuthoritativeOrchestrator(argumentsList) {
  const orchestrator = path.join(__dirname, "x1-approval-automation-orchestrator.js");
  const result = spawnSync(process.execPath, [orchestrator, ...argumentsList], {
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  process.exitCode = result.status === null ? 1 : result.status;
}

function main() {
  const argumentsList = process.argv.slice(2);
  const mode = modeFromArguments(argumentsList);

  if (argumentsList.includes("--local-register")) {
    const commands = { create: "init", sync: "sync", report: "report" };
    if (!commands[mode]) throw new Error("Local register mode must be create, sync or report.");
    if (process.env.X1_ALLOW_LOCAL_SIMULATION === "true") throw new Error("Disable simulator mode before using the manual approval register.");
    const result = require("./x1-local-approval-register.js").main([commands[mode]]);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.findings?.length) process.exitCode = 2;
    return;
  }

  if (process.env.X1_ALLOW_LOCAL_SIMULATION !== "true") {
    runAuthoritativeOrchestrator(argumentsList);
    return;
  }

  if (mode !== "create" && mode !== "sync") {
    throw new Error("Local X1 simulation supports only --mode create and --mode sync.");
  }

  const provider = require("../services/governance/approval-providers/local-file-simulator.js");
  const result = provider.run(mode);
  process.stdout.write(`${JSON.stringify({
    mode,
    simulation: true,
    authoritative: false,
    gateReleaseAllowed: false,
    result,
  }, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
