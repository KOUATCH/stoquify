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
  },
} as const;
