"use client";

import { payrollUiText, payrollStatusText } from "./payroll-ui-copy"
import type { Locale } from "@/types/bilingual"

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  Send,
} from "lucide-react";

import {
  enqueuePayrollAuthorityAdapterExecutionAction,
  type PayrollDeclarationWorkbenchResult,
} from "@/actions/payroll/payroll-control.actions";

type DeclarationRow = PayrollDeclarationWorkbenchResult["declarations"][number];
type ActionResponse = {
  success: boolean;
  data?: {
    idempotent?: boolean;
    execution?: {
      status?: string | null;
      correlationId?: string | null;
      authorityAdapterKey?: string | null;
      authorityAdapterProofHash?: string | null;
    } | null;
  } | null;
  error?: string | null;
  code?: string | null;
  correlationId?: string | null;
};
type Notice =
  | { kind: "success"; message: string; details?: string[] }
  | { kind: "fresh-auth" | "error"; message: string; correlationId?: string };

function nextKey(declarationId: string) {
  const random =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `payroll-declaration:authority-adapter:${declarationId}:${random}`;
}

function Badge({ locale = "en", value }: { value: string | null | undefined } & { locale?: Locale }) {
  return (
    <span className="inline-flex min-h-7 max-w-full items-center rounded-md border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-slate-100">
      <span className="truncate">{payrollUiText(payrollStatusText(value, locale), locale)}</span>
    </span>
  );
}

function noticeFromResponse(response: ActionResponse, locale: Locale): Notice {
  if (response.success) {
    const execution = response.data?.execution ?? null;
    return {
      kind: "success",
      message: response.data?.idempotent
        ? payrollUiText("Authority adapter execution was already queued.", locale)
        : payrollUiText("Authority adapter execution queued.", locale),
      details: [
        execution?.status ? `${payrollUiText("Status:", locale)} ${payrollStatusText(execution.status, locale)}` : null,
        execution?.authorityAdapterKey
          ? `${payrollUiText("Adapter:", locale)} ${execution.authorityAdapterKey}`
          : null,
        execution?.correlationId
          ? `${payrollUiText("Correlation:", locale)} ${execution.correlationId}`
          : null,
        execution?.authorityAdapterProofHash
          ? `${payrollUiText("Proof:", locale)} ${execution.authorityAdapterProofHash}`
          : null,
      ].filter((item): item is string => Boolean(item)),
    };
  }

  return {
    kind: response.code === "FRESH_AUTH_REQUIRED" ? "fresh-auth" : "error",
    message:
      response.error ||
      payrollUiText("Authority adapter execution could not be queued from this session.", locale),
    correlationId: response.correlationId ?? undefined,
  };
}

function NoticePanel({ notice }: { notice: Notice | null }) {
  if (!notice) return null;
  const success = notice.kind === "success";

  return (
    <div
      role={success ? "status" : "alert"}
      className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${
        success
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
          : "border-amber-400/30 bg-amber-400/10 text-amber-100"
      }`}
    >
      {success ? (
        <CheckCircle2
          className="mt-0.5 h-3.5 w-3.5 shrink-0"
          aria-hidden="true"
        />
      ) : (
        <AlertTriangle
          className="mt-0.5 h-3.5 w-3.5 shrink-0"
          aria-hidden="true"
        />
      )}
      <div className="min-w-0">
        <p className="break-words font-semibold">{notice.message}</p>
        {success && notice.details?.length ? (
          <div className="mt-1 grid gap-1 text-slate-300">
            {notice.details.map((detail) => (
              <p key={detail} className="break-all">
                {detail}
              </p>
            ))}
          </div>
        ) : null}
        {!success && notice.correlationId ? (
          <p className="mt-1 break-all text-slate-400">
            {notice.correlationId}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function PayrollDeclarationAuthorityExecutionPanel({ locale = "en",
  declaration,
}: {
  declaration: DeclarationRow;
} & { locale?: Locale }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    nextKey(declaration.id),
  );
  const gate = declaration.adapterExecution;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!gate.canEnqueue || !gate.declarationEvidenceId) return;
    setNotice(null);
    startTransition(async () => {
      const response = await enqueuePayrollAuthorityAdapterExecutionAction({
        declarationEvidenceId: gate.declarationEvidenceId,
        idempotencyKey,
      });
      const nextNotice = noticeFromResponse(response, locale);
      setNotice(nextNotice);
      if (nextNotice.kind === "success") {
        setIdempotencyKey(nextKey(declaration.id));
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-3 grid gap-2 rounded-md border border-cyan-300/20 bg-cyan-300/10 p-3 text-xs">
      <div className="flex items-center gap-2 font-semibold uppercase tracking-normal text-cyan-100">
        <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{payrollUiText("Certified adapter enqueue", locale)}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge locale={locale} value={gate.requiredPermission} />
        {gate.requiresFreshAuth ? <Badge locale={locale} value="Fresh auth" /> : null}
        <Badge locale={locale} value={gate.status ?? (gate.canEnqueue ? "READY" : "BLOCKED")} />
      </div>
      <p className="break-words text-slate-300">{gate.reason}</p>
      {gate.queuedEvidenceId ||
      gate.correlationId ||
      gate.authorityAdapterKey ? (
        <div className="grid gap-1 rounded-md border border-white/10 bg-slate-950/30 p-2 text-slate-400">
          {gate.authorityAdapterKey ? (
            <p className="break-all">{payrollUiText("Adapter:", locale)} {gate.authorityAdapterKey}</p>
          ) : null}
          {gate.queuedEvidenceId ? (
            <p className="break-all">{payrollUiText("Evidence:", locale)} {gate.queuedEvidenceId}</p>
          ) : null}
          {gate.correlationId ? (
            <p className="break-all">{payrollUiText("Correlation:", locale)} {gate.correlationId}</p>
          ) : null}
        </div>
      ) : null}
      {gate.canEnqueue ? (
        <form onSubmit={submit} className="grid gap-2">
          <div className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[11px] text-slate-500">
            <p className="font-semibold uppercase tracking-normal">
               {payrollUiText("Idempotency key", locale)} </p>
            <p className="mt-1 break-all">{idempotencyKey}</p>
          </div>
          <NoticePanel notice={notice} />
          <button
            type="submit"
            disabled={isPending}
            aria-busy={isPending}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-cyan-300/30 bg-cyan-300/15 px-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
             {payrollUiText("Queue adapter execution", locale)} </button>
        </form>
      ) : (
        <NoticePanel notice={notice} />
      )}
    </div>
  );
}
