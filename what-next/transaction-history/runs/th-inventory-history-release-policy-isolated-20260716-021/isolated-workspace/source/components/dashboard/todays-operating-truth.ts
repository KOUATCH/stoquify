import type { LucideIcon } from "lucide-react"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  DollarSign,
  Package,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react"

import type {
  ActionQueueItemData,
  CommandBriefHeaderProps,
  CommandCenterAction,
  DashboardTone,
  EvidenceTimelineEvent,
  KpiTileProps,
  ProofBadgeState,
  StatusStripItem,
} from "@/components/dashboard/primitives"
import type {
  DashboardActivity,
  DashboardAlert,
  DashboardData,
  DashboardMetric,
  DashboardPendingAction,
} from "@/actions/dashboard/getDashboardData"

type DashboardCopy = {
  title: string
  eyebrow: string
  stateReady: string
  period: string
  location: string
  generated: string
  viewOwnerWarRoom: string
  proofSource: string
  partialSource: string
  notAvailable: string
  summary(args: {
    organizationName: string
    periodLabel: string
    revenue: string
    cash: string
    stockRisk: string
    actionCount: string
  }): string
  statusTitle: string
  statusDetail: string
  statuses: {
    pos: string
    stock: string
    cash: string
    ap: string
    close: string
    payroll: string
    compliance: string
  }
  statusDetails: {
    posActive: string
    posIdle: string
    stockHealthy: string
    stockRisk: string
    cash: string
    ap: string
    partial: string
  }
  actionTitle: string
  actionDetail: string
  actionEmptyTitle: string
  actionEmptyMessage: string
  evidenceTitle: string
  evidenceDetail: string
  evidenceEmpty: string
  kpiTitle: string
  kpis: {
    revenue: string
    margin: string
    cash: string
    stockRisk: string
    obligations: string
  }
  kpiDetails: {
    revenue: string
    margin: string
    cash: string
    stockRisk: string
    obligations: string
  }
  shortcutsTitle: string
  shortcutsDetail: string
  shortcuts: {
    owner: string
    pos: string
    inventory: string
    finance: string
    payroll: string
    compliance: string
  }
  open: string
  review: string
  dueNow: string
  dueToday: string
  dueScheduled: string
  ownerOps: string
  severity: Record<DashboardPendingAction["severity"], string>
  periods: Record<DashboardData["period"]["key"], string>
  comparison: string
  onboarding: {
    title: string
    detail: string
    progressLabel(args: { completed: string; total: string; percent: string }): string
    actionLabel: string
    status: Record<'complete' | 'in_progress' | 'not_started' | 'optional', string>
    steps: Record<
      | 'company_profile'
      | 'locations'
      | 'roles_permissions'
      | 'inventory_catalog'
      | 'pos_setup'
      | 'finance_accounts'
      | 'payroll_setup'
      | 'proof_checkpoint',
      { title: string; detail: string }
    >
  }
}

export type TodaysOperatingTruthModel = {
  brief: Omit<CommandBriefHeaderProps, "children" | "className">
  status: {
    title: string
    detail: string
    items: StatusStripItem[]
  }
  actionQueue: {
    title: string
    detail: string
    emptyTitle: string
    emptyMessage: string
    items: ActionQueueItemData[]
  }
  evidence: {
    title: string
    detail: string
    emptyMessage: string
    events: EvidenceTimelineEvent[]
  }
  kpis: KpiTileProps[]
  shortcuts: {
    title: string
    detail: string
    actions: CommandCenterAction[]
  }
  onboarding: {
    title: string
    detail: string
    progressValue: number
    progressLabel: string
    steps: OnboardingStepModel[]
  }
}

export type OnboardingStepModel = {
  id: DashboardData['setupProgress']['steps'][number]['key']
  title: string
  detail: string
  stateLabel: string
  tone: DashboardTone
  icon: LucideIcon
  href: string
  actionLabel: string
  required: boolean
}

