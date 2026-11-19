import { useLocale, useTranslations } from "next-intl"
import { Activity, Building2, ClipboardCheck, FileCheck2, Landmark, Settings2, ShieldCheck, Store, Users, Wallet, type LucideIcon } from "lucide-react"
import { cinematicModules, type CinematicModuleId } from "./cinematic-modules"
import { workflowAtlasWorkflows } from "./workflow-atlas-data"

type Copy = readonly [string, string]
export type LandingWorkflow = {
  id: string; label: string; title: string; body: string; icon: LucideIcon;
  module?: CinematicModuleId; href: string; steps: string[]; controls: string[]; evidence: string[]; review: string;
}

// Public explanations of current route families; no tenant data or access claims.
// Keep the eight original entries first so existing #flow-tab-N links still work.
export const additionalJourneys: { id: string; icon: LucideIcon; label: Copy; title: Copy; body: Copy; steps: Copy[]; controls: Copy[]; evidence: Copy[]; review: Copy; href: string; source: string }[] = [
  {
    id: "accountant-access", icon: Building2,
    label: ["Invite your accounting firm", "Inviter votre cabinet"],
    title: ["A clear mandate for every client.", "Un mandat clair pour chaque client."],
    body: ["Invite an accountant into a defined client scope. Registration, consent and access review keep the relationship explicit.", "Invitez un comptable dans un périmètre client défini. Inscription, consentement et revue des accès encadrent la relation."],
    steps: [["Send the client invitation", "Envoyer l’invitation client"], ["Accept or register an account", "Accepter ou créer un compte"], ["Confirm the consent mandate", "Confirmer le mandat de consentement"], ["Review scope, expiry and revocation", "Vérifier périmètre, expiration et révocation"]],
    controls: [["Client-owned access grant", "Accès accordé par le client"], ["Scoped, time-bound mandate", "Mandat délimité et daté"]],
    evidence: [["Invitation and mandate", "Invitation et mandat"], ["Access history", "Historique des accès"]],
    review: ["Each client controls its own access. An accounting mandate does not grant unrestricted operational or personnel access.", "Chaque client contrôle ses accès. Un mandat comptable n’ouvre pas tous les modules ni les dossiers du personnel."],
    href: "/#accounting-firm", source: "/dashboard/accounting/accountant-access",
  },
  {
    id: "accountant-portfolio", icon: Building2,
    label: ["Accounting firm · client portfolio", "Cabinet · portefeuille clients"],
    title: ["Move between clients with the context intact.", "Passez d’un client à l’autre avec le bon contexte."],
    body: ["Review your authorized client portfolio, select a client period and follow the work that needs attention.", "Consultez vos clients autorisés, choisissez une période et suivez les travaux à traiter."],
    steps: [["Open authorized clients", "Ouvrir les clients autorisés"], ["Choose the client and period", "Choisir le client et la période"], ["Review priorities and evidence", "Examiner priorités et justificatifs"], ["Continue in the client work desk", "Poursuivre dans le dossier client"]],
    controls: [["Active, unexpired consent", "Consentement actif et non expiré"], ["Explicit client and period", "Client et période explicites"]],
    evidence: [["Client mandate", "Mandat client"], ["Period review context", "Contexte de revue de période"]],
    review: ["Access stays attached to the selected client. Historical assessments remain distinct from current evidence.", "L’accès reste lié au client sélectionné. Les évaluations historiques restent distinctes des justificatifs actuels."],
    href: "/#accounting-firm", source: "/dashboard/accounting/accountant-portfolio",
  },
  {
    id: "accountant-review", icon: FileCheck2,
    label: ["Accounting firm · evidence review", "Cabinet · revue des justificatifs"],
    title: ["Follow the figure back to its source.", "Remontez du chiffre à sa source."],
    body: ["Use ledger-backed reports, source links and the work desk to inspect exceptions and retain review conclusions.", "Utilisez les rapports issus du grand livre, les liens sources et le dossier de travail pour examiner les anomalies et conserver les conclusions."],
    steps: [["Read the period’s accounting position", "Lire la situation comptable de la période"], ["Inspect journals and source evidence", "Examiner écritures et justificatifs sources"], ["Follow up on missing evidence", "Suivre les justificatifs manquants"], ["Retain the review and eligible exports", "Conserver la revue et les exports autorisés"]],
    controls: [["Evidence freshness and completeness", "Actualité et complétude des pièces"], ["Export and review permissions", "Droits de revue et d’export"]],
    evidence: [["Source-linked journals", "Écritures liées aux sources"], ["Review and export history", "Historique des revues et exports"]],
    review: ["Trust-pack export depends on its checks. A historical review or internal report is not a new close certification.", "L’export du pack dépend de ses contrôles. Une revue historique ou un rapport interne ne vaut pas nouvelle certification de clôture."],
    href: "/workflows#workflow-accountingCloseAssurance", source: "/dashboard/accounting/accountant-portal",
  },
  {
    id: "supplier-payments", icon: Wallet,
    label: ["Supplier payment approvals", "Approbations des règlements fournisseurs"],
    title: ["Separate the payable from the payment.", "Distinguez la dette de son règlement."],
    body: ["Prepare, approve and record supplier payments, then reconcile the evidence and handle exceptions.", "Préparez, approuvez et enregistrez les règlements fournisseurs, puis rapprochez les justificatifs et traitez les anomalies."],
    steps: [["Prepare the payable", "Préparer la dette"], ["Request and approve payment", "Demander et approuver le règlement"], ["Record execution evidence", "Enregistrer la preuve d’exécution"], ["Reconcile or resolve the exception", "Rapprocher ou résoudre l’anomalie"]],
    controls: [["Independent approval", "Approbation indépendante"], ["Payment proof before resolution", "Preuve de paiement avant résolution"]],
    evidence: [["Payable and approval", "Dette et approbation"], ["Payment and reconciliation record", "Paiement et rapprochement"]],
    review: ["Approval is not proof that money moved. Payment recording and reconciliation keep their own evidence.", "Une approbation ne prouve pas le transfert d’argent. Enregistrement et rapprochement gardent leurs justificatifs."],
    href: "/workflows#workflow-procureToPay", source: "/dashboard/purchases/payables/payments/request",
  },
  {
    id: "stock-loss", icon: ClipboardCheck,
    label: ["Stock counts & loss review", "Inventaires et revue des pertes"],
    title: ["Explain the difference in your stock.", "Expliquez les écarts de stock."],
    body: ["Follow counts, adjustments and loss signals with their location, reason and source record.", "Suivez inventaires, ajustements et signaux de perte avec leur site, leur motif et leur pièce d’origine."],
    steps: [["Select item and location", "Choisir article et site"], ["Compare recorded and observed quantity", "Comparer quantité enregistrée et constatée"], ["Review the adjustment and reason", "Vérifier l’ajustement et son motif"], ["Follow movement and valuation evidence", "Suivre mouvement et valorisation"]],
    controls: [["Location and actor scope", "Périmètre du site et de l’acteur"], ["Reviewed adjustment reason", "Motif d’ajustement vérifié"]],
    evidence: [["Count and movement source", "Source de l’inventaire et du mouvement"], ["Variance and valuation", "Écart et valorisation"]],
    review: ["Stock evidence supports the accounting review; adjustments and write-offs follow their configured controls.", "Les pièces de stock étayent la revue comptable ; ajustements et sorties suivent leurs contrôles configurés."],
    href: "/workflows#workflow-stockToSale", source: "/dashboard/inventory/loss-control",
  },
  {
    id: "people-self-service", icon: Users,
    label: ["Employee requests & self-service", "Demandes et espace salarié"],
    title: ["Give people a clear route to HR.", "Donnez aux salariés un accès clair aux RH."],
    body: ["Employees can review their own available records and submit supported time requests. Managers and HR retain the approval path.", "Les salariés consultent leurs données disponibles et soumettent les demandes de temps prises en charge. Managers et RH gardent le circuit d’approbation."],
    steps: [["Open the employee’s own profile", "Ouvrir le profil du salarié"], ["Review time and available balances", "Consulter temps et soldes disponibles"], ["Submit a supported request", "Soumettre une demande prise en charge"], ["Follow the review and approved record", "Suivre la revue et la donnée approuvée"]],
    controls: [["Own-record identity mapping", "Lien d’identité avec son propre dossier"], ["Manager and HR review scope", "Périmètre de revue manager et RH"]],
    evidence: [["Request and decision history", "Historique des demandes et décisions"], ["Reviewed time inputs", "Données de temps vérifiées"]],
    review: ["A request does not directly change payroll. Approved people and time inputs pass through payroll readiness checks.", "Une demande ne modifie pas directement la paie. Les données approuvées passent par les contrôles de préparation."],
    href: "/#people-payroll", source: "/dashboard/people/me",
  },
  {
    id: "financial-reporting", icon: Landmark,
    label: ["Financial reporting", "Rapports financiers"],
    title: ["Read the period with its supporting records.", "Lisez la période avec ses pièces justificatives."],
    body: ["Review trial balance, financial statements and financial views with the period and accounting context in view.", "Examinez balance, états financiers et vues financières avec leur période et leur contexte comptable."],
    steps: [["Choose the reporting period", "Choisir la période"], ["Review balances and statements", "Examiner soldes et états"], ["Trace figures to journals", "Relier les chiffres aux écritures"], ["Resolve gaps before external use", "Traiter les lacunes avant usage externe"]],
    controls: [["Period and currency context", "Contexte de période et devise"], ["Posting and source completeness", "Complétude des écritures et sources"]],
    evidence: [["Trial balance and journals", "Balance et journaux"], ["Financial statements", "États financiers"]],
    review: ["Internal statements support review. Statutory use requires the applicable accounting and country checks.", "Les états internes étayent la revue. L’usage réglementaire nécessite les contrôles comptables et nationaux applicables."],
    href: "/#accounting-close", source: "/dashboard/accounting/reports/financial-statements",
  },
  {
    id: "cash-command", icon: Wallet,
    label: ["Cash position & follow-up", "Position de trésorerie et suivi"],
    title: ["Bring cash decisions back to the evidence.", "Reliez les décisions de trésorerie aux pièces."],
    body: ["Review cash movements, payment history and items needing attention before deciding the next action.", "Examinez mouvements de trésorerie, historique des paiements et points à traiter avant de décider."],
    steps: [["Review the cash position", "Examiner la position de trésorerie"], ["Open the payment history", "Ouvrir l’historique des paiements"], ["Investigate an exception", "Examiner une anomalie"], ["Return to the source workflow", "Revenir au parcours source"]],
    controls: [["Recorded versus reconciled amounts", "Montants enregistrés et rapprochés"], ["Permission-scoped source records", "Données sources selon les droits"]],
    evidence: [["Cash movement", "Mouvement de trésorerie"], ["Payment history and source", "Historique et source du paiement"]],
    review: ["A cash view summarizes available records; external statements still establish the bank-side evidence.", "La vue de trésorerie synthétise les données disponibles ; les relevés restent la preuve du côté bancaire."],
    href: "/workflows#workflow-paymentReconciliation", source: "/dashboard/finance/cash-command",
  },
  {
    id: "data-onboarding", icon: Settings2,
    label: ["Opening data & workspace setup", "Données initiales et configuration"],
    title: ["Start from a reviewed opening position.", "Partez d’une situation initiale vérifiée."],
    body: ["Prepare initial business records, opening balances, locations and access before the first live operation.", "Préparez données métier, soldes d’ouverture, sites et accès avant la première opération réelle."],
    steps: [["Confirm organization and country", "Confirmer organisation et pays"], ["Prepare opening business records", "Préparer les données initiales"], ["Review mappings and balances", "Vérifier correspondances et soldes"], ["Confirm the first workflow’s readiness", "Vérifier la préparation du premier parcours"]],
    controls: [["Reviewed source data", "Données sources vérifiées"], ["Enabled modules and permissions", "Modules activés et droits"]],
    evidence: [["Opening records", "Données d’ouverture"], ["Setup and review decisions", "Décisions de configuration et revue"]],
    review: ["Account creation does not activate every module. Opening balances and posting settings need their own review.", "Créer un compte n’active pas tous les modules. Soldes d’ouverture et paramètres comptables demandent leur revue."],
    href: "/get-started", source: "/dashboard/settings/data-onboarding",
  },
]

