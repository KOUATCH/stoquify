"use client"

import type { ReactNode } from "react"
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  CreditCard,
  Edit3,
  Languages,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  RefreshCw,
  ShoppingCart,
  UserRound,
  Wallet,
} from "lucide-react"

import { CustomerQuickActions } from "@/components/customers/CustomerQuickActions"
import {
  CommandBriefHeader,
  RouteStatePanel,
  StatusStrip,
  dashboardEmptyClass,
  dashboardPanelClass,
  dashboardRowClass,
  dashboardToneClass,
} from "@/components/dashboard/primitives/command-center-primitives"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCustomerAnalyticsData } from "@/hooks/useCustomerManagement"
import type { Locale } from "@/types/bilingual"

export type CustomerProfileCapabilities = {
  canCreateStatement: boolean
  canExport: boolean
  canOpenSales: boolean
  canUpdate: boolean
  canViewOrders: boolean
}

const copy = {
  en: {
    eyebrow: "Customer operating profile",
    summary: "Review customer identity, sales activity, receivable exposure, payments, and the next permitted actions.",
    active: "Active",
    inactive: "Inactive",
    back: "Back to customers",
    edit: "Edit customer",
    orders: "View orders",
    statement: "Create statement",
    refresh: "Refresh profile",
    trusted: "Service-owned customer read model",
    source: "Customer analytics",
    customerCode: "Customer code",
    preferredLanguage: "Preferred language",
    statusTitle: "Customer operating state",
    statusDetail: "Live customer, order, and receivable signals from the tenant-scoped read model.",
    salesOrders: "Sales orders",
    openOrders: "Open orders",
    unpaidOrders: "Unpaid orders",
    receivable: "Receivable",
    profile: "Customer details",
    commercial: "Commercial terms",
    paymentTerms: "Payment terms",
    creditLimit: "Credit limit",
    currentBalance: "Current balance",
    days: "days",
    noCode: "No customer code",
    noEmail: "No email recorded",
    noPhone: "No phone recorded",
    noAddress: "No address recorded",
    noTaxId: "No tax ID recorded",
    taxId: "Tax ID",
    recentOrders: "Recent orders",
    recentLedger: "Recent receivable activity",
    recentPayments: "Recent payments",
    noOrders: "No sales orders are recorded for this customer.",
    noLedger: "No receivable ledger activity is recorded for this customer.",
    noPayments: "No payments are recorded for this customer.",
    loadErrorTitle: "Customer profile unavailable",
    loadErrorBody: "The protected customer read model could not be loaded. Retry or return to the customer list.",
    missingTitle: "Customer not found",
    missingBody: "This customer is not available in the active organization.",
    retry: "Try again",
  },
  fr: {
    eyebrow: "Profil opérationnel client",
    summary: "Consultez l’identité, les ventes, l’exposition des créances, les paiements et les prochaines actions autorisées.",
    active: "Actif",
    inactive: "Inactif",
    back: "Retour aux clients",
    edit: "Modifier le client",
    orders: "Voir les commandes",
    statement: "Créer un relevé",
    refresh: "Actualiser le profil",
    trusted: "Modèle de lecture client géré par le service",
    source: "Analyse client",
    customerCode: "Code client",
    preferredLanguage: "Langue préférée",
    statusTitle: "État opérationnel du client",
    statusDetail: "Signaux client, commandes et créances du modèle de lecture rattaché à l’organisation.",
    salesOrders: "Commandes",
    openOrders: "Commandes ouvertes",
    unpaidOrders: "Commandes impayées",
    receivable: "Créance",
    profile: "Informations client",
    commercial: "Conditions commerciales",
    paymentTerms: "Délai de paiement",
    creditLimit: "Limite de crédit",
    currentBalance: "Solde courant",
    days: "jours",
    noCode: "Aucun code client",
    noEmail: "Aucun e-mail renseigné",
    noPhone: "Aucun téléphone renseigné",
    noAddress: "Aucune adresse renseignée",
    noTaxId: "Aucun identifiant fiscal",
    taxId: "Identifiant fiscal",
    recentOrders: "Commandes récentes",
    recentLedger: "Activité récente des créances",
    recentPayments: "Paiements récents",
    noOrders: "Aucune commande n’est enregistrée pour ce client.",
    noLedger: "Aucune activité de créance n’est enregistrée pour ce client.",
    noPayments: "Aucun paiement n’est enregistré pour ce client.",
    loadErrorTitle: "Profil client indisponible",
    loadErrorBody: "Le modèle de lecture client protégé n’a pas pu être chargé. Réessayez ou revenez à la liste.",
    missingTitle: "Client introuvable",
    missingBody: "Ce client n’est pas disponible dans l’organisation active.",
    retry: "Réessayer",
  },
} as const

