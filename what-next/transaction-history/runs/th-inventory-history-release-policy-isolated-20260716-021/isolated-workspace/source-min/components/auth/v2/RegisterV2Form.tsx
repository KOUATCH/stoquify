"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRegisterWorkflow } from "@/hooks/useRegisterWorkflow"
import { localizePath } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import type { Locale } from "@/types/bilingual"
import type { RegisterUserProps } from "@/types/types"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Building2,
  Check,
  ClipboardCheck,
  Eye,
  EyeOff,
  Globe2,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Store,
  User,
  Users,
} from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useNotifications } from "../../notifications/NotificationProvider"

const countries = [
  { code: "CM", name: "Cameroon", currency: "XAF", timezone: "Africa/Douala", locale: "fr", phone: "+237 6XX XXX XXX" },
  { code: "CI", name: "Cote d'Ivoire", currency: "XOF", timezone: "Africa/Abidjan", locale: "fr", phone: "+225 XX XX XX XX XX" },
  { code: "SN", name: "Senegal", currency: "XOF", timezone: "Africa/Dakar", locale: "fr", phone: "+221 7X XXX XX XX" },
  { code: "BJ", name: "Benin", currency: "XOF", timezone: "Africa/Porto-Novo", locale: "fr", phone: "+229 XX XX XX XX" },
  { code: "TG", name: "Togo", currency: "XOF", timezone: "Africa/Lome", locale: "fr", phone: "+228 XX XX XX XX" },
  { code: "BF", name: "Burkina Faso", currency: "XOF", timezone: "Africa/Ouagadougou", locale: "fr", phone: "+226 XX XX XX XX" },
  { code: "ML", name: "Mali", currency: "XOF", timezone: "Africa/Bamako", locale: "fr", phone: "+223 XX XX XX XX" },
  { code: "GA", name: "Gabon", currency: "XAF", timezone: "Africa/Libreville", locale: "fr", phone: "+241 XX XX XX XX" },
] as const

const businessTypes = ["Retail", "Wholesale", "Restaurant", "Pharmacy", "Distribution", "Services", "Manufacturing"]
const companySizes = ["1-10", "11-50", "51-200", "201+"]
const branchCounts = ["1", "2-3", "4-10", "11+"]
const pains = [
  "POS and cash control",
  "Stock control",
  "Accounting cleanup",
  "Payment reconciliation",
  "Payroll",
  "Multi-branch control",
  "Full operating system",
]

const modules = [
  "POS",
  "Inventory",
  "Accounting",
  "Payment reconciliation",
  "Payroll",
  "Compliance",
  "RBAC roles",
]

const setupRoles = [
  { value: "owner", title: "Owner / manager", body: "I am setting this up for my own business.", Icon: Building2 },
  { value: "accountant", title: "Accountant", body: "I am setting this up for a client or portfolio.", Icon: ClipboardCheck },
  { value: "implementation_partner", title: "Implementation partner", body: "I deploy and support business systems.", Icon: Users },
  { value: "financial_partner", title: "Bank / fintech", body: "I am evaluating merchant operations data.", Icon: Banknote },
] as const

