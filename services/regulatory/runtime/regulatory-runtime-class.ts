import type { RegulatoryExecutionMode } from "../ports/regulatory-capability.port"

const PRODUCTION_DEPLOYMENT_MARKERS = new Set(["production", "prod"])

export function isProductionDeployment(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const deploymentClass = (
    environment.AQSTOQFLOW_DEPLOYMENT_CLASS ??
    environment.VERCEL_ENV ??
    environment.NODE_ENV ??
    ""
  )
    .trim()
    .toLowerCase()

  return PRODUCTION_DEPLOYMENT_MARKERS.has(deploymentClass)
}

export function resolveRegulatoryExecutionMode(
  requestedMode: RegulatoryExecutionMode | undefined,
  environment: NodeJS.ProcessEnv = process.env,
): RegulatoryExecutionMode {
  if (isProductionDeployment(environment)) {
    return "PRODUCTION"
  }

  return requestedMode ?? "SANDBOX"
}

