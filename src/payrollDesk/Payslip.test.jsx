import { render, screen } from "@testing-library/react";
import Payslip from "./Payslip";

const row = {
  name: "Ananya Iyer",
  code: "E101",
  role: "Senior Engineer",
  department: "Engineering",
  bank: "HDFC",
  structureName: "Standard",
  monthlyGross: 145000,
  paidDays: 27,
  totalDays: 30,
  lopDays: 3,
  weeklyOffDays: 8,
  earnings: [{ name: "Basic", amount: 80000 }],
  gross: 80000,
  deductions: [{ name: "Tax", amount: 5000 }],
  totalDeductions: 5000,
  net: 75000,
};

test("follows the existing salary-slip layout and keeps its backend date and signature", () => {
  render(<Payslip row={row} monthLabel="November 2026" runAt="2026-11-26T00:23:00.694" onClose={() => {}} />);

  expect(screen.getByRole("img", { name: "Medora AI Health Care" }))
    .toHaveAttribute("src", "/medora_ai_logo.svg");
  expect(screen.getByText("MEDCARE HOSPITAL")).toBeInTheDocument();
  expect(screen.getByText("PAYSLIP FOR THE MONTH OF NOVEMBER 2026")).toBeInTheDocument();
  expect(screen.getByRole("table", { name: "Employee details" })).toBeInTheDocument();
  expect(screen.getByRole("table", { name: "Attendance summary" })).toBeInTheDocument();
  expect(screen.getByRole("table", { name: "Earnings and deductions" })).toBeInTheDocument();
  expect(screen.getByRole("table", { name: "Net salary" })).toBeInTheDocument();
  expect(screen.getByRole("rowheader", { name: "Employee Code" })).toBeInTheDocument();
  expect(screen.getByRole("rowheader", { name: "Designation" })).toBeInTheDocument();
  expect(screen.getByText("Days in month")).toBeInTheDocument();
  expect(screen.getByText("Weekly offs")).toBeInTheDocument();
  expect(screen.getByText("GROSS EARNINGS")).toBeInTheDocument();
  expect(screen.getByText("TOTAL DEDUCTIONS")).toBeInTheDocument();
  expect(screen.getByText("NET PAY")).toBeInTheDocument();
  expect(screen.getByText("Rupees Seventy Five Thousand Only")).toBeInTheDocument();
  expect(screen.getByText("Date:")).toBeInTheDocument();
  expect(screen.getByText("26/11/2026")).toBeInTheDocument();
  expect(screen.getByText("Authorized signature")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Print / Save PDF" })).toBeInTheDocument();
});

test("shows no generated date when the backend has not processed the payroll", () => {
  render(<Payslip row={row} monthLabel="November 2026" runAt={null} onClose={() => {}} />);

  expect(screen.getByText("Date:")).toBeInTheDocument();
  expect(screen.getByText("Not generated")).toBeInTheDocument();
});
