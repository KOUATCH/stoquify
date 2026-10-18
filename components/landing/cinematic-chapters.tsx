"use client"
import { useLocale } from "next-intl"
import { Link } from "@/i18n/navigation"
import { GettingStarted } from "./landing-message-sections"
import { cinematicModules, CinematicModuleArt } from "./cinematic-modules"
import { CinematicSetup } from "./cinematic-setup"

export function CinematicChapters() {
  const locale = useLocale()
  const t = (en: string, fr: string) => (locale === "fr" ? fr : en)
  return (
    <div className="light-chapter" id="light-chapter">
      <section className="section features">
        <div className="section-title reveal">
          <p className="eyebrow">
            {t(
              "BUILT FOR THE WORK BEHIND YOUR BUSINESS",
              "POUR LES MÉTIERS QUI FONT VIVRE VOTRE ENTREPRISE",
            )}
          </p>
          <h2 className="display">
            {t(
              "From the first sale to the month-end review.",
              "De la première vente à la révision de fin de mois.",
            )}
          </h2>
          <p>
            {t(
              "Give every team the context to move its work forward.",
              "Donnez à chaque équipe les informations nécessaires pour avancer.",
            )}
          </p>
        </div>
        <p className="art-disclosure">
          {t(
            "Illustrative workflows with fictional records.",
            "Parcours illustratifs avec des données fictives.",
          )}
        </p>
        <div className="feature-grid">
          {cinematicModules.map((module) => (
            <article className="feature reveal" key={module.id}>
              <CinematicModuleArt module={module.id} />
              <p className="eyebrow">{t(module.label[0], module.label[1])}</p>
              <h3>{t(module.title[0], module.title[1])}</h3>
              <p>{t(module.body[0], module.body[1])}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="section statement reveal">
        <h2>
          {t(
            "Less time reconstructing the day. More clarity for the next decision.",
            "Moins de temps à reconstituer la journée. Plus de clarté pour décider.",
          )}
        </h2>
        <p>
          {t(
            "Keep the source, the status and the next step together.",
            "Gardez ensemble l’origine, le statut et la prochaine étape.",
          )}
        </p>
      </section>
      <CinematicSetup />
      <section className="section context">
        <div className="section-title reveal">
          <h2 className="display">
            {t(
              "Know what needs your attention.",
              "Sachez où porter votre attention.",
            )}
          </h2>
        </div>
        <div className="context-grid">
          {[
            [
              "Source",
              "Origine",
              "Return to the sale, receipt or document behind a figure.",
              "Retrouvez la vente, la réception ou la pièce derrière un chiffre.",
            ],
            [
              "Location",
              "Site",
              "Read stock and activity in the right shop or warehouse.",
              "Consultez stocks et activité pour la bonne boutique ou le bon entrepôt.",
            ],
            [
              "Status",
              "Statut",
              "Separate recorded activity from work still awaiting review.",
              "Distinguez l’activité enregistrée des éléments encore à vérifier.",
            ],
            [
              "Responsibility",
              "Responsabilité",
              "Give the next decision to the team with the right access.",
              "Confiez la prochaine décision à l’équipe disposant des accès adaptés.",
            ],
          ].map(([en, fr, body, frenchBody], i) => (
            <article className="reveal" key={en}>
              <span className="large-number">0{i + 1}</span>
              <h3>{t(en, fr)}</h3>
              <p>{t(body, frenchBody)}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="section safeguards">
        <div className="section-title reveal">
          <h2 className="display">
            {t(
              "Clear records. Deliberate decisions.",
              "Des dossiers clairs. Des décisions éclairées.",
            )}
          </h2>
        </div>
        <div className="three-grid">
          {[
            [
              "Connected evidence",
              "Des justificatifs reliés",
              "Keep the link between operations, supporting documents and review.",
              "Conservez le lien entre opérations, justificatifs et révision.",
            ],
            [
              "Useful context",
              "Un contexte utile",
              "Read figures with their period, currency, location and source.",
              "Lisez les chiffres avec leur période, devise, site et origine.",
            ],
            [
              "Visible checks",
              "Des contrôles visibles",
              "Keep outstanding reviews visible before moving to the next step.",
              "Gardez les vérifications en attente visibles avant de poursuivre.",
            ],
          ].map(([en, fr, body, frenchBody]) => (
            <article className="reveal" key={en}>
              <h3>{t(en, fr)}</h3>
              <p>{t(body, frenchBody)}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="section resources">
        <h2 className="reveal">
          {t("Choose where to begin.", "Choisissez votre point de départ.")}
        </h2>
        <div className="three-grid">
          {[
            [
              "/workflows",
              "Explore business workflows",
              "Explorer les parcours métier",
            ],
            [
              "/#showcase",
              "See the six product views",
              "Découvrir les six vues produit",
            ],
            ["/#start", "Prepare your workspace", "Préparer votre espace"],
          ].map(([href, en, fr], i) => (
            <Link className="resource reveal" href={href} key={href}>
              <small>0{i + 1}</small>
              <h3>{t(en, fr)}</h3>
              <span aria-hidden="true">↗︎</span>
            </Link>
          ))}
        </div>
      </section>
      <div className="availability">
        <GettingStarted />
      </div>
      <section id="get-started" className="section closing center reveal">
        <h2 className="display">
          {t(
            "Bring your next working day into focus.",
            "Abordez votre prochaine journée avec clarté.",
          )}
        </h2>
        <div className="closing-actions">
          <Link className="button primary" href="/register">
            {t("Create your account", "Créer votre compte")}{" "}
            <span aria-hidden="true">↗︎</span>
          </Link>
          <Link className="button outline" href="/workflows">
            {t("Explore the workflows", "Explorer les parcours")}
          </Link>
        </div>
        <div className="closing-cards">
          <article>
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
            <h3>
              {t(
                "For HR and finance teams",
                "Pour les équipes RH et financières",
              )}
            </h3>
            <p>
              {t(
                "Prepare people records, payroll inputs and accounting reviews with their supporting context.",
                "Préparez les dossiers du personnel, les données de paie et les révisions comptables avec leurs justificatifs.",
              )}
            </p>
          </article>
        </div>
      </section>
    </div>
  )
}
