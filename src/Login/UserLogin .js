import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHospital, FaUserShield } from 'react-icons/fa';
import { apiFetch } from '../API/api';
import './LoginPage.css';
import { getPortalPathForRoles, normalizeRoles, ROLES, STAFF_PORTAL_ROLES } from '../Admin/roles';


const UserLogin = ({ portal = 'all' }) => {
  const [emailId, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showError, setShowError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowError(false);
    setErrorMessage('');

    if (!emailId || !password) {
      setShowError(true);
      setErrorMessage('Please fill in both fields.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch('/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Invalid credentials');
      }

      let account = data.user;
      let roles = normalizeRoles(account?.roles);
      if (!roles.length) {
        const currentUserResponse = await apiFetch('/users/me');
        if (currentUserResponse.ok) {
          account = await currentUserResponse.json();
          roles = normalizeRoles(account.roles);
        }
      }

      const allowedRoles = portal === 'patient'
        ? [ROLES.PATIENT]
        : portal === 'hospital'
          ? STAFF_PORTAL_ROLES
          : portal === 'doctor'
            ? [ROLES.DOCTOR]
            : null;
      if (allowedRoles && !roles.some((role) => allowedRoles.includes(role))) {
        try {
          await apiFetch('/users/logout', { method: 'POST' });
        } catch {
          // Keep the portal-specific access message if session cleanup fails.
        }
        const portalLabel = portal === 'patient'
          ? 'patient'
          : portal === 'doctor'
            ? 'doctor'
            : 'hospital staff';
        throw new Error(`This account does not have ${portalLabel} portal access. Contact your hospital administrator.`);
      }

      const portalPath = getPortalPathForRoles(roles);
      if (!portalPath) {
        try {
          await apiFetch('/users/logout', { method: 'POST' });
        } catch {
          // Keep the actionable role-assignment message if session cleanup fails.
        }
        if (!roles.length) {
          throw new Error('The server signed you in but did not return account roles. Restart the backend from the latest source, then sign in again. If the problem remains, ask a super administrator to assign your role.');
        }
        throw new Error(`Your account has no supported portal role assigned. Current roles: ${roles.join(', ')}. Ask a hospital administrator to assign a supported role.`);
      }
      navigate(portal === 'patient'
        ? '/PatientPortal'
        : portal === 'doctor'
          ? '/DoctorDashboard'
          : portalPath);

    } catch (error) {
      setErrorMessage(error.message || 'An error occurred during login');
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="auth-layout">
        <aside className="auth-promo">
          <Link className="auth-brand" to="/">
            <span className="auth-brand-icon"><FaHospital aria-hidden="true" /></span>
            <span>MedSuite</span>
          </Link>
          <div className="auth-promo-content">
            <span className="auth-promo-symbol"><FaUserShield aria-hidden="true" /></span>
            <p className="auth-kicker">Your care, connected</p>
            <h2>A simpler way to stay close to your care.</h2>
            <p className="auth-promo-description">
              Sign in to continue to appointments and services for your hospital portal.
            </p>
          </div>
          <Link className="auth-back-link" to="/"><FaArrowLeft aria-hidden="true" /> Back to home</Link>
          <span className="auth-promo-decoration auth-promo-decoration-one" />
          <span className="auth-promo-decoration auth-promo-decoration-two" />
        </aside>
        <motion.div
          className="login-form auth-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
        <div className="auth-card-heading">
        <p className="auth-kicker">Welcome back</p>
        <h1>
          {portal === 'patient'
            ? 'Patient login'
            : portal === 'doctor'
              ? 'Doctor login'
              : portal === 'hospital'
                ? 'Hospital CRM / HR login'
                : 'MedSuite login'}
        </h1>
        <p className="login-description">
          {portal === 'patient'
            ? 'Sign in to manage your patient profile and appointments.'
            : portal === 'doctor'
              ? 'Sign in with your hospital doctor account to access the clinical workspace.'
            : portal === 'hospital'
              ? 'For authorized reception and CRM staff booking patient appointments.'
              : 'Choose the portal assigned to your account.'}
        </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="auth-input-group">
            <input
              type="email"
              placeholder="Email"
              aria-label="Email"
              autoComplete="username"
              required
              value={emailId}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="auth-input-group">
            <input
              type="password"
              placeholder="Password"
              aria-label="Password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {showError && <p className="error" role="alert">{errorMessage}</p>}
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
        <nav className="login-options" aria-label="Other sign-in options">
          {portal === 'all' && <Link to="/PatientLogin">Patient login</Link>}
          {portal !== 'doctor' && <Link to="/DoctorLogin">Doctor login</Link>}
          {portal !== 'hospital' && <Link to="/HospitalLogin">Hospital CRM / HR login</Link>}
          {portal !== 'hospital' && <Link to="/SignUpPage">Create a patient account</Link>}
        </nav>
        </motion.div>
      </div>
    </div>
  );
};

export default UserLogin;