export type TodaysOperatingTruthInput = {
  dashboard: DashboardData
  locale: string
  dashboardBasePath: string
  selectedLocationLabel: string
}

export function buildTodaysOperatingTruthModel({
  dashboard,
  locale,
  dashboardBasePath,
  selectedLocationLabel,
}: TodaysOperatingTruthInput): TodaysOperatingTruthModel {
  const copy = getDashboardCopy(locale)
  const currency = dashboard.organization.currency || "XAF"
  const periodLabel = copy.periods[dashboard.period.key]
  const stockRiskCount =
    dashboard.stockHealth.lowStock +
    dashboard.stockHealth.outOfStock +
    dashboard.stockHealth.reorderCandidates
  const visibleActionCount = dashboard.pendingActions.reduce((sum, action) => sum + action.count, 0)
  const revenue = formatCurrency(dashboard.kpis.revenue.current, currency, locale)
  const cash = formatCurrency(dashboard.kpis.cashCollected.current, currency, locale)

  return {
    brief: {
      title: copy.title,
      eyebrow: copy.eyebrow,
      summary: copy.summary({
        organizationName: dashboard.organization.name,
        periodLabel,
        revenue,
        cash,
        stockRisk: formatNumber(stockRiskCount, locale),
        actionCount: formatNumber(visibleActionCount, locale),
      }),
      state: {
        label: copy.stateReady,
        tone: dashboard.alerts.some((alert) => alert.type === "critical") ? "danger" : "success",
        icon: dashboard.alerts.some((alert) => alert.type === "critical") ? AlertTriangle : ShieldCheck,
      },
      metadata: [
        { label: copy.period, value: periodLabel, icon: Activity },
        { label: copy.location, value: selectedLocationLabel, icon: Building2 },
        { label: copy.generated, value: formatDateTime(dashboard.generatedAt, locale), icon: ClipboardCheck },
      ],
      actions: [
        {
          label: copy.viewOwnerWarRoom,
          href: resolveDashboardHref("/dashboard/owner-war-room", dashboardBasePath),
          icon: BarChart3,
          variant: "primary",
        },
      ],
      proof: {
        state: "operational",
        source: copy.proofSource,
        sourceCount: countAvailableSources(dashboard),
      },
    },
    status: {
      title: copy.statusTitle,
      detail: copy.statusDetail,
      items: buildStatusItems({ dashboard, copy, currency, locale, dashboardBasePath, stockRiskCount }),
    },
    actionQueue: {
      title: copy.actionTitle,
      detail: copy.actionDetail,
      emptyTitle: copy.actionEmptyTitle,
      emptyMessage: copy.actionEmptyMessage,
      items: buildActionItems({ actions: dashboard.pendingActions, copy, locale, dashboardBasePath }),
    },
    evidence: {
      title: copy.evidenceTitle,
      detail: copy.evidenceDetail,
      emptyMessage: copy.evidenceEmpty,
      events: buildEvidenceEvents({ dashboard, copy, locale, dashboardBasePath }),
    },
    kpis: buildKpis({ dashboard, copy, currency, locale, dashboardBasePath, stockRiskCount }),
    shortcuts: {
      title: copy.shortcutsTitle,
      detail: copy.shortcutsDetail,
      actions: buildShortcuts({ actions: dashboard.pendingActions, copy, dashboardBasePath }),
    },
    onboarding: buildOnboarding({ dashboard, copy, locale, dashboardBasePath }),
  }
}

