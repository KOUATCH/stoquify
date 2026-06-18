"use client";

import { registerUser } from "@/actions/auth";
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
  ClipboardCheck,
  Clock3,
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
  Sparkles,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { AuthFormCard } from "./AuthLayout";
import { authCopy, getAuthLocale } from "./auth-copy";
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
  const [currentStep, setCurrentStep] = useState<StepId>("personal");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const { formError, formSuccess, warning } = useNotifications();
  const locale = getAuthLocale(pathname);
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    trigger,
    setValue,
  } = useForm<RegisterUserProps>({
    defaultValues: {
      termsAccepted: false,
      currency: "XAF",
      timezone: "Africa/Douala",
      defaultLocale: locale,
    },
  });
  const copy = authCopy[locale].register;
  const localizedHref = (href: string) => localizePath(href, locale);
  const companySizes = [
    { value: "1-10", label: copy.companySizes.small },
    { value: "11-50", label: copy.companySizes.medium },
    { value: "51-200", label: copy.companySizes.large },
    { value: "201+", label: copy.companySizes.enterprise },
  ];
  const industries = ["Retail", "Wholesale", "Restaurant", "Pharmacy", "Manufacturing", "Services", "Distribution"];
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
    security: ["password", "confirmPassword", "termsAccepted"],
  };

  const goNext = async () => {
    const valid = await trigger(stepFields[currentStep]);
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
    const previousStep = steps[currentIndex - 1]?.id;
    if (previousStep) {
      setCurrentStep(previousStep);
    }
  };

  const onSubmit = async (data: RegisterUserProps) => {
    const valid = await trigger(stepFields.security);
    if (!valid) return;

    try {
      setLoading(true);
      const result = await registerUser(data);
      setLoading(false);

      if (result.error) {
        formError(copy.errorTitle, result.error, copy.errorHint);
        return;
      }

      if (result.success) {
        formSuccess(
          copy.successTitle,
          result.message || copy.successBody
        );
        reset();
        const userId = result.data?.userId;
        if (userId) {
          router.push(`${localizedHref(`/verify/${userId}`)}?email=${encodeURIComponent(data.email)}`);
        } else {
          router.push(`${localizedHref("/login")}?registered=true&email=${encodeURIComponent(data.email)}`);
        }
      }
    } catch {
      setLoading(false);
      formError(copy.networkTitle, copy.networkBody, copy.networkHint);
    }
  };

  return (
    <AuthFormCard className="flex flex-col lg:min-h-[720px]">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#10181d] text-white shadow-[0_16px_36px_rgba(16,24,29,0.16)] ring-1 ring-white/25 dark:bg-white/[0.08] dark:text-[#7de8dc] dark:ring-white/10">
            <Rocket className="h-5 w-5" />
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
            <Clock3 className="h-3.5 w-3.5" />
            {copy.setupTime}
          </span>
          <span className="flex items-center gap-2 rounded-full border border-[#2dd4bf]/25 bg-[rgba(45,212,191,0.10)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#178e83] dark:text-[#7de8dc]">
            <ShieldCheck className="h-3.5 w-3.5" />
            {copy.setupTrust}
          </span>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-[#9fb4bb]/25 bg-[#e2ecef]/78 p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/65 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#58707a] dark:bg-white/[0.06] dark:text-[#9fb4bb]">
              <Sparkles className="h-3.5 w-3.5 text-[#a87516] dark:text-[#f0c76a]" />
              {copy.blueprintTitle}
            </div>
            <p className="text-sm leading-6 text-[#58707a] dark:text-[#9fb4bb]">{copy.blueprintBody}</p>
          </div>
          <div className="grid min-w-[220px] gap-2">
            {Object.values(copy.blueprintItems).map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-lg bg-white/62 px-3 py-2 text-sm font-bold text-[#253943] dark:bg-white/[0.055] dark:text-[#d3ddd8]">
                <ClipboardCheck className="h-4 w-4 text-[#2ec98a]" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-[0.12em] text-[#58707a] dark:text-[#8fa4ab]">
          <span>{copy.step} {currentIndex + 1} {copy.of} {steps.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#cfdcdf] dark:bg-[#0f171d]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#bf7145] to-[#f0c54d] transition-all duration-500"
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
                onClick={() => index <= currentIndex && setCurrentStep(step.id)}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-2 rounded-xl border px-2 py-2 text-xs font-bold transition-all",
                  active
                    ? "border-[#f0c54d]/45 bg-[rgba(240,197,77,0.16)] text-[#8b4a2f] dark:text-[#f6d574]"
                    : complete
                      ? "border-[#bf7145]/40 bg-[rgba(191,113,69,0.14)] text-[#7a3f2a] dark:text-[#f0c54d]"
                      : "border-[#9fb4bb]/25 bg-white/45 text-[#7f969f] dark:border-white/10 dark:bg-white/[0.035]"
                )}
              >
                {complete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                <span className="hidden sm:inline">{copy.steps[step.id]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
              <Label className="text-sm font-bold text-[#253943] dark:text-[#d3ddd8]">{copy.fields.companySize}</Label>
              <input type="hidden" {...register("companySize", { required: copy.errors.companySizeRequired })} />
              <Select
                value={companySize}
                onValueChange={(value) => setValue("companySize", value, { shouldValidate: true })}
              >
                <SelectTrigger
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
              {errors.companySize?.message ? <ErrorText message={errors.companySize.message} /> : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-[#253943] dark:text-[#d3ddd8]">{copy.fields.industry}</Label>
                <input type="hidden" {...register("industry")} />
                <Select
                  value={industry}
                  onValueChange={(value) => setValue("industry", value, { shouldValidate: true })}
                >
                  <SelectTrigger className="h-12 rounded-xl border-[#9fb4bb]/30 bg-white/72 text-[#132028] shadow-sm dark:border-white/10 dark:bg-[#0f171d]/72 dark:text-white">
                    <SelectValue placeholder={copy.fields.selectIndustry} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {industries.map((item) => (
                      <SelectItem key={item} value={item}>
                        <span className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-[#2f7df6]" />
                          {item}
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
                <Label className="text-sm font-bold text-[#253943] dark:text-[#d3ddd8]">{copy.fields.currency}</Label>
                <input type="hidden" {...register("currency")} />
                <Select value={currency} onValueChange={(value) => setValue("currency", value, { shouldValidate: true })}>
                  <SelectTrigger className="h-12 rounded-xl border-[#9fb4bb]/30 bg-white/72 text-[#132028] shadow-sm dark:border-white/10 dark:bg-[#0f171d]/72 dark:text-white">
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
                <Label className="text-sm font-bold text-[#253943] dark:text-[#d3ddd8]">{copy.fields.timezone}</Label>
                <input type="hidden" {...register("timezone")} />
                <Select value={timezone} onValueChange={(value) => setValue("timezone", value, { shouldValidate: true })}>
                  <SelectTrigger className="h-12 rounded-xl border-[#9fb4bb]/30 bg-white/72 text-[#132028] shadow-sm dark:border-white/10 dark:bg-[#0f171d]/72 dark:text-white">
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
                <Label className="text-sm font-bold text-[#253943] dark:text-[#d3ddd8]">{copy.fields.defaultLocale}</Label>
                <input type="hidden" {...register("defaultLocale")} />
                <Select value={defaultLocale} onValueChange={(value) => setValue("defaultLocale", value as "en" | "fr", { shouldValidate: true })}>
                  <SelectTrigger className="h-12 rounded-xl border-[#9fb4bb]/30 bg-white/72 text-[#132028] shadow-sm dark:border-white/10 dark:bg-[#0f171d]/72 dark:text-white">
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
                  <span>{copy.passwordStrength}</span>
                  <span>{passwordStrength}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#d8e2e5] dark:bg-[#0f171d]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#ef6a6a] via-[#d7a84f] to-[#2ec98a] transition-all duration-300"
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

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#9fb4bb]/25 bg-[#e2ecef]/70 p-4 text-sm leading-6 text-[#58707a] dark:border-white/10 dark:bg-white/[0.035] dark:text-[#9fb4bb]">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-[#9fb4bb]/40 bg-white text-[#2f7df6] focus:ring-[#2f7df6]/30 dark:border-white/10 dark:bg-[#0f171d]"
                {...register("termsAccepted", { required: copy.errors.termsRequired })}
              />
              <span>
                {copy.fields.termsPrefix}{" "}
                <Link href={localizedHref("/terms")} className="font-bold text-[#2f7df6] dark:text-[#8fb7ff]">
                  {copy.fields.terms}
                </Link>{" "}
                {copy.fields.and}{" "}
                <Link href={localizedHref("/privacy")} className="font-bold text-[#2f7df6] dark:text-[#8fb7ff]">
                  {copy.fields.privacy}
                </Link>
                .
              </span>
            </label>
            {errors.termsAccepted?.message ? <ErrorText message={errors.termsAccepted.message} /> : null}
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
              disabled={loading}
              className="h-11 rounded-xl px-5 font-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
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
      </form>

      <p className="mt-auto pt-6 text-center text-sm text-[#58707a] dark:text-[#9fb4bb]">
        {copy.already}{" "}
        <Link href={localizedHref("/login")} className="font-black text-[#2f7df6] transition hover:text-[#1f6feb] dark:text-[#8fb7ff]">
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
  return (
    <div className="space-y-2">
      <Label className="text-sm font-bold text-[#253943] dark:text-[#d3ddd8]">{label}</Label>
      <div className="relative">{children}</div>
      {error ? <ErrorText message={error} /> : null}
    </div>
  );
}

function ErrorText({ message }: { message: string }) {
  return (
    <p className="flex items-center gap-1.5 text-sm font-medium text-[#ef6a6a]">
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
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}