const atlasIcons: Record<string, LucideIcon> = { Store, FileCheck2, ClipboardCheck, Activity, Settings2, ShieldCheck }

export function useLandingWorkflowLibrary(): LandingWorkflow[] {
  const fr = useLocale() === "fr"
  const text = (copy: Copy) => copy[fr ? 1 : 0]
  const t = useTranslations("landing.workflowAtlas")
  const covered = new Set<string>(cinematicModules.map(module => module.workflow))
  return [
    ...cinematicModules.map(module => ({ id: module.id, module: module.id, icon: module.icon, label: text(module.label), title: text(module.title), body: text(module.body), href: `/products/${module.id}`, steps: [], controls: [], evidence: [], review: "" })),
    ...workflowAtlasWorkflows.filter(workflow => !covered.has(workflow.key)).map(workflow => ({
      id: workflow.key, icon: atlasIcons[workflow.icon] || FileCheck2,
      label: t(`workflows.${workflow.key}.shortTitle`), title: t(`workflows.${workflow.key}.title`), body: t(`workflows.${workflow.key}.promise`),
      href: `/workflows#workflow-${workflow.key}`,
      steps: workflow.stepKeys.map(key => t(`workflows.${workflow.key}.steps.${key}`)),
      controls: workflow.controlKeys.map(key => t(`workflows.${workflow.key}.controls.${key}`)),
      evidence: workflow.evidenceKeys.map(key => t(`workflows.${workflow.key}.evidence.${key}`)),
      review: t(`workflows.${workflow.key}.handoff`),
    })),
    ...additionalJourneys.map(workflow => ({ ...workflow, label: text(workflow.label), title: text(workflow.title), body: text(workflow.body), steps: workflow.steps.map(text), controls: workflow.controls.map(text), evidence: workflow.evidence.map(text), review: text(workflow.review) })),
  ]
}

export const landingAdditionalWorkflowSources = additionalJourneys.map(({ id, source }) => ({ id, source }))
