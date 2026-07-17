import { getAllDashboardData } from "@/actions/dashboard/getDashboardData";
import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState";
import EnhancedEnterpriseDashboard, {
  type EnterpriseDashboardLabels,
} from '@/components/dashboard/EnhancedEnterpriseDashboard';
import { SessionRecoverySignOutButton } from "@/components/dashboard/SessionRecoverySignOutButton";
import { ErrorBoundary } from '@/config/error-boundary';
import { localizePath, pickLocale } from "@/i18n/routing";
import { RbacError, requireRbacContext } from "@/lib/security/rbac";
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
    <DashboardErrorState
      error={copy.description}
      title={copy.title}
      message={copy.description}
      actions={<SessionRecoverySignOutButton label={copy.action} locale={locale} />}
    />
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
