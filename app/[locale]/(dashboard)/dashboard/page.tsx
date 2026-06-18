import { getAllDashboardData } from "@/actions/dashboard/getDashboardData";
import EnhancedEnterpriseDashboard, {
  type EnterpriseDashboardLabels,
} from '@/components/dashboard/EnhancedEnterpriseDashboard';
import { SessionRecoverySignOutButton } from "@/components/dashboard/SessionRecoverySignOutButton";
import { ErrorBoundary } from '@/config/error-boundary';
import { localizePath, pickLocale } from "@/i18n/routing";
import { RbacError, requireRbacContext } from "@/lib/security/rbac";
import { Package } from "lucide-react";
import { redirect } from "next/navigation";

function isRecoverableDashboardSessionError(error: unknown) {
  if (error instanceof RbacError) {
    return error.code === "NO_ACTIVE_ORG" || error.code === "FORBIDDEN"
  }

  const message = error instanceof Error ? error.message : ''

  return (
    message.includes('organization that is no longer available') ||
    message.includes('Organization not found')
  )
}

function DashboardSessionRecovery({ locale }: { locale: 'en' | 'fr' }) {
  const copy =
    locale === 'fr'
      ? {
          title: 'Session a actualiser',
          description:
            "Votre session pointe vers une organisation qui n'existe plus dans cette base de donnees.",
          action: 'Se deconnecter',
        }
      : {
          title: 'Refresh your session',
          description:
            'Your session points to an organization that no longer exists in this database.',
          action: 'Sign out',
        }

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto w-full max-w-[88rem] px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-md py-16 text-center">
          <div className="dashboard-glass-panel rounded-lg px-6 py-12">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-danger-soft)]">
              <Package className="h-8 w-8 text-[var(--dash-danger)]" />
            </div>
            <h3 className="mb-3 text-xl font-semibold text-[var(--dash-text)]">{copy.title}</h3>
            <p className="mb-6 text-sm leading-6 text-[var(--dash-text-soft)]">{copy.description}</p>
            <SessionRecoverySignOutButton label={copy.action} locale={locale} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  const messages = (await import(`@/messages/${locale}.json`)).default as {
    enterpriseDashboard: EnterpriseDashboardLabels
  }
  let user

  try {
    user = (await requireRbacContext()).user
  } catch (error) {
    if (error instanceof RbacError && error.code === "UNAUTHENTICATED") {
      redirect(localizePath("/login", locale))
    }
    if (isRecoverableDashboardSessionError(error)) {
      return <DashboardSessionRecovery locale={locale} />
    }

    throw error
  }

  if (!user?.organizationId) {
    return <DashboardSessionRecovery locale={locale} />
  }

  const organizationId = user.organizationId

  let dashboardData

  try {
    dashboardData = await getAllDashboardData(organizationId)
  } catch (error) {
    if (isRecoverableDashboardSessionError(error)) {
      return <DashboardSessionRecovery locale={locale} />
    }

    throw error
  }

  return (
    <ErrorBoundary>
      <EnhancedEnterpriseDashboard
        organizationId={dashboardData.organization.id}
        dashboardData={dashboardData}
        labels={messages.enterpriseDashboard}
        locale={locale}
        dashboardBasePath={localizePath("/dashboard", locale)}
      />
    </ErrorBoundary>
  )
}
