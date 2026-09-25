import { ReactNode } from "react";
import { useTranslations } from "next-intl";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const t = useTranslations("authAvailability");
  return <>
    <noscript><p className="border-b border-[#f0c54d] bg-[#fff8dd] p-4 text-sm text-[#6f5620]">{t("javascriptRequired")}</p></noscript>
    {children}
  </>;
}
