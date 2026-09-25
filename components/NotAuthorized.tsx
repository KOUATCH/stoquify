// components/NotAuthorized.tsx
import { Link } from "@/i18n/navigation";
import { Home, LayoutDashboard, LockKeyhole, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SessionRecoverySignOutButton } from "@/components/dashboard/SessionRecoverySignOutButton";
import { selfSignOutCopy } from "@/lib/security/self-sign-out-copy";

const copy = {
  en: { eyebrow: "Protected workspace", title: "Access Not Available", message: "This page requires permissions that are not available in your current session.", next: "Permission required", help: "Ask your workspace administrator to review the permissions needed for this task. Your existing work has not been changed.", dashboard: "Dashboard", home: "Home" },
  fr: { eyebrow: "Espace protégé", title: "Accès indisponible", message: "Cette page nécessite des autorisations qui ne sont pas disponibles dans votre session actuelle.", next: "Autorisation requise", help: "Demandez à l’administrateur de votre espace de vérifier les droits nécessaires pour cette tâche. Votre travail existant n’a pas été modifié.", dashboard: "Tableau de bord", home: "Accueil" },
} as const;

export default function NotAuthorized({ locale = "en" }: { locale?: "en" | "fr" }) {
  const t = copy[locale];
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#dfe8eb] px-4 py-10 text-[#132028] dark:bg-[#0b1116] dark:text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(47,125,246,0.075)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,0.07)_1px,transparent_1px)] bg-[size:44px_44px] dark:opacity-35" />
      <div className="relative w-full max-w-xl rounded-xl border border-[#9fb4bb]/25 bg-[#eef4f5]/88 p-6 text-center shadow-[0_28px_80px_rgba(24,38,45,0.20)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#142129]/92 sm:p-8">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-[#10181d] text-white shadow-[0_16px_36px_rgba(16,24,29,0.16)] ring-1 ring-white/25 dark:bg-white/[0.08] dark:text-[#8fb7ff] dark:ring-white/10">
          <LockKeyhole className="h-6 w-6" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#58707a] dark:text-[#8fa4ab]">
          {t.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-normal text-[#10181d] dark:text-white">
          {t.title}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#58707a] dark:text-[#9fb4bb]">
          {t.message}
        </p>

        <div className="mt-6 rounded-xl border border-[#f0c54d]/25 bg-[rgba(240,197,77,0.10)] p-4 text-left">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#9a6b16] dark:text-[#f0c54d]" aria-hidden />
            <div>
              <p className="text-sm font-black text-[#132028] dark:text-white">{t.next}</p>
              <p className="mt-1 text-sm leading-6 text-[#58707a] dark:text-[#9fb4bb]">
                {t.help}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild className="h-11 rounded-xl font-black">
            <Link href="/dashboard">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              {t.dashboard}
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-xl">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              {t.home}
            </Link>
          </Button>
        </div>
        <div className="mt-4">
          <SessionRecoverySignOutButton locale={locale} label={selfSignOutCopy[locale].label} />
        </div>
      </div>
    </div>
  );
}
