import React from "react";
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

const metrics = [
    { label: "Total Appointments", value: 128, icon: Calendar, color: "card-blue" },
    { label: "Waiting Patients", value: 24, icon: Clock, color: "card-yellow" },
    { label: "Nurses Present", value: 18, icon: UserCheck, color: "card-green" },
    { label: "Total Doctors", value: 42, icon: Stethoscope, color: "card-purple" },
    { label: "Ambulances Available", value: 5, icon: Ambulance, color: "card-red" },
    { label: "Available Rooms", value: 12, icon: BedDouble, color: "card-cyan" },
    { label: "Booked Rooms", value: 9, icon: BedDouble, color: "card-orange" },
    { label: "Operations Today", value: 7, icon: ActivitySquare, color: "card-pink" },
    { label: "Kids Appointments", value: 15, icon: Baby, color: "card-teal" },
    { label: "CRMSCAN Total", value: 11, icon: ScanLine, color: "card-indigo" },
    { label: "Blood Tests", value: 23, icon: TestTube2, color: "card-rose" },
    { label: "Urine Tests", value: 19, icon: FlaskConical, color: "card-lime" }
];

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">🏥 Hospital Overview</h1>
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
