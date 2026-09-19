import React from 'react';
import JobCard from './JobCard';
import { matchesExperienceFilter } from '../utils/experienceParser';

export default function JobGrid({ jobs, loading, experienceFilter }) {
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

  // When an experience filter is active, separate known vs unknown experience
  const isFiltering = experienceFilter && experienceFilter !== 'all';

  if (isFiltering) {
    const knownJobs = [];
    const unknownJobs = [];

    jobs.forEach((job) => {
      const { unknown } = matchesExperienceFilter(job, experienceFilter);
      if (unknown) {
        unknownJobs.push(job);
      } else {
        knownJobs.push(job);
      }
    });

    return (
      <div className="job-grid-sections">
        {knownJobs.length > 0 && (
          <div className="job-grid">
            {knownJobs.map((job) => (
              <JobCard key={job.id} job={job} showUnknownBadge={false} />
            ))}
          </div>
        )}

        {unknownJobs.length > 0 && (
          <>
            <div className="experience-unknown-divider">
              <span className="divider-line"></span>
              <span className="divider-label">🧑‍💻 Experience Unknown ({unknownJobs.length})</span>
              <span className="divider-line"></span>
            </div>
            <div className="job-grid">
              {unknownJobs.map((job) => (
                <JobCard key={job.id} job={job} showUnknownBadge={true} />
              ))}
            </div>
          </>
        )}

        {knownJobs.length === 0 && unknownJobs.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🔎</div>
            <h3 className="empty-title">No matching jobs</h3>
            <p className="empty-text">
              No jobs match the selected experience filter. Try a different range.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="job-grid">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} showUnknownBadge={false} />
      ))}
    </div>
  );
}
