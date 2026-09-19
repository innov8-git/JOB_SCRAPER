import { extractSkills, extractSalary } from './extractors';

/**
 * Generate a unique ID for a job entry.
 */
function generateId(platform, index) {
  return `${platform.toLowerCase()}-${Date.now()}-${index}`;
}

/**
 * Parse HTML string into a DOM document.
 */
function parseHTML(htmlString) {
  const parser = new DOMParser();
  return parser.parseFromString(htmlString, 'text/html');
}

// ════════════════════════════════════════════════════════════
//  LINKEDIN — Guest Job Search API (no auth needed)
//  Endpoint: /jobs-guest/jobs/api/seeMoreJobPostings/search
//  Returns HTML fragments with real job cards
// ════════════════════════════════════════════════════════════

export async function scrapeLinkedIn(searchTerm, location) {
  try {
    const keywords = encodeURIComponent(searchTerm);
    const loc = encodeURIComponent(location);
    const url = `/proxy/linkedin/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${keywords}&location=${loc}&start=0`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`LinkedIn fetch failed: ${response.status}`);

    const html = await response.text();
    const doc = parseHTML(html);
    const jobs = [];

    // LinkedIn returns <li> elements with job card data
    const cards = doc.querySelectorAll('li, div.base-card, div.job-search-card');

    cards.forEach((card, index) => {
      // Job title + link
      const titleEl = card.querySelector('h3.base-search-card__title, h3, a.base-card--link');
      const linkEl = card.querySelector('a.base-card--link, a[href*="linkedin.com/jobs"]');
      const companyEl = card.querySelector('h4.base-search-card__subtitle, h4, a.hidden-nested-link');
      const locationEl = card.querySelector('span.job-search-card__location, span.base-search-card__metadata');
      const dateEl = card.querySelector('time, span.job-search-card__listdate');

      const title = titleEl?.textContent?.trim();
      const href = linkEl?.getAttribute('href') || '';
      const company = companyEl?.textContent?.trim();

      if (title && href) {
        const locStr = locationEl?.textContent?.trim() || location;
        const postedDate = dateEl?.getAttribute('datetime')
          ? formatRelativeDate(dateEl.getAttribute('datetime'))
          : dateEl?.textContent?.trim() || 'Recently';

        const fullText = `${title} ${company || ''} ${locStr}`;

        jobs.push({
          id: generateId('linkedin', index),
          title,
          company: company || 'Company via LinkedIn',
          location: locStr,
          platform: 'LinkedIn',
          url: href.startsWith('http') ? href : `https://www.linkedin.com${href}`,
          description: `${title} at ${company || 'Company'}. Location: ${locStr}`,
          salary: extractSalary(fullText),
          skills: extractSkills(fullText),
          isScraped: true,
          postedDate,
        });
      }
    });

    return jobs;
  } catch (error) {
    console.warn('LinkedIn scraper failed:', error.message);
    return [];
  }
}

// ════════════════════════════════════════════════════════════
//  MONSTER (Foundit) — Live Middleware Job Search API
//  Endpoint: /middleware/jobsearch?query=...&locations=...
//  Returns structured JSON with live job listings
// ════════════════════════════════════════════════════════════

