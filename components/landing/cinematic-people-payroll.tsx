"use client"

import { useRef, useState } from "react"
import { useLocale } from "next-intl"
import { ArrowRight, CalendarClock, ClipboardCheck, FileCheck2, Fingerprint, LockKeyhole, Users, Wallet } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { PreviewLogo } from "./preview-logo"
import "./landing-sections.css"

type Copy = readonly [string, string]
// Public capabilities checked against /people, /people/me, /people/approvals and
// payroll/{contracts,compensation,attendance,runs,payslips,payments,declarations}.
const areas = [
  {
    id: "people", icon: Users, label: ["People records", "Dossiers salariés"],
    title: ["A reliable starting point for every employee.", "Un point de départ fiable pour chaque salarié."],
    body: ["Keep employee identity, employment context and supporting records together before they become payroll inputs.", "Réunissez identité, contexte d’emploi et justificatifs avant leur utilisation dans la paie."],
    features: [
      [["Employee directory", "Annuaire du personnel"], ["Find employees, employment status and readiness information in one place.", "Retrouvez salariés, statut d’emploi et informations de préparation dans un même espace."]],
      [["Organization and team context", "Organisation et équipes"], ["Keep organization, location and responsibility scope visible.", "Gardez organisation, site et périmètre de responsabilité visibles."]],
      [["Documents and identity", "Documents et identité"], ["Review required identity and signed-contract evidence with controlled access.", "Examinez identité et justificatifs contractuels requis avec des accès contrôlés."]],
      [["Employee self-service", "Espace salarié"], ["Let mapped employees review their own available records and supported requests.", "Les salariés identifiés consultent leurs données disponibles et les demandes prises en charge."]],
    ],
    rows: [[["Employee", "Salarié"], ["EMP-024 · Sample record", "EMP-024 · Dossier fictif"]], [["Employment context", "Contexte d’emploi"], ["Main shop · Sales team", "Boutique · Équipe de vente"]], [["Identity mapping", "Lien d’identité"], ["Linked to own profile", "Lié à son propre profil"]], [["Documents", "Documents"], ["Review required", "Vérification requise"]]],
    check: ["HR controls employee information. Access to payroll or accounting does not automatically expose personnel files.", "Les RH contrôlent les dossiers salariés. L’accès à la paie ou à la comptabilité n’ouvre pas automatiquement ces dossiers."],
  },
  {
    id: "contracts", icon: FileCheck2, label: ["Contracts & pay", "Contrats et rémunération"],
    title: ["Give every pay input an approved basis.", "Donnez à chaque donnée de paie une base approuvée."],
    body: ["Connect the employment agreement, compensation terms and their effective dates to the right employee and period.", "Reliez contrat, conditions de rémunération et dates d’effet au salarié et à la période concernés."],
    features: [
      [["Contract lifecycle", "Cycle du contrat"], ["Prepare, review and follow contracts and their supporting documents.", "Préparez, vérifiez et suivez contrats et justificatifs associés."]],
      [["Compensation records", "Données de rémunération"], ["Keep the compensation basis and approved changes attached to the employee.", "Conservez la base de rémunération et ses modifications approuvées dans le dossier salarié."]],
      [["Effective dates", "Dates d’effet"], ["Review when a change applies before selecting inputs for a pay period.", "Vérifiez quand une modification s’applique avant de préparer la période de paie."]],
      [["Approval history", "Historique des approbations"], ["Retain who reviewed the change and which evidence supported the decision.", "Conservez l’auteur de la revue et les pièces ayant étayé la décision."]],
    ],
    rows: [[["Employee", "Salarié"], ["EMP-024", "EMP-024"]], [["Contract", "Contrat"], ["CTR-024 · Review pending", "CTR-024 · Revue en attente"]], [["Compensation basis", "Base de rémunération"], ["Linked to contract", "Liée au contrat"]], [["Effective period", "Période d’effet"], ["October · To confirm", "Octobre · À confirmer"]]],
    check: ["Changing a people record does not silently rewrite an approved payroll run. Corrections keep their own review path.", "Modifier un dossier ne réécrit pas silencieusement une paie approuvée. Les corrections suivent leur propre circuit de revue."],
  },
  {
    id: "time", icon: CalendarClock, label: ["Time & approvals", "Temps et approbations"],
    title: ["Resolve time exceptions before payroll starts.", "Traitez les anomalies de temps avant la paie."],
    body: ["Bring attendance, leave, overtime and team approvals into the preparation of reviewed payroll inputs.", "Réunissez présence, congés, heures supplémentaires et approbations dans la préparation des données de paie."],
    features: [
      [["Attendance inputs", "Données de présence"], ["Review the employee and period behind recorded time.", "Vérifiez le salarié et la période associés aux temps enregistrés."]],
      [["Leave and overtime requests", "Congés et heures supplémentaires"], ["Follow supported employee requests, available balances and decisions.", "Suivez les demandes prises en charge, les soldes disponibles et les décisions."]],
      [["Manager and HR queues", "Files de revue manager et RH"], ["Route review through the responsible team with the correct access scope.", "Confiez la revue à l’équipe responsable dans son périmètre d’accès."]],
      [["Payroll input readiness", "Préparation des données de paie"], ["Check completeness and unresolved exceptions before inputs are consumed.", "Contrôlez complétude et anomalies en attente avant l’utilisation des données."]],
    ],
    rows: [[["Period", "Période"], ["October · Sample period", "Octobre · Période fictive"]], [["Attendance", "Présence"], ["Period inputs available", "Données de période disponibles"]], [["Leave request", "Demande de congé"], ["Manager review pending", "Revue du manager en attente"]], [["Payroll readiness", "Préparation de la paie"], ["Resolve the open request", "Traiter la demande ouverte"]]],
    check: ["An employee request is not an approval. Payroll preparation uses reviewed inputs and keeps unresolved items visible.", "Une demande de salarié n’est pas une approbation. La préparation utilise des données vérifiées et conserve les points en attente."],
  },
  {
    id: "runs", icon: ClipboardCheck, label: ["Payroll & payslips", "Paie et bulletins"],
    title: ["Review the run before publishing the result.", "Vérifiez la paie avant d’en publier le résultat."],
    body: ["Move from prepared inputs to payroll calculation, approval and payslips, with blockers and country settings in view.", "Passez des données préparées au calcul, à l’approbation et aux bulletins, en gardant blocages et paramètres du pays visibles."],
    features: [
      [["Payroll command center", "Centre de pilotage de la paie"], ["See readiness, blockers and the next review action for the period.", "Retrouvez préparation, blocages et prochaine action de revue pour la période."]],
      [["Calculation and review", "Calcul et revue"], ["Inspect the run and its input basis before approval.", "Examinez le calcul et ses données d’entrée avant l’approbation."]],
      [["Payslip publication", "Publication des bulletins"], ["Follow issued payslips and the employee’s permitted access.", "Suivez les bulletins émis et les accès autorisés du salarié."]],
      [["Register and corrections", "Registre et corrections"], ["Retain period results, references and separately reviewed corrections.", "Conservez résultats de période, références et corrections vérifiées séparément."]],
    ],
    rows: [[["Payroll run", "Calcul de paie"], ["PAY-OCT · Sample run", "PAY-OCT · Paie fictive"]], [["Inputs", "Données"], ["Readiness review", "Revue de préparation"]], [["Approval", "Approbation"], ["Not yet approved", "Non encore approuvée"]], [["Payslips", "Bulletins"], ["Publication follows review", "Publication après revue"]]],
    check: ["Country rules and enabled payroll configuration determine the calculation. A published payslip is not proof of payment.", "Règles du pays et configuration activée déterminent le calcul. Un bulletin publié ne constitue pas une preuve de paiement."],
  },
  {
    id: "proof", icon: Wallet, label: ["Payments & declarations", "Paiements et déclarations"],
    title: ["Keep the proof after payroll is approved.", "Conservez la preuve après l’approbation de la paie."],
    body: ["Carry payroll results into payment review, declaration preparation and accounting without merging their separate responsibilities.", "Reliez résultats de paie, revue des paiements, préparation des déclarations et comptabilité en conservant leurs responsabilités distinctes."],
    features: [
      [["Payment preparation", "Préparation des paiements"], ["Review payment batches, destination evidence and execution status.", "Examinez lots de paiement, justificatifs de destination et état d’exécution."]],
      [["Reconciliation evidence", "Justificatifs de rapprochement"], ["Retain the payment trace and follow unresolved differences.", "Conservez la trace du paiement et suivez les écarts non résolus."]],
      [["Statutory declarations", "Déclarations réglementaires"], ["Prepare supported declaration records and retain authority evidence.", "Préparez les déclarations prises en charge et conservez les preuves de l’administration."]],
      [["Accounting handoff", "Relais vers la comptabilité"], ["Keep posting references, register evidence and close review linked.", "Reliez références comptables, justificatifs du registre et revue de clôture."]],
    ],
    rows: [[["Approved output", "Résultat approuvé"], ["Payroll reference retained", "Référence de paie conservée"]], [["Payment evidence", "Preuve de paiement"], ["To attach and reconcile", "À joindre et rapprocher"]], [["Declaration", "Déclaration"], ["Authority proof required", "Preuve de l’administration requise"]], [["Accounting review", "Revue comptable"], ["Posting references to review", "Références comptables à vérifier"]]],
    check: ["Country coverage and authority connections depend on the supported setup. Payment approval, execution and statutory acceptance each require their own evidence.", "Couverture nationale et connexions aux administrations dépendent de la configuration prise en charge. Approbation, exécution et acceptation réglementaire exigent chacune leurs justificatifs."],
  },
] as const

