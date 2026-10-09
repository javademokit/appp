import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownToLine, BadgeIndianRupee, Building2,
  CalendarDays, Check, CheckCircle2, Clock3, FileText, HeartPulse, LayoutDashboard,
  Plus, Search, Users, Wallet, X,
} from 'lucide-react';
import BrandLogo from '../../components/BrandLogo';
import * as employeeService from '../../services/employeeService';
import * as attendanceService from '../../services/attendanceService';
import * as leaveService from '../../services/leaveService';
import * as salaryService from '../../services/salaryService';
import * as payrollService from '../../services/payrollService';
import '../../Operations/PayrollPage.css';
import HRDashboard from '../dashboard/HRDashboard';
import EmployeeList from '../employee/EmployeeList';
import EmployeeForm from '../employee/EmployeeForm';
import EmployeeDetails from '../employee/EmployeeDetails';
import Department from '../organization/Department';
import Designation from '../organization/Designation';
import Shift from '../organization/Shift';
import Attendance from '../attendance/Attendance';
import LeaveRequest from '../leave/LeaveRequest';
import LeaveApproval from '../leave/LeaveApproval';
import SalaryComponent from '../salary/SalaryComponent';
import SalaryStructure from '../salary/SalaryStructure';
import PayrollHistory from './PayrollHistory';
import PayrollPreview from './PayrollPreview';
import Payslip, { PayslipDetails } from './Payslip';
import OvertimeAllowances from './OvertimeAllowances';
import { omitBlankOptionalEmployeeFields } from './employeePayload';

const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY', 'WEEK_OFF'];
const ADMIN_ROLES = ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'CLINIC_ADMIN'];
const HR_ROLES = [...ADMIN_ROLES, 'HR'];
const PAYROLL_ROLES = [...HR_ROLES, 'FINANCE'];
const PAYROLL_APPROVAL_ROLES = [...PAYROLL_ROLES, 'CRM_EXECUTIVE'];
const STAFF_ROLES = [...PAYROLL_ROLES, 'DOCTOR', 'NURSE', 'HEAD_NURSE', 'RECEPTIONIST', 'CRM_EXECUTIVE',
  'BILLING_EXECUTIVE', 'PHARMACIST', 'LAB_TECHNICIAN'];
const LEAVE_ROLES = [...HR_ROLES, 'DOCTOR', 'NURSE', 'HEAD_NURSE', 'RECEPTIONIST', 'CRM_EXECUTIVE',
  'BILLING_EXECUTIVE', 'PHARMACIST', 'LAB_TECHNICIAN'];
const NAV_ITEMS = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, roles: HR_ROLES },
  { id: 'employees', label: 'Employees', icon: Users, roles: HR_ROLES },
  { id: 'organization', label: 'Organization', icon: Building2, roles: HR_ROLES },
  { id: 'attendance', label: 'Attendance', icon: Clock3, roles: HR_ROLES },
  { id: 'leaves', label: 'Leave', icon: CalendarDays, roles: LEAVE_ROLES },
  { id: 'salary', label: 'Salary', icon: BadgeIndianRupee, roles: PAYROLL_ROLES },
  { id: 'payroll', label: 'Payroll', icon: Wallet, roles: PAYROLL_APPROVAL_ROLES },
  { id: 'overtime-allowances', label: 'Overtime allowances', icon: Clock3, roles: STAFF_ROLES },
  { id: 'payslips', label: 'Payslips', icon: FileText, roles: STAFF_ROLES },
  { id: 'reports', label: 'Reports', icon: Activity, roles: PAYROLL_ROLES },
];

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const normalizeRoles = (roles) => (Array.isArray(roles) ? roles : [])
  .map((role) => String(role).replace(/^ROLE_/, '').toUpperCase());

const asArray = (value) => Array.isArray(value) ? value : [];
const money = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(Number(value) || 0);
const titleCase = (value) => String(value || '').replaceAll('_', ' ').toLowerCase()
  .replace(/\b\w/g, (letter) => letter.toUpperCase());
const isPayrollMaker = (payroll, user) => {
  const maker = String(payroll?.createdBy || '').trim().toLowerCase();
  return Boolean(maker && [user?.email, user?.emailId, user?.username]
    .some((identity) => String(identity || '').trim().toLowerCase() === maker));
};

function Field({ label, children, required = false, className = '' }) {
  return (
    <label className={`hr-field ${className}`}>
      <span>{label}{required && <b aria-hidden="true"> *</b>}</span>
      {children}
    </label>
  );
}

function StatusBadge({ value }) {
  const status = String(value || 'UNKNOWN').toLowerCase().replaceAll('_', '-');
  return <span className={`hr-status hr-status-${status}`}>{titleCase(value || 'Unknown')}</span>;
}

function EmptyState({ title, detail }) {
  return <div className="hr-empty"><span><FileText size={19} /></span><strong>{title}</strong><p>{detail}</p></div>;
}

