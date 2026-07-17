"use client"

import { ReactNode } from "react"

interface AuthProviderProps {
  children: ReactNode
}

// BetterAuth does not require a provider wrapper — session state is managed
// through authClient.useSession() which reads the server session directly.
export function AuthProvider({ children }: AuthProviderProps) {
  return <>{children}</>
}
