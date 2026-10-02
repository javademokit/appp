# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts




In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)


## Patient portal and account provisioning

The home page offers separate **Patient login** (`/PatientLogin`) and
**Hospital CRM / HR login** (`/HospitalLogin`) entry pages. Patient sign-in requires the
`PATIENT` role. Hospital CRM sign-in requires an assigned staff or administrator
role and routes staff to the hospital dashboard, where authorized `RECEPTIONIST`
and `CRM_EXECUTIVE` users can book appointments. The existing `/UserLogin`
route remains available for role-based sign-in.

Public account registration always creates a `PATIENT` account. A signed-in
hospital administrator can create staff accounts from **Admin Dashboard → User
access & roles**, with their initial staff roles assigned immediately. Staff
account creation is not exposed on the public CRM login page. For an empty
database, the initial administrator can be provisioned once at startup using
the following environment variables:

For local/testing only, start the backend with the `local` Spring profile:

```text
SPRING_PROFILES_ACTIVE=local ./mvnw spring-boot:run
```

That profile creates `admin@medcare.local` with user ID `admin` and password
`admin12345678` if that email does not exist, even when other user accounts
already exist. It grants the account every supported role so it can open the
hospital/admin dashboard during testing. If that email already exists, the
profile grants all roles to the existing account without changing its password.
Sign in at **Hospital CRM / HR login**. These shared local credentials are not
for production; never activate the `local` profile in a deployed environment.

```text
APP_SECURITY_BOOTSTRAP_ADMIN_ENABLED=true
APP_SECURITY_BOOTSTRAP_ADMIN_USER_ID=<unique-user-id>
APP_SECURITY_BOOTSTRAP_ADMIN_EMAIL=<administrator-email>
APP_SECURITY_BOOTSTRAP_ADMIN_MOBILE=<administrator-mobile>
APP_SECURITY_BOOTSTRAP_ADMIN_PASSWORD=<unique-password-of-at-least-12-characters>
```

Keep these values in the deployment secret manager, not source control. The
bootstrap runs only when the user collection is empty; unset the enable flag
after the initial startup. Existing staff accounts need role assignments by a
super administrator. Older accounts without a stored role are treated as
patients until their roles are provisioned.

For a recovery where an account already exists but no super administrator is
available, an operator can explicitly promote one unique local/test account
email at startup with both `APP_SECURITY_BOOTSTRAP_ADMIN_ENABLED=true` and
`APP_SECURITY_BOOTSTRAP_ADMIN_PROMOTE_EXISTING_EMAIL=<exact-account-email>`.
This adds `SUPER_ADMIN` without changing that account's password. It does not
run unless explicitly enabled, fails if the email is missing or ambiguous,
and should be disabled immediately after the one-time startup.

To give an existing account staff access, open **Admin Dashboard → User access
& roles**, select one or more roles for the account, and click **Save**. The
page lists registered accounts and requires the user to sign out and sign in
again after a role change. A `SUPER_ADMIN` must perform the one-time bootstrap
or recovery before this dashboard can be reached; there is no shared default
CRM administrator password.

The same operation is available through the API:

1. Create the account with **Sign Up** (self-registration starts with the
   `PATIENT` role).
2. Sign in with a `SUPER_ADMIN` account.
3. Using an authenticated API client that preserves the login session cookie
   and CSRF token, send `PUT /api/users/<userId>/roles` with JSON such as:

   ```json
   { "roles": ["DOCTOR"] }
   ```

   Supported staff roles are `DOCTOR`, `NURSE`, `RECEPTIONIST`,
   `CRM_EXECUTIVE`, `BILLING_EXECUTIVE`, `PHARMACIST`, and `LAB_TECHNICIAN`.
   Hospital and clinic administrators can assign patient and staff roles.
   Only `SUPER_ADMIN` can assign `HOSPITAL_ADMIN`, `CLINIC_ADMIN`, or
   `SUPER_ADMIN`; reserve `SUPER_ADMIN` for system administration.
4. Sign out and sign in again so the updated role is loaded into the session.

Role assignment is intentionally not available to ordinary users. The
`userId` in the endpoint is the account's user ID, not its email address.

Doctor accounts must be linked to one existing doctor profile when created, or
an administrator can assign the profile from **User access & roles** after
granting the `DOCTOR` role. Doctor sign-in opens a doctor-specific dashboard
with that doctor's appointments for today. Selecting an appointment opens the
linked patient record and prior consultations; completing a consultation saves
symptoms, vitals, diagnosis, prescription, notes, follow-up date, and orders
selected from the supported laboratory/diagnostic catalog. The backend checks
that the patient appointment belongs to the signed-in doctor's linked profile
before exposing the patient record or saving a consultation.

