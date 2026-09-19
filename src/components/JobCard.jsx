import React from 'react';
import { getPlatformColor, getPlatformGradient, handleJobClick } from '../utils/helpers';
import { parseExperience } from '../utils/experienceParser';

export default function JobCard({ job, showUnknownBadge }) {
  const platformColor = getPlatformColor(job.platform);
  const platformGradient = getPlatformGradient(job.platform);

  const truncatedDesc = job.description
    ? job.description.length > 120
      ? job.description.slice(0, 120) + '...'
      : job.description
    : 'No description available';

  const hasExperience = job.experience && parseExperience(job.experience);

  return (
    <article
      className="job-card"
      onClick={() => handleJobClick(job.url)}
      role="link"
      tabIndex={0}
      title={`Open on ${job.platform}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleJobClick(job.url);
      }}
    >
      <div className="card-header">
        <div className="card-title-row">
          <h3 className="card-title">{job.title}</h3>
          <span
            className="platform-badge"
            style={{ background: platformGradient }}
          >
            {job.platform}
          </span>
        </div>
        <div className="card-company">
          <span className="company-icon">🏢</span>
          {job.company}
        </div>
      </div>

      <div className="card-body">
        <div className="card-location">
          <span className="location-icon">📍</span>
          {job.location}
        </div>

        {hasExperience && (
          <div className="card-experience">
            <span className="experience-icon">🧑‍💻</span>
            {job.experience}
          </div>
        )}

        {showUnknownBadge && !hasExperience && (
          <div className="card-experience experience-unknown">
            <span className="experience-icon">🧑‍💻</span>
            Experience Unknown
          </div>
        )}

        {job.skills && job.skills.length > 0 && (
          <div className="card-skills">
            {job.skills.slice(0, 5).map((skill) => (
              <span key={skill} className="skill-tag" style={{ borderColor: platformColor }}>
                #{skill}
              </span>
            ))}
            {job.skills.length > 5 && (
              <span className="skill-tag skill-more">+{job.skills.length - 5}</span>
            )}
          </div>
        )}

        <p className="card-description">{truncatedDesc}</p>
      </div>

      <div className="card-footer">
        <div className="card-meta">
          <span className="card-salary">
            {job.salary ? `💰 ${job.salary}` : '💰 Not disclosed'}
          </span>
          {job.postedDate && (
            <span className="card-date">🕐 {job.postedDate}</span>
          )}
        </div>
        <div className="scrape-badge badge-live">
          🔗 Open on {job.platform}
        </div>
      </div>
    </article>
  );
}
