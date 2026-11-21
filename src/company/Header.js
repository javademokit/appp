import React, { useEffect, useState } from "react";
import { Headset } from "lucide-react";
import BrandLogo from "../components/BrandLogo";
import './Header.css';

const Header = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(now);
  const timeLabel = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(now);

  return (
    <header className="header">
      <div className="top-nav">
        <div className="hospital-brand-lockup">
          <BrandLogo />
        </div>
        <div className="header-status">
          <span className="header-care-status"><Headset size={16} aria-hidden="true" /> 24/7 Care</span>
          <span className="header-date-time" aria-label={`Current local date and time: ${dateLabel}, ${timeLabel}`}>
            <time dateTime={now.toISOString()}>
              <strong className="header-date-label">{dateLabel}</strong>
              <strong className="header-digital-clock">{timeLabel}</strong>
            </time>
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
