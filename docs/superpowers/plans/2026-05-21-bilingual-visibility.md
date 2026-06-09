# Bilingual Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the fully-built i18n infrastructure (next-intl, `[locale]` routing, `LocaleSwitcher`, `en.json`/`fr.json`) in every visible layer of the app — public landing pages, site header, and dashboard navigation — so switching locale actually changes UI text.

**Architecture:** The infrastructure already exists: `next-intl` is configured, `[locale]` URL routing is live, `LocaleSwitcher` is built, and both `en.json`/`fr.json` have full key sets for common, nav, and entity namespaces. The only missing pieces are (a) `LocaleSwitcher` not mounted on public pages, (b) landing-page components using hardcoded strings instead of `useTranslations()`, (c) dashboard sidebar/navbar rendering literal titles from `config/sidebar.ts` instead of translated keys.

**Tech Stack:** next-intl 3.x, `useTranslations()` (client components), `getTranslations()` (server components), `createNavigation` locale-aware `Link` from `@/i18n/navigation`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `messages/en.json` | Modify | Add `landing.*` namespace; extend `nav.*` with sidebar sub-items |
| `messages/fr.json` | Modify | Same keys in French |
| `components/frontend/site-header.tsx` | Modify | Add `<LocaleSwitcher />`, switch to locale-aware `Link`, translate nav strings |
| `components/frontend/stockflow-hero.tsx` | Modify | `useTranslations("landing.hero")` |
| `components/frontend/metrics-bar.tsx` | Modify | `useTranslations("landing.metrics")` |
| `components/frontend/stockflow-features.tsx` | Modify | `useTranslations("landing.features")` |
| `components/frontend/how-it-works.tsx` | Modify | `useTranslations("landing.howItWorks")` |
| `components/frontend/stockflow-pricing.tsx` | Modify | `useTranslations("landing.pricing")` |
| `components/frontend/stockflow-faq.tsx` | Modify | `useTranslations("landing.faq")` |
| `components/frontend/stockflow-cta.tsx` | Modify | `useTranslations("landing.cta")` |
| `config/sidebar.ts` | Modify | Change `title` strings to camelCase nav translation keys |
| `components/dashboard/Sidebar.tsx` | Modify | `useTranslations("nav")` to render sidebar labels |
| `components/dashboard/Navbar.tsx` | Modify | `useTranslations("nav")` for "Sign out" / "Live Website" |
| `components/brands/ModernBrandForm.tsx` | Modify | `useTranslations("brands")` + `useTranslations("common")` |
| `components/dashboard/categories/CategoryFormForEditing.tsx` | Modify | `useTranslations("categories")` |
| `components/dashboard/taxRates/TaxRateFormForEditing.tsx` | Modify | `useTranslations("taxRates")` |

---

