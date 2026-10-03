import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeIndianRupee, FileDown, RefreshCw, Wallet } from 'lucide-react';
import { apiFetch } from '../API/api';
import './Operations.css';

const today = new Date();
const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
const emptyComponent = { name: '', code: '', type: 'EARNING', calculation: 'FIXED', formula: '', taxable: true, appliesTo: 'BOTH' };
const emptyAttendance = {
  nurseId: '', fromDate: monthStart, toDate: monthEnd, presentDays: 0, absentDays: 0, lopDays: 0,
  nightShifts: 0, eveningShifts: 0, holidayDutyDays: 0, weeklyOffDutyDays: 0, lateMarks: 0, finalized: false,
};

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.detail || data.title || data.error || `Request failed (${response.status})`);
  }
  return data;
}

async function request(path, options) {
  return readResponse(await apiFetch(path, options));
}

const money = (amount) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 2,
}).format(Number(amount || 0));

export default function PayrollPage() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('overview');
  const [employeeType, setEmployeeType] = useState('DOCTOR');
  const [components, setComponents] = useState([]);
  const [structures, setStructures] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [wards, setWards] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [overtime, setOvertime] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [loans, setLoans] = useState([]);
  const [doctorProfiles, setDoctorProfiles] = useState([]);
  const [doctorRates, setDoctorRates] = useState([]);
  const [doctorEarnings, setDoctorEarnings] = useState([]);
  const [doctorDisputes, setDoctorDisputes] = useState([]);
  const [wardAllowances, setWardAllowances] = useState([]);
  const [myPayslips, setMyPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [componentForm, setComponentForm] = useState(emptyComponent);
  const [structureForm, setStructureForm] = useState({ name: '', appliesTo: 'DOCTOR', description: '', componentId: '', amount: '', percent: '', units: '' });
  const [structureLines, setStructureLines] = useState([]);
  const [salaryForm, setSalaryForm] = useState({ employeeId: '', structureId: '', basic: '', effectiveFrom: monthStart, monthlyHours: '', overtimeMultiplier: '', lopDivisor: '' });
  const [cycleForm, setCycleForm] = useState({ type: 'DOCTOR', month: String(today.getMonth() + 1), year: String(today.getFullYear()) });
  const [overtimeForm, setOvertimeForm] = useState({ nurseId: '', date: today.toISOString().slice(0, 10), hours: '', wardId: '' });
  const [attendanceForm, setAttendanceForm] = useState(emptyAttendance);
  const [adjustmentForm, setAdjustmentForm] = useState({ employeeType: 'DOCTOR', employeeId: '', cycleId: '', type: 'EARNING', amount: '', reason: '' });
  const [loanForm, setLoanForm] = useState({ employeeType: 'DOCTOR', employeeId: '', amount: '', emi: '', reason: '' });
  const [exceptionNote, setExceptionNote] = useState({});
  const [doctorProfileForm, setDoctorProfileForm] = useState({
    doctorId: '', doctorType: 'PERMANENT', payModel: 'FIXED',
    guaranteedMinimum: '', variableCap: '', onCallAllowance: '', effectiveFrom: monthStart,
  });
  const [doctorRateForm, setDoctorRateForm] = useState({
    rateType: 'CONSULTATION', doctorId: '', serviceCode: '', department: '',
    visitType: 'OPD', doctorRole: 'SURGEON', fee: '', sharePercent: '', fixedAmount: '', effectiveFrom: monthStart,
  });
  const [doctorEarningForm, setDoctorEarningForm] = useState({
    doctorId: '', sourceType: 'CONSULTATION', sourceId: '', serviceDate: today.toISOString().slice(0, 10),
    patientRef: '', service: '', visitType: 'OPD', department: '', billingStatus: 'PAID', billedAmount: '',
  });
  const [wardAllowanceForm, setWardAllowanceForm] = useState({
    wardId: '', amount: '', basis: 'PER_DAY', effectiveFrom: monthStart,
  });
  const [wardDaysInput, setWardDaysInput] = useState('{}');
  const [disputeReasons, setDisputeReasons] = useState({});
  const [resolutionNotes, setResolutionNotes] = useState({});

  const roles = useMemo(() => (user?.roles || []).map((role) => String(role).replace(/^ROLE_/, '').toUpperCase()), [user]);
  const isPayrollManager = roles.some((role) => ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'CLINIC_ADMIN', 'FINANCE', 'HR'].includes(role));
  const canManagePayroll = isPayrollManager;
  const canConfigure = roles.some((role) => ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'CLINIC_ADMIN', 'FINANCE'].includes(role));
  const canApprove = roles.some((role) => ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'CLINIC_ADMIN', 'FINANCE'].includes(role));
  const isHeadNurse = roles.includes('HEAD_NURSE');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const me = await request('/users/me');
      setUser(me);
      const normalizedRoles = (me.roles || []).map((role) => String(role).replace(/^ROLE_/, '').toUpperCase());
      const manager = normalizedRoles.some((role) =>
        ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'CLINIC_ADMIN', 'FINANCE', 'HR'].includes(role));
      if (manager) {
        const [
          componentRows, structureRows, cycleRows, overtimeRows, attendanceRows, doctorRows, nurseRows, doctorSalaries, nurseSalaries, wardRows, adjustmentRows, loanRows, profiles, rates, earnings, disputes, allowances,
        ] = await Promise.all([
          request('/payroll/components'), request('/payroll/structures'), request('/payroll/cycles'),
          request('/payroll/nurse-overtime'), request('/payroll/nurse-attendance'),
          request('/payroll/employees?type=DOCTOR'), request('/payroll/employees?type=NURSE'),
          request('/payroll/salaries?type=DOCTOR'), request('/payroll/salaries?type=NURSE'),
          normalizedRoles.some((role) => ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'CLINIC_ADMIN'].includes(role))
            ? request('/nursing/wards') : Promise.resolve([]),
          request('/payroll/adjustments'), request('/payroll/loans'),
          request('/payroll/doctor-pay-profiles'), request('/payroll/doctor-rates'),
          request('/payroll/doctor-earnings'), request('/payroll/doctor-disputes'),
          request('/payroll/nurse-ward-allowances'),
        ]);
        setComponents(componentRows);
        setStructures(structureRows);
        setCycles(cycleRows);
        setOvertime(overtimeRows);
        setAttendance(attendanceRows);
        setEmployees([...doctorRows, ...nurseRows]);
        setSalaries([...doctorSalaries, ...nurseSalaries]);
        setWards(wardRows);
        setAdjustments(adjustmentRows);
        setLoans(loanRows);
        setDoctorProfiles(profiles);
        setDoctorRates(rates);
        setDoctorEarnings(earnings);
        setDoctorDisputes(disputes);
        setWardAllowances(allowances);
      } else if (normalizedRoles.some((role) => ['NURSE', 'HEAD_NURSE'].includes(role))) {
        const [overtimeRows, attendanceRows, payslips, nurseRows, wardRows] = await Promise.all([
          normalizedRoles.includes('HEAD_NURSE') ? request('/payroll/nurse-overtime') : Promise.resolve([]),
          request('/payroll/nurse-attendance/mine'), request('/payroll/me/payslips'),
          normalizedRoles.includes('HEAD_NURSE') ? request('/nursing/nurses') : Promise.resolve([]),
          normalizedRoles.includes('HEAD_NURSE') ? request('/nursing/wards') : Promise.resolve([]),
        ]);
        setOvertime(overtimeRows);
        setAttendance(attendanceRows);
        setMyPayslips(payslips);
        setEmployees(nurseRows.map((row) => ({
          id: row.id,
          employeeCode: row.profile?.employeeId || '',
          name: row.name || row.userId,
          type: 'NURSE',
        })));
        setWards(wardRows);
      } else {
        const [payslips, earnings] = await Promise.all([
          request('/payroll/me/payslips'), request('/payroll/doctor-earnings/mine'),
        ]);
        setMyPayslips(payslips);
        setDoctorEarnings(earnings);
      }
    } catch (requestError) {
      setError(requestError.message || 'Could not load payroll information');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const send = async (path, method, body) => request(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const act = async (operation, message) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await operation();
      setSuccess(message);
      await refresh();
    } catch (requestError) {
      setError(requestError.message || 'Payroll request failed');
    } finally {
      setBusy(false);
    }
  };

  const submitComponent = (event) => {
    event.preventDefault();
    return act(async () => {
      await send('/payroll/components', 'POST', componentForm);
      setComponentForm(emptyComponent);
    }, 'Salary component saved.');
  };

  const addStructureLine = () => {
    const component = components.find((item) => item.id === structureForm.componentId);
    if (!component) return;
    setStructureLines((current) => [...current, {
      componentId: component.id,
      componentName: component.name,
      amount: Number(structureForm.amount || 0),
      percent: Number(structureForm.percent || 0),
      units: Number(structureForm.units || 0),
      sequence: current.length,
    }]);
    setStructureForm((current) => ({ ...current, componentId: '', amount: '', percent: '', units: '' }));
  };

  const submitStructure = (event) => {
    event.preventDefault();
    return act(async () => {
      await send('/payroll/structures', 'POST', {
        ...structureForm,
        components: structureLines.map(({ componentName, ...line }) => line),
      });
      setStructureLines([]);
      setStructureForm({ name: '', appliesTo: 'DOCTOR', description: '', componentId: '', amount: '', percent: '', units: '' });
    }, 'Salary structure created.');
  };

  const submitSalary = (event) => {
    event.preventDefault();
    const employee = employees.find((item) => item.id === salaryForm.employeeId);
    return act(async () => {
      await send('/payroll/employee-salary', 'POST', {
        ...salaryForm,
        employeeType: employee?.type || employeeType,
        basic: Number(salaryForm.basic),
        monthlyHours: salaryForm.monthlyHours ? Number(salaryForm.monthlyHours) : null,
        overtimeMultiplier: salaryForm.overtimeMultiplier ? Number(salaryForm.overtimeMultiplier) : null,
        lopDivisor: salaryForm.lopDivisor ? Number(salaryForm.lopDivisor) : null,
      });
      setSalaryForm((current) => ({ ...current, employeeId: '', structureId: '', basic: '' }));
    }, 'Effective-dated salary assignment saved.');
  };

  const runCycle = (event) => {
    event.preventDefault();
    return act(async () => {
      await send('/payroll/cycles', 'POST', {
        type: cycleForm.type, month: Number(cycleForm.month), year: Number(cycleForm.year),
      });
    }, 'Draft payroll cycle created.');
  };

  const submitOvertime = (event) => {
    event.preventDefault();
    return act(async () => {
      await send('/payroll/nurse-overtime', 'POST', { ...overtimeForm, hours: Number(overtimeForm.hours) });
      setOvertimeForm({ nurseId: '', date: today.toISOString().slice(0, 10), hours: '', wardId: '' });
    }, 'Overtime submitted for approval.');
  };

  const submitAttendance = (event) => {
    event.preventDefault();
    const numericFields = ['presentDays', 'absentDays', 'lopDays', 'nightShifts', 'eveningShifts', 'holidayDutyDays', 'weeklyOffDutyDays', 'lateMarks'];
    const payload = { ...attendanceForm };
    numericFields.forEach((field) => { payload[field] = Number(payload[field] || 0); });
    try {
      payload.wardDays = JSON.parse(wardDaysInput);
      if (!payload.wardDays || Array.isArray(payload.wardDays) || typeof payload.wardDays !== 'object'
        || Object.values(payload.wardDays).some((days) => !Number.isInteger(days) || days < 0)) {
        throw new Error('Ward worked-days must be a JSON object with non-negative whole-number days.');
      }
    } catch (parseError) {
      setError(parseError.message || 'Enter valid ward worked-days JSON.');
      return;
    }
    return act(async () => {
      await send('/payroll/nurse-attendance', 'POST', payload);
      setAttendanceForm(emptyAttendance);
      setWardDaysInput('{}');
    }, 'Nurse attendance summary saved.');
  };

  const submitDoctorProfile = (event) => {
    event.preventDefault();
    const { doctorId, ...profile } = doctorProfileForm;
    return act(async () => {
      await send(`/payroll/doctors/${encodeURIComponent(doctorId)}/pay-profile`, 'POST', {
        ...profile,
        guaranteedMinimum: profile.guaranteedMinimum ? Number(profile.guaranteedMinimum) : null,
        variableCap: profile.variableCap ? Number(profile.variableCap) : null,
        onCallAllowance: profile.onCallAllowance ? Number(profile.onCallAllowance) : null,
      });
      setDoctorProfileForm((current) => ({ ...current, doctorId: '' }));
    }, 'Doctor pay profile revision saved.');
  };

  const submitDoctorRate = (event) => {
    event.preventDefault();
    return act(async () => {
      await send('/payroll/doctor-rates', 'POST', {
        ...doctorRateForm,
        doctorId: doctorRateForm.rateType === 'PROCEDURE' && !doctorRateForm.doctorId ? null : doctorRateForm.doctorId,
        department: doctorRateForm.department || null,
        fee: doctorRateForm.fee ? Number(doctorRateForm.fee) : null,
        sharePercent: doctorRateForm.sharePercent ? Number(doctorRateForm.sharePercent) : null,
        fixedAmount: doctorRateForm.fixedAmount ? Number(doctorRateForm.fixedAmount) : null,
      });
    }, 'Doctor rate card saved.');
  };

  const submitDoctorEarning = (event) => {
    event.preventDefault();
    return act(async () => {
      await send('/payroll/doctor-earnings', 'POST', {
        ...doctorEarningForm,
        billedAmount: Number(doctorEarningForm.billedAmount),
      });
      setDoctorEarningForm((current) => ({ ...current, sourceId: '', patientRef: '', service: '', billedAmount: '' }));
    }, 'Verified doctor earning captured.');
  };

  const submitWardAllowance = (event) => {
    event.preventDefault();
    return act(async () => {
      await send('/payroll/nurse-ward-allowances', 'POST', {
        ...wardAllowanceForm,
        amount: Number(wardAllowanceForm.amount),
      });
      setWardAllowanceForm((current) => ({ ...current, wardId: '', amount: '' }));
    }, 'Ward allowance saved.');
  };

  const submitAdjustment = (event) => {
    event.preventDefault();
    return act(async () => {
      await send('/payroll/adjustments', 'POST', { ...adjustmentForm, amount: Number(adjustmentForm.amount) });
      setAdjustmentForm({ employeeType: 'DOCTOR', employeeId: '', cycleId: '', type: 'EARNING', amount: '', reason: '' });
    }, 'Adjustment submitted for approval.');
  };

  const submitLoan = (event) => {
    event.preventDefault();
    return act(async () => {
      await send('/payroll/loans', 'POST', {
        ...loanForm, amount: Number(loanForm.amount), emi: Number(loanForm.emi),
      });
      setLoanForm({ employeeType: 'DOCTOR', employeeId: '', amount: '', emi: '', reason: '' });
    }, 'Advance recorded.');
  };

  const transition = (cycleId, action, message) => act(async () => {
    await send(`/payroll/cycles/${cycleId}/${action}`, 'PUT');
  }, message);

  const selectedEmployees = employees.filter((employee) => employee.type === employeeType);
  const nurses = employees.filter((employee) => employee.type === 'NURSE');
  const activeCycles = cycles.filter((cycle) => cycle.status !== 'PAID');
  const totalPay = cycles.filter((cycle) => cycle.status === 'PAID' || cycle.status === 'LOCKED')
    .reduce((total, cycle) => total + Number(cycle.netTotal || 0), 0);
  const pendingOvertime = overtime.filter((item) => item.status === 'PENDING').length;
  const calculateBlockers = (cycle) => {
    const hasApplicableStructure = structures.some((structure) => structure.active !== false
      && (structure.appliesTo === cycle.employeeType || structure.appliesTo === 'BOTH'));
    const applicableSalaries = salaries.filter((salary) => salary.employeeType === cycle.employeeType
      && salary.effectiveFrom <= cycle.toDate
      && (!salary.effectiveTo || salary.effectiveTo >= cycle.fromDate));
    const blockers = [];
    if (!applicableSalaries.length) {
      blockers.push(hasApplicableStructure
        ? { message: 'Assign a salary structure with an effective date that overlaps this cycle.', tab: 'salary', label: 'Assign salaries' }
        : { message: `Create a ${cycle.employeeType.toLowerCase()} salary component and structure before assigning salaries.`, tab: 'configuration', label: 'Create salary structure' });
    }
    if (cycle.employeeType === 'NURSE') {
      const missingAttendance = applicableSalaries.some((salary) => !attendance.some((summary) =>
        summary.nurseId === salary.employeeId && summary.fromDate === cycle.fromDate
        && summary.toDate === cycle.toDate && summary.finalized));
      if (missingAttendance) {
        blockers.push({ message: 'Finalize attendance for every assigned nurse for this full cycle.', tab: 'attendance', label: 'Review attendance' });
      }
    }
    if (adjustments.some((item) => item.cycleId === cycle.id && item.status === 'PENDING')) {
      blockers.push({ message: 'Approve or reject pending adjustments before calculating this cycle.', tab: 'adjustments', label: 'Review adjustments' });
    }
    return blockers;
  };
  const downloadReport = async () => {
    setBusy(true); setError('');
    try {
      const response = await apiFetch('/payroll/reports/salary-register');
      if (!response.ok) throw new Error('Could not download payroll report');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'payroll-salary-register.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    } finally { setBusy(false); }
  };

  const downloadPayslip = async (entryId, selfService = false) => {
    setBusy(true); setError('');
    try {
      const response = await apiFetch(selfService
        ? `/payroll/me/payslips/${encodeURIComponent(entryId)}.pdf`
        : `/payroll/entries/${encodeURIComponent(entryId)}/payslip.pdf`);
      if (!response.ok) throw new Error(await response.text() || 'Could not download payslip');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `payslip-${entryId}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message || 'Could not download payslip');
    } finally { setBusy(false); }
  };

  const renderSelfService = () => (
    <>
      <section className="workflow-kpis">
        <article><span>Available payslips</span><strong>{myPayslips.length}</strong><Wallet size={18} /></article>
      </section>
      <section className="workflow-panel">
        <div className="workflow-panel-heading"><div><h2>My payslips and earnings</h2><p>Only your own locked or paid payroll cycles are shown.</p></div></div>
        {!myPayslips.length ? <div className="workflow-empty">No locked payslips are available yet.</div> :
          <div className="workflow-table-wrap"><table className="workflow-table">
            <thead><tr><th>Period</th><th>Status</th><th>Gross</th><th>Deductions</th><th>Net pay</th><th>Breakdown</th><th>Payslip</th></tr></thead>
            <tbody>{myPayslips.map((cycle) => {
              const entry = cycle.entries?.[0];
              return <tr key={cycle.id}><td>{cycle.month}/{cycle.year}</td><td>{cycle.status}</td>
                <td>{money(entry?.gross)}</td><td>{money(entry?.totalDeductions)}</td><td><strong>{money(entry?.netPay)}</strong></td>
                <td>{entry?.lines?.map((line, index) => <small key={`${line.componentCode}-${index}`}>{line.componentName}: {money(line.amount)}<br /></small>)}</td>
                <td><button className="workflow-button subtle" type="button" disabled={busy || !entry?.id} onClick={() => downloadPayslip(entry.id, true)}><FileDown size={14} /> Download</button></td>
              </tr>;
            })}</tbody>
          </table></div>}
      </section>
      {isHeadNurse && <>
        <form className="workflow-form-panel" onSubmit={submitOvertime}>
          <div className="workflow-panel-heading"><div><h2>Submit ward overtime</h2><p>Amounts are restricted; HR/Admin must approve submitted extra hours.</p></div></div>
          <div className="workflow-form-grid">
            <label>Nurse<select required value={overtimeForm.nurseId} onChange={(event) => setOvertimeForm({ ...overtimeForm, nurseId: event.target.value })}><option value="">Select nurse</option>{nurses.map((item) => <option key={item.id} value={item.id}>{item.employeeCode} · {item.name}</option>)}</select></label>
            <label>Shift date<input required type="date" value={overtimeForm.date} onChange={(event) => setOvertimeForm({ ...overtimeForm, date: event.target.value })} /></label>
            <label>Extra hours<input required min="0.01" step="0.01" type="number" value={overtimeForm.hours} onChange={(event) => setOvertimeForm({ ...overtimeForm, hours: event.target.value })} /></label>
            <label>Ward<select required value={overtimeForm.wardId} onChange={(event) => setOvertimeForm({ ...overtimeForm, wardId: event.target.value })}><option value="">Select ward</option>{wards.map((ward) => <option key={ward.id} value={ward.id}>{ward.name}</option>)}</select></label>
          </div><div className="workflow-form-actions"><button className="workflow-button primary" disabled={busy}>Submit overtime</button></div>
        </form>
        <section className="workflow-panel">
          <div className="workflow-panel-heading"><div><h2>Ward overtime and attendance</h2><p>Requests in your assigned wards only.</p></div></div>
          <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Nurse</th><th>Date</th><th>Hours</th><th>Ward</th><th>Status</th></tr></thead>
            <tbody>{overtime.map((item) => <tr key={item.id}><td>{nurses.find((nurse) => nurse.id === item.nurseId)?.name || item.nurseId}</td><td>{item.date}</td><td>{item.hours}</td><td>{wards.find((ward) => ward.id === item.wardId)?.name || item.wardId}</td><td>{item.status}</td></tr>)}</tbody></table></div>
        </section>
      </>}
      {roles.some((role) => ['NURSE', 'HEAD_NURSE'].includes(role)) && <section className="workflow-panel">
        <div className="workflow-panel-heading"><div><h2>My attendance history</h2><p>Attendance summaries associated with your own nursing account.</p></div></div>
        {!attendance.length ? <div className="workflow-empty">No attendance summaries are available.</div> :
          <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Period</th><th>Present</th><th>Absent</th><th>LOP</th><th>Night shifts</th><th>Finalized</th></tr></thead>
            <tbody>{attendance.map((item) => <tr key={item.id}><td>{item.fromDate} – {item.toDate}</td><td>{item.presentDays}</td>
              <td>{item.absentDays}</td><td>{item.lopDays}</td><td>{item.nightShifts}</td><td>{item.finalized ? 'Yes' : 'No'}</td></tr>)}</tbody>
          </table></div>}
      </section>}
      {roles.includes('DOCTOR') && <section className="workflow-panel">
        <div className="workflow-panel-heading"><div><h2>My earnings statement</h2><p>Only verified earnings linked to your doctor profile are visible here.</p></div></div>
        <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Date</th><th>Patient reference</th><th>Service</th><th>Billed</th><th>Doctor share</th><th>Status</th><th>Dispute</th></tr></thead>
          <tbody>{doctorEarnings.map((item) => <tr key={item.id}><td>{item.serviceDate}</td><td>{item.patientRef || '—'}</td>
            <td>{item.service}</td><td>{money(item.billedAmount)}</td><td>{money(item.doctorShare)}</td><td>{item.status}</td>
            <td>{item.status === 'INCLUDED' && <form className="workflow-row-actions" onSubmit={(event) => {
              event.preventDefault();
              act(async () => send(`/payroll/doctor-earnings/${item.id}/dispute`, 'POST', {
                reason: disputeReasons[item.id] || '',
              }), 'Earnings dispute submitted to Finance.');
            }}>
              <input aria-label={`Dispute reason ${item.id}`} required value={disputeReasons[item.id] || ''}
                onChange={(event) => setDisputeReasons({ ...disputeReasons, [item.id]: event.target.value })} />
              <button className="workflow-button subtle" disabled={busy}>Dispute</button>
            </form>}</td>
          </tr>)}</tbody></table></div>
      </section>}
    </>
  );

  return (
    <main className="workflow-page">
      <header className="workflow-header">
        <div><p className="workflow-eyebrow">People &amp; payroll</p><h1>{isPayrollManager ? 'Payroll management' : 'My payroll'}</h1>
          <p>{isPayrollManager ? 'Separate doctor and nurse cycles, with configurable salary rules and approval controls.' : 'Secure access to your personal payslips and payroll details.'}</p></div>
        <div className="workflow-toolbar-actions">
          <a className="workflow-button subtle" href={isPayrollManager ? '/HospitalDashboard' : roles.includes('DOCTOR') ? '/DoctorDashboard' : '/HospitalDashboard'}>Back to workspace</a>
          <button className="workflow-button subtle" type="button" onClick={refresh} disabled={loading}><RefreshCw size={15} /> Refresh</button>
        </div>
      </header>
      {error && <div className="workflow-alert error" role="alert">{error}</div>}
      {success && <div className="workflow-alert success" role="status">{success}</div>}
      {loading ? <div className="workflow-empty">Loading payroll information…</div> :
        !isPayrollManager ? renderSelfService() :
          <>
            <nav className="workflow-tabs" aria-label="Payroll sections">
              {[
                ['overview', 'Overview'], ['cycles', 'Payroll runs'], ['salary', 'Salary setup'],
                ['configuration', 'Components & structures'], ['doctor-pay', 'Doctor pay & earnings'],
                ['attendance', 'Attendance & overtime'], ['adjustments', 'Adjustments & advances'], ['reports', 'Reports'],
              ].map(([id, label]) => <button key={id} type="button" className={tab === id ? 'active' : ''}
                aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>{label}</button>)}
            </nav>
            {tab === 'overview' && <>
              <section className="workflow-kpis">
                <article><span>Active cycles</span><strong>{activeCycles.length}</strong><Wallet size={18} /></article>
                <article><span>Locked / paid total</span><strong>{money(totalPay)}</strong><BadgeIndianRupee size={18} /></article>
                <article className={pendingOvertime ? 'attention' : ''}><span>Overtime awaiting review</span><strong>{pendingOvertime}</strong></article>
                <article><span>Salary assignments</span><strong>{salaries.filter((item) => item.active).length}</strong></article>
              </section>
              <section className="workflow-panel">
                <div className="workflow-panel-heading"><div><h2>Recent payroll cycles</h2><p>Doctor and nurse payroll are calculated separately.</p></div></div>
                {cycles.length ? <div className="workflow-table-wrap"><table className="workflow-table">
                  <thead><tr><th>Group</th><th>Period</th><th>Status</th><th>Employees</th><th>Net total</th><th /></tr></thead>
                  <tbody>{cycles.slice().reverse().slice(0, 8).map((cycle) => <tr key={cycle.id}><td>{cycle.employeeType}</td>
                    <td>{cycle.month}/{cycle.year}</td><td>{cycle.status}</td><td>{cycle.entries?.length || 0}</td><td>{money(cycle.netTotal)}</td>
                    <td><button className="workflow-button subtle" type="button" onClick={() => setTab('cycles')}>Review</button></td>
                  </tr>)}</tbody></table></div> : <div className="workflow-empty">Create a draft cycle to begin payroll.</div>}
              </section>
            </>}
            {tab === 'cycles' && <>
              <form className="workflow-form-panel" onSubmit={runCycle}>
                <div className="workflow-panel-heading"><div><h2>Create monthly payroll cycle</h2><p>Duplicate runs for an employee group and month are blocked.</p></div></div>
                <div className="workflow-form-grid">
                  <label>Employee group<select value={cycleForm.type} onChange={(event) => setCycleForm({ ...cycleForm, type: event.target.value })}>
                    <option value="DOCTOR">Doctors</option><option value="NURSE">Nurses</option></select></label>
                  <label>Month<input type="number" min="1" max="12" required value={cycleForm.month} onChange={(event) => setCycleForm({ ...cycleForm, month: event.target.value })} /></label>
                  <label>Year<input type="number" min="2000" required value={cycleForm.year} onChange={(event) => setCycleForm({ ...cycleForm, year: event.target.value })} /></label>
                </div><div className="workflow-form-actions"><button className="workflow-button primary" disabled={busy}>Create draft cycle</button></div>
              </form>
              <div className="workflow-panel-heading"><div><h2>Payroll cycles</h2><p>Draft → Calculated → Under review → Approved → Locked → Paid.</p></div></div>
              {cycles.slice().reverse().map((cycle) => <section className="workflow-panel" key={cycle.id}>
                <div className="workflow-panel-heading"><div><h2>{cycle.employeeType} · {cycle.month}/{cycle.year}</h2>
                  <p>Status: {cycle.status} · Net total: {money(cycle.netTotal)}</p></div>
                  <div className="workflow-row-actions">
                    {cycle.status === 'DRAFT' && <button className="workflow-button primary" type="button" disabled={busy || calculateBlockers(cycle).length > 0} onClick={() => act(async () => send(`/payroll/cycles/${cycle.id}/calculate`, 'POST'), 'Payroll calculated.')}>Calculate</button>}
                    {cycle.status === 'CALCULATED' && <button className="workflow-button primary" type="button" disabled={busy} onClick={() => transition(cycle.id, 'submit-review', 'Cycle submitted for review.')}>Submit review</button>}
                    {cycle.status === 'UNDER_REVIEW' && (canApprove || cycle.exceptions?.length > 0) && <button className="workflow-button primary" type="button" disabled={busy} onClick={async () => {
                      if (cycle.exceptions?.length) {
                        const note = exceptionNote[cycle.id] || '';
                        if (!note.trim()) { setError('Enter a review note before approving payroll exceptions.'); return; }
                        await act(async () => send(`/payroll/cycles/${cycle.id}/review-exceptions`, 'PUT', { note }), 'Exceptions reviewed.');
                      }
                      if (canApprove) await transition(cycle.id, 'approve', 'Cycle approved.');
                    }}>{canApprove ? 'Approve cycle' : 'Review exceptions'}</button>}
                    {canApprove && cycle.status === 'APPROVED' && <button className="workflow-button primary" type="button" disabled={busy} onClick={() => transition(cycle.id, 'lock', 'Cycle locked. Changes now require a future-cycle adjustment.')}>Lock</button>}
                    {canApprove && cycle.status === 'LOCKED' && <button className="workflow-button primary" type="button" disabled={busy} onClick={() => transition(cycle.id, 'mark-paid', 'Cycle marked paid.')}>Mark paid</button>}
                  </div>
                </div>
                {cycle.status === 'DRAFT' && calculateBlockers(cycle).map((blocker) => <div className="workflow-alert error" key={blocker.message}>
                  <span>{blocker.message}</span>{' '}
                  <button className="workflow-button subtle" type="button" onClick={() => setTab(blocker.tab)}>{blocker.label}</button>
                </div>)}
                {!!cycle.exceptions?.length && <div className="workflow-alert error">{cycle.exceptions.map((item) => <div key={item}>{item}</div>)}
                  {cycle.status === 'UNDER_REVIEW' && <label className="workflow-exception-note">Exception review note
                    <input value={exceptionNote[cycle.id] || ''} onChange={(event) => setExceptionNote({ ...exceptionNote, [cycle.id]: event.target.value })} /></label>}</div>}
                {!!cycle.entries?.length && <div className="workflow-table-wrap"><table className="workflow-table">
                  <thead><tr><th>Employee</th><th>Code</th><th>Gross</th><th>Deductions</th><th>Net</th><th>Status</th><th>Payslip</th></tr></thead>
                  <tbody>{cycle.entries.map((entry) => <tr key={entry.employeeId}><td>{entry.employeeName}</td><td>{entry.employeeCode}</td>
                    <td>{money(entry.gross)}</td><td>{money(entry.totalDeductions)}</td><td>{money(entry.netPay)}</td><td>{entry.status}</td>
                    <td>{['LOCKED', 'PAID'].includes(cycle.status) && <button className="workflow-button subtle" type="button" disabled={busy || !entry.id} onClick={() => downloadPayslip(entry.id)}><FileDown size={14} /> PDF</button>}</td></tr>)}</tbody>
                </table></div>}
              </section>)}
            </>}
            {tab === 'salary' && <>
              {!structures.some((structure) => structure.active !== false
                && (structure.appliesTo === employeeType || structure.appliesTo === 'BOTH')) &&
                <div className="workflow-alert error">
                  <span>No active salary structure is set up for {employeeType.toLowerCase()} staff yet. Create a component and structure before assigning salary.</span>{' '}
                  {canConfigure
                    ? <button className="workflow-button subtle" type="button" onClick={() => setTab('configuration')}>Create salary structure</button>
                    : <span>Ask Finance or an administrator to configure the salary structure.</span>}
                </div>}
              <form className="workflow-inline-form" onSubmit={submitSalary}>
                <label>Employee group<select value={employeeType} onChange={(event) => {
                  setEmployeeType(event.target.value);
                  setSalaryForm((current) => ({ ...current, employeeId: '', structureId: '' }));
                }}><option value="DOCTOR">Doctors</option><option value="NURSE">Nurses</option></select></label>
                <label>Employee<select required value={salaryForm.employeeId} onChange={(event) => setSalaryForm({ ...salaryForm, employeeId: event.target.value })}>
                  <option value="">Select employee</option>{selectedEmployees.map((item) => <option key={item.id} value={item.id}>{item.employeeCode} · {item.name}</option>)}</select></label>
                <label>Structure<select required value={salaryForm.structureId} onChange={(event) => setSalaryForm({ ...salaryForm, structureId: event.target.value })}>
                  <option value="">Select structure</option>{structures.filter((item) => item.appliesTo === employeeType || item.appliesTo === 'BOTH').map((item) => <option key={item.id} value={item.id}>{item.name} v{item.version}</option>)}</select></label>
                <label>Monthly basic<input required min="0" type="number" step="0.01" value={salaryForm.basic} onChange={(event) => setSalaryForm({ ...salaryForm, basic: event.target.value })} /></label>
                <label>Effective from<input required type="date" value={salaryForm.effectiveFrom} onChange={(event) => setSalaryForm({ ...salaryForm, effectiveFrom: event.target.value })} /></label>
                {employeeType === 'NURSE' && <>
                  <label>Monthly hours for overtime<input type="number" min="0" step="0.01" value={salaryForm.monthlyHours} onChange={(event) => setSalaryForm({ ...salaryForm, monthlyHours: event.target.value })} /></label>
                  <label>Overtime multiplier<input type="number" min="0" step="0.01" value={salaryForm.overtimeMultiplier} onChange={(event) => setSalaryForm({ ...salaryForm, overtimeMultiplier: event.target.value })} /></label>
                  <label>LOP divisor<input type="number" min="0" step="0.01" value={salaryForm.lopDivisor} onChange={(event) => setSalaryForm({ ...salaryForm, lopDivisor: event.target.value })} /></label>
                </>}
                <button className="workflow-button primary" disabled={busy}>Assign salary</button>
              </form>
              <section className="workflow-panel"><div className="workflow-panel-heading"><div><h2>Effective-dated salary history</h2><p>Salary changes create new records; earlier revisions stay in history.</p></div></div>
                <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Type</th><th>Employee</th><th>Structure</th><th>Basic</th><th>Effective from</th><th>Current</th></tr></thead>
                  <tbody>{salaries.map((salary) => {
                    const employee = employees.find((item) => item.id === salary.employeeId);
                    const structure = structures.find((item) => item.id === salary.structureId);
                    return <tr key={salary.id}><td>{salary.employeeType}</td><td>{employee?.employeeCode || salary.employeeId}</td>
                      <td>{structure?.name || salary.structureId}</td><td>{money(salary.basic)}</td><td>{salary.effectiveFrom}</td><td>{salary.active ? 'Yes' : 'No'}</td></tr>;
                  })}</tbody></table></div></section>
            </>}
            {tab === 'doctor-pay' && <>
                  {canConfigure && <form className="workflow-form-panel" onSubmit={submitDoctorProfile}>
                    <div className="workflow-panel-heading"><div><h2>Doctor pay profile</h2><p>Each revision takes effect on the selected date; historical profile revisions are retained.</p></div></div>
                    <div className="workflow-form-grid">
                      <label>Doctor<select required value={doctorProfileForm.doctorId} onChange={(event) => setDoctorProfileForm({ ...doctorProfileForm, doctorId: event.target.value })}>
                        <option value="">Select doctor</option>{employees.filter((item) => item.type === 'DOCTOR').map((item) => <option key={item.id} value={item.id}>{item.employeeCode} · {item.name}</option>)}</select></label>
                      <label>Employment type<select value={doctorProfileForm.doctorType} onChange={(event) => setDoctorProfileForm({ ...doctorProfileForm, doctorType: event.target.value })}>
                        {['PERMANENT', 'VISITING', 'RESIDENT', 'PART_TIME'].map((value) => <option key={value}>{value}</option>)}</select></label>
                      <label>Pay model<select value={doctorProfileForm.payModel} onChange={(event) => setDoctorProfileForm({ ...doctorProfileForm, payModel: event.target.value })}>
                        {['FIXED', 'CONSULTATION_SHARE', 'PROCEDURE_SHARE', 'PER_VISIT', 'HYBRID'].map((value) => <option key={value}>{value}</option>)}</select></label>
                      <label>Guaranteed monthly minimum<input type="number" min="0" step="0.01" value={doctorProfileForm.guaranteedMinimum} onChange={(event) => setDoctorProfileForm({ ...doctorProfileForm, guaranteedMinimum: event.target.value })} /></label>
                      <label>Variable earnings cap<input type="number" min="0" step="0.01" value={doctorProfileForm.variableCap} onChange={(event) => setDoctorProfileForm({ ...doctorProfileForm, variableCap: event.target.value })} /></label>
                      <label>On-call duty allowance<input type="number" min="0" step="0.01" value={doctorProfileForm.onCallAllowance} onChange={(event) => setDoctorProfileForm({ ...doctorProfileForm, onCallAllowance: event.target.value })} /></label>
                      <label>Effective from<input type="date" required value={doctorProfileForm.effectiveFrom} onChange={(event) => setDoctorProfileForm({ ...doctorProfileForm, effectiveFrom: event.target.value })} /></label>
                    </div><div className="workflow-form-actions"><button className="workflow-button primary" disabled={busy}>Save doctor profile</button></div>
                  </form>}
                  {canConfigure && <form className="workflow-form-panel" onSubmit={submitDoctorRate}>
                    <div className="workflow-panel-heading"><div><h2>Consultation and procedure rates</h2><p>Only verified PAID/FINALIZED services can be captured as variable earnings.</p></div></div>
                    <div className="workflow-form-grid">
                      <label>Rate type<select value={doctorRateForm.rateType} onChange={(event) => setDoctorRateForm({ ...doctorRateForm, rateType: event.target.value })}><option>CONSULTATION</option><option>PROCEDURE</option></select></label>
                      {doctorRateForm.rateType === 'CONSULTATION' && <label>Doctor<select required value={doctorRateForm.doctorId} onChange={(event) => setDoctorRateForm({ ...doctorRateForm, doctorId: event.target.value })}><option value="">Select doctor</option>{employees.filter((item) => item.type === 'DOCTOR').map((item) => <option key={item.id} value={item.id}>{item.employeeCode} · {item.name}</option>)}</select></label>}
                      <label>Service / procedure code<input required value={doctorRateForm.serviceCode} onChange={(event) => setDoctorRateForm({ ...doctorRateForm, serviceCode: event.target.value })} /></label>
                      {doctorRateForm.rateType === 'CONSULTATION' ? <>
                        <label>Visit type<select value={doctorRateForm.visitType} onChange={(event) => setDoctorRateForm({ ...doctorRateForm, visitType: event.target.value })}><option>OPD</option><option>IPD</option><option>EMERGENCY</option></select></label>
                        <label>Department (optional)<input value={doctorRateForm.department} onChange={(event) => setDoctorRateForm({ ...doctorRateForm, department: event.target.value })} /></label>
                        <label>Consultation fee<input required type="number" min="0" step="0.01" value={doctorRateForm.fee} onChange={(event) => setDoctorRateForm({ ...doctorRateForm, fee: event.target.value })} /></label>
                      </> : <>
                        <label>Procedure role<select value={doctorRateForm.doctorRole} onChange={(event) => setDoctorRateForm({ ...doctorRateForm, doctorRole: event.target.value })}><option>SURGEON</option><option>ASSISTANT</option><option>ANESTHETIST</option></select></label>
                        <label>Doctor (optional for shared role rate)<select value={doctorRateForm.doctorId} onChange={(event) => setDoctorRateForm({ ...doctorRateForm, doctorId: event.target.value })}><option value="">Any doctor with this role</option>{employees.filter((item) => item.type === 'DOCTOR').map((item) => <option key={item.id} value={item.id}>{item.employeeCode} · {item.name}</option>)}</select></label>
                      </>}
                      <label>Share percentage<input type="number" min="0" max="100" step="0.01" value={doctorRateForm.sharePercent} onChange={(event) => setDoctorRateForm({ ...doctorRateForm, sharePercent: event.target.value })} /></label>
                      {doctorRateForm.rateType === 'PROCEDURE' && <label>Fixed amount (optional)<input type="number" min="0" step="0.01" value={doctorRateForm.fixedAmount} onChange={(event) => setDoctorRateForm({ ...doctorRateForm, fixedAmount: event.target.value })} /></label>}
                      <label>Effective from<input type="date" required value={doctorRateForm.effectiveFrom} onChange={(event) => setDoctorRateForm({ ...doctorRateForm, effectiveFrom: event.target.value })} /></label>
                    </div><div className="workflow-form-actions"><button className="workflow-button primary" disabled={busy}>Save rate card</button></div>
                  </form>}
                  {canConfigure && <form className="workflow-form-panel" onSubmit={submitDoctorEarning}>
                    <div className="workflow-panel-heading"><div><h2>Capture verified doctor earning</h2><p>Billing is entered by Finance; appointment completion alone does not count as payment.</p></div></div>
                    <div className="workflow-form-grid">
                      <label>Doctor<select required value={doctorEarningForm.doctorId} onChange={(event) => setDoctorEarningForm({ ...doctorEarningForm, doctorId: event.target.value })}><option value="">Select doctor</option>{employees.filter((item) => item.type === 'DOCTOR').map((item) => <option key={item.id} value={item.id}>{item.employeeCode} · {item.name}</option>)}</select></label>
                      <label>Source type<select value={doctorEarningForm.sourceType} onChange={(event) => setDoctorEarningForm({ ...doctorEarningForm, sourceType: event.target.value, billingStatus: event.target.value === 'ON_CALL' ? 'COMPLETED' : 'PAID' })}><option>CONSULTATION</option><option>VISIT</option><option>PROCEDURE</option><option>ON_CALL</option></select></label>
                      <label>Billing / duty reference<input required value={doctorEarningForm.sourceId} onChange={(event) => setDoctorEarningForm({ ...doctorEarningForm, sourceId: event.target.value })} /></label>
                      <label>Service code / name<input required value={doctorEarningForm.service} onChange={(event) => setDoctorEarningForm({ ...doctorEarningForm, service: event.target.value })} /></label>
                      {doctorEarningForm.sourceType === 'PROCEDURE' && <label>Doctor's procedure role<select value={doctorEarningForm.doctorRole || 'SURGEON'} onChange={(event) => setDoctorEarningForm({ ...doctorEarningForm, doctorRole: event.target.value })}><option>SURGEON</option><option>ASSISTANT</option><option>ANESTHETIST</option></select></label>}
                      {['CONSULTATION', 'VISIT'].includes(doctorEarningForm.sourceType) && <label>Visit type<select value={doctorEarningForm.visitType} onChange={(event) => setDoctorEarningForm({ ...doctorEarningForm, visitType: event.target.value })}><option>OPD</option><option>IPD</option><option>EMERGENCY</option></select></label>}
                      <label>Service date<input type="date" required value={doctorEarningForm.serviceDate} onChange={(event) => setDoctorEarningForm({ ...doctorEarningForm, serviceDate: event.target.value })} /></label>
                      <label>Patient reference (optional)<input value={doctorEarningForm.patientRef} onChange={(event) => setDoctorEarningForm({ ...doctorEarningForm, patientRef: event.target.value })} /></label>
                      <label>Department (optional)<input value={doctorEarningForm.department} onChange={(event) => setDoctorEarningForm({ ...doctorEarningForm, department: event.target.value })} /></label>
                      <label>{doctorEarningForm.sourceType === 'ON_CALL' ? 'Duty status' : 'Billing status'}<select value={doctorEarningForm.billingStatus} onChange={(event) => setDoctorEarningForm({ ...doctorEarningForm, billingStatus: event.target.value })}>{doctorEarningForm.sourceType === 'ON_CALL' ? <option>COMPLETED</option> : <><option>PAID</option><option>FINALIZED</option></>}</select></label>
                      <label>Billed amount<input type="number" min="0" step="0.01" required value={doctorEarningForm.billedAmount} onChange={(event) => setDoctorEarningForm({ ...doctorEarningForm, billedAmount: event.target.value })} /></label>
                    </div><div className="workflow-form-actions"><button className="workflow-button primary" disabled={busy}>Capture earning</button></div>
                  </form>}
                  <section className="workflow-panel"><div className="workflow-panel-heading"><div><h2>Doctor pay profiles</h2><p>Effective-dated employment/pay model settings.</p></div></div>
                    <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Doctor</th><th>Employment</th><th>Pay model</th><th>Guarantee</th><th>Variable cap</th><th>On-call</th><th>Effective from</th></tr></thead>
                      <tbody>{doctorProfiles.map((item) => <tr key={item.id}><td>{employees.find((employee) => employee.id === item.doctorId)?.name || item.doctorId}</td><td>{item.doctorType}</td><td>{item.payModel}</td><td>{money(item.guaranteedMinimum)}</td><td>{item.variableCap == null ? '—' : money(item.variableCap)}</td><td>{money(item.onCallAllowance)}</td><td>{item.effectiveFrom}</td></tr>)}</tbody></table></div>
                  </section>
                  <section className="workflow-panel"><div className="workflow-panel-heading"><div><h2>Doctor rate cards</h2><p>Active and historical effective-dated consultation/procedure terms.</p></div></div>
                    <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Type</th><th>Doctor / role</th><th>Service code</th><th>Visit</th><th>Department</th><th>Fee</th><th>Share / fixed</th><th>Effective</th></tr></thead>
                      <tbody>{doctorRates.map((item) => <tr key={item.id}><td>{item.rateType}</td>
                        <td>{item.doctorId ? employees.find((employee) => employee.id === item.doctorId)?.name || item.doctorId : item.doctorRole || '—'}</td>
                        <td>{item.serviceCode}</td><td>{item.visitType || '—'}</td><td>{item.department || '—'}</td>
                        <td>{item.fee == null ? '—' : money(item.fee)}</td><td>{item.sharePercent == null ? money(item.fixedAmount) : `${item.sharePercent}%`}</td>
                        <td>{item.effectiveFrom}{item.effectiveTo ? ` – ${item.effectiveTo}` : ' onward'}</td></tr>)}</tbody></table></div>
                  </section>
                  <section className="workflow-panel"><div className="workflow-panel-heading"><div><h2>Doctor earning ledger</h2><p>Reverse only with a documented refund or cancellation reason.</p></div></div>
                    <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Doctor</th><th>Date</th><th>Service / reference</th><th>Billed</th><th>Share</th><th>Status</th><th>Reverse</th></tr></thead>
                      <tbody>{doctorEarnings.map((item) => <tr key={item.id}><td>{employees.find((employee) => employee.id === item.doctorId)?.name || item.doctorId}</td><td>{item.serviceDate}</td>
                        <td>{item.service} · {item.sourceId}</td><td>{money(item.billedAmount)}</td><td>{money(item.doctorShare)}</td><td>{item.status}</td>
                        <td>{canApprove && item.status === 'INCLUDED' && <form className="workflow-row-actions" onSubmit={(event) => {
                          event.preventDefault();
                          act(async () => send(`/payroll/doctor-earnings/${item.id}/reverse`, 'PUT', { reason: disputeReasons[`reverse-${item.id}`] || '' }), 'Doctor earning reversed.');
                        }}>
                          <input aria-label={`Reversal reason ${item.id}`} required value={disputeReasons[`reverse-${item.id}`] || ''}
                            onChange={(event) => setDisputeReasons({ ...disputeReasons, [`reverse-${item.id}`]: event.target.value })} />
                          <button className="workflow-button subtle" disabled={busy}>Reverse</button>
                        </form>}</td>
                      </tr>)}</tbody></table></div>
                  </section>
                  <section className="workflow-panel"><div className="workflow-panel-heading"><div><h2>Doctor earnings disputes</h2><p>Open disputes block approval of a payroll cycle containing the disputed earning.</p></div></div>
                    <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Doctor</th><th>Earning</th><th>Reason</th><th>Status</th><th>Resolution</th></tr></thead>
                      <tbody>{doctorDisputes.map((item) => <tr key={item.id}><td>{employees.find((employee) => employee.id === item.doctorId)?.name || item.doctorId}</td><td>{item.earningId}</td><td>{item.reason}</td><td>{item.status}</td>
                        <td>{item.status === 'OPEN' && canApprove && <form className="workflow-row-actions" onSubmit={(event) => {
                          event.preventDefault();
                          act(async () => send(`/payroll/doctor-disputes/${item.id}/resolve`, 'PUT', { resolution: resolutionNotes[item.id] || '' }), 'Doctor dispute resolved.');
                        }}>
                          <input aria-label={`Resolution for dispute ${item.id}`} required value={resolutionNotes[item.id] || ''}
                            onChange={(event) => setResolutionNotes({ ...resolutionNotes, [item.id]: event.target.value })} />
                          <button className="workflow-button subtle" disabled={busy}>Resolve</button>
                        </form>}</td>
                      </tr>)}</tbody></table></div>
                  </section>
                  <section className="workflow-panel"><div className="workflow-panel-heading"><div><h2>Nurse ward allowances</h2><p>Allowance amounts use each nurse's recorded worked days by ward.</p></div></div>
                    {canConfigure && <form className="workflow-inline-form" onSubmit={submitWardAllowance}>
                      <label>Ward ID<input required value={wardAllowanceForm.wardId} onChange={(event) => setWardAllowanceForm({ ...wardAllowanceForm, wardId: event.target.value })} /></label>
                      <label>Amount<input required type="number" min="0" step="0.01" value={wardAllowanceForm.amount} onChange={(event) => setWardAllowanceForm({ ...wardAllowanceForm, amount: event.target.value })} /></label>
                      <label>Basis<select value={wardAllowanceForm.basis} onChange={(event) => setWardAllowanceForm({ ...wardAllowanceForm, basis: event.target.value })}><option>PER_DAY</option><option>PER_MONTH</option></select></label>
                      <label>Effective from<input required type="date" value={wardAllowanceForm.effectiveFrom} onChange={(event) => setWardAllowanceForm({ ...wardAllowanceForm, effectiveFrom: event.target.value })} /></label>
                      <button className="workflow-button primary" disabled={busy}>Save allowance</button>
                    </form>}
                    <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Ward ID</th><th>Amount</th><th>Basis</th><th>Effective from</th></tr></thead>
                      <tbody>{wardAllowances.map((item) => <tr key={item.id}><td>{item.wardId}</td><td>{money(item.amount)}</td><td>{item.basis}</td><td>{item.effectiveFrom}</td></tr>)}</tbody></table></div>
                  </section>
            </>}
            {tab === 'configuration' && <>
              {canConfigure && <form className="workflow-form-panel" onSubmit={submitComponent}>
                <div className="workflow-panel-heading"><div><h2>Configurable salary components</h2><p>All rates are administrator-defined; this module does not assume statutory percentages.</p></div></div>
                <div className="workflow-form-grid">
                  <label>Name<input required value={componentForm.name} onChange={(event) => setComponentForm({ ...componentForm, name: event.target.value })} /></label>
                  <label>Code<input required value={componentForm.code} onChange={(event) => setComponentForm({ ...componentForm, code: event.target.value.toUpperCase() })} /></label>
                  <label>Type<select value={componentForm.type} onChange={(event) => setComponentForm({ ...componentForm, type: event.target.value })}><option>EARNING</option><option>DEDUCTION</option></select></label>
                  <label>Calculation<select value={componentForm.calculation} onChange={(event) => setComponentForm({ ...componentForm, calculation: event.target.value })}><option>FIXED</option><option>PERCENT_OF_BASIC</option><option>PER_UNIT</option><option>FORMULA</option></select></label>
                  {componentForm.calculation === 'FORMULA' && <label>Formula (BASIC, UNITS, + - * / and parentheses)
                    <input required value={componentForm.formula} onChange={(event) => setComponentForm({ ...componentForm, formula: event.target.value })} placeholder="BASIC * 0.1 + UNITS * 25" />
                  </label>}
                  <label>Applies to<select value={componentForm.appliesTo} onChange={(event) => setComponentForm({ ...componentForm, appliesTo: event.target.value })}><option>BOTH</option><option>DOCTOR</option><option>NURSE</option></select></label>
                  <label className="workflow-checkbox"><input type="checkbox" checked={componentForm.taxable} onChange={(event) => setComponentForm({ ...componentForm, taxable: event.target.checked })} /> Taxable</label>
                </div><div className="workflow-form-actions"><button className="workflow-button primary" disabled={busy}>Save component</button></div>
              </form>}
              {canConfigure && <form className="workflow-form-panel" onSubmit={submitStructure}>
                <div className="workflow-panel-heading"><div><h2>Versioned salary structures</h2><p>Structures are versioned on revision; prior versions remain available to assigned salaries.</p></div></div>
                <div className="workflow-form-grid">
                  <label>Name<input required value={structureForm.name} onChange={(event) => setStructureForm({ ...structureForm, name: event.target.value })} /></label>
                  <label>Applies to<select value={structureForm.appliesTo} onChange={(event) => setStructureForm({ ...structureForm, appliesTo: event.target.value })}><option>DOCTOR</option><option>NURSE</option><option>BOTH</option></select></label>
                  <label>Description<input value={structureForm.description} onChange={(event) => setStructureForm({ ...structureForm, description: event.target.value })} /></label>
                  <label>Component<select value={structureForm.componentId} onChange={(event) => setStructureForm({ ...structureForm, componentId: event.target.value })}><option value="">Select component</option>{components.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.calculation}</option>)}</select></label>
                  <label>Amount / per-unit rate<input type="number" min="0" step="0.01" value={structureForm.amount} onChange={(event) => setStructureForm({ ...structureForm, amount: event.target.value })} /></label>
                  <label>Percent of basic<input type="number" min="0" step="0.01" value={structureForm.percent} onChange={(event) => setStructureForm({ ...structureForm, percent: event.target.value })} /></label>
                  <label>Units per cycle<input type="number" min="0" step="0.01" value={structureForm.units} onChange={(event) => setStructureForm({ ...structureForm, units: event.target.value })} /></label>
                  <button className="workflow-button subtle" type="button" disabled={!structureForm.componentId} onClick={addStructureLine}>Add component</button>
                </div>
                {!!structureLines.length && <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Component</th><th>Amount</th><th>Percent</th><th>Units</th></tr></thead><tbody>
                  {structureLines.map((line, index) => <tr key={`${line.componentId}-${index}`}><td>{line.componentName}</td><td>{line.amount}</td><td>{line.percent}</td><td>{line.units}</td></tr>)}
                </tbody></table></div>}
                <div className="workflow-form-actions"><button className="workflow-button primary" disabled={busy || !structureLines.length}>Create structure</button></div>
              </form>}
              <section className="workflow-panel"><div className="workflow-panel-heading"><div><h2>Statutory configuration</h2><p>PF, ESI, professional tax, and TDS rates must be configured by Finance before use.</p></div></div>
                {canConfigure && <StatutoryForm busy={busy} onSave={(item) => act(async () => send('/payroll/statutory-config', 'POST', item), 'Statutory configuration saved.')} />}
              </section>
              <section className="workflow-panel"><div className="workflow-panel-heading"><div><h2>Components</h2><p>Active earning and deduction rules.</p></div></div>
                <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Calculation</th><th>Applies</th><th>Taxable</th></tr></thead>
                  <tbody>{components.map((item) => <tr key={item.id}><td>{item.code}</td><td>{item.name}</td><td>{item.type}</td><td>{item.calculation}</td><td>{item.appliesTo}</td><td>{item.taxable ? 'Yes' : 'No'}</td></tr>)}</tbody></table></div></section>
            </>}
            {tab === 'attendance' && <>
              {(isHeadNurse || roles.some((role) => ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'CLINIC_ADMIN'].includes(role))) && <form className="workflow-form-panel" onSubmit={submitOvertime}>
                <div className="workflow-panel-heading"><div><h2>Submit nurse overtime</h2><p>Only approved extra hours flow into payroll calculation.</p></div></div>
                <div className="workflow-form-grid">
                  <label>Nurse<select required value={overtimeForm.nurseId} onChange={(event) => setOvertimeForm({ ...overtimeForm, nurseId: event.target.value })}><option value="">Select nurse</option>{nurses.map((item) => <option key={item.id} value={item.id}>{item.employeeCode} · {item.name}</option>)}</select></label>
                  <label>Shift date<input required type="date" value={overtimeForm.date} onChange={(event) => setOvertimeForm({ ...overtimeForm, date: event.target.value })} /></label>
                  <label>Extra hours<input required min="0.01" step="0.01" type="number" value={overtimeForm.hours} onChange={(event) => setOvertimeForm({ ...overtimeForm, hours: event.target.value })} /></label>
                  <label>Ward<select required value={overtimeForm.wardId} onChange={(event) => setOvertimeForm({ ...overtimeForm, wardId: event.target.value })}><option value="">Select ward</option>{wards.map((ward) => <option key={ward.id} value={ward.id}>{ward.name}</option>)}</select></label>
                </div><div className="workflow-form-actions"><button className="workflow-button primary" disabled={busy}>Submit overtime</button></div>
              </form>}
              {canManagePayroll && <form className="workflow-form-panel" onSubmit={submitAttendance}>
                <div className="workflow-panel-heading"><div><h2>Nurse attendance period</h2><p>Attendance must match the complete payroll cycle and be finalized before nurse calculations.</p></div></div>
                <div className="workflow-form-grid">
                  <label>Nurse<select required value={attendanceForm.nurseId} onChange={(event) => setAttendanceForm({ ...attendanceForm, nurseId: event.target.value })}><option value="">Select nurse</option>{nurses.map((item) => <option key={item.id} value={item.id}>{item.employeeCode} · {item.name}</option>)}</select></label>
                  <label>From<input required type="date" value={attendanceForm.fromDate} onChange={(event) => setAttendanceForm({ ...attendanceForm, fromDate: event.target.value })} /></label>
                  <label>To<input required type="date" value={attendanceForm.toDate} onChange={(event) => setAttendanceForm({ ...attendanceForm, toDate: event.target.value })} /></label>
                  {['presentDays', 'absentDays', 'lopDays', 'nightShifts', 'eveningShifts', 'holidayDutyDays', 'weeklyOffDutyDays', 'lateMarks'].map((field) =>
                    <label key={field}>{field.replace(/([A-Z])/g, ' $1')}<input type="number" min="0" value={attendanceForm[field]} onChange={(event) => setAttendanceForm({ ...attendanceForm, [field]: event.target.value })} /></label>)}
                  <label>Worked days by ward (JSON)
                    <textarea value={wardDaysInput} onChange={(event) => setWardDaysInput(event.target.value)} placeholder='{"ward-id": 12}' />
                  </label>
                  <label className="workflow-checkbox"><input type="checkbox" checked={attendanceForm.finalized} onChange={(event) => setAttendanceForm({ ...attendanceForm, finalized: event.target.checked })} /> Finalize attendance</label>
                </div><div className="workflow-form-actions"><button className="workflow-button primary" disabled={busy}>Save attendance summary</button></div>
              </form>}
              <section className="workflow-panel"><div className="workflow-panel-heading"><div><h2>Attendance summaries</h2><p>Only finalized full-period records allow nurse payroll calculation.</p></div></div>
                <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Nurse</th><th>Period</th><th>Present</th><th>LOP days</th><th>Night shifts</th><th>OT-ready</th><th>Finalized</th></tr></thead>
                  <tbody>{attendance.map((item) => <tr key={item.id}><td>{nurses.find((nurse) => nurse.id === item.nurseId)?.employeeCode || item.nurseId}</td>
                    <td>{item.fromDate} – {item.toDate}</td><td>{item.presentDays}</td><td>{item.lopDays}</td><td>{item.nightShifts}</td>
                    <td>{overtime.filter((record) => record.nurseId === item.nurseId && record.status === 'APPROVED').reduce((sum, record) => sum + Number(record.hours || 0), 0)}</td>
                    <td>{item.finalized ? 'Yes' : 'No'}</td></tr>)}</tbody></table></div>
              </section>
              <section className="workflow-panel"><div className="workflow-panel-heading"><div><h2>Overtime requests</h2><p>{isHeadNurse && !isPayrollManager ? 'Requests in your assigned wards only.' : 'Approve or reject submitted extra hours.'}</p></div></div>
                <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Nurse</th><th>Date</th><th>Hours</th><th>Ward</th><th>Status</th><th /></tr></thead>
                  <tbody>{overtime.map((item) => <tr key={item.id}><td>{nurses.find((nurse) => nurse.id === item.nurseId)?.employeeCode || item.nurseId}</td>
                    <td>{item.date}</td><td>{item.hours}</td><td>{item.wardId}</td><td>{item.status}</td><td>{canApprove && item.status === 'PENDING' && <div className="workflow-row-actions">
                      <button className="workflow-button primary" type="button" onClick={() => act(async () => send(`/payroll/nurse-overtime/${item.id}/approve`, 'PUT', {}), 'Overtime approved.')}>Approve</button>
                      <button className="workflow-button subtle" type="button" onClick={() => act(async () => send(`/payroll/nurse-overtime/${item.id}/reject`, 'PUT', {}), 'Overtime rejected.')}>Reject</button>
                    </div>}</td></tr>)}</tbody></table></div>
              </section>
            </>}
            {tab === 'adjustments' && <>
              {canManagePayroll && <form className="workflow-form-panel" onSubmit={submitAdjustment}>
                <div className="workflow-panel-heading"><div><h2>One-time payroll adjustment</h2><p>Adjustments remain pending until Finance/Admin approves.</p></div></div>
                <div className="workflow-form-grid">
                  <label>Employee group<select value={adjustmentForm.employeeType} onChange={(event) => setAdjustmentForm({ ...adjustmentForm, employeeType: event.target.value, employeeId: '' })}><option>DOCTOR</option><option>NURSE</option></select></label>
                  <label>Employee<select required value={adjustmentForm.employeeId} onChange={(event) => setAdjustmentForm({ ...adjustmentForm, employeeId: event.target.value })}><option value="">Select employee</option>{employees.filter((item) => item.type === adjustmentForm.employeeType).map((item) => <option key={item.id} value={item.id}>{item.employeeCode} · {item.name}</option>)}</select></label>
                  <label>Draft cycle<select required value={adjustmentForm.cycleId} onChange={(event) => setAdjustmentForm({ ...adjustmentForm, cycleId: event.target.value })}><option value="">Select draft cycle</option>{cycles.filter((item) => item.status === 'DRAFT' && item.employeeType === adjustmentForm.employeeType).map((item) => <option key={item.id} value={item.id}>{item.month}/{item.year}</option>)}</select></label>
                  <label>Kind<select value={adjustmentForm.type} onChange={(event) => setAdjustmentForm({ ...adjustmentForm, type: event.target.value })}><option>EARNING</option><option>DEDUCTION</option></select></label>
                  <label>Amount<input required min="0.01" step="0.01" type="number" value={adjustmentForm.amount} onChange={(event) => setAdjustmentForm({ ...adjustmentForm, amount: event.target.value })} /></label>
                  <label>Reason<input required value={adjustmentForm.reason} onChange={(event) => setAdjustmentForm({ ...adjustmentForm, reason: event.target.value })} /></label>
                </div><div className="workflow-form-actions"><button className="workflow-button primary" disabled={busy}>Submit adjustment</button></div>
              </form>}
              {canManagePayroll && <form className="workflow-form-panel" onSubmit={submitLoan}>
                <div className="workflow-panel-heading"><div><h2>Staff advance / loan</h2><p>EMI is applied to payroll and capped at the outstanding balance.</p></div></div>
                <div className="workflow-form-grid">
                  <label>Employee group<select value={loanForm.employeeType} onChange={(event) => setLoanForm({ ...loanForm, employeeType: event.target.value, employeeId: '' })}><option>DOCTOR</option><option>NURSE</option></select></label>
                  <label>Employee<select required value={loanForm.employeeId} onChange={(event) => setLoanForm({ ...loanForm, employeeId: event.target.value })}><option value="">Select employee</option>{employees.filter((item) => item.type === loanForm.employeeType).map((item) => <option key={item.id} value={item.id}>{item.employeeCode} · {item.name}</option>)}</select></label>
                  <label>Advance amount<input required min="0.01" step="0.01" type="number" value={loanForm.amount} onChange={(event) => setLoanForm({ ...loanForm, amount: event.target.value })} /></label>
                  <label>Monthly EMI<input required min="0.01" step="0.01" type="number" value={loanForm.emi} onChange={(event) => setLoanForm({ ...loanForm, emi: event.target.value })} /></label>
                  <label>Reason<input value={loanForm.reason} onChange={(event) => setLoanForm({ ...loanForm, reason: event.target.value })} /></label>
                </div><div className="workflow-form-actions"><button className="workflow-button primary" disabled={busy}>Record advance</button></div>
              </form>}
              <section className="workflow-panel"><div className="workflow-panel-heading"><div><h2>Adjustment approvals</h2><p>Pending one-time changes must be approved before cycle calculation.</p></div></div>
                <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Employee group</th><th>Employee</th><th>Cycle</th><th>Type</th><th>Amount</th><th>Reason</th><th>Status</th><th /></tr></thead>
                  <tbody>{adjustments.map((item) => <tr key={item.id}><td>{item.employeeType}</td>
                    <td>{employees.find((employee) => employee.id === item.employeeId)?.employeeCode || item.employeeId}</td>
                    <td>{cycles.find((cycle) => cycle.id === item.cycleId)?.month}/{cycles.find((cycle) => cycle.id === item.cycleId)?.year}</td>
                    <td>{item.type}</td><td>{money(item.amount)}</td><td>{item.reason}</td><td>{item.status}</td>
                    <td>{canApprove && item.status === 'PENDING' && <div className="workflow-row-actions">
                      <button className="workflow-button primary" type="button" onClick={() => act(async () => send(`/payroll/adjustments/${item.id}/approve`, 'PUT'), 'Adjustment approved.')}>Approve</button>
                      <button className="workflow-button subtle" type="button" onClick={() => act(async () => send(`/payroll/adjustments/${item.id}/reject`, 'PUT'), 'Adjustment rejected.')}>Reject</button>
                    </div>}</td>
                  </tr>)}</tbody></table></div>
              </section>
              <section className="workflow-panel"><div className="workflow-panel-heading"><div><h2>Loans and advances</h2><p>EMIs are applied when a payroll cycle is marked paid.</p></div></div>
                <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Employee group</th><th>Employee</th><th>Amount</th><th>EMI</th><th>Balance</th><th>Status</th></tr></thead>
                  <tbody>{loans.map((item) => <tr key={item.id}><td>{item.employeeType}</td>
                    <td>{employees.find((employee) => employee.id === item.employeeId)?.employeeCode || item.employeeId}</td>
                    <td>{money(item.amount)}</td><td>{money(item.emi)}</td><td>{money(item.balance)}</td><td>{item.status}</td></tr>)}</tbody></table></div>
              </section>
            </>}
            {tab === 'reports' && <section className="workflow-panel">
              <div className="workflow-panel-heading"><div><h2>Payroll reports</h2><p>Export the salary register as CSV for accounting reconciliation.</p></div>
                <button className="workflow-button primary" type="button" onClick={downloadReport} disabled={busy}><FileDown size={15} /> Download CSV</button></div>
              <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Type</th><th>Period</th><th>Employees</th><th>Gross</th><th>Deductions</th><th>Net</th><th>Status</th></tr></thead>
                <tbody>{cycles.map((cycle) => <tr key={cycle.id}><td>{cycle.employeeType}</td><td>{cycle.month}/{cycle.year}</td><td>{cycle.entries?.length || 0}</td>
                  <td>{money(cycle.grossTotal)}</td><td>{money(cycle.deductionTotal)}</td><td>{money(cycle.netTotal)}</td><td>{cycle.status}</td></tr>)}</tbody></table></div>
            </section>}
          </>}
    </main>
  );
}

function StatutoryForm({ busy, onSave }) {
  const [form, setForm] = useState({ name: '', appliesTo: 'BOTH', rate: '', ceiling: '', effectiveFrom: monthStart });
  return <form className="workflow-inline-form" onSubmit={(event) => {
    event.preventDefault();
    onSave({ ...form, rate: Number(form.rate), ceiling: form.ceiling ? Number(form.ceiling) : null });
    setForm({ name: '', appliesTo: 'BOTH', rate: '', ceiling: '', effectiveFrom: monthStart });
  }}>
    <label>Component name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
    <label>Applies to<select value={form.appliesTo} onChange={(event) => setForm({ ...form, appliesTo: event.target.value })}><option>BOTH</option><option>DOCTOR</option><option>NURSE</option></select></label>
    <label>Rate (%)<input required min="0" step="0.01" type="number" value={form.rate} onChange={(event) => setForm({ ...form, rate: event.target.value })} /></label>
    <label>Wage ceiling (optional)<input min="0" step="0.01" type="number" value={form.ceiling} onChange={(event) => setForm({ ...form, ceiling: event.target.value })} /></label>
    <label>Effective from<input required type="date" value={form.effectiveFrom} onChange={(event) => setForm({ ...form, effectiveFrom: event.target.value })} /></label>
    <button className="workflow-button primary" disabled={busy}>Save statutory rate</button>
  </form>;
}