const copy = {
  en: {
    badge: "Guided OHADA workspace setup",
    title: "Create your business workspace.",
    subtitle: "Set up country context, first branch, setup role, admin access, and recommended modules before operations begin.",
    steps: ["Context", "Role", "Company", "Admin", "Setup"],
    fields: {
      country: "Country pack",
      currency: "Currency",
      businessType: "Business type",
      branchCount: "Branches",
      primaryPain: "Main priority",
      companySize: "Team size",
      companyName: "Company name",
      tradeName: "Trade name",
      taxIdentifier: "Tax identifier",
      industry: "Industry",
      firstBranchName: "First branch",
      address: "Business address",
      firstName: "First name",
      lastName: "Last name",
      email: "Work email",
      phone: "Phone number",
      password: "Password",
      confirmPassword: "Confirm password",
      terms: "I agree to the terms and privacy policy",
      assisted: "I want assisted setup or a readiness review",
    },
    placeholders: {
      companyName: "AqStoq Retail Group",
      tradeName: "AqStoq Market",
      taxIdentifier: "Optional",
      firstBranchName: "Main branch",
      address: "Street, city, quarter",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@company.com",
      password: "Create a strong password",
      confirmPassword: "Confirm password",
    },
    reviewTitle: "Recommended setup",
    reviewBody: "We will prepare the workspace with secure owner access, country-aware defaults, and a first operating branch.",
    continue: "Continue",
    back: "Back",
    submit: "Create workspace",
    submitting: "Creating workspace",
    already: "Already have an account?",
    login: "Sign in",
    errors: {
      required: "This field is required",
      email: "Please enter a valid email address",
      passwordMin: "Password must be at least 12 characters",
      passwordMatch: "Passwords do not match",
      terms: "You must accept the terms",
      step: "Complete this step before continuing.",
      failed: "Registration failed",
      network: "Unable to create workspace. Please try again.",
    },
    successTitle: "Workspace created",
    successBody: "Verify your email before signing in.",
    showPassword: "Show password",
    hidePassword: "Hide password",
  },
  fr: {
    badge: "Configuration guidee OHADA",
    title: "Creez votre espace entreprise.",
    subtitle: "Definissez pays, premiere agence, role de configuration, acces admin et modules recommandes avant l'exploitation.",
    steps: ["Contexte", "Role", "Entreprise", "Admin", "Setup"],
    fields: {
      country: "Pack pays",
      currency: "Devise",
      businessType: "Activite",
      branchCount: "Agences",
      primaryPain: "Priorite",
      companySize: "Taille equipe",
      companyName: "Nom entreprise",
      tradeName: "Nom commercial",
      taxIdentifier: "Identifiant fiscal",
      industry: "Secteur",
      firstBranchName: "Premiere agence",
      address: "Adresse",
      firstName: "Prenom",
      lastName: "Nom",
      email: "Email professionnel",
      phone: "Telephone",
      password: "Mot de passe",
      confirmPassword: "Confirmer",
      terms: "J'accepte les conditions et la politique de confidentialite",
      assisted: "Je souhaite un accompagnement ou une revue de preparation",
    },
    placeholders: {
      companyName: "AqStoq Retail Group",
      tradeName: "AqStoq Market",
      taxIdentifier: "Optionnel",
      firstBranchName: "Agence principale",
      address: "Rue, ville, quartier",
      firstName: "Jeanne",
      lastName: "Doe",
      email: "jeanne@entreprise.com",
      password: "Creez un mot de passe fort",
      confirmPassword: "Confirmer le mot de passe",
    },
    reviewTitle: "Configuration recommandee",
    reviewBody: "Nous preparons un espace securise avec acces proprietaire, valeurs pays et premiere agence operationnelle.",
    continue: "Continuer",
    back: "Retour",
    submit: "Creer l'espace",
    submitting: "Creation",
    already: "Vous avez deja un compte ?",
    login: "Connexion",
    errors: {
      required: "Ce champ est requis",
      email: "Veuillez entrer un email valide",
      passwordMin: "Le mot de passe doit contenir au moins 12 caracteres",
      passwordMatch: "Les mots de passe ne correspondent pas",
      terms: "Vous devez accepter les conditions",
      step: "Completez cette etape avant de continuer.",
      failed: "Inscription echouee",
      network: "Impossible de creer l'espace. Veuillez reessayer.",
    },
    successTitle: "Espace cree",
    successBody: "Verifiez votre email avant la connexion.",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
  },
} as const

const inputClass =
  "auth-input h-12 rounded-lg border-[#9fb4bb]/30 bg-white pl-11 text-[#132028] placeholder:text-[#7f969f] shadow-sm outline-none transition-all focus:border-[#178e83] focus:ring-4 focus:ring-[#178e83]/15"

type StepId = 0 | 1 | 2 | 3 | 4

