"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

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

export type PayrollProofDrawerSubject = {
  id: string;
  label: string;
  status: string | null | undefined;
  source: string;
  href?: string | null;
  rows: PayrollProofDrawerRow[];
  blockers?: PayrollProofDrawerBlocker[];
  redactions?: Array<{
    field: string;
    reason: string;
    policy: string;
  }>;
};

function displayValue(value: PayrollProofDrawerRow["value"]) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (value === null || value === undefined || value === "") return "Pending";
  return String(value);
}

function tone(value: string | null | undefined) {
  const normalized = (value ?? "").toUpperCase();
  if (
    [
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

function Badge({ value }: { value: string | null | undefined }) {
  return (
    <span
      className={`inline-flex min-h-7 max-w-full items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${tone(value)}`}
    >
      <span className="truncate">{value ?? "Pending"}</span>
    </span>
  );
}

export default function PayrollProofDrawerButton({
  subject,
}: {
  subject: PayrollProofDrawerSubject;
}) {
  const [open, setOpen] = useState(false);
  const blockers = subject.blockers ?? [];
  const redactions = subject.redactions ?? [];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-8 items-center justify-center gap-2 rounded-md border border-white/12 bg-white/10 px-2.5 text-xs font-semibold text-white transition hover:bg-white/15"
      >
        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
        Proof drawer
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto border-white/10 bg-[#101820] text-slate-100 sm:max-w-2xl">
          <SheetHeader className="pr-8">
            <SheetTitle className="text-white">{subject.label}</SheetTitle>
            <SheetDescription className="break-all text-slate-400">
              {subject.source}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 grid gap-4">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] p-4">
              <Badge value={subject.status} />
              {redactions.length ? (
                <span className="inline-flex min-h-7 items-center gap-2 rounded-md border border-cyan-400/20 bg-cyan-400/10 px-2.5 text-xs font-semibold text-cyan-100">
                  <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                  Redacted
                </span>
              ) : null}
              {subject.href ? (
                <Link
                  href={subject.href}
                  className="inline-flex min-h-7 items-center gap-2 rounded-md border border-white/12 px-2.5 text-xs font-semibold text-white hover:bg-white/10"
                >
                  Open
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ) : null}
            </div>

            <dl className="divide-y divide-white/10 rounded-lg border border-white/10 bg-white/[0.04]">
              {subject.rows.map((row) => (
                <div
                  key={`${subject.id}:${row.label}`}
                  className="grid gap-2 px-4 py-3 sm:grid-cols-[170px_minmax(0,1fr)]"
                >
                  <dt className="text-xs font-semibold uppercase tracking-normal text-slate-400">
                    {row.label}
                  </dt>
                  <dd className="min-w-0 break-all text-sm text-slate-100">
                    {displayValue(row.value)}
                  </dd>
                </div>
              ))}
            </dl>

            {blockers.length ? (
              <div className="grid gap-2 rounded-lg border border-amber-400/20 bg-amber-400/10 p-4">
                <h3 className="text-sm font-semibold text-white">Blockers</h3>
                {blockers.map((blocker) => (
                  <div
                    key={blocker.id}
                    className="rounded-md border border-white/10 bg-black/10 p-3 text-xs text-amber-50"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge value={blocker.severity} />
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
                <h3 className="text-sm font-semibold text-white">Redactions</h3>
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
