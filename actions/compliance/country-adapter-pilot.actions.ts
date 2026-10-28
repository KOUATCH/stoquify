"use server"

import { revalidatePath } from "next/cache"

import {
  configureCountryAdapterPilot,
  disableCountryAdapter,
  recordCountryAdapterReview,
  rotateCountryAdapterCredential,
} from "@/services/compliance/country-adapter-pilot.service"
import {
  configureCountryAdapterPilotSchema,
  disableCountryAdapterSchema,
  recordCountryAdapterReviewSchema,
  rotateCountryAdapterCredentialSchema,
} from "@/services/compliance/country-adapter-pilot.schemas"
import { protect, type ProtectedActionResponse } from "@/services/_shared/protect"

const COMPLIANCE_ADAPTER_ACTION_MODULE = {
  moduleSlug: "compliance" as const,
  surfaceType: "action" as const,
  accessIntent: "write" as const,
  mode: "enforce" as const,
  audit: true,
}

export type CountryAdapterPilotErrorCode =
  | "AUTHORITY_UNAVAILABLE"
  | "AUTHORITY_REJECTED"
  | "EXTERNAL_TIMEOUT"
  | "FORBIDDEN"
  | "STEP_UP_REQUIRED"
  | "SOD_VIOLATION"
  | "VALIDATION_FAILED"
  | "SYSTEM_ERROR"

function errorCodeFor(
  result: Extract<ProtectedActionResponse<unknown>, { success: false }>,
): CountryAdapterPilotErrorCode {
  if (result.code === "FORBIDDEN") return "FORBIDDEN"
  if (result.code === "FRESH_AUTH_REQUIRED") return "STEP_UP_REQUIRED"
  if (
    result.code === "CONFLICT" &&
    result.error.toLowerCase().includes("cannot independently approve")
  ) {
    return "SOD_VIOLATION"
  }
  if (
    result.code === "VALIDATION_ERROR" ||
    result.code === "BUSINESS_RULE_VIOLATION" ||
    result.code === "CONFLICT"
  ) {
    return "VALIDATION_FAILED"
  }
  return "SYSTEM_ERROR"
}

function withOk<T>(result: ProtectedActionResponse<T>) {
  return result.success
    ? { ...result, ok: true as const }
    : {
        ...result,
        ok: false as const,
        errorCode: errorCodeFor(result),
      }
}

function revalidateCompliance() {
  revalidatePath("/dashboard/compliance", "page")
  revalidatePath("/[locale]/dashboard/compliance", "page")
}

const configurePilot = protect<unknown, unknown>(
  {
    permission: "compliance.adapters.manage",
    auditResource: "ComplianceAdapterConfig",
    freshAuth: true,
    module: {
      ...COMPLIANCE_ADAPTER_ACTION_MODULE,
      surface: "actions/compliance/country-adapter-pilot.actions.ts:configureCountryAdapterPilotAction",
    },
  },
  async (input, ctx) => {
    const parsed = configureCountryAdapterPilotSchema.parse({
      ...(input && typeof input === "object" ? input : {}),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
    })
    const result = await configureCountryAdapterPilot(parsed)
    revalidateCompliance()
    return result
  },
)

export async function configureCountryAdapterPilotAction(input: unknown) {
  return withOk(await configurePilot(input))
}

const rotateCredential = protect<unknown, unknown>(
  {
    permission: "compliance.adapters.credentials.rotate",
    auditResource: "ComplianceAdapterCredential",
    freshAuth: true,
    module: {
      ...COMPLIANCE_ADAPTER_ACTION_MODULE,
      surface: "actions/compliance/country-adapter-pilot.actions.ts:rotateCountryAdapterCredentialAction",
    },
  },
  async (input, ctx) => {
    const parsed = rotateCountryAdapterCredentialSchema.parse({
      ...(input && typeof input === "object" ? input : {}),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
    })
    const result = await rotateCountryAdapterCredential(parsed)
    revalidateCompliance()
    return result
  },
)

export async function rotateCountryAdapterCredentialAction(input: unknown) {
  return withOk(await rotateCredential(input))
}

const recordReview = protect<unknown, unknown>(
  {
    permission: "compliance.adapters.approve",
    auditResource: "ComplianceAdapterReview",
    freshAuth: true,
    module: {
      ...COMPLIANCE_ADAPTER_ACTION_MODULE,
      surface: "actions/compliance/country-adapter-pilot.actions.ts:recordCountryAdapterReviewAction",
    },
  },
  async (input, ctx) => {
    const parsed = recordCountryAdapterReviewSchema.parse({
      ...(input && typeof input === "object" ? input : {}),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
    })
    const result = await recordCountryAdapterReview(parsed)
    revalidateCompliance()
    return result
  },
)

export async function recordCountryAdapterReviewAction(input: unknown) {
  return withOk(await recordReview(input))
}

const disableAdapter = protect<unknown, unknown>(
  {
    permission: "compliance.adapters.manage",
    auditResource: "ComplianceAdapterConfig",
    freshAuth: true,
    module: {
      ...COMPLIANCE_ADAPTER_ACTION_MODULE,
      surface: "actions/compliance/country-adapter-pilot.actions.ts:disableCountryAdapterAction",
    },
  },
  async (input, ctx) => {
    const parsed = disableCountryAdapterSchema.parse({
      ...(input && typeof input === "object" ? input : {}),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
    })
    const result = await disableCountryAdapter(parsed)
    revalidateCompliance()
    return result
  },
)

export async function disableCountryAdapterAction(input: unknown) {
  return withOk(await disableAdapter(input))
}