export function RegisterV2Form({ locale }: { locale: Locale }) {
  const t = copy[locale]
  const router = useRouter()
  const params = useSearchParams()
  const { warning } = useNotifications()
  const registerWorkflow = useRegisterWorkflow(locale)
  const [step, setStep] = useState<StepId>(0)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const defaultCountry = countries[0]
  const loading = registerWorkflow.isPending

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<RegisterUserProps>({
    defaultValues: {
      country: defaultCountry.name,
      countryCode: defaultCountry.code,
      currency: defaultCountry.currency,
      timezone: defaultCountry.timezone,
      defaultLocale: defaultCountry.locale as Locale,
      companySize: companySizes[0],
      branchCount: branchCounts[0],
      businessType: businessTypes[0],
      primaryPain: pains[0],
      setupRole: "owner",
      firstBranchName: "Main branch",
      requestedModules: ["POS", "Inventory", "Accounting", "Payment reconciliation"],
      assistedSetupRequested: params.get("intent") === "assisted" || params.get("intent") === "enterprise",
      onboardingSource: "aqstoqflow-register-v2",
      termsAccepted: false,
    },
  })

  const password = watch("password") || ""
  const confirmPassword = watch("confirmPassword") || ""
  const selectedCountryName = watch("country") || defaultCountry.name
  const selectedCountry = countries.find((country) => country.name === selectedCountryName) ?? defaultCountry
  const selectedSetupRole = watch("setupRole") || "owner"
  const progress = ((step + 1) / copy[locale].steps.length) * 100
  const passwordScore = useMemo(() => {
    return [
      password.length >= 12,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ].filter(Boolean).length
  }, [password])

  useEffect(() => {
    if (params.get("role") === "accountant") {
      setValue("setupRole", "accountant")
    }
    if (params.get("intent") === "enterprise") {
      setValue("assistedSetupRequested", true)
      setValue("primaryPain", "Full operating system")
    }
  }, [params, setValue])

  const stepFields: Record<StepId, (keyof RegisterUserProps)[]> = {
    0: ["country", "businessType", "branchCount", "primaryPain", "companySize"],
    1: ["setupRole"],
    2: ["companyName", "industry", "firstBranchName"],
    3: ["firstName", "lastName", "email", "phone", "password", "confirmPassword", "termsAccepted"],
    4: [],
  }

  const goNext = async () => {
    const valid = await trigger(stepFields[step])
    if (!valid) {
      warning(t.errors.failed, t.errors.step)
      return
    }
    setStep((current) => Math.min(current + 1, 4) as StepId)
  }

  const goBack = () => setStep((current) => Math.max(current - 1, 0) as StepId)

  const onSubmit = async (data: RegisterUserProps) => {
    const valid = await trigger(stepFields[3])
    if (!valid) return

    try {
      const result = await registerWorkflow.mutateAsync(data)
      const userId = result.data?.userId
      const email = encodeURIComponent(data.email)
      if (userId) {
        router.push(`${localizePath(`/verify/${userId}`, locale)}?email=${email}`)
      } else {
        router.push(`${localizePath("/login-v2", locale)}?registered=true&email=${email}`)
      }
    } catch {
      // useRegisterWorkflow owns the user-facing error notification.
    }
  }

  return (
    <div className="w-full max-w-[680px] rounded-lg border border-[#d9e1dc] bg-white p-5 shadow-[0_24px_80px_rgba(19,32,40,0.12)] sm:p-7">
      <div className="mb-6">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#132028] text-white">
          <Store className="h-5 w-5" />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#178e83]">{t.badge}</p>
        <h1 className="mt-2 text-2xl font-black text-[#132028] sm:text-3xl">{t.title}</h1>
        <p className="mt-2 text-sm leading-6 text-[#53675f]">{t.subtitle}</p>
      </div>

      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between text-xs font-black uppercase tracking-[0.12em] text-[#53675f]">
          <span>{t.steps[step]}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#d9e1dc]">
          <div className="h-full rounded-full bg-[#178e83] transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {t.steps.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => index <= step && setStep(index as StepId)}
              className={cn(
                "min-h-10 rounded-lg border px-2 py-2 text-xs font-black transition",
                index === step
                  ? "border-[#178e83] bg-[#178e83]/10 text-[#126f67]"
                  : index < step
                    ? "border-[#f0c54d] bg-[#f0c54d]/16 text-[#8b4a2f]"
                    : "border-[#d9e1dc] bg-[#f7faf8] text-[#7f969f]",
              )}
            >
              {index < step ? <Check className="mx-auto h-4 w-4" /> : label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <input type="hidden" {...register("countryCode")} />
        <input type="hidden" {...register("currency")} />
        <input type="hidden" {...register("timezone")} />
        <input type="hidden" {...register("defaultLocale")} />
        <input type="hidden" {...register("onboardingSource")} />

        {step === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label={t.fields.country} icon={<Globe2 className="h-4 w-4" />} error={errors.country?.message}>
              <select
                className="h-12 w-full rounded-lg border border-[#9fb4bb]/30 bg-white pl-11 pr-3 text-sm font-semibold text-[#132028] outline-none focus:border-[#178e83] focus:ring-4 focus:ring-[#178e83]/15"
                {...register("country", {
                  required: t.errors.required,
                  onChange: (event) => {
                    const country = countries.find((item) => item.name === event.target.value) ?? defaultCountry
                    setValue("countryCode", country.code)
                    setValue("currency", country.currency)
                    setValue("timezone", country.timezone)
                    setValue("defaultLocale", country.locale as Locale)
                  },
                })}
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.name}>
                    {country.name} - {country.currency}
                  </option>
                ))}
              </select>
            </SelectField>

            <SelectField label={t.fields.businessType} icon={<Building2 className="h-4 w-4" />} error={errors.businessType?.message}>
              <select className="h-12 w-full rounded-lg border border-[#9fb4bb]/30 bg-white pl-11 pr-3 text-sm font-semibold text-[#132028] outline-none focus:border-[#178e83] focus:ring-4 focus:ring-[#178e83]/15" {...register("businessType", { required: t.errors.required })}>
                {businessTypes.map((item) => <option key={item}>{item}</option>)}
              </select>
            </SelectField>

            <SelectField label={t.fields.branchCount} icon={<Store className="h-4 w-4" />} error={errors.branchCount?.message}>
              <select className="h-12 w-full rounded-lg border border-[#9fb4bb]/30 bg-white pl-11 pr-3 text-sm font-semibold text-[#132028] outline-none focus:border-[#178e83] focus:ring-4 focus:ring-[#178e83]/15" {...register("branchCount", { required: t.errors.required })}>
                {branchCounts.map((item) => <option key={item}>{item}</option>)}
              </select>
            </SelectField>

            <SelectField label={t.fields.companySize} icon={<Users className="h-4 w-4" />} error={errors.companySize?.message}>
              <select className="h-12 w-full rounded-lg border border-[#9fb4bb]/30 bg-white pl-11 pr-3 text-sm font-semibold text-[#132028] outline-none focus:border-[#178e83] focus:ring-4 focus:ring-[#178e83]/15" {...register("companySize", { required: t.errors.required })}>
                {companySizes.map((item) => <option key={item}>{item}</option>)}
              </select>
            </SelectField>

            <div className="sm:col-span-2">
              <SelectField label={t.fields.primaryPain} icon={<BadgeCheck className="h-4 w-4" />} error={errors.primaryPain?.message}>
                <select className="h-12 w-full rounded-lg border border-[#9fb4bb]/30 bg-white pl-11 pr-3 text-sm font-semibold text-[#132028] outline-none focus:border-[#178e83] focus:ring-4 focus:ring-[#178e83]/15" {...register("primaryPain", { required: t.errors.required })}>
                  {pains.map((item) => <option key={item}>{item}</option>)}
                </select>
              </SelectField>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div>
            <input type="hidden" {...register("setupRole", { required: t.errors.required })} />
            <div className="grid gap-3 sm:grid-cols-2">
              {setupRoles.map((role) => (
                <SetupRoleButton
                  key={role.value}
                  role={role}
                  selected={selectedSetupRole === role.value}
                  onSelect={() => setValue("setupRole", role.value, { shouldValidate: true })}
                />
              ))}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.fields.companyName} error={errors.companyName?.message} icon={<Building2 className="h-4 w-4" />}>
              <Input className={cn(inputClass, errors.companyName && "border-[#ef6a6a]")} placeholder={t.placeholders.companyName} {...register("companyName", { required: t.errors.required, minLength: { value: 2, message: t.errors.required } })} />
            </Field>
            <Field label={t.fields.tradeName} icon={<Store className="h-4 w-4" />}>
              <Input className={inputClass} placeholder={t.placeholders.tradeName} {...register("tradeName")} />
            </Field>
            <Field label={t.fields.taxIdentifier} icon={<ClipboardCheck className="h-4 w-4" />}>
              <Input className={inputClass} placeholder={t.placeholders.taxIdentifier} {...register("taxIdentifier")} />
            </Field>
            <SelectField label={t.fields.industry} icon={<Building2 className="h-4 w-4" />} error={errors.industry?.message}>
              <select className="h-12 w-full rounded-lg border border-[#9fb4bb]/30 bg-white pl-11 pr-3 text-sm font-semibold text-[#132028] outline-none focus:border-[#178e83] focus:ring-4 focus:ring-[#178e83]/15" {...register("industry", { required: t.errors.required })}>
                {businessTypes.map((item) => <option key={item}>{item}</option>)}
              </select>
            </SelectField>
            <Field label={t.fields.firstBranchName} error={errors.firstBranchName?.message} icon={<MapPin className="h-4 w-4" />}>
              <Input className={inputClass} placeholder={t.placeholders.firstBranchName} {...register("firstBranchName", { required: t.errors.required })} />
            </Field>
            <Field label={t.fields.address} icon={<MapPin className="h-4 w-4" />}>
              <Input className={inputClass} placeholder={t.placeholders.address} {...register("address")} />
            </Field>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.fields.firstName} error={errors.firstName?.message} icon={<User className="h-4 w-4" />}>
              <Input className={cn(inputClass, errors.firstName && "border-[#ef6a6a]")} placeholder={t.placeholders.firstName} {...register("firstName", { required: t.errors.required, minLength: { value: 2, message: t.errors.required } })} />
            </Field>
            <Field label={t.fields.lastName} error={errors.lastName?.message} icon={<User className="h-4 w-4" />}>
              <Input className={cn(inputClass, errors.lastName && "border-[#ef6a6a]")} placeholder={t.placeholders.lastName} {...register("lastName", { required: t.errors.required, minLength: { value: 2, message: t.errors.required } })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label={t.fields.email} error={errors.email?.message} icon={<Mail className="h-4 w-4" />}>
                <Input type="email" className={cn(inputClass, errors.email && "border-[#ef6a6a]")} placeholder={t.placeholders.email} {...register("email", { required: t.errors.required, pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t.errors.email } })} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label={t.fields.phone} error={errors.phone?.message} icon={<Phone className="h-4 w-4" />}>
                <Input type="tel" className={cn(inputClass, errors.phone && "border-[#ef6a6a]")} placeholder={selectedCountry.phone} {...register("phone", { required: t.errors.required })} />
              </Field>
            </div>
            <Field label={t.fields.password} error={errors.password?.message} icon={<Lock className="h-4 w-4" />}>
              <Input type={showPassword ? "text" : "password"} className={cn(inputClass, "pr-12", errors.password && "border-[#ef6a6a]")} placeholder={t.placeholders.password} {...register("password", { required: t.errors.required, minLength: { value: 12, message: t.errors.passwordMin } })} />
              <VisibilityButton show={showPassword} onClick={() => setShowPassword((value) => !value)} showLabel={t.showPassword} hideLabel={t.hidePassword} />
            </Field>
            <Field label={t.fields.confirmPassword} error={errors.confirmPassword?.message} icon={<Lock className="h-4 w-4" />}>
              <Input type={showConfirmPassword ? "text" : "password"} className={cn(inputClass, "pr-12", confirmPassword && confirmPassword === password && "border-[#2ec98a]/70", errors.confirmPassword && "border-[#ef6a6a]")} placeholder={t.placeholders.confirmPassword} {...register("confirmPassword", { required: t.errors.required, validate: (value) => value === password || t.errors.passwordMatch })} />
              <VisibilityButton show={showConfirmPassword} onClick={() => setShowConfirmPassword((value) => !value)} showLabel={t.showPassword} hideLabel={t.hidePassword} />
            </Field>
            <div className="sm:col-span-2">
              <div className="rounded-lg border border-[#d9e1dc] bg-[#f7faf8] p-4">
                <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-[0.12em] text-[#53675f]">
                  <span>Password strength</span>
                  <span>{passwordScore}/5</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#d9e1dc]">
                  <div className="h-full rounded-full bg-[#178e83] transition-all" style={{ width: `${(passwordScore / 5) * 100}%` }} />
                </div>
              </div>
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-[#d9e1dc] bg-[#f7faf8] p-4 text-sm font-semibold leading-6 text-[#53675f]">
                <input type="checkbox" className="mt-1 h-4 w-4 rounded border-[#9fb4bb]/40 text-[#178e83] focus:ring-[#178e83]/25" {...register("termsAccepted", { required: t.errors.terms })} />
                <span>{t.fields.terms}</span>
              </label>
              {errors.termsAccepted ? <FieldError message={errors.termsAccepted.message} /> : null}
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-5">
            <div className="rounded-lg border border-[#178e83]/25 bg-[#edf8f5] p-4">
              <ShieldCheck className="h-6 w-6 text-[#178e83]" />
              <h2 className="mt-4 text-xl font-black">{t.reviewTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-[#53675f]">{t.reviewBody}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {modules.map((module) => (
                <label key={module} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-[#d9e1dc] bg-[#f7faf8] px-4 py-3 text-sm font-black text-[#132028]">
                  <input type="checkbox" value={module} className="h-4 w-4 rounded border-[#9fb4bb]/40 text-[#178e83] focus:ring-[#178e83]/25" {...register("requestedModules")} />
                  {module}
                </label>
              ))}
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#f0c54d]/40 bg-[#fff8dd] p-4 text-sm font-semibold leading-6 text-[#6f5620]">
              <input type="checkbox" className="mt-1 h-4 w-4 rounded border-[#c7a338] text-[#8b4a2f] focus:ring-[#f0c54d]/30" {...register("assistedSetupRequested")} />
              <span>{t.fields.assisted}</span>
            </label>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 pt-2">
          {step > 0 ? (
            <Button type="button" variant="outline" onClick={goBack} className="h-11 rounded-lg border-[#cbd8d1] px-4 font-black">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.back}
            </Button>
          ) : (
            <span />
          )}
          {step < 4 ? (
            <Button type="button" onClick={goNext} className="h-11 rounded-lg bg-[#132028] px-5 font-black text-white hover:bg-[#22323b]">
              {t.continue}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={loading} className="h-11 rounded-lg bg-[#132028] px-5 font-black text-white hover:bg-[#22323b]">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? t.submitting : t.submit}
            </Button>
          )}
        </div>
      </form>

      <p className="mt-5 text-center text-sm text-[#53675f]">
        {t.already}{" "}
        <Link href={localizePath("/login-v2", locale)} className="font-black text-[#178e83] transition hover:text-[#126f67]">
          {t.login}
        </Link>
      </p>
    </div>
  )
}

