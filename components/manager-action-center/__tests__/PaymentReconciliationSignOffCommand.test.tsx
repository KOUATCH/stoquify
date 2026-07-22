import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SVGProps } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import { signReconciliationRunAction } from "@/actions/payments/reconciliation.actions";
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions";

const mockRefresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

jest.mock("@/actions/payments/reconciliation.actions", () => ({
  signReconciliationRunAction: jest.fn(),
}));

jest.mock("@/actions/security/step-up-auth.actions", () => ({
  stepUpWithPasswordAction: jest.fn(),
}));

jest.mock("lucide-react", () => {
  const createIcon = (name: string) => {
    const Icon = (props: SVGProps<SVGSVGElement>) => (
      <svg data-testid={`icon-${name}`} {...props} />
    );
    return Icon;
  };

  return new Proxy(
    { __esModule: true },
    {
      get(target, prop: string) {
        if (prop in target) return target[prop as keyof typeof target];
        return createIcon(prop);
      },
    },
  );
});

import { PaymentReconciliationSignOffCommand } from "../PaymentReconciliationSignOffCommand";

const mockStepUp = stepUpWithPasswordAction as jest.Mock;
const mockSign = signReconciliationRunAction as jest.Mock;

beforeEach(() => {
  mockStepUp.mockReset();
  mockSign.mockReset();
  mockRefresh.mockReset();
});

