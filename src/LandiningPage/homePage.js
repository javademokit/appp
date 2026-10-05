import { useState } from 'react';
import { FaAmbulance, FaArrowRight, FaBed, FaHospital, FaPaperPlane, FaRobot, FaUserMd } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import './App.css';

const careServices = [
  {
    icon: FaAmbulance,
    title: 'Emergency care',
    description: 'Emergency support is available around the clock.',
  },
  {
    icon: FaBed,
    title: 'Hospital care',
    description: 'Inpatient and critical care services for your needs.',
  },
  {
    icon: FaUserMd,
    title: 'Doctor consultations',
    description: 'Find a doctor and request an appointment online.',
  },
];

export default function HomePage() {
  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([
    { sender: 'assistant', text: 'Hi! I can help with appointments, doctor login, and hospital services.' },
  ]);

  const askQuestion = (questionText) => {
    const text = questionText.trim();
    if (!text) return;

    const question = text.toLowerCase();
    let reply = 'I can help with appointments, doctors, emergency care, or hospital services.';
    if (question.includes('appointment') || question.includes('book') || question.includes('slot')) {
      reply = 'To request an appointment, choose “Book an appointment” and sign in to the patient portal.';
    } else if (question.includes('doctor') || question.includes('specialist')) {
      reply = 'Sign in through Doctor login to open the clinical workspace. Patients can browse doctors from the appointment form.';
    } else if (question.includes('emergency') || question.includes('ambulance') || question.includes('urgent')) {
      reply = 'Emergency support is available 24/7. For an urgent emergency, contact local emergency services or the hospital directly.';
    } else if (question.includes('hospital') || question.includes('service') || question.includes('icu')
      || question.includes('portal')) {
      reply = 'Explore the Hospital services section on this page, or sign in to your portal for more options.';
    } else if (question.includes('hello') || question.includes('hi')) {
      reply = 'Hello! How can I help you find the right portal or service?';
    }
    setMessages((current) => [...current, { sender: 'user', text }, { sender: 'assistant', text: reply }]);
    setDraft('');
  };

  const sendMessage = (event) => {
    event.preventDefault();
    askQuestion(draft);
  };

  return (
    <div className="med-home">
      <header className="med-home-header">
        <Link className="med-home-brand" to="/" aria-label="MedSuite home">
          <span className="med-home-brand-icon"><FaHospital aria-hidden="true" /></span>
          <span>MedSuite</span>
        </Link>
        <nav className="med-home-nav" aria-label="Portal navigation">
          <Link to="/PatientLogin">Patient login</Link>
          <Link to="/DoctorLogin">Doctor login</Link>
          <Link to="/HospitalLogin">Hospital portal</Link>
          <Link className="med-home-signup" to="/SignUpPage">Create account</Link>
        </nav>
      </header>

      <div className="med-home-main">
        <section className="med-home-hero" aria-labelledby="med-home-title">
          <div className="med-home-copy">
            <div className="med-home-eyebrow">
              <span className="med-home-live-dot" aria-hidden="true" />
              Care and coordination, in one place
            </div>
            <h1 id="med-home-title">Ayurved Hospital <span>Patna</span></h1>
            <p className="med-home-intro">
              A simpler way to connect with your care team, request appointments,
              and access hospital services.
            </p>
            <div className="med-home-actions">
              <Link className="med-home-primary-action" to="/PatientLogin">
                Book an appointment <FaArrowRight aria-hidden="true" />
              </Link>
              <a className="med-home-secondary-action" href="#care-services">Explore services</a>
            </div>
            <p className="med-home-emergency"><FaAmbulance aria-hidden="true" /> Emergency support available 24/7</p>
          </div>

          <div className="med-home-image med-home-video-scene" aria-label="A preview of hospital care services">
            <img
              src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1400&q=85"
              alt="Hospital entrance"
            />
            <div className="med-home-scene-tint" aria-hidden="true" />
            <div className="med-home-scene-live"><span /> Care that stays connected</div>
            <div className="med-home-scene-card med-home-appointment-card">
              <div className="med-home-scene-card-heading">
                <span className="med-home-check"><FaArrowRight aria-hidden="true" /></span>
                <span><small>YOUR NEXT STEP</small><strong>Book an appointment</strong></span>
                <span className="med-home-scene-status">ONLINE</span>
              </div>
              <div className="med-home-scene-divider" />
              <p>Choose a doctor and a time that works for you.</p>
              <div className="med-home-scene-progress"><span /></div>
            </div>
            <div className="med-home-scene-stat">
              <span className="med-home-stat-pulse" />
              <span><strong>24/7</strong><small>Emergency support</small></span>
            </div>
            <div className="med-home-image-note">
              <span className="med-home-image-note-icon"><FaHospital aria-hidden="true" /></span>
              <span><strong>Here for your health</strong><small>Patient and care-team portals</small></span>
            </div>
          </div>
        </section>

        <section className="med-home-services" id="care-services" aria-labelledby="med-home-services-title">
          <div className="med-home-section-heading">
            <div>
              <p>Care when you need it</p>
              <h2 id="med-home-services-title">Hospital services</h2>
            </div>
            <Link to="/PatientLogin">Continue to patient portal <FaArrowRight aria-hidden="true" /></Link>
          </div>
          <div className="med-home-service-grid">
            {careServices.map(({ icon: Icon, title, description }) => (
              <article className="med-home-service-card" key={title}>
                <span className="med-home-service-icon"><Icon aria-hidden="true" /></span>
                <div><h3>{title}</h3><p>{description}</p></div>
              </article>
            ))}
          </div>
        </section>
      </div>
      <div className="med-home-chat">
        {chatOpen && (
          <section className="med-home-chat-panel" aria-label="MedSuite assistance">
            <header className="med-home-chat-header">
              <span className="med-home-chat-avatar"><FaRobot aria-hidden="true" /></span>
              <span><strong>MedSuite assistant</strong><small>Here to help you find your way</small></span>
              <button type="button" aria-label="Close assistant" onClick={() => setChatOpen(false)}>×</button>
            </header>
            <div className="med-home-chat-messages" aria-live="polite">
              {messages.map((message, index) => (
                <p className={`med-home-chat-message ${message.sender}`} key={`${index}-${message.sender}`}>
                  {message.text}
                </p>
              ))}
            </div>
            <div className="med-home-chat-suggestions" aria-label="Suggested questions">
              {['Appointments', 'Emergency', 'Portal help'].map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => askQuestion(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
            <form className="med-home-chat-form" onSubmit={sendMessage}>
              <input
                aria-label="Ask the assistant"
                placeholder="Ask about appointments…"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
              <button type="submit" aria-label="Send message" disabled={!draft.trim()}>
                <FaPaperPlane aria-hidden="true" />
              </button>
            </form>
          </section>
        )}
        <button
          className="med-home-chat-toggle"
          type="button"
          aria-label={chatOpen ? 'Close assistant' : 'Open assistant for help'}
          aria-expanded={chatOpen}
          onClick={() => setChatOpen((open) => !open)}
        >
          {chatOpen ? <span aria-hidden="true">×</span> : <><FaRobot aria-hidden="true" /><span>Need help?</span></>}
        </button>
      </div>
    </div>
  );
}
