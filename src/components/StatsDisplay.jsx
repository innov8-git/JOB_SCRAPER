import React from 'react';

export default function StatsDisplay({ jobs }) {
  if (!jobs || jobs.length === 0) return null;

  const totalJobs = jobs.length;

  const platforms = {};
  jobs.forEach((j) => {
    platforms[j.platform] = (platforms[j.platform] || 0) + 1;
  });

  return (
    <div className="stats-display">
      <div className="stat-card stat-total">
        <span className="stat-icon">📊</span>
        <div className="stat-info">
          <span className="stat-value">{totalJobs}</span>
          <span className="stat-label">Jobs Found</span>
        </div>
      </div>

      <div className="stat-card stat-live">
        <span className="stat-icon">🟢</span>
        <div className="stat-info">
          <span className="stat-value">{totalJobs}</span>
          <span className="stat-label">Live Scraped</span>
        </div>
      </div>

      <div className="stat-card stat-platforms">
        <span className="stat-icon">🌐</span>
        <div className="stat-info">
          <span className="stat-value">{Object.keys(platforms).length}</span>
          <span className="stat-label">Platforms</span>
        </div>
        <div className="platform-breakdown">
          {Object.entries(platforms).map(([platform, count]) => (
            <span key={platform} className={`platform-chip platform-${platform.toLowerCase()}`}>
              {platform}: {count}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