function getDashboardCopy(locale: string): DashboardCopy {
  if (locale.startsWith("fr")) {
    return {
      title: "Verite operationnelle du jour",
      eyebrow: "Brief de commande",
      stateReady: "Lecture autorisee",
      period: "Periode",
      location: "Lieu",
      generated: "Genere",
      viewOwnerWarRoom: "Ouvrir war room",
      proofSource: "modele lecture dashboard",
      partialSource: "source module a connecter",
      notAvailable: "Non disponible",
      summary: ({ organizationName, periodLabel, revenue, cash, stockRisk, actionCount }) =>
        `${organizationName} sur ${periodLabel}: ${revenue} de revenu, ${cash} encaisse, ${stockRisk} risque(s) stock et ${actionCount} action(s) visibles.`,
      statusTitle: "Etat vivant",
      statusDetail: "Signaux transverses issus du modele lecture dashboard et etats partiels explicites.",
      statuses: {
        pos: "PDV",
        stock: "Stock",
        cash: "Tresorerie",
        ap: "Fournisseurs/AP",
        close: "Cloture",
        payroll: "Paie",
        compliance: "Conformite",
      },
      statusDetails: {
        posActive: "Session(s) POS active(s) dans le perimetre.",
        posIdle: "Aucune session POS active dans le perimetre.",
        stockHealthy: "Aucun signal stock critique dans le modele lecture.",
        stockRisk: "Articles en stock bas, rupture ou reapprovisionnement.",
        cash: "Paiements clients payes sur la periode.",
        ap: "Commandes fournisseurs en attente dans le modele lecture.",
        partial: "Ce module existe, mais son modele lecture detaille n'alimente pas encore ce dashboard.",
      },
      actionTitle: "Actions urgentes",
      actionDetail: "Actions visibles classees par risque et impact operationnel.",
      actionEmptyTitle: "Aucune action visible",
      actionEmptyMessage: "Le modele lecture dashboard ne signale aucune action ouverte pour ce perimetre.",
      evidenceTitle: "Chronologie des preuves",
      evidenceDetail: "Derniers evenements et alertes issus des sources autorisees du dashboard.",
      evidenceEmpty: "Aucun evenement de preuve disponible pour cette periode.",
      kpiTitle: "Indicateurs de decision",
      kpis: {
        revenue: "Revenu",
        margin: "Marge",
        cash: "Encaissements",
        stockRisk: "Risque stock",
        obligations: "Obligations ouvertes",
      },
      kpiDetails: {
        revenue: "Ventes terminees dans la periode.",
        margin: "La marge n'est pas exposee dans ce modele lecture.",
        cash: "Paiements clients payes dans la periode.",
        stockRisk: "Stock bas, ruptures et candidats au reapprovisionnement.",
        obligations: "Commandes clients ouvertes et achats fournisseurs en attente.",
      },
      shortcutsTitle: "Raccourcis utiles",
      shortcutsDetail: "Priorite aux actions visibles, puis aux surfaces centrales.",
      shortcuts: {
        owner: "War room owner",
        pos: "Ouvrir POS",
        inventory: "Inventaire",
        finance: "Finance",
        payroll: "Paie",
        compliance: "Conformite",
      },
      open: "Ouvrir",
      review: "Revoir",
      dueNow: "Maintenant",
      dueToday: "Aujourd'hui",
      dueScheduled: "Planifie",
      ownerOps: "Operations",
      severity: {
        critical: "Critique",
        warning: "Attention",
        info: "Info",
      },
      periods: {
        "7d": "7 derniers jours",
        "30d": "30 derniers jours",
        "90d": "90 derniers jours",
        mtd: "mois en cours",
      },
      comparison: "vs periode precedente",
      onboarding: {
        title: "Mise en route espace",
        detail: "Les premiers reglages qui rendent le tableau utile avant que tout l'historique soit charge.",
        progressLabel: ({ completed, total, percent }) => `${completed}/${total} requis prets - ${percent}%`,
        actionLabel: "Ouvrir",
        status: {
          complete: "Pret",
          in_progress: "En cours",
          not_started: "A faire",
          optional: "Optionnel",
        },
        steps: {
          company_profile: {
            title: "Profil societe OHADA",
            detail: "Nom, devise, pays et identifiants fiscaux donnent le contexte legal.",
          },
          locations: {
            title: "Agences et entrepots",
            detail: "Les ventes, stocks, caisses et preuves restent portes par lieu.",
          },
          roles_permissions: {
            title: "Roles et permissions",
            detail: "Les utilisateurs et roles evitent une mise en route hors controle.",
          },
          inventory_catalog: {
            title: "Catalogue stock",
            detail: "Les articles suivis donnent une base aux alertes, mouvements et valeurs.",
          },
          pos_setup: {
            title: "PDV",
            detail: "Les terminaux preparent les sessions caisse et le premier ticket.",
          },
          finance_accounts: {
            title: "Finance et comptes",
            detail: "Le parametrage comptable prepare comptes, devise et pays OHADA.",
          },
          payroll_setup: {
            title: "Paie",
            detail: "Activez-la quand l'espace doit suivre employes, periodes et preuves paie.",
          },
          proof_checkpoint: {
            title: "Premier point preuve",
            detail: "Une activite ou un evenement met le fil d'assurance en mouvement.",
          },
        },
      },
    }
  }

  return {
    title: "Today's Operating Truth",
    eyebrow: "Command brief",
    stateReady: "Authorized read",
    period: "Period",
    location: "Location",
    generated: "Generated",
    viewOwnerWarRoom: "Open owner war room",
    proofSource: "dashboard read model",
    partialSource: "module source pending",
    notAvailable: "Not available",
    summary: ({ organizationName, periodLabel, revenue, cash, stockRisk, actionCount }) =>
      `${organizationName} for ${periodLabel}: ${revenue} revenue, ${cash} collected, ${stockRisk} stock risk signal(s), and ${actionCount} visible action(s).`,
    statusTitle: "Live operating status",
    statusDetail: "Cross-domain signals from the dashboard read model, with partial states called out.",
    statuses: {
      pos: "POS",
      stock: "Stock",
      cash: "Cash",
      ap: "Suppliers/AP",
      close: "Close",
      payroll: "Payroll",
      compliance: "Compliance",
    },
    statusDetails: {
      posActive: "Active POS session(s) inside this scope.",
      posIdle: "No active POS sessions inside this scope.",
      stockHealthy: "No critical stock signal in the dashboard read model.",
      stockRisk: "Low-stock, out-of-stock, and reorder candidates.",
      cash: "Paid customer payments in the selected period.",
      ap: "Pending purchase orders in the dashboard read model.",
      partial: "This module exists, but its detailed read model is not connected to this dashboard yet.",
    },
    actionTitle: "Urgent action queue",
    actionDetail: "Visible actions ranked by risk and operating impact.",
    actionEmptyTitle: "No visible action is due",
    actionEmptyMessage: "The dashboard read model has no open action for this scope.",
    evidenceTitle: "Evidence timeline",
    evidenceDetail: "Recent events and alerts from authorized dashboard sources.",
    evidenceEmpty: "No evidence event is available for this period.",
    kpiTitle: "Decision KPI strip",
    kpis: {
      revenue: "Revenue",
      margin: "Margin",
      cash: "Cash collected",
      stockRisk: "Stock risk",
      obligations: "Open obligations",
    },
    kpiDetails: {
      revenue: "Completed sales in the selected period.",
      margin: "Margin is not exposed by this dashboard read model yet.",
      cash: "Paid customer payments in the selected period.",
      stockRisk: "Low-stock, out-of-stock, and reorder candidates.",
      obligations: "Open sales orders and pending supplier purchases.",
    },
    shortcutsTitle: "Useful shortcuts",
    shortcutsDetail: "Visible action destinations first, then core command surfaces.",
    shortcuts: {
      owner: "Owner war room",
      pos: "Open POS",
      inventory: "Inventory",
      finance: "Finance",
      payroll: "Payroll",
      compliance: "Compliance",
    },
    open: "Open",
    review: "Review",
    dueNow: "Now",
    dueToday: "Today",
    dueScheduled: "Scheduled",
    ownerOps: "Operations",
    severity: {
      critical: "Critical",
      warning: "Warning",
      info: "Info",
    },
    periods: {
      "7d": "last 7 days",
      "30d": "last 30 days",
      "90d": "last 90 days",
      mtd: "month to date",
    },
    comparison: "vs previous period",
    onboarding: {
      title: "Workspace setup",
      detail: "The first configuration signals that make the dashboard useful before the full operating history exists.",
      progressLabel: ({ completed, total, percent }) => `${completed}/${total} required ready - ${percent}%`,
      actionLabel: "Open",
      status: {
        complete: "Ready",
        in_progress: "In progress",
        not_started: "To do",
        optional: "Optional",
      },
      steps: {
        company_profile: {
          title: "Company and OHADA profile",
          detail: "Name, currency, country, and tax context anchor the legal workspace.",
        },
        locations: {
          title: "Locations and warehouses",
          detail: "Sales, stock, drawers, and evidence stay scoped by branch or store.",
        },
        roles_permissions: {
          title: "Roles and permissions",
          detail: "Users and roles keep first-run work controlled instead of shared informally.",
        },
        inventory_catalog: {
          title: "Inventory starter catalog",
          detail: "Tracked items give alerts, movements, and valuation something real to explain.",
        },
        pos_setup: {
          title: "POS setup",
          detail: "Terminals prepare cashier sessions, receipts, and the first sale proof.",
        },
        finance_accounts: {
          title: "Finance and accounts",
          detail: "Accounting setup prepares currency, accounts, and OHADA country context.",
        },
        payroll_setup: {
          title: "Payroll setup",
          detail: "Enable it when the workspace needs employees, periods, and payroll proof.",
        },
        proof_checkpoint: {
          title: "First proof checkpoint",
          detail: "An activity or business event starts the assurance trail.",
        },
      },
    },
  }
}

