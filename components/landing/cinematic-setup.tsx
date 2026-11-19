"use client"

import { PreviewLogo } from "./preview-logo"
import "./landing-sections.css"

import { useRef, useState } from "react"
import { useLocale } from "next-intl"
import {
  Building2,
  Mail,
  MapPin,
  Users,
  ClipboardCheck,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react"
import { Link } from "@/i18n/navigation"
import { cinematicModules } from "./cinematic-modules"
import { useCinematicSignedIn } from "./cinematic-shell"

export function CinematicSetup({ showGuideLink = true }: { showGuideLink?: boolean }) {
  const locale = useLocale()
  const signedIn = useCinematicSignedIn()
  const t = (en: string, fr: string) => (locale === "fr" ? fr : en)
  const [active, setActive] = useState(0)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const steps = [
    {
      title: t(
        "Create and verify your account",
        "Créez et vérifiez votre compte",
      ),
      body: t(
        "Add your organization details and administrator account, verify your email, then sign in.",
        "Renseignez votre organisation et votre compte administrateur, vérifiez votre e-mail, puis connectez-vous.",
      ),
      preview: t(
        "Your organization starts here.",
        "Votre organisation prend place.",
      ),
      prepare: t("Business name, country, currency and an email you can verify.", "Nom de l’entreprise, pays, devise et e-mail à vérifier."),
      result: t("A verified administrator account for your organization.", "Un compte administrateur vérifié pour votre organisation."),
      next: t("Define locations, responsibilities and your starting modules.", "Définir les sites, responsabilités et modules de départ."),
    },
    {
      title: t("Prepare your operations", "Préparez votre activité"),
      body: t(
        "Confirm your enabled modules, configure shops and warehouses, and give each team member the right access.",
        "Confirmez les modules activés, configurez boutiques et entrepôts, puis attribuez les accès adaptés à chaque membre de l’équipe.",
      ),
      preview: t("A place for every team.", "Une place pour chaque équipe."),
      prepare: t("Your sites, team list and the work each person should access.", "Vos sites, votre équipe et les tâches accessibles à chacun."),
      result: t("Configured locations and scoped team access.", "Des sites configurés et des accès délimités pour l’équipe."),
      next: t("Prepare and review the records needed for your first workflow.", "Préparer et vérifier les données du premier parcours."),
    },
    {
      title: t(
        "Begin with a reviewed workflow",
        "Commencez par un parcours vérifié",
      ),
      body: t(
        "Prepare opening stock and business records. Review required settings and accounting rules before following your first operation.",
        "Préparez les stocks et les données initiales. Vérifiez les paramètres requis et les règles comptables avant de suivre votre première opération.",
      ),
      preview: t(
        "Start with the right foundations.",
        "Partez sur de bonnes bases.",
      ),
      prepare: t("Item lists, opening quantities, balances and supporting records.", "Articles, quantités initiales, soldes et pièces justificatives."),
      result: t("Reviewed starting records and a clear first workflow.", "Des données initiales vérifiées et un premier parcours défini."),
      next: t("Begin within your approved scope; follow the source record through each handoff.", "Démarrer dans le périmètre approuvé et suivre chaque transmission."),
    },
  ]

  return (
    <section
      className="section onboarding"
      id="start"
      aria-labelledby="setup-title"
    >
      <div className="section-heading setup-heading reveal">
        <p className="eyebrow">
          {t("A PRACTICAL START", "UN DÉMARRAGE CONCRET")}
        </p>
        <h2 id="setup-title">
          {t(
            "Set up the workspace your team needs.",
            "Préparez l’espace dont votre équipe a besoin.",
          )}
        </h2>
        <p className="setup-intro">
          {t(
            "From your account to your first operation, take each step with a clear view of what comes next.",
            "Du compte à la première opération, avancez avec une vision claire de chaque étape.",
          )}
        </p>
      </div>
      <div className="setup-unit reveal">
      <div className="setup-copy">
        <div className="setup-steps">
          {steps.map((step, index) => (
            <div
              className={
                active === index ? "setup-step selected" : "setup-step"
              }
              key={step.title}
            >
              <h3>
                <button
                  ref={(element) => {
                    buttons.current[index] = element
                  }}
                  id={`setup-step-${index}`}
                  aria-expanded={active === index}
                  aria-controls={`setup-copy-${index} setup-preview`}
                  onClick={() => setActive(index)}
                  onKeyDown={(event) => {
                    const next =
                      event.key === "ArrowDown"
                        ? (index + 1) % 3
                        : event.key === "ArrowUp"
                          ? (index + 2) % 3
                          : event.key === "Home"
                            ? 0
                            : event.key === "End"
                              ? 2
                              : null
                    if (next === null) return
                    event.preventDefault()
                    setActive(next)
                    buttons.current[next]?.focus()
                  }}
                >
                  <span className="setup-number" aria-hidden="true">
                    0{index + 1}
                  </span>
                  <span>{step.title}</span>
                  <span className="setup-toggle" aria-hidden="true">
                    {active === index ? "−" : "+"}
                  </span>
                </button>
              </h3>
            </div>
          ))}
        </div>
        <div className="setup-descriptions">
          {steps.map((step, index) => (
            <div key={index} id={`setup-copy-${index}`} className="setup-description" aria-hidden={active !== index} inert={active !== index}>
              <p>{step.body}</p>
              <dl className="setup-step-guide">
                <div><dt>{t("Bring", "À préparer")}</dt><dd>{step.prepare}</dd></div>
                <div><dt>{t("You’ll have", "Résultat")}</dt><dd>{step.result}</dd></div>
                <div><dt>{t("Then", "Ensuite")}</dt><dd>{step.next}</dd></div>
              </dl>
            </div>
          ))}
        </div>
      </div>

      <div
        className="setup-preview"
        id="setup-preview"
        role="region"
        aria-labelledby={`setup-step-${active}`}
        data-visual-classification="sample"
      >
        <div className="setup-preview-bar">
          <PreviewLogo />
          <span>{t("WORKSPACE SETUP", "CONFIGURATION")}</span>
          <b>0{active + 1} / 03</b>
        </div>
        <div className="setup-scenes">
        {steps.map((step, index) => (
        <div className="setup-scene" key={index} data-step={index} aria-hidden={active !== index} inert={active !== index}>
          <h3>{step.preview}</h3>
          {index === 0 && (
            <div className="setup-account">
              <div className="setup-identity">
                <span className="setup-icon">
                  <Building2 size={24} aria-hidden="true" />
                </span>
                <div>
                  <small>{t("ORGANIZATION", "ORGANISATION")}</small>
                  <strong>{t("Your business", "Votre entreprise")}</strong>
                  <span>
                    {t(
                      "Business details · Country · Currency",
                      "Coordonnées · Pays · Devise",
                    )}
                  </span>
                </div>
              </div>
              <div className="setup-record">
                <Users size={20} aria-hidden="true" />
                <div>
                  <strong>
                    {t("Administrator account", "Compte administrateur")}
                  </strong>
                  <span>
                    {t(
                      "Your workspace’s first point of access",
                      "Le premier accès à votre espace",
                    )}
                  </span>
                </div>
              </div>
              <div className="setup-email">
                <Mail size={22} aria-hidden="true" />
                <div>
                  <strong>
                    {t("Verify your email", "Vérifiez votre e-mail")}
                  </strong>
                  <p>
                    {t(
                      "Follow the verification message before signing in.",
                      "Suivez le message de vérification avant de vous connecter.",
                    )}
                  </p>
                  <span>
                    {t("Verification required", "Vérification requise")}
                  </span>
                </div>
              </div>
            </div>
          )}
          {index === 1 && (
            <div className="setup-operations">
              <div className="setup-locations">
                <span>
                  <MapPin size={17} aria-hidden="true" />
                  {t("Shops & warehouses", "Boutiques et entrepôts")}
                </span>
                <span>
                  <Users size={17} aria-hidden="true" />
                  {t("Team access", "Accès de l’équipe")}
                </span>
              </div>
              <p className="setup-label">
                {t(
                  "CONFIRM YOUR ENABLED MODULES",
                  "CONFIRMEZ LES MODULES ACTIVÉS",
                )}
              </p>
              <div className="setup-module-grid">
                {cinematicModules.map((module) => (
                  <div key={module.id}>
                    <module.icon size={20} aria-hidden="true" />
                    <span>{t(module.label[0], module.label[1])}</span>
                  </div>
                ))}
              </div>
              <p className="setup-help">
                {t(
                  "Account creation does not activate every module.",
                  "La création du compte n’active pas tous les modules.",
                )}
              </p>
            </div>
          )}
          {index === 2 && (
            <div className="setup-readiness">
              {[
                [
                  t("Opening stock & records", "Stocks et données initiales"),
                  t(
                    "Items, quantities and source records",
                    "Articles, quantités et pièces d’origine",
                  ),
                ],
                [
                  t("Accounting settings", "Paramètres comptables"),
                  t(
                    "Posting rules and opening balances",
                    "Règles d’imputation et soldes d’ouverture",
                  ),
                ],
                [
                  t("First business workflow", "Premier parcours métier"),
                  t(
                    "Sale → stock → payment review",
                    "Vente → stock → contrôle du paiement",
                  ),
                ],
              ].map(([title, body]) => (
                <div className="setup-check" key={title}>
                  <ClipboardCheck size={20} aria-hidden="true" />
                  <div>
                    <strong>{title}</strong>
                    <span>{body}</span>
                  </div>
                  <small>{t("To review", "À vérifier")}</small>
                </div>
              ))}
              <p className="setup-help">
                {t(
                  "Review required settings before recording real activity.",
                  "Vérifiez les paramètres requis avant d’enregistrer des opérations réelles.",
                )}
              </p>
            </div>
          )}
        </div>
        ))}
        </div>
        <p className="setup-preview-note">
          {t(
            "Illustrative setup · No account is created in this preview",
            "Configuration illustrative · Aucun compte créé dans cet aperçu",
          )}
        </p>
      </div>
      <div className="setup-actions">
        <div className="setup-action-links">
          <Link className="button primary" href={signedIn ? "/dashboard/settings/modules" : "/register"}>
            {signedIn ? t("Prepare your workspace", "Préparer votre espace") : t("Create your account", "Créer votre compte")}{" "}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          {showGuideLink && <Link className="text-link setup-guide-link" href="/get-started">
            {t("Follow the setup guide", "Suivre le guide de démarrage")}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>}
        </div>
        <p className="setup-scope">
          {t(
            "Module availability, team permissions and country settings determine what you can use.",
            "Les modules disponibles, les droits d’accès et les paramètres du pays déterminent les fonctions utilisables.",
          )}
        </p>
      </div>
      </div>
    </section>
  )
}
