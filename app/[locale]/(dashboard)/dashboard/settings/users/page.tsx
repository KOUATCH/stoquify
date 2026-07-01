import Link from "next/link"
import { AlertTriangle, Settings, UserPlus, UsersRound } from "lucide-react"

import getOrgRoles from "@/actions/roles/getOrgRoles"
import { getOrgInvites } from "@/actions/users/getOrgInvites"
import getOrgUsers from "@/actions/users/getOrgUsers"
import UserInvitationForm from "@/components/Forms/users/userInvitationForm"
import { Button } from "@/components/ui/button"
import { getAuthenticatedUser } from "@/config/useAuth"
import { pickLocale } from "@/i18n/routing"
import UsersPageClient from "./UsersPageClient"
import type { UserTableRow } from "./columns"

type UsersPageProps = {
  params: Promise<{ locale: string }>
}

export default async function UsersPage({ params }: UsersPageProps) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  const user = await getAuthenticatedUser()
  const organizationId = user?.organizationId ?? ""

  if (!organizationId) {
    return (
      <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
        <div className="dashboard-landing-content mx-auto w-full max-w-[88rem] min-w-0 px-4 py-8 sm:px-6">
          <div className="dashboard-glass-panel mx-auto max-w-md rounded-lg px-6 py-14 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-danger-soft)]">
              <AlertTriangle className="h-8 w-8 text-[var(--dash-danger)]" />
            </div>
            <h1 className="mb-3 text-xl font-semibold text-[var(--dash-text)]">Organization Required</h1>
            <p className="text-sm text-[var(--dash-text-soft)]">No organization found for the current user.</p>
          </div>
        </div>
      </div>
    )
  }

  const rolesResult = await getOrgRoles(organizationId)
  const rolesData = rolesResult.data || []
  const userRoles = rolesData.map((role) => ({
    label: role.name,
    value: role.id,
  }))
  const organizationName = user?.organizationName ?? ""
  const email = user?.email ?? ""
  const orgUsers = await getOrgUsers(organizationId)
  const userRows: UserTableRow[] = orgUsers.map((orgUser) => ({
    ...orgUser,
    name: [orgUser.firstName, orgUser.lastName].filter(Boolean).join(" ") || orgUser.email,
    roleNames: orgUser.roles.map((role) => role.nameEn).join(", "),
  }))

  const orgInvites = await getOrgInvites(organizationId)

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto w-full max-w-[88rem] min-w-0 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex min-w-0 flex-col gap-5 sm:mb-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 max-w-3xl">
            <div className="dashboard-eyebrow mb-4">
              <span className="dashboard-live-dot" />
              Workspace access
            </div>
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] shadow-[0_16px_34px_rgba(47,125,246,0.18)]">
                <UsersRound className="h-6 w-6 text-[var(--dash-brand-strong)]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold tracking-tight text-[var(--dash-text)] sm:text-4xl">
                  Users & Invitations
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--dash-text-soft)] sm:text-base">
                  Manage organization users, role access, verification state, and pending invitations from one focused workspace.
                </p>
              </div>
            </div>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button asChild variant="outline" size="sm" className="dashboard-button-secondary h-10 w-full rounded-lg sm:w-auto">
              <Link href={`/${locale}/dashboard/settings`}>
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </Button>
            <UserInvitationForm
              roles={userRoles}
              organizationId={organizationId}
              organizationName={organizationName}
              email={email}
              name=""
              triggerClassName="dashboard-button-create h-10 w-full rounded-lg px-4 sm:w-auto"
              triggerIcon={<UserPlus className="h-4 w-4" />}
            />
          </div>
        </div>

        <UsersPageClient users={userRows} invites={orgInvites} />
      </div>
    </div>
  )
}
