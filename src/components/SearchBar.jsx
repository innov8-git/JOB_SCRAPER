import React from 'react';
import { EXPERIENCE_OPTIONS } from '../utils/experienceParser';

export default function SearchBar({ searchTerm, setSearchTerm, location, setLocation, experience, setExperience, onSearch, loading }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <div className="search-inputs">
        <div className="input-group">
          <label htmlFor="search-term" className="input-label">💼 Job Title / Skills</label>
          <input
            id="search-term"
            type="text"
            className="search-input"
            placeholder="React Developer, Python, DevOps..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="input-group">
          <label htmlFor="search-location" className="input-label">📍 Location / City</label>
          <input
            id="search-location"
            type="text"
            className="search-input"
            placeholder="Pune, Bangalore, Remote..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="input-group">
          <label htmlFor="search-experience" className="input-label">🧑‍💻 Experience</label>
          <select
            id="search-experience"
            className="search-input experience-select"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            disabled={loading}
          >
            {EXPERIENCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button
        type="submit"
        className={`search-button ${loading ? 'loading' : ''}`}
        disabled={loading}
      >
        {loading ? (
          <>
            <span className="spinner"></span>
            Scraping...
          </>
        ) : (
          <>🔍 Scrape Jobs</>
        )}
      </button>
    </form>
  );
}
