import React from "react";
import { FaHospital } from "react-icons/fa";
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="top-nav">
        <div className="logo" aria-label="Hospital logo">
          <span className="logo-icon"><FaHospital /></span>
        </div>

        <div className="icons">
          <i className="fas fa-bell notifications"></i>
          <i className="fas fa-cogs settings"></i>
        </div>
      </div>
    </header>
  );
};

export default Header;
