"use client"

import { Button } from "@/components/ui/button"
import { localizePath } from "@/i18n/routing"
import { signOut } from "@/lib/auth-client"
import type { Locale } from "@/types/bilingual"
import { LogOut } from "lucide-react"
import { useState } from "react"

export function SessionRecoverySignOutButton({
  label,
  locale,
}: {
  label: string
  locale: Locale
}) {
  const [isSigningOut, setIsSigningOut] = useState(false)
  const loginHref = localizePath("/login", locale)

  async function handleSignOut() {
    setIsSigningOut(true)
    try {
      await signOut({ redirectTo: loginHref, redirect: true })
    } catch {
      window.location.href = loginHref
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isSigningOut}
      onClick={handleSignOut}
      className="dashboard-button-secondary rounded-lg"
    >
      <LogOut className="mr-2 h-4 w-4" />
      {label}
    </Button>
  )
}
