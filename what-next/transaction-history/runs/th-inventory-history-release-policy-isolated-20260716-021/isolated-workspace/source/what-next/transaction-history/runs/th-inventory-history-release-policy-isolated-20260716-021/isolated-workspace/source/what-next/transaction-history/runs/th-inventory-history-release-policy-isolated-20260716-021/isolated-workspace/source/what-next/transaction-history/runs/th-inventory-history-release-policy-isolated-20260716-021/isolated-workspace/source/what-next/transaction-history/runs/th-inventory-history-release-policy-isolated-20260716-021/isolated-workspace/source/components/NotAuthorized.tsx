// components/NotAuthorized.tsx
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Home, LayoutDashboard, LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotAuthorized() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#dfe8eb] px-4 py-10 text-[#132028] dark:bg-[#0b1116] dark:text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(47,125,246,0.075)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,0.07)_1px,transparent_1px)] bg-[size:44px_44px] dark:opacity-35" />
      <div className="relative w-full max-w-xl rounded-xl border border-[#9fb4bb]/25 bg-[#eef4f5]/88 p-6 text-center shadow-[0_28px_80px_rgba(24,38,45,0.20)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#142129]/92 sm:p-8">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-[#10181d] text-white shadow-[0_16px_36px_rgba(16,24,29,0.16)] ring-1 ring-white/25 dark:bg-white/[0.08] dark:text-[#8fb7ff] dark:ring-white/10">
          <LockKeyhole className="h-6 w-6" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#58707a] dark:text-[#8fa4ab]">
          Protected workspace
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-normal text-[#10181d] dark:text-white">
          Access Not Available
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#58707a] dark:text-[#9fb4bb]">
          Your account is signed in, but this area requires a role permission that is not active for your organization profile.
        </p>

        <div className="mt-6 rounded-xl border border-[#2dd4bf]/25 bg-[rgba(45,212,191,0.10)] p-4 text-left dark:border-[#2dd4bf]/20 dark:bg-[rgba(45,212,191,0.07)]">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#2ec98a]" />
            <div>
              <p className="text-sm font-black text-[#132028] dark:text-white">Permission check complete</p>
              <p className="mt-1 text-sm leading-6 text-[#58707a] dark:text-[#9fb4bb]">
                This decision came from the server-side RBAC policy, not from a hidden menu or client setting.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild className="h-11 rounded-xl font-black">
            <Link href="/dashboard">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-xl">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Link>
          </Button>
        </div>
          <Button asChild variant="ghost" className="mt-3 h-10 rounded-xl text-[#8b4a2f] hover:bg-[#f0c54d]/15 hover:text-[#6f3926] dark:text-[#f6d574] dark:hover:bg-[#bf7145]/20 dark:hover:text-[#fff8e6]">
          <Link href="/dashboard/settings/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Team access
          </Link>
        </Button>
      </div>
    </div>
  );
}