function buildStatusItems({
  dashboard,
  copy,
  currency,
  locale,
  dashboardBasePath,
  stockRiskCount,
}: {
  dashboard: DashboardData
  copy: DashboardCopy
  currency: string
  locale: string
  dashboardBasePath: string
  stockRiskCount: number
}): StatusStripItem[] {
  const apCount = dashboard.counts.pendingPurchaseOrders

  return [
    {
      id: "pos",
      label: copy.statuses.pos,
      value: formatNumber(dashboard.counts.activeSessions, locale),
      detail: dashboard.counts.activeSessions > 0 ? copy.statusDetails.posActive : copy.statusDetails.posIdle,
      tone: dashboard.counts.activeSessions > 0 ? "spruce" : "muted",
      icon: ShoppingCart,
      href: resolveDashboardHref("/dashboard/pos", dashboardBasePath),
      proof: { state: "operational", source: copy.proofSource },
    },
    {
      id: "stock",
      label: copy.statuses.stock,
      value: formatNumber(stockRiskCount, locale),
      detail: stockRiskCount > 0 ? copy.statusDetails.stockRisk : copy.statusDetails.stockHealthy,
      tone: stockRiskCount > 0 ? "warning" : "success",
      icon: Package,
      href: resolveDashboardHref("/dashboard/inventory", dashboardBasePath),
      proof: { state: "operational", source: copy.proofSource },
    },
    {
      id: "cash",
      label: copy.statuses.cash,
      value: formatCurrency(dashboard.kpis.cashCollected.current, currency, locale),
      detail: copy.statusDetails.cash,
      tone: dashboard.kpis.cashCollected.current > 0 ? "success" : "info",
      icon: CreditCard,
      href: resolveDashboardHref("/dashboard/finance/payments", dashboardBasePath),
      proof: { state: "operational", source: copy.proofSource },
    },
    {
      id: "ap",
      label: copy.statuses.ap,
      value: formatNumber(apCount, locale),
      detail: copy.statusDetails.ap,
      tone: apCount > 0 ? "warning" : "success",
      icon: Building2,
      href: resolveDashboardHref("/dashboard/finance/payables", dashboardBasePath),
      proof: { state: "operational", source: copy.proofSource },
    },
    partialStatus("close", copy.statuses.close, "/dashboard/accounting/close", ClipboardCheck, copy, dashboardBasePath),
    partialStatus("payroll", copy.statuses.payroll, "/dashboard/payroll", Users, copy, dashboardBasePath),
    partialStatus("compliance", copy.statuses.compliance, "/dashboard/compliance", ShieldCheck, copy, dashboardBasePath),
  ]
}

