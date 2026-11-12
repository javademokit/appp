# Medora AI UI use cases

This guide describes the user-facing routes and the pages reachable from their
navigation. It is based on the current React application routes and role-aware
menus. Some workspaces contain modal forms and tables rather than separate URL
routes; they are documented as sections of their parent page.

## Roles and access

The application uses these account roles: `SUPER_ADMIN`, `HOSPITAL_ADMIN`,
`CLINIC_ADMIN`, `DOCTOR`, `NURSE`, `HEAD_NURSE`, `RECEPTIONIST`,
`CRM_EXECUTIVE`, `BILLING_EXECUTIVE`, `FINANCE`, `HR`, `PHARMACIST`,
`LAB_TECHNICIAN`, and `PATIENT`.

Protected routes require a signed-in account with an allowed role. If the
session is missing, the user is sent to sign-in. If the account has the wrong
role, the route shows an access-denied message. Dashboard navigation hides
sections the signed-in role cannot use, and page actions are additionally
checked by the API.

## Route directory

| Route | Access | Use case |
|---|---|---|
| `/` | Public | Learn about Medora AI, explore the public feature summary, open portal login, or use the basic site assistant. |
| `/UserLogin` | Public | Sign in to the portal associated with the account's assigned role. |
| `/PatientLogin` | Public | Patient-specific sign-in entry; successful patient accounts open the Patient Portal. |
| `/DoctorLogin` | Public | Doctor-specific sign-in entry; successful doctor accounts open the Doctor Dashboard. |
| `/HospitalLogin` | Public | Hospital staff sign-in entry; successful accounts open the hospital or administrator workspace according to role. |
| `/SignUpPage` | Public | Register a patient login account. |
| `/AmbulanceDriver` | Public, one-time pairing code required | Pair a driver's phone with a dispatched vehicle and share or stop GPS location sharing. |
| `/PatientPortal` | `PATIENT` | Update the patient profile, book an appointment, and review the patient's own bookings. |
| `/DoctorDashboard` | `DOCTOR` | Review assigned appointments and patients, complete consultations, and record shift attendance. |
| `/HospitalDashboard` | Hospital staff roles (not `DOCTOR`-only) | Access role-specific reception, clinical operations, nursing, staffing, finance, and administration workflows. |
| `/AdminDashboard` | `SUPER_ADMIN`, `HOSPITAL_ADMIN`, `CLINIC_ADMIN` | Monitor operations and administer users, employees, HR/payroll, and salary setup. |
| `/PayrollPortal` | Hospital staff roles and `DOCTOR` | Open HR/payroll pages allowed to the account, primarily payslips and overtime. Administrator overtime links redirect to the administrator payroll view; the payslips route redirects to the administrator dashboard. |

## Public pages

### Home — `/`

- **Purpose:** Introduce the product and help visitors choose a portal.
- **Actions:** Jump to feature/module sections, open Hospital Login, request a
  demo/free-trial discussion, or ask the built-in assistant about basic
  appointment, doctor, emergency, or hospital topics.
- **Inputs and rules:** Assistant questions are free text. Empty questions are
  ignored. Demo/trial requests show guidance to contact a hospital
  administrator; they do not submit a sales lead.
- **Outcome:** The visitor stays on the public landing page or follows the
  relevant login link.

### Sign-in — `/UserLogin`, `/PatientLogin`, `/DoctorLogin`, `/HospitalLogin`

- **Purpose:** Authenticate an existing account and route it to an authorized
  workspace.
- **Actions:** Enter email and password, submit, and follow the role-specific
  destination.
- **Inputs and rules:** Email and password are required. The selected portal
  must match an assigned role; unsupported or missing roles produce an
  actionable error instead of granting access.
- **Outcome:** Patient accounts open `/PatientPortal`; doctor accounts open
  `/DoctorDashboard`; other staff open `/HospitalDashboard`; administrators
  can open the administration workspace.

### Patient registration — `/SignUpPage`

- **Purpose:** Create a patient login account.
- **Actions:** Enter a user ID, email, mobile number, and password.
- **Inputs and rules:** All fields are required; password must be at least 12
  characters. The account receives the `PATIENT` role. Duplicate email/user ID
  and server validation errors are shown to the user.
- **Outcome:** The patient account and linked patient record are created, then
  the visitor can sign in. Age, gender, date of birth, and address can be
  completed in the Patient Portal.

### Ambulance driver location — `/AmbulanceDriver`

- **Purpose:** Share the current vehicle location with dispatch from a driver's
  phone.
