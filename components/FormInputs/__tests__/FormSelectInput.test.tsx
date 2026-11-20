import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocale } from "next-intl";
import { useState } from "react";
import FormSelectInput from "../FormSelectInput";

jest.mock("lucide-react", () => ({
  Check: () => null,
  ChevronsUpDown: () => null,
  Plus: () => null,
}));

jest.mock("next-intl", () => ({ useLocale: jest.fn() }));

const cashier = { value: "cashier-role", label: "Cashier" };
const stockManager = { value: "warehouse-role", label: "Inventory Manager" };

function ControlledRolePicker() {
  const [option, setOption] = useState(cashier);

  return (
    <FormSelectInput
      label="User Roles"
      options={[cashier, stockManager]}
      option={option}
      setOption={setOption}
    />
  );
}

beforeEach(() => {
  HTMLElement.prototype.scrollIntoView ??= jest.fn();
  jest.mocked(useLocale).mockReturnValue("en");
});

test("finds a role by its display label and selects it with the keyboard", async () => {
  render(<ControlledRolePicker />);

  await userEvent.click(screen.getByRole("button", { name: "User Roles: Cashier" }));
  const search = screen.getByRole("combobox", { name: "User Roles" });
  await userEvent.type(search, "Inventory");

  expect(screen.queryByRole("option", { name: "Cashier" })).not.toBeInTheDocument();
  expect(screen.getByRole("option", { name: "Inventory Manager" })).toBeVisible();
  await userEvent.keyboard("{Enter}");

  expect(screen.getByRole("button", { name: "User Roles: Inventory Manager" })).toHaveFocus();
  expect(screen.queryByRole("combobox", { name: "User Roles" })).not.toBeInTheDocument();
});

test("shows the role search prompt and empty state in French", async () => {
  jest.mocked(useLocale).mockReturnValue("fr");
  render(<ControlledRolePicker />);

  await userEvent.click(screen.getByRole("button", { name: "User Roles: Cashier" }));
  await userEvent.type(screen.getByPlaceholderText("Rechercher un rôle…"), "comptable");

  expect(screen.getByText("Aucun rôle correspondant.")).toBeVisible();
});
