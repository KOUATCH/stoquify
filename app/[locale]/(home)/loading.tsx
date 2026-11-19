"use client";

import { useLocale } from "next-intl";

export default function Loading() {
  const locale = useLocale();
  return (
    <div className="grid min-h-screen place-items-center" role="status">
      <div className="loader" aria-hidden="true" />
      <span className="sr-only">{locale === "fr" ? "Chargement de la page…" : "Loading page…"}</span>
    </div>
  );
}
