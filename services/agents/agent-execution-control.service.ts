export const DEFAULT_COMMAND_AGENT_TIMEOUT_MS = 10_000;
export const MIN_COMMAND_AGENT_TIMEOUT_MS = 1_000;
export const MAX_COMMAND_AGENT_TIMEOUT_MS = 30_000;

export type AgentExecutionFailureCode = "AGENT_TIMEOUT";

export class AgentExecutionControlError extends Error {
  constructor(
    public readonly code: AgentExecutionFailureCode,
    message: string,
  ) {
    super(message);
    this.name = "AgentExecutionControlError";
  }
}

export function resolveCommandAgentTimeoutMs(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const parsed = Number(environment.STOQUIFY_COMMAND_AGENT_TIMEOUT_MS);
  if (!Number.isFinite(parsed)) return DEFAULT_COMMAND_AGENT_TIMEOUT_MS;
  return Math.min(
    Math.max(Math.trunc(parsed), MIN_COMMAND_AGENT_TIMEOUT_MS),
    MAX_COMMAND_AGENT_TIMEOUT_MS,
  );
}

export async function withAgentExecutionTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new AgentExecutionControlError(
                "AGENT_TIMEOUT",
                "Agent execution exceeded its bounded runtime.",
              ),
            ),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function agentExecutionFailureCode(error: unknown) {
  return error instanceof AgentExecutionControlError ? error.code : null;
}
