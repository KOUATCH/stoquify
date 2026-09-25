"use client"

import { useId, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Ban, RotateCcw } from "lucide-react"
import UserInvitationForm from "@/components/Forms/users/userInvitationForm"
import InvitationHistory from "@/components/Forms/users/InvitationHistory"

export type InviteDataProps = {
  id: string; email: string; createdAt: Date; expiresAt: Date
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED"
  roleId?: string; revision?: string
  role: { nameEn: string | null; nameFr: string | null; code: string }
}

export type InvitationManagementOptions = { organizationId: string; organizationName: string; roles: { value: string; label: string }[] }
export default function InviteTableWithSearch({ data, asOf, searchTerm, onSearchChange, management, onRecorded }: { data: InviteDataProps[]; asOf: string | null; searchTerm?: string; onSearchChange?: (value: string) => void; management?: InvitationManagementOptions; onRecorded?: () => Promise<void> }) {
  const [localSearch, setLocalSearch] = useState(""), id = useId(), t = useTranslations("userInvitations"), locale = useLocale()
  const search = searchTerm ?? localSearch
  const setSearch = onSearchChange ?? setLocalSearch
  const date = (value: Date | string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC"
  const filtered = data.filter(invite => invite.email.toLowerCase().includes(search.trim().toLowerCase()))
  return <section className="space-y-4" aria-label={t("listTitle")}>
    <div className="space-y-2"><Label htmlFor={id}>{t("search")}</Label><Input id={id} type="search" value={search} onChange={event => setSearch(event.target.value)} className="dashboard-control" /></div>
    <p className="text-sm text-[var(--dash-text-soft)]">{t("listHelp")}</p>
    {asOf && <p className="text-xs text-[var(--dash-text-faint)]">{t("asOf", { date: date(asOf) })}</p>}
    {filtered.length ? <ul className="space-y-3">{filtered.map(invite => <li key={invite.id} id={`invitation-${invite.id}`} tabIndex={-1} className="rounded-lg border border-[var(--dash-border-subtle)] p-4 outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)]">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 break-all font-medium text-[var(--dash-text)]">{invite.email}</p>
        <Badge variant="outline" className={invite.status === "ACCEPTED" ? "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]" : invite.status === "PENDING" ? "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]" : "border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]"}>{t(`status.${invite.status}`)}</Badge>
      </div>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        <div><dt className="text-[var(--dash-text-faint)]">{t("role")}</dt><dd className="break-words">{(locale === "fr" ? invite.role.nameFr || invite.role.nameEn : invite.role.nameEn || invite.role.nameFr) || invite.role.code}</dd></div>
        <div><dt className="text-[var(--dash-text-faint)]">{t("createdAt")}</dt><dd>{date(invite.createdAt)}</dd></div>
        <div><dt className="text-[var(--dash-text-faint)]">{t("expiresAt")}</dt><dd>{date(invite.expiresAt)}</dd></div>
      </dl>
      {management && invite.roleId && invite.revision && management.roles.some(role => role.value === invite.roleId) && <div className="mt-4 flex flex-wrap gap-2">
        <InvitationHistory inviteId={invite.id} email={invite.email} />
        <UserInvitationForm {...management} email="" onRecorded={onRecorded} management={{ mode: "reissue", invite: { ...invite, roleId: invite.roleId, revision: invite.revision } }} triggerClassName="dashboard-button-secondary" triggerIcon={<RotateCcw className="h-4 w-4" aria-hidden="true" />} />
        <UserInvitationForm {...management} email="" onRecorded={onRecorded} management={{ mode: "cancel", invite: { ...invite, roleId: invite.roleId, revision: invite.revision }, returnFocusId: `invitation-${invite.id}` }} triggerClassName="border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]" triggerIcon={<Ban className="h-4 w-4" aria-hidden="true" />} />
        {(invite.status === "ACCEPTED" || invite.status === "CANCELLED") && <p className="basis-full text-xs text-[var(--dash-text-soft)]">{t(invite.status === "ACCEPTED" ? "management.acceptedHelp" : "management.cancelledHelp")}</p>}
      </div>}
    </li>)}</ul> : <p role="status" className="rounded-lg border border-dashed border-[var(--dash-border-subtle)] p-6 text-center text-sm text-[var(--dash-text-soft)]">{search.trim() ? t("noMatches") : t("empty")}</p>}
  </section>
}
