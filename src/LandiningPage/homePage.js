import { useState } from 'react';
import {
  FaArrowRight,
  FaBriefcaseMedical,
  FaCalendarCheck,
  FaClock,
  FaHospital,
  FaPaperPlane,
  FaRobot,
  FaShieldAlt,
  FaUserInjured,
  FaUserMd,
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import './App.css';
import hospitalLobby from './medora-hospital-lobby.jpg';

const careServices = [
  {
    icon: FaUserInjured,
    title: 'Patient CRM',
    description: 'Keep patient profiles and care information together.',
  },
  {
    icon: FaHospital,
    title: 'Appointments',
    description: 'Organize doctor schedules and patient bookings.',
  },
  {
    icon: FaUserMd,
    title: 'Patient monitoring',
    description: 'Keep patient checks and care-team follow-ups in view.',
  },
  {
    icon: FaClock,
    title: 'Medicine timetable',
    description: 'Track medicine schedules and due checks for patients.',
  },
];

const workspaces = [
  {
    icon: FaUserInjured,
    title: 'Patient portal',
    description: 'Manage appointments and stay connected with your care team.',
    link: '/PatientLogin',
    action: 'Patient sign in',
  },
  {
    icon: FaUserMd,
    title: 'Clinical workspace',
    description: 'Give doctors and care teams a focused view of their daily work.',
    link: '/DoctorLogin',
    action: 'Doctor sign in',
  },
  {
    icon: FaBriefcaseMedical,
    title: 'Hospital workspace',
    description: 'Coordinate operations, administration, and hospital services.',
    link: '/HospitalLogin',
    action: 'Staff sign in',
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
    let replyLink = null;
    if (question.includes('trial')) {
      reply = 'Thanks for your interest in a Medora AI free trial. Please contact your hospital administrator to discuss trial access.';
    } else if (question.includes('demo')) {
      reply = 'Thanks for your interest in Medora AI. Please contact your hospital administrator to arrange a product demo.';
    } else if (/\b(appointments?|appoint|book|booking|schedule|slot|visit)\b/.test(question)) {
      reply = 'To request an appointment, sign in to the patient portal.';
      replyLink = { to: '/PatientLogin', text: 'Sign in to book an appointment' };
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
    setMessages((current) => [...current, { sender: 'user', text }, { sender: 'assistant', text: reply, link: replyLink }]);
    setDraft('');
  };

  const sendMessage = (event) => {
    event.preventDefault();
    askQuestion(draft);
  };

  const requestTrial = () => {
    setChatOpen(true);
    askQuestion('I would like to start a free trial');
  };

  return (
    <div className="med-home">
      <div className="med-home-frame">
        <header className="med-home-header">
          <Link className="med-home-brand" to="/" aria-label="Medora AI Health Care home">
            <img src="/medora-app-icon.svg" alt="" />
            <span>Medora <strong>AI Health Care</strong></span>
          </Link>
          <button className="med-home-signup med-home-trial" type="button" onClick={requestTrial}>Start free trial</button>
          <nav className="med-home-nav" aria-label="Main navigation">
            <a href="#care-services">Features</a>
            <a href="#modules">Modules</a>
            <a href="#workspaces">Portals</a>
            <Link to="/HospitalLogin">Login</Link>
          </nav>
        </header>

        <main className="med-home-main">
        <section className="med-home-hero" aria-labelledby="med-home-title">
          <div className="med-home-copy">
            <div className="med-home-eyebrow">
              <span className="med-home-live-dot" aria-hidden="true" />
              AI medical CRM for hospitals
            </div>
            <h1 id="med-home-title">Run your hospital <span>smarter</span> with AI</h1>
            <p className="med-home-intro">
              Medora AI Health Care brings patients, doctors, nurses, and appointments into one CRM,
              with an AI assistant that helps keep care on track.
            </p>
            <div className="med-home-actions">
              <button className="med-home-primary-action" type="button" onClick={() => {
                setChatOpen(true);
                askQuestion('I would like to book a demo');
              }}>Book a demo <FaArrowRight aria-hidden="true" /></button>
              <a className="med-home-secondary-action" href="#care-services">See features</a>
            </div>
            <div className="med-home-assurances">
              <span><FaShieldAlt aria-hidden="true" /> Secure access</span>
              <span><FaCalendarCheck aria-hidden="true" /> Connected care</span>
              <span><FaHospital aria-hidden="true" /> Built for hospitals</span>
            </div>
          </div>

          <section className="med-home-dashboard-preview" aria-label="Hospital reception">
            <img className="med-home-hospital-image" src={hospitalLobby} alt="A bright, modern hospital reception and waiting area" />
          </section>
        </section>

        <section className="med-home-workspaces" id="workspaces" aria-labelledby="med-home-workspaces-title">
          <div className="med-home-section-heading">
            <div>
              <p>One connected platform</p>
              <h2 id="med-home-workspaces-title">A workspace for every care journey</h2>
            </div>
            <p className="med-home-section-description">Choose the portal that fits your role.</p>
          </div>
          <div className="med-home-workspace-grid">
            {workspaces.map(({ icon: Icon, title, description, link, action }) => (
              <article className="med-home-workspace-card" key={title}>
                <span className="med-home-workspace-icon"><Icon aria-hidden="true" /></span>
                <h3>{title}</h3>
                <p>{description}</p>
                <Link to={link}>{action} <FaArrowRight aria-hidden="true" /></Link>
              </article>
            ))}
          </div>
        </section>

        <section className="med-home-services" id="modules" aria-labelledby="med-home-services-title">
          <div className="med-home-section-heading">
            <div>
              <p>Built for connected care</p>
              <h2 id="med-home-services-title">Core modules</h2>
            </div>
            <Link to="/HospitalLogin">Explore the hospital portal <FaArrowRight aria-hidden="true" /></Link>
          </div>
          <div className="med-home-service-grid" id="care-services">
            {careServices.map(({ icon: Icon, title, description }) => (
              <article className="med-home-service-card" key={title}>
                <span className="med-home-service-icon"><Icon aria-hidden="true" /></span>
                <div><h3>{title}</h3><p>{description}</p></div>
              </article>
            ))}
          </div>
        </section>

        <section className="med-home-cta" aria-labelledby="med-home-cta-title">
          <div>
            <span className="med-home-cta-icon"><FaClock aria-hidden="true" /></span>
            <div>
              <p>Make every handoff clearer</p>
              <h2 id="med-home-cta-title">Bring your care team into one connected workspace.</h2>
            </div>
          </div>
          <Link to="/HospitalLogin">Explore the hospital portal <FaArrowRight aria-hidden="true" /></Link>
        </section>
        </main>
      </div>
      <div className="med-home-chat">
        {chatOpen && (
          <section className="med-home-chat-panel" aria-label="Medora AI assistance">
            <header className="med-home-chat-header">
              <span className="med-home-chat-avatar"><FaRobot aria-hidden="true" /></span>
              <span><strong>Medora AI assistant</strong><small>Here to help you find your way</small></span>
              <button type="button" aria-label="Close assistant" onClick={() => setChatOpen(false)}>×</button>
            </header>
            <div className="med-home-chat-messages" aria-live="polite">
              {messages.map((message, index) => (
                <p className={`med-home-chat-message ${message.sender}`} key={`${index}-${message.sender}`}>
                  {message.text}
                  {message.link && <> <Link to={message.link.to}>{message.link.text}</Link></>}
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
          aria-label={chatOpen ? 'Close assistant' : 'Open Ask Medora chat'}
          aria-expanded={chatOpen}
          onClick={() => setChatOpen((open) => !open)}
        >
          {chatOpen ? <span aria-hidden="true">×</span> : <><FaRobot aria-hidden="true" /><span>Ask Medora</span></>}
        </button>
      </div>
    </div>
  );
}
