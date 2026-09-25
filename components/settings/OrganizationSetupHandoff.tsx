"use client"

import { ExternalLink } from "lucide-react"
import type { RefObject } from "react"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Locale } from "@/types/bilingual"

const copy = {
  en: {
    title: "Set up another organization",
    description: "Create the owner account and company together through registration.",
    current: "Your current account belongs to this organization. This page cannot switch it to another company.",
    owner: "The new owner needs an email address that is not already registered, their own password, the company details and the required registration acceptance. The owner must verify their email before signing in.",
    otherOwner: "If someone else will own the company, give them the registration link so they can enter their own credentials and acceptance.",
    session: "Registration opens in a new tab and does not change this workspace. Save unfinished work before signing in with a different account: signing in changes the active account across browser tabs.",
    register: "Open owner registration", existing: "Sign in to an existing organization", newTab: "opens in a new tab", close: "Back to this organization",
  },
  fr: {
    title: "Configurer une autre organisation",
    description: "Créez ensemble le compte du propriétaire et l’entreprise avec le parcours d’inscription.",
    current: "Votre compte actuel appartient à cette organisation. Cette page ne permet pas de le basculer vers une autre entreprise.",
    owner: "Le nouveau propriétaire doit fournir une adresse email non encore inscrite, son propre mot de passe, les informations de l’entreprise et les acceptations requises. Il doit vérifier son email avant de se connecter.",
    otherOwner: "Si une autre personne sera propriétaire, transmettez-lui le lien d’inscription afin qu’elle saisisse ses propres identifiants et acceptations.",
    session: "L’inscription s’ouvre dans un nouvel onglet sans modifier cet espace. Enregistrez votre travail avant de vous connecter avec un autre compte : cette connexion change le compte actif dans les onglets du navigateur.",
    register: "Ouvrir l’inscription du propriétaire", existing: "Se connecter à une organisation existante", newTab: "s’ouvre dans un nouvel onglet", close: "Revenir à cette organisation",
  },
} as const

export const organizationSetupLabel = (locale: Locale) => copy[locale].title

export default function OrganizationSetupHandoff({ open, onOpenChange, locale, returnFocus }: { open: boolean; onOpenChange: (value: boolean) => void; locale: Locale; returnFocus?: RefObject<HTMLButtonElement | null> }) {
  const t = copy[locale]
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent onCloseAutoFocus={event => { if (returnFocus?.current) { event.preventDefault(); returnFocus.current.focus() } }} className="dashboard-landing-theme dark max-h-[90dvh] overflow-y-auto border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)] sm:max-w-xl" closeLabel={`${t.close}: ${t.title}`}>
      <DialogHeader><DialogTitle>{t.title}</DialogTitle><DialogDescription className="text-[var(--dash-text-soft)]">{t.description}</DialogDescription></DialogHeader>
      <div className="space-y-3 text-sm leading-6"><p>{t.current}</p><p>{t.owner}</p><p>{t.otherOwner}</p><p className="rounded border border-[var(--dash-border-subtle)] p-3">{t.session}</p></div>
      <DialogFooter className="flex-col gap-2 sm:flex-col">
        <Button asChild className="dashboard-button-primary h-auto whitespace-normal"><Link href="/register-v2" locale={locale} target="_blank" rel="noopener noreferrer">{t.register}<ExternalLink className="ms-2 size-4 shrink-0" aria-hidden="true" /><span className="sr-only"> ({t.newTab})</span></Link></Button>
        <Button asChild variant="outline" className="dashboard-button-secondary h-auto whitespace-normal"><Link href="/login-v2" locale={locale} target="_blank" rel="noopener noreferrer">{t.existing}<ExternalLink className="ms-2 size-4 shrink-0" aria-hidden="true" /><span className="sr-only"> ({t.newTab})</span></Link></Button>
        <Button type="button" variant="ghost" className="h-auto whitespace-normal" onClick={() => onOpenChange(false)}>{t.close}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}
