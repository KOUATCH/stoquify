"use client"

import { useState, useTransition } from "react"

import { requestOperationalTimeAction } from "@/actions/hris/operational-time.actions"

type RequestRow = {
  id: string
  type: string
  status: string
  periodStart: string
  periodEnd: string
  requestedMinutes: number
  requestedAt: string
}

type Props = {
  requests: RequestRow[]
  balances: Array<{ leavePolicyId: string; availableMinutes: number }>
  enabled: boolean
}

async function digest(value: string) {
  const bytes = new TextEncoder().encode(value)
  const result = await crypto.subtle.digest("SHA-256", bytes)
  return `sha256:${Array.from(new Uint8Array(result))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`
}

export function HrisOperationalTimeRequestPanel({
  requests,
  balances,
  enabled,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [type, setType] = useState("LEAVE")

  function submit(formData: FormData) {
    startTransition(async () => {
      setMessage(null)
      const periodStart = String(formData.get("periodStart") ?? "")
      const periodEnd = String(formData.get("periodEnd") ?? "")
      const requestedMinutes = Number(formData.get("requestedMinutes"))
      const reason = String(formData.get("reason") ?? "")
      const evidence = await digest(JSON.stringify({
        type,
        periodStart,
        periodEnd,
        requestedMinutes,
        reason,
      }))
      const result = await requestOperationalTimeAction({
        type,
        periodStart,
        periodEnd,
        requestedMinutes,
        reason,
        leavePolicyId: type === "LEAVE"
          ? balances[0]?.leavePolicyId
          : undefined,
        requestEvidenceHash: evidence,
        idempotencyKey: `${type}:${periodStart}:${periodEnd}:${evidence}`,
      })
      setMessage(result.success
        ? "Request submitted for independent manager review."
        : result.error)
    })
  }

  return (
    <section
      aria-labelledby="operational-time-heading"
      className="border-t border-white/10 pt-4"
    >
      <h2
        id="operational-time-heading"
        className="text-base font-semibold text-white"
      >
        Leave, overtime and attendance corrections
      </h2>
      {enabled ? (
        <form action={submit} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-300">
            Request type
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-white"
            >
              <option value="LEAVE">Leave</option>
              <option value="OVERTIME">Overtime</option>
              <option value="ATTENDANCE_CORRECTION">
                Attendance correction
              </option>
            </select>
          </label>
          <label className="text-sm text-slate-300">
            Minutes
            <input
              name="requestedMinutes"
              type="number"
              min="1"
              required
              className="mt-1 h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-white"
            />
          </label>
          <label className="text-sm text-slate-300">
            Start
            <input
              name="periodStart"
              type="date"
              required
              className="mt-1 h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-white"
            />
          </label>
          <label className="text-sm text-slate-300">
            End
            <input
              name="periodEnd"
              type="date"
              required
              className="mt-1 h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-white"
            />
          </label>
          <label className="text-sm text-slate-300 md:col-span-2">
            Reason
            <textarea
              name="reason"
              minLength={8}
              required
              className="mt-1 min-h-24 w-full rounded-md border border-white/10 bg-slate-950 p-3 text-white"
            />
          </label>
          <button
            type="submit"
            disabled={pending || (type === "LEAVE" && balances.length === 0)}
            className="h-10 rounded-md bg-emerald-500 px-4 font-medium text-slate-950 disabled:opacity-50 md:col-span-2"
          >
            {pending ? "Submitting…" : "Submit request"}
          </button>
        </form>
      ) : (
        <p className="mt-3 text-sm text-amber-200">
          Request permission is required.
        </p>
      )}
      {message ? (
        <p role="status" className="mt-3 text-sm text-sky-200">{message}</p>
      ) : null}
      <div className="mt-5 divide-y divide-white/10 border-y border-white/10">
        {requests.length ? requests.map((request) => (
          <div
            key={request.id}
            className="flex flex-wrap justify-between gap-3 py-3 text-sm"
          >
            <span className="text-white">{request.type.replaceAll("_", " ")}</span>
            <span className="text-slate-300">{request.requestedMinutes} minutes</span>
            <span className={
              request.status === "APPROVED"
                ? "text-emerald-200"
                : request.status === "REJECTED"
                  ? "text-rose-200"
                  : "text-amber-200"
            }>
              {request.status}
            </span>
          </div>
        )) : (
          <p className="py-4 text-sm text-slate-400">No time requests yet.</p>
        )}
      </div>
    </section>
  )
}
