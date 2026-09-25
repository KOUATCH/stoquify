import InvitedUserRegistration from "@/components/Forms/InvitedUserRegistration"
import { AuthV2Shell } from "@/components/auth/v2/AuthV2Shell"
import { localizePath, pickLocale } from "@/i18n/routing"
import { getInviteRegistrationContext } from "@/services/users/user-identity.service"

export const dynamic = "force-dynamic"

export default async function Page({ params, searchParams }: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const locale = pickLocale((await params).locale)
  const tokenParam = (await searchParams).token
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam
  const alternatePath = "/user-invite/invitation" + (token ? "?token=" + encodeURIComponent(token) : "")
  let invite = { email: "", roleName: "", organizationName: "", isValidInvite: false }, loadFailed = false
  try { invite = await getInviteRegistrationContext(token, locale) }
  catch { loadFailed = true }

  return <AuthV2Shell locale={locale} variant="invite" alternatePath={alternatePath}>
    <InvitedUserRegistration key={token ?? ""} locale={locale} token={token ?? ""} email={invite.email} roleName={invite.roleName} organizationName={invite.organizationName} isValidInvite={invite.isValidInvite} loadFailed={loadFailed} reloadHref={localizePath(alternatePath, locale)} />
  </AuthV2Shell>
}
