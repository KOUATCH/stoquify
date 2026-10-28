"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { localizePath } from "@/i18n/routing";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { LoginProps } from "@/types/types";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { AuthFormCard } from "./AuthLayout";
import { authCopy, getAuthLocale } from "./auth-copy";
import { useNotifications } from "../notifications/NotificationProvider";

const inputClass =
  "auth-input h-12 rounded-xl border-[#9fb4bb]/30 bg-white/72 pl-11 text-[#132028] placeholder:text-[#7f969f] shadow-sm outline-none transition-all focus:border-[#2f7df6] focus:ring-4 focus:ring-[#2f7df6]/15 dark:border-white/10 dark:bg-[#0f171d]/72 dark:text-white dark:placeholder:text-[#7f969f]";

export default function EnhancedLoginForm() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isEmailValid, setIsEmailValid] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<LoginProps>();

  const params = useSearchParams();
  const pathname = usePathname();
  const locale = getAuthLocale(pathname);
  const common = authCopy[locale].common;
  const copy = authCopy[locale].login;
  const localizedHref = (href: string) => localizePath(href, locale);
  const requestedReturnUrl = params.get("returnUrl") || params.get("callbackUrl");
  const returnUrl =
    requestedReturnUrl?.startsWith("/") && !requestedReturnUrl.startsWith("//")
      ? localizedHref(requestedReturnUrl)
      : localizedHref("/dashboard");
  const { formError, formSuccess } = useNotifications();

  const emailValue = watch("email");


  useEffect(() => {
    if (!emailValue) {
      setIsEmailValid(false);
      return;
    }

    setIsEmailValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue));
  }, [emailValue]);

  useEffect(() => {
    if (params.get("registered") === "true") {
      formSuccess(copy.registeredTitle, copy.registeredBody);
    }

    if (params.get("error") === "email-not-verified") {
      formError(copy.errors.verifyTitle, copy.errors.verifyBody, copy.errors.verifyHint);
    }
  }, [copy, formError, formSuccess, params]);

  const onSubmit = async (data: LoginProps) => {
    try {
      setLoading(true);
      setLoginAttempts((prev) => prev + 1);

      if (loginAttempts > 2) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }

      const result = await authClient.signIn.email({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        rememberMe: true,
      });

      if (result.error) {
        setLoading(false);
        formError(
          copy.errors.authFailed,
          result.error.message || copy.errors.unexpectedBody,
          `${copy.errors.attempt} ${loginAttempts + 1}/5`
        );
        return;
      }

      formSuccess(copy.successTitle, copy.successBody);
      reset();
      setLoading(false);
      window.location.href = returnUrl;
      return;

    } catch {
      setLoading(false);
      formError(
        copy.errors.connectionTitle,
        copy.errors.connectionBody,
        copy.errors.connectionHint
      );
    }
  };

  return (
    <AuthFormCard className="flex flex-col">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#10181d] text-white shadow-[0_16px_36px_rgba(16,24,29,0.16)] ring-1 ring-white/25 dark:bg-white/[0.08] dark:text-[#8fb7ff] dark:ring-white/10">
            <KeyRound className="h-5 w-5" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#58707a] dark:text-[#8fa4ab]">
            {copy.badge}
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#111a20] dark:text-white">{copy.title}</h2>
          <p className="mt-2 text-sm leading-6 text-[#58707a] dark:text-[#9fb4bb]">
            {copy.subtitle}
          </p>
        </div>
        <div className="hidden shrink-0 space-y-2 sm:block">
          <span className="flex items-center gap-2 rounded-full border border-[#2f7df6]/25 bg-[rgba(47,125,246,0.10)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#2f7df6] dark:text-[#8fb7ff]">
            <KeyRound className="h-3.5 w-3.5" />
            {copy.accessLevel}
          </span>
          <span className="flex items-center gap-2 rounded-full border border-[#2dd4bf]/25 bg-[rgba(45,212,191,0.10)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#178e83] dark:text-[#7de8dc]">
            <ShieldCheck className="h-3.5 w-3.5" />
            {common.encrypted}
          </span>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-[#9fb4bb]/25 bg-[#e2ecef]/78 p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2f7df6]/10 text-[#2f7df6] dark:bg-[#8fb7ff]/10 dark:text-[#8fb7ff]">
            <Lock className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black text-[#132028] dark:text-white">{copy.methodTitle}</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-[#58707a] dark:text-[#8fa4ab]">{copy.methodSubtitle}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2 text-sm font-bold text-[#253943] dark:text-[#d3ddd8]">
            {copy.email}
            {isEmailValid ? <CheckCircle2 className="h-4 w-4 text-[#2ec98a]" /> : null}
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f969f]" />
            <Input
              id="email"
              type="email"
              placeholder={copy.emailPlaceholder}
              className={cn(
                inputClass,
                errors.email && "border-[#ef6a6a] focus:border-[#ef6a6a] focus:ring-[#ef6a6a]/15",
                isEmailValid && "border-[#2ec98a]/70 focus:border-[#2ec98a]"
              )}
              {...register("email", {
                required: copy.errors.emailRequired,
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: copy.errors.emailInvalid,
                },
              })}
            />
          </div>
          {errors.email ? (
            <p className="flex items-center gap-1.5 text-sm font-medium text-[#ef6a6a]">
              <AlertCircle className="h-4 w-4" />
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-bold text-[#253943] dark:text-[#d3ddd8]">
            {copy.password}
          </Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f969f]" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={copy.passwordPlaceholder}
              className={cn(
                inputClass,
                "pr-12",
                errors.password && "border-[#ef6a6a] focus:border-[#ef6a6a] focus:ring-[#ef6a6a]/15"
              )}
              {...register("password", {
                required: copy.errors.passwordRequired,
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#7f969f] transition hover:bg-[#f0c54d]/15 hover:text-[#8b4a2f] dark:hover:bg-[#bf7145]/20 dark:hover:text-[#f6d574]"
              aria-label={showPassword ? copy.hidePassword : copy.showPassword}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password ? (
            <p className="flex items-center gap-1.5 text-sm font-medium text-[#ef6a6a]">
              <AlertCircle className="h-4 w-4" />
              {errors.password.message}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[#58707a] dark:text-[#9fb4bb]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[#9fb4bb]/40 bg-white text-[#2f7df6] focus:ring-[#2f7df6]/30 dark:border-white/10 dark:bg-[#0f171d]"
            />
            {copy.remember}
          </label>
          <Link href={localizedHref("/forgot-password")} className="text-sm font-bold text-[#2f7df6] transition hover:text-[#1f6feb] dark:text-[#8fb7ff]">
            {copy.forgot}
          </Link>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-xl text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {copy.loading}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              {copy.submit}
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </form>

      <div className="mt-auto pt-6">
        <div className="rounded-xl border border-[#2dd4bf]/25 bg-[rgba(45,212,191,0.10)] p-4 dark:border-[#2dd4bf]/20 dark:bg-[rgba(45,212,191,0.07)]">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#2ec98a]" />
            <p className="text-sm leading-6 text-[#58707a] dark:text-[#9fb4bb]">
              {copy.secureNote}
            </p>
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-[#58707a] dark:text-[#9fb4bb]">
          {copy.newHere}{" "}
          <Link href={localizedHref("/register")} className="font-black text-[#2f7df6] transition hover:text-[#1f6feb] dark:text-[#8fb7ff]">
            {copy.createAccount}
          </Link>
        </p>
      </div>
    </AuthFormCard>
  );
}


