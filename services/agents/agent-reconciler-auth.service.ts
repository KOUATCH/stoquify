import { timingSafeEqual } from "node:crypto";

const MIN_RECONCILER_SECRET_LENGTH = 32;
const MAX_RECONCILER_SECRET_LENGTH = 512;

export function isAgentReconcilerConfigured(secret: string | undefined) {
  const length = secret?.trim().length ?? 0;
  return (
    length >= MIN_RECONCILER_SECRET_LENGTH &&
    length <= MAX_RECONCILER_SECRET_LENGTH
  );
}

export function isAuthorizedAgentReconciler(input: {
  authorizationHeader: string | null;
  configuredSecret: string | undefined;
  previousSecret?: string | undefined;
}) {
  const configuredSecrets = [input.configuredSecret, input.previousSecret]
    .map((secret) => secret?.trim() ?? "")
    .filter(isAgentReconcilerConfigured);
  if (configuredSecrets.length === 0) return false;

  const prefix = "Bearer ";
  if (!input.authorizationHeader?.startsWith(prefix)) return false;
  const providedBuffer = Buffer.from(
    input.authorizationHeader.slice(prefix.length).trim(),
  );

  let authorized = false;
  for (const configured of configuredSecrets) {
    const configuredBuffer = Buffer.from(configured);
    const matches =
      configuredBuffer.length === providedBuffer.length &&
      timingSafeEqual(configuredBuffer, providedBuffer);
    authorized = matches || authorized;
  }
  return authorized;
}

export function resolveAgentReconcilerPolicy(
  environment: NodeJS.ProcessEnv = process.env,
) {
  return {
    olderThanMinutes: boundedInteger(
      environment.STOQUIFY_AGENT_RECONCILE_AFTER_MINUTES,
      15,
      5,
      1_440,
    ),
    limit: boundedInteger(
      environment.STOQUIFY_AGENT_RECONCILE_LIMIT,
      100,
      1,
      500,
    ),
  };
}

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), minimum), maximum);
}