## Task 1: Add `landing` namespace + extend `nav` in both message files

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/fr.json`

- [ ] **Step 1: Append the `landing` namespace and extended `nav` keys to `messages/en.json`**

Open `messages/en.json` and add the following keys. Merge into the existing top-level JSON object (keep all existing keys, add `landing` and extend `nav`).

Extended `nav` block (replace the existing `"nav"` object entirely):
```json
"nav": {
  "dashboard": "Dashboard",
  "inventory": "Inventory",
  "items": "Items",
  "categories": "Categories",
  "brands": "Brands",
  "units": "Units",
  "taxRates": "Tax Rates",
  "customers": "Customers",
  "suppliers": "Suppliers",
  "pos": "POS",
  "sales": "Sales",
  "purchases": "Purchases",
  "purchaseOrders": "Purchase Orders",
  "reports": "Reports",
  "finance": "Finance",
  "users": "Users",
  "logout": "Sign out",
  "roles": "Roles",
  "changePassword": "Change Password",
  "profile": "Profile",
  "currentStock": "Current Stock",
  "lowStockItems": "Low Stock Items",
  "serialNumbers": "Serial Numbers",
  "stockTransfers": "Stock Transfers",
  "createTransfers": "Create Transfers",
  "stockAdjustments": "Stock Adjustments",
  "createAdjustments": "Create Adjustments",
  "salesOrders": "Sales Orders",
  "returns": "Returns",
  "goodsReceipts": "Goods Receipts",
  "supplierItems": "Supplier Items",
  "settings": "Settings",
  "locations": "Locations",
  "rolesAndPermissions": "Roles & Permissions",
  "usersAndInvites": "Users & Invites",
  "companySettings": "Company Settings",
  "orders": "Orders",
  "productReport": "Product Report",
  "inventoryReport": "Inventory Report",
  "customersReport": "Customers Report",
  "liveWebsite": "Live Website"
}
```

New `landing` block to add:
```json
"landing": {
  "nav": {
    "home": "Home",
    "features": "Features",
    "pricing": "Pricing",
    "howItWorks": "How it works",
    "viewAll": "View all",
    "getStarted": "Get started",
    "trialNote": "Start your free 14-day trial — no credit card required.",
    "login": "Log in",
    "startFreeTrial": "Start Free Trial"
  },
  "hero": {
    "pill": "Now supporting multi-currency & bilingual operations",
    "headline1": "The Operating System",
    "headline2": "for Modern Retail",
    "subheading": "Real-time inventory tracking, multi-location POS, purchase orders, and deep analytics — all in one platform built for retailers who mean business.",
    "ctaPrimary": "Start Free Trial",
    "ctaSecondary": "Watch Demo",
    "badge1": "SOC 2 Ready",
    "badge2": "99.9% Uptime",
    "badge3": "Multi-location",
    "todayRevenue": "Today's Revenue",
    "vsYesterday": "↑ 12.4% vs yesterday",
    "lowStockAlerts": "Low Stock Alerts",
    "lowStockCount": "3 Items",
    "reorderSuggested": "Reorder suggested"
  },
  "metrics": {
    "itemsTracked": "Items Tracked Daily",
    "uptime": "Uptime SLA",
    "businesses": "Retail Businesses",
    "fasterCounts": "Faster Stock Counts"
  },
  "features": {
    "badge": "Platform Capabilities",
    "headline": "Everything your retail business needs.",
    "headlineSub": "Nothing it doesn't.",
    "subheading": "Built specifically for multi-location retailers — not adapted from a generic SaaS template.",
    "multiLocationTitle": "Multi-Location Inventory",
    "multiLocationDesc": "Track stock levels across unlimited stores and warehouses in real time. Get instant visibility into what's where — always.",
    "posTitle": "Point of Sale",
    "posDesc": "Lightning-fast POS with session management, cash drawer tracking, and multi-payment methods including mobile money.",
    "analyticsTitle": "Sales Analytics",
    "analyticsDesc": "Daily revenue reports, gross margin breakdowns, bestseller rankings, and trend analysis — all automated.",
    "purchaseTitle": "Purchase Orders",
    "purchaseDesc": "Full procurement lifecycle: create POs, track approvals, receive goods, and auto-update stock on delivery.",
    "transfersTitle": "Stock Transfers",
    "transfersDesc": "Move inventory between locations with full audit trails, approval workflows, and real-time transit tracking.",
    "trackingTitle": "Serial & Batch Tracking",
    "trackingDesc": "Full traceability for high-value or expiry-sensitive items. Track individual units from receipt to sale.",
    "supplierTitle": "Supplier Management",
    "supplierDesc": "Maintain supplier ledgers, preferred pricing, lead times, and credit terms. Know your best sources at a glance.",
    "rolesTitle": "Role-Based Access",
    "rolesDesc": "Granular permissions across admin, store manager, and cashier roles. Each user sees only what they need."
  },
  "howItWorks": {
    "badge": "How It Works",
    "headline": "Up and running in one afternoon.",
    "step1Title": "Set Up Your Organization",
    "step1Desc": "Add your locations, define roles, and import your product catalog. Most businesses are live in under an hour.",
    "step2Title": "Connect Your Operations",
    "step2Desc": "Link your POS terminals, configure suppliers, and set reorder levels. Everything syncs automatically across locations.",
    "step3Title": "Run Smarter Every Day",
    "step3Desc": "Get daily sales reports, low-stock alerts, and profit insights delivered automatically. Make decisions based on data, not guesswork."
  },
  "pricing": {
    "badge": "Pricing",
    "headline": "Simple, transparent pricing.",
    "subheading": "No setup fees. No hidden charges. Cancel anytime.",
    "mostPopular": "Most Popular",
    "perMonth": "/mo",
    "starterName": "Starter",
    "starterDesc": "Perfect for single-location retailers getting started.",
    "starterF1": "1 location",
    "starterF2": "Up to 1,000 products",
    "starterF3": "3 user accounts",
    "starterF4": "POS & inventory management",
    "starterF5": "Basic sales reports",
    "starterF6": "Email support",
    "starterCta": "Get Started",
    "growthName": "Growth",
    "growthDesc": "For expanding businesses with multiple stores.",
    "growthF1": "Up to 5 locations",
    "growthF2": "Unlimited products",
    "growthF3": "15 user accounts",
    "growthF4": "Full POS + purchase orders",
    "growthF5": "Advanced analytics & reports",
    "growthF6": "Stock transfers between locations",
    "growthF7": "Serial & batch tracking",
    "growthF8": "Priority support",
    "growthCta": "Start Free Trial",
    "enterpriseName": "Enterprise",
    "enterpriseDesc": "Tailored for retail chains and franchise operations.",
    "enterpriseF1": "Unlimited locations",
    "enterpriseF2": "Unlimited users",
    "enterpriseF3": "Custom roles & permissions",
    "enterpriseF4": "White-label option",
    "enterpriseF5": "Dedicated onboarding",
    "enterpriseF6": "SLA-backed uptime guarantee",
    "enterpriseF7": "API access",
    "enterpriseF8": "24/7 phone support",
    "enterpriseCta": "Contact Sales"
  },
  "faq": {
    "badge": "FAQ",
    "headline": "Questions? Answered.",
    "q1": "How long does onboarding take?",
    "a1": "Most businesses are fully operational within a single afternoon. Import your product catalog via CSV, add your locations and users, configure your POS terminals, and you're live. Our onboarding checklist walks you through every step.",
    "q2": "Can I migrate from spreadsheets or another system?",
    "a2": "Yes. StockFlow supports CSV import for products, suppliers, customers, and opening stock levels. For larger migrations or custom data formats, our onboarding team handles the full transfer at no extra cost on Growth and Enterprise plans.",
    "q3": "Does it work across multiple store locations?",
    "a3": "Multi-location is a core feature, not an add-on. You can track stock per location, transfer inventory between stores, run location-specific reports, and manage each store's POS sessions independently — all from one dashboard.",
    "q4": "What payment methods does the POS support?",
    "a4": "Cash, card, mobile money (MTN MoMo, Orange Money, and others), bank transfer, store credit, and split payments. The POS handles cash drawer reconciliation and generates a full session report at close.",
    "q5": "Is my data secure?",
    "a5": "All data is encrypted in transit (TLS 1.3) and at rest. Access is strictly scoped by organization — no data ever leaks across tenants. We maintain audit logs for every sensitive action. Enterprise plans include SOC 2 compliance documentation.",
    "q6": "Can I set different permissions for different staff?",
    "a6": "Yes. StockFlow has three built-in roles (Admin, Store Manager, Cashier) and Enterprise plans support fully custom roles. Each role can be restricted to specific locations, modules, and actions.",
    "q7": "Does it support multiple languages and currencies?",
    "a7": "StockFlow is bilingual (English + French) throughout the interface and supports any currency with configurable tax rates. Perfect for businesses operating across different markets.",
    "q8": "What happens if I need to cancel?",
    "a8": "Cancel anytime from your account settings — no penalties, no lock-in. You can export all your data in standard formats before leaving. We also offer a 14-day free trial on all paid plans, no credit card required."
  },
  "cta": {
    "badge": "Start Today — Free for 14 Days",
    "headline1": "Stop managing stock",
    "headline2": "with spreadsheets.",
    "subheading": "Join hundreds of retailers who replaced their manual processes with StockFlow. No credit card required to start.",
    "ctaPrimary": "Create Your Free Account",
    "ctaSecondary": "See It in Action"
  }
}
```

- [ ] **Step 2: Add the same structure to `messages/fr.json`**

Extended `nav` block (replace the existing `"nav"` object entirely):
```json
"nav": {
  "dashboard": "Tableau de bord",
  "inventory": "Inventaire",
  "items": "Articles",
  "categories": "Catégories",
  "brands": "Marques",
  "units": "Unités",
  "taxRates": "Taux de taxe",
  "customers": "Clients",
  "suppliers": "Fournisseurs",
  "pos": "PDV",
  "sales": "Ventes",
  "purchases": "Achats",
  "purchaseOrders": "Bons de commande",
  "reports": "Rapports",
  "finance": "Finance",
  "users": "Utilisateurs",
  "logout": "Déconnexion",
  "roles": "Rôles",
  "changePassword": "Changer le mot de passe",
  "profile": "Profil",
  "currentStock": "Stock actuel",
  "lowStockItems": "Articles en rupture",
  "serialNumbers": "Numéros de série",
  "stockTransfers": "Transferts de stock",
  "createTransfers": "Créer des transferts",
  "stockAdjustments": "Ajustements de stock",
  "createAdjustments": "Créer des ajustements",
  "salesOrders": "Commandes clients",
  "returns": "Retours",
  "goodsReceipts": "Réceptions de marchandises",
  "supplierItems": "Articles fournisseurs",
  "settings": "Paramètres",
  "locations": "Sites",
  "rolesAndPermissions": "Rôles et permissions",
  "usersAndInvites": "Utilisateurs et invitations",
  "companySettings": "Paramètres entreprise",
  "orders": "Commandes",
  "productReport": "Rapport produits",
  "inventoryReport": "Rapport d'inventaire",
  "customersReport": "Rapport clients",
  "liveWebsite": "Site web"
}
```

New `landing` block:
```json
"landing": {
  "nav": {
    "home": "Accueil",
    "features": "Fonctionnalités",
    "pricing": "Tarification",
    "howItWorks": "Comment ça marche",
    "viewAll": "Tout voir",
    "getStarted": "Commencer",
    "trialNote": "Démarrez votre essai gratuit de 14 jours — sans carte de crédit.",
    "login": "Connexion",
    "startFreeTrial": "Essai gratuit"
  },
  "hero": {
    "pill": "Désormais compatible multi-devises et opérations bilingues",
    "headline1": "Le Système d'Exploitation",
    "headline2": "du Commerce Moderne",
    "subheading": "Suivi des stocks en temps réel, PDV multi-sites, bons de commande et analyses approfondies — tout en une seule plateforme conçue pour les commerçants sérieux.",
    "ctaPrimary": "Essai Gratuit",
    "ctaSecondary": "Voir la Démo",
    "badge1": "SOC 2 Prêt",
    "badge2": "99,9 % de disponibilité",
    "badge3": "Multi-sites",
    "todayRevenue": "Chiffre du Jour",
    "vsYesterday": "↑ 12,4 % vs hier",
    "lowStockAlerts": "Alertes Stock Faible",
    "lowStockCount": "3 Articles",
    "reorderSuggested": "Réapprovisionnement suggéré"
  },
  "metrics": {
    "itemsTracked": "Articles Suivis par Jour",
    "uptime": "Disponibilité SLA",
    "businesses": "Commerces Clients",
    "fasterCounts": "Inventaires Plus Rapides"
  },
  "features": {
    "badge": "Capacités de la Plateforme",
    "headline": "Tout ce dont votre commerce a besoin.",
    "headlineSub": "Rien de superflu.",
    "subheading": "Conçu spécifiquement pour les commerçants multi-sites — pas adapté d'un modèle SaaS générique.",
    "multiLocationTitle": "Inventaire Multi-Sites",
    "multiLocationDesc": "Suivez les niveaux de stock dans des magasins et entrepôts illimités en temps réel. Visibilité instantanée sur ce qui se trouve où — toujours.",
    "posTitle": "Point de Vente",
    "posDesc": "PDV ultra-rapide avec gestion de sessions, suivi de la caisse et méthodes de paiement multiples incluant le mobile money.",
    "analyticsTitle": "Analyse des Ventes",
    "analyticsDesc": "Rapports de revenus quotidiens, ventilations des marges brutes, classements des meilleures ventes et analyses de tendances — entièrement automatisés.",
    "purchaseTitle": "Bons de Commande",
    "purchaseDesc": "Cycle d'approvisionnement complet : créez des BC, suivez les approbations, réceptionnez les marchandises et mettez à jour le stock à la livraison.",
    "transfersTitle": "Transferts de Stock",
    "transfersDesc": "Déplacez les stocks entre sites avec des pistes d'audit complètes, des workflows d'approbation et un suivi des transits en temps réel.",
    "trackingTitle": "Suivi Série et Lot",
    "trackingDesc": "Traçabilité complète pour les articles de haute valeur ou à date d'expiration. Suivez chaque unité de la réception à la vente.",
    "supplierTitle": "Gestion des Fournisseurs",
    "supplierDesc": "Gérez les grands livres fournisseurs, les tarifs préférentiels, les délais de livraison et les conditions de crédit. Connaissez vos meilleures sources d'un coup d'œil.",
    "rolesTitle": "Accès par Rôles",
    "rolesDesc": "Permissions granulaires pour les rôles admin, responsable de magasin et caissier. Chaque utilisateur voit uniquement ce dont il a besoin."
  },
  "howItWorks": {
    "badge": "Comment Ça Marche",
    "headline": "Opérationnel en une après-midi.",
    "step1Title": "Configurez Votre Organisation",
    "step1Desc": "Ajoutez vos sites, définissez les rôles et importez votre catalogue produits. La plupart des entreprises sont opérationnelles en moins d'une heure.",
    "step2Title": "Connectez Vos Opérations",
    "step2Desc": "Reliez vos terminaux PDV, configurez les fournisseurs et définissez les niveaux de réapprovisionnement. Tout se synchronise automatiquement entre les sites.",
    "step3Title": "Gérez Plus Intelligemment",
    "step3Desc": "Recevez des rapports de ventes quotidiens, des alertes de stock faible et des informations sur les bénéfices automatiquement. Prenez des décisions basées sur les données, pas sur des suppositions."
  },
  "pricing": {
    "badge": "Tarification",
    "headline": "Tarification simple et transparente.",
    "subheading": "Pas de frais de mise en place. Pas de frais cachés. Annulez à tout moment.",
    "mostPopular": "Le Plus Populaire",
    "perMonth": "/mois",
    "starterName": "Démarrage",
    "starterDesc": "Parfait pour les commerçants mono-site qui débutent.",
    "starterF1": "1 site",
    "starterF2": "Jusqu'à 1 000 produits",
    "starterF3": "3 comptes utilisateurs",
    "starterF4": "PDV et gestion des stocks",
    "starterF5": "Rapports de ventes basiques",
    "starterF6": "Support par e-mail",
    "starterCta": "Commencer",
    "growthName": "Croissance",
    "growthDesc": "Pour les entreprises en expansion avec plusieurs magasins.",
    "growthF1": "Jusqu'à 5 sites",
    "growthF2": "Produits illimités",
    "growthF3": "15 comptes utilisateurs",
    "growthF4": "PDV complet + bons de commande",
    "growthF5": "Analyses et rapports avancés",
    "growthF6": "Transferts de stock entre sites",
    "growthF7": "Suivi série et lot",
    "growthF8": "Support prioritaire",
    "growthCta": "Démarrer l'Essai Gratuit",
    "enterpriseName": "Entreprise",
    "enterpriseDesc": "Adapté aux chaînes de vente au détail et aux opérations de franchise.",
    "enterpriseF1": "Sites illimités",
    "enterpriseF2": "Utilisateurs illimités",
    "enterpriseF3": "Rôles et permissions personnalisés",
    "enterpriseF4": "Option marque blanche",
    "enterpriseF5": "Intégration dédiée",
    "enterpriseF6": "Garantie de disponibilité avec SLA",
    "enterpriseF7": "Accès API",
    "enterpriseF8": "Support téléphonique 24/7",
    "enterpriseCta": "Contacter les Ventes"
  },
  "faq": {
    "badge": "FAQ",
    "headline": "Des questions ? Des réponses.",
    "q1": "Combien de temps dure l'intégration ?",
    "a1": "La plupart des entreprises sont pleinement opérationnelles en une seule après-midi. Importez votre catalogue produits via CSV, ajoutez vos sites et utilisateurs, configurez vos terminaux PDV et vous êtes prêt. Notre liste de contrôle d'intégration vous guide à chaque étape.",
    "q2": "Puis-je migrer depuis des feuilles de calcul ou un autre système ?",
    "a2": "Oui. StockFlow prend en charge l'importation CSV pour les produits, les fournisseurs, les clients et les niveaux de stock d'ouverture. Pour les migrations plus importantes ou les formats de données personnalisés, notre équipe d'intégration gère le transfert complet sans frais supplémentaires sur les plans Croissance et Entreprise.",
    "q3": "Fonctionne-t-il dans plusieurs magasins ?",
    "a3": "Le multi-sites est une fonctionnalité de base, pas un module complémentaire. Vous pouvez suivre le stock par site, transférer des stocks entre magasins, exécuter des rapports spécifiques à chaque site et gérer les sessions PDV de chaque magasin indépendamment — le tout depuis un seul tableau de bord.",
    "q4": "Quels modes de paiement le PDV prend-il en charge ?",
    "a4": "Espèces, carte, mobile money (MTN MoMo, Orange Money et autres), virement bancaire, avoir en magasin et paiements fractionnés. Le PDV gère la réconciliation du tiroir-caisse et génère un rapport de session complet à la clôture.",
    "q5": "Mes données sont-elles sécurisées ?",
    "a5": "Toutes les données sont chiffrées en transit (TLS 1.3) et au repos. L'accès est strictement limité par organisation — aucune donnée ne fuit entre locataires. Nous maintenons des journaux d'audit pour chaque action sensible. Les plans Entreprise incluent la documentation de conformité SOC 2.",
    "q6": "Puis-je définir des permissions différentes pour différents employés ?",
    "a6": "Oui. StockFlow dispose de trois rôles intégrés (Admin, Responsable de Magasin, Caissier) et les plans Entreprise prennent en charge des rôles entièrement personnalisés. Chaque rôle peut être restreint à des sites, modules et actions spécifiques.",
    "q7": "Prend-il en charge plusieurs langues et devises ?",
    "a7": "StockFlow est bilingue (anglais + français) dans toute l'interface et prend en charge n'importe quelle devise avec des taux de taxe configurables. Parfait pour les entreprises opérant sur différents marchés.",
    "q8": "Que se passe-t-il si je dois annuler ?",
    "a8": "Annulez à tout moment depuis les paramètres de votre compte — sans pénalités ni engagement. Vous pouvez exporter toutes vos données dans des formats standard avant de partir. Nous proposons également un essai gratuit de 14 jours sur tous les plans payants, sans carte de crédit requise."
  },
  "cta": {
    "badge": "Commencez Aujourd'hui — Gratuit 14 Jours",
    "headline1": "Arrêtez de gérer vos stocks",
    "headline2": "avec des tableurs.",
    "subheading": "Rejoignez des centaines de commerçants qui ont remplacé leurs processus manuels par StockFlow. Aucune carte de crédit requise pour commencer.",
    "ctaPrimary": "Créer Votre Compte Gratuit",
    "ctaSecondary": "Voir en Action"
  }
}
```

- [ ] **Step 3: Verify JSON validity**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('en.json valid')"` from the project root.  
Run: `node -e "JSON.parse(require('fs').readFileSync('messages/fr.json','utf8')); console.log('fr.json valid')"`.  
Expected: both print `valid`.

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/fr.json
git commit -m "i18n: add landing namespace + extend nav keys in en/fr"
```

---

## Task 2: Fix `site-header.tsx` — add LocaleSwitcher, locale-aware Link, translated nav

**Files:**
- Modify: `components/frontend/site-header.tsx`

- [ ] **Step 1: Replace the file with the translated version**

```tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Menu,
  Layers,
  BarChart3,
  ShoppingCart,
  Truck,
  ArrowLeftRight,
  ScanBarcode,
  Users2,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Logo from "../global/Logo";
