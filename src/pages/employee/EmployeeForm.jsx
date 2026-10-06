import React, { useMemo, useState } from 'react';
import { employeeDocumentUrl } from '../../services/employeeService';
import { HrField, asArray, titleCase } from '../hrUi';
import { findDoctorDepartment } from '../../utils/doctorDisplay';

const statuses = ['DRAFT', 'ONBOARDING', 'ACTIVE', 'ON_LEAVE', 'NOTICE_PERIOD', 'RESIGNED', 'TERMINATED', 'RETIRED'];
const employmentTypes = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERN'];
const PROFILE_DEPARTMENT_VALUE = '__DOCTOR_PROFILE_DEPARTMENT__';

export default function EmployeeForm({ data = {}, employee }) {
  const departments = asArray(data.departments);
  const doctorProfiles = asArray(data.doctors);
  const existingDoctorProfile = doctorProfiles.find((doctor) => doctor.id === employee?.doctorProfileId);
  const existingProfileDepartment = findDoctorDepartment(existingDoctorProfile, departments);
  const existingProfileDepartmentName = existingDoctorProfile?.departmentName
    || existingDoctorProfile?.department || existingDoctorProfile?.doctorDestination || '';
  const [employeeType, setEmployeeType] = useState(employee?.employeeType || '');
  const [doctorProfileId, setDoctorProfileId] = useState(employee?.doctorProfileId || '');
  const initialDepartment = employee?.departmentId || (existingProfileDepartment?.id
    || (employee?.departmentName || existingProfileDepartmentName ? PROFILE_DEPARTMENT_VALUE : ''));
  const [departmentId, setDepartmentId] = useState(initialDepartment);
  const [departmentName, setDepartmentName] = useState(
    employee?.departmentName || existingProfileDepartment?.name || existingProfileDepartmentName,
  );
  const [doctorFee, setDoctorFee] = useState(
    employee?.doctorConsultationFee ?? existingDoctorProfile?.doctorfee ?? '',
  );
  const initialDoctorTimes = employee?.doctorAvailableTimes ?? existingDoctorProfile?.doctorAvailabletime ?? [];
  const [doctorTimes, setDoctorTimes] = useState(
    Array.isArray(initialDoctorTimes) ? initialDoctorTimes.join(', ') : String(initialDoctorTimes),
  );
  const selectedDoctor = doctorProfiles.find((doctor) => doctor.id === doctorProfileId);
  const selectedProfileDepartmentName = selectedDoctor?.departmentName || selectedDoctor?.department
    || selectedDoctor?.doctorDestination
    || (selectedDoctor?.id === employee?.doctorProfileId ? employee?.departmentName : '');
  const departmentForDoctor = useMemo(() => {
    return findDoctorDepartment(selectedDoctor, departments);
  }, [departments, selectedDoctor]);
  const professionalInfo = employee?.professionalInfo || {};
  const registrationLabel = employeeType === 'DOCTOR' ? 'Medical registration number'
    : employeeType === 'NURSE' ? 'Nursing registration number'
      : employeeType === 'TECHNICIAN' ? 'Technical certification' : 'Professional registration';
  return <>
    <div className="hr-form-section"><h3>Personal information</h3><div className="hr-form-grid">
      <HrField label="First name" required><input name="firstName" required defaultValue={employee?.firstName} /></HrField>
      <HrField label="Last name" required><input name="lastName" required defaultValue={employee?.lastName} /></HrField>
      <HrField label="Date of birth"><input name="dateOfBirth" type="date" defaultValue={employee?.dateOfBirth} /></HrField>
      <HrField label="Gender"><select name="gender" defaultValue={employee?.gender || ''}><option value="">Select</option><option>FEMALE</option><option>MALE</option><option>OTHER</option></select></HrField>
      <HrField label="Mobile" required><input name="mobile" type="tel" required defaultValue={employee?.mobile} /></HrField>
      <HrField label="Email"><input name="email" type="email" defaultValue={employee?.email} /></HrField>
      <HrField label="Address"><input name="address" defaultValue={employee?.address} /></HrField>
      <HrField label="Emergency contact"><input name="emergencyContact" defaultValue={employee?.emergencyContact} /></HrField>
    </div></div>
    <div className="hr-form-section"><h3>Statutory identifiers</h3><div className="hr-form-grid">
      <HrField label="PAN"><input name="panNumber" autoComplete="off" maxLength="10"
        defaultValue={employee?.panNumber} placeholder="ABCDE1234F" /></HrField>
      <HrField label="Aadhaar last four digits"><input name="aadhaarLastFour" inputMode="numeric"
        autoComplete="off" maxLength="4" pattern="[0-9]{4}" placeholder="Optional"
        aria-describedby="aadhaar-help" />
        <span id="aadhaar-help" className="hr-form-hint">
          {employee?.hasAadhaarNumber
          ? `Saved as •••• ${employee.aadhaarLastFour || '••••'}. Leave blank to keep it unchanged.`
          : 'Optional. Do not enter the full Aadhaar number; only the last four digits are stored.'}
        </span>
      </HrField>
      <HrField label="PF / UAN number"><input name="pfUanNumber" autoComplete="off" maxLength="30"
        defaultValue={employee?.pfUanNumber} /></HrField>
    </div></div>
    <p className="hr-form-hint">The PF / UAN field identifies the employee account. Set that employee’s PF deduction amount separately in Salary → Salary Structures.</p>
    <div className="hr-form-section"><h3>Employment information</h3><div className="hr-form-grid">
      <HrField label="Employee type" required><select name="employeeType" required value={employeeType}
        onChange={(event) => setEmployeeType(event.target.value)}>
        <option value="">Select employee type</option>
        {asArray(data.employeeTypes).filter((type) => type.status === 'ACTIVE')
          .map((type) => <option key={type.id} value={type.code}>{type.name}</option>)}</select></HrField>
      <HrField label="Department"><select name="departmentId" value={departmentId}
        onChange={(event) => {
          const nextId = event.target.value;
          setDepartmentId(nextId);
          setDepartmentName(nextId === PROFILE_DEPARTMENT_VALUE
            ? selectedProfileDepartmentName
            : departments.find((department) => department.id === nextId)?.name || '');
        }}><option value="">Select department</option>
        {employeeType === 'DOCTOR' && !departmentForDoctor && selectedProfileDepartmentName
          && <option value={PROFILE_DEPARTMENT_VALUE}>{selectedProfileDepartmentName}</option>}
        {departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <input type="hidden" name="departmentName" value={departmentName} />
        {employeeType === 'DOCTOR' && selectedDoctor && <span className="hr-form-hint">
          Department from doctor profile: {departmentName || selectedDoctor.departmentName
            || selectedDoctor.department || selectedDoctor.doctorDestination || 'Not assigned'}
          {!departmentForDoctor && (selectedDoctor.doctorDestination || selectedDoctor.departmentName)
            ? ' (profile department saved; choose an organization department above to link it to the directory).' : ''}
        </span>}
      </HrField>
      <HrField label="Designation"><select name="designationId" defaultValue={employee?.designationId || ''}><option value="">Select designation</option>
        {asArray(data.designations).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></HrField>
      <HrField label="Joining date" required><input name="joiningDate" type="date" required defaultValue={employee?.joiningDate} /></HrField>
      <HrField label="Employment type"><select name="employmentType" defaultValue={employee?.employmentType || 'FULL_TIME'}>
        {employmentTypes.map((type) => <option key={type} value={type}>{titleCase(type)}</option>)}</select></HrField>
      <HrField label="Reporting manager"><select name="managerId" defaultValue={employee?.managerId || ''}><option value="">Select manager</option>
        {asArray(data.employees).map((item) => <option key={item.id} value={item.id}>{[item.firstName, item.lastName].filter(Boolean).join(' ')}</option>)}</select></HrField>
      <HrField label="Location"><input name="location" defaultValue={employee?.location} /></HrField>
      <HrField label="Status"><select name="status" defaultValue={employee?.status || 'DRAFT'}>
        {statuses.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select></HrField>
      <HrField label="Shift"><select name="shiftId" defaultValue={employee?.shiftId || ''}><option value="">Select shift</option>
        {asArray(data.shifts).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></HrField>
      {employeeType === 'DOCTOR' && <HrField label="Doctor profile">
        <select name="doctorProfileId" value={doctorProfileId} onChange={(event) => {
          const nextDoctorProfileId = event.target.value;
          setDoctorProfileId(nextDoctorProfileId);
          const profile = doctorProfiles.find((doctor) => doctor.id === nextDoctorProfileId);
          const profileDepartment = findDoctorDepartment(profile, departments);
          const profileName = profile?.departmentName || profile?.department || profile?.doctorDestination || '';
          setDepartmentId(profileDepartment?.id || (profileName ? PROFILE_DEPARTMENT_VALUE : ''));
          setDepartmentName(profileDepartment?.name || profileName);
          setDoctorFee(profile?.doctorfee ?? '');
          const profileTimes = profile?.doctorAvailabletime || [];
          setDoctorTimes(Array.isArray(profileTimes) ? profileTimes.join(', ') : String(profileTimes));
        }}>
          <option value="">No doctor profile linked</option>
          {asArray(data.doctors).map((doctor) => <option key={doctor.id} value={doctor.id}>
            {[doctor.doctorName, doctor.doctorSpecialistName, doctor.doctorDestination].filter(Boolean).join(' · ')}
          </option>)}
        </select>
        {selectedDoctor && <span className="hr-form-hint">
          {selectedDoctor.doctorName}
          {selectedDoctor.doctorSpecialistName ? ` · ${selectedDoctor.doctorSpecialistName}` : ''}
          {(selectedDoctor.departmentName || selectedDoctor.department || selectedDoctor.doctorDestination)
            ? ` · ${selectedDoctor.departmentName || selectedDoctor.department || selectedDoctor.doctorDestination}` : ''}
        </span>}
      </HrField>}
      {employeeType === 'DOCTOR' && <>
        <HrField label="Consultation fee"><input name="doctorConsultationFee" type="number" min="0" step="0.01"
          value={doctorFee} onChange={(event) => setDoctorFee(event.target.value)} /></HrField>
        <HrField label="Available appointment times"><input name="doctorAvailableTimes" placeholder="09:00, 09:30"
          value={doctorTimes} onChange={(event) => setDoctorTimes(event.target.value)} />
          <span className="hr-form-hint">Optional. Separate appointment start times with commas. You can set or update these in Doctor Schedule.</span>
        </HrField>
      </>}
    </div></div>
    <div className="hr-form-section"><h3>Professional information</h3><div className="hr-form-grid">
      <HrField label={registrationLabel}><input name="registrationNumber" defaultValue={professionalInfo.registrationNumber} /></HrField>
      <HrField label="Qualification"><input name="qualification" defaultValue={professionalInfo.qualification} /></HrField>
      <HrField label="Specialization"><input name="specialization" defaultValue={professionalInfo.specialization} /></HrField>
      <HrField label="Experience (years)"><input name="experienceYears" type="number" min="0" step="0.5" defaultValue={professionalInfo.experienceYears} /></HrField>
      <HrField label="License expiry"><input name="licenseExpiryDate" type="date" defaultValue={professionalInfo.licenseExpiryDate} /></HrField>
      <HrField label="Certification"><input name="certification" defaultValue={professionalInfo.certification} /></HrField>
    </div><p className="hr-form-hint">Professional details are optional and remain part of the generic employee record.</p></div>
    <div className="hr-form-section"><h3>Joining documents</h3>
      <p className="hr-form-hint">PAN card, Aadhaar card, and experience letter are optional. You can save the employee without these files and upload them later. PDF, PNG, or JPEG up to 10 MB.</p>
      <div className="hr-form-grid">
        {[
          ['PAN card', 'PAN_CARD'],
          ['Aadhaar card', 'AADHAAR_CARD'],
          ['Experience letter', 'EXPERIENCE_LETTER'],
        ].map(([label, type]) => {
          const savedDocument = employee?.onboardingDocuments?.[type];
          return <HrField key={type} label={label}>
            <input name={`document-${type}`} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" />
            {savedDocument?.fileName && <a className="hr-link-button" href={employeeDocumentUrl(employee.id, type)}>
              View uploaded file: {savedDocument.fileName}
            </a>}
          </HrField>;
        })}
      </div>
      <HrField label="Other document links (one URL per line)">
        <textarea name="documentLinks" rows="2" placeholder="https://..."
          defaultValue={asArray(employee?.documentLinks).join('\n')} />
      </HrField>
    </div>
  </>;
}
