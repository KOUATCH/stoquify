import type { ActionQueueResult, BusinessSignalType } from "@/services/signals/business-signal-contracts"
import type { OwnerLocale } from "./owner-war-room-copy"
import { presentSnapshotBlocker } from "@/lib/dashboard/snapshot-blocker-presentation"

// Exact canonical source copy only. Unknown or customized evidence stays verbatim.
const signals: Record<BusinessSignalType, { title: string; step: readonly [string, string]; impact: readonly [string, string] }> = {
  cash_drawer_variance: {
    title: "Écart de caisse",
    step: ["Review drawer movements and attach variance evidence.", "Examinez les mouvements de caisse et joignez les preuves de l’écart."],
    impact: ["Cash variance can hide leakage, posting drift, or process breakdown.", "Un écart de caisse peut masquer des pertes, des écarts comptables ou un défaut de processus."],
  },
  open_payment_suspense: {
    title: "Paiements en suspens",
    step: ["Review suspense lines and resolve missing payment evidence.", "Examinez les lignes en suspens et complétez les preuves de paiement manquantes."],
    impact: ["Unresolved suspense weakens cash truth and period-close confidence.", "Les suspens non résolus réduisent la fiabilité de la trésorerie et de la clôture."],
  },
  duplicate_provider_reference: {
    title: "Référence du prestataire en double",
    step: ["Investigate duplicate provider reference before matching or close.", "Examinez la référence du prestataire en double avant rapprochement ou clôture."],
    impact: ["Duplicate provider references can indicate replay, duplicate capture, or reconciliation error.", "Les références en double peuvent indiquer une répétition, une double saisie ou une erreur de rapprochement."],
  },
  refund_void_spike: {
    title: "Hausse des remboursements et annulations",
    step: ["Review refund and void evidence for the affected period.", "Examinez les preuves de remboursement et d’annulation pour la période concernée."],
    impact: ["Refund or void spikes can point to cash leakage or control weakness.", "Une hausse des remboursements ou annulations peut signaler des pertes de trésorerie ou une faiblesse des contrôles."],
  },
  stockout_risk: {
    title: "Risque de rupture de stock",
    step: ["Review stock levels and confirm reorder or transfer action.", "Examinez les niveaux de stock et confirmez le réapprovisionnement ou le transfert."],
    impact: ["Stockout risk can turn demand into lost sales and unhappy customers.", "Les ruptures de stock peuvent entraîner des ventes perdues et l’insatisfaction des clients."],
  },
  dead_stock_cash_exposure: {
    title: "Trésorerie immobilisée en stock dormant",
    step: ["Review slow-moving stock and decide markdown, transfer, or supplier action.", "Examinez les stocks à faible rotation et décidez d’une remise, d’un transfert ou d’une action auprès du fournisseur."],
    impact: ["Dead stock traps working capital that could fund faster-moving inventory.", "Le stock dormant immobilise du capital qui pourrait financer des articles à rotation plus rapide."],
  },
  inventory_loss_review: {
    title: "Examen des pertes de stock",
    step: ["Review adjustment evidence, valuation, and approval attribution before relying on recorded loss totals.", "Examinez les preuves d’ajustement, la valorisation et l’attribution de l’approbation avant de vous fier aux pertes enregistrées."],
    impact: ["Unreviewed recorded stock loss can weaken inventory value, cash control, and close confidence.", "Les pertes enregistrées non examinées peuvent réduire la fiabilité de la valorisation, du contrôle de trésorerie et de la clôture."],
  },
  purchase_order_receiving_delay: {
    title: "Retard de réception fournisseur",
    step: ["Follow up pending purchase orders and receiving evidence.", "Suivez les commandes fournisseurs en attente et les preuves de réception."],
    impact: ["Receiving delays can hide supplier risk, stockouts, or AP timing issues.", "Les retards de réception peuvent masquer des risques fournisseurs, des ruptures ou des décalages de dettes fournisseurs."],
  },
  payroll_exposure: {
    title: "Engagements de paie",
    step: ["Review payroll payment and posting evidence without exposing person-level amounts.", "Examinez les preuves de paiement et de comptabilisation de la paie sans exposer les montants individuels."],
    impact: ["Payroll exposure can affect staff trust, cash planning, and close accuracy.", "Les engagements de paie peuvent affecter la confiance des salariés, la planification de trésorerie et la précision de la clôture."],
  },
  close_blocker: {
    title: "Blocage de clôture",
    step: ["Resolve close blockers or attach missing evidence before certification.", "Résolvez les blocages de clôture ou joignez les preuves manquantes avant certification."],
    impact: ["Close blockers delay reliable reporting and accountant review.", "Les blocages de clôture retardent les rapports fiables et l’examen comptable."],
  },
}

