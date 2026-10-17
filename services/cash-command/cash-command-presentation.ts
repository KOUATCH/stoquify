import { presentSnapshotBlocker } from "@/lib/dashboard/snapshot-blocker-presentation"
import { biCopy } from "@/lib/dashboard/bi-presentation"
import type { BIActionLink, BIBlocker, BIDrillThrough, BIFreshness, BIRedaction } from "@/services/bi/bi-contracts"
import type { AuthorizedCashCommandData } from "./cash-command-contracts"

// Presentation only, after authorization. Unknown/custom source text is retained.
// Never apply this dictionary recursively to identities, hashes or evidence data.
const french: Record<string, string> = {
  "Cash command brief": "Synthèse de trésorerie",
  "Cash collected": "Encaissements",
  "Unreconciled cash": "Trésorerie non rapprochée",
  "Open suspense": "Suspens ouverts",
  "Drawer risk": "Risques de caisse",
  "Provider risk": "Risques liés aux prestataires",
  "Employee balance recovery": "Recouvrement des soldes salariés",
  "Upcoming net pay": "Net à payer à venir",
  "Upcoming statutory liability": "Obligations déclaratives à venir",
  "Stock cash buffer": "Trésorerie immobilisée en stock",
  "Close readiness": "Préparation à la clôture",
  "Purchase receiving": "Réception des achats",
  "Proof trail": "Piste de preuve",
  "The source snapshot is blocked; clear blockers before drill-through can be trusted.": "L’instantané source est bloqué ; examinez les blocages avant de vous fier aux détails.",
  "No proof subject is available for this command surface.": "Aucun objet de preuve n’est disponible pour cette vue.",
  "No supported route or proof subject is available yet.": "Aucun espace ni objet de preuve pris en charge n’est encore disponible.",
  "Collected payment value in the selected operating period.": "Valeur des paiements encaissés sur la période sélectionnée.",
  "Unresolved suspense value that should be explained before daily cash is trusted.": "Montant des suspens non résolus à expliquer avant de se fier à la trésorerie du jour.",
  "Suspense items still waiting for classification, match, posting, or resolution.": "Suspens en attente de classement, de rapprochement, de comptabilisation ou de résolution.",
  "Pending provider transactions, critical exceptions, and inactive provider accounts that weaken cash confidence.": "Transactions de prestataires en attente, exceptions critiques et comptes inactifs qui réduisent la fiabilité de la trésorerie.",
  "Open payroll recovery or refund cases that affect net-pay clearing and cash planning.": "Dossiers de recouvrement ou de remboursement de paie ouverts qui affectent l’apurement du net à payer et la planification de trésorerie.",
  "Inventory value currently tying cash to stock, including zero or negative-stock pressure.": "Valeur immobilisée dans les stocks, avec les tensions liées aux stocks nuls ou négatifs.",
  "Authorized aggregate payroll value. Open the payroll workspace for the evidence available to your role.": "Montant agrégé de paie autorisé. Ouvrez l’espace paie pour consulter les preuves accessibles à votre rôle.",
  "Collected payment value in the selected period. Cross-domain evidence is restricted.": "Valeur encaissée sur la période sélectionnée. Les preuves des autres domaines sont restreintes.",
  "Open the authorized source workspace to review this condition.": "Ouvrez l’espace source autorisé pour examiner cette situation.",
  "Review the permitted source workspaces before making a cash decision. Unavailable indicators do not establish a zero balance or readiness.": "Examinez les espaces sources autorisés avant toute décision de trésorerie. Un indicateur indisponible ne prouve ni un solde nul ni un état prêt.",
  "No cash indicators are available with your current access.": "Aucun indicateur de trésorerie n’est accessible avec vos droits actuels.",
  "Aggregate amount unavailable": "Montant agrégé indisponible",
  "Required source evidence is incomplete or restricted. Do not use this amount for a cash decision.": "Les preuves sources requises sont incomplètes ou restreintes. N’utilisez pas ce montant pour une décision de trésorerie.",
  "Cross-domain source details are restricted by your current access. This does not establish source readiness.": "Vos droits restreignent les détails des autres domaines. Cela ne prouve pas que les sources sont prêtes.",
  "Cash Command exposes aggregate payroll forecast amounts only; person-level payroll values stay inside payroll.": "Seuls les montants agrégés des prévisions de paie sont présentés ici ; les montants individuels restent dans l’espace paie.",
  "Open payments": "Ouvrir les paiements",
  "Open reconciliation": "Ouvrir le rapprochement",
  "Open drawers": "Ouvrir les caisses",
  "Open stock": "Ouvrir les stocks",
  "Open payroll payments": "Ouvrir les paiements de paie",
  "Open declarations": "Ouvrir les déclarations",
  "Open workspace": "Ouvrir l’espace",
  "Open": "Ouvrir",
  "Unavailable": "Indisponible",
  "Source workspace unavailable": "Espace source indisponible",
  "No permitted source workspace is available.": "Aucun espace source autorisé n’est disponible.",
  "Open cash collection proof": "Consulter les preuves d’encaissement",
  "Open reconciliation proof": "Consulter les preuves de rapprochement",
  "Open suspense proof": "Consulter les preuves des suspens",
  "Open provider proof": "Consulter les preuves du prestataire",
  "Open employee balance proof": "Consulter les preuves des soldes salariés",
  "Open payroll payment forecast proof": "Consulter les preuves de prévision des paiements de paie",
  "Open payroll declaration forecast proof": "Consulter les preuves de prévision des déclarations de paie",
  "Open stock-to-cash view": "Consulter les stocks et leur impact sur la trésorerie",
  "Payment transaction proof": "Preuves de la transaction de paiement",
  "Reconciliation proof": "Preuves de rapprochement",
  "Close proof": "Preuves de clôture",
  "Ledger proof": "Preuves comptables",
  "Proof unavailable": "Preuve indisponible",
  "This proof is unavailable with your current access.": "Cette preuve n’est pas accessible avec vos droits actuels.",
  "You do not have permission to read this proof.": "Vous n’avez pas l’autorisation de consulter cette preuve.",
  "This workspace does not currently allow reading this proof.": "Cet espace ne permet pas actuellement de consulter cette preuve.",
  "No payment transaction is visible in this cash-command period.": "Aucune transaction de paiement n’est visible sur cette période.",
  "No reconciliation run is visible in this cash-command period.": "Aucun rapprochement n’est visible sur cette période.",
  "No close run is visible in this cash-command period.": "Aucune exécution de clôture n’est visible sur cette période.",
  "No posted journal entry is visible in this cash-command period.": "Aucune écriture comptabilisée n’est visible sur cette période.",
  "Cash collected in this period": "Encaissements sur la période",
  "Unreconciled cash remains open": "Trésorerie restant à rapprocher",
  "Drawer risk needs review": "Risques de caisse à examiner",
  "Provider risk is visible": "Risques de prestataires détectés",
  "Employee balance recovery is open": "Recouvrement des soldes salariés en cours",
  "Payroll forecast proof is blocked": "Preuves de prévision de paie bloquées",
  "Payroll forecast proof": "Preuves de prévision de paie",
  "Owners can review collected cash for this period before checking unresolved exceptions.": "Examinez les encaissements de la période avant les exceptions non résolues.",
  "Open suspense spans currencies without a verified converted total. Review the currency breakdown.": "Les suspens couvrent plusieurs devises sans total converti vérifié. Examinez la ventilation par devise.",
  "Cash cannot be treated as fully trusted until suspense is cleared or explained.": "La trésorerie ne peut être considérée comme entièrement fiable tant que les suspens ne sont pas résolus ou expliqués.",
  "Drawer variance or stale sessions can hide leakage before cash is deposited or posted.": "Des écarts de caisse ou des sessions anciennes peuvent masquer des pertes avant dépôt ou comptabilisation.",
  "Provider evidence should be reviewed before daily cash or close reporting is trusted.": "Examinez les preuves des prestataires avant de vous fier à la trésorerie du jour ou aux rapports de clôture.",
  "Net-pay clearing and cash planning remain incomplete until recovery cases are settled or reviewed.": "L’apurement du net à payer et la planification de trésorerie restent incomplets tant que les dossiers de recouvrement ne sont pas réglés ou examinés.",
  "Cash planning and profitability views must not rely on payroll obligations until payroll proof is complete.": "La planification de trésorerie et l’analyse de rentabilité ne doivent pas s’appuyer sur les obligations de paie avant que leurs preuves soient complètes.",
  "Suspense value is the first cash-trust blocker.": "Le montant des suspens est le premier obstacle à la fiabilité de la trésorerie.",
  "Unresolved suspense weakens daily cash, owner reporting, and close readiness.": "Les suspens non résolus réduisent la fiabilité de la trésorerie quotidienne, des rapports de direction et de la préparation à la clôture.",
  "Drawer variance and stale-session alerts show cash-control pressure.": "Les écarts de caisse et les alertes de sessions anciennes signalent des difficultés de contrôle.",
  "Drawer issues should be reviewed before cash is deposited or posted.": "Examinez les anomalies de caisse avant dépôt ou comptabilisation.",
  "Provider pending transactions, critical exceptions, or inactive accounts are visible.": "Des transactions de prestataires en attente, des exceptions critiques ou des comptes inactifs sont visibles.",
  "Provider issues can make cash look collected before settlement evidence is trustworthy.": "Les anomalies des prestataires peuvent donner l’impression d’un encaissement avant que les preuves de règlement soient fiables.",
  "Open payroll recovery or refund balances affect net-pay clearing and cash planning.": "Les soldes de recouvrement ou de remboursement ouverts affectent l’apurement du net à payer et la planification de trésorerie.",
  "Unsettled employee balances can leave payroll clearing, cash forecasts, and close readiness incomplete.": "Les soldes salariés non réglés peuvent laisser incomplets l’apurement de la paie, les prévisions de trésorerie et la préparation à la clôture.",
  "Payroll net-pay or statutory obligation forecasts are withheld until payroll-owned proof is complete.": "Les prévisions de net à payer et d’obligations déclaratives sont retenues tant que les preuves de paie sont incomplètes.",
  "Cash planning, profitability, and owner decisions must not use payroll estimates when the register, ledger, payment, or declaration proof is incomplete.": "La planification de trésorerie, la rentabilité et les décisions de direction ne doivent pas utiliser d’estimations de paie lorsque les preuves du registre, de la comptabilité, du paiement ou de la déclaration sont incomplètes.",
  "Provider evidence": "Preuves des prestataires",
  "Signed runs": "Rapprochements signés",
  "Drawer confidence": "Fiabilité des caisses",
  "Close blockers": "Blocages de clôture",
  "Review required": "Examen requis",
  "Freshness": "Fraîcheur",
  "Fresh": "À jour",
  "Stale": "Ancien",
  "Signal is expired.": "Le signal a expiré.",
  "Review drawer risk": "Examiner les risques de caisse",
  "Review drawer variance and stale session evidence.": "Examinez les preuves des écarts et des sessions de caisse anciennes.",
  "Review drawer movements and attach variance evidence.": "Examinez les mouvements de caisse et joignez les preuves des écarts.",
  "High drawer variance": "Écart de caisse important",
  "Drawer variance": "Écart de caisse",
  "Stale drawer session": "Session de caisse ancienne",
  "Open drawer without session": "Caisse ouverte sans session",
  "Drawer ready": "Caisse prête",
  "Open cash drawer controls and review variance evidence.": "Ouvrez les contrôles de caisse et examinez les preuves des écarts.",
  "Payroll Exposure": "Exposition liée à la paie",
  "Employee balance currencies cannot be combined": "Les soldes salariés de devises différentes ne peuvent pas être additionnés",
  "Review payroll balances by currency.": "Examinez les soldes de paie par devise.",
  "Employee balance recovery cases are open": "Dossiers de recouvrement des soldes salariés ouverts",
  "Open payroll payments and review recovery cases.": "Ouvrez les paiements de paie et examinez les dossiers de recouvrement.",
  "Resolve payment suspense": "Résoudre les suspens de paiement",
  "Open payroll declarations and repair source register, declaration, or receipt proof.": "Ouvrez les déclarations de paie et examinez les preuves du registre, des déclarations et des reçus.",
  "Open payroll payments and repair payment batch, provider, settlement, or ledger proof.": "Ouvrez les paiements de paie et examinez les preuves des lots, des prestataires, des règlements et des écritures.",
  "Open payroll register proof and repair source-linked payroll evidence.": "Ouvrez le registre de paie et examinez les preuves liées aux sources.",
  "Close Blocker": "Blocage de clôture",
  "Open Payment Suspense": "Suspens de paiement ouverts",
  "Stockout Risk": "Risque de rupture de stock",
  "Purchase Order Receiving Delay": "Commandes au-delà de la livraison prévue",
  "Recorded inventory loss needs review": "Pertes de stock enregistrées à examiner",
  "Review employee balance recovery evidence before payment and close claims are trusted.": "Examinez les preuves de recouvrement des soldes salariés avant de vous fier aux paiements et à la clôture.",
  "Review payroll payment and posting evidence without exposing person-level amounts.": "Examinez les preuves de paiement et de comptabilisation de la paie sans exposer les montants individuels.",
  "Resolve close blockers or attach missing evidence before certification.": "Examinez les blocages de clôture et joignez les preuves manquantes avant toute certification.",
  "Review suspense lines and resolve missing payment evidence.": "Examinez les suspens et complétez les preuves de paiement manquantes.",
  "Review stock levels and confirm reorder or transfer action.": "Examinez les niveaux de stock et confirmez le réapprovisionnement ou le transfert nécessaire.",
  "Follow up pending purchase orders and receiving evidence.": "Vérifiez les commandes en attente et les justificatifs de réception.",
  "Review adjustment evidence, valuation, and approval attribution before relying on recorded loss totals.": "Examinez les preuves d’ajustement, la valorisation et l’attribution de l’approbation avant de vous fier aux totaux des pertes enregistrées.",
  "No upcoming payroll periods, payment batches, or statutory declaration due dates are visible in the forecast horizon.": "Aucune période de paie, aucun lot de paiement ni aucune échéance déclarative à venir ne sont visibles sur l’horizon de prévision.",
  "Upcoming payroll net-pay and statutory-liability forecasts are sourced from payroll periods, payment batches, declarations, and posted source-link evidence.": "Les prévisions de net à payer et d’obligations déclaratives proviennent des périodes de paie, des lots de paiement, des déclarations et des preuves de comptabilisation liées aux sources.",
  "Upcoming payroll finance forecasts are withheld because currency, provider, declaration, payment, or ledger proof is incomplete.": "Les prévisions financières de paie sont retenues car les preuves de devise, de prestataire, de déclaration, de paiement ou de comptabilité sont incomplètes.",
}

