import { createHash } from "crypto"

import type {
  AdapterExecutionContext,
  AdapterParsedResponse,
  AuthorityPayload,
  CanonicalFiscalPayload,
  ComplianceAdapter,
} from "../adapter-contract"

export const FAKE_SANDBOX_ADAPTER_CODE = "FAKE_SANDBOX"

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

export const fakeSandboxComplianceAdapter: ComplianceAdapter = {
  code: FAKE_SANDBOX_ADAPTER_CODE,

  async validatePayload(input: CanonicalFiscalPayload) {
    if (!input.source.postingBatchId) {
      return {
        ok: false,
        code: "PAYLOAD_VALIDATION_ERROR",
        message: "Fake sandbox payload still requires a posted ledger source.",
      }
    }

    return { ok: true }
  },

  async buildAuthorityPayload(input: CanonicalFiscalPayload) {
    const payload = {
      adapter: FAKE_SANDBOX_ADAPTER_CODE,
      mode: "deterministic-test-only",
      fiscalDocumentId: input.fiscalDocumentId,
      organizationId: input.organizationId,
      documentType: input.documentType,
      countryCode: input.countryCode,
      source: input.source,
      totals: input.totals,
      pack: input.pack,
    }

    return {
      adapterCode: FAKE_SANDBOX_ADAPTER_CODE,
      payload,
      payloadHash: hashPayload(payload),
    } satisfies AuthorityPayload
  },

  async submit(input: AuthorityPayload, context: AdapterExecutionContext) {
    const authorityReference = `FAKE-${input.payloadHash.slice(-16).toUpperCase()}`
    const responsePayload = {
      adapter: FAKE_SANDBOX_ADAPTER_CODE,
      environment: context.environment,
      authorityChannel: context.authorityChannel,
      authorityReference,
      acceptedAt: new Date().toISOString(),
      statutoryEffect: "NONE_FAKE_SANDBOX_ONLY",
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
          source: "ADAPTER",
          payload: responsePayload,
          artifactHash: responseHash,
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
        adapter: FAKE_SANDBOX_ADAPTER_CODE,
        authorityReference: input.authorityReference,
        statutoryEffect: "NONE_FAKE_SANDBOX_ONLY",
      },
    }
  },

  parseResponse(input: unknown): AdapterParsedResponse {
    const value =
      input && typeof input === "object"
        ? (input as Record<string, unknown>)
        : {}

    return {
      authorityReference:
        typeof value.authorityReference === "string"
          ? value.authorityReference
          : null,
      rawSummary: value,
    }
  },
}