function DataTable({ columns, rows, emptyTitle = 'Nothing to show yet', emptyDetail = 'Add a record to get started.' }) {
  if (!rows.length) return <EmptyState title={emptyTitle} detail={emptyDetail} />;
  return (
    <div className="hr-table-scroll">
      <table className="hr-table">
        <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || row.employeeId || row.code || index}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render ? column.render(row)
                    : row[column.key] === undefined || row[column.key] === null || row[column.key] === ''
                      ? '—' : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div className="hr-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className={`hr-modal${wide ? ' hr-modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header><div><p className="hr-eyebrow">HR workspace</p><h2>{title}</h2></div>
          <button type="button" className="hr-icon-button" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </header>
        {children}
      </section>
    </div>
  );
}

export default function PayrollPage({
  hideHeader = false,
  payrollOnly = false,
  employeesOnly = false,
  salaryOnly = false,
  initialSalaryView = 'components',
  initialPayrollView = 'payroll',
}) {
  const [account, setAccount] = useState(null);
  const [section, setSection] = useState(payrollOnly ? 'payroll' : employeesOnly ? 'employees' : salaryOnly ? 'salary' : 'overview');
  const [salaryView, setSalaryView] = useState(initialSalaryView);
  const [payrollView, setPayrollView] = useState(initialPayrollView);
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState('');
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [detailsEmployee, setDetailsEmployee] = useState(null);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const roles = useMemo(() => normalizeRoles(account?.roles), [account]);
  const canAccessAdminDashboard = roles.some((role) => ADMIN_ROLES.includes(role));
  const approvalOnlyAccount = roles.includes('CRM_EXECUTIVE')
    && !roles.some((role) => PAYROLL_ROLES.includes(role));
  const visibleItems = useMemo(() => NAV_ITEMS.filter((item) => (
    (!payrollOnly || ['payroll', 'payslips'].includes(item.id))
    && (!employeesOnly || item.id === 'employees')
    && (!salaryOnly || item.id === 'salary')
    && (!approvalOnlyAccount || item.id === 'payroll')
    && !(item.id === 'payslips' && canAccessAdminDashboard && !payrollOnly)
    && !(item.id === 'overtime-allowances' && canAccessAdminDashboard)
    && item.roles.some((role) => roles.includes(role))
  )), [approvalOnlyAccount, canAccessAdminDashboard, employeesOnly, payrollOnly, roles, salaryOnly]);
  const canManageHr = roles.some((role) => HR_ROLES.includes(role));
  const canManagePayroll = roles.some((role) => PAYROLL_ROLES.includes(role));
  const canApprovePayroll = roles.some((role) => PAYROLL_APPROVAL_ROLES.includes(role));
  const activeNav = visibleItems.some((item) => item.id === section) ? section : visibleItems[0]?.id || 'payslips';

  useEffect(() => {
    let active = true;
    employeeService.getCurrentUser()
      .then((user) => {
        if (!active) return;
        const assignedRoles = normalizeRoles(user?.roles);
        setAccount({ ...user, roles: assignedRoles });
        const hrManager = assignedRoles.some((role) => HR_ROLES.includes(role));
        const payrollManager = assignedRoles.some((role) => PAYROLL_ROLES.includes(role));
        const requestedSection = new URLSearchParams(window.location.search).get('section');
        const canAccessAdminDashboard = assignedRoles.some((role) => ADMIN_ROLES.includes(role));
        const approvalOnlyAccount = assignedRoles.includes('CRM_EXECUTIVE')
          && !assignedRoles.some((role) => PAYROLL_ROLES.includes(role));
        const availableSections = NAV_ITEMS
          .filter((item) => (!payrollOnly || ['payroll', 'payslips'].includes(item.id))
            && (!employeesOnly || item.id === 'employees')
            && (!salaryOnly || item.id === 'salary')
            && (!approvalOnlyAccount || item.id === 'payroll')
            && !(item.id === 'payslips' && canAccessAdminDashboard && !payrollOnly)
            && !(item.id === 'overtime-allowances' && canAccessAdminDashboard)
            && item.roles.some((role) => assignedRoles.includes(role)))
          .map((item) => item.id);
        setSection(availableSections.includes(requestedSection)
          ? requestedSection
          : payrollOnly ? 'payroll' : employeesOnly ? 'employees' : salaryOnly ? 'salary'
            : hrManager ? 'overview' : payrollManager || assignedRoles.includes('CRM_EXECUTIVE') ? 'payroll'
              : availableSections[0] || 'overview');
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [employeesOnly, payrollOnly, salaryOnly]);

  const loadSection = useCallback(async (selectedSection = activeNav) => {
    if (!account) return;
    setLoading(true);
    setError('');
    try {
      let next = {};
      if (selectedSection === 'overview') {
        next.dashboard = await payrollService.getDashboard(month);
      } else if (selectedSection === 'employees') {
        const [employees, departments, designations, shifts, employeeTypes, doctors] = await Promise.all([
          employeeService.getEmployees(), employeeService.getDepartments(), employeeService.getDesignations(),
          employeeService.getShifts(), employeeService.getEmployeeTypes(), employeeService.getDoctorProfiles(),
        ]);
        next = {
          employees: asArray(employees), departments: asArray(departments),
          designations: asArray(designations), shifts: asArray(shifts), employeeTypes: asArray(employeeTypes),
          doctors: asArray(doctors),
        };
      } else if (selectedSection === 'organization') {
        const [departments, designations, shifts, employeeTypes] = await Promise.all([
          employeeService.getDepartments(), employeeService.getDesignations(), employeeService.getShifts(), employeeService.getEmployeeTypes(),
        ]);
        next = {
          departments: asArray(departments), designations: asArray(designations),
          shifts: asArray(shifts), employeeTypes: asArray(employeeTypes),
        };
      } else if (selectedSection === 'attendance') {
        next.attendance = asArray(await attendanceService.getAttendance(month));
        next.employees = asArray(await employeeService.getEmployees());
      } else if (selectedSection === 'leaves') {
        next.leaves = asArray(await leaveService.getLeaveRequests(
          canManageHr ? `/leaves?month=${encodeURIComponent(month)}` : '/leaves/mine',
        ));
        if (canManageHr) next.employees = asArray(await employeeService.getEmployees());
      } else if (selectedSection === 'salary') {
        const [components, structures, employees] = await Promise.all([
          salaryService.getSalaryComponents(), salaryService.getSalaryStructures(), employeeService.getEmployees(),
        ]);
        next = { components: asArray(components), structures: asArray(structures), employees: asArray(employees) };
      } else if (selectedSection === 'payroll') {
        next.payrolls = asArray(await payrollService.getPayrollHistory(
          payrollView === 'history' ? undefined : month,
        ));
      } else if (selectedSection === 'overtime-allowances') {
        next = {};
      } else if (selectedSection === 'payslips') {
        const employeeOnly = !canManagePayroll;
        next.payslips = asArray(employeeOnly
          ? await payrollService.getMyPayslips()
          : await payrollService.getPayslips(month));
      } else if (selectedSection === 'reports') {
        next.reports = await payrollService.getReports(month);
      }
      setData((current) => ({ ...current, ...next }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [account, activeNav, canManageHr, canManagePayroll, month, payrollView]);

  useEffect(() => {
    if (account) void loadSection(activeNav);
  }, [account, activeNav, loadSection]);

  const runAction = async (action, successMessage, refresh = true, errorDisplay = 'page') => {
    setBusy(true);
    setError('');
    setFormError('');
    setNotice('');
    try {
      const result = await action();
      setNotice(typeof successMessage === 'function' ? successMessage(result) : successMessage);
      setModal('');
      if (refresh) await loadSection(activeNav);
    } catch (actionError) {
      if (errorDisplay === 'popup') {
        window.alert(actionError.message);
      } else if (errorDisplay === 'form') {
        setFormError(actionError.message);
      } else {
        setError(actionError.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const createRecord = (kind, payload, documents = []) => {
    const updatingEmployee = kind === 'employee' && editingEmployee?.id;
    const createMethods = {
      employee: async () => {
        let savedEmployee;
        try {
          savedEmployee = await employeeService.saveEmployee(editingEmployee, payload);
        } catch (saveError) {
          const isNurse = String(payload.employeeType || '').toUpperCase() === 'NURSE';
          const recordType = isNurse ? 'Nurse employee' : 'Employee';
          throw new Error(`${recordType} was not ${updatingEmployee ? 'updated' : 'created'}: ${saveError.message}`);
        }
        if (documents.length) {
          setEditingEmployee(savedEmployee);
          for (const { documentType, file } of documents) {
            await employeeService.uploadEmployeeDocument(savedEmployee.id, documentType, file);
          }
        }
        return savedEmployee;
      },
      attendance: () => attendanceService.recordAttendance(payload),
      leave: () => leaveService.createLeaveRequest(payload),
      component: () => salaryService.createSalaryComponent(payload),
      structure: () => salaryService.createSalaryStructure(payload),
    };
    return runAction(
      () => createMethods[kind]
        ? createMethods[kind]()
        : payrollService.createOrganizationRecord(kind, payload),
      kind === 'employee' ? (savedEmployee => {
        const isNurse = String(savedEmployee?.employeeType || payload.employeeType || '').toUpperCase() === 'NURSE';
        const recordType = isNurse ? 'Nurse employee' : 'Employee';
        const action = updatingEmployee ? 'updated' : 'created';
        const employeeCode = savedEmployee?.employeeCode;
        return `${recordType} ${action} successfully.${employeeCode ? ` ${isNurse ? 'Nurse ID' : 'Employee ID'}: ${employeeCode}.` : ''}`;
      })
        : `${titleCase(kind)} saved.`,
      true,
      kind === 'employee' ? 'form' : 'page',
    );
  };

  const handleFormSubmit = (kind) => (event) => {
    event.preventDefault();
    const submitted = new FormData(event.currentTarget);
    const values = Object.fromEntries(submitted.entries());
    const documents = kind === 'employee'
      ? ['PAN_CARD', 'AADHAAR_CARD', 'EXPERIENCE_LETTER'].flatMap((documentType) => {
        const file = event.currentTarget.elements.namedItem(`document-${documentType}`)?.files?.[0];
        return file && file.size > 0 ? [{ documentType, file }] : [];
      }) : [];
    ['document-PAN_CARD', 'document-AADHAAR_CARD', 'document-EXPERIENCE_LETTER']
      .forEach((key) => delete values[key]);
    if (kind === 'employee') {
      if (String(values.employeeType || '').toUpperCase() === 'DOCTOR') {
        values.doctorAvailableTimes = values.doctorAvailableTimes
          .split(',')
          .map((time) => time.trim())
          .filter(Boolean);
        values.doctorConsultationFee = values.doctorConsultationFee.trim()
          ? Number(values.doctorConsultationFee)
          : null;
      } else {
        delete values.doctorAvailableTimes;
        delete values.doctorConsultationFee;
      }
      const professionalInfo = {
        registrationNumber: values.registrationNumber,
        qualification: values.qualification,
        specialization: values.specialization,
        experienceYears: values.experienceYears ? Number(values.experienceYears) : null,
        licenseExpiryDate: values.licenseExpiryDate,
        certification: values.certification,
      };
      ['registrationNumber', 'qualification', 'specialization', 'experienceYears',
        'licenseExpiryDate', 'certification'].forEach((key) => delete values[key]);
      values.professionalInfo = professionalInfo;
      values.documentLinks = values.documentLinks.split('\n').map((link) => link.trim()).filter(Boolean);
      if (values.departmentId === '__DOCTOR_PROFILE_DEPARTMENT__') values.departmentId = '';
    }
    if (kind === 'attendance') {
      ['workedHours', 'overtimeHours'].forEach((key) => { values[key] = Number(values[key] || 0); });
    }
    if (kind === 'component') {
      if (values.calculationType === 'FORMULA') {
        values.formula = values.value;
        delete values.value;
      } else {
        values.value = Number(values.value || 0);
      }
    }
    if (kind === 'structure') {
      const componentIds = submitted.getAll('componentId');
      const amounts = submitted.getAll('amount');
      const units = submitted.getAll('units');
      values.components = componentIds.map((componentId, index) => ({
        componentId,
        amount: Number(amounts[index] || 0),
        units: Number(units[index] || 1),
      }));
      delete values.componentId;
      delete values.amount;
      delete values.units;
    }
    const payload = kind === 'employee' ? omitBlankOptionalEmployeeFields(values) : values;
    void createRecord(kind, payload, documents);
  };

  const runPayroll = () => runAction(async () => {
    setPayrollView('payroll');
    try {
      return await payrollService.createPayrollRun(month);
    } catch (createError) {
      if (!/payroll run.*already exists/i.test(createError.message)) throw createError;
      const payrolls = asArray(await payrollService.getPayrollHistory(month));
      setData((current) => ({ ...current, payrolls }));
      setSection('payroll');
      throw new Error(`${createError.message} The existing run has been reloaded in Payroll History below.`);
    }
  }, 'Payroll run created.');

  const continuePayroll = () => {
    setPayrollView('payroll');
    if (!selectedPayroll) return runPayroll();
    setSection('payroll');
    setNotice(
      `A payroll run for ${month} already exists (${titleCase(selectedPayroll.status)}). `
      + 'Use the available action in the Payroll runs table to continue it.',
    );
  };

  const performPayrollStep = (payroll, step) => runAction(
    () => payrollService.performPayrollStep(payroll, step),
    `Payroll ${step} completed.`,
  );

  const changeLeaveStatus = (leave, decision) => runAction(
    () => leaveService.decideLeaveRequest(leave, decision),
    `Leave request ${decision}d.`,
  );

  const downloadPayslip = (payslip) => runAction(async () => {
    const response = await payrollService.downloadPayslip(payslip);
    if (!response.ok) throw new Error(`Payslip download failed (${response.status})`);
    const file = await response.blob();
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${payslip.payslipNumber || payslip.id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'Payslip download started.', false);

  const employeeRows = asArray(data.employees).filter((employee) => {
    const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.toLowerCase();
    return (!employeeTypeFilter || String(employee.employeeType || '').toUpperCase() === employeeTypeFilter)
      && (!search || fullName.includes(search.toLowerCase())
      || String(employee.employeeCode || '').toLowerCase().includes(search.toLowerCase())
      || String(employee.employeeType || '').toLowerCase().includes(search.toLowerCase()));
  });
  const selectedPayroll = asArray(data.payrolls).find((payroll) => payroll.month === month);

  if (loading && !account) {
    return <main className="hr-workspace"><div className="hr-loading" role="status">Loading HR workspace…</div></main>;
  }
  if (!account && error) {
    return <main className="hr-workspace"><div className="hr-alert error" role="alert">{error}</div></main>;
  }

  const menuChildren = {
    employees: [
      ['All Employees', () => { setEmployeeTypeFilter(''); setSection('employees'); }],
      ['Add Employee', () => { setEmployeeTypeFilter(''); setSection('employees'); setEditingEmployee(null); setModal('employee'); }],
      ['Doctors', () => { setEmployeeTypeFilter('DOCTOR'); setSection('employees'); }],
      ['Nurses', () => { setEmployeeTypeFilter('NURSE'); setSection('employees'); }],
      ['Technicians', () => { setEmployeeTypeFilter('TECHNICIAN'); setSection('employees'); }],
      ['Other Staff', () => { setEmployeeTypeFilter('OTHER'); setSection('employees'); }],
    ],
    organization: ['Departments', 'Designations', 'Shifts'].map((label) => [label, () => setSection('organization')]),
    salary: salaryOnly ? [
      ['Salary Components', () => { setSection('salary'); setSalaryView('components'); }],
      ['Salary Structures', () => { setSection('salary'); setSalaryView('structures'); }],
    ] : canAccessAdminDashboard ? [
      ['Salary Components', '/AdminDashboard?section=salary'],
      ['Salary Structures', '/AdminDashboard?section=salary&salaryView=structures'],
    ] : [
      ['Salary Components', () => { setSection('salary'); setSalaryView('components'); }],
      ['Salary Structures', () => { setSection('salary'); setSalaryView('structures'); }],
    ],
    payroll: canManagePayroll ? [
      [selectedPayroll ? 'Continue current run' : 'Create Payroll', continuePayroll],
      ['Payroll Preview', () => { setPayrollView('payroll'); setSection('payroll'); if (selectedPayroll) setData((current) => ({ ...current, preview: selectedPayroll })); }],
      ['Payroll Approval', () => {
        setData((current) => ({ ...current, preview: null }));
        setPayrollView('payroll');
        setSection('payroll');
      }],
      ['Payroll History', () => {
        setData((current) => ({ ...current, preview: null }));
        setPayrollView('history');
        setSection('payroll');
      }],
      ...(payrollOnly
        ? [['Overtime allowances', () => { setSection('payroll'); setPayrollView('overtime'); }]]
        : canAccessAdminDashboard
          ? [['Overtime allowances', '/AdminDashboard?section=payroll&payrollView=overtime']]
          : []),
      ...(!canAccessAdminDashboard ? [['Payslips', () => setSection('payslips')]] : []),
    ] : [
      ['Payroll Approval', () => {
        setData((current) => ({ ...current, preview: null }));
        setPayrollView('payroll');
        setSection('payroll');
      }],
      ['Payroll History', () => {
        setData((current) => ({ ...current, preview: null }));
        setPayrollView('history');
        setSection('payroll');
      }],
    ],
    reports: ['Employee Report', 'Attendance Report', 'Salary Report'].map((label) => [label, () => setSection('reports')]),
  };

  return (
    <main className={`hr-workspace${activeNav === 'payroll' ? ' hr-payroll-redesign' : ''}`}>
      {!hideHeader && <header className="hr-topbar">
        <a className="hr-brand" href="/HospitalDashboard" aria-label="Medora AI people and payroll">
          <BrandLogo />
        </a>
        <div className="hr-topbar-right">
          <span className="hr-live-dot" aria-hidden="true" />
          <span>{account?.username || 'HR workspace'}</span>
          <span className="hr-avatar">{(account?.username || 'H').slice(0, 1).toUpperCase()}</span>
        </div>
      </header>}
      <div className="hr-layout">
        <aside className="hr-sidebar">
          {activeNav === 'payroll' && <div className="hr-payroll-brand">HR &amp; Payroll 360</div>}
          <div className="hr-side-label">WORKSPACE</div>
          <nav aria-label="HR workspace">
            {visibleItems.map(({ id, label, icon: Icon }) => (
              <div className="hr-menu-group" key={id}>
                {id === 'salary' && !salaryOnly && canAccessAdminDashboard
                  ? <a className="hr-nav-link" href="/AdminDashboard?section=salary">
                    <Icon size={17} strokeWidth={1.8} /><span>Salary</span>
                  </a>
                  : <button type="button" className={activeNav === id ? 'active' : ''}
                    aria-current={activeNav === id ? 'page' : undefined} onClick={() => {
                      setSection(id);
                      setSearch('');
                      if (id === 'employees') setEmployeeTypeFilter('');
                      if (id === 'salary') setSalaryView('components');
                      if (id === 'payroll') setPayrollView('payroll');
                    }}>
                    <Icon size={17} strokeWidth={1.8} /><span>{id === 'overview' ? 'Dashboard' : id === 'salary' ? 'Salary' : id === 'payroll' ? 'Payroll' : label}</span>
                    {id === 'leaves' && <span className="hr-nav-count">{asArray(data.leaves).filter((item) => item.status === 'PENDING').length || ''}</span>}
                  </button>}
                {menuChildren[id] && <div className="hr-subnav">
                  {menuChildren[id].map(([child, action]) => (
                    ((id === 'salary' && !salaryOnly && canAccessAdminDashboard)
                      || (id === 'payroll' && !payrollOnly && canAccessAdminDashboard))
                    && typeof action === 'string'
                    ? <a key={child} href={action}>{child}</a>
                    : <button key={child} type="button"
                      onClick={() => { setSearch(''); action(); }}>{child}</button>))}
                </div>}
              </div>
            ))}
          </nav>
          <div className="hr-sidebar-footer"><HeartPulse size={17} /><span>Care starts with our people</span></div>
        </aside>

        <section className={`hr-main${activeNav === 'payroll' ? ' hr-payroll-main' : ''}`}>
          <div className="hr-page-header">
            <div>
              <p className="hr-eyebrow">{activeNav === 'payroll' ? 'PEOPLE OPERATIONS · PAYROLL REVIEW' : 'PEOPLE OPERATIONS'}</p>
              <h1>{activeNav === 'payroll'
                ? payrollView === 'history' ? 'Payroll History'
                  : `Run Payroll — ${new Date(`${month}-01T12:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`
                : NAV_ITEMS.find((item) => item.id === activeNav)?.label || 'Payslips'}</h1>
              <p className="hr-page-subtitle">
                {activeNav === 'payroll' ? payrollView === 'history'
                  ? 'View payroll runs across all pay periods and review their status.'
                  : `${account?.hospitalName || account?.organizationName || 'Hospital'} · ${selectedPayroll?.employeeCount ?? asArray(selectedPayroll?.items).length} employees in this payroll run.` :
                  activeNav === 'overview' ? 'A clear view of your workforce, attendance and payroll.' :
                  activeNav === 'employees' ? 'Manage employee records and onboarding in one place.' :
                    'One configurable workflow for every employee type.'}
              </p>
            </div>
            <div className="hr-page-actions">
              {!(activeNav === 'payroll' && payrollView === 'history') && <label className="hr-month-picker"><CalendarDays size={16} />
                <input aria-label="Payroll month" type="month" value={month}
                  onChange={(event) => setMonth(event.target.value)} />
              </label>}
              {activeNav === 'employees' && canManageHr && <button className="hr-button primary" onClick={() => { setEditingEmployee(null); setModal('employee'); }}>
                <Plus size={16} /> Add employee
              </button>}
              {activeNav === 'payroll' && payrollView !== 'history' && canManagePayroll && <button className="hr-button primary"
                onClick={selectedPayroll ? continuePayroll : runPayroll} disabled={busy}>
                <Plus size={16} /> {selectedPayroll ? 'Continue current run' : 'Create payroll'}
              </button>}
            </div>
          </div>

          {error && <div className="hr-alert error" role="alert"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button></div>}
          {notice && <div className="hr-alert success" role="status"><CheckCircle2 size={17} />{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss message"><X size={16} /></button></div>}
          {loading && account && <div className="hr-loading" role="status">Loading {NAV_ITEMS.find((item) => item.id === activeNav)?.label.toLowerCase()}…</div>}

          {!loading && activeNav === 'overview' && <HRDashboard data={data.dashboard || {}} onNavigate={setSection} />}
          {!loading && activeNav === 'employees' && (
            <section className="hr-panel">
              <div className="hr-panel-heading">
                <div><h2>Employee master</h2><p>Doctors, nurses and all other staff use the same employee record.</p></div>
                <label className="hr-search"><Search size={16} /><input aria-label="Search employees" placeholder="Search name, ID or type"
                  value={search} onChange={(event) => setSearch(event.target.value)} /></label>
              </div>
              <EmployeeList employees={employeeRows} onDetails={setDetailsEmployee}
                onEdit={(employee) => { setEditingEmployee(employee); setModal('employee'); }} />
            </section>
          )}
          {!loading && activeNav === 'organization' && <Organization data={data} setModal={setModal} canManage={canManageHr} />}
          {!loading && activeNav === 'attendance' && <Attendance records={data.attendance} canManage={canManageHr}
            onRecord={() => setModal('attendance')} />}
          {!loading && activeNav === 'leaves' && <LeaveApproval requests={data.leaves} canApprove={canManageHr}
            onRequest={() => setModal('leave')} onDecision={changeLeaveStatus} />}
          {!loading && activeNav === 'salary' && (
            salaryView === 'components'
              ? <SalaryComponent components={data.components} onAdd={() => setModal('component')} />
              : <SalaryStructure structures={data.structures} components={data.components}
                onAssign={() => setModal('structure')} />
          )}
          {!loading && activeNav === 'payroll' && (
            <>
              {payrollView === 'overtime'
                ? <OvertimeAllowances month={month} canApprove={canManageHr} />
                : data.preview ? <PayrollPreview payroll={data.preview}
                canManagePayroll={canManagePayroll}
                canApprovePayroll={canApprovePayroll && !isPayrollMaker(data.preview, account)}
                makerCannotApprove={isPayrollMaker(data.preview, account)}
                makerCanRequestApproval={canManagePayroll && isPayrollMaker(data.preview, account)}
                awaitingApprovalRequest={String(data.preview.status).toUpperCase() === 'CALCULATED'
                  && canApprovePayroll && !isPayrollMaker(data.preview, account)}
                busy={busy}
                onAction={performPayrollStep}
                onClose={() => setData((current) => ({ ...current, preview: null }))} /> : <>
              {payrollView !== 'history' && selectedPayroll && <div className="hr-run-summary">
                <div><span>Employees</span><strong>{selectedPayroll.employeeCount ?? asArray(selectedPayroll.items).length}</strong></div>
                <div><span>Gross payroll</span><strong>{money(selectedPayroll.totalGross)}</strong></div>
                <div><span>Deductions</span><strong>{money(selectedPayroll.totalDeduction)}</strong></div>
                <div><span>Net payroll</span><strong>{money(selectedPayroll.totalNet)}</strong></div>
              </div>}
              <PayrollHistory runs={data.payrolls} busy={busy} canManagePayroll={canManagePayroll}
                canApprovePayroll={canApprovePayroll} currentUser={account} onAction={performPayrollStep}
                historyMode={payrollView === 'history'}
                onPreview={(row) => setData((current) => ({ ...current, preview: row }))} />
              </>}
            </>
          )}
          {!loading && activeNav === 'payslips' && (
            <>
              <Payslip payslips={data.payslips} canManagePayroll={canManagePayroll} onDownload={downloadPayslip}
                onView={setSelectedPayslip} />
              {selectedPayslip && <PayslipDetails payslip={{ ...selectedPayslip, onDownload: downloadPayslip }}
                onClose={() => setSelectedPayslip(null)} />}
            </>
          )}
          {!loading && activeNav === 'overtime-allowances' && (
            <OvertimeAllowances month={month} canApprove={canManageHr} />
          )}
          {!loading && activeNav === 'reports' && <Reports data={data.reports || {}} month={month} onExport={async () => {
            try {
              const response = await payrollService.exportReport(month);
              if (!response.ok) throw new Error(`Report export failed (${response.status})`);
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `hr-report-${month}.csv`;
              link.click();
              URL.revokeObjectURL(url);
            } catch (exportError) {
              setError(exportError.message);
            }
          }} />}
        </section>
      </div>

      {modal && <Modal title={modal === 'employee' ? `${editingEmployee ? 'Edit' : 'Add'} employee` : `Add ${titleCase(modal)}`}
        onClose={() => { setModal(''); setEditingEmployee(null); setFormError(''); }} wide={modal === 'employee'}>
        <form className="hr-form" onSubmit={handleFormSubmit(modal)}>
          {modal === 'employee' && formError && <div className="hr-alert error" role="alert">{formError}</div>}
          {modal === 'employee' && <EmployeeForm data={data} employee={editingEmployee} />}
          {modal === 'employeeType' && <EmployeeTypeForm />}
          {modal === 'department' && <DepartmentForm />}
          {modal === 'designation' && <DesignationForm departments={asArray(data.departments)} />}
          {modal === 'shift' && <ShiftForm />}
          {modal === 'attendance' && <AttendanceForm employees={asArray(data.employees)} />}
          {modal === 'leave' && <LeaveRequest employees={asArray(data.employees)} managerMode={canManageHr} />}
          {modal === 'component' && <ComponentForm />}
          {modal === 'structure' && <StructureForm employees={asArray(data.employees)} components={asArray(data.components)} />}
          <div className="hr-form-footer">
            <button type="button" className="hr-button secondary" onClick={() => { setModal(''); setEditingEmployee(null); setFormError(''); }}>Cancel</button>
            <button type="submit" className="hr-button primary" disabled={busy}><Check size={16} /> Save</button>
          </div>
        </form>
      </Modal>}
      {detailsEmployee && <Modal title="Employee details" onClose={() => setDetailsEmployee(null)} wide>
        <EmployeeDetails employee={detailsEmployee} />
      </Modal>}
    </main>
  );
}

function PanelHeading({ title, description, action }) {
  return <div className="hr-panel-heading"><div><h2>{title}</h2><p>{description}</p></div>{action}</div>;
}

function Organization({ data, setModal, canManage }) {
  return <div className="hr-organization-grid">
    <Department departments={data.departments} canManage={canManage} onAdd={() => setModal('department')} />
    <Designation designations={data.designations} canManage={canManage} onAdd={() => setModal('designation')} />
    <Shift shifts={data.shifts} canManage={canManage} onAdd={() => setModal('shift')} />
    <section className="hr-panel">
      <PanelHeading title="Employee types" description="Maintain employee categories for the shared HR workflow."
        action={canManage && <button className="hr-icon-button" aria-label="Add employee type"
          onClick={() => setModal('employeeType')}><Plus size={18} /></button>} />
      <DataTable rows={asArray(data.employeeTypes)} columns={[
        { key: 'name', label: 'Employee type' }, { key: 'code', label: 'Code' },
        { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
      ]} />
    </section>
  </div>;
}

function Reports({ data, month, onExport }) {
  return <section className="hr-panel">
    <PanelHeading title={`HR reports · ${month}`} description="Workforce, attendance and payroll snapshots."
      action={<button className="hr-button secondary" onClick={onExport}><ArrowDownToLine size={16} /> Export CSV</button>} />
    <div className="hr-report-grid">
      {[
        ['Employees', data.employeeCount, 'Employee Report'],
        ['Attendance records', data.attendanceCount, 'Attendance Report'],
        ['Payroll runs', data.payrollRunCount, 'Payroll Report'],
        ['Net payroll', money(data.totalNet), 'Salary Report'],
      ].map(([valueLabel, value, title]) => <article key={title}><span>{title}</span><strong>{value ?? '—'}</strong><small>For {month}</small></article>)}
    </div>
  </section>;
}

function DepartmentForm() {
  return <div className="hr-form-grid">
    <Field label="Name" required><input name="name" required /></Field><Field label="Code" required><input name="code" required /></Field>
    <Field label="Status"><select name="status"><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></Field>
  </div>;
}

function EmployeeTypeForm() {
  return <div className="hr-form-grid">
    <Field label="Name" required><input name="name" required placeholder="e.g. Biomedical engineer" /></Field>
    <Field label="Code" required><input name="code" required placeholder="e.g. BIOMEDICAL_ENGINEER" /></Field>
  </div>;
}

function DesignationForm({ departments }) {
  return <div className="hr-form-grid">
    <Field label="Name" required><input name="name" required /></Field><Field label="Code" required><input name="code" required /></Field>
    <Field label="Department"><select name="departmentId"><option value="">Select department</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
  </div>;
}

function ShiftForm() {
  return <div className="hr-form-grid">
    <Field label="Shift name" required><input name="name" required /></Field>
    <Field label="Start time" required><input name="startTime" type="time" required /></Field>
    <Field label="End time" required><input name="endTime" type="time" required /></Field>
    <Field label="Break (minutes)"><input name="breakMinutes" type="number" min="0" defaultValue="0" /></Field>
  </div>;
}

function AttendanceForm({ employees }) {
  return <div className="hr-form-grid">
    <Field label="Employee" required><select name="employeeId" required><option value="">Select employee</option>{employees.map((item) => <option key={item.id} value={item.id}>{[item.firstName, item.lastName].filter(Boolean).join(' ')}</option>)}</select></Field>
    <Field label="Date" required><input name="attendanceDate" type="date" required /></Field>
    <Field label="Status" required><select name="status">{ATTENDANCE_STATUSES.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select></Field>
    <Field label="Check in"><input name="checkIn" type="time" /></Field>
    <Field label="Check out"><input name="checkOut" type="time" /></Field>
    <Field label="Worked hours"><input name="workedHours" type="number" min="0" step="0.25" defaultValue="0" /></Field>
    <Field label="Overtime hours"><input name="overtimeHours" type="number" min="0" step="0.25" defaultValue="0" /></Field>
  </div>;
}

function ComponentForm() {
  return <div className="hr-form-grid">
    <Field label="Name" required><input name="name" required /></Field><Field label="Code" required><input name="code" required /></Field>
    <Field label="Type"><select name="type"><option value="EARNING">Earning</option><option value="DEDUCTION">Deduction</option></select></Field>
    <Field label="Calculation type"><select name="calculationType"><option value="FIXED">Fixed</option><option value="PERCENTAGE">Percentage</option><option value="FORMULA">Formula</option></select></Field>
    <Field label="Value / formula"><input name="value" required placeholder="e.g. 3000 or 30" /></Field>
    <Field label="Base component code"><input name="baseCode" defaultValue="BASIC" /></Field>
  </div>;
}

function StructureForm({ employees, components }) {
  const [lines, setLines] = useState([0]);
  const addLine = () => setLines((current) => [...current, Math.max(...current) + 1]);
  return <>
    <div className="hr-form-grid">
      <Field label="Employee" required><select name="employeeId" required><option value="">Select employee</option>{employees.map((item) => <option key={item.id} value={item.id}>{[item.firstName, item.lastName].filter(Boolean).join(' ')}</option>)}</select></Field>
      <Field label="Effective from" required><input name="effectiveFrom" type="date" required /></Field>
      <Field label="Effective to"><input name="effectiveTo" type="date" /></Field>
    </div>
    <div className="hr-structure-lines">
      <div className="hr-structure-lines-heading"><strong>Salary components</strong>
        <button type="button" className="hr-text-button" onClick={addLine}><Plus size={14} /> Add line</button></div>
      {lines.map((key) => <div className="hr-structure-line" key={key}>
        <Field label="Component" required><select name="componentId" required><option value="">Select component</option>{components.map((item) => <option key={item.id} value={item.id}>{item.name} ({titleCase(item.type)})</option>)}</select></Field>
        <Field label="Amount"><input name="amount" type="number" min="0" step="0.01" defaultValue="0" /></Field>
        <Field label="Units"><input name="units" type="number" min="0" step="0.01" defaultValue="1" /></Field>
      </div>)}
    </div>
  </>;
}
