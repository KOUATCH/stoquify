import { fireEvent, render, screen } from "@testing-library/react";

import PayrollProofDrawerButton, {
  type PayrollProofDrawerState,
  type PayrollProofDrawerSubject,
} from "../PayrollProofDrawerButton";

jest.mock("lucide-react", () => {
  const React = require("react");
  const makeIcon = (name: string) => {
    const MockIcon = (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement("svg", { "data-testid": `icon-${name}`, ...props });
    MockIcon.displayName = `Mock${name}Icon`;
    return MockIcon;
  };

  return new Proxy(
    { __esModule: true },
    {
      get(target, prop) {
        if (prop in target) return target[prop as keyof typeof target];
        return makeIcon(String(prop));
      },
    },
  );
});

function proofSubject(
  overrides: Partial<PayrollProofDrawerSubject> = {},
): PayrollProofDrawerSubject {
  return {
    id: "payroll-proof:test",
    label: "Payroll auditor proof pack",
    status: "PASS",
    source: "services/accounting/data-trust.service.ts",
    href: "/en/dashboard/accounting/accountant-portal",
    rows: [{ label: "Source link hash", value: "sha256:source-link" }],
    ...overrides,
  };
}

describe("PayrollProofDrawerButton", () => {
  it("renders redacted proof facts with fresh-auth workflow guidance", () => {
    render(
      <PayrollProofDrawerButton
        buttonLabel="Auditor proof"
        subject={proofSubject({
          requiresFreshAuth: true,
          stateDescription:
            "Run proof is service-owned; listed write actions require fresh authentication.",
          redactions: [
            {
              field: "payroll.auditorProofPack",
              reason: "Only hashes and aggregate evidence are shown.",
              policy: "HASHES_AND_AGGREGATES_ONLY",
            },
          ],
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Auditor proof" }));

    expect(screen.getByText("Payroll auditor proof pack")).toBeInTheDocument();
    expect(screen.getByText("Redacted")).toBeInTheDocument();
    expect(screen.getByText("Fresh auth")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Run proof is service-owned; listed write actions require fresh authentication.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Source link hash")).toBeInTheDocument();
    expect(screen.getByText("sha256:source-link")).toBeInTheDocument();
    expect(screen.getByText("HASHES_AND_AGGREGATES_ONLY")).toBeInTheDocument();
  });

  it.each([
    ["empty", "No service-backed payroll proof facts are available for the selected scope."],
    ["loading", "Service-backed payroll proof is loading."],
    ["error", "The payroll proof workflow returned a safe error state."],
    ["denied", "The payroll proof workflow was denied by entitlement or RBAC checks."],
  ] as Array<[PayrollProofDrawerState, string]>)("renders the %s state without proof rows", (state, description) => {
      render(
        <PayrollProofDrawerButton
          buttonLabel="Open proof"
          subject={proofSubject({
            state,
            status: state.toUpperCase(),
            rows: [],
            href: null,
          })}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Open proof" }));

      expect(screen.getByText(description)).toBeInTheDocument();
      expect(screen.getByText(state[0].toUpperCase() + state.slice(1))).toBeInTheDocument();
      expect(screen.queryByText("Source link hash")).not.toBeInTheDocument();
    });
});