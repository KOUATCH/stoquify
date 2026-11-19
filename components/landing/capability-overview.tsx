import { Activity, ArrowRight, BookOpenCheck, Building2, ChevronDown, CreditCard, PackageSearch, ShieldCheck, ShoppingCart, Store, Users } from "lucide-react"
import { useLocale } from "next-intl"
import { Link } from "@/i18n/navigation"
import { productCommunicationCopy } from "./public-product-copy"
import "./landing-sections.css"

const icons = [Store, PackageSearch, ShoppingCart, CreditCard, Users, BookOpenCheck, Activity, ShieldCheck]

export function CapabilityOverview() {
  const fr = useLocale() === "fr"
  const copy = productCommunicationCopy[fr ? "fr" : "en"]
  const teams = [
    { icon: Store, title: fr ? "Terrain" : "Operations", body: fr ? "Ventes, stocks et réceptions" : "Sales, stock and receiving" },
    { icon: CreditCard, title: "Finance", body: fr ? "Créances, dettes et paiements" : "Receivables, payables and payments" },
    { icon: Users, title: fr ? "RH et paie" : "People & payroll", body: fr ? "Dossiers, temps et rémunérations" : "People, time and compensation" },
    { icon: Building2, title: fr ? "Votre cabinet" : "Your accounting firm", body: fr ? "Sources, revue et clôture" : "Sources, review and close" },
  ]
  return <section id="modules" data-capability-overview className="section responsibilities" aria-labelledby="responsibilities-title">
    <div className="section-heading responsibility-heading reveal">
      <div><p className="eyebrow">{copy.eyebrow}</p><h2 id="responsibilities-title">{copy.title}</h2></div>
      <p className="section-lead">{copy.intro}</p>
    </div>
    <div className="responsibility-unit reveal">
      <div className="responsibility-teams" role="group" aria-label={fr ? "Les équipes reliées" : "The connected teams"}>
        {teams.map((team, index) => <div key={team.title}><team.icon size={22} aria-hidden="true" /><span><strong>{team.title}</strong><small>{team.body}</small></span>{index < teams.length - 1 && <ArrowRight className="team-connector" size={16} aria-hidden="true" />}</div>)}
      </div>
      <div className="responsibility-record"><ShieldCheck size={16} aria-hidden="true" /><p>{fr ? "Le même fil d’opérations. Chaque équipe conserve son rôle, son périmètre et ses décisions." : "One connected record. Each team keeps its own role, access scope and decisions."}</p></div>
      <div className="responsibility-grid">
        {copy.groups.map((group, index) => {
          const Icon = icons[index]
          return <details key={group.key} className="capability-card responsibility-card" data-capability={group.key}>
            <summary><span className="responsibility-card-top"><Icon size={20} aria-hidden="true" /><small>0{index + 1}</small></span><strong>{group.title}</strong><span>{group.outcome}</span><span className="responsibility-expand">{fr ? "Voir le passage de relais" : "See the handoff"}<ChevronDown size={14} aria-hidden="true" /></span></summary>
            <div className="responsibility-detail"><p>{group.detail}</p><p className="responsibility-flow">{group.flow}</p><Link href={`/workflows#workflow-${group.workflow}`}>{copy.explore}<ArrowRight size={15} aria-hidden="true" /></Link></div>
          </details>
        })}
      </div>
      <div className="responsibility-footer"><p>{copy.availability}</p><Link href="/#accounting-firm">{fr ? "Collaborer avec votre cabinet" : "Work with your accounting firm"}<ArrowRight size={16} aria-hidden="true" /></Link></div>
    </div>
  </section>
}