export function CinematicPeoplePayroll() {
  const fr = useLocale() === "fr"
  const text = (copy: Copy) => copy[fr ? 1 : 0]
  const [active, setActive] = useState(0)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  return <section className="section people-showcase" id="people-payroll" aria-labelledby="people-payroll-title">
    <div className="section-heading people-heading reveal">
      <div><p className="eyebrow">{fr ? "SIRH ET PAIE · DU DOSSIER À LA PREUVE" : "HRIS & PAYROLL · FROM PEOPLE TO PROOF"}</p><h2 id="people-payroll-title">{fr ? "Prenez soin du dossier salarié. Préparez la paie avec clarté." : "Take care of the people record. Prepare payroll with clarity."}</h2></div>
      <p className="section-lead">{fr ? "Un parcours détaillé pour les salariés, managers, RH, gestionnaires de paie et comptables. Chaque étape transmet des données vérifiées à la suivante." : "A detailed journey for employees, managers, HR, payroll and accountants. Each stage carries reviewed information into the next."}</p>
    </div>
    <div className="people-unit reveal">
      <div className="people-tabs" role="tablist" aria-label={fr ? "Fonctionnalités SIRH et paie" : "HRIS and payroll capabilities"}>
        {areas.map((area, index) => <button key={area.id} ref={el => { tabs.current[index] = el }} type="button" role="tab" id={`people-tab-${area.id}`} aria-selected={active === index} aria-controls={`people-panel-${area.id}`} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={event => {
          const next = event.key === "ArrowRight" ? (index + 1) % areas.length : event.key === "ArrowLeft" ? (index + areas.length - 1) % areas.length : event.key === "Home" ? 0 : event.key === "End" ? areas.length - 1 : null
          if (next === null) return
          event.preventDefault(); setActive(next); tabs.current[next]?.focus()
        }}><area.icon size={18} aria-hidden="true" /><span>{text(area.label)}</span><small>0{index + 1}</small></button>)}
      </div>
      <div className="people-panels">{areas.map((area, index) => <div key={area.id} className="people-panel" role="tabpanel" id={`people-panel-${area.id}`} aria-labelledby={`people-tab-${area.id}`} aria-hidden={active !== index} inert={active !== index} tabIndex={active === index ? 0 : -1}>
        <div className="people-panel-content"><h3>{text(area.title)}</h3><p className="people-panel-intro">{text(area.body)}</p><div className="people-features">{area.features.map(([title, body]) => <details key={title[0]}><summary>{text(title)}</summary><p>{text(body)}</p></details>)}</div></div>
        <div className="people-record" data-visual-classification="sample"><div className="people-record-bar"><PreviewLogo /><span>{fr ? "DOSSIER ILLUSTRATIF" : "ILLUSTRATIVE RECORD"}</span></div><div className="people-record-heading"><area.icon size={28} aria-hidden="true" /><strong>{text(area.label)}</strong></div><dl>{area.rows.map(([label, value]) => <div key={label[0]}><dt>{text(label)}</dt><dd>{text(value)}</dd></div>)}</dl><p className="people-sample-note">{fr ? "Données fictives · Aucune opération réelle" : "Fictional records · No live transactions"}</p></div>
        <p className="people-control-note"><LockKeyhole size={17} aria-hidden="true" />{text(area.check)}</p>
      </div>)}</div>
      <div className="people-roles"><div><Fingerprint size={19} aria-hidden="true" /><span><strong>{fr ? "Le salarié" : "Employee"}</strong><small>{fr ? "Son dossier, ses demandes, ses bulletins autorisés." : "Own records, requests and permitted payslips."}</small></span></div><div><Users size={19} aria-hidden="true" /><span><strong>{fr ? "Managers, RH et paie" : "Managers, HR & payroll"}</strong><small>{fr ? "Les dossiers et décisions de leur périmètre." : "Records and decisions within their scope."}</small></span></div><div><FileCheck2 size={19} aria-hidden="true" /><span><strong>{fr ? "Le cabinet comptable" : "Accounting firm"}</strong><small>{fr ? "Les pièces comptables selon le mandat client." : "Accounting evidence under the client mandate."}</small></span></div></div>
    </div>
    <div className="people-links"><Link className="sme-link" href="/products/hris">{fr ? "Découvrir le SIRH" : "Explore HRIS"}<ArrowRight size={16} aria-hidden="true" /></Link><Link className="sme-link" href="/products/payroll">{fr ? "Découvrir la paie" : "Explore payroll"}<ArrowRight size={16} aria-hidden="true" /></Link><Link className="sme-link" href="/workflows#workflow-peopleToPay">{fr ? "Suivre le parcours complet" : "Follow the full workflow"}<ArrowRight size={16} aria-hidden="true" /></Link></div>
  </section>
}
