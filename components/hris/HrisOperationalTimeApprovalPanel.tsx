"use client"

import { useState, useTransition } from "react"

import { decideOperationalTimeRequestAction } from "@/actions/hris/operational-time.actions"

type RequestRow = {
  id: string
  type: string
  employeeId: string
  periodStart: string
  periodEnd: string
  requestedMinutes: number
  requestedAt: string
  canDecide: boolean
  employee: { displayName: string }
}

async function digest(value: string) {
  const bytes = new TextEncoder().encode(value)
  const result = await crypto.subtle.digest("SHA-256", bytes)
  return `sha256:${Array.from(new Uint8Array(result))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`
}

export function HrisOperationalTimeApprovalPanel({
  requests,
}: {
  requests: RequestRow[]
}) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  function decide(request: RequestRow, decision: "APPROVE" | "REJECT") {
    startTransition(async () => {
      const decisionReason = decision === "APPROVE"
        ? "Reviewed and approved by the responsible manager"
        : "Reviewed and rejected by the responsible manager"
      const approvalEvidenceHash = await digest(JSON.stringify({
        requestId: request.id,
        decision,
        decisionReason,
      }))
      const result = await decideOperationalTimeRequestAction({
        requestId: request.id,
        employeeId: request.employeeId,
        decision,
        decisionReason,
        approvalEvidenceHash,
      })
      setMessage(result.success
        ? `${request.type.replaceAll("_", " ")} ${decision.toLowerCase()}d.`
        : result.error)
    })
  }

  return (
    <section aria-labelledby="time-approval-heading">
      <h2 id="time-approval-heading" className="text-base font-semibold text-white">
        Time-management approvals
      </h2>
      {message ? (
        <p role="status" className="mt-3 text-sm text-sky-200">{message}</p>
      ) : null}
      <div className="mt-3 divide-y divide-white/10 border-y border-white/10">
        {requests.length ? requests.map((request) => (
          <div
            key={request.id}
            className="grid gap-3 py-4 text-sm md:grid-cols-[1fr_auto]"
          >
            <div>
              <p className="font-medium text-white">
                {request.employee.displayName} · {request.type.replaceAll("_", " ")}
              </p>
              <p className="mt-1 text-slate-400">
                {request.requestedMinutes} minutes ·{" "}
                {new Date(request.periodStart).toLocaleDateString()}–{" "}
                {new Date(request.periodEnd).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending || !request.canDecide}
                onClick={() => decide(request, "APPROVE")}
                className="h-9 rounded-md bg-emerald-500 px-3 font-medium text-slate-950 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={pending || !request.canDecide}
                onClick={() => decide(request, "REJECT")}
                className="h-9 rounded-md border border-rose-400/30 px-3 text-rose-100 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        )) : (
          <p className="py-4 text-sm text-slate-400">
            No pending leave, overtime, or correction requests.
          </p>
        )}
      </div>
    </section>
  )
}
