"use client"

import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import {
  Activity,
  CheckCircle2,
  Download,
  KeyRound,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UsersRound,
} from "lucide-react"

import DataTable from "@/components/DataTableComponents/DataTable"
import InviteTableWithSearch, { type InviteDataProps, type InvitationManagementOptions } from "@/components/dashboard/Tables/Invites"
import { getOrgInvites } from "@/actions/users/getOrgInvites"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Locale } from "@/types/bilingual"
import { getUserColumns, type UserTableRow } from "./columns"
import { userDirectoryCopy } from "@/components/settings/user-directory-copy"
import { UserDeactivation } from "@/components/settings/UserDeactivation"

type UsersPageClientProps = {
  users: UserTableRow[]
  actorId: string
  canDeactivate: boolean
  asOf: string
  invites: InviteDataProps[] | null
  invitationAsOf: string | null
  invitationErrorCode?: string
  invitationManagement?: InvitationManagementOptions
  locale?: Locale
}

function downloadCsv(users: UserTableRow[], locale: Locale) {
  const t = userDirectoryCopy[locale]
  const headers = [t.name, t.email, t.roles, t.status, t.verification, t.created, t.updated]
  const rows = users.map((user) => [
    user.name,
    user.email,
    user.roleNames,
    user.isActive ? t.active : t.inactive,
    user.isVerified || user.emailVerified ? t.verified : t.unverified,
    new Date(user.createdAt).toISOString(),
    new Date(user.updatedAt).toISOString(),
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => {
      const value = String(cell ?? "")
      const literal = /^[\s\uFEFF]*[=+@-]/.test(value) ? "'" + value : value
      return `"${literal.replace(/"/g, '""')}"`
    }).join(","))
    .join("\n")

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "organization-users.csv"
  link.click()
  URL.revokeObjectURL(url)
}

