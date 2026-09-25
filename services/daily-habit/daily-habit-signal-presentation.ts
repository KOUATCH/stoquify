import type { ActionItem, BusinessSignal } from "@/services/signals/business-signal-contracts"

const title = "Purchase Order Receiving Delay"
const nextStep = "Follow up pending purchase orders and receiving evidence."
const frenchTitle = "Commandes au-delà de la date de livraison prévue"
const frenchNextStep = "Vérifiez les commandes en attente et les justificatifs de réception."
const closeTitle = "Close Blocker"
const closeNextStep = "Resolve close blockers or attach missing evidence before certification."
const frenchCloseTitle = "Blocage de clôture"
const frenchCloseNextStep = "Examinez les blocages de clôture et joignez les preuves manquantes avant toute certification."

const inventoryLossCopy: Record<string, string> = {
  "Recorded inventory loss needs review": "Des pertes de stock enregistrées doivent être examinées",
  "Review adjustment evidence, valuation, and approval attribution before relying on recorded loss totals.": "Examinez les preuves d’ajustement, la valorisation et l’attribution de l’approbation avant de vous fier aux totaux des pertes enregistrées.",
  "Unreviewed recorded stock loss can weaken inventory value, cash control, and close confidence.": "Des pertes de stock enregistrées non examinées peuvent réduire la fiabilité de la valeur des stocks, du contrôle de trésorerie et de la clôture.",
}

const payrollCopy: Record<string, string> = {
  "Upcoming payroll finance forecasts are withheld because provider, declaration, payment, or ledger proof is incomplete.": "Les prévisions financières de paie ne sont pas présentées car les preuves du prestataire, des déclarations, des paiements ou de la comptabilité sont incomplètes.",
  "Manager cash planning and profitability work must not use payroll forecasts until payroll register, ledger, payment, and declaration proof are complete.": "La planification de trésorerie et l’analyse de rentabilité ne doivent pas utiliser les prévisions de paie tant que les preuves du registre, de la comptabilité, des paiements et des déclarations sont incomplètes.",
  "Payroll Exposure": "Exposition liée à la paie",
  "Payroll forecast proof is blocked": "Les preuves de prévision de paie sont bloquées",
  "Kontava detected a payroll exposure signal that needs review.": "Un signal lié aux obligations de paie doit être examiné.",
  "Review payroll payment and posting evidence without exposing person-level amounts.": "Examinez les preuves de paiement et de comptabilisation de la paie sans exposer les montants individuels.",
  "Review employee balance recovery evidence before payment and close claims are trusted.": "Examinez les preuves de recouvrement des soldes salariés avant de vous fier aux paiements et à la clôture.",
  "Payroll exposure can affect staff trust, cash planning, and close accuracy.": "Les obligations de paie peuvent affecter la confiance des salariés, la planification de trésorerie et la fiabilité de la clôture.",
  "Open payroll declarations and repair source register, declaration, or receipt proof.": "Ouvrez les déclarations de paie et examinez les preuves du registre, des déclarations et des reçus.",
  "Open payroll payments and repair payment batch, provider, settlement, or ledger proof.": "Ouvrez les paiements de paie et examinez les preuves des lots, prestataires, règlements et écritures.",
  "Open payroll register proof and repair source-linked payroll evidence.": "Ouvrez le registre de paie et examinez les preuves liées aux sources.",
}

