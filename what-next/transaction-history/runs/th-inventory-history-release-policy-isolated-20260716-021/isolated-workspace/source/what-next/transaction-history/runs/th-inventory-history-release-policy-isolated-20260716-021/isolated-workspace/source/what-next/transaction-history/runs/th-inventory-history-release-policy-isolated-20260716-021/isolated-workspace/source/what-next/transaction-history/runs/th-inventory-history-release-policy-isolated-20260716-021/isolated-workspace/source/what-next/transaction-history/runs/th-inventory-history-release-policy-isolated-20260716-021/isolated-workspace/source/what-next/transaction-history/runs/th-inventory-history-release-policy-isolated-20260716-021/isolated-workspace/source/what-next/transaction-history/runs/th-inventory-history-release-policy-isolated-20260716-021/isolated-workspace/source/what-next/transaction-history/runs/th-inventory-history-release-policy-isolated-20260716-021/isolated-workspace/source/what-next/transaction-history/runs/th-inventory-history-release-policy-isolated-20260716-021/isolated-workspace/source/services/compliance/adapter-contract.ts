export type CanonicalFiscalPayload = {
  fiscalDocumentId: string
  organizationId: string
  documentType: string
  countryCode: string
  currency: string
  issueDate: string
  source: {
    sourceType: string
    sourceId: string
    sourceNumber?: string | null
    sourceDate?: string | null
    postingBatchId: string
    journalEntryId?: string | null
  }
  totals: {
    subtotal: string
    taxAmount: string
    discountAmount: string
    totalAmount: string
  }
  lines: Array<Record<string, unknown>>
  pack: {
    version: string
    schemaVersion: string
    resolutionHash: string
  }
  metadata?: Record<string, unknown>
}

export type AuthorityPayload = {
  adapterCode: string
  payload: Record<string, unknown>
  payloadHash: string
}

export type AdapterConfigContext = {
  id?: string | null
  status?: string | null
  countryCode?: string | null
  countryPackVersion?: string | null
  countryPackResolutionHash?: string | null
  capabilityStatus?: string | null
  credentialReference?: string | null
  publicMetadata?: Record<string, unknown> | null
}

export type AdapterExecutionContext = {
  organizationId: string
  authorityChannel: string
  environment: "FAKE_SANDBOX" | "SANDBOX" | "PRODUCTION" | "MANUAL_PORTAL"
  correlationId?: string | null
  adapterConfig?: AdapterConfigContext | null
}

export type AdapterValidationResult =
  | { ok: true }
  | {
      ok: false
      code:
        | "PAYLOAD_VALIDATION_ERROR"
        | "CONFIGURATION_ERROR"
        | "REQUIRES_EXPERT_REVIEW"
      message: string
    }

export type AdapterSubmitResult =
  | {
      ok: true
      status: "ACCEPTED" | "CERTIFIED"
      authorityReference?: string | null
      responsePayload?: Record<string, unknown>
      responseHash?: string | null
      artifacts?: Array<{
        type: string
        source: "AUTHORITY" | "PLATFORM" | "MANUAL_PORTAL" | "ADAPTER"
        payload?: Record<string, unknown>
        artifactHash: string
      }>
    }
  | {
      ok: false
      status:
        | "TERMINAL_REJECTION"
        | "RETRYABLE_AUTHORITY_OUTAGE"
        | "CREDENTIAL_CONFIGURATION_ERROR"
        | "PAYLOAD_VALIDATION_ERROR"
        | "RATE_LIMITED"
        | "UNKNOWN_UNSAFE_ERROR"
      message: string
      correlationId?: string | null
      retryAfterSeconds?: number | null
      rejectionReason?: string | null
      responsePayload?: Record<string, unknown>
      responseHash?: string | null
    }

export type AdapterPollInput = {
  authorityReference: string
  fiscalDocumentId: string
}

export type AdapterStatusResult = AdapterSubmitResult

export type AdapterParsedResponse = {
  authorityReference?: string | null
  certificationArtifactHash?: string | null
  qrCodePayload?: string | null
  rejectionReason?: string | null
  rawSummary?: Record<string, unknown>
}

export type ComplianceAdapter = {
  code: string
  validatePayload(
    input: CanonicalFiscalPayload,
  ): Promise<AdapterValidationResult>
  buildAuthorityPayload(input: CanonicalFiscalPayload): Promise<AuthorityPayload>
  submit(
    input: AuthorityPayload,
    context: AdapterExecutionContext,
  ): Promise<AdapterSubmitResult>
  pollStatus(
    input: AdapterPollInput,
    context: AdapterExecutionContext,
  ): Promise<AdapterStatusResult>
  parseResponse(input: unknown): AdapterParsedResponse
}
