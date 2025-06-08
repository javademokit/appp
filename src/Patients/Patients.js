import React, { useState } from 'react';
import './UrineTestForm.css';

const medicalTestTypes = [
  { name: 'Complete Blood Count (CBC)', price: 500 },
  { name: 'Blood Chemistry Test', price: 800 },
  { name: 'Lipid Profile', price: 600 },
  { name: 'Blood Culture', price: 1000 },
  { name: 'Coagulation Test', price: 700 },
  { name: 'Urinalysis', price: 300 },
  { name: 'Urine Culture', price: 450 },
  { name: 'X-ray', price: 1200 },
  { name: 'Ultrasound', price: 1500 },
  { name: 'CT Scan', price: 4000 },
  { name: 'MRI', price: 5000 },
  { name: 'Mammography', price: 3500 },
  { name: 'PET Scan', price: 6000 },
  { name: 'Tissue Biopsy', price: 2000 },
  { name: 'Cytology', price: 1500 },
  { name: 'Genetic Test', price: 8000 },
  { name: 'Culture and Sensitivity', price: 700 },
  { name: 'Rapid Antigen Test', price: 400 },
  { name: 'PCR Test', price: 3500 },
  { name: 'Electrocardiogram (ECG)', price: 900 },
  { name: 'Echocardiogram', price: 1200 },
  { name: 'Stress Test', price: 1000 },
  { name: 'Allergy Test', price: 2500 },
  { name: 'Thyroid Function Test', price: 800 },
  { name: 'Bone Density Test', price: 2000 },
  { name: 'Pulmonary Function Test', price: 1800 },
  { name: 'Lumbar Puncture', price: 3000 },
];

const labTechnicians = ['Technician A', 'Technician B', 'Technician C'];
const referredDoctors = ['Dr. Sharma', 'Dr. Mehta', 'Dr. Khan', 'Outside'];

const UrineTestForm = () => {
  const [formData, setFormData] = useState({
    patientName: '',
    age: '',
    gender: 'male',
    category: 'adult',
    medicalTestType: 'Urinalysis',
    testPrice: 300,
    labTechnician: labTechnicians[0],
    referredBy: referredDoctors[0],
    glucose: '',
    protein: '',
    ketones: '',
    ph: '',
    blood: '',
    remarks: '',
  });

  const [showReceipt, setShowReceipt] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'medicalTestType') {
      const selected = medicalTestTypes.find(test => test.name === value);
      setFormData({ ...formData, medicalTestType: value, testPrice: selected?.price || 0 });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch('http://localhost:8080/api/urine-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert('🧾 Test Submitted Successfully');
        setShowReceipt(true);
      } else {
        alert('⚠️ Submission failed!');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('❌ Server error during submission.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="urine-test-form-container">
      <h2>🧪 Medical Test Entry - AIMS</h2>
      <form onSubmit={handleSubmit} className="urine-test-form">
        <div className="form-group">
          <input type="text" name="patientName" placeholder="Patient Name" value={formData.patientName} onChange={handleChange} required />
          <input type="number" name="age" placeholder="Age" value={formData.age} onChange={handleChange} required min={0} />
        </div>

        <div className="form-group">
          <select name="gender" value={formData.gender} onChange={handleChange}>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <select name="category" value={formData.category} onChange={handleChange}>
            <option value="boy">Boy</option>
            <option value="girl">Girl</option>
            <option value="adult">Adult</option>
          </select>
        </div>

        <div className="form-group">
          <label>Medical Test Type:</label>
          <select name="medicalTestType" value={formData.medicalTestType} onChange={handleChange}>
            {medicalTestTypes.map((test, idx) => (
              <option key={idx} value={test.name}>{test.name}</option>
            ))}
          </select>
          <p>💰 Price: ₹{formData.testPrice}</p>
        </div>

        <div className="form-group">
          <label>Lab Technician:</label>
          <select name="labTechnician" value={formData.labTechnician} onChange={handleChange}>
            {labTechnicians.map((tech, idx) => (
              <option key={idx} value={tech}>{tech}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Referred By Doctor:</label>
          <select name="referredBy" value={formData.referredBy} onChange={handleChange}>
            {referredDoctors.map((doc, idx) => (
              <option key={idx} value={doc}>{doc}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <input type="text" name="glucose" placeholder="Glucose" value={formData.glucose} onChange={handleChange} />
          <input type="text" name="protein" placeholder="Protein" value={formData.protein} onChange={handleChange} />
        </div>

        <div className="form-group">
          <input type="text" name="ketones" placeholder="Ketones" value={formData.ketones} onChange={handleChange} />
          <input type="text" name="ph" placeholder="pH" value={formData.ph} onChange={handleChange} />
        </div>

        <div className="form-group">
          <input type="text" name="blood" placeholder="Blood" value={formData.blood} onChange={handleChange} />
        </div>

        <textarea name="remarks" placeholder="Additional Remarks" value={formData.remarks} onChange={handleChange}></textarea>

        <button type="submit">✅ Submit Test</button>
      </form>

      {showReceipt && (
        <div className="receipt">
          <h3>🧾 Receipt</h3>
          <p><strong>Patient:</strong> {formData.patientName} ({formData.age}, {formData.gender})</p>
          <p><strong>Category:</strong> {formData.category}</p>
          <p><strong>Test:</strong> {formData.medicalTestType}</p>
          <p><strong>Price:</strong> ₹{formData.testPrice}</p>
          <p><strong>Lab Technician:</strong> {formData.labTechnician}</p>
          <p><strong>Referred By:</strong> {formData.referredBy}</p>
          <p><strong>Remarks:</strong> {formData.remarks}</p>
          <button onClick={handlePrint}>🖨️ Print</button>
        </div>
      )}
    </div>
  );
};

export default UrineTestForm;
