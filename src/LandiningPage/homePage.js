import { useState } from 'react';
import { FaArrowRight, FaHospital, FaPaperPlane, FaRobot, FaUserInjured, FaUserMd, FaClock } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import './App.css';

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
          <Link className="med-home-brand" to="/" aria-label="Medora AI home">
            <img src="/medora-app-icon.svg" alt="" />
            <span>Medora <strong>AI</strong></span>
          </Link>
          <button className="med-home-signup med-home-trial" type="button" onClick={requestTrial}>Start free trial</button>
          <nav className="med-home-nav" aria-label="Main navigation">
            <a href="#care-services">Features</a>
            <a href="#modules">Modules</a>
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
              Medora AI brings patients, doctors, nurses, and appointments into one CRM,
              with an AI assistant that helps keep care on track.
            </p>
            <div className="med-home-actions">
              <button className="med-home-primary-action" type="button" onClick={() => {
                setChatOpen(true);
                askQuestion('I would like to book a demo');
              }}>Book a demo <FaArrowRight aria-hidden="true" /></button>
              <a className="med-home-secondary-action" href="#care-services">See features</a>
            </div>
            <p className="med-home-emergency"><FaHospital aria-hidden="true" /> Secure patient data, built for hospitals</p>
          </div>

          <section className="med-home-dashboard-preview" id="modules" aria-label="Preview of the Medora AI hospital workspace">
            <div className="med-home-preview-heading">
              <span className="med-home-preview-mark"><FaHospital aria-hidden="true" /></span>
              <span><small>SAMPLE DASHBOARD</small><strong>Hospital overview</strong></span>
            </div>
            <div className="med-home-preview-cards">
              <article>
                <span><small>Patients today</small><strong>128</strong></span>
              </article>
              <article>
                <span><small>Medicines due</small><strong>34</strong></span>
              </article>
            </div>
            <div className="med-home-preview-workflow">
              <div className="med-home-preview-workflow-copy">
                <div><span className="med-home-preview-kicker"><FaRobot aria-hidden="true" /> AI ASSISTANT</span><span className="med-home-preview-online">ONLINE</span></div>
                <strong>3 patients need a medicine check</strong>
                <small>Nurse alerts sent to Ward B.</small>
              </div>
            </div>
          </section>
        </section>

        <section className="med-home-services" id="care-services" aria-labelledby="med-home-services-title">
          <div className="med-home-section-heading">
            <div>
              <p>Built for connected care</p>
              <h2 id="med-home-services-title">Core modules</h2>
            </div>
            <Link to="/HospitalLogin">Explore the hospital portal <FaArrowRight aria-hidden="true" /></Link>
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
