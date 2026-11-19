import type { BIFreshness, BIDrillThrough } from "@/services/bi/bi-contracts"

// Exact system-generated copy only. Authored evidence, identifiers and amounts stay intact.
const french: Record<string, string> = {
  "Signal is expired.": "Le signal a expiré.",
  "Signal is suppressed.": "Le signal est masqué.",
  "Signal is stale.": "Le signal est périmé.",
  "Signal is resolved.": "Le signal est résolu.",
  "Signal is dismissed.": "Le signal est écarté.",
  "The source snapshot is blocked; clear blockers before drill-through can be trusted.": "L’instantané source est bloqué ; examinez ses blocages avant de vous fier aux détails.",
  "No supported route or proof subject is available yet.": "Aucune destination ni source de preuve prise en charge n’est disponible pour le moment.",
  "No proof subject is available for this command surface.": "Aucune source de preuve n’est disponible dans cette vue.",
  "Branch operating snapshots expose aggregate payroll allocation and profitability only; person-level payroll values stay inside payroll.": "Les instantanés d’agence présentent uniquement les affectations de paie et la rentabilité agrégées ; les montants individuels restent dans la paie.",
  "Manager action center exposes aggregate payroll forecast obligations only; person-level payroll values stay inside payroll.": "Le centre d’actions présente uniquement les engagements prévisionnels de paie agrégés ; les montants individuels restent dans la paie.",
}

export function commandSourceText(value: string, locale: "en" | "fr"): string {
  if (locale !== "fr") return value
  const age = /^Source data is (\d+) minutes old\.$/.exec(value)
  return french[value] ?? (age ? `Les données sources datent de ${age[1]} minutes.` : value)
}

export function commandSourceFreshness<T extends Pick<BIFreshness, "staleReason">>(value: T, locale: "en" | "fr"): T {
  return value.staleReason ? {...value, staleReason: commandSourceText(value.staleReason, locale)} : value
}

export function commandSourceDrill(value: BIDrillThrough, locale: "en" | "fr"): BIDrillThrough {
  return value.available ? value : {...value, unavailableReason: commandSourceText(value.unavailableReason, locale)}
}
