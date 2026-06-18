import { BusinessRuleError } from "../../_shared/action-errors"

import { computeCountryPackHash } from "./hash"
import {
  countryPackSchema,
  isRecord,
  isRegulatoryEnvelopeArray,
  type CountryPack,
  type RegulatoryEnvelope,
} from "./schemas"

export type RegulatoryPackIssueSeverity = "error" | "warning"

export type RegulatoryPackIssueCode =
  | "STRUCTURAL_SCHEMA_INVALID"
  | "HASH_MISMATCH"
  | "PACK_NOT_PUBLISHED"
  | "LEGAL_CITATION_MISSING"
  | "LEGAL_REFERENCE_DUPLICATE"
  | "EFFECTIVE_WINDOW_INVALID"
  | "EFFECTIVE_WINDOW_OVERLAP"
  | "REQUIRED_PARAMETER_MISSING"
  | "EXPERT_REVIEW_REQUIRED"
  | "GOLDEN_FIXTURE_FAILED"
  | "CAPABILITY_DECLARATION_INVALID"

export type RegulatoryPackIssue = {
  code: RegulatoryPackIssueCode
  severity: RegulatoryPackIssueSeverity
  path: string
  message: string
}

export type RegulatoryPackValidationResult = {
  valid: boolean
  canPublish: boolean
  issues: RegulatoryPackIssue[]
}

export type RegulatoryResolutionErrorCode =
  | "PARAMETER_NOT_FOUND"
  | "CAPABILITY_NOT_SUPPORTED"
  | "EFFECTIVE_WINDOW_MISSING"
  | "ENTITY_PROFILE_INVALID"
  | "LEGAL_CITATION_MISSING"
  | "PACK_NOT_PUBLISHED"

export class RegulatoryPackError extends BusinessRuleError {
  constructor(
    public readonly regulatoryCode: RegulatoryResolutionErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "RegulatoryPackError"
  }
}

const REQUIRED_CAMEROON_PARAMETER_PATHS = [
  "taxes.vat.standardRateBps",
  "taxes.vat.filing.monthlyDeclaration",
  "payroll.cnps.familyAllowanceRatesBps",
  "payroll.cnps.pensionRatesBps",
  "payroll.cnps.occupationalRiskRatesBps",
  "identifiers.niu",
  "identifiers.rccm",
  "filings.taxFilingNames",
  "holidays.fixed",
  "payments.providerLegality.mobileMoney",
  "compliance.eInvoicing.capability",
  "compliance.eInvoicing.requiredFields",
  "compliance.eInvoicing.certificationPolicy",
  "compliance.eInvoicing.authorityChannels",
  "compliance.eInvoicing.manualPortalFallback",
  "compliance.eInvoicing.artifactExpectations",
  "labels.business",
]

function parseDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

function isOnOrAfter(left: string, right: string) {
  const leftDate = parseDate(left)
  const rightDate = parseDate(right)
  return !!leftDate && !!rightDate && leftDate.getTime() >= rightDate.getTime()
}

function isAfter(left: string, right: string) {
  const leftDate = parseDate(left)
  const rightDate = parseDate(right)
  return !!leftDate && !!rightDate && leftDate.getTime() > rightDate.getTime()
}

function getPathValue(root: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!isRecord(current)) return undefined
    return current[segment]
  }, root)
}

export function getParameterEnvelopeArray(pack: CountryPack, parameterPath: string) {
  const value = getPathValue(pack.parameters, parameterPath)
  return isRegulatoryEnvelopeArray(value) ? value : null
}

function getCapabilityStatusForPath(pack: CountryPack, parameterPath: string) {
  const matchingKey = Object.keys(pack.header.capabilityMatrix)
    .sort((left, right) => right.length - left.length)
    .find((key) => parameterPath === key || parameterPath.startsWith(`${key}.`))

  return matchingKey ? pack.header.capabilityMatrix[matchingKey] : null
}

export function selectEffectiveEnvelope<T = unknown>(
  envelopes: readonly RegulatoryEnvelope<T>[],
  date: string,
) {
  const target = parseDate(date)
  if (!target) return null

  return (
    envelopes
      .filter((envelope) => {
        const from = parseDate(envelope.effectiveFrom)
        const to = envelope.effectiveTo ? parseDate(envelope.effectiveTo) : null
        return !!from && from.getTime() <= target.getTime() && (!to || target.getTime() <= to.getTime())
      })
      .sort((left, right) => right.effectiveFrom.localeCompare(left.effectiveFrom))[0] ?? null
  )
}

