import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import EmployeeOnboarding from "./EmployeeOnboarding";
import { api } from "../payrollDesk/payrollApi";

jest.mock("../payrollDesk/payrollApi", () => ({
  api: {
    employees: jest.fn(),
    structures: jest.fn(),
    employeeRoles: jest.fn(),
    saveEmployeeOnboarding: jest.fn(),
    employeeProfilePicture: jest.fn(),
    uploadEmployeeProfilePicture: jest.fn(),
    uploadEmployeeDocument: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  URL.createObjectURL = jest.fn(() => "blob:profile-picture");
  URL.revokeObjectURL = jest.fn();
  api.employees.mockResolvedValue([]);
  api.structures.mockResolvedValue([{ id: 4, name: "Hospital Standard" }]);
  api.employeeRoles.mockResolvedValue([
    "Doctor", "Nurse", "HKP", "IT Engineer", "OPD", "OTT", "HR Manager",
  ]);
  api.saveEmployeeOnboarding.mockResolvedValue({ id: 101 });
  api.employeeProfilePicture.mockResolvedValue(null);
  api.uploadEmployeeProfilePicture.mockResolvedValue({
    contentType: "image/png",
    size: 12,
    uploadedAt: "2026-11-26T00:00:00Z",
  });
  api.uploadEmployeeDocument.mockResolvedValue({
    type: "pan",
    label: "PAN card",
    contentType: "application/pdf",
    size: 12,
    uploadedAt: "2026-11-26T00:00:00Z",
  });
});

test("shows professional credentialing fields for clinical roles", async () => {
  render(<EmployeeOnboarding />);

  await screen.findByRole("heading", { name: "Joining details" });
  fireEvent.change(screen.getByLabelText(/Job title \/ role/), { target: { value: "Doctor" } });

  expect(screen.getByText("03 · Clinical credentialing")).toBeInTheDocument();
  expect(screen.getByLabelText(/Registration council \/ board/)).toBeRequired();
  expect(screen.getByLabelText(/Professional registration number/)).toBeRequired();
});

test("suggests the supported clinical, facilities, and operations roles", async () => {
  render(<EmployeeOnboarding />);

  await screen.findByRole("heading", { name: "Joining details" });

  await waitFor(() => {
    const roleInput = screen.getByLabelText(/Job title \/ role/);
    const roleList = document.getElementById(roleInput.getAttribute("list"));
    expect(Array.from(roleList.querySelectorAll("option"), (option) => option.value))
      .toEqual(["Doctor", "Nurse", "HKP", "IT Engineer", "OPD", "OTT"]);
  });
});

test("suggests Pediatrics and Nephrology departments", async () => {
  render(<EmployeeOnboarding />);

  await screen.findByRole("heading", { name: "Joining details" });

  const departmentInput = screen.getByLabelText("Department Required");
  const departmentList = document.getElementById(departmentInput.getAttribute("list"));
  const departments = Array.from(departmentList.querySelectorAll("option"), (option) => option.value);
  expect(departments).toEqual(expect.arrayContaining([
    "Pediatrics",
    "Nephrology",
    "Pediatric Nephrology",
  ]));
});

test("saves a joining record and uploads its PAN and degree documents", async () => {
  render(<EmployeeOnboarding />);

  await screen.findByRole("heading", { name: "Joining details" });
  fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: "Mira Shah" } });
  fireEvent.change(screen.getByLabelText(/Work email/), { target: { value: "mira@hospital.test" } });
  fireEvent.change(screen.getByLabelText(/Phone number/), { target: { value: "+91 98765 43210" } });
  fireEvent.change(screen.getByLabelText("Department Required"), { target: { value: "Human Resources" } });
  fireEvent.change(screen.getByLabelText(/Job title \/ role/), { target: { value: "HR Manager" } });
  fireEvent.change(screen.getByLabelText(/Monthly gross salary/), { target: { value: "65000" } });
  fireEvent.change(screen.getByLabelText(/Bank account number/), { target: { value: "123456789012" } });
  fireEvent.change(screen.getByLabelText(/IFSC code/), { target: { value: "HDFC0001234" } });
  fireEvent.change(screen.getByLabelText(/Branch name/), { target: { value: "MG Road" } });
  fireEvent.change(screen.getByLabelText(/Bank city/), { target: { value: "Bengaluru" } });
  const profilePicture = new File(["sample"], "profile.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Upload profile picture"), { target: { files: [profilePicture] } });
  const panDocument = new File(["sample"], "pan-card.pdf", { type: "application/pdf" });
  fireEvent.change(screen.getByLabelText("Upload PAN card"), { target: { files: [panDocument] } });
  const degreeDocument = new File(["sample"], "degree-certificate.pdf", { type: "application/pdf" });
  fireEvent.change(screen.getByLabelText("Upload Degree certificate"), { target: { files: [degreeDocument] } });

  fireEvent.click(screen.getByRole("button", { name: "Save joining record" }));

  await waitFor(() => expect(api.saveEmployeeOnboarding).toHaveBeenCalledWith(expect.objectContaining({
    name: "Mira Shah",
    department: "Human Resources",
    role: "HR Manager",
    workEmail: "mira@hospital.test",
    phone: "+91 98765 43210",
    bankAccountNumber: "123456789012",
    ifscCode: "HDFC0001234",
    bankBranchName: "MG Road",
    bankCity: "Bengaluru",
    monthlyGross: 65000,
    structureId: 4,
  })));
  await waitFor(() => expect(api.uploadEmployeeProfilePicture).toHaveBeenCalledWith(101, profilePicture));
  await waitFor(() => expect(api.uploadEmployeeDocument).toHaveBeenCalledWith(101, "pan", panDocument));
  await waitFor(() => expect(api.uploadEmployeeDocument).toHaveBeenCalledWith(101, "degree", degreeDocument));
});
