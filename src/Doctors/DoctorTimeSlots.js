import React from "react";
import "./DoctorTimeSlots.css";

const doctors = [
  {
    id: 1,
    name: "Dr. Alice Smith",
    specialty: "Cardiologist",
    image: "https://via.placeholder.com/150",
    slots: ["09:00 AM", "10:30 AM", "02:00 PM", "04:00 PM"]
  },
  {
    id: 2,
    name: "Dr. John Doe",
    specialty: "Pediatrician",
    image: "https://via.placeholder.com/150",
    slots: ["11:00 AM", "12:30 PM", "03:00 PM"]
  },
  {
    id: 3,
    name: "Dr. Sarah Lee",
    specialty: "Dermatologist",
    image: "https://via.placeholder.com/150",
    slots: ["10:00 AM", "01:00 PM", "03:30 PM", "05:00 PM"]
  }
];

const DoctorTimeSlots = () => {
  return (
    <div className="doctor-time-page">
      <h1 className="title">
        <img
          src="https://img.icons8.com/ios-filled/50/000000/doctor-male.png"
          alt="Doctor Icon"
          className="title-icon"
        />
        Doctor Time Slots
      </h1>
      <div className="doctor-list">
        {doctors.map((doc) => (
          <div key={doc.id} className="doctor-card">
            <img src={doc.image} alt={doc.name} className="doctor-image" />
            <h2>{doc.name}</h2>
            <p className="specialty">{doc.specialty}</p>
            <div className="slot-section">
              <h4>Available Slots</h4>
              <div className="slots">
                {doc.slots.map((slot, index) => (
                  <button key={index} className="slot-btn">
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DoctorTimeSlots;
