// SignUpPage.js
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaArrowLeft, FaUserPlus } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { apiFetch } from '../API/api';
import BrandLogo from '../components/BrandLogo';
import 'react-toastify/dist/ReactToastify.css';
import '../Login/LoginPage.css';

const SignUpPage = () => {
  const [userId, setName] = useState('');
  const [emailId, setEmail] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const formVariants = {
    hidden: { opacity: 0, y: -50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userId || !emailId || !password || !mobileNo) {
      toast.error('Please fill all fields');
      return;
    }
    if (password.length < 12) {
      toast.error('Password must be at least 12 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch('/users/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, emailId,mobileNo, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Patient account created. You can now sign in.');
        setName('');
        setEmail('');
        setMobileNo('');
        setPassword('');
      } else {
        throw new Error(data.message || 'Sign up failed');
      }
    } catch (error) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <ToastContainer position="top-center" />
      <div className="auth-layout auth-layout-signup">
        <aside className="auth-promo">
          <Link className="auth-brand" to="/">
            <BrandLogo className="auth-brand-icon" />
          </Link>
          <div className="auth-promo-content">
            <span className="auth-promo-symbol"><FaUserPlus aria-hidden="true" /></span>
            <p className="auth-kicker">Start with your patient account</p>
            <h2>Your next step in care starts here.</h2>
            <p className="auth-promo-description">
              Create your account to connect with your patient portal and manage appointments.
            </p>
          </div>
          <Link className="auth-back-link" to="/"><FaArrowLeft aria-hidden="true" /> Back to home</Link>
          <span className="auth-promo-decoration auth-promo-decoration-one" />
          <span className="auth-promo-decoration auth-promo-decoration-two" />
        </aside>
        <motion.div
          className="signup-form auth-card"
          variants={formVariants}
          initial="hidden"
          animate="visible"
        >
        <div className="auth-card-heading">
          <p className="auth-kicker">Patient registration</p>
          <h1>Create your account</h1>
          <p className="signup-description">Enter your details to get started with Medora AI.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="auth-input-group">
            <input
              type="text"
              placeholder="UserId"
              aria-label="UserId"
              autoComplete="username"
              required
              value={userId}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="auth-input-group">
            <input
              type="email"
              placeholder="Email"
              aria-label="Email"
              autoComplete="email"
              required
              value={emailId}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="auth-input-group">
            <input
              type="tel"
              placeholder="MobileNo"
              aria-label="MobileNo"
              autoComplete="tel"
              required
              value={mobileNo}
              onChange={(e) => setMobileNo(e.target.value)}
            />
          </div>
          <div className="auth-input-group">
            <input
              type="password"
              placeholder="Password"
              aria-label="Password"
              autoComplete="new-password"
              minLength={12}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Creating...' : 'Sign Up'}
          </button>
        </form>
        <p className="auth-switch-link">Already have an account? <Link to="/PatientLogin">Sign in</Link></p>
        </motion.div>
      </div>
    </div>
  );
};

export default SignUpPage;
