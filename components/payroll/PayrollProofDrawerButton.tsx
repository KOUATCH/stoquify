"use client";

import { payrollUiText, payrollStatusText } from "./payroll-ui-copy"
import type { Locale } from "@/types/bilingual"

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, Clock3, Eye, EyeOff, LockKeyhole } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type PayrollProofDrawerRow = {
  label: string;
  value: string | number | boolean | null | undefined;
};

export type PayrollProofDrawerBlocker = {
  id: string;
  severity: string;
  title: string;
  detail: string;
  nextAction?: string | null;
};

export type PayrollProofDrawerState =
  | "ready"
  | "redacted"
  | "denied"
  | "loading"
  | "error"
  | "empty";

export type PayrollProofDrawerSubject = {
  id: string;
  label: string;
  status: string | null | undefined;
  source: string;
  href?: string | null;
  state?: PayrollProofDrawerState;
  stateLabel?: string;
  stateDescription?: string;
  requiresFreshAuth?: boolean;
  rows: PayrollProofDrawerRow[];
  blockers?: PayrollProofDrawerBlocker[];
  redactions?: Array<{
    field: string;
    reason: string;
    policy: string;
  }>;
};

function displayValue(value: PayrollProofDrawerRow["value"], locale: Locale = "en") {
  if (value === true) return payrollUiText("Yes", locale);
  if (value === false) return payrollUiText("No", locale);
  if (value === null || value === undefined || value === "") return payrollUiText("Pending", locale);
  return String(value);
}

function tone(value: string | null | undefined) {
  const normalized = (value ?? "").toUpperCase();
  if (
    [
      "PASS",
      "READY",
      "POSTED",
      "PAID",
      "SETTLED",
      "ACCEPTED",
      "RELEASED",
      "RECONCILED",
    ].includes(normalized)
  ) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  }
  if (
    ["BLOCKED", "FAILED", "REJECTED", "CANCELLED", "CRITICAL", "HIGH"].includes(
      normalized,
    )
  ) {
    return "border-rose-400/30 bg-rose-400/10 text-rose-100";
  }
  return "border-amber-400/30 bg-amber-400/10 text-amber-100";
}

function stateTone(state: PayrollProofDrawerState) {
  if (state === "ready" || state === "redacted") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  }
  if (state === "denied" || state === "error") {
    return "border-rose-400/30 bg-rose-400/10 text-rose-100";
  }
  if (state === "loading") {
    return "border-cyan-400/30 bg-cyan-400/10 text-cyan-100";
  }
  return "border-amber-400/30 bg-amber-400/10 text-amber-100";
}

function stateLabel(state: PayrollProofDrawerState) {
  switch (state) {
    case "ready":
      return "Ready";
    case "redacted":
      return "Redacted";
    case "denied":
      return "Denied";
    case "loading":
      return "Loading";
    case "error":
      return "Error";
    case "empty":
    default:
      return "Empty";
  }
}

function stateDescription(
  state: PayrollProofDrawerState,
  customDescription: string | undefined,
) {
  if (customDescription) return customDescription;

  switch (state) {
    case "ready":
      return "Service-backed proof facts are available for this workflow.";
    case "redacted":
      return "Sensitive payroll proof is limited to service-redacted hashes, statuses, and aggregates.";
    case "denied":
      return "The payroll proof workflow was denied by entitlement or RBAC checks.";
    case "loading":
      return "Service-backed payroll proof is loading.";
    case "error":
      return "The payroll proof workflow returned a safe error state.";
    case "empty":
    default:
      return "No service-backed payroll proof facts are available for the selected scope.";
  }
}

function drawerState(
  subject: PayrollProofDrawerSubject,
  redactions: NonNullable<PayrollProofDrawerSubject["redactions"]>,
): PayrollProofDrawerState {
  if (subject.state) return subject.state;
  if (redactions.length) return "redacted";
  if (!subject.rows.length) return "empty";
  return "ready";
}

function Badge({ locale = "en", value }: { value: string | null | undefined } & { locale?: Locale }) {
  return (
    <span
      className={`inline-flex min-h-7 max-w-full items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${tone(value)}`}
    >
      <span className="truncate">{payrollStatusText(value, locale)}</span>
    </span>
  );
}