function partialStatus(
  id: string,
  label: string,
  href: string,
  icon: LucideIcon,
  copy: DashboardCopy,
  dashboardBasePath: string,
): StatusStripItem {
  return {
    id,
    label,
    value: copy.notAvailable,
    detail: copy.statusDetails.partial,
    tone: "gold",
    icon,
    href: resolveDashboardHref(href, dashboardBasePath),
    proof: { state: "unavailable", source: copy.partialSource },
  }
}

function buildActionItems({
  actions,
  copy,
  locale,
  dashboardBasePath,
}: {
  actions: DashboardPendingAction[]
  copy: DashboardCopy
  locale: string
  dashboardBasePath: string
}): ActionQueueItemData[] {
  return [...actions]
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
    .map((action) => ({
      id: action.id,
      title: action.label,
      summary: `${formatNumber(action.count, locale)} ${action.label.toLowerCase()}`,
      riskLabel: copy.severity[action.severity],
      tone: severityToTone(action.severity),
      owner: copy.ownerOps,
      due:
        action.severity === "critical"
          ? copy.dueNow
          : action.severity === "warning"
            ? copy.dueToday
            : copy.dueScheduled,
      action: {
        label: copy.review,
        href: resolveDashboardHref(action.href, dashboardBasePath),
        icon: AlertTriangle,
      },
      proof: {
        state: severityToProofState(action.severity),
        source: copy.proofSource,
      },
    }))
}

