export const accountantAccessCopy = {
  en: {
    eyebrow: "Client consent", title: "Accountant Access",
    description: "Manage explicit accountant mandates, roles, expiry, evidence, and revocation.",
    invite: "Invite an accountant",
    invitationHelp: "Existing users receive access immediately. New accountants receive a consent-bound invitation and referral onboarding link.",
    email: "Accountant email", firm: "Firm name", registration: "Firm registration number", role: "Role",
    effective: "Effective from", expires: "Expires at", consent: "Signed consent evidence hash",
    saving: "Saving…", submit: "Invite or grant access", caption: "Accountant access grants",
    empty: "No accountant access grants.", firmColumn: "Firm", status: "Status", expiry: "Expiry", action: "Action",
    revoke: "Revoke", revokeReason: "Reason for revocation", granted: "Accountant access granted.",
    queued: "Accountant invitation queued.", expired: "Accountant access had already expired.", revoked: "Accountant access revoked.",
    loadError: "Accountant access could not be loaded.",
    roles: { READ_ONLY: "Read only", REVIEWER: "Reviewer", PREPARER: "Preparer" },
    statuses: { ACTIVE: "Active", SCHEDULED: "Scheduled", EXPIRED: "Expired", REVOKED: "Revoked" },
  },
  fr: {
    eyebrow: "Consentement du client", title: "Accès comptable",
    description: "Gérez les mandats explicites des comptables, leurs rôles, échéances, justificatifs et révocations.",
    invite: "Inviter un comptable",
    invitationHelp: "Les utilisateurs existants reçoivent immédiatement l’accès. Les nouveaux comptables reçoivent une invitation liée au consentement et un lien d’inscription par recommandation.",
    email: "Adresse e-mail du comptable", firm: "Nom du cabinet", registration: "Numéro d’immatriculation du cabinet", role: "Rôle",
    effective: "Prise d’effet", expires: "Expiration", consent: "Empreinte du justificatif de consentement signé",
    saving: "Enregistrement…", submit: "Inviter ou accorder l’accès", caption: "Autorisations d’accès comptable",
    empty: "Aucune autorisation d’accès comptable.", firmColumn: "Cabinet", status: "Statut", expiry: "Échéance", action: "Action",
    revoke: "Révoquer", revokeReason: "Motif de révocation", granted: "Accès comptable accordé.",
    queued: "Invitation du comptable mise en attente d’envoi.", expired: "L’accès comptable avait déjà expiré.", revoked: "Accès comptable révoqué.",
    loadError: "Impossible de charger les accès comptables.",
    roles: { READ_ONLY: "Lecture seule", REVIEWER: "Réviseur", PREPARER: "Préparateur" },
    statuses: { ACTIVE: "Actif", SCHEDULED: "Planifié", EXPIRED: "Expiré", REVOKED: "Révoqué" },
  },
} as const

export function accountantAccessLabel(values: Record<string, string>, value: string) {
  return Object.prototype.hasOwnProperty.call(values, value) ? values[value] : value
}
