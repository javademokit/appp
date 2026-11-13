import React from "react";
import { FaEnvelope, FaMapMarkerAlt, FaPhoneAlt } from "react-icons/fa";
import BrandLogo from "../components/BrandLogo";
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-main">
          <div className="footer-brand">
            <BrandLogo />
            <p>&copy; {new Date().getFullYear()} Medora AI Health Care. All rights reserved.</p>
          </div>
          <address className="footer-contact" aria-label="Hospital contact details">
            <div className="footer-contact-item">
              <FaMapMarkerAlt aria-hidden="true" />
              <span><strong>Hospital address</strong><span>Whitefield, Bengaluru</span></span>
            </div>
            <div className="footer-contact-item">
              <FaPhoneAlt aria-hidden="true" />
              <span><strong>Toll-free number</strong><a href="tel:18000555422">18000555422</a></span>
            </div>
            <div className="footer-contact-item">
              <FaEnvelope aria-hidden="true" />
              <span><strong>Hospital email</strong><a href="mailto:admin@medora.local">admin@medora.local</a></span>
            </div>
          </address>
        </div>
        <div className="footer-bottom">
          <div className="footer-links">
            <a href="/privacy-policy">Privacy Policy</a>
            <a href="/terms-of-service">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
