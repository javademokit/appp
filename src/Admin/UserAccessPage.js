import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save, UserPlus } from 'lucide-react';
import { apiFetch } from '../API/api';
import { normalizeRoles, ROLES } from './roles';
import '../Operations/Operations.css';

const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN, ROLES.CLINIC_ADMIN];
const ASSIGNABLE_ROLES = [
  ROLES.DOCTOR,
  ROLES.NURSE,
  ROLES.HEAD_NURSE,
  ROLES.RECEPTIONIST,
  ROLES.CRM_EXECUTIVE,
  ROLES.BILLING_EXECUTIVE,
  ROLES.FINANCE,
  ROLES.HR,
  ROLES.PHARMACIST,
  ROLES.LAB_TECHNICIAN,
  ...ADMIN_ROLES,
];

async function readResponse(response) {
  let result = {};
  if (typeof response.text === 'function') {
    const responseText = await response.text();
    if (responseText) {
      try {
        result = JSON.parse(responseText);
      } catch {
        result = { message: responseText };
      }
    }
  } else {
    result = await response.json().catch(() => ({}));
  }
  if (!response.ok) {
    const validationErrors = Array.isArray(result.errors)
      ? result.errors.map((entry) => entry.defaultMessage || entry.message || entry).filter(Boolean).join('; ')
      : '';
    const message = result.message || result.detail || validationErrors || result.error
      || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return result;
}

export default function UserAccessPage() {
  const [users, setUsers] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [draftRoles, setDraftRoles] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingUser, setSavingUser] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [newStaff, setNewStaff] = useState({
    userId: '',
    emailId: '',
    mobileNo: '',
    password: '',
    doctorId: '',
    roles: [ROLES.CRM_EXECUTIVE],
  });
  const [doctorProfileMode, setDoctorProfileMode] = useState('existing');
  const [newDoctorProfile, setNewDoctorProfile] = useState({
    doctorName: '',
    doctorSpecialistName: '',
    doctorMobileNo: '',
    doctorDestination: '',
    doctorAvailabletime: '',
    doctorfee: '0',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isSuperAdmin = useMemo(
    () => normalizeRoles(currentUser?.roles).includes(ROLES.SUPER_ADMIN),
    [currentUser],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersResult, meResult, doctorsResult, nursesResult] = await Promise.all([
        apiFetch('/users').then(readResponse),
        apiFetch('/users/me').then(readResponse),
        apiFetch('/doctors').then(readResponse),
        apiFetch('/nursing/nurses').then(readResponse),
      ]);
      if (!Array.isArray(usersResult) || !Array.isArray(doctorsResult) || !Array.isArray(nursesResult)) {
        throw new Error('Account or doctor list response is invalid');
      }
      setUsers(usersResult);
      setDoctors(doctorsResult);
      setNurses(nursesResult);
      setCurrentUser(meResult);
      setDraftRoles(Object.fromEntries(
        usersResult.map((user) => [user.userId, normalizeRoles(user.roles)]),
      ));
    } catch (requestError) {
      setError(requestError.message || 'Could not load user access records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const toggleRole = (userId, role) => {
    setDraftRoles((current) => {
      const selected = new Set(current[userId] || []);
      if (selected.has(role)) selected.delete(role);
      else selected.add(role);
      return { ...current, [userId]: [...selected] };
    });
  };

  const toggleNewStaffRole = (role) => {
    setNewStaff((current) => {
      const selectedRoles = new Set(current.roles);
      if (selectedRoles.has(role)) selectedRoles.delete(role);
      else selectedRoles.add(role);
      return { ...current, roles: [...selectedRoles] };
    });
  };

  const createStaffAccount = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!newStaff.roles.length) {
      setError('Select at least one staff role for the new account.');
      return;
    }

    setCreatingUser(true);
    try {
      const staffRequest = {
        userId: newStaff.userId,
        emailId: newStaff.emailId,
        mobileNo: newStaff.mobileNo,
        password: newStaff.password,
        roles: newStaff.roles,
      };
      if (newStaff.roles.includes(ROLES.DOCTOR)) {
        if (doctorProfileMode === 'new') {
          const doctorAvailabletime = newDoctorProfile.doctorAvailabletime
            .split(',')
            .map((slot) => slot.trim())
            .filter(Boolean);
          if (!doctorAvailabletime.length) {
            throw new Error('Enter at least one available time slot for the doctor.');
          }
          staffRequest.doctorProfile = {
            ...newDoctorProfile,
            doctorAvailabletime,
            doctorfee: Number(newDoctorProfile.doctorfee),
          };
        } else {
          staffRequest.doctorId = newStaff.doctorId;
        }
      }
      const account = await readResponse(await apiFetch('/users/staff', {
        method: 'POST',
        body: JSON.stringify(staffRequest),
      }));
      setSuccess(`Staff account ${account.userId} created. Share its initial password using your approved secure channel.`);
      setNewStaff({
        userId: '',
        emailId: '',
        mobileNo: '',
        password: '',
        doctorId: '',
        roles: [ROLES.CRM_EXECUTIVE],
      });
      setDoctorProfileMode('existing');
      setNewDoctorProfile({
        doctorName: '',
        doctorSpecialistName: '',
        doctorMobileNo: '',
        doctorDestination: '',
        doctorAvailabletime: '',
        doctorfee: '0',
      });
      await refresh();
    } catch (requestError) {
      setError(requestError.message || 'Could not create staff account');
    } finally {
      setCreatingUser(false);
    }
  };

  const saveRoles = async (user) => {
    const roles = draftRoles[user.userId] || [];
    if (!roles.length) {
      setError('Select at least one role for each account.');
      return;
    }
    setSavingUser(user.userId);
    setError('');
    setSuccess('');
    try {
      const updated = await readResponse(await apiFetch(
        `/users/${encodeURIComponent(user.userId)}/roles`,
        { method: 'PUT', body: JSON.stringify({ roles }) },
      ));
      setUsers((current) => current.map((entry) => entry.userId === user.userId
        ? { ...entry, roles: updated.roles }
        : entry));
      setDraftRoles((current) => ({ ...current, [user.userId]: normalizeRoles(updated.roles) }));
      setSuccess(`Access roles updated for ${user.userId}. They must sign in again for the change to take effect.`);
    } catch (requestError) {
      setError(requestError.message || 'Could not update account roles');
    } finally {
      setSavingUser('');
    }
  };

  const assignDoctorProfile = async (user, doctorId) => {
    setError('');
    setSuccess('');
    try {
      const updated = await readResponse(await apiFetch(
        `/users/${encodeURIComponent(user.userId)}/doctor-profile`,
        { method: 'PUT', body: JSON.stringify({ doctorId }) },
      ));
      setUsers((current) => current.map((entry) => entry.userId === user.userId
        ? { ...entry, doctorId: updated.doctorId || null }
        : entry));
      setSuccess(`Doctor profile linked to ${user.userId}.`);
    } catch (requestError) {
      setError(requestError.message || 'Could not link doctor profile');
      await refresh();
    }
  };

  const mayEdit = (user) => {
    if (user.userId === currentUser?.username) return false;
    const userRoles = normalizeRoles(user.roles);
    return isSuperAdmin || !userRoles.some((role) => ADMIN_ROLES.includes(role));
  };

  const visibleRoles = isSuperAdmin
    ? ASSIGNABLE_ROLES
    : ASSIGNABLE_ROLES.filter((role) => !ADMIN_ROLES.includes(role));

  return (
    <section className="workflow-page" aria-labelledby="user-access-title" aria-busy={loading}>
      <header className="workflow-header">
        <div>
          <p className="workflow-eyebrow">Account administration</p>
          <h1 id="user-access-title">User access &amp; roles</h1>
          <p>Assign appropriate portal access to registered hospital users.</p>
        </div>
        <button className="workflow-button subtle" type="button" onClick={refresh} disabled={loading}>
          <RefreshCw size={15} /> Refresh
        </button>
      </header>

      <div className="workflow-alert warning" role="note">
        Public sign-up creates patient accounts. Create hospital staff accounts here with their required access.
        Only a super administrator can grant administrator roles.
      </div>
      {error && <div className="workflow-alert error" role="alert">{error}</div>}
      {success && <div className="workflow-alert success" role="status">{success}</div>}

      <form className="workflow-form-panel" onSubmit={createStaffAccount}>
        <div className="workflow-panel-heading">
          <div><h2>Create hospital staff account</h2><p>Staff accounts are created with assigned roles and do not need patient sign-up first.</p></div>
        </div>
        <div className="workflow-form-grid">
          <label>User ID<input required autoComplete="username" value={newStaff.userId}
            onChange={(event) => setNewStaff({ ...newStaff, userId: event.target.value })} /></label>
          <label>Email<input required type="email" autoComplete="email" value={newStaff.emailId}
            onChange={(event) => setNewStaff({ ...newStaff, emailId: event.target.value })} /></label>
          <label>Mobile number<input type="tel" autoComplete="tel" value={newStaff.mobileNo}
            onChange={(event) => setNewStaff({ ...newStaff, mobileNo: event.target.value })} /></label>
          <label>Temporary password<input required type="password" autoComplete="new-password" minLength={12}
            value={newStaff.password} onChange={(event) => setNewStaff({ ...newStaff, password: event.target.value })} /></label>
          {newStaff.roles.includes(ROLES.DOCTOR) && <>
            <label>Doctor profile<select value={doctorProfileMode} disabled={creatingUser}
              onChange={(event) => setDoctorProfileMode(event.target.value)}>
              <option value="existing">Link existing doctor</option>
              <option value="new">Create doctor profile</option>
            </select></label>
            {doctorProfileMode === 'existing' ? <label>Existing profile<select required value={newStaff.doctorId}
              onChange={(event) => setNewStaff({ ...newStaff, doctorId: event.target.value })}>
              <option value="">Select doctor profile</option>
              {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.doctorName} · {doctor.doctorSpecialistName}</option>)}
            </select></label> : <>
              <label>Doctor full name<input required value={newDoctorProfile.doctorName}
                onChange={(event) => setNewDoctorProfile({ ...newDoctorProfile, doctorName: event.target.value })} /></label>
              <label>Specialty<input required value={newDoctorProfile.doctorSpecialistName}
                onChange={(event) => setNewDoctorProfile({ ...newDoctorProfile, doctorSpecialistName: event.target.value })} /></label>
              <label>Doctor phone<input type="tel" value={newDoctorProfile.doctorMobileNo}
                onChange={(event) => setNewDoctorProfile({ ...newDoctorProfile, doctorMobileNo: event.target.value })} /></label>
              <label>Department / ward<input value={newDoctorProfile.doctorDestination}
                onChange={(event) => setNewDoctorProfile({ ...newDoctorProfile, doctorDestination: event.target.value })} /></label>
              <label>Consultation fee<input type="number" min="0" value={newDoctorProfile.doctorfee}
                onChange={(event) => setNewDoctorProfile({ ...newDoctorProfile, doctorfee: event.target.value })} /></label>
              <label>Available time slots<input required placeholder="09:00, 09:30, 10:00"
                value={newDoctorProfile.doctorAvailabletime}
                onChange={(event) => setNewDoctorProfile({ ...newDoctorProfile, doctorAvailabletime: event.target.value })} /></label>
            </>}
          </>}
          <div className="workflow-form-wide">
            <p className="workflow-field-label">Staff roles</p>
            <div className="user-role-options">{visibleRoles.map((role) => (
              <label key={role}>
                <input type="checkbox" checked={newStaff.roles.includes(role)} disabled={creatingUser}
                  onChange={() => toggleNewStaffRole(role)} />
                {role.replaceAll('_', ' ')}
              </label>
            ))}</div>
          </div>
        </div>
        <div className="workflow-form-actions">
          <button className="workflow-button primary" type="submit" disabled={creatingUser || !newStaff.roles.length}>
            <UserPlus size={14} /> {creatingUser ? 'Creating account…' : 'Create staff account'}
          </button>
        </div>
      </form>

      <section className="workflow-panel">
        <div className="workflow-panel-heading">
          <div><h2>Registered accounts</h2><p>{users.length} accounts</p></div>
        </div>
        {loading ? <div className="workflow-empty">Loading accounts…</div>
          : users.length === 0 ? <div className="workflow-empty">No accounts found.</div>
            : <div className="workflow-table-wrap"><table className="workflow-table">
              <thead><tr><th>Account</th><th>Staff ID</th><th>Current roles</th><th>Assign roles</th><th>Doctor profile</th><th>Access</th><th /></tr></thead>
              <tbody>{users.map((user) => {
                const editable = mayEdit(user);
                const selected = draftRoles[user.userId] || [];
                return <tr key={user.id || user.userId}>
                  <td><strong>{user.userId}</strong><small>{user.emailId}</small></td>
                  <td>{normalizeRoles(user.roles).includes(ROLES.DOCTOR)
                    ? doctors.find((doctor) => doctor.id === user.doctorId)?.employeeId || '—'
                    : normalizeRoles(user.roles).some((role) => [ROLES.NURSE, ROLES.HEAD_NURSE].includes(role))
                      ? nurses.find((nurse) => nurse.id === user.id)?.profile?.employeeId || '—'
                      : user.employeeCode || '—'}</td>
                  <td>{normalizeRoles(user.roles).join(', ') || 'PATIENT'}</td>
                  <td><div className="user-role-options">{visibleRoles.map((role) => (
                    <label key={role}>
                      <input type="checkbox" checked={selected.includes(role)} disabled={!editable || savingUser !== ''}
                        onChange={() => toggleRole(user.userId, role)} />
                      {role.replaceAll('_', ' ')}
                    </label>
                  ))}</div></td>
                  <td>{normalizeRoles(user.roles).includes(ROLES.DOCTOR)
                    ? <select aria-label={`Doctor profile for ${user.userId}`} value={user.doctorId || ''}
                      disabled={!editable} onChange={(event) => assignDoctorProfile(user, event.target.value)} required>
                      <option value="">Select profile</option>
                      {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.doctorName}</option>)}
                    </select>
                    : '—'}</td>
                  <td>{user.active === false ? 'Inactive' : 'Active'}</td>
                  <td><button className="workflow-button primary" type="button" disabled={!editable || savingUser !== ''}
                    onClick={() => saveRoles(user)} title={!editable ? 'This account cannot be managed by your role' : undefined}>
                    <Save size={14} /> {savingUser === user.userId ? 'Saving…' : 'Save'}
                  </button></td>
                </tr>;
              })}</tbody>
            </table></div>}
      </section>
    </section>
  );
}
