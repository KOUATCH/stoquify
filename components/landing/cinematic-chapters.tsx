"use client"
import { useLocale } from "next-intl"
import { Link } from "@/i18n/navigation"
import { GettingStarted } from "./landing-message-sections"
import { CinematicBusinessStory } from "./cinematic-business-story"
import { CinematicSetup } from "./cinematic-setup"

export function CinematicChapters() {
  const locale = useLocale()
  const t = (en: string, fr: string) => (locale === "fr" ? fr : en)
  return (
    <div className="light-chapter" id="light-chapter">
      <CinematicBusinessStory />
      <CinematicSetup />
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
            "Run the day. Prepare the close.",
            "Pilotez la journée. Préparez la clôture.",
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
                "Connect HRIS and payroll preparation with payment reconciliation, OHADA accounting records and period-end close.",
                "Reliez le SIRH et la préparation de la paie au rapprochement, aux comptes OHADA et à la clôture de période.",
              )}
            </p>
          </article>
        </div>
      </section>
    </div>
  )
}
