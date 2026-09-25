"use client";

import { RegistrationWorkflowError, useRegisterWorkflow } from "@/hooks/useRegisterWorkflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { localizePath } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { RegisterUserProps } from "@/types/types";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
  Globe2,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Rocket,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Children, cloneElement, isValidElement, useEffect, useId, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { AuthFormCard } from "./AuthLayout";
import { authCopy, getAuthLocale } from "./auth-copy";
import { publicAuthCopy } from "./public-auth-copy";
import { useNotifications } from "../notifications/NotificationProvider";

const inputClass =
  "auth-input h-12 rounded-xl border-[#9fb4bb]/30 bg-white/72 pl-11 text-[#132028] placeholder:text-[#7f969f] shadow-sm outline-none transition-all focus:border-[#2f7df6] focus:ring-4 focus:ring-[#2f7df6]/15 dark:border-white/10 dark:bg-[#0f171d]/72 dark:text-white dark:placeholder:text-[#7f969f]";

const steps = [
  { id: "personal", icon: User },
  { id: "company", icon: Building2 },
  { id: "security", icon: ShieldCheck },
] as const;

type StepId = (typeof steps)[number]["id"];

function getPasswordScore(password: string) {
  const checks = [
    password.length >= 12,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[!@#$%^&*(),.?":{}|<>]/.test(password),
  ];

  return checks.filter(Boolean).length;
}

export default function BeautifulRegisterForm() {
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [completedHref, setCompletedHref] = useState("");
  const feedbackRef = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);
  const navigating = useRef(false);
  const selectId = useId();
  useEffect(() => { setReady(true); }, []);
  useEffect(() => { if (feedback) feedbackRef.current?.focus(); }, [feedback]);
  const [currentStep, setCurrentStep] = useState<StepId>("personal");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { warning } = useNotifications();
  const locale = getAuthLocale(pathname);
  const workflow = useRegisterWorkflow(locale);
  const recovery = locale === "fr" ? {
    uncertain: "Le résultat n’a pas pu être confirmé. Vos données sont conservées. Vérifiez vos emails ou essayez de vous connecter avant de créer un autre espace.",
    field: "Vérifiez cette information.", continue: "Continuer vers la vérification de l’email", characteristics: "Caractéristiques du mot de passe",
  } : {
    uncertain: "The outcome could not be confirmed. Your entries are preserved. Check for a verification email or try signing in before creating another workspace.",
    field: "Check this information.", continue: "Continue to email verification", characteristics: "Password characteristics",
  };
  const isAccountantInvite =
    params.get("role") === "accountant" &&
    Boolean(params.get("ref")) &&
    Boolean(params.get("invite"));
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger,
    setValue,
    setError,
  } = useForm<RegisterUserProps>({
    defaultValues: {
      termsAccepted: false,
      currency: "XAF",
      timezone: "Africa/Douala",
      defaultLocale: locale,
      referralCode: params.get("ref") || undefined,
      accountantInviteToken: params.get("invite") || undefined,
      accountantInviteAccepted: isAccountantInvite ? false : undefined,
    },
  });
  const copy = { ...authCopy[locale].register, ...publicAuthCopy[locale].register };
  const localizedHref = (href: string) => localizePath(href, locale);
  const companySizes = [
    { value: "1-10", label: copy.companySizes.small },
    { value: "11-50", label: copy.companySizes.medium },
    { value: "51-200", label: copy.companySizes.large },
    { value: "201+", label: copy.companySizes.enterprise },
  ];
  const industries = ["Retail", "Wholesale", "Restaurant", "Pharmacy", "Manufacturing", "Services", "Distribution"];
  const industryLabels: Record<string, string> = { Retail: "Commerce de détail", Wholesale: "Commerce de gros", Restaurant: "Restauration", Pharmacy: "Pharmacie", Manufacturing: "Fabrication", Services: "Services", Distribution: "Distribution" };
  const currencies = ["XAF", "USD", "EUR", "GBP", "CAD", "NGN", "GHS", "ZAR"];
  const timezones = ["Africa/Douala", "Africa/Lagos", "Africa/Abidjan", "Africa/Nairobi", "Europe/Paris", "UTC"];

  const password = watch("password") || "";
  const confirmPassword = watch("confirmPassword") || "";
  const companySize = watch("companySize");
  const industry = watch("industry");
  const currency = watch("currency") || "XAF";
  const timezone = watch("timezone") || "Africa/Douala";
  const defaultLocale = watch("defaultLocale") || locale;
  const currentIndex = steps.findIndex((step) => step.id === currentStep);
  const progress = ((currentIndex + 1) / steps.length) * 100;
  const passwordScore = useMemo(() => getPasswordScore(password), [password]);
  const passwordStrength = passwordScore <= 2
    ? copy.passwordLevels.developing
    : passwordScore <= 4
      ? copy.passwordLevels.strong
      : copy.passwordLevels.excellent;

  const stepFields: Record<StepId, (keyof RegisterUserProps)[]> = {
    personal: ["firstName", "lastName", "email", "phone"],
    company: ["companyName", "companySize"],
    security: [
      "password",
      "confirmPassword",
      "termsAccepted",
      ...(isAccountantInvite ? ["accountantInviteAccepted" as const] : []),
    ],
  };

  const goNext = async () => {
    if (!ready || submitting.current || navigating.current || completedHref) return;
    navigating.current = true;
    const valid = await trigger(stepFields[currentStep], { shouldFocus: true });
    navigating.current = false;
    if (!valid) {
      warning(copy.warningTitle, copy.warningBody);
      return;
    }

    const nextStep = steps[currentIndex + 1]?.id;
    if (nextStep) {
      setCurrentStep(nextStep);
    }
  };

  const goBack = () => {
    if (submitting.current || completedHref) return;
    const previousStep = steps[currentIndex - 1]?.id;
    if (previousStep) {
      setCurrentStep(previousStep);
    }
  };

  const onSubmit = async (data: RegisterUserProps) => {
    if (!ready || currentStep !== "security" || submitting.current || completedHref) return;
    submitting.current = true;
    setLoading(true);
    setFeedback("");
    try {
      const result = await workflow.mutateAsync(data);
      const href = `${localizedHref(`/verify/${result.data!.userId}`)}?email=${encodeURIComponent(result.data!.email)}`;
      setCompletedHref(href);
      router.push(href);
    } catch (error) {
      setFeedback(error instanceof RegistrationWorkflowError ? error.message : recovery.uncertain);
      if (error instanceof RegistrationWorkflowError && error.fieldErrors) {
        for (const field of Object.keys(error.fieldErrors)) setError(field as keyof RegisterUserProps, { type: "server", message: recovery.field });
        const first = steps.find(step => stepFields[step.id].some(field => error.fieldErrors?.[field]));
        if (first) setCurrentStep(first.id);
      }
    } finally {
      setLoading(false);
      submitting.current = false;
    }
  };

  return (
    <AuthFormCard className="flex flex-col">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-[#111a20] dark:text-white">{copy.title}</h1>
        <p className="mt-2 text-sm leading-6 text-[#58707a] dark:text-[#9fb4bb]">{copy.subtitle}</p>
        <p className="mt-3 text-sm leading-6 text-[#58707a] dark:text-[#9fb4bb]">{copy.blueprintBody}</p>
      </div>

      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-[0.12em] text-[#58707a] dark:text-[#8fa4ab]">
          <span>{copy.step} {currentIndex + 1} {copy.of} {steps.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div role="progressbar" aria-label={copy.step} aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={currentIndex + 1} aria-valuetext={`${copy.step} ${currentIndex + 1} ${copy.of} ${steps.length}`} className="h-2 overflow-hidden rounded-full bg-[#cfdcdf] dark:bg-[#0f171d]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#bf7145] to-[#f0c54d] transition-all duration-500 motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const active = step.id === currentStep;
            const complete = index < currentIndex;
            return (
              <button
                key={step.id}
                type="button"
                disabled={!ready || loading || !!completedHref || index > currentIndex}
                aria-label={copy.steps[step.id]}
                aria-current={active ? "step" : undefined}
                onClick={() => index <= currentIndex && setCurrentStep(step.id)}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl border px-0.5 py-2 text-[11px] font-bold transition-all sm:flex-row sm:gap-2 sm:px-2 sm:text-xs",
                  active
                    ? "border-[#f0c54d]/45 bg-[rgba(240,197,77,0.16)] text-[#8b4a2f] dark:text-[#f6d574]"
                    : complete
                      ? "border-[#bf7145]/40 bg-[rgba(191,113,69,0.14)] text-[#7a3f2a] dark:text-[#f0c54d]"
                      : "border-[#9fb4bb]/25 bg-white/45 text-[#7f969f] dark:border-white/10 dark:bg-white/[0.035]"
                )}
              >
                {complete ? <Check className="h-4 w-4 shrink-0" /> : <Icon className="h-4 w-4 shrink-0" />}
                <span className="min-w-0 break-words text-center leading-4">{copy.steps[step.id]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {feedback ? <div ref={feedbackRef} role="alert" tabIndex={-1} className="mb-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-400/40 dark:bg-red-950/30 dark:text-red-200">{feedback}</div> : null}
      {completedHref ? <Link className="mb-4 underline" href={completedHref}>{recovery.continue}</Link> : null}
      <form method="post" noValidate onSubmit={event => { if (currentStep !== "security") { event.preventDefault(); void goNext(); } else void handleSubmit(onSubmit)(event); }} aria-busy={loading}>
        <fieldset disabled={!ready || loading || !!completedHref} className="min-w-0 space-y-5">
        <input type="hidden" {...register("referralCode")} />
        <input type="hidden" {...register("accountantInviteToken")} />
        {currentStep === "personal" ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldShell label={copy.fields.firstName} error={errors.firstName?.message}>
                <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f969f]" />
                <Input
                  placeholder={copy.fields.firstNamePlaceholder}
                  className={cn(inputClass, errors.firstName && "border-[#ef6a6a] focus:border-[#ef6a6a] focus:ring-[#ef6a6a]/15")}
                  {...register("firstName", {
                    required: copy.errors.firstNameRequired,
                    minLength: { value: 2, message: copy.errors.firstNameMin },
                  })}
                />
              </FieldShell>

              <FieldShell label={copy.fields.lastName} error={errors.lastName?.message}>
                <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f969f]" />
                <Input
                  placeholder={copy.fields.lastNamePlaceholder}
                  className={cn(inputClass, errors.lastName && "border-[#ef6a6a] focus:border-[#ef6a6a] focus:ring-[#ef6a6a]/15")}
                  {...register("lastName", {
                    required: copy.errors.lastNameRequired,
                    minLength: { value: 2, message: copy.errors.lastNameMin },
                  })}
                />
              </FieldShell>
            </div>

            <FieldShell label={copy.fields.email} error={errors.email?.message}>
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f969f]" />
              <Input
                type="email"
                placeholder={copy.fields.emailPlaceholder}
                className={cn(inputClass, errors.email && "border-[#ef6a6a] focus:border-[#ef6a6a] focus:ring-[#ef6a6a]/15")}
                {...register("email", {
                  required: copy.errors.emailRequired,
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: copy.errors.emailInvalid,
                  },
                })}
              />
            </FieldShell>

            <FieldShell label={copy.fields.phone} error={errors.phone?.message}>
              <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f969f]" />
              <Input
                type="tel"
                placeholder={copy.fields.phonePlaceholder}
                className={cn(inputClass, errors.phone && "border-[#ef6a6a] focus:border-[#ef6a6a] focus:ring-[#ef6a6a]/15")}
                {...register("phone", { required: copy.errors.phoneRequired })}
              />
            </FieldShell>
          </div>
        ) : null}

        {currentStep === "company" ? (
          <div className="space-y-4">
            <FieldShell label={copy.fields.companyName} error={errors.companyName?.message}>
              <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f969f]" />
              <Input
                placeholder={copy.fields.companyNamePlaceholder}
                className={cn(inputClass, errors.companyName && "border-[#ef6a6a] focus:border-[#ef6a6a] focus:ring-[#ef6a6a]/15")}
                {...register("companyName", {
                  required: copy.errors.companyRequired,
                  minLength: { value: 2, message: copy.errors.companyMin },
                })}
              />
            </FieldShell>

            <div className="space-y-2">
              <Label htmlFor={`${selectId}-size`} className="text-sm font-bold text-[#253943] dark:text-[#d3ddd8]">{copy.fields.companySize}</Label>
              <input type="hidden" {...register("companySize", { required: copy.errors.companySizeRequired })} />
              <Select
                value={companySize}
                onValueChange={(value) => setValue("companySize", value, { shouldValidate: true })}
              >
                <SelectTrigger
                  id={`${selectId}-size`} aria-invalid={!!errors.companySize} aria-describedby={errors.companySize ? `${selectId}-size-error` : undefined}
                  className={cn(
                    "h-12 rounded-xl border-[#9fb4bb]/30 bg-white/72 text-[#132028] shadow-sm dark:border-white/10 dark:bg-[#0f171d]/72 dark:text-white",
                    errors.companySize && "border-[#ef6a6a]"
                  )}
                >
                  <SelectValue placeholder={copy.fields.selectCompanySize} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {companySizes.map((size) => (
                    <SelectItem key={size.value} value={size.value}>
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-[#2f7df6]" />
                        {size.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.companySize?.message ? <ErrorText id={`${selectId}-size-error`} message={errors.companySize.message} /> : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`${selectId}-industry`} className="text-sm font-bold text-[#253943] dark:text-[#d3ddd8]">{copy.fields.industry}</Label>
                <input type="hidden" {...register("industry")} />
                <Select
                  value={industry}
                  onValueChange={(value) => setValue("industry", value, { shouldValidate: true })}
                >
                  <SelectTrigger id={`${selectId}-industry`} className="h-12 rounded-xl border-[#9fb4bb]/30 bg-white/72 text-[#132028] shadow-sm dark:border-white/10 dark:bg-[#0f171d]/72 dark:text-white">
                    <SelectValue placeholder={copy.fields.selectIndustry} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {industries.map((item) => (
                      <SelectItem key={item} value={item}>
                        <span className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-[#2f7df6]" />
                          {locale === "fr" ? industryLabels[item] : item}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <FieldShell label={copy.fields.country}>
                <Globe2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f969f]" />
                <Input
                  placeholder={copy.fields.countryPlaceholder}
                  className={inputClass}
                  {...register("country")}
                />
              </FieldShell>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldShell label={copy.fields.state}>
                <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f969f]" />
                <Input
                  placeholder={copy.fields.statePlaceholder}
                  className={inputClass}
                  {...register("state")}
                />
              </FieldShell>

              <FieldShell label={copy.fields.address}>
                <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f969f]" />
                <Input
                  placeholder={copy.fields.addressPlaceholder}
                  className={inputClass}
                  {...register("address")}
                />
              </FieldShell>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor={`${selectId}-currency`} className="text-sm font-bold text-[#253943] dark:text-[#d3ddd8]">{copy.fields.currency}</Label>
                <input type="hidden" {...register("currency")} />
                <Select value={currency} onValueChange={(value) => setValue("currency", value, { shouldValidate: true })}>
                  <SelectTrigger id={`${selectId}-currency`} className="h-12 rounded-xl border-[#9fb4bb]/30 bg-white/72 text-[#132028] shadow-sm dark:border-white/10 dark:bg-[#0f171d]/72 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {currencies.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${selectId}-timezone`} className="text-sm font-bold text-[#253943] dark:text-[#d3ddd8]">{copy.fields.timezone}</Label>
                <input type="hidden" {...register("timezone")} />
                <Select value={timezone} onValueChange={(value) => setValue("timezone", value, { shouldValidate: true })}>
                  <SelectTrigger id={`${selectId}-timezone`} className="h-12 rounded-xl border-[#9fb4bb]/30 bg-white/72 text-[#132028] shadow-sm dark:border-white/10 dark:bg-[#0f171d]/72 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {timezones.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${selectId}-locale`} className="text-sm font-bold text-[#253943] dark:text-[#d3ddd8]">{copy.fields.defaultLocale}</Label>
                <input type="hidden" {...register("defaultLocale")} />
                <Select value={defaultLocale} onValueChange={(value) => setValue("defaultLocale", value as "en" | "fr", { shouldValidate: true })}>
                  <SelectTrigger id={`${selectId}-locale`} className="h-12 rounded-xl border-[#9fb4bb]/30 bg-white/72 text-[#132028] shadow-sm dark:border-white/10 dark:bg-[#0f171d]/72 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="en">EN</SelectItem>
                    <SelectItem value="fr">FR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-xl border border-[#2dd4bf]/25 bg-[rgba(45,212,191,0.10)] p-4 text-sm leading-6 text-[#31515d] dark:text-[#b5f5ee]">
              {copy.infoBox}
            </div>
          </div>
        ) : null}

        {currentStep === "security" ? (
          <div className="space-y-4">
            <FieldShell label={copy.fields.password} error={errors.password?.message}>
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f969f]" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={copy.fields.passwordPlaceholder}
                className={cn(
                  inputClass,
                  "pr-12",
                  errors.password && "border-[#ef6a6a] focus:border-[#ef6a6a] focus:ring-[#ef6a6a]/15"
                )}
                {...register("password", {
                  required: copy.errors.passwordRequired,
                  minLength: { value: 12, message: copy.errors.passwordMin },
                })}
              />
              <VisibilityButton
                show={showPassword}
                onClick={() => setShowPassword((value) => !value)}
                showLabel={copy.showPassword}
                hideLabel={copy.hidePassword}
              />
            </FieldShell>

            {password ? (
              <div className="rounded-xl border border-[#9fb4bb]/25 bg-white/50 p-4 dark:border-white/10 dark:bg-white/[0.035]">
                <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.12em] text-[#58707a] dark:text-[#8fa4ab]">
                  <span>{recovery.characteristics}</span>
                  <span>{passwordStrength}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#d8e2e5] dark:bg-[#0f171d]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#ef6a6a] via-[#d7a84f] to-[#2ec98a] transition-all duration-300 motion-reduce:transition-none"
                    style={{ width: `${(passwordScore / 5) * 100}%` }}
                  />
                </div>
              </div>
            ) : null}

            <FieldShell label={copy.fields.confirmPassword} error={errors.confirmPassword?.message}>
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f969f]" />
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder={copy.fields.confirmPasswordPlaceholder}
                className={cn(
                  inputClass,
                  "pr-12",
                  confirmPassword && confirmPassword === password && "border-[#2ec98a]/70",
                  errors.confirmPassword && "border-[#ef6a6a] focus:border-[#ef6a6a] focus:ring-[#ef6a6a]/15"
                )}
                {...register("confirmPassword", {
                  required: copy.errors.confirmRequired,
                  validate: (value) => value === password || copy.errors.confirmMismatch,
                })}
              />
              <VisibilityButton
                show={showConfirmPassword}
                onClick={() => setShowConfirmPassword((value) => !value)}
                showLabel={copy.showPassword}
                hideLabel={copy.hidePassword}
              />
            </FieldShell>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#9fb4bb]/25 bg-[#e2ecef]/70 p-4 text-sm leading-6 text-[var(--auth-text-soft)] dark:border-white/10 dark:bg-white/[0.035] dark:text-[#9fb4bb]">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-[#9fb4bb]/40 bg-white text-[#2f7df6] focus:ring-[#2f7df6]/30 dark:border-white/10 dark:bg-[#0f171d]"
                {...register("termsAccepted", { required: copy.errors.termsRequired })}
              />
              <span>
                {copy.fields.termsPrefix}{" "}
                <Link href={localizedHref("/terms")} className="font-bold text-[var(--product-brand-action-hover)] hover:underline dark:text-[#8fb7ff]">
                  {copy.fields.terms}
                </Link>{" "}
                {copy.fields.and}{" "}
                <Link href={localizedHref("/privacy")} className="font-bold text-[var(--product-brand-action-hover)] hover:underline dark:text-[#8fb7ff]">
                  {copy.fields.privacy}
                </Link>
                .
              </span>
            </label>
            {errors.termsAccepted?.message ? <ErrorText message={errors.termsAccepted.message} /> : null}
            {isAccountantInvite ? (
              <>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#2dd4bf]/25 bg-[rgba(45,212,191,0.10)] p-4 text-sm leading-6 text-[#31515d] dark:text-[#b5f5ee]">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-[#9fb4bb]/40 bg-white text-[#178e83] focus:ring-[#178e83]/30 dark:border-white/10 dark:bg-[#0f171d]"
                    {...register("accountantInviteAccepted", {
                      required: locale === "fr"
                        ? "Vous devez accepter le mandat client."
                        : "You must accept the client mandate.",
                    })}
                  />
                  <span>
                    {locale === "fr"
                      ? "J'accepte le mandat client limite, date et revocable decrit dans cette invitation."
                      : "I accept the limited, time-bound, revocable client mandate described in this invitation."}
                  </span>
                </label>
                {errors.accountantInviteAccepted?.message ? <ErrorText message={errors.accountantInviteAccepted.message} /> : null}
              </>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 pt-2">
          {currentStep !== "personal" ? (
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              className="h-11 rounded-xl border-[#9fb4bb]/30 bg-white/55 px-4 text-[#253943] hover:bg-white dark:border-white/10 dark:bg-white/[0.045] dark:text-[#d3ddd8] dark:hover:bg-white/[0.09]"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {copy.back}
            </Button>
          ) : (
            <span />
          )}

          {currentStep !== "security" ? (
            <Button
              key="continue"
              type="button"
              onClick={goNext}
              className="h-11 rounded-xl px-5 font-black"
            >
              {copy.continue}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              key="create"
              disabled={loading}
              className="h-11 rounded-xl px-5 font-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                  {copy.creating}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {copy.create}
                  <Rocket className="h-4 w-4" />
                </span>
              )}
            </Button>
          )}
        </div>
        </fieldset>
      </form>

      <p className="mt-auto pt-6 text-center text-sm text-[#58707a] dark:text-[#9fb4bb]">
        {copy.already}{" "}
        <Link href={localizedHref("/login")} className="font-black text-[var(--product-brand-action-hover)] transition hover:underline dark:text-[#8fb7ff]">
          {copy.signIn}
        </Link>
      </p>
    </AuthFormCard>
  );
}

function FieldShell({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  const limits: Record<string, number> = { firstName: 100, lastName: 100, email: 254, phone: 32, companyName: 200, country: 100, state: 100, address: 500, password: 128, confirmPassword: 128 };
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-bold text-[#253943] dark:text-[#d3ddd8]">{label}</Label>
      <div className="relative">{Children.map(children, child => {
        if (!isValidElement<React.ComponentProps<typeof Input>>(child) || child.type !== Input) return child;
        const name = child.props.name ?? "";
        return cloneElement(child, { id, "aria-invalid": !!error, "aria-describedby": error ? `${id}-error` : undefined, maxLength: limits[name], autoComplete: name === "password" || name === "confirmPassword" ? "new-password" : name === "email" ? "email" : name === "phone" ? "tel" : undefined });
      })}</div>
      {error ? <ErrorText id={`${id}-error`} message={error} /> : null}
    </div>
  );
}

function ErrorText({ message, id }: { message: string; id?: string }) {
  return (
    <p id={id} className="flex items-center gap-1.5 text-sm font-medium text-red-700 dark:text-red-300">
      <AlertCircle className="h-4 w-4" />
      {message}
    </p>
  );
}

function VisibilityButton({
  show,
  onClick,
  showLabel,
  hideLabel,
}: {
  show: boolean;
  onClick: () => void;
  showLabel: string;
  hideLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#7f969f] transition hover:bg-[#f0c54d]/15 hover:text-[#8b4a2f] dark:hover:bg-[#bf7145]/20 dark:hover:text-[#f6d574]"
      aria-label={show ? hideLabel : showLabel}
      aria-pressed={show}
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}
