"use client"

import { Button } from "@/components/ui/button"
import { localizePath } from "@/i18n/routing"
import { signOut } from "@/lib/auth-client"
import type { Locale } from "@/types/bilingual"
import { LogOut } from "lucide-react"
import { useRef, useState } from "react"
import { selfSignOutCopy } from "@/lib/security/self-sign-out-copy"

export function SessionRecoverySignOutButton({
  label,
  locale,
}: {
  label: string
  locale: Locale
}) {
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [failed, setFailed] = useState(false)
  const lock = useRef(false)
  const copy = selfSignOutCopy[locale]
  const loginHref = localizePath("/login", locale)

  async function handleSignOut() {
    if (lock.current) return
    lock.current = true
    setIsSigningOut(true)
    setFailed(false)
    try {
      await signOut({ redirectTo: loginHref, redirect: true })
    } catch {
      setFailed(true)
    } finally {
      lock.current = false
      setIsSigningOut(false)
    }
  }

  return (
    <div className="space-y-2"><Button
      type="button"
      variant="outline"
      disabled={isSigningOut}
      onClick={handleSignOut}
      className="dashboard-button-secondary h-auto whitespace-normal rounded-lg"
    >
      <LogOut className="mr-2 h-4 w-4" />
      {isSigningOut ? copy.pending : label}
    </Button>{failed && <p role="alert" className="text-sm">{copy.failed}</p>}</div>
  )
}
