"use client"

import { useLocale } from "next-intl"
import {
  BookOpen,
  ClipboardCheck,
  ArrowRight,
  Users,
  ClipboardList,
} from "lucide-react"
import { Link } from "@/i18n/navigation"

function SmeComputerPhoto({
  scene,
  alt,
}: {
  scene: "pharmacy" | "materials"
  alt: string
}) {
  const fr = useLocale() === "fr"
  return (
    <div className={`sme-photo-scene sme-photo-${scene}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/landing/cinematic/sme-${scene}-aio.webp`}
        width={1200}
        height={800}
        loading="lazy"
        decoding="async"
        alt={alt}
      />
      <div
        className="sme-computer-screen"
        aria-hidden="true"
        data-visual-classification="sample"
      >
        <div className="sme-screen-brand">
          <span>q</span>
          <strong>stoquify</strong>
          <small>{fr ? "ESPACE ILLUSTRATIF" : "ILLUSTRATIVE WORKSPACE"}</small>
        </div>
        <div className="sme-screen-workspace">
          <aside>
            {[
              fr ? "Ventes" : "Sales",
              fr ? "Stocks" : "Inventory",
              "Finance",
              fr ? "Comptabilité" : "Accounting",
            ].map((label) => (
              <span key={label}>{label}</span>
            ))}
          </aside>
          <div>
            <b>
              {scene === "pharmacy"
                ? fr
                  ? "Ventes et stocks"
                  : "Sales and inventory"
                : fr
                  ? "Paiements et rapprochement"
                  : "Payments and reconciliation"}
            </b>
            <div className="sme-screen-kpis">
              <span>
                {fr ? "Ventes" : "Sales"}
                <b>24</b>
              </span>
              <span>
                {fr ? "Stocks" : "Stock"}
                <b>18</b>
              </span>
              <span>
                {fr ? "À vérifier" : "To review"}
                <b>3</b>
              </span>
            </div>
            <div className="sme-screen-row">
              <span>SALE-104</span>
              <span>{fr ? "Enregistré" : "Recorded"}</span>
            </div>
            <div className="sme-screen-row">
              <span>REF-104</span>
              <span>{fr ? "À vérifier" : "To review"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CinematicBusinessStory() {
  const fr = useLocale() === "fr"
  const t = (en: string, french: string) => (fr ? french : en)
  return (
    <section
      className="sme-story"
      id="business-story"
      aria-labelledby="business-story-title"
    >
      <div className="section sme-introduction reveal">
        <p className="eyebrow">
          {t(
            "BUILT AROUND THE WORK OF SMEs",
            "PENSÉ POUR LE QUOTIDIEN DES PME",
          )}
        </p>
        <h2 className="display" id="business-story-title">
          {t(
            "Your business keeps moving. Your records should follow.",
            "Votre activité avance. Vos données doivent suivre.",
          )}
        </h2>
        <p>
          {t(
            "From the morning rush to the monthly review, connect the work of your shops, warehouses, finance and people teams.",
            "Du premier client à la revue mensuelle, reliez le travail de vos boutiques, entrepôts, équipes financières et RH.",
          )}
        </p>
        <small>
          {t(
            "Original illustrative SME scenes. Businesses shown are not customer testimonials.",
            "Scènes de PME originales et illustratives. Les entreprises représentées ne sont pas des témoignages clients.",
          )}
        </small>
      </div>

      <article className="section sme-editorial reveal">
        <figure className="sme-photo">
          <SmeComputerPhoto
            scene="pharmacy"
            alt={t(
              "Illustrative pharmacy team serving a customer, with Stoquify sales and stock records on an all-in-one computer",
              "Scène illustrative : une équipe de pharmacie accueille une cliente, avec les ventes et stocks Stoquify sur un ordinateur tout-en-un",
            )}
          />
          <figcaption>
            {t(
              "THE COUNTER. THE STOCKROOM. THE SAME RECORD.",
              "LA CAISSE. LA RÉSERVE. LE MÊME FIL CONDUCTEUR.",
            )}
          </figcaption>
        </figure>
        <div className="sme-editorial-copy">
          <p className="eyebrow">
            {t("01 / RUN THE BUSINESS", "01 / PILOTEZ L’ACTIVITÉ")}
          </p>
          <h2>
            {t(
              "Keep the sale connected to the stock.",
              "Gardez la vente reliée au stock.",
            )}
          </h2>
          <p>
            {t(
              "At a busy counter, every receipt and quantity matters. Record sales in POS, follow stock movements by location and keep the source behind each change within reach.",
              "Au comptoir, chaque reçu et chaque quantité comptent. Enregistrez les ventes en caisse, suivez les mouvements de stock par site et retrouvez l’origine de chaque changement.",
            )}
          </p>
          <ol
            className="sme-record-chain"
            aria-label={t(
              "Sales and stock workflow",
              "Parcours de vente et de stock",
            )}
          >
            {[
              t("Sale & receipt", "Vente et reçu"),
              t("Stock movement", "Mouvement de stock"),
              t("Source record", "Pièce d’origine"),
            ].map((label) => (
              <li key={label}>
                {label}
                <ArrowRight size={15} aria-hidden="true" />
              </li>
            ))}
          </ol>
          <Link className="sme-link" href="/workflows#workflow-stockToSale">
            {t("Explore sales and stock", "Explorer les ventes et les stocks")}{" "}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </article>

      <article className="section sme-editorial sme-editorial-reverse reveal">
        <figure className="sme-photo">
          <SmeComputerPhoto
            scene="materials"
            alt={t(
              "Illustrative building-materials merchant reviewing a delivery with a customer, beside an all-in-one computer displaying Stoquify reconciliation",
              "Scène illustrative : une négociante en matériaux examine une livraison avec un client, à côté d’un ordinateur tout-en-un affichant le rapprochement Stoquify",
            )}
          />
          <figcaption>
            {t(
              "FROM TRADE ACTIVITY TO PAYMENT EVIDENCE.",
              "DES OPÉRATIONS AUX JUSTIFICATIFS DE PAIEMENT.",
            )}
          </figcaption>
        </figure>
        <div className="sme-editorial-copy">
          <p className="eyebrow">
            {t("02 / RECONCILE THE MONEY", "02 / RAPPROCHEZ LES PAIEMENTS")}
          </p>
          <h2>
            {t(
              "Know what was paid. Explain the difference.",
              "Sachez ce qui a été payé. Expliquez les écarts.",
            )}
          </h2>
          <p>
            {t(
              "A recorded payment is only part of the picture. Compare it with imported statements or supported provider evidence, investigate unmatched items and retain the decision behind each resolution.",
              "Un paiement enregistré ne suffit pas à lui seul. Comparez-le aux relevés importés ou aux justificatifs des prestataires pris en charge, examinez les éléments non rapprochés et conservez chaque décision.",
            )}
          </p>
          <div className="sme-reconciliation-note">
            <span>{t("Recorded payment", "Paiement enregistré")}</span>
            <span aria-hidden="true">↔</span>
            <span>{t("Supporting evidence", "Justificatif")}</span>
            <small>
              {t(
                "Differences stay visible until reviewed.",
                "Les écarts restent visibles jusqu’à leur examen.",
              )}
            </small>
          </div>
          <Link
            className="sme-link"
            href="/workflows#workflow-paymentReconciliation"
          >
            {t("Explore reconciliation", "Explorer le rapprochement")}{" "}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </article>

      <div className="section sme-accounting reveal" id="accounting-close">
        <div className="sme-accounting-heading">
          <p className="eyebrow">
            {t(
              "03 / MAINTAIN THE RECORDS. 04 / PREPARE THE CLOSE.",
              "03 / TENEZ LES COMPTES. 04 / PRÉPAREZ LA CLÔTURE.",
            )}
          </p>
          <h2 className="display">
            {t(
              "OHADA accounting. A clearer path to close.",
              "Comptabilité OHADA. Une clôture mieux préparée.",
            )}
          </h2>
          <p>
            {t(
              "Give your accountant the records, context and outstanding checks behind the period’s figures.",
              "Donnez à votre comptable les pièces, le contexte et les contrôles en attente derrière les chiffres de la période.",
            )}
          </p>
        </div>
        <div className="sme-accounting-grid">
          <article>
            <BookOpen size={28} aria-hidden="true" />
            <h3>
              {t(
                "Keep structured accounting records.",
                "Tenez des comptes structurés.",
              )}
            </h3>
            <p>
              {t(
                "Use SYSCOHADA account references, configured posting rules, journals and the general ledger. Follow an entry back to the operation and supporting evidence behind it.",
                "Utilisez les références SYSCOHADA, les règles de comptabilisation configurées, les journaux et le grand livre. Remontez d’une écriture à l’opération et aux justificatifs qui l’expliquent.",
              )}
            </p>
            <ul>
              {[
                t(
                  "Chart of accounts & SYSCOHADA references",
                  "Plan comptable et références SYSCOHADA",
                ),
                t(
                  "Source-linked journals",
                  "Écritures liées aux pièces d’origine",
                ),
                t(
                  "General ledger & period context",
                  "Grand livre et contexte de période",
                ),
              ].map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </article>
          <article>
            <ClipboardCheck size={28} aria-hidden="true" />
            <h3>
              {t(
                "See what stands between you and close.",
                "Identifiez ce qui reste à traiter avant la clôture.",
              )}
            </h3>
            <p>
              {t(
                "Review reconciliation differences, missing evidence and close findings. Keep responsibilities and accountant review visible before deciding the period is ready.",
                "Examinez les écarts de rapprochement, les justificatifs manquants et les points de clôture. Gardez les responsabilités et la revue du comptable visibles avant de déclarer la période prête.",
              )}
            </p>
            <ul>
              {[
                t(
                  "Reconciliation & unresolved differences",
                  "Rapprochement et écarts non résolus",
                ),
                t(
                  "Evidence & outstanding checks",
                  "Justificatifs et contrôles en attente",
                ),
                t(
                  "Accountant review & close readiness",
                  "Revue comptable et préparation de la clôture",
                ),
              ].map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </article>
        </div>
        <div className="sme-accounting-footer">
          <Link
            className="sme-link"
            href="/workflows#workflow-accountingCloseAssurance"
          >
            {t(
              "Explore accounting and close",
              "Explorer la comptabilité et la clôture",
            )}{" "}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <p>
            {t(
              "Accounting depends on reviewed settings and source data. Internal reports are not certified statutory filings.",
              "La comptabilité dépend des paramètres et données d’origine vérifiés. Les rapports internes ne constituent pas des états réglementaires certifiés.",
            )}
          </p>
        </div>
      </div>

      <div className="section sme-people reveal" id="people-payroll">
        <div>
          <p className="eyebrow">
            {t(
              "YOUR PEOPLE, CONNECTED TO THE BUSINESS",
              "VOS ÉQUIPES, RELIÉES À L’ACTIVITÉ",
            )}
          </p>
          <h2>
            {t(
              "Connect your HRIS to payroll preparation.",
              "Reliez le SIRH à la préparation de la paie.",
            )}
          </h2>
          <p>
            {t(
              "The team behind the counter has its own records, time and pay. Connect people administration to payroll preparation while keeping each approval and payment check visible.",
              "L’équipe derrière le comptoir a ses dossiers, ses temps et sa rémunération. Reliez la gestion du personnel à la préparation de la paie en gardant chaque approbation et contrôle de paiement visible.",
            )}
          </p>
          <Link className="sme-link" href="/workflows#workflow-peopleToPay">
            {t("Explore HRIS and payroll", "Explorer le SIRH et la paie")}{" "}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className="sme-people-flow">
          <article>
            <Users size={24} aria-hidden="true" />
            <div>
              <h3>
                {t(
                  "HRIS: build the people record",
                  "SIRH : constituez le dossier salarié",
                )}
              </h3>
              <p>
                {t(
                  "Employees, contracts, compensation and time inputs.",
                  "Salariés, contrats, rémunérations et temps de travail.",
                )}
              </p>
            </div>
          </article>
          <div className="sme-people-connector">
            {t(
              "Reviewed inputs → payroll preparation",
              "Données vérifiées → préparation de la paie",
            )}
          </div>
          <article>
            <ClipboardList size={24} aria-hidden="true" />
            <div>
              <h3>
                {t(
                  "Payroll: prepare, review, retain proof",
                  "Paie : préparez, vérifiez, conservez les preuves",
                )}
              </h3>
              <p>
                {t(
                  "Payroll runs, payslips and payment evidence, with the required checks.",
                  "Calculs, bulletins et justificatifs de paiement, avec les contrôles requis.",
                )}
              </p>
            </div>
          </article>
          <small>
            {t(
              "Payroll depends on supported country rules, configuration and approved inputs.",
              "La paie dépend des règles du pays prises en charge, du paramétrage et des données approuvées.",
            )}
          </small>
        </div>
      </div>
    </section>
  )
}
