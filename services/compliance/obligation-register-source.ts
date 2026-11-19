import { createHash } from "node:crypto"
import { getCountryPacks } from "@/services/regulatory/country-packs/registry"
import type { ObligationCode, ObligationItem, ObligationSource } from "./obligation-register.contract"

export const obligationHash = (value: unknown) => "sha256:" + createHash("sha256").update(JSON.stringify(value)).digest("hex")

/** This catalog creates no legal deadline or production filing authority. Existing
 * pack metadata is discovery provenance, never qualified obligation approval. */
export function obligationSource(code: ObligationCode, countryCode: string, now: Date): ObligationSource {
  const pack = getCountryPacks(countryCode)[0]
  const operational = code === "CLOSE_EVIDENCE_COLLECTION"
  const refs = operational ? [] : (pack?.header.legalRefs ?? []).filter(ref => code === "CM_CNPS_EVIDENCE" ? ref.id.startsWith("CM_CNPS") : ref.id.startsWith("CM_DGI_CGI") || ref.id === "CM_DGI_CALENDRIER_FISCAL")
  const checked = operational ? null : pack?.header.verifiedOn ?? null
  // A refresh policy, not a statutory due rule. Expiry is computed on every read.
  const refreshBy = checked ? new Date(Date.parse(checked) + 90 * 86400000).toISOString() : null
  const identity = { code, countryCode, catalogVersion: "af11-operational-v1", packHash: operational ? null : pack?.header.hash ?? null,
    sourceVersion: operational ? "close-evidence-collection-v1" : pack?.header.packVersion ?? "UNSUPPORTED",
    effectiveFrom: operational ? null : pack?.header.effectiveFrom ?? null, effectiveTo: operational ? null : pack?.header.effectiveTo ?? null,
    sourceCheckedOn: checked, refreshBy, officialSources: refs.map(ref => ({ url: ref.sourceUrl, retrievedOn: ref.retrievedOn })) }
  return { ...identity, sourceHash: obligationHash(identity), classification: operational ? "OPERATIONAL" : "REGULATORY_REVIEW_REQUIRED",
    qualifiedReview: null, statutoryVerified: false, coverage: operational ? "OPERATIONAL" : !pack || countryCode !== "CM" ? "UNSUPPORTED" : refreshBy && Date.parse(refreshBy) <= now.getTime() ? "EXPIRED" : "UNREVIEWED" }
}

export function obligationState(input: { applicability: string; dueAt: Date | null; decision: string; sourceChanged: boolean; evidenceChanged: boolean; evidencePresent: boolean; source: ObligationSource }, now: Date): Pick<ObligationItem, "status" | "deadlineState"> {
  const deadlineState = !input.dueAt ? "UNSCHEDULED" : input.dueAt < now ? "OVERDUE" : "DUE"
  const unknown = input.sourceChanged || input.applicability === "UNKNOWN" || input.source.coverage !== "OPERATIONAL"
  const status = unknown ? "UNKNOWN" : input.applicability === "NOT_APPLICABLE" ? "NOT_APPLICABLE" :
    input.decision === "REVIEWED" && input.evidencePresent && !input.evidenceChanged ? "FULFILLED_WITH_EVIDENCE" : deadlineState === "OVERDUE" ? "OVERDUE" : "OPEN"
  return { status, deadlineState }
}
