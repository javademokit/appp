import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, CheckCircle2, ClipboardCheck, Search, UserRoundPlus, UsersRound } from "lucide-react";
import { api } from "../payrollDesk/payrollApi";
import "./EmployeeOnboarding.css";

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Locum", "Trainee", "Temporary"];
const MAX_PROFILE_PICTURE_SIZE = 5 * 1024 * 1024;
const ROLE_SUGGESTIONS = ["Doctor", "Nurse", "HKP", "IT Engineer", "OPD", "OTT"];
const DEPARTMENTS = [
  "Emergency & Trauma", "General Medicine", "Nursing", "Surgery", "Cardiology", "Pediatrics",
  "Nephrology", "Pediatric Nephrology", "ICU",
  "Radiology", "Laboratory", "Pharmacy", "Ambulance Services", "Human Resources",
  "Finance", "Information Technology", "Administration", "Facilities",
];
const BASE_CHECKS = [
  ["identityVerified", "Identity documents reviewed"],
  ["contractSigned", "Employment agreement signed"],
  ["orientationComplete", "Hospital and safety orientation completed"],
  ["systemAccessProvisioned", "Required system access provisioned"],
];
const EMPLOYEE_DOCUMENTS = [
  ["aadhaar", "Aadhaar card"],
  ["pan", "PAN card"],
  ["salary-slip", "Previous salary slip"],
  ["degree", "Degree certificate"],
];

function localToday() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function blankForm(structureId = "") {
  return {
    name: "",
    department: "",
    role: "",
    joiningDate: localToday(),
    employmentType: "Full-time",
    workEmail: "",
    phone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    monthlyGross: "",
    structureId: structureId ? String(structureId) : "",
    bank: "",
    bankAccountNumber: "",
    ifscCode: "",
    bankBranchName: "",
    bankCity: "",
    registrationCouncil: "",
    professionalRegistrationNo: "",
    registrationExpiryDate: "",
    identityVerified: false,
    professionalCredentialVerified: false,
    contractSigned: false,
    orientationComplete: false,
    systemAccessProvisioned: false,
  };
}

function requiresProfessionalRegistration(role = "") {
  const normalized = role.toLowerCase();
  return [
    "doctor", "consultant", "nurse", "medical technician", "lab ",
    "radiology", "pharmacist", "physiotherapist",
  ].some((term) => normalized.includes(term));
}

function onboardingProgress(employee) {
  const checks = [...BASE_CHECKS];
  if (requiresProfessionalRegistration(employee.role)) {
    checks.push(["professionalCredentialVerified", "Clinical registration verified"]);
  }
  const complete = checks.filter(([key]) => Boolean(employee[key])).length;
  return { complete, total: checks.length, percent: Math.round((complete / checks.length) * 100) };
}

function phoneIsValid(value) {
  const digits = value.replace(/\D/g, "").length;
  return digits >= 7 && digits <= 15;
}