export function CustomerProfilePage({
  organizationId,
  customerId,
  locale,
  currency,
  capabilities,
}: {
  organizationId: string
  customerId: string
  locale: Locale
  currency: string
  capabilities: CustomerProfileCapabilities
}) {
  const t = copy[locale]
  const basePath = `/${locale}/dashboard/customers`
  const analyticsQuery = useCustomerAnalyticsData(organizationId, customerId)

  if (analyticsQuery.isLoading) {
    return <CustomerProfileState kind="loading" />
  }

  if (analyticsQuery.isError) {
    return (
      <CustomerProfileState
        kind="error"
        title={t.loadErrorTitle}
        message={t.loadErrorBody}
        backHref={basePath}
        backLabel={t.back}
      />
    )
  }

  if (!analyticsQuery.data?.customer) {
    return (
      <CustomerProfileState
        kind="empty"
        title={t.missingTitle}
        message={t.missingBody}
        backHref={basePath}
        backLabel={t.back}
      />
    )
  }

  const { customer, salesOrders, ledgerEntries, payments } = analyticsQuery.data
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  const formatDate = (value: Date | string | null | undefined) => {
    if (!value) return "—"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "—"
    return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
      dateStyle: "medium",
    }).format(date)
  }
  const overLimit =
    customer.creditLimit !== null && customer.currentBalance > customer.creditLimit

  const actions = [
    { label: t.back, href: basePath, icon: ArrowLeft, variant: "secondary" as const },
    ...(capabilities.canUpdate
      ? [{ label: t.edit, href: `${basePath}/${customer.id}/edit`, icon: Edit3, variant: "primary" as const }]
      : []),
    ...(capabilities.canViewOrders
      ? [{ label: t.orders, href: `${basePath}/${customer.id}/orders`, icon: ShoppingCart, variant: "secondary" as const }]
      : []),
    ...(capabilities.canCreateStatement
      ? [{ label: t.statement, href: `${basePath}/${customer.id}/statement`, icon: ReceiptText, variant: "secondary" as const }]
      : []),
    {
      label: t.refresh,
      onClick: () => {
        void analyticsQuery.refetch()
      },
      icon: RefreshCw,
      variant: "secondary" as const,
    },
  ]

  return (
    <div className="dashboard-landing-theme min-h-screen overflow-x-hidden text-[var(--dash-text)]">
      <main className="dashboard-landing-content mx-auto flex w-full max-w-[92rem] flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
        <CommandBriefHeader
          eyebrow={t.eyebrow}
          title={customer.name}
          summary={t.summary}
          state={{
            label: customer.isActive ? t.active : t.inactive,
            tone: customer.isActive ? "success" : "muted",
            icon: BadgeCheck,
          }}
          metadata={[
            { label: t.customerCode, value: customer.code ?? t.noCode, icon: UserRound },
            { label: t.preferredLanguage, value: customer.preferredLocale, icon: Languages },
          ]}
          actions={actions}
          proof={{ state: "operational", label: t.trusted, source: t.source }}
        />

        <StatusStrip
          title={t.statusTitle}
          detail={t.statusDetail}
          items={[
            {
              id: "orders",
              label: t.salesOrders,
              value: customer.salesOrdersCount,
              detail: `${customer.openSalesOrdersCount} ${t.openOrders.toLocaleLowerCase()}`,
              tone: "brand",
              icon: ShoppingCart,
              href: capabilities.canViewOrders ? `${basePath}/${customer.id}/orders` : undefined,
            },
            {
              id: "open-orders",
              label: t.openOrders,
              value: customer.openSalesOrdersCount,
              detail: customer.openSalesOrdersCount > 0 ? t.statusDetail : "—",
              tone: customer.openSalesOrdersCount > 0 ? "gold" : "success",
              icon: CalendarClock,
            },
            {
              id: "unpaid-orders",
              label: t.unpaidOrders,
              value: customer.unpaidSalesOrdersCount,
              detail: customer.unpaidSalesOrdersCount > 0 ? formatCurrency(customer.currentBalance) : "—",
              tone: customer.unpaidSalesOrdersCount > 0 ? "warning" : "success",
              icon: CreditCard,
            },
            {
              id: "receivable",
              label: t.receivable,
              value: formatCurrency(customer.currentBalance),
              detail: overLimit ? `${t.creditLimit}: ${formatCurrency(customer.creditLimit ?? 0)}` : t.currentBalance,
              tone: overLimit ? "danger" : "spruce",
              icon: Wallet,
            },
          ]}
        />

        <div className="grid min-w-0 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-5">
            <CustomerQuickActions
              customer={{
                id: customer.id,
                name: customer.name,
                email: customer.email ?? undefined,
                phone: customer.phone ?? undefined,
                isActive: customer.isActive,
                totalOrders: customer.salesOrdersCount,
              }}
              capabilities={capabilities}
              currentPage="profile"
            />

            <Card className={dashboardPanelClass}>
              <CardHeader>
                <CardTitle className="text-base text-[var(--dash-text)]">{t.profile}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <ProfileLine icon={Mail} label={t.profile} value={customer.email ?? t.noEmail} />
                <ProfileLine icon={Phone} label={t.profile} value={customer.phone ?? t.noPhone} />
                <ProfileLine icon={MapPin} label={t.profile} value={customer.address ?? t.noAddress} />
                <ProfileLine icon={ReceiptText} label={t.taxId} value={customer.taxId ?? t.noTaxId} />
              </CardContent>
            </Card>

            <Card className={dashboardPanelClass}>
              <CardHeader>
                <CardTitle className="text-base text-[var(--dash-text)]">{t.commercial}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <ProfileLine icon={CalendarClock} label={t.paymentTerms} value={`${customer.paymentTerms ?? 0} ${t.days}`} />
                <ProfileLine icon={Wallet} label={t.creditLimit} value={customer.creditLimit === null ? "—" : formatCurrency(customer.creditLimit)} />
                <ProfileLine icon={CreditCard} label={t.currentBalance} value={formatCurrency(customer.currentBalance)} tone={overLimit ? "danger" : "success"} />
              </CardContent>
            </Card>
          </div>

          <div className="grid min-w-0 gap-5 lg:grid-cols-3">
            <ActivityCard
              title={t.recentOrders}
              icon={ShoppingCart}
              emptyMessage={t.noOrders}
              items={salesOrders.map((order) => ({
                id: order.id,
                title: order.orderNumber,
                meta: `${order.status} · ${order.paymentStatus} · ${formatDate(order.orderDate)}`,
                value: formatCurrency(order.total),
                tone: order.paymentStatus === "PAID" ? "success" : "gold",
              }))}
            />
            <ActivityCard
              title={t.recentLedger}
              icon={Wallet}
              emptyMessage={t.noLedger}
              items={ledgerEntries.map((entry) => ({
                id: entry.id,
                title: entry.type,
                meta: `${formatDate(entry.entryDate)} · ${entry.description}`,
                value: formatCurrency(entry.balanceAfter),
                tone: entry.balanceAfter > 0 ? "warning" : "success",
              }))}
            />
            <ActivityCard
              title={t.recentPayments}
              icon={CreditCard}
              emptyMessage={t.noPayments}
              items={payments.map((payment) => ({
                id: payment.id,
                title: payment.paymentNumber,
                meta: `${payment.method} · ${payment.status} · ${formatDate(payment.processedAt ?? payment.createdAt)}`,
                value: formatCurrency(payment.amount),
                tone: payment.status === "COMPLETED" ? "success" : "info",
              }))}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

function ProfileLine({
  icon: Icon,
  label,
  value,
  tone = "muted",
}: {
  icon: typeof Mail
  label: string
  value: ReactNode
  tone?: "muted" | "success" | "danger"
}) {
  return (
    <div className={`${dashboardRowClass} flex min-w-0 items-start gap-3 p-3`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${dashboardToneClass(tone)}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[var(--dash-text-soft)]">{label}</p>
        <p className="break-words text-sm text-[var(--dash-text)]">{value}</p>
      </div>
    </div>
  )
}

function ActivityCard({
  title,
  icon: Icon,
  items,
  emptyMessage,
}: {
  title: string
  icon: typeof ShoppingCart
  items: Array<{ id: string; title: string; meta: string; value: string; tone: "success" | "gold" | "warning" | "info" }>
  emptyMessage: string
}) {
  return (
    <Card className={`${dashboardPanelClass} min-w-0`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-[var(--dash-text)]">
          <Icon className="h-4 w-4 text-[var(--dash-brand-strong)]" aria-hidden="true" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length ? (
          <div className="space-y-3">
            {items.map((item) => (
              <article key={item.id} className={`${dashboardRowClass} min-w-0 p-3`}>
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <h3 className="min-w-0 truncate text-sm font-semibold text-[var(--dash-text)]">{item.title}</h3>
                  <Badge variant="outline" className={`shrink-0 rounded-md ${dashboardToneClass(item.tone)}`}>{item.value}</Badge>
                </div>
                <p className="mt-2 break-words text-xs leading-5 text-[var(--dash-text-soft)]">{item.meta}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className={dashboardEmptyClass}>{emptyMessage}</div>
        )}
      </CardContent>
    </Card>
  )
}

function CustomerProfileState({
  kind,
  title,
  message,
  backHref,
  backLabel,
}: {
  kind: "loading" | "error" | "empty"
  title?: string
  message?: string
  backHref?: string
  backLabel?: string
}) {
  return (
    <div className="dashboard-landing-theme min-h-screen overflow-x-hidden text-[var(--dash-text)]">
      <main className="dashboard-landing-content mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <RouteStatePanel
          kind={kind}
          title={title}
          message={message}
          action={backHref && backLabel ? { label: backLabel, href: backHref, icon: ArrowLeft } : undefined}
        />
      </main>
    </div>
  )
}
