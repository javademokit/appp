import React from "react";
import "./DoctorProfile.css"; // Custom CSS

const doctors = [
  {
    id: 1,
    name: "Dr. Alice Smith",
    specialty: "Cardiologist",
    image: "https://via.placeholder.com/150",
    profile: "Experienced in treating heart-related conditions with over 10 years of experience."
  },
  {
    id: 2,
    name: "Dr. John Doe",
    specialty: "Pediatrician",
    image: "https://via.placeholder.com/150",
    profile: "Specializes in child healthcare with a friendly and approachable demeanor."
  },
  {
    id: 3,
    name: "Dr. Sarah Lee",
    specialty: "Dermatologist",
    image: "https://via.placeholder.com/150",
    profile: "Expert in treating skin conditions with modern dermatological practices."
  }
];

const DoctorProfile = () => {
  return (
    <div className="doctor-profile-page">
     <h1 className="title">
  <img
    src="https://img.icons8.com/ios-filled/50/000000/doctor-male.png"
    alt="Doctor Icon"
    className="title-icon"
  />
  Our Doctors
</h1>
      <div className="doctor-list">
        {doctors.map((doc) => (
          <div key={doc.id} className="doctor-card">
            <img src={doc.image} alt={doc.name} className="doctor-image" />
            <h2>{doc.name}</h2>
            <p className="specialty">{doc.specialty}</p>
            <p className="profile">{doc.profile}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DoctorProfile;
