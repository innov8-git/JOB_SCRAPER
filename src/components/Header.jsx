import React from 'react';

export default function Header() {
  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-title-group">
          <h1 className="header-title">
            <span className="header-icon">🔍</span>
            Live Job Scraper
          </h1>
          <p className="header-subtitle">Direct scraping from LinkedIn, Naukri, Monster</p>
        </div>
        <div className="header-badge warning-badge">
          <span className="badge-pulse"></span>
          ⚠️ Educational Use Only
        </div>
      </div>
      <div className="header-decoration">
        <div className="decoration-line"></div>
        <div className="decoration-dots">
          <span className="dot dot-red"></span>
          <span className="dot dot-yellow"></span>
          <span className="dot dot-green"></span>
        </div>
      </div>
    </header>
  );
}