export async function scrapeMonster(searchTerm, location) {
  try {
    const query = encodeURIComponent(searchTerm);
    const loc = encodeURIComponent(location || '');
    const url = `/proxy/monster/middleware/jobsearch?query=${query}&locations=${loc}&limit=25`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Monster fetch failed: ${response.status}`);

    const data = await response.json();
    const rawJobs = data?.jobSearchResponse?.data || [];
    const jobs = [];

    rawJobs.forEach((job, index) => {
      const title = job.title || `${searchTerm} Position`;
      const company = job.companyName || job.company?.name || 'Company via Monster';
      const locStr = job.locations || location || 'Not specified';
      const fullText = `${title} ${company} ${locStr} ${job.skills || ''}`;

      let jobUrl = 'https://www.foundit.in';
      if (job.jdUrl) {
        jobUrl = job.jdUrl.startsWith('http') ? job.jdUrl : `https://www.foundit.in${job.jdUrl}`;
      } else if (job.redirectUrl) {
        jobUrl = job.redirectUrl.startsWith('http') ? job.redirectUrl : `https://www.foundit.in${job.redirectUrl}`;
      } else if (job.seoJdUrl) {
        jobUrl = `https://www.foundit.in${job.seoJdUrl}`;
      }

      let skills = [];
      if (job.skills) {
        skills = job.skills.split(',').map((s) => s.trim()).filter(Boolean);
      }
      if (skills.length === 0) {
        skills = extractSkills(fullText);
      }

      let salary = job.salary;
      if (!salary && job.minimumSalary?.absoluteValue) {
        const minSal = job.minimumSalary.absoluteValue.toLocaleString();
        const maxSal = job.maximumSalary?.absoluteValue ? job.maximumSalary.absoluteValue.toLocaleString() : '';
        const curr = job.minimumSalary.currency || 'INR';
        salary = maxSal ? `${minSal} - ${maxSal} ${curr}` : `${minSal} ${curr}`;
      }
      if (!salary) {
        salary = extractSalary(fullText);
      }

      const postedDate = job.createdAt || job.lastUpdated || job.postedDate
        ? formatRelativeDate(job.createdAt || job.lastUpdated || job.postedDate)
        : 'Recently';

      jobs.push({
        id: generateId('monster', index),
        title,
        company,
        location: locStr,
        platform: 'Monster',
        url: jobUrl,
        description: job.description || `${title} at ${company}. Location: ${locStr}`,
        salary: salary || 'Not disclosed',
        skills,
        isScraped: true,
        postedDate,
      });
    });

    return jobs;
  } catch (error) {
    console.warn('Monster scraper failed:', error.message);
    return [];
  }
}

// ════════════════════════════════════════════════════════════
//  NAUKRI — Scraper API
//  Dev  : Vite plugin at /api/scrape/naukri  (local Puppeteer)
//  Prod : Render service at VITE_NAUKRI_API_URL/scrape/naukri
//  Returns structured JSON with live Naukri job postings
// ════════════════════════════════════════════════════════════

// Render API base URL — set via .env or Netlify env vars
const NAUKRI_API_BASE = import.meta.env.VITE_NAUKRI_API_URL || '';

export async function scrapeNaukri(searchTerm, location) {
  try {
    const term = encodeURIComponent(searchTerm);
    const loc = encodeURIComponent(location || '');

    // In production use external Render API; in dev use local Vite plugin
    const url = NAUKRI_API_BASE
      ? `${NAUKRI_API_BASE}/scrape/naukri?term=${term}&location=${loc}`
      : `/api/scrape/naukri?term=${term}&location=${loc}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Naukri fetch failed: ${response.status}`);

    const result = await response.json();
    if (!result.success || !Array.isArray(result.data)) {
      throw new Error(result.error || 'Failed to parse Naukri results');
    }

    return result.data.map((job, index) => {
      const fullText = `${job.title} ${job.company} ${job.location} ${(job.skills || []).join(' ')}`;
      return {
        id: generateId('naukri', index),
        title: job.title,
        company: job.company || 'Company via Naukri',
        location: job.location || location || 'India',
        platform: 'Naukri',
        url: job.url || 'https://www.naukri.com',
        description: job.description || `${job.title} at ${job.company}. Location: ${job.location}`,
        salary: job.salary && job.salary !== 'Not disclosed' ? job.salary : (extractSalary(fullText) || 'Not disclosed'),
        skills: job.skills && job.skills.length > 0 ? job.skills : extractSkills(fullText),
        isScraped: true,
        postedDate: job.postedDate || 'Recently',
      };
    });
  } catch (error) {
    console.warn('Naukri scraper failed:', error.message);
    return [];
  }
}

// ════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════

/**
 * Format an ISO date or timestamp into a relative time string.
 */
function formatRelativeDate(dateVal) {
  try {
    let date;
    if (typeof dateVal === 'number') {
      date = new Date(dateVal);
    } else if (typeof dateVal === 'string' && /^\d+$/.test(dateVal)) {
      date = new Date(Number(dateVal));
    } else {
      date = new Date(dateVal);
    }

    if (isNaN(date.getTime())) return 'Recently';

    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 0) return 'Just now';
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    return `${Math.floor(diffDays / 30)} months ago`;
  } catch {
    return 'Recently';
  }
}
