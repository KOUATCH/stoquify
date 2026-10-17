"use client"
import { useLocale } from "next-intl"
import type { CSSProperties } from "react"
import { Link } from "@/i18n/navigation"
import { GettingStarted } from "./landing-message-sections"
export function CinematicChapters() {
  const locale = useLocale()
  const t = (en: string, fr: string) => (locale === "fr" ? fr : en)
  return (
    <div className="light-chapter" id="light-chapter">
      <section className="section features">
        <div className="section-title reveal">
          <h2 className="display">
            {t(
              "Less piecing things together. More moving forward.",
              "Moins de rapprochements. Plus de clarté pour avancer.",
            )}
          </h2>
        </div>
        <div className="feature-grid">
          <article className="feature reveal">
            <div className="art cards" aria-hidden="true">
              <div className="paper p3">
                <small>{t("SALE · 104", "VENTE · 104")}</small>
                <b>{t("One connected record", "Un dossier connecté")}</b>
                <em>{t("Stock movement →", "Mouvement de stock →")}</em>
              </div>
              <div className="paper p2">
                <small>{t("STOCK · MAIN SHOP", "STOCK · BOUTIQUE")}</small>
                <b>{t("Quantity −2", "Quantité −2")}</b>
                <em>{t("Linked to sale 104", "Lié à la vente 104")}</em>
              </div>
              <div className="paper p1">
                <small>
                  {t("PAYMENT · REVIEW", "PAIEMENT · VÉRIFICATION")}
                </small>
                <b>{t("Evidence attached", "Justificatif joint")}</b>
                <em>{t("Ready for review", "Prêt pour vérification")}</em>
              </div>
            </div>
            <h3>{t("Keep the sale connected", "Gardez la vente connectée")}</h3>
            <p>
              {t(
                "Follow the sale, its stock movement and the payment record through one understandable sequence.",
                "Suivez la vente, son mouvement de stock et son paiement dans un parcours compréhensible.",
              )}
            </p>
          </article>
          <article className="feature reveal">
            <div className="art bars" aria-hidden="true">
              <div className="bar-chart">
                <i style={{ "--h": "42%", "--i": "0" } as CSSProperties}></i>
                <i style={{ "--h": "64%", "--i": "1" } as CSSProperties}></i>
                <i style={{ "--h": "49%", "--i": "2" } as CSSProperties}></i>
                <i style={{ "--h": "86%", "--i": "3" } as CSSProperties}></i>
                <i style={{ "--h": "65%", "--i": "4" } as CSSProperties}></i>
                <i style={{ "--h": "96%", "--i": "5" } as CSSProperties}></i>
                <i style={{ "--h": "78%", "--i": "6" } as CSSProperties}></i>
              </div>
              <div className="art-pill">
                {t("Main shop · Warehouse", "Boutique · Entrepôt")}
              </div>
            </div>
            <h3>
              {t("Know what moved, and where", "Sachez ce qui a bougé, et où")}
            </h3>
            <p>
              {t(
                "Read stock quantities in their location context and inspect the movement behind a change.",
                "Consultez les stocks par emplacement et examinez le mouvement à l’origine d’un changement.",
              )}
            </p>
          </article>
          <article className="feature reveal">
            <div className="art orbit" aria-hidden="true">
              <div className="ring r1"></div>
              <div className="ring r2"></div>
              <div className="ring r3"></div>
              <span className="orb"></span>
            </div>
            <h3>
              {t(
                "Give every payment its context",
                "Donnez du contexte à chaque paiement",
              )}
            </h3>
            <p>
              {t(
                "Keep the recorded amount, source and supporting evidence close to the review.",
                "Gardez le montant enregistré, la source et les justificatifs à portée de la vérification.",
              )}
            </p>
          </article>
          <article className="feature reveal">
            <div className="art ledger-art" aria-hidden="true">
              <div className="ledger">
                <div style={{ "--i": "0" } as CSSProperties}>
                  <i>{"01"}</i>
                  <span>{t("Sale recorded", "Vente enregistrée")}</span>
                  <b>{"↗︎"}</b>
                </div>
                <div style={{ "--i": "1" } as CSSProperties}>
                  <i>{"02"}</i>
                  <span>{t("Movement linked", "Mouvement relié")}</span>
                  <b>{"↗︎"}</b>
                </div>
                <div style={{ "--i": "2" } as CSSProperties}>
                  <i>{"03"}</i>
                  <span>{t("Payment to review", "Paiement à vérifier")}</span>
                  <b>{"↗︎"}</b>
                </div>
              </div>
            </div>
            <h3>
              {t(
                "Follow the path to review",
                "Suivez le chemin vers la révision",
              )}
            </h3>
            <p>
              {t(
                "Bring source records into view before deciding what is ready for accounting review.",
                "Consultez les pièces d’origine avant de décider ce qui est prêt pour la révision comptable.",
              )}
            </p>
          </article>
        </div>
      </section>
      <section className="section statement reveal">
        <h2>
          {t(
            "One sale shouldn’t become five disconnected records.",
            "Une vente ne devrait pas devenir cinq dossiers déconnectés.",
          )}
        </h2>
        <p>
          {t(
            "Clarity begins with the connections.",
            "La clarté commence par les liens.",
          )}
        </p>
      </section>
      <section className="section onboarding split" id="start">
        <div className="reveal">
          <h2>
            {t(
              "Start with your workspace. Build from there.",
              "Commencez par votre espace de travail. Avancez à partir de là.",
            )}
          </h2>
          <div className="steps">
            <details name="cinematic-onboarding" open>
              <summary>
                <span>{t("Create your account", "Créez votre compte")}</span>
                <span aria-hidden="true">{"+"}</span>
              </summary>
              <p>
                {t(
                  "Register and verify your email.",
                  "Inscrivez-vous et vérifiez votre adresse e-mail.",
                )}
              </p>
            </details>
            <details name="cinematic-onboarding">
              <summary>
                <span>
                  {t("Set up your workspace", "Configurez votre espace")}
                </span>
                <span aria-hidden="true">{"+"}</span>
              </summary>
              <p>
                {t(
                  "Configure the organization and locations for your business.",
                  "Configurez l’organisation et les emplacements de votre entreprise.",
                )}
              </p>
            </details>
            <details name="cinematic-onboarding">
              <summary>
                <span>
                  {t(
                    "Follow your first workflow",
                    "Suivez votre premier parcours",
                  )}
                </span>
                <span aria-hidden="true">{"+"}</span>
              </summary>
              <p>
                {t(
                  "Explore the records behind a sale, stock movement and payment.",
                  "Explorez les pièces liées à une vente, un mouvement de stock et un paiement.",
                )}
              </p>
            </details>
          </div>
          <Link className="button primary" href="/register">
            <span>{t("Create your account", "Créer votre compte")}</span>
            <span aria-hidden="true">{"↗︎"}</span>
          </Link>
        </div>
        <div className="convergence reveal" aria-hidden="true">
          <svg viewBox="0 0 500 600">
            <defs>
              <linearGradient id="beam">
                <stop stopColor="#a4d6dc" stopOpacity="0" />
                <stop offset="1" stopColor="#dbeefa" />
              </linearGradient>
              <radialGradient id="halo">
                <stop stopColor="#f8fcff" stopOpacity=".8" />
                <stop offset=".2" stopColor="#8ed2df" stopOpacity=".25" />
                <stop offset="1" stopColor="#7bcbd9" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="250" cy="160" r="130" fill="url(#halo)" />
            <path
              d="M-2 600Q250 450 250 160"
              stroke="url(#beam)"
              fill="none"
              opacity=".4"
            />
            <path
              d="M26 600Q250 450 250 160"
              stroke="url(#beam)"
              fill="none"
              opacity=".4"
            />
            <path
              d="M54 600Q250 450 250 160"
              stroke="url(#beam)"
              fill="none"
              opacity=".4"
            />
            <path
              d="M82 600Q250 450 250 160"
              stroke="url(#beam)"
              fill="none"
              opacity=".4"
            />
            <path
              d="M110 600Q250 450 250 160"
              stroke="url(#beam)"
              fill="none"
              opacity=".4"
            />
            <path
              d="M138 600Q250 450 250 160"
              stroke="url(#beam)"
              fill="none"
              opacity=".4"
            />
            <path
              d="M166 600Q250 450 250 160"
              stroke="url(#beam)"
              fill="none"
              opacity=".4"
            />
            <path
              d="M194 600Q250 450 250 160"
              stroke="url(#beam)"
              fill="none"
              opacity=".4"
            />
            <path
              d="M222 600Q250 450 250 160"
              stroke="url(#beam)"
              fill="none"
              opacity=".4"
            />
            <path
              d="M250 600Q250 450 250 160"
              stroke="url(#beam)"
              fill="none"
              opacity=".4"
            />
            <path
              d="M278 600Q250 450 250 160"
              stroke="url(#beam)"
              fill="none"
              opacity=".4"
            />
            <path
              d="M306 600Q250 450 250 160"
              stroke="url(#beam)"
              fill="none"
              opacity=".4"
            />
            <path
              d="M334 600Q250 450 250 160"
              stroke="url(#beam)"
              fill="none"
              opacity=".4"
            />
            <path
              d="M362 600Q250 450 250 160"
              stroke="url(#beam)"
              fill="none"
              opacity=".4"
            />
            <path
              d="M390 600Q250 450 250 160"
              stroke="url(#beam)"
              fill="none"
              opacity=".4"
            />
            <path
              d="M418 600Q250 450 250 160"
              stroke="url(#beam)"
              fill="none"
              opacity=".4"
            />
            <path
              d="M446 600Q250 450 250 160"
              stroke="url(#beam)"
              fill="none"
              opacity=".4"
            />
            <path
              d="M474 600Q250 450 250 160"
              stroke="url(#beam)"
              fill="none"
              opacity=".4"
            />
            <path
              d="M502 600Q250 450 250 160"
              stroke="url(#beam)"
              fill="none"
              opacity=".4"
            />
            <circle
              className="signal-dot"
              cx="250"
              cy="160"
              r="6"
              fill="#edfaff"
            />
            <circle
              className="signal-dot second"
              cx="250"
              cy="340"
              r="4"
              fill="#edfaff"
            />
          </svg>
        </div>
      </section>
      <section className="section context">
        <div className="section-title reveal">
          <h2 className="display">
            {t(
              "The detail you need. The perspective you want.",
              "Le détail nécessaire. La vue d’ensemble souhaitée.",
            )}
          </h2>
        </div>
        <div className="context-grid">
          <article className="reveal">
            <span className="large-number">{"01"}</span>
            <h3>{t("Source", "Origine")}</h3>
            <p>
              {t(
                "See where the record came from.",
                "Identifiez l’origine de chaque pièce.",
              )}
            </p>
          </article>
          <article className="reveal">
            <span className="large-number">{"02"}</span>
            <h3>{t("Location", "Emplacement")}</h3>
            <p>
              {t(
                "Keep the right shop or warehouse in view.",
                "Gardez la bonne boutique ou le bon entrepôt en vue.",
              )}
            </p>
          </article>
          <article className="reveal">
            <span className="large-number">{"03"}</span>
            <h3>{t("Status", "Statut")}</h3>
            <p>
              {t(
                "Distinguish recorded activity from completed review.",
                "Distinguez l’activité enregistrée de la vérification terminée.",
              )}
            </p>
          </article>
          <article className="reveal">
            <span className="large-number">{"04"}</span>
            <h3>{t("Next step", "Prochaine étape")}</h3>
            <p>
              {t(
                "Find the action that follows the evidence.",
                "Identifiez l’action à mener au vu des justificatifs.",
              )}
            </p>
          </article>
        </div>
      </section>
      <section className="section safeguards">
        <div className="section-title reveal">
          <h2 className="display">
            {t(
              "Confidence comes from knowing the full story.",
              "La confiance vient d’une vision complète.",
            )}
          </h2>
        </div>
        <div className="three-grid">
          <article className="reveal">
            <div className="symbol" aria-hidden="true">
              {"◇"}
            </div>
            <h3>{t("Connected records", "Des pièces reliées")}</h3>
            <p>
              {t(
                "Keep the relationship between business activity and review visible.",
                "Gardez visibles les liens entre l’activité et sa révision.",
              )}
            </p>
          </article>
          <article className="reveal">
            <div className="symbol" aria-hidden="true">
              {"◎"}
            </div>
            <h3>{t("Clear context", "Un contexte clair")}</h3>
            <p>
              {t(
                "Read figures with their location, period and source.",
                "Lisez les chiffres avec leur emplacement, leur période et leur source.",
              )}
            </p>
          </article>
          <article className="reveal">
            <div className="symbol" aria-hidden="true">
              {"≡"}
            </div>
            <h3>{t("Visible next steps", "Des suites visibles")}</h3>
            <p>
              {t(
                "Give attention to records that still need a decision.",
                "Portez votre attention sur les pièces qui attendent une décision.",
              )}
            </p>
          </article>
        </div>
      </section>
      <section className="section resources">
        <h2 className="reveal">
          <span>{t("Explore your next step", "Explorez la suite")}</span>
        </h2>
        <div className="three-grid">
          <Link className="resource reveal" href="/workflows">
            <small>{"01"}</small>
            <h3>{t("Explore the workflow atlas", "Explorer les parcours")}</h3>
            <span aria-hidden="true">{"↗︎"}</span>
          </Link>
          <Link className="resource reveal" href="/#showcase">
            <small>{"02"}</small>
            <h3>
              {t("Meet the connected workspace", "Découvrir l’espace connecté")}
            </h3>
            <span aria-hidden="true">{"↗︎"}</span>
          </Link>
          <Link className="resource reveal" href="/#start">
            <small>{"03"}</small>
            <h3>{t("See how to get started", "Voir comment démarrer")}</h3>
            <span aria-hidden="true">{"↗︎"}</span>
          </Link>
        </div>
      </section>
      <div className="availability">
        <GettingStarted />
      </div>
      <section id="get-started" className="section closing center reveal">
        <h2 className="display">
          {t(
            "Make room for a clearer way to work.",
            "Faites place à une façon plus claire de travailler.",
          )}
        </h2>
        <div className="closing-actions">
          <Link className="button primary" href="/register">
            <span>{t("Create your account", "Créer votre compte")}</span>
            <span aria-hidden="true">{"↗︎"}</span>
          </Link>
          <Link className="button outline" href="/#workflow">
            <span>{t("See the workflow", "Voir le parcours")}</span>
          </Link>
        </div>
        <div className="closing-cards">
          <article>
            <h3>{t("For retail businesses", "Pour les commerces")}</h3>
            <p>
              {t(
                "Follow sales, stock and payments across your daily operations.",
                "Suivez les ventes, les stocks et les paiements au quotidien.",
              )}
            </p>
          </article>
          <article>
            <h3>{t("For distribution businesses", "Pour la distribution")}</h3>
            <p>
              {t(
                "Keep locations, movements and source records connected.",
                "Reliez les emplacements, les mouvements et les pièces d’origine.",
              )}
            </p>
          </article>
        </div>
      </section>
    </div>
  )
}
