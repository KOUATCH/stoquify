import "@testing-library/jest-dom"
import type { ComponentProps } from "react"

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, ...props }: ComponentProps<"a">) => <a href={href} {...props} />,
  useLinkStatus: () => ({ pending: false }),
}))
jest.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }))
jest.mock("next-intl/routing", () => ({ defineRouting: (config: unknown) => config }))
beforeEach(() => window.history.replaceState({}, "", "/en/dashboard/manager-action-center"))