function buildEvidenceEvents({
  dashboard,
  copy,
  locale,
  dashboardBasePath,
}: {
  dashboard: DashboardData
  copy: DashboardCopy
  locale: string
  dashboardBasePath: string
}): EvidenceTimelineEvent[] {
  const alertEvents = dashboard.alerts.slice(0, 2).map((alert) => ({
    id: `alert-${alert.id}`,
    title: alert.title,
    summary: alert.description,
    timestamp: formatDateTime(dashboard.generatedAt, locale),
    source: copy.proofSource,
    stateLabel: copy.severity[alertToSeverity(alert)],
    tone: alertToTone(alert),
    proof: { state: alertToProofState(alert), source: copy.proofSource },
    href: resolveDashboardHref(alert.href, dashboardBasePath),
  }))

  const activityEvents = dashboard.activities.slice(0, 5).map((activity) => ({
    id: `activity-${activity.id}`,
    title: activity.title,
    summary: activity.description,
    timestamp: formatDateTime(activity.timestamp, locale),
    source: activity.type,
    stateLabel: activity.status,
    tone: activityStatusToTone(activity),
    proof: { state: "operational" as ProofBadgeState, source: copy.proofSource },
    href: resolveDashboardHref(activity.href, dashboardBasePath),
  }))

  return [...alertEvents, ...activityEvents].slice(0, 5)
}

