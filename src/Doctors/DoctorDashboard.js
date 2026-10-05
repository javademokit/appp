import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, CalendarDays, ClipboardList, FileText, LogOut, RefreshCw, Stethoscope, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../API/api';
import './DoctorDashboard.css';

const emptyConsultation = {
  symptoms: '',
  bloodPressure: '',
  pulse: '',
  temperature: '',
  oxygenSaturation: '',
  weight: '',
  diagnosis: '',
  prescription: '',
  labOrders: '',
  doctorNotes: '',
  followUpDate: '',
};

async function readResponse(response, fallback) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Your doctor session has expired. Please sign in again.');
    }
    const message = data.message || data.detail || data.title || data.errorDescription;
    throw new Error(message || `${fallback} (${response.status})`);
  }
  return data;
}

function escapePrintValue(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

export default function DoctorDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [patient360, setPatient360] = useState(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [consultation, setConsultation] = useState(emptyConsultation);
  const [medicationCatalog, setMedicationCatalog] = useState([]);
  const [medicationDepartment, setMedicationDepartment] = useState('All departments');
  const [medicationOrders, setMedicationOrders] = useState([]);
  const [printablePrescription, setPrintablePrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboardResponse, medicationResponse] = await Promise.all([
        apiFetch('/doctor-portal/dashboard'),
        apiFetch('/doctor-portal/medications'),
      ]);
      const [result, medications] = await Promise.all([
        readResponse(dashboardResponse, 'Could not load today’s doctor dashboard'),
        readResponse(medicationResponse, 'Could not load the pharmacy medicine catalog'),
      ]);
      if (!Array.isArray(result.appointments)) throw new Error('Doctor dashboard returned an invalid appointment list');
      if (!Array.isArray(medications)) throw new Error('The pharmacy medicine catalog returned an invalid list');
      setDashboard(result);
      setMedicationCatalog(medications);
    } catch (requestError) {
      setError(requestError.message || 'Could not load doctor dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const appointments = useMemo(() => dashboard?.appointments ?? [], [dashboard?.appointments]);
  const doctor = dashboard?.doctor;
  const assignedPatients = useMemo(() => {
    const seen = new Set();
    return appointments.filter((appointment) => {
      if (!appointment.patientId || seen.has(appointment.patientId)) return false;
      seen.add(appointment.patientId);
      return true;
    });
  }, [appointments]);
  const filteredPatients = useMemo(() => {
    const query = patientSearch.trim().toLocaleLowerCase();
    if (!query) return assignedPatients;
    return assignedPatients.filter((appointment) =>
      [appointment.patientName, appointment.patientId]
        .some((value) => String(value || '').toLocaleLowerCase().includes(query)));
  }, [assignedPatients, patientSearch]);

  const selectAppointment = async (appointment) => {
    setSelectedAppointment(appointment);
    setPatient360(null);
    setConsultation(emptyConsultation);
    setMedicationOrders([]);
    setMedicationDepartment('All departments');
    setPrintablePrescription(null);
    setSuccess('');
    setError('');
    if (!appointment.patientId) {
      setError('This appointment has no Patient ID, so its medical record cannot be opened.');
      return;
    }
    try {
      const result = await readResponse(
        await apiFetch(`/doctor-portal/patients/${encodeURIComponent(appointment.patientId)}`),
        'Could not load the patient record',
      );
      setPatient360(result);
    } catch (requestError) {
      setError(requestError.message || 'Could not load the patient record');
    }
  };

  const submitConsultation = async (event) => {
    event.preventDefault();
    if (!selectedAppointment) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const result = await readResponse(await apiFetch('/doctor-portal/consultations', {
        method: 'POST',
        body: JSON.stringify({
          ...consultation,
          appointmentId: selectedAppointment.id,
          labOrders: consultation.labOrders.split(/\n|,/).map((order) => order.trim()).filter(Boolean),
          medicationOrders: medicationOrders.map((order) => ({
            ...order,
            quantity: Number(order.quantity),
          })),
        }),
      }), 'Could not complete the consultation');
      if (result.medicationPrescription?.id) setPrintablePrescription(result.medicationPrescription);
      setSuccess(`Consultation saved for ${selectedAppointment.patientName}.`);
      setSelectedAppointment(null);
      setPatient360(null);
      setConsultation(emptyConsultation);
      setMedicationOrders([]);
      await refresh();
    } catch (requestError) {
      setError(requestError.message || 'Could not complete the consultation');
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    try {
      await apiFetch('/users/logout', { method: 'POST' });
    } finally {
      navigate('/DoctorLogin', { replace: true });
    }
  };

  const updateConsultation = (event) => {
    const { name, value } = event.target;
    setConsultation((current) => ({ ...current, [name]: value }));
  };

  const departments = useMemo(() => Array.from(new Set(
    medicationCatalog.map((item) => item.department || 'General Medicine'),
  )).sort(), [medicationCatalog]);

  const availableMedications = medicationCatalog.filter((item) =>
    medicationDepartment === 'All departments' || (item.department || 'General Medicine') === medicationDepartment);

  const addMedicationOrder = () => setMedicationOrders((current) => [...current, {
    medicationId: '', dose: '', route: 'Oral', frequency: '', duration: '', quantity: '', instructions: '',
  }]);

  const updateMedicationOrder = (index, field, value) => setMedicationOrders((current) =>
    current.map((order, orderIndex) => orderIndex === index ? { ...order, [field]: value } : order));

  const printPrescription = () => {
    if (!printablePrescription) return;
    setError('');
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('Your browser blocked the prescription print window. Allow pop-ups for this site, then try again.');
      return;
    }

    const prescriptionDate = printablePrescription.createdAt
      ? new Date(printablePrescription.createdAt).toLocaleDateString()
      : new Date().toLocaleDateString();
    const medicationRows = (printablePrescription.medications || []).map((item) => `
      <tr>
        <td>${escapePrintValue(item.name)} ${escapePrintValue([item.strength, item.dosageForm].filter(Boolean).join(' · '))}</td>
        <td>${escapePrintValue(item.dose)} · ${escapePrintValue(item.route)}</td>
        <td>${escapePrintValue(item.frequency)}</td>
        <td>${escapePrintValue(item.duration)}</td>
        <td>${escapePrintValue(item.quantity)}</td>
        <td>${escapePrintValue(item.instructions || '—')}</td>
      </tr>
    `).join('');

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Medication prescription · ${escapePrintValue(printablePrescription.patientName)}</title>
          <style>
            @page { size: A4; margin: 16mm; }
            body { color: #111; background: #fff; font: 12px Arial, sans-serif; }
            header { display: flex; justify-content: space-between; align-items: end; border-bottom: 2px solid #222; padding-bottom: 12px; }
            header strong { font-size: 21px; }
            header span { font-size: 16px; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; margin: 20px 0; }
            .details div { display: grid; gap: 3px; }
            .details b { color: #555; font-size: 10px; text-transform: uppercase; }
            h2 { margin: 22px 0 8px; font-size: 15px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #777; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #f0f0f0; }
            .footer { margin-top: 34px; border-top: 1px solid #777; padding-top: 10px; }
            @media print { tr { break-inside: avoid; } }
          </style>
        </head>
        <body>
          <header><strong>MEDCARE HOSPITAL</strong><span>Medication prescription</span></header>
          <section class="details">
            <div><b>Patient</b><span>${escapePrintValue(printablePrescription.patientName)}</span></div>
            <div><b>Patient ID</b><span>${escapePrintValue(printablePrescription.patientId)}</span></div>
            <div><b>Doctor</b><span>${escapePrintValue(printablePrescription.doctorName)}</span></div>
            <div><b>Date</b><span>${escapePrintValue(prescriptionDate)}</span></div>
            <div><b>Diagnosis</b><span>${escapePrintValue(printablePrescription.diagnosis)}</span></div>
          </section>
          <h2>Medicines</h2>
          <table>
            <thead><tr><th>Medicine</th><th>Dose / route</th><th>Frequency</th><th>Duration</th><th>Qty</th><th>Instructions</th></tr></thead>
            <tbody>${medicationRows || '<tr><td colspan="6">No medicines prescribed</td></tr>'}</tbody>
          </table>
          <p class="footer">Please follow the prescribed directions and contact your doctor if you have questions.</p>
        </body>
      </html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onafterprint = () => printWindow.close();
    printWindow.setTimeout(() => printWindow.print(), 250);
  };

  return (
    <main className="doctor-workspace">
      <header className="doctor-topbar">
        <a className="doctor-brand" href="/DoctorDashboard">MEDCARE <span>CLINICAL</span></a>
        <div className="doctor-account">
          <span>{doctor?.doctorName || 'Doctor workspace'}</span>
          <button type="button" onClick={logout} aria-label="Sign out"><LogOut size={17} /> Sign out</button>
        </div>
      </header>

      <div className="doctor-layout">
        <aside className="doctor-sidebar" aria-label="Doctor navigation">
          <a href="#doctor-dashboard" className="active"><Activity size={17} /> Dashboard</a>
          <a href="#today-appointments"><CalendarDays size={17} /> Appointments</a>
          <a href="#patient-360"><UserRound size={17} /> Patients</a>
          <a href="#consultation"><ClipboardList size={17} /> Consultation</a>
          <a href="#consultation"><Stethoscope size={17} /> Clinical notes</a>
          <a href="/PayrollPortal"><FileText size={17} /> My payslips</a>
        </aside>

        <section className="doctor-main" id="doctor-dashboard">
          <div className="doctor-page-heading">
            <div>
              <p className="doctor-eyebrow">Doctor workspace</p>
              <h1>Good day, {doctor?.doctorName || 'Doctor'}</h1>
              <p>{doctor?.doctorSpecialistName || 'Today’s clinical schedule and patient care'}</p>
            </div>
            <button className="doctor-refresh" type="button" onClick={refresh} disabled={loading}>
              <RefreshCw size={15} /> Refresh
            </button>
          </div>

          {error && <div className="doctor-alert error" role="alert">{error}</div>}
          {success && <div className="doctor-alert success" role="status">{success}</div>}
          {printablePrescription && <div className="doctor-alert success">
            Prescription is ready for the patient and has been sent to the pharmacy.
            <button type="button" className="doctor-open-button doctor-print-button" onClick={printPrescription}>Print prescription</button>
          </div>}

          <div className="doctor-stats">
            <article><span>Assigned appointments</span><strong>{loading ? '—' : appointments.length}</strong><small>All appointments for your doctor profile</small></article>
            <article><span>Waiting / upcoming</span><strong>{loading ? '—' : dashboard?.waitingCount ?? 0}</strong><small>Pending or confirmed</small></article>
            <article><span>Follow-ups</span><strong>{loading ? '—' : dashboard?.followUpCount ?? 0}</strong><small>Marked in visit reason</small></article>
          </div>

          {doctor && <section className="doctor-panel doctor-profile-summary" aria-label="Your doctor profile">
            <div><span>Doctor ID</span><strong>{doctor.employeeId || doctor.id || 'Not assigned'}</strong></div>
            <div><span>Department / ward</span><strong>{doctor.doctorDestination || 'Not assigned'}</strong></div>
            <p>Your account is linked to this doctor profile. Assigned patients are limited to this profile.</p>
          </section>}

          <section className="doctor-panel" id="today-appointments">
            <div className="doctor-panel-heading">
              <div><h2>Doctor appointments</h2><p>Appointments assigned to your doctor profile</p></div>
            </div>
            {loading ? <p className="doctor-empty">Loading your appointment schedule…</p>
              : appointments.length === 0 ? <p className="doctor-empty">No appointments found for this doctor profile.</p>
                : <div className="doctor-table-scroll"><table className="doctor-table">
                  <thead><tr><th>Date</th><th>Time</th><th>Patient</th><th>Visit reason</th><th>Status</th><th /></tr></thead>
                  <tbody>{appointments.map((appointment) => (
                    <tr key={appointment.id}>
                      <td>{appointment.date || '—'}</td>
                      <td>{appointment.time || '—'}</td>
                      <td><strong>{appointment.patientName || 'Patient'}</strong><small>{appointment.patientId || 'Patient ID missing'}</small></td>
                      <td>{appointment.reason || 'Consultation'}</td>
                      <td><span className="doctor-status">{appointment.appointmentStatus || 'pending'}</span></td>
                      <td><button className="doctor-open-button" type="button" onClick={() => selectAppointment(appointment)}>Open patient</button></td>
                    </tr>
                  ))}</tbody>
                </table></div>}
          </section>

          <section className="doctor-panel" id="patient-360">
            <div className="doctor-panel-heading doctor-patient-list-heading">
              <div><h2>Assigned patients</h2><p>Only patients with appointments assigned to your doctor profile are shown.</p></div>
              <label className="doctor-patient-search">Find patient
                <input type="search" value={patientSearch} onChange={(event) => setPatientSearch(event.target.value)}
                  placeholder="Search name or patient ID" />
              </label>
            </div>
            {!assignedPatients.length ? <p className="doctor-empty">Patient list will appear when appointments are assigned to your profile.</p>
              : !filteredPatients.length ? <p className="doctor-empty">No assigned patients match that search.</p>
                : <div className="doctor-recent-list">{filteredPatients.map((appointment) => (
                <button key={appointment.patientId} type="button" onClick={() => selectAppointment(appointment)}>
                  <span>{appointment.patientName || 'Patient'}</span><small>{appointment.patientId}</small>
                </button>
              ))}</div>}
          </section>

          {selectedAppointment && <section className="doctor-panel doctor-clinical-panel">
            <div className="doctor-panel-heading">
              <div><p className="doctor-eyebrow">Patient 360</p><h2>{patient360?.patient?.patientName || selectedAppointment.patientName}</h2>
                <p>Patient ID: {selectedAppointment.patientId} · {selectedAppointment.date} at {selectedAppointment.time}</p></div>
              <button type="button" className="doctor-refresh" onClick={() => setSelectedAppointment(null)}>Close</button>
            </div>

            {patient360 && <>
              <div className="doctor-patient-summary">
                <span>{patient360.patient.patientAge ? `${patient360.patient.patientAge} years` : 'Age not recorded'}</span>
                <span>{patient360.patient.gender || 'Gender not recorded'}</span>
                <span>{patient360.patient.patientmobileNo || 'Phone not recorded'}</span>
                <span>Prior visits: {patient360.consultations?.length || 0}</span>
              </div>
              <section className="doctor-history">
                <h3>Medical history</h3>
                {patient360.consultations?.length
                  ? patient360.consultations.map((item) => <article key={item.id}>
                    <strong>{item.diagnosis}</strong><span>{new Date(item.createdAt).toLocaleString()}</span>
                    {item.symptoms && <p>Symptoms: {item.symptoms}</p>}
                    {item.prescription && <p>Prescription: {item.prescription}</p>}
                    {item.doctorNotes && <p>Notes: {item.doctorNotes}</p>}
                  </article>)
                  : <p>No prior consultation records are available.</p>}
                {patient360.patient.patientPrescription && <article>
                  <strong>Existing patient prescription</strong>
                  <p>{patient360.patient.patientPrescription}</p>
                </article>}
              </section>
            </>}

            <form id="consultation" className="doctor-consultation-form" onSubmit={submitConsultation}>
              <h3>Complete consultation</h3>
              <label className="doctor-wide">Symptoms<textarea name="symptoms" rows="2" value={consultation.symptoms} onChange={updateConsultation} /></label>
              <fieldset className="doctor-vitals">
                <legend>Vitals</legend>
                <label>Blood pressure<input name="bloodPressure" placeholder="e.g. 120/80 mmHg" value={consultation.bloodPressure} onChange={updateConsultation} /></label>
                <label>Pulse<input name="pulse" placeholder="bpm" value={consultation.pulse} onChange={updateConsultation} /></label>
                <label>Temperature<input name="temperature" placeholder="°C" value={consultation.temperature} onChange={updateConsultation} /></label>
                <label>Oxygen saturation<input name="oxygenSaturation" placeholder="%" value={consultation.oxygenSaturation} onChange={updateConsultation} /></label>
                <label>Weight<input name="weight" placeholder="kg" value={consultation.weight} onChange={updateConsultation} /></label>
              </fieldset>
              <label className="doctor-wide">Diagnosis<input required name="diagnosis" value={consultation.diagnosis} onChange={updateConsultation} /></label>
              <label className="doctor-wide">Prescription<textarea rows="2" name="prescription" value={consultation.prescription} onChange={updateConsultation} /></label>
              <section className="doctor-medication-prescriber doctor-wide" aria-label="Medicine prescription">
                <div className="doctor-medication-heading">
                  <div><h3>Medicine prescription</h3><p>Select pharmacy stock by department and enter dose instructions. The prescription also appears in the pharmacy dispensing queue.</p></div>
                  <button type="button" className="doctor-open-button" onClick={addMedicationOrder}
                    disabled={!medicationCatalog.length}>Add medicine</button>
                </div>
                <div className="doctor-medication-filter">
                  <label>Medicine department<select value={medicationDepartment} onChange={(event) => setMedicationDepartment(event.target.value)}>
                    <option>All departments</option>{departments.map((department) => <option key={department}>{department}</option>)}
                  </select></label>
                  {!medicationCatalog.length && <p>No in-stock, unexpired medicines are available in the pharmacy catalog.</p>}
                </div>
                {medicationOrders.map((order, index) => <div className="doctor-medication-order" key={`medicine-${index}`}>
                  <label>Medicine<select required value={order.medicationId} onChange={(event) => updateMedicationOrder(index, 'medicationId', event.target.value)}>
                    <option value="">Select medicine</option>{availableMedications.map((item) => <option key={item.id} value={item.id}>
                      {item.name}{item.strength ? ` · ${item.strength}` : ''}{item.dosageForm ? ` · ${item.dosageForm}` : ''} · stock {item.quantityAvailable}
                    </option>)}</select></label>
                  <label>Dose<input required placeholder="e.g. 1 tablet" value={order.dose} onChange={(event) => updateMedicationOrder(index, 'dose', event.target.value)} /></label>
                  <label>Route<select value={order.route} onChange={(event) => updateMedicationOrder(index, 'route', event.target.value)}>
                    {['Oral', 'Topical', 'Intravenous', 'Intramuscular', 'Inhalation', 'Ophthalmic', 'Other'].map((route) => <option key={route}>{route}</option>)}
                  </select></label>
                  <label>Frequency<input required placeholder="e.g. Twice daily" value={order.frequency} onChange={(event) => updateMedicationOrder(index, 'frequency', event.target.value)} /></label>
                  <label>Duration<input required placeholder="e.g. 5 days" value={order.duration} onChange={(event) => updateMedicationOrder(index, 'duration', event.target.value)} /></label>
                  <label>Total quantity<input required type="number" min="1" value={order.quantity} onChange={(event) => updateMedicationOrder(index, 'quantity', event.target.value)} /></label>
                  <label className="doctor-medication-instructions">Instructions (optional)<input value={order.instructions} onChange={(event) => updateMedicationOrder(index, 'instructions', event.target.value)} /></label>
                  <button type="button" className="doctor-remove-medication" onClick={() => setMedicationOrders((current) => current.filter((_, orderIndex) => orderIndex !== index))}>Remove</button>
                </div>)}
              </section>
              <label className="doctor-wide">Lab / diagnostic orders<textarea rows="2" name="labOrders" placeholder="One order per line" value={consultation.labOrders} onChange={updateConsultation} /></label>
              <label className="doctor-wide">Doctor notes<textarea rows="3" name="doctorNotes" value={consultation.doctorNotes} onChange={updateConsultation} /></label>
              <label>Follow-up date<input type="date" name="followUpDate" value={consultation.followUpDate} onChange={updateConsultation} /></label>
              <div className="doctor-form-actions"><button className="doctor-submit"
                disabled={saving || !patient360 || selectedAppointment.appointmentStatus === 'completed'}>
                {selectedAppointment.appointmentStatus === 'completed'
                  ? 'Appointment completed'
                  : saving ? 'Saving consultation…' : 'Complete consultation'}
              </button></div>
            </form>
          </section>}
          {printablePrescription && <section className="printable-prescription" aria-label="Printable medication prescription">
            <header><strong>MEDCARE HOSPITAL</strong><span>Medication prescription</span></header>
            <div className="print-prescription-details">
              <div><b>Patient</b><span>{printablePrescription.patientName}</span></div>
              <div><b>Patient ID</b><span>{printablePrescription.patientId}</span></div>
              <div><b>Doctor</b><span>{printablePrescription.doctorName}</span></div>
              <div><b>Date</b><span>{printablePrescription.createdAt ? new Date(printablePrescription.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</span></div>
              <div><b>Diagnosis</b><span>{printablePrescription.diagnosis}</span></div>
            </div>
            <h2>Medicines</h2>
            <table><thead><tr><th>Medicine</th><th>Dose / route</th><th>Frequency</th><th>Duration</th><th>Qty</th><th>Instructions</th></tr></thead>
              <tbody>{printablePrescription.medications?.map((item, index) => <tr key={`${item.medicationId}-${index}`}>
                <td>{item.name} {[item.strength, item.dosageForm].filter(Boolean).join(' · ')}</td>
                <td>{item.dose} · {item.route}</td><td>{item.frequency}</td><td>{item.duration}</td>
                <td>{item.quantity}</td><td>{item.instructions || '—'}</td>
              </tr>)}</tbody>
            </table>
            <p className="print-prescription-footer">Please follow the prescribed directions and contact your doctor if you have questions.</p>
          </section>}
        </section>
      </div>
    </main>
  );
}