function Field({
  label,
  error,
  icon,
  children,
}: {
  label: string
  error?: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-bold text-[#253943]">{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#7f969f]">{icon}</span>
        {children}
      </div>
      {error ? <FieldError message={error} /> : null}
    </div>
  )
}

function SelectField({
  label,
  error,
  icon,
  children,
}: {
  label: string
  error?: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-bold text-[#253943]">{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#7f969f]">{icon}</span>
        {children}
      </div>
      {error ? <FieldError message={error} /> : null}
    </div>
  )
}

function SetupRoleButton({
  role,
  selected,
  onSelect,
}: {
  role: (typeof setupRoles)[number]
  selected: boolean
  onSelect: () => void
}) {
  const Icon = role.Icon

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "min-h-36 rounded-lg border p-4 text-left transition",
        selected
          ? "border-[#178e83] bg-[#edf8f5] shadow-sm"
          : "border-[#d9e1dc] bg-[#f7faf8] hover:border-[#178e83]/40",
      )}
    >
      <Icon className="h-6 w-6 text-[#178e83]" />
      <p className="mt-5 text-base font-black text-[#132028]">{role.title}</p>
      <p className="mt-2 text-sm leading-6 text-[#53675f]">{role.body}</p>
    </button>
  )
}

function VisibilityButton({
  show,
  onClick,
  showLabel,
  hideLabel,
}: {
  show: boolean
  onClick: () => void
  showLabel: string
  hideLabel: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-3 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-[#7f969f] transition hover:bg-[#edf5f2] hover:text-[#132028]"
      aria-label={show ? hideLabel : showLabel}
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="flex items-center gap-1.5 text-sm font-semibold text-[#d44848]">
      <AlertCircle className="h-4 w-4" />
      {message}
    </p>
  )
}
