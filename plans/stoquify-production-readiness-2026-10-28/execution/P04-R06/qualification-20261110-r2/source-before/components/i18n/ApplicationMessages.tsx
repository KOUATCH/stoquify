import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import type { ReactNode } from "react"

/** Full application vocabulary stays inside non-marketing route boundaries. */
export async function ApplicationMessages({ children }: { children: ReactNode }) {
  const messages = await getMessages()
  return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
}
