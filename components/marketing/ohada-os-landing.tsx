"use client"

import Image from "next/image"
import { Link } from "@/i18n/navigation"
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Boxes,
  Building2,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  Landmark,
  LockKeyhole,
  PackageCheck,
  Radar,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Store,
} from "lucide-react"
import { useMemo, useState } from "react"

type Locale = "en" | "fr"

type LandingCopy = {
  nav: string[]
  ctaReview: string
  ctaSetup: string
  login: string
  heroBadge: string
  heroTitle: string
  heroBody: string
  proof: string[]
  chain: string[]
  marketTitle: string
  marketBody: string
  stakeholdersTitle: string
  stakeholdersBody: string
  workflowsTitle: string
  workflowsBody: string
  proofTitle: string
  proofBody: string
  trustTitle: string
  trustBody: string
  rolloutTitle: string
  rolloutBody: string
  finalTitle: string
  finalBody: string
}

const copy: Record<Locale, LandingCopy> = {
  en: {
    nav: ["Workflows", "Owners", "Accountants", "Trust", "Partners", "Rollout"],
    ctaReview: "Book readiness review",
    ctaSetup: "Start guided setup",
    login: "Sign in",
    heroBadge: "OHADA SMB operating system",
    heroTitle: "Run your OHADA business from sale to ledger truth.",
    heroBody:
      "AqStoqFlow connects POS, inventory, purchases, payments, payroll, accounting, compliance, and reports so every important business event becomes trusted evidence.",
    proof: [
      "Sale-to-ledger traceability",
      "Payment reconciliation evidence",
      "Stock value tie-out",
      "Role-based controls",
      "Close-ready reports",
    ],
    chain: ["Sale finalized", "Stock reduced", "Payment matched", "Journal posted", "Report updated", "Close evidence ready"],
    marketTitle: "Built for the operating pressure OHADA SMBs actually feel",
    marketBody:
      "The product story is not software breadth. It is control over cash, stock, purchases, payroll, accounting, and compliance when the business is moving fast.",
    stakeholdersTitle: "Every stakeholder sees the product in their own language",
    stakeholdersBody:
      "Owners, accountants, cashiers, stockkeepers, HR teams, and partners need different proof from the same operating spine.",
    workflowsTitle: "Replace module overload with evidence workflows",
    workflowsBody:
      "AqStoqFlow should show how one operational event becomes documents, approvals, ledger entries, exceptions, and reports.",
    proofTitle: "Proof artifacts instead of decorative metrics",
    proofBody:
      "The strongest marketing asset is a visible evidence trail: receipt, stock movement, payment match, journal entry, audit log, and close pack.",
    trustTitle: "Enterprise controls visible before the buyer asks",
    trustBody:
      "Tenant isolation, RBAC, step-up control, immutable accounting, source-linked reports, and offline replay should be visible product promises.",
    rolloutTitle: "Rollout packages, not commodity pricing",
    rolloutBody:
      "Serious SMBs, accountants, and regulated partners need implementation paths that match risk, branches, country context, and integration needs.",
    finalTitle: "Make the product feel like operating discipline",
    finalBody:
      "The new presentation should make buyers feel that AqStoqFlow helps them trust their business while it is running.",
  },
  fr: {
    nav: ["Flux", "Dirigeants", "Comptables", "Confiance", "Partenaires", "Deploiement"],
    ctaReview: "Demander une revue",
    ctaSetup: "Demarrer la configuration",
    login: "Connexion",
    heroBadge: "Systeme d'exploitation PME OHADA",
    heroTitle: "Pilotez votre entreprise OHADA de la vente a la preuve comptable.",
    heroBody:
      "AqStoqFlow connecte POS, stock, achats, paiements, paie, comptabilite, conformite et rapports pour transformer chaque evenement important en preuve fiable.",
    proof: [
      "Traçabilite vente-comptabilite",
      "Preuve de rapprochement paiement",
      "Stock rattache a la valeur",
      "Controles par role",
      "Rapports prets pour la cloture",
    ],
    chain: ["Vente finalisee", "Stock reduit", "Paiement rapproche", "Journal poste", "Rapport mis a jour", "Preuve de cloture prete"],
    marketTitle: "Concu pour les pressions reelles des PME OHADA",
    marketBody:
      "L'histoire produit n'est pas une longue liste de modules. C'est le controle de la caisse, du stock, des achats, de la paie, de la comptabilite et de la conformite.",
    stakeholdersTitle: "Chaque acteur comprend le produit dans son propre langage",
    stakeholdersBody:
      "Dirigeants, comptables, caissiers, magasiniers, RH et partenaires ont besoin de preuves differentes issues du meme socle operationnel.",
    workflowsTitle: "Remplacer la surcharge de modules par des flux de preuve",
    workflowsBody:
      "AqStoqFlow doit montrer comment un evenement operationnel devient documents, validations, ecritures, exceptions et rapports.",
    proofTitle: "Des preuves plutot que des metriques decoratives",
    proofBody:
      "Le meilleur actif marketing est une trace visible: recu, mouvement de stock, rapprochement, ecriture, audit et dossier de cloture.",
    trustTitle: "Des controles entreprise visibles des le premier contact",
    trustBody:
      "Isolation tenant, RBAC, controle renforce, comptabilite immuable, rapports sources et replay hors ligne doivent etre visibles.",
    rolloutTitle: "Des parcours de deploiement, pas une tarification commodite",
    rolloutBody:
      "Les PME serieuses, cabinets comptables et partenaires regules ont besoin de parcours adaptes au risque, aux agences, au pays et aux integrations.",
    finalTitle: "Presenter le produit comme une discipline operationnelle",
    finalBody:
      "La nouvelle experience doit faire sentir qu'AqStoqFlow aide l'entreprise a faire confiance a son activite pendant qu'elle tourne.",
  },
}