Patient portal accounts are linked to a patient record by exact account email
(case-insensitive). New patient accounts receive a linked profile, and a
missing profile is created from the signed-in account when the portal is first
opened; duplicate patient emails must be resolved before portal access. Patient
appointment operations derive the Patient ID from that linked record rather
than accepting an ID from the browser.

The hospital dashboard reads the role-protected `/api/dashboard/summary`
endpoint. Its response contains daily/hourly activity buckets and operational
counts only; its Mongo queries project the specific date, status, and ward
fields used to calculate those totals. Appointment bookings also claim a
unique MongoDB slot reservation before saving; cancellations release it, and
startup removes reservations whose appointment was not persisted. This
prevents two concurrent requests from claiming the same slot, but it does not
replace a replica-set transaction for atomically saving patient, appointment,
and reservation data.

These changes establish an authenticated patient booking path and role-aware
UI/API checks; they do not constitute a complete or certified production
medical CRM. Before production use, the remaining requirements—among them
transactional/atomic slot reservation, audit trails, billing, consultations,
MFA, data retention, backup/restore, operational monitoring, and jurisdictional
privacy/security review—must be completed and verified in the deployment
environment.








. Blood Tests
Complete Blood Count (CBC): Measures red and white blood cells, hemoglobin, hematocrit, and platelets.

Blood Chemistry Tests: Check for glucose, electrolytes, kidney and liver function (e.g., blood glucose, electrolytes, creatinine, ALT, AST).

Lipid Profile: Measures cholesterol and triglycerides.

Blood Culture: Detects infections in the bloodstream.

Coagulation Tests: Assess blood clotting ability (e.g., PT, INR, aPTT).

2. Urine Tests
Urinalysis: Checks for infection, blood, protein, glucose, ketones, and other abnormalities.

Urine Culture: Identifies bacteria causing urinary tract infections.

24-Hour Urine Collection: Measures substances like protein or hormones over a day.

3. Imaging Tests
X-ray: Bone fractures, chest imaging, dental checks.

Ultrasound: Soft tissue imaging, fetal monitoring during pregnancy.

CT Scan (Computed Tomography): Detailed cross-sectional images of body.

MRI (Magnetic Resonance Imaging): Soft tissue detail like brain, muscles, joints.

Mammography: Breast tissue imaging for cancer screening.

PET Scan: Shows metabolic activity of tissues, often for cancer detection.

4. Pathology and Biopsy Tests
Tissue Biopsy: Sampling tissue for cancer or infection diagnosis.

Cytology: Examining cells (e.g., Pap smear for cervical cancer screening).

Histopathology: Microscopic examination of biopsied tissue.

5. Genetic Tests
Detect genetic disorders, carrier status, or predisposition to diseases.

Examples: BRCA gene test for breast cancer risk, prenatal genetic screening.

6. Microbiological Tests
Culture and Sensitivity: Identify bacteria/fungi and their antibiotic sensitivity.

Rapid Antigen Tests: For infections like COVID-19, strep throat.

PCR (Polymerase Chain Reaction): Detects DNA/RNA of pathogens, used widely in infectious diseases.

7. Cardiac Tests
Electrocardiogram (ECG/EKG): Heart electrical activity.

Echocardiogram: Ultrasound of the heart.

Stress Test: Assesses heart function under exercise.

8. Allergy Tests
Skin Prick Test: Detects allergic reactions to various substances.

Blood Allergy Test (IgE): Measures specific allergic antibodies.

9. Endocrine Tests
Tests for hormone levels such as thyroid function tests (TSH, T3, T4), cortisol, insulin, etc.

10. Other Specialized Tests
Bone Density Test (DEXA Scan): Measures bone strength for osteoporosis.

Pulmonary Function Tests: Measure lung capacity and airflow.

Lumbar Puncture (Spinal Tap): Collect cerebrospinal fluid for neurological diseases.

## Production API configuration

The React application reads `REACT_APP_API_BASE_URL` at build time. Set it to the deployed API root, including `/api` (for example, `https://api.example.org/api`). If it is omitted from a production build, requests use the same-origin `/api` path; configure the web server to reverse-proxy that path to the Spring Boot service. Development defaults to `http://localhost:7771/api`.

When the API is hosted on a separate origin, configure the backend `app.cors.allowed-origin` property to the exact HTTPS origin serving this application. Keep session cookies secure in production and serve both application and API over HTTPS.

Patient records are created when an appointment is booked. The API returns the canonical `patientId`; subsequent appointments can select that patient, and diagnostics, emergency cases, medication issues, daily updates, and discharge records must reference the same ID.

## Doctor shift attendance

Authorized staff can record a doctor's check-in and check-out from the Staff &
Shifts roster on the scheduled date. The shift stores the attendance timestamps
and changes from `SCHEDULED` to `ON_DUTY` to `COMPLETED`; duplicate or out-of-order
attendance actions are rejected by the backend. Attendance actions are
operator-recorded and are not biometric or doctor-self-service verification.
