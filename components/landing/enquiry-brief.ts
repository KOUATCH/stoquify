export const enquiryInterests = ["operations", "finance", "people", "accounting-firm", "unsure"] as const
export type EnquiryInterest = typeof enquiryInterests[number]
export type EnquiryBrief = { organization: string; country: string; interest: EnquiryInterest; team: string; locations: string; priorities: string }
export function enquiryInterest(value: unknown): EnquiryInterest {
  return typeof value === "string" && enquiryInterests.includes(value as EnquiryInterest) ? value as EnquiryInterest : "unsure"
}
export const interestLabels = {
  operations: ["Sales, stock & purchasing", "Ventes, stocks et achats"],
  finance: ["Finance & accounting", "Finance et comptabilité"],
  people: ["HRIS & payroll", "SIRH et paie"],
  "accounting-firm": ["Accounting-firm collaboration", "Collaboration avec un cabinet"],
  unsure: ["Help me choose", "Aidez-moi à choisir"],
} as const

export function formatEnquiry(brief: EnquiryBrief, locale: string): string {
  const fr = locale === "fr"
  const rows = fr ? [
    ["Organisation", brief.organization], ["Pays à étudier", brief.country], ["Priorité", interestLabels[brief.interest][1]],
    ["Équipe", brief.team], ["Sites", brief.locations], ["Besoins et questions", brief.priorities],
  ] : [
    ["Organization", brief.organization], ["Country to review", brief.country], ["Priority", interestLabels[brief.interest][0]],
    ["Team", brief.team], ["Locations", brief.locations], ["Needs and questions", brief.priorities],
  ]
  return `${fr ? "Mon projet Stoquify" : "My Stoquify workspace"}\n\n${rows.map(([label, value]) => `${label}: ${value.trim() || (fr ? "À préciser" : "To discuss")}`).join("\n\n")}\n\n${fr ? "À confirmer ensemble : modules, disponibilité dans le pays, connexions, reprise des données, accompagnement et devis. Cette demande ne constitue pas une commande." : "To confirm together: modules, country availability, connections, opening data, support and quotation. This enquiry is not an order."}`
}

export function enquiryMailto(email: string, brief: EnquiryBrief, locale: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(locale === "fr" ? "Projet Stoquify — demande de devis" : "Stoquify workspace — quotation enquiry")}&body=${encodeURIComponent(formatEnquiry(brief, locale))}`
}