const stakeholders = [
  {
    key: "owner",
    Icon: Building2,
    title: "Owner / CEO",
    pitch: "Stop discovering missing cash, missing stock, and messy reports after the damage is done.",
    see: "Daily command center, sale-to-ledger chain, cash confidence, branch comparison, close readiness.",
  },
  {
    key: "accountant",
    Icon: Calculator,
    title: "Accountant",
    pitch: "Stop reconstructing books from scattered records and late documents.",
    see: "Source-linked journals, trial balance, reconciliation status, close blockers, export pack.",
  },
  {
    key: "cashier",
    Icon: Store,
    title: "Cashier",
    pitch: "Sell quickly, accept the right payment, and close the shift with evidence.",
    see: "Fast checkout, tender clarity, receipt confirmation, drawer expected vs counted.",
  },
  {
    key: "stockkeeper",
    Icon: Boxes,
    title: "Stockkeeper",
    pitch: "Every stock movement has a reason, location, actor, quantity, and value impact.",
    see: "Stock by branch, transfer status, count variance, write-off approval, movement timeline.",
  },
  {
    key: "partner",
    Icon: Banknote,
    title: "Bank / Fintech",
    pitch: "Turn merchant payment activity into reconciled business evidence.",
    see: "Provider events, statement import, match status, suspense resolution, settlement trail.",
  },
]

const workflowExamples = [
  {
    key: "sale",
    title: "Retail sale",
    trigger: "Cashier finalizes sale",
    operational: "Receipt, stock movement, customer ledger when needed",
    financial: "Tender, cash drawer, tax posture, journal posting",
    evidence: "Audit log, payment proof, close readiness",
  },
  {
    key: "purchase",
    title: "Supplier purchase",
    trigger: "Manager approves purchase order",
    operational: "PO, goods receipt, supplier invoice, item cost",
    financial: "AP balance, GRNI clearing, supplier payment",
    evidence: "Approval trail, supplier ledger, source-linked posting",
  },
  {
    key: "payment",
    title: "Mobile money settlement",
    trigger: "Provider event or statement arrives",
    operational: "Statement line, match record, suspense item",
    financial: "Provider transit account, settlement, bank movement",
    evidence: "Signed reconciliation run and exception history",
  },
  {
    key: "close",
    title: "Period close",
    trigger: "Accountant starts close review",
    operational: "Open exceptions, missing evidence, unresolved stock drift",
    financial: "Trial balance, journals, reports, reversals",
    evidence: "Close pack with blockers and source links",
  },
]

