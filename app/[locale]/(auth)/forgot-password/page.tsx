import ForgotPasswordForm from "@/components/Forms/ForgotPasswordForm";
import { AuthV2Shell } from "@/components/auth/v2/AuthV2Shell";
import { pickLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const locale = pickLocale((await params).locale);
  return (
    <AuthV2Shell locale={locale} variant="recovery" alternatePath="/forgot-password">
        <ForgotPasswordForm />
    </AuthV2Shell>
  );
}
