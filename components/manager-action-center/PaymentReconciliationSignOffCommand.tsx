"use client";

import type { FormEvent } from "react";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { signReconciliationRunAction } from "@/actions/payments/reconciliation.actions";
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions";
import {
  dashboardMutedTextClass,
  dashboardToneClass,
} from "@/components/finance/finance-dashboard-theme";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { PaymentReconciliationSignOffCommandCandidate } from "@/services/reconciliation/payment-reconciliation-sign-off-command-state-contracts";

type Locale = "en" | "fr";

type CommandNotice =
  | {
      kind: "signed" | "replayed" | "already";
      message: string;
    }
  | {
      kind: "stale" | "access" | "error";
      message: string;
      correlationId?: string;
    };

type AuthNotice = {
  kind: "invalid" | "rate" | "fresh" | "error";
  message: string;
};

type PaymentReconciliationSignOffCommandProps = {
  locale: Locale;
  command: PaymentReconciliationSignOffCommandCandidate;
};

const copy = {
  en: {
    state: "Ready for independent sign-off",
    provider: "Provider",
    businessDate: "Business date",
    matched: "Matched",
    internal: "Internal",
    external: "External",
    matches: "Matches",
    exceptions: "Exceptions",
    action: "Review and sign",
    pending: "Signing reconciliation",
    confirmed: "Reconciliation signed",
    dialogTitle: "Confirm reconciliation sign-off",
    dialogDetail:
      "Enter your password to verify this sensitive action. Provider evidence, access, source version, and maker-checker separation are checked again by the server.",
    independent:
      "The reconciliation maker cannot sign their own run. This approval records the authenticated checker.",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    cancel: "Cancel",
    confirm: "Verify and sign",
    verifying: "Verifying and signing",
    required: "Enter your password to continue.",
    invalid:
      "Authentication could not be verified. Re-enter your password and try again.",
    rate: (seconds: number) =>
      `Too many attempts. Try again in about ${seconds} seconds.`,
    auth: "Your session is no longer available. The action center is refreshing.",
    fresh:
      "Fresh authentication expired before sign-off completed. Verify again to retry the same source version safely.",
    stepUpError: "Authentication could not be verified safely. Try again.",
    signed:
      "Payment reconciliation signed. Refreshing the source-owned action state.",
    replayed:
      "This reconciliation was already signed by you. Refreshing the committed evidence.",
    already:
      "Another authorized checker already signed this reconciliation. Refreshing the committed evidence.",
    stale:
      "The reconciliation evidence or approval conditions changed. The action center is refreshing before any retry.",
    access:
      "Sign permission, module access, or session assurance changed. The action center is refreshing.",
    error:
      "The reconciliation could not be signed safely. Refresh the evidence before retrying.",
    reference: "Reference",
  },
  fr: {
    state: "Prete pour une validation independante",
    provider: "Fournisseur",
    businessDate: "Date d'activite",
    matched: "Rapproche",
    internal: "Interne",
    external: "Externe",
    matches: "Correspondances",
    exceptions: "Exceptions",
    action: "Revoir et valider",
    pending: "Validation du rapprochement",
    confirmed: "Rapprochement valide",
    dialogTitle: "Confirmer la validation du rapprochement",
    dialogDetail:
      "Saisissez votre mot de passe pour verifier cette action sensible. Les preuves fournisseur, les acces, la version source et la separation des roles sont controles a nouveau par le serveur.",
    independent:
      "La personne ayant execute le rapprochement ne peut pas le valider. Cette approbation enregistre le controleur authentifie.",
    password: "Mot de passe",
    passwordPlaceholder: "Saisissez votre mot de passe",
    cancel: "Annuler",
    confirm: "Verifier et valider",
    verifying: "Verification et validation",
    required: "Saisissez votre mot de passe pour continuer.",
    invalid:
      "L'authentification n'a pas pu etre verifiee. Saisissez a nouveau votre mot de passe.",
    rate: (seconds: number) =>
      `Trop de tentatives. Reessayez dans environ ${seconds} secondes.`,
    auth: "Votre session n'est plus disponible. Le centre d'actions est actualise.",
    fresh:
      "L'authentification recente a expire avant la validation. Verifiez-la a nouveau pour reprendre la meme version source.",
    stepUpError:
      "L'authentification n'a pas pu etre verifiee en securite. Reessayez.",
    signed:
      "Rapprochement des paiements valide. Actualisation de l'etat source.",
    replayed:
      "Vous aviez deja valide ce rapprochement. Actualisation des preuves enregistrees.",
    already:
      "Un autre controleur autorise a deja valide ce rapprochement. Actualisation des preuves enregistrees.",
    stale:
      "Les preuves ou les conditions d'approbation ont change. Le centre d'actions est actualise avant toute nouvelle tentative.",
    access:
      "La permission, le module ou l'assurance de session a change. Le centre d'actions est actualise.",
    error:
      "Le rapprochement n'a pas pu etre valide en securite. Actualisez les preuves avant de reessayer.",
    reference: "Reference",
  },
} as const;

