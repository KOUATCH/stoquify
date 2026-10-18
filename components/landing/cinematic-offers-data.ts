// Public presentation only, not a billing or entitlement catalogue.
// Sources: docs/landing page/landing-packages-adoption-commercial-strategy.md
// and messages/{en,fr}.json: landing.pricing. Numerical prices and charging
// units remain unapproved; do not turn discovery hypotheses into tariffs.
export type OfferCopy = readonly [string, string]
export type OfferPath = "operations" | "finance" | "people"

export const offerPaths = [
  {
    id: "operations",
    name: ["Operations Core", "Opérations essentielles"],
    verb: ["Run the day.", "Pilotez la journée."],
    fit: ["Stock, buying and selling", "Stocks, achats et ventes"],
    audience: [
      "For retailers, pharmacies, bakeries and distributors.",
      "Pour les commerces, pharmacies, boulangeries et distributeurs.",
    ],
    description: [
      "Keep purchases, stock and sales in one operating record.",
      "Réunissez achats, stocks et ventes dans un même suivi opérationnel.",
    ],
    reason: [
      "A useful starting point when your priority is knowing what you have, what you buy and what you sell.",
      "Un point de départ adapté pour suivre ce que vous avez, ce que vous achetez et ce que vous vendez.",
    ],
    points: [
      [
        "Inventory, stock movements and locations",
        "Stocks, mouvements et sites",
      ],
      ["Sales and customer records", "Ventes et dossiers clients"],
      ["Purchasing and supplier records", "Achats et dossiers fournisseurs"],
      [
        "Operating dashboards and reports",
        "Tableaux de bord et rapports opérationnels",
      ],
    ],
    scope: [
      "Retail POS is a separately scoped extension. Finance can connect customer and supplier balances to reconciliation and close.",
      "La caisse est une extension à définir séparément. La finance relie les soldes clients et fournisseurs au rapprochement et à la clôture.",
    ],
    discuss: [
      "Locations, stock flows and retail devices",
      "Sites, flux de stock et équipements de caisse",
    ],
    workflow: "stockToSale",
  },
  {
    id: "finance",
    name: ["Finance and Assurance", "Finance et assurance"],
    verb: ["Explain the numbers.", "Expliquez les chiffres."],
    fit: ["Cash, accounts and close", "Trésorerie, comptes et clôture"],
    audience: [
      "For owners and finance teams bringing clarity to the close.",
      "Pour les dirigeants et les équipes financières qui préparent la clôture.",
    ],
    description: [
      "Connect the money you record to evidence you can review.",
      "Reliez les mouvements enregistrés aux justificatifs à examiner.",
    ],
    reason: [
      "A useful starting point when payment differences, customer balances or period-end checks need a clearer process.",
      "Un point de départ adapté pour structurer les écarts de paiement, les soldes clients et les contrôles de fin de période.",
    ],
    points: [
      [
        "AP / supplier and AR / customer balances",
        "Dettes fournisseurs et créances clients",
      ],
      [
        "OHADA accounting and source-linked journals",
        "Comptabilité OHADA et écritures liées aux pièces",
      ],
      [
        "Payment reconciliation and exception review",
        "Rapprochement des paiements et examen des écarts",
      ],
      [
        "Period-end checks and close evidence",
        "Contrôles de fin de période et justificatifs de clôture",
      ],
    ],
    scope: [
      "Finance and accounting form the base. Reconciliation needs reliable source records; provider connections are validated separately.",
      "La finance et la comptabilité forment la base. Le rapprochement exige des pièces fiables ; les connexions aux prestataires sont validées séparément.",
    ],
    discuss: [
      "Source records, providers and close scope",
      "Pièces d’origine, prestataires et périmètre de clôture",
    ],
    workflow: "accountingCloseAssurance",
  },
  {
    id: "people",
    name: ["People and Payroll", "Personnel et paie"],
    verb: ["Support the team.", "Accompagnez l’équipe."],
    fit: ["People, time and payroll", "Personnel, temps et paie"],
    audience: [
      "For SMEs formalizing employee records and payroll preparation.",
      "Pour les PME qui structurent les dossiers du personnel et la préparation de la paie.",
    ],
    description: [
      "Bring people records and payroll preparation together.",
      "Réunissez les dossiers du personnel et la préparation de la paie.",
    ],
    reason: [
      "A useful starting point when employee records, working time and payroll inputs need to be reviewed together.",
      "Un point de départ adapté pour vérifier ensemble les dossiers salariés, le temps de travail et les données de paie.",
    ],
    points: [
      [
        "HRIS records, contracts and organization",
        "Dossiers SIRH, contrats et organisation",
      ],
      [
        "Time records and payroll input review",
        "Temps de travail et contrôle des données de paie",
      ],
      [
        "Payroll preparation and payslips",
        "Préparation de la paie et bulletins",
      ],
      [
        "Payment and accounting handoffs",
        "Liens avec les paiements et la comptabilité",
      ],
    ],
    scope: [
      "Country rules, privacy, payment and accounting requirements are confirmed before rollout.",
      "Les règles du pays, la confidentialité, les paiements et les besoins comptables sont confirmés avant le déploiement.",
    ],
    discuss: [
      "Workforce, countries and payroll readiness",
      "Effectifs, pays et préparation à la paie",
    ],
    workflow: "peopleToPay",
  },
] as const