const proofArtifacts = [
  { title: "Receipt", body: "The commercial event that starts the evidence chain.", Icon: ReceiptText },
  { title: "Stock movement", body: "Quantity, location, actor, reason, and valuation impact.", Icon: PackageCheck },
  { title: "Payment match", body: "Internal payment tied to provider event and statement line.", Icon: BadgeCheck },
  { title: "Journal entry", body: "Balanced, source-linked OHADA accounting projection.", Icon: Landmark },
  { title: "Audit log", body: "Who did what, when, from where, and why it matters.", Icon: ShieldCheck },
  { title: "Close pack", body: "Reports, blockers, reconciliation status, and export readiness.", Icon: ClipboardCheck },
]

const trustControls = [
  "Tenant isolation",
  "Role-based access",
  "Step-up for sensitive actions",
  "Immutable journals",
  "Source-linked reports",
  "Country-pack readiness",
  "Payment evidence",
  "Offline replay controls",
]

const rollouts = [
  {
    title: "Starter Shop",
    body: "Single-location businesses that need POS, stock, cash drawer, and basic reports.",
    cta: "Start guided setup",
    href: "/register-v2",
  },
  {
    title: "Growth Operations",
    body: "Multi-branch SMBs needing POS, stock, purchasing, finance, accounting, and RBAC.",
    cta: "Book rollout planning",
    href: "/register-v2?intent=assisted",
  },
  {
    title: "Accountant Portfolio",
    body: "Accounting firms setting up and managing multiple client workspaces.",
    cta: "Join partner program",
    href: "/register-v2?role=accountant",
  },
  {
    title: "Enterprise / Regulated",
    body: "Teams needing integrations, compliance adapters, audit evidence, and implementation support.",
    cta: "Request solution review",
    href: "/register-v2?intent=enterprise",
  },
]

