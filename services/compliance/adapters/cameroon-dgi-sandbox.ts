import { createHash } from "crypto"

import {
  CAMEROON_COUNTRY_CODE,
  CAMEROON_DGI_E_SERVICES_CHANNEL,
  CAMEROON_DGI_SANDBOX_ADAPTER_CODE,
} from "@/services/regulatory/country-packs/cameroon.constants"

import { resolveEInvoicingMetadata } from "../country-pack-hooks"
import type {
  AdapterExecutionContext,
  AdapterParsedResponse,
  AuthorityPayload,
  CanonicalFiscalPayload,
  ComplianceAdapter,
} from "../adapter-contract"

export {
  CAMEROON_DGI_E_SERVICES_CHANNEL,
  CAMEROON_DGI_SANDBOX_ADAPTER_CODE,
}

const SANDBOX_STATUTORY_EFFECT = "SANDBOX_ONLY_NO_PRODUCTION_CERTIFICATION"
const RETRY_AFTER_SECONDS = 300

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    )
  }
  return value
}

function hashPayload(value: unknown) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex")}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isMoneyString(value: unknown): value is string {
  return typeof value === "string" && /^\d+(\.\d+)?$/.test(value)
}

function validationError(message: string) {
  return {
    ok: false as const,
    code: "PAYLOAD_VALIDATION_ERROR" as const,
    message,
  }
}

function failureResponse(
  status:
    | "TERMINAL_REJECTION"
    | "RETRYABLE_AUTHORITY_OUTAGE"
    | "CREDENTIAL_CONFIGURATION_ERROR"
    | "PAYLOAD_VALIDATION_ERROR"
    | "RATE_LIMITED"
    | "UNKNOWN_UNSAFE_ERROR",
  message: string,
  responsePayload: Record<string, unknown>,
  options: {
    correlationId?: string | null
    retryAfterSeconds?: number | null
    rejectionReason?: string | null
  } = {},
) {
  return {
    ok: false as const,
    status,
    message,
    correlationId: options.correlationId ?? null,
    retryAfterSeconds: options.retryAfterSeconds ?? null,
    rejectionReason: options.rejectionReason ?? null,
    responsePayload,
    responseHash: hashPayload(responsePayload),
  }
}

function sandboxMode(context: AdapterExecutionContext) {
  const metadata = context.adapterConfig?.publicMetadata
  const value =
    metadata?.sandboxMode ??
    metadata?.sandboxOutcome ??
    metadata?.fixtureMode ??
    "ACCEPT"

  return typeof value === "string" ? value.trim().toUpperCase() : "ACCEPT"
}

function validatePackProvenance(input: CanonicalFiscalPayload) {
  const issueDate = new Date(input.issueDate)
  if (Number.isNaN(issueDate.getTime())) {
    return validationError("Cameroon sandbox payload issueDate must be a valid ISO date.")
  }

  const metadata = resolveEInvoicingMetadata({
    countryCode: CAMEROON_COUNTRY_CODE,
    date: issueDate,
    pinnedPackVersion: input.pack.version,
  })

  if (metadata.schemaVersion !== input.pack.schemaVersion) {
    return validationError("Cameroon sandbox payload pack schema version does not match the resolved country pack.")
  }

  if (metadata.combinedResolutionHash !== input.pack.resolutionHash) {
    return validationError("Cameroon sandbox payload country-pack resolution hash does not match the resolved metadata.")
  }

  const supportedDocumentTypes = Array.isArray(metadata.capability.value.supportedDocumentTypes)
    ? metadata.capability.value.supportedDocumentTypes
    : []

  if (!supportedDocumentTypes.includes(input.documentType)) {
    return validationError(`Cameroon sandbox payload document type ${input.documentType} is not enabled by the country pack.`)
  }

  if (metadata.capability.value.productionAutomationAllowed !== false) {
    return validationError("Cameroon sandbox adapter refuses packs that allow production automation.")
  }

  return null
}

