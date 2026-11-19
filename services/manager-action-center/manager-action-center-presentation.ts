import { commandSourceText, commandSourceFreshness, commandSourceDrill } from "@/lib/dashboard/command-center-source-copy"
import { localizePath } from "@/i18n/routing"
import { presentSnapshotBlocker } from "@/lib/dashboard/snapshot-blocker-presentation"
import { priorityExplanation } from "@/lib/dashboard/command-center-context"
import type { ManagerActionCenterData } from "./manager-action-center-contracts"

// Canonical application copy only. Unknown source evidence and authored notes are preserved.
const french: Record<string, string> = {
  "Manager daily run sheet": "Feuille de route du responsable",
  "Open manager actions": "Actions du responsable",
  "Permission-filtered work from trusted business signals and source-owned workflows.": "Travail autorisé issu des signaux métier et des processus sources.",
  "Critical pressure": "Pression critique",
  "Critical or high-severity actions that should be handled before routine work.": "Actions de gravité critique ou élevée à examiner avant les tâches courantes.",
  "Stock and supplier work": "Stocks et fournisseurs",
  "Inventory, purchase order, stockout, and supplier actions visible to this manager.": "Actions autorisées concernant les stocks, commandes, ruptures et fournisseurs.",
  "Hidden by permission": "Masqué par les autorisations",
  "Signals the server withheld because this user lacks the required role permission.": "Signaux masqués par le serveur en raison des autorisations du rôle.",
  "Open assurance incident": "Ouvrir l’incident de contrôle",
  "Open submitted proof response": "Ouvrir la réponse soumise",
  "Open close evidence request": "Ouvrir la demande de preuve de clôture",
  "Open close evidence requests": "Ouvrir les demandes de preuves",
  "Response submitted; awaiting accountant review.": "Réponse soumise ; en attente de revue comptable.",
  "Missing-proof request source unavailable": "Source des demandes de preuves indisponible",
  "Retry the action center. If unavailable state persists, review the Close & Assurance Center.": "Actualisez le centre d’actions. Si la source reste indisponible, consultez Clôture et assurance.",
  "The source-owned missing-proof queue could not be read.": "La file source des demandes de preuves n’a pas pu être consultée.",
  "Retry the action center, then inspect Close & Assurance.": "Actualisez le centre d’actions, puis consultez Clôture et assurance.",
  "Missing-proof response evidence needs review": "Les preuves de la réponse doivent être examinées",
  "Missing-proof request evidence needs review": "Les preuves de la demande doivent être examinées",
  "Missing-proof response evidence is invalid": "Preuves de réponse invalides",
  "Missing-proof request evidence is invalid": "Preuves de demande invalides",
  "Open Close & Assurance and review the stored response evidence.": "Ouvrez Clôture et assurance et examinez les preuves de réponse enregistrées.",
  "Open Close & Assurance and repair the stored request evidence.": "Ouvrez Clôture et assurance et corrigez les preuves de demande enregistrées.",
  "Overdue": "En retard", "Due today": "Aujourd’hui", "Blocked": "Bloqué", "Waiting soon": "En attente", "Assigned": "Affecté", "Routine watch": "Suivi courant",
  "Assurance incident requires action": "Un incident de contrôle nécessite une action",
  "Open payables": "Ouvrir les dettes fournisseurs",
  "Open payroll controls": "Ouvrir les contrôles de paie",
  "Open inventory evidence": "Ouvrir les preuves de stock",
  "Open close center": "Ouvrir le centre de clôture",
  "Open ledger source": "Ouvrir la source comptable",
  "Open compliance center": "Ouvrir le centre de conformité",
  "Stored missing-proof request evidence is incomplete.": "Les preuves enregistrées de la demande sont incomplètes.",
  "Stored missing-proof response evidence is incomplete.": "Les preuves enregistrées de la réponse sont incomplètes.",
  "Open": "Ouvrir", "Open source workflow": "Ouvrir le processus source",
  "Payroll forecast proof": "Preuves des prévisions de paie",
  "Open Close & Assurance Center": "Ouvrir Clôture et assurance",
  "Reconciliation sign-off is read-only": "Validation du rapprochement en lecture seule",
  "Sign payment reconciliation": "Valider le rapprochement des paiements",
  "Open reconciliation": "Ouvrir le rapprochement",
  "Verify the provider totals and apply independent sign-off with fresh authentication.": "Vérifiez les totaux du prestataire et effectuez une validation indépendante avec une nouvelle authentification.",
  "Review the ready reconciliation evidence. Signing is unavailable for this actor.": "Examinez les preuves du rapprochement prêt à valider. Cet utilisateur ne peut pas le valider.",
  "Open payment reconciliation to review current evidence and access.": "Ouvrez le rapprochement des paiements pour examiner les preuves et les droits d’accès actuels.",
  "The reconciliation maker cannot sign their own run.": "Le créateur du rapprochement ne peut pas valider son propre traitement.",
  "The reconciliation preparer cannot sign their own prepared run. An independent signer is required.": "Le préparateur ne peut pas valider le rapprochement qu’il a préparé. Un signataire indépendant est requis.",
  "Payment reconciliation write access is unavailable for this tenant.": "L’accès en écriture au rapprochement des paiements est indisponible pour cette organisation.",
  "The actor does not hold the critical reconciliation sign permission.": "Cet utilisateur ne dispose pas de l’autorisation critique de validation du rapprochement.",
  "Overdue now": "Déjà en retard",
  "Actions already past their due time. Handle these before routine work.": "Actions dont l’échéance est dépassée, à traiter avant les tâches courantes.",
  "Critical or high-risk actions that can block cash, stock, close, or control trust.": "Actions critiques ou à risque élevé pouvant affecter la trésorerie, les stocks, la clôture ou la fiabilité des contrôles.",
  "Visible work that should be cleared before the day closes.": "Travail visible à traiter avant la fin de la journée.",
  "Actions with evidence, workflow, or source-data blockers that need manager routing.": "Actions bloquées par des preuves, un processus ou des données sources nécessitant une orientation du responsable.",
  "Actions approaching their due window or waiting on another operating role.": "Actions proches de leur échéance ou en attente d’un autre intervenant.",
  "Actions already routed to a responsible role and waiting for completion.": "Actions déjà affectées à un rôle responsable et en attente de traitement.",
  "Lower-pressure actions that remain visible after urgent work is handled.": "Actions moins urgentes qui restent visibles après le traitement du travail prioritaire.",
}