import { LocaleSwitcher } from "@/components/global/LocaleSwitcher";
import { Session } from "next-auth";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getInitials } from "@/lib/generateInitials";
import { useTranslations } from "next-intl";

export default function SiteHeader({ session }: { session: Session | null }) {
  const t = useTranslations("landing.nav");
  const [open, setOpen] = React.useState(false);
  const [showFeatures, setShowFeatures] = React.useState(false);

  const features = [
    {
      icon: Layers,
      title: "Multi-Location Inventory",
      description: "Track stock across unlimited stores and warehouses in real time.",
      href: "/#features",
    },
    {
      icon: ShoppingCart,
      title: "Point of Sale",
      description: "Fast POS with session management, cash drawers, and multi-payment support.",
      href: "/#features",
    },
    {
      icon: BarChart3,
      title: "Sales Analytics",
      description: "Daily revenue reports, gross margins, and bestseller rankings.",
      href: "/#features",
    },
    {
      icon: Truck,
      title: "Purchase Orders",
      description: "Full procurement lifecycle from PO creation to goods receipt.",
      href: "/#features",
    },
    {
      icon: ArrowLeftRight,
      title: "Stock Transfers",
      description: "Move inventory between locations with full audit trails.",
      href: "/#features",
    },
    {
      icon: ScanBarcode,
      title: "Serial & Batch Tracking",
      description: "Full traceability for high-value or expiry-sensitive products.",
      href: "/#features",
    },
    {
      icon: Receipt,
      title: "Supplier Management",
      description: "Manage supplier ledgers, pricing, lead times, and credit terms.",
      href: "/#features",
    },
    {
      icon: Users2,
      title: "Role-Based Access",
      description: "Granular permissions across admin, manager, and cashier roles.",
      href: "/#features",
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#1E293B] bg-[#04080F]/90 backdrop-blur supports-[backdrop-filter]:bg-[#04080F]/80">
      <div className="container max-w-7xl mx-auto flex h-14 items-center justify-between">
        <div className="flex items-center space-x-4">
          <Logo />
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link href="/" legacyBehavior passHref>
                  <NavigationMenuLink className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50">
                    {t("home")}
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger>{t("features")}</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[800px] p-4">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b">
                      <h4 className="text-lg font-medium">{t("features")}</h4>
                      <Link href="/features" className="text-sm text-blue-500 hover:underline">
                        {t("viewAll")}
                      </Link>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      {features.map((feature, index) => (
                        <Link
                          key={index}
                          href={`/feature/${feature.title.toLowerCase().replace(/\s+/g, "-")}`}
                          className="block group"
                        >
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-muted rounded-md group-hover:bg-muted/80">
                              <feature.icon className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                              <h5 className="font-medium mb-1 group-hover:text-blue-500">
                                {feature.title}
                              </h5>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {feature.description}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <div className="mt-6 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium mb-1">{t("getStarted")}</h4>
                          <p className="text-sm text-muted-foreground">{t("trialNote")}</p>
                        </div>
                        <Button asChild variant="secondary">
                          <Link href="/register">{t("startFreeTrial")}</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link href="/#pricing" legacyBehavior passHref>
                  <NavigationMenuLink className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50">
                    {t("pricing")}
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex items-center gap-2">
          <LocaleSwitcher />

          {session ? (
            <Button asChild variant="ghost">
              <Link href="/dashboard">
                <Avatar>
                  <AvatarImage src={session?.user?.image ?? ""} alt={session?.user?.name ?? ""} />
                  <AvatarFallback>{getInitials(session?.user?.name)}</AvatarFallback>
                </Avatar>
                <span className="ms-3">Dashboard</span>
              </Link>
            </Button>
          ) : (
            <div className="hidden md:flex items-center gap-3">
              <Button asChild variant="ghost" className="text-[#94A3B8] hover:text-[#F1F5F9]">
                <Link href="/auth/login">{t("login")}</Link>
              </Button>
              <Button asChild className="bg-[#00D4A4] text-[#04080F] hover:bg-[#00E8B5] rounded-full font-semibold">
                <Link href="/register">{t("startFreeTrial")}</Link>
              </Button>
            </div>
          )}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full p-0">
            <SheetHeader className="border-b p-4">
              <SheetTitle className="text-start">Navigation</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col py-4">
              <Link
                href="/"
                className="px-4 py-2 text-lg font-medium hover:bg-accent"
                onClick={() => setOpen(false)}
              >
                {t("home")}
              </Link>
              <button
                className="flex items-center justify-between px-4 py-2 text-lg font-medium hover:bg-accent text-start"
                onClick={() => setShowFeatures(!showFeatures)}
              >
                {t("features")}
                <ChevronDown className={cn("h-5 w-5 transition-transform", showFeatures && "rotate-180")} />
              </button>
              {showFeatures && (
                <div className="px-4 py-2 space-y-4">
                  {features.map((feature, index) => (
                    <Link
                      key={index}
                      href={`/feature/${feature.title.toLowerCase().replace(/\s+/g, "-")}`}
                      className="flex items-start gap-4 py-2"
                      onClick={() => setOpen(false)}
                    >
                      <div className="p-2 bg-muted rounded-md">
                        <feature.icon className="h-6 w-6 text-blue-500" />
                      </div>
                      <div>
                        <h5 className="font-medium mb-1">{feature.title}</h5>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              <Link
                href="/#pricing"
                className="px-4 py-2 text-lg font-medium hover:bg-accent"
                onClick={() => setOpen(false)}
              >
                {t("pricing")}
              </Link>
              <Link
                href="/how-it-works"
                className="px-4 py-2 text-lg font-medium hover:bg-accent"
                onClick={() => setOpen(false)}
              >
                {t("howItWorks")}
              </Link>
            </div>
            <div className="absolute bottom-0 start-0 end-0 p-4 border-t bg-background">
              <div className="grid gap-2">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/auth/login" onClick={() => setOpen(false)}>{t("login")}</Link>
                </Button>
                <Button className="w-full" asChild>
                  <Link href="/register" onClick={() => setOpen(false)}>{t("startFreeTrial")}</Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/frontend/site-header.tsx
git commit -m "feat(i18n): add LocaleSwitcher + translations to site-header"
```

---

## Task 3: Wire `stockflow-hero.tsx`

**Files:**
- Modify: `components/frontend/stockflow-hero.tsx`

- [ ] **Step 1: Add `useTranslations` and replace all hardcoded strings**

Replace the top of the file (imports + constants) and the JSX strings:

```tsx
"use client";
import { motion } from "framer-motion";
import { ArrowRight, Play, ShieldCheck, Zap, Globe } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { BorderBeam } from "@/components/magicui/border-beam";
import { useTranslations } from "next-intl";

export default function StockFlowHero() {
  const t = useTranslations("landing.hero");

  const trustBadges = [
    { icon: ShieldCheck, label: t("badge1") },
    { icon: Zap, label: t("badge2") },
    { icon: Globe, label: t("badge3") },
  ];

  return (
    <section className="relative min-h-screen bg-[#04080F] overflow-hidden flex flex-col justify-center">
      {/* Ambient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full bg-[#00D4A4]/8 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] rounded-full bg-[#3B82F6]/6 blur-[100px]" />
        <div className="absolute top-[30%] right-[25%] w-[300px] h-[300px] rounded-full bg-[#00D4A4]/5 blur-[80px]" />
      </div>

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: "radial-gradient(circle, #94A3B8 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, black 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, black 40%, transparent 100%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-24 pb-16">
        {/* Pill */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#00D4A4]/30 bg-[#00D4A4]/8 text-[#00D4A4] text-sm font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D4A4] animate-pulse" />
            {t("pill")}
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center max-w-5xl mx-auto"
        >
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-[#F1F5F9] leading-[1.05] mb-6">
            {t("headline1")}
            <br />
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-[#00D4A4] via-[#34D399] to-[#00B4D8] bg-clip-text text-transparent">
                {t("headline2")}
              </span>
              <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-gradient-to-r from-[#00D4A4]/0 via-[#00D4A4]/60 to-[#00D4A4]/0 rounded-full" />
            </span>
          </h1>

          <p className="text-lg md:text-xl text-[#94A3B8] max-w-2xl mx-auto leading-relaxed mb-10">
            {t("subheading")}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-14">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#00D4A4] text-[#04080F] font-semibold text-base hover:bg-[#00E8B5] transition-all duration-200 shadow-[0_0_40px_rgba(0,212,164,0.25)] hover:shadow-[0_0_60px_rgba(0,212,164,0.4)]"
            >
              {t("ctaPrimary")}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/#demo"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-[#1E293B] text-[#CBD5E1] font-medium text-base hover:border-[#334155] hover:text-[#F1F5F9] transition-all duration-200"
            >
              <Play className="w-4 h-4 fill-current" />
              {t("ctaSecondary")}
            </Link>
          </div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap justify-center items-center gap-8 mb-16"
          >
            {trustBadges.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-[#64748B] text-sm">
                <Icon className="w-4 h-4 text-[#00D4A4]" />
                <span>{label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative max-w-5xl mx-auto"
        >
          <div className="absolute inset-x-[10%] -top-8 h-24 bg-[#00D4A4]/10 blur-2xl rounded-full" />

          <div className="relative rounded-2xl overflow-hidden border border-[#1E293B] shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
            <BorderBeam size={300} duration={10} colorFrom="#00D4A4" colorTo="#3B82F6" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#04080F]/40 via-transparent to-transparent z-10 pointer-events-none" />
            <Image
              src="/images/dash-2.webp"
              alt="StockFlow Dashboard"
              width={1775}
              height={1109}
              className="w-full h-auto"
              priority
            />
          </div>

          {/* Floating stat cards */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            className="absolute -left-4 top-8 hidden lg:block bg-[#0D1F2D] border border-[#1E3A4A] rounded-xl p-3 shadow-xl backdrop-blur-sm"
          >
            <p className="text-[#94A3B8] text-xs mb-0.5">{t("todayRevenue")}</p>
            <p className="text-[#00D4A4] text-xl font-bold">$24,380</p>
            <p className="text-[#34D399] text-xs">{t("vsYesterday")}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 }}
            className="absolute -right-4 top-16 hidden lg:block bg-[#0D1F2D] border border-[#1E3A4A] rounded-xl p-3 shadow-xl backdrop-blur-sm"
          >
            <p className="text-[#94A3B8] text-xs mb-0.5">{t("lowStockAlerts")}</p>
            <p className="text-[#F59E0B] text-xl font-bold">{t("lowStockCount")}</p>
            <p className="text-[#94A3B8] text-xs">{t("reorderSuggested")}</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/frontend/stockflow-hero.tsx
git commit -m "feat(i18n): translate hero section"
```

---

## Task 4: Wire `metrics-bar.tsx`

**Files:**
- Modify: `components/frontend/metrics-bar.tsx`

- [ ] **Step 1: Replace file with translated version**

The `metrics` array must be built inside the component (after `useTranslations` is called), not at module scope.

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useTranslations } from "next-intl";

function CountUp({ to, decimals = 0, suffix = "" }: { to: number; decimals?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const duration = 1800;
    const start = performance.now();
    const frame = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(parseFloat((ease * to).toFixed(decimals)));
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [inView, to, decimals]);

  return (
    <span ref={ref}>
      {decimals > 0 ? count.toFixed(decimals) : Math.floor(count).toLocaleString()}
      {suffix}
    </span>
  );
}

export default function MetricsBar() {
  const t = useTranslations("landing.metrics");
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  const metrics = [
    { value: 50000, suffix: "+", label: t("itemsTracked") },
    { value: 99.9, decimals: 1, suffix: "%", label: t("uptime") },
    { value: 200, suffix: "+", label: t("businesses") },
    { value: 12, suffix: "x", label: t("fasterCounts") },
  ];

  return (
    <section ref={ref} className="bg-[#080F1A] border-y border-[#1E293B]">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="text-center"
            >
              <p className="text-3xl md:text-4xl font-black text-[#00D4A4] mb-1">
                <CountUp to={m.value} decimals={m.decimals} suffix={m.suffix} />
              </p>
              <p className="text-sm text-[#64748B] font-medium">{m.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/frontend/metrics-bar.tsx
git commit -m "feat(i18n): translate metrics bar"
```

---

## Task 5: Wire `stockflow-features.tsx`

**Files:**
- Modify: `components/frontend/stockflow-features.tsx`

- [ ] **Step 1: Replace the file**

Move the `features` array inside the component and use `useTranslations("landing.features")`.

```tsx
"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Layers, BarChart3, ShoppingCart, Truck,
  ArrowLeftRight, ScanBarcode, Receipt, Users2,
} from "lucide-react";
import { useTranslations } from "next-intl";

export default function StockFlowFeatures() {
  const t = useTranslations("landing.features");
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  const features = [
    { icon: Layers,        title: t("multiLocationTitle"), description: t("multiLocationDesc"), accent: "#00D4A4", size: "large" },
    { icon: ShoppingCart,  title: t("posTitle"),           description: t("posDesc"),           accent: "#3B82F6", size: "normal" },
    { icon: BarChart3,     title: t("analyticsTitle"),     description: t("analyticsDesc"),     accent: "#8B5CF6", size: "normal" },
    { icon: Truck,         title: t("purchaseTitle"),      description: t("purchaseDesc"),      accent: "#F59E0B", size: "normal" },
    { icon: ArrowLeftRight,title: t("transfersTitle"),     description: t("transfersDesc"),     accent: "#EC4899", size: "normal" },
    { icon: ScanBarcode,   title: t("trackingTitle"),      description: t("trackingDesc"),      accent: "#10B981", size: "normal" },
    { icon: Receipt,       title: t("supplierTitle"),      description: t("supplierDesc"),      accent: "#06B6D4", size: "normal" },
    { icon: Users2,        title: t("rolesTitle"),         description: t("rolesDesc"),         accent: "#F97316", size: "normal" },
  ];

  return (
    <section ref={ref} className="bg-[#06090F] py-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-3 py-1 rounded-full border border-[#00D4A4]/30 text-[#00D4A4] text-xs font-semibold tracking-widest uppercase mb-4">
            {t("badge")}
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-[#F1F5F9] tracking-tight mb-4">
            {t("headline")}
            <br />
            <span className="text-[#475569]">{t("headlineSub")}</span>
          </h2>
          <p className="text-[#64748B] text-lg max-w-xl mx-auto">
            {t("subheading")}
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Large featured card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2 group relative bg-[#0D1526] border border-[#1E293B] rounded-2xl p-8 overflow-hidden hover:border-[#00D4A4]/40 transition-colors duration-300"
          >
            <div
              className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-500"
              style={{ background: features[0].accent }}
            />
            <div
              className="inline-flex p-3 rounded-xl mb-5"
              style={{ background: `${features[0].accent}15`, border: `1px solid ${features[0].accent}30` }}
            >
              <Layers className="w-6 h-6" style={{ color: features[0].accent }} />
            </div>
            <h3 className="text-2xl font-bold text-[#F1F5F9] mb-3">{features[0].title}</h3>
            <p className="text-[#64748B] text-base leading-relaxed max-w-md">{features[0].description}</p>
            <div className="mt-6 flex items-end gap-2 h-12">
              {[65, 42, 88, 31, 74, 55, 92, 48, 67, 80].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm transition-all duration-300"
                  style={{ height: `${h}%`, background: `${features[0].accent}${i % 3 === 0 ? "60" : "30"}` }}
                />
              ))}
            </div>
          </motion.div>

          {/* Regular cards */}
          {features.slice(1).map((feat, i) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.07 }}
                className="group relative bg-[#0D1526] border border-[#1E293B] rounded-2xl p-6 overflow-hidden hover:border-[#1E3A5F] transition-colors duration-300"
              >
                <div
                  className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500"
                  style={{ background: feat.accent }}
                />
                <div
                  className="inline-flex p-2.5 rounded-lg mb-4"
                  style={{ background: `${feat.accent}15`, border: `1px solid ${feat.accent}25` }}
                >
                  <Icon className="w-5 h-5" style={{ color: feat.accent }} />
                </div>
                <h3 className="text-lg font-bold text-[#E2E8F0] mb-2">{feat.title}</h3>
                <p className="text-[#64748B] text-sm leading-relaxed">{feat.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/frontend/stockflow-features.tsx
git commit -m "feat(i18n): translate features section"
```

---

## Task 6: Wire `how-it-works.tsx`

**Files:**
- Modify: `components/frontend/how-it-works.tsx`

- [ ] **Step 1: Replace the file**

```tsx
"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Building2, Plug, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

export default function HowItWorks() {
  const t = useTranslations("landing.howItWorks");
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const steps = [
    { number: "01", icon: Building2, title: t("step1Title"), description: t("step1Desc"), accent: "#00D4A4" },
    { number: "02", icon: Plug,       title: t("step2Title"), description: t("step2Desc"), accent: "#3B82F6" },
    { number: "03", icon: TrendingUp, title: t("step3Title"), description: t("step3Desc"), accent: "#8B5CF6" },
  ];

  return (
    <section ref={ref} className="bg-[#04080F] py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <span className="inline-block px-3 py-1 rounded-full border border-[#3B82F6]/30 text-[#3B82F6] text-xs font-semibold tracking-widest uppercase mb-4">
            {t("badge")}
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-[#F1F5F9] tracking-tight">
            {t("headline")}
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 relative">
          <div className="hidden md:block absolute top-10 left-[22%] right-[22%] h-px bg-gradient-to-r from-[#00D4A4]/30 via-[#3B82F6]/30 to-[#8B5CF6]/30" />
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="relative bg-[#0D1526] border border-[#1E293B] rounded-2xl p-7"
              >
                <div
                  className="text-5xl font-black mb-5 leading-none"
                  style={{ color: `${step.accent}20` }}
                >
                  {step.number}
                </div>
                <div
                  className="inline-flex p-2.5 rounded-lg mb-4"
                  style={{ background: `${step.accent}15`, border: `1px solid ${step.accent}25` }}
                >
                  <Icon className="w-5 h-5" style={{ color: step.accent }} />
                </div>
                <h3 className="text-lg font-bold text-[#E2E8F0] mb-3">{step.title}</h3>
                <p className="text-[#64748B] text-sm leading-relaxed">{step.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/frontend/how-it-works.tsx
git commit -m "feat(i18n): translate how-it-works section"
```

---

## Task 7: Wire `stockflow-pricing.tsx`

**Files:**
- Modify: `components/frontend/stockflow-pricing.tsx`

- [ ] **Step 1: Replace the file**

```tsx
"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Check, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function StockFlowPricing() {
  const t = useTranslations("landing.pricing");
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const plans = [
    {
      name: t("starterName"),
      price: "49",
      period: t("perMonth"),
      description: t("starterDesc"),
      features: [t("starterF1"), t("starterF2"), t("starterF3"), t("starterF4"), t("starterF5"), t("starterF6")],
      cta: t("starterCta"),
      href: "/register",
      accent: "#3B82F6",
      featured: false,
    },
    {
      name: t("growthName"),
      price: "149",
      period: t("perMonth"),
      description: t("growthDesc"),
      features: [t("growthF1"), t("growthF2"), t("growthF3"), t("growthF4"), t("growthF5"), t("growthF6"), t("growthF7"), t("growthF8")],
      cta: t("growthCta"),
      href: "/register",
      accent: "#00D4A4",
      featured: true,
    },
    {
      name: t("enterpriseName"),
      price: "Custom",
      period: "",
      description: t("enterpriseDesc"),
      features: [t("enterpriseF1"), t("enterpriseF2"), t("enterpriseF3"), t("enterpriseF4"), t("enterpriseF5"), t("enterpriseF6"), t("enterpriseF7"), t("enterpriseF8")],
      cta: t("enterpriseCta"),
      href: "mailto:sales@stockflow.com",
      accent: "#8B5CF6",
      featured: false,
    },
  ];

  return (
    <section id="pricing" ref={ref} className="bg-[#06090F] py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <span className="inline-block px-3 py-1 rounded-full border border-[#00D4A4]/30 text-[#00D4A4] text-xs font-semibold tracking-widest uppercase mb-4">
            {t("badge")}
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-[#F1F5F9] tracking-tight mb-4">
            {t("headline")}
          </h2>
          <p className="text-[#64748B] text-lg">{t("subheading")}</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={`relative flex flex-col rounded-2xl p-8 border transition-all duration-300 ${
                plan.featured
                  ? "bg-[#0A1F18] border-[#00D4A4]/40 shadow-[0_0_60px_rgba(0,212,164,0.1)]"
                  : "bg-[#0D1526] border-[#1E293B]"
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-[#04080F] bg-[#00D4A4]">
                  {t("mostPopular")}
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-[#E2E8F0] mb-1">{plan.name}</h3>
                <p className="text-[#64748B] text-sm mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  {plan.price !== "Custom" && <span className="text-[#94A3B8] text-lg">$</span>}
                  <span className="text-5xl font-black" style={{ color: plan.featured ? plan.accent : "#F1F5F9" }}>
                    {plan.price}
                  </span>
                  {plan.period && <span className="text-[#64748B] text-sm">{plan.period}</span>}
                </div>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-[#94A3B8]">
                    <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: plan.accent }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={`inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  plan.featured
                    ? "bg-[#00D4A4] text-[#04080F] hover:bg-[#00E8B5] shadow-[0_0_30px_rgba(0,212,164,0.2)]"
                    : "border border-[#334155] text-[#CBD5E1] hover:border-[#475569] hover:text-white"
                }`}
              >
                {plan.cta}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/frontend/stockflow-pricing.tsx
git commit -m "feat(i18n): translate pricing section"
```

---

## Task 8: Wire `stockflow-faq.tsx`

**Files:**
- Modify: `components/frontend/stockflow-faq.tsx`

- [ ] **Step 1: Replace the file**

```tsx
"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { useTranslations } from "next-intl";

export default function StockFlowFAQ() {
  const t = useTranslations("landing.faq");
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const faqs = [
    { q: t("q1"), a: t("a1") },
    { q: t("q2"), a: t("a2") },
    { q: t("q3"), a: t("a3") },
    { q: t("q4"), a: t("a4") },
    { q: t("q5"), a: t("a5") },
    { q: t("q6"), a: t("a6") },
    { q: t("q7"), a: t("a7") },
    { q: t("q8"), a: t("a8") },
  ];

  return (
    <section ref={ref} className="bg-[#04080F] py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-14"
        >
          <span className="inline-block px-3 py-1 rounded-full border border-[#00D4A4]/30 text-[#00D4A4] text-xs font-semibold tracking-widest uppercase mb-4">
            {t("badge")}
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-[#F1F5F9] tracking-tight">
            {t("headline")}
          </h2>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className={`rounded-xl border overflow-hidden transition-colors duration-200 ${
                open === i ? "border-[#00D4A4]/40 bg-[#0A1F18]" : "border-[#1E293B] bg-[#0D1526]"
              }`}
            >
              <button
                className="w-full flex items-center justify-between gap-4 p-5 text-left"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="font-semibold text-[#E2E8F0] text-base">{faq.q}</span>
                {open === i ? (
                  <Minus className="w-4 h-4 text-[#00D4A4] shrink-0" />
                ) : (
                  <Plus className="w-4 h-4 text-[#475569] shrink-0" />
                )}
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <p className="px-5 pb-5 text-[#64748B] text-sm leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/frontend/stockflow-faq.tsx
git commit -m "feat(i18n): translate FAQ section"
```

---

## Task 9: Wire `stockflow-cta.tsx`

**Files:**
- Modify: `components/frontend/stockflow-cta.tsx`

- [ ] **Step 1: Replace the file**

```tsx
"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function StockFlowCTA() {
  const t = useTranslations("landing.cta");
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="bg-[#06090F] py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#0A1F18] via-[#0D1A2A] to-[#0A0F1A] border border-[#00D4A4]/25 p-12 md:p-16 text-center"
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-30%] left-[20%] w-96 h-96 rounded-full bg-[#00D4A4]/10 blur-3xl" />
            <div className="absolute bottom-[-20%] right-[15%] w-64 h-64 rounded-full bg-[#3B82F6]/8 blur-2xl" />
          </div>

          <div className="relative z-10">
            <span className="inline-block px-3 py-1 rounded-full border border-[#00D4A4]/40 text-[#00D4A4] text-xs font-semibold tracking-widest uppercase mb-6">
              {t("badge")}
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#F1F5F9] tracking-tight mb-5 leading-tight">
              {t("headline1")}
              <br />
              <span className="text-[#00D4A4]">{t("headline2")}</span>
            </h2>
            <p className="text-[#64748B] text-lg mb-10 max-w-xl mx-auto">
              {t("subheading")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#00D4A4] text-[#04080F] font-bold text-base hover:bg-[#00E8B5] transition-all duration-200 shadow-[0_0_40px_rgba(0,212,164,0.3)] hover:shadow-[0_0_60px_rgba(0,212,164,0.5)]"
              >
                {t("ctaPrimary")}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/#demo"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-[#1E293B] text-[#94A3B8] font-medium text-base hover:border-[#334155] hover:text-[#F1F5F9] transition-all duration-200"
              >
                {t("ctaSecondary")}
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/frontend/stockflow-cta.tsx
git commit -m "feat(i18n): translate CTA section"
```

---

## Task 10: Update `config/sidebar.ts` — titles become translation keys

**Files:**
- Modify: `config/sidebar.ts`

The `title` field in every `ISidebarLink` and `MenuItem` will hold the camelCase key from the `nav` namespace (e.g. `"dashboard"` → `t("dashboard")` in Sidebar). This is a safe rename because Sidebar and Navbar are the only consumers.

- [ ] **Step 1: Replace the file**

```ts
import {
  BaggageClaim, BarChart2, BarChart4, Book,
  CircleDollarSign, Home, LucideIcon, Settings,
  ShoppingCart, Users
} from "lucide-react";

export interface ISidebarLink {
  title: string;
  href?: string;
  icon: LucideIcon;
  dropdown: boolean;
  permission: string;
  dropdownMenu?: MenuItem[];
}

type MenuItem = {
  title: string;
  href: string;
  permission: string;
};

export const sidebarLinks: ISidebarLink[] = [
  {
    title: "dashboard",
    href: "/dashboard",
    icon: Home,
    dropdown: false,
    permission: "dashboard.read",
  },
  {
    title: "users",
    icon: Users,
    href: "/dashboard/users",
    dropdown: true,
    permission: "users.read",
    dropdownMenu: [
      { title: "users",          href: "/dashboard/users",               permission: "users.read" },
      { title: "roles",          href: "/dashboard/settings/roles",       permission: "roles.read" },
      { title: "changePassword", href: "/dashboard/change-password",      permission: "roles.read" },
      { title: "profile",        href: "/dashboard/profile",              permission: "roles.read" },
    ],
  },
  {
    title: "inventory",
    icon: BaggageClaim,
    dropdown: true,
    href: "/dashboard/inventory/items",
    permission: "inventory.read",
    dropdownMenu: [
      { title: "items",             href: "/dashboard/inventory/items",               permission: "items.read" },
      { title: "categories",        href: "/dashboard/inventory/categories",          permission: "categories.read" },
      { title: "brands",            href: "/dashboard/inventory/brands",              permission: "brands.read" },
      { title: "units",             href: "/dashboard/inventory/units",               permission: "units.read" },
      { title: "currentStock",      href: "/dashboard/inventory/stock",               permission: "stock.read" },
      { title: "lowStockItems",     href: "/dashboard/inventory/stock/low-stock",     permission: "stock.read" },
      { title: "serialNumbers",     href: "/dashboard/inventory/serial.numbers",      permission: "serial.numbers.read" },
      { title: "stockTransfers",    href: "/dashboard/inventory/transfers",           permission: "transfers.read" },
      { title: "createTransfers",   href: "/dashboard/inventory/transfers.create",    permission: "transfers.create" },
      { title: "stockAdjustments",  href: "/dashboard/inventory/adjustments",         permission: "adjustments.read" },
      { title: "createAdjustments", href: "/dashboard/inventory/adjustments/create",  permission: "adjustments.create" },
    ],
  },
  {
    title: "sales",
    icon: CircleDollarSign,
    dropdown: true,
    href: "/dashboard/sales",
    permission: "sales.read",
    dropdownMenu: [
      { title: "sales",       href: "/dashboard/sales",          permission: "sales.read" },
      { title: "salesOrders", href: "/dashboard/sales/orders",   permission: "sales.orders.read" },
      { title: "returns",     href: "/dashboard/returns",        permission: "returns.read" },
      { title: "customers",   href: "/dashboard/sales/customers",permission: "customers.read" },
      { title: "pos",         href: "/dashboard/pos",            permission: "pos.read" },
    ],
  },
  {
    title: "purchases",
    icon: ShoppingCart,
    dropdown: true,
    href: "/dashboard/purchase-orders",
    permission: "purchase.orders.read",
    dropdownMenu: [
      { title: "purchaseOrders", href: "/dashboard/purchase-orders",            permission: "purchase.orders.read" },
      { title: "goodsReceipts",  href: "/dashboard/purchases/goods.receipts",   permission: "goods.receipts.read" },
      { title: "suppliers",      href: "/dashboard/purchases/suppliers",         permission: "suppliers.read" },
      { title: "supplierItems",  href: "/dashboard/purchases/supplierItems",     permission: "suppliers.read" },
    ],
  },
  {
    title: "settings",
    href: "/dashboard/settings",
    icon: Settings,
    dropdown: true,
    permission: "settings.read",
    dropdownMenu: [
      { title: "locations",          href: "/dashboard/settings/locations",       permission: "locations.read" },
      { title: "taxRates",           href: "/dashboard/settings/tax-rates",       permission: "tax.rates.read" },
      { title: "rolesAndPermissions",href: "/dashboard/settings/roles",           permission: "roles.read" },
      { title: "usersAndInvites",    href: "/dashboard/settings/users",           permission: "users.read" },
      { title: "profile",            href: "/dashboard/settings/profile",         permission: "profile.read" },
      { title: "companySettings",    href: "/dashboard/settings/company",         permission: "company.read" },
      { title: "changePassword",     href: "/dashboard/settings/change-password", permission: "password.read" },
    ],
  },
  {
    title: "orders",
    href: "/dashboard/orders",
    icon: BarChart2,
    dropdown: false,
    permission: "orders.read",
  },
  {
    title: "reports",
    icon: BarChart4,
    dropdown: true,
    href: "/dashboard/reports/products",
    permission: "reports.read",
    dropdownMenu: [
      { title: "productReport",   href: "/dashboard/reports/products",   permission: "reports.read" },
      { title: "inventoryReport", href: "/dashboard/reports/inventory",  permission: "reports.read" },
      { title: "customersReport", href: "/dashboard/reports/customers",  permission: "reports.read" },
    ],
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add config/sidebar.ts
git commit -m "refactor(sidebar): use nav translation keys as titles"
```

---

## Task 11: Wire `Sidebar.tsx` and `Navbar.tsx` to translate nav labels

**Files:**
- Modify: `components/dashboard/Sidebar.tsx`
- Modify: `components/dashboard/Navbar.tsx`

- [ ] **Step 1: Add `useTranslations` to `Sidebar.tsx`**

Add the import at the top and a `t` call, then replace every `item.title` and `menuItem.title` render with `t(item.title)` / `t(menuItem.title)`. Also translate the "Live Website" link.

In `components/dashboard/Sidebar.tsx`:

Add import:
```tsx
import { useTranslations } from "next-intl";
```

Inside the `Sidebar` component body, add:
```tsx
const t = useTranslations("nav");
```

Replace:
```tsx
{item.title}
```
with:
```tsx
{t(item.title)}
```
(there are two occurrences — the `CollapsibleTrigger` and the non-dropdown `Link`)

Replace:
```tsx
{menuItem.title}
```
with:
```tsx
{t(menuItem.title)}
```

Replace the "Live Website" link text:
```tsx
Live Website
```
with:
```tsx
{t("liveWebsite")}
```

- [ ] **Step 2: Add `useTranslations` to `Navbar.tsx` for the logout button**

In `components/dashboard/Navbar.tsx`, add:
```tsx
import { useTranslations } from "next-intl";
```

Inside `Navbar`, add:
```tsx
const t = useTranslations("nav");
```

Replace the hardcoded `"Logout"` text in the mobile sheet button:
```tsx
<Button onClick={handleLogout} size="sm" className="w-full">
  Logout
</Button>
```
with:
```tsx
<Button onClick={handleLogout} size="sm" className="w-full">
  {t("logout")}
</Button>
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/Sidebar.tsx components/dashboard/Navbar.tsx
git commit -m "feat(i18n): translate sidebar and navbar nav labels"
```

---

## Task 12: Wire `ModernBrandForm.tsx`

**Files:**
- Modify: `components/brands/ModernBrandForm.tsx`

- [ ] **Step 1: Add translations**

Add imports at the top of the component:
```tsx
import { useTranslations } from "next-intl";
```

Inside the component function, add:
```tsx
const tBrands = useTranslations("brands");
const tBi = useTranslations("bilingual");
const tCommon = useTranslations("common");
```

Replace the hardcoded label/heading strings using the existing message keys:
- `"Brand Management"` → `tBrands("title")`
- `"Create New Brand"` → `tBrands("createTitle")`
- `"Brand Name"` → `tBrands("name")`  
- `"Name (English)"` → `tBi("nameEn")`
- `"Name (French)"` → `tBi("nameFr")`
- `"Description (English)"` → `tBi("descriptionEn")`
- `"Description (French)"` → `tBi("descriptionFr")`
- `"Optional. Falls back to English if empty."` → `tBi("frenchOptional")`
- `"Save"` / `"Save Changes"` → `tCommon("save")` / `tCommon("saveChanges")`
- `"Cancel"` → `tCommon("cancel")`
- `"Preview"` → `tBrands("preview")`

- [ ] **Step 2: Commit**

```bash
git add components/brands/ModernBrandForm.tsx
git commit -m "feat(i18n): translate brand form"
```

---

## Task 13: Wire `CategoryFormForEditing.tsx` and `TaxRateFormForEditing.tsx`

**Files:**
- Modify: `components/dashboard/categories/CategoryFormForEditing.tsx`
- Modify: `components/dashboard/taxRates/TaxRateFormForEditing.tsx`

- [ ] **Step 1: Add translations to `CategoryFormForEditing.tsx`**

Add:
```tsx
import { useTranslations } from "next-intl";
```

Inside component:
```tsx
const tCat = useTranslations("categories");
const tBi = useTranslations("bilingual");
const tCommon = useTranslations("common");
```

Replace hardcoded strings with keys:
- `"Category Management"` → `tCat("title")`
- `"Create New Category"` / `"Edit Category"` → `tCat("createTitle")`
- `"Category Name"` → `tCat("name")`
- `"Name (English)"` → `tBi("nameEn")`
- `"Name (French)"` → `tBi("nameFr")`
- `"Optional…"` → `tBi("frenchOptional")`
- `"Save"` → `tCommon("save")`
- `"Cancel"` → `tCommon("cancel")`
- `"Common Categories"` → `tCat("commonCategories")`
- `"Preview"` → `tCat("preview")`

- [ ] **Step 2: Add translations to `TaxRateFormForEditing.tsx`**

Add:
```tsx
import { useTranslations } from "next-intl";
```

Inside component:
```tsx
const tTax = useTranslations("taxRates");
const tCommon = useTranslations("common");
```

Replace:
- `"Tax Rate Management"` → `tTax("title")`
- `"Create New Tax Rate"` → `tTax("createTitle")`
- `"Tax Rate Name"` → `tTax("name")`
- `"Rate (%)"` → `tTax("rate")`
- `"Percentage rate (0–100%)"` → `tTax("rateHint")`
- `"Common Tax Rates"` → `tTax("commonRates")`
- `"Preview"` → `tTax("preview")`
- `"Save"` → `tCommon("save")`
- `"Cancel"` → `tCommon("cancel")`

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/categories/CategoryFormForEditing.tsx components/dashboard/taxRates/TaxRateFormForEditing.tsx
git commit -m "feat(i18n): translate category and tax-rate forms"
```

---

## Verification

After all tasks are done, verify the full bilingual experience:

1. Open the app at `http://localhost:3000` — site header shows a globe `EN` / `FR` button.
2. Click the `FR` button — page reloads with French text throughout (hero, metrics, features, FAQ, etc.).
3. Navigate to `/dashboard` — sidebar labels are in French; clicking `EN` switches them back.
4. Open **Inventory → Categories** — form labels (`Catégorie`, `Nom (Anglais)`, etc.) appear in French.
5. Confirm `http://localhost:3000/fr` renders the FR locale via URL segment.
