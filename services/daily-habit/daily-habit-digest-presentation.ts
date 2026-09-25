import type { BIDailyDigest, BIActionLink, BIDrillThrough, BIFreshness } from "@/services/bi/bi-contracts"
import { presentSnapshotBlocker } from "@/lib/dashboard/snapshot-blocker-presentation"

const templates: Record<string, { title: string; summary: string; metric: string; detail: string; unit?: string }> = {
  "owner-morning": { title: "Digest du dirigeant", summary: "Trésorerie, exposition des stocks, clôture et actions prioritaires à examiner aujourd’hui.", metric: "Encaissements", detail: "Encaissements issus de l’instantané opérationnel de l’organisation." },
  "manager-run-sheet": { title: "Feuille de route du responsable", summary: "Actions opérationnelles visibles concernant les sites, les stocks, les paiements et les réceptions du jour.", metric: "Commandes fournisseurs en attente", detail: "Commandes en attente de réception, de suivi fournisseur ou de revue opérationnelle.", unit: "commandes" },
  "finance-cash": { title: "Digest de trésorerie", summary: "Suspens, rapprochements, preuves des prestataires et encaissements à examiner par l’équipe financière.", metric: "Suspens non résolus", detail: "Valeur des suspens de paiement ouverts dans l’instantané de trésorerie." },
  "accountant-close": { title: "Digest de préparation à la clôture", summary: "Préparation à la clôture, couverture des preuves, constats ouverts et disponibilité de la certification et des exports.", metric: "Préparation à la clôture", detail: "Score moyen issu de l’instantané de préparation à la clôture." },
  "stockkeeper-stock": { title: "Digest des risques de stock", summary: "Valeur immobilisée en stock, quantités disponibles, stocks négatifs et signaux de rupture.", metric: "Valeur des stocks", detail: "Valeur des stocks issue de l’instantané de trésorerie des stocks." },
  "end-of-day": { title: "Point de fin de journée", summary: "Vue de fin de journée sur les ventes, les encaissements, les liens sources et les actions ouvertes.", metric: "Liens sources", detail: "Couverture des liens sources comptables dans l’instantané opérationnel de l’organisation.", unit: "liens" },
  weekly: { title: "Digest hebdomadaire", summary: "Ventes sur sept jours UTC jusqu’à la date du rapport incluse, avec les soldes de stock, les obligations de paiement et la préparation à la clôture actuels. Les soldes actuels ne sont pas des totaux sur sept jours.", metric: "Ventes réalisées", detail: "Chiffre d’affaires des ventes terminées sur la période de sept jours UTC affichée, date du rapport incluse." },
}

// Presentation only, after authority/filtering. Keep IDs, evidence, source hashes and values intact.
export function presentDailyDigest(digest: BIDailyDigest, locale: "en" | "fr"): BIDailyDigest {
  const freshness = (value: BIFreshness): BIFreshness => locale === "fr" && value.staleReason === "Signal is expired."
    ? { ...value, staleReason: "Le signal a expiré." }
    : value
  const blockers = (values: BIDailyDigest["blockers"]) => values.map(value => presentSnapshotBlocker(value, locale))
  const route = (href: string) => href === "/dashboard" || href.startsWith("/dashboard/") ? `/${locale}${href}` : href
  const action = (value: BIActionLink | null): BIActionLink | null => value ? { ...value, href: route(value.href) } : null
  const drill = (value: BIDrillThrough | null): BIDrillThrough | null => value ? { ...value, ...(value.available && value.href ? { href: route(value.href) } : {}) } : null
  const risk = (value: BIDailyDigest["risks"][number]) => ({ ...value, freshness: freshness(value.freshness), blockers: blockers(value.blockers), drillThrough: drill(value.drillThrough)!, actionLink: action(value.actionLink) })
  const template = locale === "fr" ? templates[digest.id] : undefined
  const actions = digest.actions.map(value => action(value)!)
  const primary = action(digest.commandBrief.primaryAction)
  if (template && primary?.id === `${digest.id}-open`) primary.label = "Ouvrir l’espace"
  const zones = digest.zones.map(zone => {
    const cards = zone.cards.map(card => ({ ...card, blockers: blockers(card.blockers), ...(template ? { title: template.metric, detail: template.detail, unit: template.unit ?? card.unit } : {}), drillThrough: drill(card.drillThrough)!, actionLink: action(card.actionLink) }))
    if (template) for (const card of cards) card.drillThrough.label = "Ouvrir la source"
    if (digest.id === "manager-run-sheet") for (const card of cards) {
      if (card.state === "module_unavailable") card.detail = locale === "fr"
        ? "Accès aux achats indisponible. Contactez l’administrateur."
        : "Purchasing access is unavailable. Contact your administrator."
    }
    return { ...zone, blockers: blockers(zone.blockers), risks: zone.risks.map(risk), ...(template ? { title: template.title, summary: template.summary, businessQuestion: "Que doit examiner ce rôle aujourd’hui ?" } : {}), cards, primaryMetric: cards.find(card => card.id === zone.primaryMetric?.id) ?? zone.primaryMetric, actions: zone.actions.map(value => action(value)!), drillThrough: drill(zone.drillThrough) }
  })
  if (template) for (const zone of zones) if (zone.drillThrough) zone.drillThrough.label = "Ouvrir la source"
  const briefDrill = drill(digest.commandBrief.drillThrough)
  if (template && briefDrill) briefDrill.label = "Ouvrir la source"
  return {
    ...digest, actions, zones, blockers: blockers(digest.blockers),
    changes: digest.changes.map(change => ({ ...change, freshness: freshness(change.freshness), blockers: blockers(change.blockers), drillThrough: drill(change.drillThrough), actionLink: action(change.actionLink) })),
    risks: digest.risks.map(risk),
    commandBrief: { ...digest.commandBrief, blockers: blockers(digest.commandBrief.blockers), reviewState: digest.commandBrief.reviewState ? { ...digest.commandBrief.reviewState, blockers: blockers(digest.commandBrief.reviewState.blockers) } : null, primaryAction: primary, drillThrough: briefDrill, ...(template ? { title: template.title, summary: template.summary, conclusion: actions.length ? `${actions.length} action(s) visible(s) à examiner dans ce digest.` : "Aucune action visible à traiter dans ce digest pour le moment." } : {}) },
  }
}
