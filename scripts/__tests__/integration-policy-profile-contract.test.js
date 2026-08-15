const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..", "..");
const packageJson = require(path.join(repoRoot, "package.json"));
const integrationContract = require("../policy-gates-integration-contract.json");
const {
  GATES,
  runIntegrationGates,
} = require("../run-policy-gates-integration");

const REQUIRED_ALIASES = {
  "inventory:valuation:truth:gate":
    "node scripts/inventory-valuation-truth-gate.js --mode fail --out what-next/inventory-valuation-truth-readiness.md --json-out what-next/inventory-valuation-truth-readiness.json",
  "regulatory:boundary:fail":
    "node scripts/regulatory-boundary-gate.js --mode fail",
  "ap:fraud-control:gate":
    "node scripts/ap-fraud-control-readiness.js --mode fail --out what-next/ap-fraud-control-readiness.md --json-out what-next/ap-fraud-control-readiness.json",
  "statutory:country-pack:integration:gate":
    "node scripts/statutory-country-pack-integration-gate.js --mode fail --out what-next/statutory-country-pack-integration-readiness.md --json-out what-next/statutory-country-pack-integration-readiness.json",
  "payroll:presence:gate":
    "node scripts/payroll-presence-readiness-gate.js --mode fail --out what-next/payroll/payroll-presence-readiness.md --json-out what-next/payroll/payroll-presence-readiness.json",
};

function npmRunTargets(script) {
  return Array.from(
    String(script || "").matchAll(/npm run ([^\s&]+)/g),
    (match) => match[1],
  );
}

describe("integration policy profile contract", () => {
  it("defines the five required aliases and resolves every ordered contract target", () => {
    expect(packageJson.scripts).toMatchObject(REQUIRED_ALIASES);
    expect(integrationContract).toMatchObject({ version: 1 });
    expect(integrationContract.gates).toHaveLength(26);
    expect(GATES).toEqual(integrationContract.gates);

    for (const gate of integrationContract.gates) {
      expect(packageJson.scripts[gate]).toEqual(expect.any(String));
      expect(packageJson.scripts[gate].trim()).not.toBe("");
    }
  });

  it("routes repository verification and pull-request CI through integration policy", () => {
    expect(packageJson.scripts["policy:gates:integration"]).toBe(
      "node scripts/run-policy-gates-integration.js",
    );
    expect(npmRunTargets(packageJson.scripts["verify:repo"])).toContain(
      "policy:gates:integration",
    );
    expect(npmRunTargets(packageJson.scripts["verify:repo"])).not.toContain(
      "policy:gates",
    );
    expect(npmRunTargets(packageJson.scripts["verify:ci"])).toContain(
      "verify:repo",
    );

    const workflow = fs.readFileSync(
      path.join(repoRoot, ".github", "workflows", "ci.yml"),
      "utf8",
    );
    expect(workflow).toMatch(/^\s*pull_request:\s*$/m);
    expect(workflow).toMatch(/^\s*run:\s+npm run verify:ci\s*$/m);
  });

  it("retains the production policy chain in release verification", () => {
    const releaseTargets = npmRunTargets(packageJson.scripts["verify:release"]);
    expect(releaseTargets).toEqual(
      expect.arrayContaining(["verify:repo", "policy:gates"]),
    );
    expect(releaseTargets.indexOf("verify:repo")).toBeLessThan(
      releaseTargets.indexOf("policy:gates"),
    );
    expect(npmRunTargets(packageJson.scripts["policy:gates"])).toContain(
      "statutory:country-pack:gate",
    );
  });

  it("can pass integration while statutory production promotion remains blocked", () => {
    const productionGate = "statutory:country-pack:gate";
    const statusFor = (gate) => (gate === productionGate ? 1 : 0);
    const spawnSync = jest.fn((command, args) => ({
      status: statusFor(args.at(-1)),
    }));
    const log = jest.spyOn(console, "log").mockImplementation(() => {});

    try {
      expect(
        runIntegrationGates({
          attempts: 1,
          retryDelayMs: 1,
          command: {
            command: "node",
            prefixArgs: ["npm-cli.js", "run"],
          },
          spawnSync,
        }),
      ).toMatchObject({
        status: "passed",
        failedGate: null,
      });
    } finally {
      log.mockRestore();
    }

    expect(statusFor(productionGate)).toBe(1);
    expect(integrationContract.gates).toContain(
      "statutory:country-pack:integration:gate",
    );
    expect(integrationContract.gates).not.toContain(productionGate);
    expect(integrationContract.gates).not.toContain(
      "statutory:country-pack:dev:gate",
    );
    expect(spawnSync).toHaveBeenCalledTimes(26);
    expect(spawnSync.mock.calls.map(([, args]) => args.at(-1))).toEqual(
      integrationContract.gates,
    );
  });
});