export function OhadaOsLanding({ locale }: { locale: Locale }) {
  const t = copy[locale]
  const [activeStakeholder, setActiveStakeholder] = useState(stakeholders[0].key)
  const [activeWorkflow, setActiveWorkflow] = useState(workflowExamples[0].key)
  const selectedStakeholder = useMemo(
    () => stakeholders.find((item) => item.key === activeStakeholder) ?? stakeholders[0],
    [activeStakeholder],
  )
  const selectedWorkflow = useMemo(
    () => workflowExamples.find((item) => item.key === activeWorkflow) ?? workflowExamples[0],
    [activeWorkflow],
  )
  const StakeholderIcon = selectedStakeholder.Icon
  const workflowDetails = [
    { label: "Trigger", body: selectedWorkflow.trigger, Icon: ShoppingCart },
    { label: "Operational records", body: selectedWorkflow.operational, Icon: Boxes },
    { label: "Financial records", body: selectedWorkflow.financial, Icon: Landmark },
    { label: "Evidence", body: selectedWorkflow.evidence, Icon: ShieldCheck },
  ]

  return (
    <main className="min-h-screen bg-[#f6f8f4] text-[#132028]">
      <section className="relative isolate min-h-[84vh] overflow-hidden bg-[#10181d] text-white">
        <Image
          src="/images/dash.webp"
          alt="AqStoqFlow dashboard evidence preview"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-32"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,24,29,0.96),rgba(16,24,29,0.77)_48%,rgba(16,24,29,0.48))]" />
        <div className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/ohada-os" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#f0c54d] font-black text-[#132028]">AQ</span>
            <span>
              <span className="block text-sm font-black uppercase tracking-[0.2em]">AqStoqFlow</span>
              <span className="block text-xs font-semibold text-[#b8c7c2]">{t.heroBadge}</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 rounded-lg border border-white/10 bg-white/8 p-1 md:flex" aria-label="Primary">
            {t.nav.map((item, index) => (
              <a key={item} href={`#section-${index}`} className="rounded-md px-3 py-2 text-sm font-semibold text-[#dbe7e2] transition hover:bg-white/10 hover:text-white">
                {item}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login-v2" className="rounded-lg border border-white/16 px-4 py-2 text-sm font-bold text-[#eef7f4] transition hover:bg-white/10">
              {t.login}
            </Link>
            <Link href="/register-v2" className="inline-flex items-center gap-2 rounded-lg bg-[#f0c54d] px-4 py-2 text-sm font-black text-[#132028] transition hover:bg-[#ffd96a]">
              {t.ctaSetup}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-5 pb-14 pt-12 sm:px-8 lg:pt-20">
          <div className="max-w-4xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-lg border border-[#7de8dc]/25 bg-[#7de8dc]/10 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#9ff5ed]">
              <Radar className="h-4 w-4" />
              {t.heroBadge}
            </div>
            <h1 className="max-w-5xl text-4xl font-black leading-[1.02] tracking-normal sm:text-6xl lg:text-7xl">
              {t.heroTitle}
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-[#d5e0dc] sm:text-xl">{t.heroBody}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/register-v2?intent=readiness" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#f0c54d] px-5 py-3 text-sm font-black text-[#132028] transition hover:bg-[#ffd96a]">
                {t.ctaReview}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#section-0" className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-white/16 bg-white/8 px-5 py-3 text-sm font-black text-white transition hover:bg-white/13">
                {t.nav[0]}
                <CheckCircle2 className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {t.proof.map((item) => (
              <div key={item} className="rounded-lg border border-white/10 bg-white/9 p-4 backdrop-blur">
                <CheckCircle2 className="mb-3 h-4 w-4 text-[#7de8dc]" />
                <p className="text-sm font-bold leading-5 text-[#f1f7f4]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="section-0" className="border-b border-[#d9e1dc] bg-white px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#178e83]">Operating chain</p>
            <h2 className="mt-3 text-3xl font-black sm:text-5xl">{t.marketTitle}</h2>
            <p className="mt-5 text-lg leading-8 text-[#53675f]">{t.marketBody}</p>
          </div>
          <div className="mt-10 grid gap-3 lg:grid-cols-6">
            {t.chain.map((step, index) => (
              <div key={step} className="relative rounded-lg border border-[#d9e1dc] bg-[#f7faf8] p-4">
                <div className="mb-8 flex items-center justify-between">
                  <span className="text-xs font-black text-[#178e83]">{String(index + 1).padStart(2, "0")}</span>
                  {index < t.chain.length - 1 ? <ArrowRight className="h-4 w-4 text-[#b36b44]" /> : <BadgeCheck className="h-4 w-4 text-[#2c9b6f]" />}
                </div>
                <p className="text-base font-black leading-6">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="section-1" className="bg-[#eef4f0] px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8b4a2f]">{t.nav[1]}</p>
              <h2 className="mt-3 text-3xl font-black sm:text-5xl">{t.stakeholdersTitle}</h2>
              <p className="mt-5 text-lg leading-8 text-[#53675f]">{t.stakeholdersBody}</p>
              <div className="mt-7 grid gap-2">
                {stakeholders.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveStakeholder(item.key)}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition ${
                      activeStakeholder === item.key
                        ? "border-[#178e83] bg-white text-[#132028] shadow-sm"
                        : "border-[#d4ded8] bg-transparent text-[#53675f] hover:border-[#178e83]/40 hover:bg-white/60"
                    }`}
                  >
                    <item.Icon className="h-5 w-5 shrink-0" />
                    <span className="font-black">{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-[#d9e1dc] bg-white p-6 shadow-sm">
              <StakeholderIcon className="h-9 w-9 text-[#178e83]" />
              <h3 className="mt-5 text-2xl font-black">{selectedStakeholder.title}</h3>
              <p className="mt-4 text-lg font-bold leading-8 text-[#132028]">{selectedStakeholder.pitch}</p>
              <div className="mt-6 rounded-lg border border-[#d9e1dc] bg-[#f7faf8] p-5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8b4a2f]">What they should see</p>
                <p className="mt-3 text-base leading-7 text-[#53675f]">{selectedStakeholder.see}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="section-2" className="bg-[#132028] px-5 py-16 text-white sm:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f0c54d]">{t.nav[2]}</p>
              <h2 className="mt-3 text-3xl font-black sm:text-5xl">{t.workflowsTitle}</h2>
              <p className="mt-5 text-lg leading-8 text-[#c9d7d1]">{t.workflowsBody}</p>
              <div className="mt-7 flex flex-wrap gap-2">
                {workflowExamples.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveWorkflow(item.key)}
                    className={`rounded-lg border px-4 py-2 text-sm font-black transition ${
                      activeWorkflow === item.key
                        ? "border-[#f0c54d] bg-[#f0c54d] text-[#132028]"
                        : "border-white/12 bg-white/6 text-[#dce8e3] hover:bg-white/10"
                    }`}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {workflowDetails.map(({ label, body, Icon }) => (
                <div key={label} className="rounded-lg border border-white/10 bg-white/[0.055] p-5">
                  <Icon className="h-5 w-5 text-[#7de8dc]" />
                  <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-[#9fb4bb]">{label}</p>
                  <p className="mt-3 text-base font-semibold leading-7 text-white">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="section-3" className="bg-white px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#178e83]">{t.nav[3]}</p>
            <h2 className="mt-3 text-3xl font-black sm:text-5xl">{t.proofTitle}</h2>
            <p className="mt-5 text-lg leading-8 text-[#53675f]">{t.proofBody}</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {proofArtifacts.map(({ title, body, Icon }) => (
              <div key={title} className="rounded-lg border border-[#d9e1dc] bg-[#f7faf8] p-5">
                <Icon className="h-6 w-6 text-[#178e83]" />
                <h3 className="mt-5 text-xl font-black">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#53675f]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="section-4" className="bg-[#f3efe8] px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8b4a2f]">{t.nav[4]}</p>
              <h2 className="mt-3 text-3xl font-black sm:text-5xl">{t.trustTitle}</h2>
              <p className="mt-5 text-lg leading-8 text-[#5f534b]">{t.trustBody}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {trustControls.map((item) => (
                <div key={item} className="flex min-h-20 items-center gap-3 rounded-lg border border-[#dbcfc0] bg-white p-4">
                  <LockKeyhole className="h-5 w-5 shrink-0 text-[#8b4a2f]" />
                  <p className="font-black">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="section-5" className="bg-[#f6f8f4] px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#178e83]">{t.nav[5]}</p>
            <h2 className="mt-3 text-3xl font-black sm:text-5xl">{t.rolloutTitle}</h2>
            <p className="mt-5 text-lg leading-8 text-[#53675f]">{t.rolloutBody}</p>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-4">
            {rollouts.map((item) => (
              <div key={item.title} className="flex min-h-[18rem] flex-col rounded-lg border border-[#d9e1dc] bg-white p-5 shadow-sm">
                <h3 className="text-xl font-black">{item.title}</h3>
                <p className="mt-4 flex-1 text-sm leading-6 text-[#53675f]">{item.body}</p>
                <Link href={item.href} className="mt-7 inline-flex items-center justify-center gap-2 rounded-lg bg-[#132028] px-4 py-3 text-sm font-black text-white transition hover:bg-[#22323b]">
                  {item.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#132028] px-5 py-16 text-white sm:px-8 lg:py-20">
        <div className="mx-auto flex max-w-7xl flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-black sm:text-5xl">{t.finalTitle}</h2>
            <p className="mt-5 text-lg leading-8 text-[#c9d7d1]">{t.finalBody}</p>
          </div>
          <Link href="/register-v2?intent=readiness" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#f0c54d] px-5 py-3 text-sm font-black text-[#132028] transition hover:bg-[#ffd96a]">
            {t.ctaReview}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  )
}
