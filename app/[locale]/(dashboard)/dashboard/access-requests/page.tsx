import AccessRequests from "@/components/access-requests/AccessRequests"
import { requireRbacContext } from "@/lib/security/rbac"
import { accessTargetInput } from "@/services/access-requests/access-request-contracts"
import { pickLocale } from "@/i18n/routing"

// Own-request access requires a valid organization session, not member-directory
// or target permissions. Each service independently checks review authority.
export default async function AccessRequestsPage({ params, searchParams }: {
  params: Promise<{ locale: string }>; searchParams: Promise<{ target?: string | string[] }>
}) {
  const ctx = await requireRbacContext()
  const locale = pickLocale((await params).locale)
  const target = accessTargetInput.safeParse((await searchParams).target)
  return <AccessRequests key={JSON.stringify([ctx.orgId, ctx.userId, ctx.permissions, target.success ? target.data : null])} locale={locale} initialTarget={target.success ? target.data : undefined} />
}
