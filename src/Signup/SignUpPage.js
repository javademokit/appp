// SignUpPage.js
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './SignUpPage.css';

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

    setLoading(true);
    try {
      const response = await fetch('http://localhost:7771/api/users/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, emailId,mobileNo, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Sign up successful!');
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
      <motion.div
        className="signup-form"
        variants={formVariants}
        initial="hidden"
        animate="visible"
      >
       <h1 className="text-2xl font-bold text-blue-600 mb-8">🏥 MedCare</h1>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="text"
              placeholder="UserId"
              value={userId}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="input-group">
            <input
              type="email"
              placeholder="Email"
              value={emailId}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="input-group">
            <input
              type="MobileNo"
              placeholder="MobileNo"
              value={mobileNo}
              onChange={(e) => setMobileNo(e.target.value)}
            />
          </div>
          <div className="input-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="signup-btn" disabled={loading}>
            {loading ? 'Creating...' : 'Sign Up'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default SignUpPage;
