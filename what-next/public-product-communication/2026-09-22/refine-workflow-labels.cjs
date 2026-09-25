const fs = require('node:fs');
const assert = require('node:assert/strict');
const labels = {
  en: {
    roleLabel: 'Who takes part', handoffLabel: 'What passes to the next team', controlLabel: 'Reviews and approvals', evidenceLabel: 'Records retained', protectedLabel: 'Continue in your workspace',
    roleHubLabel: 'Choose your role', outcomeChooserLabel: 'Choose a business objective', destinationLabel: 'Where to continue',
    routeHelp: 'Sign in to continue. Your organization’s access settings determine which pages you can use.',
    'roles.purchasing': 'Purchasing', 'roles.admin': 'Administrator',
    'routeLabels.pos': 'Point of sale', 'routeLabels.assuranceControl': 'Workflow checks', 'routeLabels.ownerWarRoom': 'Business overview',
    'outcomes.buy': 'Purchase and review supplier balances', 'outcomes.declare': 'Prepare payroll declarations', 'outcomes.reconcile': 'Reconcile payments', 'outcomes.decide': 'Review today’s priorities', 'outcomes.release': 'Resolve workflow blockers',
  },
  fr: {
    roleLabel: 'Qui intervient', handoffLabel: 'Ce qui passe à l’équipe suivante', stepsLabel: 'Les étapes du parcours', controlLabel: 'Revues et approbations', evidenceLabel: 'Documents et traces conservés', protectedLabel: 'Continuer dans votre espace',
    roleHubLabel: 'Choisir votre rôle', outcomeChooserLabel: 'Choisir un objectif métier', sourceLabel: 'Point de départ', proofLabel: 'Justificatif', destinationLabel: 'Où poursuivre', quickLaunchLabel: 'Continuer dans votre espace',
    routeHelp: 'Connectez-vous pour poursuivre. Les droits définis par votre organisation déterminent les pages accessibles.',
    noMatchesBody: 'Retirez un filtre ou affichez tous les parcours pour trouver celui qui correspond à votre besoin.',
    'roles.owner': 'Dirigeant', 'roles.purchasing': 'Achats', 'roles.hrPayroll': 'RH et paie', 'roles.admin': 'Administrateur',
    'routeLabels.pos': 'Point de vente', 'routeLabels.payables': 'Dettes fournisseurs', 'routeLabels.receivables': 'Créances clients', 'routeLabels.assuranceControl': 'Suivi des contrôles', 'routeLabels.ownerWarRoom': 'Vue d’ensemble de l’activité', 'routeLabels.dailyDigest': 'Synthèse du jour',
    'outcomes.stock': 'Suivre et réapprovisionner les stocks', 'outcomes.buy': 'Acheter et suivre les fournisseurs', 'outcomes.collect': 'Suivre les encaissements clients', 'outcomes.declare': 'Préparer les déclarations de paie', 'outcomes.reconcile': 'Rapprocher les paiements', 'outcomes.comply': 'Vérifier les obligations applicables', 'outcomes.decide': 'Traiter les priorités du jour', 'outcomes.release': 'Résoudre les points de blocage',
  },
};
const titles = {
  sellToCash: ['Sell and collect', 'Sell and collect', 'Vendre et encaisser', 'Vendre et encaisser'],
  stockToSale: ['Stock and sales', 'Manage stock through to the sale', 'Stocks et ventes', 'Gérer les stocks jusqu’à la vente'],
  procureToPay: ['Purchasing and suppliers', 'Purchase and pay suppliers', 'Achats et fournisseurs', 'Acheter et payer les fournisseurs'],
  customerToCollection: ['Customer collections', 'Follow customer balances and collections', 'Encaissements clients', 'Suivre les soldes et les encaissements clients'],
  peopleToPay: ['People and payroll', 'Prepare and review payroll', 'Personnel et paie', 'Préparer et vérifier la paie'],
  payrollStatutoryProof: ['Payroll declarations', 'Prepare payroll declarations and payment proof', 'Déclarations de paie', 'Préparer les déclarations et justificatifs de paie'],
  paymentReconciliation: ['Payment reconciliation', 'Reconcile payments with supporting evidence', 'Rapprochement des paiements', 'Rapprocher les paiements et leurs justificatifs'],
  accountingCloseAssurance: ['Accounting close', 'Review and close the accounts', 'Clôture comptable', 'Vérifier les comptes et préparer la clôture'],
  complianceCountryEvidence: ['Country rules and documents', 'Review country rules and supporting documents', 'Règles et justificatifs', 'Vérifier les règles du pays et les justificatifs'],
  ownerDailyControl: ['Daily management', 'Review the business and daily priorities', 'Pilotage quotidien', 'Piloter l’activité et les priorités du jour'],
  adminAccessControl: ['Team access', 'Manage team access and responsibilities', 'Accès des équipes', 'Gérer les accès et les responsabilités'],
  workflowAssuranceGates: ['Workflow checks', 'Review incidents and workflow blockers', 'Suivi des contrôles', 'Traiter les incidents et les points de blocage'],
};
const french = {
  sellToCash: {
    steps: ['Ouvrir la session de caisse dont vous êtes responsable', 'Saisir les articles, remises, taxes applicables et informations du client', 'Enregistrer le paiement selon le mode choisi et remettre le reçu', 'Comparer les mouvements de caisse attendus aux montants comptés', 'Transmettre les écarts de paiement au rapprochement avant la clôture'],
    controls: ['Session attribuée au caissier', 'État du reçu et des retours', 'Mode de paiement et prestataire', 'Revue des écarts de caisse'],
    evidence: ['Vente enregistrée', 'Reçu', 'Mouvement de caisse', 'Justificatif de paiement'],
    nextAction: 'Ouvrez la caisse, enregistrez la vente, puis vérifiez les mouvements de caisse et les écarts de paiement avant la clôture de la journée.', source: 'Vente en caisse', destination: 'Point de vente et caisse',
  },
  stockToSale: {
    steps: ['Définir l’article, son unité, sa catégorie, son site et son fournisseur', 'Réceptionner le stock avec sa provenance et les quantités reçues', 'Enregistrer un transfert, un comptage ou un ajustement avec son motif', 'Relier la sortie de stock à la vente en caisse', 'Examiner la valeur du stock, les écarts et les besoins de réapprovisionnement'],
    controls: ['Site et emplacement concernés', 'Motif du mouvement et responsable', 'Validation de l’expédition et de la réception', 'Revue de la valorisation et des écarts'],
    evidence: ['Fiche article', 'Origine du mouvement', 'Historique du site et des intervenants', 'Justificatif de l’écart'],
    nextAction: 'Ouvrez les stocks, vérifiez l’article et le site, puis suivez le mouvement jusqu’à la vente ou à la revue de sa valeur.', source: 'Article ou mouvement de stock', destination: 'Gestion des stocks',
  },
  procureToPay: {
    steps: ['Vérifier le fournisseur et ses conditions commerciales', 'Préparer et faire approuver le bon de commande', 'Enregistrer la réception et son lien avec la commande', 'Vérifier la dette fournisseur et le solde restant', 'Préparer le paiement et les éléments nécessaires à son approbation'],
    controls: ['Identité et conditions du fournisseur', 'Approbation du bon de commande', 'État de la réception', 'Vérification des montants à payer'],
    evidence: ['Bon de commande', 'Bon de réception', 'Solde fournisseur', 'Justificatif de la dette fournisseur'],
    nextAction: 'Ouvrez les commandes, vérifiez les conditions du fournisseur et la réception, puis préparez les dettes dont les contrôles sont terminés.', source: 'Engagement envers le fournisseur', destination: 'Commandes fournisseurs',
  },
  customerToCollection: {
    steps: ['Créer ou mettre à jour la fiche client', 'Relier la vente à sa commande ou à sa facture', 'Suivre les montants dus et les échéances', 'Enregistrer l’encaissement et joindre son reçu', 'Traiter les écarts avant de préparer les rapports'],
    controls: ['Client concerné et conditions de crédit', 'Montants dus et échéances', 'Justificatif d’encaissement', 'État du rapprochement'],
    evidence: ['Historique client', 'Créance restant à régler', 'Reçu', 'Référence comptable'],
    nextAction: 'Ouvrez les créances clients, examinez l’historique, puis reliez les justificatifs d’encaissement au rapprochement.', source: 'Vente ou solde client', destination: 'Créances clients',
  },
  peopleToPay: {
    steps: ['Vérifier l’identité du salarié et son rattachement à l’organisation', 'Approuver le contrat et les éléments de rémunération', 'Saisir les présences, congés et écarts à vérifier', 'Valider les données nécessaires à la paie', 'Calculer et faire approuver la paie', 'Publier les bulletins et les justificatifs de paiement disponibles'],
    controls: ['Identité et rattachement du salarié', 'Contrat et rémunération approuvés', 'Présences et écarts vérifiés', 'Données de paie complètes et validées', 'Approbation de la paie'],
    evidence: ['Données RH approuvées', 'Résultat du calcul de paie', 'Bulletin de paie', 'Justificatif de paiement'],
    nextAction: 'Ouvrez le personnel, vérifiez les données RH approuvées, puis préparez la paie avec les données validées.', source: 'Données RH approuvées', destination: 'Personnel et paie',
  },
  payrollStatutoryProof: {
    steps: ['Verrouiller la paie approuvée', 'Préparer les montants des déclarations obligatoires', 'Joindre les justificatifs de l’administration ou du prestataire', 'Enregistrer la mise en paiement et les justificatifs disponibles', 'Transmettre la référence à la revue comptable'],
    controls: ['Vérification de la déclaration', 'Justificatif de l’administration', 'Suivi du paiement', 'État des corrections'],
    evidence: ['Dossier de déclaration', 'Historique du paiement', 'Registre de paie', 'Référence comptable'],
    nextAction: 'Ouvrez les déclarations, vérifiez la paie approuvée et joignez les justificatifs de l’administration. Conservez séparément ceux du paiement.', source: 'Paie approuvée', destination: 'Déclarations de paie',
  },
  paymentReconciliation: {
    steps: ['Importer les relevés de banque ou les justificatifs du prestataire', 'Comparer les paiements enregistrés aux montants constatés', 'Attribuer les écarts non résolus à un responsable', 'Faire approuver le rapprochement ou le reclassement', 'Conserver les pièces et la décision de résolution'],
    controls: ['Justificatif du prestataire', 'Import du relevé', 'Décision de rapprochement', 'Validation du responsable de la revue'],
    evidence: ['Décision de rapprochement', 'Écart en attente de résolution', 'Justificatif du prestataire', 'Historique de résolution'],
    nextAction: 'Ouvrez le rapprochement, importez les justificatifs, attribuez les écarts à traiter et conservez les décisions de revue.', source: 'Paiement ou relevé du prestataire', destination: 'Rapprochement des paiements',
  },
  accountingCloseAssurance: {
    steps: ['Relier les opérations aux pièces comptables correspondantes', 'Comptabiliser les écritures avec leurs règles et éléments de revue', 'Rapprocher les comptes et leurs justificatifs', 'Traiter les points bloquants ou demander une correction', 'Terminer la revue interne de clôture'],
    controls: ['Lien avec la pièce d’origine', 'Règle de comptabilisation', 'Revue des points bloquants', 'État de la revue interne de clôture'],
    evidence: ['Pièce d’origine de l’écriture', 'Point bloquant pour la clôture', 'Historique des revues', 'Dossier de clôture'],
    nextAction: 'Ouvrez la clôture comptable, examinez les écritures liées aux sources et traitez les contrôles en attente avant la décision interne de clôture.', source: 'Écriture liée à sa pièce d’origine', destination: 'Clôture comptable',
  },
  complianceCountryEvidence: {
    steps: ['Identifier le pays et l’obligation concernés', 'Vérifier la règle applicable et sa source', 'Rassembler les justificatifs fiscaux ou réglementaires', 'Examiner la réponse du service connecté et ses limites', 'Signaler les points restant à vérifier'],
    controls: ['Source de la règle', 'État du service connecté', 'État du document', 'Obligation restant à traiter'],
    evidence: ['Justificatif de conformité', 'Fonctionnalités disponibles pour le pays', 'Justificatif de l’administration', 'Limite connue'],
    nextAction: 'Ouvrez le suivi de conformité, vérifiez la source des règles et identifiez les obligations ou justificatifs restant à examiner.', source: 'Obligation applicable au pays', destination: 'Suivi de conformité',
  },
  ownerDailyControl: {
    steps: ['Examiner les indicateurs des sites et de l’activité', 'Ouvrir l’écart ou le point bloquant', 'Attribuer le suivi à un responsable', 'Enregistrer la décision ou la prochaine action', 'Revenir au parcours et aux documents d’origine'],
    controls: ['Écarts à traiter', 'Indicateurs du site', 'Approbations en attente', 'Ancienneté des informations'],
    evidence: ['Décisions à prendre', 'Lien vers l’opération d’origine', 'État des contrôles', 'Dossier de clôture de la journée'],
    nextAction: 'Ouvrez la synthèse du jour, choisissez un point prioritaire et consultez les opérations à son origine.', source: 'Indicateur ou écart du jour', destination: 'Synthèse du jour',
  },
  adminAccessControl: {
    steps: ['Inviter un utilisateur ou mettre à jour son profil', 'Définir son rôle et ses autorisations', 'Choisir les modules accessibles', 'Associer les sites dont il est responsable', 'Examiner les paramètres de sécurité et les changements'],
    controls: ['État de l’invitation', 'Autorisations liées au rôle', 'Accès aux modules', 'Sites accessibles'],
    evidence: ['Périmètre de responsabilité', 'Accès effectifs', 'Historique des changements', 'Paramètres de sécurité'],
    nextAction: 'Ouvrez les utilisateurs, vérifiez leurs responsabilités, puis ajustez les rôles, sites ou modules en conservant l’historique.', source: 'Demande d’accès', destination: 'Gestion des utilisateurs',
  },
  workflowAssuranceGates: {
    steps: ['Identifier l’incident ou le contrôle bloquant', 'Préciser le parcours concerné et les conséquences pour l’équipe', 'Attribuer la prochaine action à un responsable', 'Maintenir la suspension ou autoriser le changement selon les contrôles', 'Enregistrer la décision et ses justificatifs'],
    controls: ['Attribution de l’incident', 'Règles d’accès au module', 'Validation du changement', 'Possibilité de revenir à l’état précédent'],
    evidence: ['Dossier de l’incident', 'Décision de revue', 'Parcours concerné', 'Historique des changements'],
    nextAction: 'Ouvrez le suivi des contrôles, identifiez le parcours concerné et consignez la décision avec ses justificatifs.', source: 'Incident ou contrôle bloquant', destination: 'Suivi des contrôles',
  },
};
function assignExisting(object, key, value) {
  const parts = key.split('.');
  for (const part of parts.slice(0, -1)) object = object[part];
  assert.ok(Object.hasOwn(object, parts.at(-1)), key);
  object[parts.at(-1)] = value;
}
for (const locale of ['en', 'fr']) {
  const file = `messages/${locale}.json`;
  const original = fs.readFileSync(file, 'utf8');
  const all = JSON.parse(original);
  const atlas = all.landing.workflowAtlas;
  for (const [key, value] of Object.entries(labels[locale])) assignExisting(atlas, key, value);
  for (const [key, values] of Object.entries(titles)) {
    atlas.workflows[key].shortTitle = values[locale === 'en' ? 0 : 2];
    atlas.workflows[key].title = values[locale === 'en' ? 1 : 3];
  }
  if (locale === 'fr') for (const [key, copy] of Object.entries(french)) {
    const workflow = atlas.workflows[key];
    for (const [field, value] of Object.entries(copy)) {
      if (Array.isArray(value)) {
        const keys = Object.keys(workflow[field]);
        assert.equal(keys.length, value.length, `${key}.${field}`);
        keys.forEach((step, index) => workflow[field][step] = value[index]);
      } else assignExisting(workflow, field, value);
    }
  }
  if (locale === 'en') {
    atlas.workflows.peopleToPay.controls.inputReadiness = 'Reviewed and complete payroll inputs';
    atlas.workflows.sellToCash.steps.openSession = 'Open your point-of-sale session';
    atlas.workflows.workflowAssuranceGates.steps.detectIncident = 'Identify the incident or blocking check';
    atlas.workflows.workflowAssuranceGates.steps.holdRelease = 'Keep the change on hold or approve it after review';
    atlas.workflows.workflowAssuranceGates.steps.recordDecision = 'Record the review decision and its evidence';
    atlas.workflows.workflowAssuranceGates.controls.releaseGate = 'Change approval';
    atlas.workflows.workflowAssuranceGates.evidence.gateDecision = 'Review decision';
    atlas.workflows.workflowAssuranceGates.nextAction = 'Open workflow checks, identify the affected journey, and record the decision with its supporting evidence.';
    atlas.workflows.workflowAssuranceGates.source = 'Incident or blocking check';
    atlas.workflows.workflowAssuranceGates.destination = 'Workflow checks';
  }
  const newline = original.includes('\r\n') ? '\r\n' : '\n';
  fs.writeFileSync(file, (JSON.stringify(all, null, 2) + '\n').replace(/\n/g, newline));
  console.log(`Refined visible workflow labels and guidance in ${locale}.`);
}
