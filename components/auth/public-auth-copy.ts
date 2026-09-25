// Copy for the standard public forms; shared validation and auth messages stay in auth-copy.
export const publicAuthCopy = {
  en: {
    login: { title: "Sign in to Stoquify", subtitle: "Use your work email and password to continue.", secureNote: "Your available workflows follow your organization’s access settings." },
    register: { title: "Create your account", subtitle: "Tell us about yourself and your business to create your administrator account.", blueprintBody: "Next: verify your email, sign in, then configure the locations, items and workflows your team needs." },
    nextSteps: {
      label: "After creating your account",
      context: { title: "Verify your email", body: "Enter the code from your verification email. Request another on the verification screen if needed." },
      access: { title: "Prepare your workspace", body: "Sign in, confirm enabled modules, then add locations, items and initial data." },
      assurance: { title: "Set up your team", body: "Assign access and review accounting settings before using those workflows." },
    },
    workspaceGuide: {
      eyebrow: "Your connected workspace",
      loginTitle: "Your work carries forward.",
      registerTitle: "Give your team a clearer view.",
      introduction: "Understand how daily operations connect, who takes the next step and what needs a review.",
      journeyLabel: "A sales journey, across teams",
      steps: [
        { title: "Record sales and stock", role: "Cashier · Stock team", body: "Follow the sale and the stock movements for the location." },
        { title: "Check the payments", role: "Finance team", body: "Compare recorded payments with supporting evidence and review differences." },
        { title: "Prepare the accounts", role: "Accountant · Manager", body: "Review accounting entries and unresolved items before closing the period." },
      ],
      more: "Explore purchasing, customer collections, people and other business journeys.",
      link: "See how the workflows connect",
      availability: "Available workflows depend on enabled modules, your access and workspace setup.",
    },
  },
  fr: {
    login: { title: "Se connecter à Stoquify", subtitle: "Utilisez votre email professionnel et votre mot de passe.", secureNote: "Les parcours disponibles dépendent des accès définis pour votre organisation." },
    register: { title: "Créer votre compte", subtitle: "Renseignez vos coordonnées et votre entreprise pour créer votre compte administrateur.", blueprintBody: "Ensuite : vérifiez votre email, connectez-vous, puis configurez les sites, articles et parcours utiles à votre équipe." },
    nextSteps: {
      label: "Après la création du compte",
      context: { title: "Vérifier votre email", body: "Saisissez le code reçu par email sur l’écran de vérification. Vous pouvez y demander un nouveau code." },
      access: { title: "Préparer votre espace", body: "Connectez-vous, confirmez les modules activés, puis ajoutez sites, articles et données initiales." },
      assurance: { title: "Configurer votre équipe", body: "Attribuez les accès et revoyez les paramètres comptables avant d’utiliser ces parcours." },
    },
    workspaceGuide: {
      eyebrow: "Votre espace connecté",
      loginTitle: "Votre travail fait avancer l’équipe.",
      registerTitle: "Une vision plus claire pour votre équipe.",
      introduction: "Comprenez les liens entre les opérations, qui prend le relais et ce qui doit être vérifié.",
      journeyLabel: "Le parcours d’une vente, entre équipes",
      steps: [
        { title: "Enregistrer ventes et stocks", role: "Caisse · Équipe stock", body: "Suivez la vente et les mouvements de stock du site concerné." },
        { title: "Vérifier les paiements", role: "Équipe finance", body: "Comparez les paiements enregistrés aux justificatifs et examinez les écarts." },
        { title: "Préparer les comptes", role: "Comptable · Responsable", body: "Examinez les écritures et les points en suspens avant de clôturer la période." },
      ],
      more: "Explorez les achats, le recouvrement client, les équipes et les autres parcours métier.",
      link: "Comprendre les liens entre les parcours",
      availability: "Les parcours disponibles dépendent des modules activés, de vos accès et de la configuration.",
    },
  },
} as const;