- **Actions:** Enter a dispatcher-issued one-time pairing code; after pairing,
  start or stop GPS sharing, or unpair the phone.
- **Inputs and rules:** Pairing code is required and expires after 10 minutes.
  Location sharing requires browser location permission and an active page.
- **Outcome:** The paired vehicle displays its current location to dispatch
  while sharing is active. Closing or suspending the page may pause updates.

## Patient workspace

### Patient Portal — `/PatientPortal`

- **Purpose:** Let a signed-in patient maintain their profile and manage
  bookings linked to their patient record.
- **Profile actions:** Review the patient name and ID, enter or update age,
  gender, date of birth, address, PAN, Aadhaar number, and postal code, then save.
- **Profile validation:** Age is a whole number from 0 to 150; date of birth is
  required and cannot be in the future; gender and address are required. PAN,
  Aadhaar, and postal code are optional; entered values are format-validated.
  PAN and Aadhaar are encrypted at rest and shown only in masked form. The
  backend requires `PATIENT_IDENTIFIER_ENCRYPTION_KEY` to be configured with
  a base64-encoded 256-bit key before either identifier can be saved.
- **Appointment actions:** Book for yourself, search for an existing patient
  by name alone or narrow the search with the patient's mobile number, or enter
  details for a new patient. Select a
  doctor, date, and available time; optionally enter a visit reason. Review
  appointment status and payment summary; download a confirmation for a
  confirmed booking.
- Profile completion is not required before booking. A patient name is required
  for every booking; an existing patient's full mobile number is verified before
  linking their record.
- **Patient lookup:** Existing patient results are returned only after the
  entered name and mobile number match. The portal displays limited identity
  details and a masked mobile number. New patient records get a separate
  Patient ID and are not linked to the signed-in account.
- **Appointment validation:** A doctor, non-past date, and available time are
  required. Availability is loaded for the selected doctor/date. Patients can
  pay an outstanding appointment invoice through the configured Razorpay
  checkout, which may offer UPI apps such as Google Pay or Paytm depending on
  gateway configuration; otherwise, payment can be made at reception.
- **Outcome:** Profile changes are saved to the linked patient record.
  Successful bookings appear in the appointment table and are associated with
  the patient's existing Patient ID. Each booking receives the next
  hospital-wide token number for its appointment date, starting at `001` each
  day; existing bookings without tokens are assigned numbers during backend
  startup migration. Tokens are also shown on the confirmation.
- **Identifiers:** New Patient IDs use `PT-` plus six digits. New
  appointment references use `YYYYMMDD-######` (the appointment date followed
  by six digits). Existing IDs and legacy appointment references are retained
  to preserve links to historical clinical and billing records.

## Doctor workspace

### Doctor Dashboard — `/DoctorDashboard`

- **Purpose:** Provide a doctor's assigned schedule and a patient-specific
  clinical workflow.
- **Attendance:** Review assigned shifts and record check-in/check-out when the
  scheduled shift is eligible. The server enforces the shift and action order.
- **Appointments:** Review appointments assigned to the linked doctor profile;
  open an appointment's patient record.
- **Patient 360:** Review the patient's available medical history and
  prescriptions for patients with appointments assigned to this doctor.
- **Consultation:** Record required diagnosis and optional symptoms, vitals,
  prescription text, medication orders, lab/diagnostic orders, notes, and
  follow-up date. Medication selection uses the pharmacy catalog.
- **Validation and access:** Only the assigned doctor profile can open the
  appointment's patient record or submit its consultation. Required
  medication fields and diagnosis must be completed when used.
- **Outcome:** A completed consultation is saved against the appointment and
  patient; medication orders enter the pharmacy workflow. The doctor may print
  the generated prescription.
- **Linked sections:** My payslips and overtime open the role-filtered
  Payroll Portal.

## Hospital workspace

The hospital workspace is a single route with a role-filtered sidebar. The
following entries are rendered as pages inside `/HospitalDashboard`.

### Dashboard

- **Purpose:** Show the live operations overview.
- **Actions:** Select Today, 7 days, or 30 days; refresh.
- **Data and outcome:** Shows aggregate appointment, emergency, diagnostics,
  admission, and bed activity. The board refreshes periodically. An unavailable
  API is reported as an error rather than showing fabricated live data.

### Book Appointment

- **Access:** Reception, CRM, and administrator roles.
- **Purpose:** Create a booking for an existing patient or register another
  patient who shares a mobile number.
- **Actions:** Search/select a patient, select a doctor/date/available time, add
  visit details, and submit. The UI can also start a configured payment
  checkout.
