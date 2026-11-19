"use client"

import type React from "react"

import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import {
  buildCrudMutationNotification,
  dispatchCrudMutationNotification,
  getFailedActionResultError,
  type CrudMutationMeta,
} from "@/lib/error-handling/crud-notifications"

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        mutationCache: new MutationCache({
          onSuccess: (data, _variables, _context, mutation) => {
            const failedActionError = getFailedActionResultError(data)
            if (failedActionError) {
              const notification = buildCrudMutationNotification(
                'error',
                mutation.options.meta as CrudMutationMeta | undefined,
                failedActionError
              )

              dispatchCrudMutationNotification(notification)
              return
            }

            const notification = buildCrudMutationNotification(
              'success',
              mutation.options.meta as CrudMutationMeta | undefined
            )

            dispatchCrudMutationNotification(notification)
          },
          onError: (error, _variables, _context, mutation) => {
            const notification = buildCrudMutationNotification(
              'error',
              mutation.options.meta as CrudMutationMeta | undefined,
              error
            )

            dispatchCrudMutationNotification(notification)
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