function buildKpis({
  dashboard,
  copy,
  currency,
  locale,
  dashboardBasePath,
  stockRiskCount,
}: {
  dashboard: DashboardData
  copy: DashboardCopy
  currency: string
  locale: string
  dashboardBasePath: string
  stockRiskCount: number
}): KpiTileProps[] {
  const obligations = dashboard.counts.openSalesOrders + dashboard.counts.pendingPurchaseOrders

  return [
    metricKpi({
      label: copy.kpis.revenue,
      value: formatCurrency(dashboard.kpis.revenue.current, currency, locale),
      detail: copy.kpiDetails.revenue,
      metric: dashboard.kpis.revenue,
      locale,
      tone: "success",
      icon: DollarSign,
      href: "/dashboard/finance/sales",
      dashboardBasePath,
      copy,
    }),
    {
      label: copy.kpis.margin,
      value: copy.notAvailable,
      detail: copy.kpiDetails.margin,
      tone: "muted",
      icon: TrendingUp,
      proof: { state: "unavailable", source: copy.partialSource },
      action: {
        label: copy.open,
        href: resolveDashboardHref("/dashboard/finance/profitability", dashboardBasePath),
      },
    },
    metricKpi({
      label: copy.kpis.cash,
      value: formatCurrency(dashboard.kpis.cashCollected.current, currency, locale),
      detail: copy.kpiDetails.cash,
      metric: dashboard.kpis.cashCollected,
      locale,
      tone: "brand",
      icon: CreditCard,
      href: "/dashboard/finance/payments",
      dashboardBasePath,
      copy,
    }),
    {
      label: copy.kpis.stockRisk,
      value: formatNumber(stockRiskCount, locale),
      detail: copy.kpiDetails.stockRisk,
      tone: stockRiskCount > 0 ? "warning" : "success",
      icon: Package,
      proof: { state: "operational", source: copy.proofSource },
      action: {
        label: copy.open,
        href: resolveDashboardHref("/dashboard/inventory", dashboardBasePath),
      },
    },
    {
      label: copy.kpis.obligations,
      value: formatNumber(obligations, locale),
      detail: copy.kpiDetails.obligations,
      tone: obligations > 0 ? "gold" : "success",
      icon: Building2,
      proof: { state: "operational", source: copy.proofSource },
      action: {
        label: copy.open,
        href: resolveDashboardHref("/dashboard/purchases", dashboardBasePath),
      },
    },
  ]
}

function metricKpi({
  label,
  value,
  detail,
  metric,
  locale,
  tone,
  icon,
  href,
  dashboardBasePath,
  copy,
}: {
  label: string
  value: string
  detail: string
  metric: DashboardMetric
  locale: string
  tone: DashboardTone
  icon: LucideIcon
  href: string
  dashboardBasePath: string
  copy: DashboardCopy
}): KpiTileProps {
  return {
    label,
    value,
    detail,
    tone,
    icon,
    trend: {
      label: `${formatChange(metric.change, locale)} ${copy.comparison}`,
      tone: metric.change < 0 ? "danger" : metric.change > 0 ? "success" : "muted",
    },
    proof: { state: "operational", source: copy.proofSource },
    action: {
      label: copy.open,
      href: resolveDashboardHref(href, dashboardBasePath),
    },
  }
}

function buildShortcuts({
  actions,
  copy,
  dashboardBasePath,
}: {
  actions: DashboardPendingAction[]
  copy: DashboardCopy
  dashboardBasePath: string
}): CommandCenterAction[] {
  const prioritized = [...actions]
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
    .slice(0, 3)
    .map((action) => ({
      label: action.label,
      href: resolveDashboardHref(action.href, dashboardBasePath),
      icon: AlertTriangle,
      variant: "secondary" as const,
    }))

  const core: CommandCenterAction[] = [
    { label: copy.shortcuts.owner, href: resolveDashboardHref("/dashboard/owner-war-room", dashboardBasePath), icon: BarChart3 },
    { label: copy.shortcuts.pos, href: resolveDashboardHref("/dashboard/pos", dashboardBasePath), icon: ShoppingCart },
    { label: copy.shortcuts.inventory, href: resolveDashboardHref("/dashboard/inventory", dashboardBasePath), icon: Package },
    { label: copy.shortcuts.finance, href: resolveDashboardHref("/dashboard/finance", dashboardBasePath), icon: CreditCard },
    { label: copy.shortcuts.payroll, href: resolveDashboardHref("/dashboard/payroll", dashboardBasePath), icon: Users },
    { label: copy.shortcuts.compliance, href: resolveDashboardHref("/dashboard/compliance", dashboardBasePath), icon: ShieldCheck },
  ]

  const seen = new Set<string>()
  return [...prioritized, ...core].filter((action) => {
    if (!action.href || seen.has(action.href)) return false
    seen.add(action.href)
    return true
  }).slice(0, 8)
}

