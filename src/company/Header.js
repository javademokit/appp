import React from "react";
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="top-nav">
        {/* Left: Logo or Title */}
        <div className="logo">
          <h1>🏥 MedCare</h1>
        </div>

        {/* Center: Search */}
        <div className="search-container">
          <input type="text" placeholder="Search..." className="search-bar" />
        </div>

        {/* Right: Icons */}
        <div className="icons">
          <i className="fas fa-bell notifications"></i>
          <i className="fas fa-cogs settings"></i>
        </div>
      </div>
    </header>
  );
};

export default Header;