- **Inputs and rules:** Patient identity and required patient details for a new
  patient, optional PAN/Aadhaar/postal code, doctor, appointment date/time, and
  availability are checked. PAN/Aadhaar are encrypted at rest and only returned
  masked; saving them requires `PATIENT_IDENTIFIER_ENCRYPTION_KEY` on the
  backend. The API prevents booking a slot already reserved by another booking.
- **Outcome:** Creates an appointment and its invoice; the receipt shows the
  appointment reference, daily token number, Patient ID, visit, fee, and payment state.

### Patients

- **Purpose:** Search patient records and perform permitted admission and nurse
  assignment tasks.
- **Actions:** Search by patient information; admit an existing patient to a
  selected ward/bed; add a patient to a bed waiting list; assign an eligible
  nurse where permitted.
- **Inputs and rules:** Admission requires a patient, ward, and vacant bed.
  Bed availability, room/gender restrictions, nurse eligibility, and capacity
  are validated by the API. Waiting-list requests require a patient and ward.
- **Outcome:** The patient retains the same Patient ID. Admission may
  automatically assign an on-duty nurse; if none is eligible, the patient is
  shown as needing assignment.

### Appointments

- **Purpose:** Review and search appointment records, confirm paid bookings, or
  cancel eligible bookings.
- **Actions:** Search by patient or doctor, review booking and payment details,
  confirm/cancel, or record cash received before confirming when a balance is
  due.
- **Inputs and rules:** Cash recording is an attestation that funds have
  actually been received. The API checks invoice balance and appointment
  status.
- **Outcome:** Appointment and invoice status update; the date-coded
  appointment reference is displayed for new bookings.

### Doctors

- **Purpose:** View the doctor information page.
- **Current behavior:** This view currently presents a static sample doctor
  directory; use **Doctor Schedule** to manage live doctor profiles and
  availability.

### Reports

- **Purpose:** View the available appointment or attendance report and select
  rows for printing.
- **Actions:** Choose a report type, select rows, and print selected records.
- **Current behavior:** The report viewer currently uses in-page sample data;
  it is not an authoritative live export.

### Billing & Payments

- **Purpose:** Review appointment invoices and record received payments.
- **Actions:** Search/filter invoices, export CSV, record an amount/method and
  receipt or transaction reference, or open a configured online payment
  checkout.
- **Inputs and rules:** A payment amount must be positive and cannot exceed
  outstanding balance. Supported received methods are shown in the form.
- **Outcome:** The invoice balance/status updates; payment records remain
  attached to the invoice and appointment.

### Discharge & Claims

- **Purpose:** Coordinate the inpatient discharge workflow.
- **Actions:** Start a discharge plan, record clinical clearance, submit an
  insurance claim, record an insurer decision, and record cash or online
  payment.
- **Inputs and rules:** The plan is linked to an admitted patient. Clinical,
  payer, and payment steps must satisfy their status rules before the
  discharge can be completed.
- **Outcome:** The case advances through review and payment; successful
  discharge releases the patient from the admission workflow.

### Doctor Schedule

- **Purpose:** Manage the live doctor/profile roster and appointment
  availability.
- **Actions:** Search the clinician roster; add an employee-linked doctor or a
  standalone doctor profile; update specialty, department, fee, and available
  time slots.
- **Inputs and rules:** Employee-linked doctors must select an existing doctor
  employee. New profiles require the displayed identity/specialty and valid
  availability values.
- **Outcome:** Saved doctor profiles and schedules drive patient booking and
  the doctor's assigned dashboard.

### Staff & Shifts

- **Purpose:** Schedule staff shifts, with nurse selection as the primary
  workflow.
- **Actions:** Select an existing nurse or create a walk-in nurse, then enter
  shift date, time, department, and related details. Review the roster; cancel
  eligible shifts.
- **Inputs and rules:** Existing staff are selected from HR records. Walk-ins
  require the displayed identity/contact details and are created once as a
  nurse employment record; the same nurse ID can be reused for multiple
  non-overlapping shifts. Shift dates/times and overlaps are validated.
- **Outcome:** A saved roster entry is associated with the nurse's stable
  employee ID.

### Nurse Management

- **Purpose:** Maintain nurse profiles and manage patient-care assignments.
- **Manager actions:** Review nurse roster/profile readiness; create or complete
  a profile for an existing nurse identity; assign primary/backup nurses to
  patients or assign a nurse to a ward/bed range; review assignment history and
  overdue care tasks; add patient notes; transfer a patient to a vacant bed;
  export a report as CSV or print/save as PDF.
