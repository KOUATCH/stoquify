"use client"

import { type CSSProperties, useMemo, useState } from "react"
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
import InviteTableWithSearch, { type InviteDataProps } from "@/components/dashboard/Tables/Invites"
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
import { columns, type UserTableRow } from "./columns"

type UsersPageClientProps = {
  users: UserTableRow[]
  invites: InviteDataProps[]
}

function downloadCsv(users: UserTableRow[]) {
  const headers = ["Name", "Email", "Roles", "Status", "Verified", "Created", "Updated"]
  const rows = users.map((user) => [
    user.name,
    user.email,
    user.roleNames,
    user.isActive ? "Active" : "Inactive",
    user.isVerified || user.emailVerified ? "Verified" : "Unverified",
    new Date(user.createdAt).toISOString(),
    new Date(user.updatedAt).toISOString(),
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n")

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "organization-users.csv"
  link.click()
  URL.revokeObjectURL(url)
}

export default function UsersPageClient({ users, invites }: UsersPageClientProps) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState("all")
  const [verificationFilter, setVerificationFilter] = useState("all")

  const stats = useMemo(() => {
    const active = users.filter((user) => user.isActive).length
    const inactive = users.length - active
    const verified = users.filter((user) => user.isVerified || user.emailVerified).length
    const assignedRoles = users.reduce((total, user) => total + user.roles.length, 0)
    const pendingInvites = invites.filter((invite) => invite.status === "PENDING").length

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
        label: "Total Users",
        value: stats.total.toLocaleString(),
        Icon: UsersRound,
        accent: "var(--dash-brand)",
        soft: "var(--dash-brand-soft)",
        sub: "Workspace accounts",
      },
      {
        label: "Active",
        value: stats.active.toLocaleString(),
        Icon: UserCheck,
        accent: "var(--dash-success)",
        soft: "var(--dash-success-soft)",
        sub: `${stats.inactive.toLocaleString()} inactive`,
      },
      {
        label: "Verified",
        value: stats.verified.toLocaleString(),
        Icon: CheckCircle2,
        accent: "var(--dash-info)",
        soft: "var(--dash-info-soft)",
        sub: "Email or identity checked",
      },
      {
        label: "Role Links",
        value: stats.assignedRoles.toLocaleString(),
        Icon: ShieldCheck,
        accent: "var(--dash-gold)",
        soft: "var(--dash-gold-soft)",
        sub: "Assigned permissions",
      },
      {
        label: "Pending Invites",
        value: stats.pendingInvites.toLocaleString(),
        Icon: Send,
        accent: "var(--dash-spruce)",
        soft: "var(--dash-spruce-soft)",
        sub: "Awaiting acceptance",
      },
      {
        label: "Filtered View",
        value: filteredUsers.length.toLocaleString(),
        Icon: Activity,
        accent: "var(--dash-warm)",
        soft: "var(--dash-warm-soft)",
        sub: "Visible records",
      },
    ],
    [filteredUsers.length, stats],
  )

  return (
    <div className="space-y-6">
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
                  <CardTitle className="text-lg font-semibold text-[var(--dash-text)]">User Management</CardTitle>
                  <p className="mt-1 break-words text-sm text-[var(--dash-text-soft)]">
                    Showing {filteredUsers.length} of {users.length} users and {invites.length} invites
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="dashboard-filter-chip h-9 w-fit rounded-lg">
                  <Sparkles className="me-1 h-3 w-3 text-[var(--dash-spruce)]" />
                  Live Data
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.refresh()}
                  className="dashboard-button-secondary h-9 rounded-lg"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadCsv(filteredUsers)}
                  className="dashboard-button-secondary h-9 rounded-lg"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
            <TabsList className="mt-4 inline-flex h-auto w-full justify-start gap-2 rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)]/70 p-1 sm:w-auto">
              <TabsTrigger
                value="users"
                className="rounded-md px-4 py-2 text-[var(--dash-text-soft)] data-[state=active]:bg-[var(--dash-brand-soft)] data-[state=active]:text-[var(--dash-brand-strong)]"
              >
                Users
              </TabsTrigger>
              <TabsTrigger
                value="invites"
                className="rounded-md px-4 py-2 text-[var(--dash-text-soft)] data-[state=active]:bg-[var(--dash-brand-soft)] data-[state=active]:text-[var(--dash-brand-strong)]"
              >
                Invites
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="space-y-4 p-3 sm:p-5">
            <TabsContent value="users" className="mt-0 space-y-4">
              {(statusFilter !== "all" || verificationFilter !== "all") && (
                <div className="flex flex-wrap items-center gap-2">
                  {statusFilter !== "all" ? <Badge variant="outline" className="dashboard-filter-chip rounded-lg">{statusFilter}</Badge> : null}
                  {verificationFilter !== "all" ? <Badge variant="outline" className="dashboard-filter-chip rounded-lg">{verificationFilter}</Badge> : null}
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
                    Clear
                  </Button>
                </div>
              )}

              <DataTable
                data={filteredUsers}
                columns={columns}
                searchPlaceholder="Search users, emails, roles, or status"
                showToolbar={false}
                variant="landing"
                filters={{
                  additionalFilters: (
                    <>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="dashboard-control h-9 w-full rounded-lg sm:w-[160px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={verificationFilter} onValueChange={setVerificationFilter}>
                        <SelectTrigger className="dashboard-control h-9 w-full rounded-lg sm:w-[170px]">
                          <SelectValue placeholder="Verification" />
                        </SelectTrigger>
                        <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                          <SelectItem value="all">All Verification</SelectItem>
                          <SelectItem value="verified">Verified</SelectItem>
                          <SelectItem value="unverified">Unverified</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  ),
                }}
              />
            </TabsContent>
            <TabsContent value="invites" className="mt-0">
              <InviteTableWithSearch data={invites} />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  )
}