export const moduleOffers: Record<
  string,
  { path: OfferPath; relation: OfferCopy; note: OfferCopy }
> = {
  pos: {
    path: "operations",
    relation: ["Retail extension", "Extension commerce"],
    note: [
      "Add POS to sales and inventory. Devices and continuity needs are scoped separately.",
      "Ajoutez la caisse aux ventes et aux stocks. Les équipements et la continuité sont définis séparément.",
    ],
  },
  inventory: {
    path: "operations",
    relation: ["Operations scope", "Périmètre opérations"],
    note: [
      "Connect goods received, transfers, counts and sales by location.",
      "Reliez réceptions, transferts, inventaires et ventes par site.",
    ],
  },
  finance: {
    path: "finance",
    relation: ["Finance scope", "Périmètre finance"],
    note: [
      "Reconciliation connects finance and accounting. Each provider adapter needs its own validation.",
      "Le rapprochement relie finance et comptabilité. Chaque adaptateur prestataire nécessite sa validation.",
    ],
  },
  accounting: {
    path: "finance",
    relation: ["Finance scope", "Périmètre finance"],
    note: [
      "Bring source records into OHADA accounting and period-end review. Country requirements remain part of setup.",
      "Reliez les pièces à la comptabilité OHADA et aux contrôles de clôture. Les exigences du pays restent à paramétrer.",
    ],
  },
  hris: {
    path: "people",
    relation: ["People scope", "Périmètre personnel"],
    note: [
      "Start with employee records and contracts, then prepare reviewed inputs for payroll.",
      "Commencez par les dossiers salariés et les contrats, puis préparez les données vérifiées pour la paie.",
    ],
  },
  payroll: {
    path: "people",
    relation: ["People scope", "Périmètre personnel"],
    note: [
      "Payroll depends on people and time records, applicable country rules and the agreed rollout scope.",
      "La paie repose sur les dossiers du personnel, les temps, les règles du pays et le périmètre convenu.",
    ],
  },
  payables: {
    path: "finance",
    relation: ["Operations → finance", "Opérations → finance"],
    note: [
      "Supplier orders and invoices start in purchasing. Payables, payment review and accounting connect in finance.",
      "Commandes et factures fournisseurs partent des achats. Les dettes, les règlements et la comptabilité se relient en finance.",
    ],
  },
  receivables: {
    path: "finance",
    relation: ["Operations → finance", "Opérations → finance"],
    note: [
      "Customer invoices start in sales. Receivables, collections and reconciliation connect in finance.",
      "Les factures clients partent des ventes. Les créances, les encaissements et le rapprochement se relient en finance.",
    ],
  },
}

// Scope relationships, never a promise of automatic activation or entitlement.
export const offerComparison = [
  {
    label: ["Platform foundation", "Socle plateforme"],
    cells: [
      ["Included", "Inclus"],
      ["Included", "Inclus"],
      ["Included", "Inclus"],
    ],
  },
  {
    label: ["Inventory and locations", "Stocks et sites"],
    cells: [
      ["Primary scope", "Périmètre principal"],
      ["Connect Operations", "Relier les opérations"],
      ["Combine paths", "Combiner les parcours"],
    ],
  },
  {
    label: ["POS and retail devices", "Caisse et équipements"],
    cells: [
      ["Retail extension", "Extension commerce"],
      ["Via Operations", "Via les opérations"],
      ["Via Operations", "Via les opérations"],
    ],
  },
  {
    label: ["Suppliers and AP", "Fournisseurs et dettes"],
    cells: [
      ["Purchases & invoices", "Achats et factures"],
      ["Balances & payments", "Soldes et règlements"],
      ["Combine paths", "Combiner les parcours"],
    ],
  },
  {
    label: ["Clients, invoicing and AR", "Clients, facturation et créances"],
    cells: [
      ["Sales & invoices", "Ventes et factures"],
      ["Balances & collections", "Soldes et encaissements"],
      ["Combine paths", "Combiner les parcours"],
    ],
  },
  {
    label: [
      "OHADA, reconciliation and close",
      "OHADA, rapprochement et clôture",
    ],
    cells: [
      ["Connect Finance", "Relier la finance"],
      ["Primary scope", "Périmètre principal"],
      ["Accounting handoff", "Lien comptable"],
    ],
  },
  {
    label: ["HRIS and payroll", "SIRH et paie"],
    cells: [
      ["Connect People", "Relier le personnel"],
      ["Accounting handoff", "Lien comptable"],
      ["Country scope confirmed", "Périmètre pays confirmé"],
    ],
  },
  {
    label: [
      "Migration, training and support",
      "Migration, formation et assistance",
    ],
    cells: [
      ["Separately scoped", "Périmètre distinct"],
      ["Separately scoped", "Périmètre distinct"],
      ["Separately scoped", "Périmètre distinct"],
    ],
  },
] as const

