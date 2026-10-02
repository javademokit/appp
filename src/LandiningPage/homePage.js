import { motion } from "framer-motion";
import { useState } from "react";
import { FaHospital, FaRobot } from "react-icons/fa";
import { Link } from "react-router-dom";
import "./App.css";
import { BsClockHistory } from "react-icons/bs";

export default function HomePage() {
  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hello! I’m your MedSuite assistant. Ask about appointments, emergency care, or hospital services." },
  ]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;

    const lower = text.toLowerCase();
    let reply = "I can help with appointments, doctors, ICU availability, and emergency support.";

    if (lower.includes("book") || lower.includes("appointment") || lower.includes("slot")) {
      reply = "You can book an appointment from the patient portal or the Get Started section.";
    } else if (lower.includes("doctor") || lower.includes("specialist")) {
      reply = "Our specialists include emergency care, ICU, cardiology, and general medicine teams.";
    } else if (lower.includes("ambulance") || lower.includes("emergency") || lower.includes("urgent")) {
      reply = "Emergency and ambulance support are available 24/7 through the hospital response team.";
    } else if (lower.includes("bed") || lower.includes("icu") || lower.includes("ward")) {
      reply = "Bed and ICU availability is updated in real time on the hospital overview panel.";
    } else if (lower.includes("hello") || lower.includes("hi")) {
      reply = "Hi! I’m here to help with patient support, appointments, and hospital guidance.";
    }

    setMessages((prev) => [
      ...prev,
      { sender: "user", text },
      { sender: "bot", text: reply },
    ]);
    setDraft("");
  };

  return (
    <div className="homepage-container">
      <header className="topbar">
        <div className="brand-pill" aria-label="MedSuite brand">
          <span className="brand-icon-wrap">
            <FaHospital className="brand-icon" />
          </span>
        </div>
        <div className="top-actions">
          <button className="top-btn login-btn">
            <Link to="/PatientLogin">Patient login</Link>
          </button>
          <button className="top-btn staff-login-btn">
            <Link to="/DoctorLogin">Doctor login</Link>
          </button>
          <button className="top-btn staff-login-btn">
            <Link to="/HospitalLogin">Hospital CRM / HR</Link>
          </button>
          <button className="top-btn signup-btn">
            <Link to="/SignUpPage">Sign Up</Link>
          </button>
        </div>
      </header>

      <motion.div
        className="twentyfour-seven"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: [0.9, 1.1, 0.9], opacity: 1 }}
        transition={{ duration: 5, repeat: Infinity }}
      >
        <BsClockHistory />
        <p className="service-label" style={{ color: "red" }}>24/7 Emergency Service</p>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="title"
      >
        Ayurved Hospital Patna
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="subtitle"
      >
        Ensuring quick and efficient emergency response with real-time tracking, automated dispatch, and seamless coordination.
      </motion.p>

      <motion.div
        className="hero-visual"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.7, duration: 1.1 }}
      >
        <div className="hero-image-glow" />
        <img
          src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80"
          alt="Modern hospital building"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 1 }}
        className="button-group"
      >
        <button className="button get-started">
          <Link to="/get-started">Get Started</Link>
        </button>
      </motion.div>

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

      <div className="chatbot-wrap">
        {chatOpen && (
          <div className="chatbot-panel">
            <div className="chatbot-header">
              <div className="chatbot-title">
                <span className="chatbot-dot" />
                <span>AI Assistant</span>
              </div>
              <button className="chat-close" onClick={() => setChatOpen(false)} aria-label="Close chat">
                ×
              </button>
            </div>

            <div className="chatbot-body">
              {messages.map((msg, index) => (
                <div key={index} className={`chat-message ${msg.sender}`}>
                  {msg.text}
                </div>
              ))}
            </div>

            <div className="chatbot-input-row">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
                placeholder="Type a message..."
              />
              <button onClick={handleSend}>Send</button>
            </div>
          </div>
        )}

        <button className="chatbot-float" aria-label="Open chatbot assistant" onClick={() => setChatOpen((prev) => !prev)}>
          <span className="chatbot-dot" />
          <FaRobot className="chatbot-icon" />
          <span>AI Assistant</span>
        </button>
      </div>

    </div>
  );
}
