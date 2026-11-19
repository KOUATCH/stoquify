import Link from "next/link"
import {
  BadgeCheck,
  CalendarClock,
  CreditCard,
  FileText,
  LockKeyhole,
  ReceiptText,
  UserRound,
} from "lucide-react"

import { HrisOperationalTimeRequestPanel } from "@/components/hris/HrisOperationalTimeRequestPanel"
import type { HrisEmployeeSelfServiceResult } from "@/services/hris/self-service.service"

type Props = {
  model: HrisEmployeeSelfServiceResult
  payslipsHref: string
  locale: string
}

function formatDate(value: string | null, locale = "en") {
  return value ? new Date(value).toLocaleDateString(locale) : locale === "fr" ? "Non renseigné" : "Not set"
}

function formatMinutes(value: number) {
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`
}

function yesNo(value: boolean, locale:string) {
  return value ? (locale === "fr" ? "Au dossier" : "On file") : (locale === "fr" ? "Absent du dossier" : "Not on file")
}

export function HrisEmployeeSelfService({ model, payslipsHref, locale }: Props) {
  const t=(en:string,fr:string)=>locale === "fr" ? fr : en
  const employment = model.profile.employment
  const attendance = model.attendance
  const payment = model.paymentDestination
  const profileDetails = [
    [t("Employee number","Matricule"), model.profile.employeeNumber],
    [t("Job title","Poste"), employment.jobTitle ?? t("Not assigned","Non affecté")],
    [t("Department","Département"), employment.department ?? t("Not assigned","Non affecté")],
    [t("Cost center","Centre de coûts"), employment.costCenter ?? t("Not assigned","Non affecté")],
    [t("Country","Pays"), employment.countryCode ?? t("Not set","Non renseigné")],
    [t("Location","Site"), employment.locationAssigned ? t("Assigned","Affecté") : t("Not assigned","Non affecté")],
    [t("Hire date","Date d’embauche"), formatDate(employment.hireDate, locale)],
    [t("Contract","Contrat"), model.contract.latestStatus ?? t("Not active","Inactif")],
  ]

  return (
    <div className="mx-auto flex w-full max-w-[1180px] min-w-0 flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6">
      <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-emerald-200">
            <UserRound className="h-4 w-4" aria-hidden="true" />
            {t("Employee self-service","Espace personnel de l’employé")}
          </div>
          <h1 className="text-2xl font-semibold tracking-normal text-white sm:text-3xl">{t("My HR","Mon espace RH")}</h1>
          <p className="mt-2 break-words text-sm text-slate-300">{model.profile.displayName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link className="underline" href={`/${locale}/dashboard/people/me/schedule`}>{locale === "fr" ? "Mon planning publié" : "My published schedule"}</Link>
          <span className="inline-flex h-9 items-center gap-2 rounded-md border border-emerald-400/20 px-3 text-sm font-medium text-emerald-100">
            <BadgeCheck className="h-4 w-4" aria-hidden="true" />
            {model.profile.status}
          </span>
          {model.capabilities.payslips.canRead ? (
            <Link
              href={payslipsHref}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 px-3 text-sm font-medium text-slate-100 transition hover:bg-white/5"
            >
              <ReceiptText className="h-4 w-4" aria-hidden="true" />
              {t("Payslips","Bulletins de paie")}
            </Link>
          ) : null}
        </div>
      </header>

      <section aria-labelledby="self-profile-heading">
        <h2 id="self-profile-heading" className="mb-3 text-base font-semibold tracking-normal text-white">{t("Employment profile","Profil professionnel")}</h2>
        <dl className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {profileDetails.map(([label, value]) => (
            <div key={label} className="min-w-0 bg-slate-950/80 p-4">
              <dt className="text-xs uppercase tracking-normal text-slate-400">{label}</dt>
              <dd className="mt-1 break-words text-sm font-medium text-white">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="documents-heading" className="border-t border-white/10 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-200" aria-hidden="true" />
            <h2 id="documents-heading" className="text-base font-semibold tracking-normal text-white">Documents</h2>
          <Link className="underline" href={`/${locale}/dashboard/people/me/documents`}>{locale === "fr" ? "Mes originaux protégés" : "My protected originals"}</Link>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-400">{t("References","Références")}</dt><dd className="mt-1 font-medium text-white">{model.documents.referenceCount}</dd></div>
            <div><dt className="text-slate-400">{t("Signed contract","Contrat signé")}</dt><dd className="mt-1 font-medium text-white">{yesNo(model.documents.signedContractEvidenceOnFile,locale)}</dd></div>
            <div><dt className="text-slate-400">{t("Tax identifier","Identifiant fiscal")}</dt><dd className="mt-1 font-medium text-white">{yesNo(model.documents.taxIdentifierOnFile,locale)}</dd></div>
            <div><dt className="text-slate-400">{t("Social identifier","Identifiant social")}</dt><dd className="mt-1 font-medium text-white">{yesNo(model.documents.socialIdentifierOnFile,locale)}</dd></div>
          </dl>
          <p className="mt-4 text-xs text-slate-500">
            {model.documents.referenceTypes.length
              ? model.documents.referenceTypes.join(" / ")
              : t("No document categories recorded","Aucune catégorie documentaire enregistrée")}
          </p>
        </section>

        <section aria-labelledby="attendance-heading" className="border-t border-white/10 pt-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-sky-200" aria-hidden="true" />
            <h2 id="attendance-heading" className="text-base font-semibold tracking-normal text-white">{t("Latest certified attendance","Dernière présence certifiée")}</h2>
          </div>
          {attendance ? (
            <div className="mt-4">
              <p className="text-sm font-medium text-white">{formatDate(attendance.periodStart, locale)} {t("to","au")} {formatDate(attendance.periodEnd, locale)}</p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div><dt className="text-slate-400">{t("Worked","Travail effectué")}</dt><dd className="mt-1 text-white">{formatMinutes(attendance.totals.workedMinutes)}</dd></div>
                <div><dt className="text-slate-400">{t("Overtime","Heures supplémentaires")}</dt><dd className="mt-1 text-white">{formatMinutes(attendance.totals.overtimeMinutes)}</dd></div>
                <div><dt className="text-slate-400">{t("Leave","Congés")}</dt><dd className="mt-1 text-white">{formatMinutes(attendance.totals.leaveMinutes)}</dd></div>
              </dl>
              <p className="mt-4 text-xs text-slate-500">{attendance.certificationStatus}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">{t("No certified attendance snapshot is available.","Aucun relevé de présence certifié n’est disponible.")}</p>
          )}
        </section>
      </div>

      <section aria-labelledby="payment-heading" className="border-t border-white/10 pt-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-amber-200" aria-hidden="true" />
          <h2 id="payment-heading" className="text-base font-semibold tracking-normal text-white">{t("Payment destination","Destination de paiement")}</h2>
        </div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div><p className="text-slate-400">{t("Status","Statut")}</p><p className="mt-1 font-medium text-white">{payment?.state ?? t("Not applicable","Sans objet")}</p></div>
          <div><p className="text-slate-400">{t("Method","Mode")}</p><p className="mt-1 font-medium text-white">{payment?.method ?? t("Not set","Non renseigné")}</p></div>
          <div><p className="text-slate-400">{t("Destination","Destination")}</p><p className="mt-1 font-medium text-white">{payment?.maskedDestination ?? t("Not set","Non renseigné")}</p></div>
        </div>
        {payment?.latestChange ? (
          <p className="mt-4 text-xs text-slate-500">{t("Latest request: ","Dernière demande : ")}{payment.latestChange.status}</p>
        ) : null}
      </section>

      <HrisOperationalTimeRequestPanel
        locale={locale}
        employeeId={model.operationalTime.employeeId}
        correctionEntries={model.operationalTime.correctionEntries}
        requests={model.operationalTime.requests}
        balances={model.operationalTime.balances}
        enabled={model.capabilities.leaveRequest === "AVAILABLE"}
      />

      <section aria-labelledby="requests-heading" className="border-t border-white/10 pt-4">
        <div className="flex items-center gap-2">
          <LockKeyhole className="h-4 w-4 text-slate-300" aria-hidden="true" />
          <h2 id="requests-heading" className="text-base font-semibold tracking-normal text-white">{t("Requests","Demandes")}</h2>
        </div>
        <div className="mt-4 divide-y divide-white/10 border-y border-white/10 text-sm">
          <div className="flex items-center justify-between gap-4 py-3"><span className="text-slate-200">{t("Payment destination change","Modification de la destination de paiement")}</span><span className="text-right text-amber-200">{model.capabilities.paymentDestinationRequest.canRequest ? t("Evidence workflow required","Procédure de preuve requise") : t("Permission required","Autorisation requise")}</span></div>
          <div className="flex items-center justify-between gap-4 py-3"><span className="text-slate-200">{t("Leave request","Demande de congé")}</span><span className="text-right text-emerald-200">{t("Available above","Disponible ci-dessus")}</span></div>
          <div className="flex items-center justify-between gap-4 py-3"><span className="text-slate-200">{t("Attendance correction","Correction de présence")}</span><span className="text-right text-emerald-200">{t("Available above","Disponible ci-dessus")}</span></div>
          <div className="flex items-center justify-between gap-4 py-3"><span className="text-slate-200">{t("Profile correction","Correction du profil")}</span><Link className="underline" href={`/${locale}/dashboard/people/me/corrections`}>{t("Request or track a correction","Demander ou suivre une correction")}</Link></div>
        </div>
      </section>
    </div>
  )
}