export default function PayrollProofDrawerButton({ locale = "en",
  subject,
  buttonLabel = "Proof drawer",
}: {
  subject: PayrollProofDrawerSubject;
  buttonLabel?: string;
} & { locale?: Locale }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const blockers = subject.blockers ?? [];
  const redactions = subject.redactions ?? [];
  const state = drawerState(subject, redactions);
  const description = stateDescription(state, subject.stateDescription);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-8 items-center justify-center gap-2 rounded-md border border-white/12 bg-white/10 px-2.5 text-xs font-semibold text-white transition hover:bg-white/15"
      >
        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
        {payrollUiText(buttonLabel, locale)}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent lang={locale} closeLabel={locale === "fr" ? "Fermer" : "Close"} onCloseAutoFocus={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
        }} className="w-full overflow-y-auto border-white/10 bg-[#101820] text-slate-100 sm:max-w-2xl">
          <SheetHeader className="pr-8">
            <SheetTitle className="text-white">{subject.label}</SheetTitle>
            <SheetDescription className="break-all text-slate-400">
              {subject.source}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 grid gap-4">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] p-4">
              <Badge locale={locale} value={subject.status} />
              <span
                className={`inline-flex min-h-7 items-center gap-2 rounded-md border px-2.5 text-xs font-semibold ${stateTone(state)}`}
              >
                {state === "loading" ? (
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                ) : state === "denied" ? (
                  <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
                ) : state === "redacted" ? (
                  <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                ) : null}
                {subject.stateLabel ?? payrollUiText(stateLabel(state), locale)}
              </span>
              {subject.requiresFreshAuth ? (
                <span className="inline-flex min-h-7 items-center gap-2 rounded-md border border-amber-400/20 bg-amber-400/10 px-2.5 text-xs font-semibold text-amber-100">
                  <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
                  {payrollUiText("Fresh auth", locale)}
                </span>
              ) : null}
              {subject.href ? (
                <Link
                  href={subject.href}
                  className="inline-flex min-h-7 items-center gap-2 rounded-md border border-white/12 px-2.5 text-xs font-semibold text-white hover:bg-white/10"
                >
                   {payrollUiText("Open", locale)} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ) : null}
            </div>

            <div
              aria-busy={state === "loading"}
              className={`rounded-lg border p-4 text-sm ${stateTone(state)}`}
            >
              {description}
            </div>

            {subject.rows.length ? (
              <dl className="divide-y divide-white/10 rounded-lg border border-white/10 bg-white/[0.04]">
                {subject.rows.map((row) => (
                  <div
                    key={`${subject.id}:${payrollUiText(row.label, locale)}`}
                    className="grid gap-2 px-4 py-3 sm:grid-cols-[170px_minmax(0,1fr)]"
                  >
                    <dt className="text-xs font-semibold uppercase tracking-normal text-slate-400">
                      {payrollUiText(row.label, locale)}
                    </dt>
                    <dd className="min-w-0 break-all text-sm text-slate-100">
                      {displayValue(row.value, locale)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {blockers.length ? (
              <div className="grid gap-2 rounded-lg border border-amber-400/20 bg-amber-400/10 p-4">
                <h3 className="text-sm font-semibold text-white">{payrollUiText("Blockers", locale)}</h3>
                {blockers.map((blocker) => (
                  <div
                    key={blocker.id}
                    className="rounded-md border border-white/10 bg-black/10 p-3 text-xs text-amber-50"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge locale={locale} value={blocker.severity} />
                      <p className="font-semibold text-white">
                        {blocker.title}
                      </p>
                    </div>
                    <p className="mt-2 text-amber-100">{blocker.detail}</p>
                    {blocker.nextAction ? (
                      <p className="mt-2 text-amber-200">
                        {blocker.nextAction}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {redactions.length ? (
              <div className="grid gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-4">
                <h3 className="text-sm font-semibold text-white">{payrollUiText("Redactions", locale)}</h3>
                {redactions.map((redaction) => (
                  <div
                    key={`${redaction.policy}:${redaction.field}`}
                    className="grid gap-1 text-xs text-cyan-50"
                  >
                    <p className="break-all font-semibold">{redaction.field}</p>
                    <p>{redaction.reason}</p>
                    <p className="text-cyan-200">{redaction.policy}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
