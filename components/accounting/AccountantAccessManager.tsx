"use client"

import { AccountingDataTable } from "@/components/accounting/AccountingDataTable"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import {
  inviteAccountantAccessAction,
  revokeAccountantAccessAction,
} from "@/actions/accounting/accountant-access.actions"
import type { AccountantAccessGrantDto } from "@/services/accounting/accountant-access.service"

function toAbsoluteIsoDateTime(
  value: FormDataEntryValue | null,
): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString()
}

function formatConsentInstant(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(parsed)
}
export function AccountantAccessManager({
  initialGrants,
}: {
  initialGrants: AccountantAccessGrantDto[]
}) {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function grant(formData: FormData) {
    setMessage(null)
    startTransition(async () => {
      const result = await inviteAccountantAccessAction({
        accountantEmail: formData.get("accountantEmail"),
        accountantFirmName: formData.get("accountantFirmName"),
        accountantFirmRegistrationNumber:
          formData.get("accountantFirmRegistrationNumber") || null,
        role: formData.get("role"),
        consentEvidenceHash: formData.get("consentEvidenceHash"),
        effectiveFrom: toAbsoluteIsoDateTime(formData.get("effectiveFrom")),
        expiresAt: toAbsoluteIsoDateTime(formData.get("expiresAt")),
      })
      setMessage(
        result.success
          ? result.data.outcome === "GRANTED"
            ? "Accountant access granted."
            : "Accountant invitation queued."
          : result.error,
      )
      if (result.success) router.refresh()
    })
  }

  function revoke(grantId: string) {
    const reason = window.prompt("Reason for revocation")
    if (!reason) return
    setMessage(null)
    startTransition(async () => {
      const result = await revokeAccountantAccessAction({ grantId, reason })
      setMessage(
        result.success
          ? result.data.status === "EXPIRED"
            ? "Accountant access had already expired."
            : "Accountant access revoked."
          : result.error,
      )
      if (result.success) router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <form action={grant} className="dashboard-glass-panel grid min-w-0 gap-4 rounded-lg p-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <h2 className="font-semibold">Invite an accountant</h2>
          <p className="mt-1 text-sm text-[var(--dash-text-soft)]">
            Existing users receive access immediately. New accountants receive a consent-bound invitation and referral onboarding link.
          </p>
        </div>
        <label className="text-sm">
          Accountant email
          <input className="dashboard-control mt-1 h-10 w-full min-w-0 rounded-lg px-3" name="accountantEmail" type="email" required />
        </label>
        <label className="text-sm">
          Firm name
          <input className="dashboard-control mt-1 h-10 w-full min-w-0 rounded-lg px-3" name="accountantFirmName" required />
        </label>
        <label className="text-sm">
          Firm registration number
          <input className="dashboard-control mt-1 h-10 w-full min-w-0 rounded-lg px-3" name="accountantFirmRegistrationNumber" />
        </label>
        <label className="text-sm">
          Role
          <select className="dashboard-control mt-1 h-10 w-full min-w-0 rounded-lg px-3" name="role" defaultValue="READ_ONLY">
            <option value="READ_ONLY">Read only</option>
            <option value="REVIEWER">Reviewer</option>
            <option value="PREPARER">Preparer</option>
          </select>
        </label>
        <label className="text-sm">
          Effective from
          <input className="dashboard-control mt-1 h-10 w-full min-w-0 rounded-lg px-3" name="effectiveFrom" type="datetime-local" />
        </label>
        <label className="text-sm">
          Expires at
          <input className="dashboard-control mt-1 h-10 w-full min-w-0 rounded-lg px-3" name="expiresAt" type="datetime-local" required />
        </label>
        <label className="text-sm md:col-span-2">
          Signed consent evidence hash
          <input
            className="dashboard-control mt-1 h-10 w-full min-w-0 rounded-lg px-3 font-mono text-xs"
            name="consentEvidenceHash"
            placeholder="sha256:…"
            pattern="sha256:[A-Fa-f0-9]{64}"
            required
          />
        </label>
        <button className="dashboard-button-create min-h-10 w-fit rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50" disabled={isPending}>
          {isPending ? "Saving…" : "Invite or grant access"}
        </button>
        {message ? <p className="self-center text-sm md:col-span-2">{message}</p> : null}
      </form>

      <div className="dashboard-glass-panel min-w-0 overflow-hidden rounded-lg">
        <AccountingDataTable
          caption={"Accountant access grants"}
          emptyMessage={"No accountant access grants."}
          columns={[
            { label: "Firm" },
            { label: "Role" },
            { label: "Status" },
            { label: "Expiry" },
            { label: "Action" },
          ]}
          rows={initialGrants.map((grant) => {
            return {
              id: grant.id,
              searchText: [
                grant.accountantFirmName,
                grant.role.replace("_", " "),
                grant.status,
                formatConsentInstant(grant.expiresAt),
              ]
                .filter((value) => value !== null && value !== undefined)
                .join(" "),
              cells: [
                <div key="cell-0">{grant.accountantFirmName}</div>,
                <div key="cell-1">{grant.role.replace("_", " ")}</div>,
                <div key="cell-2">{grant.status}</div>,
                <div key="cell-3">
                  <time dateTime={grant.expiresAt} title={grant.expiresAt}>
                    {formatConsentInstant(grant.expiresAt)}
                  </time>
                </div>,
                <div key="cell-4">
                  {["ACTIVE", "SCHEDULED"].includes(grant.status) ? (
                    <button
                      className="min-h-10 rounded-md px-2 text-[var(--dash-danger)] underline focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)]"
                      disabled={isPending}
                      onClick={() => revoke(grant.id)}
                      type="button"
                    >
                      Revoke
                    </button>
                  ) : (
                    "—"
                  )}
                </div>,
              ],
            }
          })}
        />
      </div>
    </div>
  )
}