export function PaymentReconciliationSignOffCommand({
  locale,
  command,
}: PaymentReconciliationSignOffCommandProps) {
  const router = useRouter();
  const t = copy[locale];
  const inFlightRef = useRef(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [authNotice, setAuthNotice] = useState<AuthNotice | null>(null);
  const [notice, setNotice] = useState<CommandNotice | null>(null);
  const [isPending, startTransition] = useTransition();
  const terminal =
    notice?.kind === "signed" ||
    notice?.kind === "replayed" ||
    notice?.kind === "already";
  const currencyLocale = locale === "fr" ? "fr-FR" : "en-US";

  function changeDialogOpen(nextOpen: boolean) {
    if (inFlightRef.current) return;
    setDialogOpen(nextOpen);
    setPassword("");
    setAuthNotice(null);
  }

  function submitSignOff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlightRef.current || terminal) return;

    if (!password) {
      setAuthNotice({ kind: "invalid", message: t.required });
      return;
    }

    inFlightRef.current = true;
    setAuthNotice(null);
    setNotice(null);
    const submittedPassword = password;
    setPassword("");

    startTransition(async () => {
      try {
        const stepUpResponse = await stepUpWithPasswordAction({
          password: submittedPassword,
        });

        if (!stepUpResponse.success) {
          if (stepUpResponse.code === "AUTH_REQUIRED") {
            setDialogOpen(false);
            setNotice({ kind: "access", message: t.auth });
            router.refresh();
            return;
          }

          if (stepUpResponse.code === "RATE_LIMITED") {
            setAuthNotice({
              kind: "rate",
              message: t.rate(
                Math.max(1, stepUpResponse.retryAfterSeconds ?? 1),
              ),
            });
            return;
          }

          setAuthNotice({
            kind:
              stepUpResponse.code === "INVALID_CREDENTIALS" ||
              stepUpResponse.code === "VALIDATION_ERROR"
                ? "invalid"
                : "error",
            message:
              stepUpResponse.code === "INVALID_CREDENTIALS" ||
              stepUpResponse.code === "VALIDATION_ERROR"
                ? t.invalid
                : t.stepUpError,
          });
          return;
        }

        const signResponse = await signReconciliationRunAction({
          runId: command.source.id,
          expectedSourceVersionHash: command.source.versionHash,
        });

        if (!signResponse.success) {
          if (signResponse.code === "FRESH_AUTH_REQUIRED") {
            setAuthNotice({ kind: "fresh", message: t.fresh });
            return;
          }

          const accessChanged =
            signResponse.status === 401 || signResponse.status === 403;
          const sourceChanged =
            signResponse.code === "BUSINESS_RULE_VIOLATION" ||
            signResponse.code === "CONFLICT" ||
            signResponse.code === "NOT_FOUND";

          setDialogOpen(false);
          setNotice({
            kind: accessChanged ? "access" : sourceChanged ? "stale" : "error",
            message: accessChanged
              ? t.access
              : sourceChanged
                ? t.stale
                : t.error,
            correlationId: signResponse.correlationId,
          });
          router.refresh();
          return;
        }

        const result = signResponse.data;
        const kind = result.completedByAnotherActor
          ? "already"
          : result.replayed
            ? "replayed"
            : "signed";
        setDialogOpen(false);
        setNotice({
          kind,
          message:
            kind === "already"
              ? t.already
              : kind === "replayed"
                ? t.replayed
                : t.signed,
        });
        router.refresh();
      } catch {
        setDialogOpen(false);
        setNotice({ kind: "error", message: t.error });
        router.refresh();
      } finally {
        inFlightRef.current = false;
      }
    });
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={changeDialogOpen}>
      <div
        className="w-full min-w-0 space-y-2 lg:w-auto lg:max-w-sm"
        data-testid="payment-reconciliation-sign-off-command"
      >
        <div className="text-xs text-[var(--dash-text-soft)]">
          <p className="break-words font-medium text-[var(--dash-text)]">
            {command.provider.displayName}
          </p>
          <p className="mt-1 break-words">
            {t.state} / {formatDate(command.businessDate, currencyLocale)}
          </p>
          <p className="mt-1 break-words">
            {t.matched}:{" "}
            {formatMoney(
              command.totals.matchedAmount,
              command.provider.currencyCode,
              currencyLocale,
            )}
          </p>
        </div>
        <DialogTrigger asChild>
          <Button
            type="button"
            size="sm"
            disabled={isPending || terminal}
            className="w-full rounded-lg sm:w-auto"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : terminal ? (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <KeyRound className="h-4 w-4" aria-hidden="true" />
            )}
            {isPending ? t.pending : terminal ? t.confirmed : t.action}
          </Button>
        </DialogTrigger>

        {notice ? (
          <div
            className={cn(
              "flex items-start gap-2 rounded-lg border p-3 text-sm",
              dashboardToneClass(
                notice.kind === "signed" ||
                  notice.kind === "replayed" ||
                  notice.kind === "already"
                  ? "success"
                  : "danger",
              ),
            )}
            role={
              notice.kind === "signed" ||
              notice.kind === "replayed" ||
              notice.kind === "already"
                ? "status"
                : "alert"
            }
          >
            {notice.kind === "signed" ||
            notice.kind === "replayed" ||
            notice.kind === "already" ? (
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
            ) : (
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
            )}
            <div className="min-w-0">
              <p className="break-words">{notice.message}</p>
              {"correlationId" in notice && notice.correlationId ? (
                <p className="mt-1 break-all text-xs opacity-80">
                  {t.reference}: {notice.correlationId}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submitSignOff}>
          <DialogHeader className="pr-8">
            <DialogTitle>{t.dialogTitle}</DialogTitle>
            <DialogDescription>{t.dialogDetail}</DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <dl className="grid gap-2 rounded-lg border border-[var(--dash-border-subtle)] p-3 text-sm sm:grid-cols-2">
              <EvidenceLine label={t.provider}>
                {command.provider.displayName}
              </EvidenceLine>
              <EvidenceLine label={t.businessDate}>
                {formatDate(command.businessDate, currencyLocale)}
              </EvidenceLine>
              <EvidenceLine label={t.internal}>
                {formatMoney(
                  command.totals.internalAmount,
                  command.provider.currencyCode,
                  currencyLocale,
                )}
              </EvidenceLine>
              <EvidenceLine label={t.external}>
                {formatMoney(
                  command.totals.externalAmount,
                  command.provider.currencyCode,
                  currencyLocale,
                )}
              </EvidenceLine>
              <EvidenceLine label={t.matched}>
                {formatMoney(
                  command.totals.matchedAmount,
                  command.provider.currencyCode,
                  currencyLocale,
                )}
              </EvidenceLine>
              <EvidenceLine label={t.matches}>
                {String(command.matchCount)}
              </EvidenceLine>
              <EvidenceLine label={t.exceptions}>
                {String(command.exceptionCount)}
              </EvidenceLine>
            </dl>

            <div
              className={cn(
                "rounded-lg border p-3 text-sm",
                dashboardToneClass("gold"),
              )}
            >
              {t.independent}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-reconciliation-sign-password">
                {t.password}
              </Label>
              <Input
                id="payment-reconciliation-sign-password"
                name="paymentReconciliationSignPassword"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t.passwordPlaceholder}
                disabled={isPending}
                required
                autoFocus
              />
            </div>

            {authNotice ? (
              <div
                className={cn(
                  "flex items-start gap-2 rounded-lg border p-3 text-sm",
                  dashboardToneClass("danger"),
                )}
                role="alert"
              >
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                <p className="break-words">{authNotice.message}</p>
              </div>
            ) : null}
          </div>

          <DialogFooter className="mt-5 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => changeDialogOpen(false)}
              disabled={isPending}
            >
              {t.cancel}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              )}
              {isPending ? t.verifying : t.confirm}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EvidenceLine({
  label,
  children,
}: {
  label: string;
  children: string;
}) {
  return (
    <div className="min-w-0">
      <dt className={cn("text-xs", dashboardMutedTextClass)}>{label}</dt>
      <dd className="mt-1 break-words font-medium text-[var(--dash-text)]">
        {children}
      </dd>
    </div>
  );
}

function formatDate(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function formatMoney(value: string, currency: string, locale: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `${currency} ${value}`;

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