const patterns: [RegExp, (...parts: string[]) => string][] = [
  [/^Source data is (\d+) minutes old\.$/, minutes => `Les données sources datent de ${minutes} minutes.`],
  [/^(\d+) active employee balance case\(s\) remain open\.$/, n => `${n} dossiers actifs de soldes salariés restent ouverts.`],
  [/^Amounts by currency: ((?:-?\d+\.\d{2} [A-Z]{3})(?:; -?\d+\.\d{2} [A-Z]{3})*)\. No conversion evidence establishes a total in ([A-Z]{3})\.$/, (amounts, currency) => `Montants par devise : ${amounts}. Aucune preuve de conversion ne permet d’établir un total en ${currency}.`],
  [/^(\d+) provider account\(s\) are inactive\.$/, n => `${n} comptes de prestataires sont inactifs.`],
  [/^(\d+) ready for signoff\.$/, n => `${n} prêts pour signature.`],
  [/^(\d+) drawer alert\(s\)\.$/, n => `${n} alertes de caisse.`],
  [/^(\d+(?:\.\d+)?)% readiness\.$/, n => `${n} % de préparation.`],
  [/^(\d+) alert\(s\), (\d+) open drawer\(s\), and (\d+(?:\.\d+)?)% confidence\.$/, (a, d, c) => `${a} alertes, ${d} caisses ouvertes et ${c} % de fiabilité.`],
  [/^(\d+) drawer alert\(s\) and (-?\d+\.\d+) in variance are visible\.$/, (n, a) => `${n} alertes de caisse et un écart de ${a} sont visibles.`],
  [/^(\d+) drawer item\(s\) require review(?: for (-?\d+\.\d+))?\.$/, (n, a) => `${n} éléments de caisse doivent être examinés${a ? ` pour ${a}` : ""}.`],
  [/^(\d+) drawer alert\(s\) are visible today\.$/, n => `${n} alertes de caisse sont visibles aujourd’hui.`],
  [/^(\d+) provider issue\(s\) are affecting payment confidence\.$/, n => `${n} anomalies de prestataires affectent la fiabilité des paiements.`],
  [/^([\d,.-]+ [A-Z]{3}|total unavailable) is visible in collected cash\.$/, a => `${a === "total unavailable" ? "Total indisponible" : a} d’encaissements sont visibles.`],
  [/^([\d,.-]+ [A-Z]{3}) remains in suspense\.$/, a => `${a} restent en suspens.`],
  [/^([\d,.-]+ [A-Z]{3}) remains outstanding across (\d+) case\(s\)\.$/, (a, n) => `${a} restent à régler dans ${n} dossiers.`],
  [/^(\d+) recovery case\(s\) remain open; a combined currency total is unavailable\.$/, n => `${n} dossiers de recouvrement restent ouverts ; le total combiné des devises est indisponible.`],
  [/^(\d+) payroll forecast blocker\(s\) are withholding aggregate payroll cash obligations\.$/, n => `${n} blocages de prévision empêchent de présenter les obligations agrégées de trésorerie liées à la paie.`],
  [/^Action is (expired|resolved|dismissed)\.$/, state => `L’action est ${state === "expired" ? "expirée" : state === "resolved" ? "résolue" : "écartée"}.`],
]

