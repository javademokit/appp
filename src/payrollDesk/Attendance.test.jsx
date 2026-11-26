import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Attendance from "./Attendance";
import { api } from "./payrollApi";

jest.mock("./payrollApi", () => ({
  api: {
    attendance: jest.fn(),
    setAttendance: jest.fn(),
  },
}));

test("filters by hospital staff role and saves an attendance change for the selected month", async () => {
  const employee = {
    employeeId: 12,
    code: "E112",
    name: "Asha Rao",
    department: "Nursing",
    role: "Nurse",
    days: Array(30).fill("P"),
  };
  api.attendance.mockResolvedValue({
    processed: false,
    daysInMonth: 30,
    employees: [employee, { ...employee, employeeId: 13, code: "E113", name: "Dev Shah", role: "IT Engineer" }],
  });
  api.setAttendance.mockResolvedValue(null);

  render(<Attendance month="2026-11" monthLabel="November 2026" notify={jest.fn()} />);

  await waitFor(() => expect(screen.getByText("Asha Rao")).toBeInTheDocument());
  expect(screen.getByText("E112 · Nurse · Nursing")).toBeInTheDocument();
  fireEvent.change(screen.getByRole("searchbox", { name: "Search attendance employees" }), {
    target: { value: "IT Engineer" },
  });
  expect(screen.getByText("Dev Shah")).toBeInTheDocument();
  expect(screen.queryByText("Asha Rao")).not.toBeInTheDocument();

  fireEvent.change(screen.getByRole("searchbox", { name: "Search attendance employees" }), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Asha Rao day 2: Present" }));

  await waitFor(() => expect(api.setAttendance).toHaveBeenCalledWith({
    employeeId: 12,
    date: "2026-11-02",
    status: "ABSENT",
  }));
});