export function presentDailySignal(signal: BusinessSignal, locale: "en" | "fr"): BusinessSignal {
  if (locale === "fr" && signal.signalType === "inventory_loss_review") {
    const { lossLineCount: count, totalLossValue: amount, currency } = signal.payload
    const expected = `${count} recorded inventory loss line(s) totaling ${amount} ${currency} require evidence review. Approval attribution records authorization and does not identify who caused the loss.`
    const canonicalDetail = typeof count === "number" && Number.isSafeInteger(count) && count >= 0
      && typeof amount === "number" && Number.isFinite(amount) && amount >= 0
      && typeof currency === "string" && /^[A-Z]{3}$/.test(currency) && signal.detail === expected
    return {
      ...signal,
      title: inventoryLossCopy[signal.title] ?? signal.title,
      detail: canonicalDetail
        ? `${count.toLocaleString("fr-FR")} ${count === 1 ? "ligne de perte enregistrée nécessite" : "lignes de pertes enregistrées nécessitent"} un examen des preuves, pour un total de ${amount.toLocaleString("fr-FR", { maximumFractionDigits: 20 })} ${currency}. L’attribution de l’approbation atteste l’autorisation et n’identifie pas la personne à l’origine de la perte.`
        : signal.detail,
      suggestedAction: inventoryLossCopy[signal.suggestedAction] ?? signal.suggestedAction,
      businessImpact: inventoryLossCopy[signal.businessImpact] ?? signal.businessImpact,
    }
  }
  if (locale === "fr" && signal.signalType === "payroll_exposure") return {
    ...signal, title: payrollCopy[signal.title] ?? signal.title, detail: payrollCopy[signal.detail] ?? signal.detail,
    suggestedAction: payrollCopy[signal.suggestedAction] ?? signal.suggestedAction, businessImpact: payrollCopy[signal.businessImpact] ?? signal.businessImpact,
  }
  if (locale === "fr" && signal.signalType === "stockout_risk") return {
    ...signal,
    title: signal.title === "Stockout Risk" ? "Risque de rupture de stock" : signal.title,
    detail: signal.detail === "Kontava detected a stockout risk signal that needs review." ? "Des niveaux de stock disponibles nuls ou négatifs doivent être examinés." : signal.detail,
    suggestedAction: signal.suggestedAction === "Review stock levels and confirm reorder or transfer action." ? "Examinez les niveaux de stock et confirmez le réapprovisionnement ou le transfert nécessaire." : signal.suggestedAction,
    businessImpact: signal.businessImpact === "Stockout risk can turn demand into lost sales and unhappy customers." ? "Une rupture de stock peut empêcher de répondre à la demande des clients." : signal.businessImpact,
  }
  if (locale === "fr" && signal.signalType === "open_payment_suspense") return {
    ...signal,
    title: signal.title === "Open Payment Suspense" ? "Suspens de paiement ouverts" : signal.title,
    detail: signal.detail === "Kontava detected a open payment suspense signal that needs review." ? "Des suspens de paiement doivent être examinés." : signal.detail,
    suggestedAction: signal.suggestedAction === "Review suspense lines and resolve missing payment evidence." ? "Examinez les suspens et complétez les preuves de paiement manquantes." : signal.suggestedAction,
    businessImpact: signal.businessImpact === "Unresolved suspense weakens cash truth and period-close confidence." ? "Les suspens non résolus réduisent la fiabilité de la trésorerie et de la clôture." : signal.businessImpact,
  }
  if (locale === "fr" && signal.signalType === "close_blocker") return {
    ...signal,
    title: signal.title === closeTitle ? frenchCloseTitle : signal.title,
    detail: signal.detail === "Kontava detected a close blocker signal that needs review."
      ? "Un signal de blocage de clôture doit être examiné." : signal.detail,
    suggestedAction: signal.suggestedAction === closeNextStep ? frenchCloseNextStep : signal.suggestedAction,
    businessImpact: signal.businessImpact === "Close blockers delay reliable reporting and accountant review."
      ? "Les blocages de clôture retardent la production de rapports fiables et la revue comptable." : signal.businessImpact,
  }
  if (locale !== "fr" || signal.signalType !== "purchase_order_receiving_delay") return signal
  const count = signal.payload.overduePurchaseOrderCount
  const expectedDetail = `${count} pending purchase order(s) have passed their recorded expected delivery time.`
  return {
    ...signal,
    title: signal.title === title ? frenchTitle : signal.title,
    detail: typeof count === "number" && Number.isSafeInteger(count) && count > 0 && signal.detail === expectedDetail
      ? count === 1
        ? "1 commande en attente a dépassé l’heure de livraison prévue enregistrée."
        : `${count} commandes en attente ont dépassé l’heure de livraison prévue enregistrée.`
      : signal.detail,
    suggestedAction: signal.suggestedAction === nextStep ? frenchNextStep : signal.suggestedAction,
    businessImpact: signal.businessImpact === "Receiving delays can hide supplier risk, stockouts, or AP timing issues."
      ? "Les retards de réception peuvent signaler un risque fournisseur, une rupture de stock ou un décalage des échéances fournisseurs." : signal.businessImpact,
  }
}

export function presentDailyAction(item: ActionItem, locale: "en" | "fr"): ActionItem {
  if (locale === "fr" && item.signalType === "inventory_loss_review") return {
    ...item, title: inventoryLossCopy[item.title] ?? item.title, nextStep: inventoryLossCopy[item.nextStep] ?? item.nextStep,
  }
  if (locale === "fr" && item.signalType === "payroll_exposure") return {
    ...item, title: payrollCopy[item.title] ?? item.title, nextStep: payrollCopy[item.nextStep] ?? item.nextStep,
  }
  if (locale === "fr" && item.signalType === "stockout_risk") return {
    ...item,
    title: item.title === "Stockout Risk" ? "Risque de rupture de stock" : item.title,
    nextStep: item.nextStep === "Review stock levels and confirm reorder or transfer action." ? "Examinez les niveaux de stock et confirmez le réapprovisionnement ou le transfert nécessaire." : item.nextStep,
  }
  if (locale === "fr" && item.signalType === "open_payment_suspense") return {
    ...item,
    title: item.title === "Open Payment Suspense" ? "Suspens de paiement ouverts" : item.title,
    nextStep: item.nextStep === "Review suspense lines and resolve missing payment evidence." ? "Examinez les suspens et complétez les preuves de paiement manquantes." : item.nextStep,
  }
  if (locale === "fr" && item.signalType === "close_blocker") return {
    ...item, title: item.title === closeTitle ? frenchCloseTitle : item.title,
    nextStep: item.nextStep === closeNextStep ? frenchCloseNextStep : item.nextStep,
  }
  if (locale !== "fr" || item.signalType !== "purchase_order_receiving_delay") return item
  return { ...item, title: item.title === title ? frenchTitle : item.title, nextStep: item.nextStep === nextStep ? frenchNextStep : item.nextStep }
}