function sameJson(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function collectEnvelopeArrays(
  value: unknown,
  path: string,
  result: Array<{ path: string; envelopes: RegulatoryEnvelope[] }>,
) {
  if (isRegulatoryEnvelopeArray(value)) {
    result.push({ path, envelopes: value })
    return
  }

  if (Array.isArray(value)) return
  if (!isRecord(value)) return

  Object.entries(value).forEach(([key, entry]) => {
    collectEnvelopeArrays(entry, path ? `${path}.${key}` : key, result)
  })
}

function validateEnvelopeArray(
  pack: CountryPack,
  path: string,
  envelopes: readonly RegulatoryEnvelope[],
  legalRefIds: Set<string>,
  issues: RegulatoryPackIssue[],
  requireNoExpertReview: boolean,
) {
  const ordered = [...envelopes].sort((left, right) => left.effectiveFrom.localeCompare(right.effectiveFrom))

  ordered.forEach((envelope, index) => {
    if (!legalRefIds.has(envelope.legalRef)) {
      issues.push({
        code: "LEGAL_CITATION_MISSING",
        severity: "error",
        path: `${path}[${index}].legalRef`,
        message: `Legal reference "${envelope.legalRef}" is not declared in pack ${pack.header.packVersion}.`,
      })
    }

    if (envelope.effectiveTo && isAfter(envelope.effectiveFrom, envelope.effectiveTo)) {
      issues.push({
        code: "EFFECTIVE_WINDOW_INVALID",
        severity: "error",
        path,
        message: "A regulatory parameter has an effectiveTo date before effectiveFrom.",
      })
    }

    if (
      requireNoExpertReview &&
      envelope.verificationStatus === "REQUIRES_EXPERT_REVIEW" &&
      getCapabilityStatusForPath(pack, path) !== "REQUIRES_EXPERT_REVIEW"
    ) {
      issues.push({
        code: "EXPERT_REVIEW_REQUIRED",
        severity: "error",
        path: `${path}[${index}].verificationStatus`,
        message:
          "Published packs can only contain expert-review placeholders under an explicit REQUIRES_EXPERT_REVIEW capability.",
      })
    }

    const next = ordered[index + 1]
    if (next && (!envelope.effectiveTo || isOnOrAfter(envelope.effectiveTo, next.effectiveFrom))) {
      issues.push({
        code: "EFFECTIVE_WINDOW_OVERLAP",
        severity: "error",
        path,
        message: "Effective windows overlap; consumers cannot resolve this parameter deterministically.",
      })
    }
  })
}

function validateGoldenFixtures(pack: CountryPack, issues: RegulatoryPackIssue[]) {
  pack.goldenFixtures.forEach((fixture, index) => {
    const envelopes = getParameterEnvelopeArray(pack, fixture.parameterPath)
    const selected = envelopes ? selectEffectiveEnvelope(envelopes, fixture.date) : null

    if (!selected) {
      issues.push({
        code: "GOLDEN_FIXTURE_FAILED",
        severity: "error",
        path: `goldenFixtures[${index}]`,
        message: `Golden fixture "${fixture.id}" did not resolve a parameter value.`,
      })
      return
    }

    if (!sameJson(selected.value, fixture.expectedValue) || selected.legalRef !== fixture.expectedLegalRef) {
      issues.push({
        code: "GOLDEN_FIXTURE_FAILED",
        severity: "error",
        path: `goldenFixtures[${index}]`,
        message: `Golden fixture "${fixture.id}" no longer matches the pack data.`,
      })
    }
  })
}

export function validateCountryPack(
  pack: CountryPack,
  options: {
    requirePublished?: boolean
    requireNoExpertReview?: boolean
    requiredParameterPaths?: readonly string[]
  } = {},
): RegulatoryPackValidationResult {
  const issues: RegulatoryPackIssue[] = []
  const structural = countryPackSchema.safeParse(pack)

  if (!structural.success) {
    structural.error.issues.forEach((issue) => {
      issues.push({
        code: "STRUCTURAL_SCHEMA_INVALID",
        severity: "error",
        path: issue.path.join("."),
        message: issue.message,
      })
    })
  }

  if (pack.header.hash !== computeCountryPackHash(pack)) {
    issues.push({
      code: "HASH_MISMATCH",
      severity: "error",
      path: "header.hash",
      message: "Country pack hash does not match the canonical pack payload.",
    })
  }

  if (options.requirePublished && pack.header.status !== "PUBLISHED") {
    issues.push({
      code: "PACK_NOT_PUBLISHED",
      severity: "error",
      path: "header.status",
      message: "Pack must be PUBLISHED before it can be used by production regulatory consumers.",
    })
  }

  const legalRefIds = new Set<string>()
  pack.header.legalRefs.forEach((legalRef, index) => {
    if (legalRefIds.has(legalRef.id)) {
      issues.push({
        code: "LEGAL_REFERENCE_DUPLICATE",
        severity: "error",
        path: `header.legalRefs[${index}].id`,
        message: `Duplicate legal reference id "${legalRef.id}".`,
      })
    }
    legalRefIds.add(legalRef.id)
  })

  if (!Object.keys(pack.header.capabilityMatrix).length) {
    issues.push({
      code: "CAPABILITY_DECLARATION_INVALID",
      severity: "error",
      path: "header.capabilityMatrix",
      message: "Country packs must declare capability coverage.",
    })
  }

  const requiredPaths = options.requiredParameterPaths ?? REQUIRED_CAMEROON_PARAMETER_PATHS
  requiredPaths.forEach((path) => {
    if (!getParameterEnvelopeArray(pack, path)) {
      issues.push({
        code: "REQUIRED_PARAMETER_MISSING",
        severity: "error",
        path,
        message: `Required regulatory parameter "${path}" is missing or is not effective-dated.`,
      })
    }
  })

  const envelopeArrays: Array<{ path: string; envelopes: RegulatoryEnvelope[] }> = []
  collectEnvelopeArrays(pack.parameters, "", envelopeArrays)
  envelopeArrays.forEach(({ path, envelopes }) => {
    validateEnvelopeArray(pack, path, envelopes, legalRefIds, issues, !!options.requireNoExpertReview)
  })

  validateGoldenFixtures(pack, issues)

  const valid = issues.every((issue) => issue.severity !== "error")
  return {
    valid,
    canPublish: valid && pack.header.status === "PUBLISHED",
    issues,
  }
}

export function validateCountryPackForPublish(pack: CountryPack) {
  return validateCountryPack(pack, {
    requirePublished: true,
    requireNoExpertReview: true,
  })
}
