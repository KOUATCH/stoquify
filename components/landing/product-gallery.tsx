import Image from "next/image"
import { useLocale } from "next-intl"

export function ProductGallery() {
  const fr = useLocale() === "fr"
  return (
    <section id="product" className="section-divider scroll-mt-20 px-6 py-16 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.65fr_1.35fr] lg:items-center">
        <div>
          <p className="eyebrow">{fr ? "Dans le produit" : "Inside the product"}</p>
          <h2 className="display mt-4 text-4xl text-[var(--text-hi)] sm:text-5xl">{fr ? "Retrouvez les dossiers derrière les points à traiter." : "Find the records behind the work to review."}</h2>
          <p className="body-text mt-5 leading-7 text-[var(--text-lo)]">{fr ? "La vue de clôture quotidienne rassemble l’avancement et les justificatifs disponibles pour les sites accessibles. Les résultats dépendent des données et du périmètre de votre espace." : "The daily-close view brings together completion status and available evidence for the locations you can access. Results depend on your workspace’s data and scope."}</p>
        </div>
        <figure data-product-command-evidence data-visual-classification="redacted-product" className="min-w-0 overflow-hidden rounded-lg border border-[var(--rule-2)] bg-[var(--ink-2)]">
          <Image src="/images/product-command-branch-close-2026-07-18.png" alt={fr ? "Capture en anglais de la clôture quotidienne par site, en lecture seule" : "Stoquify read-only branch daily-close evidence view"} width={1440} height={1000} className="h-auto w-full" sizes="(min-width: 1024px) 60vw, 100vw" />
          <figcaption className="body-text border-t border-[var(--rule-1)] p-4 text-xs leading-6 text-[var(--text-faint)]">{fr ? "Capture produit masquée du 18 juillet 2026 · interface en anglais · illustration historique, sans données en direct." : "Redacted product screenshot from 18 July 2026 · historical illustration, not live data."}</figcaption>
        </figure>
      </div>
    </section>
  )
}
