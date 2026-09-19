import React, { useState, useMemo } from 'react';
import Header from './Header';
import SearchBar from './SearchBar';
import StatsDisplay from './StatsDisplay';
import JobGrid from './JobGrid';
import Footer from './Footer';
import { sanitize } from '../utils/sanitize';
import { scrapeLinkedIn, scrapeNaukri, scrapeMonster } from '../utils/scrapers';
import { matchesExperienceFilter } from '../utils/experienceParser';

export default function JobSearchApp() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('React Developer');
  const [location, setLocation] = useState('Pune');
  const [experience, setExperience] = useState('all');
  const [error, setError] = useState(null);

  // Apply experience filter on the client side (instant, no re-scrape)
  const filteredJobs = useMemo(() => {
    if (experience === 'all') return jobs;

    return jobs.filter((job) => {
      const { matches } = matchesExperienceFilter(job, experience);
      return matches;
    });
  }, [jobs, experience]);

  const scrapeJobs = async () => {
    // Sanitize inputs
    const cleanTerm = sanitize(searchTerm);
    const cleanLocation = sanitize(location);

    if (!cleanTerm) {
      setError('Please enter a valid search term.');
      return;
    }

    setLoading(true);
    setError(null);
    setJobs([]);

    try {
      // Fire all three scrapers in parallel — one failing won't block others
      const results = await Promise.allSettled([
        scrapeLinkedIn(cleanTerm, cleanLocation),
        scrapeNaukri(cleanTerm, cleanLocation),
        scrapeMonster(cleanTerm, cleanLocation),
      ]);

      // Aggregate results from fulfilled promises
      let allJobs = [];
      let failedCount = 0;

      results.forEach((result) => {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          allJobs = allJobs.concat(result.value);
        } else {
          failedCount++;
        }
      });

      // Report failures
      if (allJobs.length === 0) {
        setError(
          failedCount === 3
            ? 'All scrapers (LinkedIn, Naukri, Monster) failed. Try again later.'
            : 'No results found. Try different search terms or location.'
        );
      } else if (failedCount > 0) {
        setError(`${failedCount} scraper(s) failed. Showing results from available sources.`);
      }

      // Deduplicate by title + company
      const seen = new Set();
      const uniqueJobs = allJobs.filter((job) => {
        const key = `${job.title.toLowerCase()}-${job.company.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setJobs(uniqueJobs);
    } catch (err) {
      console.error('Scraping orchestration failed:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <Header />

      <main className="app-main">
        <SearchBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          location={location}
          setLocation={setLocation}
          experience={experience}
          setExperience={setExperience}
          onSearch={scrapeJobs}
          loading={loading}
        />

        {error && (
          <div className="error-banner">
            <span className="error-icon">⚡</span>
            <span className="error-text">{error}</span>
          </div>
        )}

        <StatsDisplay jobs={filteredJobs} />

        <JobGrid jobs={filteredJobs} loading={loading} experienceFilter={experience} />
      </main>

      <Footer />
    </div>
  );
}