function title(value: string, type: BusinessSignalType) {
  const canonical = type.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
  if (value === canonical) return signals[type].title
  if (type === "inventory_loss_review" && value === "Recorded inventory loss needs review") return "Les pertes de stock enregistrées doivent être examinées"
  if (type === "payroll_exposure" && value === "Payroll forecast proof is blocked") return "Les preuves des prévisions de paie sont bloquées"
  return value
}

const payrollSteps: Record<string, string> = {
  "Open payroll declarations and repair source register, declaration, or receipt proof.": "Ouvrez les déclarations de paie et rétablissez les preuves du registre source, de la déclaration ou du reçu.",
  "Open payroll payments and repair payment batch, provider, settlement, or ledger proof.": "Ouvrez les paiements de paie et rétablissez les preuves du lot, du prestataire, du règlement ou du grand livre.",
  "Open payroll register proof and repair source-linked payroll evidence.": "Ouvrez les preuves du registre de paie et rétablissez les preuves liées aux sources.",
  "Review employee balance recovery evidence before payment and close claims are trusted.": "Examinez les preuves de recouvrement des soldes salariés avant de vous fier aux affirmations de paiement et de clôture.",
}

function step(value: string, type: BusinessSignalType) {
  if (value === signals[type].step[0]) return signals[type].step[1]
  return type === "payroll_exposure" && Object.prototype.hasOwnProperty.call(payrollSteps, value) ? payrollSteps[value] : value
}

function impact(value: string, type: BusinessSignalType) {
  if (value === signals[type].impact[0]) return signals[type].impact[1]
  if (type === "payroll_exposure" && value === "Manager cash planning and profitability work must not use payroll forecasts until payroll register, ledger, payment, and declaration proof are complete.") {
    return "La planification de trésorerie et l’analyse de rentabilité ne doivent pas utiliser les prévisions de paie tant que les preuves du registre, du grand livre, des paiements et des déclarations sont incomplètes."
  }
  return value
}

export function presentOwnerActionQueue(queue: ActionQueueResult, locale: OwnerLocale = "en"): ActionQueueResult {
  if (locale !== "fr") return queue
  return {
    ...queue,
    actionItems: queue.actionItems.map(item => ({
      ...item,
      title: title(item.title, item.signalType),
      nextStep: step(item.nextStep, item.signalType),
      blockers: item.blockers.map(blocker => presentSnapshotBlocker(blocker, locale)),
    })),
    signals: queue.signals.map(signal => ({
      ...signal,
      title: title(signal.title, signal.signalType),
      suggestedAction: step(signal.suggestedAction, signal.signalType),
      businessImpact: impact(signal.businessImpact, signal.signalType),
      blockers: signal.blockers.map(blocker => presentSnapshotBlocker(blocker, locale)),
    })),
  }
}

export function presentOwnerForecastMessage(forecast: { reasonCode: string; message: string }, locale: OwnerLocale = "en") {
  if (locale === "fr" && forecast.reasonCode === "PAYROLL_FORECAST_PROOF_INCOMPLETE" && forecast.message === "Upcoming payroll finance forecasts are withheld because currency, provider, declaration, payment, or ledger proof is incomplete.") {
    return "Les prévisions financières de paie sont masquées car les preuves de devise, prestataire, déclaration, paiement ou grand livre sont incomplètes."
  }
  return forecast.message
}