export function presentManagerData(data: ManagerActionCenterData, locale: "en" | "fr"): ManagerActionCenterData {
  const route = (href: string) => locale === "fr" ? localizePath(href, locale) : href
  const text = (value: string) => locale === "fr" ? french[value] ?? commandSourceText(value, locale).replace(/^Proof response submitted: /, "Réponse soumise : ").replace(/^Missing proof: /, "Preuve manquante : ") : value
  const blockers = (items: ManagerActionCenterData["actionItems"][number]["blockers"]) => items.map(b => {
    const localized = presentSnapshotBlocker(b, locale)
    return {...localized, title: text(localized.title), detail: text(localized.detail), nextAction: localized.nextAction ? text(localized.nextAction) : localized.nextAction}
  })
  const link = (action: ManagerActionCenterData["actionItems"][number]["actionLink"]) => ({...action, label: text(action.label), href: route(action.href), disabledReason: action.disabledReason ? text(action.disabledReason) : null})
  const actionItems = data.actionItems.map(item => ({...item, title: text(item.title), nextStep: text(item.nextStep), actionPath: route(item.actionPath), actionLink: link(item.actionLink), blockers: blockers(item.blockers), redactions: item.redactions.map(r => ({...r, reason: text(r.reason)}))}))
  const s = data.summary
  return {...data, actionItems,
    commandBrief: {...data.commandBrief, freshness: commandSourceFreshness(data.commandBrief.freshness, locale), title: text(data.commandBrief.title),
      summary: locale === "fr" ? `${s.total} actions visibles : ${s.overdue} en retard, ${s.critical + s.high} critiques ou élevées, ${s.blocked} bloquées et ${s.hiddenByPermission} masquées par les autorisations.` : data.commandBrief.summary,
      conclusion: priorityExplanation(actionItems[0], "severity_deadline_score", locale),
      primaryAction: actionItems[0]?.actionLink ?? null, reviewState: data.commandBrief.reviewState ? {...data.commandBrief.reviewState, blockers: blockers(data.commandBrief.reviewState.blockers)} : null, blockers: blockers(data.commandBrief.blockers)},
    runSheetGroups: data.runSheetGroups.map(group => ({...group, title: text(group.title), detail: text(group.detail), actions: group.actions.map(item => actionItems.find(action => action.id === item.id)!)})),
    insights: data.insights.map(item => ({...item, freshness: commandSourceFreshness(item.freshness, locale), blockers: blockers(item.blockers), actionLink: item.actionLink ? link(item.actionLink) : null, drillThrough: commandSourceDrill(item.drillThrough, locale)})),
    kpis: data.kpis.map(card => ({...card, freshness: commandSourceFreshness(card.freshness, locale), redactions: card.redactions.map(r => ({...r, reason: text(r.reason)})), title: text(card.title), detail: card.detail ? text(card.detail) : card.detail, blockers: blockers(card.blockers), drillThrough: card.drillThrough?.available && card.drillThrough.href ? {...card.drillThrough, label: text(card.drillThrough.label), href: route(card.drillThrough.href)} : commandSourceDrill(card.drillThrough, locale)})),
  }
}