export default function EmployeeOnboarding() {
  const [employees, setEmployees] = useState([]);
  const [structures, setStructures] = useState([]);
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState(() => blankForm());
  const [editingId, setEditingId] = useState(null);
  const [mode, setMode] = useState("onboard");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState({});
  const [storedDocuments, setStoredDocuments] = useState([]);
  const [documentError, setDocumentError] = useState("");
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [fileInputVersion, setFileInputVersion] = useState({});
  const [selectedProfilePicture, setSelectedProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState("");
  const [profilePictureError, setProfilePictureError] = useState("");
  const profilePicturePreviewRef = useRef("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [employeeRows, salaryStructures, roleOptions] = await Promise.all([
        api.employees(),
        api.structures(),
        api.employeeRoles(),
      ]);
      setEmployees(employeeRows);
      setStructures(salaryStructures);
      const availableRoles = new Set(roleOptions.map((role) => role.trim().toLowerCase()));
      setRoles(ROLE_SUGGESTIONS.filter((role) => availableRoles.has(role.toLowerCase())));
      setForm((current) => current.structureId
        ? current
        : { ...current, structureId: salaryStructures[0]?.id ? String(salaryStructures[0].id) : "" });
    } catch (error) {
      setLoadError(error.message || "Could not load employee onboarding data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => {
    if (profilePicturePreviewRef.current) URL.revokeObjectURL(profilePicturePreviewRef.current);
  }, []);

  const clinicalRole = requiresProfessionalRegistration(form.role);
  const validGross = form.monthlyGross !== ""
    && Number.isFinite(Number(form.monthlyGross))
    && Number(form.monthlyGross) >= 0;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.workEmail.trim());
  const emergencyContactStarted = form.emergencyContactName.trim() || form.emergencyContactPhone.trim();
  const emergencyContactComplete = !emergencyContactStarted
    || (form.emergencyContactName.trim() && phoneIsValid(form.emergencyContactPhone));
  const canSave = Boolean(
    form.name.trim()
    && form.department.trim()
    && form.role.trim()
    && form.joiningDate
    && form.employmentType
    && emailValid
    && phoneIsValid(form.phone)
    && emergencyContactComplete
    && validGross
    && form.structureId
    && (!clinicalRole || (form.registrationCouncil.trim() && form.professionalRegistrationNo.trim())),
  );

  const directoryRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return employees.filter((employee) => !term
      || [employee.name, employee.code, employee.department, employee.role]
        .some((value) => value?.toLowerCase().includes(term)));
  }, [employees, query]);

  const clinicalCount = employees.filter((employee) => requiresProfessionalRegistration(employee.role)).length;
  const readyCount = employees.filter((employee) => onboardingProgress(employee).percent === 100).length;
  const updateForm = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const replaceProfilePicturePreview = (picture) => {
    if (profilePicturePreviewRef.current) URL.revokeObjectURL(profilePicturePreviewRef.current);
    const previewUrl = URL.createObjectURL(picture);
    profilePicturePreviewRef.current = previewUrl;
    setProfilePicturePreview(previewUrl);
  };

  const clearProfilePicturePreview = () => {
    if (profilePicturePreviewRef.current) URL.revokeObjectURL(profilePicturePreviewRef.current);
    profilePicturePreviewRef.current = "";
    setProfilePicturePreview("");
  };

  const startNew = () => {
    setEditingId(null);
    setDocumentsLoading(false);
    setForm(blankForm(structures[0]?.id));
    setSelectedDocuments({});
    setSelectedProfilePicture(null);
    setProfilePictureError("");
    clearProfilePicturePreview();
    setStoredDocuments([]);
    setDocumentError("");
    setFileInputVersion({});
    setFormError("");
    setNotice("");
    setMode("onboard");
  };

  const continueOnboarding = async (employee) => {
    setEditingId(employee.id);
    setSelectedDocuments({});
    setStoredDocuments([]);
    setDocumentError("");
    setDocumentsLoading(true);
    setForm({
      ...blankForm(employee.structureId),
      ...employee,
      joiningDate: employee.joiningDate || localToday(),
      employmentType: employee.employmentType || "Full-time",
      monthlyGross: employee.monthlyGross ?? "",
      structureId: employee.structureId == null ? "" : String(employee.structureId),
      workEmail: employee.workEmail || "",
      phone: employee.phone || "",
      bank: employee.bank || "",
      bankAccountNumber: employee.bankAccountNumber || "",
      ifscCode: employee.ifscCode || "",
      bankBranchName: employee.bankBranchName || "",
      bankCity: employee.bankCity || "",
      emergencyContactName: employee.emergencyContactName || "",
      emergencyContactPhone: employee.emergencyContactPhone || "",
      registrationCouncil: employee.registrationCouncil || "",
      professionalRegistrationNo: employee.professionalRegistrationNo || "",
      registrationExpiryDate: employee.registrationExpiryDate || "",
      identityVerified: Boolean(employee.identityVerified),
      professionalCredentialVerified: Boolean(employee.professionalCredentialVerified),
      contractSigned: Boolean(employee.contractSigned),
      orientationComplete: Boolean(employee.orientationComplete),
      systemAccessProvisioned: Boolean(employee.systemAccessProvisioned),
    });
    setFormError("");
    setNotice("");
    setMode("onboard");
    try {
      setStoredDocuments(await api.employeeDocuments(employee.id));
    } catch (error) {
      setDocumentError(error.message || "Could not load employee documents.");
    }
    try {
      const picture = await api.employeeProfilePicture(employee.id);
      if (picture) replaceProfilePicturePreview(picture);
    } catch (error) {
      setProfilePictureError(error.message || "Could not load the profile picture.");
    } finally {
      setDocumentsLoading(false);
    }
  };

  const selectProfilePicture = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PROFILE_PICTURE_SIZE) {
      setProfilePictureError("Profile pictures must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setProfilePictureError("Choose a JPEG or PNG profile picture.");
      event.target.value = "";
      return;
    }
    setProfilePictureError("");
    setSelectedProfilePicture(file);
    replaceProfilePicturePreview(file);
  };

  const selectDocument = (type, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setDocumentError("Each document must be 8 MB or smaller.");
      event.target.value = "";
      return;
    }
    setDocumentError("");
    setSelectedDocuments((current) => ({ ...current, [type]: file }));
  };

  const removeDocument = async (type) => {
    if (editingId == null) return;
    const label = EMPLOYEE_DOCUMENTS.find(([key]) => key === type)?.[1] || "document";
    if (!window.confirm(`Permanently remove the stored ${label.toLowerCase()}?`)) return;
    setDocumentError("");
    try {
      await api.deleteEmployeeDocument(editingId, type);
      setStoredDocuments((current) => current.filter((document) => document.type !== type));
      setNotice("Stored document removed.");
    } catch (error) {
      setDocumentError(error.message || "Could not remove the stored document.");
    }
  };

  const downloadDocument = async (type) => {
    if (editingId == null) return;
    setDocumentError("");
    try {
      const { blob, fileName } = await api.downloadEmployeeDocument(editingId, type);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      setDocumentError(error.message || "Could not download the stored document.");
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    setFormError("");
    setNotice("");
    let savedEmployee;
    try {
      savedEmployee = await api.saveEmployeeOnboarding({
        ...form,
        ...(editingId == null ? {} : { id: editingId }),
        monthlyGross: Number(form.monthlyGross),
        structureId: Number(form.structureId),
        emergencyContactName: form.emergencyContactName.trim(),
        emergencyContactPhone: form.emergencyContactPhone.trim(),
      });
      setEditingId(savedEmployee.id);
      let profilePictureUploaded = false;
      if (selectedProfilePicture) {
        try {
          await api.uploadEmployeeProfilePicture(savedEmployee.id, selectedProfilePicture);
          profilePictureUploaded = true;
          setSelectedProfilePicture(null);
          setProfilePictureError("");
          setFileInputVersion((current) => ({ ...current, profilePicture: (current.profilePicture || 0) + 1 }));
        } catch (error) {
          setFormError(`Employee record saved, but profile picture upload failed: ${error.message}. Retry the upload below.`);
          return;
        }
      }
      for (const [type, file] of Object.entries(selectedDocuments).filter(([, value]) => value)) {
        try {
          const uploaded = await api.uploadEmployeeDocument(savedEmployee.id, type, file);
          setStoredDocuments((current) => [...current.filter((document) => document.type !== type), uploaded]);
          setSelectedDocuments((current) => {
            const next = { ...current };
            delete next[type];
            return next;
          });
          setFileInputVersion((current) => ({ ...current, [type]: (current[type] || 0) + 1 }));
        } catch (error) {
          setFormError(`Employee record saved, but ${EMPLOYEE_DOCUMENTS.find(([key]) => key === type)?.[1] || "document"} upload failed: ${error.message}. Retry the upload below.`);
          return;
        }
      }
      const uploadedCount = Object.values(selectedDocuments).filter(Boolean).length;
      const profilePictureNotice = profilePictureUploaded ? " with profile picture" : "";
      const documentNotice = uploadedCount ? ` and ${uploadedCount} document${uploadedCount === 1 ? "" : "s"}` : "";
      setNotice(`${editingId == null ? "Joining record saved" : "Onboarding record updated"}${profilePictureNotice}${documentNotice}.`);
      setEditingId(null);
      setForm(blankForm(structures[0]?.id));
      setSelectedDocuments({});
      setSelectedProfilePicture(null);
      setProfilePictureError("");
      clearProfilePicturePreview();
      setFileInputVersion({});
      setMode("directory");
      await load();
    } catch (error) {
      setFormError(error.message || "Could not save this onboarding record.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="employee-onboarding">
      <header className="employee-onboarding-header">
        <div>
          <div className="employee-onboarding-eyebrow"><ClipboardCheck size={16} /> PEOPLE OPERATIONS</div>
          <h2>Staff onboarding</h2>
          <p>Prepare each hospital team member for a safe, supported first day.</p>
        </div>
        <button type="button" className="employee-onboarding-primary" onClick={startNew}>
          <UserRoundPlus size={17} /> New joiner
        </button>
      </header>

      <section className="employee-onboarding-stats" aria-label="Staff onboarding overview">
        <article><span>Total staff</span><strong>{loading ? "—" : employees.length}</strong><small>Payroll employee records</small></article>
        <article><span>Clinical staff</span><strong>{loading ? "—" : clinicalCount}</strong><small>Professional registration required</small></article>
        <article><span>Onboarding ready</span><strong>{loading ? "—" : readyCount}</strong><small>Required joining checks complete</small></article>
      </section>

      <nav className="employee-onboarding-tabs" aria-label="Employee onboarding pages">
        <button type="button" className={mode === "onboard" ? "active" : ""} aria-current={mode === "onboard" ? "page" : undefined}
          onClick={() => setMode("onboard")}><UserRoundPlus size={16} /> Joiner details</button>
        <button type="button" className={mode === "directory" ? "active" : ""} aria-current={mode === "directory" ? "page" : undefined}
          onClick={() => setMode("directory")}><UsersRound size={16} /> Staff directory</button>
      </nav>

      {notice && <div className="employee-onboarding-notice" role="status">{notice}</div>}
      {loadError && (
        <div className="employee-onboarding-error" role="alert">
          <span>Could not load payroll-system employee data: {loadError}</span>
          <button type="button" onClick={load}>Retry</button>
        </div>
      )}

      {mode === "onboard" ? (
        <form className="employee-onboarding-card" onSubmit={submit}>
          <div className="employee-onboarding-card-heading">
            <div>
              <span className="employee-onboarding-eyebrow">{editingId == null ? "NEW EMPLOYEE" : "ONBOARDING IN PROGRESS"}</span>
              <h3>{editingId == null ? "Joining details" : `Continue ${form.name || "employee"}’s onboarding`}</h3>
              <p>Required information is saved to the payroll system. You can save progress before every checklist item is complete.</p>
            </div>
            {editingId != null && <span className="employee-onboarding-code">ID {employees.find((employee) => employee.id === editingId)?.code || editingId}</span>}
          </div>

          <fieldset className="employee-onboarding-section">
            <legend>01 · Personal and contact</legend>
            <div className="employee-onboarding-fields">
              <label className="employee-onboarding-field">
                <span>Full name <b>Required</b></span>
                <input autoComplete="name" value={form.name} onChange={updateForm("name")} required />
              </label>
              <label className="employee-onboarding-field">
                <span>Work email <b>Required</b></span>
                <input type="email" autoComplete="email" value={form.workEmail} onChange={updateForm("workEmail")} required />
              </label>
              <label className="employee-onboarding-field">
                <span>Phone number <b>Required</b></span>
                <input type="tel" autoComplete="tel" placeholder="+91 98765 43210" value={form.phone} onChange={updateForm("phone")} required />
              </label>
              <label className="employee-onboarding-field">
                <span>Emergency contact name <small>Optional</small></span>
                <input autoComplete="off" value={form.emergencyContactName} onChange={updateForm("emergencyContactName")} />
              </label>
              <label className="employee-onboarding-field">
                <span>Emergency contact phone <small>Optional</small></span>
                <input type="tel" placeholder="Include country code if needed" value={form.emergencyContactPhone} onChange={updateForm("emergencyContactPhone")} />
              </label>
              <div className="employee-onboarding-profile-upload">
                <label className="employee-onboarding-field">
                  <span>Profile picture <small>Optional · JPEG or PNG, up to 5 MB</small></span>
                  <input key={fileInputVersion.profilePicture || 0} type="file" accept="image/jpeg,image/png"
                    aria-label="Upload profile picture" onChange={selectProfilePicture} />
                </label>
                {profilePicturePreview && <img src={profilePicturePreview} alt="Employee profile picture preview" />}
                {profilePictureError && <p className="employee-onboarding-profile-error" role="alert">{profilePictureError}</p>}
              </div>
            </div>
          </fieldset>

          <fieldset className="employee-onboarding-section">
            <legend>02 · Hospital employment</legend>
            <div className="employee-onboarding-fields">
              <label className="employee-onboarding-field">
                <span>Department <b>Required</b></span>
                <input list="hospital-departments" value={form.department} onChange={updateForm("department")} required />
                <datalist id="hospital-departments">{DEPARTMENTS.map((department) => <option key={department} value={department} />)}</datalist>
              </label>
              <label className="employee-onboarding-field">
                <span>Job title / role <b>Required</b></span>
                <input list="hospital-roles" value={form.role} onChange={updateForm("role")} required />
                <datalist id="hospital-roles">{roles.map((role) => <option key={role} value={role} />)}</datalist>
              </label>
              <label className="employee-onboarding-field">
                <span>Joining date <b>Required</b></span>
                <input type="date" value={form.joiningDate} onChange={updateForm("joiningDate")} required />
              </label>
              <label className="employee-onboarding-field">
                <span>Employment type <b>Required</b></span>
                <select value={form.employmentType} onChange={updateForm("employmentType")} required>
                  {EMPLOYMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
            </div>
          </fieldset>

          {clinicalRole && (
            <fieldset className="employee-onboarding-section employee-onboarding-clinical">
              <legend>03 · Clinical credentialing</legend>
              <p>Record the professional registration needed for this role. Do not enter patient information or employee health details here.</p>
              <div className="employee-onboarding-fields">
                <label className="employee-onboarding-field">
                  <span>Registration council / board <b>Required</b></span>
                  <input value={form.registrationCouncil} onChange={updateForm("registrationCouncil")} required />
                </label>
                <label className="employee-onboarding-field">
                  <span>Professional registration number <b>Required</b></span>
                  <input value={form.professionalRegistrationNo} onChange={updateForm("professionalRegistrationNo")} required />
                </label>
                <label className="employee-onboarding-field">
                  <span>Registration expiry <small>If applicable</small></span>
                  <input type="date" value={form.registrationExpiryDate} onChange={updateForm("registrationExpiryDate")} />
                </label>
                <label className="employee-onboarding-check">
                  <input type="checkbox" checked={Boolean(form.professionalCredentialVerified)} onChange={updateForm("professionalCredentialVerified")} />
                  <span><strong>Registration reviewed and verified</strong><small>Only mark complete after checking the original credential.</small></span>
                </label>
              </div>
            </fieldset>
          )}

          <fieldset className="employee-onboarding-section">
            <legend>{clinicalRole ? "04" : "03"} · Payroll setup</legend>
            <div className="employee-onboarding-fields">
              <label className="employee-onboarding-field">
                <span>Monthly gross salary (₹) <b>Required</b></span>
                <input type="number" min="0" step="100" value={form.monthlyGross} onChange={updateForm("monthlyGross")} required />
              </label>
              <label className="employee-onboarding-field">
                <span>Salary structure <b>Required</b></span>
                <select value={form.structureId} onChange={updateForm("structureId")} required>
                  <option value="">Select a salary structure</option>
                  {structures.map((structure) => <option key={structure.id} value={structure.id}>{structure.name}</option>)}
                </select>
              </label>
              <label className="employee-onboarding-field">
                <span>Bank account number <small>Optional</small></span>
                <input type="text" inputMode="numeric" autoComplete="off" maxLength={34}
                  value={form.bankAccountNumber} onChange={updateForm("bankAccountNumber")} />
              </label>
              <label className="employee-onboarding-field">
                <span>IFSC code <small>Optional</small></span>
                <input type="text" autoComplete="off" maxLength={11} pattern="[A-Za-z]{4}0[A-Za-z0-9]{6}"
                  title="Enter a valid 11-character IFSC code" value={form.ifscCode} onChange={updateForm("ifscCode")} />
              </label>
              <label className="employee-onboarding-field">
                <span>Branch name <small>Optional</small></span>
                <input value={form.bankBranchName} onChange={updateForm("bankBranchName")} />
              </label>
              <label className="employee-onboarding-field">
                <span>Bank city <small>Optional</small></span>
                <input value={form.bankCity} onChange={updateForm("bankCity")} />
              </label>
              <label className="employee-onboarding-field">
                <span>Payment reference <small>Optional</small></span>
                <input value={form.bank} onChange={updateForm("bank")} />
              </label>
            </div>
            {!loading && structures.length === 0 && (
              <p className="employee-onboarding-inline-warning">Create a salary structure in Salary setup before saving a joiner.</p>
            )}
          </fieldset>

          <fieldset className="employee-onboarding-section">
            <legend>{clinicalRole ? "05" : "04"} · Joining documents</legend>
            <p>Documents are encrypted on the payroll server and stored in a private folder for this employee. Only HR and hospital administrators can access them.</p>
            <div className="employee-onboarding-documents">
              {EMPLOYEE_DOCUMENTS.map(([type, label]) => {
                const stored = storedDocuments.find((document) => document.type === type);
                const selected = selectedDocuments[type];
                return (
                  <div className="employee-onboarding-document" key={type}>
                    <label className="employee-onboarding-field">
                      <span>{label} <small>{stored ? "Stored" : "Optional"}</small></span>
                      <input key={fileInputVersion[type] || 0} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                        aria-label={`Upload ${label}`} disabled={Boolean(stored) || documentsLoading}
                        onChange={(event) => selectDocument(type, event)} />
                    </label>
                    {selected && <small className="employee-onboarding-file-name">Selected: {selected.name}</small>}
                    {stored && (
                      <div className="employee-onboarding-stored-file">
                        <span>{(stored.size / 1024).toFixed(0)} KB · {new Date(stored.uploadedAt).toLocaleDateString()}</span>
                        <div>
                          <button type="button" className="employee-onboarding-link" onClick={() => downloadDocument(type)}>Download</button>
                          <button type="button" className="employee-onboarding-link danger" onClick={() => removeDocument(type)}>Remove</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {documentsLoading && <p className="employee-onboarding-document-message">Loading stored documents…</p>}
            {documentError && <p className="employee-onboarding-document-error" role="alert">{documentError}</p>}
            {editingId == null && <p className="employee-onboarding-document-message">Save the employee record to securely store selected documents under their payroll employee ID.</p>}
          </fieldset>

          <fieldset className="employee-onboarding-section">
            <legend>{clinicalRole ? "06" : "05"} · First-day readiness</legend>
            <div className="employee-onboarding-checklist">
              {BASE_CHECKS.map(([key, label]) => (
                <label className="employee-onboarding-check" key={key}>
                  <input type="checkbox" checked={Boolean(form[key])} onChange={updateForm(key)} />
                  <span><strong>{label}</strong><small>Update when the required step is confirmed.</small></span>
                </label>
              ))}
            </div>
          </fieldset>

          {formError && <p className="employee-onboarding-error" role="alert">{formError}</p>}
          <div className="employee-onboarding-actions">
            <span>Employee ID is assigned by the payroll-system backend.</span>
            <button type="submit" className="employee-onboarding-primary" disabled={!canSave || saving || loading}>
              <CheckCircle2 size={17} /> {saving ? "Saving…" : editingId == null ? "Save joining record" : "Save onboarding progress"}
            </button>
          </div>
        </form>
      ) : (
        <section className="employee-onboarding-card" aria-labelledby="employee-directory-heading">
          <div className="employee-onboarding-card-heading">
            <div>
              <span className="employee-onboarding-eyebrow">PAYROLL-SYSTEM RECORDS</span>
              <h3 id="employee-directory-heading">Staff directory</h3>
              <p>Continue an employee’s joining checklist or review their role and start date.</p>
            </div>
            <label className="employee-onboarding-search">
              <Search size={17} />
              <input type="search" aria-label="Search staff directory" placeholder="Name, ID, department, role" value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
          </div>
          <div className="employee-onboarding-table-wrap">
            <table className="employee-onboarding-table">
              <thead><tr><th>Employee</th><th>Department / role</th><th>Joining date</th><th>Readiness</th><th><span className="employee-onboarding-visually-hidden">Actions</span></th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan="5">Loading staff records…</td></tr>}
                {!loading && loadError && <tr><td colSpan="5">Staff records could not be loaded.</td></tr>}
                {!loading && !loadError && directoryRows.map((employee) => {
                  const progress = onboardingProgress(employee);
                  return (
                    <tr key={employee.id}>
                      <td><strong>{employee.name}</strong><small>{employee.code}</small></td>
                      <td><strong>{employee.department}</strong><small>{employee.role}</small></td>
                      <td>{employee.joiningDate || "Not recorded"}</td>
                      <td>
                        <span className={`employee-onboarding-status ${progress.percent === 100 ? "ready" : ""}`}>
                          {progress.percent === 100 ? "Ready" : `${progress.complete}/${progress.total} checks`}
                        </span>
                      </td>
                      <td><button type="button" className="employee-onboarding-link" onClick={() => continueOnboarding(employee)}>Continue</button></td>
                    </tr>
                  );
                })}
                {!loading && !loadError && !directoryRows.length && <tr><td colSpan="5">No staff records match this search.</td></tr>}
              </tbody>
            </table>
          </div>
          {!loading && !loadError && <p className="employee-onboarding-footnote"><CalendarDays size={15} /> {employees.length} employee record{employees.length === 1 ? "" : "s"} from payroll system</p>}
        </section>
      )}
    </div>
  );
}