export const cameroonDgiSandboxComplianceAdapter: ComplianceAdapter = {
  code: CAMEROON_DGI_SANDBOX_ADAPTER_CODE,

  async validatePayload(input: CanonicalFiscalPayload) {
    if (input.countryCode !== CAMEROON_COUNTRY_CODE) {
      return validationError("Cameroon DGI sandbox adapter only accepts CM fiscal payloads.")
    }

    if (!isNonEmptyString(input.fiscalDocumentId) || !isNonEmptyString(input.organizationId)) {
      return validationError("Cameroon sandbox payload requires fiscalDocumentId and organizationId.")
    }

    if (!isNonEmptyString(input.source?.postingBatchId)) {
      return validationError("Cameroon sandbox payload requires a posted ledger source.")
    }

    if (input.currency !== "XAF") {
      return validationError("Cameroon sandbox payload currency must be XAF.")
    }

    if (!Array.isArray(input.lines) || input.lines.length === 0) {
      return validationError("Cameroon sandbox payload requires at least one fiscal line.")
    }

    for (const field of ["subtotal", "taxAmount", "discountAmount", "totalAmount"] as const) {
      if (!isMoneyString(input.totals[field])) {
        return validationError(`Cameroon sandbox payload total ${field} must be a non-negative decimal string.`)
      }
    }

    const packError = validatePackProvenance(input)
    if (packError) return packError

    return { ok: true }
  },

  async buildAuthorityPayload(input: CanonicalFiscalPayload) {
    const inputWithTaxBreakdown = input as CanonicalFiscalPayload & {
      taxBreakdown?: unknown
    }

    const payload = {
      adapter: CAMEROON_DGI_SANDBOX_ADAPTER_CODE,
      authorityChannel: CAMEROON_DGI_E_SERVICES_CHANNEL,
      countryCode: input.countryCode,
      sandbox: true,
      statutoryEffect: SANDBOX_STATUTORY_EFFECT,
      fiscalDocument: {
        id: input.fiscalDocumentId,
        documentType: input.documentType,
        issueDate: input.issueDate,
        currency: input.currency,
        source: input.source,
        totals: input.totals,
        taxBreakdown: inputWithTaxBreakdown.taxBreakdown ?? null,
      },
      lines: input.lines,
      pack: input.pack,
    }

    return {
      adapterCode: CAMEROON_DGI_SANDBOX_ADAPTER_CODE,
      payload,
      payloadHash: hashPayload(payload),
    } satisfies AuthorityPayload
  },

  async submit(input: AuthorityPayload, context: AdapterExecutionContext) {
    const correlationId = context.correlationId ?? `cm-sbx-${input.payloadHash.slice(-12)}`

    if (input.adapterCode !== CAMEROON_DGI_SANDBOX_ADAPTER_CODE) {
      return failureResponse(
        "PAYLOAD_VALIDATION_ERROR",
        "Authority payload was built for a different compliance adapter.",
        {
          adapter: CAMEROON_DGI_SANDBOX_ADAPTER_CODE,
          receivedAdapter: input.adapterCode,
          status: "PAYLOAD_VALIDATION_ERROR",
          correlationId,
        },
        { correlationId },
      )
    }

    if (context.environment !== "SANDBOX") {
      return failureResponse(
        "CREDENTIAL_CONFIGURATION_ERROR",
        "Cameroon DGI pilot adapter is sandbox-only and cannot submit in this environment.",
        {
          adapter: CAMEROON_DGI_SANDBOX_ADAPTER_CODE,
          environment: context.environment,
          status: "CONFIGURATION_ERROR",
          statutoryEffect: SANDBOX_STATUTORY_EFFECT,
          correlationId,
        },
        { correlationId },
      )
    }

    if (context.adapterConfig?.status !== "ACTIVE") {
      return failureResponse(
        "CREDENTIAL_CONFIGURATION_ERROR",
        "Cameroon DGI sandbox adapter configuration is not active for this tenant.",
        {
          adapter: CAMEROON_DGI_SANDBOX_ADAPTER_CODE,
          status: "CONFIGURATION_ERROR",
          configStatus: context.adapterConfig?.status ?? null,
          correlationId,
        },
        { correlationId },
      )
    }

    if (!isNonEmptyString(context.adapterConfig?.credentialReference)) {
      return failureResponse(
        "CREDENTIAL_CONFIGURATION_ERROR",
        "Cameroon DGI sandbox credential reference is missing from adapter configuration.",
        {
          adapter: CAMEROON_DGI_SANDBOX_ADAPTER_CODE,
          status: "CREDENTIAL_CONFIGURATION_ERROR",
          credentialReferencePresent: false,
          correlationId,
        },
        { correlationId },
      )
    }

    const mode = sandboxMode(context)
    if (mode === "OUTAGE") {
      return failureResponse(
        "RETRYABLE_AUTHORITY_OUTAGE",
        "Cameroon DGI sandbox fixture reports a retryable authority outage.",
        {
          adapter: CAMEROON_DGI_SANDBOX_ADAPTER_CODE,
          status: "TEMPORARY_OUTAGE",
          retryable: true,
          receivedPayloadHash: input.payloadHash,
          statutoryEffect: SANDBOX_STATUTORY_EFFECT,
          correlationId,
        },
        { correlationId, retryAfterSeconds: RETRY_AFTER_SECONDS },
      )
    }

    if (mode === "RATE_LIMITED") {
      return failureResponse(
        "RATE_LIMITED",
        "Cameroon DGI sandbox fixture reports rate limiting.",
        {
          adapter: CAMEROON_DGI_SANDBOX_ADAPTER_CODE,
          status: "RATE_LIMITED",
          retryable: true,
          receivedPayloadHash: input.payloadHash,
          statutoryEffect: SANDBOX_STATUTORY_EFFECT,
          correlationId,
        },
        { correlationId, retryAfterSeconds: RETRY_AFTER_SECONDS },
      )
    }

    if (mode === "REJECT") {
      const rejectionReason = "SANDBOX_FIXTURE_REJECTION"
      return failureResponse(
        "TERMINAL_REJECTION",
        "Cameroon DGI sandbox fixture rejected the canonical fiscal payload.",
        {
          adapter: CAMEROON_DGI_SANDBOX_ADAPTER_CODE,
          status: "REJECTED",
          rejectionReason,
          receivedPayloadHash: input.payloadHash,
          statutoryEffect: SANDBOX_STATUTORY_EFFECT,
          correlationId,
        },
        { correlationId, rejectionReason },
      )
    }

    const authorityReference = `CM-SBX-${input.payloadHash.slice(-14).toUpperCase()}`
    const responsePayload = {
      adapter: CAMEROON_DGI_SANDBOX_ADAPTER_CODE,
      authority: "Direction Generale des Impots du Cameroun",
      authorityChannel: context.authorityChannel,
      environment: context.environment,
      status: "ACCEPTED",
      authorityReference,
      receivedPayloadHash: input.payloadHash,
      sandboxAcceptedAt: new Date().toISOString(),
      statutoryEffect: SANDBOX_STATUTORY_EFFECT,
      productionCertification: false,
      correlationId,
    }
    const responseHash = hashPayload(responsePayload)

    return {
      ok: true,
      status: "ACCEPTED",
      authorityReference,
      responsePayload,
      responseHash,
      artifacts: [
        {
          type: "AUTHORITY_REFERENCE",
          source: "AUTHORITY",
          payload: {
            authorityReference,
            receivedPayloadHash: input.payloadHash,
            statutoryEffect: SANDBOX_STATUTORY_EFFECT,
            productionCertification: false,
          },
          artifactHash: hashPayload({
            authorityReference,
            receivedPayloadHash: input.payloadHash,
            productionCertification: false,
          }),
        },
      ],
    }
  },

  async pollStatus(input) {
    return {
      ok: true,
      status: "ACCEPTED",
      authorityReference: input.authorityReference,
      responsePayload: {
        adapter: CAMEROON_DGI_SANDBOX_ADAPTER_CODE,
        authorityReference: input.authorityReference,
        statutoryEffect: SANDBOX_STATUTORY_EFFECT,
        productionCertification: false,
      },
    }
  },

  parseResponse(input: unknown): AdapterParsedResponse {
    const value = isRecord(input) ? input : {}

    return {
      authorityReference: isNonEmptyString(value.authorityReference)
        ? value.authorityReference
        : null,
      certificationArtifactHash: isNonEmptyString(value.sandboxReceiptHash)
        ? value.sandboxReceiptHash
        : null,
      qrCodePayload: isNonEmptyString(value.qrCodePayload)
        ? value.qrCodePayload
        : null,
      rejectionReason: isNonEmptyString(value.rejectionReason)
        ? value.rejectionReason
        : null,
      rawSummary: value,
    }
  },
}
