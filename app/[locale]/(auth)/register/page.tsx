import { AuthLayout } from "@/components/auth";
import BeautifulRegisterForm from "@/components/auth/BeautifulRegisterForm";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const fr = (await params).locale === "fr";
  return { title: fr ? "Créer un compte | Stoquify" : "Create an account | Stoquify", description: fr ? "Créez votre compte pour préparer votre espace Stoquify." : "Create your account to prepare your Stoquify workspace.", referrer: "no-referrer" as const, robots: { index: false, follow: false } };
}

export default function Page() {
  return (
    <AuthLayout variant="register">
      <BeautifulRegisterForm />
    </AuthLayout>
  );
}
