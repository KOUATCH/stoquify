import { AuthLayout, EnhancedLoginForm } from "@/components/auth";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const fr = (await params).locale === "fr";
  return { title: fr ? "Connexion | Stoquify" : "Sign in | Stoquify", description: fr ? "Connectez-vous à votre espace Stoquify." : "Sign in to your Stoquify workspace.", referrer: "no-referrer" as const, robots: { index: false, follow: false } };
}

export default function Page() {
  return (
    <AuthLayout variant="login">
      <EnhancedLoginForm />
    </AuthLayout>
  );
}
