import React from "react";
import BrandLogo from "../components/BrandLogo";
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-brand"><BrandLogo /><p>&copy; {new Date().getFullYear()} Medora AI. All rights reserved.</p></div>
        <div className="footer-links">
          <a href="/privacy-policy">Privacy Policy</a>
          <a href="/terms-of-service">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
