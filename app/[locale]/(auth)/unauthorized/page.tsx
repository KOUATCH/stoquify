import NotAuthorized from "@/components/NotAuthorized";
import React from "react";

export default async function page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <div>
      <NotAuthorized locale={locale === "fr" ? "fr" : "en"} />
    </div>
  );
}
