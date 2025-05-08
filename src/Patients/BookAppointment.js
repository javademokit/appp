import React, { useState, useEffect } from 'react';
import './BookAppointment.css';
import {
  FaUser,
  FaUserMd,
  FaCalendarAlt,
  FaClock,
  FaNotesMedical,
  FaRupeeSign,
  FaPrint,
} from 'react-icons/fa';

const BookAppointment = () => {
  const [form, setForm] = useState({
    patientName: '',
    doctor: '',
    date: '',
    time: '',
    reason: '',
    fee: '',
  });

  const [report, setReport] = useState(null);
  const [sequenceNo, setSequenceNo] = useState(1);
  const [bookingTime, setBookingTime] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await fetch('http://localhost:7771/api/doctors');
        const data = await res.json();
        setDoctors(data.filter((d) => d.doctorName)); // Remove empty items
      } catch (error) {
        console.error('Failed to fetch doctors:', error);
      }
    };

    fetchDoctors();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'doctor') {
      const selectedDoctor = doctors.find((d) => d.doctorName === value);
      if (selectedDoctor) {
        setForm({ ...form, doctor: value, fee: selectedDoctor.doctorfee });
        setAvailableTimes(selectedDoctor.doctorAvailabletime || []);
      } else {
        setForm({ ...form, doctor: value, fee: '' });
        setAvailableTimes([]);
      }
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Submitting form...', form);

    try {
      const response = await fetch('http://localhost:7771/api/appointments1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok) {
        alert('✅ Appointment booked successfully!');
        setBookingTime(new Date().toLocaleString());
        setReport({ ...data, sequence: sequenceNo });
        setSequenceNo((prev) => prev + 1);
        setForm({
          patientName: '',
          doctor: '',
          date: '',
          time: '',
          reason: '',
          fee: '',
        });
        setAvailableTimes([]);
      } else {
        alert(`❌ Failed: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
      console.error('Booking error:', error);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('appointment-report');
    const newWin = window.open('', '_blank');

    newWin.document.write(`
      <html>
        <head>
          <title>Appointment Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            h2, h4 {
              text-align: center;
              margin: 5px 0;
            }
            p {
              text-align: center;
              margin: 2px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #333;
              padding: 10px;
              text-align: center;
            }
            .signature-block {
              margin-top: 40px;
              text-align: right;
              font-size: 14px;
            }
            .signature-block p {
              margin: 4px 0;
            }
            .close-btn {
              display: block;
              margin: 30px auto 0;
              padding: 10px 20px;
              font-size: 16px;
              background-color: #f44336;
              color: white;
              border: none;
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <button class="close-btn" onclick="window.close()">Close</button>
        </body>
      </html>
    `);

    newWin.document.close();
    newWin.focus();
    newWin.print();
  };

  return (
    <div className="book-container">
      <h2 className="form-title">📖 Book an Appointment</h2>

      <form onSubmit={handleSubmit} className="appointment-form">
        <div className="form-group">
          <FaUser className="form-icon" />
          <input
            type="text"
            name="patientName"
            placeholder="Patient Full Name"
            value={form.patientName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <FaUserMd className="form-icon" />
          <select
            name="doctor"
            value={form.doctor}
            onChange={handleChange}
            required
          >
            <option value="">Select Doctor</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.doctorName}>
                {doc.doctorName} - {doc.doctorSpecialistName}
              </option>
            ))}
          </select>
        </div>

        {form.fee && (
          <div className="form-group">
            <FaRupeeSign className="form-icon" />
            <input
              type="text"
              value={`₹${form.fee}`}
              readOnly
              title="Doctor's Fee"
            />
          </div>
        )}

        <div className="form-group">
          <FaCalendarAlt className="form-icon" />
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <FaClock className="form-icon" />
          <select
            name="time"
            value={form.time}
            onChange={handleChange}
            required
          >
            <option value="">Select Time Slot</option>
            {availableTimes.map((slot, index) => (
              <option key={index} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <FaNotesMedical className="form-icon" />
          <textarea
            name="reason"
            placeholder="Reason for appointment"
            value={form.reason}
            onChange={handleChange}
            rows={3}
          />
        </div>

        <button type="submit" className="submit-btn">
          Book Appointment
        </button>
      </form>

      {report && (
        <div className="appointment-report">
          <div id="appointment-report">
            <h2>🏥 Wellness Hospital</h2>
            <p>123 Health St, Wellness City, IN</p>
            <p>📞 +91 98765 43210</p>
            <h4>🧾 Appointment Report</h4>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Reason</th>
                  <th>Fee</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{report.sequence}</td>
                  <td>{report.patientName}</td>
                  <td>{report.doctor}</td>
                  <td>{report.date}</td>
                  <td>{report.time}</td>
                  <td>{report.reason}</td>
                  <td>₹{report.fee}</td>
                </tr>
              </tbody>
            </table>
            <p><strong>Booking Time:</strong> {bookingTime}</p>

            <div className="signature-block">
              <p>__________________________</p>
              <p>Authorized Signature</p>
            </div>
          </div>

          <div className="report-buttons">
            <button onClick={handlePrint} className="print-btn">
              <FaPrint /> Print Report
            </button>
            <button className="close-btn" onClick={() => setReport(null)}>
              Close Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookAppointment;
