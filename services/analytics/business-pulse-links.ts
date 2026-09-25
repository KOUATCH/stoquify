import "server-only"

import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import type { BIActionLink, BIDrillThrough } from "@/services/bi/bi-contracts"
import type { BusinessPulseCommandData } from "./business-pulse-contracts"

/** Presentation only. Destination routes still enforce current tenant, module and operation access. */
export function resolveBusinessPulseLinks(data: BusinessPulseCommandData, permissions: readonly string[] = [], locale: "en" | "fr" = "en"): BusinessPulseCommandData {
  const reason = locale === "fr" ? "Votre rôle ne permet pas d’ouvrir cette page. Contactez votre administrateur." : "Your role cannot open this page. Contact your administrator."
  const stockDetail = `${data.summary.lowStockItems} article(s) actif(s) ont un stock disponible inférieur ou égal au seuil de réapprovisionnement d’un site, ruptures comprises. Les fiches de stock absentes ne sont pas comptées.`
  const frenchComparison = "L’activité enregistrée aujourd’hui est comparée à la journée entière d’hier. Les horaires d’ouverture et la demande n’ont pas été évalués."
  const frenchSalesDifference = new Intl.NumberFormat("fr", { style: "currency", currency: data.currency, signDisplay: "always" }).format(data.summary.salesChange)
  const label = (href: string, fallback: string) => {
    if (href === "/dashboard/analytics") return locale === "fr" ? "Consulter le rapport des ventes" : "Review sales report"
    if (href === "/dashboard/inventory/items") return locale === "fr" ? "Parcourir les articles (tous les sites)" : "Browse item records (all locations)"
    if (href === "/dashboard/pos") return locale === "fr" ? "Ouvrir la caisse" : "Open POS"
    if (href === "/dashboard/settings/locations") return locale === "fr" ? "Consulter les sites" : "Open locations"
    return fallback
  }
  const destination = (href: string) => {
    if (href === "/dashboard/analytics") {
      const query = new URLSearchParams({ report: "financial", locationId: data.locationId, reportFrom: data.periodStart, reportTo: data.periodEnd })
      return `/${locale}/dashboard/analytics/reports?${query}`
    }
    // These are internal unprefixed routes constructed by the pulse service.
    return `/${locale}${href}`
  }
  const action = (value: BIActionLink): BIActionLink => {
    const allowed = hasRbacPermission(permissions, value.requiredPermission)
    return { ...value, label: label(value.href, value.label), href: destination(value.href), disabled: value.disabled || !allowed, disabledReason: value.disabledReason ?? (allowed ? null : reason) }
  }
  const drill = (value: BIDrillThrough): BIDrillThrough => {
    if (!value.available) return value
    const text = label(value.href ?? "", value.label)
    if (!hasRbacPermission(permissions, value.requiredPermission)) return { available: false, type: value.type, label: text, requiredPermission: value.requiredPermission, unavailableReason: reason }
    return { ...value, label: text, ...(value.href ? { href: destination(value.href) } : {}) }
  }
  return { ...data,
    commandBrief: { ...data.commandBrief, ...(locale === "fr" && data.commandBrief.state !== "blocked" ? { conclusion: data.actionsToday.length ? `${data.actionsToday.length} examen(s) suggéré(s). L’urgence, le responsable et l’échéance n’ont pas été évalués.` : "Aucun examen suggéré par ces contrôles limités. Ce résultat ne constitue pas une évaluation du bon fonctionnement ni de l’exhaustivité des données." } : {}), primaryAction: data.commandBrief.primaryAction ? action(data.commandBrief.primaryAction) : null, drillThrough: data.commandBrief.drillThrough ? drill(data.commandBrief.drillThrough) : null },
    cards: data.cards.map(value => ({ ...value, ...(locale === "fr" && value.id === "business-pulse-low-stock" ? { title: "Articles à réapprovisionner", detail: stockDetail, unit: "articles", ...(value.value === "Unavailable" ? { value: "Indisponible" } : value.value === "No inventory-tracked items" ? { value: "Aucun article suivi en stock" } : {}) } : {}), actionLink: value.actionLink ? action(value.actionLink) : null, drillThrough: drill(value.drillThrough) })),
    changes: data.changes.map(value => ({ ...value, ...(locale === "fr" ? { title: value.id === "business-pulse-sales-change" ? "Ventes enregistrées aujourd’hui et journée entière d’hier" : "Transactions d’aujourd’hui et journée entière d’hier", detail: frenchComparison, businessImpact: `${value.id === "business-pulse-sales-change" ? frenchSalesDifference : new Intl.NumberFormat("fr", { signDisplay: "always" }).format(data.summary.transactionChange) + " transaction(s)"}. ${frenchComparison}` } : {}), actionLink: value.actionLink ? action(value.actionLink) : null, drillThrough: value.drillThrough ? drill(value.drillThrough) : null })),
    actionsToday: data.actionsToday.map(value => ({ ...value, ...(locale === "fr" ? value.id === "business-pulse-action-low-stock" ? { title: "Examiner les besoins de réapprovisionnement", nextStep: `${data.summary.lowStockItems} article(s) à examiner selon les seuils de chaque site. Le catalogue regroupe les articles de tous les sites.` } : { title: "Examiner la comparaison des ventes", nextStep: frenchComparison } : {}), actionLink: action(value.actionLink) })),
    risks: data.risks.map(value => ({ ...value, ...(locale === "fr" ? value.id === "business-pulse-risk-low-stock" ? { title: "Stock au seuil de réapprovisionnement ou en dessous", detail: stockDetail, businessImpact: "Examinez la demande, les délais et les arrivages avant de décider du réapprovisionnement. L’impact sur les ventes et l’urgence n’ont pas été évalués." } : { title: "Comparaison des ventes à contextualiser", detail: `${frenchSalesDifference}. ${frenchComparison}`, businessImpact: "Cet écart n’est ni une perte mesurée ni une prévision. Les périodes d’activité comparables n’ont pas été évaluées." } : {}), actionLink: value.actionLink ? action(value.actionLink) : null, drillThrough: drill(value.drillThrough) })),
  }
}
