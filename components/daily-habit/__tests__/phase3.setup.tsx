import "@testing-library/jest-dom"
import type { ComponentProps } from "react"
jest.mock("server-only", () => ({}))
jest.mock("next/link", () => ({ __esModule: true, default: ({ href, prefetch, ...props }: ComponentProps<"a"> & {prefetch?: boolean}) => <a href={href} {...props} />, useLinkStatus: () => ({ pending: false }) }))
jest.mock("next-intl/routing", () => ({ defineRouting: (config: unknown) => config }))
jest.mock("next-intl", () => ({useTranslations: () => (key: string) => key}))
jest.mock("next/navigation", () => ({useRouter: () => ({push: jest.fn(), refresh: jest.fn()}), usePathname: () => "/en/dashboard/daily-digest"}))
jest.mock("@/actions/agents/command-agent.actions", () => ({runCommandAgentAction: jest.fn(), submitCommandAgentFeedbackAction: jest.fn()}))
jest.mock("@/actions/ai/copilot-proposal.actions", () => ({createCopilotProposalAction: jest.fn(), decideCopilotProposalAction: jest.fn()}))
jest.mock("@/actions/evidence/proof-trail.actions", () => ({getProofTrailAction: jest.fn()}))
HTMLElement.prototype.scrollIntoView = jest.fn()
beforeEach(() => window.history.replaceState({}, "", "/en/dashboard/daily-digest"))
