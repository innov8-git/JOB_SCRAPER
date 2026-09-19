import React from 'react';

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-security">
          <span className="security-badge">
            🔒 SQL injection prevention active
          </span>
        </div>
        <div className="footer-divider"></div>
        <div className="footer-disclaimer">
          <p className="disclaimer-text">
            ⚠️ <strong>Disclaimer:</strong> This tool is for <strong>educational purposes only</strong>.
            Scraping platforms may be subject to their Terms of Service.
            Do not use this tool for commercial purposes or at scale.
          </p>
        </div>
        <div className="footer-meta">
          <span className="footer-version">v1.0.0</span>
          <span className="footer-separator">•</span>
          <span className="footer-tech">React + Vite</span>
          <span className="footer-separator">•</span>
          <span className="footer-year">2026</span>
        </div>
      </div>
    </footer>
  );
}
