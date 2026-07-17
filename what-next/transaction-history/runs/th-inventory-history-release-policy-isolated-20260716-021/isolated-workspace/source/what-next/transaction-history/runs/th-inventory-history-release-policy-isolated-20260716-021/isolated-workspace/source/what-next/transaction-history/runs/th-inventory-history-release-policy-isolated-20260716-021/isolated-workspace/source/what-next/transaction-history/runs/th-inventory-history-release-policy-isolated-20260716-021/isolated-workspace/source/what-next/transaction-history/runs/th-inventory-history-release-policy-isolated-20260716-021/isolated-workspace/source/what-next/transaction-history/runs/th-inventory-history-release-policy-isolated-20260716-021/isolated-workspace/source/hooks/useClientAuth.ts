"use client"

import { useSession } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useClientAuth(required = true) {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const isAuthenticated = !!session?.user

  useEffect(() => {
    if (required && !isPending && !isAuthenticated) {
      router.push('/login')
    }
  }, [isPending, isAuthenticated, required, router])

  const organizationId = (session?.user as any)?.organizationId as string | undefined

  return {
    session,
    user: session?.user,
    isLoading: isPending,
    isAuthenticated,
    organizationId,
  }
}

export function useOrgAuth() {
  const auth = useClientAuth(true)
  const router = useRouter()

  useEffect(() => {
    if (auth.isAuthenticated && !auth.organizationId) {
      router.push('/register')
    }
  }, [auth.isAuthenticated, auth.organizationId, router])

  return {
    ...auth,
    hasOrganization: !!auth.organizationId,
  }
}
