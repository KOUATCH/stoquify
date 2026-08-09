import type { Metadata } from "next"

import { CustomerStatementPortal } from "./CustomerStatementPortal"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Secure customer statement | Stoquify",
  description: "Review a secure, verified customer statement.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
  referrer: "no-referrer",
}

export default async function CustomerStatementPage({
  params,
}: {
  params: Promise<{ statementId: string }>
}) {
  const { statementId } = await params
  return <CustomerStatementPortal statementId={statementId} />
}