- **Nurse actions:** View only assigned patients; record a note, vital,
  medication, or task; send handover details; acknowledge incoming handovers;
  request a shift swap. Head Nurses/managers review eligible swap requests.
- **Inputs and rules:** Nurse identity comes from active nurse employment.
  Assignments require eligible nurses and respect ward workload rules.
  Transfers require a vacant target bed. Shift swaps require valid rostered
  nurses and approval.
- **Outcome:** Care activity, handovers, assignments, and roster changes are
  persisted against the same nurse and patient identities.

### Ward Management

- **Purpose:** Configure wards, rooms, beds, and inpatient occupancy.
- **Actions:** Create/edit wards; create a room and its beds or create a room
  range; configure bed type, room category, AC status, gender restriction,
  capacity, amenities, and status; filter the bed board; reserve, block, or
  mark beds for maintenance; complete cleaning; review bed history and the
  admission waiting list.
- **Inputs and rules:** Room creation requires a ward and room details.
  Admissions require a vacant, compatible bed. Beds released after a transfer
  or discharge remain in Cleaning until marked clean.
- **Outcome:** The live bed board reflects occupancy and availability; matched
  waiting-list requests are visible to staff.

### Nurse Assignments

- **Access:** Nurse and Head Nurse.
- **Purpose:** Find a nurse record and review its active patient assignments.
- **Actions:** Search by nurse ID, name, or mobile number; select the nurse.
- **Inputs and rules:** The selectable directory contains active nurse
  employments with completed profiles.
- **Outcome:** Displays assigned patients, ward/bed, shift/role, admission date,
  and recorded allergies.

### Overtime Requests

- **Access:** Nurses can submit/view their own requests. HR, CRM, and hospital
  administrators can review and decide requests.
- **Purpose:** Submit overtime for review and allowance processing.
- **Actions:** A nurse submits an overtime date, hours, and reason; a reviewer
  filters by payroll month and approves an amount or rejects the request.
- **Inputs and rules:** Date must not be in the future; hours must be positive
  and no more than 24; reason is required. Requests cannot be changed after
  payroll calculation begins.
- **Outcome:** Status and reviewer decision are recorded. Approved allowances
  are included in the matching draft payroll.

### My payslips

- **Purpose:** Allow staff to review their own payslips; authorized payroll
  roles can access broader payroll views.
- **Actions:** Select a pay period, open payslip details, and download the
  available PDF.
- **Inputs and rules:** Results are limited to the signed-in employee unless
  the account has payroll-management access.
- **Outcome:** Displays the available payslip without exposing another
  employee's record to ordinary staff.

### Pharmacy

- **Purpose:** Manage medication stock, purchasing, prescriptions, dispensing,
  and pharmacy billing.
- **Actions:** Add medication; review stock/reorder warnings; create purchase
  orders; review doctor prescriptions and print them; manage prescription
  issues and medication bills.
- **Inputs and rules:** Medication, supplier/order, prescription, and issue
  forms require the fields marked by the UI. Quantities and stock movement are
  validated by the API.
- **Outcome:** Stock and prescription issue records update; issued medicines
  remain linked to the patient/clinical prescription.

### Lab & Diagnostics

- **Purpose:** Track diagnostic orders and results from order through doctor
  review.
- **Actions:** Create an order, track its worklist/sample, record a result,
  attach a report, and submit a result for doctor review/approval.
- **Inputs and rules:** Orders and result/report actions are linked to a
  patient/order. Required result and file inputs are checked before submission.
- **Outcome:** Worklist status and result review state update; reports are
  available on the related order.

### Triage & Emergency

- **Purpose:** Register and prioritize emergency arrivals.
- **Actions:** Select a patient, set severity, add the case to the queue, and
  update queue status, ambulance state, or transfer state.
- **Inputs and rules:** Patient selection is required. Severity and status
  transitions use the available options; ambulance and transfer steps are
  tracked separately.
- **Outcome:** The emergency queue reflects priority and response/transfer
  progress.

### Ambulance Booking & Fleet

- **Purpose:** Organize ambulance branches/vehicles, book patient transport,
  and track dispatch.
- **Actions:** Add a branch, register a vehicle/driver, book transport for an
  existing patient, review bookings/fleet, assign dispatch resources, and
  track reported vehicle location.
- **Inputs and rules:** A booking selects an existing patient. Fare is
  calculated from distance and the configured per-kilometer rate. Dispatch
  availability and payment state are checked.
- **Outcome:** Booking and fleet status are visible to dispatch; a driver can
  pair a phone from `/AmbulanceDriver` using the one-time code.

### Ambulance Billing