describe("PaymentReconciliationSignOffCommand", () => {
  it("sends password only to step-up and rendered source evidence only to sign-off", async () => {
    mockStepUp.mockResolvedValue(stepUpSuccess());
    mockSign.mockResolvedValue(signSuccess());
    renderCommand();

    openDialogAndEnterPassword("CurrentPassword!1");
    fireEvent.click(screen.getByRole("button", { name: "Verify and sign" }));

    await waitFor(() =>
      expect(mockStepUp).toHaveBeenCalledWith({
        password: "CurrentPassword!1",
      }),
    );
    await waitFor(() => expect(mockSign).toHaveBeenCalledTimes(1));
    expect(mockSign).toHaveBeenCalledWith({
      runId: "run-ready-1",
      expectedSourceVersionHash: `sha256:${"a".repeat(64)}`,
    });
    expect(mockSign.mock.calls[0][0]).not.toHaveProperty("password");
    expect(mockSign.mock.calls[0][0]).not.toHaveProperty("organizationId");
    expect(mockSign.mock.calls[0][0]).not.toHaveProperty("actorId");
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Payment reconciliation signed",
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Reconciliation signed" }),
      ).toBeDisabled(),
    );
  });

  it("clears invalid credentials and never calls the product command", async () => {
    mockStepUp.mockResolvedValue(stepUpFailure("INVALID_CREDENTIALS"));
    renderCommand();

    openDialogAndEnterPassword("WrongPassword");
    fireEvent.click(screen.getByRole("button", { name: "Verify and sign" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "could not be verified",
    );
    expect(screen.getByLabelText("Password")).toHaveValue("");
    expect(mockSign).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("shows a bounded rate-limit retry without calling sign-off", async () => {
    mockStepUp.mockResolvedValue(stepUpFailure("RATE_LIMITED", 37));
    renderCommand();

    openDialogAndEnterPassword("CurrentPassword!1");
    fireEvent.click(screen.getByRole("button", { name: "Verify and sign" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "about 37 seconds",
    );
    expect(mockSign).not.toHaveBeenCalled();
  });

  it("refreshes on authentication loss without claiming completion", async () => {
    mockStepUp.mockResolvedValue(stepUpFailure("AUTH_REQUIRED"));
    renderCommand();

    openDialogAndEnterPassword("CurrentPassword!1");
    fireEvent.click(screen.getByRole("button", { name: "Verify and sign" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "session is no longer available",
    );
    expect(mockSign).not.toHaveBeenCalled();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("retries the exact rendered source version after fresh auth expires", async () => {
    mockStepUp.mockResolvedValue(stepUpSuccess());
    mockSign
      .mockResolvedValueOnce(signFailure(403, "FRESH_AUTH_REQUIRED"))
      .mockResolvedValueOnce(signSuccess());
    renderCommand();

    openDialogAndEnterPassword("CurrentPassword!1");
    fireEvent.click(screen.getByRole("button", { name: "Verify and sign" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "retry the same source version safely",
    );
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "CurrentPassword!1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify and sign" }));

    await waitFor(() => expect(mockSign).toHaveBeenCalledTimes(2));
    expect(mockSign.mock.calls[1][0]).toEqual(mockSign.mock.calls[0][0]);
    expect(mockStepUp).toHaveBeenCalledTimes(2);
  });

  it.each([401, 403])(
    "refreshes source capability after access status %s",
    async (status) => {
      mockStepUp.mockResolvedValue(stepUpSuccess());
      mockSign.mockResolvedValue(
        signFailure(status, status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN"),
      );
      renderCommand();

      openDialogAndEnterPassword("CurrentPassword!1");
      fireEvent.click(screen.getByRole("button", { name: "Verify and sign" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "permission, module access, or session assurance changed",
      );
      expect(mockRefresh).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    },
  );

  it.each(["BUSINESS_RULE_VIOLATION", "CONFLICT", "NOT_FOUND"])(
    "treats %s as stale source evidence and refreshes",
    async (code) => {
      mockStepUp.mockResolvedValue(stepUpSuccess());
      mockSign.mockResolvedValue(signFailure(409, code));
      renderCommand();

      openDialogAndEnterPassword("CurrentPassword!1");
      fireEvent.click(screen.getByRole("button", { name: "Verify and sign" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "evidence or approval conditions changed",
      );
      expect(screen.getByRole("alert")).toHaveTextContent("ref_409");
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    ["replayed", { replayed: true }, "already signed by you"],
    [
      "another checker",
      { completedByAnotherActor: true },
      "Another authorized checker already signed",
    ],
  ])(
    "renders %s as server-confirmed completion",
    async (_case, result, text) => {
      mockStepUp.mockResolvedValue(stepUpSuccess());
      mockSign.mockResolvedValue(signSuccess(result));
      renderCommand();

      openDialogAndEnterPassword("CurrentPassword!1");
      fireEvent.click(screen.getByRole("button", { name: "Verify and sign" }));

      expect(await screen.findByRole("status")).toHaveTextContent(text);
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    },
  );

  it("blocks duplicate submission while password verification is in flight", async () => {
    let resolveStepUp:
      | ((value: ReturnType<typeof stepUpSuccess>) => void)
      | undefined;
    mockStepUp.mockReturnValue(
      new Promise((resolve) => {
        resolveStepUp = resolve;
      }),
    );
    mockSign.mockResolvedValue(signSuccess());
    renderCommand();

    openDialogAndEnterPassword("CurrentPassword!1");
    const submit = screen.getByRole("button", { name: "Verify and sign" });
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(mockStepUp).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Verifying and signing" }),
    ).toBeDisabled();

    await act(async () => resolveStepUp?.(stepUpSuccess()));
    await waitFor(() => expect(mockSign).toHaveBeenCalledTimes(1));
  });

  it("clears password on cancel and reserves narrow-screen close-control room", () => {
    renderCommand();

    openDialogAndEnterPassword("CurrentPassword!1");
    const title = screen.getByRole("heading", {
      name: "Confirm reconciliation sign-off",
    });
    expect(title.parentElement).toHaveClass("pr-8");
    expect(screen.getByRole("dialog")).toHaveClass(
      "max-h-[calc(100vh-2rem)]",
      "overflow-y-auto",
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: "Review and sign" }));
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });

  it("returns focus to the registered trigger when Escape closes the dialog", async () => {
    renderCommand();

    const trigger = screen.getByRole("button", { name: "Review and sign" });
    trigger.focus();
    fireEvent.click(trigger);
    await waitFor(() =>
      expect(screen.getByLabelText("Password")).toHaveFocus(),
    );

    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveFocus();
  });

  it("fails safely on a thrown transport error without exposing details", async () => {
    mockStepUp.mockRejectedValue(new Error("private transport detail"));
    renderCommand();

    openDialogAndEnterPassword("CurrentPassword!1");
    fireEvent.click(screen.getByRole("button", { name: "Verify and sign" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "could not be signed safely",
    );
    expect(
      screen.queryByText("private transport detail"),
    ).not.toBeInTheDocument();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("renders localized source evidence and command copy in French", () => {
    render(
      <PaymentReconciliationSignOffCommand locale="fr" command={candidate()} />,
    );

    expect(screen.getByText("MTN settlement")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Revoir et valider" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Revoir et valider" }));
    expect(
      screen.getByRole("heading", {
        name: "Confirmer la validation du rapprochement",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/10.000.*FCFA/).length).toBeGreaterThan(0);
  });

  it("contains no persistence, service, browser-storage, or lifecycle authority", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "components/manager-action-center/PaymentReconciliationSignOffCommand.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("stepUpWithPasswordAction");
    expect(source).toContain("signReconciliationRunAction");
    expect(source).toContain(
      "expectedSourceVersionHash: command.source.versionHash",
    );
    expect(source).toMatch(
      /import type[\s\S]*?from "@\/services\/reconciliation\/payment-reconciliation-sign-off-command-state-contracts"/,
    );
    expect(source.match(/@\/services\//g)).toHaveLength(1);
    expect(source).not.toMatch(/@\/lib\/db|@\/prisma|\bPrisma\b/);
    expect(source).not.toMatch(
      /localStorage|sessionStorage|URLSearchParams|console\./,
    );
    expect(source).not.toMatch(
      /revoke|supersede|notification|whatsapp|copilot|certificate/i,
    );
  });
});

function renderCommand() {
  return render(
    <PaymentReconciliationSignOffCommand locale="en" command={candidate()} />,
  );
}

function openDialogAndEnterPassword(password: string) {
  fireEvent.click(screen.getByRole("button", { name: "Review and sign" }));
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: password },
  });
}

function candidate() {
  return {
    commandId: "payment-reconciliation-sign:run-ready-1",
    actionPath: "/dashboard/finance/reconciliation" as const,
    requiredPermission: "payments.reconciliation.sign" as const,
    source: {
      type: "ReconciliationRun" as const,
      id: "run-ready-1",
      status: "READY_FOR_SIGNOFF" as const,
      updatedAt: "2026-07-19T09:30:00.000Z",
      versionHash: `sha256:${"a".repeat(64)}`,
    },
    provider: {
      id: "provider-account-1",
      displayName: "MTN settlement",
      currencyCode: "XAF",
    },
    businessDate: "2026-07-19T00:00:00.000Z",
    periodStart: "2026-07-19T00:00:00.000Z",
    periodEnd: "2026-07-19T23:59:59.999Z",
    makerActorId: "maker-1",
    totals: {
      internalAmount: "10000.00",
      externalAmount: "10000.00",
      matchedAmount: "10000.00",
      suspenseAmount: "0.00",
    },
    matchCount: 1,
    exceptionCount: 0,
  };
}

function stepUpSuccess() {
  return {
    success: true as const,
    data: {
      verifiedAt: "2026-07-19T10:00:00.000Z",
      method: "password" as const,
      assuranceLevel: 1,
    },
    error: null,
    code: null,
    retryAfterSeconds: null,
  };
}

function stepUpFailure(
  code:
    | "VALIDATION_ERROR"
    | "INVALID_CREDENTIALS"
    | "RATE_LIMITED"
    | "AUTH_REQUIRED"
    | "INTERNAL_ERROR",
  retryAfterSeconds: number | null = null,
) {
  return {
    success: false as const,
    data: null,
    error: "Safe authentication failure",
    code,
    retryAfterSeconds,
  };
}

function signSuccess(
  overrides: {
    replayed?: boolean;
    completedByAnotherActor?: boolean;
  } = {},
) {
  return {
    success: true as const,
    data: {
      kind: "PAYMENT_RECONCILIATION_SIGN_OFF",
      replayed: overrides.replayed ?? false,
      completedByAnotherActor: overrides.completedByAnotherActor ?? false,
    },
    error: null,
    status: 200 as const,
  };
}

function signFailure(status: number, code: string) {
  return {
    success: false as const,
    data: null,
    error: "Safe reconciliation failure",
    status,
    code,
    correlationId: `ref_${status}`,
    category: "BUSINESS",
    severity: "ERROR",
    retryable: false,
  };
}
