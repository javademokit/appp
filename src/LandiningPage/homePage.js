import { motion } from "framer-motion";
import { FaHospital } from "react-icons/fa";
import { Link } from "react-router-dom"; // 👈 Add this line
import "./App.css";
import { BsClockHistory } from "react-icons/bs"; // ⏰ 24/7 Icon

export default function HomePage() {
  return (

    <div className="homepage-container">

<h1 className="text-2xl font-bold text-blue-600 mb-8">Home</h1>

{/* 24/7 Service Icon */}
<motion.div
  className="twentyfour-seven"
  initial={{ scale: 0.8, opacity: 0 }}
  animate={{ scale: [0.9, 1.1, 0.9], opacity: 1 }}
  transition={{ duration: 5, repeat: Infinity }}
>
  <BsClockHistory />
  <p className="service-label"  style={{ color: 'red' }}>24/7 Emergency Service</p>
</motion.div>

      
      {/* Title Animation */}
      <motion.h1 
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="title"
      >
        Ambulance Management System
      </motion.h1>
      
      {/* Subtitle Animation */}
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="subtitle"
      >
        Ensuring quick and efficient emergency response with real-time tracking, automated dispatch, and seamless coordination.
      </motion.p>
      
       {/* Hospital Facilities Section */}
       <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 1 }}
        className="hospital-section"
        style={{ textAlign: "center", width: "100%" }}
      >
        <h2 className="hospital-title" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          <FaHospital className="hospital-icon" style={{ marginRight: "10px" }} /> Hospital Facilities
        </h2>
        <ul className="hospital-list">
          <li><Link to="#">Emergency Ward & Trauma Care</Link></li>
          <li><Link to="#">ICU & Critical Care Units</Link></li>
          <li><Link to="#">24/7 Ambulance Availability</Link></li>
          <li><Link to="#">Advanced Diagnostic Equipment</Link></li>
          <li><Link to="#">Specialist Consultations</Link></li>
        </ul>
      </motion.div>
      
  
      
      {/* Buttons */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 1 }}
        className="button-group"
      >
        <button className="button get-started">
          <Link to="/get-started">Get Started</Link>
        </button>
        <button className="button admin-signup">
          <Link to="/SignUpPage">SignUpPage</Link>
        </button>
        <button className="button admin-login">
          <Link to="/UserLogin">Admin Login</Link>
        </button>
      </motion.div>
    
      
    </div>
  );
}
