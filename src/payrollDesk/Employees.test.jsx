import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Employees from "./Employees";
import { api } from "./payrollApi";

jest.mock("./payrollApi", () => ({
  api: {
    employees: jest.fn(),
    structures: jest.fn(),
    employeeRoles: jest.fn(),
    saveEmployee: jest.fn(),
  },
}));

beforeEach(() => {
  api.employees.mockResolvedValue([]);
  api.structures.mockResolvedValue([{ id: 5, name: "Hospital staff" }]);
  api.employeeRoles.mockResolvedValue(["Nurse", "MD / Consultant", "Ambulance Driver"]);
  api.saveEmployee.mockResolvedValue({});
});

test("adds a hospital employee with a backend role suggestion and salary structure", async () => {
  render(<Employees notify={jest.fn()} />);

  await waitFor(() => expect(document.querySelector("#employee-role-options option[value='Ambulance Driver']")).toBeInTheDocument());
  expect(screen.getByLabelText("Role")).toHaveAttribute("list", "employee-role-options");

  fireEvent.change(screen.getByLabelText("Employee name"), { target: { value: "Asha Rao" } });
  fireEvent.change(screen.getByLabelText("Department"), { target: { value: "Nursing" } });
  fireEvent.change(screen.getByLabelText("Role"), { target: { value: "Nurse" } });
  fireEvent.change(screen.getByLabelText("Monthly gross"), { target: { value: "52000" } });
  fireEvent.change(screen.getByLabelText("Salary structure"), { target: { value: "5" } });
  fireEvent.change(screen.getByLabelText("Bank or payment reference"), { target: { value: "Bank ••1234" } });
  fireEvent.click(screen.getByRole("button", { name: "Add" }));

  await waitFor(() => expect(api.saveEmployee).toHaveBeenCalledWith({
    name: "Asha Rao",
    department: "Nursing",
    role: "Nurse",
    monthlyGross: 52000,
    structureId: 5,
    bank: "Bank ••1234",
  }));
});

test("does not allow adding an employee without a salary structure", async () => {
  api.structures.mockResolvedValue([]);
  render(<Employees notify={jest.fn()} />);

  await waitFor(() => expect(screen.getByText("Create a salary structure before adding employees.")).toBeInTheDocument());
  expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
});
