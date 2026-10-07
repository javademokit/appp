import React from "react";
import BrandLogo from "../components/BrandLogo";
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="top-nav">
        <div className="logo">
          <BrandLogo />
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
