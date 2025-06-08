import React, { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  UserCheck,
  Stethoscope,
  Ambulance,
  BedDouble,
  ScanLine,
  TestTube2,
  Baby,
  ActivitySquare,
  FlaskConical
} from "lucide-react";
import "./Dashboard.css";

const Dashboard = () => {
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [totalDoctors, setTotalDoctors] = useState(0); // New state for doctors count

  useEffect(() => {
    const fetchAppointments = () => {
      fetch("http://localhost:7771/api/appointments1")
        .then((res) => {
          if (!res.ok) throw new Error("Network response was not ok");
          return res.json();
        })
        .then((data) => setTotalAppointments(data.length))
        .catch((error) => console.error("Error fetching appointments:", error));
    };

    const fetchDoctors = () => {
      fetch("http://localhost:7771/api/doctors")
        .then((res) => {
          if (!res.ok) throw new Error("Network response was not ok");
          return res.json();
        })
        .then((data) => setTotalDoctors(data.length))
        .catch((error) => console.error("Error fetching doctors:", error));
    };

    fetchAppointments();
    fetchDoctors();

    // Update every 10 seconds
    const intervalId = setInterval(() => {
      fetchAppointments();
      fetchDoctors();
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  const metrics = [
    { label: "Total Appointments", value: totalAppointments, icon: Calendar, color: "card-blue" },
    { label: "Waiting Patients", value: 24, icon: Clock, color: "card-yellow" },
    { label: "Nurses Present", value: 18, icon: UserCheck, color: "card-green" },
    { label: "Total Doctors", value: totalDoctors, icon: Stethoscope, color: "card-purple" }, // Updated value
    { label: "Ambulances Available", value: 5, icon: Ambulance, color: "card-red" },
    { label: "Available Rooms", value: 12, icon: BedDouble, color: "card-cyan" },
    { label: "Booked Rooms", value: 9, icon: BedDouble, color: "card-orange" },
    { label: "Operations Today", value: 7, icon: ActivitySquare, color: "card-pink" },
    { label: "Kids Appointments", value: 15, icon: Baby, color: "card-teal" },
    { label: "CRMSCAN Total", value: 11, icon: ScanLine, color: "card-indigo" },
    { label: "Blood Tests", value: 23, icon: TestTube2, color: "card-rose" },
    { label: "Urine Tests", value: 19, icon: FlaskConical, color: "card-lime" }
  ];

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">🏥 MediQ</h1>
      <div className="metrics-grid">
        {metrics.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="metric-card">
            <div className={`metric-icon ${color}`}>
              <Icon size={24} />
            </div>
            <div className="metric-details">
              <p className="metric-label">{label}</p>
              <p className="metric-value">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
