import React, { useState } from 'react';

const departments = ['Cardiology', 'Neurology', 'Pediatrics', 'Emergency', 'Orthopedics'];

const RegisterStaff = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3001/api/staff/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (response.ok) {
        alert('✅ Staff registered successfully!');
        setFormData({ name: '', email: '', phone: '', department: '', designation: '' });
      } else {
        alert(result.message || 'Something went wrong.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Server error. Please try again.');
    }
  };

  return (
    <div className="register-staff-container">
      <h2>🏥 New Medical Staff Registration</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email Address"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <input
          type="tel"
          name="phone"
          placeholder="Phone Number"
          value={formData.phone}
          onChange={handleChange}
          required
        />
        <select name="department" value={formData.department} onChange={handleChange} required>
          <option value="">Select Department</option>
          {departments.map(dep => (
            <option key={dep} value={dep}>{dep}</option>
          ))}
        </select>
        <input
          type="text"
          name="designation"
          placeholder="Designation (e.g., Nurse, Surgeon)"
          value={formData.designation}
          onChange={handleChange}
          required
        />
        <button type="submit">Register Staff</button>
      </form>
    </div>
  );
};

export default RegisterStaff;
