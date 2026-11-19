"use client"
import { useLocale } from "next-intl"
import { Link } from "@/i18n/navigation"
import { CinematicOffers } from "./cinematic-offers"
import { CinematicBusinessStory } from "./cinematic-business-story"
import { CinematicSetup } from "./cinematic-setup"
import { useCinematicSignedIn } from "./cinematic-shell"
import { ArrowUpRight, BookOpen, Building2, Compass, Layers3, Store, Users } from "lucide-react"
import { PreviewLogo } from "./preview-logo"
import "./landing-sections.css"

export function CinematicChapters() {
  const locale = useLocale()
  const signedIn = useCinematicSignedIn()
  const t = (en: string, fr: string) => (locale === "fr" ? fr : en)
  return (
    <div className="light-chapter" id="light-chapter">
      <CinematicBusinessStory />
      <CinematicOffers />
      <CinematicSetup />
      <section className="section resources" aria-labelledby="resources-title">
        <div className="section-heading reveal">
        <p className="eyebrow">{t("EXPLORE & PREPARE", "EXPLORER ET PRÉPARER")}</p>
        <h2 className="display" id="resources-title">
          {t("Choose where to begin.", "Choisissez votre point de départ.")}
        </h2>
        <p className="section-lead">{t("Understand the handoffs, see the workspace, then plan your setup.", "Comprenez les échanges, découvrez l’espace, puis préparez votre démarrage.")}</p>
        </div>
        <div className="resource-grid">
          {[
            { href: "/workflows", icon: BookOpen, title: ["Explore business workflows", "Explorer les parcours métier"], body: ["Follow each process, its owners and the records passed to the next team.", "Suivez chaque processus, ses responsables et les pièces transmises à l’équipe suivante."], action: ["Read the workflow guides", "Consulter les parcours"] },
            { href: "/#showcase", icon: Layers3, title: ["Explore the workflow library", "Explorer la bibliothèque des parcours"], body: ["Browse operations, finance, HRIS, payroll and accounting-firm previews in one place.", "Parcourez les aperçus des opérations, de la finance, du SIRH, de la paie et des cabinets."], action: ["See the previews", "Voir les aperçus"] },
            { href: "/get-started", icon: Compass, title: ["Prepare your workspace", "Préparer votre espace"], body: ["Review your organization, locations, starting records and the modules your team needs.", "Préparez votre organisation, vos sites, vos données initiales et les modules nécessaires."], action: ["Plan your setup", "Préparer le démarrage"] },
          ].map((resource, i) => (
            <Link className="resource reveal" href={resource.href} key={resource.href}>
              <div className="resource-top"><resource.icon size={23} aria-hidden="true" /><small>0{i + 1}</small></div>
              <h3>{t(resource.title[0], resource.title[1])}</h3>
              <p>{t(resource.body[0], resource.body[1])}</p>
              <span className="resource-action">{t(resource.action[0], resource.action[1])}<ArrowUpRight size={18} aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
      </section>
      <section id="get-started" className="section closing reveal" aria-labelledby="closing-title">
        <div className="closing-unit">
        <div className="closing-main">
        <div className="closing-copy">
        <PreviewLogo />
        <h2 className="display" id="closing-title">
          {t(
            "Run the day. Prepare the close.",
            "Pilotez la journée. Préparez la clôture.",
          )}
        </h2>
        <p>{t("Give every team a clear place to work and a connected record to hand over.", "Donnez à chaque équipe un espace de travail clair et des dossiers reliés à transmettre.")}</p>
        </div>
        <div className="closing-actions">
          <Link className="button primary" href={signedIn ? "/dashboard" : "/contact"}>
            {signedIn ? t("Open workspace", "Ouvrir l’espace") : t("Plan your workspace", "Préparer votre projet")}{" "}
            <span aria-hidden="true">↗︎</span>
          </Link>
          <Link className="button outline" href="/workflows">
            {t("Explore the workflows", "Explorer les parcours")}
          </Link>
          <small>{t("Start with your organization. Define the rollout scope together.", "Commencez par votre organisation. Définissez ensemble le périmètre du déploiement.")}</small>
        </div>
        </div>
        <div className="closing-cards">
          <article>
            <Store size={22} aria-hidden="true" />
            <h3>
              {t(
                "For owners and operations teams",
                "Pour les dirigeants et les équipes terrain",
              )}
            </h3>
            <p>
              {t(
                "Follow sales, stock and recorded payments across your configured locations.",
                "Suivez ventes, stocks et paiements enregistrés sur vos sites configurés.",
              )}
            </p>
          </article>
          <article>
            <Users size={22} aria-hidden="true" />
            <h3>
              {t(
                "For HR and finance teams",
                "Pour les équipes RH et financières",
              )}
            </h3>
            <p>
              {t(
                "Connect HRIS and payroll preparation with payment reconciliation, OHADA accounting records and period-end close.",
                "Reliez le SIRH et la préparation de la paie au rapprochement, aux comptes OHADA et à la clôture de période.",
              )}
            </p>
          </article>
          <article>
            <Building2 size={22} aria-hidden="true" />
            <h3>{t("For accounting firms", "Pour les cabinets comptables")}</h3>
            <p>{t("Review authorized client records, coordinate evidence requests and prepare the close with your clients.", "Examinez les dossiers clients autorisés, coordonnez les demandes de pièces et préparez la clôture avec vos clients.")}</p>
          </article>
        </div>
        </div>
      </section>
    </div>
  )
}