export const offerFaqs = [
  {
    question: [
      "How much does Stoquify cost?",
      "Quel est le prix de Stoquify ?",
    ],
    answer: [
      "Pricing is tailored to the agreed rollout. Confirm the modules, locations, workforce, country requirements, provider connections and setup services first. The quote must specify user and location allowances, amount, currency, taxes, billing schedule and service terms before you commit.",
      "Le tarif dépend du déploiement convenu. Définissez d’abord les modules, les sites, les effectifs, les exigences du pays, les prestataires et les services de mise en place. Le devis doit préciser les limites d’utilisateurs et de sites, le montant, la devise, les taxes, l’échéancier et les conditions avant tout engagement.",
    ],
  },
  {
    question: [
      "Can I explore the product before choosing?",
      "Puis-je découvrir le produit avant de choisir ?",
    ],
    answer: [
      "Yes. The interactive previews on this page use fictional records and require no account. You can also create an account through the existing registration flow. This page does not promise a free trial, a trial duration or immediate module activation.",
      "Oui. Les aperçus interactifs de cette page utilisent des données fictives et ne nécessitent aucun compte. Vous pouvez également créer un compte via l’inscription. Cette page ne promet ni essai gratuit, ni durée d’essai, ni activation immédiate des modules.",
    ],
  },
  {
    question: [
      "Can I combine the three paths?",
      "Puis-je combiner les trois parcours ?",
    ],
    answer: [
      "Yes. Start with the work you need to organize, then combine paths where the records connect. Dependencies, country requirements and rollout readiness are confirmed together; these are adoption paths, not fixed all-inclusive tiers.",
      "Oui. Partez du travail à organiser, puis combinez les parcours là où les données se relient. Dépendances, exigences pays et préparation au déploiement sont confirmées ensemble ; il s’agit de parcours d’adoption, pas de forfaits fixes tout compris.",
    ],
  },
  {
    question: [
      "Is POS included in Operations Core?",
      "La caisse est-elle incluse dans les opérations essentielles ?",
    ],
    answer: [
      "Retail POS and continuity are extensions to Operations Core. They rely on sales and inventory. Terminals, hardware, payment costs and any offline requirements are reviewed separately.",
      "La caisse et la continuité sont des extensions des opérations essentielles. Elles reposent sur les ventes et les stocks. Terminaux, matériel, frais de paiement et besoins hors ligne sont examinés séparément.",
    ],
  },
  {
    question: [
      "What about invoicing, suppliers and customer balances?",
      "Qu’en est-il des factures, fournisseurs et soldes clients ?",
    ],
    answer: [
      "Operations connects sales, purchasing, customer and supplier records. Finance connects the resulting receivables and payables to collections, payment review, reconciliation and accounting. Confirm both sides when defining your rollout.",
      "Les opérations relient ventes, achats et dossiers clients et fournisseurs. La finance relie les créances et les dettes aux encaissements, règlements, rapprochements et comptes. Précisez les deux volets lors de la définition du déploiement.",
    ],
  },
  {
    question: [
      "Are payroll and provider connections available everywhere?",
      "La paie et les connexions prestataires sont-elles disponibles partout ?",
    ],
    answer: [
      "Scope depends on the country rules, supported providers and validated configuration. Confirm the countries, payroll needs and payment connections for your business before including them in a rollout.",
      "Le périmètre dépend des règles du pays, des prestataires pris en charge et du paramétrage validé. Confirmez les pays, les besoins de paie et les connexions de paiement avant de les intégrer au déploiement.",
    ],
  },
  {
    question: [
      "What is separate from the software scope?",
      "Qu’est-ce qui est distinct du périmètre logiciel ?",
    ],
    answer: [
      "Migration, training, country-pack setup, provider adapters and managed support are scoped explicitly. Confirm their deliverables, costs and support commitments in the quote; they are not silently included in a headline price.",
      "Migration, formation, paramétrage pays, adaptateurs prestataires et assistance dédiée sont définis explicitement. Confirmez leurs livrables, coûts et engagements dans le devis ; ils ne sont pas implicitement compris dans un prix d’appel.",
    ],
  },
  {
    question: [
      "Does selecting a path place an order?",
      "Choisir un parcours déclenche-t-il une commande ?",
    ],
    answer: [
      "No. Your selection only helps you compare this page. Creating an account opens registration; it does not submit this selection, accept a quote or purchase a subscription.",
      "Non. Votre sélection sert uniquement à comparer sur cette page. Créer un compte ouvre l’inscription ; cela ne transmet pas la sélection, n’accepte pas de devis et n’achète aucun abonnement.",
    ],
  },
] as const
