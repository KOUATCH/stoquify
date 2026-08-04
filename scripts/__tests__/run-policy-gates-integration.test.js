const {
  GATES,
  runGate,
  runIntegrationGates,
  validateGateContract,
} = require("../run-policy-gates-integration");

describe("integration policy gate runner", () => {
  const command = {
    command: "node",
    prefixArgs: ["npm-cli.js", "run"],
  };

  it("preserves the complete ordered integration gate contract", () => {
    expect(GATES).toHaveLength(26);
    expect(GATES[0]).toBe("inventory:boundary:fail");
    expect(GATES[1]).toBe("inventory:valuation:truth:gate");
    expect(GATES.indexOf("purchasing:ap:gate")).toBeLessThan(
      GATES.indexOf("ap:fraud-control:gate"),
    );    expect(GATES).toContain("statutory:country-pack:integration:gate");
    expect(GATES).toContain("payroll:immutability:runtime");
    expect(GATES.at(-1)).toBe("prisma:migration:safety:gate");
  });

  it("rejects empty, duplicate, or unsupported gate contracts", () => {
    expect(() => validateGateContract({ version: 1, gates: [] })).toThrow(
      "Invalid integration policy gate contract",
    );
    expect(() =>
      validateGateContract({
        version: 1,
        gates: ["ledger:close-truth:gate", "ledger:close-truth:gate"],
      }),
    ).toThrow("Invalid integration policy gate contract");
    expect(() =>
      validateGateContract({
        version: 2,
        gates: ["ledger:close-truth:gate"],
      }),
    ).toThrow("Invalid integration policy gate contract");
  });
  it("retries a transient failure and preserves the final pass", () => {
    const spawnSync = jest
      .fn()
      .mockReturnValueOnce({ status: 1 })
      .mockReturnValueOnce({ status: 0 });

    expect(
      runGate("ledger:close-truth:gate", {
        attempts: 3,
        retryDelayMs: 1,
        command,
        spawnSync,
      }),
    ).toEqual({
      gate: "ledger:close-truth:gate",
      attempts: 2,
      status: "passed",
    });
  });

  it("fails closed after the configured attempts", () => {
    const spawnSync = jest.fn().mockReturnValue({ status: 1 });

    expect(
      runIntegrationGates({
        gates: ["ledger:close-truth:gate", "payment:cash-truth:gate"],
        attempts: 2,
        retryDelayMs: 1,
        command,
        spawnSync,
      }),
    ).toMatchObject({
      status: "failed",
      failedGate: "ledger:close-truth:gate",
    });
    expect(spawnSync).toHaveBeenCalledTimes(2);
  });
});