function buildOnboarding({
  dashboard,
  copy,
  locale,
  dashboardBasePath,
}: {
  dashboard: DashboardData
  copy: DashboardCopy
  locale: string
  dashboardBasePath: string
}): TodaysOperatingTruthModel["onboarding"] {
  const progress = dashboard.setupProgress

  return {
    title: copy.onboarding.title,
    detail: copy.onboarding.detail,
    progressValue: progress.percent,
    progressLabel: copy.onboarding.progressLabel({
      completed: formatNumber(progress.completedRequiredSteps, locale),
      total: formatNumber(progress.totalRequiredSteps, locale),
      percent: formatNumber(progress.percent, locale),
    }),
    steps: progress.steps.map((step) => ({
      id: step.key,
      title: copy.onboarding.steps[step.key].title,
      detail: copy.onboarding.steps[step.key].detail,
      stateLabel: copy.onboarding.status[step.status],
      tone: setupStatusTone(step.status),
      icon: setupStepIcon(step.key),
      href: resolveDashboardHref(step.href, dashboardBasePath),
      actionLabel: copy.onboarding.actionLabel,
      required: step.required,
    })),
  }
}

function setupStatusTone(status: DashboardData["setupProgress"]["steps"][number]["status"]): DashboardTone {
  if (status === "complete") return "success"
  if (status === "in_progress") return "gold"
  if (status === "optional") return "muted"
  return "info"
}

function setupStepIcon(key: DashboardData["setupProgress"]["steps"][number]["key"]): LucideIcon {
  if (key === "company_profile" || key === "locations") return Building2
  if (key === "roles_permissions" || key === "payroll_setup") return Users
  if (key === "inventory_catalog") return Package
  if (key === "pos_setup") return ShoppingCart
  if (key === "finance_accounts") return CreditCard
  return ShieldCheck
}

function severityRank(severity: DashboardPendingAction["severity"]) {
  if (severity === "critical") return 0
  if (severity === "warning") return 1
  return 2
}

function severityToTone(severity: DashboardPendingAction["severity"]): DashboardTone {
  if (severity === "critical") return "danger"
  if (severity === "warning") return "warning"
  return "info"
}

function severityToProofState(severity: DashboardPendingAction["severity"]): ProofBadgeState {
  if (severity === "critical") return "blocked"
  if (severity === "warning") return "pending"
  return "operational"
}

function alertToSeverity(alert: DashboardAlert): DashboardPendingAction["severity"] {
  if (alert.type === "critical") return "critical"
  if (alert.type === "warning") return "warning"
  return "info"
}

function alertToTone(alert: DashboardAlert): DashboardTone {
  if (alert.type === "critical") return "danger"
  if (alert.type === "warning") return "warning"
  if (alert.type === "success") return "success"
  return "info"
}

function alertToProofState(alert: DashboardAlert): ProofBadgeState {
  if (alert.type === "critical") return "blocked"
  if (alert.type === "warning") return "pending"
  if (alert.type === "success") return "verified"
  return "operational"
}

function activityStatusToTone(activity: DashboardActivity): DashboardTone {
  if (activity.status === "success") return "success"
  if (activity.status === "warning") return "warning"
  return "info"
}

function countAvailableSources(dashboard: DashboardData) {
  return [
    dashboard.kpis.revenue.current || dashboard.kpis.orders.current,
    dashboard.kpis.cashCollected.current,
    dashboard.stockHealth.trackedItems,
    dashboard.counts.pendingPurchaseOrders,
    dashboard.activities.length,
  ].filter(Boolean).length
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCurrency(value: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "XAF" ? 0 : 2,
  }).format(value)
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function formatChange(value: number, locale: string) {
  const formatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })

  return `${value > 0 ? "+" : ""}${formatter.format(value)}%`
}

function resolveDashboardHref(href: string | undefined, dashboardBasePath: string) {
  if (!href) return dashboardBasePath
  if (href === "/dashboard") return dashboardBasePath
  if (href.startsWith("/dashboard/")) {
    return `${dashboardBasePath}${href.slice("/dashboard".length)}`
  }
  return href
}