export default function UsersPageClient({ users, actorId, canDeactivate, asOf, invites: initialInvites, invitationAsOf: initialAsOf, invitationErrorCode: initialErrorCode, invitationManagement, locale = "en" }: UsersPageClientProps) {
  const t = useTranslations("userInvitations")
  const copy = userDirectoryCopy[locale]
  const router = useRouter()
  const [interactive, setInteractive] = useState(false)
  useEffect(() => { setInteractive(true) }, [])
  const [reviewMember, setReviewMember] = useState<UserTableRow | null>(null)
  const returnFocus = useRef<HTMLButtonElement | null>(null), directory = useRef<HTMLFieldSetElement>(null)
  const review = useCallback((member: UserTableRow, trigger: HTMLButtonElement) => { returnFocus.current = trigger; setReviewMember(member) }, [])
  const columns = useMemo(() => getUserColumns(locale, actorId, canDeactivate, review), [locale, actorId, canDeactivate, review])
  const dismissReview = () => { setReviewMember(null); requestAnimationFrame(() => { if (returnFocus.current?.isConnected) returnFocus.current.focus(); else directory.current?.querySelector<HTMLInputElement>('input[name="search"]')?.focus() }) }
  const [refreshing, startRefresh] = useTransition()
  const [invites, setInvites] = useState(initialInvites)
  const [invitationAsOf, setInvitationAsOf] = useState(initialAsOf)
  const [invitationErrorCode, setInvitationErrorCode] = useState(initialErrorCode)
  const [invitationSearch, setInvitationSearch] = useState("")
  useEffect(() => { setInvites(initialInvites); setInvitationAsOf(initialAsOf); setInvitationErrorCode(initialErrorCode) }, [initialInvites, initialAsOf, initialErrorCode])
  const readInvites = async () => {
    try {
      const result = await getOrgInvites()
      setInvites(result.data?.rows ?? null)
      setInvitationAsOf(result.data?.asOf ?? null)
      setInvitationErrorCode("code" in result ? result.code : undefined)
    } catch { setInvites(null); setInvitationAsOf(null); setInvitationErrorCode(undefined) }
  }
  const refreshInvites = () => startRefresh(readInvites)
  const [statusFilter, setStatusFilter] = useState("all")
  const [verificationFilter, setVerificationFilter] = useState("all")
  const [visibleUsers, setVisibleUsers] = useState(users)

  const stats = useMemo(() => {
    const active = users.filter((user) => user.isActive).length
    const inactive = users.length - active
    const verified = users.filter((user) => user.isVerified || user.emailVerified).length
    const assignedRoles = users.reduce((total, user) => total + user.roles.length, 0)
    const pendingInvites = invites?.filter((invite) => invite.status === "PENDING").length ?? null

    return {
      total: users.length,
      active,
      inactive,
      verified,
      assignedRoles,
      pendingInvites,
    }
  }, [invites, users])

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const isVerified = Boolean(user.isVerified || user.emailVerified)
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && user.isActive) ||
        (statusFilter === "inactive" && !user.isActive)

      const matchesVerification =
        verificationFilter === "all" ||
        (verificationFilter === "verified" && isVerified) ||
        (verificationFilter === "unverified" && !isVerified)

      return matchesStatus && matchesVerification
    })
  }, [statusFilter, users, verificationFilter])

  const statsCards = useMemo(
    () => [
      {
        label: copy.total,
        value: stats.total.toLocaleString(),
        Icon: UsersRound,
        accent: "var(--dash-brand)",
        soft: "var(--dash-brand-soft)",
        sub: copy.accounts,
      },
      {
        label: copy.active,
        value: stats.active.toLocaleString(),
        Icon: UserCheck,
        accent: "var(--dash-success)",
        soft: "var(--dash-success-soft)",
        sub: `${stats.inactive.toLocaleString(locale)} ${copy.inactive.toLocaleLowerCase()}`,
      },
      {
        label: copy.verified,
        value: stats.verified.toLocaleString(),
        Icon: CheckCircle2,
        accent: "var(--dash-info)",
        soft: "var(--dash-info-soft)",
        sub: copy.checked,
      },
      {
        label: copy.roleLinks,
        value: stats.assignedRoles.toLocaleString(),
        Icon: ShieldCheck,
        accent: "var(--dash-gold)",
        soft: "var(--dash-gold-soft)",
        sub: copy.assigned,
      },
      {
        label: t("pendingTitle"),
        value: stats.pendingInvites?.toLocaleString(locale) ?? t("unavailable"),
        Icon: Send,
        accent: "var(--dash-spruce)",
        soft: "var(--dash-spruce-soft)",
        sub: stats.pendingInvites === null ? t("readFailed") : t("pendingHelp"),
      },
      {
        label: copy.filtered,
        value: visibleUsers.length.toLocaleString(locale),
        Icon: Activity,
        accent: "var(--dash-warm)",
        soft: "var(--dash-warm-soft)",
        sub: copy.visible,
      },
    ],
    [visibleUsers.length, stats, t, locale, copy],
  )

  return (
    <fieldset ref={directory} disabled={!interactive} aria-busy={!interactive} className="min-w-0 space-y-6">
      {reviewMember && <UserDeactivation user={reviewMember} locale={locale} initiallyOpen onDismiss={dismissReview} onRecorded={() => router.refresh()} />}
      <p className="text-xs text-[var(--dash-text-soft)]">{copy.asOf}: {new Date(asOf).toLocaleString(locale, { timeZone: "UTC" })} UTC</p>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {statsCards.map(({ label, value, Icon, accent, soft, sub }) => (
          <Card
            key={label}
            className="dashboard-stat-card group relative min-h-[146px] min-w-0 overflow-hidden"
            style={{
              "--stat-accent": accent,
              "--stat-soft": soft,
            } as CSSProperties}
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-[var(--stat-accent)] opacity-80" />
            <div className="absolute end-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--stat-soft)] text-[var(--stat-accent)] transition-transform duration-200 group-hover:scale-105">
              <Icon className="h-4 w-4" />
            </div>
            <CardHeader className="pb-2 pe-14">
              <CardTitle className="text-[0.7rem] font-semibold uppercase leading-4 text-[var(--dash-text-faint)]">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 pe-4">
              <div className="mb-1 break-words text-2xl font-semibold leading-tight text-[var(--dash-text)]">{value}</div>
              <p className="text-xs leading-5 text-[var(--dash-text-soft)]">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="dashboard-glass-panel min-w-0 overflow-hidden rounded-lg text-[var(--dash-text)]">
        <Tabs defaultValue="users">
          <CardHeader className="border-b border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.58)] px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-spruce-soft)] text-[var(--dash-spruce)]">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-lg font-semibold text-[var(--dash-text)]">{copy.management}</CardTitle>
                  <p className="mt-1 break-words text-sm text-[var(--dash-text-soft)]">
                    {copy.showing} {visibleUsers.length} {copy.of} {users.length} · {invites ? t("count", { count: invites.length }) : t("countUnavailable")}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="dashboard-filter-chip h-9 w-fit rounded-lg">
                  <Sparkles className="me-1 h-3 w-3 text-[var(--dash-spruce)]" />
                  {t("snapshot")}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.refresh()}
                  className="dashboard-button-secondary h-9 rounded-lg"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {copy.refresh}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadCsv(visibleUsers, locale)}
                  className="dashboard-button-secondary h-9 rounded-lg"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {copy.export}
                </Button>
              </div>
            </div>
            <TabsList className="mt-4 inline-flex h-auto w-full justify-start gap-2 rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)]/70 p-1 sm:w-auto">
              <TabsTrigger
                value="users"
                className="rounded-md px-4 py-2 text-[var(--dash-text-soft)] data-[state=active]:bg-[var(--dash-brand-soft)] data-[state=active]:text-[var(--dash-brand-strong)]"
              >
                {copy.users}
              </TabsTrigger>
              <TabsTrigger
                value="invites"
                className="rounded-md px-4 py-2 text-[var(--dash-text-soft)] data-[state=active]:bg-[var(--dash-brand-soft)] data-[state=active]:text-[var(--dash-brand-strong)]"
              >
                {t("listTab")}
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="space-y-4 p-3 sm:p-5">
            <TabsContent value="users" className="mt-0 space-y-4">
              {(statusFilter !== "all" || verificationFilter !== "all") && (
                <div className="flex flex-wrap items-center gap-2">
                  {statusFilter !== "all" ? <Badge variant="outline" className="dashboard-filter-chip rounded-lg">{statusFilter === "active" ? copy.active : copy.inactive}</Badge> : null}
                  {verificationFilter !== "all" ? <Badge variant="outline" className="dashboard-filter-chip rounded-lg">{verificationFilter === "verified" ? copy.verified : copy.unverified}</Badge> : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-lg text-[var(--dash-text-soft)] hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-brand-strong)]"
                    onClick={() => {
                      setStatusFilter("all")
                      setVerificationFilter("all")
                    }}
                  >
                    {copy.clear}
                  </Button>
                </div>
              )}

              <DataTable
                data={filteredUsers}
                columns={columns}
                onVisibleDataChange={setVisibleUsers}
                locale={locale}
                searchPlaceholder={copy.search}
                showToolbar={false}
                variant="landing"
                filters={{
                  additionalFilters: (
                    <>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger aria-label={copy.status} className="dashboard-control h-9 w-full rounded-lg sm:w-[160px]">
                          <SelectValue placeholder={copy.status} />
                        </SelectTrigger>
                        <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                          <SelectItem value="all">{copy.allStatus}</SelectItem>
                          <SelectItem value="active">{copy.active}</SelectItem>
                          <SelectItem value="inactive">{copy.inactive}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={verificationFilter} onValueChange={setVerificationFilter}>
                        <SelectTrigger aria-label={copy.verification} className="dashboard-control h-9 w-full rounded-lg sm:w-[170px]">
                          <SelectValue placeholder={copy.verification} />
                        </SelectTrigger>
                        <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                          <SelectItem value="all">{copy.allVerification}</SelectItem>
                          <SelectItem value="verified">{copy.verified}</SelectItem>
                          <SelectItem value="unverified">{copy.unverified}</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  ),
                }}
              />
            </TabsContent>
            <TabsContent value="invites" className="mt-0">
              <div className="space-y-4" aria-busy={refreshing}>
                <Button type="button" variant="outline" disabled={refreshing} onClick={refreshInvites} className="dashboard-button-secondary w-full sm:w-auto">{refreshing ? t("refreshing") : t("retry")}</Button>
                {invites ? <InviteTableWithSearch data={invites} asOf={invitationAsOf} searchTerm={invitationSearch} onSearchChange={setInvitationSearch} management={invitationManagement} onRecorded={readInvites} /> : <p role="alert" className="rounded-lg border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] p-4 text-sm">{invitationErrorCode === "FORBIDDEN" || invitationErrorCode === "TENANT_SCOPE_VIOLATION" ? t("readDenied") : t("readFailed")}</p>}
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </fieldset>
  )
}
