import {
  AgentExecutionControlError,
  DEFAULT_COMMAND_AGENT_TIMEOUT_MS,
  resolveCommandAgentTimeoutMs,
  withAgentExecutionTimeout,
} from "../agent-execution-control.service";

describe("agent execution controls", () => {
  it("uses a bounded timeout configuration", () => {
    expect(resolveCommandAgentTimeoutMs({})).toBe(
      DEFAULT_COMMAND_AGENT_TIMEOUT_MS,
    );
    expect(
      resolveCommandAgentTimeoutMs({ STOQUIFY_COMMAND_AGENT_TIMEOUT_MS: "50" }),
    ).toBe(1_000);
    expect(
      resolveCommandAgentTimeoutMs({
        STOQUIFY_COMMAND_AGENT_TIMEOUT_MS: "90000",
      }),
    ).toBe(30_000);
  });

  it("rejects a slow operation with a typed timeout", async () => {
    jest.useFakeTimers();
    try {
      const operation = withAgentExecutionTimeout(
        () => new Promise<string>(() => undefined),
        1_000,
      );
      const assertion = expect(operation).rejects.toMatchObject<
        Partial<AgentExecutionControlError>
      >({ code: "AGENT_TIMEOUT" });
      await jest.advanceTimersByTimeAsync(1_000);
      await assertion;
    } finally {
      jest.useRealTimers();
    }
  });
});
