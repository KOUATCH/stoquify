"use client"

import { type FormEvent, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { activateTenantModuleAction } from "@/actions/modules/module-control.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import type { CommercialModuleSlug } from "@/services/modules/module-control-contracts"

export function TenantModuleActivationButton({
  moduleSlug,
  labels,
}: {
  moduleSlug: CommercialModuleSlug
  labels: {
    button: string
    pending: string
    confirm: string
    success: string
    error: string
    freshAuthRequired: string
    passwordLabel: string
    verifyAndEnable: string
  }
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [needsFreshAuth, setNeedsFreshAuth] = useState(false)

  async function completeActivation() {
    const result = await activateTenantModuleAction({ moduleSlug })
    if (!result.success) {
      if (result.code === "FRESH_AUTH_REQUIRED") {
        setNeedsFreshAuth(true)
        setMessage(labels.freshAuthRequired)
      } else {
        setMessage(result.error || labels.error)
      }
      return false
    }

    setMessage(labels.success)
    router.refresh()
    return true
  }

  function activate() {
    if (!window.confirm(labels.confirm)) return

    setMessage(null)
    startTransition(async () => {
      await completeActivation()
    })
  }

  function verifyAndActivate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const password = String(new FormData(form).get("password") || "")

    setMessage(null)
    startTransition(async () => {
      const stepUp = await stepUpWithPasswordAction({ password })
      if (!stepUp.success) {
        setMessage(stepUp.error || labels.error)
        return
      }

      const activated = await completeActivation()
      if (activated) form.reset()
    })
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {needsFreshAuth ? (
        <form className="flex w-full max-w-sm flex-col items-center gap-2" onSubmit={verifyAndActivate}>
          <label className="w-full text-left text-xs font-semibold text-[var(--dash-text-soft)]">
            {labels.passwordLabel}
            <input
              autoComplete="current-password"
              className="dashboard-control mt-1 w-full rounded-lg"
              name="password"
              required
              type="password"
            />
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--dash-accent)] px-4 text-sm font-semibold text-[var(--dash-canvas)] transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            {isPending ? labels.pending : labels.verifyAndEnable}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={activate}
          disabled={isPending}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--dash-accent)] px-4 text-sm font-semibold text-[var(--dash-canvas)] transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        >
          {isPending ? labels.pending : labels.button}
        </button>
      )}
      {message ? (
        <p className="max-w-sm text-xs text-[var(--dash-text-soft)]" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}
    </div>
  )
}
