import { getAllDashboardData } from "@/actions/dashboard/getDashboardData";
import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState";
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState";
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
    // FORBIDDEN also represents ordinary permission denial. Only this existing
    // RBAC discriminator identifies a stale organization binding.
    return error.code === "NO_ACTIVE_ORG" ||
      (error.code === "FORBIDDEN" && error.message === "Session organization is stale")
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
          title: 'Session à actualiser',
          description:
            "Votre organisation active n’est pas disponible pour cette session. Reconnectez-vous. Si le problème persiste, contactez votre administrateur.",
          action: 'Se déconnecter',
        }
      : {
          title: 'Refresh your session',
          description:
            'Your active organization is unavailable for this session. Sign in again. If the problem continues, contact your administrator.',
          action: 'Sign out',
        }

  return (
    <DashboardErrorState
      locale={locale}
      error={copy.description}
      title={copy.title}
      message={copy.description}
      actions={<SessionRecoverySignOutButton label={copy.action} locale={locale} />}
    />
  )
}

function DashboardPermissionDenied({ locale }: { locale: 'en' | 'fr' }) {
  return (
    <DashboardRouteState
      kind="permission_denied"
      embedded
      locale={locale}
      title={locale === 'fr' ? 'Accès au tableau de bord limité' : 'Dashboard access is limited'}
      message={locale === 'fr'
        ? 'Vos autorisations actuelles ne permettent pas d’ouvrir ce tableau de bord. Choisissez un espace disponible dans la navigation ou examinez vos accès.'
        : 'Your current permissions do not allow this dashboard. Choose an available workspace from the navigation or review your access.'}
      primaryHref={localizePath('/dashboard/access-requests', locale)}
      primaryLabel={locale === 'fr' ? 'Examiner mes accès' : 'Review my access'}
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
    if (error instanceof RbacError && error.code === "FORBIDDEN") {
      return <DashboardPermissionDenied locale={locale} />
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
    if (error instanceof RbacError && error.code === "UNAUTHENTICATED") {
      redirect(localizePath("/login", locale))
    }
    if (isRecoverableDashboardSessionError(error)) {
      return <DashboardSessionRecovery locale={locale} />
    }
    if (error instanceof RbacError && error.code === "FORBIDDEN") {
      return <DashboardPermissionDenied locale={locale} />
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
