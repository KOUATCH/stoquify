"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function POSError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="dashboard-landing-theme dark min-h-[calc(100vh-68px)] overflow-x-hidden text-[var(--dash-text)]">
      <div className="dashboard-landing-content mx-auto flex min-h-[calc(100vh-68px)] w-full max-w-[112rem] items-center justify-center px-4 py-10">
        <div className="dashboard-glass-panel w-full max-w-xl rounded-lg p-6 text-center shadow-[0_28px_80px_rgba(5,12,16,0.28)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--dash-warning)]/25 bg-[var(--dash-warning-soft)] text-[#ffe4a8]">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-[var(--dash-text)]">Failed to load POS</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--dash-text-soft)]">
            {error.message ?? "An unexpected error occurred."}
          </p>
          <Button
            type="button"
            onClick={reset}
            className="dashboard-button-secondary mt-5 rounded-lg font-semibold"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </div>
      </div>
    </div>
  )
}