- **Access:** Billing Executive, Finance, and hospital administrators.
- **Purpose:** Reconcile ambulance collections, cash awaiting confirmation,
  refunds, and booking balances.
- **Actions:** Review the six-month collection/refund trend, confirm received
  cash, and inspect the payment ledger.
- **Inputs and rules:** Cash bookings are not treated as collected until
  receipt is confirmed; unpaid bookings cannot be dispatched.
- **Outcome:** Ledger and collection totals reflect confirmed receipts and
  refund status.

### Settings

- **Purpose:** Maintain the employee organization setup used by HR workflows.
- **Actions:** Switch between Departments and Designations; search/filter,
  create, edit, activate, or deactivate a record.
- **Inputs and rules:** Name/code and related department fields are validated;
  a designation is associated with its department. In-use records may not be
  deactivated.
- **Outcome:** Updated organization values become selectable in employee and
  schedule forms.

## Administrator workspace

### Administration — `/AdminDashboard`

- **Access:** `SUPER_ADMIN`, `HOSPITAL_ADMIN`, and `CLINIC_ADMIN`.
- **Operations:** Review live summary metrics and activity charts; change the
  date range or refresh.
- **Users & access:** Create a patient or staff account, choose staff roles,
  link/create a doctor profile when assigning the Doctor role, review accounts,
  assign roles, or link a doctor profile. Passwords must meet the displayed
  minimum length. Only `SUPER_ADMIN` can grant administrator roles; users
  cannot edit their own role assignment.
- **Employees:** Open the HR employee master to add/edit employees, view
  details, and search by name, ID, or employee type. Nurse employees receive
  `NR-` IDs when newly created; legacy IDs remain unchanged.
- **HR & payroll:** Open the HR/payroll pages listed below.
- **Salary setup:** Configure salary components and assign effective-dated
  salary structures to employees.
- **Outcome:** Account, access, employee, and salary changes are saved to their
  corresponding backend records. The account must sign in again after its
  roles are changed.

## HR & payroll sections

These pages appear in `/PayrollPortal` or as embedded sections of the
administrator workspace. Availability depends on role.

| Section | Who uses it | Main use case and outcome |
|---|---|---|
| Dashboard | HR/admin | Review employee totals, attendance, payroll-cycle summary, and pending actions for the selected month. |
| Employees | HR/admin | Add/edit employee identity, employment, statutory identifiers, professional details, and optional onboarding documents; search and open employee details. New nurses receive `NR-` employee IDs. |
| Organization | HR/admin | Configure employee types, departments, designations, and shifts used by HR forms. |
| Attendance | HR/admin | Record and review attendance by employee/date, status, worked hours, and overtime hours; duplicate employee/date records are rejected. |
| Leave | Staff; approval actions for HR/admin | Submit a leave request with type, dates, and reason; reviewers approve or reject pending requests. |
| Salary | HR/admin/Finance | Create earning/deduction components and assign salary structures with effective dates and component amounts. |
| Payroll | HR/admin/Finance; CRM can review/approve | Create or continue a monthly payroll run, calculate it, request approval, review/approve/reject, generate payslips, and mark as paid in the allowed workflow order. A maker cannot approve their own run. |
| Overtime allowances | Staff request; HR/admin/CRM review | Submit or review overtime claims and record approval amount/rejection. |
| Payslips | Staff; payroll roles can manage broader views | View payslips and download PDF details for the accessible employee scope. |
| Reports | HR/admin/Finance | Choose a payroll month and export the HR report as CSV. |

## Identifiers and record-linking rules

- A Patient ID is `PT-` followed by six digits for new patient records.
- A new appointment display ID is `YYYYMMDD-######`; the date prefix is the
  appointment date and the suffix is six digits.
- The appointment's database ID remains an internal key used by API routes,
  invoices, consultations, and reservation logic. The display ID is not a
  replacement for that key.
- Previously stored Patient IDs and appointment references are not rewritten.
  Historical rows without the new appointment display ID are labelled as
  legacy bookings in the UI.
- Nurse employee IDs are `NR-` for new HR nurses and `NR-WK-` for walk-in
  nurses. Existing nurse IDs remain unchanged to preserve their links.

## Error, validation, and completion behavior

- Required fields and basic numeric/date constraints are checked in forms and
  validated again by the API.
- Failed requests should display the API's explanatory message where
  available; a failed action does not count as a successful save.
- Successful saves update the relevant list/profile and show a success
  confirmation. Refresh is available on data-heavy pages.
- Sensitive clinical and administrative operations are role-scoped by both
  the interface and backend. Use only the access assigned to the account.
