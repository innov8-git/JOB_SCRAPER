import React from 'react';
import JobCard from './JobCard';

export default function JobGrid({ jobs, loading }) {
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-animation">
          <div className="loading-bar"></div>
          <div className="loading-bar"></div>
          <div className="loading-bar"></div>
        </div>
        <div className="loading-text">
          <span className="loading-cursor">▌</span>
          Scraping job listings from LinkedIn, Naukri, Monster...
        </div>
        <div className="loading-progress">
          <div className="progress-item">
            <span className="progress-dot progress-pulse"></span>
            <span>LinkedIn</span>
          </div>
          <div className="progress-item">
            <span className="progress-dot progress-pulse delay-1"></span>
            <span>Naukri</span>
          </div>
          <div className="progress-item">
            <span className="progress-dot progress-pulse delay-2"></span>
            <span>Monster</span>
          </div>
        </div>
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔎</div>
        <h3 className="empty-title">No jobs to display</h3>
        <p className="empty-text">
          Click <strong>"🔍 Scrape Jobs"</strong> to start scraping live job listings
        </p>
      </div>
    );
  }

  return (
    <div className="job-grid">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}
