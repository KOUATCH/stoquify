"use client"

import { registerUser } from "@/actions/auth"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import type { Locale } from "@/types/bilingual"
import type { AuthResponse, RegisterUserProps, RegisterWorkflowData } from "@/types/types"
import { useMutation } from "@tanstack/react-query"

type RegisterWorkflowResponse = AuthResponse & {
  data?: RegisterWorkflowData
}

const copy = {
  en: {
    successTitle: "Workspace created",
    successBody: "Verify your email before signing in.",
    errorTitle: "Registration failed",
    errorBody: "Unable to create workspace. Please try again.",
  },
  fr: {
    successTitle: "Espace cree",
    successBody: "Verifiez votre email avant la connexion.",
    errorTitle: "Inscription echouee",
    errorBody: "Impossible de creer l'espace. Veuillez reessayer.",
  },
} as const

export function useRegisterWorkflow(locale: Locale = "en") {
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation<RegisterWorkflowResponse, Error, RegisterUserProps>({
    meta: {
      operation: "create",
      entity: "Register Workflow",
      suppressSuccessNotification: true,
      suppressErrorNotification: true,
    },
    mutationFn: async (data) => {
      const result = (await registerUser(data)) as RegisterWorkflowResponse

      if (!result.success) {
        throw new Error(result.error || t.errorBody)
      }

      return result
    },
    onSuccess: (result) => {
      notifications.success(t.successTitle, result.message || t.successBody)
    },
    onError: (error) => {
      notifications.error(t.errorTitle, error.message || t.errorBody)
    },
  })
}
