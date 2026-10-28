"use client"

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
      <form action={grant} className="grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <h2 className="font-semibold">Invite an accountant</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Existing users receive access immediately. New accountants receive a consent-bound invitation and referral onboarding link.
          </p>
        </div>
        <label className="text-sm">
          Accountant email
          <input className="mt-1 w-full rounded-md border bg-background p-2" name="accountantEmail" type="email" required />
        </label>
        <label className="text-sm">
          Firm name
          <input className="mt-1 w-full rounded-md border bg-background p-2" name="accountantFirmName" required />
        </label>
        <label className="text-sm">
          Firm registration number
          <input className="mt-1 w-full rounded-md border bg-background p-2" name="accountantFirmRegistrationNumber" />
        </label>
        <label className="text-sm">
          Role
          <select className="mt-1 w-full rounded-md border bg-background p-2" name="role" defaultValue="READ_ONLY">
            <option value="READ_ONLY">Read only</option>
            <option value="REVIEWER">Reviewer</option>
            <option value="PREPARER">Preparer</option>
          </select>
        </label>
        <label className="text-sm">
          Effective from
          <input className="mt-1 w-full rounded-md border bg-background p-2" name="effectiveFrom" type="datetime-local" />
        </label>
        <label className="text-sm">
          Expires at
          <input className="mt-1 w-full rounded-md border bg-background p-2" name="expiresAt" type="datetime-local" required />
        </label>
        <label className="text-sm md:col-span-2">
          Signed consent evidence hash
          <input
            className="mt-1 w-full rounded-md border bg-background p-2 font-mono text-xs"
            name="consentEvidenceHash"
            placeholder="sha256:…"
            pattern="sha256:[A-Fa-f0-9]{64}"
            required
          />
        </label>
        <button className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50" disabled={isPending}>
          {isPending ? "Saving…" : "Invite or grant access"}
        </button>
        {message ? <p className="self-center text-sm md:col-span-2">{message}</p> : null}
      </form>

      <div className="overflow-hidden rounded-xl border">
        <table className="dashboard-table-base w-full text-left text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="p-3">Firm</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Expiry</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {initialGrants.map((grant) => (
              <tr className="border-t" key={grant.id}>
                <td className="p-3">{grant.accountantFirmName}</td>
                <td className="p-3">{grant.role.replace("_", " ")}</td>
                <td className="p-3">{grant.status}</td>
                <td className="p-3">
                  <time dateTime={grant.expiresAt} title={grant.expiresAt}>
                    {formatConsentInstant(grant.expiresAt)}
                  </time>
                </td>
                <td className="p-3">
                  {["ACTIVE", "SCHEDULED"].includes(grant.status) ? (
                    <button className="text-destructive underline" disabled={isPending} onClick={() => revoke(grant.id)} type="button">
                      Revoke
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {initialGrants.length === 0 ? (
              <tr><td className="p-6 text-center text-muted-foreground" colSpan={5}>No accountant access grants.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
