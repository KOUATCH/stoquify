import type { CapabilityStatus } from "../country-packs/schemas"

export type RegulatoryExecutionMode = "SANDBOX" | "DEFERRED" | "PRODUCTION"

export type RegulatoryEntityProfile = {
  id?: string
  countryCode?: string
  legalForm?: string | null
  taxRegime?: string | null
  payrollRiskGroup?: "A" | "B" | "C" | null
}

export type RegulatoryResolutionContext = {
  countryCode: string
  date: Date | string
  purpose?: string
  entityProfileId?: string
  entityProfile?: RegulatoryEntityProfile | null
  pinnedPackVersion?: string
  allowUnpublished?: boolean
  executionMode?: RegulatoryExecutionMode
}

export type RegulatoryResolutionResult<TValue = unknown> = {
  countryCode: string
  parameterPath: string
  value: TValue
  packVersion: string
  schemaVersion: string
  legalRef: string
  effectiveFrom: string
  effectiveTo: string | null
  verifiedOn: string
  verifiedBy: string
  verificationStatus: string
  layer: "country"
  capabilityStatus: CapabilityStatus
  resolutionHash: string
}

export type RegulatoryProvenance = Omit<
  RegulatoryResolutionResult<never>,
  "value"
>

export type RegulatoryDecision<TValue = unknown> =
  | {
      kind: "AUTHORITATIVE"
      mode: "PRODUCTION"
      value: TValue
      provenance: RegulatoryProvenance
    }
  | {
      kind: "NON_AUTHORITATIVE"
      mode: "SANDBOX" | "DEFERRED"
      value: TValue
      provenance: RegulatoryProvenance
      watermark: "NOT FOR STATUTORY USE"
    }
  | {
      kind: "PENDING_COUNTRY_PACK"
      mode: RegulatoryExecutionMode
      countryCode: string
      parameterPath: string
      reason: string
      retryable: boolean
    }

export interface RegulatoryCapabilityPort {
  resolve<TValue>(
    parameterPath: string,
    context: RegulatoryResolutionContext,
  ): RegulatoryResolutionResult<TValue>
}