function text(value: string): string {
  if (Object.hasOwn(french, value)) return french[value]
  for (const [pattern, render] of patterns) {
    const match = pattern.exec(value)
    if (match) return render(...match.slice(1))
  }
  return value
}

const months: Record<string, string> = { Jan: "janv.", Feb: "févr.", Mar: "mars", Apr: "avr.", May: "mai", Jun: "juin", Jul: "juil.", Aug: "août", Sep: "sept.", Oct: "oct.", Nov: "nov.", Dec: "déc." }
function dateText(value: string) {
  // Translate the service's explicit UTC display date; never reconstruct an instant.
  return value.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}) \(UTC\)/g, (_, month: string, day: string) => `${day} ${months[month]} (UTC)`)
}

/** Accept only the already authorized read model. No source query or authorization decision. */
export function presentCashCommand(data: AuthorizedCashCommandData, locale: "en" | "fr"): AuthorizedCashCommandData {
  if (locale === "en") return data
  const freshness = (value: BIFreshness): BIFreshness => ({ ...value, staleReason: value.staleReason ? text(value.staleReason) : null })
  const blocker = (value: BIBlocker): BIBlocker => {
    const presented = presentSnapshotBlocker(value, locale)
    return { ...presented, title: text(presented.title), detail: text(presented.detail), ...(presented.nextAction ? { nextAction: text(presented.nextAction) } : {}) }
  }
  const evidence = <T extends { freshness: BIFreshness; blockers: BIBlocker[]; redactions: BIRedaction[] }>(value: T): T => ({
    ...value, freshness: freshness(value.freshness), blockers: value.blockers.map(blocker), redactions: value.redactions.map(item => ({ ...item, reason: text(item.reason) })),
  })
  const action = (link: BIActionLink | null): BIActionLink | null => link ? { ...link, label: text(link.label), disabledReason: link.disabledReason ? text(link.disabledReason) : null } : null
  const drill = (link: BIDrillThrough): BIDrillThrough => link.available ? { ...link, label: text(link.label) } : { ...link, label: text(link.label), unavailableReason: text(link.unavailableReason) }
  const detail = (value: string, blockers: BIBlocker[]) => {
    // A blocked forecast concatenates its canonical message and the first next action.
    for (const item of blockers) if (item.nextAction && value.endsWith(` ${item.nextAction}`)) {
      const message = value.slice(0, -item.nextAction.length - 1)
      if (Object.hasOwn(french, message)) return `${text(message)} ${blocker(item).nextAction}`
    }
    const pay = /^Aggregate payroll (payment batch value|declaration liability) due (.+); person-level amounts stay redacted\.$/.exec(value)
    if (pay) return `Montant agrégé ${pay[1] === "payment batch value" ? "des lots de paiement de paie" : "des obligations déclaratives de paie"} à échéance du ${dateText(pay[2])} ; les montants individuels restent masqués.`
    return text(value)
  }
  const units: Record<string, string> = { items: "éléments", issues: "anomalies", blockers: "blocages" }
  const unit = (value: string) => Object.hasOwn(units, value) ? units[value] : value
  const cards = data.cards.map(card => ({ ...evidence(card), title: text(card.title), detail: detail(card.detail, card.blockers), unit: unit(card.unit), actionLink: action(card.actionLink), drillThrough: drill(card.drillThrough) }))
  const canonicalSummary = data.cards.length ? data.cards.map(card => `${card.title}: ${card.value === null ? "unavailable" : card.value} ${card.unit}`).join("; ") : "No cash indicators are available with your current access."
  const summary = data.commandBrief.summary === canonicalSummary && cards.length
    ? cards.map(card => `${card.title} : ${card.value === null ? "indisponible" : typeof card.value === "number" ? card.value.toLocaleString("fr-FR", { maximumFractionDigits: 20 }) : card.value} ${card.unit}`).join(" ; ")
    : text(data.commandBrief.summary)
  const roles: Record<string, string> = { owner: "Direction", finance: "Finance", accountant: "Comptabilité", payroll: "Paie", purchasing: "Achats", inventory: "Stocks", manager: "Responsable", cashier: "Caissier", administrator: "Administrateur" }
  return {
    ...data, cards,
    commandBrief: { ...evidence(data.commandBrief), title: text(data.commandBrief.title), summary, conclusion: text(data.commandBrief.conclusion), primaryAction: action(data.commandBrief.primaryAction), drillThrough: data.commandBrief.drillThrough ? drill(data.commandBrief.drillThrough) : null },
    trustSignals: data.trustSignals.map(signal => ({ ...evidence(signal), label: text(signal.label), value: signal.id === "freshness" ? biCopy.fr[signal.freshness.state] : signal.id === "close_readiness" ? text(signal.value) : signal.value, detail: signal.detail ? text(signal.detail) : null })),
    changes: data.changes.map(change => ({ ...evidence(change), title: text(change.title), detail: detail(change.detail, change.blockers), businessImpact: text(change.businessImpact), unit: change.unit ? unit(change.unit) : change.unit, actionLink: action(change.actionLink), drillThrough: change.drillThrough ? drill(change.drillThrough) : null })),
    risks: data.risks.map(risk => ({ ...evidence(risk), title: text(risk.title), detail: detail(risk.detail, risk.blockers), businessImpact: text(risk.businessImpact), actionLink: action(risk.actionLink), drillThrough: drill(risk.drillThrough) })),
    actionsToday: data.actionsToday.map(item => ({ ...evidence(item), title: text(item.title), nextStep: text(item.nextStep), actionLink: action(item.actionLink)!, dueLabel: item.dueLabel ? dateText(item.dueLabel).replace(/^Due /, "Échéance : ") : null, ownerLabel: item.ownerLabel && Object.hasOwn(roles, item.ownerLabel) ? roles[item.ownerLabel] : item.ownerLabel })),
    proofSubjects: data.proofSubjects.map(subject => subject.available ? { ...subject, label: text(subject.label) } : { ...subject, label: text(subject.label), unavailableReason: text(subject.unavailableReason) }),
    restrictedCapabilities: data.restrictedCapabilities?.map(capability => ({ ...capability, title: text(capability.title) })),
  }
}
