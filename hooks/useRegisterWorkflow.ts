"use client"

import { registerUser } from "@/actions/auth"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import type { Locale } from "@/types/bilingual"
import type { AuthResponse, RegisterUserProps, RegisterWorkflowData } from "@/types/types"
import { useMutation } from "@tanstack/react-query"

type RegisterWorkflowResponse = AuthResponse & {
  data?: RegisterWorkflowData
  retryAfterSeconds?: number
}

const copy = {
  en: {
    successTitle: "Workspace created",
    successBody: "Continue to email verification. You can request a code there if needed.",
    errorTitle: "Registration failed",
    errorBody: "Unable to create workspace. Please try again.",
    validation: "Check the registration details, password confirmation and required acceptance.",
    limited: "Too many registration attempts. Wait about {minutes} minutes before trying again. If you already created an account, continue verification or sign in.",
    policy: "Choose a password of 12 to 128 characters without common, repeated or breached values or your email address.",
    uncertain: "The workspace outcome could not be confirmed. Your entries are preserved. Check for a verification email or try signing in before creating another workspace.",
  },
  fr: {
    successTitle: "Espace créé",
    successBody: "Passez à la vérification de votre email. Vous pourrez y demander un code si nécessaire.",
    errorTitle: "Inscription échouée",
    errorBody: "Impossible de créer l’espace. Veuillez réessayer.",
    validation: "Vérifiez les informations d’inscription, la confirmation du mot de passe et l’acceptation requise.",
    limited: "Trop de tentatives d’inscription. Attendez environ {minutes} minutes avant de réessayer. Si votre compte est déjà créé, poursuivez la vérification ou connectez-vous.",
    policy: "Choisissez 12 à 128 caractères, sans mot de passe courant, répété, compromis ni votre adresse email.",
    uncertain: "Le résultat de la création n’a pas pu être confirmé. Vos données sont conservées. Vérifiez vos emails ou essayez de vous connecter avant de créer un autre espace.",
  },
} as const

export class RegistrationWorkflowError extends Error {
  constructor(message: string, public code?: string, public fieldErrors?: Record<string, string[]>) { super(message); this.name = "RegistrationWorkflowError" }
}

export function useRegisterWorkflow(locale: Locale = "en") {
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation<RegisterWorkflowResponse, Error, RegisterUserProps>({
    retry: false,
    meta: {
      operation: "create",
      entity: "Register Workflow",
      suppressSuccessNotification: true,
      suppressErrorNotification: true,
    },
    mutationFn: async (data) => {
      let result: RegisterWorkflowResponse
      try { result = (await registerUser(data)) as RegisterWorkflowResponse }
      catch { throw new RegistrationWorkflowError(t.uncertain, "OUTCOME_UNCONFIRMED") }

      if (!result.success) {
        const minutes = Math.max(1, Math.ceil((result.retryAfterSeconds ?? 3600) / 60))
        throw new RegistrationWorkflowError(result.code === "RATE_LIMITED" ? t.limited.replace("{minutes}", String(minutes)) : result.code === "VALIDATION_ERROR" ? t.validation : ["WEAK", "BREACHED", "RECENTLY_USED", "CONTAINS_EMAIL"].includes(result.code ?? "") ? t.policy : t.errorBody, result.code, result.fieldErrors)
      }
      if (!result.data?.userId || !result.data.organizationId || result.data.verificationRequired !== true || result.data.email?.trim().toLowerCase() !== data.email.trim().toLowerCase()) throw new RegistrationWorkflowError(t.uncertain, "OUTCOME_UNCONFIRMED")

      return result
    },
    onSuccess: () => {
      notifications.success(t.successTitle, t.successBody)
    },
    onError: (error) => {
      notifications.error(t.errorTitle, error.message || t.errorBody)
    },
  })
}
