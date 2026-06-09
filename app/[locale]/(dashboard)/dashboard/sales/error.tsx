"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function SalesError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
      <p className="text-lg font-medium">Failed to load sales</p>
      <p className="text-sm text-muted-foreground">{error.message ?? "An unexpected error occurred."}</p>
      <Button variant="outline" onClick={reset}>Try again</Button>
    </div>
  )
}
