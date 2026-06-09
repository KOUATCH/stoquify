import { AuthLayout } from "@/components/auth";
import BeautifulRegisterForm from "@/components/auth/BeautifulRegisterForm";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AuthLayout variant="register">
      <BeautifulRegisterForm />
    </AuthLayout>
  );
}
