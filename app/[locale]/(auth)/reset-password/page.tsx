import ResetPasswordForm from "@/components/Forms/ResetPasswordForm";
import { AuthV2Shell } from "@/components/auth/v2/AuthV2Shell";
import { pickLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { referrer: "no-referrer", robots: { index: false, follow: false } };

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ email?: string; token?: string }> }) {
  const locale = pickLocale((await params).locale), query = await searchParams;
  const alternatePath = "/reset-password?" + new URLSearchParams({ email: query.email ?? "", token: query.token ?? "" }).toString();
  return (
    <AuthV2Shell locale={locale} variant="recovery" alternatePath={alternatePath}>
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
    </AuthV2Shell>
  );
}
