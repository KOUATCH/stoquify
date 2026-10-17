"use client"
import { NextIntlClientProvider } from "next-intl"
import { PaymentExecutionWorkbench } from "@/components/purchasing/PaymentExecutionWorkbench"
import ProfessionalPOSSystem from "@/components/pos/ProfessionalPOSSystem"
import apEn from "@/messages/payment-execution/en.json"
import apFr from "@/messages/payment-execution/fr.json"
import posEn from "@/messages/en.json"
import posFr from "@/messages/fr.json"
export default function Journey({ locale, domain }: { locale: string; domain: string }) {
  return <NextIntlClientProvider locale={locale} timeZone="UTC" messages={{ paymentExecution: locale === "fr" ? apFr : apEn, pos: locale === "fr" ? posFr.pos : posEn.pos }}>
    <div className="dashboard-landing-theme dark min-h-screen bg-[var(--dash-bg)] p-4 text-[var(--dash-text)]">
      {domain === "ap" ? <PaymentExecutionWorkbench organizationId="org" actorId="actor" /> : <ProfessionalPOSSystem />}
    </div>
  </NextIntlClientProvider>
}
