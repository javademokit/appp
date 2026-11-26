import { render, screen, waitFor } from "@testing-library/react";
import Structures from "./Structures";
import { api } from "./payrollApi";

jest.mock("./payrollApi", () => ({
  api: {
    structures: jest.fn(),
    employees: jest.fn(),
    previewStructure: jest.fn(),
    saveStructure: jest.fn(),
    deleteStructure: jest.fn(),
  },
}));

test("starts an empty structure form when the backend has no saved structures", async () => {
  api.structures.mockResolvedValue([]);
  api.employees.mockResolvedValue([]);
  render(<Structures notify={jest.fn()} />);

  await waitFor(() => expect(screen.getByLabelText("Template name")).toHaveValue(""));
  expect(screen.getByLabelText(/Basic is/).value).toBe("");
  expect(screen.getByLabelText(/Gross/).value).toBe("");
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  expect(api.previewStructure).not.toHaveBeenCalled();
});
