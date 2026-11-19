import ForgotPasswordForm from "@/components/Forms/ForgotPasswordForm";
import { AuthV2Shell } from "@/components/auth/v2/AuthV2Shell";
import { pickLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const fr = (await params).locale === "fr";
  return { title: fr ? "Récupérer votre accès | Stoquify" : "Recover your access | Stoquify", description: fr ? "Retrouvez l’accès à votre compte Stoquify." : "Recover access to your Stoquify account.", referrer: "no-referrer" as const, robots: { index: false, follow: false } };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const locale = pickLocale((await params).locale);
  return (
    <AuthV2Shell locale={locale} variant="recovery" alternatePath="/forgot-password">
        <ForgotPasswordForm />
    </AuthV2Shell>
  );
}
