"use client"

import { useState, type FormEvent } from "react"
import { useLocale } from "next-intl"
import { ArrowRight, Download, Mail, Check } from "lucide-react"
import { Link } from "@/i18n/navigation"
import type { PublicContact } from "@/lib/public-site"
import { enquiryInterest, enquiryInterests, enquiryMailto, formatEnquiry, interestLabels, type EnquiryBrief } from "./enquiry-brief"
import "./landing-production.css"

export function EnquiryForm({ contact, interest }: { contact: PublicContact; interest?: string }) {
  const locale = useLocale()
  const fr = locale === "fr"
  const t = (en: string, french: string) => fr ? french : en
  const [brief, setBrief] = useState<EnquiryBrief>({ organization: "", country: "", interest: enquiryInterest(interest), team: "", locations: "", priorities: "" })
  const [draftOpened, setDraftOpened] = useState(false)
  const [saved, setSaved] = useState(false)
  const update = (field: keyof EnquiryBrief, value: string) => { setBrief(current => ({ ...current, [field]: value })); setDraftOpened(false); setSaved(false) }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!contact.email) return
    window.location.assign(enquiryMailto(contact.email, brief, locale))
    setDraftOpened(true)
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([formatEnquiry(brief, locale)], { type: "text/plain;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url; link.download = `stoquify-${fr ? "projet" : "workspace"}.txt`; link.click()
    URL.revokeObjectURL(url); setSaved(true)
  }
  return <main id="main" tabIndex={-1} className="public-detail enquiry-page public-contour-page">
    <section className="section">
      <Link className="sme-link" href="/pricing">{t("Offers & pricing", "Offres et tarifs")}</Link>
      <div className="enquiry-heading"><p className="eyebrow">{t("YOUR NEXT STEP", "VOTRE PROCHAINE ÉTAPE")}</p><h1>{t("A workspace shaped around your business.", "Un espace adapté à votre activité.")}</h1><p>{t("Tell us where you want to start. Keep a brief of your needs and confirm the modules, country support and full cost before committing.", "Précisez votre point de départ. Conservez vos besoins et confirmez modules, prise en charge du pays et coût global avant de vous engager.")}</p></div>
      <div className="enquiry-unit">
        <form onSubmit={submit} className="enquiry-form">
          <label>{t("Your priority", "Votre priorité")}<select value={brief.interest} onChange={e => update("interest", e.target.value)}>{enquiryInterests.map(value => <option key={value} value={value}>{interestLabels[value][fr ? 1 : 0]}</option>)}</select></label>
          <div className="enquiry-fields">
            <label>{t("Organization", "Organisation")}<input value={brief.organization} onChange={e => update("organization", e.target.value)} maxLength={100} autoComplete="organization" /></label>
            <label>{t("Country to review", "Pays à étudier")}<input value={brief.country} onChange={e => update("country", e.target.value)} maxLength={80} autoComplete="country-name" aria-describedby="country-scope" /></label>
            <label>{t("Team size", "Effectif")}<select value={brief.team} onChange={e => update("team", e.target.value)}><option value="">{t("To discuss", "À préciser")}</option>{["1–10", "11–50", "51–200", "200+"].map(value => <option key={value}>{value}</option>)}</select></label>
            <label>{t("Number of locations", "Nombre de sites")}<input value={brief.locations} onChange={e => update("locations", e.target.value)} inputMode="numeric" pattern="[0-9]*" maxLength={5} /></label>
          </div>
          <p id="country-scope" className="enquiry-help">{t("Country, payroll and provider support must be confirmed for your rollout.", "La prise en charge du pays, de la paie et des prestataires doit être confirmée pour votre déploiement.")}</p>
          <label>{t("What would you like to organize first?", "Que souhaitez-vous organiser en premier ?")}<textarea value={brief.priorities} onChange={e => update("priorities", e.target.value)} rows={4} maxLength={1000} aria-describedby="enquiry-privacy" /></label>
          <p id="enquiry-privacy" className="enquiry-help">{t("Optional details. Do not include employee, payroll, banking or other confidential records. This page keeps your brief in memory only; nothing is submitted automatically.", "Champs facultatifs. N’ajoutez pas de dossiers salariés, de paie, de coordonnées bancaires ou d’autres données confidentielles. Cette page garde votre projet uniquement en mémoire ; rien n’est envoyé automatiquement.")}</p>
          <div className="enquiry-actions">
            {contact.email && <button type="submit" className="button primary"><Mail size={17} aria-hidden="true" />{t("Open enquiry email", "Ouvrir l’e-mail de demande")}</button>}
            <button type="button" className="button outline" onClick={download}><Download size={17} aria-hidden="true" />{t("Save my brief", "Enregistrer mon projet")}</button>
          </div>
          <div role="status" className="enquiry-help">{draftOpened ? t("Your email application was requested. Review and send the draft there. Stoquify has not confirmed receipt. If no draft opens, save your brief and email the address alongside.", "L’ouverture de votre messagerie a été demandée. Vérifiez puis envoyez le brouillon. Stoquify n’a pas confirmé sa réception. Si rien ne s’ouvre, enregistrez votre projet et utilisez l’adresse ci-contre.") : saved ? t("Your brief is ready to download. It has not been sent to Stoquify.", "Votre projet est prêt à être téléchargé. Il n’a pas été envoyé à Stoquify.") : ""}</div>
        </form>
        <aside className="enquiry-next"><h2>{t("What we need to clarify together", "Les points à préciser ensemble")}</h2><ol>{[
          ["Your starting modules and responsibilities", "Vos modules de départ et les responsabilités"],
          ["Country rules, providers and device requirements", "Règles du pays, prestataires et équipements"],
          ["Existing records, setup and training", "Données existantes, mise en place et formation"],
          ["Software, services and any separate costs", "Logiciel, services et éventuels coûts distincts"],
        ].map(copy => <li key={copy[0]}><Check size={17} aria-hidden="true" />{copy[fr ? 1 : 0]}</li>)}</ol>
        {contact.company && <strong>{contact.company}</strong>}
        {contact.email && <a className="sme-link" href={`mailto:${contact.email}`}>{contact.email}</a>}
        {contact.bookingUrl && <a className="button primary" href={contact.bookingUrl}>{t("Arrange a conversation", "Organiser un échange")}<ArrowRight size={17} aria-hidden="true" /></a>}
        {!contact.email && !contact.bookingUrl && <p className="enquiry-help">{t("Online enquiries are not available yet. Save your brief for your next conversation with the Stoquify team; no request will be sent from this page.", "Les demandes en ligne ne sont pas encore disponibles. Enregistrez votre projet pour votre prochain échange avec l’équipe Stoquify ; aucune demande ne sera envoyée depuis cette page.")}</p>}
        <Link className="sme-link" href="/get-started">{t("See the preparation guide", "Voir le guide de préparation")}<ArrowRight size={16} aria-hidden="true" /></Link>
        {contact.privacyUrl && <a className="sme-link" href={contact.privacyUrl}>{t("Privacy", "Confidentialité")}</a>}
        </aside>
      </div>
    </section>
  </main>
}
