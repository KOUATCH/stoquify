import { ArrowUpRight, BookOpen, Layers3 } from "lucide-react";
import Link from "next/link";
import { localizePath } from "@/i18n/routing";
import type { Locale } from "@/types/bilingual";
import { publicAuthCopy } from "./public-auth-copy";

export function PublicWorkspaceGuide({ locale, variant }: { locale: Locale; variant: "login" | "register" }) {
  const copy = publicAuthCopy[locale].workspaceGuide;

  return (
    <aside
      data-auth-workspace-guide
      aria-labelledby="auth-workspace-title"
      className="min-w-0 rounded-2xl border border-[#9fb4bb]/30 bg-[var(--auth-surface)] p-5 sm:p-7 lg:mt-3 dark:border-white/10"
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--auth-brand-action)] dark:text-[var(--auth-brand-ink)]">
        <Layers3 className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{copy.eyebrow}</span>
      </div>
      <h2 id="auth-workspace-title" className="mt-4 text-balance text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
        {variant === "login" ? copy.loginTitle : copy.registerTitle}
      </h2>
      <p className="mt-3 text-sm leading-6 text-[var(--auth-text-muted)]">{copy.introduction}</p>

      <div className="mt-6 border-t border-[#9fb4bb]/25 pt-5 dark:border-white/10">
        <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--auth-text-soft)]">{copy.journeyLabel}</h3>
        <ol className="mt-4 space-y-5">
          {copy.steps.map((step, index) => (
            <li key={step.title} className="relative flex gap-3">
              {index < copy.steps.length - 1 && <span className="absolute bottom-[-1.25rem] left-4 top-8 w-px bg-[#9fb4bb]/35" aria-hidden="true" />}
              <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#9fb4bb]/35 bg-[var(--auth-surface-raised)] text-xs font-semibold text-[var(--auth-brand-action)] dark:text-[var(--auth-brand-ink)]" aria-hidden="true">{index + 1}</span>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="mt-1 text-xs font-medium text-[var(--auth-text-soft)]">{step.role}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--auth-text-muted)]">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-6 border-t border-[#9fb4bb]/25 pt-5 dark:border-white/10">
        <p className="text-sm leading-6 text-[var(--auth-text-muted)]">{copy.more}</p>
        <Link
          href={localizePath("/workflows", locale)}
          className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg py-2 text-sm font-semibold text-[var(--auth-brand-action)] underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-brand)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--auth-surface)] dark:text-[var(--auth-brand-ink)]"
        >
          <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{copy.link}</span>
          <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </Link>
        <p className="mt-3 text-xs leading-5 text-[var(--auth-text-soft)]">{copy.availability}</p>
      </div>
    </aside>
  );
}
